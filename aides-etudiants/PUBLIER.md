# 🚀 Publier Boost Étudiant sur l'App Store et le Play Store

Tout le code est prêt. Ce qu'il te reste à faire, ce sont les étapes qui demandent **ton identité et tes comptes** (Apple et Google ne permettent à personne d'autre de les faire à ta place).

| | App Store (iPhone) | Play Store (Android) |
|---|---|---|
| Compte | Apple Developer Program | Google Play Console |
| Prix | 99 €/an | 25 $ une seule fois |
| Mac nécessaire ? | **Non** (GitHub compile sur un Mac dans le cloud) | Non |
| Délai de validation | ~1 à 3 jours | ~1 à 7 jours (+ 14 jours de test pour un nouveau compte perso) |

---

## Étape 0 – Tester l'appli tout de suite (gratuit, 2 min)

1. Sur GitHub : onglet **Actions** → **Bot stages informatique** → **Run workflow** (sur la branche principale).
2. L'appli est en ligne sur `https://bryanloiseau21-ctrl.github.io/vert-peau-boutique/aides/`
3. Ouvre ce lien sur ton téléphone :
   - **iPhone (Safari)** : bouton Partager ⬆️ → **Sur l'écran d'accueil**
   - **Android (Chrome)** : menu ⋮ → **Installer l'application**

C'est déjà une vraie appli sur ton écran d'accueil, qui marche hors connexion. Tu peux la partager à tes potes sans passer par les stores.

---

## 🔥 Étape 1 – Firebase (connexion Google / Apple + synchro) — gratuit

La connexion est **optionnelle** pour tes utilisateurs, mais les applis iPhone/Android en ont besoin pour démarrer. Compte une vingtaine de minutes.

1. Va sur <https://console.firebase.google.com> → **Ajouter un projet** → nom `boost-etudiant` → tu peux désactiver Google Analytics.
2. **Authentication** → **Commencer** → onglet **Sign-in method** :
   - active **Google** (choisis ton e-mail d'assistance) ;
   - active **Apple** (pour l'iPhone, rien d'autre à remplir).
   - Onglet **Settings** → **Domaines autorisés** → ajoute `bryanloiseau21-ctrl.github.io`.
3. **Firestore Database** → **Créer une base de données** → emplacement **europe-west** (données en Europe) → mode **production**.
   - Onglet **Règles** : remplace tout par le contenu du fichier [`firestore.rules`](firestore.rules) → **Publier**.
     (Ces règles font que chacun ne peut lire et modifier **que ses propres** données.)
4. **Paramètres du projet** ⚙️ → **Vos applications** :
   - **Web** `</>` → surnom `Boost web` → copie les valeurs `apiKey`, `authDomain`, `projectId`, `appId` dans [`www/firebase-config.js`](www/firebase-config.js) et enregistre (ces valeurs sont publiques, ce ne sont pas des mots de passe).
   - **iOS** → identifiant du bundle **`fr.boostetudiant.app`** → télécharge **`GoogleService-Info.plist`**.
   - **Android** → nom du package **`fr.boostetudiant.app`** → télécharge **`google-services.json`**.
     Ajoute ensuite les empreintes **SHA-1** dans les paramètres de l'appli Android (voir étape Play Store), sinon la connexion Google ne marchera pas sur Android.
5. Transforme les deux fichiers en texte pour GitHub :

```bash
base64 -i GoogleService-Info.plist | tr -d '\n' > plist.txt
```

```bash
base64 -i google-services.json | tr -d '\n' > json.txt
```

6. GitHub → **Settings** → **Secrets and variables** → **Actions** → **New repository secret** :

| Nom du secret | Valeur |
|---|---|
| `GOOGLE_SERVICE_INFO_PLIST` | contenu de `plist.txt` |
| `GOOGLE_SERVICES_JSON` | contenu de `json.txt` |

---

## 🍎 App Store (iPhone)

### 1. Créer ton compte Apple Developer
- Va sur <https://developer.apple.com/programs/enroll/> avec ton identifiant Apple (double authentification activée).
- Choisis **Individuel**, paie 99 €. Validation : de quelques heures à 2 jours.

### 2. Réserver l'identifiant de l'appli
- <https://developer.apple.com/account/resources/identifiers> → **+** → **App IDs** → **App**
- Description : `Boost Etudiant` · Bundle ID (explicite) : **`fr.boostetudiant.app`**
- Dans la liste **Capabilities**, coche **Sign in with Apple** → Enregistrer.

### 3. Créer la fiche de l'appli
- <https://appstoreconnect.apple.com> → **Apps** → **+** → **Nouvelle app**
- Plateforme iOS · Nom **Boost Étudiant** · Langue Français · Bundle ID `fr.boostetudiant.app` · SKU `boost-etudiant`
- Remplis la fiche avec les textes de [`store/fiche-store.md`](store/fiche-store.md) et les captures de `store/captures-iphone/`.

### 4. Créer une clé API (pour que GitHub puisse envoyer l'appli)
- App Store Connect → **Utilisateurs et accès** → **Intégrations** → **Clés de l'API App Store Connect** → **+**
- Nom `GitHub`, accès **Admin** → Générer → **télécharge le fichier `.p8`** (une seule fois possible !)
- Note l'**ID de la clé** et l'**ID de l'émetteur** (Issuer ID) affichés sur la page.
- Ton **Team ID** : <https://developer.apple.com/account> → section Abonnement (10 caractères).

### 5. Donner ces infos à GitHub (en secret)
Dans ton dépôt GitHub : **Settings** → **Secrets and variables** → **Actions** → **New repository secret**, crée :

| Nom du secret | Valeur |
|---|---|
| `APPLE_TEAM_ID` | ton Team ID |
| `ASC_KEY_ID` | l'ID de la clé |
| `ASC_ISSUER_ID` | l'Issuer ID |
| `ASC_KEY_P8` | tout le contenu du fichier `.p8` (ouvre-le avec un éditeur de texte, copie tout, `-----BEGIN…` compris) |

> 🔒 Ces secrets sont chiffrés par GitHub, jamais affichés dans les logs, et la clé est effacée de la machine après chaque compilation. Ne les mets jamais dans un fichier du dépôt.

### 6. Compiler et envoyer
- GitHub → **Actions** → **Boost Étudiant – App Store** → **Run workflow**.
- ~15 min plus tard, la version apparaît dans App Store Connect → **TestFlight**.
- Teste-la sur ton iPhone avec l'appli **TestFlight**.

### 7. Envoyer en validation
- App Store Connect → ton app → version 1.0 → **Build** : choisis celui envoyé → **Ajouter pour vérification** → **Soumettre**.
- Dans « Notes pour la vérification », mets : *« Le compte est optionnel (Google ou Apple), il sert à synchroniser les favoris ; il peut être supprimé dans l'onglet Infos. La position sert uniquement à afficher les restos U et résidences CROUS proches (onglet Autour), le calcul se fait sur l'appareil. Les notifications sont locales. Les 33 aides sont intégrées et consultables hors ligne. »*

> ℹ️ Apple refuse parfois les applis qui ne sont « qu'un site web dans une coquille » (règle 4.2). Boost Étudiant a de bonnes chances car tout est intégré et marche sans internet, avec favoris, profil et partage. En cas de refus, réponds au message d'Apple en expliquant ces fonctions — et je pourrai ajouter des fonctions natives (notifications de rappel des dates DSE, par exemple).

---

## 🤖 Play Store (Android)

### 1. Créer ton compte Google Play Console
- <https://play.google.com/console/signup> → compte **Personnel**, paie 25 $, vérifie ton identité (pièce d'identité + téléphone Android).

### 2. Créer ta clé de signature (une seule fois, à garder précieusement)
Sur ton ordinateur (Java installé) :

```bash
keytool -genkeypair -v -keystore boost.keystore -alias boost -keyalg RSA -keysize 2048 -validity 10000
```

Puis transforme-la en texte pour GitHub :

```bash
base64 -i boost.keystore | tr -d '\n' > boost.keystore.txt
```

> ⚠️ Sauvegarde `boost.keystore` et son mot de passe dans un endroit sûr (gestionnaire de mots de passe). Ne l'ajoute **jamais** au dépôt.

Récupère l'empreinte SHA-1 de cette clé et ajoute-la dans Firebase (Paramètres du projet → appli Android → **Ajouter une empreinte**) :

```bash
keytool -list -v -keystore boost.keystore -alias boost
```

> Après le premier envoi sur le Play Store, ajoute aussi le SHA-1 de la **clé de signature d'application** (Play Console → Configuration → Intégrité de l'appli → Signature d'application), puis remets à jour le secret `GOOGLE_SERVICES_JSON`.

### 3. Secrets GitHub
| Nom du secret | Valeur |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | contenu de `boost.keystore.txt` |
| `ANDROID_KEYSTORE_PASSWORD` | mot de passe du keystore |
| `ANDROID_KEY_ALIAS` | `boost` |
| `ANDROID_KEY_PASSWORD` | mot de passe de la clé (souvent le même) |

### 4. Compiler
- GitHub → **Actions** → **Boost Étudiant – Android** → **Run workflow**.
- Télécharge l'artefact **boost-etudiant-android** : il contient
  - un `.apk` à installer directement sur un téléphone Android pour tester,
  - le `.aab` à envoyer sur le Play Store.

### 5. Publier
- Play Console → **Créer une application** → Nom **Boost Étudiant**, Appli, Gratuite.
- Remplis la fiche avec [`store/fiche-store.md`](store/fiche-store.md) + `store/captures-android/` + l'icône 512 px `www/icons/icon-512.png`.
- **Contenu de l'appli** : politique de confidentialité, sécurité des données (voir [`store/fiche-store.md`](store/fiche-store.md) : nom, e-mail, ID utilisateur, facultatif ; position non collectée), **suppression du compte** (« dans l'appli, onglet Infos » + l'URL de la politique), classification, public cible (18 ans et +).
- **Tests fermés** : envoie le `.aab`, invite au moins **12 testeurs** (tes potes, avec leur adresse Gmail) pendant **14 jours** — obligatoire pour un nouveau compte personnel.
- Ensuite : **Production** → envoie le `.aab` → **Envoyer pour examen**.

---

## 📍 La liste des restos U et résidences

Elle vient des données publiques du CROUS et se télécharge **toute seule** à chaque compilation et à chaque publication du site. Pour la mettre à jour sur ton ordinateur :

```bash
npm run lieux
```

## 🔄 Mettre à jour l'appli plus tard

1. Modifie les aides dans `www/data.js` (et la date `MAJ` en haut du fichier).
2. Augmente `"version"` dans `package.json` (ex. `1.0.1`).
3. GitHub vérifie tout seul les données et l'appli (workflow **Boost Étudiant – tests**).
4. Relance les workflows App Store / Android, puis soumets la nouvelle version dans chaque console.

Pour vérifier que tous les liens officiels marchent encore (à faire depuis ton ordinateur) :

```bash
npm run liens
```
