// Mon Potager : interface de l'appli.
import { PLANTES, PLANTE_PAR_ID, CATEGORIES, ZONES, MOIS, MOIS_COURT } from './data.js';
import {
  ACTIONS, calendrier, recommandations, saison, travauxDuMois, detecterZone, estimerRecolte, avancement,
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
let planURL = null;
let planImage = null; // canvas ou ImageBitmap du potager redressé
let sourcePhoto = null; // photo d'origine (pour refaire le détourage)
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

function infos(p) {
  const plante = PLANTE_PAR_ID[p.plante];
  const recolte = estimerRecolte(p, etat.zone, etat.hemisphere);
  const progres = avancement(p, auj(), etat.zone, etat.hemisphere);
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
  return pl.length * 10 + especes.size * 15 + cats.size * 20 + (planURL ? 20 : 0) + (etat.lieu ? 15 : 0);
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
      id: p.id, x: p.x, y: p.y, emoji: plante.emoji, couleur: cat.couleur, progres,
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
  $('#accueil').hidden = !!(planURL || etat.plantations.length || etat.accueilVu);
}

// ── Photo et détourage ──────────────────────────────────────────────────
async function appliquerPlan(blob) {
  if (planURL) URL.revokeObjectURL(planURL);
  planURL = blob ? URL.createObjectURL(blob) : null;
  planImage = null;
  if (blob) {
    try { planImage = await chargerImage(blob); } catch { URL.revokeObjectURL(planURL); planURL = null; }
  }
  scene?.majPotager({ largeur: etat.largeur, longueur: etat.longueur, image: planImage });
  render3D(); renderPlan(); majAccueil(); renderNiveau();
}

const versBlob = (canvas) => new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.9));

async function detourer(nouvelle) {
  if (!sourcePhoto) {
    const b = await lire('photoOriginale');
    if (!b) { $('#fichier-photo').click(); return; }
    sourcePhoto = await chargerImage(b);
  }
  const res = await ouvrirDetourage(sourcePhoto, { coins: nouvelle ? null : etat.coins, largeur: etat.largeur, longueur: etat.longueur });
  if (!res) return;
  etat.coins = res.coins; etat.largeur = res.largeur; etat.longueur = res.longueur; etat.accueilVu = true;
  await sauver();
  const blob = await versBlob(res.canvas);
  await ecrire('photoPlan', blob);
  await appliquerPlan(blob);
  renderReglages();
  toast('✨ Potager détouré ! Tourne autour avec le doigt.', 'vert');
  allerA('visuel');
}

$('#fichier-photo').addEventListener('change', async (e) => {
  const f = e.target.files?.[0]; e.target.value = '';
  if (!f) return;
  try {
    sourcePhoto = await chargerImage(f);
    await ecrire('photoOriginale', f);
    await detourer(true);
  } catch (err) {
    console.error(err); toast('😕 Impossible d\'ouvrir cette image.', 'rouge');
  }
});

async function redetourerSiBesoin() {
  if (!etat.coins) { scene?.majPotager({ largeur: etat.largeur, longueur: etat.longueur, image: planImage }); render3D(); renderPlan(); return; }
  if (!sourcePhoto) { const b = await lire('photoOriginale'); if (b) sourcePhoto = await chargerImage(b); }
  if (!sourcePhoto) return;
  const blob = await versBlob(redresserCanvas(sourcePhoto, etat.coins, etat.largeur, etat.longueur));
  await ecrire('photoPlan', blob);
  await appliquerPlan(blob);
}

// ── Plan 2D (vu du dessus) ──────────────────────────────────────────────
function renderPlan() {
  const plan = $('#plan'), img = $('#plan-img');
  plan.style.aspectRatio = `${etat.largeur} / ${etat.longueur}`;
  plan.classList.toggle('sans-photo', !planURL);
  if (planURL) { img.src = planURL; img.hidden = false; } else { img.removeAttribute('src'); img.hidden = true; }
  $('#btn-detourer').disabled = !etat.coins;
  plan.classList.toggle('en-placement', !!placement);
  $('#plan-marqueurs').innerHTML = etat.plantations.filter((p) => p.x != null).map((p) => {
    const { plante, cat, progres } = infos(p);
    if (!plante) return '';
    return `<button class="marqueur${p.id === placement ? ' choisi' : ''}" data-id="${p.id}" style="left:${p.x * 100}%;top:${p.y * 100}%;--c:${cat.couleur};--p:${progres}" aria-label="${esc(plante.nom)}">${plante.emoji}</button>`;
  }).join('');
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
        <span class="ligne-dates">🌱 ${formatDate(p.date)} · ${plante.cat === 'fleur' ? '🌸' : '🧺'} ${recolte ? formatDate(recolte, { month: 'long', year: 'numeric' }) : '?'}</span>
        <span class="jauge"><span style="width:${Math.round(progres * 100)}%"></span></span>
        <span class="ligne-reste">${texteReste(reste, plante)}${p.x == null ? ' · <i>pas encore placé</i>' : ''}</span>
      </span></button>`;
  }).join('');
}

// ── Feuille (panneau qui monte du bas) ──────────────────────────────────
function ouvrirFeuille(html) {
  const f = $('#feuille');
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

function calendrierHTML(plante) {
  const cal = calendrier(plante, etat.zone, etat.hemisphere);
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
      <div class="stat"><span>🌱 Planté le</span><b>${formatDate(p.date)}</b></div>
      <div class="stat"><span>${plante.cat === 'fleur' ? '🌸 Floraison' : '🧺 Récolte'} vers</span><b>${recolte ? formatDate(recolte, { day: 'numeric', month: 'long', year: 'numeric' }) : '?'}</b></div>
    </div>
    <div class="jauge grosse"><span style="width:${Math.round(progres * 100)}%"></span><em>${Math.round(progres * 100)} %</em></div>
    <p class="reste">${texteReste(reste, plante)}</p>
    ${p.note ? `<p class="note">📝 ${esc(p.note)}</p>` : ''}
    ${infosPlanteHTML(plante)}
    <h3>📅 Calendrier dans ta région</h3>
    ${calendrierHTML(plante)}
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
    ${infosPlanteHTML(plante)}
    <h3>📅 Calendrier · ${ZONES[etat.zone].emoji} ${ZONES[etat.zone].nom}</h3>
    ${calendrierHTML(plante)}
    <button class="btn btn-vert gros large" data-act="planter" data-plante="${plante.id}">➕ Je l'ajoute à mon potager</button>`);
}

function formulaire(existant, planteInitiale) {
  const p = existant || { plante: planteInitiale || '', date: versISO(auj()), qte: 1, note: '' };
  let choix = p.plante;
  let catF = choix ? PLANTE_PAR_ID[choix]?.cat : 'tout';
  ouvrirFeuille(`
    <h2>${existant ? '✏️ Modifier' : '➕ Nouvelle plantation'}</h2>
    <input class="recherche" id="f-recherche" placeholder="🔍 Chercher une plante…" autocomplete="off">
    <div class="filtres" id="f-cats"></div>
    <div class="grille-plantes" id="f-grille"></div>
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
    $('#f-grille').innerHTML = PLANTES.filter((x) => (catF === 'tout' || x.cat === catF) &&
      (!q || x.nom.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').includes(q)))
      .map((x) => `<button class="choix-plante${x.id === choix ? ' choisi' : ''}" data-choix="${x.id}" style="--c:${CATEGORIES[x.cat].couleur}">
        <span>${x.emoji}</span>${esc(x.nom)}${bonnePeriode(x.id, mois, etat.zone, etat.hemisphere) ? '<i title="C\'est la saison">✓</i>' : ''}</button>`).join('')
      || '<p class="vide-petit">Aucune plante trouvée.</p>';
    majSaison();
  };
  const majSaison = () => {
    const el = $('#f-saison');
    if (!choix) { el.innerHTML = ''; return; }
    const d = $('#f-date').value ? versDate($('#f-date').value) : auj();
    const m = d.getMonth() + 1;
    const plante = PLANTE_PAR_ID[choix];
    const cal = calendrier(plante, etat.zone, etat.hemisphere);
    const enTerre = [...new Set([...cal.sa, ...cal.st, ...cal.pl])].sort((a, b) => a - b);
    el.innerHTML = enTerre.includes(m)
      ? `<p class="ok">✅ Bonne période pour ${esc(plante.nom.toLowerCase())} en ${MOIS[m - 1]} chez toi !</p>`
      : `<p class="attention">⚠️ Chez toi, ${esc(plante.nom.toLowerCase())} se met plutôt en terre en ${plageMois(enTerre)}.</p>`;
  };
  grille();
  const f = $('#feuille');
  f.oninput = (e) => { if (e.target.id === 'f-recherche') grille(); if (e.target.id === 'f-date') majSaison(); };
  f.onclick = (e) => {
    const c = e.target.closest('[data-choix]'); if (c) { choix = c.dataset.choix; grille(); return; }
    const fc = e.target.closest('[data-fcat]'); if (fc) { catF = fc.dataset.fcat; grille(); return; }
    if (e.target.closest('[data-act="enregistrer"]')) {
      const date = $('#f-date').value;
      if (!choix) { toast('👆 Choisis d\'abord une plante', 'rouge'); return; }
      if (!date) { toast('📆 Indique la date de plantation', 'rouge'); return; }
      const qte = Math.max(1, Math.min(999, Number($('#f-qte').value) || 1));
      const note = $('#f-note').value.trim();
      f.onclick = null; f.oninput = null;
      if (existant) {
        Object.assign(existant, { plante: choix, date, qte, note });
        sauver(); fermerFeuille(); toutRafraichir(); toast('💾 Modifié !', 'vert');
      } else {
        const nouvelle = { id: uid(), plante: choix, date, qte, note, x: null, y: null };
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
  if (act === 'fermer') { $('#feuille').onclick = null; $('#feuille').oninput = null; fermerFeuille(); return; }
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
$('#voile').addEventListener('click', () => { $('#feuille').onclick = null; $('#feuille').oninput = null; fermerFeuille(); });

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
  const fragiles = plantesGelives(etat.plantations);
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
  const r = recommandations(moisAffiche, etat.zone, etat.hemisphere);
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
  $('#r-nom').value = etat.nom; $('#r-largeur').value = etat.largeur; $('#r-longueur').value = etat.longueur;
  $('#nom-potager').textContent = etat.nom || 'Mon potager';
  $('#r-notifs').checked = etat.notifs !== false;
  $('#ligne-notifs').hidden = !NATIF;
}
$('#r-notifs').addEventListener('change', (e) => {
  etat.notifs = e.target.checked; sauver(); programmerRappels();
  toast(etat.notifs ? '🔔 Je te préviens quand une récolte est prête' : '🔕 Rappels de récolte coupés');
});
$('#r-nom').addEventListener('change', (e) => { etat.nom = e.target.value.trim() || 'Mon potager'; sauver(); renderReglages(); });
for (const id of ['#r-largeur', '#r-longueur']) {
  $(id).addEventListener('change', async () => {
    etat.largeur = Math.min(100, Math.max(0.3, Number($('#r-largeur').value) || etat.largeur));
    etat.longueur = Math.min(100, Math.max(0.3, Number($('#r-longueur').value) || etat.longueur));
    await sauver(); renderReglages(); await redetourerSiBesoin();
  });
}
$('#importer').addEventListener('change', async (e) => {
  const f = e.target.files?.[0]; e.target.value = '';
  if (!f) return;
  try {
    const d = JSON.parse(await f.text());
    if (!Array.isArray(d.plantations)) throw new Error('format');
    const { photoPlan, ...reste } = d;
    etat = { ...ETAT_DEFAUT(), ...reste };
    etat.plantations = etat.plantations.filter((p) => PLANTE_PAR_ID[p.plante]);
    await sauver();
    if (photoPlan) { const blob = await (await fetch(photoPlan)).blob(); await ecrire('photoPlan', blob); await appliquerPlan(blob); }
    renderReglages(); toutRafraichir(); scene?.setFond(etat.fond); toast('📂 Sauvegarde restaurée !', 'vert');
  } catch { toast('😕 Fichier de sauvegarde invalide', 'rouge'); }
});

async function exporter() {
  const blob = await lire('photoPlan');
  const photoPlan = blob ? await new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(blob); }) : null;
  const fichier = new Blob([JSON.stringify({ ...etat, photoPlan })], { type: 'application/json' });
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
  const b = e.target.closest('[data-act]');
  if (!b) return;
  switch (b.dataset.act) {
    case 'photo': $('#fichier-photo').click(); break;
    case 'sans-photo': etat.accueilVu = true; sauver(); majAccueil(); formulaire(); break;
    case 'detourer': detourer(false); break;
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
        etat = ETAT_DEFAUT(); sourcePhoto = null;
        await ecrire('photoOriginale', null); await ecrire('photoPlan', null); await sauver();
        await appliquerPlan(null); scene?.setFond(etat.fond); renderReglages(); toutRafraichir(); allerA('visuel');
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
  programmerRappels();
  render3D(); renderPlan(); renderListe(); renderNiveau(); majAccueil();
  if ($('#vue-conseils').classList.contains('active')) renderConseils(); else renderLieu();
  if (meteo) renderMeteo();
}

// ── Démarrage ───────────────────────────────────────────────────────────
async function demarrer() {
  etat = await chargerEtat();
  renderReglages();
  scene = creerScene($('#scene'), { onSelect: (id) => { if (id) ficheplantation(id); } });
  if (scene) {
    scene.setFond(etat.fond);
    if (typeof etat.etiquettes === 'boolean') etat.etiquettes = etat.etiquettes ? 'auto' : 'aucune';
    scene.setEtiquettes(etat.etiquettes);
    $('[data-act="etiquettes"]').classList.toggle('off', etat.etiquettes === 'aucune');
  }
  const blob = await lire('photoPlan');
  await appliquerPlan(blob || null);
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
    if (!$('#feuille').hidden) { $('#feuille').onclick = null; $('#feuille').oninput = null; fermerFeuille(); return true; }
    if (placement) { finPlacement(); return true; }
    if (!$('#vue-visuel').classList.contains('active')) { allerA('visuel'); return true; }
    return false;
  });
  if (!NATIF && 'serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
}

window.monPotager = { get etat() { return etat; } }; // pratique pour les tests
demarrer();
