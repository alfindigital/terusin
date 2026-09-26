/* Service worker Terusin. App shell cache-first, font stale-while-revalidate. */
var CACHE = 'terusin-v3';
var SHELL = [
  './',
  'index.html',
  'css/style.css?v=3',
  'js/app.js?v=3',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/favicon-32.png',
  'icons/apple-touch-icon.png',
  'icons/maskable-192.png',
  'icons/maskable-512.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return Promise.all(SHELL.map(function (u) {
        return c.add(new Request(u, { cache: 'reload' })).catch(function () {});
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (ks) {
      return Promise.all(ks.map(function (k) {
        return k === CACHE ? null : caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var r = e.request;
  if (r.method !== 'GET') return;
  var url = new URL(r.url);

  /* font Google: pakai cache dulu, perbarui di belakang. tanpa ini app
     kelihatan beda waktu offline karena font fallback */
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(
      caches.open(CACHE).then(function (c) {
        return c.match(r).then(function (hit) {
          var net = fetch(r).then(function (res) {
            if (res && res.status === 200) c.put(r, res.clone());
            return res;
          }).catch(function () { return hit; });
          return hit || net;
        });
      })
    );
    return;
  }

  if (url.origin !== location.origin) return;

  e.respondWith(
    caches.match(r).then(function (hit) {
      if (hit) return hit;
      return fetch(r).then(function (res) {
        if (res && res.status === 200 && res.type === 'basic') {
          var salin = res.clone();
          caches.open(CACHE).then(function (c) { c.put(r, salin); });
        }
        return res;
      }).catch(function () {
        /* navigasi offline ke path apa pun: balikin shell */
        if (r.mode === 'navigate') return caches.match('index.html');
      });
    })
  );
});
