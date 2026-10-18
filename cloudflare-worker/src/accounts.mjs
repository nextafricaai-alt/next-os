import { sbFetch, sbHeaders, sbWrite } from './supabase.mjs';

/* --- Staff accounts (audit P1) -------------------------------------------
   The head teacher (or an admin) manages every school login from the app:
     POST /staff/accounts       { tenant }                          → list
     POST /staff/create         { tenant, email, full_name, role, phone?, subjects? }
     POST /staff/reset-password { tenant, user_id }                 → new temp password
     POST /staff/set-active     { tenant, user_id, active }         → switch a login off / on
     POST /staff/set-role       { tenant, user_id, role }
   Every call needs the caller's Supabase token, and the caller must be an
   ACTIVE head/admin of that school (or the school's registered head_email,
   or a platform operator). Admins cannot create, change or switch off other
   admins or the head. Nobody can switch off or demote themselves.
   Temp passwords are shown once; the person must choose their own password
   the first time they sign in (user_metadata.must_change_password).
   A switched-off login is banned in Supabase Auth (no sign-in, no token
   refresh) and its users row is marked inactive, so database rules stop
   treating it as staff straight away.
--------------------------------------------------------------------------- */
const ROLES = ['admin', 'bursar', 'teacher', 'driver'];
const ROLE_LABEL = { head: 'Head teacher', admin: 'Admin', bursar: 'Bursar', teacher: 'Teacher', driver: 'Driver' };
const authH = (env) => ({ apikey: env.SUPABASE_KEY, Authorization: 'Bearer ' + env.SUPABASE_KEY, 'Content-Type': 'application/json' });

function tempPassword() {
  // 10 random characters from an unambiguous set + a separator, e.g. "Kx7p-m2Q9tR"
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const b = new Uint8Array(10); crypto.getRandomValues(b);
  const s = Array.from(b, x => A[x % A.length]).join('');
  return s.slice(0, 4) + '-' + s.slice(4);
}

async function accountsGate(request, env, tenant) {
  const token = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return { ok: false, status: 401, why: 'Sign in again.' };
  if (!tenant) return { ok: false, status: 400, why: 'tenant required' };
  const ur = await fetch(env.SUPABASE_URL + '/auth/v1/user', { headers: { apikey: env.SUPABASE_KEY, Authorization: 'Bearer ' + token } });
  if (!ur.ok) return { ok: false, status: 401, why: 'Sign in again.' };
  const u = await ur.json().catch(() => ({}));
  const email = String((u && u.email) || '').toLowerCase();
  const ops = String(env.PLATFORM_ADMINS || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
  if (email && ops.includes(email)) return { ok: true, authId: u.id, email, role: 'head', operator: true };
  const rows = await sbFetch(env, '/users?auth_id=eq.' + encodeURIComponent(u.id) + '&tenant_id=eq.' + encodeURIComponent(tenant) + '&select=*&limit=1');
  const me = rows && rows[0];
  if (me && me.active !== false && /^(head|admin)$/i.test(me.role || '')) return { ok: true, authId: u.id, email, role: String(me.role).toLowerCase() };
  const t = await sbFetch(env, '/tenants?id=eq.' + encodeURIComponent(tenant) + '&select=head_email');
  if (t && t[0] && t[0].head_email && email && String(t[0].head_email).toLowerCase() === email) return { ok: true, authId: u.id, email, role: 'head' };
  return { ok: false, status: 403, why: 'Only the head teacher can manage staff logins.' };
}

async function findAuthUserByEmail(env, email) {
  // GoTrue has no exact-email lookup on every version; page through and match.
  for (let page = 1; page <= 20; page++) {
    const r = await fetch(env.SUPABASE_URL + '/auth/v1/admin/users?page=' + page + '&per_page=1000', { headers: authH(env) });
    if (!r.ok) return null;
    const j = await r.json().catch(() => ({}));
    const list = (j && j.users) || [];
    const hit = list.find(x => String(x.email || '').toLowerCase() === email);
    if (hit) return hit;
    if (list.length < 1000) return null;
  }
  return null;
}

async function loadTarget(env, tenant, userId) {
  const rows = await sbFetch(env, '/users?id=eq.' + encodeURIComponent(userId) + '&tenant_id=eq.' + encodeURIComponent(tenant) + '&select=*&limit=1');
  return rows && rows[0];
}
function protectedTarget(gate, target, headEmail) {
  const tRole = String(target.role || '').toLowerCase();
  if (target.auth_id && target.auth_id === gate.authId) return 'You can’t change your own account here.';
  if (headEmail && String(target.email || '').toLowerCase() === String(headEmail).toLowerCase()) return 'This is the school’s registered head teacher account.';
  if (gate.role === 'admin' && (tRole === 'admin' || tRole === 'head')) return 'Only the head teacher can change another admin.';
  return '';
}

async function handleStaffAccounts(request, env, cors) {
  const J = (o, st) => new Response(JSON.stringify(o), { status: st || 200, headers: { ...cors, 'Content-Type': 'application/json' } });
  let b; try { b = await request.json(); } catch (e) { return J({ ok: false, error: 'bad body' }, 400); }
  const tenant = String(b.tenant || b.tenant_id || '').trim();
  const gate = await accountsGate(request, env, tenant);
  if (!gate.ok) return J({ ok: false, error: gate.why }, gate.status);
  const rows = (await sbFetch(env, '/users?tenant_id=eq.' + encodeURIComponent(tenant) + '&select=*&order=full_name.asc&limit=1000')) || [];
  // Last sign-in from Auth (only for this school's own accounts).
  const ids = new Set(rows.map(r => r.auth_id).filter(Boolean));
  const seen = {};
  try {
    for (let page = 1; page <= 20 && ids.size; page++) {
      const r = await fetch(env.SUPABASE_URL + '/auth/v1/admin/users?page=' + page + '&per_page=1000', { headers: authH(env) });
      if (!r.ok) break;
      const list = ((await r.json().catch(() => ({}))).users) || [];
      list.forEach(x => { if (ids.has(x.id)) seen[x.id] = { last: x.last_sign_in_at || null, banned: !!(x.banned_until && new Date(x.banned_until) > new Date()), must: !!(x.user_metadata && x.user_metadata.must_change_password) }; });
      if (list.length < 1000) break;
    }
  } catch (e) {}
  const t = await sbFetch(env, '/tenants?id=eq.' + encodeURIComponent(tenant) + '&select=head_email');
  const headEmail = (t && t[0] && t[0].head_email) || '';
  return J({
    ok: true, me: gate.email, myRole: gate.role, headEmail,
    accounts: rows.map(r => ({
      id: r.id, email: r.email, full_name: r.full_name, role: String(r.role || '').toLowerCase(), phone: r.phone || null,
      active: r.active !== false && !(seen[r.auth_id] && seen[r.auth_id].banned),
      has_login: !!r.auth_id, last_sign_in: (seen[r.auth_id] && seen[r.auth_id].last) || null,
      must_change_password: !!(seen[r.auth_id] && seen[r.auth_id].must), created_at: r.created_at || null,
      is_me: !!(r.auth_id && r.auth_id === gate.authId),
      is_head: !!(headEmail && String(r.email || '').toLowerCase() === headEmail.toLowerCase()),
    })),
  });
}

async function handleStaffCreate(request, env, cors) {
  const J = (o, st) => new Response(JSON.stringify(o), { status: st || 200, headers: { ...cors, 'Content-Type': 'application/json' } });
  let b; try { b = await request.json(); } catch (e) { return J({ ok: false, error: 'bad body' }, 400); }
  const tenant = String(b.tenant || b.tenant_id || '').trim();
  const gate = await accountsGate(request, env, tenant);
  if (!gate.ok) return J({ ok: false, error: gate.why }, gate.status);
  const email = String(b.email || '').trim().toLowerCase();
  const fullName = String(b.full_name || b.fullName || '').trim().slice(0, 120);
  const role = String(b.role || '').toLowerCase();
  const phone = String(b.phone || '').replace(/[^0-9+]/g, '') || null;
  if (!fullName) return J({ ok: false, error: 'Enter the person’s full name.' }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return J({ ok: false, error: 'Enter a valid email address — it is their sign-in name.' }, 400);
  if (!ROLES.includes(role)) return J({ ok: false, error: 'Choose a role: admin, bursar, teacher or driver.' }, 400);
  if (role === 'admin' && gate.role !== 'head') return J({ ok: false, error: 'Only the head teacher can add an admin.' }, 403);
  const dup = await sbFetch(env, '/users?email=eq.' + encodeURIComponent(email) + '&select=id,tenant_id,active&limit=1');
  if (dup && dup[0]) {
    return J({ ok: false, error: dup[0].tenant_id === tenant
      ? (dup[0].active === false ? 'This person already has a login here that is switched off. Switch it back on instead.' : 'This email already has a login at this school.')
      : 'This email is already used by another school on NEXT OS. Use a different email.' }, 409);
  }
  const pw = tempPassword();
  let authId = null;
  const au = await fetch(env.SUPABASE_URL + '/auth/v1/admin/users', { method: 'POST', headers: authH(env), body: JSON.stringify({ email, password: pw, email_confirm: true, user_metadata: { full_name: fullName, tenant_id: tenant, role, must_change_password: true } }) });
  const auj = await au.json().catch(() => ({}));
  if (au.ok && auj && auj.id) authId = auj.id;
  else {
    const msg = String((auj && (auj.msg || auj.error_description || auj.error || auj.message)) || ('HTTP ' + au.status));
    if (/already|registered|exists/i.test(msg)) {
      // An Auth login exists but no school row (e.g. an old test account). Link it and reset its password.
      const ex = await findAuthUserByEmail(env, email);
      if (!ex) return J({ ok: false, error: 'This email already has a NEXT OS login that could not be found. Contact NEXT OS support.' }, 409);
      const up = await fetch(env.SUPABASE_URL + '/auth/v1/admin/users/' + ex.id, { method: 'PUT', headers: authH(env), body: JSON.stringify({ password: pw, ban_duration: 'none', user_metadata: { full_name: fullName, tenant_id: tenant, role, must_change_password: true } }) });
      if (!up.ok) return J({ ok: false, error: 'Could not set up the existing login (' + up.status + ').' }, 200);
      authId = ex.id;
    } else return J({ ok: false, error: 'Login not created: ' + msg }, 200);
  }
  let userRow = null;
  try {
    const ur = await sbWrite(env, '/users', { auth_id: authId, tenant_id: tenant, email, full_name: fullName, role, phone, active: true }, 'POST', 'return=representation');
    userRow = Array.isArray(ur) ? ur[0] : ur;
  } catch (e) {
    // Don't leave a login that belongs to no school.
    try { await fetch(env.SUPABASE_URL + '/auth/v1/admin/users/' + authId, { method: 'DELETE', headers: authH(env) }); } catch (x) {}
    return J({ ok: false, error: 'Login not created: ' + String((e && e.message) || e) }, 200);
  }
  let note = '';
  if (role === 'teacher') {
    try {
      const subjects = Array.isArray(b.subjects) ? b.subjects : String(b.subjects || '').split(',').map(s => s.trim()).filter(Boolean);
      const ex = await sbFetch(env, '/teachers?tenant_id=eq.' + encodeURIComponent(tenant) + '&email=eq.' + encodeURIComponent(email) + '&select=id&limit=1');
      if (ex && ex[0]) await fetch(env.SUPABASE_URL + '/rest/v1/teachers?id=eq.' + ex[0].id, { method: 'PATCH', headers: sbHeaders(env, 'return=minimal'), body: JSON.stringify({ user_id: userRow && userRow.id, status: 'active' }) });
      else await sbWrite(env, '/teachers', { tenant_id: tenant, user_id: userRow && userRow.id, full_name: fullName, subjects, phone, email, status: 'active' }, 'POST', 'return=minimal');
    } catch (e) { note = 'Login created, but the teacher record was not: ' + String((e && e.message) || e); }
  }
  return J({ ok: true, id: userRow && userRow.id, email, role, roleLabel: ROLE_LABEL[role], tempPassword: pw, note });
}

async function handleStaffResetPassword(request, env, cors) {
  const J = (o, st) => new Response(JSON.stringify(o), { status: st || 200, headers: { ...cors, 'Content-Type': 'application/json' } });
  let b; try { b = await request.json(); } catch (e) { return J({ ok: false, error: 'bad body' }, 400); }
  const tenant = String(b.tenant || b.tenant_id || '').trim();
  const gate = await accountsGate(request, env, tenant);
  if (!gate.ok) return J({ ok: false, error: gate.why }, gate.status);
  const target = await loadTarget(env, tenant, b.user_id);
  if (!target) return J({ ok: false, error: 'Account not found at this school.' }, 404);
  const t = await sbFetch(env, '/tenants?id=eq.' + encodeURIComponent(tenant) + '&select=head_email');
  const block = protectedTarget(gate, target, t && t[0] && t[0].head_email);
  if (block && !(block.indexOf('registered head') >= 0 && gate.operator)) return J({ ok: false, error: block }, 403);
  if (!target.auth_id) return J({ ok: false, error: 'This person has no login yet.' }, 400);
  const pw = tempPassword();
  const r = await fetch(env.SUPABASE_URL + '/auth/v1/admin/users/' + target.auth_id, { method: 'PUT', headers: authH(env), body: JSON.stringify({ password: pw, user_metadata: { must_change_password: true } }) });
  if (!r.ok) { const d = await r.json().catch(() => ({})); return J({ ok: false, error: (d && (d.msg || d.error_description || d.error)) || ('reset failed ' + r.status) }, 200); }
  return J({ ok: true, email: target.email, tempPassword: pw });
}

async function handleStaffSetActive(request, env, cors) {
  const J = (o, st) => new Response(JSON.stringify(o), { status: st || 200, headers: { ...cors, 'Content-Type': 'application/json' } });
  let b; try { b = await request.json(); } catch (e) { return J({ ok: false, error: 'bad body' }, 400); }
  const tenant = String(b.tenant || b.tenant_id || '').trim();
  const gate = await accountsGate(request, env, tenant);
  if (!gate.ok) return J({ ok: false, error: gate.why }, gate.status);
  const target = await loadTarget(env, tenant, b.user_id);
  if (!target) return J({ ok: false, error: 'Account not found at this school.' }, 404);
  const t = await sbFetch(env, '/tenants?id=eq.' + encodeURIComponent(tenant) + '&select=head_email');
  const block = protectedTarget(gate, target, t && t[0] && t[0].head_email);
  if (block) return J({ ok: false, error: block }, 403);
  const active = b.active !== false;
  if (target.auth_id) {
    const r = await fetch(env.SUPABASE_URL + '/auth/v1/admin/users/' + target.auth_id, { method: 'PUT', headers: authH(env), body: JSON.stringify({ ban_duration: active ? 'none' : '876000h' }) });
    if (!r.ok) { const d = await r.json().catch(() => ({})); return J({ ok: false, error: (d && (d.msg || d.error_description || d.error)) || ('Auth update failed ' + r.status) }, 200); }
  }
  const p = await fetch(env.SUPABASE_URL + '/rest/v1/users?id=eq.' + encodeURIComponent(target.id) + '&tenant_id=eq.' + encodeURIComponent(tenant), { method: 'PATCH', headers: sbHeaders(env, 'return=minimal'), body: JSON.stringify({ active, deactivated_at: active ? null : new Date().toISOString() }) });
  if (!p.ok) return J({ ok: false, error: 'Login ' + (active ? 'unblocked' : 'blocked') + ', but the staff record was not updated (' + p.status + '). Run the P1 SQL.' }, 200);
  if (String(target.role).toLowerCase() === 'teacher') {
    try { await fetch(env.SUPABASE_URL + '/rest/v1/teachers?tenant_id=eq.' + encodeURIComponent(tenant) + '&email=eq.' + encodeURIComponent(target.email || ''), { method: 'PATCH', headers: sbHeaders(env, 'return=minimal'), body: JSON.stringify({ status: active ? 'active' : 'left' }) }); } catch (e) {}
  }
  return J({ ok: true, active });
}

async function handleStaffSetRole(request, env, cors) {
  const J = (o, st) => new Response(JSON.stringify(o), { status: st || 200, headers: { ...cors, 'Content-Type': 'application/json' } });
  let b; try { b = await request.json(); } catch (e) { return J({ ok: false, error: 'bad body' }, 400); }
  const tenant = String(b.tenant || b.tenant_id || '').trim();
  const gate = await accountsGate(request, env, tenant);
  if (!gate.ok) return J({ ok: false, error: gate.why }, gate.status);
  const role = String(b.role || '').toLowerCase();
  if (!ROLES.includes(role)) return J({ ok: false, error: 'Choose a role: admin, bursar, teacher or driver.' }, 400);
  if (role === 'admin' && gate.role !== 'head') return J({ ok: false, error: 'Only the head teacher can make someone an admin.' }, 403);
  const target = await loadTarget(env, tenant, b.user_id);
  if (!target) return J({ ok: false, error: 'Account not found at this school.' }, 404);
  const t = await sbFetch(env, '/tenants?id=eq.' + encodeURIComponent(tenant) + '&select=head_email');
  const block = protectedTarget(gate, target, t && t[0] && t[0].head_email);
  if (block) return J({ ok: false, error: block }, 403);
  const p = await fetch(env.SUPABASE_URL + '/rest/v1/users?id=eq.' + encodeURIComponent(target.id) + '&tenant_id=eq.' + encodeURIComponent(tenant), { method: 'PATCH', headers: sbHeaders(env, 'return=minimal'), body: JSON.stringify({ role }) });
  if (!p.ok) return J({ ok: false, error: 'Role not changed (' + p.status + ').' }, 200);
  if (target.auth_id) { try { await fetch(env.SUPABASE_URL + '/auth/v1/admin/users/' + target.auth_id, { method: 'PUT', headers: authH(env), body: JSON.stringify({ user_metadata: { role } }) }); } catch (e) {} }
  return J({ ok: true, role });
}

// Any unexpected failure (Supabase down, a missing column before the P1 SQL
// has run) becomes a readable JSON error instead of a Worker crash.
const safe = (fn) => async (request, env, cors) => {
  try { return await fn(request, env, cors); }
  catch (e) {
    const msg = String((e && e.message) || e);
    return new Response(JSON.stringify({ ok: false, error: /column|does not exist|42703/i.test(msg) ? 'The database is missing the P1 accounts update — run 20261018_p1_accounts.sql.' : 'Something went wrong: ' + msg.slice(0, 200) }), { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
};
const staffAccounts = safe(handleStaffAccounts), staffCreate = safe(handleStaffCreate), staffResetPassword = safe(handleStaffResetPassword), staffSetActive = safe(handleStaffSetActive), staffSetRole = safe(handleStaffSetRole);

export { ROLES, accountsGate, staffAccounts, staffCreate, staffResetPassword, staffSetActive, staffSetRole, tempPassword };
