// Parcours complet dans Chromium au format iPhone : profil → état du jour → séance → débriefing → progrès.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');
const racine = join(dirname(fileURLToPath(import.meta.url)), '..', 'www');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };

const serveur = createServer(async (req, res) => {
  try {
    const chemin = join(racine, decodeURIComponent(new URL(req.url, 'http://x').pathname.replace(/\/$/, '/index.html')));
    res.writeHead(200, { 'content-type': types[extname(chemin)] || 'application/octet-stream' });
    res.end(await readFile(chemin));
  } catch { res.writeHead(404); res.end(); }
}).listen(0);
const url = `http://localhost:${serveur.address().port}/`;

const navigateur = await chromium.launch();
const page = await navigateur.newPage({ ...devices['iPhone 13'] });
const erreurs = [];
page.on('pageerror', e => erreurs.push(e.message));
await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
const clic = sel => page.locator(sel).first().click();

try {
  await page.goto(url);
  await clic('text=Créer mon profil');
  await page.fill('#prenom', 'Jordan');
  await clic('[data-c="objectif"][data-v="muscle"]');
  await clic('[data-c="materiel"][data-v="halteres"]');
  await clic('[data-c="zones"][data-v="genoux"]');
  await clic('[data-c="ton"][data-v="cash"]');
  await clic('text=Activer mon coach');
  await page.waitForSelector('text=Comment tu te sens ?');
  assert.match(await page.textContent('.voix'), /Jordan/);

  await clic('[data-c="energie"][data-v="5"]');
  await clic('[data-c="sommeil"][data-v="5"]');
  await clic('[data-c="duree"][data-v="20"]');
  await clic('text=Préparer ma séance');
  await page.waitForSelector('text=Pourquoi cette séance');
  const avant = await page.textContent('.liste h3');
  await clic('[data-a="remplacer"]');
  assert.notEqual(await page.textContent('.liste h3'), avant, 'l’exercice est remplacé');
  const texte = await page.textContent('#app');
  assert.ok(!/Squat|Fentes/.test(texte), 'genoux protégés');

  await clic('text=Lancer la séance');
  // Échauffement : on passe les étapes de mobilité, puis on valide toutes les séries.
  for (let i = 0; i < 60; i++) {
    if (await page.locator('text=Comment c’était ?').count()) break;
    if (await page.locator('[data-a="finRepos"]').count()) { await clic('[data-a="finRepos"]'); continue; }
    if (await page.locator('[data-a="chronoSerie"]').count()) {
      await clic('[data-a="chronoSerie"]'); await page.waitForTimeout(250); await clic('[data-a="stopChrono"]');
      await clic('[data-a="saisie"][data-v="1"]');
    } else if (await page.locator('[data-a="validerSerie"]').count()) {
      await clic('[data-a="saisie"][data-v="1"]'); await clic('[data-a="saisie"][data-v="1"]');
    }
    if (await page.locator('[data-a="validerSerie"]').count()) await clic('[data-a="validerSerie"]');
    else await clic('[data-a="suivant"]');
  }
  await page.waitForSelector('text=Comment c’était ?');
  await clic('[data-a="ressenti"][data-v="1"]');
  await clic('text=Enregistrer');
  await page.waitForSelector('text=Ce que Veilleur a ajusté');
  assert.ok(await page.locator('.chgt').count() > 0, 'le coach annonce ses ajustements');

  await clic('text=Retour au QG');
  assert.match(await page.textContent('.scores'), /1\/3/);
  await page.reload();
  await page.waitForSelector('text=Comment tu te sens ?');
  await clic('[data-v="progres"]');
  await page.waitForSelector('text=Tes progressions');
  assert.equal(await page.locator('.niveau').count() > 0, true);
  const largeur = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert.ok(largeur <= 0, 'pas de défilement horizontal');
  await page.screenshot({ path: process.env.CAPTURE || '/dev/null' }).catch(() => {});

  await clic('[data-v="reglages"]');
  await clic('text=Effacer mes données');
  await clic('[data-a="reset"]');
  await page.waitForSelector('text=Essayer avec un profil exemple');
  await clic('text=Essayer avec un profil exemple');
  await page.waitForSelector('text=Comment tu te sens ?');

  // Calories : profil exemple complet, ajout manuel, analyse photo simulée.
  await clic('.onglet[data-v="calories"]');
  await page.waitForSelector('text=KCAL RESTANTES');
  await clic('text=Ajouter à la main');
  await page.fill('#recherche', 'banane');
  await clic('[data-a="choisirAliment"]');
  await clic('[data-a="grammesChoix"][data-v="10"]');
  await clic('[data-a="ajouterChoix"]');
  await page.waitForSelector('text=Banane');
  // Faux moteur d'analyse : la page croit tourner dans claude.ai.
  await page.addInitScript(() => {
    window.claude = { use: async () => ({
      json: async () => ({ aliments: [{ nom: 'Pâtes bolognaise', grammes: 300, kcal: 450, proteines: 20, glucides: 60, lipides: 12 }], confiance: 'moyenne', remarque: 'Sauce estimée.' }),
      limits: async () => ({ images: { maxCount: 1 } }),
    }) };
  });
  await page.reload();
  await clic('.onglet[data-v="calories"]');
  await page.waitForSelector('text=KCAL RESTANTES');
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  await page.setInputFiles('#galerie', { name: 'repas.png', mimeType: 'image/png', buffer: png });
  await page.waitForSelector('text=Voilà ce que je vois');
  await clic('[data-a="grammes"][data-c="-1"]');
  assert.match(await page.textContent('.liste'), /275 g/);
  await clic('text=Ajouter au journal');
  await page.waitForSelector('text=Pâtes bolognaise');
  await page.fill('#pesee', '75.8');
  await clic('[data-a="peser"]');
  await page.waitForSelector('.grand-chiffre:has-text("75.8")');

  assert.deepEqual(erreurs, []);
  console.log('Parcours complet OK');
} finally {
  await navigateur.close();
  serveur.close();
}
