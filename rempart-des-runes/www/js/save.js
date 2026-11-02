// Sauvegarde du joueur.
// Appli native : Capacitor Preferences (stockage natif, non effacé par le système).
// Navigateur : localStorage. Les écritures sont groupées pour ne pas ralentir le jeu.
import { migrate } from './meta.js';

const KEY = 'rempart-des-runes';
const OLD_KEYS = ['rempart-des-runes-v1'];
const prefs = () => (window.Capacitor?.isNativePlatform?.() ? window.Capacitor.Plugins?.Preferences : null);

async function readRaw(key) {
  const p = prefs();
  if (p) { const { value } = await p.get({ key }); return value; }
  try { return localStorage.getItem(key); } catch { return null; }
}

export async function loadState() {
  for (const key of [KEY, ...OLD_KEYS]) {
    try {
      const raw = await readRaw(key);
      if (raw) return migrate(JSON.parse(raw));
    } catch (e) { console.warn('Sauvegarde illisible', key, e); }
  }
  return migrate(null);
}

let timer = 0, pending = null;
async function flush() {
  clearTimeout(timer); timer = 0;
  if (!pending) return;
  const value = JSON.stringify(pending);
  pending = null;
  const p = prefs();
  try {
    if (p) await p.set({ key: KEY, value });
    else localStorage.setItem(KEY, value);
  } catch (e) { console.warn('Sauvegarde impossible', e); }
}
/** Demande une sauvegarde (regroupée). `now` = écrire immédiatement (achat, fin de partie). */
export function saveState(S, { now = false } = {}) {
  pending = S;
  if (now) return flush();
  if (!timer) timer = setTimeout(flush, 400);
}
export const flushSave = flush;

export async function resetState() {
  pending = null; clearTimeout(timer);
  const p = prefs();
  if (p) await p.remove({ key: KEY });
  try { localStorage.removeItem(KEY); OLD_KEYS.forEach((k) => localStorage.removeItem(k)); } catch {}
}
