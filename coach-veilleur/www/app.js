import * as C from './coach.js';
import * as N from './nutrition.js';
import * as K from './complements.js';
import { analyserPhoto, reduirePhoto, moteurDisponible } from './analyse.js';

const CLE = 'veilleur-coach-v1';
const app = document.getElementById('app');

const VISIERE = `<svg viewBox="0 0 48 48" aria-hidden="true" fill="none" stroke-width="5" stroke-linecap="round"><circle cx="24" cy="24" r="19" stroke="var(--carte-2)"/><path d="M24 5a19 19 0 0 1 18.1 24.9" stroke="var(--vert)"/><path d="M38.6 36A19 19 0 0 1 9.4 36" stroke="var(--bleu)"/><path d="M6.4 31.1A19 19 0 0 1 17 6.3" stroke="var(--orange)"/></svg>`;
const ICONES = {
  ce_soir: '<svg viewBox="0 0 24 24"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z"/></svg>',
  progres: '<svg viewBox="0 0 24 24"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
  calories: '<svg viewBox="0 0 24 24"><path d="M12 3c3 4 6 6.5 6 10.5a6 6 0 0 1-12 0C6 10 8 8.5 9 6c1 2 2 3 3 3.5C12 7 12 5 12 3Z"/></svg>',
  profil: '<svg viewBox="0 0 24 24"><path d="M12 2 20 6v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6Z"/><path d="M8.5 11.5 11 14l4.5-4.5"/></svg>',
};

// ---------- état et sauvegarde ----------
let S = charger() || { profil: null, etat: null };
S.nutri ||= { journal: [], pesees: [], ajustement: 0, cleApi: '' };
S.complements ||= { liste: [], pris: {} };
let ui = { ecran: S.profil ? 'accueil' : 'intro', brouillon: null, confirmer: null, toast: '', moteur: null, recherche: '', choix: null, libre: { nom: '', kcal: '' }, repas: N.repasSelonHeure() };
function majMoteur() { moteurDisponible(S.nutri.cleApi).then(m => { if (m !== ui.moteur) { ui.moteur = m; if (['calories', 'reglages'].includes(ui.ecran)) render(); } }); }
majMoteur();
if (S.run) ui.ecran = S.run.etape >= etapes(S.run.seance).length ? 'bilan' : 'seance';

function charger() {
  try { return JSON.parse(localStorage.getItem(CLE)); } catch { return null; }
}
function sauver() {
  try { localStorage.setItem(CLE, JSON.stringify(S)); } catch { /* stockage indisponible : l'appli continue en mémoire */ }
}
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const aujourdhui = () => C.jour();

// ---------- sons, vibrations, écran allumé ----------
let audio;
function bip(freq = 880, ms = 140) {
  try {
    audio ||= new (window.AudioContext || window.webkitAudioContext)();
    const o = audio.createOscillator(), g = audio.createGain();
    o.type = 'square'; o.frequency.value = freq; g.gain.value = 0.06;
    o.connect(g); g.connect(audio.destination); o.start(); o.stop(audio.currentTime + ms / 1000);
  } catch { /* pas de son disponible */ }
}
const vibre = m => { try { navigator.vibrate?.(m); } catch { /* ignoré */ } };
let verrou;
async function garderEcran(oui) {
  try {
    if (oui && !verrou) verrou = await navigator.wakeLock?.request('screen');
    if (!oui && verrou) { await verrou.release(); verrou = null; }
  } catch { verrou = null; }
}

// ---------- notifications des compléments (appli installée uniquement) ----------
const notifs = () => (window.Capacitor?.isNativePlatform?.() ? window.Capacitor.Plugins?.LocalNotifications : null);
const heureMaintenant = () => { const d = new Date(); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
async function permissionNotifs(demander) {
  const P = notifs();
  if (!P) return 'indisponible';
  try {
    let { display } = await P.checkPermissions();
    if (demander && (display === 'prompt' || display === 'prompt-with-rationale')) ({ display } = await P.requestPermissions());
    return display;
  } catch { return 'indisponible'; }
}
async function reprogrammerRappels(demander = false) {
  const P = notifs();
  if (!P) return;
  try {
    await P.cancel({ notifications: Array.from({ length: 20 }, (_, i) => ({ id: K.ID_BASE + i })) });
    const plan = K.planNotifications(S.complements.liste);
    if (!plan.length) return;
    ui.permNotifs = await permissionNotifs(demander);
    if (ui.permNotifs === 'granted') await P.schedule({ notifications: plan });
    if (ui.ecran === 'complements') render();
  } catch { /* la programmation échoue sans bloquer l'appli */ }
}
reprogrammerRappels();

// ---------- minuteur ----------
let tic = null;
function minuteur() {
  clearInterval(tic);
  tic = setInterval(() => {
    const r = S.run;
    if (!r?.chrono) return clearInterval(tic);
    const reste = Math.max(0, Math.ceil((r.chrono.fin - Date.now()) / 1000));
    const el = document.getElementById('chrono');
    if (el) el.textContent = format(reste);
    const b = document.getElementById('chrono-barre');
    if (b) b.style.width = `${100 - (reste / r.chrono.total) * 100}%`;
    if (reste <= 3 && reste > 0 && r.chrono.dernierBip !== reste) { r.chrono.dernierBip = reste; bip(660, 90); }
    if (reste === 0) {
      bip(990, 300); vibre([200, 80, 200]);
      const fin = r.chrono.apres; r.chrono = null; clearInterval(tic);
      actions[fin]?.();
    }
  }, 200);
}
const format = s => (s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : String(s));
function lancerChrono(secondes, apres) {
  S.run.chrono = { fin: Date.now() + secondes * 1000, total: secondes, apres };
  sauver(); minuteur();
}

// ---------- déroulé d'une séance ----------
function etapes(seance) {
  const out = [];
  seance.echauffement.forEach(m => out.push({ k: 'mobi', nom: m.nom, duree: m.duree, phase: 'Échauffement' }));
  seance.exercices.forEach((ex, i) => {
    for (let s = 0; s < ex.series; s++) out.push({ k: 'serie', i, s, phase: `Exercice ${i + 1}/${seance.exercices.length}` });
  });
  seance.retour.forEach(m => out.push({ k: 'mobi', nom: m.nom, duree: m.duree, phase: 'Retour au calme' }));
  return out;
}

// Anneau de score façon tableau de bord : valeur 0→1, couleur, texte central.
function anneau(valeur, couleur, centre, sous, taille = 120) {
  const R = 48, C = 2 * Math.PI * R, v = Math.max(0, Math.min(1, valeur));
  return `<svg viewBox="0 0 ${taille} ${taille}" role="img" aria-label="${esc(sous)} ${esc(centre)}">
    <circle cx="60" cy="60" r="${R}" fill="none" stroke="var(--carte-2)" stroke-width="10"/>
    ${v > 0 ? `<circle cx="60" cy="60" r="${R}" fill="none" stroke="${couleur}" stroke-width="10" stroke-linecap="round"
      stroke-dasharray="${(v * C).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 60 60)"/>` : ''}
    <text class="anneau-texte" x="60" y="${sous ? 64 : 70}" text-anchor="middle" style="font-size:${String(centre).length > 4 ? 24 : 30}px">${esc(centre)}</text>
    ${sous ? `<text class="anneau-sous" x="60" y="80" text-anchor="middle">${esc(sous)}</text>` : ''}</svg>`;
}
const couleurForme = f => (f >= 0.67 ? 'vert' : f >= 0.34 ? 'jaune' : 'rouge');
const motForme = { vert: 'Prêt à pousser', jaune: 'Séance normale', rouge: 'Récupération' };
const dosage = e => `${e.series} × ${e.mode === 'temps' ? (e.cible >= 60 ? `${format(e.cible)} min` : `${e.cible} s`) : `${e.cible} rép.`}${e.mode === 'charge' ? ` · ${e.charge ? `${e.charge} kg` : 'charge à trouver'}` : ''}`;
function blocCharge(r, e, ex) {
  const kg = r.charges?.[e.i] ?? ex.charge;
  return `<div class="charge-machine"><span class="etiquette">Charge sur la machine</span>
    <div class="reglage"><button class="rond mini" data-a="charge" data-v="-1" aria-label="Moins lourd">−</button>
    <span class="grand-chiffre">${kg ?? '—'}<small> kg</small></span>
    <button class="rond mini" data-a="charge" data-v="1" aria-label="Plus lourd">+</button></div>
    ${kg ? '' : '<span class="muet" style="font-size:.85rem">Première fois : choisis une charge que tu peux soulever ' + ex.cible + ' fois proprement.</span>'}</div>`;
}
const MOTS_ECHELLE = {
  energie: ['Vidé', 'Fatigué', 'Correct', 'En forme', 'Plein d’énergie'],
  sommeil: ['Nuit blanche', 'Mauvaise nuit', 'Nuit moyenne', 'Bonne nuit', 'Nuit parfaite'],
  courbatures: ['Aucune', 'Légères', 'Présentes', 'Fortes', 'Partout'],
};
const explication = (titre, corps) => `<details class="explication"><summary>${titre}</summary>${corps}</details>`;
const dateLongue = () => new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

// ---------- écrans ----------
const ecrans = {
  intro() {
    return `<div class="ecran intro">
      <div class="visiere">${VISIERE}</div>
      <div class="etiquette">Ton coach de poche</div>
      <h1>Veilleur s’adapte à toi, chaque jour.</h1>
      <p class="pitch">Un coach sportif et nutrition qui lit ta forme du jour, règle tes séances et compte tes calories à partir d’une simple photo.</p>
      <div class="plaque"><ol class="etapes-intro">
        <li><b>1</b><span><strong>Tu donnes ton état</strong> : énergie, sommeil, courbatures. Veilleur en tire ton score de forme.</span></li>
        <li><b>2</b><span><strong>Il prépare ta séance</strong> : plus intense si tu es en forme, plus douce si tu es fatigué.</span></li>
        <li><b>3</b><span><strong>Il apprend de tes résultats</strong> : ce que tu réussis fait monter les exercices, ce qui est trop dur les fait baisser.</span></li>
        <li><b>4</b><span><strong>Tu photographies tes repas</strong> : les calories et les protéines se calculent toutes seules.</span></li>
      </ol></div>
      <div class="champ">
        <button class="btn" data-a="nouveauProfil">Créer mon profil</button>
        <button class="btn second" data-a="exemple">Essayer avec un profil exemple</button>
      </div>
      <p class="muet" style="font-size:.85rem">Tes données restent sur ton téléphone.</p>
    </div>`;
  },

  formulaire() {
    const b = ui.brouillon;
    const puces = (champ, options, multi = false) => `<div class="puces">${Object.entries(options).map(([k, v]) => {
      const on = multi ? b[champ].includes(k) : String(b[champ]) === String(k);
      return `<button class="puce" aria-pressed="${on}" data-a="${multi ? 'basculer' : 'choisir'}" data-c="${champ}" data-v="${k}">${esc(v)}</button>`;
    }).join('')}</div>`;
    const nomsObjectifs = Object.fromEntries(Object.entries(C.OBJECTIFS).map(([k, o]) => [k, o.nom]));
    return `<div class="ecran">
      <div><div class="etiquette">${S.profil ? 'Modifier' : 'Étape unique'}</div><h1>Ton profil</h1></div>
      <div class="plaque">
        <label class="champ"><span class="etiquette">Prénom ou surnom</span><input type="text" id="prenom" maxlength="20" autocomplete="given-name" value="${esc(b.prenom)}" placeholder="Ex. Alex"></label>
        <div class="champ"><span class="etiquette">Objectif</span>${puces('objectif', nomsObjectifs)}</div>
        <div class="champ"><span class="etiquette">Niveau actuel</span>${puces('niveau', C.NIVEAUX)}</div>
        <div class="champ"><span class="etiquette">Séances par semaine</span>${puces('seancesSemaine', { 2: '2', 3: '3', 4: '4', 5: '5', 6: '6' })}</div>
        <div class="champ"><span class="etiquette">Durée habituelle</span>${puces('duree', { 15: '15 min', 20: '20 min', 30: '30 min', 45: '45 min', 60: '60 min' })}</div>
      </div>
      <div class="plaque">
        <div class="champ"><span class="etiquette">Matériel disponible</span>${puces('materiel', C.MATERIELS, true)}<span class="muet" style="font-size:.85rem">Rien de coché : uniquement au poids du corps.</span></div>
        <div class="champ"><span class="etiquette">Zones à ménager</span>${puces('zones', C.ZONES, true)}</div>
        <div class="champ"><span class="etiquette">Ton du coach</span>${puces('ton', C.TONS)}</div>
      </div>
      <div class="plaque">
        <div><h2>Pour tes calories</h2><p class="muet" style="font-size:.88rem">Sert à calculer ton objectif du jour. Tu peux le remplir plus tard.</p></div>
        <div class="champ"><span class="etiquette">Sexe</span>${puces('sexe', N.SEXES)}</div>
        <div class="trio">
          <label class="champ"><span class="etiquette">Âge</span><input type="number" inputmode="numeric" id="age" min="14" max="99" value="${esc(b.age ?? '')}" placeholder="ans"></label>
          <label class="champ"><span class="etiquette">Taille</span><input type="number" inputmode="numeric" id="taille" min="120" max="230" value="${esc(b.taille ?? '')}" placeholder="cm"></label>
          <label class="champ"><span class="etiquette">Poids</span><input type="number" inputmode="decimal" id="poids" min="30" max="250" step="0.1" value="${esc(b.poids ?? '')}" placeholder="kg"></label>
        </div>
        <div class="champ"><span class="etiquette">Au quotidien</span>${puces('activite', N.ACTIVITES)}</div>
      </div>
      <button class="btn" data-a="enregistrerProfil">${S.profil ? 'Enregistrer' : 'Activer mon coach'}</button>
      ${S.profil ? '<button class="btn second" data-a="aller" data-v="reglages">Annuler</button>' : ''}
    </div>`;
  },

  accueil() {
    const { profil, etat } = S;
    const b = C.bilanSemaine(profil, etat, aujourdhui());
    const ck = S.checkin?.date === aujourdhui() ? S.checkin : { date: aujourdhui(), energie: 3, sommeil: 3, courbatures: 2, duree: profil.duree };
    S.checkin = ck;
    const forme = C.formeDuJour(ck);
    const echelle = (champ, bas, haut) => `<div class="champ"><div class="echelle">${[1, 2, 3, 4, 5].map(n =>
      `<button class="puce" aria-pressed="${ck[champ] === n}" data-a="checkin" data-c="${champ}" data-v="${n}" aria-label="${champ} ${n} sur 5">${n}</button>`).join('')}</div>
      <div class="echelle-legende"><span>${bas}</span><strong>${MOTS_ECHELLE[champ][ck[champ] - 1] || ''}</strong><span>${haut}</span></div></div>`;
    const dejaFaite = etat.historique.at(-1)?.date === aujourdhui();
    const cf = couleurForme(forme);
    const regul = b.objectif ? b.faites / b.objectif : 0;
    const bn = N.profilCaloriesComplet(profil) ? N.bilanJour(profil, S.nutri, etat.historique, aujourdhui()) : null;
    return `<div class="ecran">
      ${entete()}
      <div class="scores">
        <button class="score" data-a="aller" data-v="accueil" aria-label="Forme ${Math.round(forme * 100)} %">${anneau(forme, `var(--${cf})`, `${Math.round(forme * 100)}%`, '')}<span class="score-titre">Forme</span><span class="score-sous" style="color:var(--${cf})">${motForme[cf]}</span></button>
        <button class="score" data-a="aller" data-v="progres">${anneau(regul, 'var(--bleu)', `${b.faites}/${b.objectif}`, '')}<span class="score-titre">Semaine</span><span class="score-sous">${b.faites >= b.objectif ? 'Objectif atteint' : `Encore ${b.objectif - b.faites} séance${b.objectif - b.faites > 1 ? 's' : ''}`}</span></button>
        <button class="score" data-a="aller" data-v="calories">${bn ? anneau(bn.total.kcal / bn.cible, 'var(--orange)', String(bn.total.kcal), `/ ${bn.cible}`) : anneau(0, 'var(--orange)', '—', 'à régler')}<span class="score-titre">Calories</span><span class="score-sous">${bn ? (bn.reste >= 0 ? `${bn.reste} restantes` : `${-bn.reste} en trop`) : 'Profil à compléter'}</span></button>
      </div>
      <div class="plaque">
        <div class="macro-tete"><span class="etat ${cf}">${motForme[cf]}</span><span class="num muet">Forme ${Math.round(forme * 100)} %</span></div>
        <p class="voix" style="font-size:1.05rem">${esc(C.messageCoach(profil, etat, { forme }, aujourdhui()))}</p>
        ${explication('Comment se calculent ces scores ?', `<ul>
          <li><strong>Forme</strong> : moyenne de ton énergie, ton sommeil et l’inverse de tes courbatures (notes de 1 à 5 ci-dessous). Vert à partir de 67 % : on pousse. Jaune de 34 à 66 % : séance normale. Rouge sous 34 % : récupération active.</li>
          <li><strong>Semaine</strong> : séances faites depuis lundi sur ton objectif. ${b.serie ? `Tu as tenu ton objectif ${b.serie} semaine${b.serie > 1 ? 's' : ''} d’affilée.` : 'Atteins-le pour lancer une série.'}</li>
          <li><strong>Calories</strong> : ce que tu as mangé aujourd’hui sur ton objectif, sport compris. Détails dans l’onglet Calories.</li></ul>`)}
      </div>
      ${S.run ? '<button class="btn" data-a="aller" data-v="seance">Reprendre la séance en cours</button>' : ''}
      ${carteComplements(true)}
      <div class="plaque">
        <div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px"><h2>Comment tu te sens ?</h2><span class="num muet">Note de 1 à 5</span></div>
        <div class="champ"><span class="etiquette">Énergie</span>${echelle('energie', 'À plat', 'Au top')}</div>
        <div class="champ"><span class="etiquette">Sommeil cette nuit</span>${echelle('sommeil', 'Très mauvais', 'Excellent')}</div>
        <div class="champ"><span class="etiquette">Courbatures</span>${echelle('courbatures', 'Aucune', 'Partout')}</div>
        <div class="champ"><span class="etiquette">Temps disponible</span><div class="puces">${[15, 20, 30, 45, 60].map(m =>
          `<button class="puce" aria-pressed="${ck.duree === m}" data-a="checkin" data-c="duree" data-v="${m}">${m} min</button>`).join('')}</div></div>
      </div>
      <button class="btn" data-a="preparer">${dejaFaite ? 'Une autre séance ? Préparer' : 'Préparer ma séance'}</button>
    </div>`;
  },

  apercu() {
    const s = S.seance;
    const lignes = s.exercices.map((e, i) => {
      const prog = e.chaine ? C.etapeProgression(S.etat, e.chaine) : null;
      return `<div class="exo">
      <div class="item">
        <span class="code">${i + 1}</span>
        <div class="corps-item"><h3>${esc(e.nom)}</h3><span class="dosage">${dosage(e)}</span>
          ${e.chaine ? `<div class="tags"><span class="tag">${esc(C.MUSCLES[e.chaine] || '')}</span>${prog?.niveau ? `<span class="tag">Niveau ${prog.niveau}/${prog.total}</span>` : ''}</div>` : ''}</div>
        ${e.chaine ? `<button class="btn second petit" data-a="remplacer" data-v="${i}" aria-label="Remplacer ${esc(e.nom)}">Changer</button>` : ''}
      </div>
      ${explication('Comment le faire', `<p>${esc(e.consigne)}</p>${prog ? `<p><strong>Progression</strong> : ${esc(prog.reste)}${prog.suivante ? `, prochaine étape : ${esc(prog.suivante)}` : ''}.</p>` : ''}<p>Repos : ${e.repos} s entre les séries.</p>`)}
    </div>`;
    }).join('');
    const mob = l => l.map(m => `${esc(m.nom)} (${m.duree} s)`).join(' · ');
    return `<div class="ecran">
      <div><div class="etiquette">Séance du ${new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
      <h1>${esc(s.titre)}</h1><p class="muet num">≈ ${s.duree} min · forme ${Math.round(s.forme * 100)} %</p></div>
      <div class="plaque coach"><div class="etiquette">Pourquoi cette séance</div>
        <ul class="raisons">${(s.raisons.length ? s.raisons : ['Séance standard : tu es dans ta zone habituelle.']).map(r => `<li>${esc(r)}</li>`).join('')}</ul>
      </div>
      ${s.echauffement.length ? `<div class="plaque"><span class="etiquette">Échauffement</span><p>${mob(s.echauffement)}</p></div>` : ''}
      <div class="plaque"><span class="etiquette">Programme · ${s.exercices[0]?.repos || 30} s de repos entre les séries</span><div class="liste">${lignes}</div>
        <p class="muet" style="font-size:.85rem">Un exercice ne te plaît pas ? Change-le. Après deux refus, Veilleur ne te le propose plus.</p></div>
      ${s.retour.length ? `<div class="plaque"><span class="etiquette">Retour au calme</span><p>${mob(s.retour)}</p></div>` : ''}
      <button class="btn" data-a="lancer">Lancer la séance</button>
      <button class="btn second" data-a="aller" data-v="accueil">Retour</button>
    </div>`;
  },

  seance() {
    const r = S.run, s = r.seance;
    const liste = etapes(s);
    const e = liste[r.etape];
    const avance = Math.round((r.etape / liste.length) * 100);
    const haut = `<div style="display:flex;justify-content:space-between;align-items:center;gap:10px">
        <span class="etiquette">${esc(e.phase)}</span>
        <button class="btn second petit" data-a="abandon">Arrêter</button></div>
      <div class="barre"><i style="width:${avance}%"></i></div>`;
    const confirm = ui.confirmer === 'abandon' ? `<div class="plaque" style="border-color:var(--rouge)"><p>Arrêter la séance ? Ce que tu as déjà fait sera enregistré.</p>
      <div class="rangee-btn"><button class="btn danger petit" data-a="terminerTot">Arrêter et enregistrer</button><button class="btn second petit" data-a="annulerConfirm">Continuer</button></div></div>` : '';

    if (r.repos) {
      const suivante = liste[r.etape];
      const ex = suivante?.k === 'serie' ? s.exercices[suivante.i] : null;
      return `<div class="ecran">${haut}${confirm}
        <div class="plaque hud"><span class="etiquette">Récupération</span>
          <div class="cible" id="chrono">${format(Math.max(0, Math.ceil(((r.chrono?.fin || Date.now()) - Date.now()) / 1000)))}</div>
          <div class="barre" style="width:100%"><i id="chrono-barre" style="width:0"></i></div>
          <p class="muet">Ensuite : ${esc(ex ? `${ex.nom}, série ${suivante.s + 1}/${ex.series}` : suivante?.nom || 'fin')}</p></div>
        <div class="rangee-btn"><button class="btn second" data-a="plusRepos">+15 s</button><button class="btn" data-a="finRepos">Je suis prêt</button></div>
      </div>`;
    }

    if (e.k === 'mobi') {
      const enCours = !!r.chrono;
      return `<div class="ecran">${haut}${confirm}
        <div class="plaque hud"><h2>${esc(e.nom)}</h2>
          <div class="cible" id="chrono">${enCours ? format(Math.ceil((r.chrono.fin - Date.now()) / 1000)) : e.duree}</div><span class="unite">secondes</span>
          <div class="barre" style="width:100%"><i id="chrono-barre" style="width:0"></i></div></div>
        ${enCours ? '<button class="btn second" data-a="suivant">Passer</button>' : '<button class="btn" data-a="chronoMobi">Démarrer</button><button class="btn second" data-a="suivant">Passer</button>'}
      </div>`;
    }

    const ex = s.exercices[e.i];
    const val = r.saisie ?? ex.cible;
    const temps = ex.mode === 'temps';
    const enCours = !!r.chrono;
    return `<div class="ecran">${haut}${confirm}
      <div class="plaque hud">
        <span class="etiquette">Série ${e.s + 1} / ${ex.series}</span>
        <h2 style="font-size:1.45rem">${esc(ex.nom)}</h2>
        ${ex.chaine ? `<div class="tags" style="justify-content:center"><span class="tag">${esc(C.MUSCLES[ex.chaine] || '')}</span></div>` : ''}
        ${temps && enCours
          ? `<div class="cible" id="chrono">${format(Math.ceil((r.chrono.fin - Date.now()) / 1000))}</div><span class="unite">tiens bon</span><div class="barre" style="width:100%"><i id="chrono-barre" style="width:0"></i></div>`
          : `${ex.mode === 'charge' ? blocCharge(r, e, ex) : ''}<div class="cible num">${val}</div><span class="unite">${temps ? 'secondes' : 'répétitions'}${val !== ex.cible ? ` · objectif ${ex.cible}` : ''}</span>
             <div class="reglage"><button class="rond" data-a="saisie" data-v="-1" aria-label="Moins">−</button><span class="muet" style="font-size:.85rem;max-width:12ch">${temps ? 'Ajuste si tu as lâché avant' : 'Ajuste à ce que tu as vraiment fait'}</span><button class="rond" data-a="saisie" data-v="1" aria-label="Plus">+</button></div>`}
        <p class="muet" style="font-size:.92rem">${esc(ex.consigne)}</p>
      </div>
      ${temps && !enCours ? '<button class="btn" data-a="chronoSerie">Démarrer le chrono</button>' : ''}
      ${temps && enCours ? '<button class="btn second" data-a="stopChrono">J’ai lâché</button>' : ''}
      ${!enCours ? `<button class="btn ${temps ? 'second' : ''}" data-a="validerSerie">Série validée</button>` : ''}
    </div>`;
  },

  bilan() {
    const r = S.run;
    if (ui.resultat) {
      const { changements, message } = ui.resultat;
      const signe = { monte: '▲', plus: '+', moins: '−', descend: '▼', max: '★' };
      return `<div class="ecran">
        <div><div class="etiquette">Rapport enregistré</div><h1>Séance terminée</h1></div>
        <div class="plaque coach"><p class="voix">${esc(message)}</p></div>
        <div class="plaque"><h2>Ce que Veilleur a ajusté</h2>
          <div class="changements">${changements.length ? changements.map(c => `<div class="chgt ${c.type}"><b>${signe[c.type]}</b><span>${esc(c.texte)}</span></div>`).join('')
            : '<p class="muet">Rien à changer : tu étais pile dans ta zone. On garde ce dosage.</p>'}</div></div>
        <button class="btn" data-a="aller" data-v="accueil">Retour au QG</button>
      </div>`;
    }
    return `<div class="ecran">
      <div><div class="etiquette">Débriefing</div><h1>Comment c’était ?</h1></div>
      <div class="plaque"><p class="muet">Ta réponse règle la difficulté des prochaines séances.</p>
        <div class="champ">${C.RESSENTIS.map((t, i) => `<button class="puce" style="text-align:left" aria-pressed="${r.ressenti === i}" data-a="ressenti" data-v="${i}">${t}</button>`).join('')}</div></div>
      <button class="btn" data-a="enregistrerSeance" ${r.ressenti == null ? 'disabled style="opacity:.4"' : ''}>Enregistrer</button>
    </div>`;
  },

  progres() {
    const { etat, profil } = S;
    const h = etat.historique;
    const b = C.bilanSemaine(profil, etat, aujourdhui());
    const sem = C.semainesRecentes(etat, aujourdhui());
    const max = Math.max(profil.seancesSemaine, ...sem.map(x => x.seances));
    const W = 320, H = 140, bw = 26, pas = (W - 30) / sem.length;
    const y = v => 112 - (v / max) * 96;
    const barres = sem.map((x, i) => {
      const xx = 30 + i * pas + (pas - bw) / 2;
      const d = new Date(x.semaine + 'T12:00:00');
      return `<rect x="${xx}" y="${y(x.seances)}" width="${bw}" height="${112 - y(x.seances)}" fill="${x.seances >= profil.seancesSemaine ? 'var(--bleu)' : 'var(--trait)'}"/>
        ${x.seances ? `<text x="${xx + bw / 2}" y="${y(x.seances) - 5}" text-anchor="middle" style="fill:var(--texte)">${x.seances}</text>` : ''}
        <text x="${xx + bw / 2}" y="128" text-anchor="middle">${d.getDate()}/${d.getMonth() + 1}</text>`;
    }).join('');
    const ligneObj = `<line x1="28" x2="${W}" y1="${y(profil.seancesSemaine)}" y2="${y(profil.seancesSemaine)}" stroke="var(--gris)" stroke-dasharray="3 4"/><text x="0" y="${y(profil.seancesSemaine) + 3}">obj ${profil.seancesSemaine}</text>`;
    const utilisees = C.CHAINES.filter(c => etat.usage[c.id]);
    const niveaux = utilisees.map(c => {
      const st = etat.chaines[c.id];
      if (c.mode === 'charge') return `<div class="niveau"><span>${esc(c.variantes[0])}</span><span class="num muet">${st.charge ? `${st.charge} kg × ${st.cible}` : 'charge à trouver'}</span></div>`;
      const pr = C.etapeProgression(etat, c.id);
      return `<div class="niveau"><span>${esc(c.variantes[st.rang])}<br><small class="muet">${esc(pr.suivante ? `Ensuite : ${pr.suivante}` : pr.reste)}</small></span><span class="num muet">${c.mode === 'temps' ? (st.cible >= 60 ? `${format(st.cible)} min` : `${st.cible} s`) : `${st.cible} rép.`}</span>
        <div class="crans">${c.variantes.map((_, i) => `<span class="${i <= st.rang ? 'on' : ''}"></span>`).join('')}</div></div>`;
    }).join('');
    return `<div class="ecran">
      ${entete()}
      <h1>Progrès</h1>
      <div class="stats">
        <div class="stat"><span class="etiquette">Séances</span><span class="num">${h.length}</span></div>
        <div class="stat"><span class="etiquette">Minutes</span><span class="num">${h.reduce((a, x) => a + (x.minutes || 0), 0)}</span></div>
        <div class="stat"><span class="etiquette">Niveaux gagnés</span><span class="num">${etat.records}</span></div>
        <div class="stat"><span class="etiquette">Charge actuelle</span><span class="num">${Math.round(etat.charge * 100)} %</span></div>
      </div>
      <div class="plaque">${explication('Que veulent dire ces chiffres ?', `<ul>
        <li><strong>Niveaux gagnés</strong> : chaque fois que tu dépasses ${'15'} répétitions (ou 60 secondes) sur un exercice, Veilleur te fait passer à une variante plus dure.</li>
        <li><strong>Charge</strong> : l’intensité de base de tes séances. Elle démarre à 100 %, monte quand tu trouves les séances faciles et baisse quand elles sont trop dures (entre 70 et 130 %).</li>
        <li><strong>Pourcentage du journal</strong> : ce que tu as réellement fait par rapport à ce qui était prévu.</li></ul>`)}</div>
      <div class="plaque"><h2>8 dernières semaines</h2>
        <div style="overflow-x:auto"><svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Séances par semaine">${ligneObj}${barres}</svg></div>
        <p class="muet" style="font-size:.85rem">${b.serie ? `Série en cours : ${b.serie} semaine${b.serie > 1 ? 's' : ''}.` : 'En jaune : semaines où tu as tenu ton objectif.'}</p></div>
      <div class="plaque"><h2>Tes progressions</h2>
        ${niveaux || '<p class="muet">Fais ta première séance : tes niveaux s’afficheront ici.</p>'}</div>
      <div class="plaque"><h2>Journal</h2><div class="liste">${h.slice(-10).reverse().map(x => `<div class="item">
        <div class="corps-item"><h3>${esc(x.titre || 'Séance')}</h3><span class="muet num" style="font-size:.85rem">${new Date(x.date + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} · ${x.minutes} min · ${C.RESSENTIS[x.ressenti] || ''}</span></div>
        <span class="dosage" style="color:${x.reussite >= 95 ? 'var(--vert)' : 'var(--texte)'}">${x.reussite} %</span></div>`).join('') || '<p class="muet">Aucune séance pour l’instant.</p>'}</div></div>
    </div>`;
  },

  calories() {
    const p = S.profil;
    if (!N.profilCaloriesComplet(p)) {
      return `<div class="ecran">${entete()}<h1>Calories</h1>
        <div class="plaque coach"><p class="voix">Pour calculer ton objectif, j’ai besoin de ton âge, ta taille, ton poids et ton activité.</p></div>
        <button class="btn" data-a="modifierProfil">Compléter mon profil</button></div>`;
    }
    const j = aujourdhui();
    const b = N.bilanJour(p, S.nutri, S.etat.historique, j);
    const ratio = Math.min(1, b.total.kcal / b.cible);
    const depasse = b.reste < 0;
    const anneauCal = `<div style="width:190px;max-width:100%">${anneau(ratio, depasse ? 'var(--rouge)' : 'var(--orange)', String(Math.abs(b.reste)), depasse ? 'kcal en trop' : 'kcal restantes')}</div>`;
    const macro = (nom, val, cible, cls, unite = 'g') => `<div class="macro ${cls}"><div class="macro-tete"><span class="etiquette">${nom}</span><span class="num">${Math.round(val)} / ${cible} ${unite}</span></div>
      <div class="barre"><i style="width:${Math.min(100, (val / cible) * 100)}%"></i></div></div>`;
    const parRepas = Object.entries(N.REPAS).map(([k, nom]) => {
      const items = b.entrees.filter(e => e.repas === k);
      if (!items.length) return '';
      return `<div class="groupe-repas"><div class="macro-tete"><span class="etiquette">${nom}</span><span class="num muet">${items.reduce((a, e) => a + e.kcal, 0)} kcal · ${Math.round(items.reduce((a, e) => a + e.p, 0))} g protéines</span></div>
        ${items.map(e => `<div class="item"><div class="corps-item"><h3>${esc(e.nom)}</h3><span class="muet num" style="font-size:.85rem">${e.grammes ? `${e.grammes} g · ` : ''}P ${e.p} · G ${e.g} · L ${e.l}${e.source === 'photo' ? ' · photo' : ''}</span></div>
          <span class="dosage">${e.kcal}</span><button class="rond mini" data-a="supprimerEntree" data-v="${e.id}" aria-label="Supprimer ${esc(e.nom)}">×</button></div>`).join('')}</div>`;
    }).join('');
    const pesees = [...S.nutri.pesees].sort((a, x) => a.date.localeCompare(x.date));
    const derniere = pesees.at(-1), avant = pesees.at(-2);
    const sem = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - 6 + i); const k = C.jour(d); return { k, d, kcal: S.nutri.journal.filter(e => e.date === k).reduce((a, e) => a + e.kcal, 0) }; });
    const maxK = Math.max(b.cible * 1.2, ...sem.map(x => x.kcal));
    const yK = v => 90 - (v / maxK) * 80;
    const barres = sem.map((x, i) => `<rect x="${12 + i * 44}" y="${yK(x.kcal)}" width="26" height="${90 - yK(x.kcal)}" fill="${x.k === j ? 'var(--orange)' : 'var(--trait)'}"/>
      <text x="${25 + i * 44}" y="106" text-anchor="middle">${x.d.toLocaleDateString('fr-FR', { weekday: 'narrow' })}</text>`).join('');
    return `<div class="ecran">
      ${entete()}
      <h1>Calories</h1>
      <div class="plaque hud">
        ${anneauCal}
        <div class="equation num"><span>${b.obj.kcal}<small>objectif</small></span><b>+</b><span>${b.sport}<small>sport</small></span><b>−</b><span>${b.total.kcal}<small>mangé</small></span></div>
      </div>
      <div class="plaque">${macro('Protéines', b.total.p, b.obj.p, 'p')}${macro('Glucides', b.total.g, b.obj.g, 'g')}${macro('Lipides', b.total.l, b.obj.l, 'l')}
        ${explication('D’où viennent ces chiffres ?', `<ul>
          <li><strong>Entretien : ${b.obj.entretien} kcal</strong>. Ce que ton corps dépense par jour, calculé avec la formule de Mifflin-St Jeor (poids ${b.obj.poids} kg, taille, âge, sexe) multipliée par ton activité quotidienne.</li>
          <li><strong>Objectif : ${b.obj.kcal} kcal</strong>. ${{ perte: 'Entretien −15 % pour perdre du gras sans perdre de muscle.', muscle: 'Entretien +10 % pour construire du muscle.', endurance: 'Entretien +5 % pour soutenir l’entraînement.', forme: 'Égal à ton entretien pour rester stable.' }[p.objectif]}${S.nutri.ajustement ? ` Corrigé de ${S.nutri.ajustement > 0 ? '+' : ''}${S.nutri.ajustement} kcal d’après tes pesées.` : ''}</li>
          <li><strong>Sport : +${b.sport} kcal</strong>. Les séances du jour te donnent des calories en plus.</li>
          <li><strong>Protéines</strong> : ${['muscle', 'perte'].includes(p.objectif) ? '2' : '1,6'} g par kg de poids. <strong>Lipides</strong> : 0,9 g par kg. <strong>Glucides</strong> : le reste.</li></ul>`)}</div>
      <label class="btn" for="photo" role="button" tabindex="0">Photographier mon repas</label>
      <input type="file" id="photo" accept="image/*" capture="environment" hidden>
      <div class="rangee-btn">
        <label class="btn second petit" for="galerie" role="button" tabindex="0" style="text-align:center">Photo existante</label>
        <input type="file" id="galerie" accept="image/*" hidden>
        <button class="btn second petit" data-a="ouvrirAjout">Ajouter à la main</button>
      </div>
      ${ui.moteur ? '' : '<p class="muet" style="font-size:.88rem">Pour que les photos se calculent toutes seules, ajoute ta clé API Claude dans <button class="lien" data-a="aller" data-v="reglages">Profil</button>.</p>'}
      ${carteComplements(false)}
      <div class="plaque"><h2>Aujourd’hui</h2>${parRepas || '<p class="muet">Rien de noté. Prends ton prochain repas en photo.</p>'}</div>
      <div class="plaque"><h2>7 derniers jours</h2>
        <svg viewBox="0 0 320 112" width="100%" role="img" aria-label="Calories des 7 derniers jours">
          <line x1="0" x2="320" y1="${yK(b.cible)}" y2="${yK(b.cible)}" stroke="var(--gris)" stroke-dasharray="3 4"/>${barres}</svg>
        <p class="muet" style="font-size:.85rem">Pointillés : ton objectif du jour (${b.cible} kcal avec le sport).</p></div>
      <div class="plaque"><h2>Pesée</h2>
        ${derniere ? `<p><span class="grand-chiffre">${derniere.kg}<small> kg</small></span> ${avant ? `<span class="num" style="color:${derniere.kg <= avant.kg ? 'var(--vert)' : 'var(--rouge)'}">${derniere.kg > avant.kg ? '+' : ''}${(derniere.kg - avant.kg).toFixed(1)} kg</span>` : ''}</p>` : ''}
        <div class="rangee-btn"><input type="number" inputmode="decimal" step="0.1" min="30" max="250" id="pesee" placeholder="Poids du jour (kg)" value="${esc(ui.pesee ?? '')}"><button class="btn petit" data-a="peser">Noter</button></div>
        <p class="muet" style="font-size:.85rem">Pèse-toi le matin, une à deux fois par semaine. Toutes les deux semaines, Veilleur compare ta courbe à ton objectif et corrige tes calories.${S.nutri.ajustement ? ` Correction actuelle : ${S.nutri.ajustement > 0 ? '+' : ''}${S.nutri.ajustement} kcal.` : ''}</p></div>
    </div>`;
  },

  analyse() {
    const a = ui.analyse;
    const tete = `<div><div class="etiquette">Analyse de repas</div><h1>${a.resultat ? 'Voilà ce que je vois' : a.erreur ? 'Analyse impossible' : 'Analyse en cours'}</h1></div>
      ${a.apercu ? `<img class="photo-repas" src="${a.apercu}" alt="Photo du repas">` : ''}`;
    if (a.erreur) {
      return `<div class="ecran">${tete}
        <div class="plaque" style="border-color:var(--rouge)"><p>${esc(a.erreur)}</p></div>
        ${a.code === 'aucun_moteur' || a.code === 'cle' ? '<button class="btn" data-a="aller" data-v="reglages">Ajouter ma clé API</button>' : a.blob ? '<button class="btn" data-a="relancerAnalyse">Réessayer</button>' : ''}
        <button class="btn second" data-a="ouvrirAjout">Saisir à la main</button>
        <button class="btn second" data-a="aller" data-v="calories">Retour</button></div>`;
    }
    if (!a.resultat) {
      return `<div class="ecran">${tete}
        <div class="plaque hud"><div class="scan"><i></i></div><p class="muet">Identification des aliments et estimation des portions… Ça prend en général 10 à 30 secondes.</p></div>
        <button class="btn second" data-a="annulerAnalyse">Annuler</button></div>`;
    }
    const r = a.resultat;
    const total = r.aliments.reduce((t, x) => t + x.kcal, 0);
    return `<div class="ecran">${tete}
      <div class="plaque">
        <div class="macro-tete"><h2>${total} kcal</h2><span class="pastille ${r.confiance}">Confiance ${r.confiance}</span></div>
        ${r.remarque ? `<p class="muet" style="font-size:.9rem">${esc(r.remarque)}</p>` : ''}
        <div class="liste">${r.aliments.map((x, i) => `<div class="item">
          <div class="corps-item"><h3>${esc(x.nom)}</h3><span class="muet num" style="font-size:.85rem">${x.kcal} kcal · P ${x.p} · G ${x.g} · L ${x.l}</span></div>
          <div class="quantite"><button class="rond mini" data-a="grammes" data-v="${i}" data-c="-1" aria-label="Moins">−</button><span class="num">${x.grammes} g</span><button class="rond mini" data-a="grammes" data-v="${i}" data-c="1" aria-label="Plus">+</button></div>
          <button class="rond mini" data-a="retirerAliment" data-v="${i}" aria-label="Retirer ${esc(x.nom)}">×</button>
        </div>`).join('') || '<p class="muet">Aucun aliment reconnu.</p>'}</div>
        <p class="muet" style="font-size:.85rem">Corrige les quantités si besoin : les calories suivent.</p>
      </div>
      <div class="champ"><span class="etiquette">Repas</span>${puceRepas()}</div>
      ${r.aliments.length ? '<button class="btn" data-a="validerAnalyse">Ajouter au journal</button>' : ''}
      <button class="btn second" data-a="ouvrirAjout">Ajouter un aliment à la main</button>
      <button class="btn second" data-a="aller" data-v="calories">Annuler</button>
    </div>`;
  },

  ajout() {
    const c = ui.choix;
    return `<div class="ecran">
      <div><div class="etiquette">Saisie manuelle</div><h1>Ajouter un aliment</h1></div>
      <label class="champ"><span class="etiquette">Rechercher</span><input type="text" id="recherche" placeholder="Ex. riz, poulet, banane" value="${esc(ui.recherche)}" autocomplete="off"></label>
      <div class="plaque"><div class="liste" id="resultats">${resultatsHtml()}</div></div>
      ${c ? `<div class="plaque coach"><h3>${esc(c.aliment.nom)}</h3>
        <div class="reglage"><button class="rond" data-a="grammesChoix" data-v="-10" aria-label="Moins">−</button>
          <div style="text-align:center"><div class="grand-chiffre">${c.grammes}<small> g</small></div><span class="num muet">${N.portion(c.aliment, c.grammes).kcal} kcal</span></div>
          <button class="rond" data-a="grammesChoix" data-v="10" aria-label="Plus">+</button></div>
        <div class="champ"><span class="etiquette">Repas</span>${puceRepas()}</div>
        <button class="btn" data-a="ajouterChoix">Ajouter</button></div>` : ''}
      <div class="plaque"><span class="etiquette">Pas dans la liste ?</span>
        <div class="rangee-btn"><input type="text" id="libreNom" placeholder="Nom" value="${esc(ui.libre.nom)}"><input type="number" inputmode="numeric" id="libreKcal" placeholder="kcal" value="${esc(ui.libre.kcal)}" style="max-width:110px"></div>
        <button class="btn second petit" data-a="ajouterLibre">Ajouter ces calories</button></div>
      <button class="btn second" data-a="${ui.analyse?.resultat ? 'retourAnalyse' : 'aller'}" data-v="calories">Retour</button>
    </div>`;
  },

  complements() {
    const l = S.complements.liste;
    const natif = !!notifs();
    const etatNotifs = !natif ? '<p class="muet" style="font-size:.9rem">Les notifications sonnent sur ton téléphone avec l’appli installée. Ici, tes rappels s’affichent dans l’onglet Ce soir et dans Calories.</p>'
      : ui.permNotifs === 'granted' ? `<p class="muet" style="font-size:.9rem">Notifications actives : ${[...new Set(l.filter(c => c.actif).map(c => c.heure))].sort().join(', ') || 'aucune'}.</p>`
      : l.length ? '<button class="btn second petit" data-a="autoriserNotifs">Autoriser les notifications</button><p class="muet" style="font-size:.85rem">Sans autorisation, Veilleur ne peut pas te prévenir à l’heure.</p>' : '';
    const deja = new Set(l.map(c => c.nom));
    return `<div class="ecran">
      <div><div class="etiquette">Rappels</div><h1>Mes compléments</h1></div>
      ${l.length ? `<div class="plaque"><div class="liste">${l.map(c => `<div class="item complement">
        <div class="corps-item"><h3>${esc(c.nom)}</h3>
          <div class="rangee-btn" style="margin-top:8px"><input type="time" id="heure-${c.id}" value="${esc(c.heure)}" aria-label="Heure de prise ${esc(c.nom)}"><input type="text" id="dose-${c.id}" value="${esc(c.dose)}" placeholder="Dose" aria-label="Dose ${esc(c.nom)}"></div></div>
        <div style="display:flex;flex-direction:column;gap:8px;align-items:flex-end">
          <button class="interrupteur" data-a="activerComplement" data-v="${c.id}" aria-pressed="${c.actif}" aria-label="Rappel ${esc(c.nom)}"><i></i></button>
          <button class="lien" data-a="supprimerComplement" data-v="${c.id}">Supprimer</button></div>
      </div>`).join('')}</div>${etatNotifs}</div>` : ''}
      <div class="plaque"><h2>Ajouter</h2>
        <div class="puces">${K.MODELES.filter(m => !deja.has(m.nom)).map(m => `<button class="puce" data-a="ajouterComplement" data-v="${esc(m.nom)}">+ ${esc(m.nom)}</button>`).join('')}</div>
        <div class="rangee-btn"><input type="text" id="nomComplement" placeholder="Autre complément" value="${esc(ui.nomComplement || '')}"><button class="btn petit" data-a="ajouterAutre" style="flex:none">Ajouter</button></div>
      </div>
      <div class="plaque">${explication('Bien prendre ses compléments', `<ul>${K.MODELES.map(m => `<li><strong>${m.nom}</strong> (${m.dose}) : ${m.conseil}</li>`).join('')}
        <li>Les compléments ne remplacent pas une alimentation variée. En cas de traitement médical ou de doute, demande l’avis d’un médecin ou d’un pharmacien.</li></ul>`)}</div>
      <button class="btn second" data-a="aller" data-v="${ui.retourComplements || 'calories'}">Retour</button>
    </div>`;
  },

  reglages() {
    const p = S.profil;
    const conf = ui.confirmer === 'reset' ? `<div class="plaque" style="border-color:var(--rouge)"><p>Tout effacer ? Ton profil, tes niveaux et ton journal seront supprimés de ce téléphone.</p>
      <div class="rangee-btn"><button class="btn danger petit" data-a="reset">Tout effacer</button><button class="btn second petit" data-a="annulerConfirm">Annuler</button></div></div>` : '';
    const ligne = (k, v) => `<div class="item"><span class="etiquette" style="min-width:110px">${k}</span><span class="corps-item">${esc(v)}</span></div>`;
    return `<div class="ecran">
      ${entete()}
      <h1>Profil</h1>
      <div class="plaque"><div class="liste">
        ${ligne('Nom', p.prenom)}${ligne('Objectif', C.OBJECTIFS[p.objectif].nom)}${ligne('Niveau', C.NIVEAUX[p.niveau])}
        ${ligne('Rythme', `${p.seancesSemaine} séances × ${p.duree} min`)}${ligne('Matériel', p.materiel.map(m => C.MATERIELS[m]).join(', ') || 'Poids du corps')}
        ${ligne('À ménager', p.zones.map(z => C.ZONES[z]).join(', ') || 'Rien')}${ligne('Ton', C.TONS[p.ton])}
        ${ligne('Corps', N.profilCaloriesComplet(p) ? `${N.SEXES[p.sexe]}, ${p.age} ans, ${p.taille} cm, ${p.poids} kg` : 'À compléter pour les calories')}
      </div></div>
      <button class="btn" data-a="modifierProfil">Modifier mon profil</button>
      <button class="btn second" data-a="aller" data-v="complements">Rappels de compléments</button>
      ${Object.keys(S.etat.nonAime).filter(k => S.etat.nonAime[k] >= 2).length ? `<div class="plaque"><span class="etiquette">Exercices écartés</span><p>${Object.keys(S.etat.nonAime).filter(k => S.etat.nonAime[k] >= 2).map(k => esc(C.chaine(k).variantes[0])).join(', ')}</p><button class="btn second petit" data-a="pardonner">Les reproposer</button></div>` : ''}
      <div class="plaque"><span class="etiquette">Comment Veilleur s’adapte</span>
        <ul class="raisons"><li>Ton état du jour règle l’intensité et le nombre de séries.</li><li>Ce que tu réussis vraiment fait monter ou descendre chaque exercice, jusqu’à la variante suivante.</li><li>Ton ressenti ajuste la charge globale des séances suivantes.</li><li>Après une longue pause, la reprise est plus douce.</li></ul></div>
      <div class="plaque"><span class="etiquette">Analyse des photos de repas</span>
        ${ui.moteur === 'claude' ? '<p>Active : les photos sont analysées par Claude avec ton compte claude.ai.</p>' : `
        <p>Pour que les calories se calculent toutes seules à partir d’une photo, colle ta clé API Claude (console.anthropic.com → API Keys). Elle reste sur ce téléphone et n’est envoyée qu’au service Claude.</p>
        <label class="champ"><span class="etiquette">Clé API Claude</span><input type="password" id="cleApi" autocomplete="off" spellcheck="false" placeholder="sk-ant-…" value="${esc(S.nutri.cleApi)}"></label>
        <div class="rangee-btn"><button class="btn petit" data-a="enregistrerCle">Enregistrer la clé</button>${S.nutri.cleApi ? '<button class="btn second petit" data-a="oublierCle">Retirer</button>' : ''}</div>
        <p class="muet" style="font-size:.85rem">${ui.moteur === 'cle' ? 'Clé enregistrée : analyse photo active.' : 'Sans clé, tu peux toujours ajouter tes repas à la main.'} Chaque analyse coûte environ 1 à 2 centimes sur ton compte API.</p>`}
      </div>
      ${conf}
      <button class="btn second" data-a="demanderReset">Effacer mes données</button>
    </div>`;
  },
};

function carteComplements(compact) {
  const jour = K.etatDuJour(S.complements.liste, S.complements.pris, aujourdhui(), heureMaintenant());
  if (!jour.length) {
    return compact ? '' : `<div class="plaque"><h2>Compléments</h2><p class="muet">Créatine, whey, vitamines… Programme un rappel et coche chaque prise.</p><button class="btn second petit" data-a="aller" data-v="complements">Créer un rappel</button></div>`;
  }
  const libelle = { pris: 'Pris', maintenant: 'À prendre', 'plus-tard': 'Plus tard' };
  return `<div class="plaque"><div class="macro-tete"><h2>Compléments du jour</h2><button class="lien" data-a="aller" data-v="complements">Gérer</button></div>
    <div class="liste">${jour.map(c => `<div class="item">
      <button class="coche ${c.statut === 'pris' ? 'on' : ''}" data-a="prendre" data-v="${c.id}" aria-pressed="${c.statut === 'pris'}" aria-label="${esc(c.nom)} pris">${c.statut === 'pris' ? '✓' : ''}</button>
      <div class="corps-item"><h3>${esc(c.nom)}${c.dose ? ` <span class="muet" style="font-weight:400">· ${esc(c.dose)}</span>` : ''}</h3>
        <span class="muet num" style="font-size:.85rem">${c.heure}${(n => (n > 1 ? ` · ${n} jours d’affilée` : ''))(K.serie(c.id, S.complements.pris, aujourdhui()))}</span></div>
      <span class="pastille ${c.statut === 'pris' ? 'haute' : c.statut === 'maintenant' ? 'moyenne' : ''}">${libelle[c.statut]}</span></div>`).join('')}</div></div>`;
}

function puceRepas() {
  return `<div class="puces">${Object.entries(N.REPAS).map(([k, v]) => `<button class="puce" aria-pressed="${ui.repas === k}" data-a="choisirRepas" data-v="${k}">${v}</button>`).join('')}</div>`;
}
function resultatsHtml() {
  const l = N.chercherAliment(ui.recherche);
  if (!l.length) return '<p class="muet">Aucun résultat. Utilise la saisie libre en dessous.</p>';
  return l.map(a => `<button class="item choix-aliment" data-a="choisirAliment" data-v="${esc(a.nom)}"><span class="corps-item"><h3>${esc(a.nom)}</h3><span class="muet num" style="font-size:.85rem">${a.kcal} kcal / 100 g · portion ${a.portion} g</span></span><span class="dosage">${N.portion(a, a.portion).kcal}</span></button>`).join('');
}
let idSeq = 0;
const nouvelId = () => `${Date.now().toString(36)}${(idSeq++).toString(36)}`;
function noter(entrees, source) {
  const date = aujourdhui();
  for (const e of entrees) S.nutri.journal.push({ id: nouvelId(), date, repas: ui.repas, source, nom: e.nom, grammes: e.grammes || null, kcal: Math.round(e.kcal), p: e.p || 0, g: e.g || 0, l: e.l || 0 });
  // On ne garde que 120 jours de journal sur le téléphone.
  const limite = new Date(); limite.setDate(limite.getDate() - 120);
  S.nutri.journal = S.nutri.journal.filter(e => e.date >= C.jour(limite));
  sauver();
}

function entete() {
  return `<header class="entete"><div class="marque">${VISIERE}Veilleur</div><span class="statut">${dateLongue()}</span></header>`;
}

function nav() {
  if (!S.profil || ['formulaire', 'seance', 'bilan', 'apercu', 'analyse', 'ajout', 'complements'].includes(ui.ecran)) return '';
  const o = (id, ecran, label) => `<button class="onglet" data-a="aller" data-v="${ecran}" ${ui.ecran === ecran ? 'aria-current="page"' : ''}>${ICONES[id]}${label}</button>`;
  return `<nav class="bas"><div class="interieur">${o('ce_soir', 'accueil', 'Ce soir')}${o('calories', 'calories', 'Calories')}${o('progres', 'progres', 'Progrès')}${o('profil', 'reglages', 'Profil')}</div></nav>`;
}

function render() {
  if ((ui.ecran === 'seance' || (ui.ecran === 'bilan' && !ui.resultat)) && !S.run) ui.ecran = S.profil ? 'accueil' : 'intro';
  if (ui.ecran === 'seance' && S.run.etape >= etapes(S.run.seance).length) ui.ecran = 'bilan';
  app.innerHTML = ecrans[ui.ecran]() + nav() + (ui.toast ? `<div class="toast" role="status">${esc(ui.toast)}</div>` : '');
  if (S.run?.chrono) minuteur();
}
function aller(ecran) { if (ecran === 'complements' && ui.ecran !== 'complements') ui.retourComplements = ['accueil', 'calories', 'reglages'].includes(ui.ecran) ? ui.ecran : 'calories'; ui.ecran = ecran; ui.confirmer = null; render(); window.scrollTo(0, 0); }
function toast(t) { ui.toast = t; render(); setTimeout(() => { ui.toast = ''; render(); }, 2200); }

// ---------- actions ----------
const actions = {
  aller: v => aller(v),
  nouveauProfil() {
    ui.brouillon = { prenom: '', objectif: 'forme', niveau: 'debutant', seancesSemaine: 3, duree: 30, materiel: [], zones: [], ton: 'motivant', sexe: null, age: null, taille: null, poids: null, activite: 'assis' };
    aller('formulaire');
  },
  modifierProfil() { ui.brouillon = structuredClone(S.profil); aller('formulaire'); },
  exemple() {
    const ex = C.exemple(aujourdhui());
    S = { ...ex, nutri: { ...N.exempleNutrition(aujourdhui()), cleApi: S.nutri?.cleApi || '' }, complements: { liste: [K.nouveauComplement(K.MODELES[0], 'exCrea'), K.nouveauComplement(K.MODELES[1], 'exWhey')], pris: {} } };
    sauver(); aller('accueil'); toast('Profil exemple chargé : Alex, 7 séances et des repas');
  },
  choisir(v, c) { ui.brouillon[c] = ['seancesSemaine', 'duree'].includes(c) ? Number(v) : v; render(); },
  basculer(v, c) { const l = ui.brouillon[c]; ui.brouillon[c] = l.includes(v) ? l.filter(x => x !== v) : [...l, v]; render(); },
  enregistrerProfil() {
    const p = { ...ui.brouillon, prenom: ui.brouillon.prenom.trim() };
    for (const k of ['age', 'taille', 'poids']) p[k] = Number(p[k]) || null;
    if (!p.prenom) { toast('Indique ton prénom pour que le coach te parle'); document.getElementById('prenom')?.focus(); return; }
    if (!S.profil || S.profil.niveau !== p.niveau && !S.etat?.historique.length) S.etat = C.etatInitial(p);
    S.profil = p; S.seance = null; sauver(); aller('accueil');
  },
  checkin(v, c) { S.checkin[c] = Number(v); sauver(); render(); },
  preparer() { S.seance = C.genererSeance(S.profil, S.etat, S.checkin, aujourdhui()); sauver(); aller('apercu'); },
  remplacer(v) {
    const r = C.remplacerExercice(S.profil, S.etat, S.seance, Number(v));
    if (r.aucun) { S.etat = r.etat; toast('Aucune alternative avec ton matériel'); return; }
    S.seance = r.seance; S.etat = r.etat; sauver(); render();
  },
  lancer() {
    bip(520, 60);
    S.run = { seance: S.seance, etape: 0, resultats: S.seance.exercices.map(() => []), charges: [], debut: Date.now(), repos: false, chrono: null, saisie: null, ressenti: null };
    sauver(); garderEcran(true); aller('seance');
  },
  saisie(v) {
    const r = S.run, ex = r.seance.exercices[etapes(r.seance)[r.etape].i];
    const pas = ex.mode === 'temps' ? 5 : 1;
    r.saisie = Math.max(0, (r.saisie ?? ex.cible) + Number(v) * pas); sauver(); render();
  },
  charge(v) {
    const r = S.run, e = etapes(r.seance)[r.etape], ex = r.seance.exercices[e.i];
    r.charges ||= [];
    const kg = r.charges[e.i] ?? ex.charge;
    r.charges[e.i] = kg ? Math.max(ex.pasKg, Math.round((kg + Number(v) * ex.pasKg) * 10) / 10) : 10;
    sauver(); render();
  },
  chronoMobi() { lancerChrono(etapes(S.run.seance)[S.run.etape].duree, 'suivant'); render(); },
  chronoSerie() {
    const ex = S.run.seance.exercices[etapes(S.run.seance)[S.run.etape].i];
    S.run.chronoDebut = Date.now(); S.run.saisie = null;
    lancerChrono(ex.cible, 'finChronoSerie'); render();
  },
  finChronoSerie() { const ex = S.run.seance.exercices[etapes(S.run.seance)[S.run.etape].i]; S.run.saisie = ex.cible; sauver(); render(); },
  stopChrono() {
    const r = S.run; const tenu = Math.round((Date.now() - r.chronoDebut) / 1000);
    r.chrono = null; clearInterval(tic); r.saisie = Math.floor(tenu / 5) * 5; sauver(); render();
  },
  validerSerie() {
    const r = S.run, liste = etapes(r.seance), e = liste[r.etape], ex = r.seance.exercices[e.i];
    r.resultats[e.i][e.s] = r.saisie ?? ex.cible;
    r.saisie = null; vibre(40);
    r.etape++;
    if (r.etape >= liste.length) return actions.finSeance();
    r.repos = true; lancerChrono(ex.repos, 'finRepos'); render();
  },
  plusRepos() { if (S.run.chrono) { S.run.chrono.fin += 15000; S.run.chrono.total += 15; sauver(); } },
  finRepos() { S.run.repos = false; S.run.chrono = null; clearInterval(tic); sauver(); render(); },
  suivant() {
    const r = S.run; r.chrono = null; clearInterval(tic);
    r.etape++;
    if (r.etape >= etapes(r.seance).length) return actions.finSeance();
    sauver(); render();
  },
  abandon() { ui.confirmer = 'abandon'; render(); },
  annulerConfirm() { ui.confirmer = null; render(); },
  terminerTot() {
    ui.confirmer = null; S.run.chrono = null; clearInterval(tic);
    if (S.run.resultats.every(r => !r.length)) {
      S.run = null; garderEcran(false); sauver(); aller('accueil'); toast('Séance annulée, rien n’a été enregistré');
      return;
    }
    actions.finSeance();
  },
  finSeance() { S.run.repos = false; garderEcran(false); bip(990, 200); ui.resultat = null; sauver(); aller('bilan'); },
  ressenti(v) { S.run.ressenti = Number(v); sauver(); render(); },
  enregistrerSeance() {
    const r = S.run;
    if (r.ressenti == null) return;
    const minutes = Math.max(1, Math.round((Date.now() - r.debut) / 60000));
    const { etat, changements } = C.appliquerResultat(S.profil, S.etat, r.seance, r.resultats, r.ressenti, aujourdhui(), minutes, r.charges || []);
    S.etat = etat; S.run = null; S.seance = null;
    ui.resultat = { changements, message: C.messageCoach(S.profil, etat, 'fini', aujourdhui()) };
    sauver(); aller('bilan');
  },
  ouvrirAjout() { ui.choix = null; aller('ajout'); },
  retourAnalyse() { aller('analyse'); },
  choisirRepas(v) { ui.repas = v; render(); },
  choisirAliment(v) { const a = N.ALIMENTS.find(x => x.nom === v); if (a) { ui.choix = { aliment: a, grammes: a.portion }; render(); } },
  grammesChoix(v) { ui.choix.grammes = Math.max(5, ui.choix.grammes + Number(v)); render(); },
  ajouterChoix() {
    const e = N.portion(ui.choix.aliment, ui.choix.grammes);
    if (ui.analyse?.resultat) { ui.analyse.resultat.aliments.push(e); ui.choix = null; aller('analyse'); return; }
    noter([e], 'manuel'); ui.choix = null; ui.recherche = ''; aller('calories'); toast(`${e.nom} : ${e.kcal} kcal ajoutées`);
  },
  ajouterLibre() {
    const kcal = Math.round(Number(ui.libre.kcal));
    if (!ui.libre.nom.trim() || !(kcal > 0 && kcal < 5000)) { toast('Indique un nom et des calories entre 1 et 5000'); return; }
    const e = { nom: ui.libre.nom.trim().slice(0, 60), kcal, p: 0, g: 0, l: 0 };
    ui.libre = { nom: '', kcal: '' };
    if (ui.analyse?.resultat) { ui.analyse.resultat.aliments.push({ ...e, grammes: 0 }); aller('analyse'); return; }
    noter([e], 'manuel'); aller('calories'); toast(`${e.kcal} kcal ajoutées`);
  },
  supprimerEntree(v) { S.nutri.journal = S.nutri.journal.filter(e => e.id !== v); sauver(); render(); },
  async photo(fichier) {
    ui.analyse?.ctl?.abort();
    ui.repas = N.repasSelonHeure();
    ui.analyse = { ctl: new AbortController() };
    aller('analyse');
    try {
      const { blob, apercu } = await reduirePhoto(fichier);
      Object.assign(ui.analyse, { blob, apercu }); render();
      await lancerAnalyse();
    } catch {
      ui.analyse.erreur = 'Impossible de lire cette photo. Essaie une autre image.'; render();
    }
  },
  relancerAnalyse() { ui.analyse.erreur = null; ui.analyse.ctl = new AbortController(); render(); lancerAnalyse(); },
  annulerAnalyse() { ui.analyse?.ctl?.abort(); ui.analyse = null; aller('calories'); },
  grammes(v, c) {
    const x = ui.analyse.resultat.aliments[Number(v)];
    const pas = x.grammes >= 100 ? 25 : 10;
    ui.analyse.resultat.aliments[Number(v)] = N.regrammer(x, Math.max(pas, x.grammes + Number(c) * pas)); render();
  },
  retirerAliment(v) { ui.analyse.resultat.aliments.splice(Number(v), 1); render(); },
  validerAnalyse() {
    const l = ui.analyse.resultat.aliments;
    noter(l, 'photo');
    const total = l.reduce((t, x) => t + x.kcal, 0);
    ui.analyse = null; aller('calories'); toast(`${total} kcal ajoutées au ${N.REPAS[ui.repas].toLowerCase()}`);
  },
  peser() {
    const kg = Math.round(Number(String(ui.pesee ?? '').replace(',', '.')) * 10) / 10;
    if (!(kg >= 30 && kg <= 250)) { toast('Indique un poids entre 30 et 250 kg'); return; }
    const date = aujourdhui();
    S.nutri.pesees = [...S.nutri.pesees.filter(x => x.date !== date), { date, kg }];
    const { ajustement, message } = N.ajusterSelonPoids(S.profil, S.nutri, date);
    if (message) { S.nutri.ajustement = ajustement; S.nutri.dernierAjustement = date; }
    ui.pesee = ''; sauver(); render(); toast(message || `${kg} kg noté`);
  },
  enregistrerCle() {
    const v = (document.getElementById('cleApi')?.value || '').trim();
    if (v && !/^sk-ant-/.test(v)) { toast('Une clé API Claude commence par sk-ant-'); return; }
    S.nutri.cleApi = v; sauver(); majMoteur(); toast(v ? 'Clé enregistrée' : 'Clé retirée');
  },
  oublierCle() { S.nutri.cleApi = ''; sauver(); majMoteur(); render(); toast('Clé retirée de ce téléphone'); },
  prendre(v) { S.complements.pris = K.basculerPris(S.complements.pris, v, aujourdhui()); sauver(); vibre(30); render(); },
  ajouterComplement(v) {
    const m = K.MODELES.find(x => x.nom === v); if (!m) return;
    S.complements.liste.push(K.nouveauComplement(m, nouvelId())); sauver(); render(); reprogrammerRappels(true);
  },
  ajouterAutre() {
    const nom = (document.getElementById('nomComplement')?.value || '').trim().slice(0, 40);
    if (!nom) { toast('Indique le nom du complément'); return; }
    S.complements.liste.push(K.nouveauComplement({ nom, dose: '', heure: '08:00' }, nouvelId())); ui.nomComplement = '';
    sauver(); render(); reprogrammerRappels(true);
  },
  activerComplement(v) { const c = S.complements.liste.find(x => x.id === v); if (c) { c.actif = !c.actif; sauver(); render(); reprogrammerRappels(); } },
  supprimerComplement(v) { S.complements.liste = S.complements.liste.filter(x => x.id !== v); sauver(); render(); reprogrammerRappels(); },
  async autoriserNotifs() { ui.permNotifs = await permissionNotifs(true); await reprogrammerRappels(); render(); if (ui.permNotifs !== 'granted') toast('Active les notifications de Veilleur dans les réglages du téléphone'); },
  pardonner() { S.etat.nonAime = {}; sauver(); toast('Tous les exercices sont de retour'); },
  demanderReset() { ui.confirmer = 'reset'; render(); },
  reset() { try { localStorage.removeItem(CLE); } catch { /* rien */ } S = { profil: null, etat: null, nutri: { journal: [], pesees: [], ajustement: 0, cleApi: '' }, complements: { liste: [], pris: {} } }; majMoteur(); reprogrammerRappels(); ui.confirmer = null; aller('intro'); },
};

async function lancerAnalyse() {
  const a = ui.analyse;
  try {
    const r = await analyserPhoto(a.blob, { cleApi: S.nutri.cleApi, signal: a.ctl.signal });
    if (ui.analyse !== a) return;
    a.resultat = r;
  } catch (e) {
    if (ui.analyse !== a || e?.code === 'cancelled') return;
    a.erreur = e?.message || 'Analyse impossible pour le moment.'; a.code = e?.code;
  }
  if (ui.ecran === 'analyse') render();
}

app.addEventListener('click', ev => {
  const b = ev.target.closest('[data-a]');
  if (!b || b.disabled) return;
  actions[b.dataset.a]?.(b.dataset.v, b.dataset.c);
});
app.addEventListener('input', ev => {
  const id = ev.target.id, v = ev.target.value;
  if (id === 'prenom' && ui.brouillon) ui.brouillon.prenom = v;
  if (['age', 'taille', 'poids'].includes(id) && ui.brouillon) ui.brouillon[id] = v;
  if (id === 'recherche') { ui.recherche = v; ui.choix = null; const el = document.getElementById('resultats'); if (el) el.innerHTML = resultatsHtml(); }
  if (id === 'libreNom') ui.libre.nom = v;
  if (id === 'libreKcal') ui.libre.kcal = v;
  if (id === 'pesee') ui.pesee = v;
  if (id === 'nomComplement') ui.nomComplement = v;
});
app.addEventListener('change', ev => {
  if (['photo', 'galerie'].includes(ev.target.id) && ev.target.files?.[0]) actions.photo(ev.target.files[0]);
  const m = /^(heure|dose)-(.+)$/.exec(ev.target.id);
  if (m) {
    const c = S.complements.liste.find(x => x.id === m[2]);
    if (!c) return;
    if (m[1] === 'heure') { if (!K.heureValide(ev.target.value)) return; c.heure = ev.target.value; reprogrammerRappels(); }
    else c.dose = ev.target.value.trim().slice(0, 30);
    sauver(); toast(m[1] === 'heure' ? `Rappel ${c.nom} à ${c.heure}` : 'Dose enregistrée');
  }
});
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && S.run) garderEcran(true); });

render();
