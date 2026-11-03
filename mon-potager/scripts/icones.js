// Génère les icônes PNG (web + sources pour Android/iOS) à partir de www/icons/icon.svg.
// Lance : npm run icones   puis   npm run assets   (pour les tailles natives)
import { chromium } from 'playwright';
import { readFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const svg = readFileSync(path.join(root, 'www/icons/icon.svg'), 'utf8');
// Les stores veulent une icône carrée pleine : on retire l'arrondi du fond
const carre = svg.replace(/ rx="\d+"/, '');
const b64 = (s) => Buffer.from(s).toString('base64');
mkdirSync(path.join(root, 'assets'), { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage();
async function shot(file, size, { splash = false, fond = '#eafbe7' } = {}) {
  await page.setViewportSize({ width: size, height: size });
  const icon = splash ? Math.round(size * 0.28) : size;
  await page.setContent(`<html><body style="margin:0;width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;background:${fond}">
    <img src="data:image/svg+xml;base64,${b64(splash ? svg : carre)}" style="width:${icon}px;height:${icon}px"></body></html>`);
  await page.waitForTimeout(100);
  await page.screenshot({ path: path.join(root, file) });
  console.log('✓', file);
}
await shot('www/icons/icon-192.png', 192);
await shot('www/icons/icon-512.png', 512);
await shot('www/icons/icon-1024.png', 1024);
await shot('www/icons/apple-touch-icon.png', 180);
await shot('assets/icon-only.png', 1024);
await shot('assets/splash.png', 2732, { splash: true, fond: '#eafbe7' });
await shot('assets/splash-dark.png', 2732, { splash: true, fond: '#13241a' });
await browser.close();
