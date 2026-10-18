// Audit P1: head teacher manages staff logins; admins can't touch admins/head;
// nobody can switch off themselves; switched-off logins are banned in Auth.
const DB = {
  tenants: [{ id: 'kl', head_email: 'head@kl.ug' }, { id: 'other', head_email: 'h@o.ug' }],
  users: [
    { id: 1, auth_id: 'a-head', tenant_id: 'kl', email: 'head@kl.ug', role: 'head', full_name: 'Head', active: true },
    { id: 2, auth_id: 'a-adm', tenant_id: 'kl', email: 'admin@kl.ug', role: 'admin', full_name: 'Admin', active: true },
    { id: 4, auth_id: 'a-adm2', tenant_id: 'kl', email: 'admin2@kl.ug', role: 'admin', full_name: 'Admin Two', active: true },
    { id: 3, auth_id: 'a-t', tenant_id: 'kl', email: 'teach@kl.ug', role: 'teacher', full_name: 'Teacher T', active: true },
    { id: 9, auth_id: 'a-o', tenant_id: 'other', email: 'x@o.ug', role: 'teacher', full_name: 'Other', active: true },
  ],
  teachers: [{ id: 1, tenant_id: 'kl', email: 'teach@kl.ug', status: 'active' }],
};
const AUTH = { 'a-head': { id: 'a-head', email: 'head@kl.ug' }, 'a-adm': { id: 'a-adm', email: 'admin@kl.ug' }, 'a-t': { id: 'a-t', email: 'teach@kl.ug' }, 'a-adm2': { id: 'a-adm2', email: 'admin2@kl.ug' }, 'a-o': { id: 'a-o', email: 'x@o.ug' } };
const TOK = { head: 'a-head', admin: 'a-adm', teacher: 'a-t' };
let uid = 100;
globalThis.fetch = async (u, o = {}) => { u = decodeURIComponent(String(u)); const J = (x, s = 200) => new Response(JSON.stringify(x), { status: s, headers: { 'Content-Type': 'application/json' } });
  const method = o.method || 'GET'; const h = o.headers || {};
  if (u.endsWith('/auth/v1/user')) { const t = String(h.Authorization || '').replace('Bearer ', ''); const a = AUTH[t]; return a ? J(a) : J({ msg: 'bad' }, 401); }
  let m;
  if ((m = u.match(/\/auth\/v1\/admin\/users\/([^/?]+)$/))) { const a = AUTH[m[1]]; if (!a) return J({}, 404); if (method === 'PUT') { const b = JSON.parse(o.body); if (b.ban_duration) a.banned_until = b.ban_duration === 'none' ? null : '2126-01-01T00:00:00Z'; if (b.password) a.pw = b.password; a.user_metadata = Object.assign({}, a.user_metadata, b.user_metadata); return J(a); } if (method === 'DELETE') { delete AUTH[m[1]]; return J({}); } return J(a); }
  if (/\/auth\/v1\/admin\/users\?/.test(u)) return J({ users: Object.values(AUTH) });
  if (/\/auth\/v1\/admin\/users$/.test(u) && method === 'POST') { const b = JSON.parse(o.body); if (Object.values(AUTH).some(a => a.email === b.email)) return J({ msg: 'already registered' }, 422); const id = 'a-' + (uid++); AUTH[id] = { id, email: b.email, user_metadata: b.user_metadata, pw: b.password }; return J(AUTH[id]); }
  m = u.match(/\/rest\/v1\/([a-z_]+)\??(.*)$/); if (!m) return J({});
  const t = m[1], q = new URLSearchParams(m[2]);
  const rows = (DB[t] || []).filter(r => [...q].every(([k, v]) => !/^eq\./.test(v) || String(r[k]) === v.slice(3)));
  if (method === 'GET') return J(rows);
  if (method === 'POST') { const b = JSON.parse(o.body); b.id = 50 + DB[t].length; DB[t].push(b); return J([b], 201); }
  if (method === 'PATCH') { const b = JSON.parse(o.body); rows.forEach(r => Object.assign(r, b)); return new Response(null, { status: 204 }); }
  return J([]); };
console.log = () => {}; console.warn = () => {};
const { default: worker } = await import('../sentinel-worker.js');
const env = { SUPABASE_URL: 'https://sb.test', SUPABASE_KEY: 'k', PLATFORM_ADMINS: 'op@next.ug' };
const call = async (who, path, body) => { const r = await worker.fetch(new Request('https://w.test' + path, { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, who ? { Authorization: 'Bearer ' + TOK[who] } : {}), body: JSON.stringify(Object.assign({ tenant: 'kl' }, body)) }), env); const j = await r.json(); return r.status + ' ' + (j.ok ? 'ok' : j.error) + (j.tempPassword ? ' temp=' + (/^[A-Za-z0-9]{4}-[A-Za-z0-9]{6}$/.test(j.tempPassword) ? 'OK' : j.tempPassword) : ''); };
const out = (l, r) => process.stdout.write(l.padEnd(46) + r + '\n');
out('no token: list', await call(null, '/staff/accounts', {}));
out('teacher: list', await call('teacher', '/staff/accounts', {}));
out('head: list other school', await call('head', '/staff/accounts', { tenant: 'other' }));
out('head: create bursar', await call('head', '/staff/create', { email: 'Bursar@KL.ug', full_name: 'Grace Bursar', role: 'bursar' }));
const nb = DB.users.find(u => u.email === 'bursar@kl.ug'); const na = Object.values(AUTH).find(a => a.email === 'bursar@kl.ug');
out('  users row / must change', JSON.stringify({ role: nb.role, active: nb.active, must: na.user_metadata.must_change_password }));
out('head: same email again', await call('head', '/staff/create', { email: 'bursar@kl.ug', full_name: 'G', role: 'bursar' }));
out('head: email used by another school', await call('head', '/staff/create', { email: 'x@o.ug', full_name: 'X', role: 'teacher' }));
out('head: bad role', await call('head', '/staff/create', { email: 'n@kl.ug', full_name: 'N', role: 'head' }));
out('admin: create admin', await call('admin', '/staff/create', { email: 'a2@kl.ug', full_name: 'A2', role: 'admin' }));
out('admin: create teacher (+ teachers row)', await call('admin', '/staff/create', { email: 't2@kl.ug', full_name: 'T Two', role: 'teacher', subjects: 'Maths, English' }));
out('  teachers rows', String(DB.teachers.length));
out('head: reset bursar password', await call('head', '/staff/reset-password', { user_id: nb.id }));
out('admin: reset head password', await call('admin', '/staff/reset-password', { user_id: 1 }));
out('head: switch self off', await call('head', '/staff/set-active', { user_id: 1, active: false }));
out('admin: switch head off', await call('admin', '/staff/set-active', { user_id: 1, active: false }));
out('admin: switch another admin off', await call('admin', '/staff/set-active', { user_id: 4, active: false }));
out('head: keep admin as admin (set-role)', await call('head', '/staff/set-role', { user_id: 2, role: 'admin' }));
out('head: switch teacher off', await call('head', '/staff/set-active', { user_id: 3, active: false }));
out('  teacher banned / inactive / teachers.status', JSON.stringify({ banned: !!AUTH['a-t'].banned_until, active: DB.users.find(u => u.id === 3).active, status: DB.teachers[0].status }));
out('switched-off teacher tries to list', await call('teacher', '/staff/accounts', {}));
out('head: switch teacher back on', await call('head', '/staff/set-active', { user_id: 3, active: true }));
out('  teacher banned / active', JSON.stringify({ banned: !!AUTH['a-t'].banned_until, active: DB.users.find(u => u.id === 3).active }));
out('head: other school user id', await call('head', '/staff/set-active', { user_id: 9, active: false }));
out('head: make teacher bursar', await call('head', '/staff/set-role', { user_id: 3, role: 'bursar' }));
const lst = await (await worker.fetch(new Request('https://w.test/staff/accounts', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer a-head' }, body: JSON.stringify({ tenant: 'kl' }) }), env)).json();
out('head: list', lst.accounts.map(a => a.email + ':' + a.role + (a.active ? '' : '(off)') + (a.is_me ? '(me)' : '') + (a.must_change_password ? '(must-change)' : '')).join(' '));
