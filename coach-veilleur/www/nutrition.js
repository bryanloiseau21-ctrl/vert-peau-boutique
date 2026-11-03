// Veilleur — calories : objectif du jour, journal des repas, adaptation au poids.
// Fonctions pures, testées dans tests/nutrition.test.js.

export const ACTIVITES = { assis: 'Plutôt assis', debout: 'Souvent debout', physique: 'Travail physique' };
export const SEXES = { homme: 'Homme', femme: 'Femme' };
export const REPAS = { petitdej: 'Petit-déjeuner', dejeuner: 'Déjeuner', collation: 'Collation', diner: 'Dîner' };
const FACTEUR = { assis: 1.2, debout: 1.375, physique: 1.55 };

// Valeurs pour 100 g (ou 100 ml) : kcal, protéines, glucides, lipides, portion habituelle en g.
export const ALIMENTS = [
  ['Pain blanc (baguette)', 270, 9, 55, 1.5, 60], ['Pain complet', 245, 9, 44, 3, 50], ['Pâtes cuites', 150, 5.5, 30, 0.9, 200],
  ['Riz blanc cuit', 130, 2.7, 28, 0.3, 180], ['Riz complet cuit', 123, 2.7, 25, 1, 180], ['Pommes de terre cuites', 85, 2, 18, 0.1, 200],
  ['Frites', 290, 3.4, 36, 15, 150], ['Flocons d’avoine', 370, 13, 60, 7, 50], ['Céréales du petit-déjeuner', 380, 8, 80, 3, 40],
  ['Quinoa cuit', 120, 4.4, 21, 1.9, 150], ['Lentilles cuites', 116, 9, 20, 0.4, 180], ['Pois chiches cuits', 164, 9, 27, 2.6, 150],
  ['Blanc de poulet cuit', 165, 31, 0, 3.6, 150], ['Steak haché 5 %', 137, 21, 0, 5, 125], ['Steak haché 15 %', 215, 18, 0, 15, 125],
  ['Saumon cuit', 206, 22, 0, 13, 130], ['Thon en conserve au naturel', 116, 26, 0, 1, 100], ['Jambon blanc', 115, 20, 1, 3.5, 40],
  ['Œuf', 145, 12.5, 0.7, 10, 55], ['Tofu', 120, 13, 2, 7, 125], ['Lait demi-écrémé', 46, 3.3, 4.8, 1.6, 250],
  ['Yaourt nature', 60, 4, 5, 3, 125], ['Skyr / fromage blanc 0 %', 60, 10, 4, 0.2, 150], ['Emmental', 380, 28, 0, 30, 30],
  ['Camembert', 290, 20, 0.5, 23, 30], ['Beurre', 745, 0.7, 0.6, 82, 10], ['Huile d’olive', 900, 0, 0, 100, 10],
  ['Pomme', 52, 0.3, 14, 0.2, 150], ['Banane', 90, 1.1, 23, 0.3, 120], ['Orange', 47, 0.9, 12, 0.1, 150],
  ['Fraises', 32, 0.7, 7.7, 0.3, 150], ['Raisin', 70, 0.7, 18, 0.2, 125], ['Salade verte', 15, 1.4, 2.9, 0.2, 80],
  ['Tomate', 18, 0.9, 3.9, 0.2, 120], ['Carottes', 41, 0.9, 10, 0.2, 120], ['Brocoli cuit', 35, 2.4, 7, 0.4, 150],
  ['Haricots verts', 31, 1.8, 7, 0.1, 150], ['Avocat', 160, 2, 9, 15, 100], ['Amandes', 580, 21, 22, 50, 30],
  ['Beurre de cacahuète', 590, 25, 20, 50, 20], ['Chocolat noir 70 %', 580, 8, 36, 43, 20], ['Pizza margherita', 260, 11, 32, 10, 300],
  ['Burger (pain + steak + fromage)', 260, 14, 24, 12, 220], ['Kebab sandwich', 230, 12, 22, 11, 350], ['Sushi / maki', 150, 6, 28, 1.5, 200],
  ['Croissant', 410, 8, 45, 21, 60], ['Pain au chocolat', 420, 7.5, 47, 22, 70], ['Biscuits sablés', 480, 6, 66, 21, 30],
  ['Chips', 540, 6, 52, 34, 45], ['Glace', 210, 3.5, 25, 11, 100], ['Soda sucré', 42, 0, 10.6, 0, 330],
  ['Jus d’orange', 45, 0.7, 10, 0.2, 200], ['Bière', 43, 0.5, 3.6, 0, 250], ['Vin rouge', 85, 0.1, 2.6, 0, 125],
  ['Café sucré', 20, 0.1, 5, 0, 100], ['Protéine en poudre (whey)', 380, 78, 8, 5, 30], ['Barre protéinée', 360, 33, 35, 12, 50],
  ['Soupe de légumes', 35, 1, 6, 0.8, 300], ['Sandwich jambon-beurre', 270, 12, 33, 10, 200], ['Salade composée', 120, 6, 8, 7, 300],
].map(([nom, kcal, p, g, l, portion]) => ({ nom, kcal, p, g, l, portion }));

const sansAccents = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export function chercherAliment(q, max = 8) {
  const mots = sansAccents(q).split(/\s+/).filter(Boolean);
  if (!mots.length) return ALIMENTS.slice(0, max);
  return ALIMENTS.filter(a => mots.every(m => sansAccents(a.nom).includes(m))).slice(0, max);
}
export function portion(aliment, grammes) {
  const f = grammes / 100;
  return { nom: aliment.nom, grammes, kcal: Math.round(aliment.kcal * f), p: r1(aliment.p * f), g: r1(aliment.g * f), l: r1(aliment.l * f) };
}
const r1 = n => Math.round(n * 10) / 10;

export function profilCaloriesComplet(p) {
  return !!(p && SEXES[p.sexe] && p.age >= 14 && p.taille >= 120 && p.poids >= 30 && ACTIVITES[p.activite]);
}

// Métabolisme de base (Mifflin-St Jeor) × activité, corrigé par l'objectif et l'ajustement appris.
export function objectifJour(profil, nutri = {}) {
  if (!profilCaloriesComplet(profil)) return null;
  const poids = derniereValeur(nutri.pesees) ?? profil.poids;
  const base = 10 * poids + 6.25 * profil.taille - 5 * profil.age + (profil.sexe === 'homme' ? 5 : -161);
  const entretien = base * FACTEUR[profil.activite];
  const correction = { perte: -0.15, muscle: 0.1, endurance: 0.05, forme: 0 }[profil.objectif] ?? 0;
  const plancher = profil.sexe === 'homme' ? 1500 : 1200;
  const calcule = Math.max(plancher, Math.round((entretien * (1 + correction) + (nutri.ajustement || 0)) / 10) * 10);
  // Objectifs choisis à la main dans l'appli : ils remplacent le calcul.
  const kcal = nutri.perso?.kcal >= 800 ? Math.round(nutri.perso.kcal) : calcule;
  const p = nutri.perso?.p > 0 ? Math.round(nutri.perso.p) : Math.round(poids * (['muscle', 'perte'].includes(profil.objectif) ? 2 : 1.6));
  const l = Math.round(poids * 0.9);
  const g = Math.max(0, Math.round((kcal - p * 4 - l * 9) / 4));
  return { kcal, p, g, l, entretien: Math.round(entretien), poids, calcule, perso: !!(nutri.perso?.kcal >= 800 || nutri.perso?.p > 0) };
}

// Calories dépensées par une séance (MET moyen × poids × durée).
export function depenseSeance(h, poids) {
  const met = h.type === 'recup' ? 2.5 : 5;
  return Math.round(met * poids * (h.minutes || 0) / 60);
}

export function bilanJour(profil, nutri, historique, date) {
  const obj = objectifJour(profil, nutri);
  const entrees = (nutri.journal || []).filter(e => e.date === date);
  const total = entrees.reduce((a, e) => ({ kcal: a.kcal + e.kcal, p: a.p + e.p, g: a.g + e.g, l: a.l + e.l }), { kcal: 0, p: 0, g: 0, l: 0 });
  const poids = obj?.poids ?? profil.poids ?? 70;
  const sport = (historique || []).filter(h => h.date === date).reduce((a, h) => a + depenseSeance(h, poids), 0);
  const cible = obj ? obj.kcal + sport : null;
  return { obj, entrees, total: { kcal: total.kcal, p: r1(total.p), g: r1(total.g), l: r1(total.l) }, sport, cible, reste: cible === null ? null : cible - total.kcal };
}

function derniereValeur(pesees) {
  return pesees?.length ? [...pesees].sort((a, b) => a.date.localeCompare(b.date)).at(-1).kg : null;
}

// Le coach compare l'évolution réelle du poids à celle attendue et corrige l'objectif (±100 kcal, plafonné à ±400).
export function ajusterSelonPoids(profil, nutri, aujourdhui) {
  const pesees = [...(nutri.pesees || [])].sort((a, b) => a.date.localeCompare(b.date));
  const depuis = nutri.dernierAjustement || '0000-00-00';
  if (ecart(depuis, aujourdhui) < 14) return { ajustement: nutri.ajustement || 0, message: null };
  const recentes = pesees.filter(x => ecart(x.date, aujourdhui) <= 21);
  if (recentes.length < 2) return { ajustement: nutri.ajustement || 0, message: null };
  const premiere = recentes[0], derniere = recentes.at(-1);
  const semaines = Math.max(1, ecart(premiere.date, derniere.date)) / 7;
  if (semaines < 1.5) return { ajustement: nutri.ajustement || 0, message: null };
  const pente = (derniere.kg - premiere.kg) / semaines; // kg par semaine
  const pct = pente / premiere.kg;
  let delta = 0, message = null;
  if (profil.objectif === 'perte') {
    if (pct > -0.002) { delta = -100; message = 'Ton poids ne baisse pas : objectif réduit de 100 kcal.'; }
    else if (pct < -0.01) { delta = 100; message = 'Tu perds trop vite : +100 kcal pour garder ton muscle.'; }
  } else if (profil.objectif === 'muscle') {
    if (pct < 0.001) { delta = 100; message = 'Ton poids ne monte pas : +100 kcal pour construire du muscle.'; }
    else if (pct > 0.006) { delta = -100; message = 'Tu prends trop vite : −100 kcal pour limiter le gras.'; }
  } else if (Math.abs(pct) > 0.005) {
    delta = pct > 0 ? -100 : 100;
    message = `Ton poids ${pct > 0 ? 'monte' : 'baisse'} : objectif ajusté de ${delta > 0 ? '+' : '−'}100 kcal pour rester stable.`;
  }
  const ajustement = Math.max(-400, Math.min(400, (nutri.ajustement || 0) + delta));
  return { ajustement, message: ajustement !== (nutri.ajustement || 0) ? message : null };
}
function ecart(a, b) { return Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 86400000); }

export function repasSelonHeure(h = new Date().getHours()) {
  if (h < 11) return 'petitdej';
  if (h < 15) return 'dejeuner';
  if (h < 18) return 'collation';
  return 'diner';
}

// ---------- analyse de photo ----------
export const CONSIGNE_PHOTO = `Tu es nutritionniste. La photo montre un repas ou un aliment.
Identifie chaque aliment visible, estime sa quantité en grammes (taille de l'assiette, des couverts, de l'emballage) puis ses calories et macronutriments pour la quantité estimée.
Si une étiquette nutritionnelle est lisible, utilise ses valeurs. Si la photo ne montre pas de nourriture, renvoie une liste vide et explique pourquoi dans "remarque".
Réponds en français avec uniquement ce JSON :
{"aliments":[{"nom":"Riz blanc cuit","grammes":180,"kcal":234,"proteines":4.9,"glucides":50,"lipides":0.5}],"confiance":"moyenne","remarque":"Huile de cuisson estimée à une cuillère."}
"confiance" vaut "haute", "moyenne" ou "basse".`;

export const SCHEMA_PHOTO = {
  type: 'object',
  properties: {
    aliments: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          nom: { type: 'string' }, grammes: { type: 'number' }, kcal: { type: 'number' },
          proteines: { type: 'number' }, glucides: { type: 'number' }, lipides: { type: 'number' },
        },
        required: ['nom', 'grammes', 'kcal', 'proteines', 'glucides', 'lipides'],
        additionalProperties: false,
      },
    },
    confiance: { type: 'string', enum: ['haute', 'moyenne', 'basse'] },
    remarque: { type: 'string' },
  },
  required: ['aliments', 'confiance', 'remarque'],
  additionalProperties: false,
};

// Rend la réponse sûre à afficher : nombres bornés, champs manquants remplacés.
export function nettoyerAnalyse(brut) {
  const n = (v, max) => Math.max(0, Math.min(max, Number(v) || 0));
  const aliments = (Array.isArray(brut?.aliments) ? brut.aliments : []).slice(0, 15).map(a => ({
    nom: String(a?.nom || 'Aliment').slice(0, 60),
    grammes: Math.round(n(a?.grammes, 3000)),
    kcal: Math.round(n(a?.kcal, 5000)),
    p: r1(n(a?.proteines, 500)), g: r1(n(a?.glucides, 800)), l: r1(n(a?.lipides, 500)),
  })).filter(a => a.grammes > 0 || a.kcal > 0);
  return {
    aliments,
    confiance: ['haute', 'moyenne', 'basse'].includes(brut?.confiance) ? brut.confiance : 'basse',
    remarque: String(brut?.remarque || '').slice(0, 300),
  };
}

// Change la quantité d'un aliment analysé en gardant ses proportions.
export function regrammer(a, grammes) {
  if (!a.grammes) return { ...a, grammes };
  const f = grammes / a.grammes;
  return { ...a, grammes, kcal: Math.round(a.kcal * f), p: r1(a.p * f), g: r1(a.g * f), l: r1(a.l * f) };
}

// Exemple de journal pour essayer l'appli sans rien saisir.
export function exempleNutrition(aujourdhui) {
  const jourDecale = n => { const d = new Date(aujourdhui + 'T12:00:00'); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const journal = [];
  let id = 0;
  const ajoute = (date, repas, nom, grammes, source = 'manuel') => {
    const a = ALIMENTS.find(x => x.nom === nom);
    journal.push({ id: `ex${id++}`, date, repas, source, ...portion(a, grammes) });
  };
  for (let n = -6; n <= 0; n++) {
    const d = jourDecale(n);
    ajoute(d, 'petitdej', 'Flocons d’avoine', 60); ajoute(d, 'petitdej', 'Lait demi-écrémé', 250); ajoute(d, 'petitdej', 'Banane', 120);
    ajoute(d, 'dejeuner', 'Riz blanc cuit', 200 + (n % 2) * 40, 'photo'); ajoute(d, 'dejeuner', 'Blanc de poulet cuit', 150, 'photo'); ajoute(d, 'dejeuner', 'Haricots verts', 150, 'photo');
    if (n < 0) { ajoute(d, 'collation', 'Skyr / fromage blanc 0 %', 150); ajoute(d, 'diner', 'Pâtes cuites', 220); ajoute(d, 'diner', 'Saumon cuit', 120); }
  }
  const pesees = [-20, -13, -6, 0].map((n, i) => ({ date: jourDecale(n), kg: [77.2, 76.8, 76.5, 76.1][i] }));
  return { journal, pesees, ajustement: 0, dernierAjustement: jourDecale(-6) };
}
