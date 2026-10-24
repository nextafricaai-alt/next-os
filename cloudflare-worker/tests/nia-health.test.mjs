// Nia Health: finds double pupils, close spellings, class spellings, missing
// fees, overpayments, login problems and missed roll call; saves them; fixes
// only after the head approves; teachers can't see or fix; re-check closes
// what is gone and never re-opens a dismissed alert.
const NOW = Date.now();
const day = n => new Date(NOW - n * 86400000).toISOString();
const DB = {
  tenants: [{ id: 'kl', head_email: 'head@kl.ug' }],
  students: [
    { id: 1, tenant_id: 'kl', name: 'ASIIMWE BRENDA', stream: 'Primary Four', guardian_phone: '0701', status: 'active' },
    { id: 2, tenant_id: 'kl', name: 'Asimwe Brenda', stream: 'P4', guardian_phone: '', status: 'active' },
    { id: 3, tenant_id: 'kl', name: 'AIZUKA TREVOR', stream: 'Primary Three', guardian_phone: '0702', status: 'active' },
    { id: 4, tenant_id: 'kl', name: 'Ajuka Trevor', stream: 'P3', guardian_phone: '0703', status: 'active' },
    { id: 5, tenant_id: 'kl', name: 'Kato Ivan', stream: 'Primary Three', guardian_phone: '0704', status: 'active' },
    { id: 6, tenant_id: 'kl', name: 'Kato Ian', stream: 'Primary One', guardian_phone: '0705', status: 'active' },
  ],
  fees: [
    { tenant_id: 'kl', student_id: 1, kind: 'charge', amount: 300000, term_id: 9 }, { tenant_id: 'kl', student_id: 1, kind: 'payment', amount: -310000, term_id: 9 },
    { tenant_id: 'kl', student_id: 2, kind: 'charge', amount: 300000, term_id: 9 }, { tenant_id: 'kl', student_id: 3, kind: 'charge', amount: 250000, term_id: 9 },
    { tenant_id: 'kl', student_id: 4, kind: 'charge', amount: 250000, term_id: 9 }, { tenant_id: 'kl', student_id: 5, kind: 'charge', amount: 250000, term_id: 9 },
  ],
  academic_terms: [{ id: 9, tenant_id: 'kl', name: 'Term 3 2026', status: 'current' }],
  teachers: [{ id: 1, tenant_id: 'kl', email: 'jane@kl.ug', full_name: 'Jane T', status: 'active' }, { id: 2, tenant_id: 'kl', email: 'paul@kl.ug', full_name: 'Paul O', status: 'active' }],
  users: [
    { id: 10, auth_id: 'a-head', tenant_id: 'kl', email: 'head@kl.ug', role: 'head', full_name: 'Head', active: true },
    { id: 11, auth_id: 'a-jane', tenant_id: 'kl', email: 'jane@kl.ug', role: 'teacher', full_name: 'Jane T', active: true },
    { id: 12, auth_id: 'a-sam', tenant_id: 'kl', email: 'sam@kl.ug', role: 'teacher', full_name: 'Sam K', active: true },
  ],
  student_roll_call: [],
  nia_findings: [],
};
const AUTH = { 'a-head': { id: 'a-head', email: 'head@kl.ug', created_at: day(40), last_sign_in_at: day(0) }, 'a-jane': { id: 'a-jane', email: 'jane@kl.ug', created_at: day(5), last_sign_in_at: null }, 'a-sam': { id: 'a-sam', email: 'sam@kl.ug', created_at: day(9), last_sign_in_at: day(1) } };
let nid = 1; const calls = [];
const match = (r, q) => [...q].every(([k, v]) => {
  if (['select', 'order', 'limit', 'offset', 'on_conflict', 'or'].includes(k)) return true;
  if (/^eq\./.test(v)) return String(r[k]) === v.slice(3);
  if (/^in\.\(/.test(v)) return v.slice(4, -1).split(',').map(x => x.replace(/^"|"$/g, '')).includes(String(r[k]));
  return true; });
globalThis.fetch = async (u, o = {}) => { u = decodeURIComponent(String(u)); const J = (x, s = 200) => new Response(JSON.stringify(x), { status: s, headers: { 'Content-Type': 'application/json' } });
  const method = o.method || 'GET'; const h = new Headers(o.headers || {});
  if (u.endsWith('/auth/v1/user')) { const t = String(h.get('authorization') || '').replace('Bearer ', ''); const a = AUTH[t]; return a ? J(a) : J({}, 401); }
  if (/\/auth\/v1\/admin\/users\?/.test(u)) return J({ users: Object.values(AUTH) });
  let m = u.match(/\/rest\/v1\/rpc\/nx_merge_students$/);
  if (m) { const b = JSON.parse(o.body); calls.push('merge ' + b.p_keep + '<-' + b.p_dup); DB.fees.forEach(f => { if (f.student_id === b.p_dup) f.student_id = b.p_keep; }); DB.students = DB.students.filter(s => s.id !== b.p_dup); return J({ kept: b.p_keep }); }
  m = u.match(/\/rest\/v1\/([a-z_]+)\??(.*)$/); if (!m) return J({});
  const t = m[1], q = new URLSearchParams(m[2]);
  const rows = (DB[t] || []).filter(r => match(r, q));
  if (method === 'GET') { if (q.get('or')) return J(rows.filter(r => r.status === 'open' || r.closed_at)); return J(rows); }
  if (method === 'POST') { const b = JSON.parse(o.body); const list = Array.isArray(b) ? b : [b];
    if (t === 'nia_findings') list.forEach(x => { const e = DB.nia_findings.find(f => f.tenant_id === x.tenant_id && f.code === x.code && f.subject === x.subject); if (e) Object.assign(e, x); else DB.nia_findings.push(Object.assign({ id: nid++, status: 'open' }, x)); });
    else list.forEach(x => { x.id = 100 + DB[t].length; DB[t].push(x); calls.push('insert ' + t); });
    return new Response(null, { status: 201 }); }
  if (method === 'PATCH') { const b = JSON.parse(o.body); rows.forEach(r => Object.assign(r, b)); if (t !== 'nia_findings') calls.push('patch ' + t + ' ' + rows.length); return J(rows); }
  return J([]); };
console.log = () => {}; console.warn = () => {};
const { default: worker } = await import('../sentinel-worker.js');
const env = { SUPABASE_URL: 'https://sb.test', SUPABASE_KEY: 'sb_secret_x', PLATFORM_ADMINS: 'op@next.ug' };
const call = async (tok, path, body) => { const r = await worker.fetch(new Request('https://w.test' + path, { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, tok ? { Authorization: 'Bearer ' + tok } : {}), body: JSON.stringify(Object.assign({ tenant: 'kl' }, body)) }), env); return { status: r.status, j: await r.json() }; };
const out = (l, r) => process.stdout.write(l.padEnd(40) + r + '\n');
out('no sign-in', (await call(null, '/nia/findings', { run: true })).j.error);
out('teacher', (await call('a-jane', '/nia/findings', { run: true })).j.error);
let r = await call('a-head', '/nia/findings', { run: true });
const show = () => DB.nia_findings.filter(f => f.status === 'open').map(f => f.code + ':' + f.subject).sort().join(' ');
out('head: run', r.j.ok + ' found=' + r.j.ran.found);
out('  open alerts', show());
const byCode = c => DB.nia_findings.find(f => f.code === c && f.status === 'open');
out('  titles', DB.nia_findings.map(f => f.title).sort().join(' | '));
out('teacher tries to fix', (await call('a-jane', '/nia/fix', { id: byCode('dup_pupil').id })).j.error);
out('head approves merge', JSON.stringify((await call('a-head', '/nia/fix', { id: byCode('dup_pupil').id })).j));
out('  db calls', calls.join(', '));
out('head approves it again', (await call('a-head', '/nia/fix', { id: DB.nia_findings.find(f => f.code === 'dup_pupil').id })).j.error);
out('head dismisses Kato pair?', byCode('similar_pupil') ? byCode('similar_pupil').subject : 'none');
out('head dismisses Aizuka? no: approve', JSON.stringify((await call('a-head', '/nia/fix', { id: byCode('similar_pupil').id })).j));
out('rename classes', JSON.stringify((await call('a-head', '/nia/fix', { id: byCode('class_spelling').id })).j));
out('add teacher record', JSON.stringify((await call('a-head', '/nia/fix', { id: byCode('teacher_no_record').id })).j));
out('reset_password via Nia', (await call('a-head', '/nia/fix', { id: byCode('never_signed_in').id })).j.error);
out('dismiss overpaid', JSON.stringify((await call('a-head', '/nia/dismiss', { id: byCode('overpaid').id })).j));
calls.length = 0;
r = await call('a-head', '/nia/findings', { run: true });
out('re-check', r.j.ok + ' found=' + r.j.ran.found + ' resolved=' + r.j.ran.resolved);
out('  still open', show());
out('  overpaid stays dismissed', DB.nia_findings.find(f => f.code === 'overpaid').status);
out('  pupils left', DB.students.map(s => s.id + ' ' + s.stream).join(', '));
