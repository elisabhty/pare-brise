# Pare-Brise : la salle de code virtuelle

**En ligne : https://elisabhty.github.io/pare-brise/**

Une app iOS (Capacitor 8) de code de la route en 3D.

Dans cette version, **l'app est un moteur** et **le contenu est en JSON**. Tu ajoutes un cours, une série ou des questions en écrivant un fichier dans `content/`, sans toucher au code. Le build vérifie tout le contenu avant de fabriquer l'app.

Contenu fourni : les 10 thèmes officiels, **35 cours** (237 scènes), chacun suivi de sa **pratique en 3D**, 193 questions, 35 séries, 14 défis 3D et un **examen blanc de 40 situations**.

Les cours 2 à 35 viennent du fichier « cours immersifs » (`gen/cours-immersifs-35.json`, intégré par `gen/integrer35.py`) : textes nettoyés des phrases répétées, indications de mise en scène gardées dans le champ `realisation_3d` du fichier source. Les cours 30 à 35 sont nouveaux et **pas encore vérifiés juridiquement** : règles, délais et seuils sont à contrôler avant publication.

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

## Exercices de conduite (simulateur 3D)

**Une leçon, puis sa pratique.** La leçon est une leçon : aucune question pendant la vidéo. Sa deuxième partie est la pratique
(`p-<id du cours>` dans `content/exercices.json`) : des situations en 3D qui reprennent tout ce que dit la leçon. Chaque
situation se joue quelques secondes, l'image se fige (rendu à la pleine résolution de l'écran), la caméra zoome sur le
panneau ou l'usager à observer, puis vient le QCM et sa correction. Les réponses aux questions de la banque (`qid`) alimentent
les révisions. Les défis 3D (freinage, feux, priorités…) sont rattachés à leur leçon : aucun exercice n'est seul. Les pratiques
sont générées par `gen/pratique.py` (décor par leçon, mises en scène sur mesure par question).

Chaque pratique commence par les **deux exercices immersifs** du cours (70 en tout, `exercices_immersifs_3d` dans
`gen/cours-immersifs-35.json`, mis en scène par `gen/immersifs.py`) : la scène se joue, se fige au moment de décider
(vue extérieure puis place du conducteur avec `puis`), réponse unique, puis la scène reprend et la voiture fait ce qu'il
fallait faire pendant que la correction s'affiche (`apres` : `ralentir`, `distance`, `arret`, `freinage`, `voie`, `inserer`,
`garer`, `depasser`, `feux`, `attendre`, `aucune`, avec `kmh`, `S` du point d'arrêt, `voie`, `feux`, `acteurs` à relancer…).
Les réponses sont mélangées : dans le fichier source, la bonne était presque toujours la première.

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
npm run check      # build + tests (19 tests)
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
