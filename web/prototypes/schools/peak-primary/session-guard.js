/* session-guard.js
   Loaded near the top of every signed-in school page, right after supabase-js:

     <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
     <script src="/prototypes/schools/peak-primary/session-guard.js"></script>

   Security rules (audit item C2):
   1. Nothing in localStorage grants access. The cached profile is only a hint
      so the page can paint quickly; it is replaced by what the server says.
   2. Every load verifies the session with Supabase (auth.getUser hits the
      server, so a hand-made or expired token is rejected).
   3. Role and school come from the account's `users` row (or, as the Worker's
      verifyHead also allows, the school's registered head_email). Unknown role
      or no school = no access.
   4. Until that check passes, a cover sits over the page. If the check fails,
      the user is sent to the sign-in page. If the server cannot be reached,
      the cover offers a retry instead of letting anyone in.

   Public API on window.NextSession:
     sb         → the Supabase client
     profile    → { email, fullName, role, tenantId } (cached hint until verified)
     verified   → true once the server has confirmed the profile
     ready      → Promise resolving to the verified profile
     signOut()  → signs out and returns to this school's sign-in page
     refresh()  → re-checks the account with the server
*/
(function () {
  var SUPABASE_URL = 'https://llxhvqkkgftqwefmrofn.supabase.co';
  var SUPABASE_ANON_KEY = 'sb_publishable_wrzbFpPrkhoN4w2KXdUAdw_gnqEQVs9';
  var VALID_ROLES = ['head', 'admin', 'bursar', 'teacher', 'driver'];
  var VERIFY_TIMEOUT_MS = 12000; // slow mobile networks: be patient, but never fail open

  // ─── Cover the page until the account is confirmed ──────────────────
  var cover = null;
  function showCover(msg, withRetry) {
    try {
      if (!cover) {
        cover = document.createElement('div');
        cover.id = 'nx-auth-cover';
        cover.setAttribute('role', 'status');
        cover.style.cssText = 'position:fixed;inset:0;z-index:2147483647;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;background:#0a0a12;color:rgba(255,255,255,.75);font:500 13px/1.5 Inter,system-ui,sans-serif;text-align:center;padding:24px;';
        (document.body || document.documentElement).appendChild(cover);
      }
      cover.innerHTML = '';
      var p = document.createElement('div'); p.textContent = msg; cover.appendChild(p);
      if (withRetry) {
        var b = document.createElement('button');
        b.textContent = 'Try again';
        b.style.cssText = 'padding:10px 18px;border-radius:999px;border:0;background:#00fc8f;color:#062b18;font-weight:700;cursor:pointer;';
        b.onclick = function () { location.reload(); };
        cover.appendChild(b);
      }
    } catch (e) {}
  }
  function hideCover() { try { if (cover) { cover.remove(); cover = null; } } catch (e) {} }
  if (document.body) showCover('Checking your sign-in…');
  else document.addEventListener('DOMContentLoaded', function () { if (!window.NextSession || !window.NextSession.verified) showCover('Checking your sign-in…'); });

  if (typeof supabase === 'undefined' || typeof supabase.createClient !== 'function') {
    console.error('[session-guard] supabase-js not loaded. Add the CDN script BEFORE session-guard.js.');
    showCover('Could not load the sign-in service. Check your internet connection.', true);
    return;
  }
  var sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // ─── Send the sign-in token to the NEXT Worker (audit C3) ───────────
  // The Worker checks this token on school-data routes. One wrapper here
  // instead of editing every fetch() call in the app.
  (function () {
    var WORKER_ORIGIN = 'https://nextos-sentinel.nextafricaai.workers.dev';
    if (window.__NX_FETCH_WRAPPED) return;
    window.__NX_FETCH_WRAPPED = true;
    var nativeFetch = window.fetch.bind(window);
    window.fetch = async function (input, init) {
      try {
        var url = typeof input === 'string' ? input : (input && input.url) || String(input || '');
        if (url.indexOf(WORKER_ORIGIN) === 0) {
          var client = sb;
          var s = client ? await client.auth.getSession() : null;
          var tok = s && s.data && s.data.session && s.data.session.access_token;
          if (tok) {
            init = Object.assign({}, init || {});
            var h = new Headers(init.headers || (typeof input !== 'string' && input && input.headers) || {});
            if (!h.has('Authorization')) h.set('Authorization', 'Bearer ' + tok);
            init.headers = h;
          }
        }
      } catch (e) {}
      return nativeFetch(input, init);
    };
  })();

  // ─── Which school this page is for ──────────────────────────────────
  function appSlug() {
    try {
      var q = new URLSearchParams(location.search);
      return q.get('t') || q.get('s') || (location.pathname.match(/\/(?:s|school)\/([A-Za-z0-9_-]+)/) || [])[1] || '';
    } catch (e) { return ''; }
  }
  function loginUrl(tenantHint) {
    var t = appSlug() || tenantHint || '';
    if (!t) { try { t = localStorage.getItem('nextos.lastTenant') || ''; } catch (e) {} }
    return t ? ('/school/' + encodeURIComponent(t) + '/login') : '/prototypes/schools/peak-primary/login.html';
  }
  function clearLocal() {
    try { localStorage.removeItem('nextos.profile'); } catch (e) {}
  }
  function goLogin(tenantHint) {
    var url = loginUrl(tenantHint);
    clearLocal();
    window.location.replace(url);
  }

  // ─── Ask the server who this account is ─────────────────────────────
  async function resolveProfile(user) {
    if (!user || !user.id) return null;
    var authEmail = String(user.email || '').toLowerCase();
    var res = await sb.from('users').select('tenant_id, role, full_name').eq('auth_id', user.id).limit(1);
    if (res.error) throw res.error; // network/server problem: do not decide "no access" on an error
    var row = res.data && res.data[0];
    var role = row && String(row.role || '').toLowerCase();
    if (row && row.tenant_id && VALID_ROLES.indexOf(role) >= 0) {
      return { email: authEmail, fullName: row.full_name || authEmail, role: role, tenantId: row.tenant_id };
    }
    if (authEmail) {
      var t = await sb.from('tenants').select('id').ilike('head_email', authEmail).limit(1);
      if (t.error) throw t.error;
      if (t.data && t.data[0] && t.data[0].id) {
        return { email: authEmail, fullName: 'Head Teacher', role: 'head', tenantId: t.data[0].id };
      }
    }
    return null;
  }

  function sameProfile(a, b) {
    return !!a && !!b && a.email === b.email && a.role === b.role && a.tenantId === b.tenantId;
  }

  // Cached profile: a hint for first paint only. Ignore anything malformed.
  var cached = null;
  try {
    cached = JSON.parse(localStorage.getItem('nextos.profile') || 'null');
    if (!cached || VALID_ROLES.indexOf(String(cached.role || '').toLowerCase()) < 0 || !cached.tenantId) cached = null;
  } catch (e) { cached = null; }

  var resolveReady;
  var readyPromise = new Promise(function (r) { resolveReady = r; });

  window.NextSession = {
    sb: sb,
    profile: cached,
    verified: false,
    ready: readyPromise,
    async signOut() {
      var hint = window.NextSession.profile && window.NextSession.profile.tenantId;
      try { await sb.auth.signOut(); } catch (e) {}
      goLogin(hint);
    },
    async refresh() {
      var u = await sb.auth.getUser();
      if (u.error || !u.data || !u.data.user) return null;
      var p = await resolveProfile(u.data.user);
      if (p) {
        try { localStorage.setItem('nextos.profile', JSON.stringify(p)); } catch (e) {}
        window.NextSession.profile = p;
      }
      return p;
    },
  };

  // ─── Verify on every load ───────────────────────────────────────────
  (async function verify() {
    var timedOut = false;
    var timer = setTimeout(function () {
      timedOut = true;
      showCover('Still checking your sign-in. Your connection may be slow.', true);
    }, VERIFY_TIMEOUT_MS);

    try {
      var s = await sb.auth.getSession();
      var session = s && s.data && s.data.session;
      if (!session) { clearTimeout(timer); goLogin(cached && cached.tenantId); return; }

      // getUser() validates the token with the server (getSession only reads local storage).
      var u = await sb.auth.getUser();
      if (u.error || !u.data || !u.data.user) {
        clearTimeout(timer);
        // 401/403 = token rejected → sign in again. Anything else = network trouble → retry.
        var status = u.error && (u.error.status || 0);
        if (status === 401 || status === 403 || (u.data && !u.data.user && !u.error)) {
          try { await sb.auth.signOut(); } catch (e) {}
          goLogin(cached && cached.tenantId);
        } else {
          showCover('Could not reach the server to confirm your sign-in.', true);
        }
        return;
      }

      var profile = await resolveProfile(u.data.user);
      clearTimeout(timer);
      if (!profile) {
        try { await sb.auth.signOut(); } catch (e) {}
        goLogin(cached && cached.tenantId);
        return;
      }

      // This page belongs to a different school than the account → that school's sign-in.
      var slug = appSlug();
      if (slug && profile.tenantId !== slug) {
        try { await sb.auth.signOut(); } catch (e) {}
        clearLocal();
        window.location.replace('/school/' + encodeURIComponent(slug) + '/login');
        return;
      }

      var stored = false;
      try {
        localStorage.setItem('nextos.profile', JSON.stringify(profile));
        localStorage.setItem('nextos.lastTenant', profile.tenantId);
        stored = true;
      } catch (e) {}

      // The page painted from a cached profile that differs from the truth
      // (edited, stale, or another user) → reload so every script reads the real one.
      // (Skipped if storage is blocked, otherwise we would reload forever.)
      if (stored && !sameProfile(cached, profile)) { window.location.reload(); return; }

      window.NextSession.profile = profile;
      window.NextSession.verified = true;
      hideCover();
      resolveReady(profile);

      sb.auth.onAuthStateChange(function (event) {
        if (event === 'SIGNED_OUT') goLogin(profile.tenantId);
      });
    } catch (e) {
      clearTimeout(timer);
      console.error('[session-guard] verification failed:', e);
      showCover('Could not confirm your sign-in. Check your connection and try again.', true);
    }
  })();
})();
