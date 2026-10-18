const USERS = { 'tok-head': { user: { id: 'u-h', email: 'head@kl.ug' }, rows: [{ tenant_id: 'kl', role: 'head' }] }, 'tok-teacher': { user: { id: 'u-t', email: 't@kl.ug' }, rows: [{ tenant_id: 'kl', role: 'teacher' }] }, 'tok-op': { user: { id: 'u-o', email: 'patrickemma143@gmail.com' }, rows: [] } };
let hit = false;
globalThis.fetch = async (u, o = {}) => { u = String(u); const h = o.headers || {}; const J = (x, s = 200) => new Response(JSON.stringify(x), { status: s, headers: { 'Content-Type': 'application/json' } });
  if (u.includes('/auth/v1/user')) { const t = (h.Authorization || '').replace('Bearer ', ''); return USERS[t] ? J(USERS[t].user) : J({}, 401); }
  if (u.includes('/rest/v1/users?auth_id')) { const id = decodeURIComponent(u.match(/auth_id=eq\.([^&]+)/)[1]); const e = Object.values(USERS).find(x => x.user.id === id); return J(e ? e.rows : []); }
  if (u.includes('/rest/v1/tenants?head_email')) return J([]);
  if (u.includes('os_records')) { hit = true; return J([{ id: 1, payload: { studentId: 1, descriptor: [0.1] } }]); }
  return J([]); };
console.log = () => {};
const { default: worker } = await import('../sentinel-worker.js');
const out = s => process.stdout.write(s + '\n');
const base = { SUPABASE_URL: 'https://sb.test', SUPABASE_KEY: 'svc', PLATFORM_ADMINS: 'patrickemma143@gmail.com', AUTH_MODE: 'warn' };
async function get(env, tok, kind) { hit = false; const h = {}; if (tok) h.Authorization = 'Bearer ' + tok; const r = await worker.fetch(new Request('https://w.test/os-data?kind=' + kind + '&tenant=kl', { headers: h }), env); const d = await r.json(); return r.status + ' ' + (d.error || ('records=' + (d.records || []).length)) + (hit ? '  [DB read]' : ''); }
async function save(env, tok) { hit = false; const h = { 'Content-Type': 'application/json' }; if (tok) h.Authorization = 'Bearer ' + tok; const r = await worker.fetch(new Request('https://w.test/os-data/save', { method: 'POST', headers: h, body: JSON.stringify({ kind: 'face_enroll', tenant: 'kl', record: { descriptor: [1] } }) }), env); const d = await r.json(); return r.status + ' ' + (d.error || 'saved') + (hit ? '  [DB write]' : ''); }
const off = base, on = { ...base, FACE_RECOGNITION: 'on' };
out('OFF  anonymous read faces        ' + await get(off, null, 'face_enroll'));
out('OFF  head reads faces            ' + await get(off, 'tok-head', 'face_enroll'));
out('OFF  head saves face             ' + await save(off, 'tok-head'));
out('OFF  head reads cameras (other)  ' + await get(off, 'tok-head', 'camera'));
out('ON   anonymous read faces        ' + await get(on, null, 'face_enroll'));
out('ON   teacher reads faces         ' + await get(on, 'tok-teacher', 'face_enroll'));
out('ON   head reads faces            ' + await get(on, 'tok-head', 'face_enroll'));
out('ON   operator reads faces        ' + await get(on, 'tok-op', 'face_enroll'));
out('ON   teacher saves face          ' + await save(on, 'tok-teacher'));
