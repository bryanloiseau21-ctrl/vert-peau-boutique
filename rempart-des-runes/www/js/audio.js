// Sons et musique synthétisés en direct (Web Audio) : aucun fichier à charger.
// + vibrations (Capacitor Haptics sur mobile, navigator.vibrate sinon).

let ctx = null, master = null, sfxBus = null, musicBus = null;
let settings = { sound: true, music: true, haptics: true };
let musicTimer = 0, musicStep = 0, musicOn = false;
const lastPlayed = {};

function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain(); master.gain.value = 0.8; master.connect(ctx.destination);
  const comp = ctx.createDynamicsCompressor(); comp.connect(master);
  sfxBus = ctx.createGain(); sfxBus.gain.value = settings.sound ? 0.55 : 0; sfxBus.connect(comp);
  musicBus = ctx.createGain(); musicBus.gain.value = settings.music ? 0.16 : 0; musicBus.connect(comp);
  return ctx;
}
/** À appeler sur un geste de l'utilisateur (obligatoire sur iOS pour activer le son). */
export function unlockAudio() {
  const c = ensure();
  if (c && c.state === 'suspended') c.resume();
}
export function applySettings(s) {
  settings = { ...settings, ...s };
  if (!ctx) return;
  sfxBus.gain.setTargetAtTime(settings.sound ? 0.55 : 0, ctx.currentTime, 0.02);
  musicBus.gain.setTargetAtTime(settings.music ? 0.16 : 0, ctx.currentTime, 0.05);
}
export function suspendAudio(on) {
  if (!ctx) return;
  if (on) ctx.suspend(); else ctx.resume();
}

function tone({ f = 440, f2 = null, type = 'sine', t = 0.12, vol = 0.4, delay = 0, bus = sfxBus, attack = 0.005 }) {
  if (!ctx || !bus) return;
  const now = ctx.currentTime + delay;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, now);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, now + t);
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(vol, now + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, now + t);
  o.connect(g); g.connect(bus);
  o.start(now); o.stop(now + t + 0.02);
}
function noise({ t = 0.2, vol = 0.3, freq = 1200, delay = 0 }) {
  if (!ctx) return;
  const now = ctx.currentTime + delay;
  const len = Math.floor(ctx.sampleRate * t);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource(); src.buffer = buf;
  const flt = ctx.createBiquadFilter(); flt.type = 'lowpass'; flt.frequency.value = freq;
  const g = ctx.createGain(); g.gain.value = vol;
  src.connect(flt); flt.connect(g); g.connect(sfxBus);
  src.start(now);
}

const SOUNDS = {
  click:   () => tone({ f: 660, t: 0.05, type: 'triangle', vol: 0.25 }),
  summon:  () => { tone({ f: 330, f2: 880, t: 0.16, type: 'triangle', vol: 0.35 }); tone({ f: 1320, t: 0.08, delay: 0.1, vol: 0.15 }); },
  merge:   (pip = 2) => { const b = 392 * Math.pow(1.122, pip); [0, 4, 7, 12].forEach((s, i) => tone({ f: b * Math.pow(2, s / 12), t: 0.18, type: 'triangle', vol: 0.28, delay: i * 0.05 })); },
  power:   () => [0, 7, 12, 19].forEach((s, i) => tone({ f: 523 * Math.pow(2, s / 12), t: 0.14, type: 'square', vol: 0.12, delay: i * 0.04 })),
  shoot:   () => tone({ f: 900 + Math.random() * 300, f2: 500, t: 0.05, type: 'square', vol: 0.04 }),
  kill:    () => tone({ f: 520 + Math.random() * 120, f2: 180, t: 0.09, type: 'triangle', vol: 0.16 }),
  splash:  () => noise({ t: 0.18, vol: 0.18, freq: 900 }),
  zap:     () => tone({ f: 1800, f2: 300, t: 0.08, type: 'sawtooth', vol: 0.08 }),
  reap:    () => { tone({ f: 200, f2: 60, t: 0.35, type: 'sawtooth', vol: 0.2 }); noise({ t: 0.3, vol: 0.15, freq: 500 }); },
  leak:    () => { tone({ f: 140, f2: 60, t: 0.35, type: 'sawtooth', vol: 0.35 }); noise({ t: 0.25, vol: 0.25, freq: 300 }); },
  wave:    () => [0, 5, 9].forEach((s, i) => tone({ f: 440 * Math.pow(2, s / 12), t: 0.22, type: 'triangle', vol: 0.2, delay: i * 0.09 })),
  boss:    () => { tone({ f: 110, t: 0.9, type: 'sawtooth', vol: 0.3, attack: 0.08 }); tone({ f: 104, t: 0.9, type: 'sawtooth', vol: 0.25, attack: 0.08 }); tone({ f: 82, t: 1.2, type: 'sine', vol: 0.35, delay: 0.5, attack: 0.1 }); },
  bossKill:() => { noise({ t: 0.6, vol: 0.35, freq: 700 }); [0, 4, 7, 12, 16].forEach((s, i) => tone({ f: 392 * Math.pow(2, s / 12), t: 0.3, type: 'triangle', vol: 0.25, delay: 0.15 + i * 0.08 })); },
  ability: () => tone({ f: 300, f2: 900, t: 0.3, type: 'sawtooth', vol: 0.12 }),
  coins:   () => [0, 1, 2, 3, 4].forEach((i) => tone({ f: 1400 + i * 180, t: 0.07, type: 'square', vol: 0.08, delay: i * 0.05 })),
  chest:   () => { noise({ t: 0.25, vol: 0.2, freq: 2500 }); [0, 4, 7, 11, 14].forEach((s, i) => tone({ f: 523 * Math.pow(2, s / 12), t: 0.35, type: 'triangle', vol: 0.2, delay: 0.15 + i * 0.07 })); },
  purchase:() => [0, 4, 7, 12, 16, 19].forEach((s, i) => tone({ f: 523 * Math.pow(2, s / 12), t: 0.3, type: 'triangle', vol: 0.22, delay: i * 0.06 })),
  defeat:  () => [7, 3, 0, -5].forEach((s, i) => tone({ f: 330 * Math.pow(2, s / 12), t: 0.4, type: 'triangle', vol: 0.25, delay: i * 0.18 })),
  victory: () => [0, 4, 7, 12, 7, 12, 16].forEach((s, i) => tone({ f: 392 * Math.pow(2, s / 12), t: 0.25, type: 'triangle', vol: 0.22, delay: i * 0.1 })),
  error:   () => tone({ f: 200, f2: 150, t: 0.12, type: 'square', vol: 0.12 }),
};
// Limite de répétition (évite la cacophonie quand 15 runes tirent en même temps)
const MIN_GAP = { shoot: 0.06, kill: 0.04, splash: 0.08, zap: 0.07 };

export function sfx(name, arg) {
  if (!settings.sound || !ensure() || ctx.state !== 'running') return;
  const gap = MIN_GAP[name];
  if (gap) { if (ctx.currentTime - (lastPlayed[name] || 0) < gap) return; lastPlayed[name] = ctx.currentTime; }
  SOUNDS[name]?.(arg);
}

/* ---------- Musique : petite boucle d'arpèges procédurale ---------- */
const PROG = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]];   // Lam – Fa – Do – Sol
const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
function musicTick() {
  if (!musicOn || !ctx) return;
  const bar = Math.floor(musicStep / 8) % PROG.length, s = musicStep % 8, chord = PROG[bar];
  if (settings.music && ctx.state === 'running') {
    if (s === 0) tone({ f: midi(chord[0] - 24), t: 1.6, type: 'triangle', vol: 0.5, bus: musicBus, attack: 0.02 });
    const pattern = [0, 1, 2, 1, 0, 2, 1, 2];
    tone({ f: midi(chord[pattern[s]] + (s >= 4 ? 12 : 0)), t: 0.22, type: 'sine', vol: 0.35, bus: musicBus });
  }
  musicStep++;
}
export function startMusic() {
  if (musicOn) return;
  musicOn = true; musicStep = 0;
  musicTimer = setInterval(musicTick, 210);
}
export function stopMusic() { musicOn = false; clearInterval(musicTimer); }

/* ---------- Vibrations ---------- */
export function haptic(kind = 'light') {
  if (!settings.haptics) return;
  const H = window.Capacitor?.isNativePlatform?.() && window.Capacitor.Plugins?.Haptics;
  if (H) {
    if (kind === 'error') H.notification({ type: 'ERROR' }).catch(() => {});
    else if (kind === 'success') H.notification({ type: 'SUCCESS' }).catch(() => {});
    else H.impact({ style: kind === 'heavy' ? 'HEAVY' : kind === 'medium' ? 'MEDIUM' : 'LIGHT' }).catch(() => {});
  } else if (navigator.vibrate) {
    navigator.vibrate(kind === 'heavy' || kind === 'error' ? 60 : kind === 'medium' ? 25 : 10);
  }
}
