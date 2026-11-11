"""Une leçon = une pratique. Chaque cours reçoit son exercice « Pratique » : des situations en 3D (courte vidéo, arrêt sur image,
QCM, correction), qui reprennent tout ce que dit la leçon. Sources :
  - les situations d'examen existantes, redistribuées par leçon ;
  - les questions « surprise » des leçons (quiz, touche), retirées des leçons ;
  - les questions de la banque (séries), mises en scène selon le cours et la question.
Lance : python3 /home/claude/gen/pratique.py  (réécrit content/exercices.json et les cours)"""
import json, glob, os, re, copy

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'content')
J = lambda p: json.load(open(p, encoding='utf-8'))
def W(p, d): open(p, 'w', encoding='utf-8').write(json.dumps(d, ensure_ascii=False, indent=1) + '\n')

EXOS = J(f'{ROOT}/exercices.json')
cours_files = sorted(glob.glob(f'{ROOT}/cours/*.json'))
COURS = {}
for f in cours_files:
    c = J(f); COURS[c['id']] = (f, c)
ORDER = sorted(COURS, key=lambda k: COURS[k][1].get('ordre', 99))
QS = []
for f in sorted(glob.glob(f'{ROOT}/questions/*.json')):
    d = J(f); QS += d if isinstance(d, list) else d.get('questions', [])

# ---------- 1. situations d'examen existantes, par leçon ----------
EXAM = {e['id']: e for e in EXOS if e['meca'] == 'examen' and e['id'].startswith('x-exam-')}
if EXAM:
    MAP = {
        'x-exam-signalisation': ['vitesses', 'vitesses', 'depassement', 'priorites', 'arret-stationnement', 'usagers-vulnerables', 'carrefours-feux', 'carrefours-feux', 'autoroute', 'marquages'],
        'x-exam-priorites': ['priorites', 'priorites', 'carrefours-feux', 'priorites', 'carrefours-feux', 'vehicules-prioritaires', 'carrefours-feux', 'poids-lourds-2rm', 'priorites', 'priorites'],
        'x-exam-vitesses': ['vitesses', 'intemperies', 'distances', 'autoroute', 'vitesses', 'depassement', 'depassement', 'vitesses', 'vitesses', 'distances'],
        'x-exam-usagers': ['usagers-vulnerables', 'cyclistes-edpm', 'usagers-vulnerables', 'usagers-vulnerables', 'arret-stationnement', 'cyclistes-edpm', 'usagers-vulnerables', 'nuit-eclairage', 'vehicules-prioritaires', 'poids-lourds-2rm'],
        'x-exam-conditions': ['nuit-eclairage', 'nuit-eclairage', 'nuit-eclairage', 'montagne-tunnels-pn', 'autoroute', 'autoroute', 'intemperies', 'autoroute', 'nuit-eclairage', 'intemperies'],
    }
    BY = {}
    for xid, lst in MAP.items():
        for s, cid in zip(EXAM[xid]['situations'], lst): BY.setdefault(cid, []).append(s)
    W(os.path.dirname(os.path.abspath(__file__)) + '/exam-par-lecon.json', BY)
else:
    BY = J(os.path.dirname(os.path.abspath(__file__)) + '/exam-par-lecon.json')

# ---------- 2. questions « surprise » retirées des leçons ----------
QUIZ = {}
for cid in ORDER:
    f, c = COURS[cid]
    keep = []
    for s in c['scenes']:
        if s['type'] in ('quiz', 'touche'): QUIZ.setdefault(cid, []).append(s)
        else: keep.append(s)
    if len(keep) != len(c['scenes']):
        c['scenes'] = keep; W(f, c)
if not QUIZ and os.path.exists(os.path.dirname(os.path.abspath(__file__)) + '/quiz-par-lecon.json'): QUIZ = J(os.path.dirname(os.path.abspath(__file__)) + '/quiz-par-lecon.json')
else: W(os.path.dirname(os.path.abspath(__file__)) + '/quiz-par-lecon.json', QUIZ)

# ---------- 3. décors par leçon ----------
P = lambda S, x, **k: dict(type='pieton', S=S, x=x, **k)
V = lambda S, x=1.75, kmh=None, **k: dict(type='voiture', S=S, x=x, **({'kmh': kmh} if kmh is not None else {}), **k)
DECOR = {
    'panneaux': dict(env='ville', kmh=30),
    'vitesses': dict(env='route', kmh=70, compteur=True),
    'priorites': dict(env='ville', kmh=20, camera='drone', carrefour={'S': 20}),
    'distances': dict(env='route', kmh=50, compteur=True, acteurs=[V(30, kmh=50)]),
    'alcool': dict(env='ville', meteo='nuit', kmh=30, acteurs=[V(30, kmh=30)]),
    'carrefours-feux': dict(env='ville', kmh=25, carrefour={'S': 26}, acteurs=[dict(type='feu', S=21.5, x=5.2, etat='vert')]),
    'marquages': dict(env='route', kmh=50, camera='poursuite', ligne='continue'),
    'depassement': dict(env='route', kmh=50, camera='poursuite', ligne='discontinue', acteurs=[V(16, kmh=45)]),
    'arret-stationnement': dict(env='ville', kmh=0, camera='poursuite', voie=4.6),
    'autoroute': dict(env='autoroute', kmh=110, acteurs=[V(55, kmh=110)]),
    'usagers-vulnerables': dict(env='ville', kmh=25, passage=30, acteurs=[P(30, 6.2, cap=90)]),
    'cyclistes-edpm': dict(env='ville', kmh=25, camera='poursuite', acteurs=[dict(type='velo', S=12, x=3.0, kmh=20)]),
    'poids-lourds-2rm': dict(env='route', kmh=50, camera='poursuite', acteurs=[dict(type='camion', S=20, kmh=50)]),
    'vehicules-prioritaires': dict(env='ville', kmh=30, camera='arriere', acteurs=[dict(type='ambulance', S=-14, kmh=38)]),
    'nuit-eclairage': dict(env='route', meteo='nuit', kmh=60),
    'intemperies': dict(env='route', meteo='pluie', kmh=60, acteurs=[V(42, kmh=60)]),
    'montagne-tunnels-pn': dict(env='route', kmh=40, tunnel=45),
    'fatigue-distractions': dict(env='autoroute', meteo='nuit', kmh=110, acteurs=[V(60, kmh=110)]),
    'drogues-medicaments': dict(env='ville', kmh=30, acteurs=[V(26, kmh=30)]),
    'permis-points': dict(env='route', kmh=80, compteur=True),
    'poste-conduite': dict(env='ville', kmh=0, camera='poursuite', voie=4.6),
    'securite-passagers': dict(env='route', kmh=70, camera='poursuite'),
    'entretien': dict(env='route', kmh=0, camera='poursuite', voie=3.9, feux={'detresse': True}),
    'aides-conduite': dict(env='autoroute', kmh=110, compteur=True, acteurs=[V(38, kmh=106)]),
    'premiers-secours': dict(env='route', kmh=0, camera='drone', voie=3.9, feux={'detresse': True}, acteurs=[V(30, 1.2, cap=24), P(24, 4.6), dict(type='triangle', S=-2, x=1.75)]),
    'papiers-assurance': dict(env='ville', kmh=0, camera='drone', feux={'detresse': True}, acteurs=[V(6.4, 1.75, couleur=15499066), V(13, -1.75)]),
    'infractions': dict(env='ville', kmh=30, compteur=True),
    'ecoconduite': dict(env='route', kmh=70, compteur=True, acteurs=[V(48, kmh=70)]),
    'vehicules-propres': dict(env='ville', kmh=20, passage=26, acteurs=[P(26, 5.8, vx=-1.0)]),
    'changer-direction-voie': dict(env='ville', kmh=25, camera='poursuite'),
    'placement-chaussee': dict(env='autoroute', kmh=110, camera='poursuite'),
    'intersections-complexes': dict(env='ville', kmh=15, camera='drone', carrefour={'S': 20}),
    'anticiper-dangers': dict(env='ville', kmh=30),
    'controles-vehicule': dict(env='ville', kmh=0, camera='poursuite', voie=4.6),
    'demarches-conducteur': dict(env='ville', kmh=0, camera='poursuite', voie=4.6),
}
FEU = lambda etat, S=21.5: {'carrefour': {'S': S + 4.5}, 'acteurs': [dict(type='feu', S=S, x=5.2, etat=etat)]}
# mises en scène sur mesure (question → décor)
QOV = {
    # vitesses
    'v03': dict(env='autoroute', kmh=110, compteur=True, limite=130),
    'v04': dict(env='autoroute', meteo='brouillard', kmh=50, compteur=True),
    'v08': dict(env='route', meteo='pluie', kmh=70, compteur=True),
    # priorités
    'r04': dict(env='ville', kmh=18, camera='drone', carrefour={'S': 20}, acteurs=[V(21.75, 14, vx=-5), V(18.25, -14, vx=5)]),
    # distances
    'd01': dict(env='route', kmh=50, compteur=True, acteurs=[dict(type='biche', S=30, x=-6)]),
    'd04': dict(env='route', meteo='pluie', kmh=50, compteur=True, acteurs=[V(32, kmh=50)]),
    'd05': dict(env='autoroute', kmh=110, chevrons=True, acteurs=[V(62, kmh=110)]),
    'd06': dict(env='route', meteo='nuit', kmh=70, compteur=True),
    # alcool
    'a04': dict(env='route', meteo='nuit', kmh=70, acteurs=[V(120, -1.75, kmh=-70)]),
    # carrefours et feux
    'cf06-1': dict(env='ville', kmh=40, compteur=True, **FEU('orange', 13)),
    'cf06-2': dict(env='ville', kmh=20, camera='drone', **FEU('clignotant', 15.5), ),
    'cf06-3': dict(env='ville', kmh=20, camera='drone', giratoire=18, signaux=[['AB25', 10, 4.6]], acteurs=[V(24.6, -7.4)]),
    'cf06-4': dict(env='ville', kmh=20, camera='drone', **FEU('vert', 15.5)),
    'cf06-5': dict(env='ville', kmh=15, **FEU('rouge', 18), ),
    'cf06-6': dict(env='ville', kmh=30, compteur=True, **FEU('rouge', 22)),
    # marquages
    'm07-2': dict(env='route', kmh=60, camera='poursuite', ligne=[{'de': -200, 'a': 30, 'type': 'discontinue'}, {'de': 30, 'a': 110, 'type': 'annonce'}, {'de': 110, 'a': 900, 'type': 'continue'}]),
    'm07-3': dict(env='ville', kmh=20, camera='poursuite'),
    'm07-4': dict(env='route', kmh=60, camera='haut', ligne='discontinue'),
    'm07-5': dict(env='route', kmh=60, camera='poursuite', ligne='continue', acteurs=[V(18, kmh=50)]),
    # dépassement
    'd08-3': dict(env='route', kmh=25, camera='poursuite', ligne='continue', acteurs=[dict(type='velo', S=12, x=2.7, kmh=20)]),
    'd08-4': dict(env='route', kmh=70, camera='poursuite', ligne='discontinue', acteurs=[V(-4, -1.75, kmh=95)]),
    'd08-5': dict(env='route', kmh=50, camera='poursuite', ligne='discontinue', carrefour={'S': 45}, signaux=[['AB1', 24]], acteurs=[V(18, kmh=45)]),
    'd08-6': dict(env='route', kmh=40, camera='poursuite', ligne='discontinue', acteurs=[V(14, 0.9, kmh=12, cap=-8)]),
    # arrêt et stationnement
    'as09-3': dict(env='ville', kmh=20, passage=26, acteurs=[V(26, 4.6)]),
    'as09-4': dict(env='ville', kmh=0, camera='poursuite', voie=4.6, acteurs=[dict(type='velo', S=-8, x=2.6, kmh=16)]),
    'as09-5': dict(env='ville', kmh=0, camera='poursuite', voie=4.6, acteurs=[P(1, 6.4, cap=-90)]),
    # autoroute
    'a10-1': dict(env='autoroute', kmh=110, camera='poursuite', acteurs=[V(30, -1.75, kmh=120)]),
    'a10-2': dict(env='autoroute', kmh=0, camera='poursuite', voie=5.0, feux={'detresse': True}, acteurs=[V(-30, kmh=110), dict(type='triangle', S=-30, x=5.0)]),
    'a10-3': dict(env='autoroute', kmh=110, camera='haut', chevrons=True, acteurs=[V(38, kmh=110)]),
    'a10-4': dict(env='autoroute', kmh=90, camera='poursuite', acteurs=[dict(type='ambulance', S=48, x=4.9)]),
    'a10-6': dict(env='autoroute', meteo='pluie', kmh=110, compteur=True),
    # usagers vulnérables
    'uv11-1': dict(env='ville', kmh=25, passage=28, acteurs=[P(28, 6.0, cap=90)]),
    'uv11-3': dict(env='ville', kmh=20, acteurs=[P(22, 1.2, vx=-0.6), P(30, 5.2)]),
    'uv11-5': dict(env='ville', kmh=25, acteurs=[dict(type='ballon', S=24, x=3.0, vx=-2), dict(type='enfant', S=26, x=6.0)]),
    # cyclistes
    'ce12-1': dict(env='ville', kmh=25, camera='poursuite', acteurs=[dict(type='velo', S=12, x=3.0, kmh=20)]),
    'ce12-4': dict(env='ville', kmh=15, camera='drone', carrefour={'S': 22}, acteurs=[dict(type='velo', S=-2, x=3.2, kmh=22)]),
    # poids lourds et 2RM
    'pl213-2': dict(env='ville', kmh=25, acteurs=[dict(type='bus', S=30, x=4.4)]),
    'pl213-3': dict(env='route', kmh=40, acteurs=[dict(type='camion', S=60, x=-1.2, kmh=-40)]),
    'pl213-4': dict(env='route', kmh=0, camera='drone', carrefour={'S': 6}, acteurs=[dict(type='velo', S=60, x=-1.75, kmh=-70)]),
    # véhicules prioritaires
    'vp14-2': dict(env='route', kmh=50, camera='poursuite', acteurs=[dict(type='tracteur', S=26, kmh=25)]),
    'vp14-4': dict(env='ville', kmh=0, camera='arriere', **FEU('rouge', 5)),
    # nuit
    'ne15-2': dict(env='route', meteo='pluie', kmh=60, acteurs=[V(36, kmh=60)]),
    'ne15-3': dict(env='route', meteo='nuit', kmh=60, acteurs=[V(90, -1.75, kmh=-60)], feux={'croisement': True}),
    'ne15-4': dict(env='route', meteo='nuit', kmh=60, acteurs=[V(24, kmh=60)]),
    'ne15-5': dict(env='route', meteo='nuit', kmh=70, feux={'route': True}),
    # intempéries
    'i16-2': dict(env='route', meteo='brouillard', kmh=50, compteur=True),
    'i16-4': dict(env='route', meteo='neige', kmh=40),
    # montagne, tunnels, PN
    'mtp17-2': dict(env='route', kmh=20, camera='drone', acteurs=[V(36, -1.4, kmh=-15)]),
    'mtp17-3': dict(env='route', kmh=50, tunnel=34),
    'mtp17-4': dict(env='route', kmh=50),
    'mtp17-5': dict(env='route', kmh=30, tunnel=10),
    # entretien / aides / éco
    'ac24-3': dict(env='autoroute', meteo='brouillard', kmh=90, acteurs=[V(30, kmh=88)]),
    'e28-4': dict(env='ville', kmh=0, **FEU('rouge', 9)),
    # premiers secours
    'ps25-2': dict(env='route', kmh=0, camera='drone', voie=3.9, feux={'detresse': True}, acteurs=[dict(type='triangle', S=-30, x=1.75)]),
    # infractions
    'i27-2': dict(env='ville', kmh=30, **FEU('rouge', 22)),
    'i27-3': dict(env='route', kmh=105, compteur=True, limite=80, signaux=[['B14:80', 34]]),
    # véhicules propres
    'vp29-2': dict(env='ville', kmh=30, signaux=[['B30', 24]]),
    # changer de direction et de voie
    'cdv30-1': dict(env='ville', kmh=20, camera='poursuite', carrefour={'S': 30, 'forme': 'T-droite'}, feux={'clignotant': 'd'}, acteurs=[dict(type='velo', S=6, x=3.0, kmh=20)]),
    'cdv30-2': dict(env='autoroute', kmh=90, camera='poursuite', feux={'clignotant': 'g'}, acteurs=[V(-2, -1.75, kmh=108)]),
    'cdv30-3': dict(env='autoroute', kmh=100, camera='drone', feux={'clignotant': 'g'}, acteurs=[V(3, -1.75, kmh=100)]),
    'cdv30-4': dict(env='autoroute', kmh=100, camera='haut', voie=0.2, feux={'clignotant': 'g'}, acteurs=[V(42, 1.75, kmh=86)]),
    'cdv30-5': dict(env='ville', kmh=12, carrefour={'S': 24, 'forme': 'T-droite'}, feux={'clignotant': 'd'}, acteurs=[dict(type='velo', S=12, x=3.1, kmh=20)]),
    'cdv30-6': dict(env='ville', kmh=10, carrefour={'S': 20}, feux={'clignotant': 'g'}, acteurs=[V(36, -1.75, kmh=-35)]),
    'cdv30-7': dict(env='route', kmh=50, camera='poursuite', carrefour={'S': 70, 'forme': 'T-droite'}, feux={'clignotant': 'd'}),
    # se positionner sur la chaussée
    'pc31-1': dict(env='autoroute', kmh=110, camera='poursuite', acteurs=[V(46, 1.75, kmh=110), V(-20, -1.75, kmh=125)]),
    'pc31-2': dict(env='ville', kmh=20, camera='haut', voie=-1.75, signaux=[['C12', 4]], carrefour={'S': 52}, marquages=[[24, -1.75, 'gauche'], [24, 1.75, 'tout-droit-droite'], [40, -1.75, 'gauche'], [40, 1.75, 'tout-droit-droite']], acteurs=[V(30, 1.75, kmh=20)]),
    'pc31-3': dict(env='ville', kmh=25, voie=-1.75, ligne='continue', marquages=[[16, 1.75, 'bus'], [42, 1.75, 'bus'], [68, 1.75, 'bus']]),
    'pc31-4': dict(env='autoroute', kmh=80, camera='poursuite', voie=5.0, feux={'clignotant': 'g'}, acteurs=[V(4, 1.75, kmh=115)]),
    'pc31-5': dict(env='autoroute', kmh=110, camera='poursuite', acteurs=[V(40, 1.75, kmh=105)]),
    'pc31-6': dict(env='ville', kmh=25, voie=-1.75, signaux=[['A3b', 30]], marquages=[[20, -1.75, 'rabat-droite'], [38, -1.75, 'rabat-droite']], feux={'clignotant': 'd'}, acteurs=[V(22, 1.75, kmh=25)]),
    'pc31-7': dict(env='route', kmh=50),
    # intersections complexes
    'ic32-1': dict(env='ville', kmh=15, carrefour={'S': 24, 'ligne': 'feu'}, acteurs=[dict(type='feu', S=19.5, x=5.2, etat='vert'), P(25, 0.4, gilet=True, cap=180)]),
    'ic32-2': dict(env='ville', kmh=15, camera='drone', carrefour={'S': 20}, acteurs=[dict(type='feu', S=15.5, x=5.2, etat='clignotant'), V(21.75, 9, vx=-4)]),
    'ic32-3': dict(env='ville', kmh=10, camera='drone', carrefour={'S': 20}, feux={'clignotant': 'g'}, acteurs=[P(15, -7.6, kmh=4), dict(type='velo', S=34, x=-2.6, kmh=-18)]),
    'ic32-4': dict(env='ville', kmh=15, carrefour={'S': 22}, rails=22, acteurs=[dict(type='tram', S=22, x=16, vx=-8)]),
    'ic32-5': dict(env='ville', kmh=15, carrefour={'S': 20, 'ligne': 'feu'}, acteurs=[dict(type='feu', S=15.5, x=5.2, etat='vert'), V(27.5, freine=True), V(33)]),
    'ic32-6': dict(env='ville', kmh=20, carrefour={'S': 28, 'forme': 'T-droite'}, acteurs=[dict(type='camion', S=18, x=4.5)]),
    'ic32-7': dict(env='ville', kmh=10, camera='haut', carrefour={'S': 20}, feux={'clignotant': 'g'}, acteurs=[V(26.5, -1.75)]),
    # anticiper les dangers
    'ad33-1': dict(env='ville', kmh=30, acteurs=[dict(type='ballon', S=24, x=2.6, vx=-2.0), dict(type='camion', S=30, x=4.5)]),
    'ad33-2': dict(env='ville', kmh=30, acteurs=[dict(type='camion', S=26, x=4.5)]),
    'ad33-3': dict(env='route', kmh=70, acteurs=[V(30, kmh=70), dict(type='tracteur', S=150, x=1.75, kmh=25)]),
    'ad33-4': dict(env='route', meteo='pluie', kmh=80, compteur=True, acteurs=[V(32, kmh=80)]),
    'ad33-5': dict(env='autoroute', kmh=110, camera='drone', acteurs=[V(12, -1.75, kmh=110)]),
    'ad33-6': dict(env='ville', kmh=30, signaux=[['A13a', 14]], acteurs=[dict(type='enfant', S=24, x=6.4, kmh=3), dict(type='enfant', S=30, x=6.8, cap=90)]),
    'ad33-7': dict(env='ville', kmh=30, passage=40, acteurs=[V(22, freine=True), P(40, 4.6, vx=-1.2)]),
    # contrôles du véhicule
    'cv34-3': dict(env='route', kmh=70),
    'cv34-4': dict(env='route', meteo='pluie', kmh=60, acteurs=[V(90, -1.75, kmh=-60)]),
    'cv34-6': dict(env='route', kmh=0, meteo='nuit', camera='arriere', voie=3.9, feux={'croisement': True, 'clignotant': 'd'}),
}
# leçons sans image évidente : on varie les décors d'une situation à l'autre
VAR = {
    'alcool': [DECOR['alcool'], dict(env='route', meteo='couchant', kmh=70, acteurs=[V(120, -1.75, kmh=-70)]), dict(env='ville', meteo='couchant', kmh=25, passage=30, acteurs=[P(30, 6.2, cap=90)])],
    'drogues-medicaments': [DECOR['drogues-medicaments'], dict(env='route', kmh=70, acteurs=[V(110, -1.75, kmh=-70)]), dict(env='ville', meteo='couchant', kmh=25, acteurs=[dict(type='velo', S=14, x=3.0, kmh=18)])],
    'fatigue-distractions': [DECOR['fatigue-distractions'], dict(env='route', meteo='couchant', kmh=80, compteur=True), dict(env='autoroute', kmh=110, acteurs=[V(45, kmh=105)])],
    'permis-points': [DECOR['permis-points'], dict(env='ville', kmh=30, compteur=True), dict(env='autoroute', kmh=110, compteur=True)],
    'poste-conduite': [DECOR['poste-conduite'], dict(env='ville', kmh=25, camera='poursuite')],
    'securite-passagers': [DECOR['securite-passagers'], dict(env='ville', kmh=30, camera='poursuite'), dict(env='autoroute', kmh=110, camera='poursuite')],
    'entretien': [DECOR['entretien'], dict(env='route', meteo='pluie', kmh=70), dict(env='autoroute', kmh=110, camera='poursuite')],
    'aides-conduite': [DECOR['aides-conduite'], dict(env='route', kmh=70, acteurs=[V(30, kmh=68)]), dict(env='autoroute', meteo='pluie', kmh=100, acteurs=[V(40, kmh=98)])],
    'papiers-assurance': [DECOR['papiers-assurance'], dict(env='ville', kmh=0, camera='poursuite', voie=4.6)],
    'infractions': [DECOR['infractions'], dict(env='route', kmh=90, compteur=True), dict(env='ville', kmh=20, **FEU('rouge', 20))],
    'ecoconduite': [DECOR['ecoconduite'], dict(env='ville', kmh=0, **FEU('rouge', 9)), dict(env='autoroute', kmh=110, compteur=True)],
    'vehicules-propres': [DECOR['vehicules-propres'], dict(env='ville', kmh=30, camera='poursuite'), dict(env='autoroute', kmh=110, camera='poursuite')],
    'controles-vehicule': [DECOR['controles-vehicule'], dict(env='route', kmh=70), dict(env='route', meteo='nuit', kmh=0, camera='arriere', voie=3.9, feux={'croisement': True})],
    'demarches-conducteur': [DECOR['demarches-conducteur'], dict(env='route', kmh=70, camera='poursuite'), dict(env='ville', kmh=30), dict(env='autoroute', kmh=110, camera='poursuite')],
    'premiers-secours': [DECOR['premiers-secours'], dict(env='autoroute', kmh=0, camera='poursuite', voie=5.0, feux={'detresse': True}, acteurs=[V(-40, kmh=110)])],
}
# mots de la question qui changent l'ambiance
def ambiance(s, text):
    t = text.lower()
    if 'nuit' in t and 'meteo' not in s: s['meteo'] = 'nuit'
    if ('pluie' in t or 'pleut' in t) and 'meteo' not in s: s['meteo'] = 'pluie'
    if 'brouillard' in t and 'meteo' not in s: s['meteo'] = 'brouillard'
    if ('neige' in t or 'verglas' in t or 'enneig' in t) and 'meteo' not in s: s['meteo'] = 'neige'
    return s

def staged(cid, base, q, k):
    s = copy.deepcopy(base)
    if q.get('_ov') is not None: s = copy.deepcopy(q['_ov'])
    pn = q.get('panneaux') or []
    if pn and not s.get('signaux'):
        env = s.get('env', 'ville')
        sx = 5.9 if env == 'ville' else 7.2 if env == 'autoroute' else 4.4
        if len(pn) == 1: s['signaux'] = [[pn[0], 24]]
        elif len(pn) == 2: s['signaux'] = [[pn[0], 23, sx - 0.8], [pn[1], 23, sx + 0.8]]
        else: s['signaux'] = [[p, 22, sx - 1.5 + 1.5 * i] for i, p in enumerate(pn[:3])]; s['cle'] = 1
        if s.get('camera') in ('drone', 'haut', 'poursuite', 'arriere'): s['camera'] = 'vue'
        # pas d'usager devant le panneau qu'on doit lire
        s['acteurs'] = [a for a in s.get('acteurs', []) if a['type'] == 'feu' and 'carrefour' in s]
        if not s['acteurs']: s.pop('acteurs'); s.pop('carrefour', None)
        s.pop('passage', None)
    ambiance(s, q['q'] + ' ' + ' '.join(q.get('choix', [])))
    s['graine'] = 11 + k * 7
    return s

def phrase(q, choix, bonnes, exp):
    """explication courte : on la complète par la réponse, en phrase entière"""
    if len(exp) >= 45: return exp
    rep = ' et '.join(choix[k] for k in bonnes)
    qq = q.strip()
    if qq.endswith(':') or qq.endswith('…'):
        s = qq.rstrip(':… ').strip() + ' ' + rep[0].lower() + rep[1:] + '.'
    elif rep in ('Oui', 'Non', 'Vrai', 'Faux'): s = rep + '.'
    else: s = 'La bonne réponse : ' + rep + '.'
    e = exp.strip()
    if e.rstrip('.').lower() in s.lower() or not e: return s
    return s + ' ' + e
def from_bank(q):
    return dict(q=q['q'], choix=q['choix'], bonnes=q['bonnes'], explication=phrase(q['q'], q['choix'], q['bonnes'], q['explication']), qid=q['id'], panneaux=q.get('panneaux'))
def from_quiz(s):
    if s['type'] == 'quiz':
        exp = s['mal'] if len(s.get('mal', '')) >= len(s.get('bien', '')) else s['bien']
        return dict(q=s['question'], choix=s['choix'], bonnes=[s['bonne']], explication=exp)
    n = len(s['panneaux'])
    ch = ['Celui de gauche', 'Celui du milieu', 'Celui de droite'] if n == 3 else ['Celui de gauche', 'Celui de droite']
    return dict(q=s['question'], choix=ch, bonnes=[s['bonne']], explication=s['mal'], panneaux=s['panneaux'])

PRATIQUES = []
for cid in ORDER:
    f, c = COURS[cid]
    base = DECOR.get(cid, dict(env='route', kmh=50))
    variants = VAR.get(cid, [base])
    items = []
    for s in BY.get(cid, []): items.append(('exam', s))
    for s in QUIZ.get(cid, []): items.append(('quiz', s))
    for q in [q for q in QS if q['cours'] == cid and q['type'] == 'qcm']: items.append(('bank', q))
    seen, sits = set(), []
    for kind, it in items:
        if kind == 'exam': sit = copy.deepcopy(it)
        else:
            q = from_quiz(it) if kind == 'quiz' else from_bank(it)
            words = set(w for w in re.findall(r'\w+', q['q'].lower()) if len(w) > 2)
            if any(len(words & o) / max(1, len(words | o)) > 0.72 for o in seen): continue
            seen.add(frozenset(words))
            src = dict(q, _ov=QOV.get(q.get('qid'))) if kind == 'bank' else dict(q)
            st = staged(cid, variants[len(sits) % len(variants)], src, len(sits))
            sit = dict(q); sit.pop('panneaux', None); sit.update(st)
        sits.append(sit)
    # 12 situations au plus, les mises en scène d'examen d'abord, puis le reste dans l'ordre de la leçon
    sits = sits[:12]
    # on alterne un peu : pas trois situations d'examen d'affilée en tête
    PRATIQUES.append({
        'id': 'p-' + cid, 'meca': 'examen', 'famille': 'Pratique', 'niveau': 1, 'cours': cid,
        'titre': c['titre'], 'sous': f"{len(sits)} situations en 3D",
        'duree': f"{max(3, round(len(sits) * 0.6))} min",
        'consigne': 'Chaque situation se joue quelques secondes, puis l’image se fige : réponds comme le jour de l’examen.',
        'astuce': f"Tout ce que tu as vu dans le cours « {c['titre']} », tu le retrouves ici, sur la route.",
        'env': sits[0].get('env', base.get('env', 'route')), 'situations': sits})

others = [e for e in EXOS if not (e['meca'] == 'examen')]
for e in others:
    e['famille'] = 'Défi 3D'
W(f'{ROOT}/exercices.json', PRATIQUES + others)
print('pratiques', len(PRATIQUES), 'situations', sum(len(p['situations']) for p in PRATIQUES), 'défis', len(others))
for p in PRATIQUES: print(p['id'], len(p['situations']))
