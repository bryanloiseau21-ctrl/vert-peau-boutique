# ⚡ Boost Étudiant

L'appli qui regroupe **toutes les aides pour les étudiants** en France : manger, se loger, se soigner, l'argent, les transports, la culture et les urgences.

<p align="center"><img src="www/icons/icon-512.png" width="120" alt="Icône Boost Étudiant"></p>

- 33 aides vérifiées (novembre 2026), avec montant, conditions, étapes et lien officiel
- « Pour moi » : coche ta situation, l'appli te montre les aides qui te correspondent
- Favoris, partage à un pote, recherche, marche **sans internet**
- **Aucune donnée collectée** · politique de sécurité stricte (CSP) · polices intégrées, aucune requête externe

## 📲 Publier sur l'App Store et le Play Store
👉 Suis le guide pas à pas : **[PUBLIER.md](PUBLIER.md)**

## 🛠️ Pour les développeurs

```
www/            l'appli (HTML/CSS/JS, sans framework)
  data.js       ← la liste des aides : c'est ici qu'on ajoute / corrige une aide
store/          textes et captures d'écran pour les stores
scripts/        vérification des données, des liens, génération des captures
tests/          test complet dans un navigateur (format iPhone)
```

```bash
npm install
```

```bash
npm run dev
```

```bash
npm test
```

L'appli iOS/Android est générée avec [Capacitor](https://capacitorjs.com) par les workflows GitHub (`.github/workflows/boost-*.yml`).
