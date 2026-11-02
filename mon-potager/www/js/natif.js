// Fonctions natives quand l'appli tourne sur Android / iPhone (Capacitor),
// avec repli sur le navigateur pour la version web.
const P = () => window.Capacitor?.Plugins || {};
export const NATIF = !!window.Capacitor?.isNativePlatform?.();
export const PLATEFORME = window.Capacitor?.getPlatform?.() || 'web';

// Petite vibration (retour « jeu » quand on plante, qu'on gagne un niveau…)
export function vibrer(force = 'leger') {
  if (!NATIF) { try { navigator.vibrate?.(force === 'fort' ? [30, 40, 60] : 15); } catch { /* rien */ } return; }
  const H = P().Haptics;
  if (!H) return;
  if (force === 'fort') H.notification({ type: 'SUCCESS' }).catch(() => {});
  else H.impact({ style: force === 'moyen' ? 'MEDIUM' : 'LIGHT' }).catch(() => {});
}

const versBase64 = (blob) => new Promise((resolve, reject) => {
  const fr = new FileReader();
  fr.onload = () => resolve(String(fr.result).split(',')[1]);
  fr.onerror = reject;
  fr.readAsDataURL(blob);
});

// Partage / enregistrement d'un fichier (image 3D, sauvegarde)
export async function partagerFichier(blob, nom, titre = 'Mon Potager') {
  const { Filesystem, Share } = P();
  if (NATIF && Filesystem && Share) {
    const ecrit = await Filesystem.writeFile({ path: nom, data: await versBase64(blob), directory: 'CACHE' });
    try { await Share.share({ title: titre, files: [ecrit.uri] }); } catch { /* partage annulé */ }
    return;
  }
  const fichier = new File([blob], nom, { type: blob.type });
  if (navigator.canShare?.({ files: [fichier] })) {
    try { await navigator.share({ files: [fichier], title: titre }); return; } catch (e) { if (e.name === 'AbortError') return; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = nom; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

// Position GPS → { lat, lon, altitude } (ou une erreur)
export async function obtenirPosition() {
  const G = P().Geolocation;
  if (NATIF && G) {
    const perm = await G.requestPermissions({ permissions: ['coarseLocation'] }).catch(() => null);
    if (perm && perm.coarseLocation === 'denied' && perm.location === 'denied') throw new Error('refus');
    const pos = await G.getCurrentPosition({ enableHighAccuracy: false, timeout: 15000, maximumAge: 3600000 });
    return { lat: pos.coords.latitude, lon: pos.coords.longitude, altitude: pos.coords.altitude ?? null };
  }
  if (!navigator.geolocation) throw new Error('indisponible');
  return new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(
    (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude, altitude: pos.coords.altitude ?? null }),
    reject, { enableHighAccuracy: false, timeout: 15000, maximumAge: 3600000 }));
}

// ── Notifications de récolte ──
// Un identifiant numérique stable par plantation (les notifications locales veulent un entier).
export function idNotif(id) {
  let h = 7;
  for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) | 0;
  return (Math.abs(h) % 2000000000) + 1;
}

let permissionDemandee = false;
export async function autoriserNotifications() {
  const LN = P().LocalNotifications;
  if (!NATIF || !LN) return false;
  try {
    let p = await LN.checkPermissions();
    if (p.display === 'prompt' || p.display === 'prompt-with-rationale') {
      if (permissionDemandee) return false;
      permissionDemandee = true;
      p = await LN.requestPermissions();
    }
    return p.display === 'granted';
  } catch { return false; }
}

// Programme une notification le matin de chaque récolte estimée (et efface les anciennes).
// rappels : [{ id, date: Date, titre, texte }]
export async function programmerRecoltes(rappels) {
  const LN = P().LocalNotifications;
  if (!NATIF || !LN) return 0;
  try {
    const { notifications: enAttente = [] } = await LN.getPending();
    const nos = enAttente.filter((n) => n.extra?.potager);
    if (nos.length) await LN.cancel({ notifications: nos.map((n) => ({ id: n.id })) });
    if (!rappels.length || !(await autoriserNotifications())) return 0;
    const maintenant = Date.now();
    const notifications = rappels.map((r) => {
      const quand = new Date(r.date); quand.setHours(9, 0, 0, 0);
      return { id: idNotif(r.id), title: r.titre, body: r.texte, schedule: { at: quand, allowWhileIdle: true }, extra: { potager: true, plantation: r.id } };
    }).filter((n) => n.schedule.at.getTime() > maintenant).slice(0, 60);
    if (notifications.length) await LN.schedule({ notifications });
    return notifications.length;
  } catch { return 0; }
}

// Toucher une notification → ouvrir la fiche de la plantation
export function surNotificationTouchee(cb) {
  const LN = P().LocalNotifications;
  if (!NATIF || !LN) return;
  LN.addListener('localNotificationActionPerformed', (e) => {
    const id = e?.notification?.extra?.plantation;
    if (id) cb(id);
  });
}

// Bouton retour Android : fermer ce qui est ouvert, sinon mettre l'appli en arrière-plan
export function surBoutonRetour(fermerQuelqueChose) {
  const A = P().App;
  if (!NATIF || !A) return;
  A.addListener('backButton', () => { if (!fermerQuelqueChose()) A.minimizeApp?.().catch?.(() => {}); });
}
