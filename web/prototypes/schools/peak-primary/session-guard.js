/* session-guard.js
   Drop this into prototypes/schools/peak-primary/
   Add to the TOP of index.html (before any other script):

     <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
     <script src="session-guard.js"></script>

   What it does:
   1. Checks if Hudson (or the logged-in user) has a valid Supabase session.
      If not → redirects to login.html.
   2. Exposes window.NextSession with:
        - profile    { email, fullName, role, tenantId }
        - signOut()  → logs out + back to login
        - sb         → the Supabase client (so the rest of the app can query data)
*/
(function () {
  const SUPABASE_URL = 'https://llxhvqkkgftqwefmrofn.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_wrzbFpPrkhoN4w2KXdUAdw_gnqEQVs9';

  // Initialize Supabase client (script tag must load first — handled by load order)
  if (typeof supabase === 'undefined' || typeof supabase.createClient !== 'function') {
    console.error('[session-guard] supabase-js not loaded. Add the CDN script BEFORE session-guard.js.');
    return;
  }
  const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Always return to the SAME school's login (keep the tenant slug), not the default Peak one.
  function loginUrl() {
    var t = '';
    try { var p = JSON.parse(localStorage.getItem('nextos.profile') || 'null'); t = (p && p.tenantId) || ''; } catch (e) {}
    if (!t) { try { t = localStorage.getItem('nextos.lastTenant') || ''; } catch (e) {} }
    if (!t) { try { t = new URLSearchParams(location.search).get('t') || new URLSearchParams(location.search).get('s') || (location.pathname.match(/\/s\/([A-Za-z0-9_-]+)/) || [])[1] || ''; } catch (e) {} }
    return t ? ('/s/' + encodeURIComponent(t)) : '/prototypes/schools/peak-primary/login.html';
  }

  // Load cached profile (set by login.html on successful sign-in)
  let profile = null;
  try { profile = JSON.parse(localStorage.getItem('nextos.profile') || 'null'); } catch (e) {}
  try { if (profile && profile.tenantId) localStorage.setItem('nextos.lastTenant', profile.tenantId); } catch (e) {}

  // Public API on window
  window.NextSession = {
    sb,
    profile,
    async signOut() {
      var url = loginUrl(); // read the school BEFORE we clear the profile
      try { await sb.auth.signOut(); } catch (e) {}
      localStorage.removeItem('nextos.profile');
      window.location.href = url;
    },
    async refresh() {
      // Re-fetch the user's row in case role/tenant changed
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return null;
      const { data: row } = await sb.from('users')
        .select('tenant_id, role, full_name')
        .eq('auth_id', user.id).single();
      if (row) {
        profile = { email: user.email, fullName: row.full_name, role: row.role, tenantId: row.tenant_id };
        localStorage.setItem('nextos.profile', JSON.stringify(profile));
        try { if (profile.tenantId) localStorage.setItem('nextos.lastTenant', profile.tenantId); } catch (e) {}
        window.NextSession.profile = profile;
      }
      return profile;
    },
  };

  // Hard gate: if no session, redirect immediately
  (async () => {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) {
      // No session at all — log out and bounce to login
      var url0 = loginUrl();
      localStorage.removeItem('nextos.profile');
      window.location.href = url0;
      return;
    }

    // Session exists. Make sure profile is fresh.
    if (!profile || profile.email !== session.user.email) {
      await window.NextSession.refresh();
    }

    // Listen for session changes (e.g. token expires) and bounce to login
    sb.auth.onAuthStateChange((event, newSession) => {
      if (event === 'SIGNED_OUT' || !newSession) {
        var url = loginUrl();
        localStorage.removeItem('nextos.profile');
        window.location.href = url;
      }
    });
  })();
})();
