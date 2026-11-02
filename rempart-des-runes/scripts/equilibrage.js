// Simule des parties avec un joueur automatique pour vérifier la difficulté.
// Lance : npm run equilibrage   (options : --parties 40 --niveaux 1,5,10)
import { createBattle, step, summon, merge, canMerge, powerUp, canPowerUp, canSummon } from '../www/js/engine.js';
import { STARTER_DECK, UNIT_KEYS, CHALLENGE_RULES } from '../www/js/data.js';
import { challengeOf } from '../www/js/meta.js';

const arg = (name, def) => { const i = process.argv.indexOf('--' + name); return i > 0 ? process.argv[i + 1] : def; };
const PARTIES = Number(arg('parties', 40));
const NIVEAUX = arg('niveaux', '1,5,10').split(',').map(Number);

// Petit générateur pseudo-aléatoire reproductible
function mulberry32(seed) {
  return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** Joueur automatique "correct" : agit toutes les 0,6 s comme un humain attentif. */
function act(b) {
  // 1. fusionner les plus petites paires si le plateau est presque plein
  const full = b.board.filter(Boolean).length >= 11;
  if (full || !canSummon(b)) {
    let best = null;
    for (let i = 0; i < b.board.length; i++) for (let j = 0; j < b.board.length; j++)
      if (canMerge(b, i, j) && (!best || b.board[i].pip < b.board[best[0]].pip)) best = [i, j];
    if (best) { merge(b, best[0], best[1]); return; }
  }
  // 2. renforcer quand on a de la marge
  if (b.board.filter(Boolean).length >= 10) {
    const slots = [0, 1, 2, 3, 4].sort((x, y) => b.power[b.deck[x]] - b.power[b.deck[y]]);
    for (const s of slots) if (b.mana > 2 * b.summonCost + 100 && canPowerUp(b, s)) { powerUp(b, s); return; }
  }
  // 3. invoquer
  if (canSummon(b)) summon(b);
}

function play(level, seed, deck = STARTER_DECK, mods = {}) {
  const rng = mulberry32(seed);
  const levels = Object.fromEntries(UNIT_KEYS.map((k) => [k, level]));
  const b = createBattle({ deck, levels, rng, mods });
  let t = 0;
  while (!b.over && b.time < 3600) {
    step(b, 1 / 30); t += 1 / 30;
    if (t >= 0.6) { t = 0; act(b); }
    b.events.length = 0;
  }
  return [b.wave, b.time];
}

const pct = (arr, p) => arr[Math.min(arr.length - 1, Math.floor(arr.length * p))];
console.log(`Parties simulées par niveau : ${PARTIES}\n`);
console.log('Niveau cartes | min | médiane | max | durée moyenne');
for (const lvl of NIVEAUX) {
  const res = [];
  for (let i = 0; i < PARTIES; i++) res.push(play(lvl, 1000 + i));
  const waves = res.map((r) => r[0]).sort((a, b) => a - b);
  const min = Math.round(res.reduce((a, r) => a + r[1], 0) / res.length / 60);
  console.log(`${String(lvl).padStart(13)} | ${String(waves[0]).padStart(3)} | ${String(pct(waves, 0.5)).padStart(7)} | ${String(waves.at(-1)).padStart(3)} | ${min} min`);
}

// Défi de la semaine : chaque règle, sur les decks des 12 prochaines semaines (runes niveau 6)
console.log('\nDéfi (12 semaines) | règle | vague médiane');
for (const rule of CHALLENGE_RULES) {
  const waves = [];
  for (let w = 1; w <= 12; w++) {
    const c = challengeOf(`2027-W${String(w).padStart(2, '0')}`);
    for (let i = 0; i < 3; i++) waves.push(play(6, w * 31 + i, c.deck, rule.mods)[0]);
  }
  waves.sort((a, b) => a - b);
  console.log(`${rule.icon} ${rule.name.padEnd(16)} | min ${waves[0]} | médiane ${pct(waves, 0.5)} | max ${waves.at(-1)}`);
}
