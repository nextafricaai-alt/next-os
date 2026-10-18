import { AUTH_CTX, verifyMember } from './gate.mjs';
import { sbFetch, sbHeaders, sbWrite } from './supabase.mjs';




// ─── Web Push (RFC 8291 aes128gcm + VAPID ES256) ───────────────────────────
function _pbu(s) { s = String(s).replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; const bin = atob(s); const b = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i); return b; }
function _b64u(buf) { const b = new Uint8Array(buf); let s = ''; for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function _cat() { let len = 0; for (const a of arguments) len += a.length; const out = new Uint8Array(len); let o = 0; for (const a of arguments) { out.set(a, o); o += a.length; } return out; }
async function _hmac(keyBuf, dataBuf) { const k = await crypto.subtle.importKey('raw', keyBuf, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']); return new Uint8Array(await crypto.subtle.sign('HMAC', k, dataBuf)); }

async function _vapidJWT(env, aud) {
  const te = new TextEncoder();
  const head = _b64u(te.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const body = _b64u(te.encode(JSON.stringify({ aud: aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: env.VAPID_SUBJECT || 'mailto:admin@nextafrica.ai' })));
  const unsigned = head + '.' + body;
  const jwk = JSON.parse(env.VAPID_JWK);
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, te.encode(unsigned));
  return unsigned + '.' + _b64u(sig);
}

async function _encryptPush(payloadStr, p256dhB64, authB64) {
  const te = new TextEncoder();
  const uaPub = _pbu(p256dhB64);
  const authSecret = _pbu(authB64);
  const eph = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const asPubRaw = new Uint8Array(await crypto.subtle.exportKey('raw', eph.publicKey));
  const uaKey = await crypto.subtle.importKey('raw', uaPub, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, eph.privateKey, 256));
  const prkKey = await _hmac(authSecret, ecdh);
  const keyInfo = _cat(te.encode('WebPush: info\0'), uaPub, asPubRaw);
  const ikm = await _hmac(prkKey, _cat(keyInfo, new Uint8Array([1])));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const prk = await _hmac(salt, ikm);
  const cek = (await _hmac(prk, _cat(te.encode('Content-Encoding: aes128gcm\0'), new Uint8Array([1])))).slice(0, 16);
  const nonce = (await _hmac(prk, _cat(te.encode('Content-Encoding: nonce\0'), new Uint8Array([1])))).slice(0, 12);
  const plaintext = _cat(te.encode(payloadStr), new Uint8Array([2]));
  const aesKey = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt']);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, plaintext));
  const rs = new Uint8Array([0, 0, 0x10, 0]);
  const idlen = new Uint8Array([asPubRaw.length]);
  return _cat(salt, rs, idlen, asPubRaw, ct);
}

async function sendWebPush(env, sub, payloadObj) {
  try {
    if (!env.VAPID_JWK || !env.VAPID_PUBLIC) return { ok: false, status: 0, error: 'VAPID not configured' };
    const aud = new URL(sub.endpoint).origin;
    const jwt = await _vapidJWT(env, aud);
    const body = await _encryptPush(JSON.stringify(payloadObj), sub.keys.p256dh, sub.keys.auth);
    const res = await fetch(sub.endpoint, {
      method: 'POST',
      headers: {
        'TTL': '2419200',
        'Content-Encoding': 'aes128gcm',
        'Content-Type': 'application/octet-stream',
        'Authorization': 'vapid t=' + jwt + ', k=' + env.VAPID_PUBLIC,
      },
      body: body,
    });
    return { ok: res.status >= 200 && res.status < 300, status: res.status, gone: res.status === 404 || res.status === 410 };
  } catch (e) { return { ok: false, status: 0, error: String((e && e.message) || e) }; }
}

async function deliverPush(env, tenant, emails, role, payload) {
  let rows = [];
  try { rows = await sbFetch(env, '/os_records?tenant=eq.' + encodeURIComponent(tenant) + '&kind=eq.push_sub&select=id,payload&limit=1000'); } catch (e) {}
  const emailSet = (emails || []).map(e => String(e).toLowerCase());
  const targets = (rows || []).filter(r => {
    const p = r.payload || {};
    if (emailSet.length) return emailSet.indexOf((p.email || '').toLowerCase()) >= 0;
    if (role) { const OPS = ['operator', 'owner', 'admin', 'director']; if (OPS.indexOf(role) >= 0) return OPS.indexOf(p.role || '') >= 0; return (p.role || '') === role; }
    return false;
  });
  let ok = 0, gone = 0;
  for (const r of targets) {
    const res = await sendWebPush(env, r.payload, payload);
    if (res.ok) ok++;
    if (res.gone) { gone++; try { await fetch(env.SUPABASE_URL + '/rest/v1/os_records?id=eq.' + r.id, { method: 'DELETE', headers: sbHeaders(env, 'return=minimal') }); } catch (e) {} }
  }
  return { matched: targets.length, ok: ok, gone: gone };
}

async function handlePushSubscribe(request, env, cors) {
  const J = (oo, st) => new Response(JSON.stringify(oo), { status: st || 200, headers: { ...cors, 'Content-Type': 'application/json' } });
  let b; try { b = await request.json(); } catch (e) { return J({ error: 'bad body' }, 400); }
  let tenant = String(b.tenant || 'next').trim();
  let email = String(b.email || '').trim().toLowerCase();
  let role = String(b.role || '').trim();
  const sub = b.subscription;
  // Parents have no email/login — they're identified by which child(ren)
  // they found via GuardianLookup, so a parent subscription is targeted by
  // student_id instead of email (see deliverPushByStudent below).
  let studentIds = Array.isArray(b.student_ids) ? b.student_ids.map(Number).filter(n => !isNaN(n)) : [];
  const pctx = AUTH_CTX.get(request);
  if (pctx && pctx.role === 'parent') {
    // Parent pass (C8): only that parent's own children, in their own school.
    tenant = pctx.tenant; role = 'parent'; email = '';
    studentIds = studentIds.length ? studentIds.filter(id => pctx.parent.studentIds.indexOf(id) >= 0) : pctx.parent.studentIds.slice();
  } else if (role === 'parent' || studentIds.length) {
    return J({ error: 'Parents must sign in with their phone number to turn on alerts.', parentSignIn: true }, 401);
  }
  if (!sub || !sub.endpoint || !sub.keys || !sub.keys.p256dh || !sub.keys.auth) return J({ error: 'valid subscription required' }, 400);
  try {
    const existing = await sbFetch(env, '/os_records?tenant=eq.' + encodeURIComponent(tenant) + '&kind=eq.push_sub&select=id,payload&limit=1000');
    for (const row of (existing || [])) { if (row.payload && row.payload.endpoint === sub.endpoint) { try { await fetch(env.SUPABASE_URL + '/rest/v1/os_records?id=eq.' + row.id, { method: 'DELETE', headers: sbHeaders(env, 'return=minimal') }); } catch (e) {} } }
    await sbWrite(env, '/os_records', { tenant: tenant, kind: 'push_sub', payload: { email: email, role: role, student_ids: studentIds, endpoint: sub.endpoint, keys: sub.keys, ts: Date.now() } }, 'POST', 'return=minimal');
    return J({ ok: true });
  } catch (e) { return J({ error: String((e && e.message) || e) }, 200); }
}

// Delivers a push to every parent subscription watching this specific
// student (role:'parent', student_ids includes studentId) — the absence/
// note notification pipeline. Not gated by verifyMember like
// handlePushNotify: this is fired automatically right after the teacher's
// own already-scoped roll-call/note write succeeds, not a staff-initiated
// broadcast to an arbitrary audience.
async function deliverPushByStudent(env, tenant, studentId, payload) {
  const sid = Number(studentId);
  let rows = [];
  try { rows = await sbFetch(env, '/os_records?tenant=eq.' + encodeURIComponent(tenant) + '&kind=eq.push_sub&select=id,payload&limit=1000'); } catch (e) { return { matched: 0, ok: 0 }; }
  const targets = (rows || []).filter(r => {
    const p = r.payload || {};
    return p.role === 'parent' && Array.isArray(p.student_ids) && p.student_ids.indexOf(sid) >= 0;
  });
  let ok = 0, gone = 0;
  for (const r of targets) {
    const res = await sendWebPush(env, r.payload, payload);
    if (res.ok) ok++;
    if (res.gone) { gone++; try { await fetch(env.SUPABASE_URL + '/rest/v1/os_records?id=eq.' + r.id, { method: 'DELETE', headers: sbHeaders(env, 'return=minimal') }); } catch (e) {} }
  }
  return { matched: targets.length, ok, gone };
}

async function handleParentNotify(request, env, cors) {
  const J = (oo, st) => new Response(JSON.stringify(oo), { status: st || 200, headers: { ...cors, 'Content-Type': 'application/json' } });
  let b; try { b = await request.json(); } catch (e) { return J({ error: 'bad body' }, 400); }
  const tenant = String(b.tenant || '').trim();
  const studentId = b.studentId || b.student_id;
  if (!tenant || !studentId) return J({ error: 'tenant and studentId required' }, 400);
  const payload = { title: String(b.title || 'NEXT OS'), body: String(b.body || ''), url: String(b.url || '/'), tag: String(b.tag || ('t' + Date.now())) };
  const r = await deliverPushByStudent(env, tenant, studentId, payload);
  return J({ ok: true, matched: r.matched, sent: r.ok });
}

async function handlePushNotify(request, env, cors) {
  const J = (oo, st) => new Response(JSON.stringify(oo), { status: st || 200, headers: { ...cors, 'Content-Type': 'application/json' } });
  let b; try { b = await request.json(); } catch (e) { return J({ error: 'bad body' }, 400); }
  const tenant = String(b.tenant || 'next').trim();
  const v = await verifyMember(request, env, tenant);
  if (!v.ok) return J({ error: 'not authorized: ' + (v.why || '') }, 401);
  const emails = Array.isArray(b.emails) ? b.emails : [];
  const role = b.role ? String(b.role) : null;
  const payload = { title: String(b.title || 'NEXT OS'), body: String(b.body || ''), url: String(b.url || '/'), tag: String(b.tag || ('t' + Date.now())) };
  if (!emails.length && !role) return J({ error: 'emails or role required' }, 400);
  const r = await deliverPush(env, tenant, emails, role, payload);
  return J({ ok: true, matched: r.matched, sent: r.ok, gone: r.gone });
}

async function handlePushTest(request, env, cors) {
  const J = (oo, st) => new Response(JSON.stringify(oo), { status: st || 200, headers: { ...cors, 'Content-Type': 'application/json' } });
  let b; try { b = await request.json(); } catch (e) { return J({ error: 'bad body' }, 400); }
  const tenant = String(b.tenant || 'next').trim();
  const email = String(b.email || '').trim().toLowerCase();
  if (!email) return J({ error: 'email required' }, 400);
  const r = await deliverPush(env, tenant, [email], null, { title: 'NEXT OS ✓', body: 'Phone alerts are on. Head’s tasks will land right here.', url: '/', tag: 'nx-test' });
  return J({ ok: true, matched: r.matched, sent: r.ok });
}

async function handlePushDebug(tenant, doSend, env, cors) {
  const J = (oo, st) => new Response(JSON.stringify(oo), { status: st || 200, headers: { ...cors, 'Content-Type': 'application/json' } });
  const conf = { VAPID_PUBLIC: !!env.VAPID_PUBLIC, VAPID_JWK: !!env.VAPID_JWK, VAPID_SUBJECT: env.VAPID_SUBJECT || null };
  let jwkOk = false; try { const j = JSON.parse(env.VAPID_JWK); jwkOk = !!(j && j.d && j.x && j.y); } catch (e) {}
  let rows = [];
  try { rows = await sbFetch(env, '/os_records?tenant=eq.' + encodeURIComponent(tenant) + '&kind=eq.push_sub&select=id,payload&limit=1000'); } catch (e) { return J({ tenant, conf, jwkOk, error: 'db: ' + String(e && e.message || e) }, 200); }
  const subs = (rows || []).map(r => { const p = r.payload || {}; let host = ''; try { host = new URL(p.endpoint).host; } catch (e) {} return { email: p.email || '', role: p.role || '', host: host, ts: p.ts || 0 }; });
  const out = { tenant, conf, jwkOk, subCount: subs.length, subs: subs };
  if (doSend) {
    const results = [];
    for (const r of (rows || [])) {
      const res = await sendWebPush(env, r.payload, { title: 'NEXT OS · diagnostic', body: 'If you see this, push works.', url: '/', tag: 'nx-debug' });
      let host = ''; try { host = new URL(r.payload.endpoint).host; } catch (e) {}
      results.push({ email: (r.payload && r.payload.email) || '', host: host, ok: res.ok, status: res.status, gone: !!res.gone, error: res.error || null });
    }
    out.sendResults = results;
  }
  return J(out, 200);
}

export { _b64u, _cat, _encryptPush, _hmac, _pbu, _vapidJWT, deliverPush, deliverPushByStudent, handleParentNotify, handlePushDebug, handlePushNotify, handlePushSubscribe, handlePushTest, sendWebPush };
