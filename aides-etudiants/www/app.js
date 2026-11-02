"use strict";

const PROFIL = [
  { id: "boursier",  label: "🎓 Je suis boursier·e" },
  { id: "locataire", label: "🏠 Je paie un loyer" },
  { id: "alternant", label: "🧑‍🔧 Je suis en alternance" },
  { id: "salarie",   label: "💼 J'ai un job étudiant" },
  { id: "moins26",   label: "🎂 J'ai moins de 26 ans" },
  { id: "precaire",  label: "😮‍💨 Je galère niveau budget" },
];

// ── Stockage local (protégé : marche même en navigation privée) ──
const store = {
  get(k, def) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch { return def; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};
const etat = {
  cat: "tout",
  q: "",
  // On ne garde que des valeurs connues (stockage corrompu ou ancien = ignoré)
  favoris: new Set([].concat(store.get("favoris", [])).filter((id) => AIDES.some((a) => a.id === id))),
  profil: new Set([].concat(store.get("profil", [])).filter((id) => PROFIL.some((p) => p.id === id))),
};

const $ = (s) => document.querySelector(s);
const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const norm = (t) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const catDe = (id) => CATEGORIES.find((c) => c.id === id);
// N'autorise que des liens https (aucun javascript:, data:, etc.)
const lienSur = (u) => { try { const x = new URL(u); return x.protocol === "https:" ? x.href : ""; } catch { return ""; } };

// ── Rendu d'une carte ──
function carte(a) {
  const fav = etat.favoris.has(a.id);
  return `
    <div class="aide" role="button" tabindex="0" data-id="${esc(a.id)}" data-c="${esc(a.cat)}">
      <div class="ico" aria-hidden="true">${esc(a.emoji)}</div>
      <div class="corps">
        <h3>${esc(a.titre)}</h3>
        <p>${esc(a.resume)}</p>
        <span class="montant">${esc(a.montant)}</span>
      </div>
      <button class="coeur ${fav ? "on" : ""}" data-fav="${esc(a.id)}" aria-label="${fav ? "Retirer des" : "Ajouter aux"} favoris">${fav ? "💜" : "🤍"}</button>
    </div>`;
}
function vide(emoji, txt) { return `<div class="vide"><span class="big">${emoji}</span>${txt}</div>`; }

// ── Explorer ──
function filtrees() {
  const q = norm(etat.q.trim());
  return AIDES.filter((a) =>
    (etat.cat === "tout" || a.cat === etat.cat) &&
    (!q || norm([a.titre, a.resume, a.organisme, a.montant, ...a.pour, catDe(a.cat).label].join(" ")).includes(q)));
}
function rendreCats() {
  $("#cats").innerHTML = CATEGORIES.map((c) => {
    const n = c.id === "tout" ? AIDES.length : AIDES.filter((a) => a.cat === c.id).length;
    return `<button class="cat ${c.id === etat.cat ? "active" : ""}" data-cat="${c.id}">${c.emoji} ${c.label} <small>${n}</small></button>`;
  }).join("");
}
function rendreExplorer() {
  const l = filtrees();
  $("#liste").innerHTML = l.length ? l.map(carte).join("") : vide("🫥", "Aucune aide trouvée.<br>Essaie un autre mot !");
}
function rendreStats() {
  const gratuits = AIDES.filter((a) => /gratuit/i.test(a.montant)).length;
  $("#stats").innerHTML = `
    <div class="stat lime"><b>${AIDES.length}</b><span>aides listées</span></div>
    <div class="stat rose"><b>${gratuits}</b><span>100 % gratuites</span></div>
    <div class="stat cyan"><b>1 €</b><span>le repas CROUS</span></div>`;
}

// ── Pour moi ──
function rendreMoi() {
  $("#toggles").innerHTML = PROFIL.map((p) =>
    `<button class="toggle ${etat.profil.has(p.id) ? "on" : ""}" data-p="${p.id}" aria-pressed="${etat.profil.has(p.id)}">${p.label}</button>`).join("");
  const score = (a) => a.tags.filter((t) => etat.profil.has(t)).length;
  const l = AIDES.filter((a) => a.tags.includes("tous") || score(a) > 0)
    .sort((x, y) => score(y) - score(x));
  const nCibles = l.filter((a) => score(a) > 0).length;
  $("#moi-titre").innerHTML = etat.profil.size
    ? `<em>${l.length} aides</em> pour toi${nCibles ? `, dont ${nCibles} rien que pour ton profil` : ""} 🎉`
    : `Ouvertes à tous les étudiants 👇`;
  $("#liste-moi").innerHTML = l.map(carte).join("");
}

// ── Favoris ──
function rendreFavoris() {
  const l = AIDES.filter((a) => etat.favoris.has(a.id));
  $("#liste-fav").innerHTML = l.length ? l.map(carte).join("")
    : vide("💜", "Pas encore de favoris.<br>Touche le cœur 🤍 sur une aide pour la garder ici.");
  const b = $("#badge-fav");
  b.hidden = !etat.favoris.size;
  b.textContent = etat.favoris.size;
}

function toutRendre() { rendreCats(); rendreExplorer(); rendreMoi(); rendreFavoris(); }

// ── Fiche détail ──
let dernierFocus = null;
function ouvrir(id) {
  const a = AIDES.find((x) => x.id === id);
  if (!a) return;
  dernierFocus = document.activeElement;
  const fav = etat.favoris.has(a.id);
  const tel = String(a.tel || "").replace(/[^0-9+]/g, "");
  const lien = lienSur(a.lien);
  const sheet = $("#sheet");
  sheet.dataset.c = a.cat;
  sheet.innerHTML = `
    <div class="poignee"></div>
    <div class="entete">
      <div class="ico" aria-hidden="true">${esc(a.emoji)}</div>
      <div><h2 id="sheet-titre">${esc(a.titre)}</h2><div class="orga">${catDe(a.cat).emoji} ${catDe(a.cat).label} · ${esc(a.organisme)}</div></div>
    </div>
    <p class="resume">${esc(a.resume)}</p>
    <div class="gros-montant"><small>Combien ?</small><b>${esc(a.montant)}</b></div>
    <h4>C'est pour qui ?</h4>
    <div class="pour">${a.pour.map((p) => `<span>${esc(p)}</span>`).join("")}</div>
    <h4>Comment l'avoir ?</h4>
    <ol class="etapes">${a.etapes.map((e) => `<li>${esc(e)}</li>`).join("")}</ol>
    ${tel ? `<a class="btn" href="tel:${tel}">📞 Appeler le ${tel}</a>` : ""}
    <div class="actions">
      ${lien ? `<a class="btn ${tel ? "ghost" : ""}" href="${esc(lien)}" target="_blank" rel="noopener noreferrer">Site officiel ↗</a>` : ""}
      <button class="btn ghost" data-fav="${esc(a.id)}" aria-label="Favori">${fav ? "💜" : "🤍"}</button>
    </div>
    <button class="btn ghost" id="partager">📤 Envoyer à un pote</button>
    <button class="btn ghost" id="fermer">Fermer</button>`;
  sheet.setAttribute("aria-labelledby", "sheet-titre");
  $("#voile").hidden = false;
  sheet.hidden = false;
  sheet.scrollTop = 0;
  document.body.style.overflow = "hidden";
  $("#fermer").focus({ preventScroll: true });
  $("#fermer").onclick = fermer;
  $("#partager").onclick = () => partager(a);
}
function fermer() {
  $("#sheet").hidden = true;
  $("#voile").hidden = true;
  document.body.style.overflow = "";
  dernierFocus?.focus?.({ preventScroll: true });
}
async function partager(a) {
  const texte = `${a.emoji} ${a.titre} : ${a.resume} (${a.montant}) — trouvé sur Boost Étudiant ⚡`;
  try {
    if (navigator.share) await navigator.share({ title: a.titre, text: texte, url: lienSur(a.lien) });
    else { await navigator.clipboard.writeText(`${texte}\n${lienSur(a.lien)}`); toast("Copié, colle-le à ton pote 📋"); }
  } catch {}
}

// ── Favoris ──
function basculerFavori(id) {
  if (etat.favoris.has(id)) { etat.favoris.delete(id); toast("Retiré des favoris"); }
  else { etat.favoris.add(id); toast("Ajouté aux favoris 💜"); }
  store.set("favoris", [...etat.favoris]);
  toutRendre();
  if (!$("#sheet").hidden) document.querySelectorAll(`#sheet [data-fav="${CSS.escape(id)}"]`).forEach((b) => (b.textContent = etat.favoris.has(id) ? "💜" : "🤍"));
}

let toastT;
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("on");
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove("on"), 1800);
}

// ── Onglets ──
const TITRES = {
  explorer: 'Booste ton <span class="grad">budget</span> ⚡',
  moi: 'Les aides <span class="grad">faites pour toi</span>',
  favoris: 'Tes <span class="grad">favoris</span>',
  infos: 'Bon à <span class="grad">savoir</span>',
};
function allerA(vue) {
  document.querySelectorAll(".vue").forEach((v) => v.classList.toggle("active", v.id === `vue-${vue}`));
  document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.dataset.vue === vue));
  $("#titre").innerHTML = TITRES[vue];
  window.scrollTo({ top: 0 });
  store.set("vue", vue);
}

// ── Événements ──
document.addEventListener("click", (e) => {
  const fav = e.target.closest("[data-fav]");
  if (fav) { e.stopPropagation(); basculerFavori(fav.dataset.fav); return; }
  const c = e.target.closest("[data-cat]");
  if (c) { etat.cat = c.dataset.cat; rendreCats(); rendreExplorer(); c.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" }); return; }
  const p = e.target.closest("[data-p]");
  if (p) {
    const id = p.dataset.p;
    etat.profil.has(id) ? etat.profil.delete(id) : etat.profil.add(id);
    store.set("profil", [...etat.profil]);
    rendreMoi();
    return;
  }
  const t = e.target.closest(".tab");
  if (t) { allerA(t.dataset.vue); return; }
  const a = e.target.closest(".aide");
  if (a) ouvrir(a.dataset.id);
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !$("#sheet").hidden) fermer();
  if ((e.key === "Enter" || e.key === " ") && e.target.classList?.contains("aide")) { e.preventDefault(); ouvrir(e.target.dataset.id); }
});
$("#voile").addEventListener("click", fermer);
$("#q").addEventListener("input", (e) => { etat.q = e.target.value; rendreExplorer(); });

// Glisser la fiche vers le bas pour la fermer
(() => {
  const sheet = $("#sheet");
  let y0 = null, dy = 0;
  sheet.addEventListener("touchstart", (e) => { if (sheet.scrollTop <= 0) { y0 = e.touches[0].clientY; dy = 0; } }, { passive: true });
  sheet.addEventListener("touchmove", (e) => {
    if (y0 === null) return;
    dy = Math.max(0, e.touches[0].clientY - y0);
    sheet.style.transform = `translateY(${dy}px)`;
  }, { passive: true });
  sheet.addEventListener("touchend", () => {
    if (y0 === null) return;
    sheet.style.transform = "";
    if (dy > 110) fermer();
    y0 = null;
  });
})();

// ── Installation ──
const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
const installee = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone;
let promptInstall = null;
if (installee) $("#install-box").hidden = true;
$("#install-android").hidden = ios;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  promptInstall = e;
  $("#btn-install").hidden = false;
});
$("#btn-install").addEventListener("click", async () => {
  if (!promptInstall) return;
  promptInstall.prompt();
  await promptInstall.userChoice;
  promptInstall = null;
  $("#btn-install").hidden = true;
});

// ── Démarrage ──
const h = new Date().getHours();
$("#hello").textContent = h < 6 ? "Encore debout ? 🌙" : h < 12 ? "Hello, bien dormi ? ☀️" : h < 18 ? "Salut 👋" : "Bonsoir 🌆";
$("#maj").textContent = MAJ;
rendreStats();
toutRendre();
const vueSauvee = store.get("vue", "explorer");
if (TITRES[vueSauvee]) allerA(vueSauvee);

if ("serviceWorker" in navigator && location.protocol !== "file:" && !window.Capacitor) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
