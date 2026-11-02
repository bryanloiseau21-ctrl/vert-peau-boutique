// Rappels locaux (programmés sur le téléphone, aucun serveur) pour donner envie de revenir.
// Appli native uniquement ; la permission n'est demandée qu'après une première partie.
import { freeChestLeft, dailyReady, weekEnd, weekKey } from './meta.js';

const plugin = () => (window.Capacitor?.isNativePlatform?.() ? window.Capacitor.Plugins?.LocalNotifications : null);
export const notifsAvailable = () => !!plugin();

const ID = { chest: 1, daily: 2, challenge: 3, comeback: 4, comeback2: 5 };
const at = (d, h, m = 0) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m).getTime();
const DAY = 86400000;

/** Calcule les rappels à programmer (fonction pure, testable). */
export function planReminders(S, now = Date.now()) {
  const out = [];
  const today = new Date(now);
  const evening = (offsetDays) => at(new Date(now + offsetDays * DAY), 18, 30);

  const chestAt = now + freeChestLeft(S, now);
  if (!S.premium && chestAt > now + 60000) {
    out.push({ id: ID.chest, at: chestAt, title: '📦 Ton coffre gratuit est prêt !', body: 'Viens l\'ouvrir : de nouvelles cartes t\'attendent.' });
  }
  // Cadeau du jour : demain soir (ou ce soir s'il n'a pas encore été pris et qu'il est tôt)
  const giftAt = dailyReady(S, now) && now < at(today, 18) ? at(today, 18, 30) : evening(1);
  const streak = S.daily.day + 1;
  out.push({ id: ID.daily, at: giftAt, title: '🎁 Ton cadeau du jour t\'attend',
    body: streak >= 5 ? `Jour ${streak}/7 : ne casse pas ta série, la récompense grossit !` : 'Récupère-le avant minuit pour continuer ta série.' });
  // Fin du défi : dimanche 17 h, si la semaine n'est pas finie
  const end = weekEnd(now), sunday = at(new Date(end), 17);
  if (sunday > now) {
    const played = S.challenge.week === weekKey(now) && S.challenge.plays > 0;
    out.push({ id: ID.challenge, at: sunday, title: '🏆 Le défi de la semaine se termine ce soir',
      body: played ? `Ton record : vague ${S.challenge.best}. Dernière chance de grimper au classement !` : 'Tu ne l\'as pas encore tenté : des gemmes sont à gagner !' });
  }
  // On te manque : 3 et 7 jours sans jouer
  out.push({ id: ID.comeback, at: evening(3), title: '🏰 Le rempart a besoin de toi !', body: 'Les monstres approchent… Reviens défendre ton royaume.' });
  out.push({ id: ID.comeback2, at: evening(7), title: '💎 Un cadeau t\'attend', body: 'Ton coffre gratuit et tes missions du jour sont prêts.' });
  return out.filter((n) => n.at > now + 60000);
}

/** Demande la permission (une seule fois). Renvoie true si accordée. */
export async function askPermission() {
  const P = plugin();
  if (!P) return false;
  try {
    let { display } = await P.checkPermissions();
    if (display === 'prompt' || display === 'prompt-with-rationale') ({ display } = await P.requestPermissions());
    return display === 'granted';
  } catch { return false; }
}

/** Remplace tous les rappels par ceux calculés maintenant (à appeler quand le joueur quitte le jeu). */
export async function scheduleReminders(S) {
  const P = plugin();
  if (!P) return;
  try {
    await P.cancel({ notifications: Object.values(ID).map((id) => ({ id })) });
    if (!S.settings.notifs) return;
    const { display } = await P.checkPermissions();
    if (display !== 'granted') return;
    const list = planReminders(S);
    if (!list.length) return;
    await P.schedule({ notifications: list.map((n) => ({
      id: n.id, title: n.title, body: n.body, schedule: { at: new Date(n.at), allowWhileIdle: true },
      smallIcon: 'ic_stat_icon', iconColor: '#ffc94d',
    })) });
  } catch (e) { console.warn('Rappels non programmés', e); }
}
