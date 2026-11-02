// Service worker : l'appli marche hors connexion après la première ouverture.
const CACHE = "boost-etudiant-v3";
const COQUILLE = ["./", "index.html", "style.css", "app.js", "data.js", "compte.js", "firebase-config.js", "manifest.webmanifest",
  "confidentialite.html", "icons/icon.svg", "icons/apple-touch-icon.png", "icons/icon-192.png", "icons/icon-512.png",
  "fonts/inter.woff2", "fonts/bricolage.woff2"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(COQUILLE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  if (url.origin !== location.origin) return;
  // Réseau d'abord (infos à jour), cache si hors ligne
  e.respondWith(
    fetch(e.request).then((rep) => {
      // On ne met en cache que les réponses valides (jamais une page d'erreur)
      if (rep.ok && rep.type === "basic") {
        const copie = rep.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copie));
      }
      return rep;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
