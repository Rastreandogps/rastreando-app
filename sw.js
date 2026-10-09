/* Rastreando GPS — service worker mínimo.
   Só olha as páginas do próprio app: tenta sempre a internet primeiro (assim toda atualização publicada aparece na hora)
   e, se estiver sem internet, mostra a última cópia guardada. Chamadas ao servidor de rastreamento NÃO passam por aqui. */
const V = 'rg-v2';
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

/* Notificações no celular (alertas de ignição e de cerca). Chegam mesmo com o app fechado. */
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = { texto: e.data ? e.data.text() : '' }; }
  const titulo = d.titulo || 'Rastreando GPS';
  e.waitUntil(self.registration.showNotification(titulo, {
    body: d.texto || '',
    icon: 'icon-192.png',
    badge: 'icon-192.png',
    tag: (d.tipo || 'alerta') + '-' + (d.deviceId || '') + '-' + (d.em || Date.now()),
    data: { url: './tempo-real.html#alertas' }
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const alvo = new URL((e.notification.data && e.notification.data.url) || './tempo-real.html', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(lista => {
    for (const c of lista) { if (c.url.indexOf('tempo-real.html') >= 0 && 'focus' in c) { c.postMessage({ abrir: 'alertas' }); return c.focus(); } }
    return self.clients.openWindow(alvo);
  }));
});
