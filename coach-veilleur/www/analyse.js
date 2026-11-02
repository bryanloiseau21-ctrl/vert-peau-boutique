// Analyse d'une photo de repas par Claude.
// Deux moteurs, essayés dans cet ordre :
//  1. « claude.ai » : la page tourne dans un artifact Claude → l'appel passe par le compte Claude de la personne.
//  2. « clé API » : l'appli installée appelle l'API Claude avec la clé que la personne a saisie dans son profil.
import { CONSIGNE_PHOTO, SCHEMA_PHOTO, nettoyerAnalyse } from './nutrition.js';

const MODELE = 'claude-opus-5-5';
let sampleDispo; // promesse memoïsée de la capacité « sample » (ou null)

function capaciteSample() {
  sampleDispo ??= (async () => {
    try {
      if (!window.claude?.use) return null;
      const sample = await window.claude.use('sample');
      if (!sample) return null;
      const lim = await sample.limits().catch(() => null);
      return lim?.images ? sample : null;
    } catch { return null; }
  })();
  return sampleDispo;
}

// Quel moteur est disponible maintenant ? 'claude' | 'cle' | null
export async function moteurDisponible(cleApi) {
  if (await capaciteSample()) return 'claude';
  if (cleApi && /^sk-ant-/.test(cleApi.trim())) return 'cle';
  return null;
}

// Réduit la photo (1024 px max, JPEG) : envoi plus rapide, moins coûteux.
export async function reduirePhoto(fichier, cote = 1024) {
  const bitmap = await createImageBitmap(fichier).catch(() => null);
  let source = bitmap, w, h;
  if (!bitmap) {
    const img = new Image();
    img.src = URL.createObjectURL(fichier);
    await img.decode();
    source = img; w = img.naturalWidth; h = img.naturalHeight;
  } else { w = bitmap.width; h = bitmap.height; }
  const f = Math.min(1, cote / Math.max(w, h));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * f); canvas.height = Math.round(h * f);
  canvas.getContext('2d').drawImage(source, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.85));
  return { blob, apercu: canvas.toDataURL('image/jpeg', 0.7) };
}

const enBase64 = blob => new Promise((ok, ko) => {
  const r = new FileReader();
  r.onload = () => ok(String(r.result).split(',')[1]);
  r.onerror = () => ko(r.error);
  r.readAsDataURL(blob);
});

export class ErreurAnalyse extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

export async function analyserPhoto(blob, { cleApi, signal } = {}) {
  const moteur = await moteurDisponible(cleApi);
  if (moteur === 'claude') return analyserViaClaudeAi(blob, signal);
  if (moteur === 'cle') return analyserViaApi(blob, cleApi.trim(), signal);
  throw new ErreurAnalyse('aucun_moteur', 'Ajoute ta clé API Claude dans ton profil pour analyser les photos.');
}

async function analyserViaClaudeAi(blob, signal) {
  const sample = await capaciteSample();
  try {
    const brut = await sample.json(CONSIGNE_PHOTO, { images: [blob], signal, modelTier: 'default', cache: false });
    return nettoyerAnalyse(brut);
  } catch (e) {
    const messages = {
      cancelled: 'Analyse annulée.',
      not_granted: 'Autorise l’appli à utiliser Claude pour analyser les photos.',
      rate_limited: 'Trop d’analyses d’un coup. Réessaie dans un moment.',
      image_rejected: 'Cette image n’est pas lisible. Essaie une autre photo.',
      refused: 'Claude n’a pas pu analyser cette photo.',
      invalid_json: 'Réponse incomplète. Réessaie.',
    };
    throw new ErreurAnalyse(e?.code || 'erreur', messages[e?.code] || 'Analyse impossible pour le moment. Réessaie.');
  }
}

async function analyserViaApi(blob, cleApi, signal) {
  const { Anthropic } = await import('./vendor/anthropic.js');
  // La clé appartient à la personne et reste sur son téléphone : l'appel direct depuis l'appli est voulu.
  const client = new Anthropic({ apiKey: cleApi, dangerouslyAllowBrowser: true });
  const data = await enBase64(blob);
  let reponse;
  try {
    reponse = await client.beta.messages.create({
      model: MODELE,
      max_tokens: 4000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: SCHEMA_PHOTO } },
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data } },
          { type: 'text', text: CONSIGNE_PHOTO },
        ],
      }],
    }, { signal });
  } catch (e) {
    if (e instanceof Anthropic.APIUserAbortError || signal?.aborted) throw new ErreurAnalyse('cancelled', 'Analyse annulée.');
    if (e instanceof Anthropic.AuthenticationError) throw new ErreurAnalyse('cle', 'Clé API refusée. Vérifie-la dans ton profil.');
    if (e instanceof Anthropic.PermissionDeniedError) throw new ErreurAnalyse('cle', 'Cette clé API n’a pas accès au modèle.');
    if (e instanceof Anthropic.RateLimitError) throw new ErreurAnalyse('rate_limited', 'Limite d’utilisation atteinte. Réessaie plus tard.');
    if (e instanceof Anthropic.BadRequestError) throw new ErreurAnalyse('requete', 'Photo refusée par le service. Essaie une autre photo.');
    if (e instanceof Anthropic.APIConnectionError) throw new ErreurAnalyse('reseau', 'Pas de connexion. Vérifie ton réseau.');
    if (e instanceof Anthropic.APIError) throw new ErreurAnalyse('service', 'Le service d’analyse ne répond pas. Réessaie.');
    throw e;
  }
  if (reponse.stop_reason === 'refusal') throw new ErreurAnalyse('refused', 'Claude n’a pas pu analyser cette photo.');
  if (reponse.stop_reason === 'max_tokens') throw new ErreurAnalyse('invalid_json', 'Réponse incomplète. Réessaie.');
  const texte = reponse.content.filter(b => b.type === 'text').map(b => b.text).join('');
  try {
    return nettoyerAnalyse(JSON.parse(texte));
  } catch {
    throw new ErreurAnalyse('invalid_json', 'Réponse illisible. Réessaie.');
  }
}
