// =========================================================
// SMART-POLA Service Worker (V4.0.7)
// Strategi:
//   - Halaman, JS & CSS: network-first, fallback cache
//     (kod sentiasa versi terkini - elak ralat versi bercampur)
//   - Ikon/manifest: stale-while-revalidate
//   - Lain-lain (kad penentukuran): cache-first
// Naikkan CACHE_NAME + versi ?v= dalam index.html setiap kemas kini.
// =========================================================
const CACHE_NAME = "smartpola-v4.1.1";
const APP_VERSION = "4.1.1";
const PRECACHE = [
  "./",
  "./index.html",
  "./checklist.html",
  "./app.js?v=" + APP_VERSION,
  "./style.css?v=" + APP_VERSION,
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

  const url = new URL(request.url);
  const isPage = request.mode === "navigate";
  const isCode = url.origin === location.origin &&
    (url.pathname.endsWith(".js") || url.pathname.endsWith(".css"));

  // Halaman, JS & CSS: cuba rangkaian dahulu, fallback cache (offline)
  if (isPage || isCode) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() =>
          caches.match(request).then(
            (cached) => cached || (isPage ? caches.match("./index.html") : undefined)
          )
        )
    );
    return;
  }

  // Ikon & manifest: stale-while-revalidate
  if (
    url.origin === location.origin &&
    (url.pathname.endsWith(".svg") || url.pathname.endsWith(".json"))
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
