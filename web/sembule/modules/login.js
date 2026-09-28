import { CONFIG } from '../config.js';
import { escapeHTML } from '../utils.js';
import { icon } from './icons.js';
export function loginView({ configured, preview, message = '' }) {
  return `<div class="login-layout">
    <section class="login-story" aria-label="Sembule Media workspace">
      <div class="story-brand">${icon('clapper')} <span>SEMBULE MEDIA<br><small>OPERATING SYSTEM</small></span></div>
      <div class="story-copy"><p class="eyebrow">FROM FIRST CALL TO FINAL CUT</p><h1>Great work.<br>Every detail<br><span>in place.</span></h1><p>One workspace for your people, your productions and everything that brings them together.</p></div>
      <div class="story-bottom"><span class="line"></span><span>PLAN. PRODUCE. DELIVER.</span></div>
      <div class="aperture" aria-hidden="true"><i></i><i></i><i></i></div>
    </section>
    <section class="login-panel"><div class="login-card">
      <img class="login-logo" src="${CONFIG.logo}" alt="Sembule Media">
      <p class="eyebrow">YOUR PRODUCTION WORKSPACE</p><h2>Welcome back.</h2><p class="muted">Sign in to get your day in focus.</p>
      <form id="login-form">
        <label for="email">Email address</label><input id="email" name="email" type="email" autocomplete="username" placeholder="you@example.com" required ${!configured ? 'disabled' : ''}>
        <div class="label-row"><label for="password">Password</label><button id="show-password" class="text-button" type="button" aria-controls="password" aria-pressed="false" ${!configured ? 'disabled' : ''}>Show password</button></div>
        <input id="password" name="password" type="password" autocomplete="current-password" required ${!configured ? 'disabled' : ''}>
        <p id="login-message" class="form-message" role="alert">${escapeHTML(message || (!configured ? 'Sign-in is not set up yet. Your workspace is being prepared.' : ''))}</p>
        <button class="button primary full" type="submit" ${!configured ? 'disabled' : ''}>Sign in ${icon('arrow')}</button>
      </form>
      ${preview ? `<div class="preview-entry"><p class="eyebrow">LOCAL PREVIEW</p><p>Explore the menus. No account or business data is used.</p><div class="preview-buttons"><button data-preview="owner">Owner</button><button data-preview="director">Director</button><button data-preview="production_lead">Production lead</button></div></div>` : ''}
      <div class="login-help">${icon('shield')} <span>Access is assigned by the owner.<br>Need help? Call <a href="tel:+256774345634">${CONFIG.phone}</a>.</span></div>
    </div><footer>Sembule Media Ltd <span>•</span> Your work, together.</footer></section>
  </div>`;
}
