// Service worker mínimo. Existe por dos razones: Chrome exige uno con handler
// de `fetch` para ofrecer la instalación, y da una pantalla decente cuando se
// cae la red.
//
// No cachea respuestas de la app a propósito: todo acá es contenido privado y
// dependiente de la sesión (stock, movimientos, auditoría). Servir una copia
// vieja de /inventario sería peor que no funcionar.
const CACHE = "gestool-v1";
const OFFLINE = "/offline";

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll([OFFLINE, "/icon-192.png"])),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((claves) => Promise.all(claves.filter((c) => c !== CACHE).map((c) => caches.delete(c))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (evento) => {
  // Solo las navegaciones. El resto (RSC, server actions, /api, estáticos) va
  // derecho a la red: no hay nada acá que convenga guardar.
  if (evento.request.mode !== "navigate") return;

  evento.respondWith(
    fetch(evento.request).catch(() => caches.match(OFFLINE).then((r) => r ?? Response.error())),
  );
});
