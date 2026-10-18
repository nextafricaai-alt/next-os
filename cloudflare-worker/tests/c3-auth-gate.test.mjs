const KL = 'kabs-lily-junior-school-and-kindercare-centre';
const USERS = {
  'tok-head':    { user: { id: 'u-head', email: 'head@kl.ug' },    rows: [{ tenant_id: KL, role: 'head' }] },
  'tok-teacher': { user: { id: 'u-t', email: 'esther@kl.ug' },     rows: [{ tenant_id: KL, role: 'teacher' }] },
  'tok-bursar':  { user: { id: 'u-b', email: 'jane@kl.ug' },       rows: [{ tenant_id: KL, role: 'bursar' }] },
  'tok-other':   { user: { id: 'u-o', email: 'head@peak.ug' },     rows: [{ tenant_id: 'peak-primary', role: 'head' }] },
  'tok-op':      { user: { id: 'u-p', email: 'patrickemma143@gmail.com' }, rows: [] },
};
const writes = [];
globalThis.fetch = async (u, opts = {}) => {
  u = String(u); const h = opts.headers || {};
  const J = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json' } });
  if (u.includes('/auth/v1/user')) { const t = (h.Authorization || '').replace('Bearer ', ''); return USERS[t] ? J(USERS[t].user) : J({ msg: 'bad jwt' }, 401); }
  if (u.includes('/rest/v1/users?auth_id')) { const id = decodeURIComponent(u.match(/auth_id=eq\.([^&]+)/)[1]); const e = Object.values(USERS).find(x => x.user.id === id); return J(e ? e.rows : []); }
  if (u.includes('/rest/v1/tenants?head_email')) return J([]);
  if (opts.method && opts.method !== 'GET') writes.push(opts.method + ' ' + u.replace('https://sb.test/rest/v1', ''));
  return J([]);
};
const logs = []; const ol = console.log; console.log = (...a) => { const s = a.join(' '); if (s.includes('[auth-gate]')) logs.push(s); };
const { default: worker } = await import('../sentinel-worker.js');
const base = { SUPABASE_URL: 'https://sb.test', SUPABASE_KEY: 'svc', PLATFORM_ADMINS: 'hudson.tim.uk@gmail.com,patrickemma143@gmail.com' };
async function call(mode, method, path, tok, body) {
  const headers = { 'Origin': 'https://nextos.nextafrica.ai' };
  if (tok) headers.Authorization = 'Bearer ' + tok;
  if (body) headers['Content-Type'] = 'application/json';
  const r = await worker.fetch(new Request('https://w.test' + path, { method, headers, body: body ? JSON.stringify(body) : undefined }), { ...base, AUTH_MODE: mode });
  return r.status;
}
const cases = [
  ['GET',  '/students?tenant=' + KL, null,          'no token → students list'],
  ['GET',  '/students?tenant=' + KL, 'tok-bad',     'forged token'],
  ['GET',  '/students?tenant=' + KL, 'tok-other',   'other school head reads KL pupils'],
  ['GET',  '/students?tenant=' + KL, 'tok-teacher', 'KL teacher reads KL pupils'],
  ['POST', '/finance/delete', 'tok-teacher', 'KL teacher deletes finance', { tenant_id: KL, id: '5' }],
  ['POST', '/finance/delete', 'tok-head',    'KL head deletes finance',    { tenant_id: KL, id: '5' }],
  ['POST', '/finance/save',   'tok-bursar',  'KL bursar records expense',  { tenant_id: KL, txn: { kind: 'expense', amount: 1000 } }],
  ['POST', '/whatsapp/bulk',  null,          'anonymous WhatsApp blast',   { items: [{ to: '256700000000', text: 'hi' }] }],
  ['POST', '/brand/save',     'tok-other',   'other school rebrands KL',   { tenant: KL, name: 'Hacked' }],
  ['POST', '/exams/save',     'tok-teacher', 'KL teacher edits own exam',  { tenant_id: KL, exam: { id: '9', name: 'Mid' } }],
  ['GET',  '/os-data?kind=nia_memory&tenant=next', 'tok-op', 'operator reads NEXT os-data'],
  ['GET',  '/os-data?kind=nia_memory&tenant=next', 'tok-head', 'school head reads NEXT os-data'],
  ['POST', '/os-data/delete', 'tok-teacher', 'teacher deletes os record (scoped)', { id: 'abc' }],
  ['GET',  '/brand?s=' + KL, null,           'public brand (not gated)'],
];
for (const mode of ['warn', 'enforce']) {
  ol('\n=== AUTH_MODE=' + mode);
  for (const [m, p, t, label, b] of cases) { writes.length = 0; const s = await call(mode, m, p, t, b); ol(String(s).padEnd(4), label.padEnd(40), writes.length ? writes.join(' | ').slice(0, 150) : ''); }
}
ol('\nlog sample:', logs.slice(0, 3).join('\n'));
