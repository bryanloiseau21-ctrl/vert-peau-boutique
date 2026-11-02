# 🤖 Bot stages informatique — Les Sables-d'Olonne

Ce bot cherche les **entreprises de l'informatique et du numérique** autour des
Sables-d'Olonne (Vendée) pour t'aider à trouver un stage.

Il trouve aussi leurs **e-mails, téléphones et sites web**, et tout s'affiche dans une
**appli pour iPhone** avec appel, e-mail de candidature pré-rempli, plan et suivi de tes démarches.

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

## 📱 L'appli sur ton iPhone

### Mise en place (une seule fois)

1. Sur GitHub, va dans **Settings**, puis **Pages**. Dans **Source**, choisis **GitHub Actions**.
   GitHub Pages gratuit exige un dépôt **public**.
2. Va dans l'onglet **Actions**, choisis **Bot stages informatique**, puis **Run workflow**
   sur la branche principale. Compte 10 à 40 minutes la première fois, le temps de chercher
   les contacts.
3. L'adresse de l'appli s'affiche à la fin du run, sous la forme
   `https://<ton-pseudo>.github.io/vert-peau-boutique/`.

### L'installer sur l'iPhone

1. Ouvre l'adresse dans **Safari**.
2. Appuie sur le bouton **Partager** (le carré avec une flèche).
3. Choisis **Sur l'écran d'accueil**, puis **Ajouter**.

L'icône « Stages Info » apparaît comme une vraie appli, et elle marche même hors connexion.

### Ce qu'elle fait

- **Entreprises** : recherche, filtres (avec e-mail, avec téléphone, avec salariés, pas encore
  contactées) et tri par pertinence, distance ou nom.
- **Fiche** : boutons Appeler, E-mail, Site et Plan (Apple Plans). Le bouton E-mail ouvre Mail
  avec ta **lettre de candidature déjà écrite** au nom de l'entreprise. Il ne reste qu'à joindre
  ton CV.
- **Suivi** : statut de chaque entreprise (contactée, relancée, entretien, acceptée, refusée),
  notes, liste « à relancer » après 7 jours, et export CSV.
- **Profil** : ton nom, ta formation, tes dates de stage, et le modèle d'e-mail modifiable.

Ton suivi et ton profil restent **sur ton téléphone**. Ils ne sont envoyés nulle part.

## Sans rien installer (GitHub Actions)

Onglet **Actions**, puis **Bot stages informatique**, puis **Run workflow**. Choisis le rayon,
attends environ 1 minute, puis télécharge l'archive **resultats-stages** en bas de la page
du run. Le bot se relance aussi tout seul chaque lundi.

## Activités recherchées (codes NAF)

Programmation (62.01Z), conseil informatique (62.02A), maintenance (62.02B, 62.03Z,
62.09Z), hébergement (63.11Z), portails web (63.12Z), édition de logiciels et de jeux
(58.2x), réparation d'ordinateurs (95.11Z), commerce informatique (47.41Z, 46.51Z),
télécoms (61.x) et agences web/pub (73.11Z).

## Comment sont trouvés les contacts

1. **OpenStreetMap** : e-mail, téléphone ou site quand l'entreprise y est renseignée.
2. **Moteur de recherche** (DuckDuckGo, puis Bing) : sert à trouver le site officiel. Les
   annuaires comme societe.com ou PagesJaunes sont ignorés.
3. **Le site de l'entreprise** : le bot lit la page d'accueil, puis les pages *contact* et
   *mentions légales*, et en extrait les e-mails et téléphones publiés.

Les contacts sont gardés en cache pendant 30 jours. `--sans-contacts` désactive cette étape,
et `--max-recherches 50` limite le nombre de recherches web par lancement.

## Limites

- Les contacts ne sont **pas trouvés pour toutes les entreprises**. Beaucoup de petites
  structures n'ont pas de site. Pour celles-là, appelle ou passe déposer ton CV.
- Le site est choisi d'après le nom de l'entreprise : vérifie qu'il s'agit bien de la bonne
  avant d'envoyer un e-mail.
- Beaucoup de lignes sont des **auto-entrepreneurs (0 salarié)**. Ils prennent rarement des
  stagiaires, donc utilise `--min-salaries 1`.
- Des entreprises non informatiques ont aussi un service informatique : mairie, hôpital,
  grandes PME du coin. Pense à les contacter aussi.

## Tests

```bash
pip install pytest && python -m pytest -q tests
```
