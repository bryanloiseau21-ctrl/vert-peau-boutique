import csv
import sys
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import bot_stages as bot  # noqa: E402


def fake_result(siren, nom, naf, tranche, lat, lon, commune="LES SABLES-D'OLONNE", actif="A"):
    return {
        "siren": siren, "nom_complet": nom, "activite_principale": naf,
        "tranche_effectif_salarie": tranche, "etat_administratif": actif,
        "dirigeants": [{"prenoms": "Jean", "nom": "DUPONT"}],
        "matching_etablissements": [{
            "siret": siren + "00011", "adresse": "1 RUE DU PORT 85100 LES SABLES-D'OLONNE",
            "code_postal": "85100", "libelle_commune": commune, "latitude": str(lat),
            "longitude": str(lon), "activite_principale": naf, "etat_administratif": "A",
        }],
    }


def fake_api(chemin, params, essais=4):
    if chemin == "/near_point":
        return {"total_pages": 1, "results": [
            fake_result("111111111", "WEB OCEAN", "62.01Z", "11", 46.50, -1.78),
            fake_result("222222222", "PETIT DEPANNAGE PC", "95.11Z", "00", 46.53, -1.70,
                        "OLONNE"),
            fake_result("333333333", "FERMEE SARL", "62.01Z", "12", 46.50, -1.78, actif="C"),
            fake_result("444444444", "TROP LOIN", "62.01Z", "21", 47.20, -1.55, "NANTES"),
        ]}
    return {"total_pages": 1, "results": [
        fake_result("111111111", "WEB OCEAN", "62.01Z", "11", 46.50, -1.78),  # doublon
    ]}


def test_recherche_filtre_trie_et_deduplique():
    with mock.patch.object(bot, "appeler_api", side_effect=fake_api):
        res = bot.rechercher(15, list(bot.CODES_NAF), bot.LAT_SABLES, bot.LON_SABLES)
    noms = [e.nom for e in res]
    assert noms == ["Web Ocean", "Petit Depannage Pc"]
    assert res[0].score > res[1].score
    assert res[0].effectif == "10 à 19 salariés"
    assert res[0].dirigeants == "Jean DUPONT"


def test_main_ecrit_csv_et_markdown(tmp_path):
    with mock.patch.object(bot, "appeler_api", side_effect=fake_api):
        code = bot.main(["--sortie", str(tmp_path), "--min-salaries", "3"])
    assert code == 0
    with (tmp_path / "entreprises_stage.csv").open(encoding="utf-8-sig") as f:
        lignes = list(csv.DictReader(f, delimiter=";"))
    assert [l["nom"] for l in lignes] == ["Web Ocean"]
    assert lignes[0]["lien_annuaire"].endswith("/111111111")
    md = (tmp_path / "entreprises_stage.md").read_text(encoding="utf-8")
    assert "**Web Ocean**" in md


def test_distance():
    assert bot.distance_km(46.4967, -1.7834, 46.4967, -1.7834) == 0
    assert 60 < bot.distance_km(46.4967, -1.7834, 47.2184, -1.5536) < 90
    assert bot.distance_km(None, 1, 2, 3) is None
