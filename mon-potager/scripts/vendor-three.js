// Copie Three.js (moteur 3D) dans www/vendor pour que l'appli marche hors connexion et dans Capacitor.
// Lance : npm run vendor
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(racine, 'node_modules', 'three');
const dest = path.join(racine, 'www', 'vendor');
fs.mkdirSync(dest, { recursive: true });
const fichiers = {
  'build/three.module.min.js': 'three.module.min.js',
  'build/three.core.min.js': 'three.core.min.js',
  'examples/jsm/controls/OrbitControls.js': 'OrbitControls.js',
};
for (const [de, vers] of Object.entries(fichiers)) {
  fs.copyFileSync(path.join(src, de), path.join(dest, vers));
  console.log(`✔ ${vers}`);
}
