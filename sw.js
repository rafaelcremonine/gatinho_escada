// "Kill switch": se ainda existir um service worker antigo instalado, este aqui
// se auto-destrói, apaga todo o cache e recarrega — pra nunca mais mostrar a versão velha.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
    await self.registration.unregister();
    const clients = await self.clients.matchAll();
    clients.forEach((c) => { try { c.navigate(c.url); } catch (_) {} });
  })());
});
