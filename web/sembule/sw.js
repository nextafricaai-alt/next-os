// Static app assets only. Auth, API calls and user records never enter this cache.
const CACHE_PREFIX = 'sembule-shell-';
const CACHE = CACHE_PREFIX + '0.8.1';
const FILES = [
  "./app.js",
  "./website-content.js",
  "./website-renderer.js",
  "./website-preview.css",
  "./website.css",
  "./website-bridge.js",
  "./assets/brand/icon-192.png",
  "./assets/brand/icon-512.png",
  "./assets/brand/logo.png",
  "./assets/brand/mark.png",
  "./assets/brand/mark-gold.png",
  "./assets/brand/logo-white.png",
  "./assets/fonts/Axiforma-Bold.ttf",
  "./assets/fonts/Axiforma-Regular.ttf",
  "./assets/fonts/Axiforma-SemiBold.ttf",
  "./auth.js",
  "./config.js",
  "./db.js",
  "./index.html",
  "./manifest.json",
  "./data.js",
  "./modules/records.js",
  "./modules/leads.js",
  "./modules/clients.js",
  "./modules/holds.js",
  "./modules/quotes.js",
  "./modules/invoices.js",
  "./modules/expenses.js",
  "./modules/jobs.js",
  "./modules/crew.js",
  "./modules/calendar.js",
  "./modules/equipment.js",
  "./modules/delivery.js",
  "./modules/home.js",
  "./modules/settings.js",
  "./modules/website.js",
  "./modules/reports.js",
  "./refs.js",
  "./modules/dashboard.js",
  "./modules/icons.js",
  "./modules/login.js",
  "./modules/placeholder.js",
  "./modules/shell.js",
  "./pwa.js",
  "./roles.js",
  "./styles.css",
  "./records.css",
  "./utils.js"
];
const ALLOWED = new Set(FILES.map(path => new URL(path, self.registration.scope).href));
ALLOWED.add(self.registration.scope);
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys
    .filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE).map(key => caches.delete(key))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || !ALLOWED.has(request.url)) return;
  event.respondWith((async () => {
    const key = request.url === self.registration.scope ? new URL('./index.html', self.registration.scope).href : request.url;
    try {
      const response = await fetch(request, { cache: 'no-cache' });
      if (response.ok && response.type === 'basic') {
        const cache = await caches.open(CACHE);
        await cache.put(key, response.clone());
      }
      return response;
    } catch {
      const cached = await caches.match(key);
      return cached || new Response('Sembule Media is offline. Please reconnect.', { status: 503, headers: { 'Content-Type': 'text/plain' } });
    }
  })());
});
