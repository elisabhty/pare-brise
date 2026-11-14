/* Les mots du code, en mots simples. Chaque définition reprend ce que disent déjà les cours (et, pour les termes
   définis par le Code de la route, son article R110-2) : aucune règle nouvelle ici. « cours » : le cours qui en parle.
   « formes » : les façons dont le mot apparaît dans une question (pour le souligner et l'expliquer d'un toucher). */
export const LEXIQUE = [
  { mot: 'Agglomération', formes: ['agglomération', 'agglomérations'], cours: 'panneaux', def: 'Une ville ou un village. Elle commence au panneau blanc bordé de rouge qui porte son nom, et finit au même panneau barré.' },
  { mot: 'Chaussée', formes: ['chaussée', 'chaussées'], cours: 'placement-chaussee', def: 'La partie de la route où roulent les véhicules. Les trottoirs et les bords de la route n’en font pas partie.' },
  { mot: 'Voie', formes: ['voie', 'voies'], cours: 'placement-chaussee', def: 'Une bande de la chaussée assez large pour une file de véhicules. Une chaussée peut avoir plusieurs voies.' },
  { mot: 'Chaussées séparées', formes: ['chaussées séparées'], cours: 'vitesses', def: 'Une route où les deux sens de circulation sont séparés par un terre-plein ou une barrière.' },
  { mot: 'Accotement', formes: ['accotement', 'accotements', 'bas-côté', 'bas-côtés'], cours: null, def: 'Le bord de la route, à côté de la chaussée. On l’appelle aussi le bas-côté.' },
  { mot: 'Terre-plein central', formes: ['terre-plein', 'terre-pleins'], cours: null, def: 'La bande, souvent en herbe ou en béton, qui sépare les deux sens de circulation.' },
  { mot: 'Intersection', formes: ['intersection', 'intersections', 'carrefour', 'carrefours'], cours: 'priorites', def: 'L’endroit où deux routes ou plus se croisent ou se rejoignent. On dit aussi un carrefour.' },
  { mot: 'Giratoire', formes: ['giratoire', 'giratoires', 'rond-point', 'ronds-points'], cours: 'carrefours-feux', def: 'Un carrefour en rond autour d’un îlot central, où l’on tourne dans un seul sens. On dit aussi un rond-point.' },
  { mot: 'Priorité à droite', formes: ['priorité à droite'], cours: 'priorites', def: 'Sans panneau, sans feu et sans agent, tu laisses passer ceux qui arrivent de ta droite.' },
  { mot: 'Céder le passage', formes: ['céder le passage', 'cédez le passage', 'cédez-le-passage'], cours: 'priorites', def: 'Laisser passer les autres avant de t’engager. Tu ralentis, et tu t’arrêtes seulement si quelqu’un arrive.' },
  { mot: 'Angle mort', formes: ['angle mort', 'angles morts'], cours: 'changer-direction-voie', def: 'La zone autour de ta voiture que tes rétroviseurs ne montrent pas. Pour la voir, tourne la tête vers l’épaule.' },
  { mot: 'Se déporter', formes: ['se déporter', 'déporter', 'déporte'], cours: 'changer-direction-voie', def: 'Décaler ta voiture sur le côté, sans changer de voie.' },
  { mot: 'Temps de réaction', formes: ['temps de réaction', 'distance de réaction'], cours: 'distances', def: 'Le temps entre le moment où tu vois un danger et celui où tu commences à freiner : environ une seconde.' },
  { mot: 'Distance de freinage', formes: ['distance de freinage', 'distances de freinage'], cours: 'distances', def: 'La distance parcourue pendant que tu freines, jusqu’à l’arrêt.' },
  { mot: 'Distance d’arrêt', formes: ['distance d’arrêt', 'distances d’arrêt', "distance d'arrêt"], cours: 'distances', def: 'Toute la distance parcourue entre le danger vu et l’arrêt : la distance de réaction, plus la distance de freinage.' },
  { mot: 'Distance de sécurité', formes: ['distance de sécurité', 'distances de sécurité'], cours: 'distances', def: 'L’écart à garder avec le véhicule de devant : au moins 2 secondes.' },
  { mot: 'Bande d’arrêt d’urgence', formes: ['bande d’arrêt d’urgence', "bande d'arrêt d'urgence"], cours: 'autoroute', def: 'La voie tout à droite de l’autoroute, réservée aux pannes et aux urgences. On n’y roule pas.' },
  { mot: 'Zone 30', formes: ['zone 30'], cours: 'usagers-vulnerables', def: 'Une zone de ville où la vitesse est limitée à 30 km/h.' },
  { mot: 'Zone de rencontre', formes: ['zone de rencontre'], cours: 'usagers-vulnerables', def: 'Une zone de ville où les piétons peuvent marcher sur la chaussée et passent en premier. Vitesse : 20 km/h.' },
  { mot: 'Aire piétonne', formes: ['aire piétonne'], cours: 'usagers-vulnerables', def: 'Une zone réservée aux piétons. Une voiture n’y entre que si un panneau l’autorise, et elle roule au pas.' },
  { mot: 'Piste cyclable', formes: ['piste cyclable', 'pistes cyclables'], cours: 'cyclistes-edpm', def: 'Une chaussée réservée aux vélos, à part de celle des voitures.' },
  { mot: 'Bande cyclable', formes: ['bande cyclable', 'bandes cyclables'], cours: 'cyclistes-edpm', def: 'Une voie réservée aux vélos, peinte sur la chaussée des voitures.' },
  { mot: 'Sas vélo', formes: ['sas vélo', 'sas vélos'], cours: 'carrefours-feux', def: 'L’espace devant le feu, entre deux lignes, réservé aux vélos. Une voiture s’arrête à la première ligne.' },
  { mot: 'EDPM', formes: ['EDPM'], cours: 'cyclistes-edpm', def: 'Engin de déplacement personnel motorisé : une trottinette électrique, par exemple.' },
  { mot: 'Usagers vulnérables', formes: ['usagers vulnérables', 'usager vulnérable'], cours: 'usagers-vulnerables', def: 'Ceux qui sont peu protégés en cas de choc : piétons, cyclistes, utilisateurs de trottinette, motards.' },
  { mot: 'Permis probatoire', formes: ['permis probatoire', 'période probatoire', 'probatoire'], cours: 'permis-points', def: 'Les premières années du permis : 6 points au départ, pendant 3 ans, ou 2 ans après la conduite accompagnée.' },
  { mot: 'Délit', formes: ['délit', 'délits'], cours: 'permis-points', def: 'Une infraction grave, jugée au tribunal.' },
  { mot: 'Aquaplaning', formes: ['aquaplaning'], cours: 'intemperies', def: 'Quand une couche d’eau fait flotter tes pneus : la voiture ne répond plus. Lâche l’accélérateur et garde le volant droit.' },
  { mot: 'Écoconduite', formes: ['écoconduite', 'éco-conduite'], cours: 'ecoconduite', def: 'Conduire en consommant moins : anticiper, passer les rapports tôt, rouler un peu moins vite.' },
  { mot: 'Crit’Air', formes: ['Crit’Air', "Crit'Air"], cours: 'vehicules-propres', def: 'La vignette collée sur le pare-brise, qui classe la voiture selon sa pollution.' },
  { mot: 'ZFE', formes: ['ZFE', 'zone à faibles émissions', 'zones à faibles émissions'], cours: 'vehicules-propres', def: 'Zone à faibles émissions : en ville, certaines vignettes Crit’Air n’ont pas le droit d’y rouler.' }
].sort((a, b) => a.mot.localeCompare(b.mot, 'fr'));

/* « Lire une question » : comment les questions sont posées (pas de règle de conduite ici) */
export const LIRE = [
  ['Une seule réponse, ou plusieurs ?', 'La question te le dit. S’il y en a plusieurs, coche-les toutes : une seule oubliée, et toute la question est fausse.'],
  ['« Je peux » ou « je dois » ?', '« Je peux » : coche tout ce qui est autorisé. « Je dois » : seulement ce qui est obligatoire.'],
  ['Les petits mots qui changent tout', '« Seulement », « uniquement », « toujours », « jamais » : relis la réponse avec eux. Une exception suffit à la rendre fausse.'],
  ['Ralentir, ce n’est pas forcément freiner', 'Lever le pied de l’accélérateur, c’est déjà ralentir.'],
  ['Une question en deux parties', 'Réponds aux deux. Il n’y a pas de demi-point : une erreur sur une partie, et la question compte comme fausse.'],
  ['Regarde la situation montrée', 'Réponds pour ce que tu vois sur l’image : la route, les panneaux, les autres usagers. Pas pour ce que tu ferais d’habitude.']
];

/* les formes, de la plus longue à la plus courte (« chaussées séparées » avant « chaussée ») */
const FORMES = LEXIQUE.flatMap(l => l.formes.map(f => [f, l])).sort((a, b) => b[0].length - a[0].length);
const echap = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const RE = new RegExp(`(^|[^\\p{L}’'-])(${FORMES.map(([f]) => echap(f)).join('|')})(?=$|[^\\p{L}’'-])`, 'giu');
export const motDe = forme => { const f = String(forme).toLowerCase(); const x = FORMES.find(([k]) => k.toLowerCase() === f); return x ? x[1] : null; };

/* le texte d'une question, avec les mots du lexique soulignés (chaque mot une seule fois) ; esc : la fonction d'échappement */
export function lexify(texte, esc) {
  const vus = new Set();
  let out = '', last = 0;
  String(texte).replace(RE, (m, avant, mot, i) => {
    const l = motDe(mot); const debut = i + avant.length;
    if (!l || vus.has(l.mot)) return m;
    vus.add(l.mot);
    out += esc(String(texte).slice(last, debut)) + `<button type="button" class="lx" data-lx="${esc(l.mot)}">${esc(mot)}</button>`;
    last = debut + mot.length;
    return m;
  });
  return out + esc(String(texte).slice(last));
}
