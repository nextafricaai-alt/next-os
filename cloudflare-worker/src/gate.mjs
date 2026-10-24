import { readParentToken } from './parent-auth.mjs';
import { sbFetch } from './supabase.mjs';


/* --- Auth gate (audit item C3) -------------------------------------------
   Every school-data route below needs a signed-in Supabase user who belongs
   to the school named in the request, with a role allowed for that route.
   Platform operators (env.PLATFORM_ADMINS, comma-separated emails) may act
   on any school, including the NEXT OS 'next' tenant.

   Roll-out switch — env.AUTH_MODE (a [vars] entry in wrangler.toml):
     "warn"    (default) log what WOULD be blocked, let the request through
     "enforce" block it with 401/403
   Deploy the app first (it now sends the token), run in "warn", read the
   logs (`wrangler tail` or the Workers dashboard → Logs; search
   "[auth-gate]"), then switch to "enforce".

   Routes NOT listed here are unchanged by this gate. Public on purpose:
   /brand, /icon, /icon.png, /px.js, /collect, /health, /telemetry,
   /registrations/submit (public enrolment form), /billing/webhook (signed),
   /push/vapid-public, /auth/send-otp, /auth/verify-otp.
   Parents (C8): /parent/* use the signed parent pass from /parent/otp/verify
   (see parent-auth); /fees/lookup returns names only; /fees/checkout and
   /fees/verify stay public for the pay page. /transport/* (C9) below.
   /provision-school (C4), and NEXT OS platform routes (AI, CMS, SEO, fleet).
--------------------------------------------------------------------------- */
const AUTH_CTX = new WeakMap(); // request -> { email, tenant, role, operator }
const PARENT_TOKEN_ROUTES = ['/messages/list', '/messages/send', '/push/subscribe'];
const AUTH_CACHE = new Map();   // token -> { until, user, memberships }
const AUTH_CACHE_MS = 60 * 1000;

const R_ANY     = ['head', 'admin', 'bursar', 'teacher', 'driver'];
const R_STAFF   = ['head', 'admin', 'bursar', 'teacher'];
const R_FINANCE = ['head', 'admin', 'bursar'];
const R_HEAD    = ['head', 'admin'];

// path -> { roles, tenant: 'required' | 'optional' | 'auth', dflt }
//   required: the request must name a school (query or body)
//   optional: a named school is checked; if none, any membership is enough
//   auth:     the request names no school; the handler scopes to the caller's
const AUTH_RULES = {
  // reads
  '/students':           { roles: R_STAFF,   tenant: 'required' },
  '/exams':              { roles: R_STAFF,   tenant: 'required' },
  '/exam-results':       { roles: R_STAFF,   tenant: 'required' },
  '/attendance-summary': { roles: R_STAFF,   tenant: 'required' },
  '/attendance/today':   { roles: R_STAFF,   tenant: 'required' },
  '/staff-status':       { roles: R_STAFF,   tenant: 'required' },
  '/attendance-watch':   { roles: R_STAFF,   tenant: 'required' },
  '/lessons-remind':     { roles: R_STAFF,   tenant: 'required' },
  '/student-health':     { roles: R_STAFF,   tenant: 'required' },
  '/events':             { roles: R_ANY,     tenant: 'required' },
  '/school-config':      { roles: R_ANY,     tenant: 'required' },
  '/teachers':           { roles: R_STAFF,   tenant: 'required' },
  '/assets':             { roles: R_FINANCE, tenant: 'required' },
  '/messages/list':      { roles: R_STAFF,   tenant: 'optional' },
  '/os-data':            { roles: R_ANY,     tenant: 'required', dflt: 'next' },
  '/fees-balances':      { roles: R_FINANCE, tenant: 'required' },
  '/finance':            { roles: R_FINANCE, tenant: 'required' },
  '/payroll-deductions': { roles: R_FINANCE, tenant: 'required' },
  '/registrations/list': { roles: R_FINANCE, tenant: 'optional' },
  '/billing/subscriptions': { roles: R_HEAD, tenant: 'required' },
  '/billing/verify':     { roles: R_HEAD,    tenant: 'optional' },
  // staff logins (P1) — the handlers also check the caller is an active head/admin
  '/staff/accounts':       { roles: R_HEAD, tenant: 'required' },
  '/staff/create':         { roles: R_HEAD, tenant: 'required' },
  '/staff/reset-password': { roles: R_HEAD, tenant: 'required' },
  '/staff/set-active':     { roles: R_HEAD, tenant: 'required' },
  '/staff/set-role':       { roles: R_HEAD, tenant: 'required' },
  // Nia Health — head/admin only; every fix needs their tap
  '/nia/findings':         { roles: R_HEAD, tenant: 'required' },
  '/nia/fix':              { roles: R_HEAD, tenant: 'required' },
  '/nia/dismiss':          { roles: R_HEAD, tenant: 'required' },
  // writes
  '/os-data/save':       { roles: R_ANY,     tenant: 'required', dflt: 'next' },
  '/os-data/delete':     { roles: R_ANY,     tenant: 'auth' },
  '/exams/save':         { roles: R_STAFF,   tenant: 'required' },
  '/exam-results/save':  { roles: R_STAFF,   tenant: 'required' },
  '/events/save':        { roles: R_STAFF,   tenant: 'required' },
  '/messages/send':      { roles: R_STAFF,   tenant: 'optional' },
  '/parent/notify':      { roles: R_STAFF,   tenant: 'required' },
  // school transport (C9) — drivers are further limited to their own van
  '/transport/live':     { roles: R_ANY,     tenant: 'required' },
  '/transport/trips':    { roles: R_ANY,     tenant: 'required' },
  '/transport/ping':     { roles: ['head', 'admin', 'driver'], tenant: 'required' },
  '/transport/trip/start': { roles: ['head', 'admin', 'driver'], tenant: 'required' },
  '/transport/trip/end': { roles: ['head', 'admin', 'driver'], tenant: 'required' },
  '/transport/mark':     { roles: ['head', 'admin', 'driver', 'teacher'], tenant: 'required' },
  '/transport/mark-arrived': { roles: ['head', 'admin', 'driver'], tenant: 'required' },
  '/transport/set-stop': { roles: ['head', 'admin', 'driver'], tenant: 'required' },
  '/transport/students/save':   { roles: R_FINANCE, tenant: 'required' },
  '/transport/students/remove': { roles: R_FINANCE, tenant: 'required' },
  '/transport/vans/save':       { roles: R_HEAD,  tenant: 'required' },
  '/transport/vans/delete':     { roles: R_HEAD,  tenant: 'required' },
  '/transport/settings/save':   { roles: R_HEAD,  tenant: 'required' },
  '/students/photo-upload': { roles: R_STAFF, tenant: 'optional' },
  '/push/subscribe':     { roles: R_ANY,     tenant: 'optional' },
  '/push/test':          { roles: R_ANY,     tenant: 'optional' },
  '/push/debug':         { roles: R_HEAD,    tenant: 'optional' },
  '/exam/scan-mark':     { roles: R_STAFF,   tenant: 'optional' },
  '/exam/care-plan':     { roles: R_STAFF,   tenant: 'optional' },
  '/camera/analyze':     { roles: R_HEAD,    tenant: 'optional' },
  '/camera/frame':       { roles: R_HEAD,    tenant: 'optional' },
  '/syllabus/generate':  { roles: R_STAFF,   tenant: 'optional' },
  '/translate':          { roles: R_ANY,     tenant: 'optional' },
  '/stt':                { roles: R_ANY,     tenant: 'optional' },
  '/finance/save':       { roles: R_FINANCE, tenant: 'required' },
  '/finance/update':     { roles: R_FINANCE, tenant: 'required' },
  '/assets/save':        { roles: R_FINANCE, tenant: 'required' },
  '/fees/import':        { roles: R_FINANCE, tenant: 'required' },
  '/finance/delete':     { roles: R_HEAD,    tenant: 'required' },
  '/school/end-term':    { roles: R_HEAD,    tenant: 'required' },
  '/school-config/save': { roles: R_HEAD,    tenant: 'required' },
  '/brand/save':         { roles: R_HEAD,    tenant: 'required' },
  '/students/import':    { roles: R_HEAD,    tenant: 'required' },
  '/registrations/approve': { roles: R_HEAD, tenant: 'optional' },
  '/registrations/reject':  { roles: R_HEAD, tenant: 'optional' },
  '/billing/checkout':   { roles: R_HEAD,    tenant: 'optional' },
  // messages that cost money / speak in the school's name
  '/whatsapp':           { roles: R_HEAD,    tenant: 'optional' },
  '/whatsapp/bulk':      { roles: R_HEAD,    tenant: 'optional' },
  '/sms/send':           { roles: R_HEAD,    tenant: 'optional' },
  '/email/send':         { roles: R_HEAD,    tenant: 'optional' },
};

function pickTenant(o) {
  if (!o || typeof o !== 'object') return '';
  const direct = o.tenant_id || o.tenant || o.tenantId || o.slug || o.s;
  if (direct) return String(direct).trim();
  for (const k of ['config', 'txn', 'asset', 'event', 'exam', 'record']) {
    const n = o[k];
    if (n && typeof n === 'object' && n.tenant_id) return String(n.tenant_id).trim();
  }
  return '';
}

async function requestedTenant(request, url) {
  const q = url.searchParams;
  const fromQuery = q.get('tenant') || q.get('tenant_id') || q.get('s') || '';
  if (fromQuery) return String(fromQuery).trim();
  if (request.method === 'POST' && /json/i.test(request.headers.get('Content-Type') || '')) {
    try { return pickTenant(await request.clone().json()); } catch (e) { return ''; }
  }
  return '';
}

async function lookupCaller(token, env) {
  const hit = AUTH_CACHE.get(token);
  if (hit && hit.until > Date.now()) return hit;
  const ur = await fetch(env.SUPABASE_URL + '/auth/v1/user', { headers: { 'apikey': env.SUPABASE_KEY, 'Authorization': 'Bearer ' + token } });
  if (!ur.ok) return null;
  const user = await ur.json();
  if (!user || !user.id) return null;
  const email = String(user.email || '').toLowerCase();
  const rows = (await sbFetch(env, '/users?auth_id=eq.' + encodeURIComponent(user.id) + '&select=*')) || [];
  const memberships = rows
    .filter(r => r && r.tenant_id && r.active !== false && R_ANY.indexOf(String(r.role || '').toLowerCase()) >= 0)  // switched-off logins (P1) count as no one
    .map(r => ({ tenant: r.tenant_id, role: String(r.role).toLowerCase() }));
  if (email) {
    // Same fallback as verifyHead: the school's registered head email.
    const t = (await sbFetch(env, '/tenants?head_email=ilike.' + encodeURIComponent(email) + '&select=id')) || [];
    for (const x of t) if (x && x.id && !memberships.some(m => m.tenant === x.id)) memberships.push({ tenant: x.id, role: 'head' });
  }
  const entry = { until: Date.now() + AUTH_CACHE_MS, email, memberships };
  if (AUTH_CACHE.size > 500) AUTH_CACHE.clear();
  AUTH_CACHE.set(token, entry);
  return entry;
}

function isOperator(email, env) {
  const list = String(env.PLATFORM_ADMINS || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
  return !!email && list.indexOf(email) >= 0;
}

// ─── Children's face data (audit C6) ─────────────────────────────────────
// Face templates are biometric data about minors. They are only stored or
// served when env.FACE_RECOGNITION = "on" (set it only once every enrolled
// child's parent has given written consent), and then ONLY to that school's
// head/admin or a platform operator. Enforced always, not subject to
// AUTH_MODE = "warn".
const FACE_KINDS = ['face_enroll'];
async function faceGate(request, env, url, cors) {
  if (url.pathname !== '/os-data' && url.pathname !== '/os-data/save') return null;
  let kind = url.searchParams.get('kind') || '';
  if (!kind && request.method === 'POST') {
    try { const b = await request.clone().json(); kind = String((b && b.kind) || ''); } catch (e) {}
  }
  if (FACE_KINDS.indexOf(kind) < 0) return null;
  const J = (o, st) => new Response(JSON.stringify(o), { status: st, headers: { ...cors, 'Content-Type': 'application/json' } });
  if (String(env.FACE_RECOGNITION || 'off').toLowerCase() !== 'on') {
    return J({ error: 'Face recognition is switched off. It needs written parental consent for every enrolled child before it can be turned on.', faceOff: true, records: [] }, 403);
  }
  const token = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim();
  const caller = token ? await lookupCaller(token, env).catch(() => null) : null;
  if (!caller) return J({ error: 'Not signed in.' }, 401);
  if (isOperator(caller.email, env)) return null;
  const tenant = await requestedTenant(request, url);
  const m = caller.memberships.find(x => x.tenant === tenant);
  if (!m || R_HEAD.indexOf(m.role) < 0) return J({ error: 'Only the head teacher can access face data.' }, 403);
  return null;
}

// Returns null to continue, or a Response to stop the request.
async function authGate(request, env, url, cors) {
  const face = await faceGate(request, env, url, cors);
  if (face) return face;
  // Parents (C8) carry X-Parent-Token instead of a staff sign-in, and only on
  // the routes they use. A bad or expired parent pass is always refused.
  if (PARENT_TOKEN_ROUTES.indexOf(url.pathname) >= 0 && request.headers.get('X-Parent-Token')) {
    const p = await readParentToken(request, env);
    if (!p) return new Response(JSON.stringify({ error: 'Please sign in again.', parentSignIn: true }), { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } });
    AUTH_CTX.set(request, { email: '', tenant: p.tenant, role: 'parent', operator: false, parent: p });
    return null;
  }
  const rule = AUTH_RULES[url.pathname];
  if (!rule) return null;
  const enforce = String(env.AUTH_MODE || 'warn').toLowerCase() === 'enforce';
  const deny = (status, why, extra) => {
    console.log('[auth-gate] ' + (enforce ? 'BLOCKED' : 'WOULD BLOCK') + ' ' + request.method + ' ' + url.pathname + ' — ' + why + (extra ? ' ' + JSON.stringify(extra) : ''));
    if (!enforce) return null;
    return new Response(JSON.stringify({ error: why }), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
  };

  const token = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return deny(401, 'Not signed in.');
  let caller = null;
  try { caller = await lookupCaller(token, env); } catch (e) { return deny(503, 'Could not verify sign-in.', { err: String(e && e.message || e) }); }
  if (!caller) return deny(401, 'Sign-in expired. Please sign in again.');

  let tenant = rule.tenant === 'auth' ? '' : await requestedTenant(request, url);
  if (!tenant && rule.dflt) tenant = rule.dflt;

  if (isOperator(caller.email, env)) {
    AUTH_CTX.set(request, { email: caller.email, tenant: tenant || null, role: 'operator', operator: true });
    return null;
  }
  if (rule.tenant === 'required' && !tenant) return deny(400, 'School (tenant) is required.', { email: caller.email });

  let m = null;
  if (tenant) m = caller.memberships.find(x => x.tenant === tenant);
  else m = caller.memberships.length === 1 ? caller.memberships[0] : null;
  if (!m) return deny(403, 'You do not belong to this school.', { email: caller.email, tenant });
  if (rule.roles.indexOf(m.role) < 0) return deny(403, 'Your role cannot do this.', { email: caller.email, tenant: m.tenant, role: m.role });

  AUTH_CTX.set(request, { email: caller.email, tenant: m.tenant, role: m.role, operator: false });
  return null;
}

// Handlers that update/delete by record id call this to stay inside the
// caller's school. Returns '' when there is no verified non-operator caller
// (warn mode with no token, or a platform operator) so behaviour is unchanged.
function callerTenant(request) {
  const c = AUTH_CTX.get(request);
  return (c && !c.operator && c.tenant) ? c.tenant : '';
}

async function verifyMember(request, env, tenant) {
  // Any signed-in user belonging to this tenant (head, admin, bursar, teacher) may trigger a push.
  try {
    const auth = request.headers.get('Authorization') || '';
    const token = auth.replace(/^Bearer\s+/i, '').trim();
    if (!token) return { ok: false, why: 'no token' };
    const ur = await fetch(env.SUPABASE_URL + '/auth/v1/user', { headers: { 'apikey': env.SUPABASE_KEY, 'Authorization': 'Bearer ' + token } });
    if (!ur.ok) return { ok: false, why: 'bad token' };
    const u = await ur.json();
    const email = (u && u.email) || '';
    const rows = await sbFetch(env, '/users?auth_id=eq.' + encodeURIComponent(u.id) + '&tenant_id=eq.' + encodeURIComponent(tenant) + '&select=role');
    if (rows && rows.length) return { ok: true, email, role: rows[0].role || '' };
    const t = await sbFetch(env, '/tenants?id=eq.' + encodeURIComponent(tenant) + '&select=head_email');
    if (t && t.length && t[0].head_email && email && t[0].head_email.toLowerCase() === email.toLowerCase()) return { ok: true, email, role: 'head' };
    return { ok: false, why: 'not a member of this tenant' };
  } catch (e) { return { ok: false, why: String((e && e.message) || e) }; }
}

export { AUTH_CACHE, AUTH_CACHE_MS, AUTH_CTX, AUTH_RULES, FACE_KINDS, PARENT_TOKEN_ROUTES, R_ANY, R_FINANCE, R_HEAD, R_STAFF, authGate, callerTenant, faceGate, isOperator, lookupCaller, pickTenant, requestedTenant, verifyMember };
