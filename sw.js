// =========================================================
// SMART-POLA Service Worker (V4.0)
// Strategi:
//   - Halaman navigasi (HTML): network-first, fallback cache
//   - Aset (CSS/JS/ikon): stale-while-revalidate
//   - Semua permintaan lain (cth. kad PNG): cache-first
// Naikkan CACHE_NAME setiap kali anda mengemas kini fail
// supaya semua pelajar menerima versi baharu.
// =========================================================
const CACHE_NAME = "smartpola-v4.0.6";
const PRECACHE = [
  "./",
  "./index.html",
  "./checklist.html",
  "./app.js",
  "./style.css",
  "./manifest.json",
  "./icon.svg",
  "./icon-maskable.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  // Halaman navigasi: cuba rangkaian dahulu, fallback cache (offline)
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match("./index.html"))
        )
      );
    return;
  }

  const url = new URL(request.url);

  // Aset statik: stale-while-revalidate
  if (
    url.origin === location.origin &&
    (url.pathname.endsWith(".css") ||
      url.pathname.endsWith(".js") ||
      url.pathname.endsWith(".svg") ||
      url.pathname.endsWith(".json"))
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request)
          .then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            }
            return response;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
    return;
  }

  // Lain-lain (imej kad penentukuran dll.): cache-first
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          if (response.ok && url.origin === location.origin) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
    )
  );
});
