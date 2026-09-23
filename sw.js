// =========================================================
// SMART-POLA — sw.js (Service Worker PWA)
// Cache-first untuk mod offline.
// Naikkan CACHE_NAME setiap kali fail aplikasi berubah.
// =========================================================
const CACHE_NAME = "smartpola-v5.1.0";
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./checklist.html",
  "./manifest.json",
  "./icon.svg",
  "./icon-maskable.svg",
  "./Calibration card.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ||
        fetch(event.request)
          .then((response) => {
            // Simpan salinan aset asal sahaja.
            if (response.ok && new URL(event.request.url).origin === location.origin) {
              const copy = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
            }
            return response;
          })
          .catch(() => caches.match("./index.html"))
      );
    })
  );
});
