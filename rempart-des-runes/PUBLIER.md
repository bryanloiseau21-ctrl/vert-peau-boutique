# 🚀 Publier Rempart des Runes et activer les vrais paiements

Le code est prêt : achats Google Play et App Store branchés, projets Android et iOS générés, compilation automatique
sur GitHub. Il te reste les étapes qui demandent **ton identité et tes comptes** (personne ne peut les faire à ta place).

| | Play Store (Android) | App Store (iPhone) |
|---|---|---|
| Compte | Google Play Console | Apple Developer Program |
| Prix | 25 $ une seule fois | 99 €/an |
| Mac nécessaire ? | Non | **Non** (GitHub compile sur un Mac dans le cloud) |
| Pour vendre | Profil de paiement + infos fiscales | Accord « Paid Apps » + banque + fiscalité |
| Commission du store | 15 % (jusqu'à 1 M$/an) | 15 % (Small Business Program, sur demande) |

> Si tu as moins de 18 ans, les comptes développeur et les contrats de paiement doivent être ouverts par un parent ou tuteur.

---

## Étape 0 – Tester tout de suite (gratuit)

**Android** : à chaque modification, GitHub compile un APK de test.
GitHub → onglet **Actions** → **Rempart des Runes – Android** → dernière exécution → **Artifacts** →
`rempart-des-runes-android` → décompresse et installe le `.apk` sur ton téléphone (autorise « sources inconnues »).
Dans cet APK de test, la boutique s'affiche mais les achats ne marchent qu'une fois l'appli publiée sur le Play Console (étape 1).

**Web** : `npm run dev` puis http://localhost:8080 (achats simulés).

---

## Étape 1 – Google Play (Android)

### 1. Clé de signature (une seule fois, à garder précieusement)

```bash
keytool -genkey -v -keystore rempart.keystore -alias rempart -keyalg RSA -keysize 2048 -validity 10000
base64 -w0 rempart.keystore > keystore.txt     # sur Mac : base64 -i rempart.keystore | tr -d '\n' > keystore.txt
```

GitHub → **Settings** → **Secrets and variables** → **Actions** → **New repository secret** :

| Secret | Valeur |
|---|---|
| `REMPART_ANDROID_KEYSTORE_BASE64` | contenu de `keystore.txt` |
| `REMPART_ANDROID_KEYSTORE_PASSWORD` | mot de passe du keystore |
| `REMPART_ANDROID_KEY_ALIAS` | `rempart` |
| `REMPART_ANDROID_KEY_PASSWORD` | mot de passe de la clé |

⚠️ Ne mets jamais le fichier `.keystore` dans le dépôt. Si tu le perds, tu ne pourras plus mettre à jour le jeu.

### 2. Créer l'appli

1. <https://play.google.com/console> → **Créer une application** → nom « Rempart des Runes », **Jeu**, **Gratuit** (les achats intégrés sont autorisés dans une appli gratuite).
2. Relance le workflow **Rempart des Runes – Android** → récupère le fichier **`.aab`** dans les Artifacts.
3. **Tests → Test interne** → **Créer une version** → dépose le `.aab` → ajoute ton adresse Gmail comme testeur.

### 3. Activer les paiements

1. **Paramètres → Profil de paiement** : crée-le (identité, banque, fiscalité).
2. **Monétiser → Produits → Produits intégrés à l'application** → crée **exactement** ces identifiants :

| ID produit | Nom | Prix |
|---|---|---|
| `starter` | Pack de départ | 2,99 € |
| `pass_royal` | Pass Royal | 4,99 € |
| `gems_80` | Poignée de gemmes | 0,99 € |
| `gems_500` | Sac de gemmes | 4,99 € |
| `gems_1200` | Coffret de gemmes | 9,99 € |
| `gems_2800` | Trésor de gemmes | 19,99 € |

   Active chaque produit. (Google ne distingue pas consommable / unique : c'est le jeu qui gère.)
3. **Paramètres → Test des licences** : ajoute ton Gmail → tes achats de test ne seront pas débités.
4. Installe le jeu depuis le lien de test interne et essaie un achat.

### 4. Fiche et publication

- **Contenu de l'appli** : politique de confidentialité → URL de `confidentialite.html`
  (ex. `https://bryanloiseau21-ctrl.github.io/vert-peau-boutique/rempart/confidentialite.html`),
  sécurité des données : **aucune donnée collectée**, publicités : **non**, questionnaire de classification :
  coche « achats intégrés » et « éléments aléatoires payants (coffres) » — les probabilités sont affichées dans le jeu.
- Public cible : 13 ans et plus recommandé (les jeux avec coffres payants destinés aux enfants ont des règles plus strictes).
- Captures : lance `CAPTURES=./captures node tests/ui.test.js` pour obtenir des captures d'écran du jeu.
- Nouveau compte personnel : Google exige un **test fermé avec 12 testeurs pendant 14 jours** avant la production.

---

## Étape 2 – App Store (iPhone)

Si les secrets Apple de Boost Étudiant (`APPLE_TEAM_ID`, `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_P8`) existent déjà,
ils servent aussi pour ce jeu. Sinon, suis l'étape App Store de [`aides-etudiants/PUBLIER.md`](../aides-etudiants/PUBLIER.md).

1. <https://developer.apple.com/account/resources/identifiers> → **+** → App IDs → identifiant **`fr.rempartdesrunes.app`**
   (la capacité **In-App Purchase** est active par défaut).
2. <https://appstoreconnect.apple.com> → **Mes apps** → **+** → nom « Rempart des Runes », identifiant `fr.rempartdesrunes.app`, SKU `rempart`.
3. **Contrats** : signe l'accord **Paid Apps** et renseigne banque + fiscalité (obligatoire pour vendre).
4. Dans l'app → **Monétisation → Achats intégrés** → crée les produits avec **les mêmes identifiants** :
   - **Consommables** : `gems_80`, `gems_500`, `gems_1200`, `gems_2800`
   - **Non consommables** : `starter`, `pass_royal`
   Pour chacun : prix, nom et description en français, capture d'écran de la boutique (pour la vérification d'Apple).
5. GitHub → **Actions** → **Rempart des Runes – App Store** → **Run workflow** → le build arrive dans **TestFlight**.
6. Teste les achats avec un compte **Sandbox** (App Store Connect → Utilisateurs → Sandbox) : aucun débit réel.
7. Joins les achats intégrés à ta première version, puis **Soumettre pour vérification**.
   Confidentialité : **aucune donnée collectée**. Âge : indique les achats intégrés et les « coffres » (loot boxes) — probabilités affichées.

---

## (Optionnel) Vérification des achats sur un serveur

Par défaut, le jeu fait confiance au reçu du téléphone (suffisant pour démarrer : la triche sur un jeu sans
classement en ligne ne fait perdre que la vente du tricheur). Pour aller plus loin :

1. Crée un petit serveur (ex. Cloudflare Worker, Firebase Function) qui reçoit
   `{ platform, productId, transactionId, purchaseToken, receipt, jws }` et vérifie :
   - Android : API Google Play Developer `purchases.products.get` (compte de service) ;
   - iOS : signature du `jws` (App Store Server API).
2. Il répond `{ "ok": true }` si l'achat est valide.
3. Renseigne son adresse dans `www/js/config.js` → `VALIDATION_URL`.

Un achat refusé ou non vérifié n'est **jamais finalisé** : il sera retenté au prochain lancement, le joueur ne perd rien.

---

## Mettre à jour le jeu

1. Modifie le code, augmente `version` dans `package.json` (ex. `1.0.1`).
2. Pousse sur GitHub → les tests et l'APK se lancent automatiquement.
3. Android : relance le workflow → nouveau `.aab` → nouvelle version dans le Play Console.
   iPhone : relance **Rempart des Runes – App Store**.
