const CACHE_NAME = 'solar-panels-v6';
const NETWORK_TIMEOUT_MS = 3000;

const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/favicon.ico',
    '/favicon.svg',
    '/favicon-96x96.png',
    '/apple-touch-icon.png',
    '/site.webmanifest',
    '/about.html',
    '/privacy.html'
];

// تثبيت الـ Service Worker وحفظ الملفات الأساسية في الكاش
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        }).then(() => self.skipWaiting())
    );
});

// تفعيل الإصدار الجديد وحذف الكاش القديم تلقائياً
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// استراتيجية Network-First مع مهلة 3 ثوانٍ والرجوع للكاش عند التأخير أو الأوفلاين
self.addEventListener('fetch', (event) => {
    // تتجاهل الطلبات الخارجية مثل APIs أو روابط تحليلات الزيارات
    if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
        return;
    }

    event.respondWith(
        new Promise((resolve) => {
            let isTimedOut = false;

            // مؤقت المهلة (3 ثوانٍ)
            const timeoutId = setTimeout(() => {
                isTimedOut = true;
                caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
                    if (cachedResponse) {
                        resolve(cachedResponse);
                    }
                });
            }, NETWORK_TIMEOUT_MS);

            // محاولة الجلب من الشبكة أولاً
            fetch(event.request).then((networkResponse) => {
                clearTimeout(timeoutId);

                // إذا نجح الاتصال وكانت الاستجابة سليمة، نحدث الكاش ونرجع الملف الجديد
                if (networkResponse && networkResponse.status === 200) {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });

                    if (!isTimedOut) {
                        resolve(networkResponse);
                    }
                } else {
                    // إذا أرجع السيرفر خطأ، نرجع النسخة المحفوظة من الكاش
                    if (!isTimedOut) {
                        caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
                            resolve(cachedResponse || networkResponse);
                        });
                    }
                }
            }).catch(() => {
                // في حالة انقطاع الشبكة (الأوفلاين) قبل انقضاء المهلة
                clearTimeout(timeoutId);
                if (!isTimedOut) {
                    caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
                        resolve(cachedResponse || new Response('Offline', { status: 503, statusText: 'Service Unavailable' }));
                    });
                }
            });
        })
    );
});
