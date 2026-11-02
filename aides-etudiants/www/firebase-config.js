// Configuration Firebase (connexion Google / Apple + synchro des favoris).
// Colle ici la config « Web » de ta console Firebase (Paramètres du projet → Vos applications → SDK).
// Ces valeurs sont publiques par nature (elles identifient le projet, ce ne sont pas des mots de passe) :
// la sécurité est assurée par les règles Firestore (firestore.rules).
// Tant que apiKey est vide, le bouton de connexion est masqué et l'appli marche sans compte.
window.FIREBASE_CONFIG = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  appId: "",
};
