/* 离线缓存：现场无信号也能打开使用 */
var CACHE = 'pv-workbench-v1';
var ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/css/app.css',
  './assets/js/utils.js',
  './assets/js/seed.js',
  './assets/js/store.js',
  './assets/js/ai.js',
  './assets/js/ui.js',
  './assets/js/views/dashboard.js',
  './assets/js/views/todos.js',
  './assets/js/views/notes.js',
  './assets/js/views/projects.js',
  './assets/js/views/sitelogs.js',
  './assets/js/views/contacts.js',
  './assets/js/views/docs.js',
  './assets/js/views/commission.js',
  './assets/js/views/reports.js',
  './assets/js/views/me.js',
  './assets/js/app.js'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(function (r) {
      return r || fetch(e.request).then(function (resp) {
        var copy = resp.clone();
        caches.open(CACHE).then(function (c) { c.put(e.request, copy); }).catch(function () { });
        return resp;
      }).catch(function () { return caches.match('./index.html'); });
    })
  );
});
