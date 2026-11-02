// Test de bout en bout dans un vrai navigateur (format iPhone) : menus, boutique, coffres, deck et une vraie partie.
// Lance : node tests/ui.test.js
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, devices } from 'playwright';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'www');
const OUT = process.env.CAPTURES || '';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((req, res) => {
  const p = path.normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^([/\\])+/, '');
  const f = path.join(ROOT, p || 'index.html');
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});

let failures = 0;
const ok = (cond, msg) => { console.log(`${cond ? '✅' : '❌'} ${msg}`); if (!cond) failures++; };
const snap = async (page, name) => { if (OUT) await page.screenshot({ path: path.join(OUT, `${name}.png`) }); };

await new Promise((r) => server.listen(0, r));
const base = `http://localhost:${server.address().port}/`;
const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices['iPhone 13'], reducedMotion: 'reduce' });
const page = await ctx.newPage();
const errors = [], external = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('request', (r) => { if (!r.url().startsWith(base) && !r.url().startsWith('data:')) external.push(r.url()); });

try {
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__jeu?.S);
  ok(await page.locator('#hArena').innerText().then((t) => t.includes('Plaine des Novices')), "l'accueil affiche l'arène de départ");
  ok(await page.locator('#hDeck .card').count() === 5, 'le deck de 5 runes est affiché');
  await snap(page, 'accueil');

  // Cadeau du jour
  ok(await page.locator('#hDaily').isVisible(), 'le cadeau du jour est proposé');
  const coins0 = await page.evaluate(() => __jeu.S.coins);
  await page.click('#hDaily'); await page.click('[data-m="yes"]');
  ok(await page.evaluate(() => __jeu.S.coins) === coins0 + 100, 'le cadeau du jour donne 100 pièces');
  ok(await page.locator('#hDaily').isHidden(), "le cadeau n'est plus proposé après l'avoir pris");

  // Boutique : achat simulé de gemmes
  await page.click('.nav [data-tab="shop"]');
  ok(await page.locator('#demoNote').isVisible(), 'la boutique web signale clairement le mode démo');
  const gems0 = await page.evaluate(() => __jeu.S.gems);
  await page.click('[data-action="buy"][data-id="gems_80"]');
  await snap(page, 'achat');
  await page.click('[data-m="yes"]'); await page.click('[data-m="yes"]');
  ok(await page.evaluate(() => __jeu.S.gems) === gems0 + 80, "l'achat de 80 gemmes est crédité");
  await page.click('[data-action="buy"][data-id="gems_80"]'); await page.click('[data-m="no"]');
  ok(await page.evaluate(() => __jeu.S.gems) === gems0 + 80, "annuler un achat ne crédite rien");
  // Achat unique
  await page.click('[data-action="buy"][data-id="starter"]'); await page.click('[data-m="yes"]'); await page.click('[data-m="yes"]');
  ok(await page.evaluate(() => __jeu.S.cards.faucheur.owned && __jeu.S.owned.includes('starter')), 'le pack de départ débloque le Faucheur');
  ok(await page.locator('[data-action="buy"][data-id="starter"]').isDisabled(), 'le pack de départ ne peut pas être racheté');
  await snap(page, 'boutique');
  // Pièces contre gemmes
  const c1 = await page.evaluate(() => __jeu.S.coins);
  await page.click('[data-action="buygem"][data-id="coins_1k"]');
  ok(await page.evaluate(() => __jeu.S.coins) === c1 + 1000, "l'échange gemmes → pièces fonctionne");

  // Coffres
  await page.click('.nav [data-tab="chest"]');
  await page.click('[data-action="chest"][data-free="1"]');
  ok(await page.locator('.reveal div').count() >= 2, 'le coffre gratuit révèle des cartes');
  await snap(page, 'coffre');
  await page.click('[data-m="yes"]');
  ok(await page.locator('[data-action="chest"][data-free="1"]').isDisabled(), 'le coffre gratuit attend ensuite 4 h');

  // Deck : équiper le Faucheur dans l'emplacement 5
  await page.click('.nav [data-tab="deck"]');
  await page.click('#dDeck [data-i="4"]');
  await page.click('[data-action="equip"][data-k="faucheur"]');
  ok(await page.evaluate(() => __jeu.S.deck[4]) === 'faucheur', 'une rune peut être équipée dans le deck');
  await page.click('#dColl [data-k="braise"] .ic');
  ok(await page.locator('#mbox h2').innerText() === 'Braise', 'la fiche détaillée d\'une rune s\'ouvre');
  await snap(page, 'deck');
  await page.click('[data-m="close"]');

  // Sauvegarde : rechargement
  await page.waitForTimeout(600);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__jeu?.S);
  ok(await page.evaluate(() => __jeu.S.deck[4] === 'faucheur' && __jeu.S.owned.includes('starter')), 'la progression est conservée après rechargement');

  // Partie
  await page.click('[data-action="play"]');
  ok(await page.locator('#battle').isVisible(), 'la partie démarre');
  const box = await page.locator('#cv').boundingBox();
  const sc = box.width / 360;
  const tap = (x, y) => page.mouse.click(box.x + x * sc, box.y + y * sc);
  // 100 de mana au départ : 10 + 20 + 30 + 40 → 4 invocations, la 5e est refusée
  for (let i = 0; i < 5; i++) await tap(180, 544);
  ok(await page.evaluate(() => __jeu.battle.state.board.filter(Boolean).length) === 4, 'le bouton Invoquer place des runes (et refuse sans mana)');
  // Fusion par glisser-déposer
  const pair = await page.evaluate(async () => {
    const { cellCenter } = await import('./js/engine.js');
    const b = __jeu.battle.state.board;
    for (let i = 0; i < 15; i++) for (let j = 0; j < 15; j++)
      if (i !== j && b[i] && b[j] && b[i].k === b[j].k && b[i].pip === b[j].pip) return [cellCenter(i), cellCenter(j)];
    return null;
  });
  if (pair) {
    await page.mouse.move(box.x + pair[0][0] * sc, box.y + pair[0][1] * sc);
    await page.mouse.down();
    await page.mouse.move(box.x + pair[1][0] * sc, box.y + pair[1][1] * sc, { steps: 6 });
    await page.mouse.up();
    ok(await page.evaluate(() => __jeu.battle.state.board.some((u) => u && u.pip === 2)), 'glisser une rune sur sa jumelle les fusionne');
  } else ok(true, 'pas de paire à fusionner sur ce tirage (fusion testée dans les tests de logique)');
  await page.waitForTimeout(6000);
  ok(await page.evaluate(() => __jeu.battle.state.kills > 0), 'les runes éliminent des ennemis');
  await snap(page, 'combat');
  // Pause puis abandon → récompenses
  await tap(36, 30);
  ok(await page.locator('#mbox h2').innerText() === 'Pause', 'le menu pause s\'ouvre');
  await page.click('[data-m="quit"]');
  await page.waitForSelector('[data-m="again"]');
  ok(await page.evaluate(() => __jeu.S.games) === 1, 'la partie est comptée et les récompenses données');
  await snap(page, 'resultats');
  await page.click('[data-m="home"]');
  ok(await page.locator('#battle').isHidden(), "retour à l'accueil après la partie");

  // Réglages
  await page.click('[data-action="settings"]');
  await page.click('[data-s="music"]');
  ok(await page.evaluate(() => __jeu.S.settings.music === false), 'la musique peut être coupée');
  await page.click('[data-m="close"]');

  ok(errors.length === 0, `aucune erreur JavaScript${errors.length ? ' : ' + errors.join(' | ') : ''}`);
  ok(external.length === 0, `aucun appel à un serveur extérieur${external.length ? ' : ' + external.join(', ') : ''}`);
} catch (e) {
  console.error(e);
  failures++;
} finally {
  await browser.close();
  server.close();
}
console.log(failures ? `\n${failures} échec(s)` : '\nTout est bon ✅');
process.exit(failures ? 1 : 0);
