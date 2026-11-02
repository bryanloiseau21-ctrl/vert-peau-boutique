# 🚀 Publier Mon Potager sur l'App Store et le Play Store

Tout le code est prêt : projets Android et iPhone générés, compilation automatique sur GitHub, fiche store et captures.
Il te reste les étapes qui demandent **ton identité et tes comptes** (personne ne peut les faire à ta place).
Bonne nouvelle : **pas de Firebase** ici (pas de compte dans l'appli), c'est plus simple que Boost Étudiant.

| | Play Store (Android) | App Store (iPhone) |
|---|---|---|
| Compte | Google Play Console (le même que pour Boost) | Apple Developer Program (le même que pour Boost) |
| Prix | 25 $ une seule fois (déjà payé si tu as Boost) | 99 €/an (couvre toutes tes applis) |
| Mac nécessaire ? | Non | **Non** (GitHub compile sur un Mac dans le cloud) |
| Délai de validation | ~1 à 7 jours | ~1 à 3 jours |

---

## Étape 0 – Tester tout de suite (gratuit)

**Android** : à chaque modification, GitHub compile un APK de test.
GitHub → onglet **Actions** → **Mon Potager – Android** → dernière exécution → **Artifacts** →
`mon-potager-android` → décompresse et installe le `.apk` sur ton téléphone (autorise « sources inconnues »).

**Web (iPhone et Android)** : après fusion sur la branche principale, lance **Actions → Bot stages informatique → Run workflow**,
puis ouvre `https://bryanloiseau21-ctrl.github.io/vert-peau-boutique/potager/` sur ton téléphone →
**Partager → Sur l'écran d'accueil** (iPhone) ou **⋮ → Installer l'application** (Android).

---

## 🤖 Play Store (Android)

### 1. Clé de signature (une seule fois, à garder précieusement)

```bash
keytool -genkeypair -v -keystore potager.keystore -alias potager -keyalg RSA -keysize 2048 -validity 10000
```

```bash
base64 -i potager.keystore | tr -d '\n' > potager.keystore.txt
```

> ⚠️ Sauvegarde `potager.keystore` et son mot de passe dans un endroit sûr. Ne l'ajoute **jamais** au dépôt.

### 2. Secrets GitHub
GitHub → **Settings** → **Secrets and variables** → **Actions** → **New repository secret** :

| Nom du secret | Valeur |
|---|---|
| `POTAGER_ANDROID_KEYSTORE_BASE64` | contenu de `potager.keystore.txt` |
| `POTAGER_ANDROID_KEYSTORE_PASSWORD` | mot de passe du keystore |
| `POTAGER_ANDROID_KEY_ALIAS` | `potager` |
| `POTAGER_ANDROID_KEY_PASSWORD` | mot de passe de la clé (souvent le même) |

### 3. Compiler
GitHub → **Actions** → **Mon Potager – Android** → **Run workflow**. L'artefact `mon-potager-android` contient
l'`.apk` de test et le `.aab` à envoyer sur le Play Store.

### 4. Publier
- Play Console → **Créer une application** → Nom **Mon Potager 3D**, Appli, Gratuite.
- Fiche : textes de [`store/fiche-store.md`](store/fiche-store.md), captures `store/captures-android/`, icône `www/icons/icon-512.png`.
- **Contenu de l'appli** : politique de confidentialité (URL dans la fiche), sécurité des données (« aucune donnée collectée »), classification, public cible.
- Nouveau compte personnel : **tests fermés** avec 12 testeurs pendant 14 jours, puis **Production** → envoie le `.aab` → **Envoyer pour examen**.

---

## 🍎 App Store (iPhone)

### 1. Réserver l'identifiant
<https://developer.apple.com/account/resources/identifiers> → **+** → **App IDs** → **App** →
Description `Mon Potager` · Bundle ID **`fr.monpotager.app`** (aucune « capability » à cocher).

### 2. Créer la fiche
<https://appstoreconnect.apple.com> → **Apps** → **+** → **Nouvelle app** → iOS · **Mon Potager 3D** · Français ·
Bundle ID `fr.monpotager.app` · SKU `mon-potager`. Remplis avec [`store/fiche-store.md`](store/fiche-store.md) et `store/captures-iphone/`.

### 3. Secrets GitHub
Si tu as déjà publié Boost Étudiant, **rien à faire** : `APPLE_TEAM_ID`, `ASC_KEY_ID`, `ASC_ISSUER_ID` et `ASC_KEY_P8` servent aussi ici.
Sinon, suis l'étape « Créer une clé API » de [`../aides-etudiants/PUBLIER.md`](../aides-etudiants/PUBLIER.md).

### 4. Compiler et envoyer
GitHub → **Actions** → **Mon Potager – App Store** → **Run workflow** → ~15 min plus tard, la version est dans **TestFlight**.

### 5. Envoyer en validation
App Store Connect → version 1.0 → **Build** → **Ajouter pour vérification** → **Soumettre**, avec les notes de la fiche store.

> ℹ️ Apple refuse parfois les applis qui ne sont « qu'un site dans une coquille » (règle 4.2). Mon Potager a de bonnes
> chances : 3D, traitement de la photo sur l'appareil, notifications locales de récolte, partage natif, marche hors connexion.

---

## 🔄 Mettre à jour l'appli
1. Modifie le code dans `www/` (les plantes sont dans `www/js/data.js`).
2. Augmente `"version"` dans `package.json` (ex. `1.0.1`).
3. GitHub teste tout seul (**Mon Potager – tests**) et compile l'APK (**Mon Potager – Android**).
4. Relance les workflows App Store / Android, puis soumets la nouvelle version.
5. Si l'interface a changé : `npm run captures` pour refaire les captures des stores.
