// Tests de la logique du jeu (sans navigateur). Lance : npm run test:logique
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createBattle, step, summon, merge, canMerge, powerUp, forfeit, unitDamage, posAt, PATH_LEN, bossForWave, enemyHp,
} from '../www/js/engine.js';
import * as M from '../www/js/meta.js';
import { STARTER_DECK, UNITS, CHESTS, PRODUCTS, IAP_PRODUCTS, BALANCE, MAX_PIP, DAILY } from '../www/js/data.js';

const seq = (...vals) => { let i = 0; return () => vals[i++ % vals.length]; };
const battle = (rng = Math.random) => createBattle({ deck: STARTER_DECK, levels: {}, rng });
const run = (b, seconds) => { for (let t = 0; t < seconds; t += 1 / 60) step(b, 1 / 60); };

test('données cohérentes', () => {
  for (const k of STARTER_DECK) assert.ok(UNITS[k]);
  for (const ch of CHESTS) assert.ok(Math.abs(Object.values(ch.odds).reduce((a, b) => a + b, 0) - 1) < 1e-9, `${ch.id} : probabilités = 100 %`);
  const ids = PRODUCTS.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length, 'identifiants produits uniques');
  for (const p of IAP_PRODUCTS) assert.match(p.id, /^[a-z0-9_.]+$/, 'identifiant compatible Google Play et App Store');
});

test('le chemin a une longueur et posAt reste dessus', () => {
  assert.ok(PATH_LEN > 800);
  assert.deepEqual(posAt(0), [24, 500]);
  assert.deepEqual(posAt(PATH_LEN + 100), [336, 500]);
});

test('invocation : coût croissant, refusée sans mana ou sans place', () => {
  const b = battle();
  assert.ok(summon(b) >= 0); assert.equal(b.mana, 90); assert.equal(b.summonCost, 20);
  summon(b); summon(b); summon(b);
  assert.equal(b.mana, 0);
  assert.equal(summon(b), -1, 'pas assez de mana');
  b.mana = 1e9;
  for (let i = 0; i < 20; i++) summon(b);
  assert.equal(b.board.filter(Boolean).length, 15, 'plateau plein');
  assert.equal(summon(b), -1, 'plus de place');
});

test('fusion : seulement deux runes identiques de même niveau, résultat niveau +1', () => {
  const b = battle(seq(0));
  b.board[0] = { k: 'braise', pip: 2, cd: 0, stun: 0 };
  b.board[1] = { k: 'braise', pip: 2, cd: 0, stun: 0 };
  b.board[2] = { k: 'braise', pip: 1, cd: 0, stun: 0 };
  b.board[3] = { k: 'givre', pip: 2, cd: 0, stun: 0 };
  assert.ok(!canMerge(b, 0, 2), 'niveaux différents');
  assert.ok(!canMerge(b, 0, 3), 'runes différentes');
  assert.ok(!canMerge(b, 0, 0), 'sur elle-même');
  assert.ok(!canMerge(b, 0, 5), 'case vide');
  assert.ok(merge(b, 0, 1));
  assert.equal(b.board[0], null);
  assert.equal(b.board[1].pip, 3);
  b.board[5] = { k: 'braise', pip: MAX_PIP, cd: 0, stun: 0 };
  b.board[6] = { k: 'braise', pip: MAX_PIP, cd: 0, stun: 0 };
  assert.ok(!canMerge(b, 5, 6), 'niveau maximum');
});

test('fusionner augmente toujours la puissance totale', () => {
  const b = battle();
  for (let pip = 1; pip < MAX_PIP; pip++) {
    const two = 2 * unitDamage(b, { k: 'braise', pip }), one = unitDamage(b, { k: 'braise', pip: pip + 1 });
    assert.ok(one > two, `niveau ${pip} → ${pip + 1}`);
  }
});

test('renforcement : coûte de la mana et augmente les dégâts', () => {
  const b = battle();
  const before = unitDamage(b, { k: 'braise', pip: 1 });
  assert.ok(powerUp(b, 0));
  assert.equal(b.mana, 0);
  assert.ok(unitDamage(b, { k: 'braise', pip: 1 }) > before);
  assert.ok(!powerUp(b, 0), 'plus assez de mana');
});

test('les vagues arrivent, les runes tuent et rapportent de la mana', () => {
  const b = battle();
  b.board[7] = { k: 'zephyr', pip: 4, cd: 0, stun: 0 };
  run(b, 25);
  assert.ok(b.wave >= 1);
  assert.ok(b.kills > 0);
  assert.equal(b.lives, 3, 'une rune puissante protège le rempart');
});

test('sans défense, la partie est perdue', () => {
  const b = battle();
  run(b, 120);
  assert.ok(b.over);
  assert.equal(b.lives, 0);
});

test('boss toutes les 5 vagues, PV croissants', () => {
  assert.equal(bossForWave(4), null);
  assert.equal(bossForWave(5).id, 'colosse');
  assert.equal(bossForWave(10).id, 'invocateur');
  assert.equal(bossForWave(15).id, 'briseur');
  assert.equal(bossForWave(20).id, 'colosse');
  assert.ok(enemyHp(10, 1) > enemyHp(9, 1));
});

test('abandon', () => {
  const b = battle();
  forfeit(b);
  assert.ok(b.over);
  assert.equal(b.events.at(-1).forfeit, true);
});

test('amélioration de carte', () => {
  const S = M.defaultState();
  assert.ok(!M.canUpgrade(S, 'braise'), 'pas assez de cartes');
  S.cards.braise.copies = 4;
  assert.ok(M.upgradeCard(S, 'braise'));
  assert.equal(S.cards.braise.lvl, 2);
  assert.equal(S.coins, 300 - 40);
  assert.ok(!M.upgradeCard(S, 'faucheur'), 'carte non possédée');
});

test('équiper échange les emplacements et refuse les cartes non possédées', () => {
  const S = M.defaultState();
  assert.ok(!M.equip(S, 0, 'faucheur'));
  assert.ok(M.equip(S, 0, 'venin'));
  assert.equal(S.deck[0], 'venin');
  assert.ok(M.equip(S, 0, 'givre'));
  assert.equal(S.deck[0], 'givre'); assert.equal(S.deck[1], 'venin');
  assert.equal(new Set(S.deck).size, 5, 'pas de doublon');
});

test('coffres : coût, nombre de cartes, légendaire garantie, attente du gratuit', () => {
  const S = M.defaultState();
  S.gems = 800;
  const r = M.openChest(S, 'mythe', { rng: seq(0.01) });   // tirages "communs" uniquement
  assert.equal(S.gems, 350);
  assert.ok(Object.keys(r.cards).some((k) => UNITS[k].rarity === 'legendaire'), 'légendaire garantie');
  assert.ok(Object.values(r.cards).reduce((a, b) => a + b, 0) >= 60);
  assert.equal(M.openChest(S, 'mythe'), null, 'plus assez de gemmes');
  const now = 1e12;
  assert.ok(M.openChest(S, 'bois', { paid: 'free', now }));
  assert.equal(M.openChest(S, 'bois', { paid: 'free', now: now + 1000 }), null, 'attente de 4 h');
  assert.ok(M.openChest(S, 'bois', { paid: 'free', now: now + 4 * 3600e3 }));
  assert.equal(M.openChest(S, 'royal', { paid: 'free', now: now + 1e9 }), null, 'seul le coffre en bois est gratuit');
});

test('récompenses de fin de partie, Pass Royal ×2, record', () => {
  const S = M.defaultState();
  const r = M.battleRewards(S, 12);
  assert.ok(r.record); assert.equal(r.gems, 10);
  M.applyRewards(S, r);
  assert.equal(S.best, 12); assert.equal(S.games, 1); assert.equal(S.tutorial, false);
  S.premium = true;
  assert.equal(M.battleRewards(S, 12).coins, r.coins * 2);
  assert.equal(M.battleRewards(S, 20, { forfeit: true }).record, false, "un abandon n'est pas un record");
  S.trophies = 3;
  M.applyRewards(S, M.battleRewards(S, 1));
  assert.equal(S.trophies, 0, 'jamais de trophées négatifs');
});

test('cadeau quotidien : une fois par jour, série qui avance puis recommence', () => {
  const S = M.defaultState();
  const day = (n) => new Date(2026, 10, 1 + n, 12).getTime();
  assert.ok(M.claimDaily(S, { now: day(0) }));
  assert.equal(M.claimDaily(S, { now: day(0) + 3600e3 }), null);
  assert.equal(M.claimDaily(S, { now: day(1) }).gift, DAILY[1]);
  assert.equal(M.claimDaily(S, { now: day(5) }).gift, DAILY[0], 'série interrompue');
});

test('achats : crédit unique par transaction, achats uniques non rachetables', () => {
  const S = M.defaultState();
  assert.ok(M.creditPurchase(S, 'gems_500', 'T1'));
  assert.equal(S.gems, 560);
  assert.ok(!M.creditPurchase(S, 'gems_500', 'T1'), 'même transaction rejouée');
  assert.ok(M.creditPurchase(S, 'gems_500', 'T2'));
  assert.equal(S.gems, 1060);
  assert.ok(M.creditPurchase(S, 'starter', 'T3'));
  assert.ok(S.cards.faucheur.owned);
  assert.ok(!M.creditPurchase(S, 'starter', 'T4'), 'pack déjà acheté');
  assert.ok(!M.creditPurchase(S, 'coins_1k', 'T5'), "un échange en gemmes n'est pas un achat en argent");
  assert.ok(!M.creditPurchase(S, 'inconnu', 'T6'));
});

test('restauration : rend le Pass et le Faucheur, pas les gemmes', () => {
  const S = M.defaultState();
  assert.ok(M.restoreOwned(S, ['pass_royal', 'starter', 'gems_80']));
  assert.ok(S.premium); assert.ok(S.cards.faucheur.owned);
  assert.equal(S.gems, 60);
  assert.ok(!M.restoreOwned(S, ['pass_royal']), 'rien de nouveau');
});

test('échange gemmes → pièces', () => {
  const S = M.defaultState();
  assert.ok(M.buyWithGems(S, 'coins_1k'));
  assert.equal(S.gems, 0); assert.equal(S.coins, 1300);
  assert.ok(!M.buyWithGems(S, 'coins_1k'));
});

test('sauvegarde : migration de la v1 et valeurs corrompues', () => {
  const v1 = { coins: 999, gems: 5, trophies: 40, best: 9, games: 3, premium: true, owned: ['pass'], lastFree: 0,
    deck: ['braise', 'givre', 'zephyr', 'orage', 'alchimiste'], cards: { braise: { lvl: 4, copies: 2, owned: true } } };
  const S = M.migrate(v1);
  assert.equal(S.coins, 999); assert.equal(S.cards.braise.lvl, 4);
  assert.deepEqual(S.owned, ['pass_royal']);
  assert.equal(S.tutorial, false);
  const bad = M.migrate({ coins: -5, gems: 'x', deck: ['faucheur', 'faucheur'], cards: { braise: { lvl: 99 } } });
  assert.equal(bad.coins, 300); assert.equal(bad.gems, 60);
  assert.deepEqual(bad.deck, STARTER_DECK);
  assert.equal(bad.cards.braise.lvl, 10);
  assert.deepEqual(M.migrate(null), M.defaultState());
});

test('équilibrage : un joueur correct dépasse la vague 8 avec les cartes de départ', async () => {
  const { canSummon, canPowerUp } = await import('../www/js/engine.js');
  let total = 0;
  for (let seed = 1; seed <= 6; seed++) {
    let s = seed * 9973; const rng = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const b = createBattle({ deck: STARTER_DECK, levels: {}, rng });
    let t = 0;
    while (!b.over && b.time < 1800) {
      step(b, 1 / 30); t += 1 / 30; b.events.length = 0;
      if (t < 0.6) continue;
      t = 0;
      let merged = false;
      if (b.board.filter(Boolean).length >= 11 || !canSummon(b))
        for (let i = 0; i < 15 && !merged; i++) for (let j = 0; j < 15 && !merged; j++) if (canMerge(b, i, j)) merged = merge(b, i, j);
      if (merged) continue;
      if (b.board.filter(Boolean).length >= 10) for (let k = 0; k < 5; k++) if (b.mana > 2 * b.summonCost + 100 && canPowerUp(b, k)) { powerUp(b, k); break; }
      summon(b);
    }
    total += b.wave;
  }
  const avg = total / 6;
  assert.ok(avg >= 8 && avg <= 40, `vague moyenne ${avg}`);
});

test("réglage : la difficulté reste dans les clous", () => {
  assert.ok(BALANCE.hpGrowth > 1.1 && BALANCE.hpGrowth < 1.3);
});
