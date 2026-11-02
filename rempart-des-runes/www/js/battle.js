// Pilote d'une partie : boucle de jeu, entrées tactiles, effets, sons et tutoriel.
import { createBattle, step, summon, merge, canMerge, powerUp, forfeit, cellAt, cellCenter } from './engine.js';
import { createRenderer, BTN, inRect } from './render.js';
import { BOSSES } from './data.js';
import { sfx, haptic, startMusic, stopMusic } from './audio.js';

const BOSS_NAME = Object.fromEntries(BOSSES.map((b) => [b.id, `${b.icon} ${b.name}`]));
const DT = 1 / 60;

/**
 * @param {object} o
 * @param {HTMLCanvasElement} o.canvas
 * @param {HTMLElement} o.container
 * @param {(result:{wave:number,kills:number,forfeit:boolean})=>void} o.onEnd
 * @param {()=>void} o.onPauseRequest  bouton pause touché
 */
export function createBattleController({ canvas, container, onEnd, onPauseRequest }) {
  const R = createRenderer(canvas);
  let b = null, view = null, raf = 0, last = 0, acc = 0, paused = false, ending = false, tutorial = null;

  const resize = () => { if (b) R.resize(container.getBoundingClientRect()); };
  window.addEventListener('resize', resize);

  function start({ deck, levels, tutorial: tuto }) {
    b = createBattle({ deck, levels });
    view = { drag: null, fx: [], banner: { s: 'Prépare-toi !', life: 1.6, max: 1.6 }, shake: 0, speed: 1, hint: null };
    tutorial = tuto ? { step: 0, t: 0 } : null;
    paused = false; ending = false; acc = 0;
    container.classList.add('on');
    R.resize(container.getBoundingClientRect());
    startMusic();
    last = performance.now();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(loop);
  }

  function stop() {
    cancelAnimationFrame(raf); raf = 0;
    stopMusic();
    container.classList.remove('on');
    b = null; view = null;
  }

  function setPaused(p) {
    if (!b) return;
    paused = p;
    if (p) { view.drag = null; stopMusic(); } else { last = performance.now(); startMusic(); }
  }

  function quit() { if (b && !b.over) { forfeit(b); handleEvents(); } }

  /* ---------- Effets ---------- */
  const fx = (o) => { o.max = o.life; view.fx.push(o); };
  const sparks = (x, y, c, n = 8) => {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = 40 + Math.random() * 80;
      fx({ t: 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, c, life: 0.35 + Math.random() * 0.25 });
    }
  };
  const banner = (s, c, life = 1.8) => { view.banner = { s, c, life, max: life }; };

  function handleEvents() {
    for (const e of b.events) {
      switch (e.type) {
        case 'summon': { const [x, y] = cellCenter(e.i); fx({ t: 'ring', x, y, life: 0.4, c: '#fff' }); sfx('summon'); haptic('light'); break; }
        case 'merge': { const [x, y] = cellCenter(e.i); fx({ t: 'ring', x, y, life: 0.5, c: '#ffd24d', r: 32 }); sparks(x, y, '#ffd24d', 12); sfx('merge', e.pip); haptic('medium'); break; }
        case 'power': sfx('power'); haptic('light'); break;
        case 'shoot': sfx('shoot'); break;
        case 'kill':
          sparks(e.x, e.y, e.color, e.boss ? 30 : 6);
          fx({ t: 'txt', x: e.x, y: e.y - 10, s: `+${e.mana}`, c: '#c9b8ff', life: 0.7, size: 12 });
          if (e.boss) { sfx('bossKill'); haptic('success'); view.shake = 0.6; banner('Boss vaincu ! 🎉', '#ffd24d'); } else sfx('kill');
          break;
        case 'splash': fx({ t: 'ring', x: e.x, y: e.y, life: 0.3, c: e.color, r: e.r }); sfx('splash'); break;
        case 'zap': fx({ t: 'line', x: e.x, y: e.y, x2: e.x2, y2: e.y2, life: 0.15, c: e.color }); sfx('zap'); break;
        case 'reap': fx({ t: 'txt', x: e.x, y: e.y - 14, s: '💀', c: '#fff', life: 0.8, size: 22 }); sfx('reap'); break;
        case 'leak': fx({ t: 'flash', life: 0.35 }); view.shake = e.boss ? 0.8 : 0.4; sfx('leak'); haptic('heavy'); break;
        case 'wave':
          if (!e.boss) banner(`Vague ${e.wave}`);
          sfx('wave');
          if (e.bonus) fx({ t: 'txt', x: 180, y: 250, s: `💰 +${e.bonus} mana`, c: '#f0b429', life: 1.4, size: 16 });
          break;
        case 'boss': banner(`⚠️ BOSS : ${BOSS_NAME[e.id]}`, '#ff6b8f', 2.4); sfx('boss'); haptic('heavy'); view.shake = 0.3; break;
        case 'ability':
          if (e.i != null) { const [x, y] = cellCenter(e.i); fx({ t: 'ring', x, y, life: 0.6, c: '#7fd8ff', r: 30 }); fx({ t: 'line', x: e.x, y: e.y, x2: x, y2: y, life: 0.3, c: '#7fd8ff' }); }
          else fx({ t: 'ring', x: e.x, y: e.y, life: 0.6, c: '#c58bff', r: 40 });
          sfx('ability');
          break;
        case 'over':
          if (!ending) {
            ending = true;
            if (!e.forfeit) { sfx('defeat'); haptic('error'); banner('Le rempart est tombé…', '#ff6b8f', 3); }
            const result = { wave: e.wave, kills: e.kills, forfeit: !!e.forfeit };
            setTimeout(() => { stopMusic(); onEnd(result); }, e.forfeit ? 0 : 1300);
          }
          break;
      }
    }
    b.events.length = 0;
  }

  function updateFx(dt) {
    for (const f of view.fx) { f.life -= dt; if (f.vx) { f.x += f.vx * dt; f.y += f.vy * dt; f.vx *= 0.92; f.vy *= 0.92; } }
    view.fx = view.fx.filter((f) => f.life > 0);
    if (view.fx.length > 400) view.fx.splice(0, view.fx.length - 400);
    if (view.banner) { view.banner.life -= dt; if (view.banner.life <= 0) view.banner = null; }
    if (view.shake > 0) view.shake = Math.max(0, view.shake - dt * 2);
  }

  /* ---------- Tutoriel (première partie) ---------- */
  function updateTutorial(dt) {
    if (!tutorial) { view.hint = null; return; }
    const units = b.board.filter(Boolean).length;
    const hasPair = b.board.some((u, i) => u && b.board.some((_, j) => canMerge(b, i, j)));
    tutorial.t += dt;
    if (tutorial.step === 0) {
      view.hint = { text: 'Touche INVOQUER pour placer une rune', y: 448, arrow: [180, 506] };
      if (units >= 3) { tutorial.step = 1; tutorial.t = 0; }
    } else if (tutorial.step === 1) {
      view.hint = hasPair ? { text: 'Glisse une rune sur sa jumelle pour fusionner ✨', y: 186 } : { text: 'Invoque encore pour trouver deux runes identiques', y: 448, arrow: [180, 506] };
    } else if (tutorial.step === 2) {
      view.hint = { text: 'Bravo ! Renforce une rune en bas avec la mana', y: 520, arrow: [44, 578] };
      if (tutorial.t > 6) tutorial.step = 3;
    } else { tutorial = null; view.hint = null; }
  }

  /* ---------- Boucle ---------- */
  function loop(t) {
    if (!b) return;
    const frame = Math.min(0.1, (t - last) / 1000);
    last = t;
    if (!paused) {
      acc += frame * view.speed;
      let n = 0;
      while (acc >= DT && n < 12) { step(b, DT); acc -= DT; n++; handleEvents(); if (!b) return; }
      updateFx(frame);
      updateTutorial(frame);
    }
    if (b) R.draw(b, view);
    raf = requestAnimationFrame(loop);
  }

  /* ---------- Entrées ---------- */
  canvas.addEventListener('pointerdown', (ev) => {
    if (!b || paused || b.over) return;
    const [x, y] = R.toLogical(ev.clientX, ev.clientY);
    if (inRect(x, y, BTN.pause)) { sfx('click'); onPauseRequest(); return; }
    if (inRect(x, y, BTN.speed)) { view.speed = view.speed === 1 ? 2 : 1; sfx('click'); return; }
    if (inRect(x, y, BTN.summon)) { if (summon(b) < 0) { sfx('error'); haptic('light'); } handleEvents(); return; }
    for (let i = 0; i < 5; i++) {
      if (inRect(x, y, BTN.power(i))) {
        if (powerUp(b, i)) { const r = BTN.power(i); fx({ t: 'txt', x: r.x + r.w / 2, y: r.y - 4, s: 'Renforcé !', c: '#ffd24d', life: 0.8, size: 12 }); if (tutorial?.step === 2) tutorial.step = 3; }
        else sfx('error');
        handleEvents(); return;
      }
    }
    const c = cellAt(x, y);
    if (c >= 0 && b.board[c]) {
      view.drag = { i: c, x, y };
      canvas.setPointerCapture?.(ev.pointerId);
    }
  });
  canvas.addEventListener('pointermove', (ev) => {
    if (!view?.drag) return;
    const [x, y] = R.toLogical(ev.clientX, ev.clientY);
    view.drag.x = x; view.drag.y = y;
  });
  const endDrag = (ev) => {
    if (!view?.drag || !b) return;
    const [x, y] = R.toLogical(ev.clientX, ev.clientY);
    // tolérance : on vise la case sous le doigt, un peu au-dessus (le doigt cache la rune)
    let to = cellAt(x, y - 10); if (to < 0) to = cellAt(x, y);
    const from = view.drag.i;
    view.drag = null;
    if (to >= 0 && to !== from) {
      if (merge(b, from, to)) { if (tutorial?.step === 1) { tutorial.step = 2; tutorial.t = 0; } }
      else if (b.board[to]) sfx('error');
      handleEvents();
    }
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', () => { if (view) view.drag = null; });

  return {
    start, stop, setPaused, quit,
    get active() { return !!b; },
    get paused() { return paused; },
    get state() { return b; },
  };
}
