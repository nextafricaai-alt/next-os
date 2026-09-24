/* NEXT OS whole-app sign-in gate.
 * Passwords are sent directly to Supabase Auth and are never saved by this app.
 * Client form pages intentionally do not load this file.
 */
(function () {
  'use strict';

  const AUTH_KEY = 'nextos.session.v1';
  const SESSION_MS = 7 * 24 * 60 * 60 * 1000;
  const SUPABASE_URL = 'https://llxhvqkkgftqwefmrofn.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_wrzbFpPrkhoN4w2KXdUAdw_gnqEQVs9';
  const WORKER_URL = 'https://nextos-sentinel.nextafricaai.workers.dev';
  const ALLOWED_EMAILS = new Set([
    'hudson.tim.uk@gmail.com',
    'patrickemma143@gmail.com',
  ]);

  // Hide the OS until the saved Supabase session has been verified remotely.
  document.documentElement.style.visibility = 'hidden';

  function readSession() {
    try { return JSON.parse(localStorage.getItem(AUTH_KEY) || 'null'); }
    catch (e) { return null; }
  }

  function saveSession(data, email, deadline) {
    const session = {
      email: String(email || '').trim().toLowerCase(),
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_at ? Number(data.expires_at) * 1000 : Date.now() + (Number(data.expires_in) || 3600) * 1000,
      session_deadline: deadline || Date.now() + SESSION_MS,
    };
    localStorage.setItem(AUTH_KEY, JSON.stringify(session));
    return session;
  }

  function clearSession() {
    try { localStorage.removeItem(AUTH_KEY); } catch (e) {}
  }

  async function readJson(response) {
    const data = await response.json().catch(() => ({}));
    return { response, data };
  }

  function authHeaders(token) {
    const headers = { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' };
    if (token) headers.Authorization = 'Bearer ' + token;
    return headers;
  }

  async function signIn(email, password) {
    const result = await readJson(await fetch(SUPABASE_URL + '/auth/v1/token?grant_type=password', {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({ email: email, password: password }),
    }));
    if (!result.response.ok || !result.data.access_token || !result.data.user) {
      throw new Error(result.data.msg || result.data.message || result.data.error_description || 'Email or password is incorrect.');
    }
    const verifiedEmail = String(result.data.user.email || '').trim().toLowerCase();
    if (!ALLOWED_EMAILS.has(verifiedEmail) || verifiedEmail !== email) {
      try { await fetch(SUPABASE_URL + '/auth/v1/logout', { method: 'POST', headers: authHeaders(result.data.access_token) }); } catch (e) {}
      throw new Error('This account is not authorized to open NEXT OS.');
    }
    saveSession(result.data, verifiedEmail);
    return verifiedEmail;
  }

  async function restoreSession() {
    const session = readSession();
    if (!session || !ALLOWED_EMAILS.has(String(session.email || '').toLowerCase()) || !session.refresh_token || !session.access_token || !session.session_deadline || Number(session.session_deadline) <= Date.now()) {
      clearSession();
      return { status: 'signed-out' };
    }

    let response;
    try {
      response = await fetch(SUPABASE_URL + '/auth/v1/user', { headers: authHeaders(session.access_token) });
    } catch (e) {
      return { status: 'offline' };
    }

    if (response.ok) {
      const user = await response.json().catch(() => ({}));
      const email = String(user.email || '').trim().toLowerCase();
      if (ALLOWED_EMAILS.has(email) && email === String(session.email).toLowerCase()) return { status: 'ok', email: email };
      clearSession();
      return { status: 'signed-out' };
    }
    if (response.status !== 401 && response.status !== 403) return { status: 'offline' };

    try {
      const result = await readJson(await fetch(SUPABASE_URL + '/auth/v1/token?grant_type=refresh_token', {
        method: 'POST', headers: authHeaders(), body: JSON.stringify({ refresh_token: session.refresh_token }),
      }));
      if (!result.response.ok || !result.data.access_token || !result.data.user) {
        clearSession();
        return { status: 'signed-out' };
      }
      const email = String(result.data.user.email || '').trim().toLowerCase();
      if (!ALLOWED_EMAILS.has(email) || email !== String(session.email).toLowerCase()) {
        clearSession();
        return { status: 'signed-out' };
      }
      saveSession(result.data, email, Number(session.session_deadline));
      return { status: 'ok', email: email };
    } catch (e) {
      return { status: 'offline' };
    }
  }

  async function signOut() {
    const session = readSession();
    if (session && session.access_token) {
      try { await fetch(SUPABASE_URL + '/auth/v1/logout?scope=local', { method: 'POST', headers: authHeaders(session.access_token) }); } catch (e) {}
    }
    clearSession();
    location.reload();
  }

  window.NEXT_OS_AUTH = {
    getEmail: function () { return (readSession() || {}).email || ''; },
    signOut: signOut,
  };
  window.NEXT_OS_USER = window.NEXT_OS_AUTH.getEmail;
  window.NEXT_OS_SIGNOUT = signOut;

  function mountGate() {
    const overlay = document.createElement('div');
    overlay.id = 'next-os-auth-gate';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:20px;background:radial-gradient(circle at 50% 20%,#0f1a30,#070b16);font-family:Inter,-apple-system,system-ui,sans-serif;color:#eef1fb;overflow:auto';
    overlay.innerHTML = `
      <style>
        #next-os-auth-gate *{box-sizing:border-box}
        #next-os-auth-gate .nx-card{width:100%;max-width:390px;background:rgba(17,26,54,.96);border:1px solid #26315a;border-radius:18px;padding:30px;box-shadow:0 30px 80px rgba(0,0,0,.5)}
        #next-os-auth-gate .nx-brand{font:12px ui-monospace,monospace;letter-spacing:3px;color:#00fc8f;margin-bottom:8px}
        #next-os-auth-gate h1{font-size:23px;margin:0 0 7px;color:#eef1fb}
        #next-os-auth-gate .nx-copy{font-size:13px;line-height:1.55;color:#aab2d5;margin:0 0 20px}
        #next-os-auth-gate input{display:block;width:100%;margin-top:11px;background:#0a0f24;border:1px solid #26315a;border-radius:10px;color:#eef1fb;padding:13px 14px;font-size:15px;outline:none}
        #next-os-auth-gate input:focus{border-color:#00fc8f}
        #next-os-auth-gate button{width:100%;margin-top:12px;background:#00fc8f;color:#062b18;border:0;border-radius:10px;padding:13px;font-size:14px;font-weight:700;cursor:pointer}
        #next-os-auth-gate button:disabled{background:#1a2342;color:#7e88b0;cursor:wait}
        #next-os-auth-gate .nx-link{display:block;width:100%;background:transparent;color:#00fc8f;border:0;padding:12px 4px 0;font-size:12px;font-weight:600;cursor:pointer}
        #next-os-auth-gate .nx-error{min-height:18px;margin-top:13px;color:#ff8a96;font-size:13px;line-height:1.45}
        #next-os-auth-gate .nx-note{margin-top:20px;padding-top:15px;border-top:1px solid #26315a;color:#8992b2;font-size:11px;line-height:1.5}
      </style>
      <div class="nx-card">
        <div class="nx-brand">NEXT OS</div>
        <h1 id="nx-title">Sign in</h1>
        <p id="nx-copy" class="nx-copy">Sign in with an authorized email and password to open the operating system.</p>
        <form id="nx-login-form" autocomplete="on">
          <input id="nx-login-email" type="email" autocomplete="username" placeholder="Email address" aria-label="Email address" required>
          <input id="nx-login-password" type="password" autocomplete="current-password" placeholder="Password" aria-label="Password" required>
          <button id="nx-login-submit" type="submit">Sign in</button>
        </form>
        <div id="nx-setup" hidden>
          <input id="nx-setup-email" type="email" autocomplete="username" placeholder="Authorized email address" aria-label="Authorized email address">
          <input id="nx-setup-password" type="password" autocomplete="new-password" placeholder="Set a password" aria-label="Set a password">
          <button id="nx-send-code" type="button">Send email verification code</button>
          <div id="nx-code-step" hidden>
            <input id="nx-setup-code" type="text" inputmode="numeric" autocomplete="one-time-code" placeholder="Code from email" aria-label="Code from email" maxlength="10">
            <button id="nx-verify-code" type="button">Verify and set password</button>
          </div>
        </div>
        <button id="nx-switch-setup" class="nx-link" type="button">First time here? Set up or reset a password</button>
        <button id="nx-switch-login" class="nx-link" type="button" hidden>Back to sign in</button>
        <div id="nx-error" class="nx-error" role="status" aria-live="polite"></div>
        <div class="nx-note">Only the two authorized NEXT OS accounts can sign in. Your session lasts up to 7 days on this device. Client form links remain public.</div>
      </div>`;
    document.body.appendChild(overlay);
    document.documentElement.style.visibility = 'visible';

    const $ = (id) => overlay.querySelector('#' + id);
    const loginForm = $('nx-login-form');
    const setup = $('nx-setup');
    const title = $('nx-title');
    const copy = $('nx-copy');
    const error = $('nx-error');
    let setupEmail = '';
    let busy = false;

    function setError(message) { error.textContent = message || ''; }
    function setBusy(value) {
      busy = value;
      overlay.querySelectorAll('button').forEach((button) => { button.disabled = value; });
      $('nx-login-submit').textContent = value && !setup.hidden ? 'Please wait…' : (value ? 'Signing in…' : 'Sign in');
      $('nx-send-code').textContent = value ? 'Please wait…' : 'Send email verification code';
      $('nx-verify-code').textContent = value ? 'Verifying…' : 'Verify and set password';
    }
    function permittedEmail(input) {
      const email = String(input || '').trim().toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('Enter a valid email address.');
      if (!ALLOWED_EMAILS.has(email)) throw new Error('This email is not authorized to open NEXT OS.');
      return email;
    }
    function showSetup() {
      loginForm.hidden = true;
      setup.hidden = false;
      $('nx-switch-setup').hidden = true;
      $('nx-switch-login').hidden = false;
      title.textContent = 'Set up your password';
      copy.textContent = 'Verify access to an authorized email address, then set or reset its NEXT OS password.';
      $('nx-setup-email').value = $('nx-login-email').value.trim();
      setError('');
    }
    function showLogin() {
      loginForm.hidden = false;
      setup.hidden = true;
      $('nx-code-step').hidden = true;
      $('nx-switch-setup').hidden = false;
      $('nx-switch-login').hidden = true;
      title.textContent = 'Sign in';
      copy.textContent = 'Sign in with an authorized email and password to open the operating system.';
      setError('');
    }

    loginForm.addEventListener('submit', async function (event) {
      event.preventDefault();
      if (busy) return;
      setError(''); setBusy(true);
      try {
        const email = permittedEmail($('nx-login-email').value);
        await signIn(email, $('nx-login-password').value);
        $('nx-login-password').value = '';
        overlay.remove();
        window.dispatchEvent(new CustomEvent('nextos:authenticated', { detail: { email: email } }));
      } catch (e) {
        setError(e.message || 'Could not sign in. Check your connection and try again.');
      } finally { setBusy(false); }
    });

    $('nx-switch-setup').addEventListener('click', showSetup);
    $('nx-switch-login').addEventListener('click', showLogin);
    $('nx-send-code').addEventListener('click', async function () {
      if (busy) return;
      try {
        setupEmail = permittedEmail($('nx-setup-email').value);
        if ($('nx-setup-password').value.length < 8) throw new Error('Choose a password with at least 8 characters.');
        setError(''); setBusy(true);
        const response = await fetch(WORKER_URL + '/auth/send-otp', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: setupEmail, redirectTo: location.origin + location.pathname }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || data.error || !data.ok) throw new Error(data.error || 'Could not send a verification email. Try again.');
        $('nx-code-step').hidden = false;
        $('nx-setup-code').focus();
        setError('A verification code was sent to ' + setupEmail + '.');
      } catch (e) { setError(e.message || 'Could not send a verification email.'); }
      finally { setBusy(false); }
    });

    $('nx-verify-code').addEventListener('click', async function () {
      if (busy) return;
      try {
        const email = setupEmail || permittedEmail($('nx-setup-email').value);
        const password = $('nx-setup-password').value;
        const code = $('nx-setup-code').value.trim();
        if (password.length < 8) throw new Error('Choose a password with at least 8 characters.');
        if (code.length < 6) throw new Error('Enter the verification code from your email.');
        setError(''); setBusy(true);
        const verifyResponse = await fetch(WORKER_URL + '/auth/verify-otp', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email, code: code }),
        });
        const verified = await verifyResponse.json().catch(() => ({}));
        const verifiedEmail = String(verified.email || '').trim().toLowerCase();
        if (!verifyResponse.ok || verified.error || !verified.ok || !verified.access_token || verifiedEmail !== email || !ALLOWED_EMAILS.has(verifiedEmail)) {
          throw new Error(verified.error || 'That verification code is invalid or expired.');
        }

        const updateResult = await readJson(await fetch(SUPABASE_URL + '/auth/v1/user', {
          method: 'PUT', headers: authHeaders(verified.access_token),
          body: JSON.stringify({ password: password }),
        }));
        if (!updateResult.response.ok) throw new Error(updateResult.data.msg || updateResult.data.message || 'Could not update this account password.');

        await signIn(email, password);
        $('nx-setup-password').value = '';
        $('nx-setup-code').value = '';
        overlay.remove();
        window.dispatchEvent(new CustomEvent('nextos:authenticated', { detail: { email: email } }));
      } catch (e) {
        setError(e.message || 'Could not finish password setup. Try again.');
      } finally { setBusy(false); }
    });

    $('nx-login-email').focus();
    restoreSession().then(function (result) {
      if (result.status === 'ok') {
        overlay.remove();
        window.dispatchEvent(new CustomEvent('nextos:authenticated', { detail: { email: result.email } }));
      } else if (result.status === 'offline') {
        setError('Could not verify your saved sign-in. Check your internet connection, then try again.');
      }
    }).catch(function () {
      setError('Could not verify your saved sign-in. Check your internet connection, then try again.');
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountGate, { once: true });
  else mountGate();
})();
