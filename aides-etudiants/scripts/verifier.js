// Vérifie le catalogue d'aides : champs obligatoires, catégories, liens https, ids uniques.
const fs = require("fs");
const path = require("path");
const src = fs.readFileSync(path.join(__dirname, "..", "www", "data.js"), "utf8");
const { CATEGORIES, AIDES, MAJ } = new Function(`${src}; return { CATEGORIES, AIDES, MAJ };`)();
const cats = new Set(CATEGORIES.map((c) => c.id));
const TAGS = new Set(["boursier", "alternant", "moins26", "locataire", "precaire", "salarie", "international", "tous"]);
const erreurs = [];
const ids = new Set();
for (const a of AIDES) {
  for (const k of ["id", "cat", "titre", "emoji", "resume", "montant", "lien", "organisme"])
    if (!a[k]) erreurs.push(`${a.id || "?"} : champ « ${k} » manquant`);
  for (const k of ["pour", "tags", "etapes"])
    if (!Array.isArray(a[k]) || !a[k].length) erreurs.push(`${a.id} : liste « ${k} » vide`);
  if (ids.has(a.id)) erreurs.push(`${a.id} : id en double`);
  ids.add(a.id);
  if (!cats.has(a.cat) || a.cat === "tout") erreurs.push(`${a.id} : catégorie inconnue « ${a.cat} »`);
  if (!/^https:\/\//.test(a.lien)) erreurs.push(`${a.id} : le lien doit être en https`);
  (a.tags || []).filter((t) => !TAGS.has(t)).forEach((t) => erreurs.push(`${a.id} : tag inconnu « ${t} »`));
}
if (!MAJ) erreurs.push("MAJ (date de vérification) manquante");
if (erreurs.length) { console.error(erreurs.join("\n")); process.exit(1); }
console.log(`✅ ${AIDES.length} aides OK (vérifiées : ${MAJ})`);
