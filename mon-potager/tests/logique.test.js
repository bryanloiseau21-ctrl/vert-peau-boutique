// Tests de la logique : calendrier par zone, conseils du mois, climat, récoltes, redressement de la photo.
// Lance : node --test tests/logique.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { PLANTES, PLANTE_PAR_ID, ZONES } from '../www/js/data.js';
import { ETAPES, lienWiki } from '../www/js/etapes.js';
import {
  periodes, ajusterMois, calendrier, recommandations, saison, travauxDuMois, detecterZone,
  estimerRecolte, avancement, bonnePeriode, disposerBacs, plantesGelives, homographie, appliquer, redresser, tailleRedressee, versISO,
} from '../www/js/logique.js';

test('base de plantes cohérente', () => {
  const ids = new Set();
  for (const p of PLANTES) {
    assert.ok(!ids.has(p.id), `id en double : ${p.id}`); ids.add(p.id);
    for (const k of ['sa', 'st', 'pl', 're']) for (const m of p[k]) assert.ok(m >= 1 && m <= 12, `${p.id}.${k}`);
    assert.ok(p.sa.length + p.st.length + p.pl.length > 0, `${p.id} : aucune date de mise en terre`);
    assert.ok(p.re.length > 0 && p.jours > 0, `${p.id} : récolte`);
    for (const a of p.amis || []) assert.ok(PLANTE_PAR_ID[a], `${p.id} : voisin inconnu ${a}`);
  }
  assert.ok(PLANTES.length >= 40);
});

test('chaque plante a ses étapes et son lien', () => {
  for (const p of PLANTES) {
    const e = ETAPES[p.id];
    assert.ok(e, `${p.id} : pas d'étapes`);
    assert.ok(e.etapes.length >= 3, `${p.id} : au moins 3 étapes`);
    assert.ok(lienWiki(e.wiki).startsWith('https://fr.wikipedia.org/'), p.id);
  }
  assert.equal(Object.keys(ETAPES).length, PLANTES.length);
});

test('périodes continues, y compris à cheval sur deux années', () => {
  assert.deepEqual(periodes([5, 6, 7]), [[5, 7]]);
  assert.deepEqual(periodes([11, 12, 1, 2]), [[11, 2]]);
  assert.deepEqual(periodes([3, 4, 9, 10]), [[3, 4], [9, 10]]);
  assert.deepEqual(periodes([]), []);
});

test('zone de référence : calendrier inchangé', () => {
  const t = PLANTE_PAR_ID.tomate;
  assert.deepEqual(ajusterMois(t.pl, 'oceanique', 'nord'), [5, 6]);
  assert.deepEqual(ajusterMois(t.re, 'oceanique', 'nord'), [7, 8, 9, 10]);
});

test('méditerranéen : plus tôt et plus longtemps ; montagne : plus tard et plus court', () => {
  const t = PLANTE_PAR_ID.tomate;
  assert.deepEqual(ajusterMois(t.pl, 'mediterraneen'), [4, 5]);
  assert.deepEqual(ajusterMois(t.re, 'mediterraneen'), [6, 7, 8, 9, 10, 11]);
  assert.deepEqual(ajusterMois(t.pl, 'montagne'), [6, 7]);
  assert.deepEqual(ajusterMois(t.re, 'montagne'), [8, 9]);
  // l'ail se plante plus tard en climat doux
  assert.ok(ajusterMois(PLANTE_PAR_ID.ail.pl, 'mediterraneen').includes(12));
});

test('hémisphère sud : décalage de 6 mois', () => {
  assert.deepEqual(ajusterMois([5, 6], 'oceanique', 'sud'), [11, 12]);
  assert.equal(saison(1, 'sud').nom, 'Été');
  assert.equal(saison(1, 'nord').nom, 'Hiver');
  assert.equal(saison(10, 'nord').nom, 'Automne');
});

test('tropical : toute l\'année', () => {
  assert.equal(ajusterMois([5], 'tropical').length, 12);
  assert.ok(travauxDuMois(3, 'tropical').length > 0);
});

test('conseils du mois', () => {
  const mai = recommandations(5, 'oceanique', 'nord');
  assert.ok(mai.pl.some((p) => p.id === 'tomate'), 'tomates à planter en mai');
  const nov = recommandations(11, 'oceanique', 'nord');
  assert.ok(nov.pl.some((p) => p.id === 'ail'), 'ail en novembre');
  assert.ok(!nov.pl.some((p) => p.id === 'tomate'), 'pas de tomates en novembre');
  assert.ok(nov.re.some((p) => p.id === 'poireau'), 'poireaux à récolter');
  for (let m = 1; m <= 12; m++) assert.ok(travauxDuMois(m).length >= 2);
  assert.equal(bonnePeriode('tomate', 5, 'oceanique', 'nord'), true);
  assert.equal(bonnePeriode('tomate', 12, 'oceanique', 'nord'), false);
});

test('détection du climat selon la position', () => {
  const cas = [
    [48.85, 2.35, 35, 'oceanique', 'nord'], // Paris
    [47.22, -1.55, 10, 'oceanique', 'nord'], // Nantes
    [43.3, 5.37, 20, 'mediterraneen', 'nord'], // Marseille
    [43.6, 3.88, 30, 'mediterraneen', 'nord'], // Montpellier
    [48.58, 7.75, 140, 'continental', 'nord'], // Strasbourg
    [45.92, 6.87, 1035, 'montagne', 'nord'], // Chamonix
    [-21.1, 55.5, 100, 'tropical', 'sud'], // La Réunion
    [45.5, -73.57, 50, 'continental', 'nord'], // Montréal
    [-37.8, 144.96, 30, 'mediterraneen', 'sud'], // Melbourne
  ];
  for (const [lat, lon, alt, zone, hemi] of cas) {
    const r = detecterZone(lat, lon, alt);
    assert.equal(r.zone, zone, `${lat},${lon}`);
    assert.equal(r.hemisphere, hemi);
    assert.ok(ZONES[r.zone]);
  }
});

test('serre : saison plus longue', () => {
  const t = PLANTE_PAR_ID.tomate;
  assert.deepEqual(ajusterMois(t.pl, 'oceanique', 'nord', 'serre'), [4, 5]);
  assert.deepEqual(ajusterMois(t.re, 'oceanique', 'nord', 'serre'), [6, 7, 8, 9, 10, 11]);
  assert.equal(bonnePeriode('melon', 3, 'oceanique', 'nord'), false);
  assert.equal(bonnePeriode('melon', 3, 'oceanique', 'nord', 'serre'), true);
  // en serre, la tomate n'est pas dans l'alerte gel
  const bacs = [{ id: 'a', type: 'bac' }, { id: 's', type: 'serre' }];
  assert.equal(plantesGelives([{ plante: 'tomate', bac: 's' }], bacs).length, 0);
  assert.equal(plantesGelives([{ plante: 'tomate', bac: 'a' }], bacs).length, 1);
});

test('disposition des bacs sur l\'île', () => {
  const bacs = [{ id: 'a', largeur: 4, longueur: 3 }, { id: 'b', largeur: 2, longueur: 1 }, { id: 'c', largeur: 6, longueur: 3 }];
  const { places, rayon } = disposerBacs(bacs);
  // aucun bac ne se chevauche
  for (let i = 0; i < bacs.length; i++) for (let j = i + 1; j < bacs.length; j++) {
    const A = bacs[i], B = bacs[j], pa = places[A.id], pb = places[B.id];
    const sepX = Math.abs(pa.x - pb.x) >= (A.largeur + B.largeur) / 2 - 1e-9;
    const sepZ = Math.abs(pa.z - pb.z) >= (A.longueur + B.longueur) / 2 - 1e-9;
    assert.ok(sepX || sepZ, `${A.id} et ${B.id} se chevauchent`);
  }
  assert.ok(rayon > 3 && rayon < 10);
  assert.deepEqual(disposerBacs([{ id: 'x', largeur: 4, longueur: 2 }]).places.x, { x: 0, z: 0 });
});

test('estimation de la récolte', () => {
  // tomate plantée le 15 mai → 70 jours → fin juillet
  assert.equal(versISO(estimerRecolte({ plante: 'tomate', date: '2026-05-15' })), '2026-07-24');
  // ail planté en novembre → au moins 180 jours → juin suivant (1er mois de récolte)
  assert.equal(versISO(estimerRecolte({ plante: 'ail', date: '2026-11-02' })), '2027-06-01');
  // tomate plantée trop tard : la récolte saute à la saison suivante
  assert.equal(versISO(estimerRecolte({ plante: 'tomate', date: '2026-09-15' })), '2027-07-01');
  assert.equal(estimerRecolte({ plante: 'inconnue', date: '2026-01-01' }), null);
  const p = { plante: 'radis', date: '2026-04-01' };
  assert.equal(avancement(p, new Date(2026, 2, 1)), 0);
  assert.equal(avancement(p, new Date(2026, 6, 1)), 1);
  const mi = avancement(p, new Date(2026, 3, 13, 12));
  assert.ok(mi > 0.4 && mi < 0.6, `mi-parcours : ${mi}`);
});

test('homographie : les coins tombent juste', () => {
  const q = [{ x: 10, y: 20 }, { x: 110, y: 15 }, { x: 130, y: 200 }, { x: 0, y: 180 }];
  const H = homographie(q);
  [[0, 0], [1, 0], [1, 1], [0, 1]].forEach(([u, v], i) => {
    const p = appliquer(H, u, v);
    assert.ok(Math.abs(p.x - q[i].x) < 1e-6 && Math.abs(p.y - q[i].y) < 1e-6, `coin ${i}`);
  });
});

test('redressement : ne garde que l\'intérieur du quadrilatère', () => {
  // image 20×20 : fond vert, carré marron de (5,5) à (15,15)
  const L = 20, src = new Uint8ClampedArray(L * L * 4);
  for (let y = 0; y < L; y++) for (let x = 0; x < L; x++) {
    const dedans = x >= 5 && x < 15 && y >= 5 && y < 15, i = (y * L + x) * 4;
    src.set(dedans ? [120, 75, 40, 255] : [0, 200, 0, 255], i);
  }
  const out = redresser(src, L, L, [{ x: 5, y: 5 }, { x: 15, y: 5 }, { x: 15, y: 15 }, { x: 5, y: 15 }], 8, 8);
  for (let i = 0; i < out.length; i += 4) assert.ok(out[i + 1] < 120, 'plus de vert du fond');
  assert.deepEqual(tailleRedressee(4, 2), { l: 1024, h: 512 });
  assert.deepEqual(tailleRedressee(1, 2), { l: 512, h: 1024 });
});
