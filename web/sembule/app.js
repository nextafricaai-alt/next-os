import { CONFIG, connectionState, canPreview } from './config.js';
import { getClient } from './db.js';
import { createAuth } from './auth.js';
import { ROLES, validRole, resolveRoute } from './roles.js';
import { loginView } from './modules/login.js';
import { shellView } from './modules/shell.js';
import { dashboardView } from './modules/dashboard.js';
import { placeholderView } from './modules/placeholder.js';
import { initPWA, installApp } from './pwa.js';
import { mountLeads } from './modules/leads.js';
import { mountClients } from './modules/clients.js';
import { mountHolds } from './modules/holds.js';
import { mountQuotes } from './modules/quotes.js';
import { mountInvoices } from './modules/invoices.js';
import { mountExpenses } from './modules/expenses.js';
import { mountJobs } from './modules/jobs.js';
import { mountCrew } from './modules/crew.js';
import { mountCalendar } from './modules/calendar.js';
import { mountEquipment } from './modules/equipment.js';
import { mountDelivery } from './modules/delivery.js';
import { mountDashboard } from './modules/home.js';
import { mountSettings } from './modules/settings.js';
import { mountReports } from './modules/reports.js';
import { mountWebsite } from './modules/website.js';
import { loadCompany } from './refs.js';
const root = document.getElementById('app');
const LAST_ROUTE_KEY = 'sembule-last-workspace-route';
let identity = null, auth = null, db = null, revision = 0, signingIn = false;
const configured = connectionState() === 'configured';
const previewAllowed = canPreview(location.hostname);
const toast = document.getElementById('toast');
let toastTimer;
function notify(message) { toast.textContent = message; toast.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { toast.hidden = true; }, 7000); }
function connectionBanner() { const banner = document.getElementById('connection-banner'); if (banner) banner.hidden = navigator.onLine; }
function requestedRoute() {
  const fromUrl = location.hash.slice(1);
  if (fromUrl) return fromUrl;
  try {
    const saved = sessionStorage.getItem(LAST_ROUTE_KEY);
    if (saved) {
      history.replaceState(null, '', `${location.pathname}${location.search}#${saved}`);
      return saved;
    }
  } catch { /* Keep the dashboard as the fallback when storage is unavailable. */ }
  return 'dashboard';
}
function rememberRoute(routeId) {
  try { sessionStorage.setItem(LAST_ROUTE_KEY, routeId); } catch { /* Route remains available in the URL. */ }
}
async function render(message = '') {
  document.body.classList.remove('menu-open');
  if (!identity) { root.innerHTML = loginView({ configured, preview: previewAllowed, message }); document.title = 'Sign in | Sembule Media'; return; }
  const requested = requestedRoute();
  const route = resolveRoute(requested, identity.role);
  if (!route) { identity = null; render('Your workspace access could not be verified.'); return; }
  if (requested !== route.id) { history.replaceState(null, '', '#dashboard'); notify('That area is not available for this account.'); }
  rememberRoute(route.id);
  const moduleMount = { leads: mountLeads, clients: mountClients, holds: mountHolds, quotes: mountQuotes, invoices: mountInvoices, expenses: mountExpenses, jobs: mountJobs, crew: mountCrew, calendar: mountCalendar, equipment: mountEquipment, delivery: mountDelivery, dashboard: mountDashboard, settings: mountSettings, reports: mountReports, website: mountWebsite }[route.id];
  const content = route.id === 'dashboard' && identity.preview ? dashboardView(identity) : moduleMount ? '<div class="module-loading">Loading…</div>' : placeholderView(route);
  root.innerHTML = shellView(identity, route, content);
  document.title = `${route.label} | ${CONFIG.name}`;
  connectionBanner();
  if (moduleMount && !identity.preview) {
    const ticket = ++revision;
    if (!db) { db = await getClient(); loadCompany(db); }
    if (ticket !== revision) return;
    const host = document.getElementById('route-content');
    await moduleMount({ client: db, identity, host, notify });
  } else if (moduleMount && identity.preview && route.id !== 'dashboard') {
    document.getElementById('route-content').innerHTML = '<div class="error-panel"><strong>Live records are unavailable in preview.</strong><p>Sign in to work with enquiries, clients and date holds.</p></div>';
  }
}
async function verifyAccess() {
  if (!auth || signingIn || identity?.preview) return;
  const ticket = ++revision;
  identity = null;
  root.innerHTML = '<div class="loading-state" role="status">Checking your workspace access…</div>';
  try {
    const result = await auth.identity();
    if (ticket !== revision) return;
    identity = result; render();
  } catch (error) {
    if (ticket !== revision) return;
    render(error.message || 'Unable to connect. Please try again.');
  }
}
async function leave() {
  const wasPreview = identity?.preview;
  try { sessionStorage.removeItem(LAST_ROUTE_KEY); } catch { /* Ignore unavailable browser storage. */ }
  ++revision; identity = null; history.replaceState(null, '', location.pathname); render();
  if (!wasPreview && auth) {
    try { await auth.signOut(); } catch { notify('Signed out on this device. Reconnect before signing in again.'); }
  }
}
function closeMenu() { document.body.classList.remove('menu-open'); document.getElementById('open-menu')?.setAttribute('aria-expanded','false'); }
root.addEventListener('click', async event => {
  const target = event.target.closest('button, a');
  if (!target) return;
  if (target.dataset.preview && previewAllowed && !configured && validRole(target.dataset.preview)) {
    ++revision; identity = { name: `${ROLES[target.dataset.preview]} preview`, role: target.dataset.preview, preview: true };
    history.replaceState(null, '', '#dashboard'); render(); return;
  }
  if (target.id === 'sign-out' || target.id === 'exit-preview') return leave();
  if (target.id === 'show-password') {
    const input = document.getElementById('password'); const visible = input.type === 'password';
    input.type = visible ? 'text' : 'password'; target.textContent = visible ? 'Hide password' : 'Show password';
    target.setAttribute('aria-pressed',String(visible)); return;
  }
  if (target.id === 'open-menu') { document.body.classList.add('menu-open'); target.setAttribute('aria-expanded','true'); document.getElementById('close-menu').focus(); }
  if (target.id === 'close-menu' || target.id === 'menu-backdrop') { closeMenu(); document.getElementById('open-menu')?.focus(); }
  if (target.hasAttribute('data-install')) await installApp(notify);
});
root.addEventListener('submit', async event => {
  if (event.target.id !== 'login-form') return;
  event.preventDefault();
  if (!configured || signingIn) return;
  signingIn = true;
  const ticket = ++revision;
  const form = event.target, button = form.querySelector('[type=submit]'), message = document.getElementById('login-message');
  button.disabled = true; button.textContent = 'Signing in…'; message.textContent = '';
  const email = form.email.value.trim(), password = form.password.value;
  try {
    if (!auth) await setupAuth();
    const result = await auth.signIn(email, password);
    if (ticket !== revision) return;
    if (!result) throw new Error('Please sign in again.');
    identity = result; form.password.value = ''; render();
  } catch (error) { if (ticket === revision) { identity = null; form.password.value = ''; message.textContent = error.message || 'Unable to sign in. Please try again.'; } }
  finally { signingIn = false; button.disabled = false; button.textContent = 'Sign in'; }
});
window.addEventListener('hashchange', () => { render(); document.getElementById('main-content')?.focus(); });
window.addEventListener('keydown', event => {
  if (event.key === 'Escape' && document.body.classList.contains('menu-open')) { closeMenu(); document.getElementById('open-menu')?.focus(); }
  if (event.key === 'Tab' && document.body.classList.contains('menu-open')) {
    const items = [...document.querySelectorAll('#sidebar a, #sidebar button')].filter(el => el.getClientRects().length);
    const first = items[0], last = items.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
});
window.addEventListener('offline', () => { connectionBanner(); if (identity && !identity.preview) { ++revision; identity = null; render('You are offline. Reconnect to access the workspace.'); } });
window.addEventListener('online', () => { connectionBanner(); verifyAccess(); });
document.addEventListener('visibilitychange', () => { if (!document.hidden) verifyAccess(); });
window.addEventListener('pageshow', event => { if (event.persisted) verifyAccess(); });
async function setupAuth() {
  if (auth) return;
  db = await getClient(); auth = createAuth(db);
  auth.onChange(event => {
    if (event === 'SIGNED_OUT') { ++revision; identity = null; render(); }
    else if (!signingIn) verifyAccess();
  });
}
render(); initPWA(notify);
if (configured) setupAuth().then(verifyAccess).catch(() => render('Unable to load sign-in. Check your connection and try again.'));
