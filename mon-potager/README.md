# 🌻 Mon Potager

Appli pour suivre son potager **façon jeu** : on prend une photo, l'appli **détoure** le potager
(le fond disparaît) et le pose sur une **petite île flottante en 3D** autour de laquelle on tourne au doigt.
Chaque plante a sa pastille avec sa **date de plantation**, sa **récolte estimée** et une jauge d'avancement.
Les **conseils** du mois s'adaptent à **la saison, au mois et à l'endroit** où l'on habite.

Fonctionne sur **Android**, **iPhone** (applis natives via Capacitor, comme Boost Étudiant) et dans le **navigateur**
(installable sur l'écran d'accueil, marche hors connexion). 👉 Pour la publier sur les stores : [`PUBLIER.md`](PUBLIER.md).

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
- **Mon jardin** : plusieurs éléments sur l'île, chacun avec ses dimensions, sa couleur et son matériau :
  - 🪵 bacs surélevés (bois, pierre, brique, métal, plastique, béton) et 🌱 planches en pleine terre ;
  - 🏡 serres (verre, polycarbonate, tunnel) : dates de plantation un mois plus tôt, récolte un mois plus tard, pas d'alerte gel ;
  - 🐔 enclos à animaux (poules, canards, lapins, moutons, chèvres, cochons, ruches) avec clôture, abri et animaux qui se baladent en 3D ;
  - 🌳 arbres et vergers (17 espèces, dont 11 fruitiers) qui fleurissent et portent leurs fruits en 3D selon le mois ;
  - 🏝️ taille du terrain réglable pour avoir de la place.
  - ✋ mode Déplacer : on attrape une installation en 3D et on la pose où on veut (ou 🔄 rangement automatique) ;
  - 🏠 une maison (chalet bois, pierre, brique, crépi ; couleurs des murs et du toit) et 🧑‍🌾 un personnage entièrement personnalisable qui se promène et fait coucou ;
  - 🔍 zoom animé sur chaque installation, et une animation à chaque toucher (rebond, saut, feuilles, cœurs, étincelles) ;
  - 🪓 on coupe les arbres du décor pour faire de la place et récolter des bûches 🪵, qui servent ensuite à construire en bois (bacs, bordures, clôtures, abris).
- **Côté jeu** : niveau de jardinier et XP (plantations, nouvelles espèces, catégories, photo, région), confettis au passage de niveau.
- **Natif (Android / iPhone)** : 🔔 notification le matin de chaque récolte estimée, 📤 partage de l'image 3D, 📳 vibrations, 📍 GPS, bouton retour Android.
- **Données** : tout reste sur le téléphone (IndexedDB). La météo, l'altitude et la recherche de ville utilisent [Open-Meteo](https://open-meteo.com) (gratuit, sans compte) ; sans connexion, on choisit son climat à la main.

## Appli Android / iPhone

```bash
npm run sync        # copie www/ dans les projets android/ et ios/
npm run icones      # régénère les icônes depuis www/icons/icon.svg
npm run assets      # puis les tailles natives (icônes + écran de démarrage)
npm run captures    # captures pour les stores (store/)
```

Compilation automatique sur GitHub : **Mon Potager – Android** (APK à chaque modification) et **Mon Potager – App Store** (TestFlight).

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
- `www/js/natif.js` : notifications, partage, GPS, vibrations (Capacitor)
- `www/vendor/` : Three.js intégré (`npm run vendor` pour le mettre à jour)
