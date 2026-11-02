// Moteur de combat : logique pure, sans affichage ni DOM.
// Utilisé par le jeu, les tests et le script d'équilibrage.
import { UNITS, ENEMIES, BOSSES, BALANCE as B, MAX_PIP, MAX_POWER, DECK_SIZE } from './data.js';

export const W = 360, H = 640;
export const COLS = 5, ROWS = 3, CELL = 54;
export const GX = (W - COLS * CELL) / 2, GY = 262;
export const PATH = [[24, 500], [24, 224], [336, 224], [336, 500]];

const SEGS = [];
export let PATH_LEN = 0;
for (let i = 0; i < PATH.length - 1; i++) {
  const [x1, y1] = PATH[i], [x2, y2] = PATH[i + 1];
  const l = Math.hypot(x2 - x1, y2 - y1);
  SEGS.push({ x1, y1, x2, y2, l, s: PATH_LEN });
  PATH_LEN += l;
}
export function posAt(d) {
  for (const s of SEGS) {
    if (d <= s.s + s.l) {
      const t = Math.max(0, (d - s.s) / s.l);
      return [s.x1 + (s.x2 - s.x1) * t, s.y1 + (s.y2 - s.y1) * t];
    }
  }
  return PATH[PATH.length - 1].slice();
}
export const cellCenter = (i) => [GX + (i % COLS) * CELL + CELL / 2, GY + Math.floor(i / COLS) * CELL + CELL / 2];
export function cellAt(x, y) {
  const c = Math.floor((x - GX) / CELL), r = Math.floor((y - GY) / CELL);
  return c >= 0 && c < COLS && r >= 0 && r < ROWS ? r * COLS + c : -1;
}
export const powerCost = (lvl) => (lvl < MAX_POWER ? B.powerCosts[lvl - 1] : Infinity);
export const bossForWave = (w) => (w > 0 && w % 5 === 0 ? BOSSES[(w / 5 - 1) % BOSSES.length] : null);
export const enemyHp = (wave, mult) => Math.round(B.hpBase * Math.pow(B.hpGrowth, wave - 1) * (1 + wave * B.hpLinear) * mult);

/**
 * @param {{deck:string[], levels:Record<string,number>, rng?:()=>number}} opts
 */
export function createBattle({ deck, levels = {}, rng = Math.random }) {
  if (!Array.isArray(deck) || deck.length !== DECK_SIZE) throw new Error('Le deck doit contenir 5 runes');
  return {
    deck: deck.slice(), levels: { ...levels }, rng,
    board: new Array(COLS * ROWS).fill(null),
    enemies: [], shots: [], events: [],
    mana: B.startMana, summonCost: B.summonCost, lives: B.lives,
    wave: 0, queue: [], spawnT: 0, pause: B.firstPause,
    power: Object.fromEntries(deck.map((k) => [k, 1])),
    kills: 0, time: 0, over: false, nextId: 1,
  };
}

const randomRune = (b) => b.deck[Math.floor(b.rng() * b.deck.length)];

export function unitDamage(b, u) {
  const def = UNITS[u.k];
  return def.dmg
    * (1 + B.cardBonus * ((b.levels[u.k] || 1) - 1))
    * (1 + B.powerBonus * (b.power[u.k] - 1))
    * Math.pow(B.pipMult, u.pip - 1);
}

export function freeCells(b) {
  const out = [];
  b.board.forEach((u, i) => { if (!u) out.push(i); });
  return out;
}
export const canSummon = (b) => !b.over && b.mana >= b.summonCost && b.board.some((u) => !u);

/** Invoque une rune aléatoire sur une case libre. Renvoie l'index ou -1. */
export function summon(b) {
  if (!canSummon(b)) return -1;
  const free = freeCells(b);
  const i = free[Math.floor(b.rng() * free.length)];
  b.mana -= b.summonCost;
  b.summonCost += B.summonCostStep;
  b.board[i] = { k: randomRune(b), pip: 1, cd: 0.2 + b.rng() * 0.4, stun: 0 };
  b.events.push({ type: 'summon', i });
  return i;
}

export function canMerge(b, from, to) {
  if (from === to || from < 0 || to < 0) return false;
  const a = b.board[from], c = b.board[to];
  return !!(a && c && a.k === c.k && a.pip === c.pip && a.pip < MAX_PIP);
}
/** Fusionne la rune de `from` sur `to`. La nouvelle rune est aléatoire, d'un niveau au-dessus. */
export function merge(b, from, to) {
  if (b.over || !canMerge(b, from, to)) return false;
  const pip = b.board[to].pip + 1;
  b.board[from] = null;
  b.board[to] = { k: randomRune(b), pip, cd: 0.3, stun: 0 };
  b.events.push({ type: 'merge', i: to, pip });
  return true;
}

export const canPowerUp = (b, slot) => {
  const k = b.deck[slot];
  return !b.over && b.power[k] < MAX_POWER && b.mana >= powerCost(b.power[k]);
};
export function powerUp(b, slot) {
  if (!canPowerUp(b, slot)) return false;
  const k = b.deck[slot];
  b.mana -= powerCost(b.power[k]);
  b.power[k]++;
  b.events.push({ type: 'power', k, lvl: b.power[k] });
  return true;
}

function startWave(b) {
  b.wave++;
  const w = b.wave, list = [];
  const boss = bossForWave(w);
  if (boss) list.push('boss');
  const n = B.baseCount + Math.floor(w * B.countPerWave);
  for (let i = 0; i < n; i++) {
    const r = b.rng();
    list.push(w >= 3 && r < 0.2 ? 'rapide' : w >= 4 && r < 0.32 ? 'tank' : 'normal');
  }
  b.queue = list;
  b.spawnT = boss ? 1.2 : 0;
  let bonus = 0;
  for (const u of b.board) if (u && UNITS[u.k].type === 'mana') bonus += B.manaUnitPerPip * u.pip * b.power[u.k];
  if (bonus) b.mana += bonus;
  b.events.push({ type: 'wave', wave: w, boss: boss && boss.id, bonus });
}

function spawn(b, type, d = 0) {
  const w = b.wave;
  const isBoss = type === 'boss';
  const t = isBoss ? bossForWave(w) : ENEMIES[type];
  const hp = enemyHp(w, t.hp);
  const [x, y] = posAt(d);
  const e = {
    id: b.nextId++, type, boss: isBoss ? t.id : null, d, x, y, hp, max: hp,
    spd: t.spd * (1 + w * B.speedGrowth), r: t.r, color: t.color, mana: t.mana,
    slowT: 0, slowF: 1, poison: 0, poisonT: 0, abilityT: t.every || 0, hit: 0,
  };
  b.enemies.push(e);
  if (isBoss) b.events.push({ type: 'boss', id: t.id });
  return e;
}

function hurt(b, e, dmg) {
  if (e.hp <= 0) return;
  e.hp -= dmg;
  e.hit = 0.12;
  if (e.hp <= 0) {
    b.mana += e.mana;
    b.kills++;
    b.events.push({ type: 'kill', x: e.x, y: e.y, color: e.color, boss: !!e.boss, mana: e.mana });
  }
}

function pickTarget(b, mode) {
  let best = null, bv = -Infinity;
  for (const e of b.enemies) {
    if (e.hp <= 0) continue;
    const v = mode === 'strong' ? e.hp : e.d;
    if (v > bv) { bv = v; best = e; }
  }
  return best;
}

function impact(b, s) {
  const def = UNITS[s.k], e = s.e;
  switch (def.type) {
    case 'splash': {
      const R = 38 + s.pip * 2;
      for (const o of b.enemies) if (o.hp > 0 && Math.hypot(o.x - e.x, o.y - e.y) < R) hurt(b, o, o === e ? s.dmg : s.dmg * 0.6);
      b.events.push({ type: 'splash', x: e.x, y: e.y, r: R, color: def.color });
      break;
    }
    case 'slow':
      hurt(b, e, s.dmg);
      e.slowT = 1.6;
      e.slowF = Math.min(e.slowF, 1 - Math.min(0.6, 0.25 + 0.06 * s.pip));
      break;
    case 'chain': {
      hurt(b, e, s.dmg);
      let prev = e;
      const hit = new Set([e]);
      const jumps = 2 + Math.floor(s.pip / 3);
      for (let j = 0; j < jumps; j++) {
        let nb = null, nd = 110;
        for (const o of b.enemies) {
          if (o.hp <= 0 || hit.has(o)) continue;
          const dd = Math.hypot(o.x - prev.x, o.y - prev.y);
          if (dd < nd) { nd = dd; nb = o; }
        }
        if (!nb) break;
        b.events.push({ type: 'zap', x: prev.x, y: prev.y, x2: nb.x, y2: nb.y, color: def.color });
        hurt(b, nb, s.dmg * 0.7);
        hit.add(nb);
        prev = nb;
      }
      break;
    }
    case 'poison':
      hurt(b, e, s.dmg);
      e.poison = Math.max(e.poison, s.dmg * 2.2);
      e.poisonT = 3;
      break;
    case 'reap':
      if (!e.boss && b.rng() < 0.02 * s.pip) {
        b.events.push({ type: 'reap', x: e.x, y: e.y });
        hurt(b, e, e.hp + 1);
      } else hurt(b, e, e.boss ? s.dmg * 1.5 : s.dmg);
      break;
    default:
      hurt(b, e, s.dmg);
  }
}

function bossAbility(b, e) {
  if (e.boss === 'invocateur') {
    for (let i = 0; i < 2; i++) spawn(b, 'sbire', Math.max(0, e.d - 12 - i * 14));
    b.events.push({ type: 'ability', id: e.boss, x: e.x, y: e.y });
  } else if (e.boss === 'briseur') {
    const units = b.board.map((u, i) => (u && u.stun <= 0 ? i : -1)).filter((i) => i >= 0);
    if (units.length) {
      const i = units[Math.floor(b.rng() * units.length)];
      b.board[i].stun = 3;
      b.events.push({ type: 'ability', id: e.boss, i, x: e.x, y: e.y });
    }
  }
}

/** Avance la simulation de `dt` secondes. */
export function step(b, dt) {
  if (b.over) return;
  b.time += dt;

  // Vagues
  if (!b.queue.length && !b.enemies.length) {
    b.pause -= dt;
    if (b.pause <= 0) { startWave(b); b.pause = B.wavePause; }
  }
  if (b.queue.length) {
    b.spawnT -= dt;
    if (b.spawnT <= 0) {
      spawn(b, b.queue.shift());
      b.spawnT = Math.max(0.35, 0.9 - b.wave * 0.02);
    }
  }

  // Ennemis
  for (const e of b.enemies) {
    if (e.hp <= 0) continue;
    if (e.hit > 0) e.hit -= dt;
    if (e.slowT > 0) { e.slowT -= dt; if (e.slowT <= 0) e.slowF = 1; }
    if (e.poisonT > 0) { e.poisonT -= dt; hurt(b, e, e.poison * dt); if (e.hp <= 0) continue; }
    if (e.abilityT) {
      e.abilityT -= dt;
      if (e.abilityT <= 0) { bossAbility(b, e); e.abilityT = bossForWave(b.wave)?.every || 4; }
    }
    e.d += e.spd * e.slowF * dt;
    [e.x, e.y] = posAt(e.d);
    if (e.d >= PATH_LEN) {
      e.hp = 0;
      const lost = e.boss ? B.bossLeak : 1;
      b.lives = Math.max(0, b.lives - lost);
      b.events.push({ type: 'leak', lost, boss: !!e.boss });
      if (b.lives <= 0) {
        b.over = true;
        b.events.push({ type: 'over', wave: b.wave, kills: b.kills });
        return;
      }
    }
  }
  b.enemies = b.enemies.filter((e) => e.hp > 0);

  // Runes
  b.board.forEach((u, i) => {
    if (!u) return;
    if (u.stun > 0) { u.stun -= dt; return; }
    u.cd -= dt;
    if (u.cd > 0) return;
    const def = UNITS[u.k];
    const tgt = pickTarget(b, def.type === 'strong' ? 'strong' : 'first');
    if (!tgt) return;
    const [x, y] = cellCenter(i);
    b.shots.push({ x, y, e: tgt, dmg: unitDamage(b, u), k: u.k, pip: u.pip, color: def.color });
    u.cd = 1 / def.rate;
    u.fire = 0.12;
    b.events.push({ type: 'shoot', k: u.k });
  });
  for (const u of b.board) if (u && u.fire > 0) u.fire -= dt;

  // Projectiles
  for (const s of b.shots) {
    if (s.e.hp <= 0) { s.dead = true; continue; }
    const dx = s.e.x - s.x, dy = s.e.y - s.y, dist = Math.hypot(dx, dy), stepLen = 620 * dt;
    if (dist <= stepLen) { s.dead = true; impact(b, s); } else { s.x += (dx / dist) * stepLen; s.y += (dy / dist) * stepLen; }
  }
  b.shots = b.shots.filter((s) => !s.dead);
  b.enemies = b.enemies.filter((e) => e.hp > 0);
}

/** Abandon : termine la partie à la vague actuelle. */
export function forfeit(b) {
  if (b.over) return;
  b.over = true;
  b.events.push({ type: 'over', wave: b.wave, kills: b.kills, forfeit: true });
}

export const remainingEnemies = (b) => b.enemies.length + b.queue.length;
