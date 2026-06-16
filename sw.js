// NEXT OS service worker — installability + Web Push notifications.  [v4-push]
// Network-first passthrough; no aggressive caching so school data stays live.
self.addEventListener('install', function (e) { self.skipWaiting(); });
self.addEventListener('message', function (e) { if (e.data === 'skipWaiting') self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });

self.addEventListener('fetch', function (e) {
  e.respondWith(fetch(e.request).catch(function () { return new Response('', { status: 504 }); }));
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
