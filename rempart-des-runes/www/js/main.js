// Point d'entrée : interface (écrans, fenêtres), liaison avec le combat, la sauvegarde et la boutique.
import { UNITS, UNIT_KEYS, RARITIES, PRODUCTS, CHESTS, MAX_CARD_LVL, DAILY, BALANCE } from './data.js';
import * as M from './meta.js';
import { loadState, saveState, resetState } from './save.js';
import { createPayments } from './payments.js';
import { createBattleController } from './battle.js';
import { sfx, haptic, unlockAudio, applySettings, suspendAudio } from './audio.js';
import { CONFIG } from './config.js';

const $ = (id) => document.getElementById(id);
const fmt = (n) => Math.floor(n).toLocaleString('fr-FR');
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const Cap = window.Capacitor;
const native = !!Cap?.isNativePlatform?.();

let S = null;
let currentTab = 'home';
let deckSlot = 0;
let modalOpen = null;   // { onBack }

const persist = (now = false) => saveState(S, { now });

/* =============== Fenêtres & notifications =============== */
function openModal(html, { onBack = null } = {}) {
  $('mbox').innerHTML = html;
  $('modal').classList.add('on');
  modalOpen = { onBack };
}
function closeModal() { $('modal').classList.remove('on'); modalOpen = null; }
function confirmBox({ icon = '', title, html = '', ok = 'OK', okClass = '', cancel = 'Annuler' }) {
  return new Promise((resolve) => {
    openModal(`${icon ? `<div class="bigic">${icon}</div>` : ''}<h2>${title}</h2>${html}
      <div class="row">${cancel ? `<button class="btn ghost" data-m="no">${cancel}</button>` : ''}<button class="btn ${okClass}" data-m="yes">${ok}</button></div>`,
    { onBack: () => { closeModal(); resolve(false); } });
    $('mbox').querySelector('[data-m="yes"]').onclick = () => { sfx('click'); closeModal(); resolve(true); };
    const no = $('mbox').querySelector('[data-m="no"]');
    if (no) no.onclick = () => { sfx('click'); closeModal(); resolve(false); };
  });
}
const alertBox = (o) => confirmBox({ ...o, cancel: null });

let toastTimer = 0;
function toast(msg, kind = 'success') {
  const t = $('toast');
  t.textContent = msg;
  t.className = `toast on ${kind === 'error' ? 'error' : ''}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.className = 'toast'; }, 2200);
}

/* =============== Rendu des écrans =============== */
function cardHTML(k, extra = '') {
  const u = UNITS[k], c = S.cards[k], rar = RARITIES[u.rarity];
  return `<div class="ic" style="background:${u.color}2e;border-color:${rar.color}88">${u.icon}</div>
    <div class="nm" style="color:${rar.color}">${u.name}</div><div class="lv">Niv. ${c.lvl}</div>${extra}`;
}

function renderTop() {
  $('tTro').textContent = fmt(S.trophies);
  $('tCoin').textContent = fmt(S.coins);
  $('tGem').textContent = fmt(S.gems);
  $('nDeck').hidden = !UNIT_KEYS.some((k) => M.canUpgrade(S, k));
  $('nChest').hidden = M.freeChestLeft(S, Date.now()) > 0;
}

function renderHome() {
  const a = M.arenaFor(S.trophies), next = M.nextArena(S.trophies);
  const pct = next ? ((S.trophies - a.min) / (next.min - a.min)) * 100 : 100;
  $('hArena').innerHTML = `<div class="logo">🏰</div><h1>Rempart des Runes</h1>
    <div class="an">${a.icon} ${a.name}</div>
    <div class="prog"><i style="width:${pct}%"></i></div>
    <div class="muted tiny">${next ? `${fmt(S.trophies)} / ${fmt(next.min)} 🏆 → ${next.icon} ${next.name}` : 'Arène maximale atteinte !'}</div>`;
  $('hBest').textContent = S.best;
  $('hGames').textContent = S.games;
  $('hPass').textContent = S.premium ? '👑' : '—';
  $('hDeck').innerHTML = S.deck.map((k) => `<div class="card">${cardHTML(k)}</div>`).join('');
  const d = $('hDaily');
  if (M.dailyReady(S)) {
    d.hidden = false;
    d.innerHTML = `<span>🎁</span><div>Cadeau du jour disponible !<div class="muted tiny">Reviens chaque jour : jusqu'à 50 💎 le 7e jour</div></div>`;
  } else d.hidden = true;
}

function renderDeck() {
  $('dDeck').innerHTML = S.deck.map((k, i) =>
    `<div class="card ${i === deckSlot ? 'sel' : ''}" data-action="slot" data-i="${i}">${cardHTML(k)}</div>`).join('');
  $('dColl').innerHTML = UNIT_KEYS.map((k) => {
    const c = S.cards[k], cost = M.upgradeCost(S, k);
    if (!c.owned) return `<div class="card locked" data-action="card" data-k="${k}">${cardHTML(k, '<div class="lv">🔒 Dans les coffres</div>')}</div>`;
    const max = c.lvl >= MAX_CARD_LVL;
    const pct = max ? 100 : Math.min(100, (c.copies / cost.copies) * 100);
    const can = M.canUpgrade(S, k);
    return `<div class="card" data-action="card" data-k="${k}">${can ? '<span class="badge">⬆</span>' : ''}${cardHTML(k)}
      <div class="bar"><i style="width:${pct}%"></i></div>
      <div class="lv">${max ? 'Niveau max' : `${c.copies} / ${cost.copies} cartes`}</div>
      ${S.deck.includes(k) ? '<button class="btn ghost small" disabled>Équipée</button>'
        : `<button class="btn ghost small" data-action="equip" data-k="${k}">Équiper</button>`}
    </div>`;
  }).join('');
}

function renderChests() {
  const left = M.freeChestLeft(S, Date.now());
  const time = (ms) => { const m = Math.ceil(ms / 60000); return m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}` : `${m} min`; };
  $('cList').innerHTML = CHESTS.map((ch) => `
    <div class="item ${ch.guarantee ? 'hot' : ''}"><div class="ic">${ch.icon}</div>
      <div class="tx"><b>${ch.name}</b><span>${ch.cards} cartes + ${ch.coins[0]}–${ch.coins[1]} 🪙${ch.guarantee ? ' · 1 légendaire garantie' : ''}</span>
        <div class="odds">${Object.entries(ch.odds).filter(([, p]) => p > 0).map(([r, p]) => `<b style="color:${RARITIES[r].color}">${RARITIES[r].label}</b> ${Math.round(p * 100)} %`).join(' · ')}</div></div>
      <div class="act">
        ${ch.free ? `<button class="btn ok" data-action="chest" data-id="${ch.id}" data-free="1" ${left > 0 ? 'disabled' : ''}>${left > 0 ? time(left) : 'Gratuit'}</button>` : ''}
        <button class="btn gem" data-action="chest" data-id="${ch.id}">${ch.cost} 💎</button>
      </div></div>`).join('');
}

function renderShop() {
  const pm = payments.mode;
  $('demoNote').hidden = pm !== 'demo';
  $('shopIap').hidden = pm === 'off';
  $('restoreBtn').hidden = pm === 'off';
  const item = (p) => {
    const owned = !p.consumable && p.kind === 'iap' && S.owned.includes(p.id);
    const btn = p.kind === 'iap'
      ? `<button class="btn" data-action="buy" data-id="${p.id}" ${owned ? 'disabled' : ''}>${owned ? 'Acheté ✓' : esc(payments.price(p))}</button>`
      : `<button class="btn gem" data-action="buygem" data-id="${p.id}">${p.cost} 💎</button>`;
    return `<div class="item ${p.tag && !p.consumable ? 'hot' : ''}"><div class="ic">${p.icon}</div>
      <div class="tx"><b>${p.title}${p.tag ? `<span class="tag">${p.tag}</span>` : ''}</b><span>${p.sub || ''}</span></div>${btn}</div>`;
  };
  $('shopSpecial').innerHTML = PRODUCTS.filter((p) => p.kind === 'iap' && !p.consumable).map(item).join('');
  $('shopGems').innerHTML = PRODUCTS.filter((p) => p.kind === 'iap' && p.consumable).map(item).join('');
  $('shopCoins').innerHTML = PRODUCTS.filter((p) => p.kind === 'gem').map(item).join('');
}

function render() {
  if (!S) return;
  renderTop();
  if (currentTab === 'home') renderHome();
  if (currentTab === 'deck') renderDeck();
  if (currentTab === 'chest') renderChests();
  if (currentTab === 'shop') renderShop();
}

function tab(t) {
  currentTab = t;
  document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('on', s.id === `s-${t}`));
  document.querySelectorAll('.nav button').forEach((b) => b.classList.toggle('on', b.dataset.tab === t));
  render();
}

/* =============== Actions =============== */
function cardDetail(k) {
  const u = UNITS[k], c = S.cards[k], cost = M.upgradeCost(S, k), rar = RARITIES[u.rarity];
  const max = c.lvl >= MAX_CARD_LVL;
  const dmg = (lvl) => Math.round(u.dmg * (1 + BALANCE.cardBonus * (lvl - 1)));
  openModal(`<div class="bigic">${u.icon}</div><h2>${u.name}</h2>
    <div style="color:${rar.color};font-weight:800">${rar.label}</div>
    <p>${u.desc}</p>
    <div class="stats-detail">Niveau : <b>${c.lvl}</b>${max ? ' (max)' : ''}<br>
      Dégâts : <b>${dmg(c.lvl)}</b>${max ? '' : ` → <b style="color:var(--ok)">${dmg(c.lvl + 1)}</b>`}<br>
      Cadence : <b>${u.rate} tir/s</b><br>
      ${c.owned ? `Cartes : <b>${c.copies}</b>${max ? '' : ` / ${cost.copies}`}` : 'Pas encore obtenue : ouvre des coffres !'}</div>
    <div class="col">
      ${c.owned && !max ? `<button class="btn ok" data-m="up" ${M.canUpgrade(S, k) ? '' : 'disabled'}>Améliorer · ${fmt(cost.coins)} 🪙</button>` : ''}
      <button class="btn ghost" data-m="close">Fermer</button>
    </div>`, { onBack: closeModal });
  $('mbox').querySelector('[data-m="close"]').onclick = closeModal;
  const up = $('mbox').querySelector('[data-m="up"]');
  if (up) up.onclick = () => {
    if (M.upgradeCard(S, k)) { sfx('power'); haptic('success'); persist(); closeModal(); render(); toast(`${u.name} passe au niveau ${S.cards[k].lvl} !`); }
  };
}

async function openChestAction(id, free) {
  const ch = CHESTS.find((c) => c.id === id);
  if (!free) {
    if (S.gems < ch.cost) return noGems();
    if (!(await confirmBox({ icon: ch.icon, title: ch.name, html: `<p>Ouvrir pour <b>${ch.cost} 💎</b> ?</p>`, ok: 'Ouvrir', okClass: 'gem' }))) return;
  }
  const res = M.openChest(S, id, { paid: free ? 'free' : 'gems' });
  if (!res) return;
  persist(true);
  render();
  showChestResult(res);
}
function showChestResult(res, title) {
  sfx('chest'); haptic('success');
  const items = Object.entries(res.cards).map(([k, n], i) => {
    const u = UNITS[k];
    return `<div style="color:${RARITIES[u.rarity].color};animation-delay:${0.1 + i * 0.08}s">${u.icon} ${u.name} ×${n}${res.fresh.includes(k) ? '<span class="tag">NOUVEAU</span>' : ''}</div>`;
  }).join('');
  alertBox({ icon: res.chest.icon, title: title || res.chest.name, html: `<div class="reveal">${items}<div>🪙 +${fmt(res.coins)}</div></div>`, ok: 'Super !' });
}

async function noGems() {
  sfx('error');
  if (payments.mode === 'off') return toast('Pas assez de gemmes', 'error');
  if (await confirmBox({ icon: '💎', title: 'Pas assez de gemmes', html: '<p>Obtiens-en dans la boutique.</p>', ok: 'Boutique', okClass: 'gem' })) tab('shop');
}

async function buy(id) {
  const p = PRODUCTS.find((x) => x.id === id);
  if (!p) return;
  sfx('click');
  const ok = await payments.purchase(p);
  if (ok) {
    persist(true);
    sfx('purchase'); haptic('success');
    render();
    const g = p.grant;
    const lines = [g.gems && `💎 +${fmt(g.gems)}`, g.coins && `🪙 +${fmt(g.coins)}`, g.unlock && `${UNITS[g.unlock].icon} ${UNITS[g.unlock].name}`, g.premium && '👑 Pass Royal actif'].filter(Boolean);
    alertBox({ icon: p.icon, title: 'Merci ! 💜', html: `<div class="reveal">${lines.map((l) => `<div>${l}</div>`).join('')}</div>`, ok: 'Super !' });
  }
}

function buyGem(id) {
  const p = PRODUCTS.find((x) => x.id === id);
  if (S.gems < p.cost) return noGems();
  if (M.buyWithGems(S, id)) { sfx('coins'); persist(); render(); toast(`🪙 +${fmt(p.grant.coins)}`); }
}

async function claimDaily() {
  const res = M.claimDaily(S);
  if (!res) return;
  persist(true); render();
  const g = res.gift;
  if (res.chest) return showChestResult(res.chest, 'Cadeau du jour');
  sfx('coins'); haptic('success');
  alertBox({ icon: '🎁', title: 'Cadeau du jour', html: `<div class="reveal"><div>${g.coins ? `🪙 +${fmt(g.coins)}` : `💎 +${fmt(g.gems)}`}</div></div><p>Jour ${S.daily.day || DAILY.length} / ${DAILY.length}. Reviens demain !</p>`, ok: 'Merci !' });
}

function settings() {
  const sw = (k, label) => `<div class="setting">${label}<button class="switch ${S.settings[k] ? 'on' : ''}" data-s="${k}" aria-label="${label}"></button></div>`;
  openModal(`<h2>Réglages</h2>
    ${sw('sound', '🔊 Effets sonores')}${sw('music', '🎵 Musique')}${sw('haptics', '📳 Vibrations')}
    <div class="col">
      ${payments.mode !== 'off' ? '<button class="btn ghost" data-m="restore">Restaurer mes achats</button>' : ''}
      <a class="btn ghost" href="${CONFIG.PRIVACY_URL}" target="_blank" rel="noopener" style="text-decoration:none">Confidentialité</a>
      <button class="btn bad" data-m="reset">Effacer ma progression</button>
      <button class="btn" data-m="close">Fermer</button>
    </div>
    <p class="tiny">Rempart des Runes · v${window.APP_VERSION || '1.0.0'}</p>`, { onBack: closeModal });
  const box = $('mbox');
  box.querySelectorAll('[data-s]').forEach((b) => b.onclick = () => {
    const k = b.dataset.s; S.settings[k] = !S.settings[k];
    b.classList.toggle('on', S.settings[k]); applySettings(S.settings); persist(); sfx('click');
  });
  box.querySelector('[data-m="close"]').onclick = closeModal;
  const r = box.querySelector('[data-m="restore"]'); if (r) r.onclick = () => payments.restore();
  box.querySelector('[data-m="reset"]').onclick = async () => {
    closeModal();
    if (await confirmBox({ icon: '⚠️', title: 'Tout effacer ?', html: '<p>Cartes, pièces, gemmes et trophées seront perdus. Les achats uniques pourront être restaurés.</p>', ok: 'Effacer', okClass: 'bad' })) {
      await resetState(); S = M.migrate(null); persist(true); applySettings(S.settings); tab('home'); toast('Progression effacée');
    }
  };
}

/* =============== Combat =============== */
const battle = createBattleController({
  canvas: $('cv'), container: $('battle'),
  onPauseRequest: pauseMenu,
  onEnd: (result) => showResults(result),
});

function play() {
  unlockAudio();
  sfx('click');
  battle.start({ deck: S.deck, levels: M.cardLevels(S), tutorial: S.tutorial });
}

function pauseMenu() {
  if (!battle.active || battle.state?.over) return;
  battle.setPaused(true);
  const resume = () => { closeModal(); battle.setPaused(false); };
  openModal(`<div class="bigic">⏸️</div><h2>Pause</h2>
    <p>Vague ${battle.state.wave} · ${battle.state.kills} ennemis vaincus</p>
    <div class="col"><button class="btn ok" data-m="resume">Reprendre</button>
    <button class="btn ghost" data-m="settings">Réglages</button>
    <button class="btn bad" data-m="quit">Abandonner</button></div>`, { onBack: resume });
  const box = $('mbox');
  box.querySelector('[data-m="resume"]').onclick = resume;
  box.querySelector('[data-m="settings"]').onclick = () => { settings(); modalOpen.onBack = () => { closeModal(); pauseMenu(); }; box.querySelector('[data-m="close"]').onclick = () => { closeModal(); pauseMenu(); }; };
  box.querySelector('[data-m="quit"]').onclick = () => { closeModal(); battle.quit(); };
}

function showResults(result) {
  const r = M.battleRewards(S, result.wave, { forfeit: result.forfeit });
  M.applyRewards(S, r);
  persist(true);
  if (r.record && !result.forfeit) sfx('victory');
  openModal(`<div class="bigic">${r.record ? '🏅' : result.forfeit ? '🏳️' : '🏰'}</div>
    <h2>${r.record ? 'Nouveau record !' : result.forfeit ? 'Partie abandonnée' : 'Le rempart est tombé'}</h2>
    <p>Vague atteinte : <b style="color:var(--txt)">${result.wave}</b> · ${result.kills} ennemis vaincus</p>
    <div class="rewards">
      <div>🪙 ${fmt(r.coins)}<small>${S.premium ? 'Pass ×2' : 'pièces'}</small></div>
      <div style="animation-delay:.1s">🏆 ${r.trophies >= 0 ? '+' : ''}${r.trophies}<small>trophées</small></div>
      <div style="animation-delay:.2s">💎 ${r.gems}<small>${r.gems ? 'record' : 'gemmes'}</small></div>
    </div>
    ${!S.premium && payments.mode !== 'off' ? '<p class="tiny">👑 Avec le Pass Royal, tu aurais gagné ' + fmt(r.coins * 2) + ' 🪙</p>' : ''}
    <div class="row"><button class="btn ghost" data-m="home">Accueil</button><button class="btn" data-m="again">Rejouer</button></div>`,
  { onBack: () => { closeModal(); battle.stop(); tab('home'); } });
  const box = $('mbox');
  box.querySelector('[data-m="home"]').onclick = () => { sfx('click'); closeModal(); battle.stop(); tab('home'); };
  box.querySelector('[data-m="again"]').onclick = () => { closeModal(); battle.stop(); render(); play(); };
}

/* =============== Paiements =============== */
const payments = createPayments({
  credit: (id, tx) => { const ok = M.creditPurchase(S, id, tx); if (ok) persist(true); return ok; },
  restore: (ids) => { if (M.restoreOwned(S, ids)) persist(true); },
  confirmDemo: (p) => confirmBox({ icon: p.icon, title: p.title,
    html: `<p>${p.sub || ''}</p><div class="price">${p.price}</div><p class="tiny">Achat simulé (version de démonstration) : aucun paiement réel.</p>`, ok: 'Acheter' }),
  notify: (m, kind) => toast(m, kind),
  changed: () => render(),
});

/* =============== Événements =============== */
document.addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-action]');
  if (!el || !S) return;
  unlockAudio();
  const a = el.dataset.action;
  if (a === 'tab') { sfx('click'); tab(el.dataset.tab); }
  else if (a === 'play') play();
  else if (a === 'settings') { sfx('click'); settings(); }
  else if (a === 'slot') { sfx('click'); deckSlot = Number(el.dataset.i); renderDeck(); }
  else if (a === 'equip') { ev.stopPropagation(); if (M.equip(S, deckSlot, el.dataset.k)) { sfx('click'); persist(); render(); } }
  else if (a === 'card') { sfx('click'); cardDetail(el.dataset.k); }
  else if (a === 'chest') openChestAction(el.dataset.id, el.dataset.free === '1');
  else if (a === 'buy') buy(el.dataset.id);
  else if (a === 'buygem') buyGem(el.dataset.id);
  else if (a === 'restore') payments.restore();
  else if (a === 'daily') claimDaily();
});
$('modal').addEventListener('click', (ev) => { if (ev.target === $('modal') && modalOpen?.onBack) modalOpen.onBack(); });

function onBack() {
  if (modalOpen?.onBack) return modalOpen.onBack();
  if (battle.active) return pauseMenu();
  if (currentTab !== 'home') return tab('home');
  Cap?.Plugins?.App?.minimizeApp?.();
}
function onHide() {
  if (battle.active && !battle.paused && !battle.state?.over) pauseMenu();
  suspendAudio(true);
  persist(true);
}
document.addEventListener('visibilitychange', () => { if (document.hidden) onHide(); else suspendAudio(false); });
if (native) {
  Cap.Plugins.App?.addListener('backButton', onBack);
  Cap.Plugins.App?.addListener('pause', onHide);
} else {
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') onBack(); });
}
setInterval(() => {
  if (!S || battle.active) return;
  renderTop();
  if (currentTab === 'chest') renderChests();
}, 30000);

/* =============== Démarrage =============== */
(async function boot() {
  S = await loadState();
  applySettings(S.settings);
  render();
  $('loading').classList.add('hide');
  persist();
  payments.init();
  if ('serviceWorker' in navigator && !native && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
  window.__jeu = { get S() { return S; }, battle, payments };   // utilisé par les tests automatiques
})();
