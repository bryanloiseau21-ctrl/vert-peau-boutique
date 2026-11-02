// Tests de la logique du jeu (sans navigateur). Lance : npm run test:logique
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createBattle, step, summon, merge, canMerge, powerUp, forfeit, unitDamage, posAt, PATH_LEN, bossForWave, enemyHp,
} from '../www/js/engine.js';
import * as M from '../www/js/meta.js';
import { STARTER_DECK, UNITS, UNIT_KEYS, CHESTS, PRODUCTS, IAP_PRODUCTS, BALANCE, MAX_PIP, DAILY, ARENAS, CHALLENGE_RULES } from '../www/js/data.js';
import { seededRng } from '../www/js/engine.js';
import { planReminders } from '../www/js/notifs.js';

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
  assert.equal(bossForWave(15).id, 'hydre');
  assert.equal(bossForWave(20).id, 'briseur');
  assert.equal(bossForWave(25).id, 'colosse');
  assert.equal(bossForWave(3, 3).id, 'colosse', 'règle « un boss toutes les 3 vagues »');
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

/* ---------- Nouveautés : runes, Hydre, défi, missions, arènes, rappels ---------- */
const enemy = (b, over = {}) => { const [x, y] = posAt(over.d ?? 300); const e = { id: b.nextId++, type: 'normal', boss: null, d: 300, x, y, hp: 100, max: 100, spd: 40, r: 10, color: '#fff', mana: 5,
  slowT: 0, slowF: 1, poison: 0, poisonT: 0, stunT: 0, every: 0, abilityT: 0, hit: 0, ...over }; b.enemies.push(e); return e; };

test('nouvelles runes : Marée touche tout le monde, Chronomage fige, Rocher double contre les Golems', () => {
  const b = battle();
  b.queue = ['normal']; b.spawnT = 99;            // pas de vague parasite pendant le test
  const a = enemy(b, { d: 100 }), c = enemy(b, { d: 600 }), tank = enemy(b, { type: 'tank', d: 50 });
  b.shots.push({ x: a.x, y: a.y, e: a, dmg: 10, k: 'maree', pip: 1, color: '' });
  step(b, 1 / 60);
  assert.equal(a.hp, 90); assert.equal(c.hp, 90); assert.equal(tank.hp, 90);
  b.shots.push({ x: c.x, y: c.y, e: c, dmg: 1, k: 'chrono', pip: 1, color: '' });
  step(b, 1 / 60);
  const d0 = c.d; step(b, 0.1);
  assert.equal(c.d, d0, 'ennemi figé');
  b.shots.push({ x: tank.x, y: tank.y, e: tank, dmg: 10, k: 'roc', pip: 1, color: '' });
  step(b, 1 / 60);
  assert.equal(tank.hp, 70, 'dégâts ×2 sur un Golem');
});

test("l'Hydre se divise en 3 têtes à sa mort", () => {
  const b = battle();
  b.wave = 15; b.queue = ['normal']; b.spawnT = 99;
  const h = enemy(b, { boss: 'hydre', type: 'boss', hp: 5 });
  b.shots.push({ x: h.x, y: h.y, e: h, dmg: 50, k: 'zephyr', pip: 1, color: '' });
  step(b, 1 / 60);
  assert.equal(b.enemies.filter((e) => e.type === 'tete').length, 3);
  assert.equal(b.stats.bosses, 1);
});

test('statistiques de partie (invocations, fusions, renforcements)', () => {
  const b = battle(seq(0));
  summon(b); summon(b);
  assert.ok(merge(b, b.board.findIndex(Boolean), b.board.findLastIndex(Boolean)));
  b.mana = 1000; powerUp(b, 0);
  assert.deepEqual(b.stats, { summons: 2, merges: 1, powerups: 1, bosses: 0 });
});

test('graine : deux parties avec la même graine sont identiques', () => {
  const play = () => { const b = createBattle({ deck: STARTER_DECK, rng: seededRng(42) }); for (let i = 0; i < 4; i++) summon(b); run(b, 20); return JSON.stringify([b.board, b.kills, b.wave]); };
  assert.equal(play(), play());
});

test('défi de la semaine : identique pour tous, change chaque semaine, 5 runes distinctes', () => {
  const a = M.challengeOf('2026-W45'), b2 = M.challengeOf('2026-W45'), c = M.challengeOf('2026-W46');
  assert.deepEqual(a, b2);
  assert.equal(new Set(a.deck).size, 5);
  assert.ok(a.deck.every((k) => UNITS[k]));
  assert.ok(CHALLENGE_RULES.includes(a.rule));
  assert.ok(JSON.stringify(a) !== JSON.stringify(c));
  assert.equal(M.weekKey(new Date(2026, 10, 2, 9).getTime()), '2026-W45');   // lundi
  assert.equal(M.weekKey(new Date(2026, 10, 8, 23).getTime()), '2026-W45');  // dimanche soir
  assert.equal(M.weekKey(new Date(2026, 10, 9, 1).getTime()), '2026-W46');   // lundi suivant
  assert.equal(M.weekKey(new Date(2027, 0, 1, 12).getTime()), '2026-W53');   // ISO : début janvier
});

test('défi : record, paliers une seule fois, remise à zéro chaque semaine', () => {
  const S = M.defaultState();
  assert.ok(M.recordChallenge(S, '2026-W45', 9, 120));
  assert.ok(!M.recordChallenge(S, '2026-W45', 9, 100), 'moins bien');
  assert.ok(M.recordChallenge(S, '2026-W45', 9, 130), 'même vague, plus de kills');
  assert.equal(S.challenge.plays, 3);
  const gems = S.gems;
  assert.ok(M.claimChallengeMilestone(S, '2026-W45', 0));
  assert.ok(!M.claimChallengeMilestone(S, '2026-W45', 0), 'déjà pris');
  assert.ok(!M.claimChallengeMilestone(S, '2026-W45', 1), 'pas atteint');
  assert.equal(S.gems, gems + 15);
  M.challengeMilestones(S, '2026-W46');
  assert.equal(S.challenge.best, 0, 'nouvelle semaine');
});

test('missions : 3 par jour, progression, récompenses et coffre bonus', () => {
  const S = M.defaultState();
  const now = new Date(2026, 10, 2, 10).getTime();
  M.ensureQuests(S, now);
  assert.equal(S.quests.list.length, 3);
  assert.equal(new Set(S.quests.list.map((q) => q.id)).size, 3);
  const same = JSON.stringify(S.quests);
  M.ensureQuests(S, now + 3600e3);
  assert.equal(JSON.stringify(S.quests), same, 'mêmes missions toute la journée');
  const all = { games: 99, merges: 999, kills: 9999, bosses: 9, wave: 99, powerups: 99, chests: 9, challenge: 9 };
  assert.equal(M.progressQuests(S, all, now).length, 3);
  assert.equal(M.progressQuests(S, all, now).length, 0, 'déjà terminées');
  assert.ok(!M.questBonusReady(S));
  for (let i = 0; i < 3; i++) assert.ok(M.claimQuest(S, i));
  assert.equal(M.claimQuest(S, 0), null);
  assert.ok(M.questBonusReady(S));
  assert.ok(M.claimQuestBonus(S, { now }));
  assert.equal(M.claimQuestBonus(S, { now }), null);
  M.ensureQuests(S, now + 86400e3);
  assert.ok(S.quests.list.every((q) => q.progress === 0 && !q.claimed), 'nouvelles missions le lendemain');
});

test('mission « atteins la vague N » garde le meilleur résultat, sans additionner', () => {
  const S = M.defaultState();
  S.quests = { day: M.dayKey(Date.now()), bonus: false, list: [{ id: 'vague', goal: 12, progress: 0, claimed: false }] };
  M.progressQuests(S, { wave: 7 }); M.progressQuests(S, { wave: 6 });
  assert.equal(S.quests.list[0].progress, 7);
});

test('arènes : récompense une seule fois par arène', () => {
  const S = M.defaultState();
  S.trophies = ARENAS[2].min;
  const r = M.claimNewArenas(S);
  assert.equal(r.length, 2);
  assert.equal(S.arenaReached, 2);
  assert.equal(M.claimNewArenas(S).length, 0);
  S.trophies = 0; S.trophies = ARENAS[2].min;
  assert.equal(M.claimNewArenas(S).length, 0, 'retomber puis remonter ne redonne rien');
});

test('pseudo : nettoyage et validation', () => {
  assert.equal(M.cleanPseudo('  Bry@n <b>  '), 'Bryn b');
  assert.ok(M.validPseudo('Bryan_21'));
  assert.ok(M.validPseudo('Élodie'));
  assert.ok(!M.validPseudo('ab'));
  assert.ok(!M.validPseudo('<script>'));
  assert.ok(!M.validPseudo('x'.repeat(17)));
});

test('rappels : coffre, cadeau, défi, retour — tous dans le futur', () => {
  const S = M.defaultState();
  const now = new Date(2026, 10, 4, 10).getTime();   // mercredi matin
  S.lastFree = now - 3600e3;
  const r = planReminders(S, now);
  const ids = r.map((n) => n.id);
  assert.deepEqual(ids, [1, 2, 3, 4, 5]);
  assert.ok(r.every((n) => n.at > now && n.title && n.body));
  assert.equal(r[0].at, S.lastFree + 4 * 3600e3, 'coffre prêt');
  S.premium = true;
  assert.ok(!planReminders(S, now).some((n) => n.id === 1), 'pas de rappel de coffre avec le Pass');
});

test('migration v2 → v3 : nouveaux champs et arène actuelle déjà acquise', () => {
  const S = M.migrate({ coins: 10, trophies: 650, games: 4 });
  assert.equal(S.arenaReached, 3);
  assert.equal(S.quests.list.length, 0);
  assert.equal(S.settings.notifs, true);
  assert.ok(UNIT_KEYS.includes('dragon') && S.cards.dragon.owned === false);
});

test('la version affichée dans le jeu correspond à package.json', async () => {
  const { readFileSync } = await import('node:fs');
  const { APP_VERSION } = await import('../www/js/config.js');
  assert.equal(APP_VERSION, JSON.parse(readFileSync(new URL('../package.json', import.meta.url))).version);
});
