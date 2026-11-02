// Copie les modules Firebase (version figée par package-lock) dans www/vendor/firebase,
// pour que le jeu ne charge aucun script depuis un serveur externe.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'node_modules', 'firebase');
const dst = path.join(root, 'www', 'vendor', 'firebase');
const { version } = JSON.parse(fs.readFileSync(path.join(src, 'package.json'), 'utf8'));
fs.mkdirSync(dst, { recursive: true });
for (const f of ['firebase-app.js', 'firebase-auth.js', 'firebase-firestore.js']) {
  let code = fs.readFileSync(path.join(src, f), 'utf8');
  code = code.replace(/https:\/\/www\.gstatic\.com\/firebasejs\/[\d.]+\/(firebase-[a-z]+\.js)/g, './$1')
             .replace(/\/\/# sourceMappingURL=.*$/m, '');
  if (/gstatic\.com\/firebasejs/.test(code)) throw new Error(`Import externe restant dans ${f}`);
  fs.writeFileSync(path.join(dst, f), `/* Firebase JS SDK ${version} – Apache-2.0 */\n${code}`);
}
fs.writeFileSync(path.join(dst, 'LICENSE.txt'), `Firebase JS SDK ${version} – Copyright Google LLC – Apache License 2.0 – https://github.com/firebase/firebase-js-sdk/blob/main/LICENSE\n`);
console.log(`✅ Firebase ${version} copié dans www/vendor/firebase`);
