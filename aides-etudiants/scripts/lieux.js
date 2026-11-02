// Télécharge les lieux officiels du CROUS (open data du ministère, Licence Ouverte)
// et produit www/lieux.json, utilisé par l'onglet « Autour de moi ».
// Lance : node scripts/lieux.js   (en cas d'échec, l'ancien fichier est conservé)
const fs = require("fs");
const path = require("path");

const BASE = "https://data.enseignementsup-recherche.gouv.fr/api/explore/v2.1/catalog/datasets";
const SOURCES = [
  { id: "fr_crous_restauration_france_entiere", type: "resto", min: 200 },
  { id: "fr_crous_logement_france_entiere", type: "logement", min: 200 },
];
const SORTIE = path.join(__dirname, "..", "www", "lieux.json");

const texte = (v) => String(v ?? "")
  .replace(/<br\s*\/?>/gi, " · ").replace(/<[^>]*>/g, " ")
  .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#0?39;|&apos;/g, "'").replace(/&quot;/g, '"')
  .replace(/\s+/g, " ").replace(/^[\s·]+|[\s·]+$/g, "").trim();
const https = (u) => { try { const x = new URL(String(u || "").trim()); return x.protocol === "https:" ? x.href : ""; } catch { return ""; } };

// Les coordonnées arrivent soit en {lat, lon}, soit en [lat, lon] selon l'API
function coords(r) {
  for (const k of ["geolocalisation", "geocalisation", "geo_point_2d", "point_geo"]) {
    const g = r[k];
    if (!g) continue;
    if (Array.isArray(g) && g.length === 2) return [+g[0], +g[1]];
    if (typeof g === "object" && "lat" in g && "lon" in g) return [+g.lat, +g.lon];
  }
  if (r.lat != null && (r.lon ?? r.lng) != null) return [+r.lat, +(r.lon ?? r.lng)];
  return null;
}
const valide = ([la, lo]) => Number.isFinite(la) && Number.isFinite(lo) && Math.abs(la) <= 90 && Math.abs(lo) <= 180 && !(la === 0 && lo === 0);

async function charger(src) {
  const rep = await fetch(`${BASE}/${src.id}/exports/json`, { signal: AbortSignal.timeout(60000) });
  if (!rep.ok) throw new Error(`${src.id} : HTTP ${rep.status}`);
  const brut = await rep.json();
  const lignes = Array.isArray(brut) ? brut : (brut.records || brut.results || []).map((x) => x.fields || x);
  const vus = new Set();
  const lieux = [];
  for (const r of lignes) {
    const c = coords(r);
    const nom = texte(r.title || r.nom);
    if (!c || !valide(c) || !nom) continue;
    const cle = `${nom}|${c[0].toFixed(4)}|${c[1].toFixed(4)}`;
    if (vus.has(cle)) continue;
    vus.add(cle);
    const l = { t: src.type, n: nom.slice(0, 120), lat: +c[0].toFixed(5), lon: +c[1].toFixed(5) };
    const ville = texte(r.zone);
    const adresse = texte(r.address || (src.type === "logement" ? r.infos : "") || "");
    if (ville) l.v = ville.slice(0, 60);
    if (adresse) l.a = adresse.slice(0, 160);
    if (src.type === "resto" && r.type) l.s = texte(r.type).slice(0, 40);
    if (+r.closing === 1) l.f = 1;
    const lien = https(r.bookingurl) || https(r.interneturl);
    if (lien) l.u = lien;
    lieux.push(l);
  }
  if (lieux.length < src.min) throw new Error(`${src.id} : seulement ${lieux.length} lieux valides (minimum ${src.min})`);
  return lieux;
}

(async () => {
  try {
    const lieux = (await Promise.all(SOURCES.map(charger))).flat();
    const maj = new Date().toISOString().slice(0, 10);
    fs.writeFileSync(SORTIE, JSON.stringify({ maj, source: "CROUS / MESR – Licence Ouverte", lieux }));
    console.log(`✅ ${lieux.length} lieux enregistrés (${maj})`);
  } catch (e) {
    console.error(`⚠️ Lieux non mis à jour : ${e.message}`);
    if (!fs.existsSync(SORTIE)) process.exitCode = 1;
  }
})();
