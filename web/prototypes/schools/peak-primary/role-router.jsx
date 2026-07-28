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
  function getProfile() {
    if (window.NextSession && window.NextSession.profile) {
      return window.NextSession.profile;
    }
    // Fallback for opening the prototype directly without login (dev)
    try {
      const cached = JSON.parse(localStorage.getItem('nextos.profile') || 'null');
      if (cached) return cached;
    } catch (e) {}
    return {
      email: 'demo@peakprimary.test',
      fullName: 'Demo User',
      role: 'head',
      tenantId: 'peak-primary',
    };
  }

  function getRole() {
    const p = getProfile();
    const r = (p && p.role) ? String(p.role).toLowerCase() : 'head';
    if (r === 'admin' || r === 'head' || r === 'headteacher' || r === 'bursar' || r === 'teacher' || r === 'driver') return r;
    return 'head';
  }

  // ─── Which nav items each role can see ────────────────────────────────
  const ROLE_NAV_WHITELIST = {
    admin:       null, // Director / Owner — show all
    head:        null, // Director / Owner
    headteacher: new Set(['cash', 'dash', 'attendance', 'trsp', 'rep']),
    bursar:      new Set(['spec', 'dash', 'fees', 'rep']),
    teacher:     new Set(),
    driver:      new Set(['trsp']),
  };

  function canSeeNavKey(key) {
    const role = getRole();
    const wl = ROLE_NAV_WHITELIST[role];
    if (wl === null) return true;
    return wl.has(key);
  }

  function filterNavItems(items) {
    const role = getRole();
    const wl = ROLE_NAV_WHITELIST[role];
    if (wl === null) return items;
    return items.filter(n => wl.has(n.k));
  }

  // ─── Default landing screen after login ──────────────────────────────
  function defaultRouteForRole() {
    const role = getRole();
    if (role === 'headteacher') {
      window.location.href = '/prototypes/schools/peak-primary/headteacher-dashboard.html';
      return 'cash';
    }
    if (role === 'bursar')  return 'fees';
    if (role === 'teacher') return 'teacher-home';
    if (role === 'driver')  {
      window.location.href = '/prototypes/schools/peak-primary/driver-dashboard.html';
      return 'trsp';
    }
    return 'spec'; // admin / Director default
  }

  // ─── Pretty label for the sidebar profile chip ───────────────────────
  function roleLabel() {
    const role = getRole();
    return ({
      admin:       'School Director / Owner',
      head:        'School Director',
      headteacher: 'Head Teacher / Administrator',
      bursar:      'Bursar',
      teacher:     'Teacher',
      driver:      'School Driver',
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
