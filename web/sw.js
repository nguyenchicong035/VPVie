// VPVie Service Worker — cài PWA + chạy ngoại tuyến + TỰ CẬP NHẬT khi có bản mới.
// Chiến lược: mã ứng dụng (html/js/css/manifest) dùng NETWORK-FIRST (luôn lấy bản mới
// khi có mạng, lùi về cache khi offline); thư viện nặng (vendor/ảnh/font/wasm) dùng
// CACHE-FIRST cho nhanh. Đổi VERSION mỗi lần phát hành để dọn cache cũ.
const VERSION = 'v2';
const CACHE = 'vpvie-' + VERSION;
const CORE = [
  'bang.html', 'style.css', 'manifest.webmanifest',
  'js/app.js', 'js/beautify.js', 'js/license.js', 'js/ink-recognize.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'
];
self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE).catch(() => {})));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('message', (e) => { if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting(); });

function isAppShell(url) {
  return /\.(html|js|css|webmanifest)$/.test(url.pathname) || url.pathname.endsWith('/');
}
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.indexOf('/api/') >= 0) return;
  if (isAppShell(url)) {
    // network-first: lấy bản mới nhất khi có mạng
    e.respondWith(
      fetch(req).then((res) => {
        if (res && res.status === 200 && res.type === 'basic') { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
        return res;
      }).catch(() => caches.match(req))
    );
  } else {
    // cache-first cho tài nguyên nặng ít đổi
    e.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res && res.status === 200 && res.type === 'basic') { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
        return res;
      }).catch(() => hit))
    );
  }
});
