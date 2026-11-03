// Logique pure (sans navigateur) : calendrier selon la zone, conseils du mois, détection du climat,
// estimation des récoltes et redressement de la photo. Testée dans tests/logique.test.js.
import { PLANTES, PLANTE_PAR_ID, ZONES, TRAVAUX } from './data.js';

const mod12 = (m) => ((((m - 1) % 12) + 12) % 12) + 1; // ramène dans 1..12

// Découpe une liste de mois en périodes continues (en tenant compte du passage décembre → janvier).
export function periodes(mois) {
  const set = new Set(mois.map(mod12));
  if (set.size === 0) return [];
  if (set.size === 12) return [[1, 12]];
  const res = [];
  for (const m of set) {
    if (set.has(mod12(m - 1))) continue; // pas un début de période
    let fin = m;
    while (set.has(mod12(fin + 1))) fin = mod12(fin + 1);
    res.push([m, fin]);
  }
  return res.sort((a, b) => a[0] - b[0]);
}

const estPrintemps = (m) => m >= 2 && m <= 8; // dans le calendrier de référence (hémisphère nord)

// Décale une liste de mois de la zone de référence vers une autre zone / hémisphère.
// Le début d'une période se décale avec l'offset de sa saison, la fin aussi :
// en méditerranéen la saison commence plus tôt et finit plus tard, en montagne c'est l'inverse.
// abri = 'serre' : la saison commence un mois plus tôt et finit un mois plus tard.
export function ajusterMois(mois, zoneId = 'oceanique', hemisphere = 'nord', abri = null) {
  if (!mois || mois.length === 0) return [];
  const base = ZONES[zoneId] || ZONES.oceanique;
  const zone = abri === 'serre' ? { printemps: base.printemps - 1, automne: base.automne + 1 } : base;
  let res;
  if (zoneId === 'tropical') {
    res = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  } else {
    const set = new Set();
    for (const [debut, fin] of periodes(mois)) {
      const longueur = mod12(fin - debut + 1) - 1; // 0 = un seul mois
      if (debut === 1 && fin === 12) { for (let m = 1; m <= 12; m++) set.add(m); continue; }
      const dDebut = estPrintemps(debut) ? zone.printemps : zone.automne;
      const dFin = estPrintemps(fin) ? zone.printemps : zone.automne;
      const nvLongueur = Math.min(11, Math.max(0, longueur + dFin - dDebut));
      const nvDebut = mod12(debut + dDebut);
      for (let i = 0; i <= nvLongueur; i++) set.add(mod12(nvDebut + i));
    }
    res = [...set];
  }
  if (hemisphere === 'sud') res = res.map((m) => mod12(m + 6));
  return [...new Set(res)].sort((a, b) => a - b);
}

// Calendrier complet d'une plante pour une zone donnée.
export function calendrier(plante, zoneId, hemisphere, abri = null) {
  return {
    sa: ajusterMois(plante.sa, zoneId, hemisphere, abri),
    st: ajusterMois(plante.st, zoneId, hemisphere, abri),
    pl: ajusterMois(plante.pl, zoneId, hemisphere, abri),
    re: ajusterMois(plante.re, zoneId, hemisphere, abri),
  };
}

export const ACTIONS = {
  sa: { nom: 'Semer sous abri', court: 'Semis abri', emoji: '🏠' },
  st: { nom: 'Semer en pleine terre', court: 'Semis terre', emoji: '🌱' },
  pl: { nom: 'Planter / repiquer', court: 'Plantation', emoji: '🪴' },
  re: { nom: 'Récolter', court: 'Récolte', emoji: '🧺' },
};
export const nomRecolte = (plante) => (plante.cat === 'fleur' ? 'Floraison' : 'Récolte');

// Recommandations pour un mois : quelles plantes semer / planter / récolter.
export function recommandations(mois, zoneId = 'oceanique', hemisphere = 'nord', plantes = PLANTES, abri = null) {
  const res = { sa: [], st: [], pl: [], re: [] };
  for (const p of plantes) {
    const cal = calendrier(p, zoneId, hemisphere, abri);
    for (const a of Object.keys(res)) if (cal[a].includes(mois)) res[a].push(p);
  }
  return res;
}

export function saison(mois, hemisphere = 'nord') {
  const m = hemisphere === 'sud' ? mod12(mois + 6) : mois;
  if (m === 12 || m <= 2) return { nom: 'Hiver', emoji: '❄️' };
  if (m <= 5) return { nom: 'Printemps', emoji: '🌷' };
  if (m <= 8) return { nom: 'Été', emoji: '☀️' };
  return { nom: 'Automne', emoji: '🍂' };
}

export function travauxDuMois(mois, zoneId = 'oceanique', hemisphere = 'nord') {
  if (zoneId === 'tropical') {
    return ['Semez et plantez en début de saison des pluies, récoltez en saison sèche.',
      'Paillez épais pour protéger le sol du soleil et des fortes pluies.',
      'Ombrez salades et légumes feuilles aux heures chaudes.'];
  }
  const ref = hemisphere === 'sud' ? mod12(mois + 6) : mois;
  return TRAVAUX[ref] || [];
}

// Estime le climat à partir de la position (et de l'altitude si on la connaît).
export function detecterZone(lat, lon, altitude = 0) {
  const hemisphere = lat < 0 ? 'sud' : 'nord';
  const a = Math.abs(lat);
  let zone = 'oceanique';
  if (a < 23.5) zone = 'tropical';
  else if (altitude >= 900) zone = 'montagne';
  else if (hemisphere === 'nord' && lat >= 30 && lat < 46 && lon > -10 && lon < 40 &&
    ((lat < 44.5 && lon > 2.5) || lat < 42)) zone = 'mediterraneen'; // bassin méditerranéen
  else if (a >= 28 && a < 38) zone = 'mediterraneen'; // Californie, Chili, Afrique du Sud, Australie du sud…
  else if (a >= 56) zone = 'continental';
  else if (hemisphere === 'nord' && lon >= 6 && lon < 60 && lat >= 44) zone = 'continental'; // Europe centrale et de l'Est
  else if (hemisphere === 'nord' && lon > -115 && lon < -70 && lat >= 38) zone = 'continental'; // intérieur de l'Amérique du Nord
  return { zone, hemisphere };
}

// Date ISO (AAAA-MM-JJ) → Date locale à midi (évite les soucis de fuseau horaire).
export const versDate = (iso) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d, 12); };
export const versISO = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const JOUR = 86400000;

// Date estimée de la première récolte : au moins « jours » après la mise en terre,
// et dans un mois de récolte pour la zone.
export function estimerRecolte(plantation, zoneId = 'oceanique', hemisphere = 'nord', abri = null) {
  const p = PLANTE_PAR_ID[plantation.plante];
  if (!p || !plantation.date) return null;
  const debut = versDate(plantation.date);
  const mini = new Date(debut.getTime() + p.jours * JOUR);
  const moisRecolte = ajusterMois(p.re, zoneId, hemisphere, abri);
  if (moisRecolte.length === 0) return mini;
  const d = new Date(mini);
  for (let i = 0; i < 36; i++) {
    if (moisRecolte.includes(d.getMonth() + 1)) {
      // si on a avancé d'au moins un mois, on prend le 1er du mois
      return i === 0 ? d : new Date(d.getFullYear(), d.getMonth(), 1, 12);
    }
    d.setMonth(d.getMonth() + 1, 1);
  }
  return mini;
}

// Avancement de la culture entre la plantation et la récolte estimée (0 → 1).
export function avancement(plantation, aujourdhui = new Date(), zoneId, hemisphere, abri = null) {
  const recolte = estimerRecolte(plantation, zoneId, hemisphere, abri);
  if (!recolte) return 0;
  const debut = versDate(plantation.date).getTime();
  const total = recolte.getTime() - debut;
  if (total <= 0) return 1;
  return Math.min(1, Math.max(0, (aujourdhui.getTime() - debut) / total));
}

export function joursEntre(a, b) { return Math.round((b.getTime() - a.getTime()) / JOUR); }

// Ce mois-ci, est-ce une bonne période pour mettre cette plante en terre ?
export function bonnePeriode(planteId, mois, zoneId, hemisphere, abri = null) {
  const p = PLANTE_PAR_ID[planteId];
  if (!p) return null;
  const cal = calendrier(p, zoneId, hemisphere, abri);
  return cal.sa.includes(mois) || cal.st.includes(mois) || cal.pl.includes(mois);
}

// Plantes de la liste qui craignent le gel (pour l'alerte météo). Celles en serre sont à l'abri.
export function plantesGelives(plantations, bacs = []) {
  const enSerre = new Set(bacs.filter((b) => b.type === 'serre').map((b) => b.id));
  return [...new Set(plantations.filter((x) => !enSerre.has(x.bac)).map((x) => x.plante))]
    .map((id) => PLANTE_PAR_ID[id]).filter((p) => p && p.gel);
}

// ── Disposition des bacs sur l'île ─────────────────────────────────────
// Range les bacs en rangées (avec une allée entre eux), puis centre le tout.
// Renvoie { places: { id: { x, z } }, rayon } en mètres.
export function disposerBacs(bacs, allee = 1) {
  if (!bacs.length) return { places: {}, rayon: 3 };
  const surface = bacs.reduce((s, b) => s + (b.largeur + allee) * (b.longueur + allee), 0);
  const maxRangee = Math.max(...bacs.map((b) => b.largeur), Math.sqrt(surface) * 1.25);
  const places = {};
  let x = 0, z = 0, hRangee = 0;
  for (const b of bacs) {
    if (x > 0 && x + b.largeur > maxRangee) { x = 0; z += hRangee + allee; hRangee = 0; }
    places[b.id] = { x: x + b.largeur / 2, z: z + b.longueur / 2 };
    x += b.largeur + allee; hRangee = Math.max(hRangee, b.longueur);
  }
  const xs = bacs.map((b) => [places[b.id].x - b.largeur / 2, places[b.id].x + b.largeur / 2]).flat();
  const zs = bacs.map((b) => [places[b.id].z - b.longueur / 2, places[b.id].z + b.longueur / 2]).flat();
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cz = (Math.min(...zs) + Math.max(...zs)) / 2;
  let rayon = 0;
  for (const b of bacs) {
    const p = places[b.id]; p.x -= cx; p.z -= cz;
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      rayon = Math.max(rayon, Math.hypot(p.x + (sx * b.largeur) / 2, p.z + (sz * b.longueur) / 2));
    }
  }
  return { places, rayon };
}

// ── Redressement de la photo (homographie) ─────────────────────────────
// Calcule la transformation qui envoie le carré unité (0,0)(1,0)(1,1)(0,1)
// sur le quadrilatère p0 p1 p2 p3 (haut-gauche, haut-droite, bas-droite, bas-gauche).
export function homographie(q) {
  const [p0, p1, p2, p3] = q;
  const dx1 = p1.x - p2.x, dx2 = p3.x - p2.x, dx3 = p0.x - p1.x + p2.x - p3.x;
  const dy1 = p1.y - p2.y, dy2 = p3.y - p2.y, dy3 = p0.y - p1.y + p2.y - p3.y;
  let g = 0, h = 0;
  if (Math.abs(dx3) > 1e-9 || Math.abs(dy3) > 1e-9) {
    const den = dx1 * dy2 - dx2 * dy1;
    g = (dx3 * dy2 - dx2 * dy3) / den;
    h = (dx1 * dy3 - dx3 * dy1) / den;
  }
  return {
    a: p1.x - p0.x + g * p1.x, b: p3.x - p0.x + h * p3.x, c: p0.x,
    d: p1.y - p0.y + g * p1.y, e: p3.y - p0.y + h * p3.y, f: p0.y, g, h,
  };
}
export function appliquer(H, u, v) {
  const w = H.g * u + H.h * v + 1;
  return { x: (H.a * u + H.b * v + H.c) / w, y: (H.d * u + H.e * v + H.f) / w };
}

// Redresse une image (données RGBA) : le quadrilatère devient un rectangle largeur × hauteur.
export function redresser(src, srcL, srcH, coins, largeur, hauteur) {
  const H = homographie(coins);
  const out = new Uint8ClampedArray(largeur * hauteur * 4);
  for (let y = 0; y < hauteur; y++) {
    const v = (y + 0.5) / hauteur;
    for (let x = 0; x < largeur; x++) {
      const { x: sx, y: sy } = appliquer(H, (x + 0.5) / largeur, v);
      // interpolation bilinéaire
      const fx = Math.min(Math.max(sx - 0.5, 0), srcL - 1), fy = Math.min(Math.max(sy - 0.5, 0), srcH - 1);
      const x0 = Math.floor(fx), y0 = Math.floor(fy);
      const x1 = Math.min(x0 + 1, srcL - 1), y1 = Math.min(y0 + 1, srcH - 1);
      const tx = fx - x0, ty = fy - y0;
      const i00 = (y0 * srcL + x0) * 4, i10 = (y0 * srcL + x1) * 4, i01 = (y1 * srcL + x0) * 4, i11 = (y1 * srcL + x1) * 4;
      const o = (y * largeur + x) * 4;
      for (let c = 0; c < 4; c++) {
        const haut = src[i00 + c] * (1 - tx) + src[i10 + c] * tx;
        const bas = src[i01 + c] * (1 - tx) + src[i11 + c] * tx;
        out[o + c] = haut * (1 - ty) + bas * ty;
      }
    }
  }
  return out;
}

// Taille de l'image redressée : respecte les proportions réelles du potager.
export function tailleRedressee(largeurM, longueurM, max = 1024) {
  const r = Math.max(0.1, largeurM) / Math.max(0.1, longueurM);
  return r >= 1 ? { l: max, h: Math.max(16, Math.round(max / r)) } : { l: Math.max(16, Math.round(max * r)), h: max };
}

export const formatDate = (iso, opts = { day: 'numeric', month: 'short', year: 'numeric' }) =>
  (iso instanceof Date ? iso : versDate(iso)).toLocaleDateString('fr-FR', opts);
