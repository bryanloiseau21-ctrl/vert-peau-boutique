// Génère les captures d'écran pour l'App Store (iPhone 6,9") et le Play Store, avec un potager de démo.
// Lance : npm run captures
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const WWW = path.join(RACINE, 'www');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
const srv = http.createServer((q, r) => {
  const f = path.join(WWW, path.normalize(new URL(q.url, 'http://x').pathname).replace(/^[/\\]+/, '') || 'index.html');
  if (!f.startsWith(WWW) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
});
const FORMATS = [
  { dossier: 'captures-iphone', viewport: { width: 440, height: 956 }, scale: 3 }, // 1320 × 2868
  { dossier: 'captures-android', viewport: { width: 360, height: 800 }, scale: 3 }, // 1080 × 2400
];

// Plantations de démo (dates relatives à aujourd'hui pour avoir des jauges variées)
const ilYa = (j) => { const d = new Date(Date.now() - j * 864e5); return d.toISOString().slice(0, 10); };
const DEMO = [
  ['tomate', 120, 0.22, 0.25, 4, 'Cœur de bœuf'], ['basilic', 100, 0.34, 0.3, 3, ''], ['courgette', 90, 0.72, 0.28, 2, ''],
  ['salade', 30, 0.5, 0.55, 8, 'Feuille de chêne'], ['carotte', 60, 0.25, 0.72, 20, ''], ['fraisier', 200, 0.78, 0.72, 6, ''],
  ['tournesol', 70, 0.9, 0.12, 3, ''], ['oeillet', 80, 0.12, 0.45, 5, ''], ['ail', 5, 0.55, 0.85, 30, ''],
];

(async () => {
  await new Promise((r) => srv.listen(0, r));
  const base = `http://localhost:${srv.address().port}/`;
  const nav = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  for (const f of FORMATS) {
    fs.mkdirSync(path.join(RACINE, 'store', f.dossier), { recursive: true });
    const ctx = await nav.newContext({ viewport: f.viewport, deviceScaleFactor: f.scale, isMobile: true, hasTouch: true, locale: 'fr-FR', timezoneId: 'Europe/Paris' });
    await ctx.route(/open-meteo\.com/, (route) => {
      const u = route.request().url();
      if (u.includes('elevation')) return route.fulfill({ json: { elevation: [60] } });
      const jours = [...Array(7)].map((_, i) => new Date(Date.now() + i * 864e5).toISOString().slice(0, 10));
      return route.fulfill({ json: { daily: { time: jours, weather_code: [0, 1, 2, 61, 3, 0, 0],
        temperature_2m_max: [16, 17, 15, 13, 14, 16, 18], temperature_2m_min: [6, 7, 5, 0, 4, 6, 8], precipitation_sum: [0, 0, 0, 6, 1, 0, 0] } } });
    });
    const p = await ctx.newPage();
    const out = (n) => path.join(RACINE, 'store', f.dossier, n);
    await p.goto(base); await p.waitForSelector('body.pret');
    await p.addStyleTag({ content: '.astuce,.toasts,.confetti{display:none!important}' });

    // Photo de démo : un potager dessiné (rangs de légumes, paillage, allée) entouré de pelouse
    const png = await p.evaluate(() => {
      const c = document.createElement('canvas'); c.width = 1600; c.height = 1200;
      const g = c.getContext('2d');
      let s = 5; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
      g.fillStyle = '#4f9d3a'; g.fillRect(0, 0, 1600, 1200);
      for (let i = 0; i < 4000; i++) { g.fillStyle = r() < 0.5 ? '#5aab44' : '#3f8a30'; g.fillRect(r() * 1600, r() * 1200, 3, 8); }
      g.fillStyle = '#6e4428'; g.beginPath(); g.moveTo(260, 230); g.lineTo(1350, 210); g.lineTo(1450, 1010); g.lineTo(170, 1030); g.fill();
      for (let i = 0; i < 9000; i++) { g.fillStyle = r() < 0.5 ? '#5a361f' : '#8a5a36'; g.fillRect(260 + r() * 1150, 230 + r() * 790, 4, 4); }
      const plante = (x, y, rayon, coul, fruit) => {
        for (let k = 0; k < 9; k++) { g.fillStyle = coul[k % coul.length]; g.beginPath(); g.ellipse(x + (r() - 0.5) * rayon, y + (r() - 0.5) * rayon, rayon * 0.45, rayon * 0.3, r() * 3, 0, 7); g.fill(); }
        if (fruit) for (let k = 0; k < 4; k++) { g.fillStyle = fruit; g.beginPath(); g.arc(x + (r() - 0.5) * rayon, y + (r() - 0.5) * rayon, rayon * 0.12, 0, 7); g.fill(); }
      };
      for (let x = 340; x < 1300; x += 95) plante(x, 330, 70, ['#2f7d32', '#3d9a3f', '#58b84a'], x % 2 ? '#e53935' : '#ff7043');
      for (let x = 340; x < 1320; x += 70) plante(x, 560, 50, ['#7cc843', '#a5dc5a', '#5fae3a']);
      for (let x = 330; x < 1340; x += 40) plante(x, 760, 22, ['#3f9b3a', '#6cc04c']);
      for (let x = 330; x < 1360; x += 85) plante(x, 920, 55, ['#2e7d32', '#43a047'], x % 3 ? '#e91e63' : null);
      return c.toDataURL('image/jpeg', 0.9).split(',')[1];
    });
    const [choix] = await Promise.all([p.waitForEvent('filechooser'), p.click('#accueil [data-act="photo"]')]);
    await choix.setFiles({ name: 'potager.jpg', mimeType: 'image/jpeg', buffer: Buffer.from(png, 'base64') });
    await p.waitForSelector('.detourage');
    await p.evaluate(() => { document.querySelector('.detourage [name=largeur]').value = '5'; document.querySelector('.detourage [name=longueur]').value = '3.5'; });
    await p.waitForTimeout(300);
    await p.screenshot({ path: out('5-detourage.png') });
    // place les coins sur le potager dessiné
    const cadre = await p.locator('.detourage-cadre').boundingBox();
    const coins = [[260, 230], [1350, 210], [1450, 1010], [170, 1030]];
    for (let i = 0; i < 4; i++) {
      const b = await p.locator(`.poignee[data-i="${i}"] circle`).nth(1).boundingBox();
      await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await p.mouse.down();
      await p.mouse.move(cadre.x + (coins[i][0] / 1600) * cadre.width, cadre.y + (coins[i][1] / 1200) * cadre.height, { steps: 4 }); await p.mouse.up();
    }
    await p.click('.detourage [data-act="valider"]');
    await p.waitForSelector('.detourage', { state: 'detached' });
    await p.waitForFunction(() => document.querySelector('#plan-img')?.getAttribute('src'));
    await p.waitForTimeout(500);

    // Plantations et région de démo, écrites directement dans la sauvegarde
    await p.evaluate(async (demo) => {
      const e = window.monPotager.etat;
      e.plantations = demo.map(([plante, j, x, y, qte, note], i) => ({ id: `demo${i}`, plante, date: new Date(Date.now() - j * 864e5).toISOString().slice(0, 10), qte, note, x, y }));
      e.lieu = { nom: 'Nantes', lat: 47.218, lon: -1.554, altitude: 20 }; e.zone = 'oceanique'; e.hemisphere = 'nord'; e.nom = 'Mon beau potager';
      await new Promise((ok) => { const rq = indexedDB.open('mon-potager', 1); rq.onsuccess = () => { const tx = rq.result.transaction('donnees', 'readwrite'); tx.objectStore('donnees').put(JSON.parse(JSON.stringify(e)), 'etat'); tx.oncomplete = ok; }; });
    }, DEMO);
    await p.reload(); await p.waitForSelector('body.pret');
    await p.addStyleTag({ content: '.astuce,.toasts,.confetti{display:none!important}' });
    await p.waitForTimeout(1200);
    await p.screenshot({ path: out('1-visuel-3d.png') });
    await p.click('[data-act="fond"]'); await p.waitForTimeout(800);
    await p.locator('#scene canvas').hover();
    await p.screenshot({ path: out('2-coucher-de-soleil.png') });
    await p.click('[data-act="fond"]'); await p.click('[data-act="fond"]'); await p.click('[data-act="fond"]');

    await p.click('.onglet[data-vue="potager"]'); await p.waitForTimeout(400);
    await p.screenshot({ path: out('3-mon-potager.png') });
    await p.click('.ligne[data-id="demo0"]'); await p.waitForTimeout(500);
    await p.screenshot({ path: out('4-fiche-tomate.png') });
    await p.click('#feuille [data-act="fermer"]'); await p.waitForTimeout(400);

    await p.click('.onglet[data-vue="conseils"]'); await p.waitForSelector('#carte-meteo:not([hidden])'); await p.waitForTimeout(300);
    await p.screenshot({ path: out('6-conseils.png') });
    await p.locator('#vue-conseils .contenu').evaluate((el) => { el.scrollTop = el.querySelector('#recos').offsetTop - 90; });
    await p.waitForTimeout(200);
    await p.screenshot({ path: out('7-quoi-planter.png') });
    await ctx.close();
    console.log('✓', f.dossier);
  }
  await nav.close(); srv.close();
})();
