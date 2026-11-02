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
  ok(await page.locator(".tab").count() === 4, "démarre même avec un stockage corrompu");

  // Hors connexion (après la 1re visite, grâce au service worker)
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload({ waitUntil: "networkidle" });
  await ctx.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });
  ok(await page.locator(".aide").count() > 0, "fonctionne hors connexion");
  await ctx.setOffline(false);

  ok(erreurs.length === 0, `aucune erreur ni violation de sécurité (CSP)${erreurs.length ? " : " + erreurs.join(" | ") : ""}`);
  ok(externes.length === 0, `aucune requête vers un site extérieur${externes.length ? " : " + externes.join(", ") : ""}`);

  await nav.close();
  serveur.close();
  console.log(echecs ? `\n${echecs} test(s) en échec` : "\nTous les tests passent 🎉");
  process.exit(echecs ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
