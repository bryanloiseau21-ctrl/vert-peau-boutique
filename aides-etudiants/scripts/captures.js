// Génère les captures d'écran pour l'App Store (iPhone 6,9") et le Play Store.
// Lance : node scripts/captures.js
const path = require("path");
const http = require("http");
const fs = require("fs");
const { chromium } = require("playwright");
const RACINE = path.join(__dirname, "..", "www");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".webmanifest": "application/manifest+json" };
const srv = http.createServer((q, r) => {
  const f = path.join(RACINE, path.normalize(new URL(q.url, "http://x").pathname).replace(/^[/\\]+/, "") || "index.html");
  if (!f.startsWith(RACINE) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(r);
});
const FORMATS = [
  { dossier: "captures-iphone", viewport: { width: 440, height: 956 }, scale: 3, mobile: true },   // 1320 × 2868
  { dossier: "captures-android", viewport: { width: 360, height: 800 }, scale: 3, mobile: true },  // 1080 × 2400
];
(async () => {
  await new Promise((r) => srv.listen(0, r));
  const base = `http://localhost:${srv.address().port}/`;
  const nav = await chromium.launch();
  for (const f of FORMATS) {
    const ctx = await nav.newContext({ viewport: f.viewport, deviceScaleFactor: f.scale, isMobile: f.mobile, hasTouch: true });
    const p = await ctx.newPage();
    const out = (n) => path.join(__dirname, "..", "store", f.dossier, n);
    await p.addInitScript(() => { try { localStorage.setItem("favoris", '["repas-crous-1e","apl","sante-psy","bourse"]'); localStorage.setItem("vue", '"explorer"'); } catch {} });
    await p.goto(base, { waitUntil: "networkidle" });
    await p.evaluate(() => { document.getElementById("hello").textContent = "Salut 👋"; });
    await p.screenshot({ path: out("1-accueil.png") });
    await p.click('.aide[data-id="repas-crous-1e"]'); await p.waitForTimeout(450);
    await p.screenshot({ path: out("2-fiche.png") });
    await p.keyboard.press("Escape");
    await p.click('.tab[data-vue="moi"]');
    for (const t of ["boursier", "locataire"]) await p.click(`[data-p="${t}"]`);
    await p.screenshot({ path: out("3-pour-moi.png") });
    await p.click('.tab[data-vue="explorer"]'); await p.click('[data-cat="logement"]');
    await p.screenshot({ path: out("4-logement.png") });
    await p.click('.tab[data-vue="favoris"]');
    await p.screenshot({ path: out("5-favoris.png") });
    await ctx.close();
  }
  await nav.close(); srv.close();
  console.log("Captures prêtes dans store/");
})();
