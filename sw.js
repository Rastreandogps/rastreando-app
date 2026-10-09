/* Rastreando GPS — service worker mínimo.
   Só olha as páginas do próprio app: tenta sempre a internet primeiro (assim toda atualização publicada aparece na hora)
   e, se estiver sem internet, mostra a última cópia guardada. Chamadas ao servidor de rastreamento NÃO passam por aqui. */
const V = 'rg-v1';
self.addEventListener('install', () => { self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || r.mode !== 'navigate' || new URL(r.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(r).then(res => {
      if (res && res.ok) { const c = res.clone(); caches.open(V).then(x => x.put(r, c)).catch(() => {}); }
      return res;
    }).catch(() => caches.match(r).then(m => m || caches.match('./tempo-real.html')))
  );
});
