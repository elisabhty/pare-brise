/* « Touche pour comprendre » : ce que le lecteur dit d'un usager ou d'un panneau qu'on touche dans la scène 3D.
   Des repères courts, déjà vus dans les cours : rien ici n'est une question. */
import { meta, FAM } from './signs.js';

const ACTEURS = {
  voiture: ['Une voiture', 'Garde au moins deux secondes d’écart avec celle qui te précède, davantage sous la pluie.'],
  velo: ['Un cycliste', 'Usager vulnérable : pour le dépasser, au moins 1 m d’écart en ville et 1,50 m hors agglomération.'],
  trottinette: ['Une trottinette électrique', 'Dès 14 ans, 25 km/h au plus, une seule personne à bord : elle roule sur la piste cyclable ou la chaussée, pas sur le trottoir.'],
  moto: ['Un motard', 'Il se faufile vite et se glisse dans les angles morts : rétroviseurs et coup d’œil avant de bouger.'],
  pieton: ['Un piéton', 'Dès qu’il montre clairement qu’il veut traverser, tu lui cèdes le passage.'],
  enfant: ['Un enfant', 'Son comportement est imprévisible : il peut traverser sans regarder. Ralentis.'],
  bus: ['Un bus', 'En agglomération, quand il signale qu’il quitte son arrêt, facilite son départ.'],
  camion: ['Un poids lourd', 'Ses angles morts sont immenses : si tu ne vois pas ses rétroviseurs, il ne te voit pas.'],
  tram: ['Un tramway', 'Il ne peut ni t’éviter ni s’arrêter court : en général, laisse-le passer et ne reste jamais sur les rails.'],
  tracteur: ['Un véhicule lent', 'Ne le dépasse que si la visibilité et la place le permettent vraiment.'],
  ambulance: ['Un véhicule prioritaire', 'Feux bleus et deux tons : facilite son passage, sans manœuvre dangereuse.'],
  biche: ['Un animal sauvage', 'Ralentis : d’autres peuvent le suivre.'],
  ballon: ['Un ballon', 'C’est un indice : un enfant peut courir derrière.'],
  triangle: ['Le triangle', 'Posé à au moins 30 m de l’obstacle, s’il n’y a pas de danger pour le poser.'],
  portiere: ['Une portière', 'Un conducteur peut ouvrir sans regarder : garde une marge en le dépassant.'],
  feu: ['Un feu tricolore', 'Rouge : arrêt. Orange fixe : arrêt, sauf si c’est impossible sans danger. Vert : passage, en restant attentif.']
};

export function actorInfo(kind, etiquette) {
  const [titre, texte] = ACTEURS[kind] || ['Un usager', 'Observe sa trajectoire avant de décider.'];
  return { kicker: etiquette ? etiquette[0] : 'Dans la scène', titre, texte: etiquette && etiquette[1] && etiquette[1].trim() ? `${etiquette[1].charAt(0).toUpperCase() + etiquette[1].slice(1)}. ${texte}` : texte };
}

export function signInfo(id) {
  const m = meta(id), F = FAM[m.f] || FAM.danger;
  return { kicker: `${F.n} · ${m.code}`, titre: m.n, texte: `Sa famille se reconnaît à sa forme : ${F.rule}.`, sign: id };
}
