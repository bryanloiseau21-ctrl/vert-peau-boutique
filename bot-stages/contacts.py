"""
Recherche des coordonnées (site web, e-mail, téléphone) des entreprises.

Sources, dans l'ordre :
1. OpenStreetMap (API Overpass) : beaucoup de commerces et bureaux y ont
   e-mail / téléphone / site renseignés.
2. Moteur de recherche (DuckDuckGo, puis Bing) pour trouver le site officiel.
3. Lecture de la page d'accueil + pages « contact » / « mentions légales »
   pour en extraire e-mails et téléphones publiés par l'entreprise.

Les résultats sont mis en cache (JSON) pour ne pas tout re-scanner à chaque run.
"""
from __future__ import annotations

import html
import json
import re
import time
import unicodedata
import urllib.parse
import urllib.request
from datetime import date, datetime
from pathlib import Path

UA = ("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 "
      "(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1")
TIMEOUT = 12
DUREE_CACHE_JOURS = 30

# Sites d'annuaires / réseaux sociaux à ne pas prendre pour le site officiel
DOMAINES_EXCLUS = (
    "societe.com", "pagesjaunes", "linkedin", "facebook", "instagram", "twitter", "x.com",
    "annuaire-entreprises", "pappers", "infogreffe", "verif.com", "manageo", "kompass",
    "corporama", "societeinfo", "lefigaro", "bfmtv", "youtube", "google.", "bing.",
    "duckduckgo", "wikipedia", "indeed", "welcometothejungle", "hellowork", "data.gouv",
    "entreprises.lefigaro", "score3", "lagazettefrance", "infonet", "dun", "mappy",
    "118712", "118000", "justacote", "yelp", "tripadvisor", "doctrine.fr", "annuaire",
    "net-entreprises", "economie.gouv", "insee.fr", "sirene", "bodacc", "france-annuaire",
    "infobel", "hoodspot", "cylex", "ouestfrance-immo", "leboncoin", "malt.fr", "codeur.com",
)
EMAILS_EXCLUS = ("example.", "domain.", "email.com", "sentry", "wixpress", "@2x", "your",
                 "votre", "exemple", "nom@", "user@", "test@", "godaddy", "cloudflare")
FORMES_JURIDIQUES = {"sarl", "sas", "sasu", "eurl", "sa", "sci", "ets", "eirl", "ei", "snc",
                     "scop", "selarl", "et", "de", "la", "le", "les", "du", "des", "l", "d",
                     "societe", "entreprise", "groupe", "france", "ouest"}

RE_EMAIL = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
RE_TEL = re.compile(r"(?<![\d])(?:\+33\s?\(?0?\)?\s?|0)[1-9](?:[\s.\-]?\d{2}){4}(?![\d])")
RE_LIEN = re.compile(r"""href=["']([^"'#]+)["'][^>]*>(.*?)</a>""", re.I | re.S)
RE_CFEMAIL = re.compile(r'data-cfemail="([0-9a-f]+)"', re.I)


# --------------------------------------------------------------------------- #
# Outils
# --------------------------------------------------------------------------- #
def normaliser(texte: str) -> str:
    t = unicodedata.normalize("NFKD", texte or "").encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", " ", t.lower()).strip()


def mots_cles(nom: str) -> list[str]:
    return [m for m in normaliser(nom).split() if len(m) >= 3 and m not in FORMES_JURIDIQUES]


def telecharger(url: str, max_octets: int = 600_000) -> str | None:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": UA,
                                                   "Accept-Language": "fr-FR,fr;q=0.9"})
        with urllib.request.urlopen(req, timeout=TIMEOUT) as rep:
            if "html" not in (rep.headers.get("Content-Type") or "html"):
                return None
            brut = rep.read(max_octets)
            enc = rep.headers.get_content_charset() or "utf-8"
            return brut.decode(enc, errors="replace")
    except Exception:  # noqa: BLE001 — un site injoignable ne doit pas arrêter le bot
        return None


def domaine(url: str) -> str:
    d = urllib.parse.urlparse(url).netloc.lower()
    return d[4:] if d.startswith("www.") else d


def est_exclu(url: str) -> bool:
    d = domaine(url)
    return not d or any(x in d for x in DOMAINES_EXCLUS)


def formater_tel(tel: str) -> str:
    chiffres = re.sub(r"\D", "", tel)
    if chiffres.startswith("33"):
        chiffres = "0" + chiffres[2:].lstrip("0")
    if len(chiffres) != 10:
        return tel.strip()
    return " ".join(chiffres[i:i + 2] for i in range(0, 10, 2))


def decoder_cfemail(code: str) -> str:
    cle = int(code[:2], 16)
    return "".join(chr(int(code[i:i + 2], 16) ^ cle) for i in range(2, len(code), 2))


# --------------------------------------------------------------------------- #
# Extraction depuis une page HTML
# --------------------------------------------------------------------------- #
def extraire_emails(page: str) -> list[str]:
    texte = html.unescape(page)
    texte = re.sub(r"\s*[\[\(]\s*(?:at|arobase)\s*[\]\)]\s*", "@", texte, flags=re.I)
    texte = re.sub(r"\s*[\[\(]\s*(?:dot|point)\s*[\]\)]\s*", ".", texte, flags=re.I)
    trouves = RE_EMAIL.findall(texte)
    trouves += [decoder_cfemail(c) for c in RE_CFEMAIL.findall(page)]
    propres = []
    for e in trouves:
        e = e.strip(".").lower()
        if e.endswith((".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".css", ".js")):
            continue
        if any(x in e for x in EMAILS_EXCLUS):
            continue
        if e not in propres:
            propres.append(e)
    return propres


def extraire_tels(page: str) -> list[str]:
    texte = re.sub(r"<[^>]+>", " ", html.unescape(page))
    texte += " " + " ".join(re.findall(r'href=["\']tel:([^"\']+)', page, re.I))
    tels = []
    for t in RE_TEL.findall(texte):
        f = formater_tel(t)
        if f not in tels and not f.startswith("08 9"):  # numéros surtaxés
            tels.append(f)
    return tels


def liens_contact(page: str, base: str) -> list[str]:
    liens = []
    for href, texte in RE_LIEN.findall(page):
        cible = (href + " " + re.sub(r"<[^>]+>", "", texte)).lower()
        if re.search(r"contact|mentions|legal|a-propos|about|qui-sommes|nous-trouver", cible):
            url = urllib.parse.urljoin(base, href)
            if domaine(url) == domaine(base) and url not in liens:
                liens.append(url)
    return liens[:3]


def scanner_site(url: str) -> dict:
    """Lit l'accueil et jusqu'à 3 pages contact/mentions. Renvoie emails & tels."""
    emails: list[str] = []
    tels: list[str] = []
    accueil = telecharger(url)
    if accueil is None:
        return {"emails": [], "tels": [], "ok": False}
    pages = [accueil]
    for lien in liens_contact(accueil, url):
        time.sleep(0.3)
        p = telecharger(lien)
        if p:
            pages.append(p)
    for p in pages:
        emails += [e for e in extraire_emails(p) if e not in emails]
        tels += [t for t in extraire_tels(p) if t not in tels]
    # On privilégie les e-mails du même domaine que le site
    dom = domaine(url)
    emails.sort(key=lambda e: (0 if e.split("@")[1].endswith(dom.split(".", 1)[-1]) else 1))
    return {"emails": emails[:3], "tels": tels[:3], "ok": True}


# --------------------------------------------------------------------------- #
# Trouver le site officiel
# --------------------------------------------------------------------------- #
def resultats_recherche(requete: str) -> list[str]:
    q = urllib.parse.quote_plus(requete)
    urls: list[str] = []
    page = telecharger(f"https://html.duckduckgo.com/html/?q={q}&kl=fr-fr")
    if page:
        for lien in re.findall(r'class="result__a"[^>]*href="([^"]+)"', page):
            lien = html.unescape(lien)
            if "uddg=" in lien:
                lien = urllib.parse.unquote(lien.split("uddg=")[1].split("&")[0])
            urls.append(lien)
    if not urls:
        page = telecharger(f"https://www.bing.com/search?q={q}&setlang=fr&cc=FR")
        if page:
            urls = [html.unescape(u) for u in
                    re.findall(r'<li class="b_algo".*?<a[^>]+href="(https?://[^"]+)"', page, re.S)]
    return urls


def site_correspond(url: str, noms: list[str]) -> bool:
    d = normaliser(domaine(url).rsplit(".", 1)[0]).replace(" ", "")
    for nom in noms:
        mots = mots_cles(nom)
        colle = "".join(mots)
        if colle and len(colle) >= 4 and colle in d:
            return True
        if any(len(m) >= 4 and m in d for m in mots):
            return True
    return False


def trouver_site(noms: list[str], commune: str) -> str | None:
    principal = next((n for n in noms if n), "")
    for url in resultats_recherche(f"{principal} {commune}")[:8]:
        if url.startswith("http") and not est_exclu(url) and site_correspond(url, noms):
            p = urllib.parse.urlparse(url)
            return f"{p.scheme}://{p.netloc}/"
    return None


# --------------------------------------------------------------------------- #
# OpenStreetMap
# --------------------------------------------------------------------------- #
def charger_osm(lat: float, lon: float, rayon_km: float) -> dict[str, dict]:
    r = int(rayon_km * 1000)
    requete = f"""[out:json][timeout:90];
(nwr(around:{r},{lat},{lon})["name"]["office"];
 nwr(around:{r},{lat},{lon})["name"]["shop"];
 nwr(around:{r},{lat},{lon})["name"]["craft"];);
out tags;"""
    try:
        req = urllib.request.Request(
            "https://overpass-api.de/api/interpreter",
            data=urllib.parse.urlencode({"data": requete}).encode(),
            headers={"User-Agent": "bot-stages-sables/1.0"},
        )
        with urllib.request.urlopen(req, timeout=120) as rep:
            data = json.loads(rep.read().decode())
    except Exception:  # noqa: BLE001
        return {}
    index = {}
    for el in data.get("elements", []):
        t = el.get("tags", {})
        infos = {
            "email": t.get("email") or t.get("contact:email"),
            "tel": t.get("phone") or t.get("contact:phone"),
            "site": t.get("website") or t.get("contact:website"),
        }
        if any(infos.values()):
            index[normaliser(t["name"])] = infos
    return index


def chercher_osm(index: dict[str, dict], noms: list[str]) -> dict | None:
    for nom in noms:
        n = normaliser(nom)
        if n and n in index:
            return index[n]
        mots = set(mots_cles(nom))
        if not mots:
            continue
        for cle, infos in index.items():
            autres = set(mots_cles(cle))
            if autres and mots == autres:
                return infos
    return None


# --------------------------------------------------------------------------- #
# Point d'entrée
# --------------------------------------------------------------------------- #
def enrichir(entreprises: list, cache_path: Path, lat: float, lon: float, rayon_km: float,
             max_recherches: int = 300) -> None:
    """Complète site / email / telephone de chaque entreprise (modifie la liste)."""
    try:
        cache = json.loads(cache_path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        cache = {}
    aujourd_hui = date.today()

    print("🌍 Chargement des données OpenStreetMap…")
    osm = charger_osm(lat, lon, rayon_km)
    print(f"   {len(osm)} lieux avec coordonnées dans OSM.")

    recherches = 0
    for i, e in enumerate(entreprises, 1):
        cle = e.siret or e.siren
        c = cache.get(cle)
        if c:
            age = (aujourd_hui - datetime.strptime(c["date"], "%Y-%m-%d").date()).days
            if age <= DUREE_CACHE_JOURS:
                e.site, e.email, e.telephone = c["site"], c["email"], c["telephone"]
                e.source_contact = c.get("source", "")
                continue

        noms = [n for n in (e.enseigne, e.nom) if n]
        site = email = tel = ""
        sources = []

        o = chercher_osm(osm, noms)
        if o:
            site, email, tel = o["site"] or "", o["email"] or "", o["tel"] or ""
            sources.append("OpenStreetMap")

        if recherches < max_recherches and (not email or not tel):
            recherches += 1
            print(f"   [{i}/{len(entreprises)}] {noms[0]}…", flush=True)
            if not site:
                site = trouver_site(noms, e.commune) or ""
                time.sleep(1.5)  # rester poli avec le moteur de recherche
            if site:
                if not site.startswith("http"):
                    site = "https://" + site
                scan = scanner_site(site)
                if scan["emails"] and not email:
                    email = scan["emails"][0]
                    sources.append("site web")
                if scan["tels"] and not tel:
                    tel = scan["tels"][0]
                    if "site web" not in sources:
                        sources.append("site web")

        e.site, e.email = site, email
        e.telephone = formater_tel(tel) if tel else ""
        e.source_contact = ", ".join(sources)
        cache[cle] = {"date": aujourd_hui.isoformat(), "site": e.site, "email": e.email,
                      "telephone": e.telephone, "source": e.source_contact}

    cache_path.parent.mkdir(parents=True, exist_ok=True)
    cache_path.write_text(json.dumps(cache, ensure_ascii=False, indent=1), encoding="utf-8")
    nb_mail = sum(1 for e in entreprises if e.email)
    nb_tel = sum(1 for e in entreprises if e.telephone)
    print(f"📇 Contacts : {nb_mail} e-mails, {nb_tel} téléphones sur {len(entreprises)}.")
