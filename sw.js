const CACHE_NAME = 'solar-calc-v2';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/site.webmanifest',
    '/favicon.ico',
    '/favicon.svg',
    '/favicon-96x96.png',
    '/apple-touch-icon.png',
    '/web-app-manifest-192x192.png',
    '/web-app-manifest-512x512.png'
];

// حدث التثبيت (Caching)
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting();
});

// حدث التفعيل (تنظيف الكاش القديم عند التحديث)
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// حدث الجلب (Stale-While-Revalidate) - ممتاز للتحديثات التلقائية
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
            const fetchPromise = fetch(event.request).then((networkResponse) => {
                // تحديث الكاش بالنسخة الجديدة في الخلفية
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, networkResponse.clone());
                });
                return networkResponse;
            }).catch(() => {
                // في حال انقطاع النت، نتجاهل الخطأ لأننا سنعرض النسخة المخبأة
            });
            
            // عرض النسخة المخبأة فوراً إن وجدت، وإلا جلبها من النت
            return cachedResponse || fetchPromise;
        })
    );
});
