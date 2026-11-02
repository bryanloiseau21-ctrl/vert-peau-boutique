// Service worker : l'appli fonctionne hors connexion après la première ouverture.
const CACHE = 'mon-potager-v1';
const FILES = ['./', 'index.html', 'style.css', 'manifest.webmanifest', 'icons/icon.svg',
  'js/app.js', 'js/data.js', 'js/logique.js', 'js/stockage.js', 'js/detourage.js', 'js/scene3d.js',
  'vendor/three.module.min.js', 'vendor/three.core.min.js', 'vendor/OrbitControls.js'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  // Réseau d'abord (mises à jour), cache si hors connexion
  e.respondWith(fetch(e.request).then((rep) => {
    if (rep.ok && rep.type === 'basic') { const copie = rep.clone(); caches.open(CACHE).then((c) => c.put(e.request, copie)); }
    return rep;
  }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
