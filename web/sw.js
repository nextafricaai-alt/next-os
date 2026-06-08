// Minimal service worker — required for installability (Add to Home Screen / Install app).
// Network-first passthrough; no aggressive caching so school data stays live.
self.addEventListener('install', function(e){ self.skipWaiting(); });
self.addEventListener('activate', function(e){ e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', function(e){
  // Let the network handle everything; only provide a graceful offline fallthrough.
  e.respondWith(fetch(e.request).catch(function(){ return new Response('', { status: 504 }); }));
});
