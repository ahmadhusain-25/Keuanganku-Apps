const CACHE_NAME = "keuanganku-cache-v1";
const ASSETS = [
  "/",
  "/index.html",
  "/logo.png",
  "/manifest.json"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  // Parse URL
  const url = new URL(e.request.url);

  // Bypass API calls so database actions are never stale or intercepted incorrectly
  if (url.pathname.startsWith("/api/") || e.request.method !== "GET") {
    return;
  }

  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) {
        // Stale-While-Revalidate for non-API requests
        fetch(e.request)
          .then((response) => {
            if (response.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(e.request, response);
              });
            }
          })
          .catch(() => {});
        return cached;
      }
      return fetch(e.request);
    })
  );
});
