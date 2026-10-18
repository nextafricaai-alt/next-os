// NEXT OS service worker — installability, Web Push, and (Phase 2) offline.  [v6]
//
// Caching rules — school DATA is never cached here:
//  • Pages (navigations): network first. Only when the network fails or
//    takes longer than 6 s is the last good copy shown, so an online phone
//    always gets the latest deploy (the old "stale grey screen" problem came
//    from a precache-first worker; this is the opposite).
//  • Versioned files (compiled/*.js?v=hash, pinned CDN libraries, fonts):
//    cache first — their URL changes whenever their content does.
//  • Other same-origin scripts/styles/images: stale-while-revalidate.
//  • Supabase, the NEXT Worker and everything else: network only.
var VERSION = 'v6';
var PAGES = 'nx-pages-' + VERSION;
var STATIC = 'nx-static-' + VERSION;
var KEEP = [PAGES, STATIC];

self.addEventListener('install', function (e) { self.skipWaiting(); });
self.addEventListener('message', function (e) { if (e.data === 'skipWaiting') self.skipWaiting(); });

// Delete every cache that is not one of ours (this also clears whatever
// an old worker — e.g. a Vite-PWA precache — left on the device).
self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (names) { return Promise.all(names.filter(function (n) { return KEEP.indexOf(n) < 0; }).map(function (n) { return caches.delete(n); })); })
      .then(function () { return self.clients.claim(); })
  );
});

function isVersioned(url) {
  if (url.origin === self.location.origin) return /\/compiled\/[^?]+\?v=[0-9a-f]+/.test(url.pathname + url.search);
  if (/^(fonts\.googleapis\.com|fonts\.gstatic\.com)$/.test(url.hostname)) return true;
  if (/^(unpkg\.com|cdn\.jsdelivr\.net)$/.test(url.hostname)) return /@\d+\.\d+\.\d+\//.test(url.pathname);
  if (url.hostname === 'cdnjs.cloudflare.com') return /\/ajax\/libs\/[^/]+\/\d[^/]*\//.test(url.pathname);
  return false;
}
function isData(url) {
  return /supabase\.co$/.test(url.hostname) || /workers\.dev$/.test(url.hostname) || /googleapis\.com$/.test(url.hostname) && !/^fonts\./.test(url.hostname);
}

function networkFirstPage(req) {
  return new Promise(function (resolve) {
    var done = false;
    var fallback = function () {
      caches.open(PAGES).then(function (c) { return c.match(req, { ignoreSearch: false }); }).then(function (hit) {
        if (done) return;
        if (hit) { done = true; resolve(hit); }
      });
    };
    var timer = setTimeout(fallback, 6000);
    fetch(req).then(function (res) {
      clearTimeout(timer);
      if (res && res.ok && res.type === 'basic') {
        var copy = res.clone();
        caches.open(PAGES).then(function (c) { c.put(req, copy); });
      }
      if (!done) { done = true; resolve(res); }
    }).catch(function () {
      clearTimeout(timer);
      caches.open(PAGES).then(function (c) { return c.match(req); }).then(function (hit) {
        if (done) return; done = true;
        resolve(hit || new Response('<!doctype html><meta name="viewport" content="width=device-width"><body style="font-family:sans-serif;background:#0a0a12;color:#ddd;display:flex;align-items:center;justify-content:center;height:100vh;text-align:center"><div><h2>You are offline</h2><p>Open this page once while online and it will work offline next time.</p></div>', { status: 503, headers: { 'Content-Type': 'text/html' } }));
      });
    });
  });
}

function cacheFirst(req) {
  return caches.open(STATIC).then(function (c) {
    return c.match(req).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (res) { if (res && (res.ok || res.type === 'opaque')) c.put(req, res.clone()); return res; });
    });
  });
}

function staleWhileRevalidate(req) {
  return caches.open(STATIC).then(function (c) {
    return c.match(req).then(function (hit) {
      var net = fetch(req).then(function (res) { if (res && res.ok) c.put(req, res.clone()); return res; }).catch(function () { return hit || new Response('', { status: 504 }); });
      return hit || net;
    });
  });
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;            // writes always go straight to the network
  var url;
  try { url = new URL(req.url); } catch (x) { return; }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return;
  if (isData(url)) return;                      // never cache school data
  if (req.mode === 'navigate') { e.respondWith(networkFirstPage(req)); return; }
  if (isVersioned(url)) { e.respondWith(cacheFirst(req)); return; }
  if (url.origin === self.location.origin && /\.(js|css|png|jpg|jpeg|svg|webp|ico|woff2?)$/.test(url.pathname) && !/\/sw\.js$/.test(url.pathname)) {
    e.respondWith(staleWhileRevalidate(req)); return;
  }
  // everything else: plain network
});

// Push arrives even when the OS tab is closed / phone is locked.
self.addEventListener('push', function (event) {
  var data = { title: 'NEXT OS', body: '', url: '/', tag: 'nx' };
  try { if (event.data) { data = Object.assign(data, event.data.json()); } } catch (e) {
    try { data.body = event.data ? event.data.text() : ''; } catch (e2) {}
  }
  var ICON = data.icon || 'https://nextos-sentinel.nextafricaai.workers.dev/icon.png' + (data.s ? ('?s=' + encodeURIComponent(data.s)) : '');
  var opts = {
    body: data.body || '',
    tag: data.tag || ('nx-' + Date.now()),
    renotify: true,
    icon: ICON,
    badge: ICON,
    image: data.image || undefined,
    data: { url: data.url || '/' },
    vibrate: [200, 80, 200],
    requireInteraction: !!data.urgent,
    silent: false,
    timestamp: Date.now(),
  };
  event.waitUntil(self.registration.showNotification(data.title || 'NEXT OS', opts));
});

// Tapping the notification focuses an open tab or opens the target URL.
self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var target = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
      for (var i = 0; i < list.length; i++) {
        var c = list[i];
        if ('focus' in c) {
          try { if (c.url && target && c.url.indexOf(target) >= 0) { return c.focus(); } } catch (e) {}
        }
      }
      if (list[0] && 'focus' in list[0]) { try { list[0].navigate(target); } catch (e) {} return list[0].focus(); }
      if (self.clients.openWindow) return self.clients.openWindow(target);
    })
  );
});
