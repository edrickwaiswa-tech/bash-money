/**
 * BMMFS Service Worker — cache-first strategy for static assets,
 * network-first for API calls.
 * Bump CACHE_VERSION whenever you deploy a new build.
 */

const CACHE_VERSION = "v3";
const CACHE_NAME = `bmmfs-${CACHE_VERSION}`;

/** Assets pre-cached on SW install so the app shell loads instantly offline. */
const PRECACHE_URLS = [
  "/",
  "/index.html",
  "/logo.png",
  "/logo-white.png",
  "/manifest.webmanifest",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
];

// ── Install: pre-cache the app shell ─────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

// ── Activate: purge ALL old caches immediately ────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// ── Fetch: serve from cache, fall back to network ────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only intercept same-origin GET requests
  if (request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  // API calls → Network-first (never cache sensitive financial data)
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request).catch(() =>
        new Response(JSON.stringify({ error: "Offline" }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );
    return;
  }

  // HTML navigation → Network-first so new deployments are always picked up
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request)),
    );
    return;
  }

  // Static assets (JS, CSS, images, fonts) → Cache-first
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request).then((response) => {
        if (!response || response.status !== 200 || response.type === "opaque") {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        return response;
      });
    }),
  );
});
