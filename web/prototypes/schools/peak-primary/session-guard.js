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
     offline    → true while the app runs from this phone's last verified
                  sign-in because there is no connection (Phase 2). No school
                  data is available offline; every request still needs the
                  server, which checks the real sign-in. Back online, the
                  account is verified again and a bad session is sent to
                  the sign-in page.
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
    var res = await sb.from('users').select('*').eq('auth_id', user.id).limit(1);
    if (res.error) throw res.error; // network/server problem: do not decide "no access" on an error
    var row = res.data && res.data[0];
    var role = row && String(row.role || '').toLowerCase();
    if (row && row.active === false) return null; // switched off by the head teacher (P1)
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

  // ─── Offline mode (Phase 2) ─────────────────────────────────────────
  var offlineBar = null;
  function showOfflineBar(on) {
    try {
      if (on && !offlineBar) {
        offlineBar = document.createElement('div');
        offlineBar.id = 'nx-offline-bar';
        offlineBar.setAttribute('role', 'status');
        offlineBar.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:2147483646;padding:8px 14px;background:#7c2d12;color:#fff;font:600 12.5px Inter,system-ui,sans-serif;text-align:center;';
        offlineBar.textContent = 'You are offline. Roll calls and notes are saved on this phone and will sync when you are back online.';
        document.body.appendChild(offlineBar);
      } else if (!on && offlineBar) { offlineBar.remove(); offlineBar = null; }
    } catch (e) {}
  }
  function isNetworkError(err) {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
    var m = String((err && (err.message || err)) || '');
    return /fetch|network|load failed|timed? ?out/i.test(m) && !(err && (err.status === 401 || err.status === 403));
  }
  function enterOffline(session) {
    // Only with a sign-in this phone verified before, for this school.
    if (!cached || !session) return false;
    var slug = appSlug();
    if (slug && cached.tenantId !== slug) return false;
    window.NextSession.profile = cached;
    window.NextSession.verified = true;
    window.NextSession.offline = true;
    hideCover();
    showOfflineBar(true);
    resolveReady(cached);
    var recheck = function () {
      window.removeEventListener('online', recheck);
      sb.auth.getUser().then(function (u) {
        if (u && u.data && u.data.user && !u.error) {
          window.NextSession.offline = false; showOfflineBar(false);
          window.NextSession.refresh().then(function (p) { if (!p || !sameProfile(cached, p)) window.location.reload(); });
        } else if (u && u.error && (u.error.status === 401 || u.error.status === 403)) {
          try { sb.auth.signOut(); } catch (e) {} goLogin(cached && cached.tenantId);
        } else { window.addEventListener('online', recheck); }
      }, function () { window.addEventListener('online', recheck); });
    };
    window.addEventListener('online', recheck);
    return true;
  }

  // ─── Idle sign-out (audit P1) ───────────────────────────────────────
  // A school office computer is shared. After IDLE_MS with no tap, key or
  // scroll on this device, the next load (or the running page) signs out.
  var IDLE_MS = 12 * 3600 * 1000;
  var IDLE_KEY = 'nextos.lastActive';
  function lastActive() { try { return Number(localStorage.getItem(IDLE_KEY)) || 0; } catch (e) { return 0; } }
  function touch() { try { localStorage.setItem(IDLE_KEY, String(Date.now())); } catch (e) {} }
  function idleExpired() { var t = lastActive(); return t > 0 && (Date.now() - t) > IDLE_MS; }
  function startIdleWatch(tenantHint) {
    touch();
    var last = 0;
    var bump = function () { var n = Date.now(); if (n - last > 60000) { last = n; touch(); } };
    ['pointerdown', 'keydown', 'scroll', 'touchstart'].forEach(function (ev) { window.addEventListener(ev, bump, { passive: true }); });
    setInterval(function () {
      if (idleExpired()) {
        try { sessionStorage.setItem('nextos.loginNote', 'You were signed out after ' + Math.round(IDLE_MS / 3600000) + ' hours without use.'); } catch (e) {}
        sb.auth.signOut().finally(function () { goLogin(tenantHint); });
      }
    }, 5 * 60000);
  }

  // ─── "Choose your own password" after a temporary one (audit P1) ────
  function showSetPassword(profile) {
    try {
      var o = document.createElement('div');
      o.id = 'nx-set-password';
      o.style.cssText = 'position:fixed;inset:0;z-index:2147483645;background:rgba(6,8,16,.92);display:flex;align-items:center;justify-content:center;padding:16px;font:14px/1.5 Inter,system-ui,sans-serif;color:#fff;';
      o.innerHTML = '<form style="width:100%;max-width:380px;background:#12172a;border:1px solid rgba(255,255,255,.12);border-radius:16px;padding:22px">'
        + '<div style="font-size:18px;font-weight:700;margin-bottom:6px">Choose your own password</div>'
        + '<div style="font-size:13px;color:#aab2d5;margin-bottom:16px">You signed in with a temporary password. Pick one only you know — at least 8 characters.</div>'
        + '<input id="nx-np1" type="password" autocomplete="new-password" placeholder="New password" style="width:100%;box-sizing:border-box;margin-bottom:10px;padding:12px;border-radius:10px;border:1px solid rgba(255,255,255,.18);background:#0b0f1d;color:#fff;font-size:15px">'
        + '<input id="nx-np2" type="password" autocomplete="new-password" placeholder="Type it again" style="width:100%;box-sizing:border-box;margin-bottom:10px;padding:12px;border-radius:10px;border:1px solid rgba(255,255,255,.18);background:#0b0f1d;color:#fff;font-size:15px">'
        + '<div id="nx-np-err" style="color:#ff8a8a;font-size:12.5px;min-height:18px;margin-bottom:8px"></div>'
        + '<button id="nx-np-go" type="submit" style="width:100%;padding:12px;border-radius:10px;border:0;background:#00fc8f;color:#062b18;font-weight:700;font-size:15px;cursor:pointer">Save password</button>'
        + '<button id="nx-np-out" type="button" style="width:100%;margin-top:8px;padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,.18);background:transparent;color:#aab2d5;cursor:pointer">Sign out</button>'
        + '</form>';
      document.body.appendChild(o);
      var err = o.querySelector('#nx-np-err'), go = o.querySelector('#nx-np-go');
      o.querySelector('#nx-np-out').onclick = function () { window.NextSession.signOut(); };
      o.querySelector('form').onsubmit = async function (e) {
        e.preventDefault();
        var a = o.querySelector('#nx-np1').value, b = o.querySelector('#nx-np2').value;
        if (a.length < 8) { err.textContent = 'Use at least 8 characters.'; return; }
        if (a !== b) { err.textContent = 'The two passwords are different.'; return; }
        if (/^(password|12345678|qwerty)/i.test(a)) { err.textContent = 'Choose something harder to guess.'; return; }
        go.disabled = true; go.textContent = 'Saving…'; err.textContent = '';
        var r = await sb.auth.updateUser({ password: a, data: { must_change_password: false } });
        if (r.error) { go.disabled = false; go.textContent = 'Save password'; err.textContent = r.error.message || 'Could not save. Try again.'; return; }
        o.remove();
        try { window.peakToast && window.peakToast('Password saved', 'success', 'Use it next time you sign in.'); } catch (x) {}
      };
    } catch (e) {}
  }

  // ─── Verify on every load ───────────────────────────────────────────
  (async function verify() {
    var timedOut = false;
    var timer = setTimeout(function () {
      timedOut = true;
      if (window.NextSession.verified) return;
      sb.auth.getSession().then(function (s3) {
        var sess = s3 && s3.data && s3.data.session;
        if (!(navigator.onLine === false && enterOffline(sess))) showCover('Still checking your sign-in. Your connection may be slow.', true);
      }, function () { showCover('Still checking your sign-in. Your connection may be slow.', true); });
    }, VERIFY_TIMEOUT_MS);

    try {
      var s = await sb.auth.getSession();
      var session = s && s.data && s.data.session;
      if (!session) {
        clearTimeout(timer);
        // Offline with an expired token: the refresh needs the network, so
        // fall back to the stored sign-in for offline mode only.
        var stored = null; try { stored = localStorage.getItem('sb-llxhvqkkgftqwefmrofn-auth-token'); } catch (e) {}
        if (navigator.onLine === false && stored && enterOffline({ stored: true })) return;
        goLogin(cached && cached.tenantId); return;
      }

      // getUser() validates the token with the server (getSession only reads local storage).
      var u = await sb.auth.getUser();
      if (u.error || !u.data || !u.data.user) {
        clearTimeout(timer);
        // 401/403 = token rejected → sign in again. Anything else = network trouble → retry.
        var status = u.error && (u.error.status || 0);
        if (status === 401 || status === 403 || (u.data && !u.data.user && !u.error)) {
          try { await sb.auth.signOut(); } catch (e) {}
          goLogin(cached && cached.tenantId);
        } else if (!(isNetworkError(u.error) && enterOffline(session))) {
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

      // Idle too long on this device (shared office computers) → sign in again (P1).
      if (idleExpired()) {
        try { await sb.auth.signOut(); } catch (e) {}
        try { sessionStorage.setItem('nextos.loginNote', 'You were signed out after ' + Math.round(IDLE_MS / 3600000) + ' hours without use.'); } catch (e) {}
        goLogin(profile.tenantId); return;
      }
      startIdleWatch(profile.tenantId);

      window.NextSession.profile = profile;
      window.NextSession.verified = true;
      hideCover();
      resolveReady(profile);

      // First sign-in with a temporary password → choose your own (P1).
      var meta = (u.data.user && u.data.user.user_metadata) || {};
      if (meta.must_change_password) showSetPassword(profile);

      sb.auth.onAuthStateChange(function (event) {
        if (event === 'SIGNED_OUT') goLogin(profile.tenantId);
      });
    } catch (e) {
      clearTimeout(timer);
      console.error('[session-guard] verification failed:', e);
      var sess = null; try { var s2 = await sb.auth.getSession(); sess = s2 && s2.data && s2.data.session; } catch (x) {}
      if (!(isNetworkError(e) && enterOffline(sess))) showCover('Could not confirm your sign-in. Check your connection and try again.', true);
    }
  })();
})();
