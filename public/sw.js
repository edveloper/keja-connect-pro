/*
 * RentKonnect service worker.
 *
 * Deliberately minimal. This app is a ledger: showing a landlord a cached
 * figure that is no longer true would be worse than showing them nothing, so
 * nothing from Supabase is ever cached. The worker exists to make the app
 * installable and to keep the shell available offline, where it explains that
 * a connection is needed rather than failing blankly.
 */

const SHELL_CACHE = "rentkonnect-shell-v1";
const SHELL_ASSETS = ["/", "/index.html", "/manifest.webmanifest", "/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== SHELL_CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Never cache data. Balances must always come from the database.
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/rest/") || url.pathname.startsWith("/auth/")) return;

  // Navigations: network first, falling back to the cached shell so a reload
  // with no signal still opens the app rather than a browser error page.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/index.html").then((r) => r || Response.error()))
    );
    return;
  }

  // Build assets are content-hashed, so a cache hit is always correct.
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          if (response.ok && url.pathname.startsWith("/assets/")) {
            const copy = response.clone();
            caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
    )
  );
});
