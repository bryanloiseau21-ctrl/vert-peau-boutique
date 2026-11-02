// Sauvegarde sur le téléphone (IndexedDB) : l'état du potager et les photos.
// Si IndexedDB n'est pas disponible (navigation privée…), tout reste en mémoire.
const BASE = 'mon-potager';
const MAGASIN = 'donnees';
const memoire = new Map();
let dbPromesse = null;

function ouvrir() {
  if (dbPromesse) return dbPromesse;
  dbPromesse = new Promise((resolve) => {
    try {
      const req = indexedDB.open(BASE, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(MAGASIN);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch { resolve(null); }
  });
  return dbPromesse;
}

export async function lire(cle) {
  const db = await ouvrir();
  if (!db) return memoire.get(cle);
  return new Promise((resolve) => {
    try {
      const req = db.transaction(MAGASIN, 'readonly').objectStore(MAGASIN).get(cle);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(memoire.get(cle));
    } catch { resolve(memoire.get(cle)); }
  });
}

export async function ecrire(cle, valeur) {
  memoire.set(cle, valeur);
  const db = await ouvrir();
  if (!db) return;
  await new Promise((resolve) => {
    try {
      const tx = db.transaction(MAGASIN, 'readwrite');
      if (valeur === undefined || valeur === null) tx.objectStore(MAGASIN).delete(cle);
      else tx.objectStore(MAGASIN).put(valeur, cle);
      tx.oncomplete = resolve; tx.onerror = resolve; tx.onabort = resolve;
    } catch { resolve(); }
  });
}

export const ETAT_DEFAUT = () => ({
  version: 1,
  nom: 'Mon potager',
  largeur: 4, // mètres (gauche → droite sur la photo)
  longueur: 3, // mètres (haut → bas sur la photo)
  coins: null, // coins du potager sur la photo d'origine (0..1)
  lieu: null, // { nom, lat, lon, altitude }
  zone: 'oceanique',
  hemisphere: 'nord',
  zoneAuto: true,
  fond: 'ciel',
  etiquettes: true,
  plantations: [], // { id, plante, date, qte, note, x, y }
});

export async function chargerEtat() {
  const e = await lire('etat');
  return { ...ETAT_DEFAUT(), ...(e || {}) };
}
export const sauverEtat = (etat) => ecrire('etat', JSON.parse(JSON.stringify(etat)));
