// Base de données des plantes du potager.
// Les mois (1 = janvier … 12 = décembre) sont donnés pour la zone de référence :
// climat tempéré océanique, hémisphère nord (France nord / ouest / centre).
// Ils sont ensuite décalés selon la zone climatique et l'hémisphère (voir logique.js).
//
// sa = semis sous abri · st = semis en pleine terre · pl = plantation / repiquage
// re = récolte (ou floraison pour les fleurs)
// jours = délai minimum entre la mise en terre et la première récolte / floraison
// gel = craint le gel · frais = légume de saison fraîche · vivace = reste en place plusieurs années

export const CATEGORIES = {
  legume: { nom: 'Légumes', un: 'Légume', emoji: '🥕', couleur: '#d9822b' },
  fruit: { nom: 'Fruits', un: 'Fruit', emoji: '🍓', couleur: '#d64545' },
  aromate: { nom: 'Aromatiques', un: 'Aromatique', emoji: '🌿', couleur: '#3f8f4f' },
  fleur: { nom: 'Fleurs', un: 'Fleur', emoji: '🌸', couleur: '#b65fc4' },
};

export const PLANTES = [
  // ── Légumes ──────────────────────────────────────────────
  { id: 'tomate', nom: 'Tomate', emoji: '🍅', cat: 'legume', sa: [2, 3, 4], st: [], pl: [5, 6], re: [7, 8, 9, 10], jours: 70,
    expo: 'Plein soleil', esp: 60, eau: 'Régulier, au pied', gel: true,
    conseil: 'Plantez après les Saints de glace (mi-mai), tuteurez et retirez les gourmands. Arrosez au pied, jamais les feuilles.',
    amis: ['basilic', 'oeillet', 'carotte', 'persil'] },
  { id: 'courgette', nom: 'Courgette', emoji: '🥒', cat: 'legume', sa: [4, 5], st: [5, 6], pl: [5, 6], re: [7, 8, 9, 10], jours: 55,
    expo: 'Plein soleil', esp: 100, eau: 'Abondant', gel: true,
    conseil: 'Très gourmande : ajoutez du compost au trou de plantation. Récoltez jeune (15–20 cm) pour en avoir plus.',
    amis: ['haricot', 'capucine', 'mais'] },
  { id: 'concombre', nom: 'Concombre', emoji: '🥒', cat: 'legume', sa: [3, 4, 5], st: [5, 6], pl: [5, 6], re: [7, 8, 9], jours: 60,
    expo: 'Soleil, à l\'abri du vent', esp: 60, eau: 'Régulier', gel: true,
    conseil: 'Faites-le grimper sur un grillage : moins de maladies et des fruits bien droits.',
    amis: ['haricot', 'pois', 'tournesol'] },
  { id: 'poivron', nom: 'Poivron / piment', emoji: '🫑', cat: 'legume', sa: [2, 3], st: [], pl: [5, 6], re: [8, 9, 10], jours: 85,
    expo: 'Plein soleil, chaud', esp: 50, eau: 'Régulier', gel: true,
    conseil: 'A besoin de beaucoup de chaleur : le pied d\'un mur exposé au sud est idéal.',
    amis: ['basilic', 'tomate'] },
  { id: 'aubergine', nom: 'Aubergine', emoji: '🍆', cat: 'legume', sa: [2, 3], st: [], pl: [5, 6], re: [8, 9, 10], jours: 90,
    expo: 'Plein soleil, chaud', esp: 60, eau: 'Régulier', gel: true,
    conseil: 'Limitez à 5–6 fruits par pied pour qu\'ils grossissent bien.',
    amis: ['haricot', 'oeillet'] },
  { id: 'carotte', nom: 'Carotte', emoji: '🥕', cat: 'legume', sa: [], st: [3, 4, 5, 6, 7], pl: [], re: [6, 7, 8, 9, 10, 11], jours: 85,
    expo: 'Soleil', esp: 5, eau: 'Modéré', frais: true,
    conseil: 'Sol léger et sans cailloux. Éclaircissez à 5 cm et associez aux poireaux contre la mouche.',
    amis: ['poireau', 'oignon', 'tomate', 'radis'] },
  { id: 'radis', nom: 'Radis', emoji: '🔴', cat: 'legume', sa: [], st: [3, 4, 5, 6, 8, 9], pl: [], re: [4, 5, 6, 7, 9, 10], jours: 25,
    expo: 'Soleil ou mi-ombre', esp: 3, eau: 'Régulier', frais: true,
    conseil: 'Le plus rapide du potager ! Semez un peu toutes les 2 semaines pour en avoir en continu.',
    amis: ['carotte', 'salade', 'pois'] },
  { id: 'salade', nom: 'Salade / laitue', emoji: '🥬', cat: 'legume', sa: [2, 3], st: [3, 4, 5, 6, 7, 8], pl: [3, 4, 5, 6, 7, 8, 9], re: [5, 6, 7, 8, 9, 10, 11], jours: 45,
    expo: 'Mi-ombre en été', esp: 30, eau: 'Régulier', frais: true,
    conseil: 'Plantez le collet au ras du sol. En été, choisissez des variétés résistantes à la montée en graines.',
    amis: ['radis', 'carotte', 'fraisier'] },
  { id: 'epinard', nom: 'Épinard', emoji: '🍃', cat: 'legume', sa: [], st: [3, 4, 8, 9], pl: [], re: [5, 6, 10, 11], jours: 45,
    expo: 'Mi-ombre', esp: 15, eau: 'Régulier', frais: true,
    conseil: 'Monte vite en graines avec la chaleur : privilégiez le printemps et la fin d\'été.',
    amis: ['fraisier', 'radis'] },
  { id: 'haricot', nom: 'Haricot vert', emoji: '🫛', cat: 'legume', sa: [], st: [5, 6, 7], pl: [], re: [7, 8, 9], jours: 60, gel: true,
    expo: 'Soleil', esp: 40, eau: 'Modéré',
    conseil: 'Semez quand la terre est chaude (au moins 12 °C). Buttez les jeunes pieds.',
    amis: ['courgette', 'mais', 'aubergine'] },
  { id: 'pois', nom: 'Petits pois', emoji: '🫛', cat: 'legume', sa: [], st: [2, 3, 4, 10, 11], pl: [], re: [5, 6, 7], jours: 80, frais: true,
    expo: 'Soleil', esp: 40, eau: 'Modéré',
    conseil: 'Installez des rames ou un grillage. Récoltez souvent, les gousses doivent rester tendres.',
    amis: ['carotte', 'radis', 'concombre'] },
  { id: 'pdt', nom: 'Pomme de terre', emoji: '🥔', cat: 'legume', sa: [], st: [], pl: [3, 4, 5], re: [6, 7, 8, 9], jours: 95,
    expo: 'Soleil', esp: 40, eau: 'Modéré',
    conseil: 'Faites germer les tubercules à la lumière avant de planter, puis buttez quand les tiges font 20 cm.',
    amis: ['haricot', 'capucine', 'feve'] },
  { id: 'oignon', nom: 'Oignon', emoji: '🧅', cat: 'legume', sa: [], st: [2, 3], pl: [3, 4, 9, 10], re: [7, 8], jours: 110, frais: true,
    expo: 'Soleil', esp: 10, eau: 'Faible',
    conseil: 'Plantez les bulbilles à fleur de terre, pointe vers le haut. Arrêtez d\'arroser un mois avant la récolte.',
    amis: ['carotte', 'betterave', 'salade'] },
  { id: 'ail', nom: 'Ail', emoji: '🧄', cat: 'legume', sa: [], st: [], pl: [10, 11, 12, 2, 3], re: [6, 7], jours: 180, frais: true,
    expo: 'Soleil', esp: 12, eau: 'Faible',
    conseil: 'Plantez les gousses pointe en haut, à 3 cm de profondeur. « Plantez l\'ail à la Sainte-Catherine. »',
    amis: ['fraisier', 'tomate', 'rosier'] },
  { id: 'poireau', nom: 'Poireau', emoji: '🥬', cat: 'legume', sa: [2, 3], st: [3, 4], pl: [6, 7], re: [9, 10, 11, 12, 1, 2], jours: 110, frais: true,
    expo: 'Soleil', esp: 15, eau: 'Régulier',
    conseil: 'Habillez les plants (coupez racines et feuilles d\'un tiers) et plantez-les profond dans un trou au plantoir.',
    amis: ['carotte', 'fraisier', 'celeri'] },
  { id: 'chou', nom: 'Chou / brocoli', emoji: '🥦', cat: 'legume', sa: [3, 4], st: [4, 5, 6], pl: [5, 6, 7], re: [8, 9, 10, 11, 12], jours: 90, frais: true,
    expo: 'Soleil', esp: 50, eau: 'Abondant',
    conseil: 'Protégez-les avec un voile contre la piéride (papillon blanc). Tassez bien la terre à la plantation.',
    amis: ['celeri', 'salade', 'oeillet'] },
  { id: 'betterave', nom: 'Betterave', emoji: '🍠', cat: 'legume', sa: [], st: [4, 5, 6], pl: [], re: [7, 8, 9, 10], jours: 80,
    expo: 'Soleil', esp: 15, eau: 'Modéré',
    conseil: 'Faites tremper les graines une nuit avant de semer. Éclaircissez à 15 cm.',
    amis: ['oignon', 'salade'] },
  { id: 'courge', nom: 'Potiron / courge', emoji: '🎃', cat: 'legume', sa: [4, 5], st: [5, 6], pl: [5, 6], re: [9, 10], jours: 110, gel: true,
    expo: 'Plein soleil', esp: 150, eau: 'Abondant',
    conseil: 'Prévoyez de la place, ça court ! Récoltez avant les gelées, quand le pédoncule devient liégeux.',
    amis: ['mais', 'haricot', 'capucine'] },
  { id: 'mais', nom: 'Maïs doux', emoji: '🌽', cat: 'legume', sa: [4], st: [5, 6], pl: [5, 6], re: [8, 9], jours: 85, gel: true,
    expo: 'Plein soleil', esp: 40, eau: 'Régulier',
    conseil: 'Plantez en carré (et pas en ligne) pour une bonne pollinisation.',
    amis: ['haricot', 'courge', 'courgette'] },
  { id: 'navet', nom: 'Navet', emoji: '🟣', cat: 'legume', sa: [], st: [3, 4, 7, 8], pl: [], re: [5, 6, 9, 10, 11], jours: 55, frais: true,
    expo: 'Mi-ombre', esp: 15, eau: 'Régulier',
    conseil: 'Récoltez-les jeunes, ils sont plus tendres. Parfait après des pommes de terre.',
    amis: ['pois', 'salade'] },
  { id: 'mache', nom: 'Mâche', emoji: '🌱', cat: 'legume', sa: [], st: [7, 8, 9], pl: [], re: [10, 11, 12, 1, 2, 3], jours: 70, frais: true,
    expo: 'Soleil ou mi-ombre', esp: 10, eau: 'Faible',
    conseil: 'La salade de l\'hiver : semez sur sol tassé, elle résiste au froid.',
    amis: ['poireau', 'oignon'] },
  { id: 'feve', nom: 'Fève', emoji: '🫘', cat: 'legume', sa: [], st: [2, 3, 10, 11], pl: [], re: [5, 6, 7], jours: 90, frais: true,
    expo: 'Soleil', esp: 20, eau: 'Modéré',
    conseil: 'Pincez la tête des tiges à la floraison contre les pucerons noirs.',
    amis: ['pdt', 'mais'] },
  { id: 'celeri', nom: 'Céleri', emoji: '🥬', cat: 'legume', sa: [3, 4], st: [], pl: [5, 6], re: [9, 10, 11], jours: 110,
    expo: 'Mi-ombre', esp: 40, eau: 'Abondant',
    conseil: 'Ne laissez jamais le sol se dessécher. Paillez généreusement.',
    amis: ['poireau', 'chou', 'tomate'] },

  // ── Fruits ───────────────────────────────────────────────
  { id: 'fraisier', nom: 'Fraisier', emoji: '🍓', cat: 'fruit', sa: [], st: [], pl: [3, 4, 8, 9, 10], re: [5, 6, 7], jours: 60, vivace: true,
    expo: 'Soleil', esp: 35, eau: 'Régulier',
    conseil: 'Paillez avec de la paille pour garder les fraises propres. Renouvelez les plants tous les 3 ans avec les stolons.',
    amis: ['ail', 'salade', 'epinard', 'poireau'] },
  { id: 'melon', nom: 'Melon', emoji: '🍈', cat: 'fruit', sa: [4], st: [], pl: [5, 6], re: [7, 8, 9], jours: 80, gel: true,
    expo: 'Plein soleil, chaud', esp: 80, eau: 'Modéré, au pied',
    conseil: 'Taillez après la 4e feuille. Le melon est mûr quand il sent bon et que le pédoncule se fendille.',
    amis: ['mais', 'capucine'] },
  { id: 'pasteque', nom: 'Pastèque', emoji: '🍉', cat: 'fruit', sa: [4], st: [], pl: [5, 6], re: [8, 9], jours: 90, gel: true,
    expo: 'Plein soleil, très chaud', esp: 120, eau: 'Abondant',
    conseil: 'A besoin d\'un long été chaud. Posez les fruits sur une tuile pour éviter la pourriture.',
    amis: ['mais', 'tournesol'] },
  { id: 'petitsfruits', nom: 'Framboisier / groseillier', emoji: '🫐', cat: 'fruit', sa: [], st: [], pl: [11, 12, 1, 2, 3], re: [6, 7, 8, 9, 10], jours: 200, vivace: true,
    expo: 'Soleil ou mi-ombre', esp: 80, eau: 'Modéré',
    conseil: 'Plantez hors période de gel. Coupez au ras du sol les tiges qui ont fructifié.',
    amis: ['ail', 'capucine'] },
  { id: 'rhubarbe', nom: 'Rhubarbe', emoji: '🌿', cat: 'fruit', sa: [], st: [], pl: [3, 4, 10, 11], re: [4, 5, 6, 7], jours: 330, vivace: true,
    expo: 'Soleil ou mi-ombre', esp: 100, eau: 'Régulier',
    conseil: 'Ne récoltez pas la première année. Les feuilles sont toxiques, on ne mange que les tiges.',
    amis: ['chou', 'fraisier'] },
  { id: 'fruitier', nom: 'Arbre fruitier (pommier, poirier…)', emoji: '🍎', cat: 'fruit', sa: [], st: [], pl: [11, 12, 1, 2, 3], re: [8, 9, 10], jours: 600, vivace: true,
    expo: 'Soleil', esp: 400, eau: 'Arrosage la 1re année',
    conseil: '« À la Sainte-Catherine, tout bois prend racine » : plantez fin novembre, hors gel, avec un bon tuteur.',
    amis: ['capucine', 'ciboulette', 'ail'] },

  // ── Aromatiques ──────────────────────────────────────────
  { id: 'basilic', nom: 'Basilic', emoji: '🌿', cat: 'aromate', sa: [3, 4], st: [5, 6], pl: [5, 6], re: [6, 7, 8, 9], jours: 40, gel: true,
    expo: 'Plein soleil', esp: 25, eau: 'Régulier',
    conseil: 'Pincez les fleurs pour garder les feuilles parfumées. Excellent voisin des tomates.',
    amis: ['tomate', 'poivron'] },
  { id: 'persil', nom: 'Persil', emoji: '🌿', cat: 'aromate', sa: [], st: [3, 4, 5, 6, 7, 8], pl: [], re: [5, 6, 7, 8, 9, 10, 11], jours: 70,
    expo: 'Mi-ombre', esp: 20, eau: 'Régulier',
    conseil: 'Lent à lever (3–4 semaines) : faites tremper les graines la veille.',
    amis: ['tomate', 'radis'] },
  { id: 'ciboulette', nom: 'Ciboulette', emoji: '🌱', cat: 'aromate', sa: [], st: [3, 4, 5], pl: [3, 4, 9, 10], re: [4, 5, 6, 7, 8, 9, 10], jours: 60, vivace: true,
    expo: 'Soleil ou mi-ombre', esp: 20, eau: 'Régulier',
    conseil: 'Coupez au ciseau à 2 cm du sol, elle repousse. Divisez la touffe tous les 3 ans.',
    amis: ['carotte', 'fraisier', 'fruitier'] },
  { id: 'menthe', nom: 'Menthe', emoji: '🌱', cat: 'aromate', sa: [], st: [], pl: [3, 4, 5, 9, 10], re: [5, 6, 7, 8, 9, 10], jours: 45, vivace: true,
    expo: 'Mi-ombre', esp: 40, eau: 'Abondant',
    conseil: 'Très envahissante : plantez-la dans un pot enterré.',
    amis: ['chou', 'tomate'] },
  { id: 'thym', nom: 'Thym / romarin', emoji: '🌿', cat: 'aromate', sa: [], st: [], pl: [3, 4, 5, 9, 10], re: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], jours: 60, vivace: true,
    expo: 'Plein soleil, sol sec', esp: 30, eau: 'Faible',
    conseil: 'Déteste l\'humidité : sol drainé, pas d\'arrosage une fois installé. Taillez après la floraison.',
    amis: ['chou', 'lavande'] },

  // ── Fleurs ───────────────────────────────────────────────
  { id: 'tournesol', nom: 'Tournesol', emoji: '🌻', cat: 'fleur', sa: [], st: [4, 5, 6], pl: [], re: [7, 8, 9], jours: 80,
    expo: 'Plein soleil', esp: 50, eau: 'Modéré',
    conseil: 'Tuteurez les grandes variétés. Laissez les têtes sécher en automne : festin pour les oiseaux.',
    amis: ['concombre', 'mais'] },
  { id: 'oeillet', nom: 'Œillet d\'Inde', emoji: '🌼', cat: 'fleur', sa: [3, 4], st: [5], pl: [5, 6], re: [6, 7, 8, 9, 10], jours: 50, gel: true,
    expo: 'Soleil', esp: 25, eau: 'Modéré',
    conseil: 'Le garde du corps du potager : son odeur éloigne nématodes et aleurodes. Plantez-le entre les tomates.',
    amis: ['tomate', 'aubergine', 'chou'] },
  { id: 'capucine', nom: 'Capucine', emoji: '🧡', cat: 'fleur', sa: [], st: [4, 5, 6], pl: [], re: [6, 7, 8, 9, 10], jours: 55, gel: true,
    expo: 'Soleil', esp: 40, eau: 'Faible',
    conseil: 'Attire les pucerons loin de vos légumes (plante piège). Fleurs et feuilles se mangent !',
    amis: ['courgette', 'courge', 'fruitier'] },
  { id: 'cosmos', nom: 'Cosmos', emoji: '🌸', cat: 'fleur', sa: [3, 4], st: [4, 5, 6], pl: [5], re: [7, 8, 9, 10], jours: 70,
    expo: 'Soleil', esp: 40, eau: 'Faible',
    conseil: 'Attire abeilles et syrphes, alliés contre les pucerons. Coupez les fleurs fanées.',
    amis: ['tomate', 'courgette'] },
  { id: 'souci', nom: 'Souci (calendula)', emoji: '🌼', cat: 'fleur', sa: [], st: [3, 4, 5, 9], pl: [], re: [6, 7, 8, 9, 10], jours: 55,
    expo: 'Soleil', esp: 30, eau: 'Faible',
    conseil: 'Se ressème tout seul. Ses pétales sont comestibles et il protège les tomates.',
    amis: ['tomate', 'carotte'] },
  { id: 'zinnia', nom: 'Zinnia', emoji: '🌺', cat: 'fleur', sa: [4], st: [5, 6], pl: [5, 6], re: [7, 8, 9, 10], jours: 65, gel: true,
    expo: 'Plein soleil', esp: 30, eau: 'Modéré',
    conseil: 'Plus on coupe de fleurs pour les bouquets, plus il en refait.',
    amis: ['tomate', 'haricot'] },
  { id: 'tulipe', nom: 'Tulipe', emoji: '🌷', cat: 'fleur', sa: [], st: [], pl: [10, 11], re: [3, 4, 5], jours: 120,
    expo: 'Soleil', esp: 12, eau: 'Faible',
    conseil: 'Plantez les bulbes à 3 fois leur hauteur, pointe vers le haut, avant les grands froids.',
    amis: ['ail'] },
  { id: 'rosier', nom: 'Rosier', emoji: '🌹', cat: 'fleur', sa: [], st: [], pl: [11, 12, 1, 2, 3], re: [5, 6, 7, 8, 9, 10], jours: 90, vivace: true,
    expo: 'Soleil', esp: 80, eau: 'Modéré',
    conseil: 'Plantez à racines nues en automne. Un pied d\'ail à côté le protège des maladies.',
    amis: ['ail', 'lavande'] },
  { id: 'lavande', nom: 'Lavande', emoji: '💜', cat: 'fleur', sa: [], st: [], pl: [3, 4, 9, 10], re: [6, 7, 8], jours: 90, vivace: true,
    expo: 'Plein soleil, sol sec', esp: 50, eau: 'Faible',
    conseil: 'Ne l\'arrosez presque pas. Taillez en boule après la floraison sans couper le vieux bois.',
    amis: ['rosier', 'thym'] },
  { id: 'dahlia', nom: 'Dahlia', emoji: '🏵️', cat: 'fleur', sa: [], st: [], pl: [4, 5], re: [7, 8, 9, 10], jours: 85, gel: true,
    expo: 'Soleil', esp: 60, eau: 'Régulier',
    conseil: 'Plantez les tubercules après les gelées. Dans les régions froides, rentrez-les à l\'abri en hiver.',
    amis: ['haricot'] },
  { id: 'poisdesenteur', nom: 'Pois de senteur', emoji: '💐', cat: 'fleur', sa: [2, 3], st: [3, 4, 10], pl: [4], re: [6, 7, 8], jours: 85, frais: true,
    expo: 'Soleil', esp: 20, eau: 'Régulier',
    conseil: 'Grimpant et très parfumé : installez un treillage. Coupez souvent pour prolonger la floraison.',
    amis: ['pois'] },
];

// Types de bacs, matériaux et couleurs proposées
export const TYPES_BAC = {
  bac: { nom: 'Bac surélevé', emoji: '🪵', hauteur: 0.3, desc: 'Un carré potager en hauteur : la terre se réchauffe vite et on se baisse moins.' },
  terre: { nom: 'Pleine terre', emoji: '🌱', hauteur: 0.05, desc: 'Une planche cultivée directement dans le sol du jardin.' },
  serre: { nom: 'Serre', emoji: '🏡', hauteur: 2.2, desc: 'À l\'abri du froid : on plante un mois plus tôt et on récolte un mois plus tard, sans risque de gel.' },
};
export const MATERIAUX = {
  bac: { bois: 'Bois', pierre: 'Pierre', brique: 'Brique', metal: 'Métal', plastique: 'Plastique', beton: 'Béton' },
  terre: { aucun: 'Sans bordure', bois: 'Bordure bois', pierre: 'Bordure pierres', metal: 'Bordure métal' },
  serre: { verre: 'Verre', polycarbonate: 'Polycarbonate', tunnel: 'Tunnel plastique' },
};
export const COULEURS_BAC = ['#c98a4b', '#8b5a2b', '#e9d8b4', '#9aa3ad', '#b5523b', '#3f7d4e', '#2f6fa8', '#e2b33c', '#d9604c', '#5b5f66', '#ffffff', '#7a4fa3'];
export const COULEUR_DEFAUT = { bois: '#c98a4b', pierre: '#9aa3ad', brique: '#b5523b', metal: '#5b5f66', plastique: '#3f7d4e', beton: '#b8b8b0', aucun: '#7a4b2a', verre: '#ffffff', polycarbonate: '#e9d8b4', tunnel: '#3f7d4e' };

// Enclos à animaux
TYPES_BAC.enclos = { nom: 'Enclos à animaux', emoji: '🐔', hauteur: 1.2, desc: 'Un espace clôturé pour tes animaux, avec leur abri.' };
MATERIAUX.enclos = { bois: 'Clôture bois', grillage: 'Grillage', piquets: 'Ganivelle (piquets)', pierre: 'Muret en pierre' };
COULEUR_DEFAUT.grillage = '#5b5f66'; COULEUR_DEFAUT.piquets = '#c98a4b';

// m2 = place conseillée par animal dans l'enclos · abri = nom de la cabane
export const ANIMAUX = {
  poule: { nom: 'Poules', un: 'Poule', emoji: '🐔', m2: 5, abri: 'Poulailler', couleur: '#f5efe2',
    conseil: 'Les poules mangent les restes de cuisine, les limaces et les insectes : de super alliées du potager (mais tiens-les loin des semis !).',
    etapes: ['Prévois au moins 5 m² par poule et un poulailler fermé la nuit contre le renard.', 'Installe un perchoir, un pondoir avec de la paille et une mangeoire.', 'Donne de l\'eau propre tous les jours et du grain le soir.', 'Ramasse les œufs chaque jour et nettoie le poulailler chaque semaine.', 'Mets le fumier au compost : c\'est un engrais très riche.'] },
  canard: { nom: 'Canards', un: 'Canard', emoji: '🦆', m2: 6, abri: 'Cabane', couleur: '#ffffff',
    conseil: 'Les canards adorent les limaces et ne grattent pas la terre comme les poules. Ils ont besoin d\'eau pour se baigner.',
    etapes: ['Prévois 6 m² par canard et une cabane fermée la nuit.', 'Installe une bassine ou une petite mare.', 'Change l\'eau souvent, elle se salit vite.', 'Donne du grain et laisse-les chasser les limaces.'] },
  lapin: { nom: 'Lapins', un: 'Lapin', emoji: '🐇', m2: 4, abri: 'Clapier', couleur: '#cfc2b0',
    conseil: 'Les lapins mangent les fanes de carottes et les feuilles du potager. Enterre le grillage : ils creusent !',
    etapes: ['Prévois au moins 4 m² par lapin et un clapier à l\'abri de la pluie et du soleil.', 'Enterre le grillage sur 30 cm pour éviter les fuites.', 'Donne du foin à volonté, de l\'eau et un peu de légumes.', 'Nettoie la litière chaque semaine (elle va au compost).'] },
  mouton: { nom: 'Moutons', un: 'Mouton', emoji: '🐑', m2: 500, abri: 'Abri', couleur: '#f4f1ea',
    conseil: 'Les moutons tondent l\'herbe à ta place. Jamais seuls : prends-en au moins deux.',
    etapes: ['Compte environ 500 m² de prairie par mouton, avec un abri contre la pluie.', 'Déclare-les à l\'EDE de ton département (obligatoire).', 'Donne de l\'eau propre et du foin l\'hiver.', 'Fais-les tondre chaque année au printemps.'] },
  chevre: { nom: 'Chèvres', un: 'Chèvre', emoji: '🐐', m2: 300, abri: 'Chèvrerie', couleur: '#b98a5a',
    conseil: 'Très curieuses et grimpeuses : une bonne clôture haute est indispensable. Jamais seules non plus.',
    etapes: ['Prévois environ 300 m² par chèvre et une clôture d\'au moins 1,20 m.', 'Déclare-les à l\'EDE de ton département (obligatoire).', 'Donne du foin, de l\'eau et une pierre à sel.', 'Taille leurs onglons tous les 2–3 mois.'] },
  cochon: { nom: 'Cochons', un: 'Cochon', emoji: '🐖', m2: 100, abri: 'Porcherie', couleur: '#f2a9b4',
    conseil: 'Le cochon retourne la terre comme un motoculteur : idéal pour préparer une future parcelle.',
    etapes: ['Prévois environ 100 m² par cochon et un abri au sec.', 'Déclare-le à l\'EDE de ton département (obligatoire, même pour un seul).', 'Installe un abreuvoir solide et une zone boueuse pour qu\'il se rafraîchisse.', 'Une clôture électrique basse évite qu\'il ne creuse dessous.'] },
  abeille: { nom: 'Abeilles', un: 'Ruche', emoji: '🐝', m2: 4, abri: 'Ruche', couleur: '#ffd23f',
    conseil: 'Les abeilles pollinisent tes fruits et légumes : plus de courgettes, de fraises et de tomates !',
    etapes: ['Déclare tes ruches chaque année (en ligne, obligatoire dès la première).', 'Place la ruche au soleil du matin, entrée tournée vers le sud-est, loin des passages.', 'Mets un point d\'eau à proximité.', 'Fais-toi accompagner la première année par un rucher école.'] },
};

// Arbres (fruitiers ou non). Mois de la zone de référence ; esp = écart conseillé entre deux arbres (m) ;
// annees = âge de l'arbre planté avant les premiers fruits ; forme = silhouette en 3D.
TYPES_BAC.arbre = { nom: 'Arbre / verger', emoji: '🌳', hauteur: 4, desc: 'Un arbre ou un petit verger : fruitiers ou arbres pour l\'ombre et la haie.' };
MATERIAUX.arbre = { aucun: 'Pied d\'arbre' };
export const ARBRES = {
  pommier: { nom: 'Pommier', emoji: '🍎', fruitier: true, forme: 'rond', feuillage: '#4caf50', fruit: '#e53935', fleur: '#ffd6e0', floraison: [4, 5], re: [8, 9, 10], annees: 3, esp: 5, hauteur: 4,
    conseil: 'Plante au moins deux variétés différentes à côté pour une bonne pollinisation.' },
  poirier: { nom: 'Poirier', emoji: '🍐', fruitier: true, forme: 'colonne', feuillage: '#43a047', fruit: '#c0ca33', fleur: '#ffffff', floraison: [3, 4], re: [8, 9, 10], annees: 4, esp: 5, hauteur: 5,
    conseil: 'Cueille les poires un peu avant maturité et laisse-les finir de mûrir au frais.' },
  cerisier: { nom: 'Cerisier', emoji: '🍒', fruitier: true, forme: 'rond', feuillage: '#388e3c', fruit: '#b71c1c', fleur: '#ffc1d6', floraison: [3, 4], re: [6, 7], annees: 4, esp: 6, hauteur: 5,
    conseil: 'Protège les cerises des oiseaux avec un filet quand elles rougissent.' },
  prunier: { nom: 'Prunier', emoji: '🫐', fruitier: true, forme: 'rond', feuillage: '#558b2f', fruit: '#6a1b9a', fleur: '#ffffff', floraison: [3, 4], re: [7, 8, 9], annees: 3, esp: 5, hauteur: 4,
    conseil: 'Très facile et productif : la mirabelle et la reine-claude sont parfaites pour débuter.' },
  abricotier: { nom: 'Abricotier', emoji: '🍑', fruitier: true, forme: 'rond', feuillage: '#689f38', fruit: '#ffa726', fleur: '#ffe0e6', floraison: [3, 4], re: [7], annees: 3, esp: 5, hauteur: 4,
    conseil: 'Fleurit tôt : plante-le contre un mur exposé au sud pour éviter les gelées sur les fleurs.' },
  pecher: { nom: 'Pêcher', emoji: '🍑', fruitier: true, forme: 'rond', feuillage: '#7cb342', fruit: '#ff8a65', fleur: '#f48fb1', floraison: [3, 4], re: [7, 8, 9], annees: 2, esp: 4, hauteur: 3.5,
    conseil: 'Traite contre la cloque au moment où les bourgeons gonflent (bouillie bordelaise).' },
  figuier: { nom: 'Figuier', emoji: '🟣', fruitier: true, forme: 'large', feuillage: '#2e7d32', fruit: '#5e35b1', fleur: null, floraison: [], re: [8, 9], annees: 2, esp: 5, hauteur: 4,
    conseil: 'Aime la chaleur : au pied d\'un mur ensoleillé. Il supporte jusqu\'à environ -12 °C.' },
  olivier: { nom: 'Olivier', emoji: '🫒', fruitier: true, forme: 'large', feuillage: '#8aa37b', fruit: '#33691e', fleur: '#fffde7', floraison: [5, 6], re: [10, 11, 12], annees: 4, esp: 6, hauteur: 4,
    conseil: 'Plein soleil et sol bien drainé. En climat froid, cultive-le en grand pot à rentrer l\'hiver.' },
  citronnier: { nom: 'Citronnier', emoji: '🍋', fruitier: true, forme: 'rond', feuillage: '#1b5e20', fruit: '#fdd835', fleur: '#ffffff', floraison: [3, 4, 5], re: [11, 12, 1, 2, 3], annees: 2, esp: 4, hauteur: 3,
    conseil: 'Craint le gel : en pleine terre seulement en climat méditerranéen, sinon en pot.' },
  noyer: { nom: 'Noyer', emoji: '🌰', fruitier: true, forme: 'large', feuillage: '#33691e', fruit: '#8d6e63', fleur: null, floraison: [], re: [9, 10], annees: 6, esp: 10, hauteur: 10,
    conseil: 'Devient très grand : laisse-lui de la place, loin du potager (ses racines gênent les légumes).' },
  noisetier: { nom: 'Noisetier', emoji: '🌰', fruitier: true, forme: 'buisson', feuillage: '#558b2f', fruit: '#a1887f', fleur: null, floraison: [], re: [8, 9], annees: 3, esp: 4, hauteur: 3.5,
    conseil: 'Parfait en haie fruitière. Plantes-en au moins deux pour qu\'ils se pollinisent.' },
  chene: { nom: 'Chêne', emoji: '🌳', fruitier: false, forme: 'large', feuillage: '#2e7d32', esp: 12, hauteur: 12, conseil: 'Un arbre pour des siècles, refuge pour des centaines d\'espèces.' },
  erable: { nom: 'Érable', emoji: '🍁', fruitier: false, forme: 'rond', feuillage: '#e65100', esp: 8, hauteur: 8, conseil: 'Magnifique feuillage orange et rouge à l\'automne.' },
  bouleau: { nom: 'Bouleau', emoji: '🌳', fruitier: false, forme: 'colonne', feuillage: '#9ccc65', tronc: '#f5f5f5', esp: 5, hauteur: 9, conseil: 'Pousse vite, ombre légère qui laisse passer la lumière.' },
  saule: { nom: 'Saule pleureur', emoji: '🌿', fruitier: false, forme: 'pleureur', feuillage: '#9ccc65', esp: 10, hauteur: 8, conseil: 'Adore l\'humidité : idéal près d\'une mare.' },
  sapin: { nom: 'Sapin', emoji: '🌲', fruitier: false, forme: 'cone', feuillage: '#1b5e20', esp: 5, hauteur: 8, conseil: 'Reste vert toute l\'année, bon brise-vent.' },
  palmier: { nom: 'Palmier', emoji: '🌴', fruitier: false, forme: 'palmier', feuillage: '#43a047', esp: 4, hauteur: 5, conseil: 'Le palmier de Chine (Trachycarpus) résiste jusqu\'à -15 °C.' },
};
export const ETAPES_ARBRE = [
  'Plante de novembre à mars, hors période de gel (racines nues), ou toute l\'année en conteneur.',
  'Creuse un trou deux fois plus large que les racines et ajoute du compost.',
  'Plante un tuteur côté vent dominant avant de mettre l\'arbre.',
  'Garde le point de greffe au-dessus du sol, rebouche et tasse bien.',
  'Arrose copieusement (20 litres) puis toutes les semaines la première année, et paille le pied.',
];

// Maison
TYPES_BAC.maison = { nom: 'Maison', emoji: '🏠', hauteur: 2.6, desc: 'Ta maison ou ta cabane de jardin, avec ton personnage qui se promène.' };
MATERIAUX.maison = { bois: 'Chalet en bois', pierre: 'Pierre', brique: 'Brique', enduit: 'Crépi' };
COULEUR_DEFAUT.enduit = '#f3e7cf';
export const COULEURS_TOIT = ['#c0503f', '#8a3b2e', '#4a4f57', '#2f6fa8', '#3f7d4e', '#d9a441', '#6b4f3a', '#e9e2d4'];

// Personnage : tout est au choix
export const PERSO = {
  peaux: ['#ffdfc4', '#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#5c3a1e'],
  coiffures: { court: 'Courts', long: 'Longs', couettes: 'Couettes', boucles: 'Bouclés', chauve: 'Sans cheveux' },
  cheveux: ['#2b1d14', '#5a3825', '#a0522d', '#e8c27a', '#d35400', '#9e9e9e', '#ff6fae', '#4fa3ff'],
  hauts: ['#e74c3c', '#3aa5ff', '#3fbf5f', '#ffc93c', '#8a6cff', '#ffffff', '#2c3e50', '#ff8fb3'],
  bas: ['#2f4a7a', '#3a3a3a', '#8b5a2b', '#5b8c3a', '#c0c0c0', '#7a4fa3'],
  chapeaux: { aucun: 'Aucun', paille: 'Chapeau de paille', casquette: 'Casquette', bonnet: 'Bonnet' },
  outils: { aucun: 'Rien', arrosoir: 'Arrosoir', panier: 'Panier', pelle: 'Pelle' },
};
export const PERSO_DEFAUT = { nom: 'Moi', peau: '#f1c27d', coiffure: 'court', cheveux: '#5a3825', haut: '#3fbf5f', bas: '#2f4a7a', chapeau: 'paille', outil: 'arrosoir' };

export const PLANTE_PAR_ID = Object.fromEntries(PLANTES.map((p) => [p.id, p]));

// Zones climatiques. Les décalages sont en mois par rapport à la zone de référence :
// printemps < 0 → on peut commencer plus tôt ; automne > 0 → la saison dure plus longtemps.
export const ZONES = {
  mediterraneen: { nom: 'Méditerranéen', emoji: '☀️', printemps: -1, automne: 1,
    desc: 'Hivers doux, étés chauds et secs. On commence plus tôt et la saison dure plus longtemps. Paillez contre la sécheresse.' },
  oceanique: { nom: 'Tempéré océanique', emoji: '🌦️', printemps: 0, automne: 0,
    desc: 'Climat doux et humide (ouest et centre de la France, Belgique…). Attention aux gelées jusqu\'à mi-mai.' },
  continental: { nom: 'Continental', emoji: '❄️', printemps: 0, automne: -1,
    desc: 'Hivers froids, étés chauds (est de la France, Suisse, Europe centrale…). Les gelées d\'automne arrivent tôt.' },
  montagne: { nom: 'Montagne', emoji: '🏔️', printemps: 1, automne: -1,
    desc: 'Saison courte (au-dessus de 900 m environ). Plantez plus tard, choisissez des variétés précoces et protégez avec un voile.' },
  tropical: { nom: 'Tropical', emoji: '🌴', printemps: 0, automne: 0,
    desc: 'Pas d\'hiver : on peut cultiver toute l\'année. Les légumes de saison fraîche préfèrent la saison sèche ou l\'altitude.' },
};

export const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
export const MOIS_COURT = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

// Travaux du potager, mois par mois (zone de référence, hémisphère nord).
export const TRAVAUX = {
  1: ['Commandez vos graines et préparez le plan du potager.', 'Taillez les arbres fruitiers par temps sec et hors gel.', 'Couvrez le sol nu avec des feuilles mortes ou du fumier.'],
  2: ['Lancez les premiers semis au chaud (tomates, poivrons, aubergines).', 'Faites germer les pommes de terre à la lumière.', 'Préparez les planches : griffez le sol, sans le retourner.'],
  3: ['Semez les premiers radis, carottes et petits pois en terre.', 'Plantez oignons, pommes de terre précoces et fraisiers.', 'Gardez un voile d\'hivernage à portée de main : les gelées ne sont pas finies.'],
  4: ['Repiquez vos semis en godets plus grands.', 'Installez tuteurs et rames avant de planter.', 'Désherbez à la binette tant que les herbes sont petites.'],
  5: ['Après les Saints de glace (11–13 mai) : plantez tomates, courgettes, poivrons, basilic.', 'Paillez le sol pour garder la fraîcheur.', 'Semez haricots, maïs et fleurs mellifères.'],
  6: ['Arrosez le soir, au pied, plutôt moins souvent mais copieusement.', 'Retirez les gourmands des tomates.', 'Semez carottes et betteraves pour l\'automne.'],
  7: ['Récoltez souvent pour que les plantes produisent plus.', 'Semez poireaux d\'hiver, mâche et navets.', 'Surveillez pucerons et oïdium : purin d\'ortie ou bicarbonate.'],
  8: ['Plantez les fraisiers avec les stolons.', 'Semez épinards et salades d\'hiver.', 'Faites sécher oignons et ail récoltés à l\'ombre.'],
  9: ['Récoltez courges et dernières tomates.', 'Semez un engrais vert (phacélie, moutarde) sur les planches libres.', 'Plantez fraisiers, oignons blancs et vivaces.'],
  10: ['Plantez l\'ail et les bulbes de fleurs (tulipes).', 'Ramassez les feuilles mortes : un paillis gratuit !', 'Rentrez les plantes gélives et les dahlias.'],
  11: ['Plantez arbres fruitiers, rosiers et petits fruits (Sainte-Catherine, 25 nov.).', 'Apportez compost ou fumier sur les planches vides.', 'Protégez artichauts et plantes fragiles avec un voile.'],
  12: ['Récoltez poireaux, mâche et choux.', 'Nettoyez et rangez les outils, aiguisez la binette.', 'Faites le bilan de l\'année pour améliorer les rotations.'],
};
