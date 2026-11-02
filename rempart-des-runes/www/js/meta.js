// Progression hors combat : état du joueur, cartes, coffres, récompenses, achats.
// Fonctions pures sur l'objet d'état (sans DOM) → testables.
import {
  UNITS, UNIT_KEYS, RARITIES, STARTER_CARDS, STARTER_DECK, DECK_SIZE, MAX_CARD_LVL,
  CHESTS, FREE_CHEST_DELAY, REWARDS, DAILY, ARENAS, ARENA_REWARD, PRODUCTS,
  QUESTS, QUEST_REWARDS, QUEST_BONUS_CHEST, CHALLENGE_RULES, CHALLENGE_CARD_LVL, CHALLENGE_MILESTONES,
} from './data.js';
import { seededRng } from './engine.js';

export const SAVE_VERSION = 3;

export function defaultState() {
  const cards = {};
  for (const k of UNIT_KEYS) cards[k] = { lvl: 1, copies: 0, owned: STARTER_CARDS.includes(k) };
  return {
    v: SAVE_VERSION, coins: 300, gems: 60, trophies: 0, best: 0, games: 0,
    cards, deck: STARTER_DECK.slice(),
    premium: false, owned: [], txns: [], lastFree: 0,
    daily: { day: 0, last: '' },
    quests: { day: '', list: [], bonus: false },
    challenge: { week: '', best: 0, kills: 0, plays: 0, claimed: [] },
    arenaReached: 0,
    pseudo: '',
    lastPlayed: 0,
    settings: { sound: true, music: true, haptics: true, notifs: true },
    tutorial: true,
  };
}

/** Répare et met à niveau une sauvegarde (anciennes versions, champs manquants, valeurs corrompues). */
export function migrate(raw) {
  const S = defaultState();
  if (!raw || typeof raw !== 'object') return S;
  const num = (v, d) => (Number.isFinite(v) && v >= 0 ? Math.floor(v) : d);
  S.coins = num(raw.coins, S.coins);
  S.gems = num(raw.gems, S.gems);
  S.trophies = num(raw.trophies, 0);
  S.best = num(raw.best, 0);
  S.games = num(raw.games, 0);
  S.premium = !!raw.premium;
  S.lastFree = num(raw.lastFree, 0);
  S.tutorial = raw.tutorial === undefined ? !(S.games > 0) : !!raw.tutorial;
  // v1 : achat unique "pass" → v2 : "pass_royal"
  S.owned = Array.isArray(raw.owned) ? [...new Set(raw.owned.map((id) => (id === 'pass' ? 'pass_royal' : id)))] : [];
  S.txns = Array.isArray(raw.txns) ? raw.txns.slice(-200) : [];
  // v1 utilisait des clés de rareté accentuées, les cartes elles-mêmes n'ont pas changé
  if (raw.cards && typeof raw.cards === 'object') {
    for (const k of UNIT_KEYS) {
      const c = raw.cards[k];
      if (!c) continue;
      S.cards[k] = {
        lvl: Math.min(MAX_CARD_LVL, Math.max(1, num(c.lvl, 1))),
        copies: num(c.copies, 0),
        owned: !!c.owned || STARTER_CARDS.includes(k),
      };
    }
  }
  if (Array.isArray(raw.deck) && raw.deck.length === DECK_SIZE
      && raw.deck.every((k) => S.cards[k]?.owned) && new Set(raw.deck).size === DECK_SIZE) S.deck = raw.deck.slice();
  if (raw.daily && typeof raw.daily === 'object') S.daily = { day: num(raw.daily.day, 0) % DAILY.length, last: String(raw.daily.last || '') };
  if (raw.settings && typeof raw.settings === 'object') for (const k in S.settings) if (k in raw.settings) S.settings[k] = !!raw.settings[k];
  // v3 : missions, défi de la semaine, arènes, pseudo
  if (raw.quests && Array.isArray(raw.quests.list)) {
    S.quests = { day: String(raw.quests.day || ''), bonus: !!raw.quests.bonus,
      list: raw.quests.list.filter((q) => QUESTS.some((x) => x.id === q.id)).slice(0, 3)
        .map((q) => ({ id: q.id, goal: num(q.goal, 1) || 1, progress: num(q.progress, 0), claimed: !!q.claimed })) };
  }
  if (raw.challenge && typeof raw.challenge === 'object') {
    const c = raw.challenge;
    S.challenge = { week: String(c.week || ''), best: num(c.best, 0), kills: num(c.kills, 0), plays: num(c.plays, 0),
      claimed: Array.isArray(c.claimed) ? c.claimed.filter(Number.isFinite) : [] };
  }
  S.arenaReached = raw.arenaReached === undefined ? arenaIndex(S.trophies) : Math.min(ARENAS.length - 1, num(raw.arenaReached, 0));
  S.pseudo = cleanPseudo(raw.pseudo || '');
  S.lastPlayed = num(raw.lastPlayed, 0);
  return S;
}

export const cardLevels = (S) => Object.fromEntries(UNIT_KEYS.map((k) => [k, S.cards[k].lvl]));
export const arenaIndex = (trophies) => ARENAS.reduce((a, x, i) => (trophies >= x.min ? i : a), 0);
export const arenaFor = (trophies) => ARENAS[arenaIndex(trophies)];
export const nextArena = (trophies) => ARENAS.find((x) => x.min > trophies) || null;

/* ---------- Cartes ---------- */
export function upgradeCost(S, k) {
  const lvl = S.cards[k].lvl;
  return {
    copies: Math.max(1, Math.round((lvl * 4) / RARITIES[UNITS[k].rarity].copies)),
    coins: 40 * lvl * lvl,
  };
}
export function canUpgrade(S, k) {
  const c = S.cards[k], cost = upgradeCost(S, k);
  return c.owned && c.lvl < MAX_CARD_LVL && c.copies >= cost.copies && S.coins >= cost.coins;
}
export function upgradeCard(S, k) {
  if (!canUpgrade(S, k)) return false;
  const cost = upgradeCost(S, k);
  S.cards[k].copies -= cost.copies;
  S.coins -= cost.coins;
  S.cards[k].lvl++;
  return true;
}
/** Place la rune `k` dans l'emplacement `slot` du deck (échange si elle y est déjà). */
export function equip(S, slot, k) {
  if (!S.cards[k]?.owned || slot < 0 || slot >= DECK_SIZE) return false;
  const at = S.deck.indexOf(k);
  if (at === slot) return false;
  if (at >= 0) S.deck[at] = S.deck[slot];
  S.deck[slot] = k;
  return true;
}

/* ---------- Coffres ---------- */
export const freeChestLeft = (S, now) => (S.premium ? 0 : Math.max(0, S.lastFree + FREE_CHEST_DELAY - now));

function rollRarity(odds, rng) {
  let r = rng();
  for (const [rar, p] of Object.entries(odds)) { if (r < p) return rar; r -= p; }
  return 'commun';
}
/**
 * Ouvre un coffre. paid : 'gems' | 'free' | 'gift'.
 * Renvoie { cards: {k: n}, fresh: [k…], coins } ou null si impossible.
 */
export function openChest(S, chestId, { paid = 'gems', rng = Math.random, now = Date.now() } = {}) {
  const ch = CHESTS.find((c) => c.id === chestId);
  if (!ch) return null;
  if (paid === 'gems') { if (S.gems < ch.cost) return null; S.gems -= ch.cost; }
  else if (paid === 'free') { if (!ch.free || freeChestLeft(S, now) > 0) return null; S.lastFree = now; }

  const pool = (rar) => UNIT_KEYS.filter((k) => UNITS[k].rarity === rar);
  const pick = (rar) => { const p = pool(rar); return p[Math.floor(rng() * p.length)]; };
  const got = {};
  let left = ch.cards, hasGuarantee = false;
  while (left > 0) {
    const rar = rollRarity(ch.odds, rng);
    if (rar === ch.guarantee) hasGuarantee = true;
    const n = rar === 'commun' ? Math.min(left, 2 + Math.floor(rng() * 3)) : 1;
    const k = pick(rar);
    got[k] = (got[k] || 0) + n;
    left -= n;
  }
  if (ch.guarantee && !hasGuarantee) { const k = pick(ch.guarantee); got[k] = (got[k] || 0) + 1; }

  const fresh = [];
  for (const [k, n] of Object.entries(got)) {
    if (!S.cards[k].owned) fresh.push(k);
    S.cards[k].owned = true;
    S.cards[k].copies += n;
  }
  const coins = ch.coins[0] + Math.floor(rng() * (ch.coins[1] - ch.coins[0] + 1));
  S.coins += coins;
  return { chest: ch, cards: got, fresh, coins };
}

/* ---------- Fin de partie ---------- */
export function battleRewards(S, wave, { forfeit = false } = {}) {
  let coins = REWARDS.coinsBase + wave * REWARDS.coinsPerWave;
  if (S.premium) coins *= 2;
  const trophies = Math.max(REWARDS.trophiesMinLoss, wave * REWARDS.trophiesPerWave - REWARDS.trophiesOffset - (forfeit ? 5 : 0));
  const record = !forfeit && wave > S.best;
  const gems = record && wave >= REWARDS.recordGemsMinWave ? REWARDS.recordGems : 0;
  return { coins, trophies, gems, record, wave };
}
export function applyRewards(S, r) {
  S.coins += r.coins;
  S.gems += r.gems;
  S.trophies = Math.max(0, S.trophies + r.trophies);
  S.games++;
  if (r.record) S.best = r.wave;
  S.tutorial = false;
}

/* ---------- Arènes : récompense unique à chaque nouvelle arène ---------- */
export function claimNewArenas(S, { rng = Math.random, now = Date.now() } = {}) {
  const idx = arenaIndex(S.trophies), out = [];
  while (S.arenaReached < idx) {
    S.arenaReached++;
    S.gems += ARENA_REWARD.gems;
    out.push({ arena: ARENAS[S.arenaReached], gems: ARENA_REWARD.gems, chest: openChest(S, ARENA_REWARD.chest, { paid: 'gift', rng, now }) });
  }
  return out;
}

/* ---------- Hachage et calendrier ---------- */
export function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
/** Semaine ISO, ex. "2026-W45" (change le lundi). */
export function weekKey(now = Date.now()) {
  const d = new Date(now);
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y = t.getUTCFullYear();
  const w = Math.ceil(((t - Date.UTC(y, 0, 1)) / 86400000 + 1) / 7);
  return `${y}-W${String(w).padStart(2, '0')}`;
}
/** Fin de la semaine (dimanche 23:59:59 heure locale). */
export function weekEnd(now = Date.now()) {
  const d = new Date(now);
  const day = d.getDay() || 7;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + (7 - day), 23, 59, 59).getTime();
}

/* ---------- Défi de la semaine ---------- */
/** Le défi est le même pour tout le monde : il ne dépend que de la semaine. */
export function challengeOf(week) {
  const rng = seededRng(hashString(`defi-${week}`));
  const pool = UNIT_KEYS.slice();
  const deck = [];
  while (deck.length < DECK_SIZE) deck.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  const rule = CHALLENGE_RULES[Math.floor(rng() * CHALLENGE_RULES.length)];
  const levels = Object.fromEntries(UNIT_KEYS.map((k) => [k, CHALLENGE_CARD_LVL]));
  return { week, deck, rule, levels, seed: hashString(`partie-${week}`) };
}
function syncChallengeWeek(S, week) {
  if (S.challenge.week !== week) S.challenge = { week, best: 0, kills: 0, plays: 0, claimed: [] };
}
export const challengeScore = (wave, kills) => wave * 100000 + Math.min(99999, kills);
/** Enregistre un résultat du défi. Renvoie true si c'est un nouveau record de la semaine. */
export function recordChallenge(S, week, wave, kills) {
  syncChallengeWeek(S, week);
  S.challenge.plays++;
  if (challengeScore(wave, kills) <= challengeScore(S.challenge.best, S.challenge.kills)) return false;
  S.challenge.best = wave; S.challenge.kills = kills;
  return true;
}
export function challengeMilestones(S, week) {
  syncChallengeWeek(S, week);
  return CHALLENGE_MILESTONES.map((m, i) => ({ ...m, i, reached: S.challenge.best >= m.wave, claimed: S.challenge.claimed.includes(i) }));
}
export function claimChallengeMilestone(S, week, i) {
  const m = challengeMilestones(S, week)[i];
  if (!m || !m.reached || m.claimed) return false;
  S.challenge.claimed.push(i);
  S.gems += m.gems;
  return true;
}

/* ---------- Pseudo (classement) ---------- */
export function cleanPseudo(p) {
  return String(p).normalize('NFC').replace(/[^\p{L}\p{N} _.-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 16);
}
export const validPseudo = (p) => { const c = cleanPseudo(p); return c.length >= 3 && c === String(p).trim(); };

/* ---------- Missions du jour ---------- */
const questDef = (id) => QUESTS.find((q) => q.id === id);
export function questText(q) { return questDef(q.id).text.replace('{n}', q.goal); }
/** Prépare les 3 missions du jour (les mêmes pour un joueur donné toute la journée). */
export function ensureQuests(S, now = Date.now()) {
  const day = dayKey(now);
  if (S.quests.day === day && S.quests.list.length) return false;
  const rng = seededRng(hashString(`missions-${day}-${S.games}`));
  const pool = QUESTS.slice();
  const list = [];
  while (list.length < 3) {
    const q = pool.splice(Math.floor(rng() * pool.length), 1)[0];
    const goal = q.goals[Math.floor(rng() * q.goals.length)];
    list.push({ id: q.id, goal, progress: 0, claimed: false });
  }
  S.quests = { day, list, bonus: false };
  return true;
}
/** Fait avancer les missions. stats : { games, merges, kills, bosses, wave, powerups, chests, challenge } */
export function progressQuests(S, stats, now = Date.now()) {
  ensureQuests(S, now);
  const done = [];
  for (const q of S.quests.list) {
    const def = questDef(q.id), v = stats[def.stat] || 0;
    if (!v) continue;
    const before = q.progress >= q.goal;
    q.progress = Math.min(q.goal, def.max ? Math.max(q.progress, v) : q.progress + v);
    if (!before && q.progress >= q.goal) done.push(q);
  }
  return done;
}
export const questReward = (i) => QUEST_REWARDS[i % QUEST_REWARDS.length];
export function claimQuest(S, i) {
  const q = S.quests.list[i];
  if (!q || q.claimed || q.progress < q.goal) return null;
  q.claimed = true;
  const r = questReward(i);
  applyGrant(S, r);
  return r;
}
export const questBonusReady = (S) => !S.quests.bonus && S.quests.list.length === 3 && S.quests.list.every((q) => q.claimed);
export function claimQuestBonus(S, { rng = Math.random, now = Date.now() } = {}) {
  if (!questBonusReady(S)) return null;
  S.quests.bonus = true;
  return openChest(S, QUEST_BONUS_CHEST, { paid: 'gift', rng, now });
}
export const questsToClaim = (S) => S.quests.list.filter((q) => !q.claimed && q.progress >= q.goal).length + (questBonusReady(S) ? 1 : 0);

/* ---------- Cadeau du jour ---------- */
export const dayKey = (now) => { const d = new Date(now); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
export const dailyReady = (S, now = Date.now()) => S.daily.last !== dayKey(now);
export function claimDaily(S, { now = Date.now(), rng = Math.random } = {}) {
  if (!dailyReady(S, now)) return null;
  const yesterday = dayKey(now - 86400000);
  if (S.daily.last !== yesterday) S.daily.day = 0;      // série interrompue
  const gift = DAILY[S.daily.day];
  S.daily.last = dayKey(now);
  S.daily.day = (S.daily.day + 1) % DAILY.length;
  const res = { gift, chest: null };
  if (gift.coins) S.coins += gift.coins;
  if (gift.gems) S.gems += gift.gems;
  if (gift.chest) res.chest = openChest(S, gift.chest, { paid: 'gift', rng, now });
  return res;
}

/* ---------- Achats ---------- */
export function applyGrant(S, g) {
  if (g.gems) S.gems += g.gems;
  if (g.coins) S.coins += g.coins;
  if (g.premium) S.premium = true;
  if (g.unlock) S.cards[g.unlock].owned = true;
}
/**
 * Crédite un achat validé. Idempotent : une même transaction n'est jamais créditée deux fois.
 * Renvoie true si quelque chose a été accordé.
 */
export function creditPurchase(S, productId, transactionId) {
  const p = PRODUCTS.find((x) => x.id === productId && x.kind === 'iap');
  if (!p) return false;
  if (transactionId && S.txns.includes(transactionId)) return false;
  if (!p.consumable && S.owned.includes(p.id)) return false;
  applyGrant(S, p.grant);
  if (!p.consumable) S.owned.push(p.id);
  if (transactionId) { S.txns.push(transactionId); if (S.txns.length > 200) S.txns.shift(); }
  return true;
}
/** Restauration : ne rend que les avantages permanents (pas les gemmes déjà dépensées). */
export function restoreOwned(S, productIds) {
  let changed = false;
  for (const id of productIds) {
    const p = PRODUCTS.find((x) => x.id === id && x.kind === 'iap' && !x.consumable);
    if (!p) continue;
    if (!S.owned.includes(id)) { S.owned.push(id); changed = true; }
    if (p.grant.premium && !S.premium) { S.premium = true; changed = true; }
    if (p.grant.unlock && !S.cards[p.grant.unlock].owned) { S.cards[p.grant.unlock].owned = true; changed = true; }
  }
  return changed;
}
export function buyWithGems(S, productId) {
  const p = PRODUCTS.find((x) => x.id === productId && x.kind === 'gem');
  if (!p || S.gems < p.cost) return false;
  S.gems -= p.cost;
  applyGrant(S, p.grant);
  return true;
}
