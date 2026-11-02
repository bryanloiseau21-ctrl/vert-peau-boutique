// Test de bout en bout de l'appli dans un vrai navigateur (format iPhone).
// Lance : node tests/ui.test.js   (sert www/ sur un port local)
const http = require("http");
const fs = require("fs");
const path = require("path");
const { chromium, devices } = require("playwright");

const RACINE = path.join(__dirname, "..", "www");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png",
  ".svg": "image/svg+xml", ".woff2": "font/woff2", ".webmanifest": "application/manifest+json", ".txt": "text/plain" };
const serveur = http.createServer((req, res) => {
  const p = path.normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)).replace(/^([/\\])+/, "");
  const f = path.join(RACINE, p || "index.html");
  if (!f.startsWith(RACINE) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream" });
  fs.createReadStream(f).pipe(res);
});

let echecs = 0;
const ok = (cond, msg) => { console.log(`${cond ? "✅" : "❌"} ${msg}`); if (!cond) echecs++; };

(async () => {
  await new Promise((r) => serveur.listen(0, r));
  const base = `http://localhost:${serveur.address().port}/`;
  const nav = await chromium.launch();
  const ctx = await nav.newContext({ ...devices["iPhone 13"] });
  const page = await ctx.newPage();
  const erreurs = [], externes = [];
  page.on("pageerror", (e) => erreurs.push(e.message));
  page.on("console", (m) => m.type() === "error" && erreurs.push(m.text()));
  page.on("request", (r) => { if (!r.url().startsWith(base)) externes.push(r.url()); });

  await page.goto(base, { waitUntil: "networkidle" });
  const total = await page.evaluate(() => AIDES.length);
  ok(await page.locator("#liste .aide").count() === total, `les ${total} aides s'affichent`);

  await page.fill("#q", "mutuelle");
  ok(await page.locator("#liste .aide").count() >= 1, "la recherche « mutuelle » trouve la C2S");
  await page.fill("#q", "zzzzzz");
  ok(await page.locator("#liste .vide").count() === 1, "message clair quand rien n'est trouvé");
  await page.fill("#q", "");

  await page.click('[data-cat="sante"]');
  const cats = await page.locator("#liste .aide").evaluateAll((els) => els.map((e) => e.dataset.c));
  ok(cats.length > 0 && cats.every((c) => c === "sante"), "le filtre Santé n'affiche que la santé");

  await page.click('.aide[data-id="sante-psy"]');
  ok(await page.locator("#sheet").isVisible(), "la fiche détail s'ouvre");
  const href = await page.locator("#sheet a[target=_blank]").getAttribute("href");
  ok(href.startsWith("https://"), "le lien officiel est en https");
  await page.click('#sheet [data-fav="sante-psy"]');
  await page.keyboard.press("Escape");
  ok(await page.locator("#sheet").isHidden(), "Échap ferme la fiche");

  await page.reload({ waitUntil: "networkidle" });
  await page.click('.tab[data-vue="favoris"]');
  ok(await page.locator('#liste-fav .aide[data-id="sante-psy"]').count() === 1, "le favori est gardé après redémarrage");

  await page.click('.tab[data-vue="moi"]');
  const avant = await page.locator("#liste-moi .aide").count();
  await page.click('[data-p="alternant"]');
  const apres = await page.locator("#liste-moi .aide").count();
  ok(apres > avant, `« Pour moi » ajoute les aides alternants (${avant} → ${apres})`);
  ok(await page.locator('#liste-moi .aide[data-id="mobili-jeune"]').count() === 1, "Mobili-Jeune proposé aux alternants");

  // Stockage corrompu : l'appli doit quand même démarrer
  await page.evaluate(() => { localStorage.setItem("favoris", "{pas du json"); localStorage.setItem("profil", '"<img src=x onerror=alert(1)>"'); });
  await page.reload({ waitUntil: "networkidle" });
  ok(await page.locator(".tab").count() === 5, "démarre même avec un stockage corrompu");
  ok(await page.locator("#compte-box").isHidden(), "sans config Firebase, pas de bouton de connexion (l'appli marche sans compte)");

  // Hors connexion (après la 1re visite, grâce au service worker)
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload({ waitUntil: "networkidle" });
  await ctx.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });
  ok(await page.locator(".aide").count() > 0, "fonctionne hors connexion");
  await ctx.setOffline(false);

  // ── Autour de moi (position simulée à Nantes, lieux de test) ──
  const ctx2 = await nav.newContext({ ...devices["iPhone 13"], geolocation: { latitude: 47.2184, longitude: -1.5536 }, permissions: ["geolocation", "notifications"], serviceWorkers: "block" });
  const p2 = await ctx2.newPage();
  p2.on("pageerror", (e) => erreurs.push(e.message));
  p2.on("console", (m) => m.type() === "error" && erreurs.push(m.text()));
  await p2.route("**/lieux.json", (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify({ maj: "2026-11-02", lieux: [
    { t: "resto", n: "Resto Test Centre", lat: 47.2200, lon: -1.5500, v: "Nantes", s: "Restaurant" },
    { t: "logement", n: "Résidence Test", lat: 47.2400, lon: -1.5600, v: "Nantes", a: "1 rue du Test" },
    { t: "resto", n: "Resto Test Loin", lat: 48.8566, lon: 2.3522, v: "Paris" },
    { t: "resto", n: "<img src=x onerror=alert(1)>", lat: 47.2190, lon: -1.5540 },
  ] }) }));
  await p2.goto(base, { waitUntil: "networkidle" });
  await p2.click('.tab[data-vue="autour"]');
  await p2.click("#btn-position");
  await p2.waitForSelector("#liste-autour .lieu");
  const noms = await p2.locator("#liste-autour .lieu h3").allTextContents();
  ok(noms.length === 3 && !noms.includes("Resto Test Loin"), `les lieux à moins de 10 km s'affichent (${noms.length})`);
  ok(await p2.locator("#liste-autour img").count() === 0, "un nom de lieu piégé n'injecte pas de code");
  const kms = await p2.locator("#liste-autour .km").allTextContents();
  ok(/m$|km$/.test(kms[0]) && kms.length === 3, `distances affichées (${kms.join(", ")})`);
  ok((await p2.locator("#liste-autour .lieu h3").first().textContent()).includes("img"), "triés du plus proche au plus loin");
  await p2.click('[data-lieu="logement"]');
  ok(await p2.locator("#liste-autour .lieu").count() === 1, "filtre Logements");
  const itin = await p2.locator("#liste-autour a.go").first().getAttribute("href");
  ok(/^https:\/\/(maps\.apple\.com|www\.google\.com\/maps)/.test(itin), "bouton itinéraire vers une appli de cartes");
  await p2.click("#sw-prox");
  await p2.waitForTimeout(500);
  ok((await p2.locator("#sw-prox").getAttribute("aria-checked")) === "true", "l'alerte de proximité s'active");
  const stocke = await p2.evaluate(() => localStorage.getItem("reglages") + localStorage.getItem("deja-notifies"));
  ok(!/47\.21|-1\.55/.test(stocke.replace(/"[^"]*\|47\.2\d*"/g, "")), "la position de l'utilisateur n'est jamais enregistrée");
  await ctx2.close();

  // ── Compte : avec une config Firebase, le module se charge et les boutons apparaissent ──
  const ctx3 = await nav.newContext({ ...devices["iPhone 13"], serviceWorkers: "block" });
  const p3 = await ctx3.newPage();
  const erreurs3 = [];
  p3.on("pageerror", (e) => erreurs3.push(e.message));
  p3.on("console", (m) => m.type() === "error" && erreurs3.push(m.text()));
  await p3.route("**/firebase-config.js", (r) => r.fulfill({ contentType: "text/javascript",
    body: 'window.FIREBASE_CONFIG={apiKey:"test-cle",authDomain:"boost-test.firebaseapp.com",projectId:"boost-test",appId:"1:1:web:1"};' }));
  await p3.route(/googleapis\.com|apis\.google\.com|firebaseapp\.com/, (r) => r.abort());
  await p3.goto(base, { waitUntil: "load" });
  await p3.click('.tab[data-vue="infos"]');
  await p3.waitForFunction(() => window.Compte && !document.getElementById("compte-box").hidden, null, { timeout: 15000 });
  ok(await p3.locator("#btn-google").isVisible(), "avec Firebase configuré : bouton « Continuer avec Google »");
  ok(await p3.locator("#btn-apple").isHidden(), "bouton Apple réservé à l'appli iPhone");
  ok(await p3.evaluate(() => import("./vendor/firebase/firebase-firestore.js").then(() => true, () => false)), "les modules Firebase intégrés se chargent (sans CDN externe)");
  ok(erreurs3.filter((e) => !/ERR_FAILED|net::/.test(e)).length === 0, `aucune erreur au chargement du compte${erreurs3.length ? " : " + erreurs3.join(" | ") : ""}`);
  await ctx3.close();

  ok(erreurs.length === 0, `aucune erreur ni violation de sécurité (CSP)${erreurs.length ? " : " + erreurs.join(" | ") : ""}`);
  ok(externes.length === 0, `aucune requête vers un site extérieur${externes.length ? " : " + externes.join(", ") : ""}`);

  await nav.close();
  serveur.close();
  console.log(echecs ? `\n${echecs} test(s) en échec` : "\nTous les tests passent 🎉");
  process.exit(echecs ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
