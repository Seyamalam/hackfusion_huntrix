self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const requestURL = new URL(event.request.url);

  if (requestURL.hostname.endsWith("tile.openstreetmap.org")) {
    event.respondWith(cacheMapTile(event.request));
  }
});

async function cacheMapTile(request) {
  const cache = await caches.open("huntrix-delta-osm-tiles-v1");
  const cached = await cache.match(request);
  if (cached) {
    return cached;
  }

  const response = await fetch(request);
  if (response.ok) {
    cache.put(request, response.clone());
  }
  return response;
}
