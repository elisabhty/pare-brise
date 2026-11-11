"""Intègre le fichier « cours immersifs » (35 cours) dans content/cours.
- Cours 1 : inchangé (script d'Elisa, mot pour mot).
- Cours 2 à 29 : mêmes scènes ; on retire les phrases gabarit répétées et les indications de mise en scène
  (elles restent dans gen/cours-immersifs-35.json, champ realisation_3d) ; on garde l'accroche des scènes d'ouverture
  quand elle se dit bien à voix haute ; la fin s'appelle « Ce qu'il faut retenir » et renvoie à la pratique.
- Cours 30 à 35 : nouveaux ; textes du fichier, mis en scène dans le simulateur (ou en liste quand la 3D ne peut pas
  montrer la chose : capot, voyants, papiers).
Lance : cd gen && python3 integrer35.py"""
import json, glob, os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..', 'content')
J = lambda p: json.load(open(p, encoding='utf-8'))
def W(p, d): open(p, 'w', encoding='utf-8').write(json.dumps(d, ensure_ascii=False, indent=1) + '\n')

SRC = J(os.path.join(HERE, 'cours-immersifs-35.json'))['cours']
FILES = {J(f)['id']: f for f in glob.glob(f'{ROOT}/cours/*.json')}

# ---------- cours 2 à 29 ----------
# accroches d'ouverture gardées (celles qui parlent au conducteur, pas à la caméra)
ACCROCHE = {
    2: 'Tu quittes un parking et rejoins la circulation. La vitesse autorisée va changer selon la route.',
    3: 'Tu approches d’une intersection. Plusieurs véhicules arrivent de directions différentes.',
    4: 'Tu roules à vitesse constante. Un obstacle apparaît au loin : il faut comprendre l’espace nécessaire pour s’arrêter.',
    5: 'Une soirée se termine. Avant de prendre le volant, un sujet essentiel s’impose : l’alcool.',
    6: 'Tu arrives dans un quartier animé où se croisent voitures, cyclistes et piétons.',
    8: 'Un véhicule lent circule devant toi sur une route à double sens.',
    9: 'Tu cherches un endroit où t’immobiliser dans une rue animée.',
    10: 'Tu arrives à l’entrée d’une autoroute. La circulation accélère progressivement.',
    11: 'Tu traverses une rue commerçante fréquentée par des piétons.',
    12: 'Une piste cyclable longe la route. Plusieurs mobilités partagent l’espace.',
    13: 'Un camion, un bus et une moto circulent autour de toi.',
    14: 'Une sirène se fait entendre au loin. Un véhicule d’intervention approche.',
    15: 'Le soleil se couche. Les premières ombres apparaissent sur la route.',
    16: 'Le temps change pendant le trajet. Des nuages sombres apparaissent.',
    17: 'Tu arrives devant un passage à niveau, puis un tunnel et une route de montagne.',
    18: 'Tu conduis depuis longtemps. L’attention commence à diminuer.',
    19: 'Avant de conduire, tu observes une boîte de médicaments et les risques liés aux substances.',
    20: 'Tu viens d’obtenir ton permis.',
    21: 'Tu t’installes dans une voiture pour la première fois.',
    22: 'Des passagers montent à bord, dont un enfant.',
    23: 'Avant de partir, tu fais le tour de ta voiture.',
    24: 'Tu montes dans une voiture équipée d’aides électroniques.',
    25: 'Un accident vient de se produire sur une route. La priorité est d’éviter un second accident.',
    28: 'Tu conduis sur une route fluide. L’objectif est de consommer moins en anticipant.',
    29: 'Une voiture électrique traverse une zone urbaine.',
}
# la fin de chaque cours renvoie à sa pratique (et plus aux anciens exercices)
FIN = {
    2: 'Cours terminé. Passe à la pratique : les vitesses tombent souvent à l’examen.',
    3: 'Cours terminé. Passe à la pratique : à toi de dire qui passe en premier.',
    4: 'Cours terminé. Trois calculs à retenir. Passe à la pratique pour les appliquer sur la route.',
    5: 'Cours terminé. Passe à la pratique pour vérifier les chiffres.',
    6: 'Cours terminé. Passe à la pratique : à toi de décider quand le feu change.',
    7: 'Cours terminé. Les lignes, c’est la base des dépassements : passe à la pratique, puis enchaîne avec le cours suivant.',
    8: 'Cours terminé. Passe à la pratique : à toi de décider si tu peux doubler.',
    9: 'Cours terminé. Retiens surtout le réflexe rétroviseur avant d’ouvrir ta portière. Place à la pratique.',
    10: 'Cours terminé. Passe à la pratique pour garder tes distances à grande vitesse.',
    11: 'Cours terminé. Passe à la pratique pour repérer les piétons à temps.',
    12: 'Cours terminé. Retiens le réflexe angle mort avant chaque virage à droite. Place à la pratique.',
    13: 'Cours terminé. Passe à la pratique : à toi de repérer les angles morts et les deux-roues.',
    14: 'Cours terminé. Passe à la pratique : une ambulance t’attend.',
    15: 'Cours terminé. Passe à la pratique : à toi de choisir les bons feux.',
    16: 'Cours terminé. Passe à la pratique : pluie, brouillard et neige t’attendent.',
    17: 'Cours terminé. Passe à la pratique pour revoir ces lieux à part.',
    18: 'Cours terminé. Passe à la pratique pour repérer les pièges de l’inattention.',
    19: 'Cours terminé. Passe à la pratique pour vérifier ce que tu as retenu.',
    20: 'Cours terminé. Passe à la pratique pour compter les points.',
    21: 'Cours terminé. Passe à la pratique pour vérifier tes réglages.',
    22: 'Cours terminé. Passe à la pratique pour protéger chaque passager.',
    23: 'Cours terminé. Passe à la pratique pour vérifier ta voiture.',
    24: 'Cours terminé. Passe à la pratique : les aides t’aident, mais c’est toi qui conduis.',
    25: 'Cours terminé. Ces gestes peuvent sauver une vie : relis la fiche mémo, puis passe à la pratique.',
    26: 'Cours terminé. Passe à la pratique pour revoir les papiers et le constat.',
    27: 'Cours terminé. Passe à la pratique pour connaître le prix de chaque infraction.',
    28: 'Cours terminé. Passe à la pratique pour conduire plus souple.',
    29: 'Cours terminé. Passe à la pratique pour revoir Crit’Air et les zones à faibles émissions.',
}
for src in SRC[1:29]:
    n = src['ordre']; f = FILES[src['id']]; c = J(f)
    sc = c['scenes']
    assert len(sc) == len(src['scenes'])
    t0 = sc[0]
    base = src['scenes'][0]['dire_original']
    t0['dire'] = (ACCROCHE[n] + ' ' + base) if n in ACCROCHE else base
    sc[-1]['titre'] = src['scenes'][-1]['titre']           # « Ce qu’il faut retenir »
    sc[-1]['dire'] = FIN[n]
    W(f, c)

# ---------- cours 30 à 35 ----------
V = lambda S, x=1.75, kmh=None, **k: dict(type='voiture', S=S, x=x, **({'kmh': kmh} if kmh is not None else {}), **k)
P = lambda S, x, **k: dict(type='pieton', S=S, x=x, **k)
src = {c['id']: c for c in SRC[29:]}
def dire(cid, i): return src[cid]['scenes'][i]['dire']
def course(cid, fichier, affiche, memo, scenes):
    s = src[cid]
    c = {k: s[k] for k in ('id', 'ordre', 'theme', 'titre', 'accroche', 'resume', 'chapitres')}
    c['affiche'] = affiche; c['series'] = ['serie-' + cid]; c['memo'] = memo; c['scenes'] = scenes
    for k, sc in enumerate(scenes):
        if 'dire' not in sc: sc['dire'] = dire(cid, k)
        if 'ch' not in sc: sc['ch'] = s['scenes'][k]['ch']
    W(f'{ROOT}/cours/{fichier}.json', c)
def titre(cid, n, theme, vitesse):
    s = src[cid]
    return dict(type='titre', ch=0, eyebrow=f'Cours {n} · {theme}', titre=s['titre'], sous=s['accroche'], vitesse=vitesse)
def fin(eyebrow, stats, texte):
    return dict(type='fin', eyebrow=eyebrow, titre='Ce qu’il faut retenir', stats=stats, dire=texte)

course('changer-direction-voie', '30-changer-direction-voie', ['B211', 'B2a', 'A21'], [
    {'texte': 'Rétroviseur intérieur, puis extérieur', 'tag': '1 · regarder'},
    {'texte': 'Clignotant assez tôt', 'tag': '2 · signaler'},
    {'texte': 'Coup d’œil dans l’angle mort', 'tag': '3 · vérifier'},
    {'texte': 'Seulement si la voie est libre', 'tag': '4 · manœuvrer'}], [
    titre('changer-direction-voie', 30, 'Circulation', 40),
    dict(type='situation', eyebrow='Les rétroviseurs', titre='Le contrôle commence dans les rétroviseurs',
         env='ville', kmh=25, camera='poursuite', acteurs=[dict(type='velo', S=-14, x=3.0, kmh=33)],
         etiquettes=[[0, 'Deux-roues', 'à ta droite']], script=[[7.2, 'clignotant', 'd']]),
    dict(type='situation', eyebrow='L’angle mort', titre='L’angle mort : la zone invisible',
         env='autoroute', kmh=90, camera='drone', acteurs=[V(-3.5, -1.75, kmh=90, couleur=0xE84A4A)],
         etiquettes=[[0, 'Angle mort', 'invisible dans le rétroviseur']],
         script=[[1.2, 'clignotant', 'g'], [5.0, 'acteur', 0, 112], [5.6, 'etiquettes'], [7.6, 'voie', -1.75, 2200], [10.0, 'clignotant', None]]),
    dict(type='situation', eyebrow='Le clignotant', titre='Signaler, ce n’est pas obtenir la priorité',
         env='autoroute', kmh=90, camera='drone', acteurs=[V(-14, -1.75, kmh=112, couleur=0x2E3440), V(-90, -1.75, kmh=110)],
         etiquettes=[[0, 'Il garde sa voie', 'ton clignotant ne lui impose rien']],
         script=[[0.8, 'clignotant', 'g'], [4.6, 'etiquettes'], [5.4, 'vitesse', 108, 2.5], [6.0, 'voie', -1.75, 2400], [8.6, 'clignotant', None]]),
    dict(type='situation', eyebrow='Changer de file', titre='Changer de file en douceur',
         env='autoroute', kmh=100, camera='drone', acteurs=[V(42, kmh=84, couleur=0x9AA3AF)],
         script=[[1.4, 'clignotant', 'g'], [3.6, 'voie', -1.75, 3000], [7.0, 'clignotant', None]]),
    dict(type='situation', eyebrow='Tourner à droite', titre='Tourner à droite : attention aux vélos',
         env='ville', kmh=22, camera='drone', carrefour={'S': 34, 'forme': 'T-droite'},
         acteurs=[dict(type='velo', S=6, x=3.1, kmh=21), P(27, 7.3, kmh=4.5)],
         etiquettes=[[0, 'Il va tout droit', 'il passe avant toi']],
         script=[[0.6, 'clignotant', 'd'], [1.2, 'arret', 30]]),
    dict(type='situation', eyebrow='Tourner à gauche', titre='Tourner à gauche : surveiller la circulation opposée',
         env='route', kmh=40, camera='drone', ligne='discontinue', carrefour={'S': 46, 'forme': 'T-gauche'},
         acteurs=[V(115, -1.75, kmh=-55, couleur=0xE84A4A), V(175, -1.75, kmh=-55)],
         etiquettes=[[0, 'Il va tout droit', 'il passe d’abord']],
         script=[[0.6, 'clignotant', 'g'], [1.0, 'arret', 43]]),
    fin('Fin du cours 30', [['4', 'étapes avant de bouger'], ['1', 'coup d’œil à l’angle mort']],
        'Avant chaque changement de direction ou de voie : je regarde, je signale, je vérifie, puis je manœuvre uniquement si c’est sûr. Passe à la pratique pour t’entraîner en situation.'),
])

course('placement-chaussee', '31-placement-chaussee', ['C12', 'A3b', 'C107'], [
    {'panneau': 'C12', 'texte': 'Plusieurs voies dans ton sens', 'tag': 'la voie de droite'},
    {'texte': 'Flèches au sol, panneaux de voie', 'tag': 'se placer tôt'},
    {'texte': 'Voie de bus, piste cyclable', 'tag': 'réservées'},
    {'panneau': 'A3b', 'texte': 'Ta voie se termine', 'tag': 'se rabattre'}], [
    titre('placement-chaussee', 31, 'Circulation', 90),
    dict(type='situation', eyebrow='Ta place', titre='Rester à droite en circulation normale',
         env='autoroute', kmh=110, camera='drone', voie=-1.75, acteurs=[dict(type='camion', S=14, x=1.75, kmh=88)],
         script=[[6.4, 'clignotant', 'd'], [7.4, 'voie', 1.75, 2400], [10.2, 'clignotant', None]]),
    dict(type='situation', eyebrow='Les flèches', titre='Lire les flèches et les panneaux de voie',
         env='ville', kmh=30, camera='drone', carrefour={'S': 70}, signaux=[['C12', 10]],
         marquages=[[30, -1.75, 'gauche'], [30, 1.75, 'tout-droit-droite'], [52, -1.75, 'gauche'], [52, 1.75, 'tout-droit-droite']],
         acteurs=[V(16, -1.75, kmh=28, couleur=0x2FA37A)], script=[[4.0, 'vitesse', 20, 1.5]]),
    dict(type='situation', eyebrow='Les voies réservées', titre='Une voie réservée n’est pas une voie libre',
         env='ville', kmh=25, camera='poursuite', voie=-1.75, ligne='continue', signaux=[['C12', 8]],
         marquages=[[24, 1.75, 'bus'], [52, 1.75, 'bus'], [80, 1.75, 'bus'], [108, 1.75, 'bus']],
         acteurs=[dict(type='bus', S=42, x=1.75, kmh=25)], etiquettes=[[0, 'Voie de bus', 'réservée, même si elle semble libre']]),
    dict(type='situation', eyebrow='L’insertion', titre='S’insérer sur une voie rapide',
         env='autoroute', kmh=70, camera='drone', voie=5.0,
         acteurs=[dict(type='camion', S=60, x=1.75, kmh=100), V(-46, 1.75, kmh=118, couleur=0x3A6DF0)],
         etiquettes=[[1, 'Déjà sur la voie', 'tu lui cèdes le passage']],
         script=[[0.4, 'vitesse', 92, 2.5], [1.2, 'clignotant', 'g'], [6.4, 'voie', 1.75, 2600], [9.4, 'clignotant', None]]),
    dict(type='situation', eyebrow='La sortie', titre='Sortir sans couper les voies',
         env='autoroute', kmh=110, camera='drone', voie=-1.75, acteurs=[V(120, 1.75, kmh=100, couleur=0x9AA3AF)],
         script=[[1.4, 'clignotant', 'd'], [5.6, 'voie', 1.75, 2600], [8.6, 'clignotant', None], [9.0, 'vitesse', 92, 1.5]]),
    dict(type='situation', eyebrow='Fin de voie', titre='Quand les voies se réduisent',
         env='ville', kmh=25, camera='poursuite', voie=-1.75, signaux=[['C12', 6], ['A3b', 20]],
         marquages=[[36, -1.75, 'rabat-droite'], [56, -1.75, 'rabat-droite'], [76, -1.75, 'rabat-droite']],
         acteurs=[V(18, 1.75, kmh=25, couleur=0xF2B233)],
         script=[[2.6, 'clignotant', 'd'], [5.2, 'voie', 1.75, 2600], [8.2, 'clignotant', None]]),
    fin('Fin du cours 31', [['1', 'voie normale : celle de droite'], ['3', 'réflexes de placement']],
        'Retiens trois réflexes : rester à droite quand c’est la règle, lire la signalisation assez tôt et ne jamais changer de file sans contrôle. Place à la pratique.'),
])

course('intersections-complexes', '32-intersections-complexes', ['AB1', 'A17', 'AB3a'], [
    {'texte': 'Agent, puis feux, puis panneaux', 'tag': 'qui commande'},
    {'panneau': 'AB1', 'texte': 'Rien du tout', 'tag': 'priorité à droite'},
    {'texte': 'Tourner à gauche', 'tag': 'laisser passer en face'},
    {'texte': 'Rails de tramway', 'tag': 'ne jamais s’y arrêter'}], [
    titre('intersections-complexes', 32, 'Circulation', 30),
    dict(type='situation', eyebrow='Qui commande ?', titre='Qui règle le passage ?', puce='Feu orange clignotant : règles habituelles',
         env='ville', kmh=22, camera='drone', carrefour={'S': 34},
         acteurs=[dict(type='feu', S=29.5, x=5.2, etat='clignotant'), V(35.75, 40, vx=-4.5, couleur=0xE84A4A)],
         etiquettes=[[1, 'Il vient de ta droite', 'priorité à droite']],
         script=[[0.6, 'arret', 30], [10.0, 'vitesse', 15, 1.5]]),
    dict(type='situation', eyebrow='Tourner à gauche', titre='Tourner à gauche face à une voiture',
         env='ville', kmh=22, camera='drone', carrefour={'S': 34},
         acteurs=[V(96, -1.75, kmh=-38, couleur=0x3A6DF0), P(24, -7.4, kmh=4.5)],
         etiquettes=[[0, 'Il va tout droit', 'il passe avant toi']],
         script=[[0.5, 'clignotant', 'g'], [0.9, 'arret', 31]]),
    dict(type='situation', eyebrow='Face à face', titre='Deux véhicules tournent à gauche',
         env='ville', kmh=18, camera='drone', carrefour={'S': 32},
         acteurs=[V(38.5, -1.75, couleur=0xF2B233)], etiquettes=[[0, 'Il tourne aussi', 'à gauche, en face']],
         script=[[0.4, 'clignotant', 'g'], [0.8, 'arret', 28.5]]),
    dict(type='situation', eyebrow='Le tramway', titre='Le tramway : une vigilance particulière',
         env='ville', kmh=22, camera='poursuite', carrefour={'S': 32}, rails=32,
         acteurs=[dict(type='tram', S=32, x=46, vx=-8.5)], etiquettes=[[0, 'Tramway', 'tu le laisses passer']],
         script=[[0.6, 'arret', 26], [10.4, 'vitesse', 18, 1.5]]),
    dict(type='situation', eyebrow='Vert, mais bouché', titre='Un feu vert ne garantit pas une voie libre',
         env='ville', kmh=22, camera='drone', carrefour={'S': 34, 'ligne': 'feu'},
         acteurs=[dict(type='feu', S=29.5, x=5.2, etat='vert'), V(41.5, freine=True, couleur=0x2E3440), V(47, couleur=0x9AA3AF), V(52.5, couleur=0x3A6DF0)],
         etiquettes=[[1, 'Plus de place', 'tu attends avant le carrefour']], script=[[0.8, 'arret', 29.5]]),
    dict(type='situation', eyebrow='Sans visibilité', titre='Intersection sans visibilité',
         env='ville', kmh=25, camera='cockpit', carrefour={'S': 46, 'forme': 'T-droite'},
         acteurs=[dict(type='camion', S=36, x=4.5), V(47.75, 30, vx=-4.2, couleur=0xE84A4A)],
         etiquettes=[[1, 'Il arrive', 'de la rue masquée']],
         script=[[0.6, 'vitesse', 10, 2], [2.8, 'arret', 41], [11.4, 'vitesse', 14, 1.2]]),
    fin('Fin du cours 32', [['4', 'niveaux : agent, feux, panneaux, règle'], ['1', 'réflexe : jamais sur les rails']],
        'À chaque carrefour, repère la règle applicable, les usagers concernés et les trajectoires qui se croisent. Passe à la pratique pour appliquer cette méthode.'),
])

course('anticiper-dangers', '33-anticiper-dangers', ['A13a', 'A4', 'A14'], [
    {'texte': 'Ballon, portière, bus à l’arrêt', 'tag': 'des indices'},
    {'panneau': 'A13a', 'texte': 'Abords d’école', 'tag': 'ralentir'},
    {'panneau': 'A4', 'texte': 'Chaussée mouillée', 'tag': 'plus de distance'},
    {'texte': 'L’angle mort des autres', 'tag': 'ne pas y rester'}], [
    titre('anticiper-dangers', 33, 'Conducteur', 30),
    dict(type='situation', eyebrow='Le regard', titre='Regarder loin, puis près',
         env='route', kmh=70, camera='cockpit', acteurs=[V(42, kmh=70, couleur=0x9AA3AF), dict(type='biche', S=200, x=-6.5, cap=90)],
         etiquettes=[[1, 'Au loin', 'un animal au bord de la route']], script=[[5.5, 'vitesse', 50, 1.5]]),
    dict(type='situation', eyebrow='Un masque', titre='Une voiture garée peut cacher un piéton',
         env='ville', kmh=30, camera='cockpit', acteurs=[dict(type='camion', S=40, x=4.5), P(46.2, 4.6, cap=90)],
         etiquettes=[[1, 'Caché', 'il peut traverser']], script=[[1.2, 'vitesse', 15, 2]]),
    dict(type='situation', eyebrow='L’école', titre='À proximité d’une école',
         env='ville', kmh=30, camera='poursuite', signaux=[['A13a', 14]],
         acteurs=[dict(type='enfant', S=40, x=6.6, kmh=3.5), dict(type='enfant', S=47, x=6.9, cap=90), dict(type='enfant', S=55, x=6.4, kmh=3)],
         etiquettes=[[1, 'Des enfants', 'imprévisibles']], script=[[0.8, 'vitesse', 18, 1.6]]),
    dict(type='situation', eyebrow='L’adhérence', titre='Quand l’adhérence diminue', puce='Pluie : distance d’arrêt plus longue',
         env='route', meteo='pluie', kmh=80, camera='cockpit', signaux=[['A4', 26]], acteurs=[V(36, kmh=70, couleur=0xE84A4A)],
         script=[[1.6, 'vitesse', 62, 1.4]]),
    dict(type='situation', eyebrow='Ta marge', titre='Laisser une porte de sortie',
         env='autoroute', kmh=110, camera='drone', chevrons=True,
         acteurs=[V(70, 1.75, kmh=110, couleur=0x9AA3AF), V(6, -1.75, kmh=110, couleur=0x2FA37A)],
         etiquettes=[[1, 'Son angle mort', 'n’y reste pas']], script=[[3.6, 'vitesse', 100, 1]]),
    dict(type='situation', eyebrow='Tout bouge', titre='Le danger change en quelques secondes',
         env='ville', kmh=30, camera='cockpit', passage=62,
         acteurs=[V(24, kmh=30, couleur=0x3A6DF0), P(62, 6.2, cap=90), dict(type='velo', S=110, x=-2.7, kmh=-18)],
         etiquettes=[[1, 'Il attend', 'il va traverser']],
         script=[[2.6, 'freiner', 0, 0, 3.6], [2.9, 'arret', 49], [6.6, 'acteur', 1, 0, -1.25]]),
    fin('Fin du cours 33', [['3', 'étapes : observer, prévoir, adapter']],
        'Le réflexe essentiel : je repère les indices, j’imagine ce qui peut arriver, puis j’adapte ma vitesse et mes distances. Passe à la pratique pour t’entraîner à repérer les risques.'),
])

course('controles-vehicule', '34-controles-vehicule', ['A14'], [
    {'texte': 'Pneus : usure, coupures, pression à froid', 'tag': 'avant de partir'},
    {'texte': 'Feux, clignotants, feux stop', 'tag': 'voir et être vu'},
    {'texte': 'Voyant rouge', 'tag': 'arrêt en sécurité'},
    {'texte': 'Voyant orange', 'tag': 'vérifier vite'}], [
    titre('controles-vehicule', 34, 'Mécanique', 30),
    dict(type='liste', eyebrow='Les pneus', titre='Le seul contact avec la route', items=[
        ['L’usure', 'Regarde les témoins au fond des rainures'], ['Coupures et déformations', 'Un pneu abîmé se remplace'],
        ['Le sous-gonflage', 'Un pneu écrasé se voit au premier coup d’œil'], ['La pression', 'À froid, selon le constructeur']]),
    dict(type='situation', eyebrow='Les feux', titre='Voir et être vu', env='route', meteo='nuit', kmh=0, voie=3.9, camera='arriere', feux={'croisement': False},
         script=[[1.2, 'feux', {'position': True}], [3.0, 'feux', {'croisement': True}], [5.0, 'feux', {'clignotant': 'g'}], [6.8, 'feux', {'clignotant': 'd'}], [8.6, 'feux', {'clignotant': None, 'detresse': True}], [11.0, 'feux', {'detresse': False}]]),
    dict(type='situation', eyebrow='La visibilité', titre='Pare-brise, essuie-glaces et lave-glace', puce='Des balais usés laissent des traces',
         env='route', meteo='pluie', kmh=60, camera='cockpit', acteurs=[V(120, -1.75, kmh=-60)]),
    dict(type='liste', eyebrow='Sous le capot', titre='Reconnaître les réservoirs', items=[
        ['Liquide de refroidissement', 'À contrôler moteur froid'], ['Lave-glace', 'Avec un produit adapté à la saison'],
        ['Liquide de frein', 'Entre les repères mini et maxi'], ['Huile moteur', 'À la jauge, si ton modèle en a une']]),
    dict(type='liste', eyebrow='Les voyants', titre='Un voyant rouge : réagir', puces=['●', '●', '●'], items=[
        ['Rouge', 'Anomalie grave : arrête-toi dès que possible, en sécurité'], ['Orange', 'Fais vérifier rapidement'],
        ['Le manuel du véhicule', 'Il donne le sens exact de chaque voyant']]),
    dict(type='liste', eyebrow='L’entretien', titre='Les contrôles ne remplacent pas l’entretien', items=[
        ['Les échéances', 'Celles du carnet d’entretien'], ['Une anomalie', 'Fais-la examiner sans attendre'],
        ['Moteur chaud', 'N’ouvre jamais le circuit de refroidissement']]),
    fin('Fin du cours 34', [['4', 'zones à vérifier'], ['2', 'couleurs de voyant à surveiller']],
        'Avant de partir, pense aux pneus, aux feux, aux vitres et aux alertes du tableau de bord. Pour les contrôles précis, suis toujours les indications de ton véhicule. Place à la pratique.'),
])

course('demarches-conducteur', '35-demarches-conducteur', ['A14'], [
    {'texte': 'Permis de la bonne catégorie', 'tag': 'le conducteur'},
    {'texte': 'Certificat d’immatriculation', 'tag': 'le véhicule'},
    {'texte': 'Assurance responsabilité civile', 'tag': 'obligatoire'},
    {'texte': 'Vente : déclaration de cession', 'tag': '15 jours'}], [
    titre('demarches-conducteur', 35, 'Notions', 30),
    dict(type='liste', eyebrow='Le conducteur et le véhicule', titre='Permis et immatriculation', items=[
        ['Le permis', 'De la catégorie du véhicule : B pour une voiture'], ['Le certificat d’immatriculation', 'La « carte grise » du véhicule'],
        ['Les justificatifs', 'Leur présentation peut évoluer : vérifie les règles en vigueur']]),
    dict(type='liste', eyebrow='L’assurance', titre='L’assurance est obligatoire', items=[
        ['Responsabilité civile', 'Le minimum obligatoire'], ['À quoi elle sert', 'Indemniser les dommages causés aux autres'],
        ['Sans assurance', 'Le véhicule ne doit pas circuler']]),
    dict(type='liste', eyebrow='Le contrôle technique', titre='Le contrôle technique', items=[
        ['Premier contrôle', 'Avant les 4 ans de la voiture'], ['Ensuite', 'Tous les 2 ans'],
        ['Ce qu’il vérifie', 'Des points de sécurité et d’environnement'], ['Ce qu’il ne fait pas', 'Remplacer l’entretien courant']]),
    dict(type='liste', eyebrow='Acheter', titre='Acheter un véhicule d’occasion', items=[
        ['Avant', 'Vérifie le véhicule et ses documents'], ['Plus de 4 ans', 'Contrôle technique de moins de 6 mois'],
        ['Après l’achat', 'Un mois pour l’immatriculer à ton nom']]),
    dict(type='liste', eyebrow='Vendre', titre='Vendre ou céder sa voiture', items=[
        ['Déclaration de cession', 'En ligne, dans les 15 jours'], ['Certificat d’immatriculation', 'Barré, daté, signé et remis à l’acheteur'],
        ['Certificat de situation administrative', 'De moins de 15 jours, pour l’acheteur'], ['La liste à jour', 'Sur les services officiels']]),
    dict(type='liste', eyebrow='Les démarches', titre='Les situations qui demandent une démarche', items=[
        ['Un déménagement', 'Change l’adresse de la carte grise'], ['Un achat', 'Nouvelle immatriculation à ton nom'],
        ['Une vente ou un don', 'Déclaration de cession'], ['Délais et pièces', 'Sur les sources officielles : ils peuvent changer']]),
    fin('Fin du cours 35', [['4', 'documents en règle'], ['15', 'jours pour déclarer une vente']],
        'Avant de rouler, vérifie ton droit de conduire, l’immatriculation, l’assurance et les obligations de contrôle technique. Après une vente ou un achat, réalise les démarches officielles sans attendre. Tu as vu tout le programme : passe à la pratique, puis place aux examens blancs.'),
])
print('ok')
