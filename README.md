# Pare-Brise : la salle de code virtuelle

**En ligne : https://elisabhty.github.io/pare-brise/**

Une app iOS (Capacitor 8) de code de la route en 3D.

Dans cette version, **l'app est un moteur** et **le contenu est en JSON**. Tu ajoutes un cours, une série ou des questions en écrivant un fichier dans `content/`, sans toucher au code. Le build vérifie tout le contenu avant de fabriquer l'app.

Contenu fourni pour la démo : 10 thèmes officiels, 5 cours (47 scènes), 37 questions, 5 séries.

## Structure

```
content/
  themes.json            les 10 thèmes officiels de l'examen
  cours/*.json           un fichier par cours
  questions/*.json       la banque de questions (autant de fichiers que tu veux)
  series.json            les séries d'exercices (des listes de questions)
src/
  engine/engine.js       moteur 3D : salle, route, studio (Three.js + bloom)
  app/scenes.js          les types de scènes d'un cours (l'endroit où en ajouter)
  app/player.js          lecteur de cours générique
  app/serie.js           séries : entraînement ou examen, QCM et association
  app/progress.js        progression et révision espacée (boîtes de Leitner)
  app/screens.js         salle, parcours, fiche cours, examen
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

## Panneaux disponibles

`A14 A1a A3 A2b AK14 AK5 AB1 AB2 AB25 B0 B1 B14 B2a B6a1 B6d B211 B21a1 B22a B40 B33 B31 C12 C20a C1a EB10 EB20 AB3a AB4 AB6 AB7`

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
