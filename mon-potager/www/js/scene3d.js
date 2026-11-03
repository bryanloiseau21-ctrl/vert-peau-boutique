// Visuel 3D façon jeu : le potager (photo redressée) posé sur une petite île flottante,
// sur un fond propre et coloré. On tourne autour au doigt, on zoome en pinçant.
import * as THREE from 'three';
import { OrbitControls } from './../vendor/OrbitControls.js';
import { disposerBacs } from './logique.js';
import { ARBRES } from './data.js';

export const FONDS = {
  ciel: { nom: 'Ciel', emoji: '☀️', haut: '#7cc8ff', bas: '#e9fbff', lumiere: 1.0, brume: '#d6f3ff' },
  coucher: { nom: 'Coucher de soleil', emoji: '🌅', haut: '#7a5cff', milieu: '#ff7eb3', bas: '#ffd59e', lumiere: 0.9, brume: '#ffc6b0' },
  nuit: { nom: 'Nuit étoilée', emoji: '🌙', haut: '#0b1240', milieu: '#2b2a7a', bas: '#5b4bb5', lumiere: 0.55, etoiles: true, brume: '#3a3590' },
  studio: { nom: 'Studio', emoji: '🤍', haut: '#ffffff', bas: '#e9eef2', lumiere: 1.05, brume: '#f2f5f7' },
};

// Petit générateur pseudo-aléatoire stable (le décor ne change pas d'une ouverture à l'autre).
function alea(graine) { let s = graine >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

function textureFond(f) {
  const c = document.createElement('canvas'); c.width = 16; c.height = 512;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, f.haut);
  if (f.milieu) grad.addColorStop(0.55, f.milieu);
  grad.addColorStop(1, f.bas);
  g.fillStyle = grad; g.fillRect(0, 0, 16, 512);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function textureTerre() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 384;
  const g = c.getContext('2d');
  g.fillStyle = '#7a4b2a'; g.fillRect(0, 0, 512, 384);
  const r = alea(7);
  for (let i = 0; i < 2500; i++) { g.fillStyle = r() < 0.5 ? 'rgba(60,34,18,.35)' : 'rgba(150,100,60,.3)'; g.fillRect(r() * 512, r() * 384, 3, 3); }
  for (let y = 48; y < 384; y += 72) {
    g.fillStyle = 'rgba(50,28,14,.45)'; g.fillRect(16, y - 6, 480, 12);
    for (let x = 34; x < 490; x += 38) {
      g.fillStyle = '#5fbf4a'; g.beginPath(); g.arc(x, y - 8, 9, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#8be06b'; g.beginPath(); g.arc(x - 3, y - 11, 4, 0, Math.PI * 2); g.fill();
    }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function textureOmbre() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(0,0,0,.45)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

// Pastille ronde avec l'emoji de la plante et un anneau d'avancement (comme une jauge de jeu).
function texturePastille(emoji, couleur, progres) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.arc(64, 70, 54, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#fff'; g.beginPath(); g.arc(64, 62, 56, 0, Math.PI * 2); g.fill();
  g.fillStyle = couleur; g.beginPath(); g.arc(64, 62, 46, 0, Math.PI * 2); g.fill();
  g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 8; g.beginPath(); g.arc(64, 62, 51, 0, Math.PI * 2); g.stroke();
  g.strokeStyle = '#ffd23f'; g.lineCap = 'round'; g.lineWidth = 8;
  g.beginPath(); g.arc(64, 62, 51, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0.02, progres)); g.stroke();
  g.font = '56px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(emoji, 64, 66);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function textureEtiquette(titre, sousTitre, couleur) {
  const c = document.createElement('canvas');
  const g = c.getContext('2d');
  const police1 = '800 44px "Nunito","ui-rounded","SF Pro Rounded",system-ui,sans-serif';
  const police2 = '700 32px "Nunito","ui-rounded","SF Pro Rounded",system-ui,sans-serif';
  g.font = police1; const w1 = g.measureText(titre).width;
  g.font = police2; const w2 = g.measureText(sousTitre).width;
  const w = Math.ceil(Math.max(w1, w2) + 56), h = 120;
  c.width = w; c.height = h + 14;
  const arrondi = (x, y, l, H, r) => { g.beginPath(); g.roundRect(x, y, l, H, r); g.fill(); };
  g.fillStyle = 'rgba(0,0,0,.2)'; arrondi(0, 8, w, h, 30);
  g.fillStyle = '#fff'; arrondi(0, 0, w, h, 30);
  g.fillStyle = couleur; arrondi(0, 0, 14, h, [30, 0, 0, 30]);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#23301f'; g.font = police1; g.fillText(titre, w / 2 + 6, 40);
  g.fillStyle = '#6b7a66'; g.font = police2; g.fillText(sousTitre, w / 2 + 6, 86);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return { t, ratio: c.width / c.height };
}

const matPlat = (couleur) => new THREE.MeshLambertMaterial({ color: couleur, flatShading: true });

function arbre(r, x, z, echelle) {
  const g = new THREE.Group();
  const tronc = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 0.5, 6), matPlat('#8a5a32'));
  tronc.position.y = 0.25; g.add(tronc);
  const verts = ['#3fae49', '#57c457', '#2f9e44', '#7bd35a'];
  const rond = r() < 0.5;
  for (let i = 0; i < (rond ? 1 : 3); i++) {
    const geo = rond ? new THREE.IcosahedronGeometry(0.42, 0) : new THREE.ConeGeometry(0.42 - i * 0.1, 0.55, 7);
    const m = new THREE.Mesh(geo, matPlat(verts[Math.floor(r() * verts.length)]));
    m.position.y = rond ? 0.75 : 0.6 + i * 0.28; m.castShadow = true; g.add(m);
  }
  tronc.castShadow = true;
  g.position.set(x, 0, z); g.scale.setScalar(echelle); g.rotation.y = r() * Math.PI;
  return g;
}

// Souche laissée quand on coupe un arbre
function souche(x, z, echelle) {
  const g = new THREE.Group();
  const t = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 0.12, 8), matPlat('#8a5a32'));
  t.position.y = 0.06; t.castShadow = true; g.add(t);
  const dessus = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.01, 8), matPlat('#e0b77a'));
  dessus.position.y = 0.125; g.add(dessus);
  g.position.set(x, 0, z); g.scale.setScalar(echelle);
  return g;
}

function buisson(r, x, z) {
  const g = new THREE.Group();
  const couleurs = ['#ff6b8b', '#ffd23f', '#b07cff', '#ff9f43', '#ffffff'];
  const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 0), matPlat('#4cbb4f'));
  b.position.y = 0.15; b.castShadow = true; g.add(b);
  const coul = couleurs[Math.floor(r() * couleurs.length)];
  for (let i = 0; i < 4; i++) {
    const f = new THREE.Mesh(new THREE.IcosahedronGeometry(0.05, 0), matPlat(coul));
    const a = r() * Math.PI * 2;
    f.position.set(Math.cos(a) * 0.17, 0.22 + r() * 0.1, Math.sin(a) * 0.17); g.add(f);
  }
  g.position.set(x, 0, z);
  return g;
}

function nuage(r) {
  const g = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5 + r() * 0.4, 0),
      new THREE.MeshLambertMaterial({ color: '#ffffff', flatShading: true, transparent: true, opacity: 0.95, depthWrite: false }));
    m.position.set(i * 0.6 - 0.9, r() * 0.25, r() * 0.3); m.scale.y = 0.7; g.add(m);
  }
  return g;
}

// Motif du matériau (planches, pierres, briques, tôle…) dessiné dans la couleur choisie
function textureMateriau(materiau, couleur) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64;
  const g = c.getContext('2d');
  const base = new THREE.Color(couleur);
  const teinte = (k) => `#${base.clone().multiplyScalar(k).getHexString()}`;
  g.fillStyle = couleur; g.fillRect(0, 0, 256, 64);
  const r = alea(materiau.length * 7 + 3);
  if (materiau === 'bois') {
    for (let y = 0; y < 64; y += 16) { g.fillStyle = teinte(0.78); g.fillRect(0, y, 256, 2); }
    for (let i = 0; i < 40; i++) { g.fillStyle = teinte(0.88 + r() * 0.2); g.fillRect(r() * 256, Math.floor(r() * 4) * 16 + 4, 30 + r() * 60, 2); }
  } else if (materiau === 'brique') {
    g.fillStyle = '#d8cfc4'; g.fillRect(0, 0, 256, 64);
    for (let y = 0, row = 0; y < 64; y += 16, row++) for (let x = (row % 2) * -16; x < 256; x += 32) {
      g.fillStyle = teinte(0.85 + r() * 0.3); g.fillRect(x + 1, y + 1, 30, 14);
    }
  } else if (materiau === 'pierre') {
    g.fillStyle = teinte(0.6); g.fillRect(0, 0, 256, 64);
    for (let y = 0, row = 0; y < 64; y += 21, row++) for (let x = (row % 2) * -14; x < 256;) {
      const w = 22 + r() * 22; g.fillStyle = teinte(0.85 + r() * 0.35);
      g.beginPath(); g.roundRect(x + 1.5, y + 1.5, w - 3, 18, 5); g.fill(); x += w;
    }
  } else if (materiau === 'metal') {
    for (let x = 0; x < 256; x += 12) { g.fillStyle = teinte(1.25); g.fillRect(x, 0, 3, 64); g.fillStyle = teinte(0.75); g.fillRect(x + 7, 0, 3, 64); }
  } else if (materiau === 'beton') {
    for (let i = 0; i < 500; i++) { g.fillStyle = teinte(0.8 + r() * 0.4); g.fillRect(r() * 256, r() * 64, 2, 2); }
    g.fillStyle = teinte(0.7); g.fillRect(127, 0, 2, 64);
  } else {
    const grad = g.createLinearGradient(0, 0, 0, 64); grad.addColorStop(0, teinte(1.15)); grad.addColorStop(1, teinte(0.9));
    g.fillStyle = grad; g.fillRect(0, 0, 256, 64);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// Un bac du jardin, centré en (0,0). Renvoie le groupe et la hauteur du sol cultivé.
function construireBac(b, texture) {
  if (b.type === 'enclos') return construireEnclos(b);
  if (b.type === 'arbre') return construireArbres(b);
  if (b.type === 'maison') return construireMaison(b);
  const g = new THREE.Group();
  const l = b.largeur, L = b.longueur, couleur = b.couleur || '#c98a4b';
  const solMat = new THREE.MeshLambertMaterial({ map: texture || textureTerre() });
  const sol = (y) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(l, L), solMat);
    m.rotation.x = -Math.PI / 2; m.position.y = y; m.receiveShadow = true; g.add(m);
  };
  const mur = (lg, h, ep, x, y, z, tourne, mat) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(lg, h, ep), mat);
    m.position.set(x, y, z); if (tourne) m.rotation.y = Math.PI / 2;
    m.castShadow = true; m.receiveShadow = true; g.add(m); return m;
  };
  const materiauMur = (lg, h) => {
    const t = textureMateriau(b.materiau, couleur);
    t.repeat.set(Math.max(1, Math.round(lg / 1.2)), Math.max(1, h / 0.3));
    return new THREE.MeshLambertMaterial({ map: t });
  };
  const cadre4 = (h, ep, y) => {
    mur(l + ep * 2, h, ep, 0, y, -L / 2 - ep / 2, false, materiauMur(l, h));
    mur(l + ep * 2, h, ep, 0, y, L / 2 + ep / 2, false, materiauMur(l, h));
    mur(L, h, ep, -l / 2 - ep / 2, y, 0, true, materiauMur(L, h));
    mur(L, h, ep, l / 2 + ep / 2, y, 0, true, materiauMur(L, h));
  };

  if (b.type === 'bac') {
    const h = Math.min(1.2, Math.max(0.1, b.hauteur || 0.3)), ep = b.materiau === 'metal' ? 0.05 : 0.12;
    cadre4(h, ep, h / 2);
    if (b.materiau === 'bois') for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      mur(ep * 1.6, h + 0.08, ep * 1.6, x * (l / 2 + ep / 2), (h + 0.08) / 2, z * (L / 2 + ep / 2), false, matPlat(`#${new THREE.Color(couleur).multiplyScalar(0.8).getHexString()}`));
    }
    const fond = new THREE.Mesh(new THREE.BoxGeometry(l, h - 0.05, L), matPlat('#5a3a22'));
    fond.position.y = (h - 0.05) / 2; g.add(fond);
    sol(h - 0.04);
    return { groupe: g, hSol: h - 0.04 };
  }

  // Pleine terre et serre : une planche légèrement bombée au niveau du sol
  const butte = new THREE.Mesh(new THREE.BoxGeometry(l, 0.06, L), matPlat('#6a4228'));
  butte.position.y = 0.03; butte.receiveShadow = true; g.add(butte);
  sol(0.061);
  if (b.type === 'terre') {
    if (b.materiau === 'bois' || b.materiau === 'metal') cadre4(0.12, b.materiau === 'metal' ? 0.03 : 0.06, 0.06);
    if (b.materiau === 'pierre') {
      const r = alea(Math.round(l * 13 + L * 7)), mat = matPlat(couleur);
      const pierre = (x, z) => {
        const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.09 + r() * 0.04, 0), mat);
        m.position.set(x, 0.06, z); m.rotation.set(r() * 3, r() * 3, 0); m.castShadow = true; g.add(m);
      };
      for (let x = -l / 2; x <= l / 2 + 1e-6; x += 0.22) { pierre(x, -L / 2 - 0.1); pierre(x, L / 2 + 0.1); }
      for (let z = -L / 2 + 0.22; z < L / 2; z += 0.22) { pierre(-l / 2 - 0.1, z); pierre(l / 2 + 0.1, z); }
    }
    return { groupe: g, hSol: 0.061 };
  }

  // Serre : armature de la couleur choisie et parois transparentes
  const H = Math.min(3.5, Math.max(1.5, b.hauteur || 2.2));
  const vitre = new THREE.MeshLambertMaterial({
    color: b.materiau === 'verre' ? '#d8f3ff' : b.materiau === 'tunnel' ? '#f4fbff' : '#fbf6e8',
    transparent: true, opacity: b.materiau === 'verre' ? 0.16 : b.materiau === 'tunnel' ? 0.3 : 0.38,
    depthWrite: false, side: THREE.DoubleSide,
  });
  const armature = matPlat(couleur);
  const barre = (x1, y1, z1, x2, y2, z2) => {
    const a = new THREE.Vector3(x1, y1, z1), c = new THREE.Vector3(x2, y2, z2);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, a.distanceTo(c), 5), armature);
    m.position.copy(a).add(c).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), c.clone().sub(a).normalize());
    m.castShadow = true; g.add(m);
  };
  const W = l / 2 + 0.15, P = L / 2 + 0.15;
  const quad = (pts) => { // surface plane à 4 coins
    const geo = new THREE.BufferGeometry();
    const [p0, p1, p2, p3] = pts;
    geo.setAttribute('position', new THREE.Float32BufferAttribute([...p0, ...p1, ...p2, ...p0, ...p2, ...p3], 3));
    geo.computeVertexNormals(); g.add(new THREE.Mesh(geo, vitre));
  };
  if (b.materiau === 'tunnel') {
    const k = H / W;
    const arc = new THREE.Group(); arc.scale.y = k; g.add(arc);
    const voute = new THREE.Mesh(new THREE.CylinderGeometry(W, W, P * 2, 24, 1, true, Math.PI / 2, Math.PI), vitre);
    voute.rotation.x = Math.PI / 2; arc.add(voute);
    const n = Math.max(2, Math.round((P * 2) / 1.2));
    for (let i = 0; i <= n; i++) {
      const t = new THREE.Mesh(new THREE.TorusGeometry(W, 0.03, 5, 20, Math.PI), armature);
      t.position.z = -P + (i * P * 2) / n; t.castShadow = true; arc.add(t);
    }
  } else {
    const hm = H * 0.68; // hauteur des murs, puis toit à deux pentes
    for (const [x, z] of [[-W, -P], [W, -P], [W, P], [-W, P]]) barre(x, 0, z, x, hm, z);
    barre(-W, hm, -P, W, hm, -P); barre(-W, hm, P, W, hm, P); barre(-W, hm, -P, -W, hm, P); barre(W, hm, -P, W, hm, P);
    barre(0, H, -P, 0, H, P); barre(-W, hm, -P, 0, H, -P); barre(W, hm, -P, 0, H, -P); barre(-W, hm, P, 0, H, P); barre(W, hm, P, 0, H, P);
    quad([[-W, 0, -P], [W, 0, -P], [W, hm, -P], [-W, hm, -P]]);
    quad([[-W, 0, P], [W, 0, P], [W, hm, P], [-W, hm, P]]);
    quad([[-W, 0, -P], [-W, 0, P], [-W, hm, P], [-W, hm, -P]]);
    quad([[W, 0, -P], [W, 0, P], [W, hm, P], [W, hm, -P]]);
    quad([[-W, hm, -P], [0, H, -P], [0, H, P], [-W, hm, P]]);
    quad([[W, hm, -P], [0, H, -P], [0, H, P], [W, hm, P]]);
    for (const z of [-P, P]) {
      const tri = new THREE.BufferGeometry();
      tri.setAttribute('position', new THREE.Float32BufferAttribute([-W, hm, z, W, hm, z, 0, H, z], 3)); tri.computeVertexNormals();
      g.add(new THREE.Mesh(tri, vitre));
    }
  }
  return { groupe: g, hSol: 0.061 };
}

// ── Animaux low-poly ──────────────────────────────────────────────────
function boule(rayon, couleur, sx = 1, sy = 1, sz = 1) {
  const m = new THREE.Mesh(new THREE.IcosahedronGeometry(rayon, 1), matPlat(couleur));
  m.scale.set(sx, sy, sz); m.castShadow = true; return m;
}
function patte(x, z, h, couleur, ep = 0.025) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(ep, ep, h, 5), matPlat(couleur));
  m.position.set(x, h / 2, z); return m;
}
// Chaque animal regarde vers +z
function creerAnimal(type, r) {
  const g = new THREE.Group();
  if (type === 'poule' || type === 'canard') {
    const poule = type === 'poule';
    const corps = poule ? ['#f5efe2', '#b5651d', '#3a2a20'][Math.floor(r() * 3)] : ['#ffffff', '#8a6a3a'][Math.floor(r() * 2)];
    const c = boule(0.13, corps, 1, 0.9, poule ? 1.1 : 1.3); c.position.y = 0.17; g.add(c);
    const t = boule(0.07, corps); t.position.set(0, 0.3, poule ? 0.1 : 0.13); g.add(t);
    const bec = new THREE.Mesh(poule ? new THREE.ConeGeometry(0.025, 0.06, 4) : new THREE.BoxGeometry(0.06, 0.02, 0.07), matPlat(poule ? '#f2b134' : '#f39c12'));
    if (poule) bec.rotation.x = Math.PI / 2;
    bec.position.set(0, 0.29, poule ? 0.18 : 0.21); g.add(bec);
    if (poule) { const crete = boule(0.03, '#e53935', 0.6, 1, 1.4); crete.position.set(0, 0.38, 0.1); g.add(crete); }
    const queue = boule(0.06, corps, 0.6, 1, 1); queue.position.set(0, 0.24, -0.15); g.add(queue);
    g.add(patte(-0.05, 0, 0.09, '#f2b134', 0.012), patte(0.05, 0, 0.09, '#f2b134', 0.012));
  } else if (type === 'lapin') {
    const coul = ['#cfc2b0', '#ffffff', '#6b5444', '#9a9a9a'][Math.floor(r() * 4)];
    const c = boule(0.14, coul, 1, 0.85, 1.2); c.position.y = 0.13; g.add(c);
    const t = boule(0.08, coul); t.position.set(0, 0.22, 0.13); g.add(t);
    for (const x of [-0.035, 0.035]) {
      const o = new THREE.Mesh(new THREE.CapsuleGeometry(0.02, 0.12, 2, 6), matPlat(coul));
      o.position.set(x, 0.34, 0.1); o.rotation.x = -0.25; g.add(o);
    }
    const queue = boule(0.04, '#ffffff'); queue.position.set(0, 0.15, -0.17); g.add(queue);
  } else if (type === 'abeille') {
    // une ruche (les abeilles tournent autour, voir la boucle d'animation)
    const coul = ['#ffd23f', '#5aa9e6', '#ff8c42', '#7bd35a'][Math.floor(r() * 4)];
    for (let i = 0; i < 3; i++) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.22, 0.4), matPlat(i % 2 ? coul : '#ffffff'));
      b.position.y = 0.16 + i * 0.22; b.castShadow = true; g.add(b);
    }
    const toit = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.06, 0.48), matPlat('#8a8f99')); toit.position.y = 0.82; g.add(toit);
    const pied = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.06, 0.34), matPlat('#8a5a32')); pied.position.y = 0.03; g.add(pied);
    g.userData.fixe = true;
  } else {
    // quadrupèdes : mouton, chèvre, cochon
    const coul = type === 'mouton' ? '#f4f1ea' : type === 'cochon' ? '#f2a9b4' : ['#b98a5a', '#ffffff', '#3a2f28'][Math.floor(r() * 3)];
    const tete = type === 'mouton' ? '#3a2f28' : coul;
    const k = type === 'cochon' ? 0.85 : 1;
    const corps = type === 'mouton'
      ? new THREE.Mesh(new THREE.IcosahedronGeometry(0.3, 1), matPlat(coul))
      : boule(0.24, coul, 0.85, 0.8, 1.35);
    corps.scale.multiplyScalar(k); if (type === 'mouton') corps.scale.set(0.95, 0.85, 1.25);
    corps.position.y = 0.42 * k; corps.castShadow = true; g.add(corps);
    const t = boule(0.12, tete, 1, 1, 1.2); t.position.set(0, 0.58 * k, 0.36 * k); g.add(t);
    if (type === 'cochon') { const groin = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.05, 8), matPlat('#e98a9a')); groin.rotation.x = Math.PI / 2; groin.position.set(0, 0.52, 0.47); g.add(groin); }
    if (type === 'chevre') for (const x of [-0.05, 0.05]) {
      const corne = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.12, 5), matPlat('#d8cfbf')); corne.position.set(x, 0.72, 0.3); corne.rotation.x = -0.5; g.add(corne);
    }
    for (const x of [-0.11, 0.11]) for (const z of [-0.18, 0.18]) g.add(patte(x * k, z * k, 0.3 * k, type === 'mouton' ? '#3a2f28' : coul, 0.035));
  }
  return g;
}

// ── Arbres ────────────────────────────────────────────────────────────
// saison : 'fleur' (en fleurs), 'fruit' (chargé de fruits), 'automne' (feuillage d'automne) ou null
function creerArbre(espece, hauteur, saison, r) {
  const a = ARBRES[espece] || ARBRES.pommier;
  const g = new THREE.Group();
  const H = Math.max(1, hauteur || a.hauteur);
  let feuillage = a.feuillage;
  if (saison === 'automne' && !['sapin', 'palmier', 'olivier', 'citronnier'].includes(espece)) feuillage = espece === 'erable' ? '#e65100' : '#d4a02a';
  if (espece === 'erable' && saison !== 'automne') feuillage = '#4caf50';
  const fleurie = saison === 'fleur' && a.fleur;
  const couleurFeuilles = fleurie ? `#${new THREE.Color(feuillage).lerp(new THREE.Color(a.fleur), 0.55).getHexString()}` : feuillage;
  const tronc = (h, ep) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(ep * 0.7, ep, h, 6), matPlat(a.tronc || '#7a4b2a'));
    m.position.y = h / 2; m.castShadow = true; g.add(m); return m;
  };
  const houppiers = []; // [x, y, z, rayon] pour poser fleurs et fruits
  const masse = (x, y, z, rayon, sx = 1, sy = 1, sz = 1, coul = couleurFeuilles) => {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(rayon, 0), matPlat(coul));
    m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.rotation.set(r() * 3, r() * 3, 0); m.castShadow = true; g.add(m);
    houppiers.push([x, y, z, rayon * Math.max(sx, sy, sz)]);
  };
  if (a.forme === 'cone') {
    tronc(H * 0.2, H * 0.05);
    for (let i = 0; i < 3; i++) {
      const c = new THREE.Mesh(new THREE.ConeGeometry(H * (0.3 - i * 0.07), H * 0.42, 8), matPlat(feuillage));
      c.position.y = H * (0.38 + i * 0.2); c.castShadow = true; g.add(c);
    }
  } else if (a.forme === 'palmier') {
    let y = 0, x = 0;
    for (let i = 0; i < 6; i++) {
      const seg = new THREE.Mesh(new THREE.CylinderGeometry(H * 0.035, H * 0.045, H * 0.17, 6), matPlat(i % 2 ? '#8d6e4a' : '#7a5c3a'));
      x += H * 0.012 * i; seg.position.set(x, y + H * 0.085, 0); seg.castShadow = true; g.add(seg); y += H * 0.16;
    }
    for (let i = 0; i < 8; i++) {
      const f = new THREE.Mesh(new THREE.BoxGeometry(H * 0.42, 0.02, H * 0.09), matPlat(i % 2 ? feuillage : '#2e7d32'));
      f.geometry.translate(H * 0.21, 0, 0);
      f.position.set(x, y, 0); f.rotation.set(0, (i / 8) * Math.PI * 2, -0.45); f.castShadow = true; g.add(f);
    }
  } else if (a.forme === 'buisson') {
    for (let i = 0; i < 4; i++) {
      const t = new THREE.Mesh(new THREE.CylinderGeometry(H * 0.02, H * 0.03, H * 0.5, 5), matPlat('#7a4b2a'));
      t.position.set((r() - 0.5) * H * 0.2, H * 0.25, (r() - 0.5) * H * 0.2); t.rotation.z = (r() - 0.5) * 0.4; g.add(t);
    }
    masse(0, H * 0.55, 0, H * 0.3, 1.2, 0.9, 1.2);
    masse(H * 0.18, H * 0.45, H * 0.1, H * 0.2); masse(-H * 0.18, H * 0.48, -H * 0.08, H * 0.2);
  } else if (a.forme === 'pleureur') {
    tronc(H * 0.5, H * 0.06);
    masse(0, H * 0.62, 0, H * 0.3, 1.3, 0.8, 1.3);
    const rideau = new THREE.Mesh(new THREE.CylinderGeometry(H * 0.3, H * 0.42, H * 0.55, 10, 1, true), new THREE.MeshLambertMaterial({ color: feuillage, flatShading: true, side: THREE.DoubleSide }));
    rideau.position.y = H * 0.4; rideau.castShadow = true; g.add(rideau);
  } else {
    const large = a.forme === 'large', colonne = a.forme === 'colonne';
    tronc(H * (colonne ? 0.35 : 0.4), H * (large ? 0.07 : 0.05));
    const R = H * (large ? 0.3 : colonne ? 0.22 : 0.28);
    masse(0, H * (colonne ? 0.62 : 0.62), 0, R, large ? 1.35 : 1, colonne ? 1.7 : large ? 0.75 : 1, large ? 1.35 : 1);
    if (!colonne) { masse(R * 0.7, H * 0.55, R * 0.2, R * 0.65); masse(-R * 0.6, H * 0.58, -R * 0.3, R * 0.6); }
  }
  // fleurs ou fruits à la surface du feuillage
  const decor = fleurie ? a.fleur : saison === 'fruit' && a.fruit ? a.fruit : null;
  if (decor && houppiers.length) {
    const n = fleurie ? 26 : 16;
    for (let i = 0; i < n; i++) {
      const [cx, cy, cz, rr] = houppiers[i % houppiers.length];
      const th = r() * Math.PI * 2, ph = Math.acos(1 - r() * 1.4);
      const m = new THREE.Mesh(new THREE.IcosahedronGeometry(fleurie ? H * 0.025 : H * 0.04, 0), matPlat(decor));
      m.position.set(cx + rr * Math.sin(ph) * Math.cos(th), cy + rr * Math.cos(ph) * 0.9, cz + rr * Math.sin(ph) * Math.sin(th));
      g.add(m);
    }
  }
  g.rotation.y = r() * Math.PI * 2;
  return g;
}

function construireArbres(b) {
  const g = new THREE.Group();
  const a = ARBRES[b.espece] || ARBRES.pommier;
  const n = Math.max(1, Math.min(60, Math.round(b.nombre || 1)));
  const cols = Math.ceil(Math.sqrt(n)), rangs = Math.ceil(n / cols);
  const pasX = b.largeur / cols, pasZ = b.longueur / rangs;
  const r = alea(Math.round(b.largeur * 7 + n * 13) + (b.espece || '').length);
  for (let i = 0; i < n; i++) {
    const x = -b.largeur / 2 + pasX * ((i % cols) + 0.5), z = -b.longueur / 2 + pasZ * (Math.floor(i / cols) + 0.5);
    const pied = new THREE.Mesh(new THREE.CylinderGeometry(Math.min(pasX, pasZ) * 0.22, Math.min(pasX, pasZ) * 0.25, 0.04, 12), matPlat('#7a5a3a'));
    pied.position.set(x, 0.02, z); pied.receiveShadow = true; g.add(pied);
    const arbre = creerArbre(b.espece, (b.hauteur || a.hauteur) * (0.9 + r() * 0.2), b.saison, r);
    arbre.position.set(x, 0.02, z); g.add(arbre);
  }
  return { groupe: g, hSol: 0.04 };
}

// Clôture + abri + animaux. Les animaux se baladent dans les limites (voir la boucle).
function construireEnclos(b) {
  const g = new THREE.Group();
  const l = b.largeur, L = b.longueur, couleur = b.couleur || '#c98a4b', H = Math.min(2, Math.max(0.4, b.hauteur || 1.2));
  const animal = b.animal || 'poule';
  const solCoul = { poule: '#c9b27a', canard: '#7cc860', lapin: '#8fd16a', mouton: '#79c95a', chevre: '#9bc95a', cochon: '#8a6a4a', abeille: '#7cc860' }[animal];
  const sol = new THREE.Mesh(new THREE.BoxGeometry(l, 0.04, L), matPlat(solCoul));
  sol.position.y = 0.02; sol.receiveShadow = true; g.add(sol);
  const r = alea(Math.round(l * 31 + L * 17) + animal.length);
  const mat = matPlat(couleur);
  const poteau = (x, z, h, ep = 0.05) => { const m = new THREE.Mesh(new THREE.BoxGeometry(ep, h, ep), mat); m.position.set(x, h / 2, z); m.castShadow = true; g.add(m); };
  const cotes = [[-l / 2, -L / 2, l / 2, -L / 2], [l / 2, -L / 2, l / 2, L / 2], [l / 2, L / 2, -l / 2, L / 2], [-l / 2, L / 2, -l / 2, -L / 2]];
  for (const [x1, z1, x2, z2] of cotes) {
    const lg = Math.hypot(x2 - x1, z2 - z1), dx = (x2 - x1) / lg, dz = (z2 - z1) / lg;
    if (b.materiau === 'pierre') {
      const t = textureMateriau('pierre', couleur); t.repeat.set(Math.max(1, Math.round(lg / 1.2)), 1);
      const m = new THREE.Mesh(new THREE.BoxGeometry(lg + 0.2, Math.min(H, 0.7), 0.2), new THREE.MeshLambertMaterial({ map: t }));
      m.position.set((x1 + x2) / 2, Math.min(H, 0.7) / 2, (z1 + z2) / 2); m.rotation.y = Math.atan2(-dz, dx); m.castShadow = true; g.add(m);
      continue;
    }
    const pas = b.materiau === 'piquets' ? 0.12 : 1;
    const n = Math.max(1, Math.round(lg / pas));
    for (let i = 0; i <= n; i++) {
      const x = x1 + dx * (lg * i) / n, z = z1 + dz * (lg * i) / n;
      poteau(x, z, b.materiau === 'piquets' ? H * (0.9 + r() * 0.15) : H, b.materiau === 'piquets' ? 0.04 : 0.06);
    }
    if (b.materiau === 'bois' || b.materiau === 'piquets') {
      for (const y of b.materiau === 'bois' ? [H * 0.35, H * 0.8] : [H * 0.25, H * 0.75]) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(lg, 0.05, 0.03), mat);
        m.position.set((x1 + x2) / 2, y, (z1 + z2) / 2); m.rotation.y = Math.atan2(-dz, dx); g.add(m);
      }
    } else if (b.materiau === 'grillage') {
      const c = document.createElement('canvas'); c.width = c.height = 32;
      const cg = c.getContext('2d'); cg.strokeStyle = '#ffffff'; cg.lineWidth = 2;
      cg.beginPath(); cg.moveTo(0, 0); cg.lineTo(32, 32); cg.moveTo(32, 0); cg.lineTo(0, 32); cg.stroke();
      const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(lg * 6, H * 6);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(lg, H), new THREE.MeshBasicMaterial({ map: t, color: couleur, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide }));
      m.position.set((x1 + x2) / 2, H / 2, (z1 + z2) / 2); m.rotation.y = Math.atan2(-dz, dx); g.add(m);
    }
  }
  // Abri (poulailler, clapier…) dans un coin
  if (b.cabane !== false && animal !== 'abeille') {
    const tl = Math.min(1.4, l * 0.35), tL = Math.min(1.1, L * 0.35), th = animal === 'poule' || animal === 'lapin' || animal === 'canard' ? 0.7 : 1.1;
    const cab = new THREE.Group();
    const murs = new THREE.Mesh(new THREE.BoxGeometry(tl, th, tL), new THREE.MeshLambertMaterial({ map: textureMateriau('bois', couleur) }));
    murs.position.y = th / 2 + (animal === 'poule' ? 0.2 : 0); murs.castShadow = true; cab.add(murs);
    if (animal === 'poule') for (const x of [-1, 1]) for (const z of [-1, 1]) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.2, 0.06), mat); p.position.set(x * (tl / 2 - 0.05), 0.1, z * (tL / 2 - 0.05)); cab.add(p);
    }
    const toit = new THREE.Mesh(new THREE.ConeGeometry(Math.hypot(tl, tL) * 0.62, th * 0.55, 4), matPlat('#c0503f'));
    toit.rotation.y = Math.PI / 4; toit.position.y = murs.position.y + th / 2 + th * 0.27; toit.castShadow = true; cab.add(toit);
    const porte = new THREE.Mesh(new THREE.PlaneGeometry(tl * 0.3, th * 0.55), matPlat('#3a2a20'));
    porte.position.set(0, murs.position.y - th * 0.15, tL / 2 + 0.002); cab.add(porte);
    cab.position.set(-l / 2 + tl / 2 + 0.15, 0, -L / 2 + tL / 2 + 0.15);
    g.add(cab);
  }
  if (animal === 'canard') { // une petite mare
    const mare = new THREE.Mesh(new THREE.CylinderGeometry(Math.min(l, L) * 0.18, Math.min(l, L) * 0.18, 0.02, 16), new THREE.MeshLambertMaterial({ color: '#5ab4f0' }));
    mare.position.set(l * 0.22, 0.045, L * 0.2); mare.scale.z = 0.7; g.add(mare);
  }
  // Les animaux
  const animaux = [];
  const nb = Math.min(30, Math.max(1, Math.round(b.nombre || 1)));
  const marge = 0.3, bornes = { x: l / 2 - marge, z: L / 2 - marge };
  for (let i = 0; i < nb; i++) {
    const a = creerAnimal(animal, r);
    if (animal === 'abeille') a.position.set(-l / 2 + 0.5 + ((i * 0.8) % Math.max(0.8, l - 1)), 0.04, L / 2 - 0.5 - Math.floor((i * 0.8) / Math.max(0.8, l - 1)) * 0.8);
    else a.position.set((r() - 0.5) * 2 * bornes.x * 0.8, 0.04, (r() - 0.5) * 2 * bornes.z * 0.8);
    a.rotation.y = r() * Math.PI * 2;
    a.scale.setScalar(animal === 'abeille' ? 1.2 : animal === 'poule' || animal === 'canard' || animal === 'lapin' ? 1.9 : 1.4);
    a.userData.anim = { bornes, cible: null, attente: r() * 3, vitesse: animal === 'lapin' ? 0.6 : animal === 'poule' || animal === 'canard' ? 0.35 : 0.25, phase: r() * 6, type: animal };
    g.add(a); animaux.push(a);
  }
  if (animal === 'abeille') { // un petit essaim autour des ruches
    for (let i = 0; i < Math.min(40, nb * 8); i++) {
      const ab = boule(0.025, i % 2 ? '#ffd23f' : '#3a2f28'); ab.castShadow = false;
      ab.userData.essaim = { cx: animaux[i % animaux.length].position.x, cz: animaux[i % animaux.length].position.z, a: r() * 6, v: 0.8 + r() * 1.5, rayon: 0.3 + r() * 0.6, h: 0.4 + r() * 0.8 };
      g.add(ab); animaux.push(ab);
    }
  }
  return { groupe: g, hSol: 0.04, animaux };
}

// ── Maison ────────────────────────────────────────────────────────────
function construireMaison(b) {
  const g = new THREE.Group();
  const l = b.largeur, L = b.longueur, H = Math.min(6, Math.max(2, b.hauteur || 2.6));
  const t = textureMateriau(b.materiau === 'enduit' ? 'beton' : b.materiau, b.couleur || '#e9d8b4');
  t.repeat.set(Math.max(1, Math.round(l / 1.5)), Math.max(1, Math.round(H / 0.8)));
  const murs = new THREE.Mesh(new THREE.BoxGeometry(l, H, L), new THREE.MeshLambertMaterial({ map: t }));
  murs.position.y = H / 2; murs.castShadow = true; murs.receiveShadow = true; g.add(murs);
  // toit à deux pentes (prisme), un peu plus grand que les murs
  const d = 0.35, hT = Math.min(l, L) * 0.45, W = l / 2 + d, P = L / 2 + d;
  const v = [-W, 0, -P, W, 0, -P, 0, hT, -P, -W, 0, P, W, 0, P, 0, hT, P];
  const idx = [0, 2, 1, 3, 4, 5, 0, 3, 5, 0, 5, 2, 1, 2, 5, 1, 5, 4, 0, 1, 4, 0, 4, 3];
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); geo.setIndex(idx); geo.computeVertexNormals();
  const toit = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: b.toit || '#c0503f', flatShading: true, side: THREE.DoubleSide }));
  toit.position.y = H; toit.castShadow = true; g.add(toit);
  // cheminée
  const ch = new THREE.Mesh(new THREE.BoxGeometry(0.4, hT * 0.9, 0.4), matPlat('#8a8f99')); ch.position.set(l * 0.25, H + hT * 0.55, -L * 0.15); ch.castShadow = true; g.add(ch);
  // porte et fenêtres côté +z
  const porte = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.9, 0.06), matPlat('#7a4b2a')); porte.position.set(0, 0.95, L / 2 + 0.02); g.add(porte);
  const poignee = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), matPlat('#ffd23f')); poignee.position.set(0.3, 0.95, L / 2 + 0.07); g.add(poignee);
  const fenetre = (x, y, z, ry) => {
    const f = new THREE.Group();
    const cadre = new THREE.Mesh(new THREE.BoxGeometry(1, 0.9, 0.06), matPlat('#ffffff')); f.add(cadre);
    const vitre = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.74, 0.07), new THREE.MeshLambertMaterial({ color: '#9fd8ff', emissive: '#2a5a7a', emissiveIntensity: 0.3 })); f.add(vitre);
    const croix = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.74, 0.08), matPlat('#ffffff')); f.add(croix);
    const fleurs = new THREE.Mesh(new THREE.BoxGeometry(1, 0.15, 0.2), matPlat('#7a4b2a')); fleurs.position.set(0, -0.52, 0.1); f.add(fleurs);
    for (let i = 0; i < 4; i++) { const fl = new THREE.Mesh(new THREE.IcosahedronGeometry(0.07, 0), matPlat(['#ff6b8b', '#ffd23f', '#ffffff', '#b07cff'][i])); fl.position.set(-0.36 + i * 0.24, -0.4, 0.12); f.add(fl); }
    f.position.set(x, y, z); f.rotation.y = ry; g.add(f);
  };
  if (l > 2.6) { fenetre(-l * 0.3, H * 0.55, L / 2 + 0.03, 0); fenetre(l * 0.3, H * 0.55, L / 2 + 0.03, 0); }
  fenetre(l / 2 + 0.03, H * 0.55, 0, Math.PI / 2); fenetre(-l / 2 - 0.03, H * 0.55, 0, -Math.PI / 2);
  // petit chemin devant la porte
  for (let i = 0; i < 3; i++) { const dalle = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.04, 8), matPlat('#c9ccd6')); dalle.position.set((i % 2 ? 0.1 : -0.1), 0.02, L / 2 + 0.5 + i * 0.6); g.add(dalle); }
  return { groupe: g, hSol: 0.04 };
}

// ── Personnage ────────────────────────────────────────────────────────
function creerPerso(p) {
  const g = new THREE.Group();
  const corps = new THREE.Group(); g.add(corps);
  const boite = (x, y, z, l, h, e, c) => { const m = new THREE.Mesh(new THREE.BoxGeometry(l, h, e), matPlat(c)); m.position.set(x, y, z); m.castShadow = true; return m; };
  const jambeG = new THREE.Group(), jambeD = new THREE.Group();
  for (const [j, x] of [[jambeG, -0.11], [jambeD, 0.11]]) {
    j.position.set(x, 0.8, 0); j.add(boite(0, -0.4, 0, 0.18, 0.8, 0.2, p.bas)); j.add(boite(0, -0.78, 0.04, 0.2, 0.08, 0.28, '#3a2a20')); corps.add(j);
  }
  corps.add(boite(0, 1.12, 0, 0.5, 0.65, 0.3, p.haut));
  const brasG = new THREE.Group(), brasD = new THREE.Group();
  for (const [b, x] of [[brasG, -0.32], [brasD, 0.32]]) {
    b.position.set(x, 1.4, 0); b.add(boite(0, -0.28, 0, 0.14, 0.56, 0.16, p.haut)); b.add(boite(0, -0.6, 0, 0.13, 0.12, 0.14, p.peau)); corps.add(b);
  }
  const tete = new THREE.Group(); tete.position.y = 1.66; corps.add(tete);
  tete.add(boite(0, 0, 0, 0.36, 0.38, 0.34, p.peau));
  for (const x of [-0.08, 0.08]) tete.add(boite(x, 0.03, 0.175, 0.05, 0.06, 0.02, '#2b1d14'));
  tete.add(boite(0, -0.09, 0.175, 0.12, 0.03, 0.02, '#c0504d'));
  const ch = p.cheveux;
  if (p.coiffure !== 'chauve') {
    tete.add(boite(0, 0.2, -0.02, 0.4, 0.1, 0.38, ch));
    tete.add(boite(0, 0.06, -0.18, 0.4, 0.3, 0.06, ch));
    if (p.coiffure === 'long') tete.add(boite(0, -0.2, -0.18, 0.4, 0.42, 0.08, ch));
    if (p.coiffure === 'couettes') for (const x of [-0.25, 0.25]) { const c = new THREE.Mesh(new THREE.IcosahedronGeometry(0.1, 0), matPlat(ch)); c.position.set(x, 0, -0.1); tete.add(c); }
    if (p.coiffure === 'boucles') for (let i = 0; i < 7; i++) { const c = new THREE.Mesh(new THREE.IcosahedronGeometry(0.09, 0), matPlat(ch)); c.position.set(-0.18 + i * 0.06, 0.2 + (i % 2) * 0.04, -0.05 + (i % 3) * 0.05); tete.add(c); }
  }
  if (p.chapeau === 'paille') {
    const bord = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.03, 16), matPlat('#e8c86a')); bord.position.y = 0.24; tete.add(bord);
    const haut = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.18, 12), matPlat('#e8c86a')); haut.position.y = 0.33; tete.add(haut);
    const ruban = new THREE.Mesh(new THREE.CylinderGeometry(0.225, 0.225, 0.05, 12), matPlat('#c0504d')); ruban.position.y = 0.27; tete.add(ruban);
  } else if (p.chapeau === 'casquette') {
    const c = new THREE.Mesh(new THREE.SphereGeometry(0.21, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), matPlat(p.haut)); c.position.y = 0.18; tete.add(c);
    tete.add(boite(0, 0.19, 0.25, 0.3, 0.03, 0.2, p.haut));
  } else if (p.chapeau === 'bonnet') {
    const c = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), matPlat('#e74c3c')); c.position.y = 0.16; tete.add(c);
    const pompon = new THREE.Mesh(new THREE.IcosahedronGeometry(0.07, 0), matPlat('#ffffff')); pompon.position.y = 0.4; tete.add(pompon);
  }
  if (p.outil === 'arrosoir') {
    const a = new THREE.Group(); a.add(boite(0, 0, 0, 0.24, 0.22, 0.16, '#3fbf5f'));
    const bec = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.3, 6), matPlat('#3fbf5f')); bec.rotation.z = -1; bec.position.set(0.2, 0.06, 0); a.add(bec);
    a.position.set(0.05, -0.72, 0.05); brasD.add(a);
  } else if (p.outil === 'panier') {
    const a = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.12, 0.16, 10), matPlat('#c98a4b')); a.position.set(0, -0.72, 0.05); brasD.add(a);
    for (let i = 0; i < 3; i++) { const f = new THREE.Mesh(new THREE.IcosahedronGeometry(0.05, 0), matPlat(['#e53935', '#ff9f1c', '#3fbf5f'][i])); f.position.set(-0.06 + i * 0.06, -0.62, 0.05); brasD.add(f); }
  } else if (p.outil === 'pelle') {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.9, 5), matPlat('#8a5a32')); m.position.set(0, -0.6, 0.1); brasD.add(m);
    brasD.add(boite(0, -1.08, 0.1, 0.18, 0.22, 0.03, '#9aa3ad'));
  }
  g.scale.setScalar(1.25);
  g.userData = { perso: true, jambeG, jambeD, brasG, brasD, tete, cible: null, attente: 1, salut: 0 };
  return g;
}

// Texture d'un emoji pour les particules (mise en cache)
const cacheEmoji = new Map();
function textureEmoji(e) {
  if (cacheEmoji.has(e)) return cacheEmoji.get(e);
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  g.font = '48px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(e, 32, 36);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  cacheEmoji.set(e, t); return t;
}

export function creerScene(conteneur, { onSelect, onDecor, onDeplace, onInstallation, onPerso } = {}) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, alpha: false });
  } catch {
    conteneur.innerHTML = '<p class="sans-3d">😕 La 3D n\'est pas disponible sur cet appareil.</p>';
    return null;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  conteneur.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
  const controles = new OrbitControls(camera, renderer.domElement);
  controles.enableDamping = true;
  controles.dampingFactor = 0.08;
  controles.maxPolarAngle = Math.PI / 2 - 0.08;
  controles.minPolarAngle = 0.15;
  controles.enablePan = false;
  controles.autoRotateSpeed = 1.2;

  const hemi = new THREE.HemisphereLight('#ffffff', '#5c8a3a', 1.6);
  scene.add(hemi);
  const soleil = new THREE.DirectionalLight('#fff4dd', 2.2);
  soleil.castShadow = true;
  soleil.shadow.mapSize.set(1024, 1024);
  soleil.shadow.bias = -0.0005;
  scene.add(soleil, soleil.target);

  const ile = new THREE.Group(); scene.add(ile);
  const marqueurs = new THREE.Group(); scene.add(marqueurs);
  const ciel = new THREE.Group(); scene.add(ciel);
  const ombreTex = textureOmbre();

  let jardin = { bacs: [], places: {}, hSol: {}, coupes: new Set() };
  let textures = [];
  let troupeau = [];
  let decorArbres = [];
  let groupesBacs = {}; // id → groupe 3D de chaque installation
  let modeDeplacer = false, saisie = null;
  const solPlan = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); // arbres du décor qu'on peut couper
  const chutes = []; // arbres en train de tomber
  const effets = new THREE.Group(); // particules (étincelles, cœurs, feuilles…)
  let perso = null; // le personnage du joueur
  let vol = null; // déplacement animé de la caméra (zoom sur une installation)
  const tweens = []; // petites animations quand on touche quelque chose

  // Gerbe de petits emojis qui jaillissent puis retombent
  function jaillir(pos, emojis, n = 8, taille = 0.35, force = 1) {
    for (let i = 0; i < n; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: textureEmoji(emojis[i % emojis.length]), transparent: true, depthWrite: false }));
      sp.position.copy(pos); sp.scale.setScalar(taille * (0.7 + Math.random() * 0.6));
      const a = Math.random() * Math.PI * 2, v = (0.8 + Math.random() * 1.4) * force;
      sp.userData = { v: new THREE.Vector3(Math.cos(a) * v, (2 + Math.random() * 1.5) * force, Math.sin(a) * v), vie: 0, duree: 0.9 + Math.random() * 0.5, taille: sp.scale.x };
      effets.add(sp);
    }
  }
  // Onde qui s'élargit sur le sol
  function onde(pos, couleur = '#ffffff') {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.42, 32), new THREE.MeshBasicMaterial({ color: couleur, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide }));
    m.rotation.x = -Math.PI / 2; m.position.copy(pos); m.position.y += 0.05;
    m.userData = { onde: true, vie: 0, duree: 0.7 };
    effets.add(m);
  }
  // type : 'rebond' (s'écrase puis rebondit), 'secoue' (tremble), 'saut' (petit bond), 'tourne'
  function animer(obj, type, duree = 0.6) {
    const ancien = tweens.find((t) => t.obj === obj);
    if (ancien) { ancien.t = 0; return; }
    tweens.push({ obj, type, t: 0, duree, echelle: obj.scale.clone(), rotY: obj.rotation.y, rotZ: obj.rotation.z });
  }
  function majEffets(dt) {
    for (let i = tweens.length - 1; i >= 0; i--) {
      const w = tweens[i]; w.t += dt;
      const k = Math.min(1, w.t / w.duree), amort = 1 - k;
      if (w.type === 'rebond') {
        const o = Math.sin(k * Math.PI * 3) * 0.22 * amort;
        w.obj.scale.set(w.echelle.x * (1 - o * 0.5), w.echelle.y * (1 + o), w.echelle.z * (1 - o * 0.5));
      } else if (w.type === 'secoue') {
        w.obj.rotation.z = w.rotZ + Math.sin(k * Math.PI * 8) * 0.12 * amort;
      } else if (w.type === 'saut') {
        w.obj.position.y += Math.sin(k * Math.PI) * 0.45;
        w.obj.rotation.y = w.rotY + k * Math.PI * 2;
      } else if (w.type === 'tourne') {
        const o = Math.sin(k * Math.PI) * 0.35;
        w.obj.scale.set(w.echelle.x * (1 + o), w.echelle.y * (1 + o), 1);
        w.obj.material.rotation = k * Math.PI * 2;
      }
      if (k >= 1) {
        w.obj.scale.copy(w.echelle);
        if (w.type === 'secoue') w.obj.rotation.z = w.rotZ;
        if (w.type === 'tourne') w.obj.material.rotation = 0;
        tweens.splice(i, 1);
      }
    }
    for (let i = effets.children.length - 1; i >= 0; i--) {
      const p = effets.children[i], u = p.userData; u.vie += dt;
      const k = u.vie / u.duree;
      if (u.onde) { p.scale.setScalar(1 + k * 4); p.material.opacity = 0.9 * (1 - k); }
      else {
        u.v.y -= 6 * dt; p.position.addScaledVector(u.v, dt);
        p.material.opacity = k > 0.6 ? 1 - (k - 0.6) / 0.4 : 1;
        p.scale.setScalar(u.taille * (k < 0.15 ? k / 0.15 : 1));
      }
      if (k >= 1) { effets.remove(p); p.material.dispose(); p.geometry?.dispose?.(); }
    }
  }
  let modeEtiquettes = 'auto';
  let selection = null;
  let fondActuel = 'ciel';

  function construireIle() {
    ile.clear();
    const { places, rayon } = disposerBacs(jardin.bacs);
    jardin.places = places; jardin.hSol = {};
    const R = Math.max(3.2, rayon + 1.8, (jardin.taille || 0) / 2);
    const r = alea(42);

    // Île flottante low-poly : herbe, terre et roche
    const herbe = new THREE.Mesh(new THREE.CylinderGeometry(R, R * 0.97, 0.35, 14), matPlat('#6fcf4f'));
    herbe.position.y = -0.175; herbe.receiveShadow = true; ile.add(herbe);
    const bordHerbe = new THREE.Mesh(new THREE.CylinderGeometry(R * 1.005, R * 1.005, 0.08, 14, 1, true), matPlat('#4fb43e'));
    bordHerbe.position.y = -0.3; ile.add(bordHerbe);
    const terre = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.97, R * 0.75, 0.6, 14), matPlat('#b9783f'));
    terre.position.y = -0.65; ile.add(terre);
    const roche = new THREE.Mesh(new THREE.ConeGeometry(R * 0.75, R * 0.9, 14), matPlat('#8c5a33'));
    roche.rotation.x = Math.PI; roche.position.y = -0.95 - R * 0.45; ile.add(roche);
    const pointe = new THREE.Mesh(new THREE.ConeGeometry(R * 0.35, R * 0.5, 7), matPlat('#7a7f8c'));
    pointe.rotation.x = Math.PI; pointe.position.set(R * 0.2, -1.1 - R * 0.6, 0.1); ile.add(pointe);

    // Les bacs du jardin, chacun à sa place
    troupeau = []; groupesBacs = {};
    for (const b of jardin.bacs) {
      const { groupe, hSol, animaux = [] } = construireBac(b, b.texture);
      troupeau.push(...animaux);
      groupe.position.set(places[b.id].x, 0, places[b.id].z);
      groupe.userData.bacId = b.id; groupesBacs[b.id] = groupe;
      jardin.hSol[b.id] = hSol;
      ile.add(groupe);
    }

    // Décor : arbres, buissons fleuris, cailloux, sur l'anneau autour du bac
    decorArbres = [];
    // Le décor couvre toute l'île (positions fixes) mais évite les installations
    const occupe = (x, z, marge = 0.7) => jardin.bacs.some((b) => {
      const p = places[b.id];
      return Math.abs(x - p.x) < b.largeur / 2 + marge && Math.abs(z - p.z) < b.longueur / 2 + marge;
    });
    const nDecor = Math.round(9 * Math.max(1, (R / 5) ** 1.5));
    for (let i = 0; i < nDecor; i++) {
      const a = (i / nDecor) * Math.PI * 2 + r() * 0.4;
      const d = 0.8 + Math.sqrt(r()) * (R - 1.4);
      if (r() < 0.6) {
        const x = Math.cos(a) * d, z = Math.sin(a) * d, ech = (0.7 + r() * 0.5) * Math.max(1, R / 9);
        const cle = `${Math.round(x * 10)},${Math.round(z * 10)}`;
        if (occupe(x, z, 0.5 + 0.4 * ech)) continue;
        if (jardin.coupes.has(cle)) { ile.add(souche(x, z, ech)); continue; }
        // hasard propre à chaque arbre : en couper un ne change pas les autres
        const ar = arbre(alea(1000 + i), x, z, ech); ar.userData.cle = cle; ar.userData.ech = ech;
        decorArbres.push(ar); ile.add(ar);
      }
      else if (!occupe(Math.cos(a) * d, Math.sin(a) * d, 0.4)) ile.add(buisson(alea(2000 + i), Math.cos(a) * d, Math.sin(a) * d));
    }
    for (let i = 0; i < nDecor + 1; i++) {
      // tirages faits avant de savoir si la place est libre : le décor ne bouge pas quand on déplace une installation
      const a = r() * Math.PI * 2, d = 0.5 + Math.sqrt(r()) * (R - 0.8), estBuisson = r() < 0.5, taille = r();
      if (occupe(Math.cos(a) * d, Math.sin(a) * d, 0.3)) continue;
      if (estBuisson) ile.add(buisson(alea(3000 + i), Math.cos(a) * d, Math.sin(a) * d));
      else {
        const c = new THREE.Mesh(new THREE.DodecahedronGeometry(0.08 + taille * 0.08, 0), matPlat('#c9ccd6'));
        c.position.set(Math.cos(a) * d, 0.03, Math.sin(a) * d); c.castShadow = true; ile.add(c);
      }
    }

    // Nuages qui flottent autour
    ciel.clear();
    for (let i = 0; i < 5; i++) {
      const n = nuage(r);
      const a = (i / 5) * Math.PI * 2;
      n.userData = { a, d: R + 1.5 + r() * 1.5, h: R * 0.5 + r() * R * 0.4, v: 0.02 + r() * 0.03 };
      n.scale.setScalar(0.6 + r() * 0.3);
      ciel.add(n);
    }

    // Soleil et caméra adaptés à la taille
    soleil.position.set(R * 0.8, R * 2, R * 0.6);
    const s = soleil.shadow.camera; s.left = s.bottom = -R * 1.2; s.right = s.top = R * 1.2; s.near = 0.5; s.far = R * 6; s.updateProjectionMatrix();
    controles.minDistance = 1.5; controles.maxDistance = R * 5;
    camera.far = R * 30; camera.updateProjectionMatrix();
    return R;
  }

  function volVers(cible, cam) {
    controles.autoRotate = false;
    vol = { t: 0, camDe: camera.position.clone(), camA: cam, cibleDe: controles.target.clone(), cibleA: cible };
  }

  function cadrer(R) {
    // En portrait, on recule davantage pour voir toute l'île (et son dessous rocheux)
    const ratio = (conteneur.clientWidth || 1) / (conteneur.clientHeight || 1);
    const k = ratio < 0.8 ? 1.4 : 1;
    camera.position.set(R * 0.2 * k, R * 1.15 * k, R * 2.35 * k);
    controles.target.set(0, -R * 0.12, 0);
    controles.update();
  }

  function appliquerFond(nom) {
    fondActuel = FONDS[nom] ? nom : 'ciel';
    const f = FONDS[fondActuel];
    if (scene.background && scene.background.dispose) scene.background.dispose();
    scene.background = textureFond(f);
    scene.fog = new THREE.Fog(f.brume, Math.max(30, R * 5), Math.max(80, R * 12));
    hemi.intensity = 1.6 * f.lumiere; soleil.intensity = 2.2 * f.lumiere;
    soleil.color.set(fondActuel === 'nuit' ? '#b9c4ff' : fondActuel === 'coucher' ? '#ffd1a6' : '#fff4dd');
    ciel.visible = fondActuel !== 'studio';
    for (const n of ciel.children) n.children.forEach((m) => m.material.color.set(fondActuel === 'nuit' ? '#8f95d6' : '#ffffff'));
    const ancien = scene.getObjectByName('etoiles'); if (ancien) scene.remove(ancien);
    if (f.etoiles) {
      const r = alea(3), pts = [];
      for (let i = 0; i < 300; i++) {
        const a = r() * Math.PI * 2, h = 0.15 + r() * 0.85;
        const d = Math.max(60, R * 8);
        pts.push(Math.cos(a) * d * Math.sqrt(1 - h * h), h * d, Math.sin(a) * d * Math.sqrt(1 - h * h));
      }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      const etoiles = new THREE.Points(geo, new THREE.PointsMaterial({ color: '#ffffff', size: Math.max(0.9, R * 0.12), fog: false }));
      etoiles.name = 'etoiles'; scene.add(etoiles);
    }
  }

  let R = construireIle();
  cadrer(R);
  appliquerFond('ciel');

  // ── Marqueurs des plantations ──
  function majPlantations(liste) {
    for (const m of marqueurs.children) m.traverse((o) => { if (o.material) { o.material.map?.dispose(); o.material.dispose(); } });
    marqueurs.clear();
    const parId = Object.fromEntries(jardin.bacs.map((b) => [b.id, b]));
    liste.forEach((p, i) => {
      const b = parId[p.bac];
      if (p.x == null || p.y == null || !b) return;
      const g = new THREE.Group();
      const c = jardin.places[b.id];
      g.position.set(c.x + (p.x - 0.5) * b.largeur, jardin.hSol[b.id] - 0.02, c.z + (p.y - 0.5) * b.longueur);
      const ombre = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), new THREE.MeshBasicMaterial({ map: ombreTex, transparent: true, depthWrite: false }));
      ombre.rotation.x = -Math.PI / 2; ombre.position.y = 0.01; g.add(ombre);
      const tige = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.45, 5), matPlat('#ffffff'));
      tige.position.y = 0.22; g.add(tige);
      const pastille = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturePastille(p.emoji, p.couleur, p.progres), depthTest: true }));
      pastille.scale.set(0.55, 0.55, 1); pastille.position.y = 0.62;
      pastille.userData.id = p.id; g.add(pastille);
      const { t, ratio } = textureEtiquette(p.titre, p.sousTitre, p.couleur);
      const etiquette = new THREE.Sprite(new THREE.SpriteMaterial({ map: t }));
      const hE = 0.42; etiquette.scale.set(hE * ratio, hE, 1); etiquette.position.y = 1.15;
      etiquette.userData.id = p.id; etiquette.name = 'etiquette';
      g.add(etiquette);
      g.userData = { phase: i * 0.7, pastille, etiquette };
      g.userData.id = p.id;
      marqueurs.add(g);
    });
    majEtiquettes();
  }

  // Étiquettes : en mode auto, toutes s'il y a peu de plantes, sinon seulement celle touchée
  function majEtiquettes() {
    const n = marqueurs.children.length;
    marqueurs.children.forEach((g) => {
      const id = g.userData.id;
      g.userData.etiquette.visible = modeEtiquettes === 'toutes' || id === selection ||
        (modeEtiquettes === 'auto' && n <= 5);
    });
  }

  // ── Toucher une plante ──
  const ray = new THREE.Raycaster();
  let depart = null;
  const versRayon = (e) => {
    const rect = renderer.domElement.getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1), camera);
  };
  const pointSol = () => { const p = new THREE.Vector3(); return ray.ray.intersectPlane(solPlan, p) ? p : null; };
  // Mode Déplacer : on attrape une installation et on la fait glisser sur le terrain
  renderer.domElement.addEventListener('pointerdown', (e) => {
    depart = { x: e.clientX, y: e.clientY, t: performance.now() };
    if (!modeDeplacer) return;
    versRayon(e);
    const hit = ray.intersectObjects(Object.values(groupesBacs), true)[0];
    if (!hit) return;
    let o = hit.object; while (o && !o.userData.bacId) o = o.parent;
    const p = pointSol();
    if (!o || !p) return;
    const b = jardin.bacs.find((x) => x.id === o.userData.bacId);
    saisie = { groupe: o, b, dx: o.position.x - p.x, dz: o.position.z - p.z };
    controles.enabled = false; marqueurs.visible = false;
    o.position.y = 0.15; // on la soulève un peu
    renderer.domElement.setPointerCapture(e.pointerId);
  }, true);
  renderer.domElement.addEventListener('pointermove', (e) => {
    if (!saisie) return;
    versRayon(e);
    const p = pointSol(); if (!p) return;
    const lim = Math.max(0.5, R - Math.max(saisie.b.largeur, saisie.b.longueur) / 2 - 0.2);
    let x = p.x + saisie.dx, z = p.z + saisie.dz;
    const d = Math.hypot(x, z); if (d > lim) { x *= lim / d; z *= lim / d; }
    saisie.groupe.position.set(x, 0.15, z);
  });
  const lacher = () => {
    if (!saisie) return;
    const s = saisie; saisie = null;
    s.groupe.position.y = 0; controles.enabled = true; marqueurs.visible = true;
    depart = null;
    onDeplace?.(s.b.id, Math.round(s.groupe.position.x * 10) / 10, Math.round(s.groupe.position.z * 10) / 10);
  };
  renderer.domElement.addEventListener('pointerup', lacher, true);
  renderer.domElement.addEventListener('pointercancel', lacher, true);
  renderer.domElement.addEventListener('pointerup', (e) => {
    if (modeDeplacer) return;
    if (!depart || Math.hypot(e.clientX - depart.x, e.clientY - depart.y) > 8 || performance.now() - depart.t > 500) return;
    const rect = renderer.domElement.getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1), camera);
    const cibles = [];
    marqueurs.children.forEach((g) => { cibles.push(g.userData.pastille); if (g.userData.etiquette.visible) cibles.push(g.userData.etiquette); });
    const hit = ray.intersectObjects(cibles, false)[0];
    if (hit) {
      const pastille = hit.object.parent.userData.pastille;
      animer(pastille, 'tourne', 0.6);
      const pos = new THREE.Vector3(); pastille.getWorldPosition(pos);
      jaillir(pos, ['✨', '⭐', '✨', '💚'], 10, 0.22, 0.7);
    } else {
      // le personnage ?
      if (perso) {
        const hp = ray.intersectObject(perso, true)[0];
        if (hp) {
          perso.userData.salut = 1.6; perso.userData.cible = null;
          const pos = perso.position.clone(); pos.y += 2.6;
          jaillir(pos, ['👋', '😊', '✨'], 8, 0.4);
          onPerso?.();
          return;
        }
      }
      // un animal ?
      const ha = ray.intersectObjects(troupeau.filter((a) => a.userData.anim), true)[0];
      if (ha) {
        let o = ha.object; while (o && !o.userData.anim) o = o.parent;
        if (o) {
          const pos = new THREE.Vector3(); o.getWorldPosition(pos); pos.y += 0.5;
          if (o.userData.fixe) { animer(o, 'rebond', 0.7); jaillir(pos, ['🐝', '🍯', '🐝'], 9, 0.3); }
          else { animer(o, 'saut', 0.55); jaillir(pos, ['❤️', '💕', '✨'], 7, 0.28); }
          return;
        }
      }
      // un arbre du décor : il tremble, perd des feuilles, puis on propose de le couper
      const touche = ray.intersectObjects(decorArbres, true)[0];
      if (touche) {
        let o = touche.object; while (o && !o.userData.cle) o = o.parent;
        if (o) {
          animer(o, 'secoue', 0.6);
          jaillir(touche.point, ['🍃', '🍂', '🍃'], 9, 0.3, 0.6);
          if (onDecor) setTimeout(() => onDecor(o.userData.cle), 450);
          return;
        }
      }
      // une installation (bac, serre, enclos, verger)
      const hb = ray.intersectObjects(Object.values(groupesBacs), true)[0];
      if (hb) {
        let o = hb.object; while (o && !o.userData.bacId) o = o.parent;
        if (o) {
          const b = jardin.bacs.find((x) => x.id === o.userData.bacId);
          animer(o, 'rebond', 0.7);
          const e = b?.type === 'serre' ? ['☀️', '✨', '💧'] : b?.type === 'enclos' ? ['❤️', '✨', '🌾'] : b?.type === 'arbre' ? ['🍃', '🌸', '✨'] : ['🌱', '✨', '💧'];
          jaillir(hb.point.clone().setY(hb.point.y + 0.3), e, 10, 0.32);
          onInstallation?.(b?.id);
          return;
        }
      }
      // l'herbe
      const p = pointSol();
      if (p && Math.hypot(p.x, p.z) < R) { onde(p, '#eaffd8'); jaillir(p.clone().setY(0.2), ['✨', '🌿'], 5, 0.25, 0.5); }
    }
    selection = hit ? hit.object.userData.id : null;
    majEtiquettes();
    if (selection) { const id = selection; setTimeout(() => onSelect?.(id), 380); } // on laisse voir l'animation
    else onSelect?.(null);
  });

  // ── Boucle d'animation ──
  const horloge = new THREE.Clock();
  let actif = true, idAnim = 0;
  function redimensionner() {
    const w = conteneur.clientWidth, h = conteneur.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w / h < 0.8 ? 55 : 45;
    camera.updateProjectionMatrix();
  }
  let cadre = false;
  const ro = new ResizeObserver(() => { redimensionner(); if (!cadre && conteneur.clientHeight) { cadre = true; cadrer(R); } });
  ro.observe(conteneur);
  redimensionner();
  // Le personnage se promène dans le jardin entre les installations
  function animerPerso(dt, t) {
    const u = perso.userData;
    if (u.salut > 0) { // il fait coucou
      u.salut -= dt; u.brasD.rotation.z = 2.6 + Math.sin(t * 14) * 0.4; u.jambeG.rotation.x = u.jambeD.rotation.x = 0;
      const dir = camera.position.clone().sub(perso.position); perso.rotation.y = Math.atan2(dir.x, dir.z);
      if (u.salut <= 0) u.brasD.rotation.z = 0;
      return;
    }
    if (u.attente > 0) { u.attente -= dt; u.jambeG.rotation.x = u.jambeD.rotation.x = u.brasG.rotation.x = u.brasD.rotation.x = 0; u.tete.rotation.y = Math.sin(t) * 0.4; return; }
    if (!u.cible) {
      const lim = Math.max(1.5, R - 1.2);
      let x, z;
      const b = jardin.bacs[Math.floor(Math.random() * jardin.bacs.length)];
      const p = b && jardin.places[b.id];
      if (p && Math.random() < 0.7) { // va voir une installation
        const cote = Math.random() < 0.5 ? 1 : -1;
        x = p.x + (Math.random() - 0.5) * b.largeur; z = p.z + cote * (b.longueur / 2 + 0.7);
      } else { const a = Math.random() * Math.PI * 2, d = Math.random() * lim; x = Math.cos(a) * d; z = Math.sin(a) * d; }
      const dd = Math.hypot(x, z); if (dd > lim) { x *= lim / dd; z *= lim / dd; }
      u.cible = new THREE.Vector3(x, 0, z);
    }
    const d = u.cible.clone().sub(perso.position); d.y = 0;
    const dist = d.length();
    if (dist < 0.1) { u.cible = null; u.attente = 2 + Math.random() * 4; return; }
    d.normalize(); perso.position.addScaledVector(d, Math.min(dist, 1.1 * dt));
    let diff = Math.atan2(d.x, d.z) - perso.rotation.y; diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    perso.rotation.y += diff * Math.min(1, dt * 8);
    const sw = Math.sin(t * 9) * 0.6;
    u.jambeG.rotation.x = sw; u.jambeD.rotation.x = -sw; u.brasG.rotation.x = -sw * 0.8; u.brasD.rotation.x = sw * 0.8;
    perso.position.y = Math.abs(Math.sin(t * 9)) * 0.04;
  }

  // Les animaux marchent vers un point au hasard, s'arrêtent picorer, repartent
  function animerAnimal(a, dt, t) {
    const e = a.userData.essaim;
    if (e) { e.a += e.v * dt; a.position.set(e.cx + Math.cos(e.a) * e.rayon, e.h + Math.sin(e.a * 3) * 0.1, e.cz + Math.sin(e.a) * e.rayon); return; }
    const u = a.userData.anim;
    if (!u || a.userData.fixe) return;
    if (u.attente > 0) { u.attente -= dt; a.position.y = 0.04; a.rotation.x = Math.sin(t * 6 + u.phase) > 0.6 && (u.type === 'poule' || u.type === 'canard') ? 0.35 : 0; return; }
    if (!u.cible) u.cible = new THREE.Vector3((Math.random() - 0.5) * 2 * u.bornes.x, 0.04, (Math.random() - 0.5) * 2 * u.bornes.z);
    const d = u.cible.clone().sub(a.position); d.y = 0;
    const dist = d.length();
    if (dist < 0.05) { u.cible = null; u.attente = 1 + Math.random() * 4; return; }
    d.normalize();
    a.position.addScaledVector(d, Math.min(dist, u.vitesse * dt));
    const cap = Math.atan2(d.x, d.z);
    let diff = cap - a.rotation.y; diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    a.rotation.y += diff * Math.min(1, dt * 6); a.rotation.x = 0;
    a.position.y = 0.04 + Math.abs(Math.sin(t * (u.type === 'lapin' ? 9 : 12) + u.phase)) * (u.type === 'lapin' ? 0.1 : 0.025);
  }

  function boucle() {
    idAnim = requestAnimationFrame(boucle);
    if (!actif || !conteneur.offsetParent) return;
    const t = horloge.getElapsedTime();
    marqueurs.children.forEach((g) => {
      const dy = Math.sin(t * 2 + g.userData.phase) * 0.04;
      g.userData.pastille.position.y = 0.62 + dy;
      g.userData.etiquette.position.y = 1.15 + dy;
    });
    const dt = Math.min(0.05, t - (boucle.avant || t)); boucle.avant = t;
    for (const a of troupeau) animerAnimal(a, dt, t);
    if (perso) animerPerso(dt, t);
    if (vol) {
      vol.t += dt; const k = Math.min(1, vol.t / 0.9), e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
      camera.position.lerpVectors(vol.camDe, vol.camA, e); controles.target.lerpVectors(vol.cibleDe, vol.cibleA, e);
      if (k >= 1) vol = null;
    }
    if (!effets.parent) scene.add(effets);
    majEffets(dt);
    for (let i = chutes.length - 1; i >= 0; i--) { // l'arbre bascule, puis laisse une souche
      const c = chutes[i]; c.t += dt;
      const k = Math.min(1, c.t / 0.8);
      c.arbre.rotation.z = (Math.PI / 2) * k * k; c.arbre.rotation.x = 0;
      if (c.t > 1.2) {
        c.arbre.scale.multiplyScalar(0.85);
        if (c.arbre.scale.x < 0.05) { ile.remove(c.arbre); ile.add(souche(c.arbre.position.x, c.arbre.position.z, c.arbre.userData.ech)); chutes.splice(i, 1); }
      }
    }
    ciel.children.forEach((n) => {
      const u = n.userData; u.a += u.v * 0.016;
      n.position.set(Math.cos(u.a) * u.d, u.h, Math.sin(u.a) * u.d); n.rotation.y = -u.a;
      // un nuage trop proche de la caméra s'efface pour ne pas cacher le potager
      const proche = n.position.distanceTo(camera.position);
      const op = Math.min(0.95, Math.max(0, (proche - R * 2.7) / (R * 0.6)));
      n.children.forEach((m) => { m.material.opacity = op; });
      n.visible = op > 0.02;
    });
    controles.update();
    renderer.render(scene, camera);
  }
  boucle();

  return {
    // bacs : [{ id, type, largeur, longueur, hauteur, materiau, couleur, image }]
    majJardin(bacs, { taille = 0, coupes = [] } = {}) {
      jardin.taille = taille; jardin.coupes = new Set(coupes);
      textures.forEach((t) => t.dispose()); textures = [];
      jardin.bacs = bacs.map((b) => {
        let texture = null;
        if (b.image) {
          texture = new THREE.Texture(b.image);
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
          texture.needsUpdate = true; textures.push(texture);
        }
        return { ...b, texture };
      });
      ile.traverse((o) => { if (o.material && o.material !== ombreTex) { o.material.map?.dispose?.(); } o.geometry?.dispose?.(); });
      const ancienR = R;
      R = construireIle();
      if (Math.abs(R - ancienR) > 0.01) { cadrer(R); appliquerFond(fondActuel); }
    },
    majPlantations,
    arbresCoupables: () => decorArbres.map((x) => x.userData.cle),
    setDeplacement(v) { modeDeplacer = v; controles.autoRotate = controles.autoRotate && !v; },
    positions: () => Object.fromEntries(Object.entries(jardin.places).map(([id, p]) => [id, { x: p.x, z: p.z }])),
    // pour les tests : position à l'écran d'une installation
    ecranDe(id) {
      const g = groupesBacs[id]; if (!g) return null;
      const v = g.position.clone().project(camera), r = renderer.domElement.getBoundingClientRect();
      return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height };
    },
    couperArbre(cle) {
      const ar = decorArbres.find((x) => x.userData.cle === cle);
      jardin.coupes.add(cle);
      if (!ar) return;
      decorArbres = decorArbres.filter((x) => x !== ar);
      ar.rotation.set(0, 0, 0);
      chutes.push({ arbre: ar, t: 0 });
    },
    setFond: appliquerFond,
    setEtiquettes(mode) { modeEtiquettes = mode === true ? 'toutes' : mode === false ? 'aucune' : mode; majEtiquettes(); },
    setAutoRotation(v) { controles.autoRotate = v; },
    recentrer() { volVers(new THREE.Vector3(0, -R * 0.12, 0), (() => { const ratio = (conteneur.clientWidth || 1) / (conteneur.clientHeight || 1), k = ratio < 0.8 ? 1.4 : 1; return new THREE.Vector3(R * 0.2 * k, R * 1.15 * k, R * 2.35 * k); })()); },
    // Zoom : la caméra vole jusqu'à une installation (ou jusqu'au personnage)
    zoomSur(id) {
      let centre, taille;
      if (id === 'perso') { if (!perso) return; centre = perso.position.clone().setY(1); taille = 2.5; }
      else {
        const b = jardin.bacs.find((x) => x.id === id), p = jardin.places[id]; if (!b || !p) return;
        centre = new THREE.Vector3(p.x, b.type === 'serre' || b.type === 'maison' || b.type === 'arbre' ? Math.min(2, (b.hauteur || 1) / 2) : 0.2, p.z);
        taille = Math.max(b.largeur, b.longueur, b.type === 'arbre' || b.type === 'maison' ? b.hauteur || 3 : 0);
      }
      const dir = camera.position.clone().sub(controles.target).setY(0).normalize();
      if (!dir.lengthSq()) dir.set(0, 0, 1);
      const dist = Math.max(3.5, taille * 1.9);
      volVers(centre, centre.clone().add(dir.multiplyScalar(dist)).setY(centre.y + dist * 0.8));
    },
    majPerso(p) {
      const ancien = perso;
      perso = p ? creerPerso(p) : null;
      if (ancien) { if (perso) { perso.position.copy(ancien.position); perso.rotation.y = ancien.rotation.y; } scene.remove(ancien); }
      else if (perso) { const m = jardin.bacs.find((b) => b.type === 'maison'); const pm = m && jardin.places[m.id]; perso.position.set(pm ? pm.x : 0.8, 0, pm ? pm.z + m.longueur / 2 + 1 : R * 0.3); }
      if (perso) scene.add(perso);
    },
    saluer() { if (perso) { perso.userData.salut = 1.6; } },
    setActif(v) { actif = v; if (v) redimensionner(); },
    capture() { controles.update(); renderer.render(scene, camera); return renderer.domElement.toDataURL('image/png'); },
    detruire() { cancelAnimationFrame(idAnim); ro.disconnect(); renderer.dispose(); },
  };
}
