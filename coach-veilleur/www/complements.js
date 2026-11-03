// Veilleur — rappels de compléments (créatine, whey, vitamines…).
// Les notifications sont programmées sur le téléphone (appli installée), sans serveur.

export const MODELES = [
  { nom: 'Créatine', dose: '5 g', heure: '08:00', conseil: 'Tous les jours, même sans séance, dans un verre d’eau. L’heure compte peu, la régularité compte : il faut 3 à 4 semaines de prise quotidienne pour remplir tes muscles.' },
  { nom: 'Whey', dose: '30 g', heure: '18:30', conseil: 'Aide à atteindre ton objectif de protéines. Prends-la de préférence dans les 2 heures après ta séance.' },
  { nom: 'Vitamine D', dose: '1 gélule', heure: '12:30', conseil: 'Pendant un repas qui contient un peu de gras, surtout d’octobre à mars.' },
  { nom: 'Oméga-3', dose: '2 gélules', heure: '12:30', conseil: 'Pendant un repas, pour limiter le goût de poisson.' },
  { nom: 'Magnésium', dose: '1 comprimé', heure: '21:30', conseil: 'Le soir, il peut aider à la détente.' },
  { nom: 'Multivitamines', dose: '1 comprimé', heure: '08:00', conseil: 'Au petit-déjeuner.' },
];

export function nouveauComplement(modele, id) {
  return { id, nom: modele.nom, dose: modele.dose || '', heure: modele.heure || '08:00', actif: true };
}

const minutes = h => { const [a, b] = String(h).split(':').map(Number); return (a || 0) * 60 + (b || 0); };
export const heureValide = h => /^([01]\d|2[0-3]):[0-5]\d$/.test(h);

// État du jour pour chaque complément actif : pris, à prendre maintenant, ou plus tard.
export function etatDuJour(liste, pris, date, maintenant = '23:59') {
  const faits = new Set(pris?.[date] || []);
  return liste.filter(c => c.actif).sort((a, b) => minutes(a.heure) - minutes(b.heure)).map(c => ({
    ...c,
    statut: faits.has(c.id) ? 'pris' : minutes(c.heure) <= minutes(maintenant) ? 'maintenant' : 'plus-tard',
  }));
}

// Jours d'affilée où le complément a été pris (aujourd'hui compte s'il est déjà pris).
export function serie(id, pris, date) {
  let n = 0;
  const d = new Date(date + 'T12:00:00');
  const cle = x => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
  if (!(pris?.[cle(d)] || []).includes(id)) d.setDate(d.getDate() - 1);
  for (let i = 0; i < 400; i++) {
    if (!(pris?.[cle(d)] || []).includes(id)) break;
    n++; d.setDate(d.getDate() - 1);
  }
  return n;
}

export function basculerPris(pris, id, date) {
  const jourActuel = new Set(pris?.[date] || []);
  jourActuel.has(id) ? jourActuel.delete(id) : jourActuel.add(id);
  const out = { ...pris, [date]: [...jourActuel] };
  // On ne garde que 60 jours d'historique.
  const limite = new Date(date + 'T12:00:00'); limite.setDate(limite.getDate() - 60);
  for (const k of Object.keys(out)) if (new Date(k + 'T12:00:00') < limite) delete out[k];
  return out;
}

// Notifications quotidiennes à programmer : une par heure de prise (les compléments à la même heure sont regroupés).
export const ID_BASE = 7000;
export function planNotifications(liste) {
  const parHeure = new Map();
  for (const c of liste.filter(x => x.actif && heureValide(x.heure))) {
    if (!parHeure.has(c.heure)) parHeure.set(c.heure, []);
    parHeure.get(c.heure).push(c);
  }
  return [...parHeure.entries()].sort(([a], [b]) => minutes(a) - minutes(b)).slice(0, 20).map(([heure, items], i) => {
    const [hour, minute] = heure.split(':').map(Number);
    return {
      id: ID_BASE + i,
      title: items.length === 1 ? `Rappel : ${items[0].nom}` : 'Rappel : tes compléments',
      body: items.map(c => `${c.nom}${c.dose ? ` : ${c.dose}` : ''}`).join(' · ') + '. Coche dans Veilleur quand c’est pris.',
      schedule: { on: { hour, minute }, allowWhileIdle: true },
    };
  });
}
