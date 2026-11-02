// Teste le classement en ligne et les règles de sécurité contre l'émulateur Firebase officiel.
// Lance : npx firebase-tools emulators:exec --only auth,firestore --project demo-rempart "node tests/classement.test.js"
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'www');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const p = path.normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^([/\\])+/, '');
  const f = path.join(ROOT, p || 'index.html');
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  let body = fs.readFileSync(f);
  // Active le classement avec un projet de démonstration (l'émulateur accepte n'importe quelle clé)
  if (p === 'js/config.js') body = String(body).replace("apiKey: ''", "apiKey: 'demo-cle'").replace("projectId: ''", "projectId: 'demo-rempart'").replace("authDomain: ''", "authDomain: 'demo-rempart.firebaseapp.com'").replace("appId: ''", "appId: 'demo'");
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
  res.end(body);
});

let failures = 0;
const ok = (cond, msg) => { console.log(`${cond ? '✅' : '❌'} ${msg}`); if (!cond) failures++; };
await new Promise((r) => server.listen(0, r));
const base = `http://localhost:${server.address().port}/`;
const browser = await chromium.launch();
const EMU = `window.__RR_EMULATEUR__ = { auth: 'http://127.0.0.1:9099', firestore: ['127.0.0.1', 8080] };`;

async function player() {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  await ctx.addInitScript(EMU);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => { console.log('Erreur page :', e.message); failures++; });
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__jeu?.S);
  return page;
}
const week = '2026-W45';
try {
  const a = await player(), b = await player();
  const lb = (page, code) => page.evaluate(new Function('week', `return import('./js/leaderboard.js').then(async (L) => { ${code} })`), week);

  ok(await lb(a, "return L.submitScore(week, 'Alice', 12, 300)") === true, 'Alice envoie son score');
  ok(await lb(b, "return L.submitScore(week, 'Bob', 15, 200)") === true, 'Bob envoie son score');
  ok(await lb(a, "return L.submitScore(week, 'Alice', 10, 999)") === false, 'un score moins bon est ignoré');
  const board = await lb(a, 'return L.fetchLeaderboard(week)');
  ok(board.total === 2, 'le classement compte 2 joueurs');
  ok(board.top[0].pseudo === 'Bob' && board.top[1].pseudo === 'Alice', 'le classement est trié par vague');
  ok(board.top[1].me && !board.top[0].me, 'le joueur se reconnaît dans le classement');
  ok(board.me.rank === 2, 'le rang du joueur est correct');

  // Règles de sécurité : tentatives de triche directes
  const attempt = (page, code) => page.evaluate(new Function('week', `return (async () => {
    const fsm = await import('./vendor/firebase/firebase-firestore.js');
    const appm = await import('./vendor/firebase/firebase-app.js');
    const authm = await import('./vendor/firebase/firebase-auth.js');
    const db = fsm.getFirestore(appm.getApp());
    const uid = authm.getAuth(appm.getApp()).currentUser.uid;
    const col = fsm.collection(db, 'defis', week, 'scores');
    try { ${code}; return 'accepté'; } catch (e) { return e.code || e.message; }
  })()`), week);
  const write = (who, data) => `await fsm.setDoc(fsm.doc(col, ${who}), { maj: fsm.serverTimestamp(), ...${JSON.stringify(data)} })`;
  ok(await attempt(a, write('uid', { pseudo: 'Alice', vague: 12, kills: 400, score: 1200400 })) === 'accepté', 'écrire son propre meilleur score : accepté');
  ok(await attempt(a, write("'quelqu-un-d-autre'", { pseudo: 'Pirate', vague: 99, kills: 0, score: 9900000 })) === 'permission-denied', 'écrire le score de quelqu\'un d\'autre : refusé');
  ok(await attempt(a, write('uid', { pseudo: 'Alice', vague: 1, kills: 0, score: 100000 })) === 'permission-denied', 'faire baisser son score : refusé');
  ok(await attempt(a, write('uid', { pseudo: 'Alice', vague: 50, kills: 0, score: 999 })) === 'permission-denied', 'score incohérent avec la vague : refusé');
  ok(await attempt(a, write('uid', { pseudo: 'Alice', vague: 5000, kills: 0, score: 500000000 })) === 'permission-denied', 'vague impossible : refusé');
  ok(await attempt(a, write('uid', { pseudo: 'A', vague: 13, kills: 0, score: 1300000 })) === 'permission-denied', 'pseudo trop court : refusé');
  ok(await attempt(a, write('uid', { pseudo: 'Alice', vague: 13, kills: 0, score: 1300000, admin: true })) === 'permission-denied', 'champ en trop : refusé');
  ok(await attempt(a, `await fsm.setDoc(fsm.doc(fsm.collection(db, 'defis', 'pirate', 'scores'), uid), { pseudo: 'Alice', vague: 13, kills: 0, score: 1300000, maj: fsm.serverTimestamp() })`) === 'permission-denied', 'semaine au mauvais format : refusé');
  ok(await attempt(a, `await fsm.setDoc(fsm.doc(db, 'autre', 'x'), { a: 1 })`) === 'permission-denied', 'écrire ailleurs dans la base : refusé');
  ok(await attempt(b, `await fsm.deleteDoc(fsm.doc(col, 'x'))`) === 'permission-denied', 'supprimer le score d\'un autre : refusé');
} catch (e) { console.error(e); failures++; }
await browser.close(); server.close();
console.log(failures ? `\n${failures} échec(s)` : '\nClassement et règles OK ✅');
process.exit(failures ? 1 : 0);
