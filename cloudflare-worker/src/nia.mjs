import { sbFetch, sbHeaders } from './supabase.mjs';
import { accountsGate } from './accounts.mjs';

/* --- Nia Health ------------------------------------------------------------
   Nia checks each school's data and logins, saves what it finds in
   nia_findings, and shows it to the head teacher in Communications → Nia
   alerts. Nia NEVER fixes anything on its own: a fix only runs when the head
   teacher (or an admin) taps "Approve fix" on that alert.

     POST /nia/findings { tenant, run? }  → open alerts (+ recently closed);
                                            run:true re-checks right now
     POST /nia/fix      { tenant, id }    → run the fix for one alert
     POST /nia/dismiss  { tenant, id }    → "this is fine", hide it
   Cron: every 30 minutes every school is re-checked (niaRunAll).

   Fixes Nia can run after approval:
     merge_pupils     same child entered twice → nx_merge_students(keep, dup)
     rename_class     one class written several ways → one spelling
     add_teacher_row  teacher has a login but no teacher record
   Login problems (no login, never signed in) are fixed with the existing
   Staff & Audit tools; the alert opens them.
---------------------------------------------------------------------------- */

const J = (cors, o, st) => new Response(JSON.stringify(o), { status: st || 200, headers: { ...cors, 'Content-Type': 'application/json' } });
const enc = encodeURIComponent;

// "Asiimwe  Brenda" and "brenda asimwe" → "asimwe brenda"
export function nameKey(name) {
  return String(name || '').toLowerCase().replace(/[^a-z ]/g, ' ').split(/\s+/).filter(Boolean)
    .map(w => w.replace(/(.)\1+/g, '$1')).sort().join(' ');
}
// "Primary Three", "P.3", "p3" → "P3";  "Middle Class" → "MIDDLE"
export function classKey(stream) {
  let s = String(stream || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  [['PRIMARY', 'P'], ['ONE', '1'], ['TWO', '2'], ['THREE', '3'], ['FOUR', '4'], ['FIVE', '5'], ['SIX', '6'], ['SEVEN', '7'], ['CLASS', ''], ['SECTION', '']]
    .forEach(([a, b]) => { s = s.split(a).join(b); });
  return s;
}
export function lev(a, b) {
  if (a === b) return 0;
  const m = a.length, n = b.length; if (!m) return n; if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}
const names = (list, n) => list.slice(0, n || 8).join(', ') + (list.length > (n || 8) ? ' and ' + (list.length - (n || 8)) + ' more' : '');

async function listAuthUsers(env) {
  const out = [];
  for (let page = 1; page <= 10; page++) {
    const r = await fetch(env.SUPABASE_URL + '/auth/v1/admin/users?page=' + page + '&per_page=1000', { headers: sbHeaders(env) });
    if (!r.ok) return null;
    const j = await r.json().catch(() => ({}));
    const list = (j && j.users) || [];
    out.push(...list);
    if (list.length < 1000) break;
  }
  return out;
}

// ── The checks ───────────────────────────────────────────────────────────
export async function niaCheck(env, tenant, now) {
  now = now || new Date();
  const T = enc(tenant);
  const F = [];
  const add = (f) => F.push(Object.assign({ severity: 'warn', area: 'system', subject: '', data: {}, fix: null, detail: '' }, f));

  const [students, fees, terms, teachers, users] = await Promise.all([
    sbFetch(env, '/students?tenant_id=eq.' + T + '&select=*'),
    sbFetch(env, '/fees?tenant_id=eq.' + T + '&select=student_id,kind,amount,term_id,term'),
    sbFetch(env, '/academic_terms?tenant_id=eq.' + T + '&status=eq.current&select=*').catch(() => []),
    sbFetch(env, '/teachers?tenant_id=eq.' + T + '&select=*'),
    sbFetch(env, '/users?tenant_id=eq.' + T + '&select=*'),
  ]);
  const active = (students || []).filter(s => !s.status || s.status === 'active');
  const byId = {}; active.forEach(s => { byId[s.id] = s; });

  // 1. Same child entered twice --------------------------------------------
  const pairSeen = new Set();
  const groups = {};
  active.forEach(s => { const k = nameKey(s.name); if (k) (groups[k] = groups[k] || []).push(s); });
  Object.values(groups).forEach(g => {
    if (g.length < 2) return;
    g.sort((a, b) => a.id - b.id);
    const keep = g[0];
    g.slice(1).forEach(d => {
      const ck = classKey(keep.stream), cd = classKey(d.stream);
      const sameClass = !ck || !cd || ck === cd;
      pairSeen.add(keep.id + '-' + d.id);
      add({ code: 'dup_pupil', area: 'pupils', subject: keep.id + '-' + d.id, severity: sameClass ? 'warn' : 'info',
        title: sameClass ? keep.name + ' is entered twice' : keep.name + ' appears twice, in different classes',
        detail: keep.name + ' (' + (keep.stream || 'no class') + ', PK-' + String(keep.id).padStart(5, '0') + ') and ' + d.name + ' (' + (d.stream || 'no class') + ', PK-' + String(d.id).padStart(5, '0') + ').' + (sameClass ? ' Approving keeps the first record and moves fees, attendance and everything else onto it.' : ' Check they are the same child before approving — they may be siblings.'),
        data: { keep: keep.id, dup: d.id, keep_name: keep.name, dup_name: d.name }, fix: 'merge_pupils' });
    });
  });
  // Close spellings (Aizuka / Ajuka Trevor): same class, share a name word, 1–2 letters apart
  const byWord = {};
  active.forEach(s => { const k = nameKey(s.name); s._k = k; s._c = classKey(s.stream); k.split(' ').filter(w => w.length > 2).forEach(w => { (byWord[w] = byWord[w] || []).push(s); }); });
  Object.values(byWord).forEach(list => {
    if (list.length < 2 || list.length > 60) return;
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
      const a = list[i].id < list[j].id ? list[i] : list[j], b = a === list[i] ? list[j] : list[i];
      const key = a.id + '-' + b.id;
      if (pairSeen.has(key) || !a._c || a._c !== b._c || a._k === b._k) continue;
      const dist = lev(a._k, b._k);
      if (dist < 1 || dist > 2) continue;
      pairSeen.add(key);
      add({ code: 'similar_pupil', area: 'pupils', subject: key, severity: 'info',
        title: 'Same pupil? ' + a.name + ' / ' + b.name,
        detail: 'Both in ' + (a.stream || b.stream) + ', names ' + dist + ' letter' + (dist > 1 ? 's' : '') + ' apart. If this is one child, approve to merge into ' + a.name + ' (PK-' + String(a.id).padStart(5, '0') + '); if they are different children, dismiss.',
        data: { keep: a.id, dup: b.id, keep_name: a.name, dup_name: b.name }, fix: 'merge_pupils' });
    }
  });

  // 2. One class written several ways -------------------------------------
  const cls = {};
  active.forEach(s => { if (!s.stream) return; const k = classKey(s.stream); if (!k) return; cls[k] = cls[k] || {}; cls[k][s.stream] = (cls[k][s.stream] || 0) + 1; });
  Object.entries(cls).forEach(([k, spellings]) => {
    const list = Object.entries(spellings).sort((a, b) => b[1] - a[1]);
    if (list.length < 2) return;
    const to = list[0][0];
    const from = list.slice(1).map(x => x[0]);
    add({ code: 'class_spelling', area: 'pupils', subject: k, severity: 'info',
      title: 'Class "' + to + '" is written ' + list.length + ' ways',
      detail: list.map(x => '"' + x[0] + '" (' + x[1] + ')').join(', ') + '. Approving renames them all to "' + to + '" so lists, fees and reports group correctly.',
      data: { to, from }, fix: 'rename_class' });
  });

  // 3. Fees ---------------------------------------------------------------
  const cur = (terms || [])[0] || null;
  const bal = {}, hasTermFee = {};
  (fees || []).forEach(f => {
    const a = Number(f.amount) || 0;
    if (f.kind === 'charge') bal[f.student_id] = (bal[f.student_id] || 0) + a;
    else bal[f.student_id] = (bal[f.student_id] || 0) - Math.abs(a);
    if (f.kind === 'charge' && (!cur || f.term_id === cur.id || (cur.name && f.term === cur.name))) hasTermFee[f.student_id] = 1;
  });
  const noFee = active.filter(s => !hasTermFee[s.id]);
  if (noFee.length) add({ code: 'no_term_fees', area: 'fees', subject: cur ? String(cur.id) : 'all', severity: noFee.length > 20 ? 'warn' : 'info',
    title: noFee.length + ' pupil' + (noFee.length > 1 ? 's have' : ' has') + ' no fees ' + (cur ? 'for ' + cur.name : 'recorded'),
    detail: names(noFee.map(s => s.name)) + '. Their parents see no balance. Add fees under Fees → Terms & billing.',
    data: { count: noFee.length, ids: noFee.slice(0, 200).map(s => s.id) }, fix: 'open:fees' });
  const over = active.filter(s => bal[s.id] < 0);
  if (over.length) add({ code: 'overpaid', area: 'fees', subject: 'all', severity: 'info',
    title: over.length + ' pupil' + (over.length > 1 ? 's have' : ' has') + ' paid more than charged',
    detail: over.slice(0, 8).map(s => s.name + ' (UGX ' + Math.abs(bal[s.id]).toLocaleString('en-US') + ' over)').join(', ') + '. Either a real overpayment (carry it to next term) or a figure typed wrongly.',
    data: { ids: over.map(s => s.id) }, fix: 'open:fees' });
  const noPhone = active.filter(s => !String(s.guardian_phone || '').replace(/\D/g, ''));
  if (noPhone.length) add({ code: 'no_parent_phone', area: 'pupils', subject: 'all', severity: 'info',
    title: noPhone.length + ' pupil' + (noPhone.length > 1 ? 's have' : ' has') + ' no parent phone',
    detail: names(noPhone.map(s => s.name)) + '. These parents get no fee reminders or messages.',
    data: { ids: noPhone.slice(0, 200).map(s => s.id) }, fix: 'open:stud' });

  // 4. Teachers and logins --------------------------------------------------
  const tRows = teachers || [], uRows = users || [];
  const uById = {}, uByEmail = {};
  uRows.forEach(u => { uById[u.id] = u; if (u.email) uByEmail[String(u.email).toLowerCase()] = u; });
  const linked = new Set();
  tRows.forEach(t => {
    const u = (t.user_id && uById[t.user_id]) || (t.email && uByEmail[String(t.email).toLowerCase()]);
    if (u) { linked.add(u.id); return; }
    if (t.status === 'left') return;
    add({ code: 'teacher_no_login', area: 'logins', subject: 't' + t.id, severity: 'warn',
      title: (t.full_name || t.email || 'A teacher') + ' cannot sign in — no login yet',
      detail: (t.email ? 'Email on record: ' + t.email + '. ' : 'No email on record. ') + 'Create a login in Staff & Audit; Nia will show a temporary password to give them.',
      data: { teacher_id: t.id, email: t.email || null, name: t.full_name || null }, fix: 'open:controls' });
  });
  uRows.filter(u => String(u.role || '').toLowerCase() === 'teacher' && u.active !== false && !linked.has(u.id)).forEach(u => {
    add({ code: 'teacher_no_record', area: 'logins', subject: 'u' + u.id, severity: 'warn',
      title: (u.full_name || u.email) + ' has a login but is missing from the teacher list',
      detail: 'They can sign in but won’t appear in Teachers, the timetable or payroll. Approving adds their teacher record.',
      data: { user_id: u.id, email: u.email, name: u.full_name }, fix: 'add_teacher_row' });
  });
  const auth = await listAuthUsers(env).catch(() => null);
  if (auth) {
    const aById = {}; auth.forEach(a => { aById[a.id] = a; });
    uRows.filter(u => u.auth_id && u.active !== false && String(u.role || '').toLowerCase() !== 'parent').forEach(u => {
      const a = aById[u.auth_id];
      if (!a) {
        add({ code: 'login_broken', area: 'logins', subject: 'u' + u.id, severity: 'warn',
          title: (u.full_name || u.email) + '’s login no longer exists',
          detail: 'The sign-in account was deleted, so they cannot sign in. Create a new login for ' + (u.email || 'them') + ' in Staff & Audit.',
          data: { user_id: u.id, email: u.email }, fix: 'open:controls' });
        return;
      }
      const ageDays = (now - new Date(a.created_at || now)) / 86400000;
      const pending = a.user_metadata && a.user_metadata.must_change_password;
      if (!a.last_sign_in_at && ageDays >= 2) {
        add({ code: 'never_signed_in', area: 'logins', subject: 'u' + u.id, severity: 'info',
          title: (u.full_name || u.email) + ' has never signed in',
          detail: 'Login created ' + Math.floor(ageDays) + ' days ago. If they lost the temporary password, reset it and give them the new one.',
          data: { user_id: u.id, email: u.email, name: u.full_name }, fix: 'reset_password' });
      } else if (pending && a.last_sign_in_at && (now - new Date(a.last_sign_in_at)) / 86400000 >= 3) {
        add({ code: 'temp_password', area: 'logins', subject: 'u' + u.id, severity: 'info',
          title: (u.full_name || u.email) + ' never finished setting a password',
          detail: 'They signed in once with a temporary password but did not choose their own. Reset it if they are stuck.',
          data: { user_id: u.id, email: u.email, name: u.full_name }, fix: 'reset_password' });
      }
    });
  }

  // 5. Roll call (school days, after 10:00 Kampala time) -----------------------
  const eat = new Date(now.getTime() + 3 * 3600000);
  const day = eat.getUTCDay(), hour = eat.getUTCHours();
  const today = eat.toISOString().slice(0, 10);
  const inTerm = !cur || ((!cur.starts_on || cur.starts_on <= today) && (!cur.ends_on || cur.ends_on >= today));
  if (day >= 1 && day <= 5 && hour >= 10 && inTerm && active.length) {
    const rc = await sbFetch(env, '/student_roll_call?tenant_id=eq.' + T + '&roll_date=eq.' + today + '&select=student_id').catch(() => null);
    if (rc) {
      const marked = new Set(rc.map(r => r.student_id));
      const classes = {};
      active.forEach(s => { const c = s.stream || 'No class'; classes[c] = classes[c] || { n: 0, done: 0 }; classes[c].n++; if (marked.has(s.id)) classes[c].done++; });
      const missing = Object.entries(classes).filter(([, v]) => v.done === 0).map(([c]) => c).sort();
      if (missing.length) add({ code: 'no_roll_call', area: 'attendance', subject: today, severity: missing.length === Object.keys(classes).length ? 'warn' : 'info',
        title: 'No roll call yet today in ' + missing.length + ' class' + (missing.length > 1 ? 'es' : ''),
        detail: names(missing, 12) + '. It is past 10:00; parents of absent children have not been told.',
        data: { classes: missing, date: today }, fix: 'open:attn' });
    }
  }
  return F;
}

// ── Save results: new → open; gone → resolved; dismissed stays dismissed ──
export async function niaRun(env, tenant) {
  const found = await niaCheck(env, tenant);
  const T = enc(tenant);
  const existing = (await sbFetch(env, '/nia_findings?tenant_id=eq.' + T + '&select=id,code,subject,status')) || [];
  const ex = {}; existing.forEach(e => { ex[e.code + '|' + e.subject] = e; });
  const nowIso = new Date().toISOString();
  const seen = new Set();
  const upserts = found.map(f => {
    const e = ex[f.code + '|' + f.subject];
    seen.add(f.code + '|' + f.subject);
    const row = { tenant_id: tenant, code: f.code, subject: f.subject, severity: f.severity, area: f.area, title: f.title, detail: f.detail, data: f.data, fix: f.fix, last_seen: nowIso };
    if (!e || e.status === 'resolved' || e.status === 'fixed') { row.status = 'open'; row.closed_at = null; row.closed_by = null; }
    return row;
  });
  // PostgREST bulk upsert needs identical keys on every row
  const keys = ['tenant_id', 'code', 'subject', 'severity', 'area', 'title', 'detail', 'data', 'fix', 'last_seen'];
  const reopen = upserts.filter(r => r.status), keep = upserts.filter(r => !r.status);
  const post = async (rows, cols) => {
    if (!rows.length) return;
    const body = rows.map(r => { const o = {}; cols.forEach(k => { o[k] = r[k] === undefined ? null : r[k]; }); return o; });
    const r = await fetch(env.SUPABASE_URL + '/rest/v1/nia_findings?on_conflict=tenant_id,code,subject', { method: 'POST', headers: sbHeaders(env, 'resolution=merge-duplicates,return=minimal'), body: JSON.stringify(body) });
    if (!r.ok) throw new Error('Saving Nia findings failed: ' + r.status + ' ' + (await r.text()).slice(0, 200));
  };
  await post(keep, keys);
  await post(reopen.map(r => Object.assign(r, { first_seen: nowIso })), keys.concat(['status', 'closed_at', 'closed_by', 'first_seen']));
  const gone = existing.filter(e => e.status === 'open' && !seen.has(e.code + '|' + e.subject)).map(e => e.id);
  if (gone.length) {
    await fetch(env.SUPABASE_URL + '/rest/v1/nia_findings?id=in.(' + gone.join(',') + ')', { method: 'PATCH', headers: sbHeaders(env, 'return=minimal'), body: JSON.stringify({ status: 'resolved', closed_at: nowIso, closed_by: 'nia' }) });
  }
  return { found: found.length, resolved: gone.length };
}

export async function niaRunAll(env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_KEY) return;
  let tenants = [];
  try { tenants = (await sbFetch(env, '/tenants?select=id')) || []; } catch (e) { console.warn('[nia] tenants', e && e.message); return; }
  for (const t of tenants) {
    try { await niaRun(env, t.id); } catch (e) { console.warn('[nia] ' + t.id + ': ' + (e && e.message || e)); }
  }
}

// ── Routes ───────────────────────────────────────────────────────────────
async function body(request) { try { return await request.json(); } catch (e) { return null; } }

export async function handleNiaFindings(request, env, cors) {
  const b = await body(request); if (!b) return J(cors, { ok: false, error: 'bad body' }, 400);
  const tenant = String(b.tenant || '').trim();
  const gate = await accountsGate(request, env, tenant);
  if (!gate.ok) return J(cors, { ok: false, error: gate.status === 403 ? 'Only the head teacher or an admin can see and approve Nia alerts.' : gate.why }, gate.status);
  let ran = null, runError = null;
  if (b.run) { try { ran = await niaRun(env, tenant); } catch (e) { runError = String(e && e.message || e); } }
  try {
    const since = new Date(Date.now() - 7 * 86400000).toISOString();
    const rows = (await sbFetch(env, '/nia_findings?tenant_id=eq.' + enc(tenant) + '&or=(status.eq.open,closed_at.gte.' + since + ')&select=*&order=last_seen.desc&limit=500')) || [];
    const lastRun = rows.reduce((m, r) => (r.last_seen > m ? r.last_seen : m), '');
    return J(cors, { ok: true, tenant, findings: rows, ran, runError, lastRun: lastRun || null });
  } catch (e) {
    const msg = String(e && e.message || e);
    return J(cors, { ok: false, error: /nia_findings/.test(msg) && /404|42P01|does not exist/.test(msg) ? 'Nia is not installed yet — run the Nia Health SQL (20261024_nia_health.sql) in Supabase.' : msg, runError });
  }
}

async function loadFinding(env, tenant, id) {
  const rows = await sbFetch(env, '/nia_findings?id=eq.' + enc(id) + '&tenant_id=eq.' + enc(tenant) + '&select=*&limit=1');
  return rows && rows[0];
}
async function close(env, id, status, who) {
  await fetch(env.SUPABASE_URL + '/rest/v1/nia_findings?id=eq.' + enc(id), { method: 'PATCH', headers: sbHeaders(env, 'return=minimal'), body: JSON.stringify({ status, closed_at: new Date().toISOString(), closed_by: who }) });
}

export async function handleNiaFix(request, env, cors) {
  const b = await body(request); if (!b) return J(cors, { ok: false, error: 'bad body' }, 400);
  const tenant = String(b.tenant || '').trim();
  const gate = await accountsGate(request, env, tenant);
  if (!gate.ok) return J(cors, { ok: false, error: gate.status === 403 ? 'Only the head teacher or an admin can see and approve Nia alerts.' : gate.why }, gate.status);
  const f = await loadFinding(env, tenant, b.id);
  if (!f) return J(cors, { ok: false, error: 'Alert not found.' }, 404);
  if (f.status !== 'open') return J(cors, { ok: false, error: 'This alert is already ' + f.status + '.' }, 409);
  const d = f.data || {};
  try {
    let message = '';
    if (f.fix === 'merge_pupils') {
      // Both pupils must still be in this school
      const two = (await sbFetch(env, '/students?tenant_id=eq.' + enc(tenant) + '&id=in.(' + Number(d.keep) + ',' + Number(d.dup) + ')&select=id,name')) || [];
      if (two.length !== 2) { await close(env, f.id, 'resolved', gate.email); return J(cors, { ok: false, error: 'One of these pupils no longer exists (already merged or removed). Alert closed.' }, 409); }
      const r = await fetch(env.SUPABASE_URL + '/rest/v1/rpc/nx_merge_students', { method: 'POST', headers: sbHeaders(env), body: JSON.stringify({ p_keep: Number(d.keep), p_dup: Number(d.dup) }) });
      const t = await r.text();
      if (!r.ok) throw new Error(/nx_merge_students/.test(t) && r.status === 404 ? 'Run the Nia Health SQL in Supabase first.' : 'Merge failed: ' + t.slice(0, 200));
      message = 'Merged ' + (d.dup_name || 'the copy') + ' into ' + (d.keep_name || 'the original') + '.';
    } else if (f.fix === 'rename_class') {
      const from = (d.from || []).filter(Boolean);
      if (!d.to || !from.length) throw new Error('Nothing to rename.');
      const list = from.map(x => '"' + String(x).replace(/"/g, '\\"') + '"').join(',');
      const r = await fetch(env.SUPABASE_URL + '/rest/v1/students?tenant_id=eq.' + enc(tenant) + '&stream=in.(' + enc(list) + ')', { method: 'PATCH', headers: sbHeaders(env, 'return=representation'), body: JSON.stringify({ stream: d.to }) });
      if (!r.ok) throw new Error('Rename failed: ' + (await r.text()).slice(0, 200));
      const rows = await r.json().catch(() => []);
      if (!rows.length) { await close(env, f.id, 'resolved', gate.email); return J(cors, { ok: true, message: 'Nothing left to rename — already tidy.' }); }
      message = 'Renamed ' + rows.length + ' pupil' + (rows.length === 1 ? '' : 's') + ' to "' + d.to + '".';
    } else if (f.fix === 'add_teacher_row') {
      const u = ((await sbFetch(env, '/users?id=eq.' + enc(d.user_id) + '&tenant_id=eq.' + enc(tenant) + '&select=*&limit=1')) || [])[0];
      if (!u) throw new Error('That login no longer exists.');
      const r = await fetch(env.SUPABASE_URL + '/rest/v1/teachers', { method: 'POST', headers: sbHeaders(env, 'return=minimal'), body: JSON.stringify({ tenant_id: tenant, user_id: u.id, full_name: u.full_name || u.email, email: String(u.email || '').toLowerCase() || null }) });
      if (!r.ok) throw new Error('Could not add the teacher: ' + (await r.text()).slice(0, 200));
      message = (u.full_name || u.email) + ' now appears in Teachers, the timetable and payroll.';
    } else {
      return J(cors, { ok: false, error: 'Nia can’t fix this one directly — use the button to open the right screen.' }, 400);
    }
    await close(env, f.id, 'fixed', gate.email);
    return J(cors, { ok: true, message });
  } catch (e) {
    return J(cors, { ok: false, error: String(e && e.message || e) }, 500);
  }
}

export async function handleNiaDismiss(request, env, cors) {
  const b = await body(request); if (!b) return J(cors, { ok: false, error: 'bad body' }, 400);
  const tenant = String(b.tenant || '').trim();
  const gate = await accountsGate(request, env, tenant);
  if (!gate.ok) return J(cors, { ok: false, error: gate.status === 403 ? 'Only the head teacher or an admin can see and approve Nia alerts.' : gate.why }, gate.status);
  const f = await loadFinding(env, tenant, b.id);
  if (!f) return J(cors, { ok: false, error: 'Alert not found.' }, 404);
  await close(env, f.id, b.undo ? 'open' : 'dismissed', gate.email);
  if (b.undo) await fetch(env.SUPABASE_URL + '/rest/v1/nia_findings?id=eq.' + enc(f.id), { method: 'PATCH', headers: sbHeaders(env, 'return=minimal'), body: JSON.stringify({ closed_at: null, closed_by: null }) });
  return J(cors, { ok: true });
}
