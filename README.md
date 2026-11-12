# Pare-Brise : la salle de code virtuelle

**En ligne : https://elisabhty.github.io/pare-brise/**

Une app iOS (Capacitor 8) de code de la route en 3D.

Dans cette version, **l'app est un moteur** et **le contenu est en JSON**. Tu ajoutes un cours, une série ou des questions en écrivant un fichier dans `content/`, sans toucher au code. Le build vérifie tout le contenu avant de fabriquer l'app.

Contenu fourni : les 10 thèmes officiels, **35 cours** (237 scènes), chacun suivi de sa **pratique en 3D**, 193 questions, 35 séries, 14 défis 3D et un **examen blanc de 40 situations**.

Les cours 2 à 35 viennent du fichier « cours immersifs » (`gen/cours-immersifs-35.json`, intégré par `gen/integrer35.py`) : textes nettoyés des phrases répétées, indications de mise en scène gardées dans le champ `realisation_3d` du fichier source. Les cours 30 à 35 sont plus récents : leurs règles, délais et seuils ont été relus en novembre 2026 avec les retours des élèves testeurs (ci-dessous).

L'image suit la voix : chaque liste, série de chiffres ou groupe de panneaux apparaît (ou s'allume) au moment où la voix en parle (champ `sync`, calculé par `gen/synchro.py`), et les titres, listes, chiffres et fins se jouent dans un décor 3D qui montre le sujet (champ `decor`, posé par `gen/mise-en-scene.py` ; la caméra vise la bande libre sous la carte de texte). La vidéo illustre ce que dit la voix : des aides dessinées dans la 3D (`aides` : angles morts, distances de réaction et de freinage, faisceau des phares, capteurs, champ de vision, trajectoires, cibles, radar, passage à niveau, borne de recharge…, dans `engine/sim.js`) apparaissent avec la phrase (`p`) ou l'élément de liste (`item`) qui en parle ; quand la 3D ne sait pas montrer (vignettes Crit'Air, pictogrammes des médicaments, voyants, papiers, permis à points, constat…), une illustration se pose sous la carte (`illu`, dans `app/illu.js`). Ordre : `cd gen && python3 integrer35.py && python3 mise-en-scene.py && python3 synchro.py --ecrire`.

**Retours des élèves testeurs (novembre 2026).** Cinq élèves fictifs, chacun avec son profil (lycéenne en conduite accompagnée, futur livreur de 34 ans au permis neuf, élève piégée par les questions à plusieurs réponses, conducteur de 61 ans qui repasse le code après une annulation, élève qui apprend surtout à l'oral), ont suivi les 35 cours et leurs pratiques, écran par écran ; leurs rapports sont dans `gen/retours-eleves/`. Les corrections sont dans `gen/retours.py`, appliquées par le même pipeline : textes, cartes, fiches mémo et décors par `mise-en-scene.py`, pratiques par `pratique.py` (une question de la banque corrigée l'est aussi dans `content/questions`, les séries suivent). Le pipeline est rejouable : un remplacement déjà fait n'est pas refait. `mise-en-scene.py` signale un remplacement introuvable, et une scène dont le nombre de phrases change alors que des aides, étiquettes ou gestes renvoient à une phrase. Ce qui a changé, en bref : une seule méthode partout pour tourner ou changer de voie (rétros, clignotant, angle mort, puis on y va si c'est libre) ; les mêmes chiffres d'un cours à l'autre (« ta vitesse sans le zéro × 3 » pour la réaction, × 1,5 sur la distance d'arrêt sous la pluie) ; le permis probatoire, l'agglomération, la chaussée, le délit, l'angle mort expliqués là où ils arrivent ; chaque question de pratique s'appuie sur une phrase du cours (ou disparaît), les doublons sont remplacés, les explications disent la réponse et la raison ; « Plusieurs réponses possibles » s'affiche en pratique (pas à l'examen blanc) ; un train (et non plus un tramway) aux passages à niveau, une trottinette quand la question parle de trottinette, une moto quand elle parle de moto. La narration du cours 1 n'est pas modifiée (texte d'origine) : seules ses cartes et sa pratique l'ont été.

Règles vérifiées pour ces corrections (textes en vigueur en novembre 2026) : barème des excès de vitesse (aucun point sous 5 km/h depuis 2024, rétention du permis dès 40 km/h, délit dès 50 km/h depuis la loi 2025-622 et le décret 2025-1269) ; ceinture (3 points pour le conducteur non attaché, amende payée par le passager adulte, par le conducteur pour un mineur, sans points) ; alcool (0,5 à 0,8 g/L : 135 € et 6 points, délit au-delà ; 0,2 g/L en probatoire et en conduite accompagnée) ; probatoire (3 ans, 2 après la conduite accompagnée, stage obligatoire dès 3 points perdus d'un coup), récupération des points (6 mois, 2 ou 3 ans), plafond de 8 points ; chevauchement d'une ligne continue pour dépasser un vélo ou un EDPM ; dépassement par la droite d'un véhicule qui tourne à gauche ; croisement en montagne ; inter-files (décret 2025-33, autoroutes et voies à chaussées séparées, entre les deux voies de gauche) ; loi montagne (pneus marqués 3PMSF ou chaînes et chaussettes du 1er novembre au 31 mars) ; ambulances privées (facilités de passage, pas de priorité) ; corridor de sécurité ; ZFE toujours en vigueur (règles locales).

**Deuxième passage.** Les mêmes élèves ont relu les cours corrigés (rapports dans `gen/retours-eleves/deuxieme-passage/`) : sur 370 problèmes du premier passage, 284 étaient réglés, 74 en partie et 7 pas réglés (plus 5 remarques sur la voix du cours 1, laissée à son autrice) ; les notes passent d'environ 3/5 à 4/5. Ils ont relevé 132 nouveaux problèmes. Presque tous les « en partie » venaient de la même cause : la voix avait été corrigée, mais pas la carte, l'image, la fiche ou la question de pratique. Le bloc « Deuxième passage » de `gen/retours.py` aligne tout sur la voix, coupe les sous-titres de plus de 25 mots (un test le vérifie), remet le cours 30 dans l'ordre des 4 étapes et montre des pompiers au lieu d'une ambulance au cours 14. Règles revérifiées : corridor de sécurité (R412-11-1 : ralentir, changer de voie si possible, sinon s'écarter), site « Mes points permis » (il a remplacé Télépoints), freinage jusqu'à 10 fois plus long sur verglas, feux de brouillard avant qui remplacent ou complètent les croisement (R416-7), moteur tournant à l'arrêt en stationnement interdit, papiers non présentés (11 €, 5 jours, sinon 135 €), montagne (même type : celui qui descend recule ; sinon le plus léger). Sept panneaux que la voix décrivait sont maintenant dessinés et montrés : passage à niveau sans barrières (A8), zone de rencontre (B52), aire piétonne (B54), entrée de ZFE (B56, d'après l'arrêté du 24 novembre 1967), double sens cyclable (C24a), et l'entrée et la sortie de zone de la loi montagne (B58 et B59, d'après l'arrêté du 23 juin 2021).

**Reformulation.** Six experts en pédagogie ont réécrit les cours 2 à 35 pour qu'ils soient immersifs : chaque écran part d'une situation (« Regarde… », « Devant toi… »), donne la règle, son pourquoi en une demi-phrase et le geste à faire ; une question est toujours suivie de sa réponse, les mots techniques sont expliqués dans la phrase où ils apparaissent, les négations doubles sont tournées à la forme positive, et chaque fin de cours donne « le piège de l'examen ». Ils suivaient une charte (élèves visés, mots fixés et mots retirés après les tests, formules verrouillées, ordre « rétros, clignotant, angle mort ») et chaque cours a passé un validateur avant intégration : aucune règle ni aucun chiffre ne change, chaque ligne de carte reprend les mots de la voix, aucune phrase de plus de 25 mots, les renvois de l'image tombent sur la bonne phrase. Les textes sont dans `gen/reformulation/*.json` (voix, cartes, fiche, 245 explications de pratique) et passent après toutes les autres corrections ; une retouche de pratique est reconnue à l'énoncé exact de sa question, dans l'ordre (deux « Que fais-tu ? » d'un même cours reçoivent chacune la leur). La voix passe de 9 939 à 12 437 mots, en phrases plus courtes (11,9 → 11,1 mots en moyenne). La voix du cours 1 reste celle d'Elisa : les propositions de l'expert sont dans `gen/reformulation/cours1-propositions.md`, pour qu'elle choisisse. Règles revérifiées à cette occasion : chevauchement d'une ligne continue pour dépasser un cycle, un EDPM ou un cyclomobile léger (R412-19) ; récupération des points en 3 ans si l'une des infractions est un délit ou une contravention de 4e ou 5e classe (L223-6) ; enfants de moins de 10 ans à l'avant si les places arrière sont déjà prises par des enfants de moins de 10 ans.

L'interface suit les codes d'iOS : police système (SF Pro sur iPhone, Inter en repli ailleurs), grands titres, listes groupées, boutons capsule et barre d'onglets flottante façon Liquid Glass.

## Structure

```
content/
  themes.json            les 10 thèmes officiels de l'examen
  cours/*.json           un fichier par cours
  questions/*.json       la banque de questions (autant de fichiers que tu veux)
  series.json            les séries d'exercices (des listes de questions)
  exercices.json         les exercices de conduite en 3D
src/
  engine/engine.js       moteur 3D : salle, route, studio (Three.js + bloom + ombres)
  engine/sim.js          simulateur de conduite : ville, campagne, autoroute, météo, usagers, pédales
  app/exos.js            les exercices : 8 mécaniques, écran Exercices, résultats
  app/scenes.js          les types de scènes d'un cours (l'endroit où en ajouter)
  app/player.js          lecteur de cours générique
  app/serie.js           séries : entraînement ou examen, QCM et association
  app/progress.js        progression et révision espacée (boîtes de Leitner)
  app/screens.js         salle, parcours, fiche cours, examen
  app/planning.js        onglet Planning : séance du jour, semaine, avancement, « Adapter mon rythme »
  app/planning-core.js   répartition des activités dans les jours choisis, retards, série (sans DOM, testé)
  app/streak.js          série de jours actifs et semaine en flammes
  app/profil.js          prénom, pseudo, personnage (8 avatars SVG) et arrivée au premier lancement
  app/roadmap.js         la carte du parcours en route sinueuse
  app/mascot.js          Plot, le moniteur (sprite animé)
  assets/                images de Plot (WebP)
  app/signs.js           bibliothèque de panneaux (SVG, codes officiels)
  app/…                  voix, son, navigation, réflexe, décodeur
scripts/validate.mjs     règles de validation du contenu (build + tests)
tests/*.test.mjs         tests Node (contenu, panneaux, app construite)
build.mjs                valide content/ puis assemble docs/index.html
docs/index.html          l'app finale, en un seul fichier hors ligne : servie par GitHub Pages et embarquée par Capacitor
```

## Plot, le moniteur

Plot, le cône mascotte, est une planche de 9 images (`src/assets/plot-sprite.webp`) animée en CSS :
- au repos, il cligne des yeux ;
- `.cheer` joue le clin d'œil et le pouce levé ;
- `.oops` le fait vaciller.

Il réagit aux bonnes et aux mauvaises réponses (cours et séries), se tient à l'étape en cours sur la carte du parcours, accueille l'élève et félicite à la fin des cours.

La scène animée de l'accueil est `src/assets/plot-scene.webp`. Pour changer de mascotte, remplace ces deux fichiers en gardant 9 images de même taille côte à côte. Le build les intègre automatiquement.

## Ce qui se branche tout seul

- **Carte du parcours** : une route sinueuse générée à partir du contenu. Chaque cours est une étape numérotée, chaque thème un panneau de direction vert, et les thèmes sans cours apparaissent en « travaux » (panneau jaune). Le tracé déjà parcouru s'allume.

- **Parcours** : les cours se rangent par thème. Un thème sans cours s'affiche « en préparation ».
- **Fiche cours** : durée calculée à partir du texte, chapitres, séries liées et fiche mémo. L'affiche du cours s'affiche sur l'écran de la salle 3D.
- **Salle** : « Prendre place » lance le prochain cours non terminé, et reprend à la scène où tu t'étais arrêté.
- **Fin de cours** : fiche mémo, puis « Faire la série » et « Cours suivant ».
- **Examen blanc** : 20 questions tirées dans toute la banque, en alternant les thèmes, avec chrono et correction à la fin.
- **À revoir** : chaque question ratée revient (révision espacée) jusqu'à ce qu'elle soit maîtrisée.
- **Jauge « jour J »** : calculée à partir des cours vus, des questions maîtrisées et des derniers examens.

## Profil, série et planning

Au premier lancement, Plot accueille l'élève : prénom, pseudo, personnage, puis son rythme (jours, minutes par séance, date
d'examen). Le planning range ensuite tout le parcours dans l'ordre : chaque cours, sa série de questions, ses exercices 3D,
et 4 examens blancs (à 60 %, à 85 %, puis deux à la fin). L'accueil salue l'élève par son prénom et montre la séance du jour ;
l'onglet Planning montre 6 jours à partir d'aujourd'hui, l'avancement et la date de fin prévue. Les activités en retard se
replacent d'un appui. La série compte les jours où l'élève a fait au moins une activité (cours terminé, série, exercice 3D,
examen, ou une question répondue). Le profil se modifie d'un appui sur l'avatar de l'accueil.

## Le lecteur de cours

La leçon reste une leçon (aucune question), mais on peut s'en servir :
- **Vraie pause** : la scène 3D se fige avec la voix, et la lecture reprend à la même phrase.
- **360°** : on fige la scène et on tourne autour de la voiture (glisser), on zoome (pincer, molette) ; dans les scènes
  de panneaux, on regarde autour. Glisser sur l'image y entre directement.
- **Toucher pour comprendre** : toucher un usager ou un panneau ouvre une petite fiche, lue à voix haute
  (`src/app/infos.js`), avec l'étiquette de la scène si elle en a une.
- **Angle de vue** des mises en situation : celui du cours, conducteur, derrière ou dessus (gardé d'une séance à l'autre).
- **Ralenti** : la mise en situation se rejoue sans la voix, à 0,35 ×.
- **Retenir** : l'étoile garde le passage ; il apparaît sur la barre, dans le texte, en fin de cours et dans la fiche du cours.
- **Texte** : toutes les phrases du cours, celle qui est dite en surbrillance ; toucher une phrase y emmène.
- **Barre** : scènes et chapitres marqués ; en glissant, un aperçu montre la scène visée.
- **Gestes** : toucher l'image = plein écran ; double toucher à gauche ou à droite = phrase précédente ou suivante ;
  au clavier : espace, flèches, Échap.
- **Démarrage sans écran vide** : l'app affiche un écran de chargement dès la première image (le moteur 3D se construit
  après, `build.mjs` reporte le démarrage) ; une séance s'ouvre sur un rideau sombre au titre du cours, qui se lève dès
  que la scène est dessinée, et la voix ne part qu'une fois l'image à l'écran (`Player.start`, `settled()` dans `nav.js`).
  Pendant qu'on lit l'accueil ou la fiche, la première scène du cours est préparée en arrière-plan (`prewarm` dans
  `scenes.js`, `Engine.warm` : les shaders sont compilés avant d'en avoir besoin).

## Exercices de conduite (simulateur 3D)

**Une leçon, puis sa pratique.** La leçon est une leçon : aucune question pendant la vidéo. Sa deuxième partie est la pratique
(`p-<id du cours>` dans `content/exercices.json`) : des situations qui reprennent tout ce que dit la leçon, posées de
trois façons selon ce qu'il y a à voir (champ `mode`) :

- `video` : la scène se joue quelques secondes (la mise en situation en sous-titre), l'image se fige (rendu à la pleine
  résolution de l'écran), la caméra zoome sur le panneau ou l'usager, puis le QCM et sa correction. Seulement quand quelque
  chose se passe : un usager qui bouge, un feu dont on s'approche, une démonstration de la bonne conduite (`apres`) ;
- `image` : l'image figée au moment de décider, sans vidéo d'observation (un panneau à lire, une scène à l'arrêt) ;
- `qcm` : une question de cours posée directement sur un fond uni, sans décor ni vidéo (taux d'alcool, points, démarches…).
  « Lequel de ces panneaux… » : les panneaux sont les réponses (`panneauxChoix`, tuiles A, B, C).

Les réponses aux questions de la banque (`qid`) alimentent les révisions. Les défis 3D (freinage, feux, priorités…) sont
rattachés à leur leçon : aucun exercice n'est seul. Les pratiques sont générées par `gen/pratique.py` (décor par leçon, mises
en scène sur mesure par question, `mode` choisi par la règle ci-dessus, avec `QCM_FORCE` / `IMAGE_FORCE` pour les questions
de connaissance mises en scène « pour l'ambiance »). L'examen blanc tire surtout des situations (vidéo ou image) et au plus
8 questions de cours.

Chaque pratique commence par les **deux exercices immersifs** du cours (70 en tout, `exercices_immersifs_3d` dans
`gen/cours-immersifs-35.json`, mis en scène par `gen/immersifs.py`) : la scène se joue, se fige au moment de décider
(vue extérieure puis place du conducteur avec `puis`), réponse unique, puis la scène reprend et la voiture fait ce qu'il
fallait faire pendant que la correction s'affiche (`apres` : `ralentir`, `distance`, `arret`, `freinage`, `voie`, `inserer`,
`garer`, `depasser`, `feux`, `attendre`, `aucune`, avec `kmh`, `S` du point d'arrêt, `voie`, `feux`, `acteurs` à relancer…).
Les réponses sont mélangées : dans le fichier source, la bonne était presque toujours la première. Chaque exercice immersif
garde sa mise en situation (`contexte`, le « point de départ » du fichier source : « Un ami propose un café après plusieurs
verres. »), affichée au-dessus de la question : sans elle, « Que fais-tu ? » ne veut rien dire. Ceux qui n'ont rien à montrer
en mouvement (`apres: aucune`) deviennent des questions directes.

Les mises en situation des leçons peuvent jouer un petit scénario (`script`, minuté sur le temps du simulateur) : dépasser,
s'arrêter avant un point, changer de voie avec le clignotant, faire repartir un bus, ouvrir une portière, changer un feu
(`'clignotant'` le fait clignoter), faire freiner un usager (`freiner`), changer de caméra (`camera`), retirer les étiquettes
(`etiquettes`) quand elles ne sont plus vraies.

Chaque exercice est décrit dans `content/exercices.json` et joué par une **mécanique** :

| Mécanique | Ce que fait l'élève | Champs |
|---|---|---|
| `examen` | une scène 3D se fige, une question façon examen, une ou plusieurs bonnes réponses parmi A à D, puis l’explication | `situations` : `{ q, choix, bonnes, explication, env, meteo, kmh, camera, compteur, signaux, acteurs, carrefour, giratoire, passage, chevrons, tunnel, rails, marquages, feux }` |
| `freinage` | maintient « Freiner » quand un danger surgit ; on mesure réaction, distance de freinage, et ce qui se serait passé 20 km/h plus vite | `env`, `meteo`, `kmh`, `evenements` |
| `vitesse` | conduit avec les pédales et respecte chaque limitation dès son panneau | `zones` : `{ d, lim, panneau, maisons, msg }` |
| `distance` | garde au moins `cible` secondes derrière une voiture qui ralentit et accélère | `kmh`, `cible`, `profil` |
| `feu` | feu orange : freine si l'arrêt est possible, sinon continue | `kmh`, `distances` |
| `priorite` | l'image se fige au carrefour : « Je passe » ou « Je cède » | `scenarios` |
| `depassement` | derrière un véhicule lent : « Je double » ou « Je reste derrière » | `scenarios` |
| `danger` | arrêt sur image : touche tous les dangers, attention aux leurres | `scenes` |
| `eclairage` | allume les bons feux, effet visible en direct | `situations` |

L’examen blanc en situation (onglet Examen) tire 40 situations au hasard parmi toutes les situations d’examen : 20 secondes chacune, correction à la fin, réussite à 35 sur 40.

Chaque exercice compte 10 situations (10 événements, 10 feux, 10 zones, 10 scénarios…).

Événements de freinage : `pieton`, `enfant`, `ballon`, `portiere`, `sortie`, `bus`, `freine-devant`, `biche`, `bouchon`, `faux-pieton`. Une zone de vitesse peut changer la météo en route (`"meteo": "pluie"`). Feux : `position`, `croisement`, `route`, `brouillardAv`, `brouillardAr`, `detresse` ; une situation peut accepter des feux en plus avec `permis`, et se passer dans un tunnel (`tunnel`) ou un bouchon (`bouchon`).
Environnements : `ville`, `route`, `autoroute`. Météo : `jour`, `pluie`, `brouillard`, `nuit`, `neige`.

Exemple de scénario de priorité :

```json
{ "titre": "Pas de panneau", "contexte": "Une voiture arrive par la droite.", "ctrl": "aucun", "kmh": 30,
  "acteurs": [{ "depuis": "droite", "role": "prioritaire", "kmh": 30 }], "bonne": "ceder",
  "explication": "Aucun panneau, aucun feu : priorité à droite." }
```

`ctrl` : `aucun`, `stop`, `cedez`, `prioritaire`, `feu-vert`, `feu-rouge`, `feu-clignotant`, `giratoire`. `depuis` : `droite`, `gauche`, `face`, `pieton`, `derriere` (véhicule d'urgence), `anneau` (giratoire). `role` : `prioritaire` ou `cede`.

Les distances suivent ce qu'on enseigne au code : environ 1 seconde de réaction et un freinage plus long d'environ moitié sur sol mouillé.

## Ajouter un cours

Crée `content/cours/06-mon-cours.json` :

```json
{
  "id": "croisement",
  "ordre": 6,
  "theme": "circulation",
  "titre": "Croiser et dépasser",
  "accroche": "la bonne distance au bon moment",
  "resume": "Une phrase qui donne envie, affichée sur la fiche du cours.",
  "affiche": ["B14:90", "AB6"],
  "chapitres": ["Croiser", "Dépasser"],
  "series": ["serie-croisement"],
  "memo": [{ "panneau": "B14:90", "texte": "Ce qu'il faut retenir", "tag": "90 km/h" }],
  "scenes": [
    { "type": "titre", "ch": 0, "eyebrow": "Cours 6", "titre": "Croiser et dépasser", "dire": "Texte lu par la voix." }
  ]
}
```

Chaque scène a un `type`, un chapitre `ch` (à partir de 0) et un texte `dire`. La voix lit `dire` phrase par phrase, et les sous-titres suivent.

| Type | Ce qui se passe | Champs |
|---|---|---|
| `titre` | Titre plein écran pendant que la voiture roule | `eyebrow`, `titre`, `sous`, `vitesse` |
| `defile` | Des panneaux défilent vite, puis un grand chiffre apparaît | `panneaux`, `grand`, `texte` |
| `famille` | Les panneaux sortent de la route et la forme se trace en néon | `famille`, `forme`, `regle`, `panneaux`, `puce`, `barre`, `couleur` |
| `panneaux` | Des panneaux présentés avec un titre libre | `eyebrow`, `titre`, `panneaux`, `etiquettes`, `puce` |
| `chiffres` | De grands chiffres à l'écran | `eyebrow`, `titre`, `items: [["110","km/h","autoroute"]]`, `vitesse` |
| `reperes` | Des repères lumineux posés sur la route à X mètres | `eyebrow`, `titre`, `reperes: [[27,"Réaction · 27 m"]]`, `puce` |
| `touche` | Question : on touche le bon panneau dans la scène 3D | `question`, `panneaux`, `bonne`, `bien`, `mal`, `revoir` |
| `quiz` | Question à choix pendant la vidéo | `question`, `choix`, `bonne`, `bien`, `mal`, `revoir` |
| `fin` | Écran de fin | `eyebrow`, `titre`, `stats: [["7","règles"]]` |

`revoir` est l'index de la scène où renvoyer l'élève s'il se trompe. Valeurs possibles de `forme` : `tri`, `triBas`, `cercle`, `carre`, `octo`, `losange`. Valeurs possibles de `famille` : `danger`, `interdiction`, `obligation`, `indication`, `priorite`, `fin`, `temporaire`, `localisation`.

**Nouveau type de scène** : ajoute une entrée dans `src/app/scenes.js`. Le build la reconnaît automatiquement.

## Ajouter des questions et une série

Dans `content/questions/*.json` :

```json
{ "id": "c01", "cours": "croisement", "type": "qcm", "panneaux": ["B14:90"],
  "q": "Sur cette route, je roule au maximum à :", "choix": ["80 km/h", "90 km/h"], "bonnes": [1],
  "explication": "Le panneau fixe la limite : 90 km/h." }

{ "id": "c02", "cours": "croisement", "type": "association", "q": "Associe chaque panneau à son sens.",
  "paires": [["B6a1", "Stationnement interdit"], ["B6d", "Arrêt et stationnement interdits"]],
  "explication": "…" }
```

- `panneaux` est facultatif. Avec, la question s'affiche au bord d'une route en 3D ; sans, le fond est neutre.
- Plusieurs bonnes réponses : `"bonnes": [0, 1]`. L'app affiche alors « 2 réponses attendues ».

Puis, dans `content/series.json` :

```json
{ "id": "serie-croisement", "titre": "Croiser et dépasser", "cours": "croisement", "questions": ["c01", "c02"] }
```

Toutes les questions alimentent automatiquement l'examen blanc et les révisions.

## Scènes de cours en plus

- `liste` : des étapes ou des règles qui apparaissent une à une (`items` : textes ou `[titre, détail]`).
- `situation` : une mise en situation dans le simulateur, avec décor, météo, usagers et étiquettes :

```json
{ "type": "situation", "eyebrow": "Usagers vulnérables", "titre": "Un cycliste devant toi",
  "env": "route", "kmh": 20, "camera": "poursuite", "ligne": "continue",
  "acteurs": [{ "type": "velo", "S": 12, "x": 2.7, "kmh": 20 }],
  "etiquettes": [[0, "1,50 m", "minimum hors agglomération"]], "dire": "…" }
```

Caméras : `cockpit`, `poursuite`, `drone`, `haut`, `cote`. Acteurs : `voiture`, `velo`, `moto`, `pieton`, `enfant`, `bus`, `camion`, `tracteur`, `tram`, `biche`, `ambulance`, `triangle`, `portiere`, `feu`, `ballon`. `S` = mètres devant, `x` = position latérale (notre voie est à 1,75), `kmh` négatif = en sens inverse.

Décor en plus : `carrefour` (nombre ou `{ "S", "forme": "T-droite" | "T-gauche", "ligne": "feu" | "stop" | "cedez" }`), `giratoire`,
`passage`, `rails` (voie de tramway en travers), `tunnel`, `maisons`, `chevrons`, `signaux` (`[panneau, S, x]`) et `marquages`
(`[S, x, type]` : `tout-droit`, `gauche`, `droite`, `tout-droit-gauche`, `tout-droit-droite`, `rabat-droite`, `rabat-gauche`, `bus`).
Une rue à sens unique à deux voies : `env: "ville"`, le panneau `C12`, et notre voiture à `voie: -1.75` ou `1.75`.

## Panneaux disponibles

`A14 A1a A3 A3b A2b A4 A7 A13a A13b A15b A17 A21 AK14 AK5 AB1 AB2 AB25 B0 B1 B3 B14 B2a B6a1 B6d B211 B21a1 B22a B30 B40 B33 B31 B51 C12 C20a C1a C107 C108 EB10 EB20 AB3a AB4 AB6 AB7`

Certains panneaux prennent un paramètre :

- `B14:90` : limitation à 90
- `B33:70` : fin de limitation à 70
- `EB10:LYON` : entrée d'agglomération avec le nom de la ville

Pour ajouter un panneau, ajoute son dessin dans `DRAW` et son nom dans `META`, dans `src/app/signs.js`.

## Build, tests et mise en ligne

```bash
npm install
npm run check      # build + tests
```

`npm run build` reconstruit `docs/index.html`, puis `npm test` lance les tests. Pour mettre en ligne, il suffit de pousser sur la branche `main` : GitHub Pages sert le dossier `/docs`.

Le build bloque si le contenu a une erreur, et indique le fichier et la scène en cause. Par exemple :

```
✗ 3 problème(s) dans le contenu :
  - content/cours/05-alcool.json scène 1 (chifres) : type inconnu. Types disponibles : titre, defile, …
  - content/cours/05-alcool.json scène 2 (chiffres) : panneau inconnu « B99 »
  - Série serie-panneaux : question inconnue « p99 »
```

## Lancer sur iPhone

```bash
npx cap add ios
npm run ios        # build, synchronise et ouvre Xcode
```

Dans Xcode : choisis ta Team dans *Signing & Capabilities*, puis lance avec ▶.

Pour tester dans un navigateur : `npm run serve`, puis ouvre http://localhost:5173, ou ouvre directement le site GitHub Pages.

## Pour passer à des centaines de cours

1. **Contenu en ligne** : le format JSON ne change pas. Il suffit de le charger depuis Supabase dans `src/app/content.js`. C'est le seul fichier qui sait d'où vient le contenu. Tu peux publier un cours sans republier l'app.
2. **Production assistée** : faire écrire des brouillons de cours et de questions par l'API Claude dans ce format, puis les passer au build pour vérifier les références. Une relecture humaine reste indispensable, parce que la règle de droit doit être exacte.
3. **Voix studio** : générer `dire` phrase par phrase avec ElevenLabs. Le lecteur avance déjà phrase par phrase.
4. Remplacer `localStorage` par `@capacitor/preferences` (même interface `get`/`set` dans `util.js`).
