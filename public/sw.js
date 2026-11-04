/*
 * Service Worker mínimo y seguro para PWA/TWA.
 * Estrategia:
 *  · Solo intercepta GET del mismo origen (POST/PATCH y APIs de otros orígenes
 *    como wa.me pasan directo → nunca rompe el polling ni las mutaciones).
 *  · /_next/static e /icons: cache-first (son inmutables por build).
 *  · Navegaciones: network-first con fallback offline (no sirve páginas viejas).
 *  · APIs (/api/*): SIEMPRE a la red, sin caché (datos siempre frescos).
 */
const CACHE = "taller-conecta-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // APIs y rutas dinámicas: siempre red, nunca caché
  if (url.pathname.startsWith("/api/")) return;

  // Assets estáticos e iconos: cache-first
  if (url.pathname.startsWith("/_next/static") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copia = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copia));
            }
            return res;
          })
      )
    );
    return;
  }

  // Navegaciones: network-first sin guardar pantallas privadas en caché.
  // Nunca se guarda /__last_online para rutas del taller, admin, cuenta o seguimiento.
  const RUTAS_PRIVADAS = ["/taller", "/admin", "/cuenta", "/seguimiento"];
  const esPrivada = RUTAS_PRIVADAS.some((p) => url.pathname.startsWith(p));

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          // Solo cachear navegaciones públicas; nunca pantallas privadas con datos de clientes/órdenes.
          if (!esPrivada && res.ok) {
            const copia = res.clone();
            caches.open(CACHE).then((c) => c.put("/__last_online", copia));
          }
          return res;
        })
        .catch(() =>
          caches.match("/offline.html").then((off) => off || caches.match("/__last_online") || Response.error())
        )
    );
  }
});
