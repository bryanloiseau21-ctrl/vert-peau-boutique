# 🌻 Mon Potager

Appli pour suivre son potager **façon jeu** : on prend une photo, l'appli **détoure** le potager
(le fond disparaît) et le pose sur une **petite île flottante en 3D** autour de laquelle on tourne au doigt.
Chaque plante a sa pastille avec sa **date de plantation**, sa **récolte estimée** et une jauge d'avancement.
Les **conseils** du mois s'adaptent à **la saison, au mois et à l'endroit** où l'on habite.

Fonctionne dans le navigateur du téléphone (installable sur l'écran d'accueil, marche hors connexion).

## Lancer

```bash
cd mon-potager
npm install
npm run dev        # puis ouvre http://localhost:8080
```

## Ce que fait l'appli

| Écran | Contenu |
|---|---|
| 🏝️ **Visuel** | Le potager en 3D sur une île low-poly (arbres, buissons fleuris, nuages). Glisser = tourner, pincer = zoomer, toucher une plante = sa fiche. 4 fonds propres (☀️ ciel, 🌅 coucher de soleil, 🌙 nuit étoilée, 🤍 studio), rotation auto, étiquettes, 📸 capture en image. |
| 🧺 **Mon potager** | Le plan vu du dessus (photo redressée), les plantations à placer et déplacer au doigt, la liste avec dates et jauges, filtres Légumes / Fruits / Aromatiques / Fleurs, réglages (nom, dimensions, sauvegarde/restauration). |
| 📅 **Conseils** | Climat détecté (📍 GPS ou recherche de ville), météo de la semaine avec alertes gel / chaleur / arrosage, et pour chaque mois : travaux du potager, quoi semer à l'abri, semer en terre, planter, récolter. |

- **Détourage** : on glisse 4 pastilles sur les coins du potager (avec loupe), l'appli redresse la photo « vue du dessus » (homographie) aux vraies proportions (largeur × longueur en mètres).
- **45 plantes** (légumes, fruits, aromatiques, fleurs) avec calendrier, exposition, espacement, arrosage, astuce et bons voisins.
- **Climat** : méditerranéen, océanique, continental, montagne (> 900 m), tropical, hémisphère nord ou sud. Les dates sont décalées automatiquement (ex. tomates plantées en avril–mai à Marseille, juin–juillet en montagne).
- **Récolte estimée** : au moins le délai de culture de la plante **et** dans un mois de récolte pour ta zone.
- **Côté jeu** : niveau de jardinier et XP (plantations, nouvelles espèces, catégories, photo, région), confettis au passage de niveau.
- **Données** : tout reste sur le téléphone (IndexedDB). La météo, l'altitude et la recherche de ville utilisent [Open-Meteo](https://open-meteo.com) (gratuit, sans compte) ; sans connexion, on choisit son climat à la main.

## Tests

```bash
npm run test:logique   # calendrier, climat, récoltes, redressement de la photo
node tests/ui.test.js  # parcours complet dans Chromium (format iPhone)
```

## Fichiers

- `www/js/data.js` : plantes, zones climatiques, travaux du mois
- `www/js/logique.js` : calculs (décalage des dates, conseils, détection du climat, récoltes, homographie)
- `www/js/scene3d.js` : île 3D (Three.js)
- `www/js/detourage.js` : écran de détourage de la photo
- `www/js/app.js` : interface
- `www/vendor/` : Three.js intégré (`npm run vendor` pour le mettre à jour)
