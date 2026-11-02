// Réglages de publication. Rien de secret ici.
// Version affichée dans les réglages (doit correspondre à package.json, vérifié par les tests)
export const APP_VERSION = '1.1.0';

export const CONFIG = {
  // Adresse (optionnelle) d'un serveur qui vérifie chaque achat auprès d'Apple / Google
  // avant de créditer le joueur. Laisse vide pour faire confiance au reçu de l'appareil.
  // Format attendu : POST JSON { platform, productId, transactionId, purchaseToken, receipt, jws }
  //                  → réponse { "ok": true }
  VALIDATION_URL: '',

  // Dans un navigateur (hors appli), les achats sont simulés pour la démonstration.
  // Mets false pour masquer la boutique en argent réel sur la version web.
  WEB_DEMO_PURCHASES: true,

  // Classement en ligne du défi de la semaine (Firebase, gratuit). Colle ici la config « Web »
  // de ta console Firebase (voir PUBLIER.md). Ces valeurs sont publiques par nature : la sécurité
  // est assurée par firestore.rules. Tant que apiKey est vide, le classement reste local.
  FIREBASE: {
    apiKey: '',
    authDomain: '',
    projectId: '',
    appId: '',
  },

  PRIVACY_URL: 'confidentialite.html',
  SUPPORT_EMAIL: '',
};
