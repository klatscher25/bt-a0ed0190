/* Service Worker: Seite (verschlüsselt) auch offline öffnen. Netz zuerst, sonst letzte gespeicherte Fassung.
   Nur eigene Dateien – Anfragen an api.github.com (Sync) laufen nie über den Cache. */
const CACHE = 'trk-v2';
self.addEventListener('install', e => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then(c => c.addAll(['./', 'manifest.webmanifest', 'icon-192.png']).catch(() => {}))); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  e.respondWith(fetch(r, { cache: 'no-store' }).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(r.mode === 'navigate' ? './' : r, copy)); }
    return res;
  }).catch(() => caches.match(r.mode === 'navigate' ? './' : r, { ignoreSearch: true })));
});
