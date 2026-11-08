// VPVie Service Worker — cài PWA & chạy ngoại tuyến (iPad/Android/máy tính).
// Chiến lược: NETWORK-FIRST cho tài nguyên cùng nguồn (GET) — luôn lấy bản mới
// nhất (quan trọng cho bản desktop chạy máy chủ nội bộ, tránh phục vụ file cũ đã
// cache sau khi cập nhật ứng dụng); offline thì mới lấy từ cache. Bỏ qua /api (động).
const CACHE = 'vpvie-v5';
const CORE = [
  'bang.html', 'style.css', 'oxyz.css', 'manifest.webmanifest',
  'js/oxyz-math.js', 'js/tools-oxyz.js',
  'js/mathplot.js', 'js/tools-formula.js',
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
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;         // bỏ qua nguồn ngoài
  if (url.pathname.startsWith('/api/')) return;        // API động: để mạng xử lý
  // NETWORK-FIRST: ưu tiên bản mới từ mạng/máy chủ nội bộ, lỗi mới dùng cache.
  e.respondWith(
    fetch(req).then((res) => {
      if (res && res.status === 200 && res.type === 'basic') {
        const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy));
      }
      return res;
    }).catch(() => caches.match(req))
  );
});
