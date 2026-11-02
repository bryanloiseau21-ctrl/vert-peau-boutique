# Veilleur — ton coach de poche qui s'adapte à toi

Application mobile (iPhone / Android) de coaching sportif et nutrition. Style tableau de bord à anneaux (forme, semaine, calories), thème clair ou sombre selon le téléphone.

## Ce que fait le coach

1. **Profil** : objectif (muscle, perte de gras, endurance, forme), niveau, séances par semaine, durée, matériel (haltères, élastique, barre de traction) et zones à ménager (genoux, dos, épaules, poignets). Tu choisis aussi le ton du coach : bienveillant, motivant ou sans filtre.
2. **État du jour** : énergie, sommeil, courbatures et temps disponible. Veilleur calcule ta forme et prépare la séance :
   - forme basse → récupération active (mobilité + gainage léger) ;
   - forme haute → plus d'intensité et une série de plus ;
   - plus de 6 jours sans séance → reprise en douceur.
3. **Séance guidée** : échauffement chronométré, séries avec objectif, chrono pour les exercices en secondes, temps de repos avec bips et vibration. Tu indiques ce que tu as vraiment fait.
4. **Débriefing** : ton ressenti (trop facile → trop dur). Le coach ajuste :
   - chaque exercice monte ou descend en répétitions/secondes ;
   - au‑delà de 15 répétitions (ou 60 s), il passe à la variante plus dure (ex. pompes genoux → pompes → pompes pieds surélevés → diamant), et redescend si c'est trop dur ;
   - la charge globale (70 % à 130 %) suit ton ressenti.
5. **Il apprend tes goûts** : « Changer » un exercice le remplace ; après deux refus, il ne le propose plus.
6. **Progrès** : séances par semaine (8 semaines), niveaux de chaque progression, journal.

7. **Calories** : objectif du jour calculé (formule de Mifflin-St Jeor × activité, corrigé selon l'objectif, plus les calories du sport), protéines/glucides/lipides, journal par repas. **Photographie ton repas** : Claude reconnaît les aliments, estime les quantités et calcule les calories ; tu corriges les grammes si besoin. Base de 60 aliments pour la saisie à la main. Les pesées corrigent l'objectif toutes les deux semaines (±100 kcal).
8. **Salle de sport** : avec « Salle de sport (machines) » dans le matériel, les séances utilisent les machines (presse, tirage vertical, chest press, poulies, leg curl, cardio…). Le coach fait progresser la **charge en kg**.
9. **Compléments** : rappels quotidiens (créatine, whey, vitamine D, oméga-3, magnésium ou autre) avec notification à l'heure choisie et case « pris ».

Tout reste sur le téléphone (aucun compte, aucun serveur).

## Analyse des photos de repas

- Dans la version ouverte depuis claude.ai : l'analyse passe par ton compte Claude, rien à configurer.
- Dans l'appli installée : Profil → « Analyse des photos de repas » → colle une clé API Claude (console.anthropic.com → API Keys). Elle reste sur le téléphone ; chaque photo coûte environ 1 à 2 centimes.

## Installer sur iPhone

Workflow **Veilleur – App Store** (onglet Actions → Run workflow) : compile l'appli sur un Mac de GitHub et l'envoie dans **TestFlight**.
Il faut un compte Apple Developer et les secrets `APPLE_TEAM_ID`, `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_P8` (les mêmes que pour Boost Étudiant et Rempart des Runes, voir `aides-etudiants/PUBLIER.md`).
Avant le premier envoi, crée l'appli dans App Store Connect avec l'identifiant `fr.veilleur.coach`. Ensuite, installe **TestFlight** sur l'iPhone et accepte l'invitation.

## Installer sur le téléphone (comme Boost Étudiant)

Le workflow **Bot stages informatique** publie aussi Veilleur sur le site GitHub Pages du dépôt :
`https://bryanloiseau21-ctrl.github.io/vert-peau-boutique/veilleur/`

- **iPhone (Safari)** : bouton Partager → **Sur l'écran d'accueil**.
- **Android (Chrome)** : menu ⋮ → **Installer l'application**.

Elle marche ensuite hors connexion. Pour l'analyse des photos de repas, colle ta clé API Claude dans Profil.

## Installer l'appli sur Android

Chaque modification poussée lance le workflow **Veilleur – Android** :
GitHub → onglet **Actions** → « Veilleur – Android » → dernier run → **Artifacts** → `veilleur-android` (zip contenant l'APK).
Ouvre l'APK sur le téléphone et autorise l'installation depuis cette source.

## Développement

```bash
npm install
npm run dev          # aperçu dans le navigateur sur http://localhost:8080
npm run test:logique # tests du coach, des calories et des compléments
npm run anthropic    # régénère www/vendor/anthropic.js (SDK Claude)
npx cap sync         # copie www/ dans les projets android/ et ios/
```

- `www/coach.js` : moteur du coach (fonctions pures, testées).
- `www/nutrition.js` : calories, aliments, ajustement selon le poids.
- `www/analyse.js` : analyse des photos de repas par Claude.
- `www/complements.js` : rappels de compléments.
- `www/app.js` : écrans et déroulé des séances.
- `www/index.html` : styles.
