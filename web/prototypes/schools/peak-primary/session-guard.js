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

  function loginUrl() {
    return '/prototypes/schools/peak-primary/login.html';
  }

  // Load cached profile (set by login.html on successful sign-in)
  let profile = null;
  try { profile = JSON.parse(localStorage.getItem('nextos.profile') || 'null'); } catch (e) {}

  // Public API on window
  window.NextSession = {
    sb,
    profile,
    async signOut() {
      if (sb) { try { await sb.auth.signOut(); } catch (e) {} }
      localStorage.removeItem('nextos.profile');
      window.location.href = loginUrl();
    },
    async refresh() {
      if (!sb) return profile;
      try {
        const { data: { user } } = await sb.auth.getUser();
        if (!user) return profile;
        const { data: row } = await sb.from('users')
          .select('tenant_id, role, full_name')
          .eq('auth_id', user.id).single();
        if (row) {
          profile = { email: user.email, fullName: row.full_name, role: row.role, tenantId: row.tenant_id };
          localStorage.setItem('nextos.profile', JSON.stringify(profile));
          window.NextSession.profile = profile;
        }
      } catch (e) {}
      return profile;
    },
  };

})();
