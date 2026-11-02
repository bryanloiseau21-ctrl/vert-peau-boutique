import * as C from './coach.js';

const CLE = 'veilleur-coach-v1';
const app = document.getElementById('app');

const VISIERE = `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 3 43 12v13c0 10-8 17-19 20C13 42 5 35 5 25V12Z" fill="none" stroke="var(--signal)" stroke-width="2.5"/><path d="M12 22l9 3-1 4-8-2Zm24 0-9 3 1 4 8-2Z" fill="var(--signal)"/></svg>`;
const ICONES = {
  ce_soir: '<svg viewBox="0 0 24 24"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z"/></svg>',
  progres: '<svg viewBox="0 0 24 24"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
  profil: '<svg viewBox="0 0 24 24"><path d="M12 2 20 6v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6Z"/><path d="M8.5 11.5 11 14l4.5-4.5"/></svg>',
};

// ---------- état et sauvegarde ----------
let S = charger() || { profil: null, etat: null };
let ui = { ecran: S.profil ? 'accueil' : 'intro', brouillon: null, confirmer: null, toast: '' };
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

// ---------- écrans ----------
const ecrans = {
  intro() {
    return `<div class="ecran intro">
      <div class="visiere">${VISIERE}</div>
      <div class="etiquette">Coach de poche · mode nuit</div>
      <h1>Veilleur.<br>Ton coach qui apprend de toi.</h1>
      <p class="pitch">Chaque soir, tu dis comment tu te sens. Veilleur prépare la séance du jour, note ce que tu réussis et ajuste la suivante : plus dur quand tu progresses, plus doux quand tu es fatigué.</p>
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
      <div class="echelle-legende"><span>${bas}</span><span>${haut}</span></div></div>`;
    const dejaFaite = etat.historique.at(-1)?.date === aujourdhui();
    return `<div class="ecran">
      ${entete()}
      <div class="plaque coach"><div class="etiquette">Transmission du coach</div><p class="voix">${esc(C.messageCoach(profil, etat, { forme }, aujourdhui()))}</p></div>
      ${S.run ? '<button class="btn" data-a="aller" data-v="seance">Reprendre la séance en cours</button>' : ''}
      <div class="plaque">
        <div class="semaine">
          <div class="grand-chiffre">${b.faites}<small>/${b.objectif}</small></div>
          <div style="flex:1;display:flex;flex-direction:column;gap:8px">
            <span class="etiquette">Séances cette semaine</span>
            <div class="jauge">${Array.from({ length: b.objectif }, (_, i) => `<span class="${i < b.faites ? 'on' : ''}"></span>`).join('')}</div>
            <span class="muet" style="font-size:.85rem">${b.serie ? `${b.serie} semaine${b.serie > 1 ? 's' : ''} d’affilée objectif tenu` : 'Tiens ton objectif pour lancer une série'}</span>
          </div>
        </div>
      </div>
      <div class="plaque">
        <div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px"><h2>État du jour</h2><span class="num" style="color:var(--signal)">Forme ${Math.round(forme * 100)} %</span></div>
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
    const lignes = s.exercices.map((e, i) => `<div class="item">
      <span class="code">${String(i + 1).padStart(2, '0')}</span>
      <div class="corps-item"><h3>${esc(e.nom)}</h3><span class="dosage">${e.series} × ${e.mode === 'reps' ? `${e.cible} rép.` : `${e.cible} s`}</span></div>
      ${e.chaine ? `<button class="btn second petit" data-a="remplacer" data-v="${i}" aria-label="Remplacer ${esc(e.nom)}">Changer</button>` : ''}
    </div>`).join('');
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
    const confirm = ui.confirmer === 'abandon' ? `<div class="plaque" style="border-color:var(--alerte)"><p>Arrêter la séance ? Ce que tu as déjà fait sera enregistré.</p>
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
        <h2 style="text-transform:none;letter-spacing:0;font-size:1.4rem">${esc(ex.nom)}</h2>
        ${temps && enCours
          ? `<div class="cible" id="chrono">${format(Math.ceil((r.chrono.fin - Date.now()) / 1000))}</div><span class="unite">tiens bon</span><div class="barre" style="width:100%"><i id="chrono-barre" style="width:0"></i></div>`
          : `<div class="cible num">${val}</div><span class="unite">${temps ? 'secondes' : 'répétitions'}${val !== ex.cible ? ` · objectif ${ex.cible}` : ''}</span>
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
      return `<rect x="${xx}" y="${y(x.seances)}" width="${bw}" height="${112 - y(x.seances)}" fill="${x.seances >= profil.seancesSemaine ? 'var(--signal)' : 'var(--trait)'}"/>
        ${x.seances ? `<text x="${xx + bw / 2}" y="${y(x.seances) - 5}" text-anchor="middle" style="fill:var(--texte)">${x.seances}</text>` : ''}
        <text x="${xx + bw / 2}" y="128" text-anchor="middle">${d.getDate()}/${d.getMonth() + 1}</text>`;
    }).join('');
    const ligneObj = `<line x1="28" x2="${W}" y1="${y(profil.seancesSemaine)}" y2="${y(profil.seancesSemaine)}" stroke="var(--gris)" stroke-dasharray="3 4"/><text x="0" y="${y(profil.seancesSemaine) + 3}">obj ${profil.seancesSemaine}</text>`;
    const utilisees = C.CHAINES.filter(c => etat.usage[c.id]);
    const niveaux = utilisees.map(c => {
      const st = etat.chaines[c.id];
      return `<div class="niveau"><span>${esc(c.variantes[st.rang])}</span><span class="num muet">${st.cible} ${c.mode === 'reps' ? 'rép.' : 's'}</span>
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
      <div class="plaque"><h2>8 dernières semaines</h2>
        <div style="overflow-x:auto"><svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Séances par semaine">${ligneObj}${barres}</svg></div>
        <p class="muet" style="font-size:.85rem">${b.serie ? `Série en cours : ${b.serie} semaine${b.serie > 1 ? 's' : ''}.` : 'En jaune : semaines où tu as tenu ton objectif.'}</p></div>
      <div class="plaque"><h2>Tes progressions</h2>
        ${niveaux || '<p class="muet">Fais ta première séance : tes niveaux s’afficheront ici.</p>'}</div>
      <div class="plaque"><h2>Journal</h2><div class="liste">${h.slice(-10).reverse().map(x => `<div class="item">
        <div class="corps-item"><h3>${esc(x.titre || 'Séance')}</h3><span class="muet num" style="font-size:.85rem">${new Date(x.date + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} · ${x.minutes} min · ${C.RESSENTIS[x.ressenti] || ''}</span></div>
        <span class="dosage" style="color:${x.reussite >= 95 ? 'var(--ok)' : 'var(--texte)'}">${x.reussite} %</span></div>`).join('') || '<p class="muet">Aucune séance pour l’instant.</p>'}</div></div>
    </div>`;
  },

  reglages() {
    const p = S.profil;
    const conf = ui.confirmer === 'reset' ? `<div class="plaque" style="border-color:var(--alerte)"><p>Tout effacer ? Ton profil, tes niveaux et ton journal seront supprimés de ce téléphone.</p>
      <div class="rangee-btn"><button class="btn danger petit" data-a="reset">Tout effacer</button><button class="btn second petit" data-a="annulerConfirm">Annuler</button></div></div>` : '';
    const ligne = (k, v) => `<div class="item"><span class="etiquette" style="min-width:110px">${k}</span><span class="corps-item">${esc(v)}</span></div>`;
    return `<div class="ecran">
      ${entete()}
      <h1>Profil</h1>
      <div class="plaque"><div class="liste">
        ${ligne('Nom', p.prenom)}${ligne('Objectif', C.OBJECTIFS[p.objectif].nom)}${ligne('Niveau', C.NIVEAUX[p.niveau])}
        ${ligne('Rythme', `${p.seancesSemaine} séances × ${p.duree} min`)}${ligne('Matériel', p.materiel.map(m => C.MATERIELS[m]).join(', ') || 'Poids du corps')}
        ${ligne('À ménager', p.zones.map(z => C.ZONES[z]).join(', ') || 'Rien')}${ligne('Ton', C.TONS[p.ton])}
      </div></div>
      <button class="btn" data-a="modifierProfil">Modifier mon profil</button>
      ${Object.keys(S.etat.nonAime).filter(k => S.etat.nonAime[k] >= 2).length ? `<div class="plaque"><span class="etiquette">Exercices écartés</span><p>${Object.keys(S.etat.nonAime).filter(k => S.etat.nonAime[k] >= 2).map(k => esc(C.chaine(k).variantes[0])).join(', ')}</p><button class="btn second petit" data-a="pardonner">Les reproposer</button></div>` : ''}
      <div class="plaque"><span class="etiquette">Comment Veilleur s’adapte</span>
        <ul class="raisons"><li>Ton état du jour règle l’intensité et le nombre de séries.</li><li>Ce que tu réussis vraiment fait monter ou descendre chaque exercice, jusqu’à la variante suivante.</li><li>Ton ressenti ajuste la charge globale des séances suivantes.</li><li>Après une longue pause, la reprise est plus douce.</li></ul></div>
      ${conf}
      <button class="btn second" data-a="demanderReset">Effacer mes données</button>
    </div>`;
  },
};

function entete() {
  return `<header class="entete"><div class="marque">${VISIERE}Veilleur</div><span class="statut">En veille</span></header>`;
}

function nav() {
  if (!S.profil || ['formulaire', 'seance', 'bilan', 'apercu'].includes(ui.ecran)) return '';
  const o = (id, ecran, label) => `<button class="onglet" data-a="aller" data-v="${ecran}" ${ui.ecran === ecran ? 'aria-current="page"' : ''}>${ICONES[id]}${label}</button>`;
  return `<nav class="bas"><div class="interieur">${o('ce_soir', 'accueil', 'Ce soir')}${o('progres', 'progres', 'Progrès')}${o('profil', 'reglages', 'Profil')}</div></nav>`;
}

function render() {
  if ((ui.ecran === 'seance' || (ui.ecran === 'bilan' && !ui.resultat)) && !S.run) ui.ecran = S.profil ? 'accueil' : 'intro';
  if (ui.ecran === 'seance' && S.run.etape >= etapes(S.run.seance).length) ui.ecran = 'bilan';
  app.innerHTML = ecrans[ui.ecran]() + nav() + (ui.toast ? `<div class="toast" role="status">${esc(ui.toast)}</div>` : '');
  if (S.run?.chrono) minuteur();
}
function aller(ecran) { ui.ecran = ecran; ui.confirmer = null; render(); window.scrollTo(0, 0); }
function toast(t) { ui.toast = t; render(); setTimeout(() => { ui.toast = ''; render(); }, 2200); }

// ---------- actions ----------
const actions = {
  aller: v => aller(v),
  nouveauProfil() {
    ui.brouillon = { prenom: '', objectif: 'forme', niveau: 'debutant', seancesSemaine: 3, duree: 30, materiel: [], zones: [], ton: 'motivant' };
    aller('formulaire');
  },
  modifierProfil() { ui.brouillon = structuredClone(S.profil); aller('formulaire'); },
  exemple() { const ex = C.exemple(aujourdhui()); S = { ...ex }; sauver(); aller('accueil'); toast('Profil exemple chargé : Alex, 7 séances'); },
  choisir(v, c) { ui.brouillon[c] = ['seancesSemaine', 'duree'].includes(c) ? Number(v) : v; render(); },
  basculer(v, c) { const l = ui.brouillon[c]; ui.brouillon[c] = l.includes(v) ? l.filter(x => x !== v) : [...l, v]; render(); },
  enregistrerProfil() {
    const p = { ...ui.brouillon, prenom: ui.brouillon.prenom.trim() };
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
    S.run = { seance: S.seance, etape: 0, resultats: S.seance.exercices.map(() => []), debut: Date.now(), repos: false, chrono: null, saisie: null, ressenti: null };
    sauver(); garderEcran(true); aller('seance');
  },
  saisie(v) {
    const r = S.run, ex = r.seance.exercices[etapes(r.seance)[r.etape].i];
    const pas = ex.mode === 'temps' ? 5 : 1;
    r.saisie = Math.max(0, (r.saisie ?? ex.cible) + Number(v) * pas); sauver(); render();
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
    const { etat, changements } = C.appliquerResultat(S.profil, S.etat, r.seance, r.resultats, r.ressenti, aujourdhui(), minutes);
    S.etat = etat; S.run = null; S.seance = null;
    ui.resultat = { changements, message: C.messageCoach(S.profil, etat, 'fini', aujourdhui()) };
    sauver(); aller('bilan');
  },
  pardonner() { S.etat.nonAime = {}; sauver(); toast('Tous les exercices sont de retour'); },
  demanderReset() { ui.confirmer = 'reset'; render(); },
  reset() { try { localStorage.removeItem(CLE); } catch { /* rien */ } S = { profil: null, etat: null }; ui.confirmer = null; aller('intro'); },
};

app.addEventListener('click', ev => {
  const b = ev.target.closest('[data-a]');
  if (!b || b.disabled) return;
  actions[b.dataset.a]?.(b.dataset.v, b.dataset.c);
});
app.addEventListener('input', ev => {
  if (ev.target.id === 'prenom' && ui.brouillon) ui.brouillon.prenom = ev.target.value;
});
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && S.run) garderEcran(true); });

render();
