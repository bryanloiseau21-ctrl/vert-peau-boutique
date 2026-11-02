"use strict";

/* ------------------------------------------------------------------ */
/* Stockage local (reste sur le téléphone)                             */
/* ------------------------------------------------------------------ */
const store = {
  get(cle, defaut) {
    try { const v = localStorage.getItem(cle); return v ? JSON.parse(v) : defaut; }
    catch { return defaut; }
  },
  set(cle, valeur) {
    try { localStorage.setItem(cle, JSON.stringify(valeur)); } catch { /* mode privé */ }
  },
};

const STATUTS = {
  "": { label: "À contacter" },
  contacte: { label: "Contacté" },
  relance: { label: "Relancé" },
  entretien: { label: "Entretien" },
  accepte: { label: "Accepté 🎉" },
  refuse: { label: "Refusé" },
};

const MODELE_DEFAUT = `Bonjour,

Je m'appelle {prenom} {nom} et je suis actuellement en {formation} à {ecole}.

Passionné(e) par l'informatique, je recherche un stage du {dates} et je serais très heureux(se) de le réaliser au sein de {entreprise}.

Curieux(se), motivé(e) et sérieux(se), je souhaite découvrir votre métier et mettre mes compétences au service de votre équipe.

Vous trouverez mon CV en pièce jointe. Je reste disponible pour un échange par téléphone au {telephone} ou pour passer vous rencontrer.

Je vous remercie par avance pour votre réponse.

Bien cordialement,
{prenom} {nom}`;

const ICONES = {
  mail: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
  tel: '<svg viewBox="0 0 24 24"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg>',
  web: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>',
  plan: '<svg viewBox="0 0 24 24"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
  fermer: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>',
};

let donnees = { entreprises: [] };
let suivi = store.get("suivi", {});          // { siret: {statut, date, notes} }
let profil = store.get("profil", { modele: MODELE_DEFAUT });
const filtres = new Set(store.get("filtres", []));

const $ = (s) => document.querySelector(s);
const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const sansAccent = (t) => String(t ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const cle = (e) => e.siret || e.siren;
const nomAffiche = (e) => e.enseigne || e.nom;
const initiales = (n) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((m) => m[0]).join("").toUpperCase();
const dateFr = (iso) => iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : "";

/* ------------------------------------------------------------------ */
/* Chargement des données                                               */
/* ------------------------------------------------------------------ */
async function charger() {
  try {
    const rep = await fetch("data/entreprises.json", { cache: "no-cache" });
    if (!rep.ok) throw new Error(rep.status);
    donnees = await rep.json();
    $("#maj").textContent = `Données mises à jour le ${new Date(donnees.genere_le).toLocaleDateString("fr-FR")} · rayon ${donnees.rayon_km} km · source : INSEE (SIRENE), OpenStreetMap, sites des entreprises.`;
  } catch {
    donnees = { entreprises: [] };
  }
  afficherListe();
  afficherSuivi();
}

/* ------------------------------------------------------------------ */
/* Liste                                                                */
/* ------------------------------------------------------------------ */
function mailto(e) {
  if (!e.email) return "";
  const vars = { ...profil, entreprise: nomAffiche(e) };
  const corps = (profil.modele || MODELE_DEFAUT).replace(/\{(\w+)\}/g, (_, k) => vars[k] || `[${k}]`);
  const sujet = `Demande de stage en informatique${profil.dates ? " – " + profil.dates : ""}`;
  return `mailto:${e.email}?subject=${encodeURIComponent(sujet)}&body=${encodeURIComponent(corps)}`;
}
const telHref = (e) => e.telephone ? "tel:" + e.telephone.replace(/\s/g, "") : "";
const planHref = (e) => `https://maps.apple.com/?q=${encodeURIComponent(nomAffiche(e))}&address=${encodeURIComponent(e.adresse || e.commune)}` +
  (e.latitude ? `&ll=${e.latitude},${e.longitude}` : "");

function filtrer() {
  const q = sansAccent($("#q").value.trim());
  let liste = donnees.entreprises.filter((e) => {
    if (filtres.has("email") && !e.email) return false;
    if (filtres.has("tel") && !e.telephone) return false;
    if (filtres.has("salaries") && !(e.effectif_min >= 1)) return false;
    if (filtres.has("nouveau") && suivi[cle(e)]?.statut) return false;
    if (q && !sansAccent([e.nom, e.enseigne, e.commune, e.activite, e.dirigeants].join(" ")).includes(q)) return false;
    return true;
  });
  const tri = $("#tri").value;
  liste.sort((a, b) =>
    tri === "distance" ? (a.distance_km ?? 999) - (b.distance_km ?? 999)
      : tri === "nom" ? nomAffiche(a).localeCompare(nomAffiche(b), "fr")
        : b.score - a.score);
  return liste;
}

function carte(e) {
  const s = suivi[cle(e)]?.statut;
  const nom = nomAffiche(e);
  const dist = e.distance_km != null ? `${String(e.distance_km).replace(".", ",")} km` : "";
  return `<li class="carte" data-id="${esc(cle(e))}">
    <div class="carte-tete">
      <div class="avatar">${esc(initiales(nom))}</div>
      <div>
        <h3>${esc(nom)}</h3>
        <p class="meta">${esc(e.activite)}</p>
        <p class="meta">${esc(e.commune)}${dist ? " · " + dist : ""}</p>
      </div>
      <div class="pertinence"><b>${e.score}</b>pts</div>
    </div>
    <div class="tags">
      ${s ? `<span class="statut s-${s}">${STATUTS[s].label}</span>` : ""}
      <span class="tag">${esc(e.effectif)}</span>
      ${e.email ? '<span class="tag ok">✉️ e-mail</span>' : ""}
      ${e.telephone ? '<span class="tag ok">📞 tél.</span>' : ""}
      ${e.site ? '<span class="tag ok">🌐 site</span>' : ""}
    </div>
    <div class="actions-rapides">
      <a class="action ${e.telephone ? "" : "off"}" href="${esc(telHref(e))}" data-contact>${ICONES.tel}Appeler</a>
      <a class="action ${e.email ? "" : "off"}" href="${esc(mailto(e))}" data-contact>${ICONES.mail}E-mail</a>
      <a class="action" href="${esc(planHref(e))}" target="_blank" rel="noopener">${ICONES.plan}Plan</a>
    </div>
  </li>`;
}

function afficherListe() {
  const liste = filtrer();
  $("#liste").innerHTML = liste.map(carte).join("");
  const total = donnees.entreprises.length;
  $("#compteur").textContent = `${liste.length} entreprise${liste.length > 1 ? "s" : ""}`;
  const vide = $("#vide");
  vide.hidden = liste.length > 0;
  vide.innerHTML = total === 0
    ? "<b>Pas encore de données</b>Lance le bot (onglet Actions sur GitHub) pour remplir la liste."
    : "<b>Aucun résultat</b>Essaie d'enlever un filtre.";
  document.querySelectorAll("#filtres .chip").forEach((c) => c.classList.toggle("active", filtres.has(c.dataset.f)));
}

/* ------------------------------------------------------------------ */
/* Fiche détaillée                                                      */
/* ------------------------------------------------------------------ */
function ouvrirFiche(id) {
  const e = donnees.entreprises.find((x) => cle(x) === id);
  if (!e) return;
  const s = suivi[id] || {};
  const nom = nomAffiche(e);
  const lignes = [
    ["E-mail", e.email ? `<a href="${esc(mailto(e))}" data-contact>${esc(e.email)}</a>` : "—"],
    ["Téléphone", e.telephone ? `<a href="${esc(telHref(e))}" data-contact>${esc(e.telephone)}</a>` : "—"],
    ["Site", e.site ? `<a href="${esc(e.site)}" target="_blank" rel="noopener">${esc(e.site.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, ""))}</a>` : "—"],
    ["Adresse", esc(e.adresse)],
  ];
  const infos = [
    ["Activité", esc(e.activite)],
    ["Effectif", esc(e.effectif)],
    ["Distance", e.distance_km != null ? esc(String(e.distance_km).replace(".", ",") + " km") : "—"],
    ["Dirigeant(s)", esc(e.dirigeants || "—")],
    ["Raison sociale", esc(e.nom)],
    ["Créée le", e.date_creation ? esc(new Date(e.date_creation).toLocaleDateString("fr-FR")) : "—"],
    ["SIRET", esc(e.siret)],
  ];
  const ligne = ([k, v]) => `<div class="ligne"><span>${k}</span><span>${v}</span></div>`;
  $("#fiche-contenu").innerHTML = `
    <button class="fermer" aria-label="Fermer">${ICONES.fermer}</button>
    <h2>${esc(nom)}</h2>
    <p class="meta">${esc(e.commune)} · ${e.score} pts${e.source_contact ? " · contacts : " + esc(e.source_contact) : ""}</p>
    <div class="gros-boutons">
      <a class="action ${e.telephone ? "" : "off"}" href="${esc(telHref(e))}" data-contact>${ICONES.tel}Appeler</a>
      <a class="action ${e.email ? "" : "off"}" href="${esc(mailto(e))}" data-contact>${ICONES.mail}E-mail</a>
      <a class="action ${e.site ? "" : "off"}" href="${esc(e.site)}" target="_blank" rel="noopener">${ICONES.web}Site</a>
      <a class="action" href="${esc(planHref(e))}" target="_blank" rel="noopener">${ICONES.plan}Plan</a>
    </div>
    <div class="titre-bloc">Contact</div>
    <div class="bloc">${lignes.map(ligne).join("")}</div>
    ${!e.email ? `<p class="aide">Pas d'e-mail trouvé : appelle, passe déposer ton CV, ou cherche sur leur site / page Facebook.</p>` : ""}
    <div class="titre-bloc">Ma candidature${s.date ? " · " + dateFr(s.date) : ""}</div>
    <div class="statuts">${Object.entries(STATUTS).map(([k, v]) =>
      `<button data-statut="${k}" class="${(s.statut || "") === k ? "active" : ""}">${v.label}</button>`).join("")}</div>
    <textarea id="notes" rows="3" placeholder="Notes : personne à contacter, date de relance…">${esc(s.notes || "")}</textarea>
    <div class="titre-bloc">Entreprise</div>
    <div class="bloc">${infos.map(ligne).join("")}</div>
    <div class="liens-bas">
      <a href="${esc(e.liens.google)}" target="_blank" rel="noopener">Google</a>
      <a href="${esc(e.liens.linkedin)}" target="_blank" rel="noopener">LinkedIn</a>
      <a href="${esc(e.liens.annuaire)}" target="_blank" rel="noopener">Fiche officielle</a>
    </div>`;
  const fiche = $("#fiche");
  fiche.dataset.id = id;
  fiche.hidden = false; $("#voile").hidden = false;
  fiche.scrollTop = 0;
  document.body.style.overflow = "hidden";
}

function fermerFiche() {
  $("#fiche").hidden = true; $("#voile").hidden = true;
  document.body.style.overflow = "";
}

function majStatut(id, statut) {
  const s = suivi[id] || {};
  s.statut = statut;
  s.date = statut ? new Date().toISOString() : null;
  suivi[id] = s;
  store.set("suivi", suivi);
  afficherListe(); afficherSuivi();
}

/* ------------------------------------------------------------------ */
/* Suivi                                                                */
/* ------------------------------------------------------------------ */
function afficherSuivi() {
  const parId = Object.fromEntries(donnees.entreprises.map((e) => [cle(e), e]));
  const items = Object.entries(suivi).filter(([id, s]) => s.statut && parId[id]);
  const compte = (st) => items.filter(([, s]) => s.statut === st).length;
  $("#stats").innerHTML = [
    [items.length, "contactées"],
    [compte("entretien"), "entretiens"],
    [compte("accepte"), "acceptées"],
  ].map(([n, l]) => `<div class="stat"><b>${n}</b><span>${l}</span></div>`).join("");

  const ilYa7j = Date.now() - 7 * 864e5;
  const relances = items.filter(([, s]) => (s.statut === "contacte") && new Date(s.date).getTime() < ilYa7j);
  $("#relances").innerHTML = relances.map(([id]) => carte(parId[id])).join("") ||
    '<p class="aide">Rien à relancer pour l’instant. Les entreprises contactées depuis plus de 7 jours sans réponse apparaîtront ici.</p>';
  items.sort((a, b) => new Date(b[1].date) - new Date(a[1].date));
  $("#demarches").innerHTML = items.map(([id]) => carte(parId[id])).join("") ||
    '<p class="aide">Aucune démarche pour l’instant. Ouvre une entreprise et change son statut.</p>';
}

function exporterCSV() {
  const parId = Object.fromEntries(donnees.entreprises.map((e) => [cle(e), e]));
  const lignes = [["Entreprise", "Statut", "Date", "E-mail", "Téléphone", "Commune", "Notes"]];
  for (const [id, s] of Object.entries(suivi)) {
    const e = parId[id];
    if (!e || (!s.statut && !s.notes)) continue;
    lignes.push([nomAffiche(e), STATUTS[s.statut || ""].label, s.date ? new Date(s.date).toLocaleDateString("fr-FR") : "",
      e.email, e.telephone, e.commune, s.notes || ""]);
  }
  const csv = "﻿" + lignes.map((l) => l.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(";")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = "suivi-stages.csv";
  a.click();
}

/* ------------------------------------------------------------------ */
/* Profil                                                               */
/* ------------------------------------------------------------------ */
function initProfil() {
  const f = $("#profil");
  if (!profil.modele) profil.modele = MODELE_DEFAUT;
  for (const el of f.elements) if (el.name) el.value = profil[el.name] || "";
  f.addEventListener("input", (ev) => {
    if (!ev.target.name) return;
    profil[ev.target.name] = ev.target.value;
    store.set("profil", profil);
  });
  $("#modele-defaut").addEventListener("click", () => {
    profil.modele = MODELE_DEFAUT; f.elements.modele.value = MODELE_DEFAUT; store.set("profil", profil);
    toast("Modèle réinitialisé");
  });
}

/* ------------------------------------------------------------------ */
/* Divers                                                               */
/* ------------------------------------------------------------------ */
let toastTimer;
function toast(msg) {
  const t = $("#toast"); t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => (t.hidden = true), 2600);
}

function changerVue(vue) {
  document.querySelectorAll(".vue").forEach((v) => v.classList.toggle("active", v.id === "vue-" + vue));
  document.querySelectorAll(".onglet").forEach((o) => o.classList.toggle("active", o.dataset.vue === vue));
  $("#titre").textContent = { liste: "Entreprises", suivi: "Mon suivi", profil: "Profil" }[vue];
  window.scrollTo(0, 0);
  store.set("vue", vue);
}

document.addEventListener("click", (ev) => {
  const contact = ev.target.closest("[data-contact]");
  if (contact) {
    const id = ev.target.closest("[data-id]")?.dataset.id;
    if (id && !suivi[id]?.statut) { majStatut(id, "contacte"); toast("Marquée comme « Contactée »"); if (!$("#fiche").hidden) ouvrirFiche(id); }
    if (contact.href.startsWith("mailto:")) setTimeout(() => toast("Pense à joindre ton CV dans Mail 📎"), 800);
    return;
  }
  if (ev.target.closest("a")) return;
  const chip = ev.target.closest(".chip");
  if (chip) {
    filtres.has(chip.dataset.f) ? filtres.delete(chip.dataset.f) : filtres.add(chip.dataset.f);
    store.set("filtres", [...filtres]); afficherListe(); return;
  }
  const st = ev.target.closest("[data-statut]");
  if (st) { const id = $("#fiche").dataset.id; majStatut(id, st.dataset.statut); ouvrirFiche(id); return; }
  if (ev.target.closest(".fermer") || ev.target.id === "voile") { fermerFiche(); return; }
  const onglet = ev.target.closest(".onglet");
  if (onglet) { changerVue(onglet.dataset.vue); return; }
  const c = ev.target.closest(".carte");
  if (c) ouvrirFiche(c.dataset.id);
});

document.addEventListener("input", (ev) => {
  if (ev.target.id === "notes") {
    const id = $("#fiche").dataset.id;
    suivi[id] = { ...(suivi[id] || {}), notes: ev.target.value };
    store.set("suivi", suivi);
  }
});
document.addEventListener("keydown", (ev) => { if (ev.key === "Escape") fermerFiche(); });
$("#q").addEventListener("input", afficherListe);
$("#tri").addEventListener("change", () => { store.set("tri", $("#tri").value); afficherListe(); });
$("#export").addEventListener("click", exporterCSV);

$("#tri").value = store.get("tri", "score");
initProfil();
changerVue(store.get("vue", "liste"));
charger();

if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
