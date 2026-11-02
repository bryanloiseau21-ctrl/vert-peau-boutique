// Affichage du combat sur <canvas>. Lit l'état du moteur, ne le modifie jamais.
import { UNITS, MAX_POWER, BOSSES } from './data.js';
import { W, H, COLS, ROWS, CELL, PATH, cellCenter, powerCost, canSummon, canPowerUp, canMerge, remainingEnemies } from './engine.js';

// Zones cliquables (coordonnées logiques 360×640)
export const BTN = {
  summon: { x: 115, y: 516, w: 130, h: 56 },
  speed:  { x: 300, y: 14, w: 48, h: 32 },
  pause:  { x: 12,  y: 14, w: 48, h: 32 },
  power:  (i) => ({ x: 10 + i * 69, y: 582, w: 64, h: 52 }),
};
export const inRect = (x, y, r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

const BOSS_BY_ID = Object.fromEntries(BOSSES.map((b) => [b.id, b]));

function roundRect(c, x, y, w, h, r) {
  c.beginPath();
  if (c.roundRect) { c.roundRect(x, y, w, h, r); return; }
  c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let scale = 1, dpr = 1, bg = null;
  const rr = (x, y, w, h, r) => roundRect(ctx, x, y, w, h, r);

  function buildBackground() {
    bg = document.createElement('canvas');
    bg.width = W * scale * dpr; bg.height = H * scale * dpr;
    const c = bg.getContext('2d');
    c.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#1b1338'); g.addColorStop(0.55, '#140e2a'); g.addColorStop(1, '#0e0a1f');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    // étoiles
    let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 70; i++) { c.fillStyle = `rgba(255,255,255,${0.1 + rnd() * 0.35})`; c.fillRect(rnd() * W, rnd() * 200, 1.3, 1.3); }
    // chemin : bordure, pavés
    const path = () => { c.beginPath(); c.moveTo(...PATH[0]); PATH.slice(1).forEach((p) => c.lineTo(...p)); };
    c.lineJoin = 'round'; c.lineCap = 'round';
    path(); c.strokeStyle = '#0a0717'; c.lineWidth = 40; c.stroke();
    path(); c.strokeStyle = '#3a2d63'; c.lineWidth = 34; c.stroke();
    path(); c.strokeStyle = '#46377a'; c.lineWidth = 26; c.stroke();
    c.setLineDash([3, 11]); path(); c.strokeStyle = '#5a4a96'; c.lineWidth = 2; c.stroke(); c.setLineDash([]);
    // portail et château
    const glow = (x, y, col) => { const r = c.createRadialGradient(x, y, 2, x, y, 30); r.addColorStop(0, col); r.addColorStop(1, 'transparent'); c.fillStyle = r; c.fillRect(x - 30, y - 30, 60, 60); };
    glow(PATH[0][0], PATH[0][1] + 6, '#b04dff88'); glow(PATH[3][0], PATH[3][1] + 6, '#ffc94d66');
    c.font = '22px serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('🌀', PATH[0][0], PATH[0][1] + 16); c.fillText('🏰', PATH[3][0], PATH[3][1] + 16);
    // plateau
    const bx = cellCenter(0)[0] - CELL / 2 - 6, by = cellCenter(0)[1] - CELL / 2 - 6;
    c.fillStyle = '#0c0819'; roundRect(c, bx, by, COLS * CELL + 12, ROWS * CELL + 12, 14); c.fill();
    for (let i = 0; i < COLS * ROWS; i++) {
      const [x, y] = cellCenter(i);
      c.fillStyle = (i + Math.floor(i / COLS)) % 2 ? '#211943' : '#251c4b';
      roundRect(c, x - CELL / 2 + 3, y - CELL / 2 + 3, CELL - 6, CELL - 6, 10); c.fill();
    }
  }

  function resize(box) {
    scale = Math.min(box.width / W, box.height / H);
    dpr = Math.min(3, window.devicePixelRatio || 1);
    canvas.style.width = `${W * scale}px`; canvas.style.height = `${H * scale}px`;
    canvas.width = Math.round(W * scale * dpr); canvas.height = Math.round(H * scale * dpr);
    ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
    buildBackground();
  }
  const toLogical = (clientX, clientY) => {
    const r = canvas.getBoundingClientRect();
    return [(clientX - r.left) / scale, (clientY - r.top) / scale];
  };

  function drawUnit(u, x, y, size, { ghost = false, glow = false } = {}) {
    const d = UNITS[u.k];
    const pulse = u.fire > 0 ? 1.06 : 1;
    const s = size * pulse;
    ctx.save();
    if (ghost) ctx.globalAlpha = 0.9;
    if (glow) { ctx.shadowColor = '#ffe27a'; ctx.shadowBlur = 16; }
    const g = ctx.createLinearGradient(x, y - s / 2, x, y + s / 2);
    g.addColorStop(0, d.color + '66'); g.addColorStop(1, d.color + '22');
    ctx.fillStyle = g; rr(x - s / 2, y - s / 2, s, s, 11); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = d.color; ctx.lineWidth = 2; ctx.stroke();
    ctx.font = `${s * 0.48}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(d.icon, x, y - 4);
    // niveau de fusion (points)
    const n = u.pip, gap = 6, sx = x - ((n - 1) * gap) / 2;
    for (let p = 0; p < n; p++) {
      ctx.fillStyle = '#0008'; ctx.beginPath(); ctx.arc(sx + p * gap, y + s / 2 - 8, 3, 0, 7); ctx.fill();
      ctx.fillStyle = n >= 7 ? '#ffd24d' : '#fff'; ctx.beginPath(); ctx.arc(sx + p * gap, y + s / 2 - 8, 2.1, 0, 7); ctx.fill();
    }
    if (u.stun > 0) {
      ctx.fillStyle = '#7fc8ffaa'; rr(x - s / 2, y - s / 2, s, s, 11); ctx.fill();
      ctx.font = `${s * 0.4}px serif`; ctx.fillText('🧊', x + s / 2 - 10, y - s / 2 + 10);
    }
    ctx.restore();
  }

  function drawEnemy(e) {
    const { x, y, r } = e;
    ctx.save();
    // ombre
    ctx.fillStyle = '#0006'; ctx.beginPath(); ctx.ellipse(x, y + r * 0.8, r, r * 0.35, 0, 0, 7); ctx.fill();
    const g = ctx.createRadialGradient(x - r / 3, y - r / 3, 1, x, y, r);
    g.addColorStop(0, e.hit > 0 ? '#ffffff' : lighten(e.color)); g.addColorStop(1, e.color);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    if (e.slowT > 0) { ctx.strokeStyle = '#7fd8ff'; ctx.lineWidth = 2.5; ctx.stroke(); }
    if (e.stunT > 0) { ctx.strokeStyle = '#8ee6c4'; ctx.lineWidth = 3; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.arc(x, y, r + 3, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
    if (e.poisonT > 0) { ctx.fillStyle = '#b06cff66'; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
    if (e.boss) {
      ctx.font = `${r * 1.25}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(BOSS_BY_ID[e.boss].icon, x, y + 1);
    } else {
      // yeux
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x - r * 0.33, y - r * 0.15, r * 0.24, 0, 7); ctx.arc(x + r * 0.33, y - r * 0.15, r * 0.24, 0, 7); ctx.fill();
      ctx.fillStyle = '#1a1430'; ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.12, r * 0.12, 0, 7); ctx.arc(x + r * 0.36, y - r * 0.12, r * 0.12, 0, 7); ctx.fill();
    }
    // barre de vie
    const bw = Math.max(18, r * 2.3);
    ctx.fillStyle = '#000b'; rr(x - bw / 2, y - r - 9, bw, 5, 2.5); ctx.fill();
    ctx.fillStyle = e.boss ? '#ff4d8d' : e.hp / e.max > 0.5 ? '#5fd38a' : '#ffc94d';
    rr(x - bw / 2, y - r - 9, Math.max(2, bw * (e.hp / e.max)), 5, 2.5); ctx.fill();
    ctx.restore();
  }

  function lighten(hex) {
    const n = parseInt(hex.slice(1), 16);
    const f = (v) => Math.min(255, v + 70);
    return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
  }

  function button(r, fill, txtColor, label, sub) {
    ctx.fillStyle = '#0007'; rr(r.x, r.y + 4, r.w, r.h, 14); ctx.fill();
    ctx.fillStyle = fill; rr(r.x, r.y, r.w, r.h, 14); ctx.fill();
    ctx.fillStyle = txtColor; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 17px system-ui, sans-serif'; ctx.fillText(label, r.x + r.w / 2, r.y + (sub ? r.h / 2 - 9 : r.h / 2));
    if (sub) { ctx.font = 'bold 13px system-ui, sans-serif'; ctx.fillText(sub, r.x + r.w / 2, r.y + r.h / 2 + 11); }
  }

  /**
   * @param b  état du combat
   * @param v  vue : { drag, fx[], banner, shake, speed, hint }
   */
  function draw(b, v) {
    ctx.save();
    if (v.shake > 0) ctx.translate((Math.random() - 0.5) * v.shake * 10, (Math.random() - 0.5) * v.shake * 10);
    ctx.drawImage(bg, 0, 0, W, H);

    // runes
    const dragged = v.drag ? b.board[v.drag.i] : null;
    b.board.forEach((u, i) => {
      if (!u || (v.drag && v.drag.i === i)) return;
      const [x, y] = cellCenter(i);
      const target = dragged && canMerge(b, v.drag.i, i);
      if (target) { ctx.fillStyle = '#ffe27a33'; rr(x - CELL / 2 + 1, y - CELL / 2 + 1, CELL - 2, CELL - 2, 12); ctx.fill(); }
      drawUnit(u, x, y, CELL - 10, { glow: target });
    });

    // ennemis, du plus loin au plus proche du château
    for (const e of b.enemies) drawEnemy(e);

    // projectiles
    for (const s of b.shots) {
      ctx.fillStyle = s.color; ctx.shadowColor = s.color; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(s.x, s.y, 3 + s.pip * 0.45, 0, 7); ctx.fill();
    }
    ctx.shadowBlur = 0;

    // effets
    for (const f of v.fx) {
      const k = f.life / f.max;
      ctx.globalAlpha = Math.min(1, k * 2);
      if (f.t === 'ring') { ctx.strokeStyle = f.c; ctx.lineWidth = 3 * k + 1; ctx.beginPath(); ctx.arc(f.x, f.y, (f.r || 22) * (1.15 - k * 0.6), 0, 7); ctx.stroke(); }
      else if (f.t === 'spark') { ctx.fillStyle = f.c; ctx.beginPath(); ctx.arc(f.x, f.y, 2.4 * k + 0.5, 0, 7); ctx.fill(); }
      else if (f.t === 'line') { ctx.strokeStyle = f.c; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo((f.x + f.x2) / 2 + (Math.random() - 0.5) * 12, (f.y + f.y2) / 2 + (Math.random() - 0.5) * 12); ctx.lineTo(f.x2, f.y2); ctx.stroke(); }
      else if (f.t === 'txt') { ctx.fillStyle = f.c; ctx.font = `bold ${f.size || 15}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.strokeStyle = '#000a'; ctx.lineWidth = 3; ctx.strokeText(f.s, f.x, f.y - (1 - k) * 24); ctx.fillText(f.s, f.x, f.y - (1 - k) * 24); }
      else if (f.t === 'flash') { ctx.fillStyle = f.c || '#ff304055'; ctx.fillRect(0, 0, W, H); }
      ctx.globalAlpha = 1;
    }
    ctx.restore();

    drawHud(b, v);
    if (dragged) drawUnit(dragged, v.drag.x, v.drag.y - 10, CELL - 2, { ghost: true });
    if (v.hint) drawHint(v.hint);
  }

  function drawHud(b, v) {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    // pause / vitesse
    ctx.fillStyle = '#ffffff18'; rr(BTN.pause.x, BTN.pause.y, BTN.pause.w, BTN.pause.h, 9); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 15px system-ui, sans-serif'; ctx.fillText('❚❚', BTN.pause.x + 24, BTN.pause.y + 16);
    ctx.fillStyle = v.speed > 1 ? '#ffc94d33' : '#ffffff18'; rr(BTN.speed.x, BTN.speed.y, BTN.speed.w, BTN.speed.h, 9); ctx.fill();
    ctx.fillStyle = v.speed > 1 ? '#ffc94d' : '#fff'; ctx.fillText(`×${v.speed}`, BTN.speed.x + 24, BTN.speed.y + 16);

    ctx.fillStyle = '#fff'; ctx.font = 'bold 22px system-ui, sans-serif'; ctx.fillText(b.wave ? `Vague ${b.wave}` : 'Prépare-toi !', W / 2, 30);
    ctx.font = '19px serif'; ctx.fillText('❤️'.repeat(b.lives) + '🖤'.repeat(Math.max(0, 3 - b.lives)), W / 2, 62);
    ctx.font = '13px system-ui, sans-serif'; ctx.fillStyle = '#a99cd0';
    ctx.fillText(`Ennemis restants : ${remainingEnemies(b)}`, W / 2, 88);
    if (v.label && !b.enemies.some((e) => e.boss)) { ctx.fillStyle = '#ffc94d'; ctx.font = 'bold 12px system-ui, sans-serif'; ctx.fillText(v.label, W / 2, 112); }

    const boss = b.enemies.find((e) => e.boss);
    if (boss) {
      const info = BOSS_BY_ID[boss.boss];
      ctx.fillStyle = '#000a'; rr(30, 106, 300, 20, 10); ctx.fill();
      const g = ctx.createLinearGradient(30, 0, 330, 0); g.addColorStop(0, '#ff4d8d'); g.addColorStop(1, '#ff8a4d');
      ctx.fillStyle = g; rr(30, 106, Math.max(20, 300 * (boss.hp / boss.max)), 20, 10); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.fillText(`${info.icon} ${info.name.toUpperCase()} — ${info.power}`, W / 2, 116);
    }
    if (v.banner) {
      const k = Math.min(1, v.banner.life * 2, (v.banner.max - v.banner.life) * 6);
      ctx.globalAlpha = k;
      ctx.fillStyle = '#0009'; rr(40, 148, 280, 46, 14); ctx.fill();
      ctx.fillStyle = v.banner.c || '#fff'; ctx.font = 'bold 22px system-ui, sans-serif'; ctx.fillText(v.banner.s, W / 2, 171);
      ctx.globalAlpha = 1;
    }

    // mana
    ctx.textAlign = 'left'; ctx.fillStyle = '#c9b8ff'; ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.fillText(`✦ ${Math.floor(b.mana)}`, 14, BTN.summon.y + 28);
    ctx.font = '11px system-ui, sans-serif'; ctx.fillStyle = '#8a80a8'; ctx.fillText('mana', 16, BTN.summon.y + 48);
    ctx.textAlign = 'center';
    const free = b.board.filter((u) => !u).length;
    ctx.fillStyle = '#8a80a8'; ctx.font = '11px system-ui, sans-serif';
    ctx.fillText(`${15 - free}/15`, BTN.summon.x + BTN.summon.w + 40, BTN.summon.y + 28);
    const can = canSummon(b);
    button(BTN.summon, can ? '#ffc94d' : '#3d3363', can ? '#1a1430' : '#8a80a8', 'INVOQUER', `${b.summonCost} ✦`);

    // renforcements
    b.deck.forEach((k, i) => {
      const r = BTN.power(i), lvl = b.power[k], ok = canPowerUp(b, i), d = UNITS[k];
      ctx.fillStyle = ok ? d.color + '55' : '#ffffff0f'; rr(r.x, r.y, r.w, r.h, 11); ctx.fill();
      if (ok) { ctx.strokeStyle = d.color; ctx.lineWidth = 1.5; ctx.stroke(); }
      ctx.font = '20px serif'; ctx.fillStyle = '#fff'; ctx.fillText(d.icon, r.x + 18, r.y + 18);
      ctx.font = 'bold 11px system-ui, sans-serif'; ctx.fillText(`Nv${lvl}`, r.x + 46, r.y + 18);
      ctx.fillStyle = ok ? '#fff' : '#8a80a8';
      ctx.fillText(lvl < MAX_POWER ? `${powerCost(lvl)} ✦` : 'MAX', r.x + r.w / 2, r.y + 39);
    });
  }

  function drawHint(h) {
    const t = performance.now() / 300;
    ctx.save();
    ctx.fillStyle = '#000c'; rr(20, h.y, 320, 44, 12); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 14px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(h.text, W / 2, h.y + 22);
    if (h.arrow) { ctx.font = '26px serif'; ctx.fillText('👇', h.arrow[0], h.arrow[1] + Math.sin(t) * 5); }
    ctx.restore();
  }

  return { resize, draw, toLogical, get scale() { return scale; } };
}
