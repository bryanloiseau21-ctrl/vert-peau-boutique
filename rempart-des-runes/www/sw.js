// Service worker : le jeu fonctionne hors connexion après la première ouverture.
const CACHE = 'rempart-des-runes-v1';
const FILES = ['./', 'index.html', 'style.css', 'manifest.webmanifest', 'confidentialite.html',
  'js/main.js', 'js/data.js', 'js/engine.js', 'js/meta.js', 'js/render.js', 'js/battle.js',
  'js/audio.js', 'js/save.js', 'js/payments.js', 'js/config.js',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  // Réseau d'abord (mises à jour), cache si hors ligne
  e.respondWith(fetch(e.request).then((rep) => {
    if (rep.ok && rep.type === 'basic') { const copy = rep.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
    return rep;
  }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
