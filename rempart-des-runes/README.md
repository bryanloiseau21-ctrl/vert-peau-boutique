# 🏰 Rempart des Runes

Jeu original de **tower defense avec fusion** pour mobile et navigateur, en un seul fichier (`index.html`), sans dépendance.

## Jouer
Ouvre `index.html` dans un navigateur (ou sers le dossier : `python3 -m http.server`).

- **Invoquer** : place une rune au hasard de ton deck sur le plateau (le coût augmente à chaque invocation).
- **Fusionner** : glisse une rune sur une autre **identique et de même niveau** pour obtenir une rune aléatoire de niveau supérieur (jusqu'à 7).
- **Renforcer** : les 5 boutons du bas améliorent un type de rune pendant la partie (avec la mana).
- Un **boss** arrive toutes les 5 vagues. Tu as 3 vies.

## Les runes
| Rune | Rareté | Effet |
|---|---|---|
| 🔥 Braise | Commune | Dégâts de zone |
| ❄️ Givre | Commune | Ralentit |
| 🌪️ Zéphyr | Commune | Tirs très rapides |
| ⚡ Orage | Rare | Chaîne sur plusieurs ennemis |
| ☠️ Venin | Rare | Poison |
| 💰 Alchimiste | Rare | Donne de la mana à chaque vague |
| 🌙 Sentinelle | Épique | Vise l'ennemi le plus résistant |
| 💀 Faucheur | Légendaire | Chance d'élimination instantanée |

## Progression
- Pièces 🪙 et trophées 🏆 gagnés à chaque partie, gemmes 💎 en cas de record.
- **Coffres** (bois gratuit toutes les 4 h, royal, légendaire) → cartes pour améliorer tes runes (niveau max 10).
- **Deck** de 5 runes à composer.

## Achats intégrés
Catalogue dans `PRODUCTS` (dans `index.html`) :

| ID | Prix | Contenu |
|---|---|---|
| `starter` | 2,99 € | 300 💎 + 5 000 🪙 + Faucheur (une fois) |
| `pass` | 4,99 € | Pass Royal : pièces ×2 + coffre bois sans attente (une fois) |
| `gems_80` | 0,99 € | 80 💎 |
| `gems_500` | 4,99 € | 500 💎 |
| `gems_1200` | 9,99 € | 1 200 💎 |
| `gems_2800` | 19,99 € | 2 800 💎 |

Les gemmes s'échangent contre des pièces et des coffres.

### ⚠️ Actuellement : mode démo
`Payments.mode = 'demo'` : les achats sont **simulés** (confirmation puis objet accordé, aucun argent n'est encaissé). Tout passe par `Payments.backend.buy(product)` et `Payments.backend.restore()`, qu'il suffit de remplacer.

### Brancher de vrais paiements
**Android / iOS (recommandé pour un jeu)** : emballe le jeu avec Capacitor (comme `aides-etudiants/`) et utilise
[`cordova-plugin-purchase`](https://github.com/j3k0/cordova-plugin-purchase) :
1. Crée les produits avec les mêmes IDs dans Google Play Console et App Store Connect
   (consommables pour les gemmes, non consommables pour `starter` et `pass`).
2. Dans `backend.buy`, appelle `store.get(id).getOffer().order()` et résous la promesse à l'événement `approved` → `verified` → `finished`.
3. Dans `backend.restore`, appelle `store.restorePurchases()` et renvoie les IDs possédés.
4. Vérifie les reçus côté serveur (validateur du plugin ou ta propre API) avant d'accorder les objets.

Rappel : Apple et Google **imposent** leur système de paiement pour les biens virtuels dans les applis mobiles.

**Web** : Stripe Checkout + un petit serveur qui crée la session et un **webhook** qui crédite le compte. Ne jamais accorder un objet uniquement sur la base d'un retour d'URL côté client.

Pour la production, la sauvegarde (actuellement `localStorage`) doit aussi passer côté serveur afin que les gemmes achetées ne puissent pas être modifiées ni perdues.
