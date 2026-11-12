/* Service Worker: Seite (verschlüsselt) auch offline öffnen. Netz zuerst, sonst letzte gespeicherte Fassung.
   Nur eigene Dateien – Anfragen an api.github.com (Sync) laufen nie über den Cache. */
const CACHE = 'trk-v3';
/* Seite (page-<Hash>.enc) und Anhänge (anhang-<Hash>.enc) sind unveränderlich (Name = Inhalts-Hash): zuerst aus dem Cache, nur sonst aus dem Netz.
   So lädt die App nach dem ersten Mal sofort; nur das kleine index.html wird immer frisch geholt. */
const IMM = /\/(page|anhang)-[0-9a-f]+\.enc$/;
async function prune(path) {
  const c = await caches.open(CACHE), ks = await c.keys();
  if (/\/page-/.test(path)) for (const k of ks) { const u = new URL(k.url).pathname; if (/\/page-/.test(u) && u !== path) c.delete(k); }
  const an = ks.filter(k => /\/anhang-/.test(k.url));
  if (an.length > 80) for (const k of an.slice(0, an.length - 60)) c.delete(k);
}
self.addEventListener('install', e => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then(c => c.addAll(['./', 'manifest.webmanifest', 'icon-192.png']).catch(() => {}))); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  const path = new URL(r.url).pathname;
  if (IMM.test(path)) {
    e.respondWith(caches.match(r).then(hit => hit || fetch(r).then(res => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(r, copy)).then(() => prune(path)); } return res; })));
    return;
  }
  e.respondWith(fetch(r, { cache: 'no-store' }).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(r.mode === 'navigate' ? './' : r, copy)); }
    return res;
  }).catch(() => caches.match(r.mode === 'navigate' ? './' : r, { ignoreSearch: true })));
});
