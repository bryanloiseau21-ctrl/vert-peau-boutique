// Mon Potager : interface de l'appli.
import { PLANTES, PLANTE_PAR_ID, CATEGORIES, ZONES, MOIS, MOIS_COURT, TYPES_BAC, MATERIAUX, COULEURS_BAC, COULEUR_DEFAUT, ANIMAUX, ARBRES, ETAPES_ARBRE } from './data.js';
import {
  ACTIONS, ajusterMois, calendrier, disposerBacs, recommandations, saison, travauxDuMois, detecterZone, estimerRecolte, avancement,
  joursEntre, bonnePeriode, plantesGelives, periodes, versISO, versDate, formatDate, nomRecolte,
} from './logique.js';
import { lire, ecrire, chargerEtat, sauverEtat, ETAT_DEFAUT } from './stockage.js';
import { chargerImage, ouvrirDetourage, redresserCanvas } from './detourage.js';
import { creerScene, FONDS } from './scene3d.js';
import { ETAPES, lienWiki } from './etapes.js';
import { NATIF, vibrer, partagerFichier, partagerTexte, obtenirPosition, programmerRecoltes, surNotificationTouchee, surBoutonRetour } from './natif.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const auj = () => new Date();
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

let etat = ETAT_DEFAUT();
let scene = null;
const images = {}; // id du bac → { url, image } (photo redressée)
const sources = {}; // id du bac → photo d'origine (pour refaire le détourage)
let photoPour = null; // bac qui reçoit la prochaine photo
let conseilAbri = null; // conseils pour dehors (null) ou en serre ('serre')
let filtre = 'tout';
let moisAffiche = auj().getMonth() + 1;
let placement = null; // id de la plantation à placer sur le plan
let meteo = null;

const sauver = () => sauverEtat(etat);

// ── Petites aides d'affichage ───────────────────────────────────────────
function toast(texte, type = '') {
  const t = document.createElement('div');
  t.className = `toast ${type}`; t.textContent = texte;
  $('#toasts').appendChild(t);
  setTimeout(() => t.classList.add('sort'), 2600);
  setTimeout(() => t.remove(), 3000);
}

// Confirmation dans l'appli (les fenêtres confirm() du navigateur ne marchent pas partout)
function demander(message, oui = 'Oui', non = 'Annuler') {
  return new Promise((resolve) => {
    const d = document.createElement('div');
    d.className = 'dialogue'; d.setAttribute('role', 'alertdialog'); d.setAttribute('aria-modal', 'true');
    d.innerHTML = `<div class="dialogue-carte"><p>${esc(message)}</p>
      <div class="rangee"><button class="btn btn-gris" data-rep="non">${esc(non)}</button><button class="btn btn-rouge" data-rep="oui">${esc(oui)}</button></div></div>`;
    document.body.appendChild(d);
    d.querySelector('[data-rep="non"]').focus();
    d.addEventListener('click', (e) => {
      const r = e.target.closest('[data-rep]')?.dataset.rep;
      if (!r && e.target !== d) return;
      e.stopPropagation(); d.remove(); resolve(r === 'oui');
    });
  });
}

function confettis() {
  const emojis = ['🌻', '🍅', '🥕', '⭐', '🌸', '🍓', '✨'];
  for (let i = 0; i < 24; i++) {
    const c = document.createElement('span');
    c.className = 'confetti'; c.textContent = emojis[i % emojis.length];
    c.style.left = `${Math.random() * 100}vw`;
    c.style.animationDelay = `${Math.random() * 0.4}s`;
    c.style.fontSize = `${18 + Math.random() * 18}px`;
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 2600);
  }
}

function plageMois(liste) {
  if (!liste.length) return '—';
  if (liste.length === 12) return 'toute l\'année';
  return periodes(liste).map(([a, b]) => (a === b ? MOIS[a - 1] : `${MOIS[a - 1]} → ${MOIS[b - 1]}`)).join(', ');
}

// ── Bacs, serres et enclos ──────────────────────────────────────────────
const cleOrig = (id) => `photoOriginale:${id}`;
const clePlan = (id) => `photoPlan:${id}`;
const bacParId = (id) => etat.bacs.find((b) => b.id === id);
const estCulture = (b) => b && b.type !== 'enclos' && b.type !== 'arbre';
const bacsCultures = () => etat.bacs.filter(estCulture);
const bacDe = (p) => bacParId(p.bac) || bacsCultures()[0];
const abriDe = (p) => (bacDe(p)?.type === 'serre' ? 'serre' : null);
const bacActuel = () => bacParId(etat.bacActif) || etat.bacs[0];
const aUnePhoto = () => Object.values(images).some((x) => x.url);
const fmtM = (v) => `${String(Math.round(v * 100) / 100).replace('.', ',')} m`;
// Place occupée par un verger : les arbres en quadrillage, espacés comme conseillé
function dimsVerger(espece, nombre) {
  const esp = (ARBRES[espece] || ARBRES.pommier).esp;
  const cols = Math.ceil(Math.sqrt(nombre)), rangs = Math.ceil(nombre / cols);
  return { largeur: cols * esp, longueur: rangs * esp };
}
// Ce que l'arbre montre ce mois-ci en 3D : fleurs, fruits ou couleurs d'automne
function saisonArbre(b, mois = auj().getMonth() + 1) {
  const a = ARBRES[b.espece];
  if (!a) return null;
  if (a.fruitier) {
    if (ajusterMois(a.re, etat.zone, etat.hemisphere).includes(mois)) return 'fruit';
    if (ajusterMois(a.floraison, etat.zone, etat.hemisphere).includes(mois)) return 'fleur';
  }
  const m = etat.hemisphere === 'sud' ? ((mois + 5) % 12) + 1 : mois;
  return m === 10 || m === 11 ? 'automne' : null;
}
const nomArbres = (b) => { const a = ARBRES[b.espece] || ARBRES.pommier; return b.nombre > 1 ? `${b.nombre} ${a.nom.toLowerCase()}s` : `1 ${a.nom.toLowerCase()}`; };
const emojiElement = (b) => (b.type === 'enclos' ? ANIMAUX[b.animal]?.emoji || '🐾' : b.type === 'arbre' ? ARBRES[b.espece]?.emoji || '🌳' : TYPES_BAC[b.type].emoji);
const descBac = (b) => (b.type === 'arbre' ? `${nomArbres(b)} · ${fmtM(b.hauteur)} de haut` : b.type === 'enclos'
  ? `${ANIMAUX[b.animal]?.emoji || '🐾'} ${b.nombre} ${(b.nombre > 1 ? ANIMAUX[b.animal]?.nom : ANIMAUX[b.animal]?.un || '').toLowerCase()} · ${fmtM(b.largeur)} × ${fmtM(b.longueur)}`
  : `${MATERIAUX[b.type]?.[b.materiau] || ''} · ${fmtM(b.largeur)} × ${fmtM(b.longueur)}${b.type !== 'terre' ? ` × ${fmtM(b.hauteur)}` : ''}`);

function nouveauBac(type = 'bac', base = {}) {
  const mat = Object.keys(MATERIAUX[type])[0];
  const n = etat.bacs.filter((b) => b.type === type).length + 1;
  return {
    id: uid(), type, nom: `${TYPES_BAC[type].nom} ${n}`, largeur: type === 'enclos' ? 4 : type === 'serre' ? 3 : 2,
    longueur: type === 'enclos' ? 3 : type === 'serre' ? 2 : 1, hauteur: TYPES_BAC[type].hauteur,
    materiau: mat, couleur: COULEUR_DEFAUT[mat], coins: null,
    ...(type === 'enclos' ? { animal: 'poule', nombre: 3, cabane: true } : {}),
    ...(type === 'arbre' ? { espece: 'pommier', nombre: 1, hauteur: ARBRES.pommier.hauteur, date: versISO(auj()), couleur: '#4caf50', ...dimsVerger('pommier', 1), nom: `Pommier ${n}` } : {}),
    ...base,
  };
}

// Anciennes sauvegardes : un seul potager → devient le premier bac
async function migrer() {
  if (Array.isArray(etat.bacs) && etat.bacs.length) return;
  const b = nouveauBac('bac', { id: 'b1', nom: 'Mon bac', largeur: etat.largeur || 4, longueur: etat.longueur || 3, coins: etat.coins || null });
  b.materiau = 'bois'; b.couleur = '#c98a4b';
  etat.bacs = [b]; etat.bacActif = 'b1';
  for (const pl of etat.plantations) if (!pl.bac) pl.bac = 'b1';
  for (const [ancien, nouveau] of [['photoPlan', clePlan('b1')], ['photoOriginale', cleOrig('b1')]]) {
    const v = await lire(ancien);
    if (v) { await ecrire(nouveau, v); await ecrire(ancien, null); }
  }
  delete etat.largeur; delete etat.longueur; delete etat.coins;
  await sauver();
}

function infos(p) {
  const plante = PLANTE_PAR_ID[p.plante];
  const abri = abriDe(p);
  const recolte = estimerRecolte(p, etat.zone, etat.hemisphere, abri);
  const progres = avancement(p, auj(), etat.zone, etat.hemisphere, abri);
  const reste = recolte ? joursEntre(auj(), recolte) : null;
  return { plante, recolte, progres, reste, cat: CATEGORIES[plante?.cat] || CATEGORIES.legume };
}

function texteReste(reste, plante) {
  const mot = nomRecolte(plante).toLowerCase();
  if (reste == null) return '';
  if (reste <= 0) return plante.cat === 'fleur' ? 'En fleur ! 🌸' : 'Prêt à récolter ! 🧺';
  if (reste < 14) return `${mot} dans ${reste} j`;
  if (reste < 60) return `${mot} dans ${Math.round(reste / 7)} sem.`;
  return `${mot} dans ${Math.round(reste / 30)} mois`;
}

// ── Niveau du jardinier (petit côté jeu) ──────────────────────────────
const NIVEAUX = [
  [0, 'Petite graine'], [30, 'Jeune pousse'], [80, 'Jardinier en herbe'], [150, 'Main verte'],
  [250, 'Pro du potager'], [400, 'Maître jardinier'], [600, 'Légende du potager'],
];
function calculerXP() {
  const pl = etat.plantations;
  const especes = new Set(pl.map((p) => p.plante));
  const cats = new Set(pl.map((p) => PLANTE_PAR_ID[p.plante]?.cat));
  const bonus = etat.bacs.reduce((s, b, i) => s + (b.type === 'enclos' ? 25 : b.type === 'arbre' ? 20 : i ? 15 : 0), 0);
  return pl.length * 10 + especes.size * 15 + cats.size * 20 + (aUnePhoto() ? 20 : 0) + (etat.lieu ? 15 : 0) + bonus + (etat.coupes?.length || 0) * 5;
}
function renderNiveau(feter = true) {
  const xp = calculerXP();
  let n = 0; while (n + 1 < NIVEAUX.length && xp >= NIVEAUX[n + 1][0]) n++;
  const bas = NIVEAUX[n][0], haut = NIVEAUX[n + 1]?.[0] ?? bas + 200;
  $('#niveau-num').textContent = n + 1;
  $('#niveau-titre').textContent = NIVEAUX[n][1];
  $('#xp-barre').style.width = `${Math.min(100, ((xp - bas) / (haut - bas)) * 100)}%`;
  $('#niveau').dataset.xp = xp;
  if (feter && etat.niveauVu != null && n + 1 > etat.niveauVu) {
    confettis(); vibrer('fort'); toast(`🎉 Niveau ${n + 1} : ${NIVEAUX[n][1]} !`, 'or');
  }
  if (etat.niveauVu !== n + 1) { etat.niveauVu = n + 1; sauver(); }
}

// ── Navigation ──────────────────────────────────────────────────────────
function allerA(vue) {
  $$('.vue').forEach((v) => v.classList.toggle('active', v.id === `vue-${vue}`));
  $$('.onglet').forEach((o) => o.classList.toggle('active', o.dataset.vue === vue));
  document.body.dataset.vue = vue;
  scene?.setActif(vue === 'visuel');
  if (vue === 'conseils') renderConseils();
}

// ── Visuel 3D ───────────────────────────────────────────────────────────
function render3D() {
  if (!scene) return;
  scene.majPlantations(etat.plantations.map((p) => {
    const { plante, recolte, progres, cat } = infos(p);
    if (!plante) return null;
    return {
      id: p.id, bac: bacDe(p)?.id, x: p.x, y: p.y, emoji: plante.emoji, couleur: cat.couleur, progres,
      titre: `${plante.nom}${p.qte > 1 ? ` ×${p.qte}` : ''}`,
      sousTitre: `🌱 ${formatDate(p.date, { day: 'numeric', month: 'short' })}  →  ${plante.cat === 'fleur' ? '🌸' : '🧺'} ${recolte ? formatDate(recolte, { month: 'short', year: '2-digit' }) : '?'}`,
    };
  }).filter(Boolean));
  const n = etat.plantations.length;
  $('#info-compte').textContent = `🌱 ${n} plantation${n > 1 ? 's' : ''}`;
  const prochaines = etat.plantations.map((p) => ({ p, ...infos(p) })).filter((x) => x.plante && x.reste != null)
    .sort((a, b) => a.reste - b.reste);
  const prete = prochaines.find((x) => x.reste <= 0);
  const bientot = prochaines.find((x) => x.reste > 0);
  const info = $('#info-recolte');
  if (prete) { info.hidden = false; info.textContent = `${prete.plante.emoji} ${texteReste(prete.reste, prete.plante)}`; }
  else if (bientot) { info.hidden = false; info.textContent = `${bientot.plante.emoji} ${texteReste(bientot.reste, bientot.plante)}`; }
  else info.hidden = true;
}

function majAccueil() {
  $('#accueil').hidden = !!(aUnePhoto() || etat.plantations.length || etat.accueilVu);
}

// ── Photo et détourage (une photo par bac) ──────────────────────────────
function majJardin() {
  scene?.majJardin(etat.bacs.map((b) => ({ ...b, image: images[b.id]?.image || null, saison: b.type === 'arbre' ? saisonArbre(b) : null })),
    { taille: etat.tailleTerrain || 0, coupes: etat.coupes || [] });
}

async function appliquerPlan(id, blob) {
  if (images[id]?.url) URL.revokeObjectURL(images[id].url);
  delete images[id];
  if (blob) {
    const url = URL.createObjectURL(blob);
    try { images[id] = { url, image: await chargerImage(blob) }; } catch { URL.revokeObjectURL(url); }
  }
}
async function rafraichirJardin() { majJardin(); render3D(); renderPlan(); majAccueil(); renderNiveau(); }

const versBlob = (canvas) => new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.9));

function choisirPhoto(id) {
  photoPour = id; $('#fichier-photo').click();
}

async function detourer(id, nouvelle) {
  const b = bacParId(id);
  if (!b) return;
  if (!sources[id]) {
    const blob = await lire(cleOrig(id));
    if (!blob) { choisirPhoto(id); return; }
    sources[id] = await chargerImage(blob);
  }
  const res = await ouvrirDetourage(sources[id], { coins: nouvelle ? null : b.coins, largeur: b.largeur, longueur: b.longueur });
  if (!res) return;
  b.coins = res.coins; b.largeur = res.largeur; b.longueur = res.longueur; etat.accueilVu = true;
  await sauver();
  const blob = await versBlob(res.canvas);
  await ecrire(clePlan(id), blob);
  await appliquerPlan(id, blob);
  await rafraichirJardin();
  toast(`✨ ${b.nom} détouré ! Tourne autour avec le doigt.`, 'vert');
  allerA('visuel');
}

$('#fichier-photo').addEventListener('change', async (e) => {
  const f = e.target.files?.[0]; e.target.value = '';
  if (!f) return;
  let id = photoPour || bacActuel()?.id;
  if (!estCulture(bacParId(id))) id = bacsCultures()[0]?.id;
  if (!id) { const b = nouveauBac('bac'); etat.bacs.push(b); id = b.id; }
  etat.bacActif = id;
  try {
    sources[id] = await chargerImage(f);
    await ecrire(cleOrig(id), f);
    await detourer(id, true);
  } catch (err) {
    console.error(err); toast('😕 Impossible d\'ouvrir cette image.', 'rouge');
  }
});

// Après un changement de dimensions : refaire la photo redressée aux nouvelles proportions
async function redetourerSiBesoin(id) {
  const b = bacParId(id);
  if (b?.coins) {
    if (!sources[id]) { const o = await lire(cleOrig(id)); if (o) sources[id] = await chargerImage(o); }
    if (sources[id]) {
      const blob = await versBlob(redresserCanvas(sources[id], b.coins, b.largeur, b.longueur));
      await ecrire(clePlan(id), blob);
      await appliquerPlan(id, blob);
    }
  }
  await rafraichirJardin();
}

// ── Plan 2D (vu du dessus) ──────────────────────────────────────────────
function renderBacs() {
  const actif = bacActuel()?.id;
  $('#bacs').innerHTML = etat.bacs.map((b) => `<button class="puce bac-puce${b.id === actif ? ' active' : ''}" data-bac="${b.id}">
      <span class="pastille-couleur" style="background:${esc(b.couleur)}"></span>${emojiElement(b)} ${esc(b.nom)}</button>`).join('')
    + '<button class="puce ajout" data-act="nouvel-element">➕ Ajouter</button>';
}

function renderPlan() {
  renderBacs();
  const b = bacActuel();
  const autre = b && !estCulture(b);
  $('#carte-plan').hidden = !b || autre;
  $('#carte-enclos').hidden = !autre;
  if (!b) return;
  if (b.type === 'enclos') { renderEnclos(b); return; }
  if (b.type === 'arbre') { renderArbres(b); return; }
  const plan = $('#plan'), img = $('#plan-img');
  const photo = images[b.id];
  plan.style.aspectRatio = `${b.largeur} / ${b.longueur}`;
  plan.style.borderColor = b.type === 'terre' ? '#6a4228' : b.couleur;
  plan.classList.toggle('sans-photo', !photo);
  if (photo) { img.src = photo.url; img.hidden = false; } else { img.removeAttribute('src'); img.hidden = true; }
  $('#btn-detourer').disabled = !b.coins;
  $('#plan-titre').innerHTML = `<b>${TYPES_BAC[b.type].emoji} ${esc(b.nom)}</b><small>${esc(descBac(b))}</small>`;
  plan.classList.toggle('en-placement', !!placement);
  $('#plan-marqueurs').innerHTML = etat.plantations.filter((p) => p.x != null && bacDe(p)?.id === b.id).map((p) => {
    const { plante, cat, progres } = infos(p);
    if (!plante) return '';
    return `<button class="marqueur${p.id === placement ? ' choisi' : ''}" data-id="${p.id}" style="left:${p.x * 100}%;top:${p.y * 100}%;--c:${cat.couleur};--p:${progres}" aria-label="${esc(plante.nom)}">${plante.emoji}</button>`;
  }).join('');
}

function infosArbreHTML(b) {
  const a = ARBRES[b.espece] || ARBRES.pommier;
  if (!a.fruitier) return `<p class="conseil">💡 ${esc(a.conseil)}</p>`;
  const flo = ajusterMois(a.floraison, etat.zone, etat.hemisphere), re = ajusterMois(a.re, etat.zone, etat.hemisphere);
  const premiers = b.date ? versDate(b.date).getFullYear() + a.annees : null;
  return `<div class="stats">
      ${flo.length ? `<div class="stat"><span>🌸 Floraison</span><b>${plageMois(flo)}</b></div>` : ''}
      <div class="stat"><span>🧺 Récolte</span><b>${plageMois(re)}</b></div>
    </div>
    ${premiers ? `<p class="serre-info">${a.emoji} <b>Premiers fruits</b> vers ${premiers} (environ ${a.annees} an${a.annees > 1 ? 's' : ''} après la plantation), puis chaque année.</p>` : ''}
    <p class="conseil">💡 ${esc(a.conseil)}</p>`;
}

function renderArbres(b) {
  const a = ARBRES[b.espece] || ARBRES.pommier;
  const sa = saisonArbre(b);
  $('#carte-enclos').innerHTML = `
    <div class="fiche-tete" style="--c:${esc(a.feuillage)}">
      <div class="fiche-emoji">${a.emoji}</div>
      <div><span class="badge" style="background:#2e7d32">${a.fruitier ? 'Arbre fruitier' : 'Arbre'}</span><h2>${esc(b.nom)}</h2><small class="doux">${esc(descBac(b))}${b.date ? ` · planté le ${formatDate(b.date)}` : ''}</small></div>
    </div>
    ${sa ? `<p class="ok">${{ fleur: '🌸 En ce moment : il est en fleurs !', fruit: `${a.emoji} En ce moment : c'est la récolte !`, automne: '🍂 En ce moment : feuillage d\'automne.' }[sa]}</p>` : ''}
    ${infosArbreHTML(b)}
    <h3>📝 Planter un arbre, les étapes</h3>
    <ol class="etapes">${ETAPES_ARBRE.map((t) => `<li>${esc(t)}</li>`).join('')}</ol>
    <div class="rangee"><button class="btn btn-gris" data-act="editer-bac" data-bac="${b.id}">✏️ Modifier</button>
      <button class="btn btn-gris" data-act="couper-arbre" data-bac="${b.id}">🪓 Couper un arbre</button></div>`;
}

function renderEnclos(b) {
  const a = ANIMAUX[b.animal] || ANIMAUX.poule;
  const surface = b.largeur * b.longueur, besoin = a.m2 * b.nombre;
  const ok = surface >= besoin;
  $('#carte-enclos').innerHTML = `
    <div class="fiche-tete" style="--c:${esc(b.couleur)}">
      <div class="fiche-emoji">${a.emoji}</div>
      <div><span class="badge" style="background:#8a6cff">Enclos</span><h2>${esc(b.nom)}</h2><small class="doux">${esc(descBac(b))} · ${esc(MATERIAUX.enclos[b.materiau] || '')}</small></div>
    </div>
    <div class="troupeau">${Array.from({ length: Math.min(b.nombre, 24) }, () => `<span>${a.emoji}</span>`).join('')}${b.nombre > 24 ? `<b>+${b.nombre - 24}</b>` : ''}</div>
    <p class="${ok ? 'ok' : 'attention'}">${ok ? '✅' : '⚠️'} ${b.nombre} ${(b.nombre > 1 ? a.nom : a.un).toLowerCase()} : il faut environ ${Math.round(besoin)} m², ton enclos fait ${Math.round(surface * 10) / 10} m².</p>
    <p class="conseil">💡 ${esc(a.conseil)}</p>
    <h3>📝 Les étapes</h3>
    <ol class="etapes">${a.etapes.map((t) => `<li>${esc(t)}</li>`).join('')}</ol>
    <div class="rangee"><button class="btn btn-gris" data-act="editer-bac" data-bac="${b.id}">✏️ Modifier l'enclos</button></div>`;
}

let glisse = null;
$('#plan').addEventListener('pointerdown', (e) => {
  const m = e.target.closest('.marqueur');
  if (m && !placement) { glisse = { id: m.dataset.id, el: m, x: e.clientX, y: e.clientY, bouge: false }; m.setPointerCapture(e.pointerId); }
});
$('#plan').addEventListener('pointermove', (e) => {
  if (!glisse) return;
  if (Math.hypot(e.clientX - glisse.x, e.clientY - glisse.y) > 6) glisse.bouge = true;
  if (!glisse.bouge) return;
  const r = $('#plan').getBoundingClientRect();
  glisse.el.style.left = `${Math.min(100, Math.max(0, ((e.clientX - r.left) / r.width) * 100))}%`;
  glisse.el.style.top = `${Math.min(100, Math.max(0, ((e.clientY - r.top) / r.height) * 100))}%`;
});
$('#plan').addEventListener('pointerup', (e) => {
  const r = $('#plan').getBoundingClientRect();
  const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
  const y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
  if (glisse) {
    const g = glisse; glisse = null;
    if (g.bouge) {
      const p = etat.plantations.find((q) => q.id === g.id);
      if (p) { p.x = x; p.y = y; sauver(); render3D(); renderPlan(); }
    } else ficheplantation(g.id);
    return;
  }
  if (placement) {
    const p = etat.plantations.find((q) => q.id === placement);
    if (p) {
      p.x = x; p.y = y; sauver();
      toast(`📍 ${PLANTE_PAR_ID[p.plante].emoji} placé ! Regarde-le en 3D.`, 'vert');
    }
    finPlacement();
  }
});

function debutPlacement(id) {
  placement = id;
  const p = etat.plantations.find((q) => q.id === id);
  etat.bacActif = bacDe(p)?.id;
  $('#placement-texte').textContent = `👆 Touche le plan pour placer ${PLANTE_PAR_ID[p.plante].emoji} ${PLANTE_PAR_ID[p.plante].nom}`;
  $('#bandeau-placement').hidden = false;
  allerA('potager');
  renderPlan();
  $('#plan').scrollIntoView({ behavior: 'smooth', block: 'center' });
}
function finPlacement() {
  placement = null; $('#bandeau-placement').hidden = true;
  renderPlan(); render3D(); renderListe();
}

// ── Liste des plantations ───────────────────────────────────────────────
function renderFiltres() {
  const opts = [['tout', '🌈 Tout'], ...Object.entries(CATEGORIES).map(([k, c]) => [k, `${c.emoji} ${c.nom}`])];
  $('#filtres').innerHTML = opts.map(([k, t]) => `<button class="puce${filtre === k ? ' active' : ''}" data-filtre="${k}">${t}</button>`).join('');
}

function renderListe() {
  renderFiltres();
  const liste = etat.plantations.filter((p) => filtre === 'tout' || PLANTE_PAR_ID[p.plante]?.cat === filtre)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  if (!liste.length) {
    $('#liste-plantations').innerHTML = `<div class="vide"><div>🪴</div><p>${etat.plantations.length ? 'Rien dans cette catégorie.' : 'Aucune plantation pour l\'instant.<br>Ajoute ta première plante !'}</p></div>`;
    return;
  }
  $('#liste-plantations').innerHTML = liste.map((p) => {
    const { plante, recolte, progres, reste, cat } = infos(p);
    if (!plante) return '';
    return `<button class="ligne" data-id="${p.id}" style="--c:${cat.couleur}">
      <span class="ligne-emoji">${plante.emoji}</span>
      <span class="ligne-corps">
        <b>${esc(plante.nom)}${p.qte > 1 ? ` <small>×${p.qte}</small>` : ''}</b>
        ${bacsCultures().length > 1 ? `<span class="ligne-bac">${TYPES_BAC[bacDe(p)?.type]?.emoji || ''} ${esc(bacDe(p)?.nom || '')}</span>` : ''}
        <span class="ligne-dates">🌱 ${formatDate(p.date)} · ${plante.cat === 'fleur' ? '🌸' : '🧺'} ${recolte ? formatDate(recolte, { month: 'long', year: 'numeric' }) : '?'}</span>
        <span class="jauge"><span style="width:${Math.round(progres * 100)}%"></span></span>
        <span class="ligne-reste">${texteReste(reste, plante)}${p.x == null ? ' · <i>pas encore placé</i>' : ''}</span>
      </span></button>`;
  }).join('');
}

// ── Feuille (panneau qui monte du bas) ──────────────────────────────────
function ouvrirFeuille(html, garderGestes = false) {
  const f = $('#feuille');
  if (!garderGestes) { f.onclick = null; f.oninput = null; f.onchange = null; }
  f.innerHTML = `<div class="feuille-poignee"></div><button class="fermer" data-act="fermer" aria-label="Fermer">✕</button>${html}`;
  f.hidden = false; $('#voile').hidden = false;
  requestAnimationFrame(() => { f.classList.add('ouverte'); $('#voile').classList.add('visible'); });
  f.scrollTop = 0;
}
function fermerFeuille() {
  const f = $('#feuille');
  f.classList.remove('ouverte'); $('#voile').classList.remove('visible');
  setTimeout(() => { if (!f.classList.contains('ouverte')) { f.hidden = true; $('#voile').hidden = true; } }, 250);
}

function calendrierHTML(plante, abri = null) {
  const cal = calendrier(plante, etat.zone, etat.hemisphere, abri);
  const m = auj().getMonth() + 1;
  const lignes = Object.entries(ACTIONS).filter(([k]) => plante[k].length)
    .map(([k, a]) => `<div class="cal-ligne"><span class="cal-nom">${a.emoji} ${k === 're' ? nomRecolte(plante) : a.court}</span>${
      MOIS_COURT.map((_, i) => `<span class="cal-case ${cal[k].includes(i + 1) ? `on ${k}` : ''}${i + 1 === m ? ' maintenant' : ''}"></span>`).join('')}</div>`).join('');
  return `<div class="calendrier"><div class="cal-ligne entete-cal"><span class="cal-nom"></span>${MOIS_COURT.map((x, i) => `<span class="${i + 1 === m ? 'maintenant' : ''}">${x[0].toUpperCase()}</span>`).join('')}</div>${lignes}</div>`;
}

function infosPlanteHTML(plante) {
  const amis = (plante.amis || []).map((id) => PLANTE_PAR_ID[id]).filter(Boolean);
  return `
    ${etapesHTML(plante)}
    <h3>ℹ️ Bon à savoir</h3>
    <div class="puces-infos">
      <span>☀️ ${esc(plante.expo)}</span><span>📏 ${plante.esp} cm</span><span>💧 ${esc(plante.eau)}</span>
      ${plante.gel ? '<span class="froid">🥶 Craint le gel</span>' : ''}${plante.vivace ? '<span>♻️ Vivace</span>' : ''}
    </div>
    <p class="conseil">💡 ${esc(plante.conseil)}</p>
    ${etat.zone === 'tropical' && plante.frais ? '<p class="conseil">🌴 En climat tropical, cultivez-la en saison fraîche et sèche ou en altitude.</p>' : ''}
    ${amis.length ? `<p class="amis">🤝 Bons voisins : ${amis.map((a) => `<button class="puce mini" data-plante="${a.id}">${a.emoji} ${esc(a.nom)}</button>`).join(' ')}</p>` : ''}
`;
}

// Étapes numérotées + lien vers la fiche complète + partage (comme les fiches de Boost Étudiant)
function etapesHTML(plante) {
  const e = ETAPES[plante.id];
  if (!e) return '';
  return `
    <h3>📝 Les étapes</h3>
    <ol class="etapes">${e.etapes.map((t) => `<li>${esc(t)}</li>`).join('')}</ol>
    <div class="rangee liens-fiche">
      <a class="btn btn-bleu" href="${esc(lienWiki(e.wiki))}" target="_blank" rel="noopener noreferrer">📖 En savoir + ↗</a>
      <button class="btn btn-gris" data-act="partager-plante" data-id="${plante.id}">📤 Partager</button>
    </div>`;
}

function ficheplantation(id) {
  const p = etat.plantations.find((q) => q.id === id);
  if (!p) return;
  const { plante, recolte, progres, reste, cat } = infos(p);
  ouvrirFeuille(`
    <div class="fiche-tete" style="--c:${cat.couleur}">
      <div class="fiche-emoji">${plante.emoji}</div>
      <div><span class="badge" style="background:${cat.couleur}">${cat.un}</span>
      <h2>${esc(plante.nom)}${p.qte > 1 ? ` ×${p.qte}` : ''}</h2></div>
    </div>
    <div class="stats">
      <div class="stat"><span>${TYPES_BAC[bacDe(p)?.type]?.emoji || '🪴'} Où</span><b>${esc(bacDe(p)?.nom || '')}</b></div>
      <div class="stat"><span>🌱 Planté le</span><b>${formatDate(p.date)}</b></div>
      <div class="stat"><span>${plante.cat === 'fleur' ? '🌸 Floraison' : '🧺 Récolte'} vers</span><b>${recolte ? formatDate(recolte, { day: 'numeric', month: 'long', year: 'numeric' }) : '?'}</b></div>
    </div>
    <div class="jauge grosse"><span style="width:${Math.round(progres * 100)}%"></span><em>${Math.round(progres * 100)} %</em></div>
    <p class="reste">${texteReste(reste, plante)}</p>
    ${p.note ? `<p class="note">📝 ${esc(p.note)}</p>` : ''}
    ${infosPlanteHTML(plante)}
    <h3>📅 Calendrier dans ta région${abriDe(p) ? ' · en serre 🏡' : ''}</h3>
    ${calendrierHTML(plante, abriDe(p))}
    <div class="rangee actions">
      <button class="btn btn-gris" data-act="modifier" data-id="${p.id}">✏️ Modifier</button>
      <button class="btn btn-gris" data-act="deplacer" data-id="${p.id}">📍 ${p.x == null ? 'Placer' : 'Déplacer'}</button>
      <button class="btn btn-rouge" data-act="supprimer" data-id="${p.id}">🗑️</button>
    </div>`);
}

function fichePlante(id) {
  const plante = PLANTE_PAR_ID[id];
  if (!plante) return;
  const cat = CATEGORIES[plante.cat];
  const cal = calendrier(plante, etat.zone, etat.hemisphere);
  const enTerre = [...new Set([...cal.sa, ...cal.st, ...cal.pl])].sort((a, b) => a - b);
  ouvrirFeuille(`
    <div class="fiche-tete" style="--c:${cat.couleur}">
      <div class="fiche-emoji">${plante.emoji}</div>
      <div><span class="badge" style="background:${cat.couleur}">${cat.un}</span><h2>${esc(plante.nom)}</h2></div>
    </div>
    <div class="stats">
      <div class="stat"><span>🪴 Mise en terre</span><b>${plageMois(enTerre)}</b></div>
      <div class="stat"><span>${plante.cat === 'fleur' ? '🌸 Floraison' : '🧺 Récolte'}</span><b>${plageMois(cal.re)}</b></div>
    </div>
    ${(() => {
    const cs = calendrier(plante, etat.zone, etat.hemisphere, 'serre');
    const t = [...new Set([...cs.sa, ...cs.st, ...cs.pl])].sort((a, b) => a - b);
    return `<p class="serre-info">🏡 <b>En serre :</b> mise en terre ${plageMois(t)}, ${nomRecolte(plante).toLowerCase()} ${plageMois(cs.re)}.</p>`;
  })()}
    ${infosPlanteHTML(plante)}
    <h3>📅 Calendrier · ${ZONES[etat.zone].emoji} ${ZONES[etat.zone].nom}</h3>
    ${calendrierHTML(plante)}
    <button class="btn btn-vert gros large" data-act="planter" data-plante="${plante.id}">➕ Je l'ajoute à mon potager</button>`);
}

function formulaire(existant, planteInitiale) {
  const defaut = bacActuel()?.type !== 'enclos' ? bacActuel()?.id : bacsCultures()[0]?.id;
  const p = existant || { plante: planteInitiale || '', date: versISO(auj()), qte: 1, note: '', bac: defaut };
  let choix = p.plante;
  let bacChoisi = bacDe(p)?.id || defaut;
  let catF = choix ? PLANTE_PAR_ID[choix]?.cat : 'tout';
  ouvrirFeuille(`
    <h2>${existant ? '✏️ Modifier' : '➕ Nouvelle plantation'}</h2>
    <input class="recherche" id="f-recherche" placeholder="🔍 Chercher une plante…" autocomplete="off">
    <div class="filtres" id="f-cats"></div>
    <div class="grille-plantes" id="f-grille"></div>
    ${bacsCultures().length > 1 ? `<label class="champ">📍 Où ?</label><div class="filtres" id="f-bacs"></div>` : ''}
    <div id="f-saison"></div>
    <div class="rangee">
      <label class="champ">📆 Date de plantation <input type="date" id="f-date" value="${p.date}" required></label>
      <label class="champ petit">🔢 Nombre <input type="number" id="f-qte" min="1" max="999" value="${p.qte || 1}"></label>
    </div>
    <label class="champ">📝 Note (variété, emplacement…) <input id="f-note" maxlength="120" value="${esc(p.note)}"></label>
    <button class="btn btn-vert gros large" data-act="enregistrer">${existant ? '💾 Enregistrer' : '🌱 Planter !'}</button>`);

  const grille = () => {
    const q = $('#f-recherche').value.trim().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
    $('#f-cats').innerHTML = [['tout', '🌈 Tout'], ...Object.entries(CATEGORIES).map(([k, c]) => [k, `${c.emoji} ${c.nom}`])]
      .map(([k, t]) => `<button class="puce${catF === k ? ' active' : ''}" data-fcat="${k}">${t}</button>`).join('');
    const mois = auj().getMonth() + 1;
    const abri = bacParId(bacChoisi)?.type === 'serre' ? 'serre' : null;
    if ($('#f-bacs')) $('#f-bacs').innerHTML = bacsCultures().map((b) => `<button class="puce${b.id === bacChoisi ? ' active' : ''}" data-fbac="${b.id}">${TYPES_BAC[b.type].emoji} ${esc(b.nom)}</button>`).join('');
    $('#f-grille').innerHTML = PLANTES.filter((x) => (catF === 'tout' || x.cat === catF) &&
      (!q || x.nom.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').includes(q)))
      .map((x) => `<button class="choix-plante${x.id === choix ? ' choisi' : ''}" data-choix="${x.id}" style="--c:${CATEGORIES[x.cat].couleur}">
        <span>${x.emoji}</span>${esc(x.nom)}${bonnePeriode(x.id, mois, etat.zone, etat.hemisphere, abri) ? '<i title="C\'est la saison">✓</i>' : ''}</button>`).join('')
      || '<p class="vide-petit">Aucune plante trouvée.</p>';
    majSaison();
  };
  const majSaison = () => {
    const el = $('#f-saison');
    if (!choix) { el.innerHTML = ''; return; }
    const d = $('#f-date').value ? versDate($('#f-date').value) : auj();
    const m = d.getMonth() + 1;
    const plante = PLANTE_PAR_ID[choix];
    const abri = bacParId(bacChoisi)?.type === 'serre' ? 'serre' : null;
    const cal = calendrier(plante, etat.zone, etat.hemisphere, abri);
    const enTerre = [...new Set([...cal.sa, ...cal.st, ...cal.pl])].sort((a, b) => a - b);
    const ou = abri ? 'en serre' : 'chez toi';
    el.innerHTML = enTerre.includes(m)
      ? `<p class="ok">✅ Bonne période pour ${esc(plante.nom.toLowerCase())} en ${MOIS[m - 1]} ${ou} !</p>`
      : `<p class="attention">⚠️ ${abri ? 'En serre' : 'Chez toi'}, ${esc(plante.nom.toLowerCase())} se met plutôt en terre en ${plageMois(enTerre)}.</p>`;
  };
  grille();
  const f = $('#feuille');
  f.oninput = (e) => { if (e.target.id === 'f-recherche') grille(); if (e.target.id === 'f-date') majSaison(); };
  f.onclick = (e) => {
    const c = e.target.closest('[data-choix]'); if (c) { choix = c.dataset.choix; grille(); return; }
    const fc = e.target.closest('[data-fcat]'); if (fc) { catF = fc.dataset.fcat; grille(); return; }
    const fb = e.target.closest('[data-fbac]'); if (fb) { bacChoisi = fb.dataset.fbac; grille(); return; }
    if (e.target.closest('[data-act="enregistrer"]')) {
      const date = $('#f-date').value;
      if (!choix) { toast('👆 Choisis d\'abord une plante', 'rouge'); return; }
      if (!date) { toast('📆 Indique la date de plantation', 'rouge'); return; }
      const qte = Math.max(1, Math.min(999, Number($('#f-qte').value) || 1));
      const note = $('#f-note').value.trim();
      f.onclick = null; f.oninput = null;
      if (existant) {
        if (existant.bac !== bacChoisi) { existant.x = null; existant.y = null; }
        Object.assign(existant, { plante: choix, date, qte, note, bac: bacChoisi });
        sauver(); fermerFeuille(); toutRafraichir(); toast('💾 Modifié !', 'vert');
      } else {
        if (!bacChoisi) { const nb = nouveauBac('bac'); etat.bacs.push(nb); bacChoisi = nb.id; majJardin(); }
        const nouvelle = { id: uid(), plante: choix, date, qte, note, bac: bacChoisi, x: null, y: null };
        etat.plantations.push(nouvelle); etat.accueilVu = true;
        sauver(); fermerFeuille(); toutRafraichir();
        toast(`${PLANTE_PAR_ID[choix].emoji} +10 XP ! Place-la sur ton plan`, 'or');
        vibrer('moyen');
        debutPlacement(nouvelle.id);
      }
    }
  };
}

$('#feuille').addEventListener('click', (e) => {
  e.stopPropagation(); // le contenu de la feuille peut être remplacé pendant le clic
  const b = e.target.closest('[data-act], [data-plante]');
  if (!b) return;
  const act = b.dataset.act, id = b.dataset.id;
  if (act === 'fermer') { $('#feuille').onclick = null; $('#feuille').oninput = null; $('#feuille').onchange = null; fermerFeuille(); return; }
  if (act === 'modifier') { formulaire(etat.plantations.find((p) => p.id === id)); return; }
  if (act === 'deplacer') { fermerFeuille(); debutPlacement(id); return; }
  if (act === 'supprimer') {
    const p = etat.plantations.find((q) => q.id === id);
    if (!p) return;
    demander(`Supprimer ${PLANTE_PAR_ID[p.plante].emoji} ${PLANTE_PAR_ID[p.plante].nom} de ton potager ?`, '🗑️ Supprimer').then((ok) => {
      if (!ok) return;
      etat.plantations = etat.plantations.filter((q) => q.id !== id);
      sauver(); fermerFeuille(); toutRafraichir(); toast('🗑️ Supprimé');
    });
    return;
  }
  if (act === 'planter') { formulaire(null, b.dataset.plante); return; }
  if (act === 'partager-plante') {
    const plante = PLANTE_PAR_ID[id], e = ETAPES[id];
    const cal = calendrier(plante, etat.zone, etat.hemisphere);
    const enTerre = [...new Set([...cal.sa, ...cal.st, ...cal.pl])].sort((x, y) => x - y);
    const texte = `${plante.emoji} ${plante.nom} : à mettre en terre en ${plageMois(enTerre)}, ${nomRecolte(plante).toLowerCase()} en ${plageMois(cal.re)}.\n`
      + e.etapes.map((t, i) => `${i + 1}. ${t}`).join('\n') + '\n— Mon Potager 🌻';
    partagerTexte(`${plante.emoji} ${plante.nom}`, texte, lienWiki(e.wiki)).then((copie) => { if (copie) toast('📋 Copié, colle-le à qui tu veux !', 'vert'); });
    return;
  }
  if (b.dataset.plante && !$('#feuille').onclick) fichePlante(b.dataset.plante);
});
$('#voile').addEventListener('click', () => { $('#feuille').onclick = null; $('#feuille').oninput = null; $('#feuille').onchange = null; fermerFeuille(); });

// ── Conseils : lieu, météo et calendrier du mois ────────────────────────
function renderLieu() {
  const z = ZONES[etat.zone];
  $('#carte-lieu').innerHTML = `
    <div class="lieu-tete">
      <div class="lieu-emoji">${z.emoji}</div>
      <div><small>Ton climat</small><b>${z.nom}</b>
        <span class="lieu-nom">📍 ${etat.lieu ? esc(etat.lieu.nom) : 'Lieu non défini'}${etat.hemisphere === 'sud' ? ' · hémisphère sud' : ''}</span></div>
    </div>
    <p class="lieu-desc">${z.desc}</p>
    <div class="rangee">
      <button class="btn btn-bleu" data-act="localiser">📍 Me localiser</button>
      <button class="btn btn-gris" data-act="changer-lieu">🔍 Ville / climat</button>
    </div>`;
}

function codeMeteo(c) {
  if (c === 0) return '☀️'; if (c <= 2) return '🌤️'; if (c === 3) return '☁️'; if (c <= 48) return '🌫️';
  if (c <= 57) return '🌦️'; if (c <= 67) return '🌧️'; if (c <= 77) return '🌨️'; if (c <= 82) return '🌧️';
  if (c <= 86) return '🌨️'; return '⛈️';
}

async function chargerMeteo() {
  if (!etat.lieu) { $('#carte-meteo').hidden = true; return; }
  try {
    const { lat, lon } = etat.lieu;
    const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto&forecast_days=7`);
    if (!r.ok) throw new Error(r.status);
    meteo = (await r.json()).daily;
    renderMeteo();
  } catch { $('#carte-meteo').hidden = true; }
}

function renderMeteo() {
  if (!meteo) return;
  const el = $('#carte-meteo');
  const jours = meteo.time.map((t, i) => ({ t, code: meteo.weather_code[i], max: Math.round(meteo.temperature_2m_max[i]), min: Math.round(meteo.temperature_2m_min[i]), pluie: meteo.precipitation_sum[i] }));
  const gel = jours.find((j) => j.min <= 1);
  const fragiles = plantesGelives(etat.plantations, etat.bacs);
  const pluie = jours.slice(0, 3).reduce((s, j) => s + (j.pluie || 0), 0);
  let alerte = '';
  if (gel) alerte = `<p class="alerte froid">🥶 Risque de gel ${formatDate(gel.t, { weekday: 'long' })} (${gel.min} °C).${fragiles.length ? ` Protège : ${fragiles.map((p) => p.emoji).join(' ')}` : ' Attends avant de planter les plantes frileuses.'}</p>`;
  else if (jours.some((j) => j.max >= 30)) alerte = '<p class="alerte chaud">🔥 Fortes chaleurs : arrose le soir et paille bien le sol.</p>';
  else if (pluie < 1 && etat.plantations.length) alerte = '<p class="alerte">💧 Pas de pluie prévue ces 3 jours : pense à arroser.</p>';
  else if (pluie >= 10) alerte = '<p class="alerte bleu">🌧️ Il va bien pleuvoir : pas besoin d\'arroser.</p>';
  el.innerHTML = `<h3>🌦️ Météo de la semaine</h3><div class="jours">${jours.map((j) => `
    <div class="jour${j.min <= 1 ? ' gel' : ''}"><small>${formatDate(j.t, { weekday: 'short' }).replace('.', '')}</small><span>${codeMeteo(j.code)}</span><b>${j.max}°</b><small>${j.min}°</small></div>`).join('')}</div>${alerte}`;
  el.hidden = false;
}

function renderConseils() {
  renderLieu();
  const s = saison(moisAffiche, etat.hemisphere);
  const estMaintenant = moisAffiche === auj().getMonth() + 1;
  $('#mois-nom').textContent = MOIS[moisAffiche - 1][0].toUpperCase() + MOIS[moisAffiche - 1].slice(1);
  $('#mois-saison').textContent = `${s.emoji} ${s.nom}${estMaintenant ? ' · ce mois-ci' : ''}`;
  document.body.dataset.saison = s.nom.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  $('#travaux').innerHTML = travauxDuMois(moisAffiche, etat.zone, etat.hemisphere).map((t) => `<li>${esc(t)}</li>`).join('');
  $('#conseil-abri').innerHTML = [[null, '🌳 Dehors'], ['serre', '🏡 En serre']]
    .map(([k, t]) => `<button class="puce${conseilAbri === k ? ' active' : ''}" data-abri="${k || ''}">${t}</button>`).join('');
  const r = recommandations(moisAffiche, etat.zone, etat.hemisphere, undefined, conseilAbri);
  const titres = { sa: '🏠 À semer à l\'abri (intérieur, serre)', st: '🌱 À semer en pleine terre', pl: '🪴 À planter / repiquer', re: '🧺 À récolter · en fleur' };
  $('#recos').innerHTML = Object.keys(titres).map((k) => `
    <div class="carte reco reco-${k}"><h3>${titres[k]} <span class="compte">${r[k].length}</span></h3>
      ${r[k].length ? `<div class="puces-plantes">${r[k].map((p) => `<button class="puce-plante" data-plante="${p.id}" style="--c:${CATEGORIES[p.cat].couleur}"><span>${p.emoji}</span>${esc(p.nom)}</button>`).join('')}</div>` : '<p class="vide-petit">Rien ce mois-ci 😴</p>'}
    </div>`).join('');
}

async function appliquerPosition(lat, lon, nom, altitude) {
  if (altitude == null) {
    try {
      const r = await fetch(`https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lon}`);
      altitude = (await r.json()).elevation?.[0] ?? 0;
    } catch { altitude = 0; }
  }
  const { zone, hemisphere } = detecterZone(lat, lon, altitude);
  etat.lieu = { nom, lat: Math.round(lat * 1000) / 1000, lon: Math.round(lon * 1000) / 1000, altitude: Math.round(altitude) };
  etat.zone = zone; etat.hemisphere = hemisphere; etat.zoneAuto = true;
  await sauver();
  toast(`${ZONES[zone].emoji} Climat ${ZONES[zone].nom.toLowerCase()} détecté !`, 'vert');
  toutRafraichir(); chargerMeteo();
}

async function localiser() {
  toast('📍 Recherche de ta position…');
  try {
    const { lat, lon, altitude } = await obtenirPosition();
    await appliquerPosition(lat, lon, 'Ma position', altitude);
  } catch {
    toast('😕 Position indisponible : cherche ta ville à la place.', 'rouge'); choisirLieu();
  }
}

function choisirLieu() {
  ouvrirFeuille(`
    <h2>📍 Où est ton potager ?</h2>
    <input class="recherche" id="l-ville" placeholder="🔍 Nom de ta ville (ex : Lyon)" autocomplete="off">
    <div id="l-resultats" class="resultats"></div>
    <h3>…ou choisis ton climat</h3>
    <div class="zones">${Object.entries(ZONES).map(([k, z]) => `<button class="zone${etat.zone === k ? ' choisi' : ''}" data-zone="${k}"><span>${z.emoji}</span><b>${z.nom}</b></button>`).join('')}</div>
    <div class="filtres">
      <button class="puce${etat.hemisphere === 'nord' ? ' active' : ''}" data-hemi="nord">🌍 Hémisphère nord</button>
      <button class="puce${etat.hemisphere === 'sud' ? ' active' : ''}" data-hemi="sud">🌏 Hémisphère sud</button>
    </div>`);
  const f = $('#feuille');
  let minuterie = 0, resultats = [];
  f.oninput = (e) => {
    if (e.target.id !== 'l-ville') return;
    clearTimeout(minuterie);
    const q = e.target.value.trim();
    if (q.length < 2) { $('#l-resultats').innerHTML = ''; return; }
    minuterie = setTimeout(async () => {
      try {
        const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=fr&format=json`);
        resultats = (await r.json()).results || [];
        $('#l-resultats').innerHTML = resultats.map((v, i) => `<button class="resultat" data-res="${i}">📍 <b>${esc(v.name)}</b> <small>${esc([v.admin1, v.country].filter(Boolean).join(', '))}</small></button>`).join('')
          || '<p class="vide-petit">Aucune ville trouvée.</p>';
      } catch { $('#l-resultats').innerHTML = '<p class="vide-petit">📡 Pas de connexion : choisis ton climat ci-dessous.</p>'; }
    }, 350);
  };
  f.onclick = (e) => {
    if (e.target.closest('[data-act="fermer"]')) return;
    const res = e.target.closest('[data-res]');
    if (res) { const v = resultats[Number(res.dataset.res)]; f.onclick = null; f.oninput = null; fermerFeuille(); appliquerPosition(v.latitude, v.longitude, v.name, v.elevation ?? null); return; }
    const z = e.target.closest('[data-zone]');
    if (z) { etat.zone = z.dataset.zone; etat.zoneAuto = false; sauver(); f.onclick = null; f.oninput = null; fermerFeuille(); toutRafraichir(); toast(`${ZONES[etat.zone].emoji} Climat : ${ZONES[etat.zone].nom}`, 'vert'); return; }
    const h = e.target.closest('[data-hemi]');
    if (h) { etat.hemisphere = h.dataset.hemi; sauver(); $$('[data-hemi]').forEach((b) => b.classList.toggle('active', b === h)); toutRafraichir(); }
  };
}

// ── Réglages ────────────────────────────────────────────────────────────
function renderReglages() {
  $('#r-nom').value = etat.nom;
  $('#r-terrain').innerHTML = terrainHTML('rt'); brancherTerrain('rt');
  $('#nom-potager').textContent = etat.nom || 'Mon potager';
  $('#r-notifs').checked = etat.notifs !== false;
  $('#ligne-notifs').hidden = !NATIF;
}
$('#r-notifs').addEventListener('change', (e) => {
  etat.notifs = e.target.checked; sauver(); programmerRappels();
  toast(etat.notifs ? '🔔 Je te préviens quand une récolte est prête' : '🔕 Rappels de récolte coupés');
});
$('#r-nom').addEventListener('change', (e) => { etat.nom = e.target.value.trim() || 'Mon potager'; sauver(); renderReglages(); });

// ── Éditeur de bac / serre / enclos ─────────────────────────────────────
function ouvrirEditeur(id, type = 'bac', base = {}) {
  const existant = id ? bacParId(id) : null;
  const b = existant ? { ...existant } : nouveauBac(type, base);
  const borner = (v, min, max, def) => Math.min(max, Math.max(min, Number(String(v).replace(',', '.')) || def));
  const limitesH = { bac: [0.1, 1.2], serre: [1.5, 3.5], enclos: [0.4, 2], terre: [0, 0], arbre: [1, 30] };
  const nomH = { bac: 'Hauteur du bac', serre: 'Hauteur de la serre', enclos: 'Hauteur de la clôture', terre: '', arbre: 'Hauteur de l\'arbre' };

  const placeHTML = () => {
    const a = ANIMAUX[b.animal] || ANIMAUX.poule, surface = b.largeur * b.longueur, ok = surface >= a.m2 * b.nombre;
    return `<p class="${ok ? 'ok' : 'attention'}">${ok ? '✅' : '⚠️'} Place conseillée : ${a.m2} m² par ${a.un.toLowerCase()}, soit ${Math.round(a.m2 * b.nombre)} m² (ton enclos : ${Math.round(surface * 10) / 10} m²).</p>`;
  };
  const dessiner = () => {
    const mats = MATERIAUX[b.type];
    if (!mats[b.materiau]) { b.materiau = Object.keys(mats)[0]; b.couleur = COULEUR_DEFAUT[b.materiau]; }
    const [hmin, hmax] = limitesH[b.type];
    const a = ANIMAUX[b.animal] || ANIMAUX.poule;
    const defile = $('#feuille').scrollTop;
    ouvrirFeuille(`
      <h2>${existant ? '✏️ Modifier' : '➕ Ajouter'} ${{ enclos: 'un enclos', serre: 'une serre', arbre: 'des arbres' }[b.type] || 'un bac'}</h2>
      <div class="types-bac">${Object.entries(TYPES_BAC).map(([k, t]) => `
        <button class="type-bac${b.type === k ? ' choisi' : ''}" data-type="${k}"><span>${t.emoji}</span>${t.nom}</button>`).join('')}</div>
      <p class="doux petit-texte">${TYPES_BAC[b.type].desc}</p>
      <label class="champ">🏷️ Nom <input id="e-nom" maxlength="30" value="${esc(b.nom)}"></label>
      ${b.type === 'arbre' ? `
        <h3>🌳 Quel arbre ?</h3>
        <p class="doux petit-texte">Fruitiers</p>
        <div class="grille-animaux">${Object.entries(ARBRES).filter(([, x]) => x.fruitier).map(([k, x]) => `
          <button class="choix-animal${b.espece === k ? ' choisi' : ''}" data-espece="${k}"><span>${x.emoji}</span>${x.nom}</button>`).join('')}</div>
        <p class="doux petit-texte">Pour l'ombre, la haie, la déco</p>
        <div class="grille-animaux">${Object.entries(ARBRES).filter(([, x]) => !x.fruitier).map(([k, x]) => `
          <button class="choix-animal${b.espece === k ? ' choisi' : ''}" data-espece="${k}"><span>${x.emoji}</span>${x.nom}</button>`).join('')}</div>
        <div class="rangee dims-bac">
          <label class="champ">🔢 Combien ? <input id="e-nombre" type="number" min="1" max="60" value="${b.nombre}"></label>
          <label class="champ">⬆️ ${nomH.arbre} (m) <input id="e-hauteur" type="number" inputmode="decimal" min="1" max="30" step="0.5" value="${b.hauteur}"></label>
        </div>
        <label class="champ">📆 Date de plantation <input id="e-date" type="date" value="${esc(b.date || '')}"></label>
        <p class="doux petit-texte" id="e-place-arbre">📏 Place occupée : ${(() => { const d = dimsVerger(b.espece, b.nombre); return `${fmtM(d.largeur)} × ${fmtM(d.longueur)}`; })()} (un arbre tous les ${ARBRES[b.espece].esp} m)</p>
        ${infosArbreHTML(b)}` : `
      <h3>📏 Dimensions</h3>
      <div class="rangee dims-bac">
        <label class="champ">↔️ Largeur (m) <input id="e-largeur" type="number" inputmode="decimal" min="0.3" max="100" step="0.1" value="${b.largeur}"></label>
        <label class="champ">↕️ Longueur (m) <input id="e-longueur" type="number" inputmode="decimal" min="0.3" max="100" step="0.1" value="${b.longueur}"></label>
        ${b.type !== 'terre' ? `<label class="champ">⬆️ ${nomH[b.type]} (m) <input id="e-hauteur" type="number" inputmode="decimal" min="${hmin}" max="${hmax}" step="0.05" value="${b.hauteur}"></label>` : ''}
      </div>`}
      ${b.type === 'enclos' ? `
        <h3>🐾 Les animaux</h3>
        <div class="grille-animaux">${Object.entries(ANIMAUX).map(([k, x]) => `
          <button class="choix-animal${b.animal === k ? ' choisi' : ''}" data-animal="${k}"><span>${x.emoji}</span>${x.nom}</button>`).join('')}</div>
        <div class="rangee">
          <label class="champ">🔢 ${b.animal === 'abeille' ? 'Nombre de ruches' : 'Combien ?'} <input id="e-nombre" type="number" min="1" max="30" value="${b.nombre}"></label>
          ${b.animal !== 'abeille' ? `<label class="interrupteur cabane"><input type="checkbox" id="e-cabane"${b.cabane !== false ? ' checked' : ''}><span></span>🏠 ${a.abri}</label>` : ''}
        </div>
        <div id="e-place">${placeHTML()}</div>` : ''}
      ${b.type !== 'arbre' ? `<h3>🧱 ${b.type === 'enclos' ? 'Clôture' : b.type === 'serre' ? 'Parois' : 'Matériau'}</h3>
      <div class="filtres enveloppe">${Object.entries(mats).map(([k, t]) => `<button class="puce${b.materiau === k ? ' active' : ''}" data-mat="${k}">${t}</button>`).join('')}</div>` : ''}
      ${b.materiau !== 'aucun' ? `
      <h3>🎨 Couleur ${b.type === 'serre' ? 'de l\'armature' : ''}</h3>
      <div class="nuancier">${COULEURS_BAC.map((c) => `<button class="nuance${b.couleur === c ? ' choisi' : ''}" data-couleur="${c}" style="background:${c}" aria-label="Couleur ${c}"></button>`).join('')}
        <label class="nuance autre" title="Autre couleur"><input type="color" id="e-couleur" value="${esc(b.couleur)}">🎨</label></div>` : ''}
      <h3>🌍 Endroit dans le monde</h3>
      <div class="lieu-mini">
        <span>${ZONES[etat.zone].emoji} <b>${ZONES[etat.zone].nom}</b><br><small>📍 ${etat.lieu ? esc(etat.lieu.nom) : 'Lieu non défini'}${etat.hemisphere === 'sud' ? ' · hémisphère sud' : ''}</small></span>
        <button class="btn btn-mini" data-act="lieu-depuis-editeur">Changer</button>
      </div>
      ${estCulture(b) && existant ? `<div class="rangee"><button class="btn btn-gris" data-act="photo-bac">📷 Photo de ce ${b.type === 'serre' ? 'la serre' : 'bac'}</button></div>` : ''}
      ${!existant && coutBois(b) ? `<p class="${(etat.bois || 0) >= coutBois(b) ? 'ok' : 'serre-info'}" id="e-bois">🪵 Il faut ${coutBois(b)} bûches de bois. Tu en as ${etat.bois || 0}${(etat.bois || 0) >= coutBois(b) ? ' : elles seront utilisées !' : (etat.bois ? ', elles seront utilisées et le reste acheté.' : '. Coupe des arbres pour en récolter !')}</p>` : ''}
      <button class="btn btn-vert gros large" data-act="enregistrer-bac">${existant ? '💾 Enregistrer' : '✨ Créer'}</button>
      ${existant && etat.bacs.length > 1 ? '<button class="btn btn-rouge large" data-act="supprimer-bac">🗑️ Supprimer</button>' : ''}`, true);
    $('#feuille').scrollTop = defile;
  };

  const lireChamps = () => {
    const v = (sel) => $(sel)?.value;
    if ($('#e-nom')) b.nom = v('#e-nom').trim() || b.nom;
    if ($('#e-largeur')) b.largeur = borner(v('#e-largeur'), 0.3, 100, b.largeur);
    if ($('#e-longueur')) b.longueur = borner(v('#e-longueur'), 0.3, 100, b.longueur);
    if ($('#e-hauteur')) { const [mn, mx] = limitesH[b.type]; b.hauteur = borner(v('#e-hauteur'), mn, mx, b.hauteur); }
    if ($('#e-nombre')) b.nombre = Math.round(borner(v('#e-nombre'), 1, b.type === 'arbre' ? 60 : 30, b.nombre));
    if ($('#e-date')) b.date = v('#e-date') || null;
    if (b.type === 'arbre') Object.assign(b, dimsVerger(b.espece, b.nombre));
    if ($('#e-cabane')) b.cabane = $('#e-cabane').checked;
  };

  dessiner();
  const f = $('#feuille');
  f.oninput = (e) => {
    if (e.target.id === 'e-couleur') { b.couleur = e.target.value; $$('.nuance', f).forEach((n) => n.classList.remove('choisi')); }
  };
  f.onchange = (e) => {
    if (['e-largeur', 'e-longueur', 'e-nombre'].includes(e.target.id) && $('#e-place')) { lireChamps(); $('#e-place').innerHTML = placeHTML(); }
    if (e.target.id === 'e-nombre' && $('#e-place-arbre')) { lireChamps(); const d = dimsVerger(b.espece, b.nombre); $('#e-place-arbre').textContent = `📏 Place occupée : ${fmtM(d.largeur)} × ${fmtM(d.longueur)} (un arbre tous les ${ARBRES[b.espece].esp} m)`; }
  };
  f.onclick = async (e) => {
    const t = e.target.closest('[data-type]');
    if (t) {
      lireChamps();
      const ancien = b.type; b.type = t.dataset.type;
      if (ancien !== b.type) {
        const neuf = nouveauBac(b.type);
        Object.assign(b, { hauteur: neuf.hauteur, materiau: neuf.materiau, couleur: neuf.couleur });
        if (!existant) b.nom = neuf.nom;
        if (b.type === 'enclos') Object.assign(b, { animal: b.animal || 'poule', nombre: b.nombre || 3, cabane: b.cabane !== false });
        if (b.type === 'arbre') Object.assign(b, { espece: neuf.espece, nombre: 1, date: neuf.date, ...dimsVerger(neuf.espece, 1) });
      }
      dessiner(); return;
    }
    const es = e.target.closest('[data-espece]');
    if (es) {
      lireChamps(); const ancienne = ARBRES[b.espece];
      b.espece = es.dataset.espece; b.hauteur = ARBRES[b.espece].hauteur; b.couleur = ARBRES[b.espece].feuillage;
      if (!existant || b.nom.startsWith(ancienne?.nom || '§')) b.nom = ARBRES[b.espece].nom;
      Object.assign(b, dimsVerger(b.espece, b.nombre)); dessiner(); return;
    }
    const an = e.target.closest('[data-animal]'); if (an) { lireChamps(); b.animal = an.dataset.animal; if (!existant) b.nom = ANIMAUX[b.animal].nom; dessiner(); return; }
    const m = e.target.closest('[data-mat]'); if (m) { lireChamps(); b.materiau = m.dataset.mat; b.couleur = COULEUR_DEFAUT[b.materiau] || b.couleur; dessiner(); return; }
    const c = e.target.closest('[data-couleur]'); if (c) { lireChamps(); b.couleur = c.dataset.couleur; dessiner(); return; }
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'lieu-depuis-editeur') { f.onclick = null; f.oninput = null; f.onchange = null; choisirLieu(); return; }
    if (act === 'photo-bac') { f.onclick = null; f.oninput = null; f.onchange = null; fermerFeuille(); choisirPhoto(b.id); return; }
    if (act === 'supprimer-bac') {
      const n = etat.plantations.filter((q) => q.bac === b.id).length;
      if (!(await demander(`Supprimer « ${b.nom} »${n ? ` et ses ${n} plantation${n > 1 ? 's' : ''}` : ''} ?`, '🗑️ Supprimer'))) return;
      f.onclick = null; f.oninput = null; f.onchange = null;
      etat.bacs = etat.bacs.filter((x) => x.id !== b.id);
      etat.plantations = etat.plantations.filter((q) => q.bac !== b.id);
      await ecrire(clePlan(b.id), null); await ecrire(cleOrig(b.id), null); await appliquerPlan(b.id, null);
      etat.bacActif = etat.bacs[0]?.id;
      await sauver(); fermerFeuille(); majJardin(); toutRafraichir(); toast('🗑️ Supprimé');
      return;
    }
    if (act === 'enregistrer-bac') {
      lireChamps();
      f.onclick = null; f.oninput = null; f.onchange = null;
      const dimsChangees = existant && (existant.largeur !== b.largeur || existant.longueur !== b.longueur);
      let utilise = 0;
      if (!existant) { utilise = Math.min(etat.bois || 0, coutBois(b)); etat.bois = (etat.bois || 0) - utilise; }
      if (existant) Object.assign(existant, b); else etat.bacs.push(b);
      if (utilise) setTimeout(() => toast(`🔨 ${utilise} bûche${utilise > 1 ? 's' : ''} de ton bois utilisée${utilise > 1 ? 's' : ''} !`, 'or'), 900);
      majBois();
      if (!estCulture(b)) etat.plantations.filter((q) => q.bac === b.id).forEach((q) => { q.bac = bacsCultures()[0]?.id; q.x = null; q.y = null; });
      etat.bacActif = b.id; etat.accueilVu = true;
      await sauver(); fermerFeuille();
      if (dimsChangees) await redetourerSiBesoin(b.id); else majJardin();
      toutRafraichir();
      vibrer('moyen');
      toast(existant ? '💾 Enregistré !' : `${emojiElement(b)} « ${b.nom} » est dans ton jardin ! Regarde en 3D.`, 'vert');
    }
  };
}

// ── Bois : couper des arbres, puis construire avec ───────────────────
function majBois() {
  const b = $('#info-bois');
  b.hidden = !etat.bois;
  b.textContent = `🪵 ${etat.bois} bûche${etat.bois > 1 ? 's' : ''}`;
}
async function couperDecor(cle) {
  if (!(await demander('🪓 Couper cet arbre ? Tu récupères des bûches 🪵 pour construire.', '🪓 Couper'))) return;
  const gain = 2 + Math.floor(Math.random() * 3);
  scene?.couperArbre(cle);
  etat.coupes = [...(etat.coupes || []), cle];
  etat.bois = (etat.bois || 0) + gain;
  await sauver(); vibrer('moyen'); majBois(); renderNiveau();
  toast(`🪓 Timber ! +${gain} bûches 🪵 (+5 XP)`, 'or');
}
async function couperMonArbre(id) {
  const b = bacParId(id);
  if (!b) return;
  const a = ARBRES[b.espece] || ARBRES.pommier;
  if (!(await demander(`🪓 Couper un ${a.nom.toLowerCase()} ? Tu récupères des bûches 🪵.`, '🪓 Couper'))) return;
  const gain = Math.max(2, Math.round((b.hauteur || a.hauteur) * 1.5));
  etat.bois = (etat.bois || 0) + gain;
  etat.coupes = [...(etat.coupes || []), `verger:${id}:${Date.now()}`];
  if (b.nombre > 1) { b.nombre -= 1; Object.assign(b, dimsVerger(b.espece, b.nombre)); }
  else { etat.bacs = etat.bacs.filter((x) => x.id !== id); etat.bacActif = etat.bacs[0]?.id; }
  await sauver(); vibrer('moyen'); majJardin(); toutRafraichir();
  toast(`🪓 +${gain} bûches 🪵`, 'or');
}
// Bûches nécessaires pour construire en bois (bac, bordure, clôture, abri)
function coutBois(b) {
  const tour = 2 * (b.largeur + b.longueur);
  let n = 0;
  if (b.materiau === 'bois') n += Math.ceil(tour / (b.type === 'enclos' ? 3 : 1.5)) * (b.type === 'bac' ? Math.max(1, Math.round((b.hauteur || 0.3) / 0.3)) : 1);
  if (b.type === 'enclos' && b.cabane !== false && b.animal !== 'abeille') n += 4;
  return n;
}
function feuilleBois() {
  ouvrirFeuille(`
    <h2>🪵 Ton bois</h2>
    <p class="xp-total">${etat.bois || 0} bûche${etat.bois > 1 ? 's' : ''}</p>
    <p class="doux petit-texte" style="text-align:center">🪓 Touche un arbre du décor en 3D pour le couper (+5 XP). Agrandis le terrain pour avoir plus d'arbres.</p>
    <h3>🔨 Construire avec ton bois</h3>
    <div class="types-bac grand">
      <button class="type-bac" data-construire="bac"><span>🪵</span><b>Bac en bois</b><small>Les bûches servent à faire les planches.</small></button>
      <button class="type-bac" data-construire="enclos"><span>🐔</span><b>Enclos en bois</b><small>Clôture et abri pour tes animaux.</small></button>
      <button class="type-bac" data-construire="terre"><span>🌱</span><b>Bordure en bois</b><small>Pour une planche en pleine terre.</small></button>
    </div>
    <p class="doux petit-texte">Quand tu crées quelque chose en bois, tes bûches sont utilisées automatiquement.</p>`);
  $('#feuille').onclick = (e) => {
    const c = e.target.closest('[data-construire]');
    if (!c) return;
    $('#feuille').onclick = null;
    ouvrirEditeur(null, c.dataset.construire, { materiau: 'bois', couleur: COULEUR_DEFAUT.bois });
  };
}

// ── Déplacer les installations ──────────────────────────────────────────
let modeDeplacer = false;
function basculerDeplacement(force) {
  modeDeplacer = force ?? !modeDeplacer;
  scene?.setDeplacement(modeDeplacer);
  $('[data-act="deplacer-mode"]')?.classList.toggle('actif', modeDeplacer);
  $('#bandeau-deplacer').hidden = !modeDeplacer;
  if (modeDeplacer) allerA('visuel');
}
async function deplacerInstallation(id, x, z) {
  // La première fois, on fige la place de toutes les installations pour que rien ne saute
  const pos = scene?.positions() || {};
  for (const b of etat.bacs) if (b.px == null && pos[b.id]) { b.px = Math.round(pos[b.id].x * 10) / 10; b.pz = Math.round(pos[b.id].z * 10) / 10; }
  const b = bacParId(id);
  if (!b) return;
  b.px = x; b.pz = z;
  await sauver(); majJardin(); render3D(); vibrer('leger');
  toast(`📍 ${emojiElement(b)} ${b.nom} déplacé${b.type === 'serre' ? 'e' : ''}`, 'vert');
}
async function rangerAuto() {
  for (const b of etat.bacs) { delete b.px; delete b.pz; }
  await sauver(); majJardin(); render3D(); toast('🔄 Installations rangées automatiquement');
}

// Taille du terrain (l'île) : automatique ou plus grande pour avoir de la place
function terrainHTML(id = 't') {
  const auto = Math.round(autoTerrain());
  const v = etat.tailleTerrain || auto;
  return `<h3>🏝️ Taille du terrain</h3>
    <div class="terrain">
      <input type="range" id="${id}-taille" min="${auto}" max="${Math.max(auto + 10, 200)}" step="1" value="${v}" aria-label="Taille du terrain en mètres">
      <b id="${id}-valeur">${v} m</b>
    </div>
    <p class="doux petit-texte">De bord à bord. Agrandis-le pour avoir de la place pour d'autres bacs, des arbres ou des enclos. Tout à gauche : juste la place nécessaire.</p>`;
}
function autoTerrain() {
  const { rayon } = disposerBacs(etat.bacs);
  return Math.max(6.4, (rayon + 1.8) * 2);
}
function brancherTerrain(id = 't') {
  const r = $(`#${id}-taille`);
  if (!r) return;
  let minut = 0;
  r.addEventListener('input', () => {
    const v = Number(r.value); $(`#${id}-valeur`).textContent = `${v} m`;
    etat.tailleTerrain = v <= Math.round(autoTerrain()) ? 0 : v;
    clearTimeout(minut); minut = setTimeout(() => { sauver(); majJardin(); }, 120);
  });
}

function menuNouveau() {
  ouvrirFeuille(`
    <h2>➕ Ajouter à mon jardin</h2>
    <div class="types-bac grand">${Object.entries(TYPES_BAC).map(([k, t]) => `
      <button class="type-bac" data-nouveau="${k}"><span>${t.emoji}</span><b>${t.nom}</b><small>${t.desc}</small></button>`).join('')}</div>
    ${terrainHTML()}
    <div class="rangee"><button class="btn btn-gris" data-act="deplacer-depuis-menu">✋ Déplacer mes installations</button></div>`);
  brancherTerrain();
  $('#feuille').onclick = (e) => {
    const n = e.target.closest('[data-nouveau]');
    if (n) { $('#feuille').onclick = null; ouvrirEditeur(null, n.dataset.nouveau); }
    if (e.target.closest('[data-act="deplacer-depuis-menu"]')) { $('#feuille').onclick = null; fermerFeuille(); basculerDeplacement(true); }
  };
}
$('#importer').addEventListener('change', async (e) => {
  const f = e.target.files?.[0]; e.target.value = '';
  if (!f) return;
  try {
    const d = JSON.parse(await f.text());
    if (!Array.isArray(d.plantations)) throw new Error('format');
    const { photoPlan, photos = {}, ...reste } = d;
    for (const b of etat.bacs) { await ecrire(clePlan(b.id), null); await ecrire(cleOrig(b.id), null); await appliquerPlan(b.id, null); }
    etat = { ...ETAT_DEFAUT(), ...reste };
    etat.plantations = etat.plantations.filter((p) => PLANTE_PAR_ID[p.plante]);
    if (photoPlan && !etat.bacs?.length) await ecrire('photoPlan', await (await fetch(photoPlan)).blob());
    await migrer();
    for (const [id, url] of Object.entries(photos)) await ecrire(clePlan(id), await (await fetch(url)).blob());
    for (const b of etat.bacs) await appliquerPlan(b.id, await lire(clePlan(b.id)));
    await sauver(); majJardin();
    renderReglages(); toutRafraichir(); scene?.setFond(etat.fond); toast('📂 Sauvegarde restaurée !', 'vert');
  } catch { toast('😕 Fichier de sauvegarde invalide', 'rouge'); }
});

async function exporter() {
  const photos = {};
  for (const b of etat.bacs) {
    const blob = await lire(clePlan(b.id));
    if (blob) photos[b.id] = await new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(blob); });
  }
  const fichier = new Blob([JSON.stringify({ ...etat, photos })], { type: 'application/json' });
  telecharger(fichier, `mon-potager-${versISO(auj())}.json`);
}

const telecharger = (blob, nom) => partagerFichier(blob, nom).catch(() => toast('😕 Impossible d\'enregistrer le fichier', 'rouge'));

// ── Actions globales ────────────────────────────────────────────────────
const ORDRE_FONDS = Object.keys(FONDS);
document.addEventListener('click', async (e) => {
  const onglet = e.target.closest('.onglet');
  if (onglet) { allerA(onglet.dataset.vue); return; }
  const puce = e.target.closest('[data-filtre]');
  if (puce) { filtre = puce.dataset.filtre; renderListe(); return; }
  const ligne = e.target.closest('.ligne[data-id]');
  if (ligne) { ficheplantation(ligne.dataset.id); return; }
  const plante = e.target.closest('[data-plante]');
  if (plante) { fichePlante(plante.dataset.plante); return; }
  const puceBac = e.target.closest('[data-bac]:not([data-act])');
  if (puceBac) {
    if (etat.bacActif === puceBac.dataset.bac) ouvrirEditeur(puceBac.dataset.bac);
    else { etat.bacActif = puceBac.dataset.bac; sauver(); renderPlan(); }
    return;
  }
  const abri = e.target.closest('[data-abri]');
  if (abri) { conseilAbri = abri.dataset.abri || null; renderConseils(); return; }
  const b = e.target.closest('[data-act]');
  if (!b) return;
  switch (b.dataset.act) {
    case 'photo': choisirPhoto(bacActuel()?.type === 'enclos' ? bacsCultures()[0]?.id : bacActuel()?.id); break;
    case 'nouvel-element': menuNouveau(); break;
    case 'deplacer-mode': basculerDeplacement(); toast(modeDeplacer ? '✋ Attrape une installation et fais-la glisser' : '✅ Positions enregistrées'); break;
    case 'deplacer-fin': basculerDeplacement(false); break;
    case 'ranger-auto': rangerAuto(); break;
    case 'couper-arbre': couperMonArbre(b.dataset.bac); break;
    case 'bois': feuilleBois(); break;
    case 'editer-bac': ouvrirEditeur(b.dataset.bac || bacActuel()?.id); break;
    case 'sans-photo': etat.accueilVu = true; sauver(); majAccueil(); formulaire(); break;
    case 'detourer': if (bacActuel()) detourer(bacActuel().id, false); break;
    case 'ajouter': formulaire(); break;
    case 'placement-fin': finPlacement(); break;
    case 'etiquettes': {
      const modes = ['auto', 'toutes', 'aucune'];
      const noms = { auto: '🏷️ Étiquettes automatiques', toutes: '🏷️ Toutes les étiquettes', aucune: '🙈 Étiquettes masquées' };
      etat.etiquettes = modes[(modes.indexOf(etat.etiquettes) + 1) % modes.length];
      sauver(); scene?.setEtiquettes(etat.etiquettes);
      b.classList.toggle('off', etat.etiquettes === 'aucune'); toast(noms[etat.etiquettes]); break;
    }
    case 'tourner': {
      const on = !b.classList.contains('actif'); b.classList.toggle('actif', on); scene?.setAutoRotation(on); break;
    }
    case 'fond': {
      etat.fond = ORDRE_FONDS[(ORDRE_FONDS.indexOf(etat.fond) + 1) % ORDRE_FONDS.length];
      sauver(); scene?.setFond(etat.fond); toast(`${FONDS[etat.fond].emoji} Fond : ${FONDS[etat.fond].nom}`); break;
    }
    case 'recentrer': scene?.recentrer(); break;
    case 'capture': {
      if (!scene) break;
      const url = scene.capture();
      const blob = await (await fetch(url)).blob();
      await telecharger(blob, `mon-potager-3d-${versISO(auj())}.png`);
      toast('📸 Image enregistrée !', 'vert'); break;
    }
    case 'mois-prec': moisAffiche = ((moisAffiche + 10) % 12) + 1; renderConseils(); break;
    case 'mois-suiv': moisAffiche = (moisAffiche % 12) + 1; renderConseils(); break;
    case 'localiser': localiser(); break;
    case 'changer-lieu': choisirLieu(); break;
    case 'exporter': exporter(); break;
    case 'reinitialiser':
      if (await demander('Effacer tout le potager (plantations et photo) ? On ne pourra pas revenir en arrière.', '🗑️ Tout effacer')) {
        for (const x of etat.bacs) { await ecrire(clePlan(x.id), null); await ecrire(cleOrig(x.id), null); await appliquerPlan(x.id, null); delete sources[x.id]; }
        etat = ETAT_DEFAUT(); await migrer(); majJardin(); scene?.setFond(etat.fond); renderReglages(); toutRafraichir(); allerA('visuel');
      }
      break;
    default:
  }
});

$('#niveau').addEventListener('click', () => {
  const xp = Number($('#niveau').dataset.xp || 0);
  ouvrirFeuille(`
    <h2>⭐ Ton niveau de jardinier</h2>
    <p class="xp-total">${xp} XP</p>
    <ul class="gains">
      <li>🌱 +10 XP par plantation</li><li>🧬 +15 XP par nouvelle espèce</li>
      <li>🎨 +20 XP par catégorie (légumes, fruits, aromatiques, fleurs)</li>
      <li>📷 +20 XP pour la photo du potager</li><li>📍 +15 XP pour ta région</li>
    </ul>
    <div class="niveaux">${NIVEAUX.map(([s, t], i) => `<div class="niv${xp >= s ? ' atteint' : ''}"><span>${i + 1}</span>${t}<small>${s} XP</small></div>`).join('')}</div>`);
});

// Notifications locales le matin des récoltes estimées (appli Android / iPhone)
let minuterieRappels = 0;
function programmerRappels() {
  if (!NATIF) return;
  clearTimeout(minuterieRappels);
  minuterieRappels = setTimeout(() => {
    const rappels = etat.notifs === false ? [] : etat.plantations.map((p) => {
      const { plante, recolte } = infos(p);
      if (!plante || !recolte) return null;
      const fleur = plante.cat === 'fleur';
      return {
        id: p.id, date: recolte,
        titre: `${plante.emoji} ${fleur ? 'Floraison' : 'C\'est l\'heure de récolter'} !`,
        texte: fleur ? `Tes ${plante.nom.toLowerCase()} devraient être en fleur. Va voir ton potager !` : `Ton ${plante.nom.toLowerCase()} planté le ${formatDate(p.date)} devrait être prêt.`,
      };
    }).filter(Boolean);
    programmerRecoltes(rappels);
  }, 800);
}

function toutRafraichir() {
  programmerRappels(); majBois();
  if (!$('#r-terrain').contains(document.activeElement)) { $('#r-terrain').innerHTML = terrainHTML('rt'); brancherTerrain('rt'); }
  render3D(); renderPlan(); renderListe(); renderNiveau(); majAccueil();
  if ($('#vue-conseils').classList.contains('active')) renderConseils(); else renderLieu();
  if (meteo) renderMeteo();
}

// ── Démarrage ───────────────────────────────────────────────────────────
async function demarrer() {
  etat = await chargerEtat();
  await migrer();
  renderReglages();
  scene = creerScene($('#scene'), { onSelect: (id) => { if (id) ficheplantation(id); }, onDecor: couperDecor, onDeplace: deplacerInstallation });
  if (scene) {
    scene.setFond(etat.fond);
    if (typeof etat.etiquettes === 'boolean') etat.etiquettes = etat.etiquettes ? 'auto' : 'aucune';
    scene.setEtiquettes(etat.etiquettes);
    $('[data-act="etiquettes"]').classList.toggle('off', etat.etiquettes === 'aucune');
  }
  for (const b of etat.bacs) await appliquerPlan(b.id, await lire(clePlan(b.id)));
  majJardin();
  toutRafraichir();
  renderNiveau(false);
  if (etat.lieu) chargerMeteo();
  document.body.classList.add('pret');
  surNotificationTouchee((id) => { allerA('potager'); ficheplantation(id); });
  surBoutonRetour(() => {
    const det = document.querySelector('.detourage');
    if (det) { det.querySelector('[data-act="annuler"]').click(); return true; }
    const dlg = document.querySelector('.dialogue');
    if (dlg) { dlg.click(); return true; }
    if (!$('#feuille').hidden) { $('#feuille').onclick = null; $('#feuille').oninput = null; $('#feuille').onchange = null; fermerFeuille(); return true; }
    if (placement) { finPlacement(); return true; }
    if (modeDeplacer) { basculerDeplacement(false); return true; }
    if (!$('#vue-visuel').classList.contains('active')) { allerA('visuel'); return true; }
    return false;
  });
  if (!NATIF && 'serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
}

window.monPotager = { get etat() { return etat; }, couper: (cle) => couperDecor(cle), arbres: () => scene?.arbresCoupables() || [], ecran: (id) => scene?.ecranDe(id) }; // pratique pour les tests
demarrer();
