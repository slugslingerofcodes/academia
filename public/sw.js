/*
 * Academia service worker — offline support.
 *
 * Strategy is deliberately network-first for anything that can change, so a
 * bad cache can never strand you on a stale build. Only content-hashed build
 * assets are served cache-first, since their URLs change when they change.
 *
 * Bump VERSION to force every client onto a fresh cache.
 */

const VERSION = "v1";
const CACHE = `academia-${VERSION}`;
const APP_SHELL = "/";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.add(APP_SHELL))
      // activate immediately rather than waiting for every tab to close
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

/** Store a response copy without blocking the response returned to the page. */
function put(request, response) {
  if (!response || !response.ok || response.type === "opaque") return response;
  const copy = response.clone();
  caches.open(CACHE).then((cache) => cache.put(request, copy));
  return response;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Page loads: try the network so a new build is picked up straight away,
  // and fall back to the cached shell when offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => put(APP_SHELL, response))
        .catch(() =>
          caches
            .match(APP_SHELL)
            .then((hit) => hit || new Response("Offline", { status: 503 }))
        )
    );
    return;
  }

  // Build output is content-hashed and immutable — safe to serve from cache.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then(
        (hit) => hit || fetch(request).then((response) => put(request, response))
      )
    );
    return;
  }

  // Everything else same-origin (icons, manifest): network first, cache as backup.
  event.respondWith(
    fetch(request)
      .then((response) => put(request, response))
      .catch(() =>
        caches
          .match(request)
          .then((hit) => hit || new Response("Offline", { status: 503 }))
      )
  );
});
