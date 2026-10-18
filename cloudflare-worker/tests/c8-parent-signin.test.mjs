const STUDENTS = [
  { id: 11, tenant_id: 'kl', name: 'Kato John', stream: 'P3', guardian_phone: '0772 123456 / 0701-999888' },
  { id: 12, tenant_id: 'kl', name: 'Nakato Mary', stream: 'P1', guardian_phone: '+256772123456' },
  { id: 13, tenant_id: 'kl', name: 'Other Kid', stream: 'P2', guardian_phone: '0755000111' },
  { id: 21, tenant_id: 'zz', name: 'Foreign Kid', stream: 'P2', guardian_phone: '0772123456' },
];
const USERS = { 'tok-teacher': { user: { id: 'u-t', email: 't@kl.ug' }, rows: [{ tenant_id: 'kl', role: 'teacher' }] } };
const KV = new Map(); const SMS = []; const WRITES = [];
const BRIEFS_KV = { get: async k => KV.has(k) ? KV.get(k) : null, put: async (k, v) => { KV.set(k, v); }, delete: async k => { KV.delete(k); } };
globalThis.fetch = async (u, o = {}) => { u = decodeURIComponent(String(u)); const h = o.headers instanceof Headers ? Object.fromEntries(o.headers) : (o.headers || {}); const J = (x, s = 200) => new Response(JSON.stringify(x), { status: s, headers: { 'Content-Type': 'application/json' } });
  if (u.includes('africastalking')) { const f = new URLSearchParams(o.body); SMS.push({ to: f.get('to'), msg: f.get('message') }); return J({ SMSMessageData: { Message: 'Sent', Recipients: [{ status: 'Success' }] } }); }
  if (u.includes('/auth/v1/user')) { const t = (h.Authorization || '').replace('Bearer ', ''); return USERS[t] ? J(USERS[t].user) : J({}, 401); }
  if (u.includes('/rest/v1/users?auth_id')) return J(USERS['tok-teacher'].rows);
  if (u.includes('/rest/v1/tenants?id=')) return J([{ name: 'Kabs Lily' }]);
  if (u.includes('/rest/v1/tenants')) return J([]);
  if (u.includes('/rest/v1/students')) {
    let r = STUDENTS.slice();
    const t = u.match(/tenant_id=eq\.([^&]+)/); if (t) r = r.filter(x => x.tenant_id === t[1]);
    const i = u.match(/[?&]id=eq\.([^&]+)/); if (i) r = r.filter(x => String(x.id) === i[1]);
    const n = u.match(/name=ilike\.([^&]+)/); if (n) { const pat = n[1].toLowerCase(); r = r.filter(x => pat.includes('*') ? x.name.toLowerCase().includes(pat.replace(/\*/g, '')) : x.name.toLowerCase() === pat); }
    return J(r);
  }
  if (u.includes('/rest/v1/messages') && o.method === 'POST') { WRITES.push(JSON.parse(o.body)); return J([{ id: 1 }]); }
  if (u.includes('/rest/v1/os_records') && o.method === 'POST') { WRITES.push(JSON.parse(o.body)); return J([]); }
  return J([]); };
console.log = () => {};
const { default: worker } = await import('../sentinel-worker.js');
const out = s => process.stdout.write(s + '\n');
const env = { SUPABASE_URL: 'https://sb.test', SUPABASE_KEY: 'svc', PLATFORM_ADMINS: 'patrickemma143@gmail.com', AUTH_MODE: 'warn', AT_USERNAME: 'x', AT_KEY: 'k', BRIEFS_KV };
async function call(path, { method = 'GET', body, headers = {}, e = env } = {}) {
  const h = { ...headers }; if (body) h['Content-Type'] = 'application/json';
  const r = await worker.fetch(new Request('https://w.test' + path, { method, headers: h, body: body ? JSON.stringify(body) : undefined }), e);
  let d; try { d = await r.json(); } catch (x) { d = {}; } return { s: r.status, d };
}
const show = (label, r, extra = '') => out(label.padEnd(46) + r.s + ' ' + (r.d.error || r.d.message || '') + extra);

show('send: no channel configured', await call('/parent/otp/send', { method: 'POST', body: { tenant: 'kl', phone: '0772123456' }, e: { ...env, AT_USERNAME: '' } }));
show('send: bad phone', await call('/parent/otp/send', { method: 'POST', body: { tenant: 'kl', phone: '12' } }));
let r = await call('/parent/otp/send', { method: 'POST', body: { tenant: 'kl', phone: '0799 000 000' } });
show('send: unknown number (same reply, no SMS)', r, '  sms=' + SMS.length);
r = await call('/parent/otp/send', { method: 'POST', body: { tenant: 'kl', phone: '0772-123-456' } });
show('send: registered number', r, '  sms=' + SMS.length + ' to ' + (SMS[0] && SMS[0].to));
const code = SMS[0].msg.slice(0, 6);
out('  SMS text: ' + SMS[0].msg);
show('verify: wrong code', await call('/parent/otp/verify', { method: 'POST', body: { tenant: 'kl', phone: '0772123456', code: code === '000000' ? '111111' : '000000' } }));
r = await call('/parent/otp/verify', { method: 'POST', body: { tenant: 'kl', phone: '+256 772 123456', code } });
show('verify: right code', r, '  children=' + JSON.stringify((r.d.children || []).map(c => c.id)));
const tok = r.d.token;
show('verify: code reused', await call('/parent/otp/verify', { method: 'POST', body: { tenant: 'kl', phone: '0772123456', code } }));
const P = { 'X-Parent-Token': tok };
r = await call('/parent/children', { headers: P }); show('children with pass', r, '  ' + JSON.stringify(r.d.children.map(c => c.id)));
show('children forged pass', await call('/parent/children', { headers: { 'X-Parent-Token': tok.slice(0, -3) + 'abc' } }));
show('child-data: no pass', await call('/parent/child-data?tenant=kl&student_id=11'));
show('child-data: own child', await call('/parent/child-data?tenant=kl&student_id=11', { headers: P }));
show('child-data: other child same school', await call('/parent/child-data?tenant=kl&student_id=13', { headers: P }));
show('child-data: other school same phone', await call('/parent/child-data?tenant=zz&student_id=21', { headers: P }));
show('child-data: teacher sign-in', await call('/parent/child-data?tenant=kl&student_id=13', { headers: { Authorization: 'Bearer tok-teacher' } }));
show('search-child (old)', await call('/parent/search-child', { method: 'POST', body: { tenant: 'kl', query: 'Kato' } }));
show('messages/list parent own', await call('/messages/list?tenant=kl&student_id=11', { headers: P }));
show('messages/list parent other', await call('/messages/list?tenant=kl&student_id=13', { headers: P }));
show('messages/send parent own', await call('/messages/send', { method: 'POST', headers: P, body: { tenant: 'zz', studentId: 11, senderRole: 'head', senderName: 'Mum', body: 'hi' } }), '  saved=' + JSON.stringify(WRITES.at(-1) && { t: WRITES.at(-1).tenant_id, r: WRITES.at(-1).sender_role }));
show('messages/send anon pretending parent', await call('/messages/send', { method: 'POST', body: { tenant: 'kl', studentId: 11, senderRole: 'parent', senderName: 'X', body: 'hi' } }));
const sub = { endpoint: 'https://push/1', keys: { p256dh: 'a', auth: 'b' } };
show('push/subscribe parent', await call('/push/subscribe', { method: 'POST', headers: P, body: { tenant: 'zz', role: 'parent', student_ids: [11, 13], subscription: sub } }), '  saved=' + JSON.stringify(WRITES.at(-1).payload.student_ids) + ' tenant=' + WRITES.at(-1).tenant);
show('push/subscribe anon parent', await call('/push/subscribe', { method: 'POST', body: { tenant: 'kl', role: 'parent', student_ids: [13], subscription: sub } }));
r = await call('/fees/lookup?tenant=kl&q=Kato'); show('fees/lookup partial name', r, ' matches=' + r.d.matches.length);
r = await call('/fees/lookup?tenant=kl&q=john%20kato'); show('fees/lookup full name (reversed)', r, ' ' + JSON.stringify(r.d.matches));
show('fees/checkout other-school id', await call('/fees/checkout', { method: 'POST', body: { tenant: 'kl', studentId: 21, amount: 1000 }, e: { ...env, FLW_SECRET_KEY: 'f' } }));
for (let i = 0; i < 3; i++) r = await call('/parent/otp/send', { method: 'POST', body: { tenant: 'kl', phone: '0772123456' } });
show('send: 4th code in 15 min', r);
