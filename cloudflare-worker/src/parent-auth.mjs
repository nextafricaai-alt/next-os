import { sbFetch } from './supabase.mjs';


/* --- Parent sign-in by phone (audit C8) -----------------------------------
   Parents have no email login. They sign in with the phone number the school
   has on file as a pupil's guardian_phone:
     POST /parent/otp/send    { tenant, phone }        → SMS a 6-digit code
     POST /parent/otp/verify  { tenant, phone, code }  → { token, children }
     GET  /parent/children    (X-Parent-Token)         → children for that phone
   The token is a signed 30-day pass (HMAC-SHA256) carrying the school, the
   phone and the pupil ids. Every parent route checks it, and child data is
   re-checked against the database so a phone removed from a pupil's record
   loses access straight away.
   Secret: env.PARENT_SESSION_SECRET (wrangler secret put). If not set, a key
   derived from the service key is used so it still works out of the box.
--------------------------------------------------------------------------- */
const PARENT_TOKEN_DAYS = 30;
const OTP_TTL_S = 600;          // code valid for 10 minutes
const OTP_MAX_TRIES = 5;        // wrong guesses per code
const OTP_SENDS_PER_PHONE = 3;  // per 15 minutes
const OTP_SENDS_PER_IP = 10;    // per 15 minutes

// Uganda-first phone normaliser → digits with country code, e.g. 256772123456.
function normPhone(p) {
  let d = String(p || '').replace(/[^0-9]/g, '');
  if (!d) return '';
  if (d.startsWith('00')) d = d.slice(2);
  if (d.length === 10 && d.startsWith('0')) d = '256' + d.slice(1);
  else if (d.length === 9 && d.startsWith('7')) d = '256' + d;
  return d.length >= 11 && d.length <= 15 ? d : '';
}
// A guardian_phone cell can hold two numbers ("0772... / 0701...").
function phonesIn(cell) {
  return String(cell || '').split(/[\/,;|]| or /i).map(normPhone).filter(Boolean);
}
function b64u(bytes) {
  let s = ''; const a = new Uint8Array(bytes); for (let i = 0; i < a.length; i++) s += String.fromCharCode(a[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64uDecode(str) {
  str = String(str || '').replace(/-/g, '+').replace(/_/g, '/'); while (str.length % 4) str += '=';
  const bin = atob(str); const out = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out;
}
async function parentKey(env) {
  const raw = env.PARENT_SESSION_SECRET || ('nx-parent-v1:' + (env.SUPABASE_KEY || ''));
  return crypto.subtle.importKey('raw', new TextEncoder().encode(raw), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}
async function sha256hex(s) {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, '0')).join('');
}
async function issueParentToken(env, tenant, phone, studentIds) {
  const body = b64u(new TextEncoder().encode(JSON.stringify({ t: tenant, p: phone, s: studentIds, exp: Math.floor(Date.now() / 1000) + PARENT_TOKEN_DAYS * 86400 })));
  const sig = b64u(await crypto.subtle.sign('HMAC', await parentKey(env), new TextEncoder().encode(body)));
  return body + '.' + sig;
}
// Returns { tenant, phone, studentIds } or null.
async function readParentToken(request, env) {
  const tok = (request.headers.get('X-Parent-Token') || '').trim();
  const parts = tok.split('.');
  if (parts.length !== 2) return null;
  try {
    const ok = await crypto.subtle.verify('HMAC', await parentKey(env), b64uDecode(parts[1]), new TextEncoder().encode(parts[0]));
    if (!ok) return null;
    const p = JSON.parse(new TextDecoder().decode(b64uDecode(parts[0])));
    if (!p || !p.t || !p.p || !Array.isArray(p.s) || !(p.exp > Date.now() / 1000)) return null;
    return { tenant: String(p.t), phone: String(p.p), studentIds: p.s.map(Number) };
  } catch (e) { return null; }
}
async function childrenForPhone(env, tenant, phone) {
  if (!phone) return [];
  const rows = (await sbFetch(env, '/students?tenant_id=eq.' + encodeURIComponent(tenant) + '&guardian_phone=not.is.null&select=id,name,stream,guardian_phone&order=name.asc&limit=5000')) || [];
  return rows.filter(r => phonesIn(r.guardian_phone).indexOf(phone) >= 0).map(r => ({ id: Number(r.id), name: r.name, stream: r.stream || '' }));
}
async function kvBump(env, key, ttl) {
  if (!env.BRIEFS_KV) return 0;
  let n = 0; try { n = Number(await env.BRIEFS_KV.get(key)) || 0; } catch (e) {}
  try { await env.BRIEFS_KV.put(key, String(n + 1), { expirationTtl: ttl }); } catch (e) {}
  return n + 1;
}
async function sendParentSms(env, phone, text) {
  if (env.AT_USERNAME && env.AT_KEY) {
    const form = new URLSearchParams();
    form.set('username', env.AT_USERNAME); form.set('to', '+' + phone); form.set('message', text);
    if (env.AT_SENDER) form.set('from', env.AT_SENDER);
    // 'sandbox' = Africa's Talking test app (messages show in their simulator only).
    const atUrl = String(env.AT_USERNAME).trim() === 'sandbox' ? 'https://api.sandbox.africastalking.com/version1/messaging' : 'https://api.africastalking.com/version1/messaging';
    const r = await fetch(atUrl, { method: 'POST', headers: { apiKey: env.AT_KEY, 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' }, body: form.toString() });
    const d = await r.json().catch(() => ({}));
    const rec = (d && d.SMSMessageData && d.SMSMessageData.Recipients) || [];
    return { ok: r.ok && rec.some(x => /Success/i.test(x.status || '')), via: 'sms', detail: (d && d.SMSMessageData && d.SMSMessageData.Message) || ('HTTP ' + r.status) };
  }
  if (env.WHATSAPP_TOKEN && env.WHATSAPP_PHONE_ID) {
    // Note: WhatsApp only delivers free text inside a 24h customer window; for
    // reliable codes create an "authentication" template and switch to it.
    const r = await fetch('https://graph.facebook.com/v20.0/' + env.WHATSAPP_PHONE_ID + '/messages', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + env.WHATSAPP_TOKEN }, body: JSON.stringify({ messaging_product: 'whatsapp', to: phone, type: 'text', text: { body: text } }) });
    return { ok: r.ok, via: 'whatsapp', detail: 'HTTP ' + r.status };
  }
  return { ok: false, via: 'none', detail: 'no SMS or WhatsApp sender configured' };
}

async function handleParentOtpSend(request, env, cors) {
  const J = (o, st) => new Response(JSON.stringify(o), { status: st || 200, headers: { ...cors, 'Content-Type': 'application/json' } });
  let b; try { b = await request.json(); } catch (e) { return J({ error: 'bad body' }, 400); }
  const tenant = String(b.tenant || '').trim();
  const phone = normPhone(b.phone);
  if (!tenant) return J({ error: 'School missing from the link.' }, 400);
  if (!phone) return J({ error: 'Enter a valid phone number, e.g. 0772 123 456.' }, 400);
  if (!(env.AT_USERNAME && env.AT_KEY) && !(env.WHATSAPP_TOKEN && env.WHATSAPP_PHONE_ID)) {
    return J({ error: 'Phone sign-in is not switched on for this school yet. Please contact the school office.' }, 503);
  }
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  if (await kvBump(env, 'potp-ip:' + ip, 900) > OTP_SENDS_PER_IP) return J({ error: 'Too many requests. Try again in 15 minutes.' }, 429);
  if (await kvBump(env, 'potp-ph:' + tenant + ':' + phone, 900) > OTP_SENDS_PER_PHONE) return J({ error: 'Too many codes sent to this number. Try again in 15 minutes.' }, 429);
  // Same answer whether or not the number is registered, so the form can't be
  // used to find out which numbers belong to which school.
  const generic = { ok: true, message: 'If this number is registered with the school, a 6-digit code is on its way.' };
  const kids = await childrenForPhone(env, tenant, phone);
  if (!kids.length) { console.log('[parent-otp] no pupils for phone ending ' + phone.slice(-3) + ' at ' + tenant); return J(generic); }
  const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, '0');
  if (env.BRIEFS_KV) await env.BRIEFS_KV.put('potp:' + tenant + ':' + phone, JSON.stringify({ h: await sha256hex(code + ':' + phone), tries: 0 }), { expirationTtl: OTP_TTL_S });
  let schoolName = 'your school';
  try { const t = await sbFetch(env, '/tenants?id=eq.' + encodeURIComponent(tenant) + '&select=name'); if (t && t[0] && t[0].name) schoolName = t[0].name; } catch (e) {}
  const sent = await sendParentSms(env, phone, code + ' is your ' + schoolName + ' parent code. It expires in 10 minutes. Do not share it with anyone.');
  if (!sent.ok) { console.log('[parent-otp] send failed via ' + sent.via + ': ' + sent.detail); return J({ error: 'Could not send the code right now. Please try again.' }, 502); }
  return J(generic);
}

async function handleParentOtpVerify(request, env, cors) {
  const J = (o, st) => new Response(JSON.stringify(o), { status: st || 200, headers: { ...cors, 'Content-Type': 'application/json' } });
  let b; try { b = await request.json(); } catch (e) { return J({ error: 'bad body' }, 400); }
  const tenant = String(b.tenant || '').trim();
  const phone = normPhone(b.phone);
  const code = String(b.code || '').replace(/[^0-9]/g, '');
  if (!tenant || !phone || code.length !== 6) return J({ error: 'Enter the 6-digit code from the SMS.' }, 400);
  if (!env.BRIEFS_KV) return J({ error: 'Sign-in storage is not configured.' }, 503);
  const key = 'potp:' + tenant + ':' + phone;
  let rec = null; try { rec = JSON.parse((await env.BRIEFS_KV.get(key)) || 'null'); } catch (e) {}
  if (!rec) return J({ error: 'That code has expired. Ask for a new one.' }, 400);
  if (rec.tries >= OTP_MAX_TRIES) { await env.BRIEFS_KV.delete(key); return J({ error: 'Too many wrong codes. Ask for a new one.' }, 429); }
  if (rec.h !== await sha256hex(code + ':' + phone)) {
    rec.tries++; await env.BRIEFS_KV.put(key, JSON.stringify(rec), { expirationTtl: OTP_TTL_S });
    return J({ error: 'Wrong code. ' + (OTP_MAX_TRIES - rec.tries) + ' tries left.' }, 400);
  }
  await env.BRIEFS_KV.delete(key);
  const kids = await childrenForPhone(env, tenant, phone);
  if (!kids.length) return J({ error: 'No pupils are linked to this number any more. Please contact the school office.' }, 403);
  const token = await issueParentToken(env, tenant, phone, kids.map(k => k.id));
  return J({ ok: true, token, tenant, children: kids, expiresInDays: PARENT_TOKEN_DAYS });
}

async function handleParentChildren(request, env, cors) {
  const J = (o, st) => new Response(JSON.stringify(o), { status: st || 200, headers: { ...cors, 'Content-Type': 'application/json' } });
  const p = await readParentToken(request, env);
  if (!p) return J({ error: 'Please sign in again.' }, 401);
  const kids = await childrenForPhone(env, p.tenant, p.phone);
  return J({ tenant: p.tenant, children: kids });
}

// Is this pupil still linked to the signed-in parent's phone? (fresh DB check)
async function parentOwnsStudent(env, p, studentId) {
  const sid = Number(studentId);
  if (!p || !(p.studentIds.indexOf(sid) >= 0)) return false;
  const rows = await sbFetch(env, '/students?id=eq.' + sid + '&tenant_id=eq.' + encodeURIComponent(p.tenant) + '&select=guardian_phone&limit=1');
  return !!(rows && rows[0] && phonesIn(rows[0].guardian_phone).indexOf(p.phone) >= 0);
}

export { OTP_MAX_TRIES, OTP_SENDS_PER_IP, OTP_SENDS_PER_PHONE, OTP_TTL_S, PARENT_TOKEN_DAYS, b64u, b64uDecode, childrenForPhone, handleParentChildren, handleParentOtpSend, handleParentOtpVerify, issueParentToken, kvBump, normPhone, parentKey, parentOwnsStudent, phonesIn, readParentToken, sendParentSms, sha256hex };
