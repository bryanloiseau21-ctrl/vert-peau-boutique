// Visuel 3D façon jeu : le potager (photo redressée) posé sur une petite île flottante,
// sur un fond propre et coloré. On tourne autour au doigt, on zoome en pinçant.
import * as THREE from 'three';
import { OrbitControls } from './../vendor/OrbitControls.js';

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

export function creerScene(conteneur, { onSelect } = {}) {
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

  let dims = { l: 4, L: 3 };
  let etiquettesVisibles = true;
  let fondActuel = 'ciel';
  let texturePhoto = null;

  function construireIle(texture) {
    ile.clear();
    const { l, L } = dims;
    const R = Math.hypot(l, L) / 2 + 1.6;
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

    // Bac du potager : bordure en bois + photo redressée sur le dessus
    const hBac = 0.28, ep = 0.12;
    const bois = matPlat('#c98a4b');
    const boisClair = matPlat('#e0a866');
    const planche = (lg, x, z, rot) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(lg, hBac, ep), rot ? boisClair : bois);
      m.position.set(x, hBac / 2, z); if (rot) m.rotation.y = Math.PI / 2;
      m.castShadow = true; m.receiveShadow = true; ile.add(m);
    };
    planche(l + ep * 2, 0, -L / 2 - ep / 2, false);
    planche(l + ep * 2, 0, L / 2 + ep / 2, false);
    planche(L, -l / 2 - ep / 2, 0, true);
    planche(L, l / 2 + ep / 2, 0, true);
    for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(ep * 1.6, hBac + 0.08, ep * 1.6), matPlat('#a86f3a'));
      p.position.set(x * (l / 2 + ep / 2), (hBac + 0.08) / 2, z * (L / 2 + ep / 2)); p.castShadow = true; ile.add(p);
    }
    const sol = new THREE.Mesh(new THREE.PlaneGeometry(l, L),
      new THREE.MeshLambertMaterial({ map: texture || textureTerre() }));
    sol.rotation.x = -Math.PI / 2; sol.position.y = hBac - 0.04; sol.receiveShadow = true; ile.add(sol);
    const fondBac = new THREE.Mesh(new THREE.BoxGeometry(l, hBac - 0.05, L), matPlat('#5a3a22'));
    fondBac.position.y = (hBac - 0.05) / 2; ile.add(fondBac);

    // Décor : arbres, buissons fleuris, cailloux, sur l'anneau autour du bac
    const rayonBac = Math.hypot(l, L) / 2 + 0.35;
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + r() * 0.4;
      const d = rayonBac + 0.5 + r() * (R - rayonBac - 1.1);
      if (r() < 0.6) ile.add(arbre(r, Math.cos(a) * d, Math.sin(a) * d, 0.7 + r() * 0.5));
      else ile.add(buisson(r, Math.cos(a) * d, Math.sin(a) * d));
    }
    for (let i = 0; i < 10; i++) {
      const a = r() * Math.PI * 2, d = rayonBac + r() * (R - rayonBac - 0.3);
      if (r() < 0.5) ile.add(buisson(r, Math.cos(a) * d, Math.sin(a) * d));
      else {
        const c = new THREE.Mesh(new THREE.DodecahedronGeometry(0.08 + r() * 0.08, 0), matPlat('#c9ccd6'));
        c.position.set(Math.cos(a) * d, 0.03, Math.sin(a) * d); c.castShadow = true; ile.add(c);
      }
    }

    // Nuages qui flottent autour
    ciel.clear();
    for (let i = 0; i < 5; i++) {
      const n = nuage(r);
      const a = (i / 5) * Math.PI * 2;
      n.userData = { a, d: R + 2.5 + r() * 2.5, h: 1.2 + r() * 2.5, v: 0.02 + r() * 0.03 };
      ciel.add(n);
    }

    // Soleil et caméra adaptés à la taille
    soleil.position.set(R * 0.8, R * 2, R * 0.6);
    const s = soleil.shadow.camera; s.left = s.bottom = -R * 1.2; s.right = s.top = R * 1.2; s.near = 0.5; s.far = R * 6; s.updateProjectionMatrix();
    controles.minDistance = R * 0.8; controles.maxDistance = R * 5;
    camera.far = R * 30; camera.updateProjectionMatrix();
    return R;
  }

  function cadrer(R) {
    // En portrait, on recule davantage pour voir toute l'île (et son dessous rocheux)
    const ratio = (conteneur.clientWidth || 1) / (conteneur.clientHeight || 1);
    const k = ratio < 0.8 ? 1.55 : 1;
    camera.position.set(R * 0.2 * k, R * 1.15 * k, R * 2.35 * k);
    controles.target.set(0, -R * 0.22, 0);
    controles.update();
  }

  function appliquerFond(nom) {
    fondActuel = FONDS[nom] ? nom : 'ciel';
    const f = FONDS[fondActuel];
    if (scene.background && scene.background.dispose) scene.background.dispose();
    scene.background = textureFond(f);
    scene.fog = new THREE.Fog(f.brume, 30, 80);
    hemi.intensity = 1.6 * f.lumiere; soleil.intensity = 2.2 * f.lumiere;
    soleil.color.set(fondActuel === 'nuit' ? '#b9c4ff' : fondActuel === 'coucher' ? '#ffd1a6' : '#fff4dd');
    ciel.visible = fondActuel !== 'studio';
    for (const n of ciel.children) n.children.forEach((m) => m.material.color.set(fondActuel === 'nuit' ? '#8f95d6' : '#ffffff'));
    const ancien = scene.getObjectByName('etoiles'); if (ancien) scene.remove(ancien);
    if (f.etoiles) {
      const r = alea(3), pts = [];
      for (let i = 0; i < 300; i++) {
        const a = r() * Math.PI * 2, h = 0.15 + r() * 0.85;
        pts.push(Math.cos(a) * 60 * Math.sqrt(1 - h * h), h * 60, Math.sin(a) * 60 * Math.sqrt(1 - h * h));
      }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      const etoiles = new THREE.Points(geo, new THREE.PointsMaterial({ color: '#ffffff', size: 0.9, fog: false }));
      etoiles.name = 'etoiles'; scene.add(etoiles);
    }
  }

  let R = construireIle(null);
  cadrer(R);
  appliquerFond('ciel');

  // ── Marqueurs des plantations ──
  function majPlantations(liste) {
    for (const m of marqueurs.children) m.traverse((o) => { if (o.material) { o.material.map?.dispose(); o.material.dispose(); } });
    marqueurs.clear();
    const { l, L } = dims;
    liste.forEach((p, i) => {
      if (p.x == null || p.y == null) return;
      const g = new THREE.Group();
      g.position.set((p.x - 0.5) * l, 0.26, (p.y - 0.5) * L);
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
      etiquette.userData.id = p.id; etiquette.name = 'etiquette'; etiquette.visible = etiquettesVisibles;
      g.add(etiquette);
      g.userData = { phase: i * 0.7, pastille, etiquette };
      marqueurs.add(g);
    });
  }

  // ── Toucher une plante ──
  const ray = new THREE.Raycaster();
  let depart = null;
  renderer.domElement.addEventListener('pointerdown', (e) => { depart = { x: e.clientX, y: e.clientY, t: performance.now() }; });
  renderer.domElement.addEventListener('pointerup', (e) => {
    if (!depart || Math.hypot(e.clientX - depart.x, e.clientY - depart.y) > 8 || performance.now() - depart.t > 500) return;
    const rect = renderer.domElement.getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1), camera);
    const cibles = [];
    marqueurs.children.forEach((g) => { cibles.push(g.userData.pastille); if (g.userData.etiquette.visible) cibles.push(g.userData.etiquette); });
    const hit = ray.intersectObjects(cibles, false)[0];
    onSelect?.(hit ? hit.object.userData.id : null);
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
  function boucle() {
    idAnim = requestAnimationFrame(boucle);
    if (!actif || !conteneur.offsetParent) return;
    const t = horloge.getElapsedTime();
    marqueurs.children.forEach((g) => {
      const dy = Math.sin(t * 2 + g.userData.phase) * 0.04;
      g.userData.pastille.position.y = 0.62 + dy;
      g.userData.etiquette.position.y = 1.15 + dy;
    });
    ciel.children.forEach((n) => {
      const u = n.userData; u.a += u.v * 0.016;
      n.position.set(Math.cos(u.a) * u.d, u.h, Math.sin(u.a) * u.d); n.rotation.y = -u.a;
      // un nuage trop proche de la caméra s'efface pour ne pas cacher le potager
      const proche = n.position.distanceTo(camera.position);
      const op = Math.min(0.95, Math.max(0, (proche - R * 0.9) / (R * 0.8)));
      n.children.forEach((m) => { m.material.opacity = op; });
      n.visible = op > 0.02;
    });
    controles.update();
    renderer.render(scene, camera);
  }
  boucle();

  return {
    majPotager({ largeur, longueur, image }) {
      dims = { l: largeur, L: longueur };
      if (texturePhoto) texturePhoto.dispose();
      texturePhoto = null;
      if (image) {
        texturePhoto = new THREE.Texture(image);
        texturePhoto.colorSpace = THREE.SRGBColorSpace;
        texturePhoto.anisotropy = renderer.capabilities.getMaxAnisotropy();
        texturePhoto.needsUpdate = true;
      }
      const ancienR = R;
      R = construireIle(texturePhoto);
      if (Math.abs(R - ancienR) > 0.01) cadrer(R);
    },
    majPlantations,
    setFond: appliquerFond,
    setEtiquettes(v) { etiquettesVisibles = v; marqueurs.children.forEach((g) => { g.userData.etiquette.visible = v; }); },
    setAutoRotation(v) { controles.autoRotate = v; },
    recentrer() { cadrer(R); },
    setActif(v) { actif = v; if (v) redimensionner(); },
    capture() { controles.update(); renderer.render(scene, camera); return renderer.domElement.toDataURL('image/png'); },
    detruire() { cancelAnimationFrame(idAnim); ro.disconnect(); renderer.dispose(); },
  };
}
