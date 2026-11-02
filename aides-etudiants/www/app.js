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
  reglages: Object.assign({ prox: false, rayonAlerte: 2, rappels: false, rayon: 10, lieu: "tout" }, store.get("reglages", {})),
};
const REGLAGES_OK = (r) => ({
  prox: r.prox === true, rappels: r.rappels === true,
  rayonAlerte: Math.min(10, Math.max(1, Math.round(+r.rayonAlerte) || 2)),
  rayon: Math.min(50, Math.max(1, Math.round(+r.rayon) || 10)),
  lieu: ["tout", "resto", "logement"].includes(r.lieu) ? r.lieu : "tout",
});
etat.reglages = REGLAGES_OK(etat.reglages);
function sauverReglages() { store.set("reglages", etat.reglages); synchroPlusTard(); }

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
  synchroPlusTard();
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
  autour: 'Autour <span class="grad">de toi</span> 📍',
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
  if (vue === "autour" && etat.position) rendreAutour();
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
    synchroPlusTard();
    rendreMoi();
    return;
  }
  const fl = e.target.closest("[data-lieu]");
  if (fl) { etat.reglages.lieu = fl.dataset.lieu; sauverReglages(); rendreAutour(); return; }
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


// ══════════════ AUTOUR DE MOI ══════════════
const Plugins = () => window.Capacitor?.Plugins || {};
const NATIF = !!window.Capacitor?.isNativePlatform?.();
const IOS = (window.Capacitor?.getPlatform?.() || "") === "ios" || /iphone|ipad|ipod/i.test(navigator.userAgent);
etat.position = null; // jamais stockée : uniquement en mémoire, le temps que l'appli est ouverte
let LIEUX = null;

async function chargerLieux() {
  if (LIEUX) return LIEUX;
  const r = await fetch("lieux.json", { cache: "no-cache" });
  if (!r.ok) throw new Error("lieux indisponibles");
  const d = await r.json();
  LIEUX = (Array.isArray(d.lieux) ? d.lieux : []).filter((l) =>
    l && (l.t === "resto" || l.t === "logement") && typeof l.n === "string" &&
    Number.isFinite(l.lat) && Number.isFinite(l.lon) && Math.abs(l.lat) <= 90 && Math.abs(l.lon) <= 180);
  LIEUX.maj = d.maj;
  return LIEUX;
}

function distanceKm(a, b) {
  const R = 6371, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
const fmtKm = (km) => km < 1 ? `${Math.max(50, Math.round(km * 1000 / 50) * 50)} m` : `${km.toLocaleString("fr-FR", { maximumFractionDigits: km < 10 ? 1 : 0 })} km`;

async function obtenirPosition() {
  const G = Plugins().Geolocation;
  if (NATIF && G) {
    let p = await G.checkPermissions().catch(() => ({ location: "prompt" }));
    if (p.location !== "granted" && p.coarseLocation !== "granted") p = await G.requestPermissions();
    if (p.location !== "granted" && p.coarseLocation !== "granted") throw Object.assign(new Error("refus"), { code: 1 });
    const pos = await G.getCurrentPosition({ enableHighAccuracy: false, timeout: 15000, maximumAge: 120000 });
    return { lat: pos.coords.latitude, lon: pos.coords.longitude };
  }
  if (!("geolocation" in navigator)) throw new Error("indisponible");
  return new Promise((ok, ko) => navigator.geolocation.getCurrentPosition(
    (p) => ok({ lat: p.coords.latitude, lon: p.coords.longitude }), ko,
    { enableHighAccuracy: false, timeout: 15000, maximumAge: 120000 }));
}

function lienItineraire(l) {
  const dest = `${l.lat},${l.lon}`;
  return IOS ? `https://maps.apple.com/?daddr=${dest}&dirflg=w` : `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=walking`;
}

function proches(rayon, type = "tout") {
  if (!LIEUX || !etat.position) return [];
  return LIEUX.filter((l) => type === "tout" || l.t === type)
    .map((l) => ({ ...l, km: distanceKm(etat.position, l) }))
    .filter((l) => l.km <= rayon)
    .sort((a, b) => a.km - b.km);
}

function carteLieu(l) {
  const info = [l.t === "resto" ? (l.s || "Resto U") + " · repas à 1 €" : "Résidence CROUS", l.v].filter(Boolean).map(esc).join(" · ");
  const u = lienSur(l.u);
  return `
    <div class="lieu" data-t="${l.t}">
      <div class="ico" aria-hidden="true">${l.t === "resto" ? "🍽️" : "🏢"}</div>
      <div class="corps">
        <h3>${esc(l.n)}</h3>
        <p>${info}</p>
        ${l.a ? `<p>${esc(l.a)}</p>` : ""}
        ${l.f ? `<p class="ferme">Fermé temporairement</p>` : ""}
        <div class="liens">
          <a class="mini go" href="${esc(lienItineraire(l))}" target="_blank" rel="noopener noreferrer">🧭 Itinéraire</a>
          ${u ? `<a class="mini" href="${esc(u)}" target="_blank" rel="noopener noreferrer">Infos ↗</a>` : ""}
        </div>
      </div>
      <div class="km">${fmtKm(l.km)}</div>
    </div>`;
}

function rendreAutour() {
  const r = etat.reglages;
  $("#rayon").value = r.rayon;
  $("#rayon-val").textContent = `${r.rayon} km`;
  document.querySelectorAll("[data-lieu]").forEach((b) => b.classList.toggle("active", b.dataset.lieu === r.lieu));
  if (!etat.position || !LIEUX) return;
  const l = proches(r.rayon, r.lieu);
  $("#autour-titre").innerHTML = l.length
    ? `<em>${l.length} lieu${l.length > 1 ? "x" : ""}</em> à moins de ${r.rayon} km`
    : "";
  $("#liste-autour").innerHTML = l.length ? l.slice(0, 60).map(carteLieu).join("")
    : vide("🗺️", `Rien à moins de ${r.rayon} km.<br>Augmente le rayon avec le curseur.`);
}

async function localiser() {
  const b = $("#btn-position");
  b.disabled = true; b.textContent = "📍 Recherche de ta position…";
  try {
    const [pos] = await Promise.all([obtenirPosition(), chargerLieux()]);
    etat.position = pos;
    $("#autour-intro").hidden = true;
    $("#autour-outils").hidden = false;
    rendreAutour();
  } catch (e) {
    const msg = e?.message === "lieux indisponibles" ? "La liste des lieux n'est pas disponible pour l'instant 😕"
      : e?.code === 1 ? "Position refusée. Autorise-la dans les réglages de ton téléphone." : "Impossible de trouver ta position. Réessaie dehors ou active la localisation.";
    toast(msg);
  } finally { b.disabled = false; b.textContent = "📍 Trouver autour de moi"; }
}
$("#btn-position").addEventListener("click", localiser);
$("#btn-actualiser").addEventListener("click", async () => { try { etat.position = await obtenirPosition(); rendreAutour(); toast("Position actualisée 📍"); } catch { toast("Position indisponible"); } });
$("#rayon").addEventListener("input", (e) => { etat.reglages.rayon = +e.target.value; rendreAutour(); });
$("#rayon").addEventListener("change", sauverReglages);

// ══════════════ NOTIFICATIONS ══════════════
async function permissionNotifs() {
  const LN = Plugins().LocalNotifications;
  if (NATIF && LN) {
    let p = await LN.checkPermissions();
    if (p.display !== "granted") p = await LN.requestPermissions();
    return p.display === "granted";
  }
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  return (await Notification.requestPermission()) === "granted";
}

async function notifier(id, titre, corps) {
  const LN = Plugins().LocalNotifications;
  if (NATIF && LN) return LN.schedule({ notifications: [{ id, title: titre, body: corps }] });
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const reg = await navigator.serviceWorker?.getRegistration?.().catch(() => null);
  if (reg) return reg.showNotification(titre, { body: corps, icon: "icons/icon-192.png", badge: "icons/icon-192.png", tag: String(id) });
  try { new Notification(titre, { body: corps, icon: "icons/icon-192.png" }); } catch {}
}

// Ne prévient qu'une fois par lieu tous les 7 jours
async function verifierProximite() {
  if (!etat.reglages.prox) return;
  try {
    const [pos] = await Promise.all([obtenirPosition(), chargerLieux()]);
    etat.position = pos;
    const deja = store.get("deja-notifies", {});
    const maintenant = Date.now();
    for (const k of Object.keys(deja)) if (maintenant - deja[k] > 7 * 864e5) delete deja[k];
    const l = proches(etat.reglages.rayonAlerte).filter((x) => !x.f);
    const nouveau = l.find((x) => !deja[`${x.n}|${x.lat}`]);
    if (!nouveau) return;
    deja[`${nouveau.n}|${nouveau.lat}`] = maintenant;
    store.set("deja-notifies", deja);
    const autres = l.length - 1;
    await notifier(Math.floor(maintenant / 1000) % 2e9,
      nouveau.t === "resto" ? `🍽️ Resto U à ${fmtKm(nouveau.km)}` : `🏢 Résidence CROUS à ${fmtKm(nouveau.km)}`,
      `${nouveau.n}${nouveau.t === "resto" ? " – repas à 1 €" : ""}${autres > 0 ? ` · +${autres} autre${autres > 1 ? "s" : ""} lieu${autres > 1 ? "x" : ""} près de toi` : ""}`);
    if (!$("#vue-autour").classList.contains("active")) return;
    rendreAutour();
  } catch {}
}

// Rappels annuels (appli installée uniquement) : reprogrammés à chaque ouverture
const RAPPELS = [
  { id: 9001, mois: 3, jour: 1, h: 10, titre: "🎓 Le dossier de bourse est ouvert !", corps: "Remplis ton DSE dès maintenant pour la bourse et le logement CROUS." },
  { id: 9002, mois: 5, jour: 15, h: 18, titre: "⏰ Plus que 2 semaines pour ton DSE", corps: "Le dossier de bourse ferme fin mai. Ne le rate pas !" },
  { id: 9003, mois: 9, jour: 1, h: 10, titre: "📚 C'est la rentrée !", corps: "Pense à l'APL, au repas à 1 €, à la CVEC et au Pass'Sport." },
];
const prochaineDate = (r) => {
  const n = new Date();
  let d = new Date(n.getFullYear(), r.mois - 1, r.jour, r.h, 0, 0);
  if (d <= n) d = new Date(n.getFullYear() + 1, r.mois - 1, r.jour, r.h, 0, 0);
  return d;
};
async function programmerRappels() {
  const LN = Plugins().LocalNotifications;
  if (!NATIF || !LN) return;
  await LN.cancel({ notifications: RAPPELS.map((r) => ({ id: r.id })) }).catch(() => {});
  if (!etat.reglages.rappels) return;
  await LN.schedule({ notifications: RAPPELS.map((r) => ({ id: r.id, title: r.titre, body: r.corps, schedule: { at: prochaineDate(r), allowWhileIdle: true } })) });
}

function rendreNotifs() {
  const r = etat.reglages;
  $("#sw-prox").setAttribute("aria-checked", r.prox);
  $("#sw-rappels").setAttribute("aria-checked", r.rappels);
  $("#rayon-alerte").value = r.rayonAlerte;
  $("#rayon-alerte").hidden = !r.prox;
  $("#alerte-val").textContent = `${r.rayonAlerte} km`;
  $("#ligne-rappels").hidden = !NATIF;
}
$("#sw-prox").addEventListener("click", async () => {
  if (!etat.reglages.prox) {
    if (!(await permissionNotifs())) return toast("Autorise les notifications dans les réglages 🔔");
    try { etat.position = await obtenirPosition(); } catch { return toast("Il faut autoriser ta position 📍"); }
    etat.reglages.prox = true;
    toast(`On te prévient à moins de ${etat.reglages.rayonAlerte} km 🔔`);
  } else etat.reglages.prox = false;
  sauverReglages(); rendreNotifs();
  verifierProximite();
});
$("#sw-rappels").addEventListener("click", async () => {
  if (!etat.reglages.rappels && !(await permissionNotifs())) return toast("Autorise les notifications dans les réglages 🔔");
  etat.reglages.rappels = !etat.reglages.rappels;
  sauverReglages(); rendreNotifs();
  try { await programmerRappels(); if (etat.reglages.rappels) toast("Rappels programmés 📅"); } catch { toast("Rappels indisponibles"); }
});
$("#rayon-alerte").addEventListener("input", (e) => { etat.reglages.rayonAlerte = +e.target.value; $("#alerte-val").textContent = `${e.target.value} km`; });
$("#rayon-alerte").addEventListener("change", sauverReglages);

// Vérifie quand on ouvre / revient sur l'appli, et toutes les 10 min tant qu'elle est ouverte
let derniereVerif = 0;
function verifierSiBesoin() {
  if (document.visibilityState !== "visible" || Date.now() - derniereVerif < 60000) return;
  derniereVerif = Date.now();
  verifierProximite();
}
document.addEventListener("visibilitychange", verifierSiBesoin);
Plugins().App?.addListener?.("appStateChange", (s) => s.isActive && verifierSiBesoin());
setInterval(() => { derniereVerif = 0; verifierSiBesoin(); }, 10 * 60000);

// ══════════════ COMPTE (optionnel) ══════════════
let synchroTimer = null, compteActif = false;
function synchroPlusTard() {
  if (!compteActif || !window.Compte?.utilisateur) return;
  clearTimeout(synchroTimer);
  synchroTimer = setTimeout(() => window.Compte.ecrire({ favoris: [...etat.favoris], profil: [...etat.profil], reglages: etat.reglages })
    .then(() => { $("#compte-sync").textContent = "✅ Favoris et profil synchronisés"; })
    .catch(() => { $("#compte-sync").textContent = "⚠️ Synchro en attente (hors connexion ?)"; }), 1200);
}
async function fusionnerCompte() {
  const d = await window.Compte.lire().catch(() => null);
  if (d) {
    [].concat(d.favoris || []).filter((id) => AIDES.some((a) => a.id === id)).forEach((id) => etat.favoris.add(id));
    [].concat(d.profil || []).filter((id) => PROFIL.some((p) => p.id === id)).forEach((id) => etat.profil.add(id));
    if (d.reglages && typeof d.reglages === "object") etat.reglages = REGLAGES_OK({ ...etat.reglages, ...d.reglages });
    store.set("favoris", [...etat.favoris]); store.set("profil", [...etat.profil]); store.set("reglages", etat.reglages);
    toutRendre(); rendreNotifs(); programmerRappels().catch(() => {});
  }
  synchroPlusTard();
}
function rendreCompte(u) {
  $("#compte-box").hidden = !compteActif;
  $("#compte-deconnecte").hidden = !!u;
  $("#compte-connecte").hidden = !u;
  $("#btn-apple").hidden = !window.Compte?.appleDispo;
  if (u) {
    $("#compte-nom").textContent = u.nom || "Connecté·e";
    $("#compte-email").textContent = u.email;
    $("#avatar").textContent = (u.nom || u.email || "?").trim().charAt(0).toUpperCase();
  }
}
function brancherCompte() {
  const C = window.Compte;
  if (!C || !C.actif) return;
  compteActif = true;
  rendreCompte(null);
  C.surChangement((u) => { rendreCompte(u); if (u) fusionnerCompte(); });
  C.demarrer();
  const go = (f) => async () => {
    try { await C.connecter(f); toast("Connecté·e 🎉"); }
    catch (e) { if (!/cancel|closed|annul/i.test(String(e?.code || e?.message))) toast("Connexion impossible, réessaie"); }
  };
  $("#btn-google").onclick = go("google");
  $("#btn-apple").onclick = go("apple");
  $("#btn-deconnexion").onclick = async () => { await C.deconnecter(); toast("Déconnecté·e"); };
  $("#btn-supprimer").onclick = async () => {
    if (!confirm("Supprimer définitivement ton compte et tes données synchronisées ? Tes favoris restent sur ce téléphone.")) return;
    try { await C.supprimer(); toast("Compte supprimé"); } catch { toast("Suppression impossible, réessaie"); }
  };
}
if (window.Compte) brancherCompte(); else window.addEventListener("compte-pret", brancherCompte, { once: true });

// ── Démarrage ──
const h = new Date().getHours();
$("#hello").textContent = h < 6 ? "Encore debout ? 🌙" : h < 12 ? "Hello, bien dormi ? ☀️" : h < 18 ? "Salut 👋" : "Bonsoir 🌆";
$("#maj").textContent = MAJ;
rendreStats();
toutRendre();
rendreNotifs();
programmerRappels().catch(() => {});
if (etat.reglages.prox) verifierSiBesoin();
const vueSauvee = store.get("vue", "explorer");
if (TITRES[vueSauvee]) allerA(vueSauvee);

if ("serviceWorker" in navigator && location.protocol !== "file:" && !window.Capacitor) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
