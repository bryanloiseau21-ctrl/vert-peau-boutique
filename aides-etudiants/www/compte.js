// Compte (optionnel) : connexion Google / Apple via Firebase et synchro des favoris + profil.
// Ne se charge que si firebase-config.js est rempli. La position n'est JAMAIS envoyée.
const cfg = window.FIREBASE_CONFIG || {};
const actif = !!(cfg.apiKey && cfg.projectId && cfg.appId);
const natif = !!window.Capacitor?.isNativePlatform?.();
const plateforme = window.Capacitor?.getPlatform?.() || "web";
const plugin = () => window.Capacitor?.Plugins?.FirebaseAuthentication;

let fb = null; // modules Firebase chargés à la demande
const ecouteurs = new Set();
let utilisateur = null;

async function init() {
  if (fb) return fb;
  const [app, auth, fs] = await Promise.all([
    import("./vendor/firebase/firebase-app.js"),
    import("./vendor/firebase/firebase-auth.js"),
    import("./vendor/firebase/firebase-firestore.js"),
  ]);
  const a = app.initializeApp(cfg);
  const au = natif ? auth.initializeAuth(a, { persistence: auth.indexedDBLocalPersistence }) : auth.getAuth(a);
  fb = { app, auth, fs, a, au, db: fs.getFirestore(a) };
  auth.onAuthStateChanged(au, (u) => {
    utilisateur = u ? { uid: u.uid, nom: u.displayName || "", email: u.email || "", photo: u.photoURL || "" } : null;
    ecouteurs.forEach((f) => f(utilisateur));
  });
  return fb;
}

async function connecter(fournisseur) {
  const { auth, au } = await init();
  if (natif) {
    const p = plugin();
    if (!p) throw new Error("Module de connexion absent");
    if (fournisseur === "apple") {
      const r = await p.signInWithApple({ skipNativeAuth: true });
      const cred = new auth.OAuthProvider("apple.com").credential({ idToken: r.credential?.idToken, rawNonce: r.credential?.nonce });
      await auth.signInWithCredential(au, cred);
    } else {
      const r = await p.signInWithGoogle({ skipNativeAuth: true });
      await auth.signInWithCredential(au, auth.GoogleAuthProvider.credential(r.credential?.idToken));
    }
  } else {
    const prov = fournisseur === "apple" ? new auth.OAuthProvider("apple.com") : new auth.GoogleAuthProvider();
    prov.setCustomParameters?.({ prompt: "select_account" });
    await auth.signInWithPopup(au, prov);
  }
}

async function deconnecter() {
  const { auth, au } = await init();
  try { await plugin()?.signOut?.(); } catch {}
  await auth.signOut(au);
}

const docRef = () => fb.fs.doc(fb.db, "utilisateurs", utilisateur.uid);

async function lire() {
  if (!utilisateur) return null;
  const s = await fb.fs.getDoc(docRef());
  return s.exists() ? s.data() : null;
}

async function ecrire({ favoris, profil, reglages }) {
  if (!utilisateur) return;
  await fb.fs.setDoc(docRef(), {
    favoris: favoris.slice(0, 200), profil: profil.slice(0, 20), reglages,
    maj: fb.fs.serverTimestamp(),
  });
}

// Suppression définitive : données + compte (exigé par Apple et Google)
async function supprimer() {
  if (!utilisateur) return;
  await fb.fs.deleteDoc(docRef());
  try { await fb.au.currentUser.delete(); }
  catch (e) {
    if (e?.code === "auth/requires-recent-login") {
      // Il faut s'être connecté récemment : on reconnecte puis on supprime
      const fournisseur = fb.au.currentUser.providerData.some((p) => p.providerId === "apple.com") ? "apple" : "google";
      await connecter(fournisseur);
      await fb.au.currentUser.delete();
    } else throw e;
  }
  try { await plugin()?.signOut?.(); } catch {}
}

window.Compte = {
  actif, natif, plateforme,
  appleDispo: plateforme === "ios",
  get utilisateur() { return utilisateur; },
  surChangement(f) { ecouteurs.add(f); if (fb) f(utilisateur); },
  demarrer: () => (actif ? init().catch((e) => console.warn("Compte indisponible", e)) : Promise.resolve()),
  connecter, deconnecter, lire, ecrire, supprimer,
};
window.dispatchEvent(new Event("compte-pret"));
