"""Que l'image parle de la même chose que la voix.
1. Corrige les textes où la liste à l'écran et la voix ne disaient pas la même chose.
2. Donne un décor 3D (champ « decor ») aux titres, listes, chiffres et fins : avant, ils défilaient tous sur
   la même route de campagne, même quand la voix parlait d'un giratoire, d'un feu rouge ou d'une panne.
   Le décor est une mise en scène du simulateur (comme une mise en situation), filmée en plan large
   (caméra « plan ») pour que le sujet reste visible sous la carte de texte. Certains gestes tombent sur
   la phrase qui en parle (temps « p2 » : au début de la 3e phrase).
3. Cale sur la voix quelques gestes des mises en situation.
Lance après integrer35.py, puis synchro.py --ecrire :
  cd gen && python3 integrer35.py && python3 mise-en-scene.py && python3 synchro.py --ecrire"""
import json, glob, os

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, '..', 'content')
J = lambda p: json.load(open(p, encoding='utf-8'))
def W(p, d): open(p, 'w', encoding='utf-8').write(json.dumps(d, ensure_ascii=False, indent=1) + '\n')
FILES = {J(f)['id']: f for f in glob.glob(f'{ROOT}/cours/*.json')}
COURS = {k: J(f) for k, f in FILES.items()}

# ---------------- petits constructeurs ----------------
def V(S, x=1.75, kmh=None, **k): return dict(type='voiture', S=S, x=x, **({'kmh': kmh} if kmh is not None else {}), **k)
def P(S, x, kmh=None, **k): return dict(type='pieton', S=S, x=x, **({'kmh': kmh} if kmh is not None else {}), **k)
def A(t, S, x=None, kmh=None, **k):
    d = dict(type=t, S=S)
    if x is not None: d['x'] = x
    if kmh is not None: d['kmh'] = kmh
    d.update(k); return d
def D(env='route', kmh=40, camera='plan', **k):
    d = dict(env=env, kmh=kmh, camera=camera); d.update(k); return d
GRIS, ROUGE, BLEU, VERT, NOIR = 0x9AA3AF, 0xE84A4A, 0x3A6DF0, 0x2FA37A, 0x2E3440

# ---------------- décors réutilisables ----------------
def campagne(kmh=60, **k):
    return D('route', kmh, ligne='discontinue', acteurs=[V(90, kmh=kmh, couleur=GRIS), V(260, -1.75, kmh=-kmh, couleur=BLEU)], **k)
def ville(kmh=30, **k):
    ac = k.pop('acteurs', None) or [V(160, -1.75, kmh=-30, couleur=ROUGE), P(38, 6.6, kmh=3.5), P(62, -6.5, kmh=-3.2, haut=0xFF7A1A), P(85, 6.4, kmh=-3, haut=0x2FA37A)]
    return D('ville', kmh, acteurs=ac, **k)
def gare(**k):
    """ta voiture garée le long du trottoir, filmée de l'extérieur"""
    ac = k.pop('acteurs', None) or [P(9, 6.5, kmh=3.2), P(26, -6.4, kmh=-3, haut=0xFF7A1A), V(150, -1.75, kmh=-25, couleur=BLEU)]
    return D('ville', 0, camera='garee', voie=4.6, acteurs=ac, **k)
def autoroute(kmh=110, **k):
    ac = k.pop('acteurs', None) or [V(70, kmh=kmh, couleur=GRIS), V(-30, -1.75, kmh=kmh + 15, couleur=ROUGE), A('camion', 150, 1.75, kmh=kmh)]
    return D('autoroute', kmh, acteurs=ac, **k)
def nuit(kmh=60, **k):
    return D('route', kmh, meteo='nuit', feux={'croisement': True}, acteurs=k.pop('acteurs', None) or [V(220, -1.75, kmh=-60, couleur=GRIS)], **k)
def carrefour_trafic(**k):
    """tu arrives à une intersection : des voitures passent de droite et de gauche"""
    return D('ville', 25, camera='proche', carrefour={'S': 46}, acteurs=[V(47.75, 30, vx=-7, couleur=ROUGE), V(44.25, -40, vx=8, couleur=BLEU), A('velo', 47.75, 62, vx=-4.5),
             V(47.75, 95, vx=-7.5, couleur=GRIS), V(44.25, -110, vx=8, couleur=VERT), V(47.75, 150, vx=-7, couleur=NOIR)],
             script=[[0.3, 'arret', 39]], **k)
def controle(env='route', meteo='jour', **k):
    """un contrôle routier : un agent en gilet fait signe, la voiture de police est garée"""
    return D(env, 30, camera='proche', meteo=meteo, **({'feux': {'croisement': True}} if meteo == 'nuit' else {}),
             acteurs=[P(35, 4.3, gilet=True, cap=-90), A('ambulance', 44, 4.7, couleur=0x1E3A8A), P(46, 5.6, gilet=True, haut=0x1E3A8A)],
             script=[[0.3, 'arret', 31]], **k)
def accident(kmh=0, **k):
    """un accident devant : feux de détresse, gilet, on alerte"""
    S = 24 if kmh == 0 else 50
    sc = [[0, 'feux', {'detresse': True}]] if kmh == 0 else [[0.3, 'arret', 28], ['p1', 'feux', {'detresse': True}]]
    return D('route', kmh, acteurs=[V(S, 1.2, cap=28, couleur=0x96B4AF), V(S + 7, -0.6, cap=-150, couleur=ROUGE), P(S - 7, 4.4, gilet=True)], script=sc + k.pop('script', []), **k)
def feu_rouge(**k):
    return D('ville', 30, camera='proche', carrefour={'S': 46, 'ligne': 'feu'}, acteurs=[A('feu', 41.5, 5.2, etat='rouge'), V(47.75, 40, vx=-7.5, couleur=ROUGE), V(44.25, -60, vx=8, couleur=BLEU)],
             script=[[0.2, 'arret', 40.5]], **k)

DECOR = {
    # 2 · vitesses
    ('vitesses', 0): D('ville', 0, voie=4.6, signaux=[['EB10', 30], ['B14:50', 75]], acteurs=[V(170, -1.75, kmh=-35, couleur=BLEU)],
                       script=[[1.2, 'clignotant', 'g'], [2.4, 'vitesse', 30, 2], [2.6, 'voie', 1.75, 2600], [5.6, 'clignotant', None]]),
    ('vitesses', 3): D('route', 80, ligne='discontinue', signaux=[['B14:80', 55], ['B14:90', 190], ['B14:80', 420], ['B14:90', 600]],
                       acteurs=[V(230, -1.75, kmh=-80, couleur=GRIS), V(110, kmh=80, couleur=BLEU)]),
    ('vitesses', 4): D('autoroute', 110, meteo='pluie', feux={'croisement': True}, signaux=[['B14:110', 60], ['B14:110', 420]],
                       acteurs=[V(70, kmh=110, couleur=GRIS), V(-10, -1.75, kmh=118, couleur=ROUGE)]),
    ('vitesses', 5): D('autoroute', 50, meteo='brouillard', feux={'croisement': True, 'brouillardAv': True, 'brouillardAr': True},
                       signaux=[['B14:50', 40]], acteurs=[V(38, kmh=50, couleur=ROUGE)]),
    ('vitesses', 6): D('route', 80, ligne='discontinue', signaux=[['B14:80', 60], ['B14:80', 400]], acteurs=[V(240, -1.75, kmh=-80, couleur=GRIS)]),
    ('vitesses', 7): campagne(80, signaux=[['B14:80', 90]]),
    # 3 · priorités
    ('priorites', 0): carrefour_trafic(),
    ('priorites', 6): D('ville', 25, camera='proche', carrefour={'S': 46}, signaux=[['AB1', 14]], acteurs=[V(47.75, 30, vx=-6, couleur=ROUGE)], script=[[0.3, 'arret', 39]]),
    # 4 · distances
    ('distances', 0): D('route', 50, ligne='discontinue', acteurs=[V(105, kmh=0, couleur=ROUGE, freine=True)], script=[[1.6, 'arret', 78]],
                        etiquettes=[[0, 'Obstacle', 'à toi de t’arrêter à temps', 1]]),
    ('distances', 5): D('autoroute', 110, chevrons=True, acteurs=[V(62, kmh=110, couleur=GRIS), V(-40, -1.75, kmh=125, couleur=BLEU)]),
    ('distances', 6): D('autoroute', 90, chevrons=True, acteurs=[V(52, kmh=90, couleur=ROUGE)]),
    # 5 · alcool
    ('alcool', 0): D('ville', 0, meteo='nuit', voie=4.6, feux={'position': True},
                     acteurs=[P(14, 6.3, kmh=3.4, haut=0xFF5A5F), P(18, 6.9, kmh=3.4), P(44, -6.6, kmh=-3), V(180, -1.75, kmh=-30, couleur=GRIS)]),
    ('alcool', 1): controle('ville', 'nuit'),
    ('alcool', 2): controle('ville', 'nuit'),
    ('alcool', 3): nuit(50, acteurs=[P(70, 4.6), V(260, -1.75, kmh=-60, couleur=GRIS)]),
    ('alcool', 4): nuit(50),
    # 6 · carrefours et feux
    ('carrefours-feux', 0): D('ville', 22, carrefour={'S': 62}, acteurs=[A('feu', 57.5, 5.2, etat='vert'), A('velo', 26, 3.0, kmh=15), P(40, 6.6, kmh=3.5), P(50, -6.5, kmh=-3.2, haut=0xFF7A1A), P(62, 5.4, vx=-1.1, haut=0x2FA37A)]),
    ('carrefours-feux', 1): D('ville', 25, camera='proche', carrefour={'S': 46}, acteurs=[A('feu', 41.5, 5.2, etat='rouge'), P(46, 0.6, gilet=True, cap=180), V(44.25, -48, vx=7, couleur=BLEU)],
                              script=[[0.3, 'arret', 39.5]]),
    ('carrefours-feux', 3): feu_rouge(),
    ('carrefours-feux', 4): D('ville', 25, camera='proche', carrefour={'S': 46}, acteurs=[A('feu', 41.5, 5.2, etat='clignotant'), V(47.75, 36, vx=-6, couleur=ROUGE), A('velo', 40.4, 3.3)],
                              script=[[0.3, 'arret', 40], ['p2', 'feu', 0, 'rouge'], ['p2+1', 'acteur', 2, 14]]),
    ('carrefours-feux', 6): D('route', 30, giratoire=64, signaux=[['AB25', 22], ['AB3a', 56]], acteurs=[V(66, 9, vx=-6, couleur=ROUGE)], script=[[0.3, 'arret', 36]]),
    ('carrefours-feux', 7): D('ville', 30, carrefour={'S': 80}, acteurs=[A('feu', 75.5, 5.2, etat='vert'), V(200, -1.75, kmh=-30, couleur=BLEU), P(40, 6.6, kmh=3.4)]),
    # 7 · marquages
    ('marquages', 0): D('route', 50, ligne=[{'de': -200, 'a': 70, 'type': 'discontinue'}, {'de': 70, 'a': 120, 'type': 'annonce'}, {'de': 120, 'a': 900, 'type': 'continue'}],
                        acteurs=[V(260, -1.75, kmh=-50, couleur=GRIS)]),
    ('marquages', 4): D('route', 30, ligne=[{'de': -200, 'a': 40, 'type': 'discontinue'}, {'de': 40, 'a': 90, 'type': 'annonce'}, {'de': 90, 'a': 900, 'type': 'continue'}],
                        marquages=[[50, -1.75, 'rabat-droite'], [66, -1.75, 'rabat-droite'], [82, -1.75, 'rabat-droite']]),
    ('marquages', 5): campagne(50),
    # 8 · dépassement
    ('depassement', 0): D('route', 25, ligne='discontinue', acteurs=[A('tracteur', 24, kmh=25)], etiquettes=[[0, 'Véhicule lent', 'devant toi', 0]]),
    ('depassement', 1): D('route', 25, ligne='discontinue', acteurs=[A('tracteur', 22, kmh=25), V(150, -1.75, kmh=-60, couleur=BLEU)],
                          script=[['p3', 'depasser', 0, {'kmh': 60, 'marge': 8}]]),
    ('depassement', 5): D('route', 55, ligne='discontinue', acteurs=[V(-28, -1.75, kmh=82, couleur=ROUGE)], script=[['p1', 'voie', 2.4, 1800]]),
    ('depassement', 6): D('route', 30, ligne='discontinue', acteurs=[A('tracteur', 26, kmh=28)]),
    # 9 · arrêt et stationnement
    ('arret-stationnement', 0): ville(22, script=[[2.2, 'vitesse', 12, 1.5]]),
    ('arret-stationnement', 1): ville(20, acteurs=[P(33, 6.4), V(170, -1.75, kmh=-30, couleur=BLEU)], script=[[0.6, 'clignotant', 'd'], [1.0, 'voie', 4.0, 2400], [1.2, 'arret', 30], [4.2, 'clignotant', None]]),
    ('arret-stationnement', 3): D('ville', 20, camera='proche', passage=40, acteurs=[V(40, 4.4, kmh=0, couleur=ROUGE), P(37, 6.6, kmh=3)], script=[[0.3, 'arret', 31]]),
    ('arret-stationnement', 4): D('ville', 20, camera='proche', passage=40, acteurs=[V(40, 4.4, kmh=0, couleur=ROUGE), P(42.5, 6.0, vx=-0.5, haut=0xFF7A1A)], script=[[0.3, 'arret', 31]]),
    ('arret-stationnement', 6): ville(25),
    # 10 · autoroute
    ('autoroute', 0): D('autoroute', 70, voie=5.0, acteurs=[A('camion', 36, 1.75, kmh=100), V(-8, -1.75, kmh=120, couleur=ROUGE)],
                        script=[[0.4, 'vitesse', 104, 2.5], [2.2, 'clignotant', 'g'], [3.8, 'voie', 1.75, 2600], [6.8, 'clignotant', None]]),
    ('autoroute', 2): D('autoroute', 110, acteurs=[A('camion', 32, 1.75, kmh=92), V(-60, -1.75, kmh=130, couleur=BLEU)],
                        script=[['p1', 'depasser', 0, {'kmh': 125, 'marge': 10}]]),
    ('autoroute', 4): D('autoroute', 130, signaux=[['B14:130', 70], ['B14:130', 600]], acteurs=[V(30, -1.75, kmh=134, couleur=ROUGE), V(120, kmh=128, couleur=GRIS)]),
    ('autoroute', 5): D('autoroute', 0, camera='garee', voie=5.0, acteurs=[P(0.8, 5.95), V(-50, 1.75, kmh=110, couleur=GRIS), A('camion', -170, 1.75, kmh=88), V(-110, -1.75, kmh=125, couleur=ROUGE)],
                        script=[['p1', 'feux', {'detresse': True}], ['p1+1.5', 'acteur', 0, 0, 1.3], ['p1+3.3', 'acteur', 0, 0, 0]]),
    ('autoroute', 7): D('autoroute', 110, chevrons=True, acteurs=[V(70, kmh=110, couleur=GRIS), V(-30, -1.75, kmh=125, couleur=BLEU)]),
    # 11 · piétons et enfants
    ('usagers-vulnerables', 0): D('ville', 20, camera='proche', passage=46, acteurs=[P(46, 5.6, vx=-1.1, haut=0x2FA37A), P(30, 6.6, kmh=3.5), P(58, -6.5, kmh=-3.4, haut=0xFF7A1A), A('enfant', 66, 6.4, kmh=3)],
                                  script=[[0.3, 'arret', 41]]),
    ('usagers-vulnerables', 2): D('ville', 20, camera='proche', passage=40, acteurs=[P(40, 5.4, vx=-1.15, haut=0xFF5A5F), P(41.5, -6.2, vx=1.0)], script=[[0.2, 'arret', 35]]),
    ('usagers-vulnerables', 5): D('ville', 38, signaux=[['B30', 60]], acteurs=[P(60, 6.6, kmh=3.4), P(95, 0.4, kmh=3.4, haut=0xFF7A1A), P(99, -0.6, kmh=3.2)],
                                  script=[['p1', 'vitesse', 30, 2], ['p2', 'vitesse', 20, 2], ['p3', 'vitesse', 7, 2]]),
    ('usagers-vulnerables', 6): ville(20),
    # 12 · vélos et trottinettes
    ('cyclistes-edpm', 0): D('ville', 25, signaux=[['B22a', 26, 6.2]], acteurs=[A('velo', 20, 3.1, kmh=17), A('trottinette', 40, 3.0, kmh=20), A('velo', 160, -3.0, kmh=-16), P(48, 6.7, kmh=3.4)]),
    ('cyclistes-edpm', 4): D('ville', 22, acteurs=[A('trottinette', 17, 3.1, kmh=20), A('trottinette', 90, -3.0, kmh=-18, haut=0xFF7A1A), P(40, 6.7, kmh=3.4)]),
    ('cyclistes-edpm', 5): D('ville', 25, acteurs=[A('velo', 22, 3.1, kmh=18), A('trottinette', 45, 3.0, kmh=19)]),
    # 13 · poids lourds, bus, motos
    ('poids-lourds-2rm', 0): D('autoroute', 80, acteurs=[A('camion', 24, 1.75, kmh=80), A('bus', 44, -1.75, kmh=84), A('moto', -14, -1.75, kmh=104)]),
    ('poids-lourds-2rm', 2): D('route', 45, ligne='discontinue', acteurs=[A('camion', 22, kmh=45), V(200, -1.75, kmh=-60, couleur=BLEU)]),
    ('poids-lourds-2rm', 4): D('autoroute', 45, acteurs=[V(14, -1.75, kmh=45, couleur=ROUGE), V(40, -1.75, kmh=45, couleur=GRIS), V(32, 1.75, kmh=45, couleur=BLEU), A('moto', -20, 0, kmh=68)]),
    ('poids-lourds-2rm', 5): D('route', 45, ligne='discontinue', acteurs=[A('camion', 36, kmh=45), A('moto', 120, -1.75, kmh=-60)]),
    # 14 · véhicules prioritaires
    ('vehicules-prioritaires', 0): D('ville', 25, acteurs=[A('ambulance', 170, -1.75, kmh=-45)],
                                     script=[['p1', 'clignotant', 'd'], ['p1', 'voie', 2.9, 1700], ['p1', 'vitesse', 8, 3], ['p2+2', 'clignotant', None]]),
    ('vehicules-prioritaires', 2): D('ville', 30, acteurs=[A('ambulance', 175, -1.75, kmh=-50)],
                                     script=[['p1', 'clignotant', 'd'], ['p1', 'voie', 2.9, 1800], ['p1', 'vitesse', 6, 3], ['p2+2', 'clignotant', None]]),
    ('vehicules-prioritaires', 3): D('route', 35, ligne='discontinue', acteurs=[V(30, kmh=18, gyro='orange', couleur=0xFFB020), A('camion', 46, kmh=18, couleur=0xFFB020)],
                                     script=[[0.4, 'vitesse', 18, 2]]),
    ('vehicules-prioritaires', 4): D('ville', 25, acteurs=[A('ambulance', 150, -1.75, kmh=-45)]),
    # 15 · nuit
    ('nuit-eclairage', 0): D('route', 60, meteo='couchant', ligne='discontinue', acteurs=[V(240, -1.75, kmh=-60, couleur=GRIS)], script=[['p1', 'feux', {'croisement': True}]]),
    ('nuit-eclairage', 4): D('route', 40, camera='poursuite', meteo='brouillard', feux={'croisement': True, 'brouillardAv': True}, acteurs=[V(160, -1.75, kmh=-40, couleur=GRIS)],
                             script=[['p1', 'feux', {'brouillardAr': True}], ['p2', 'meteo', 'pluie'], ['p2', 'feux', {'brouillardAr': False, 'brouillardAv': False}]]),
    ('nuit-eclairage', 5): nuit(70, acteurs=[P(62, 4.4), V(300, -1.75, kmh=-60, couleur=GRIS)]),
    ('nuit-eclairage', 7): nuit(60),
    # 16 · météo
    ('intemperies', 0): D('route', 60, ligne='discontinue', acteurs=[V(80, kmh=60, couleur=GRIS)], script=[['p1', 'meteo', 'pluie'], ['p1+0.6', 'feux', {'croisement': True}]]),
    ('intemperies', 2): D('route', 70, meteo='pluie', feux={'croisement': True}, ligne='discontinue', acteurs=[V(230, -1.75, kmh=-60, couleur=GRIS)], script=[['p2', 'vitesse', 45, 1.2]]),
    ('intemperies', 4): D('route', 45, ligne='discontinue', acteurs=[A('velo', 80, 3.4, kmh=20), A('camion', 220, -1.75, kmh=-70)], script=[['p2', 'voie', 0.7, 1800]]),
    ('intemperies', 6): D('route', 40, meteo='neige', feux={'croisement': True}, acteurs=[V(60, kmh=40, couleur=ROUGE)]),
    ('intemperies', 7): D('route', 60, meteo='pluie', feux={'croisement': True}, acteurs=[V(75, kmh=60, couleur=GRIS)]),
    # 17 · tunnels, passages à niveau, montagne
    ('montagne-tunnels-pn', 0): D('route', 40, camera='proche', rails=54, signaux=[['A7', 18]], acteurs=[A('feu', 49, 5.2, etat='rouge')], script=[[0.4, 'arret', 46]]),
    ('montagne-tunnels-pn', 2): D('route', 0, camera='garee', rails=1, acteurs=[P(0.5, 3.1), P(-1.2, 3.3, haut=0xFF5A5F)],
                                  script=[['p0+1.4', 'acteur', 0, 0, 1.6], ['p0+1.6', 'acteur', 1, 0, 1.5], ['p0+5', 'acteur', 0, 0, 0], ['p0+5.2', 'acteur', 1, 0, 0]]),
    ('montagne-tunnels-pn', 3): D('route', 50, tunnel=30, feux={'croisement': True}, acteurs=[V(52, kmh=50, couleur=ROUGE)]),
    ('montagne-tunnels-pn', 5): D('route', 35, ligne='discontinue', acteurs=[A('camion', 26, kmh=35), V(200, -1.75, kmh=-40, couleur=GRIS)]),
    ('montagne-tunnels-pn', 6): D('route', 50, tunnel=90, feux={'croisement': True}),
    # 18 · fatigue et distractions
    ('fatigue-distractions', 0): D('autoroute', 110, meteo='couchant', acteurs=[V(130, kmh=110, couleur=GRIS)]),
    ('fatigue-distractions', 1): D('autoroute', 90, acteurs=[V(80, kmh=90, couleur=ROUGE)]),
    ('fatigue-distractions', 2): D('autoroute', 110, meteo='couchant', acteurs=[V(140, kmh=110, couleur=GRIS)], script=[['p0+2.5', 'voie', 0.9, 2600], ['p0+5.4', 'voie', 1.75, 900]]),
    ('fatigue-distractions', 3): D('route', 50, signaux=[['C1a', 46]], script=[['p0+0.8', 'clignotant', 'd'], ['p0+1', 'vitesse', 18, 1.5]]),
    ('fatigue-distractions', 4): ville(30),
    ('fatigue-distractions', 5): D('autoroute', 110, meteo='couchant', acteurs=[V(130, kmh=110, couleur=GRIS)]),
    # 19 · drogues et médicaments
    ('drogues-medicaments', 0): gare(),
    ('drogues-medicaments', 1): controle(),
    ('drogues-medicaments', 2): controle(),
    ('drogues-medicaments', 3): gare(),
    ('drogues-medicaments', 4): ville(30),
    # 20 · permis à points
    ('permis-points', 0): ville(30),
    ('permis-points', 1): campagne(70),
    ('permis-points', 2): campagne(70),
    ('permis-points', 3): D('route', 80, ligne='discontinue', signaux=[['B14:80', 150]], acteurs=[V(260, -1.75, kmh=-80, couleur=GRIS)]),
    ('permis-points', 4): campagne(70),
    ('permis-points', 5): campagne(70),
    # 21 · s'installer et quitter
    ('poste-conduite', 0): gare(),
    ('poste-conduite', 1): gare(),
    ('poste-conduite', 3): gare(acteurs=[A('velo', -26, 2.6), P(30, 6.5, kmh=3)], script=[['p1', 'acteur', 0, 16]]),
    ('poste-conduite', 4): ville(25),
    # 22 · passagers
    ('securite-passagers', 0): gare(acteurs=[A('enfant', 1.2, 5.9), P(2.6, 6.3, haut=0xFF7A1A), V(150, -1.75, kmh=-25, couleur=BLEU)]),
    ('securite-passagers', 1): campagne(50),
    ('securite-passagers', 2): gare(acteurs=[A('enfant', 1.2, 5.9), P(2.6, 6.3, haut=0xFF7A1A)]),
    ('securite-passagers', 3): campagne(60),
    ('securite-passagers', 4): campagne(50),
    # 23 · entretien
    ('entretien', 0): gare(acteurs=[P(-3.5, 3.4, kmh=1.6), V(150, -1.75, kmh=-25, couleur=BLEU)]),
    ('entretien', 1): gare(),
    ('entretien', 2): gare(),
    ('entretien', 3): campagne(50),
    ('entretien', 4): D('route', 60, meteo='pluie', feux={'croisement': True}, acteurs=[V(50, kmh=60, couleur=ROUGE)],
                       script=[['p0+1', 'freiner', 0, 15, 6], ['p0+1.3', 'vitesse', 12, 7]]),
    ('entretien', 5): gare(),
    # 24 · aides à la conduite
    ('aides-conduite', 0): D('autoroute', 110, acteurs=[V(36, kmh=110, couleur=GRIS)]),
    ('aides-conduite', 1): D('autoroute', 110, acteurs=[V(34, kmh=110, couleur=GRIS)],
                             script=[['p2', 'freiner', 0, 90, 1.5], ['p2+0.6', 'vitesse', 90, 1.5], ['p4', 'voie', 1.0, 2600], ['p4+2.8', 'voie', 1.75, 1100]]),
    ('aides-conduite', 3): D('autoroute', 110, acteurs=[V(38, kmh=110, couleur=GRIS)]),
    ('aides-conduite', 4): D('autoroute', 110, acteurs=[V(38, kmh=110, couleur=GRIS)]),
    # 25 · premiers secours
    ('premiers-secours', 0): accident(35),
    ('premiers-secours', 2): accident(),
    ('premiers-secours', 3): accident(),
    ('premiers-secours', 4): accident(),
    ('premiers-secours', 5): accident(),
    # 26 · papiers et assurance
    ('papiers-assurance', 0): ville(25),
    ('papiers-assurance', 1): controle('ville'),
    ('papiers-assurance', 2): ville(30),
    ('papiers-assurance', 3): ville(25),
    ('papiers-assurance', 4): D('ville', 0, camera='garee', acteurs=[V(6.6, kmh=0, couleur=ROUGE), P(3.4, 3.9, cap=90), P(4.0, 4.6, cap=-90, haut=0xFF7A1A)], script=[[0, 'feux', {'detresse': True}]]),
    ('papiers-assurance', 5): ville(25),
    # 27 · infractions
    ('infractions', 0): D('route', 80, ligne='discontinue', signaux=[['B14:80', 70]], acteurs=[V(240, -1.75, kmh=-80, couleur=GRIS)]),
    ('infractions', 1): ville(30),
    ('infractions', 2): feu_rouge(),
    ('infractions', 3): D('route', 80, ligne='discontinue', signaux=[['B14:80', 55], ['B14:80', 330]], acteurs=[V(240, -1.75, kmh=-80, couleur=GRIS)]),
    ('infractions', 4): campagne(80),
    # 28 · écoconduite
    ('ecoconduite', 0): campagne(70),
    ('ecoconduite', 1): D('route', 60, carrefour={'S': 160, 'ligne': 'feu'}, acteurs=[A('feu', 155.5, 5.2, etat='rouge')],
                          script=[['p0+0.6', 'vitesse', 28, 0.9], ['p3', 'feu', 0, 'vert'], ['p3+0.5', 'vitesse', 45, 1.2]]),
    ('ecoconduite', 2): gare(),
    ('ecoconduite', 3): campagne(70),
    # 29 · électrique, Crit'Air, ZFE
    ('vehicules-propres', 0): ville(30),
    ('vehicules-propres', 1): ville(28),
    ('vehicules-propres', 2): ville(28),
    ('vehicules-propres', 4): ville(40, script=[['p0+0.5', 'vitesse', 18, 1.6], ['p1', 'vitesse', 42, 3.2]]),
    ('vehicules-propres', 5): ville(30),
    # 30 à 35 : ouvertures et fins
    ('changer-direction-voie', 0): D('ville', 30, carrefour={'S': 70}, acteurs=[V(180, -1.75, kmh=-30, couleur=BLEU), P(40, 6.6, kmh=3.4)],
                                     script=[['p1', 'clignotant', 'd'], ['p1+0.4', 'vitesse', 14, 1.5]]),
    ('changer-direction-voie', 7): D('autoroute', 100, acteurs=[V(46, kmh=86, couleur=GRIS)], script=[[1.2, 'clignotant', 'g'], [3.2, 'voie', -1.75, 3000], [6.4, 'clignotant', None]]),
    ('placement-chaussee', 0): D('autoroute', 100, acteurs=[V(60, kmh=100, couleur=GRIS), V(20, -1.75, kmh=112, couleur=ROUGE), A('camion', 140, 1.75, kmh=90)]),
    ('placement-chaussee', 7): D('autoroute', 100, acteurs=[V(70, kmh=100, couleur=GRIS), V(-20, -1.75, kmh=118, couleur=BLEU)]),
    ('intersections-complexes', 0): D('ville', 25, camera='proche', carrefour={'S': 52}, rails=52, acteurs=[A('tram', 52, 70, vx=-8), A('velo', 30, 3.0, kmh=14), V(50.25, -50, vx=6, couleur=ROUGE)],
                                      script=[[0.3, 'arret', 44]]),
    ('intersections-complexes', 7): carrefour_trafic(),
    ('anticiper-dangers', 0): D('ville', 30, acteurs=[A('ballon', 42, 4.0), P(70, 6.6, kmh=3)], script=[['p1', 'vitesse', 12, 2], ['p1', 'acteur', 0, 0, -0.9], ['p1+3', 'acteur', 0, 0, 0]]),
    ('anticiper-dangers', 7): D('ville', 25, passage=60, acteurs=[P(60, 6.4), P(42, 6.6, kmh=3.4)], script=[[1.0, 'vitesse', 15, 1.2]]),
    ('controles-vehicule', 0): gare(),
    ('controles-vehicule', 1): gare(),
    ('controles-vehicule', 4): gare(),
    ('controles-vehicule', 5): gare(),
    ('controles-vehicule', 6): gare(),
    ('controles-vehicule', 7): gare(),
    ('demarches-conducteur', 0): gare(),
    ('demarches-conducteur', 1): controle('ville'),
    ('demarches-conducteur', 2): ville(30),
    ('demarches-conducteur', 3): gare(),
    ('demarches-conducteur', 4): gare(),
    ('demarches-conducteur', 5): gare(),
    ('demarches-conducteur', 6): ville(25),
    ('demarches-conducteur', 7): ville(30),
}

# ---------------- textes où l'écran et la voix ne disaient pas la même chose ----------------
TEXTES = {
    ('alcool', 2): {'dire': 'En permis probatoire, c’est 0,2 gramme par litre de sang, soit 0,1 milligramme par litre d’air expiré. Dans les faits, un seul verre peut suffire à le dépasser.'},
    ('carrefours-feux', 6): {'items': [['Sortie proche', 'Reste sur la voie de droite'], ['Sortie lointaine', 'Voie de gauche, puis rapproche-toi de la droite'], ['Toujours', 'Clignotant à droite avant de sortir']]},
    ('nuit-eclairage', 5): {'dire': 'À 70 kilomètres heure, ta distance d’arrêt est d’environ 49 mètres, alors que tes feux de croisement n’éclairent qu’à 30 mètres. La nuit, adapte ta vitesse à ce que tu vois.'},
    ('aides-conduite', 1): {'items_1': ['Régulateur', 'Il maintient la vitesse choisie']},
    ('papiers-assurance', 2): {'dire': 'Assurer sa voiture est obligatoire, au minimum en responsabilité civile, pour les dommages causés aux autres. Rouler sans assurance est un délit : jusqu’à 3 750 euros d’amende.'},
    ('demarches-conducteur', 2): {'dire': 'Un véhicule terrestre à moteur soumis à l’obligation d’assurance doit au minimum être couvert en responsabilité civile. Cette garantie sert à indemniser les dommages causés aux autres. Sans assurance, le véhicule ne doit pas circuler.'},
    ('demarches-conducteur', 3): {'dire': 'Pour une voiture, le premier contrôle technique a lieu avant ses 4 ans, puis tous les 2 ans. Il vérifie des points de sécurité et d’environnement, mais ne remplace pas l’entretien courant.'},
    ('demarches-conducteur', 4): {'dire': 'Avant un achat, vérifie le véhicule et ses documents. S’il a plus de 4 ans, le vendeur te remet un contrôle technique de moins de 6 mois. Après l’achat, tu as un mois pour l’immatriculer à ton nom.'},
    ('demarches-conducteur', 5): {'dire': 'Lors d’une vente, la déclaration de cession se fait en ligne, dans les 15 jours. Tu remets à l’acheteur le certificat d’immatriculation barré, daté et signé, avec un certificat de situation administrative de moins de 15 jours. Pour la liste à jour, utilise les services officiels.'},
    ('demarches-conducteur', 6): {'dire': 'Un déménagement, un achat, une vente ou un don entraînent une démarche : changer l’adresse de la carte grise, l’immatriculer à ton nom, ou déclarer la cession. Pour les délais et les pièces, consulte les sources officielles : ils peuvent changer.'},
}

# ---------------- mises en situation : le geste tombe sur la phrase qui en parle ----------------
def caler(sc, key):
    if key == ('depassement', 2):        # « Clignotant à gauche, dépassement rapide » : 2e phrase
        sc['script'] = [['p1', 'depasser', 0, {'kmh': 66, 'marge': 7}]]
    if key == ('nuit-eclairage', 6):     # « Hors agglomération, un gilet réfléchissant… » : l'étiquette « Avec gilet » arrive avec la phrase
        sc['etiquettes'] = [[0, 'Sans gilet', 'vu tard', 0], [1, 'Avec gilet', 'vu de loin', 1]]
    if key == ('nuit-eclairage', 3):     # « repasse en feux de croisement » dès que la voiture d'en face apparaît
        sc['script'] = [[0, 'feux', {'route': True, 'croisement': False}], ['p0+1.6', 'feux', {'route': False, 'croisement': True}]]

n_dec = n_txt = 0
for cid, c in COURS.items():
    changed = False
    for i, sc in enumerate(c['scenes']):
        key = (cid, i)
        if key in TEXTES:
            for k, v in TEXTES[key].items():
                if k.startswith('items_'): sc['items'][int(k[6:])] = v
                else: sc[k] = v
            n_txt += 1; changed = True
        if key in DECOR:
            assert sc['type'] in ('titre', 'liste', 'chiffres', 'fin'), (key, sc['type'])
            sc['decor'] = DECOR[key]; n_dec += 1; changed = True
        elif 'decor' in sc:
            del sc['decor']; changed = True
        if sc['type'] == 'situation':
            before = json.dumps(sc); caler(sc, key); changed = changed or json.dumps(sc) != before
    if changed: W(FILES[cid], c)
missing = [(cid, i, s['type']) for cid, c in COURS.items() if c['ordre'] > 1 for i, s in enumerate(c['scenes']) if s['type'] in ('titre', 'liste', 'chiffres', 'fin') and (cid, i) not in DECOR]
print(f'{n_dec} décors, {n_txt} textes corrigés' + (f' ; sans décor : {missing}' if missing else ''))
