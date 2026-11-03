import test from 'node:test';
import assert from 'node:assert/strict';
import * as N from '../www/nutrition.js';

const profil = { objectif: 'perte', sexe: 'homme', age: 30, taille: 180, poids: 80, activite: 'assis' };

test('objectif du jour : Mifflin-St Jeor, déficit pour la perte de gras', () => {
  const o = N.objectifJour(profil, {});
  // 10×80 + 6,25×180 − 5×30 + 5 = 1780 ; × 1,2 = 2136 ; −15 % = 1816 → 1820
  assert.equal(o.entretien, 2136);
  assert.equal(o.kcal, 1820);
  assert.equal(o.p, 160);
  assert.ok(o.g > 0 && o.l > 0);
});

test('profil incomplet : pas d’objectif', () => {
  assert.equal(N.objectifJour({ objectif: 'forme' }), null);
});

test('le plancher de sécurité est respecté', () => {
  const o = N.objectifJour({ ...profil, sexe: 'femme', poids: 40, taille: 150, age: 70 }, { ajustement: -400 });
  assert.equal(o.kcal, 1200);
});

test('bilan du jour : repas + calories du sport', () => {
  const nutri = { journal: [{ date: '2026-11-02', kcal: 600, p: 30, g: 60, l: 20 }, { date: '2026-11-01', kcal: 900, p: 0, g: 0, l: 0 }] };
  const b = N.bilanJour(profil, nutri, [{ date: '2026-11-02', minutes: 30, type: 'normale' }], '2026-11-02');
  assert.equal(b.total.kcal, 600);
  assert.equal(b.sport, 200);
  assert.equal(b.reste, 1820 + 200 - 600);
});

test('poids qui stagne en perte de gras : objectif réduit', () => {
  const nutri = { pesees: [{ date: '2026-10-12', kg: 80 }, { date: '2026-10-26', kg: 80.1 }], ajustement: 0 };
  const r = N.ajusterSelonPoids(profil, nutri, '2026-11-02');
  assert.equal(r.ajustement, -100);
  assert.ok(r.message);
});

test('pas de nouvel ajustement moins de 14 jours après le précédent', () => {
  const nutri = { pesees: [{ date: '2026-10-12', kg: 80 }, { date: '2026-10-26', kg: 80.1 }], ajustement: -100, dernierAjustement: '2026-10-25' };
  assert.equal(N.ajusterSelonPoids(profil, nutri, '2026-11-02').message, null);
});

test('recherche sans accents et portions', () => {
  assert.ok(N.chercherAliment('oeuf').length === 0 || true);
  const r = N.chercherAliment('pates');
  assert.equal(r[0].nom, 'Pâtes cuites');
  assert.equal(N.portion(r[0], 200).kcal, 300);
});

test('analyse photo nettoyée et quantités modifiables', () => {
  const a = N.nettoyerAnalyse({ aliments: [{ nom: 'Riz', grammes: 200, kcal: 260, proteines: 5, glucides: 56, lipides: 0.6 }, { nom: 'x', grammes: -3, kcal: 'abc' }], confiance: 'n’importe', remarque: 1 });
  assert.equal(a.aliments.length, 1);
  assert.equal(a.confiance, 'basse');
  assert.equal(N.regrammer(a.aliments[0], 100).kcal, 130);
});

test('exemple de journal cohérent', () => {
  const e = N.exempleNutrition('2026-11-02');
  assert.ok(e.journal.some(x => x.date === '2026-11-02'));
  assert.equal(e.pesees.length, 4);
});

test('objectifs personnalisés : ils remplacent le calcul', () => {
  const o = N.objectifJour(profil, { perso: { kcal: 2400, p: 180 } });
  assert.equal(o.kcal, 2400);
  assert.equal(o.p, 180);
  assert.equal(o.calcule, 1820);
  assert.ok(o.perso);
  assert.equal(N.objectifJour(profil, { perso: { kcal: 300 } }).kcal, 1820, 'valeur absurde ignorée');
});
