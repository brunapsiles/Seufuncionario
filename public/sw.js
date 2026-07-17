const CACHE = "seu-funcionario-v28";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin || url.pathname.startsWith("/api/")) return;
  // HTML e navegação: sempre da rede, sem cache do navegador, para nunca servir versão antiga
  const isDoc = req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html");
  if (isDoc) {
    event.respondWith(
      fetch(req, { cache: "no-store" })
        .then((fresh) => {
          caches.open(CACHE).then((c) => c.put(req, fresh.clone()));
          return fresh;
        })
        .catch(() => caches.match(req).then((c) => c || caches.match("/"))),
    );
    return;
  }
  // Demais (JS/CSS com hash, imagens): rede primeiro, cai para cache offline
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      try {
        const fresh = await fetch(req);
        if (fresh.ok) cache.put(req, fresh.clone());
        return fresh;
      } catch {
        const cached = await cache.match(req);
        return cached || cache.match("/");
      }
    }),
  );
});
