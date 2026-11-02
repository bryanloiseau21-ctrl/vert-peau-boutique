import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../www/coach.js';

const profil = { prenom: 'Sam', objectif: 'muscle', niveau: 'debutant', seancesSemaine: 3, duree: 30, materiel: [], zones: [], ton: 'motivant' };
const enForme = { energie: 4, sommeil: 4, courbatures: 2 };

test('une séance normale respecte la durée et le niveau', () => {
  const etat = C.etatInitial(profil);
  const s = C.genererSeance(profil, etat, enForme, '2026-11-02');
  assert.equal(s.type, 'normale');
  assert.equal(s.exercices.length, 4);
  assert.ok(s.exercices.every(e => e.series >= 1 && e.cible > 0));
  assert.equal(new Set(s.exercices.map(e => e.chaine)).size, s.exercices.length, 'pas de doublon');
});

test('forme basse : récupération active', () => {
  const s = C.genererSeance(profil, C.etatInitial(profil), { energie: 1, sommeil: 1, courbatures: 5 }, '2026-11-02');
  assert.equal(s.type, 'recup');
  assert.ok(s.raisons[0].includes('Forme basse'));
});

test('les zones sensibles et le matériel filtrent les exercices', () => {
  const p = { ...profil, zones: ['genoux', 'poignets'], materiel: [] };
  const ids = C.chainesPermises(p, C.etatInitial(p)).map(c => c.id);
  for (const interdit of ['squat', 'fentes', 'pompes', 'cardio-impact', 'goblet', 'tractions']) assert.ok(!ids.includes(interdit), interdit);
  assert.ok(ids.includes('pont'));
});

test('séance réussie et facile : la cible monte', () => {
  const etat = C.etatInitial(profil);
  const s = C.genererSeance(profil, etat, enForme, '2026-11-02');
  const res = s.exercices.map(e => Array(e.series).fill(e.cible + 3));
  const { etat: e2, changements } = C.appliquerResultat(profil, etat, s, res, 1, '2026-11-02');
  const id = s.exercices[0].chaine;
  assert.ok(e2.chaines[id].cible > etat.chaines[id].cible);
  assert.ok(e2.charge > etat.charge);
  assert.ok(changements.length > 0);
  assert.equal(e2.historique.length, 1);
});

test('séance ratée et trop dure : la cible baisse et la charge aussi', () => {
  const etat = C.etatInitial(profil);
  const s = C.genererSeance(profil, etat, enForme, '2026-11-02');
  const res = s.exercices.map(e => Array(e.series).fill(Math.floor(e.cible / 3)));
  const { etat: e2 } = C.appliquerResultat(profil, etat, s, res, 4, '2026-11-02');
  const id = s.exercices[0].chaine;
  assert.ok(e2.chaines[id].cible < etat.chaines[id].cible);
  assert.ok(e2.charge < 1);
});

test('dépasser le plafond fait passer à la variante suivante', () => {
  const etat = C.etatInitial(profil);
  etat.chaines.pompes = { rang: 0, cible: 15 };
  const s = { type: 'normale', duree: 30, forme: 0.7, exercices: [{ chaine: 'pompes', nom: 'x', mode: 'reps', cible: 15, series: 2, motif: 'pousser' }] };
  const { etat: e2, changements } = C.appliquerResultat(profil, etat, s, [[16, 16]], 2, '2026-11-02');
  assert.equal(e2.chaines.pompes.rang, 1);
  assert.equal(e2.chaines.pompes.cible, 8);
  assert.equal(changements[0].type, 'monte');
});

test('remplacer un exercice deux fois l’exclut', () => {
  let etat = C.etatInitial(profil);
  let s = C.genererSeance(profil, etat, enForme, '2026-11-02');
  const id = s.exercices[0].chaine;
  ({ seance: s, etat } = C.remplacerExercice(profil, etat, s, 0));
  assert.notEqual(s.exercices[0].chaine, id);
  etat.nonAime[id] = 2;
  assert.ok(!C.chainesPermises(profil, etat).some(c => c.id === id));
});

test('longue absence : reprise en douceur', () => {
  const etat = C.etatInitial(profil);
  etat.historique.push({ date: '2026-10-20', minutes: 30 });
  const normal = C.genererSeance(profil, { ...etat, historique: [{ date: '2026-11-01' }] }, enForme, '2026-11-02');
  const reprise = C.genererSeance(profil, etat, enForme, '2026-11-02');
  assert.ok(reprise.raisons.some(r => r.includes('reprise')));
  assert.ok(reprise.exercices[0].cible <= normal.exercices.find(e => e.chaine === reprise.exercices[0].chaine)?.cible ?? Infinity);
});

test('bilan de semaine et série', () => {
  const etat = C.etatInitial(profil);
  etat.historique = ['2026-10-26', '2026-10-28', '2026-10-30', '2026-11-02'].map(date => ({ date }));
  const b = C.bilanSemaine(profil, etat, '2026-11-03');
  assert.equal(b.faites, 1);
  assert.equal(b.serie, 1);
  assert.equal(b.joursDepuis, 1);
});

test('le profil exemple est cohérent', () => {
  const { profil: p, etat } = C.exemple('2026-11-02');
  assert.ok(C.profilValide(p));
  assert.equal(etat.historique.length, 7);
  assert.equal(C.semainesRecentes(etat, '2026-11-02').length, 8);
});

test('le ton change le message', () => {
  const etat = C.etatInitial(profil);
  const a = C.messageCoach({ ...profil, ton: 'doux' }, etat, null, '2026-11-02');
  const b = C.messageCoach({ ...profil, ton: 'cash' }, etat, null, '2026-11-02');
  assert.notEqual(a, b);
});
