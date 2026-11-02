# 🤖 Bot stages informatique — Les Sables-d'Olonne

Ce bot cherche les **entreprises de l'informatique et du numérique** autour des
Sables-d'Olonne (Vendée) pour t'aider à trouver un stage.

Il interroge l'API officielle et gratuite
[Recherche d'entreprises](https://recherche-entreprises.api.gouv.fr) (données INSEE/SIRENE),
garde les établissements **actifs**, et sort une liste triée par « score » (taille,
activité, distance).

## Utilisation

Il faut seulement Python 3.9 ou plus récent (aucune bibliothèque à installer).

```bash
cd bot-stages
python bot_stages.py                       # rayon de 15 km
python bot_stages.py --rayon 30            # jusqu'à La Roche-sur-Yon / Challans
python bot_stages.py --min-salaries 3      # entreprises d'au moins 3 salariés
python bot_stages.py --sans-commerce       # uniquement dev / réseau / hébergement / dépannage
```

Résultats dans `resultats/` :

- `entreprises_stage.csv` : à ouvrir dans Excel ou LibreOffice. Il contient des colonnes
  *contacte / date_contact / reponse / notes* pour suivre tes candidatures.
- `entreprises_stage.md` : un tableau lisible avec des liens vers Google, Google Maps,
  LinkedIn et la fiche officielle de chaque entreprise.

## Sans rien installer (GitHub Actions)

Onglet **Actions**, puis **Bot stages informatique**, puis **Run workflow**. Choisis le rayon,
attends environ 1 minute, puis télécharge l'archive **resultats-stages** en bas de la page
du run. Le bot se relance aussi tout seul chaque lundi.

## Activités recherchées (codes NAF)

Programmation (62.01Z), conseil informatique (62.02A), maintenance (62.02B, 62.03Z,
62.09Z), hébergement (63.11Z), portails web (63.12Z), édition de logiciels et de jeux
(58.2x), réparation d'ordinateurs (95.11Z), commerce informatique (47.41Z, 46.51Z),
télécoms (61.x) et agences web/pub (73.11Z).

## Limites

- L'API ne donne **ni e-mail ni téléphone**. Utilise le lien Google de chaque ligne pour
  trouver le site de l'entreprise.
- Beaucoup de lignes sont des **auto-entrepreneurs (0 salarié)**. Ils prennent rarement des
  stagiaires, donc utilise `--min-salaries 1`.
- Des entreprises non informatiques ont aussi un service informatique : mairie, hôpital,
  grandes PME du coin. Pense à les contacter aussi.

## Tests

```bash
pip install pytest && python -m pytest -q tests
```
