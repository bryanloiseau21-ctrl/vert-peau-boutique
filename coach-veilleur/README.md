# Veilleur — ton coach de poche qui s'adapte à toi

Application mobile (Android / iPhone) de coaching sportif, style nuit : noir acier, jaune signal, interface épurée.

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

Tout reste sur le téléphone (aucun compte, aucun serveur).

## Installer l'appli sur Android

Chaque modification poussée lance le workflow **Veilleur – Android** :
GitHub → onglet **Actions** → « Veilleur – Android » → dernier run → **Artifacts** → `veilleur-android` (zip contenant l'APK).
Ouvre l'APK sur le téléphone et autorise l'installation depuis cette source.

## Développement

```bash
npm install
npm run dev          # aperçu dans le navigateur sur http://localhost:8080
npm run test:logique # tests du moteur d'adaptation
npx cap sync         # copie www/ dans les projets android/ et ios/
```

- `www/coach.js` : moteur du coach (fonctions pures, testées).
- `www/app.js` : écrans et déroulé des séances.
- `www/index.html` : styles.
