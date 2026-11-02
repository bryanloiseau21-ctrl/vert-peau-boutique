// Achats intégrés.
// - Appli Android / iOS : Google Play Billing et StoreKit 2 via le plugin @capgo/native-purchases.
// - Navigateur : achats simulés (démo), clairement signalés au joueur.
//
// Règle d'or : on crédite le joueur AVANT de terminer la transaction auprès du store.
// Si l'appli plante entre les deux, l'achat est retrouvé au prochain lancement (recover)
// et crédité une seule fois grâce à l'identifiant de transaction.
import { IAP_PRODUCTS } from './data.js';
import { CONFIG } from './config.js';

const plugin = () => window.Capacitor?.Plugins?.NativePurchases;
const platform = () => window.Capacitor?.getPlatform?.() || 'web';
const isNative = () => !!window.Capacitor?.isNativePlatform?.() && !!plugin();
const isCancel = (e) => /cancel|annul/i.test(String(e?.message || e?.code || e));
const isPending = (tx) => platform() === 'android' && tx.purchaseState != null && String(tx.purchaseState) !== '1';
const txId = (tx) => tx.transactionId || tx.orderId || tx.purchaseToken;

/**
 * @param {object} h
 * @param {(productId:string, transactionId:string|null)=>boolean} h.credit  crédite (idempotent), true si accordé
 * @param {(productIds:string[])=>void} h.restore     rend les achats uniques
 * @param {(product:object)=>Promise<boolean>} h.confirmDemo  confirmation d'un achat simulé
 * @param {(msg:string, kind?:string)=>void} h.notify
 * @param {()=>void} h.changed   à appeler quand les prix ou l'état changent
 */
export function createPayments(h) {
  const prices = {};
  let ready = false, busy = false;
  const mode = isNative() ? 'store' : CONFIG.WEB_DEMO_PURCHASES ? 'demo' : 'off';

  async function validate(tx, productId) {
    if (!CONFIG.VALIDATION_URL) return true;
    try {
      const r = await fetch(CONFIG.VALIDATION_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: platform(), productId, transactionId: tx.transactionId,
          purchaseToken: tx.purchaseToken, receipt: tx.receipt, jws: tx.jwsRepresentation }),
      });
      return r.ok && (await r.json()).ok === true;
    } catch { return false; }
  }

  async function finish(tx, product) {
    const P = plugin();
    try {
      if (platform() === 'android') {
        if (product.consumable) await P.consumePurchase({ purchaseToken: tx.purchaseToken });
        else if (!tx.isAcknowledged) await P.acknowledgePurchase({ purchaseToken: tx.purchaseToken });
      } else {
        await P.acknowledgePurchase({ purchaseToken: String(tx.transactionId) });
      }
    } catch (e) { console.warn('Finalisation de la transaction impossible (sera retentée)', e); }
  }

  /** Traite une transaction venant du store. fresh = achat que le joueur vient de faire. */
  async function handle(tx, { fresh = false } = {}) {
    const product = IAP_PRODUCTS.find((p) => p.id === tx.productIdentifier);
    if (!product) return false;
    if (isPending(tx)) { if (fresh) h.notify('Paiement en attente : tu recevras ton achat dès sa validation.'); return false; }
    if (!(await validate(tx, product.id))) {
      if (fresh) h.notify('Achat non vérifié. Réessaie plus tard : il ne sera pas perdu.', 'error');
      return false;
    }
    // Hors achat direct, un achat unique déjà finalisé est une restauration (pas de nouvelles gemmes).
    const unfinished = fresh || tx.needsFinish || tx.isAcknowledged === false;
    let granted = false;
    if (!product.consumable && !unfinished) h.restore([product.id]);
    else granted = h.credit(product.id, String(txId(tx)));
    await finish(tx, product);
    h.changed();
    return granted;
  }

  async function init() {
    if (mode !== 'store') { ready = true; return; }
    const P = plugin();
    try {
      await P.configure?.({ autoFinishTransactions: false });
      const { isBillingSupported } = await P.isBillingSupported();
      if (!isBillingSupported) { h.notify('Les achats ne sont pas disponibles sur cet appareil.', 'error'); return; }
      const { products } = await P.getProducts({ productIdentifiers: IAP_PRODUCTS.map((p) => p.id), productType: 'inapp' });
      for (const p of products || []) prices[p.identifier] = p.priceString;
      // iOS : achats terminés hors de l'appli (contrôle parental, renouvellements, autre appareil)
      await P.addListener('transactionUpdated', (tx) => handle(tx).then((g) => g && h.notify('Achat reçu ! Merci 💜', 'success')));
      ready = true;
      await recover();
    } catch (e) {
      console.warn('Boutique indisponible', e);
    }
    h.changed();
  }

  /** Récupère les achats payés mais pas encore crédités/finalisés. */
  async function recover() {
    try {
      const { purchases } = await plugin().getPurchases({ productType: 'inapp', onlyCurrentEntitlements: true });
      for (const tx of purchases || []) await handle(tx);
    } catch (e) { console.warn('Récupération des achats impossible', e); }
  }

  async function purchase(product) {
    if (busy) return false;
    busy = true;
    try {
      if (mode === 'demo') {
        if (!(await h.confirmDemo(product))) return false;
        const granted = h.credit(product.id, `demo-${Date.now()}-${Math.random().toString(36).slice(2)}`);
        h.changed();
        return granted;
      }
      if (mode !== 'store' || !ready) { h.notify('Boutique indisponible pour le moment.', 'error'); return false; }
      const tx = await plugin().purchaseProduct({
        productIdentifier: product.id, productType: 'inapp', quantity: 1,
        isConsumable: false, autoAcknowledgePurchases: false,   // on finalise nous-mêmes après avoir crédité
      });
      return await handle(tx, { fresh: true });
    } catch (e) {
      if (!isCancel(e)) { console.warn('Achat échoué', e); h.notify('L\'achat n\'a pas abouti. Aucun montant n\'a été débité.', 'error'); }
      return false;
    } finally { busy = false; }
  }

  async function restore() {
    if (mode === 'demo') { h.notify('Achats restaurés'); return; }
    if (mode !== 'store') return;
    try {
      await plugin().restorePurchases();
      const { purchases } = await plugin().getPurchases({ productType: 'inapp', onlyCurrentEntitlements: true });
      const ids = [];
      for (const tx of purchases || []) { if (!isPending(tx)) ids.push(tx.productIdentifier); }
      h.restore(ids);
      await recover();
      h.notify('Achats restaurés', 'success');
    } catch (e) { h.notify('Restauration impossible. Vérifie ta connexion.', 'error'); }
    h.changed();
  }

  return {
    mode, init, purchase, restore,
    price: (p) => prices[p.id] || p.price,
    get ready() { return ready; },
    get busy() { return busy; },
  };
}
