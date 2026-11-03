// Étapes pour réussir chaque plante (comme les fiches de Boost Étudiant) + lien vers une fiche complète.
// wiki = titre de l'article Wikipédia en français (la recherche « go » ouvre directement la bonne page).

export const ETAPES = {
  tomate: { wiki: 'Tomate', etapes: [
    'Fin février–mars : sème au chaud (20 °C) derrière une fenêtre, en godets.',
    'Quand le plant a 4 vraies feuilles, repique-le dans un pot plus grand.',
    'Après les Saints de glace (mi-mai), plante-le profond (la tige fait des racines) à 60 cm d\'écart, avec un tuteur.',
    'Retire les gourmands chaque semaine et arrose au pied, jamais sur les feuilles.',
    'Récolte quand la tomate est bien colorée et souple sous le doigt.'] },
  courgette: { wiki: 'Courgette', etapes: [
    'Avril : sème 2 graines par godet au chaud, ou en mai directement en terre.',
    'Prépare un trou rempli de compost bien décomposé.',
    'Plante en mai–juin, à 1 m d\'écart, et paille autour du pied.',
    'Arrose généreusement au pied 2 fois par semaine.',
    'Récolte les courgettes jeunes (15–20 cm) tous les 2–3 jours.'] },
  concombre: { wiki: 'Concombre', etapes: [
    'Avril : sème au chaud en godets (il déteste être dérangé).',
    'Installe un grillage ou un treillage pour le faire grimper.',
    'Plante en mai–juin au soleil, à l\'abri du vent, à 60 cm d\'écart.',
    'Arrose régulièrement à l\'eau non froide, paille le sol.',
    'Récolte avant que les graines ne durcissent.'] },
  poivron: { wiki: 'Poivron', etapes: [
    'Février–mars : sème au chaud (22–25 °C), la levée est lente.',
    'Repique en godets quand les plants ont 3–4 feuilles.',
    'Plante fin mai, au plus chaud du jardin, à 50 cm d\'écart.',
    'Tuteure et arrose régulièrement sans excès.',
    'Récolte vert ou attends qu\'il rougisse pour plus de douceur.'] },
  aubergine: { wiki: 'Aubergine', etapes: [
    'Février–mars : sème au chaud (25 °C).',
    'Repique en pots individuels et garde-les au chaud et à la lumière.',
    'Plante fin mai–juin au soleil, à 60 cm d\'écart, avec un tuteur.',
    'Garde 5–6 fruits par pied, arrose régulièrement.',
    'Récolte quand la peau est brillante et ferme.'] },
  carotte: { wiki: 'Carotte', etapes: [
    'Ameublis le sol en profondeur et retire les cailloux.',
    'De mars à juillet : sème en ligne, peu profond (1 cm), sol frais.',
    'Éclaircis à 5 cm quand les fanes font 5 cm.',
    'Garde le sol frais, sème quelques poireaux à côté contre la mouche.',
    'Récolte environ 3 mois après le semis.'] },
  radis: { wiki: 'Radis', etapes: [
    'Sème en ligne à 1 cm de profondeur, un peu toutes les 2 semaines.',
    'Éclaircis à 3 cm si besoin.',
    'Arrose souvent : la sécheresse les rend piquants et creux.',
    'Récolte 3–4 semaines après le semis.'] },
  salade: { wiki: 'Laitue', etapes: [
    'Sème en godets ou en terre selon la saison (de mars à août).',
    'Repique quand les plants ont 4–5 feuilles, collet au ras du sol.',
    'Espace de 30 cm, ombre légère en été.',
    'Arrose régulièrement, de préférence le matin.',
    'Récolte entière ou feuille à feuille.'] },
  epinard: { wiki: 'Épinard', etapes: [
    'Sème en mars–avril ou en août–septembre, à 2 cm de profondeur.',
    'Éclaircis à 15 cm.',
    'Garde le sol frais, il monte en graines avec la chaleur.',
    'Récolte les feuilles extérieures au fur et à mesure.'] },
  haricot: { wiki: 'Haricot commun', etapes: [
    'Attends que la terre soit chaude (mai–juin).',
    'Sème en poquets de 4–5 graines tous les 40 cm, à 3 cm de profondeur.',
    'Butte les jeunes pieds quand ils font 10 cm.',
    'Arrose au pied, surtout à la floraison.',
    'Récolte souvent, les gousses jeunes et sans fils.'] },
  pois: { wiki: 'Pois', etapes: [
    'Sème de février à avril (ou en automne), à 3–4 cm de profondeur.',
    'Installe des rames ou un grillage dès la levée.',
    'Butte légèrement les jeunes pieds.',
    'Récolte quand les gousses sont pleines mais encore tendres.'] },
  pdt: { wiki: 'Pomme de terre', etapes: [
    'Fais germer les tubercules à la lumière 4 à 6 semaines avant.',
    'Plante de mars à mai à 10 cm de profondeur, germes vers le haut, tous les 40 cm.',
    'Butte quand les tiges font 20 cm, et recommence 3 semaines après.',
    'Arrose en cas de sécheresse, surtout à la floraison.',
    'Récolte quand le feuillage jaunit (ou plus tôt pour les primeurs).'] },
  oignon: { wiki: 'Oignon', etapes: [
    'Plante les bulbilles en mars–avril (ou en automne pour les blancs).',
    'Enfonce-les à fleur de terre, pointe en haut, tous les 10 cm.',
    'Désherbe à la main, arrose peu.',
    'Arrête l\'arrosage un mois avant la récolte.',
    'Récolte quand les feuilles se couchent, puis fais sécher.'] },
  ail: { wiki: 'Ail cultivé', etapes: [
    'Choisis un endroit ensoleillé et un sol qui ne garde pas l\'eau.',
    'Sépare les gousses, garde les plus grosses.',
    'Plante-les pointe en haut, à 3 cm de profondeur, tous les 12 cm (octobre–mars).',
    'Ne l\'arrose presque pas.',
    'Récolte en juin–juillet quand les feuilles jaunissent, puis fais sécher.'] },
  poireau: { wiki: 'Poireau', etapes: [
    'Sème en février–avril en pépinière.',
    'En juin–juillet, arrache les plants qui font la taille d\'un crayon.',
    'Habille-les : coupe un tiers des racines et des feuilles.',
    'Mets-les dans un trou au plantoir de 15 cm et arrose sans reboucher.',
    'Récolte de septembre jusqu\'à la fin de l\'hiver.'] },
  chou: { wiki: 'Chou', etapes: [
    'Sème en mars–mai en pépinière ou en godets.',
    'Plante en mai–juillet à 50 cm d\'écart, tasse bien la terre.',
    'Protège avec un voile contre la piéride (papillon blanc).',
    'Arrose régulièrement et paille.',
    'Récolte quand la pomme est ferme (ou les têtes de brocoli serrées).'] },
  betterave: { wiki: 'Betterave potagère', etapes: [
    'Fais tremper les graines une nuit.',
    'Sème en avril–juin à 2 cm de profondeur.',
    'Éclaircis à 15 cm.',
    'Arrose régulièrement en été.',
    'Récolte quand elles ont la taille d\'une balle de tennis.'] },
  courge: { wiki: 'Courge', etapes: [
    'Sème au chaud en avril–mai, ou en terre en mai–juin.',
    'Prépare une butte de compost.',
    'Plante à 1,5 m d\'écart : elle court beaucoup !',
    'Arrose au pied et paille.',
    'Récolte avant les gelées quand le pédoncule devient sec et liégeux.'] },
  mais: { wiki: 'Maïs doux', etapes: [
    'Sème en mai–juin quand la terre est chaude.',
    'Plante en carré (plusieurs rangs) pour que le pollen se transmette.',
    'Butte les pieds quand ils font 30 cm.',
    'Arrose bien à la floraison.',
    'Récolte quand les soies brunissent et que le grain donne un jus laiteux.'] },
  navet: { wiki: 'Navet', etapes: [
    'Sème en mars–avril ou en juillet–août, à 1 cm de profondeur.',
    'Éclaircis à 15 cm.',
    'Garde le sol frais.',
    'Récolte jeune, environ 2 mois après le semis.'] },
  mache: { wiki: 'Mâche', etapes: [
    'Sème de juillet à septembre sur un sol tassé.',
    'Recouvre à peine et tasse encore.',
    'Garde frais jusqu\'à la levée.',
    'Récolte en rosettes de l\'automne au printemps.'] },
  feve: { wiki: 'Fève', etapes: [
    'Sème en février–mars (ou en automne en climat doux), à 5 cm de profondeur.',
    'Espace de 20 cm.',
    'Pince la tête des tiges à la floraison contre les pucerons.',
    'Récolte quand les gousses sont gonflées.'] },
  celeri: { wiki: 'Céleri', etapes: [
    'Sème au chaud en mars–avril (graines très fines, à peine couvertes).',
    'Repique en godets.',
    'Plante en mai–juin à 40 cm d\'écart.',
    'Arrose beaucoup et paille généreusement.',
    'Récolte de septembre à novembre.'] },
  fraisier: { wiki: 'Fraisier', etapes: [
    'Plante en août–septembre (ou au printemps), collet au ras du sol.',
    'Espace de 35 cm, au soleil.',
    'Paille avec de la paille pour garder les fraises propres.',
    'Arrose régulièrement pendant la récolte.',
    'Coupe les stolons ou garde-les pour faire de nouveaux plants.'] },
  melon: { wiki: 'Melon', etapes: [
    'Sème au chaud en avril.',
    'Plante fin mai au plus chaud, sur un sol riche, à 80 cm d\'écart.',
    'Pince la tige après la 4e feuille.',
    'Arrose au pied sans mouiller les feuilles.',
    'Récolte quand il sent bon et que le pédoncule se fendille.'] },
  pasteque: { wiki: 'Pastèque', etapes: [
    'Sème au chaud en avril.',
    'Plante fin mai–juin au soleil, à 1,2 m d\'écart.',
    'Pose les fruits sur une tuile.',
    'Arrose beaucoup jusqu\'à ce que les fruits grossissent.',
    'Récolte quand la vrille près du fruit est sèche.'] },
  petitsfruits: { wiki: 'Framboisier', etapes: [
    'Plante de novembre à mars, hors gel.',
    'Espace de 80 cm, installe des fils pour palisser.',
    'Paille le pied et arrose la première année.',
    'Après la récolte, coupe au ras du sol les tiges qui ont donné des fruits.'] },
  rhubarbe: { wiki: 'Rhubarbe', etapes: [
    'Plante un éclat de souche au printemps ou en automne.',
    'Laisse 1 m autour et enrichis avec du compost.',
    'Ne récolte pas la première année.',
    'Ensuite, tire les tiges (jamais les feuilles, toxiques).'] },
  fruitier: { wiki: 'Pommier domestique', etapes: [
    'Plante de novembre à mars, hors gel (Sainte-Catherine, le 25 novembre).',
    'Creuse un grand trou (60 cm), ajoute du compost.',
    'Pose un tuteur avant de planter, puis attache l\'arbre.',
    'Arrose copieusement la première année.',
    'Taille en hiver pour former l\'arbre.'] },
  basilic: { wiki: 'Basilic', etapes: [
    'Sème au chaud en mars–avril.',
    'Plante en mai–juin au soleil, à côté des tomates.',
    'Pince les fleurs pour garder des feuilles parfumées.',
    'Arrose régulièrement au pied.',
    'Récolte les feuilles du haut au fur et à mesure.'] },
  persil: { wiki: 'Persil', etapes: [
    'Fais tremper les graines une nuit.',
    'Sème de mars à août à mi-ombre.',
    'Sois patient : la levée prend 3–4 semaines.',
    'Récolte les tiges extérieures.'] },
  ciboulette: { wiki: 'Ciboulette', etapes: [
    'Sème au printemps ou plante une touffe.',
    'Espace de 20 cm.',
    'Coupe au ciseau à 2 cm du sol, elle repousse.',
    'Divise la touffe tous les 3 ans.'] },
  menthe: { wiki: 'Menthe', etapes: [
    'Plante au printemps ou en automne.',
    'Mets-la dans un pot enterré : elle est envahissante.',
    'Arrose beaucoup.',
    'Coupe les tiges avant la floraison.'] },
  thym: { wiki: 'Thym commun', etapes: [
    'Plante au printemps dans un sol sec et caillouteux.',
    'Mets-le en plein soleil.',
    'N\'arrose presque pas une fois installé.',
    'Taille légèrement après la floraison.'] },
  tournesol: { wiki: 'Tournesol', etapes: [
    'Sème en avril–juin, 2–3 graines par trou, à 2 cm de profondeur.',
    'Garde le plus beau plant tous les 50 cm.',
    'Tuteure les grandes variétés.',
    'Laisse sécher les têtes pour les oiseaux.'] },
  oeillet: { wiki: 'Tagetes patula', etapes: [
    'Sème au chaud en mars–avril.',
    'Plante en mai entre les tomates et les choux.',
    'Coupe les fleurs fanées.',
    'Laisse-le jusqu\'aux gelées, il protège le potager.'] },
  capucine: { wiki: 'Grande capucine', etapes: [
    'Fais tremper les graines une nuit.',
    'Sème en avril–juin au pied des courges ou des arbres.',
    'N\'ajoute pas d\'engrais (sinon plus de feuilles que de fleurs).',
    'Fleurs et feuilles se mangent en salade.'] },
  cosmos: { wiki: 'Cosmos bipinnatus', etapes: [
    'Sème en avril–juin en terre, ou au chaud en mars.',
    'Éclaircis à 40 cm.',
    'Coupe les fleurs fanées.',
    'Laisse quelques fleurs grainer pour l\'année suivante.'] },
  souci: { wiki: 'Souci officinal', etapes: [
    'Sème en mars–mai ou en septembre.',
    'Éclaircis à 30 cm.',
    'Coupe les fleurs fanées pour en avoir d\'autres.',
    'Il se ressème tout seul.'] },
  zinnia: { wiki: 'Zinnia', etapes: [
    'Sème au chaud en avril, ou en terre en mai–juin.',
    'Plante en plein soleil à 30 cm d\'écart.',
    'Arrose au pied.',
    'Coupe des fleurs souvent pour les bouquets.'] },
  tulipe: { wiki: 'Tulipe', etapes: [
    'Plante les bulbes en octobre–novembre.',
    'Enfonce-les à 3 fois leur hauteur, pointe en haut.',
    'Espace de 12 cm.',
    'Après la floraison, laisse jaunir les feuilles avant de couper.'] },
  rosier: { wiki: 'Rosier', etapes: [
    'Plante de novembre à mars (racines nues) ou toute l\'année en pot.',
    'Pralinage : trempe les racines dans de la boue avant de planter.',
    'Point de greffe au niveau du sol, arrose bien.',
    'Taille en fin d\'hiver.'] },
  lavande: { wiki: 'Lavande', etapes: [
    'Plante au printemps ou en automne en sol sec.',
    'Mets-la en plein soleil, à 50 cm d\'écart.',
    'N\'arrose presque pas.',
    'Taille en boule après la floraison.'] },
  dahlia: { wiki: 'Dahlia', etapes: [
    'Plante les tubercules en avril–mai, après les gelées.',
    'Enfonce-les à 10 cm avec un tuteur.',
    'Arrose régulièrement l\'été.',
    'Rentre-les à l\'abri en hiver dans les régions froides.'] },
  poisdesenteur: { wiki: 'Pois de senteur', etapes: [
    'Fais tremper les graines une nuit.',
    'Sème en mars–avril (ou en octobre en climat doux).',
    'Installe un treillage.',
    'Coupe les fleurs souvent pour prolonger la floraison.'] },
};

export const lienWiki = (titre) => `https://fr.wikipedia.org/w/index.php?search=${encodeURIComponent(titre)}&go=Go`;
