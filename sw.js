/* 离线缓存：现场无信号也能打开使用
 * v2：改为「网络优先 + 缓存兜底」，保证新版本能及时推送到手机；
 *     跨域请求（api.github.com 等）一律放行，绝不缓存，否则云同步会读到旧数据。
 */
var CACHE = 'pv-workbench-v2';
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
  './assets/js/sync.js',
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
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return c.addAll(ASSETS); })
      .catch(function () { })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;

  var url;
  try { url = new URL(req.url); } catch (err) { return; }

  // 跨域（GitHub API 等）：完全交给浏览器，不拦截、不缓存
  if (url.origin !== self.location.origin) return;

  // 同源：网络优先，成功则回写缓存；断网时用缓存兜底
  e.respondWith(
    fetch(req).then(function (resp) {
      if (resp && resp.status === 200 && resp.type === 'basic') {
        var copy = resp.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); }).catch(function () { });
      }
      return resp;
    }).catch(function () {
      return caches.match(req).then(function (r) {
        return r || caches.match('./index.html');
      });
    })
  );
});
