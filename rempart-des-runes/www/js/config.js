// Réglages de publication. Rien de secret ici.
export const CONFIG = {
  // Adresse (optionnelle) d'un serveur qui vérifie chaque achat auprès d'Apple / Google
  // avant de créditer le joueur. Laisse vide pour faire confiance au reçu de l'appareil.
  // Format attendu : POST JSON { platform, productId, transactionId, purchaseToken, receipt, jws }
  //                  → réponse { "ok": true }
  VALIDATION_URL: '',

  // Dans un navigateur (hors appli), les achats sont simulés pour la démonstration.
  // Mets false pour masquer la boutique en argent réel sur la version web.
  WEB_DEMO_PURCHASES: true,

  PRIVACY_URL: 'confidentialite.html',
  SUPPORT_EMAIL: '',
};
