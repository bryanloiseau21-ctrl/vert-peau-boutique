// Détourage de la photo : on place les 4 coins du potager sur la photo,
// l'appli garde uniquement le potager, redressé « vu du dessus », sans le fond autour.
import { redresser, tailleRedressee } from './logique.js';

const MAX_SOURCE = 2048;

export async function chargerImage(blob) {
  let img;
  try { img = await createImageBitmap(blob, { imageOrientation: 'from-image' }); } catch {
    img = await new Promise((resolve, reject) => {
      const i = new Image(); i.onload = () => resolve(i); i.onerror = reject; i.src = URL.createObjectURL(blob);
    });
  }
  const w = img.width, h = img.height, k = Math.min(1, MAX_SOURCE / Math.max(w, h));
  const c = document.createElement('canvas');
  c.width = Math.round(w * k); c.height = Math.round(h * k);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return c;
}

export function redresserCanvas(source, coins, largeurM, longueurM) {
  const { l, h } = tailleRedressee(largeurM, longueurM, 1024);
  const src = source.getContext('2d').getImageData(0, 0, source.width, source.height);
  const pts = coins.map((p) => ({ x: p.x * source.width, y: p.y * source.height }));
  const data = redresser(src.data, source.width, source.height, pts, l, h);
  const c = document.createElement('canvas'); c.width = l; c.height = h;
  c.getContext('2d').putImageData(new ImageData(data, l, h), 0, 0);
  return c;
}

export const COINS_DEFAUT = () => [{ x: 0.15, y: 0.2 }, { x: 0.85, y: 0.2 }, { x: 0.92, y: 0.85 }, { x: 0.08, y: 0.85 }];
const NOMS = ['Haut gauche', 'Haut droite', 'Bas droite', 'Bas gauche'];
const COULEURS = ['#ff5d8f', '#ffb020', '#2ec4b6', '#7b61ff'];

// Ouvre l'écran de détourage. Résout avec { coins, largeur, longueur, canvas } ou null si annulé.
export function ouvrirDetourage(source, { coins, largeur, longueur }) {
  return new Promise((resolve) => {
    const pts = (coins || COINS_DEFAUT()).map((p) => ({ ...p }));
    const el = document.createElement('div');
    el.className = 'detourage';
    el.innerHTML = `
      <div class="detourage-haut">
        <h2>✂️ Détoure ton potager</h2>
        <p>Glisse les 4 pastilles sur les coins de ton potager. Tout le reste disparaît !</p>
      </div>
      <div class="detourage-zone"><div class="detourage-cadre">
        <canvas class="detourage-photo"></canvas>
        <svg class="detourage-svg"></svg>
        <canvas class="loupe" width="120" height="120" hidden></canvas>
      </div></div>
      <div class="detourage-bas">
        <div class="dims">
          <label>↔️ Largeur <input type="number" name="largeur" min="0.3" max="100" step="0.1" value="${largeur}"> m</label>
          <label>↕️ Longueur <input type="number" name="longueur" min="0.3" max="100" step="0.1" value="${longueur}"> m</label>
        </div>
        <div class="rangee">
          <button class="btn btn-gris" data-act="annuler">Annuler</button>
          <button class="btn btn-gris" data-act="tout">🖼️ Toute la photo</button>
          <button class="btn btn-vert" data-act="valider">✅ Valider</button>
        </div>
      </div>`;
    document.body.appendChild(el);
    const cadre = el.querySelector('.detourage-cadre');
    const photo = el.querySelector('.detourage-photo');
    const svg = el.querySelector('.detourage-svg');
    const loupe = el.querySelector('.loupe');
    photo.width = source.width; photo.height = source.height;
    photo.getContext('2d').drawImage(source, 0, 0);

    function ajuster() {
      const zone = el.querySelector('.detourage-zone');
      const k = Math.min(zone.clientWidth / source.width, zone.clientHeight / source.height);
      cadre.style.width = `${source.width * k}px`; cadre.style.height = `${source.height * k}px`;
      dessiner();
    }
    function dessiner() {
      const w = cadre.clientWidth, h = cadre.clientHeight;
      svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
      const P = pts.map((p) => [p.x * w, p.y * h]);
      const poly = P.map((p) => p.join(',')).join(' ');
      svg.innerHTML = `
        <path d="M0,0H${w}V${h}H0Z M${P.map((p) => p.join(',')).join(' L')}Z" fill="rgba(20,24,40,.62)" fill-rule="evenodd"/>
        <polygon points="${poly}" fill="none" stroke="#fff" stroke-width="3" stroke-dasharray="8 6"/>
        ${P.map((p, i) => `<g class="poignee" data-i="${i}" transform="translate(${p[0]},${p[1]})">
          <circle r="22" fill="transparent"/>
          <circle r="14" fill="${COULEURS[i]}" stroke="#fff" stroke-width="4"/>
          <text y="5" text-anchor="middle" font-size="13" font-weight="900" fill="#fff">${i + 1}</text>
          <title>${NOMS[i]}</title></g>`).join('')}`;
    }
    function majLoupe(i, cx, cy) {
      const g = loupe.getContext('2d');
      const sx = pts[i].x * source.width, sy = pts[i].y * source.height, z = 40;
      g.save(); g.clearRect(0, 0, 120, 120);
      g.beginPath(); g.arc(60, 60, 58, 0, Math.PI * 2); g.clip();
      g.drawImage(source, sx - z, sy - z, z * 2, z * 2, 0, 0, 120, 120);
      g.strokeStyle = COULEURS[i]; g.lineWidth = 2;
      g.beginPath(); g.moveTo(60, 45); g.lineTo(60, 75); g.moveTo(45, 60); g.lineTo(75, 60); g.stroke();
      g.restore();
      loupe.hidden = false;
      loupe.style.left = `${Math.min(cadre.clientWidth - 125, Math.max(5, cx - 60))}px`;
      loupe.style.top = `${cy > 150 ? cy - 160 : cy + 40}px`;
    }

    let actif = -1;
    svg.addEventListener('pointerdown', (e) => {
      const g = e.target.closest('.poignee'); if (!g) return;
      actif = Number(g.dataset.i); svg.setPointerCapture(e.pointerId); e.preventDefault();
    });
    svg.addEventListener('pointermove', (e) => {
      if (actif < 0) return;
      const r = cadre.getBoundingClientRect();
      const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      const y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
      pts[actif] = { x, y }; dessiner(); majLoupe(actif, x * r.width, y * r.height);
    });
    const lacher = () => { actif = -1; loupe.hidden = true; };
    svg.addEventListener('pointerup', lacher); svg.addEventListener('pointercancel', lacher);
    const ro = new ResizeObserver(ajuster); ro.observe(el.querySelector('.detourage-zone'));

    const fermer = (val) => { ro.disconnect(); el.remove(); resolve(val); };
    el.addEventListener('click', (e) => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (act === 'annuler') fermer(null);
      if (act === 'tout') { pts.splice(0, 4, { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }); dessiner(); }
      if (act === 'valider') {
        const lg = Math.min(100, Math.max(0.3, Number(el.querySelector('[name=largeur]').value) || largeur));
        const lo = Math.min(100, Math.max(0.3, Number(el.querySelector('[name=longueur]').value) || longueur));
        const bouton = e.target.closest('button'); bouton.disabled = true; bouton.textContent = '⏳ Un instant…';
        setTimeout(() => fermer({ coins: pts, largeur: lg, longueur: lo, canvas: redresserCanvas(source, pts, lg, lo) }), 30);
      }
    });
  });
}
