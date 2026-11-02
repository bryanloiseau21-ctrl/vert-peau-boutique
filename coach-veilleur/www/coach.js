// Veilleur — moteur du coach adaptatif.
// Fonctions pures : aucune dépendance au navigateur, testées dans tests/coach.test.js.

export const OBJECTIFS = {
  muscle: { nom: 'Prendre du muscle', motifs: ['pousser', 'jambes', 'tirer', 'gainage', 'pousser', 'jambes'], repos: 75, cardio: false },
  perte: { nom: 'Perdre du gras', motifs: ['jambes', 'cardio', 'pousser', 'tirer', 'cardio', 'gainage'], repos: 30, cardio: true },
  endurance: { nom: 'Gagner en endurance', motifs: ['cardio', 'jambes', 'gainage', 'cardio', 'pousser', 'tirer'], repos: 30, cardio: true },
  forme: { nom: 'Être en forme', motifs: ['jambes', 'pousser', 'gainage', 'tirer', 'cardio', 'jambes'], repos: 45, cardio: false },
};

export const NIVEAUX = { debutant: 'Débutant', intermediaire: 'Intermédiaire', avance: 'Avancé' };
export const MATERIELS = { halteres: 'Haltères', elastique: 'Élastique', traction: 'Barre de traction' };
export const ZONES = { genoux: 'Genoux', dos: 'Dos', epaules: 'Épaules', poignets: 'Poignets' };
export const TONS = { doux: 'Bienveillant', motivant: 'Motivant', cash: 'Sans filtre' };

// Chaque chaîne est une progression : on monte d'une variante quand la cible dépasse le plafond.
export const CHAINES = [
  { id: 'pompes', motif: 'pousser', mode: 'reps', materiel: null, evite: ['poignets'],
    variantes: ['Pompes contre un mur', 'Pompes mains sur une chaise', 'Pompes sur les genoux', 'Pompes', 'Pompes pieds surélevés', 'Pompes diamant'],
    consigne: 'Corps gainé en planche, coudes à 45°, la poitrine descend jusqu’à frôler l’appui.' },
  { id: 'dips', motif: 'pousser', mode: 'reps', materiel: null, evite: ['epaules', 'poignets'],
    variantes: ['Dips sur chaise, jambes fléchies', 'Dips sur chaise, jambes tendues', 'Dips pieds surélevés'],
    consigne: 'Épaules basses, loin des oreilles. Descends jusqu’à 90° aux coudes.' },
  { id: 'dev-halteres', motif: 'pousser', mode: 'reps', materiel: 'halteres', evite: ['epaules'],
    variantes: ['Développé au sol aux haltères', 'Développé épaules assis', 'Développé épaules debout', 'Développé Arnold'],
    consigne: 'Pousse en expirant, redescends en 2 secondes. Le dos ne se cambre pas.' },
  { id: 'rowing-table', motif: 'tirer', mode: 'reps', materiel: null, evite: [],
    variantes: ['Superman bras en W', 'Rowing inversé sous une table, genoux fléchis', 'Rowing inversé, jambes tendues', 'Rowing inversé, pieds surélevés'],
    consigne: 'Serre les omoplates en fin de mouvement, garde la nuque dans l’axe.' },
  { id: 'rowing-halteres', motif: 'tirer', mode: 'reps', materiel: 'halteres', evite: [],
    variantes: ['Rowing un bras en appui', 'Rowing buste penché', 'Rowing renegade'],
    consigne: 'Tire le coude vers la hanche, pas vers le plafond.' },
  { id: 'elastique', motif: 'tirer', mode: 'reps', materiel: 'elastique', evite: [],
    variantes: ['Tirage élastique assis', 'Face pull à l’élastique', 'Tirage élastique un bras'],
    consigne: 'Contrôle le retour : l’élastique ne doit jamais te tirer.' },
  { id: 'tractions', motif: 'tirer', mode: 'reps', materiel: 'traction', evite: ['epaules'],
    variantes: ['Tractions négatives', 'Tractions prise large', 'Tractions prise serrée', 'Tractions pause en haut'],
    consigne: 'Pars bras tendus, menton au-dessus de la barre, descente lente.' },
  { id: 'squat', motif: 'jambes', mode: 'reps', materiel: null, evite: ['genoux'],
    variantes: ['Squat sur chaise', 'Squat', 'Squat pause 2 secondes', 'Squat bulgare', 'Squat sauté'],
    consigne: 'Talons au sol, genoux dans l’axe des pieds, poitrine fière.' },
  { id: 'fentes', motif: 'jambes', mode: 'reps', materiel: null, evite: ['genoux'],
    variantes: ['Fentes arrière avec appui', 'Fentes arrière', 'Fentes marchées', 'Fentes sautées'],
    consigne: 'Le genou arrière frôle le sol, le buste reste droit.' },
  { id: 'pont', motif: 'jambes', mode: 'reps', materiel: null, evite: [],
    variantes: ['Pont fessier', 'Pont fessier pause 3 secondes', 'Pont fessier une jambe', 'Hip thrust une jambe sur canapé'],
    consigne: 'Pousse dans les talons, serre les fessiers en haut, ne cambre pas.' },
  { id: 'goblet', motif: 'jambes', mode: 'reps', materiel: 'halteres', evite: ['genoux'],
    variantes: ['Goblet squat', 'Goblet squat tempo 3-1-1', 'Fentes bulgares aux haltères'],
    consigne: 'Haltère contre la poitrine, descends entre tes talons.' },
  { id: 'souleve', motif: 'jambes', mode: 'reps', materiel: 'halteres', evite: ['dos'],
    variantes: ['Soulevé de terre roumain', 'Soulevé de terre roumain une jambe'],
    consigne: 'Dos plat, les hanches reculent, les haltères glissent le long des cuisses.' },
  { id: 'planche', motif: 'gainage', mode: 'temps', materiel: null, evite: [],
    variantes: ['Planche sur les genoux', 'Planche', 'Planche avec touchers d’épaule', 'Planche une jambe levée'],
    consigne: 'Ligne droite des épaules aux chevilles. Respire, ne bloque pas.' },
  { id: 'dead-bug', motif: 'gainage', mode: 'reps', materiel: null, evite: [],
    variantes: ['Dead bug bras seuls', 'Dead bug', 'Dead bug lent, jambes tendues'],
    consigne: 'Le bas du dos reste collé au sol pendant tout le mouvement.' },
  { id: 'lateral', motif: 'gainage', mode: 'temps', materiel: null, evite: ['epaules'],
    variantes: ['Planche latérale sur les genoux', 'Planche latérale', 'Planche latérale jambe levée'],
    consigne: 'Hanches hautes, coude sous l’épaule. Change de côté à mi-temps.' },
  { id: 'cardio-doux', motif: 'cardio', mode: 'temps', materiel: null, evite: [],
    variantes: ['Marche active sur place', 'Boxe dans le vide', 'Skater sans saut', 'Shadow boxing rapide'],
    consigne: 'Sans impact : tu dois pouvoir parler, mais pas chanter.' },
  { id: 'cardio-impact', motif: 'cardio', mode: 'temps', materiel: null, evite: ['genoux', 'poignets'],
    variantes: ['Jumping jacks', 'Montées de genoux rapides', 'Mountain climbers', 'Burpees'],
    consigne: 'Atterris sur l’avant du pied, garde un rythme que tu tiens jusqu’au bout.' },
];

export const MOBILITE = [
  { nom: 'Cercles de bras', duree: 30 },
  { nom: 'Chat-vache', duree: 40 },
  { nom: 'Fente basse avec rotation', duree: 40 },
  { nom: 'Rotations de hanches', duree: 30 },
  { nom: 'Étirement des ischios', duree: 40 },
  { nom: 'Respiration ventrale au sol', duree: 60 },
  { nom: 'Ouverture thoracique au sol', duree: 40 },
];

const BORNES = { reps: { min: 5, max: 15, pas: 1, depart: 8 }, temps: { min: 15, max: 60, pas: 5, depart: 25 } };
const DEPART = { debutant: { part: 0, reps: 8, temps: 20 }, intermediaire: { part: 0.4, reps: 10, temps: 30 }, avance: { part: 0.7, reps: 12, temps: 40 } };

export const RESSENTIS = ['Trop facile', 'Facile', 'Parfait', 'Dur', 'Trop dur'];

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const chaine = id => CHAINES.find(c => c.id === id);

export function jour(date = new Date()) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function ecartJours(a, b) {
  return Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 86400000);
}
// Lundi de la semaine du jour donné (clé de semaine).
export function semaine(j) {
  const d = new Date(j + 'T12:00:00');
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return jour(d);
}

export function profilValide(p) {
  return !!(p && p.prenom && OBJECTIFS[p.objectif] && NIVEAUX[p.niveau] && p.seancesSemaine >= 1 && p.duree >= 10);
}

export function chainesPermises(profil, etat) {
  const mat = new Set(profil.materiel || []);
  const zones = new Set(profil.zones || []);
  return CHAINES.filter(c => (!c.materiel || mat.has(c.materiel))
    && !c.evite.some(z => zones.has(z))
    && (etat?.nonAime?.[c.id] || 0) < 2);
}

export function etatInitial(profil) {
  const d = DEPART[profil.niveau] || DEPART.debutant;
  const chaines = {};
  for (const c of CHAINES) {
    chaines[c.id] = { rang: Math.floor((c.variantes.length - 1) * d.part), cible: c.mode === 'reps' ? d.reps : d.temps };
  }
  return { chaines, charge: 1, historique: [], nonAime: {}, usage: {}, records: 0 };
}

// Forme du jour : 0 (à plat) → 1 (au top).
export function formeDuJour(checkin) {
  const e = checkin?.energie ?? 3, s = checkin?.sommeil ?? 3, c = checkin?.courbatures ?? 2;
  return clamp(((e - 1) + (s - 1) + (5 - c)) / 12, 0, 1);
}

export function bilanSemaine(profil, etat, aujourdhui) {
  const sem = semaine(aujourdhui);
  const faites = etat.historique.filter(h => semaine(h.date) === sem).length;
  let serie = 0;
  let curseur = new Date(sem + 'T12:00:00');
  for (let i = 0; i < 52; i++) {
    curseur.setDate(curseur.getDate() - 7);
    const k = jour(curseur);
    if (etat.historique.filter(h => semaine(h.date) === k).length >= profil.seancesSemaine) serie++;
    else break;
  }
  if (faites >= profil.seancesSemaine) serie++;
  const derniere = etat.historique.at(-1)?.date;
  return { faites, objectif: profil.seancesSemaine, serie, joursDepuis: derniere ? ecartJours(derniere, aujourdhui) : null };
}

function choisirChaine(motif, permises, etat, deja) {
  const candidates = permises.filter(c => c.motif === motif && !deja.has(c.id));
  if (!candidates.length) return null;
  // La chaîne la moins utilisée récemment passe en premier : variété sans hasard.
  return candidates.sort((a, b) => (etat.usage[a.id] || 0) - (etat.usage[b.id] || 0) || CHAINES.indexOf(a) - CHAINES.indexOf(b))[0];
}

function ligne(c, etat, intensite, series, repos) {
  const st = etat.chaines[c.id];
  const b = BORNES[c.mode];
  const cible = c.mode === 'reps'
    ? Math.max(3, Math.round(st.cible * intensite))
    : Math.max(10, Math.round(st.cible * intensite / 5) * 5);
  return { chaine: c.id, nom: c.variantes[st.rang], mode: c.mode, cible, series, repos, consigne: c.consigne, motif: c.motif, base: st.cible, bornes: b };
}

export function genererSeance(profil, etat, checkin = {}, aujourdhui = jour()) {
  const obj = OBJECTIFS[profil.objectif];
  const forme = formeDuJour(checkin);
  const duree = checkin.duree || profil.duree;
  const bilan = bilanSemaine(profil, etat, aujourdhui);
  const raisons = [];
  const permises = chainesPermises(profil, etat);

  if ((profil.zones || []).length) raisons.push(`Zones protégées (${profil.zones.map(z => ZONES[z]).join(', ').toLowerCase()}) : exercices à risque retirés.`);

  if (forme < 0.35) {
    raisons.unshift('Forme basse aujourd’hui : séance de récupération active, rien qui t’épuise.');
    const gainage = permises.filter(c => c.motif === 'gainage').slice(0, 2);
    const nbMob = clamp(Math.round(duree / 6), 3, MOBILITE.length);
    return {
      type: 'recup', titre: 'Récupération active', duree, forme, raisons,
      echauffement: [],
      exercices: [
        ...MOBILITE.slice(0, nbMob).map(m => ({ chaine: null, nom: m.nom, mode: 'temps', cible: m.duree, series: 1, repos: 10, consigne: 'Amplitude confortable, respiration lente.', motif: 'mobilite' })),
        ...gainage.map(c => ligne(c, etat, 0.7, 2, 30)),
      ],
      retour: [],
    };
  }

  let intensite = etat.charge * (0.85 + 0.3 * forme);
  if (forme >= 0.75) raisons.push('Tu es en forme : on pousse un peu plus que d’habitude.');
  else if (forme < 0.5) raisons.push('Énergie moyenne : intensité légèrement réduite.');
  if (etat.charge > 1.04) raisons.push(`Tes dernières séances étaient bien tenues : charge à ${Math.round(etat.charge * 100)} %.`);
  if (etat.charge < 0.96) raisons.push(`Les dernières séances étaient dures : charge abaissée à ${Math.round(etat.charge * 100)} %.`);
  if (bilan.joursDepuis !== null && bilan.joursDepuis >= 6) {
    intensite *= 0.88;
    raisons.push(`${bilan.joursDepuis} jours sans séance : reprise en douceur pour éviter la casse.`);
  }

  const nbExos = clamp(Math.round(duree / 10) + 1, 3, 6);
  const baseSeries = { debutant: 2, intermediaire: 3, avance: 4 }[profil.niveau] || 2;
  let series = baseSeries + (forme >= 0.8 ? 1 : 0) - (forme < 0.5 ? 1 : 0) - (duree <= 20 ? 1 : 0);
  series = clamp(series, 1, 5);
  if (series < baseSeries) raisons.push(`${series} série${series > 1 ? 's' : ''} par exercice au lieu de ${baseSeries}, pour tenir dans ${duree} min.`);

  // Rotation des motifs selon le nombre de séances déjà faites : on ne recommence pas toujours par les mêmes.
  const decalage = etat.historique.length % obj.motifs.length;
  const ordre = [...obj.motifs.slice(decalage), ...obj.motifs.slice(0, decalage)];
  const deja = new Set();
  const exercices = [];
  for (const motif of [...ordre, ...ordre]) {
    if (exercices.length >= nbExos) break;
    const c = choisirChaine(motif, permises, etat, deja);
    if (!c) continue;
    deja.add(c.id);
    exercices.push(ligne(c, etat, intensite, series, obj.repos));
  }

  return {
    type: 'normale',
    titre: { muscle: 'Force', perte: 'Circuit brûle-graisse', endurance: 'Endurance', forme: 'Forme complète' }[profil.objectif],
    duree, forme, raisons,
    echauffement: MOBILITE.slice(0, 2).map(m => ({ nom: m.nom, duree: m.duree })),
    exercices,
    retour: [MOBILITE[5]].map(m => ({ nom: m.nom, duree: m.duree })),
  };
}

// Remplace un exercice par un autre du même motif et retient que tu n'aimes pas l'ancien.
export function remplacerExercice(profil, etat, seance, index) {
  const ex = seance.exercices[index];
  if (!ex?.chaine) return { seance, etat };
  const nonAime = { ...etat.nonAime, [ex.chaine]: (etat.nonAime[ex.chaine] || 0) + 1 };
  const etat2 = { ...etat, nonAime };
  const deja = new Set(seance.exercices.map(e => e.chaine));
  const permises = chainesPermises(profil, etat2);
  const c = choisirChaine(ex.motif, permises, etat2, deja) || choisirChaine(ex.motif, permises.filter(p => p.id !== ex.chaine), etat2, new Set());
  if (!c) return { seance, etat: etat2, aucun: true };
  const intensite = ex.base ? ex.cible / ex.base : 1;
  const nouvelle = ligne(c, etat2, intensite, ex.series, ex.repos);
  const exercices = seance.exercices.map((e, i) => (i === index ? nouvelle : e));
  return { seance: { ...seance, exercices }, etat: etat2 };
}

// Applique le résultat d'une séance : c'est ici que le coach apprend.
// resultats[i] = tableau des répétitions (ou secondes) réalisées par série pour l'exercice i.
// ressenti : 0 (trop facile) → 4 (trop dur).
export function appliquerResultat(profil, etat, seance, resultats, ressenti, aujourdhui = jour(), minutes = seance.duree) {
  const chaines = { ...etat.chaines };
  const usage = { ...etat.usage };
  const changements = [];
  let volume = 0, prevu = 0, records = etat.records;

  seance.exercices.forEach((ex, i) => {
    const faits = (resultats[i] || []).map(n => Math.max(0, Number(n) || 0));
    const total = faits.reduce((a, b) => a + b, 0);
    volume += total;
    prevu += ex.cible * ex.series;
    if (!ex.chaine) return;
    usage[ex.chaine] = (usage[ex.chaine] || 0) + 1;
    const c = chaine(ex.chaine);
    const b = BORNES[c.mode];
    const st = { ...chaines[ex.chaine] };
    const taux = total / (ex.cible * ex.series || 1);
    if (!faits.length) { chaines[ex.chaine] = st; return; }

    if (taux >= 1 && ressenti <= 2) {
      st.cible += b.pas * (ressenti === 0 || taux >= 1.25 ? 2 : 1);
    } else if (taux < 0.75 || ressenti === 4) {
      st.cible -= b.pas * (taux < 0.5 ? 2 : 1);
    }

    if (st.cible > b.max) {
      if (st.rang < c.variantes.length - 1) {
        st.rang++;
        st.cible = b.depart;
        records++;
        changements.push({ type: 'monte', texte: `Niveau supérieur : ${c.variantes[st.rang]}` });
      } else {
        st.cible = b.max;
        changements.push({ type: 'max', texte: `${c.variantes[st.rang]} : tu as atteint le sommet de cette progression.` });
      }
    } else if (st.cible < b.min) {
      if (st.rang > 0) {
        st.rang--;
        st.cible = b.max - 3 * b.pas;
        changements.push({ type: 'descend', texte: `On consolide avec ${c.variantes[st.rang]}` });
      } else st.cible = b.min;
    } else if (st.cible !== chaines[ex.chaine].cible) {
      const plus = st.cible > chaines[ex.chaine].cible;
      const unite = c.mode === 'reps' ? 'rép.' : 's';
      changements.push({ type: plus ? 'plus' : 'moins', texte: `${ex.nom} : ${plus ? '+' : ''}${st.cible - chaines[ex.chaine].cible} ${unite} la prochaine fois` });
    }
    chaines[ex.chaine] = st;
  });

  const deltaCharge = [0.05, 0.03, 0.01, -0.02, -0.06][ressenti] ?? 0;
  const charge = Math.round(clamp(etat.charge + (seance.type === 'recup' ? 0 : deltaCharge), 0.7, 1.3) * 100) / 100;
  if (charge !== etat.charge) changements.push({ type: charge > etat.charge ? 'plus' : 'moins', texte: `Charge globale : ${Math.round(charge * 100)} %` });

  const historique = [...etat.historique, {
    date: aujourdhui, type: seance.type, titre: seance.titre, minutes, volume,
    reussite: prevu ? Math.round((volume / prevu) * 100) : 100, ressenti, forme: Math.round(seance.forme * 100),
  }];
  return { etat: { ...etat, chaines, usage, charge, historique, records }, changements };
}

// Messages du coach selon le ton choisi et la situation.
const PHRASES = {
  doux: {
    accueil: p => `Bonsoir ${p}. Dis-moi comment tu te sens, je m’occupe du reste.`,
    recup: () => 'Ton corps demande du calme. On bouge en douceur, c’est aussi ça progresser.',
    reprise: j => `Ça fait ${j} jours. Pas de culpabilité : on reprend tranquillement.`,
    top: () => 'Belle énergie aujourd’hui. On en profite, sans forcer l’allure.',
    fini: () => 'Séance terminée. Tu as tenu ta parole envers toi-même.',
    objectif: () => 'Objectif de la semaine atteint. Prends soin de toi.',
  },
  motivant: {
    accueil: p => `${p}, la ville dort. Toi, tu t’entraînes. Fais ton rapport.`,
    recup: () => 'Mode récupération. Même les plus forts rechargent leurs batteries.',
    reprise: j => `${j} jours d’absence. Le retour commence maintenant.`,
    top: () => 'Batteries pleines. Ce soir on repousse la limite.',
    fini: () => 'Mission accomplie. Chaque séance te rend plus solide.',
    objectif: () => 'Semaine bouclée. Rien ne t’arrête.',
  },
  cash: {
    accueil: p => `${p}. Pas d’excuse ce soir. Remplis ton état et on y va.`,
    recup: () => 'T’es à plat. Récup aujourd’hui, mais tu la fais quand même.',
    reprise: j => `${j} jours sans rien. On rattrape, et sans râler.`,
    top: () => 'Tu es en forme ? Prouve-le.',
    fini: () => 'Fait. Demain on recommence.',
    objectif: () => 'Objectif atteint. Ne t’arrête pas là.',
  },
};

export function messageCoach(profil, etat, contexte, aujourdhui = jour()) {
  const t = PHRASES[profil.ton] || PHRASES.motivant;
  const b = bilanSemaine(profil, etat, aujourdhui);
  if (contexte === 'fini') return b.faites >= b.objectif ? t.objectif() : t.fini();
  if (contexte?.forme !== undefined) {
    if (contexte.forme < 0.35) return t.recup();
    if (b.joursDepuis !== null && b.joursDepuis >= 6) return t.reprise(b.joursDepuis);
    if (contexte.forme >= 0.75) return t.top();
  }
  if (b.joursDepuis !== null && b.joursDepuis >= 6) return t.reprise(b.joursDepuis);
  return t.accueil(profil.prenom);
}

// Volume des 8 dernières semaines pour le graphique de progression.
export function semainesRecentes(etat, aujourdhui = jour(), n = 8) {
  const out = [];
  const d = new Date(semaine(aujourdhui) + 'T12:00:00');
  for (let i = n - 1; i >= 0; i--) {
    const k = new Date(d); k.setDate(k.getDate() - 7 * i);
    const cle = jour(k);
    const items = etat.historique.filter(h => semaine(h.date) === cle);
    out.push({ semaine: cle, seances: items.length, minutes: items.reduce((a, h) => a + (h.minutes || 0), 0) });
  }
  return out;
}

// Exemple pour essayer l'appli sans remplir le questionnaire.
export function exemple(aujourdhui = jour()) {
  const profil = { prenom: 'Alex', objectif: 'forme', niveau: 'intermediaire', seancesSemaine: 3, duree: 30, materiel: ['halteres'], zones: ['genoux'], ton: 'motivant' };
  let etat = etatInitial(profil);
  const dates = [-17, -15, -12, -10, -8, -5, -3].map(n => { const d = new Date(aujourdhui + 'T12:00:00'); d.setDate(d.getDate() + n); return jour(d); });
  dates.forEach((date, i) => {
    const s = genererSeance(profil, etat, { energie: 3 + (i % 2), sommeil: 4, courbatures: 2 }, date);
    const res = s.exercices.map(e => Array(e.series).fill(e.cible + (i % 3 === 0 ? 2 : 0)));
    etat = appliquerResultat(profil, etat, s, res, [2, 1, 2, 3, 2, 1, 2][i], date).etat;
  });
  return { profil, etat };
}
