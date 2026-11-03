// Parcours complet dans un vrai navigateur (format iPhone) : photo, détourage, 3D, plantation, conseils.
// Lance : node tests/ui.test.js   (captures d'écran : CAPTURES=dossier node tests/ui.test.js)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, devices } from 'playwright';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'www');
const OUT = process.env.CAPTURES || '';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json' };
const server = http.createServer((req, res) => {
  const p = path.normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^([/\\])+/, '');
  const f = path.join(ROOT, p || 'index.html');
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});

let echecs = 0;
const ok = (cond, msg) => { console.log(`${cond ? '✅' : '❌'} ${msg}`); if (!cond) echecs++; };
const capture = async (page, nom) => { if (OUT) { fs.mkdirSync(OUT, { recursive: true }); await page.screenshot({ path: path.join(OUT, `${nom}.png`) }); } };

await new Promise((r) => server.listen(0, r));
const base = `http://localhost:${server.address().port}/`;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ ...devices['iPhone 13'], locale: 'fr-FR', timezoneId: 'Europe/Paris' });
const page = await ctx.newPage();
const erreurs = [];
page.on('pageerror', (e) => erreurs.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') erreurs.push(m.text()); });
// Pas d'Internet pendant les tests : météo et recherche de ville répondent avec des données fictives.
await ctx.route(/open-meteo\.com/, (route) => {
  const u = route.request().url();
  if (u.includes('geocoding')) return route.fulfill({ json: { results: [{ name: 'Marseille', country: 'France', admin1: 'PACA', latitude: 43.3, longitude: 5.37, elevation: 20 }] } });
  if (u.includes('elevation')) return route.fulfill({ json: { elevation: [35] } });
  return route.fulfill({ json: { daily: {
    time: ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08'],
    weather_code: [0, 2, 3, 61, 63, 0, 1], temperature_2m_max: [14, 13, 12, 11, 10, 12, 13],
    temperature_2m_min: [5, 4, 0, 3, 6, 2, 4], precipitation_sum: [0, 0, 0, 4, 8, 0, 0] } } });
});

try {
  await page.goto(base);
  await page.waitForSelector('body.pret');
  ok(await page.isVisible('#accueil'), 'Écran d\'accueil affiché au premier lancement');
  ok(await page.locator('#scene canvas').count() === 1, 'Scène 3D créée');
  await capture(page, '01-accueil');

  // Photo de test : un « potager » marron entouré de pelouse verte (le fond à enlever)
  const png = await page.evaluate(() => {
    const c = document.createElement('canvas'); c.width = 800; c.height = 600;
    const g = c.getContext('2d');
    g.fillStyle = '#3c9a3c'; g.fillRect(0, 0, 800, 600);
    g.fillStyle = '#7a4b2a'; g.beginPath(); g.moveTo(150, 140); g.lineTo(650, 130); g.lineTo(720, 500); g.lineTo(80, 510); g.fill();
    g.fillStyle = '#5fbf4a';
    for (let y = 200; y < 480; y += 70) for (let x = 180; x < 640; x += 60) { g.beginPath(); g.arc(x, y, 18, 0, 7); g.fill(); }
    return c.toDataURL('image/png').split(',')[1];
  });
  const [choix] = await Promise.all([page.waitForEvent('filechooser'), page.click('#accueil [data-act="photo"]')]);
  await choix.setFiles({ name: 'potager.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
  await page.waitForSelector('.detourage .poignee');
  ok(await page.locator('.poignee').count() === 4, 'Détourage : 4 pastilles de coins');
  // Glisse le coin haut-gauche
  const p0 = await page.locator('.poignee[data-i="0"] circle').nth(1).boundingBox();
  await page.mouse.move(p0.x + p0.width / 2, p0.y + p0.height / 2);
  await page.mouse.down(); await page.mouse.move(p0.x + 5, p0.y + 3, { steps: 5 });
  ok(await page.isVisible('.loupe'), 'Loupe affichée pendant le glissement');
  await page.mouse.up();
  await capture(page, '02-detourage');
  await page.click('.detourage [data-act="valider"]');
  await page.waitForSelector('.detourage', { state: 'detached' });
  await page.waitForFunction(() => document.querySelector('#plan-img')?.getAttribute('src'));
  ok(!(await page.isVisible('#accueil')), 'Accueil masqué après la photo');
  ok((await page.evaluate(() => window.monPotager.etat.bacs[0].coins?.length)) === 4, 'Coins du potager enregistrés');
  await page.waitForTimeout(600);
  await capture(page, '03-visuel-3d');

  // Rotation de la vue au doigt (glisser sur la scène)
  const box = await page.locator('#scene canvas').boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down(); await page.mouse.move(box.x + box.width / 2 + 120, box.y + box.height / 2, { steps: 8 }); await page.mouse.up();

  // Ajout d'une plantation
  await page.click('.onglet[data-vue="potager"]');
  await page.click('[data-act="ajouter"]');
  await page.waitForSelector('#f-grille');
  await page.fill('#f-recherche', 'tomate');
  await page.click('[data-choix="tomate"]');
  ok(await page.locator('#f-saison .attention, #f-saison .ok').count() === 1, 'Conseil de saison affiché dans le formulaire');
  await page.fill('#f-date', '2026-05-15');
  await page.fill('#f-qte', '3');
  await page.fill('#f-note', 'Cœur de bœuf <b>');
  await capture(page, '04-formulaire');
  await page.click('[data-act="enregistrer"]');
  await page.waitForSelector('#bandeau-placement:not([hidden])');
  ok(true, 'Mode placement activé après l\'ajout');
  await page.waitForSelector('#voile', { state: 'hidden' });
  await page.waitForTimeout(700); // le plan défile doucement jusqu'à l'écran
  const plan = await page.locator('#plan').boundingBox();
  await page.mouse.click(plan.x + plan.width * 0.3, plan.y + plan.height * 0.4);
  ok(await page.locator('.marqueur').count() === 1, 'Plante placée sur le plan');
  const pl = await page.evaluate(() => window.monPotager.etat.plantations[0]);
  ok(Math.abs(pl.x - 0.3) < 0.05 && Math.abs(pl.y - 0.4) < 0.05, 'Position enregistrée');
  ok(await page.locator('.ligne').count() === 1, 'Plantation listée');
  ok((await page.textContent('.ligne')).includes('juil'), 'Récolte estimée en juillet');
  ok(!(await page.innerHTML('#liste-plantations')).includes('<b>Cœur'), 'Pas d\'injection HTML via la note');
  await capture(page, '05-mon-potager');

  // Ajout d'une fleur via la fiche plante et un 2e niveau
  await page.click('.ligne');
  await page.waitForSelector('.feuille.ouverte');
  ok((await page.textContent('#feuille')).includes('15 mai 2026'), 'Fiche : date de plantation');
  ok(await page.locator('.cal-case.on').count() > 0, 'Fiche : calendrier coloré');
  ok(await page.locator('#feuille .etapes li').count() >= 3, 'Fiche : étapes numérotées');
  ok((await page.getAttribute('#feuille .liens-fiche a', 'href')).startsWith('https://fr.wikipedia.org/'), 'Fiche : lien vers la fiche complète');
  await capture(page, '06-fiche');
  await page.click('#feuille [data-act="fermer"]');
  await page.waitForTimeout(350);

  // Conseils
  await page.click('.onglet[data-vue="conseils"]');
  ok(await page.locator('.puce-plante').count() > 5, 'Conseils du mois affichés');
  ok((await page.textContent('#mois-nom')).toLowerCase().length > 3, 'Nom du mois affiché');
  await page.click('[data-act="changer-lieu"]');
  await page.fill('#l-ville', 'Marseille');
  await page.waitForSelector('[data-res="0"]');
  await page.click('[data-res="0"]');
  await page.waitForFunction(() => window.monPotager.etat.zone === 'mediterraneen');
  ok(true, 'Ville trouvée → climat méditerranéen détecté');
  await page.waitForSelector('#carte-meteo:not([hidden])');
  ok((await page.textContent('#carte-meteo')).includes('gel'), 'Météo : alerte gel affichée');
  await page.click('[data-act="mois-suiv"]');
  await page.click('.puce-plante');
  await page.waitForSelector('.feuille.ouverte');
  await page.click('#feuille [data-act="planter"]');
  await page.waitForSelector('#f-grille .choisi');
  ok(true, 'Fiche plante → formulaire prérempli');
  await page.click('#feuille [data-act="fermer"]');
  await page.waitForTimeout(350);
  await page.click('[data-act="mois-prec"]');
  await capture(page, '07-conseils');

  // Visuel : fond, étiquettes, sélection
  await page.click('.onglet[data-vue="visuel"]');
  await page.click('[data-act="fond"]');
  ok((await page.evaluate(() => window.monPotager.etat.fond)) === 'coucher', 'Changement de fond');
  await page.waitForTimeout(500);
  await capture(page, '08-visuel-coucher');
  await page.click('[data-act="fond"]');
  await page.waitForTimeout(500);
  await capture(page, '09-visuel-nuit');
  await page.click('[data-act="fond"]'); await page.click('[data-act="fond"]');

  // Une serre : dimensions, hauteur, parois, couleur
  await page.click('[data-act="nouvel-element"]');
  await page.click('[data-nouveau="serre"]');
  await page.waitForSelector('#e-hauteur');
  await page.fill('#e-largeur', '3'); await page.fill('#e-longueur', '5'); await page.fill('#e-hauteur', '2.5');
  await page.click('[data-mat="tunnel"]');
  await page.click('[data-couleur="#2f6fa8"]');
  await capture(page, '10-editeur-serre');
  await page.click('[data-act="enregistrer-bac"]');
  await page.waitForTimeout(400);
  let bacs = await page.evaluate(() => window.monPotager.etat.bacs);
  const serre = bacs.find((b) => b.type === 'serre');
  ok(serre && serre.largeur === 3 && serre.longueur === 5 && serre.hauteur === 2.5 && serre.materiau === 'tunnel' && serre.couleur === '#2f6fa8', 'Serre créée avec dimensions, hauteur, parois et couleur');

  // Un enclos à poules
  await page.click('[data-act="nouvel-element"]');
  await page.click('[data-nouveau="enclos"]');
  await page.waitForSelector('[data-animal="poule"]');
  await page.click('[data-animal="lapin"]');
  await page.fill('#e-nombre', '4');
  await page.click('[data-mat="grillage"]');
  await capture(page, '11-editeur-enclos');
  await page.click('[data-act="enregistrer-bac"]');
  await page.waitForTimeout(400);
  bacs = await page.evaluate(() => window.monPotager.etat.bacs);
  const enclos = bacs.find((b) => b.type === 'enclos');
  ok(enclos && enclos.animal === 'lapin' && enclos.nombre === 4 && enclos.materiau === 'grillage', 'Enclos avec 4 lapins et grillage');
  await page.waitForTimeout(1500); // les animaux se baladent
  await capture(page, '12-jardin-complet');

  // Des arbres fruitiers et un terrain plus grand
  await page.click('[data-act="nouvel-element"]');
  await page.click('[data-nouveau="arbre"]');
  await page.waitForSelector('[data-espece="cerisier"]');
  await page.click('[data-espece="cerisier"]');
  await page.fill('#e-nombre', '3');
  await page.fill('#e-date', '2026-11-01');
  await page.dispatchEvent('#e-nombre', 'change');
  ok((await page.textContent('#feuille')).includes('Premiers fruits'), 'Arbre fruitier : premiers fruits indiqués');
  await capture(page, '14-editeur-arbres');
  await page.click('[data-act="enregistrer-bac"]');
  await page.waitForTimeout(400);
  bacs = await page.evaluate(() => window.monPotager.etat.bacs);
  const verger = bacs.find((b) => b.type === 'arbre');
  ok(verger && verger.espece === 'cerisier' && verger.nombre === 3 && verger.largeur === 12, 'Verger de 3 cerisiers (12 m de large)');
  await page.click('[data-act="nouvel-element"]');
  await page.waitForSelector('#t-taille');
  await page.$eval('#t-taille', (r) => { r.value = '60'; r.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.waitForTimeout(300);
  ok((await page.evaluate(() => window.monPotager.etat.tailleTerrain)) === 60, 'Terrain agrandi à 60 m');
  await page.click('#feuille [data-act="fermer"]');
  await page.waitForTimeout(1200);
  await capture(page, '15-grand-terrain');

  // Couper un arbre du décor, puis construire un bac avec le bois
  await page.click('.onglet[data-vue="visuel"]');
  const cle = await page.evaluate(() => window.monPotager.arbres()[0]);
  ok(!!cle, 'Des arbres du décor à couper');
  page.evaluate((c) => window.monPotager.couper(c), cle);
  await page.waitForSelector('.dialogue [data-rep="oui"]');
  await page.click('.dialogue [data-rep="oui"]');
  await page.waitForTimeout(1800);
  let e2 = await page.evaluate(() => window.monPotager.etat);
  ok(e2.bois >= 2 && e2.coupes.includes(cle), `Arbre coupé : ${e2.bois} bûches`);
  ok(!(await page.evaluate((c) => window.monPotager.arbres().includes(c), cle)), 'L\'arbre a disparu du décor');
  await capture(page, '16-arbre-coupe');
  const boisAvant = e2.bois;
  await page.click('#info-bois');
  await page.click('[data-construire="bac"]');
  await page.waitForSelector('#e-bois');
  await page.click('[data-act="enregistrer-bac"]');
  await page.waitForTimeout(400);
  e2 = await page.evaluate(() => window.monPotager.etat);
  ok(e2.bois < boisAvant && e2.bacs.at(-1).materiau === 'bois', `Bac en bois construit avec ${boisAvant - e2.bois} bûches`);

  // Déplacer une installation au doigt
  await page.click('[data-act="deplacer-mode"]');
  ok(await page.isVisible('#bandeau-deplacer'), 'Mode déplacer activé');
  const idSerre = serre.id;
  const avant = await page.evaluate((id) => window.monPotager.ecran(id), idSerre);
  await page.mouse.move(avant.x, avant.y); await page.mouse.down();
  await page.mouse.move(avant.x - 60, avant.y + 50, { steps: 10 }); await page.mouse.up();
  await page.waitForTimeout(500);
  const s2 = await page.evaluate((id) => window.monPotager.etat.bacs.find((b) => b.id === id), idSerre);
  ok(s2.px != null && s2.pz != null, `Serre déplacée en (${s2.px} ; ${s2.pz})`);
  const fige = await page.evaluate(() => window.monPotager.etat.bacs.every((b) => b.px != null));
  ok(fige, 'Les autres installations gardent leur place');
  await capture(page, '17-deplacement');
  await page.click('[data-act="deplacer-fin"]');

  // Planter en serre : le calendrier change
  await page.click('.onglet[data-vue="potager"]');
  ok(await page.locator('#bacs .bac-puce').count() === 5, '5 éléments dans le jardin');
  await page.click(`[data-bac="${enclos.id}"]`);
  ok(!(await page.isVisible('#carte-plan')) && await page.isVisible('#carte-enclos'), 'Fiche de l\'enclos affichée');
  await page.click(`[data-bac="${serre.id}"]`);
  await page.click('[data-act="ajouter"]');
  await page.waitForSelector('#f-bacs');
  await page.click('[data-choix="melon"]');
  await page.fill('#f-date', '2026-03-15');
  ok((await page.textContent('#f-saison')).includes('en serre'), 'Conseil de saison pour la serre');
  await page.click('[data-act="enregistrer"]');
  await page.waitForSelector('#bandeau-placement:not([hidden])');
  await page.waitForSelector('#voile', { state: 'hidden' });
  await page.waitForTimeout(700);
  const planS = await page.locator('#plan').boundingBox();
  await page.mouse.click(planS.x + planS.width * 0.5, planS.y + planS.height * 0.5);
  const melon = await page.evaluate((id) => window.monPotager.etat.plantations.find((q) => q.plante === 'melon' && q.bac === id), serre.id);
  ok(melon && melon.x != null, 'Melon planté et placé dans la serre');
  await capture(page, '13-plan-serre');

  // Persistance après rechargement
  await page.reload();
  await page.waitForSelector('body.pret');
  await page.click('.onglet[data-vue="potager"]');
  await page.click('#bacs .bac-puce >> nth=0');
  await page.waitForFunction(() => document.querySelector('#plan-img')?.getAttribute('src'));
  const etat = await page.evaluate(() => window.monPotager.etat);
  ok(etat.plantations.length === 2 && etat.zone === 'mediterraneen' && etat.bacs.length === 5 && etat.tailleTerrain === 60 && etat.coupes.length === 1 && etat.bacs.every((b) => b.px != null), 'Données conservées après rechargement');
  ok(await page.evaluate(() => new Promise((r) => { const i = document.querySelector('#plan-img'); if (i.complete) r(i.naturalWidth > 0); else { i.onload = () => r(true); i.onerror = () => r(false); } })),
    'Photo du potager toujours là après rechargement');
  ok(!(await page.isVisible('#accueil')), 'Pas d\'accueil au retour');
  ok(Number(await page.textContent('#niveau-num')) >= 2, 'Niveau de jardinier gagné');

  ok(erreurs.length === 0, `Aucune erreur JavaScript${erreurs.length ? ` : ${erreurs.join(' | ')}` : ''}`);
} catch (e) {
  console.error(e); echecs++;
  await capture(page, 'erreur');
} finally {
  await browser.close(); server.close();
}
console.log(echecs ? `\n${echecs} échec(s)` : '\nTout est vert 🌱');
process.exit(echecs ? 1 : 0);
