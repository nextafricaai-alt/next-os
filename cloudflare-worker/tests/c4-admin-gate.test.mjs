const USERS = {
  'tok-op':   { user: { id: 'u-p', email: 'patrickemma143@gmail.com' }, rows: [] },
  'tok-head': { user: { id: 'u-h', email: 'head@kl.ug' }, rows: [{ tenant_id: 'kabs-lily', role: 'head' }] },
};
const EXISTING = new Set(['kabs-lily']);
let calls = [];
globalThis.fetch = async (u, o = {}) => {
  u = String(u); const h = o.headers || {}; const J = (x, s = 200) => new Response(JSON.stringify(x), { status: s, headers: { 'Content-Type': 'application/json' } });
  if (u.includes('/auth/v1/user')) { const t = (h.Authorization || '').replace('Bearer ', ''); return USERS[t] ? J(USERS[t].user) : J({}, 401); }
  if (u.includes('/rest/v1/users?auth_id')) { const id = decodeURIComponent(u.match(/auth_id=eq\.([^&]+)/)[1]); const e = Object.values(USERS).find(x => x.user.id === id); return J(e ? e.rows : []); }
  if (u.includes('/rest/v1/tenants?head_email')) return J([]);
  if (u.includes('/rest/v1/tenants?id=eq.')) { const id = decodeURIComponent(u.match(/id=eq\.([^&]+)/)[1]); return J(EXISTING.has(id) ? [{ id, name: 'Kabs Lily' }] : []); }
  if (u.includes('/auth/v1/admin/users') && o.method === 'POST') { calls.push('CREATE-AUTH-USER'); return J({ id: 'new-auth' }); }
  if (u.includes('/auth/v1/admin/users/') && o.method === 'PUT') { calls.push('RESET-PASSWORD'); return J({}); }
  if (u.includes('/rest/v1/users?email')) return J([{ auth_id: 'a1' }]);
  if (o.method && o.method !== 'GET') calls.push(o.method + ' ' + u.replace('https://sb.test/rest/v1', '').split('?')[0]);
  return J([]);
};
const kv = new Map(); const KV = { get: async k => kv.get(k) || null, put: async (k, v) => kv.set(k, v) };
console.log = () => {};
const { default: worker } = await import('../sentinel-worker.js');
const out = (...a) => process.stdout.write(a.join(' ') + '\n');
async function call(env, path, tok, body, ip = '1.1.1.1') {
  calls = [];
  const headers = { 'Content-Type': 'application/json', 'CF-Connecting-IP': ip }; if (tok) headers.Authorization = 'Bearer ' + tok;
  const r = await worker.fetch(new Request('https://w.test' + path, { method: 'POST', headers, body: JSON.stringify(body) }), env);
  const d = await r.json(); return r.status + ' ' + (d.error || (d.ok ? 'ok' : '')) + (calls.length ? '  [' + calls.join(', ') + ']' : '');
}
const base = { SUPABASE_URL: 'https://sb.test', SUPABASE_KEY: 'svc', PLATFORM_ADMINS: 'hudson.tim.uk@gmail.com,patrickemma143@gmail.com', BRIEFS_KV: KV };
const warnNoPin = { ...base, AUTH_MODE: 'warn' }, warnPin = { ...base, AUTH_MODE: 'warn', GATE_PIN: 'Long-Secret-77' }, enforcePin = { ...base, AUTH_MODE: 'enforce', GATE_PIN: 'Long-Secret-77' };
const school = (slug, pin) => ({ name: 'New School', slug, adminEmail: 'h@new.ug', pin });
out('old default PIN 1379, no GATE_PIN set      ', await call(warnNoPin, '/provision-school', null, school('new-school', '1379')));
out('operator, new school                       ', await call(warnNoPin, '/provision-school', 'tok-op', school('new-school')));
out('operator, EXISTING school (takeover try)   ', await call(warnNoPin, '/provision-school', 'tok-op', school('kabs-lily')));
out('school head token, provision               ', await call(warnNoPin, '/provision-school', 'tok-head', school('x-school')));
out('reset-login, old PIN 1379                  ', await call(warnNoPin, '/admin/reset-login', null, { pin: '1379', email: 'head@kl.ug' }));
out('reset-login, school head token             ', await call(warnNoPin, '/admin/reset-login', 'tok-head', { email: 'other@kl.ug' }));
out('reset-login, operator                      ', await call(warnNoPin, '/admin/reset-login', 'tok-op', { email: 'head@kl.ug' }));
out('warn + GATE_PIN set, correct PIN           ', await call(warnPin, '/provision-school', null, school('pin-school', 'Long-Secret-77')));
for (let i = 1; i <= 6; i++) out('wrong PIN attempt ' + i + '                        ', await call(warnPin, '/admin/reset-login', null, { pin: '000' + i, email: 'a@b.c' }, '9.9.9.9'));
out('correct PIN after lockout (same IP)        ', await call(warnPin, '/admin/reset-login', null, { pin: 'Long-Secret-77', email: 'head@kl.ug' }, '9.9.9.9'));
out('enforce mode, correct PIN only             ', await call(enforcePin, '/provision-school', null, school('pin-school', 'Long-Secret-77')));
out('provision-business, PIN 1379               ', await call(warnNoPin, '/provision-business', null, { pin: '1379', config: { businessName: 'X', businessType: 'y', owner: { email: 'o@x' } } }));
