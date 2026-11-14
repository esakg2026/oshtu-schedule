// Service worker: приложение открывается мгновенно и работает без интернета.
// При изменении файлов увеличь VERSION.
const VERSION = "v4";
const CACHE = `oshtu-shell-${VERSION}`;
const SHELL = [
  "./",
  "index.html",
  "style.css",
  "config.js",
  "core.js",
  "app.js",
  "widget.html",
  "iphone.html",
  "manifest.webmanifest",
  "icon.svg",
  "icon-192.png",
  "icon-512.png",
  "icon-maskable-512.png",
  "apple-touch-icon.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("oshtu-shell-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Свои файлы: сразу из кэша, в фоне — обновление (stale-while-revalidate).
// Запросы к Supabase не трогаем — данные кэширует само приложение.
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.endsWith(".apk") || url.pathname.startsWith("/sb/")) return;

  const isNav = req.mode === "navigate";
  const cacheKey = isNav ? (url.pathname.endsWith("widget.html") ? "widget.html" : "index.html") : req;

  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(cacheKey, { ignoreSearch: true });
      const network = fetch(req)
        .then((res) => {
          if (res && res.ok && res.type === "basic") cache.put(cacheKey, res.clone());
          return res;
        })
        .catch(() => null);
      if (cached) {
        e.waitUntil(network);
        return cached;
      }
      const res = await network;
      return res || new Response("Офлайн", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
    }),
  );
});
