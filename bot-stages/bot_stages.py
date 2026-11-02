#!/usr/bin/env python3
"""
Bot de recherche d'entreprises informatiques pour un stage
autour des Sables-d'Olonne (Vendée, 85).

Source des données : API publique « Recherche d'entreprises »
(https://recherche-entreprises.api.gouv.fr) — gratuite, sans clé.

Usage :
    python bot_stages.py                     # rayon 15 km, sortie dans ./resultats
    python bot_stages.py --rayon 30          # élargir la zone
    python bot_stages.py --min-salaries 3    # entreprises d'au moins 3 salariés
"""
from __future__ import annotations

import argparse
import csv
import json
import os
import math
import sys
import time
import urllib.parse
import urllib.request
from dataclasses import dataclass, asdict, field
from datetime import date
from pathlib import Path

import contacts

API_URL = "https://recherche-entreprises.api.gouv.fr"

# Centre-ville des Sables-d'Olonne
LAT_SABLES = 46.4967
LON_SABLES = -1.7834
CODE_COMMUNE_SABLES = "85194"  # commune nouvelle (Les Sables + Olonne + Château-d'Olonne)

# Codes NAF des métiers de l'informatique / du numérique
CODES_NAF = {
    "62.01Z": "Programmation informatique",
    "62.02A": "Conseil en systèmes et logiciels informatiques",
    "62.02B": "Tierce maintenance de systèmes et d'applications",
    "62.03Z": "Gestion d'installations informatiques",
    "62.09Z": "Autres activités informatiques",
    "63.11Z": "Traitement de données, hébergement",
    "63.12Z": "Portails Internet",
    "58.21Z": "Édition de jeux électroniques",
    "58.29A": "Édition de logiciels système et de réseau",
    "58.29B": "Édition de logiciels outils de développement",
    "58.29C": "Édition de logiciels applicatifs",
    "95.11Z": "Réparation d'ordinateurs et d'équipements périphériques",
    "47.41Z": "Commerce de détail d'ordinateurs et de logiciels",
    "46.51Z": "Commerce de gros d'ordinateurs et de logiciels",
    "61.10Z": "Télécommunications filaires",
    "61.90Z": "Autres activités de télécommunication",
    "73.11Z": "Agences de publicité (web / digital)",
}

# Tranches d'effectif INSEE -> (libellé, nombre minimal de salariés)
TRANCHES_EFFECTIF = {
    "NN": ("Non renseigné", None),
    "00": ("0 salarié", 0),
    "01": ("1 ou 2 salariés", 1),
    "02": ("3 à 5 salariés", 3),
    "03": ("6 à 9 salariés", 6),
    "11": ("10 à 19 salariés", 10),
    "12": ("20 à 49 salariés", 20),
    "21": ("50 à 99 salariés", 50),
    "22": ("100 à 199 salariés", 100),
    "31": ("200 à 249 salariés", 200),
    "32": ("250 à 499 salariés", 250),
    "41": ("500 à 999 salariés", 500),
    "42": ("1 000 à 1 999 salariés", 1000),
    "51": ("2 000 à 4 999 salariés", 2000),
    "52": ("5 000 à 9 999 salariés", 5000),
    "53": ("10 000 salariés et plus", 10000),
}


@dataclass
class Entreprise:
    siren: str
    siret: str
    nom: str
    activite: str
    code_naf: str
    effectif: str
    effectif_min: int | None
    adresse: str
    code_postal: str
    commune: str
    distance_km: float | None
    date_creation: str
    dirigeants: str
    enseigne: str = ""
    latitude: float | None = None
    longitude: float | None = None
    site: str = ""
    email: str = ""
    telephone: str = ""
    source_contact: str = ""
    score: int = 0
    liens: dict = field(default_factory=dict)


# --------------------------------------------------------------------------- #
# Accès à l'API
# --------------------------------------------------------------------------- #
def appeler_api(chemin: str, params: dict, essais: int = 4) -> dict:
    """GET JSON avec gestion du quota (7 requêtes/s) et des erreurs 429."""
    url = f"{API_URL}{chemin}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, headers={"User-Agent": "bot-stages-sables/1.0"})
    for tentative in range(essais):
        try:
            with urllib.request.urlopen(req, timeout=30) as rep:
                return json.loads(rep.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            if e.code == 429 or e.code >= 500:
                time.sleep(2 ** tentative)
                continue
            raise
        except urllib.error.URLError:
            if tentative == essais - 1:
                raise
            time.sleep(2 ** tentative)
    raise RuntimeError(f"Échec de l'appel à {url}")


def recuperer_toutes_pages(chemin: str, params: dict, max_pages: int = 20) -> list[dict]:
    resultats: list[dict] = []
    page = 1
    while page <= max_pages:
        data = appeler_api(chemin, {**params, "page": page, "per_page": 25})
        resultats.extend(data.get("results", []))
        if page >= data.get("total_pages", 1):
            break
        page += 1
        time.sleep(0.2)  # respect du quota de l'API
    return resultats


# --------------------------------------------------------------------------- #
# Traitement
# --------------------------------------------------------------------------- #
def distance_km(lat1, lon1, lat2, lon2) -> float | None:
    try:
        lat1, lon1, lat2, lon2 = map(float, (lat1, lon1, lat2, lon2))
    except (TypeError, ValueError):
        return None
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = math.radians(lat2 - lat1), math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return round(2 * r * math.asin(math.sqrt(a)), 1)


def calculer_score(e: Entreprise) -> int:
    """Plus le score est élevé, plus l'entreprise a de chances de prendre un stagiaire."""
    score = 0
    if e.effectif_min is not None:
        if e.effectif_min >= 50:
            score += 40
        elif e.effectif_min >= 10:
            score += 30
        elif e.effectif_min >= 3:
            score += 20
        elif e.effectif_min >= 1:
            score += 10
    if e.code_naf in ("62.01Z", "62.02A", "58.29C", "62.02B", "62.03Z", "63.11Z"):
        score += 20  # cœur de métier développement / réseau
    elif e.code_naf in CODES_NAF:
        score += 10
    if e.distance_km is not None:
        score += max(0, 20 - int(e.distance_km))
    if e.email:
        score += 10
    if e.telephone:
        score += 5
    return score


def construire_liens(nom: str, commune: str, siren: str) -> dict:
    q = urllib.parse.quote_plus(f"{nom} {commune}")
    return {
        "google": f"https://www.google.com/search?q={q}",
        "maps": f"https://www.google.com/maps/search/?api=1&query={q}",
        "linkedin": f"https://www.linkedin.com/search/results/companies/?keywords={urllib.parse.quote(nom)}",
        "annuaire": f"https://annuaire-entreprises.data.gouv.fr/entreprise/{siren}",
    }


def _float(v) -> float | None:
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def normaliser_simple(t: str) -> str:
    return contacts.normaliser(t).replace(" ", "")


def convertir(resultat: dict, lat0: float, lon0: float) -> list[Entreprise]:
    """Transforme un résultat API en une fiche par établissement situé dans la zone."""
    etablissements = resultat.get("matching_etablissements") or [resultat.get("siege") or {}]
    dirigeants = ", ".join(
        " ".join(filter(None, [d.get("prenoms"), d.get("nom")])) or d.get("denomination", "")
        for d in (resultat.get("dirigeants") or [])[:3]
    )
    nom = resultat.get("nom_complet") or resultat.get("nom_raison_sociale") or "?"
    fiches = []
    for et in etablissements:
        if not et:
            continue
        if et.get("etat_administratif", "A") != "A":
            continue
        code_naf = et.get("activite_principale") or resultat.get("activite_principale") or ""
        tranche = (
            et.get("tranche_effectif_salarie")
            or resultat.get("tranche_effectif_salarie")
            or "NN"
        )
        lib_eff, eff_min = TRANCHES_EFFECTIF.get(tranche, ("Non renseigné", None))
        enseignes = [x for x in (et.get("liste_enseignes") or []) if x]
        enseigne = et.get("nom_commercial") or (enseignes[0] if enseignes else "")
        if enseigne and enseigne.isupper():
            enseigne = enseigne.title()
        fiche = Entreprise(
            siren=resultat.get("siren", ""),
            siret=et.get("siret", ""),
            nom=nom.title() if nom.isupper() else nom,
            activite=CODES_NAF.get(code_naf, code_naf),
            code_naf=code_naf,
            effectif=lib_eff,
            effectif_min=eff_min,
            adresse=et.get("adresse", ""),
            code_postal=et.get("code_postal", ""),
            commune=et.get("libelle_commune", ""),
            distance_km=distance_km(lat0, lon0, et.get("latitude"), et.get("longitude")),
            date_creation=et.get("date_creation") or resultat.get("date_creation") or "",
            dirigeants=dirigeants,
            enseigne=enseigne if normaliser_simple(enseigne) != normaliser_simple(nom) else "",
            latitude=_float(et.get("latitude")),
            longitude=_float(et.get("longitude")),
        )
        fiche.score = calculer_score(fiche)
        fiche.liens = construire_liens(fiche.enseigne or fiche.nom, fiche.commune, fiche.siren)
        fiches.append(fiche)
    return fiches


def rechercher(rayon_km: float, codes_naf: list[str], lat: float, lon: float) -> list[Entreprise]:
    naf = ",".join(codes_naf)
    print(f"🔎 Recherche dans un rayon de {rayon_km} km autour des Sables-d'Olonne…")
    bruts = recuperer_toutes_pages(
        "/near_point",
        {"lat": lat, "long": lon, "radius": rayon_km, "activite_principale": naf},
    )
    print(f"   {len(bruts)} entreprises trouvées autour du point.")

    print("🔎 Recherche complémentaire sur la commune des Sables-d'Olonne…")
    bruts += recuperer_toutes_pages(
        "/search",
        {"code_commune": CODE_COMMUNE_SABLES, "activite_principale": naf,
         "etat_administratif": "A"},
    )

    vues: dict[str, Entreprise] = {}
    for r in bruts:
        if r.get("etat_administratif", "A") != "A":
            continue
        for e in convertir(r, lat, lon):
            if e.distance_km is not None and e.distance_km > rayon_km:
                continue
            cle = e.siret or e.siren
            if cle not in vues:
                vues[cle] = e
    return sorted(vues.values(), key=lambda e: (-e.score, e.distance_km or 999, e.nom))


# --------------------------------------------------------------------------- #
# Exports
# --------------------------------------------------------------------------- #
COLONNES_CSV = ["score", "nom", "enseigne", "email", "telephone", "site", "activite", "code_naf", "effectif", "adresse", "code_postal",
                "commune", "distance_km", "date_creation", "dirigeants", "siren", "siret",
                "source_contact", "lien_google", "lien_maps", "lien_linkedin", "lien_annuaire",
                "contacte", "date_contact", "reponse", "notes"]


def exporter_csv(entreprises: list[Entreprise], chemin: Path) -> None:
    with chemin.open("w", newline="", encoding="utf-8-sig") as f:  # utf-8-sig => Excel OK
        w = csv.DictWriter(f, fieldnames=COLONNES_CSV, delimiter=";")
        w.writeheader()
        for e in entreprises:
            d = asdict(e)
            liens = d.pop("liens")
            for k in ("effectif_min", "latitude", "longitude"):
                d.pop(k)
            d.update({f"lien_{k}": v for k, v in liens.items()})
            d.update({"contacte": "", "date_contact": "", "reponse": "", "notes": ""})
            w.writerow(d)


def exporter_markdown(entreprises: list[Entreprise], chemin: Path, rayon: float) -> None:
    lignes = [
        f"# Entreprises informatiques — stage aux Sables-d'Olonne",
        "",
        f"*Généré le {date.today():%d/%m/%Y} — rayon {rayon:g} km — "
        f"{len(entreprises)} établissements.*",
        "",
        "Score : plus il est élevé, plus l'entreprise est susceptible d'accueillir un "
        "stagiaire (taille, activité, proximité).",
        "",
        "| # | Score | Entreprise | Contact | Activité | Effectif | Commune | Distance | Liens |",
        "|---|------:|------------|---------|----------|----------|---------|---------:|-------|",
    ]
    for i, e in enumerate(entreprises, 1):
        dist = f"{e.distance_km:g} km" if e.distance_km is not None else "?"
        liens = (f"[Google]({e.liens['google']}) · [Plan]({e.liens['maps']}) · "
                 f"[LinkedIn]({e.liens['linkedin']}) · [Fiche]({e.liens['annuaire']})")
        nom = (e.enseigne or e.nom).replace("|", "/")
        contact = "<br>".join(filter(None, [e.email, e.telephone,
                                            f"[site]({e.site})" if e.site else ""])) or "—"
        lignes.append(f"| {i} | {e.score} | **{nom}** | {contact} | {e.activite} | "
                      f"{e.effectif} | {e.commune} | {dist} | {liens} |")
    lignes += [
        "",
        "## Conseils pour candidater",
        "",
        "1. Commence par les scores les plus élevés, mais n'oublie pas les petites "
        "structures : elles prennent souvent des stagiaires de 3e/seconde/BTS.",
        "2. Clique sur **Google** pour trouver le site et l'adresse e-mail de contact.",
        "3. Appelle ou passe directement à l'accueil avec ton CV : ça marche mieux qu'un mail.",
        "4. Note tes démarches dans les colonnes *contacte / reponse / notes* du fichier CSV.",
        "",
    ]
    chemin.write_text("\n".join(lignes), encoding="utf-8")


def exporter_json(entreprises: list[Entreprise], chemin: Path, rayon: float) -> None:
    donnees = {
        "genere_le": date.today().isoformat(),
        "rayon_km": rayon,
        "centre": {"lat": LAT_SABLES, "lon": LON_SABLES, "nom": "Les Sables-d'Olonne"},
        "entreprises": [{k: v for k, v in asdict(e).items()} for e in entreprises],
    }
    chemin.write_text(json.dumps(donnees, ensure_ascii=False, indent=1), encoding="utf-8")


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description="Trouve des entreprises informatiques pour un "
                                            "stage autour des Sables-d'Olonne.")
    p.add_argument("--rayon", type=float, default=15, help="rayon en km (max 50, défaut 15)")
    p.add_argument("--min-salaries", type=int, default=0,
                   help="effectif minimal (exclut les effectifs non renseignés si > 0)")
    p.add_argument("--sans-commerce", action="store_true",
                   help="exclure commerce, télécoms et agences de pub (garde le cœur informatique)")
    p.add_argument("--sortie", default="resultats", help="dossier de sortie")
    p.add_argument("--sans-contacts", action="store_true",
                   help="ne pas chercher e-mails / téléphones / sites (plus rapide)")
    p.add_argument("--max-recherches", type=int, default=int(os.environ.get("MAX_RECHERCHES", 300)),
                   help="nombre max d'entreprises à rechercher sur le web par lancement")
    p.add_argument("--lat", type=float, default=LAT_SABLES)
    p.add_argument("--lon", type=float, default=LON_SABLES)
    args = p.parse_args(argv)

    rayon = max(0.5, min(args.rayon, 50))
    codes = list(CODES_NAF)
    if args.sans_commerce:
        codes = [c for c in codes if c.startswith(("62", "63", "58", "95"))]

    try:
        entreprises = rechercher(rayon, codes, args.lat, args.lon)
    except Exception as exc:  # noqa: BLE001
        print(f"❌ Erreur lors de l'interrogation de l'API : {exc}", file=sys.stderr)
        return 1

    if args.min_salaries > 0:
        entreprises = [e for e in entreprises
                       if e.effectif_min is not None and e.effectif_min >= args.min_salaries]

    sortie = Path(args.sortie)
    sortie.mkdir(parents=True, exist_ok=True)

    if not args.sans_contacts:
        contacts.enrichir(entreprises, sortie / "cache_contacts.json", args.lat, args.lon,
                          rayon, max_recherches=args.max_recherches)
        for e in entreprises:
            e.score = calculer_score(e)
        entreprises.sort(key=lambda e: (-e.score, e.distance_km or 999, e.nom))

    exporter_csv(entreprises, sortie / "entreprises_stage.csv")
    exporter_markdown(entreprises, sortie / "entreprises_stage.md", rayon)
    exporter_json(entreprises, sortie / "entreprises.json", rayon)

    print(f"✅ {len(entreprises)} établissements retenus.")
    for e in entreprises[:10]:
        print(f"   [{e.score:>3}] {e.enseigne or e.nom} — {e.commune} ({e.effectif}) "
              f"{e.email} {e.telephone}")
    print(f"📄 Résultats : {sortie / 'entreprises_stage.csv'} et {sortie / 'entreprises_stage.md'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
