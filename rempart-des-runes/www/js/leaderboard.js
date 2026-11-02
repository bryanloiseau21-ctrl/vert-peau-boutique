// Classement en ligne du défi de la semaine (Firebase : connexion anonyme + Firestore).
// Sans configuration Firebase (config.js), le jeu marche quand même : le classement affiche
// seulement le score du joueur.
// Données envoyées : pseudo, vague, ennemis vaincus. Rien d'autre (voir confidentialite.html).
import { CONFIG } from './config.js';
import { challengeScore } from './meta.js';

let fb = null, loading = null;
export const leaderboardEnabled = () => !!CONFIG.FIREBASE?.apiKey;

async function init() {
  if (fb) return fb;
  if (!leaderboardEnabled()) throw new Error('Classement non configuré');
  loading ??= (async () => {
    const [app, auth, fs] = await Promise.all([
      import('../vendor/firebase/firebase-app.js'),
      import('../vendor/firebase/firebase-auth.js'),
      import('../vendor/firebase/firebase-firestore.js'),
    ]);
    const a = app.initializeApp(CONFIG.FIREBASE);
    const native = !!window.Capacitor?.isNativePlatform?.();
    const au = native ? auth.initializeAuth(a, { persistence: auth.indexedDBLocalPersistence }) : auth.getAuth(a);
    const emu = window.__RR_EMULATEUR__;   // tests automatiques uniquement (émulateur Firebase local)
    if (emu) { auth.connectAuthEmulator(au, emu.auth, { disableWarnings: true }); fs.connectFirestoreEmulator(fs.getFirestore(a), ...emu.firestore); }
    if (!au.currentUser) {
      await new Promise((r) => { const off = auth.onAuthStateChanged(au, () => { off(); r(); }); });
    }
    if (!au.currentUser) await auth.signInAnonymously(au);
    fb = { fs, db: fs.getFirestore(a), uid: au.currentUser.uid };
    return fb;
  })().catch((e) => { loading = null; throw e; });
  return loading;
}

const scoresOf = (f, week) => f.fs.collection(f.db, 'defis', week, 'scores');

/** Envoie le meilleur score de la semaine (ignoré par le serveur s'il n'est pas meilleur). */
export async function submitScore(week, pseudo, wave, kills) {
  const f = await init();
  const ref = f.fs.doc(scoresOf(f, week), f.uid);
  const score = challengeScore(wave, kills);
  const old = await f.fs.getDoc(ref);
  if (old.exists() && old.data().score >= score && old.data().pseudo === pseudo) return false;
  const best = old.exists() && old.data().score > score ? old.data() : { vague: wave, kills, score };
  await f.fs.setDoc(ref, { pseudo, vague: best.vague, kills: best.kills, score: best.score, maj: f.fs.serverTimestamp() });
  return true;
}

/** Top du classement + rang du joueur. */
export async function fetchLeaderboard(week, n = 50) {
  const f = await init();
  const col = scoresOf(f, week);
  const snap = await f.fs.getDocs(f.fs.query(col, f.fs.orderBy('score', 'desc'), f.fs.limit(n)));
  const top = snap.docs.map((d, i) => ({ rank: i + 1, pseudo: d.data().pseudo, wave: d.data().vague, kills: d.data().kills, me: d.id === f.uid }));
  let me = top.find((r) => r.me) || null;
  if (!me) {
    const mine = await f.fs.getDoc(f.fs.doc(col, f.uid));
    if (mine.exists()) {
      const above = await f.fs.getCountFromServer(f.fs.query(col, f.fs.where('score', '>', mine.data().score)));
      me = { rank: above.data().count + 1, pseudo: mine.data().pseudo, wave: mine.data().vague, kills: mine.data().kills, me: true };
    }
  }
  const total = (await f.fs.getCountFromServer(col)).data().count;
  return { top, me, total };
}
