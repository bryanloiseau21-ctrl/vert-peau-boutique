# 🏰 Rempart des Runes

Jeu mobile original de **tower defense à fusion** : invoque des runes, fusionne-les et défends ton rempart face aux vagues de monstres.
Fonctionne sur **Android**, **iPhone** (applis natives via Capacitor) et dans le **navigateur**.

## Jouer tout de suite

```bash
cd rempart-des-runes
npm install
npm run dev        # puis ouvre http://localhost:8080
```

Après publication sur la branche principale, la version web est aussi en ligne sur
`https://bryanloiseau21-ctrl.github.io/vert-peau-boutique/jeu/` (achats simulés).

## Le jeu

- **Invoquer** : place une rune au hasard de ton deck (le coût augmente à chaque fois).
- **Fusionner** : glisse une rune sur une rune **identique et de même niveau** → une rune aléatoire du niveau supérieur (×2,15 de puissance, jusqu'au niveau 7).
- **Renforcer** : améliore un type de rune pendant la partie avec la mana.
- **Boss** toutes les 5 vagues, à tour de rôle : 🗿 Colosse (très résistant), 🧙 Invocateur (appelle des sbires), 👹 Briseur (gèle une de tes runes).
- 3 vies, vitesse ×2, pause, tutoriel à la première partie.

| Rune | Rareté | Effet |
|---|---|---|
| 🔥 Braise | Commune | Explosion de zone |
| ❄️ Givre | Commune | Ralentit |
| 🌪️ Zéphyr | Commune | Tirs très rapides |
| ⚡ Orage | Rare | Éclair en chaîne |
| ☠️ Venin | Rare | Poison |
| 💰 Alchimiste | Rare | Mana bonus à chaque vague |
| 🌙 Sentinelle | Épique | Vise l'ennemi le plus résistant |
| 💀 Faucheur | Légendaire | Élimination instantanée possible |

**Progression** : pièces 🪙, gemmes 💎, trophées 🏆 et 6 arènes, cartes à améliorer (niveau 10 max), 3 coffres
(probabilités affichées), coffre gratuit toutes les 4 h, cadeau quotidien sur 7 jours, deck de 5 runes.

**Sons et musique** synthétisés en direct (aucun fichier audio), vibrations, réglages, sauvegarde automatique,
fonctionne hors connexion.

## Achats intégrés

| Identifiant | Type | Prix conseillé | Contenu |
|---|---|---|---|
| `starter` | Non consommable | 2,99 € | 300 💎 + 5 000 🪙 + Faucheur |
| `pass_royal` | Non consommable | 4,99 € | Pièces ×2 + coffre en bois sans attente |
| `gems_80` | Consommable | 0,99 € | 80 💎 |
| `gems_500` | Consommable | 4,99 € | 500 💎 |
| `gems_1200` | Consommable | 9,99 € | 1 200 💎 |
| `gems_2800` | Consommable | 19,99 € | 2 800 💎 |

- **Android / iPhone** : vrais paiements Google Play Billing et StoreKit 2 (plugin `@capgo/native-purchases`).
  Les prix affichés sont ceux du store, dans la devise du joueur.
- **Navigateur** : achats **simulés** et signalés comme tels (démo). Désactivable avec `WEB_DEMO_PURCHASES: false` dans `www/js/config.js`.
- Sécurité : le joueur est crédité **avant** que la transaction soit finalisée, chaque transaction n'est créditée
  qu'une fois, et les achats interrompus sont récupérés au lancement suivant. « Restaurer mes achats » rend le Pass
  et le Faucheur (pas les gemmes déjà utilisées).
- Vérification serveur optionnelle : renseigne `VALIDATION_URL` dans `www/js/config.js` (voir PUBLIER.md).

👉 **Pour publier sur les stores et encaisser de vrais paiements : [PUBLIER.md](PUBLIER.md)**

## Organisation du code

| Fichier | Rôle |
|---|---|
| `www/js/data.js` | Toutes les données réglables : runes, ennemis, boss, prix, coffres, équilibrage |
| `www/js/engine.js` | Moteur de combat (logique pure, testable) |
| `www/js/meta.js` | Progression : cartes, coffres, récompenses, cadeau du jour, crédit des achats, migration de sauvegarde |
| `www/js/render.js` | Dessin du combat sur canvas |
| `www/js/battle.js` | Boucle de jeu, glisser-déposer, effets, tutoriel |
| `www/js/payments.js` | Achats Google Play / App Store (ou démo web) |
| `www/js/audio.js` | Sons, musique, vibrations |
| `www/js/save.js` | Sauvegarde (Preferences natif / localStorage) |
| `www/js/main.js` | Interface : écrans, fenêtres, boutique |

## Commandes

| Commande | Effet |
|---|---|
| `npm run dev` | Lance le jeu sur http://localhost:8080 |
| `npm test` | Tests de logique + parcours complet dans un navigateur |
| `npm run equilibrage` | Simule des parties pour vérifier la difficulté |
| `npm run icones` puis `npm run assets` | Regénère les icônes et écrans de démarrage depuis `www/icons/icon.svg` |
| `npm run sync` | Copie le jeu dans les projets Android/iOS |

Équilibrage actuel (joueur automatique, 40 parties) : vague médiane **15** avec les cartes de départ,
**17** au niveau 5, **20** au niveau 10, parties de 5 à 7 minutes.
