// ============================================================
// CharisOS Cloud — Service Worker
// Provides offline capability and PWA installation
// ============================================================

// Workstream B2: CACHE_NAME is paired 1:1 with APP_VERSION in index.html.
// Bump BOTH in the same commit — that pairing is what makes a version bump
// automatically bust this cache. See DEPLOY.md for the full deploy routine.
var APP_VERSION  = '2026.07.11-3';
var CACHE_NAME   = 'charis-os-' + APP_VERSION;

// All paths are RELATIVE to wherever this service worker is hosted, so the app
// works whether it's served from the domain root (app.chariscreationsltd.com/)
// or a subfolder (chariscreationsltd.com/charisos/). _u() resolves them.
function _u(p){ return new URL(p, self.location).href; }
var SHELL_URL    = _u('index.html');
var OFFLINE_URL  = _u('offline.html');

// Static assets to cache on install
var PRECACHE_URLS = [
  _u('./'),
  _u('index.html'),
  _u('supabase.js'),
  _u('manifest.json'),
  _u('icons/icon-192.png'),
  _u('icons/icon-512.png')
];

// ── INSTALL ──────────────────────────────────────────────────
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(PRECACHE_URLS).catch(function(err) {
        console.warn('[SW] Some assets failed to cache:', err);
      });
    })
    // NOTE: no automatic skipWaiting — the new version waits until the user taps
    // "Update now" on the in-app banner, so it never reloads while they're working.
  );
});

// Apply the update only when the app asks (user tapped "Update now")
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

// ── ACTIVATE ─────────────────────────────────────────────────
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames
          .filter(function(name) { return name !== CACHE_NAME; })
          .map(function(name)   { return caches.delete(name); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// ── FETCH — Network first, NEVER cache index.html ────────────────
self.addEventListener('fetch', function(event) {
  var req = event.request;

  // Skip non-GET and Supabase API requests (must be live)
  if (req.method !== 'GET') return;
  if (req.url.includes('supabase.co')) return;
  if (req.url.includes('chrome-extension')) return;

  // APP SHELL — cache-first (stale-while-revalidate).
  // The app ALWAYS opens instantly from cache, even on a cold home-screen launch
  // when iOS hasn't woken the network yet (this was the "doesn't open, have to
  // refresh in Safari" bug). A fresh copy is fetched in the background each open,
  // so the NEXT launch already has the latest deployed version.
  var isAppShell = req.mode === 'navigate' || req.url.endsWith('/index.html') || req.url.endsWith('/charisos/') || req.url.endsWith('/charisos');
  if (isAppShell) {
    event.respondWith(
      caches.match(SHELL_URL).then(function(cached) {
        var fromNetwork = fetch(req).then(function(resp) {
          if (resp && resp.status === 200 && (resp.type === 'basic' || resp.type === 'default')) {
            var clone = resp.clone();
            caches.open(CACHE_NAME).then(function(c) { c.put(SHELL_URL, clone); });
          }
          return resp;
        }).catch(function() { return null; });
        // Serve cache immediately if we have it; otherwise wait for the network.
        return cached || fromNetwork.then(function(r) {
          return r || new Response('<h1 style="font-family:sans-serif">CharisOS is offline</h1><p>Reconnect to the internet and reopen the app.</p>', { status: 503, headers: { 'Content-Type': 'text/html' } });
        });
      })
    );
    return;
  }

  event.respondWith(
    fetch(req).then(function(response) {
      // Cache successful responses for static assets only (icons, JS libs)
      if (response && response.status === 200 && response.type === 'basic') {
        var responseClone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(req, responseClone);
        });
      }
      return response;
    }).catch(function() {
      // Network failed — serve from cache
      return caches.match(req).then(function(cached) {
        if (cached) return cached;
        return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
      });
    })
  );
});

// ── PUSH NOTIFICATIONS ────────────────────────────────────────
self.addEventListener('push', function(event) {
  var data = {};
  try { data = event.data ? event.data.json() : {}; } catch(e) {
    try { data = { body: event.data ? event.data.text() : '' }; } catch(e2) {}
  }

  var title   = data.title || 'CharisOS';
  var options = {
    body:    data.body || '',
    icon:    _u('icons/icon-192.png'),
    badge:   _u('icons/icon-72.png'),
    tag:     data.tag || 'charis-notif-' + Date.now(),
    renotify: true,
    vibrate: [200, 100, 200, 100, 200],
    requireInteraction: !!data.urgent,
    data:    { url: data.url || '/' },
    actions: [
      { action: 'view', title: 'Open' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(title, options).then(function() {
      // Update app badge count on home screen icon
      if (self.navigator && self.navigator.setAppBadge) {
        // Increment badge — we don't know exact unread count in SW,
        // so just set a badge (any positive number shows the dot/count)
        return self.registration.getNotifications().then(function(notifications) {
          var count = notifications.length || 1;
          return self.navigator.setAppBadge(count);
        }).catch(function() {});
      }
    })
  );
});

// ── NOTIFICATION CLICK ────────────────────────────────────────
self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  // Clear badge when user interacts with a notification
  if (self.navigator && self.navigator.clearAppBadge) {
    try { self.navigator.clearAppBadge(); } catch(e) {}
  }

  if (event.action === 'dismiss') return;

  var url = (event.notification.data && event.notification.data.url) ? event.notification.data.url : '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // Focus an existing CharisOS window AND tell it where to navigate (deep-link)
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if ('focus' in client) {
          try { client.postMessage({ type: 'navigate', url: url }); } catch(e) {}
          return client.focus();
        }
      }
      // App not open — open it directly at the deep-link URL
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

// ── BACKGROUND SYNC (optional) ────────────────────────────────
self.addEventListener('sync', function(event) {
  if (event.tag === 'sync-attendance') {
    event.waitUntil(
      // Could flush pending offline attendance records here
      Promise.resolve()
    );
  }
});
