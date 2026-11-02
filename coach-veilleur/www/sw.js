// Service worker : Veilleur marche hors connexion après la première ouverture.
const CACHE = 'veilleur-v1';
const COQUILLE = ['./', 'index.html', 'app.js', 'coach.js', 'nutrition.js', 'analyse.js', 'complements.js', 'manifest.webmanifest',
  'icons/icon.svg', 'icons/apple-touch-icon.png', 'icons/icon-192.png', 'icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(COQUILLE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  // Réseau d'abord (dernière version), cache si hors ligne.
  e.respondWith(
    fetch(e.request).then(rep => {
      if (rep.ok && rep.type === 'basic') { const copie = rep.clone(); caches.open(CACHE).then(c => c.put(e.request, copie)); }
      return rep;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
