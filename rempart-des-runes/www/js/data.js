// Données du jeu : runes, ennemis, boutique, coffres et réglages d'équilibrage.
// Tout ce qui se règle (prix, dégâts, difficulté) est ici.

export const RARITIES = {
  commun:     { label: 'Commune',    color: '#cfd3dc', copies: 1 },
  rare:       { label: 'Rare',       color: '#5fb8ff', copies: 2 },
  epique:     { label: 'Épique',     color: '#c58bff', copies: 4 },
  legendaire: { label: 'Légendaire', color: '#ffb84d', copies: 8 },
};

// type : comportement en combat (voir engine.js)
export const UNITS = {
  braise:     { name: 'Braise',     icon: '🔥', color: '#ff6b3d', rarity: 'commun',     dmg: 22, rate: 1.0, type: 'splash', desc: 'Explosion qui touche les ennemis proches' },
  givre:      { name: 'Givre',      icon: '❄️', color: '#5fc8ff', rarity: 'commun',     dmg: 10, rate: 1.0, type: 'slow',   desc: 'Ralentit sa cible' },
  zephyr:     { name: 'Zéphyr',     icon: '🌪️', color: '#7fd65f', rarity: 'commun',     dmg: 9,  rate: 2.6, type: 'single', desc: 'Tirs très rapides' },
  orage:      { name: 'Orage',      icon: '⚡', color: '#ffd93d', rarity: 'rare',       dmg: 18, rate: 0.9, type: 'chain',  desc: 'Éclair qui rebondit en chaîne' },
  venin:      { name: 'Venin',      icon: '☠️', color: '#b06cff', rarity: 'rare',       dmg: 7,  rate: 1.1, type: 'poison', desc: 'Poison qui ronge les ennemis' },
  alchimiste: { name: 'Alchimiste', icon: '💰', color: '#f0b429', rarity: 'rare',       dmg: 6,  rate: 0.8, type: 'mana',   desc: 'Rapporte de la mana à chaque vague' },
  sentinelle: { name: 'Sentinelle', icon: '🌙', color: '#c9d3ff', rarity: 'epique',     dmg: 80, rate: 0.4, type: 'strong', desc: 'Vise toujours l\'ennemi le plus résistant' },
  faucheur:   { name: 'Faucheur',   icon: '💀', color: '#ff4d8d', rarity: 'legendaire', dmg: 28, rate: 0.8, type: 'reap',   desc: 'Peut éliminer un ennemi d\'un seul coup' },
};
export const UNIT_KEYS = Object.keys(UNITS);
export const STARTER_CARDS = ['braise', 'givre', 'zephyr', 'orage', 'venin', 'alchimiste'];
export const STARTER_DECK = ['braise', 'givre', 'zephyr', 'orage', 'alchimiste'];
export const DECK_SIZE = 5;
export const MAX_CARD_LVL = 10;
export const MAX_PIP = 7;
export const MAX_POWER = 5;

export const ENEMIES = {
  normal: { name: 'Gobelin',  hp: 1,    spd: 40, r: 10, color: '#e86a6a', mana: 8 },
  rapide: { name: 'Furet',    hp: 0.55, spd: 74, r: 8,  color: '#ffa94d', mana: 6 },
  tank:   { name: 'Golem',    hp: 3.2,  spd: 27, r: 13, color: '#8a7f9e', mana: 15 },
  sbire:  { name: 'Sbire',    hp: 0.35, spd: 55, r: 7,  color: '#d58ae0', mana: 3 },
};
// Un boss toutes les 5 vagues, à tour de rôle.
export const BOSSES = [
  { id: 'colosse',     name: 'Colosse',     icon: '🗿', hp: 24, spd: 19, r: 20, color: '#c0563f', mana: 120, power: 'Très résistant' },
  { id: 'invocateur',  name: 'Invocateur',  icon: '🧙', hp: 16, spd: 21, r: 18, color: '#9b4dd8', mana: 120, power: 'Invoque des sbires', every: 5 },
  { id: 'briseur',     name: 'Briseur',     icon: '👹', hp: 20, spd: 20, r: 19, color: '#d23c6e', mana: 120, power: 'Gèle une de tes runes', every: 6 },
];

export const BALANCE = {
  lives: 3,
  startMana: 100,
  summonCost: 10,
  summonCostStep: 10,
  powerCosts: [100, 200, 400, 700],   // coût pour passer du niveau 1→2, 2→3…
  powerBonus: 0.3,                    // +30 % de dégâts par niveau de renforcement
  pipMult: 2.15,                      // ×2,15 par niveau de fusion (fusionner fait donc toujours gagner en puissance)
  cardBonus: 0.18,                    // +18 % par niveau de carte (collection)
  hpBase: 42,
  hpGrowth: 1.175,
  hpLinear: 0.05,
  speedGrowth: 0.008,
  firstPause: 2,
  wavePause: 2.5,
  baseCount: 8,
  countPerWave: 1.4,
  bossLeak: 2,                        // vies perdues si un boss passe
  manaUnitPerPip: 8,
};

// Récompenses de fin de partie
export const REWARDS = {
  coinsBase: 20, coinsPerWave: 18,
  trophiesPerWave: 3, trophiesOffset: 15, trophiesMinLoss: -10,
  recordGems: 10, recordGemsMinWave: 5,
};

// Cadeau quotidien (série de 7 jours, recommence ensuite)
export const DAILY = [
  { coins: 100 }, { coins: 200 }, { gems: 10 }, { coins: 400 }, { chest: 'bois' }, { coins: 800 }, { gems: 50 },
];

// Paliers d'arène selon les trophées (cosmétique, affiché sur l'accueil)
export const ARENAS = [
  { min: 0,    name: 'Plaine des Novices', icon: '🌾' },
  { min: 100,  name: 'Forêt Murmurante',   icon: '🌲' },
  { min: 300,  name: 'Marais Toxique',     icon: '🍄' },
  { min: 600,  name: 'Pics Gelés',         icon: '🏔️' },
  { min: 1000, name: 'Citadelle Ardente',  icon: '🌋' },
  { min: 1600, name: 'Trône des Runes',    icon: '👑' },
];

// Achats intégrés. Les "id" doivent être créés à l'identique dans
// Google Play Console et App Store Connect (voir PUBLIER.md).
// consumable : peut être racheté (gemmes). Sinon : achat unique (non consommable).
export const PRODUCTS = [
  { id: 'starter',   kind: 'iap', consumable: false, price: '2,99 €',  icon: '🎉', title: 'Pack de départ',   sub: '300 💎 + 5 000 🪙 + Faucheur légendaire', tag: '-80 %',
    grant: { gems: 300, coins: 5000, unlock: 'faucheur' } },
  { id: 'pass_royal', kind: 'iap', consumable: false, price: '4,99 €', icon: '👑', title: 'Pass Royal',       sub: 'Pièces ×2 à chaque partie + coffre en bois sans attente',
    grant: { premium: true } },
  { id: 'gems_80',   kind: 'iap', consumable: true, price: '0,99 €',  icon: '💎', title: 'Poignée de gemmes', sub: '80 gemmes',    grant: { gems: 80 } },
  { id: 'gems_500',  kind: 'iap', consumable: true, price: '4,99 €',  icon: '💎', title: 'Sac de gemmes',     sub: '500 gemmes',   grant: { gems: 500 },  tag: '+25 %' },
  { id: 'gems_1200', kind: 'iap', consumable: true, price: '9,99 €',  icon: '💰', title: 'Coffret de gemmes', sub: '1 200 gemmes', grant: { gems: 1200 }, tag: 'Populaire' },
  { id: 'gems_2800', kind: 'iap', consumable: true, price: '19,99 €', icon: '🏆', title: 'Trésor de gemmes',  sub: '2 800 gemmes', grant: { gems: 2800 }, tag: 'Meilleur prix' },
  // Échanges gemmes → pièces (monnaie du jeu, pas d'argent réel)
  { id: 'coins_1k',  kind: 'gem', cost: 60,  icon: '🪙', title: '1 000 pièces',  grant: { coins: 1000 } },
  { id: 'coins_6k',  kind: 'gem', cost: 300, icon: '🪙', title: '6 000 pièces',  grant: { coins: 6000 } },
  { id: 'coins_15k', kind: 'gem', cost: 650, icon: '🪙', title: '15 000 pièces', grant: { coins: 15000 } },
];
export const IAP_PRODUCTS = PRODUCTS.filter((p) => p.kind === 'iap');

export const CHESTS = [
  { id: 'bois',  icon: '📦', name: 'Coffre en bois',    cost: 30,  cards: 8,  coins: [80, 160],
    odds: { commun: 0.75, rare: 0.23, epique: 0.02, legendaire: 0 }, free: true },
  { id: 'royal', icon: '🎁', name: 'Coffre royal',      cost: 150, cards: 30, coins: [300, 600],
    odds: { commun: 0.55, rare: 0.33, epique: 0.10, legendaire: 0.02 } },
  { id: 'mythe', icon: '👑', name: 'Coffre légendaire', cost: 450, cards: 60, coins: [600, 1200],
    odds: { commun: 0.40, rare: 0.35, epique: 0.17, legendaire: 0.08 }, guarantee: 'legendaire' },
];
export const FREE_CHEST_DELAY = 4 * 3600 * 1000;
