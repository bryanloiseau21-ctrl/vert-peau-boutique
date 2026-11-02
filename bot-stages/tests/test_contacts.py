import sys
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import bot_stages as bot  # noqa: E402
import contacts  # noqa: E402

ACCUEIL = """<html><body><a href="/contact">Nous contacter</a>
<a href="/mentions-legales">Mentions légales</a><img src="logo@2x.png">
<p>Appelez-nous au 02.51.95.12.34</p></body></html>"""
CONTACT = """<p>Écrivez à contact [at] webocean.fr ou
<a href="mailto:jobs@webocean.fr">jobs@webocean.fr</a></p>
<a href="tel:+33251951234">tel</a> <span data-cfemail="%s">[email protected]</span>"""


def cf(email, cle=0x42):
    return "%02x" % cle + "".join("%02x" % (ord(c) ^ cle) for c in email)


PAGES = {
    "https://www.webocean.fr/": ACCUEIL,
    "https://www.webocean.fr/contact": CONTACT % cf("rh@webocean.fr"),
    "https://www.webocean.fr/mentions-legales": "<p>SIRET 111</p>",
    "https://html.duckduckgo.com/html/?q=Web+Ocean+Les+Sables-d%27Olonne&kl=fr-fr":
        '<a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fwww.societe.com%2Fx">'
        '</a><a class="result__a" href="//duckduckgo.com/l/?uddg='
        'https%3A%2F%2Fwww.webocean.fr%2Fservices&rut=1">',
}


def fake_telecharger(url, max_octets=0):
    return PAGES.get(url)


def test_extraction_emails_et_tels():
    page = CONTACT % cf("rh@webocean.fr")
    emails = contacts.extraire_emails(page)
    assert emails == ["contact@webocean.fr", "jobs@webocean.fr", "rh@webocean.fr"]
    assert contacts.extraire_tels(ACCUEIL) == ["02 51 95 12 34"]
    assert contacts.formater_tel("+33 (0)2 51 95 12 34") == "02 51 95 12 34"


def test_trouver_site_ignore_annuaires():
    with mock.patch.object(contacts, "telecharger", side_effect=fake_telecharger):
        assert contacts.trouver_site(["Web Ocean"], "Les Sables-d'Olonne") == \
            "https://www.webocean.fr/"


def test_scanner_site():
    with mock.patch.object(contacts, "telecharger", side_effect=fake_telecharger), \
         mock.patch.object(contacts.time, "sleep"):
        r = contacts.scanner_site("https://www.webocean.fr/")
    assert r["emails"][0] == "contact@webocean.fr"
    assert r["tels"] == ["02 51 95 12 34"]


def test_enrichir_osm_puis_web_et_cache(tmp_path):
    e1 = bot.Entreprise("111111111", "11111111100011", "Web Ocean", "", "62.01Z", "", 10,
                        "", "85100", "Les Sables-d'Olonne", 1.0, "", "")
    e2 = bot.Entreprise("222222222", "22222222200011", "Jean Dupont", "", "95.11Z", "", 0,
                        "", "85340", "Olonne", 3.0, "", "", enseigne="Info Dépannage 85")
    osm = {"info depannage 85": {"email": "info@depannage85.fr", "tel": "0251000000",
                                 "site": None}}
    cache = tmp_path / "cache.json"
    with mock.patch.object(contacts, "telecharger", side_effect=fake_telecharger), \
         mock.patch.object(contacts, "charger_osm", return_value=osm), \
         mock.patch.object(contacts.time, "sleep"):
        contacts.enrichir([e1, e2], cache, 46.5, -1.78, 15)
    assert (e1.site, e1.email, e1.telephone) == \
        ("https://www.webocean.fr/", "contact@webocean.fr", "02 51 95 12 34")
    assert (e2.email, e2.telephone, e2.source_contact) == \
        ("info@depannage85.fr", "02 51 00 00 00", "OpenStreetMap")

    # 2e passage : tout vient du cache, aucun accès réseau
    e1.email = ""
    with mock.patch.object(contacts, "telecharger", side_effect=AssertionError), \
         mock.patch.object(contacts, "charger_osm", return_value={}):
        contacts.enrichir([e1], cache, 46.5, -1.78, 15)
    assert e1.email == "contact@webocean.fr"
