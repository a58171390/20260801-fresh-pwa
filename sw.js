/* =====================================================
   鮮之源 Service Worker (多策略快取)
   策略總覽：
   1. HTML 導覽請求      → Network First（確保內容最新，離線時回退快取）
   2. 同源靜態資源        → Cache First（icons、manifest、favicon）
   3. CDN 第三方資源      → Stale While Revalidate（Tailwind、Lucide、字型）
   4. Unsplash 商品圖片   → Stale While Revalidate + 獨立快取（上限控管）
   5. Supabase / GA4 API → 一律直連網路，絕不快取（避免訂單與追蹤資料失真）
   ===================================================== */

const VERSION = 'v1.0.0';
const STATIC_CACHE = `fresh-static-${VERSION}`;
const CDN_CACHE = `fresh-cdn-${VERSION}`;
const IMG_CACHE = `fresh-img-${VERSION}`;
const IMG_CACHE_LIMIT = 60;

const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './offline.html',
  './favicon.ico',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png',
  './icons/maskable-192x192.png',
  './icons/maskable-512x512.png'
];

/* 絕不攔截快取的網域（資料寫入與分析） */
const NETWORK_ONLY_HOSTS = [
  'supabase.co',
  'google-analytics.com',
  'googletagmanager.com',
  'analytics.google.com'
];

/* CDN 資源網域 */
const CDN_HOSTS = [
  'cdn.tailwindcss.com',
  'unpkg.com',
  'cdn.jsdelivr.net',
  'fonts.googleapis.com',
  'fonts.gstatic.com'
];

/* ── Install：預快取核心殼層 ── */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

/* ── Activate：清除舊版本快取 ── */
self.addEventListener('activate', (event) => {
  const keep = [STATIC_CACHE, CDN_CACHE, IMG_CACHE];
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => !keep.includes(k)).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

/* ── 快取數量上限控管 ── */
async function trimCache(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxItems) {
    await cache.delete(keys[0]);
    return trimCache(cacheName, maxItems);
  }
}

/* ── 策略 1：Network First (HTML) ── */
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    return caches.match('./offline.html');
  }
}

/* ── 策略 2：Cache First (同源靜態資源) ── */
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.ok) {
    const cache = await caches.open(STATIC_CACHE);
    cache.put(request, response.clone());
  }
  return response;
}

/* ── 策略 3/4：Stale While Revalidate ── */
async function staleWhileRevalidate(request, cacheName, limit) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const networkFetch = fetch(request)
    .then((response) => {
      if (response && (response.ok || response.type === 'opaque')) {
        cache.put(request, response.clone());
        if (limit) trimCache(cacheName, limit);
      }
      return response;
    })
    .catch(() => cached);
  return cached || networkFetch;
}

/* ── Fetch 路由分派 ── */
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return; // 訂單 POST 等一律放行

  const url = new URL(request.url);

  // 策略 5：API 與分析請求絕不攔截
  if (NETWORK_ONLY_HOSTS.some((h) => url.hostname.includes(h))) return;

  // 策略 1：HTML 導覽
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }

  // 策略 4：商品圖片
  if (url.hostname.includes('images.unsplash.com')) {
    event.respondWith(staleWhileRevalidate(request, IMG_CACHE, IMG_CACHE_LIMIT));
    return;
  }

  // 策略 3：CDN 資源
  if (CDN_HOSTS.some((h) => url.hostname.includes(h))) {
    event.respondWith(staleWhileRevalidate(request, CDN_CACHE));
    return;
  }

  // 策略 2：同源靜態資源
  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(request));
  }
});

/* ── 支援前端觸發立即更新 ── */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
