// Vérifie que chaque lien officiel répond (à lancer de temps en temps : node scripts/liens.js)
const fs = require("fs");
const path = require("path");
const src = fs.readFileSync(path.join(__dirname, "..", "www", "data.js"), "utf8");
const { AIDES } = new Function(`${src}; return { AIDES };`)();
(async () => {
  let ko = 0;
  for (const a of AIDES) {
    let statut;
    try {
      const r = await fetch(a.lien, { redirect: "follow", headers: { "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148" }, signal: AbortSignal.timeout(20000) });
      statut = r.status + (r.url !== a.lien ? ` → ${r.url}` : "");
      if (r.status === 404 || r.status === 410 || r.status >= 500) ko++;
    } catch (e) { statut = "ERREUR " + (e.cause?.code || e.message); ko++; }
    console.log(`${a.id.padEnd(20)} ${statut}`);
  }
  process.exit(ko ? 1 : 0);
})();
