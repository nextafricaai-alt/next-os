// Source module of the NEXT School OS app (Phase 2 split from index.html).
// Loaded as a classic <script>; compiled to compiled/role-router.js by build-precompiled.cjs.
/* role-router.jsx
   The doorman of the Schools OS. Reads window.NextSession.profile.role,
   decides which "floor" of the building each user lands on.

   Loaded BEFORE peak-app.jsx so window.PEAK_ROLE exists when App() runs.

   Public API on window.PEAK_ROLE:
     - getRole()              → 'admin' | 'head' | 'bursar' | 'teacher'  (default 'head')
     - getProfile()           → { email, fullName, role, tenantId }      (or fallback)
     - canSeeNavKey(key)      → boolean — should this nav item appear?
     - filterNavItems(items)  → returns the nav array trimmed for current role
     - defaultRouteForRole()  → which screen to land on after login
     - roleLabel()            → human-readable e.g. "Head Teacher", "Bursar"
*/
(function () {
  // ─── Read profile from session (set by login.html / session-guard.js) ─
  // The profile comes ONLY from session-guard.js, which confirms it with the
  // server on every load (audit item C2). No localStorage fallback and no
  // demo user: with no confirmed profile the role is 'none' and nothing shows.
  const NO_PROFILE = { email: '', fullName: '', role: 'none', tenantId: '' };
  function getProfile() {
    if (window.NextSession && window.NextSession.profile) {
      return window.NextSession.profile;
    }
    return NO_PROFILE;
  }

  function getRole() {
    const p = getProfile();
    const r = (p && p.role) ? String(p.role).toLowerCase() : 'none';
    if (r === 'admin' || r === 'head' || r === 'bursar' || r === 'teacher' || r === 'driver') return r;
    return 'none'; // unknown roles get nothing, never 'head'
  }

  // ─── Which nav items each role can see ────────────────────────────────
  // Admin + Head: everything
  // Bursar: only finance-relevant screens
  // Teacher / Driver: use dedicated mobile shell
  const ROLE_NAV_WHITELIST = {
    admin:   null, // null = show all
    head:    null,
    bursar:  new Set(['dash', 'fees', 'rep', 'exam', 'finance', 'trans', 'teach', 'stud', 'learn']),
    teacher: new Set(),
    driver:  new Set(['driver', 'trans']),
    none:    new Set(),
  };

  function canSeeNavKey(key) {
    const role = getRole();
    const wl = ROLE_NAV_WHITELIST[role];
    if (wl === null) return true;
    if (!wl) return false;
    return wl.has(key);
  }

  function filterNavItems(items) {
    const role = getRole();
    const wl = ROLE_NAV_WHITELIST[role];
    if (wl === null) return items;
    if (!wl) return [];
    return items.filter(n => wl.has(n.k));
  }

  // ─── Default landing screen after login ──────────────────────────────
  function defaultRouteForRole() {
    const role = getRole();
    if (role === 'bursar')  return 'fees';
    if (role === 'driver')  return 'driver';
    if (role === 'teacher') return 'teacher-home';
    return 'today';
  }

  // ─── Pretty label for the sidebar profile chip ───────────────────────
  function roleLabel() {
    const role = getRole();
    return ({
      admin:   'Administrator',
      head:    'Head Teacher',
      bursar:  'Bursar',
      teacher: 'Teacher',
    })[role] || 'User';
  }

  // ─── Initials for avatar circle ───────────────────────────────────────
  function initials() {
    const p = getProfile();
    const name = (p && p.fullName) ? p.fullName : (p && p.email) ? p.email : 'U';
    return name.split(/\s+/).filter(Boolean).slice(0, 2)
      .map(w => w[0]).join('').toUpperCase();
  }

  window.PEAK_ROLE = {
    getProfile,
    getRole,
    canSeeNavKey,
    filterNavItems,
    defaultRouteForRole,
    roleLabel,
    initials,
  };
})();

  