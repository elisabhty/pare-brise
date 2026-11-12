"""Que l'image parle de la même chose que la voix.
1. Corrige les textes où la liste à l'écran et la voix ne disaient pas la même chose.
2. Donne un décor 3D (champ « decor ») aux titres, listes, chiffres et fins : avant, ils défilaient tous sur
   la même route de campagne, même quand la voix parlait d'un giratoire, d'un feu rouge ou d'une panne.
   Le décor est une mise en scène du simulateur (comme une mise en situation), filmée en plan large
   (caméra « plan ») pour que le sujet reste visible sous la carte de texte. Certains gestes tombent sur
   la phrase qui en parle (temps « p2 » : au début de la 3e phrase).
3. Illustre ce que dit la voix : des aides dessinées dans la 3D (« aides » : angles morts, distances de réaction
   et de freinage, faisceau des phares, trajectoires, capteurs, cibles…) qui apparaissent avec la phrase (« p »)
   ou l'élément de liste (« item ») qui en parle ; et, quand la 3D ne sait pas montrer (une vignette Crit'Air,
   les voyants, les papiers, le permis à points…), une illustration posée sous la carte (« illu »).
4. Cale sur la voix quelques gestes des mises en situation, et les annote (« aides »).
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

# ---------------- aides visuelles (dessinées dans la 3D) et illustrations (posées sous la carte) ----------------
def aide(t, **k): d = dict(type=t); d.update(k); return d
def zone(**k): return aide('zone', **k)
def cible(**k): return aide('cible', **k)
def repere(**k): return aide('repere', **k)
def fleche(points, **k): return aide('fleche', points=points, **k)
def illu(t, **k): d = dict(type=t); d.update(k); return d
# angles morts autour d'un poids lourd (accrochés à lui)
def angles_camion(i, **k): return [zone(acteur=i, dz=7, long=3, large=2.6, couleur='rouge', **k), zone(acteur=i, dx=-2.45, dz=1, long=6, large=2.3, couleur='rouge', **k),
                                   zone(acteur=i, dx=2.6, dz=-1, long=10, large=2.6, couleur='rouge', **k), zone(acteur=i, dz=-8, long=5, large=2.6, couleur='rouge', **k)]
# notre angle mort, à gauche (voie de gauche) ou à droite (piste, trottoir)
def angle_mort(cote='g', **k): return zone(ego=True, dx=-3.4 if cote == 'g' else 2.05, dz=-2.6, long=5.2, large=2.4 if cote == 'g' else 2.0, couleur='rouge', **k)
# la marge pour dépasser un cycliste (accrochée au vélo)
def marge_velo(i, **k): return zone(acteur=i, dx=-1.15, long=2.2, large=1.5, couleur='orange', **k)
def piste_cyclable(de=-50, a=400, x=3.3): return [zone(S=(de + a) / 2, x=x, long=a - de, large=1.35, couleur='vert', opacite=0.32, contour=False)]
def points(debut=12, pas=(), **k): return illu('points', debut={'points': debut}, pas=list(pas), **k)

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
    ac = [V(S, 1.2, cap=28, couleur=0x96B4AF), V(S + 7, -0.6, cap=-150, couleur=ROUGE), P(S - 7, 4.4, gilet=True)] + k.pop('plus', [])
    return D('route', kmh, acteurs=ac, script=sc + k.pop('script', []), **k)
def feu_rouge(**k):
    return D('ville', 30, camera='proche', carrefour={'S': 46, 'ligne': 'feu'}, acteurs=[A('feu', 41.5, 5.2, etat='rouge'), V(47.75, 40, vx=-7.5, couleur=ROUGE), V(44.25, -60, vx=8, couleur=BLEU)],
             script=[[0.2, 'arret', 40.5]], **k)
def borne_recharge(S=30):
    """une voiture électrique garée, branchée à sa borne"""
    return [V(S + 1, 4.6, kmh=0, couleur=0xF4F6FA)], lambda i: aide('borne', S=S, x=6.0, vers=i)

# giratoire au S 64 (centre à S 78) : trajectoires « sortie proche » et « sortie lointaine »
GIR_PROCHE = [[37, 1.75], [57, 1.75], [64.5, 3.0], [68.5, 7.8], [74.5, 11.4], [78, 12.4], [77, 20], [76.5, 30]]
GIR_LOIN = [[37, 1.5], [57, 1.3], [63.5, 2.6], [67.5, 6.2], [73, 8.9], [78, 9.4], [83.5, 8.4], [87.4, 4.5], [88.6, 0], [87.2, -5.2], [83, -9.8], [78.5, -12.2], [77.5, -20], [77, -30]]

DECOR = {
    # 2 · vitesses
    ('vitesses', 0): D('ville', 0, voie=4.6, signaux=[['EB10', 30], ['B14:50', 75]], acteurs=[V(170, -1.75, kmh=-35, couleur=BLEU)],
                       script=[[1.2, 'clignotant', 'g'], [2.4, 'vitesse', 30, 2], [2.6, 'voie', 1.75, 2600], [5.6, 'clignotant', None]],
                       aides=[fleche([[1.5, 4.6], [9, 4.3], [20, 1.9], [34, 1.75]]), cible(S=75, x=6.2, rayon=1.1, p=1, texte=['50', 'en ville'], hauteur=3.4)]),
    ('vitesses', 3): D('route', 80, ligne='discontinue', signaux=[['B14:80', 55], ['B14:90', 190], ['B14:80', 420], ['B14:90', 600]],
                       acteurs=[V(230, -1.75, kmh=-80, couleur=GRIS), V(110, kmh=80, couleur=BLEU)],
                       aides=[cible(S=55, x=4.4, rayon=1.1, item=0, texte=['80', 'par défaut'], hauteur=3.4), cible(S=190, x=4.4, rayon=1.1, item=1, texte=['90', 'seulement si un panneau le dit'], hauteur=3.4)]),
    ('vitesses', 4): D('autoroute', 110, meteo='pluie', feux={'croisement': True}, signaux=[['B14:110', 60], ['B14:110', 420]],
                       acteurs=[V(70, kmh=110, couleur=GRIS), V(-10, -1.75, kmh=118, couleur=ROUGE)],
                       aides=[cible(S=60, x=7.4, rayon=1.1, item=0, texte=['Pluie', '110 au lieu de 130'], hauteur=3.4)]),
    ('vitesses', 5): D('autoroute', 50, meteo='brouillard', feux={'croisement': True, 'brouillardAv': True, 'brouillardAr': True},
                       signaux=[['B14:50', 40]], acteurs=[V(38, kmh=50, couleur=ROUGE)],
                       aides=[aide('mesure', long=50, texte=['50 m', 'de visibilité'], item=0)]),
    ('vitesses', 6): D('route', 80, camera='derriere', ligne='discontinue', ego={'disqueA': True}, signaux=[['B14:90', 70], ['B14:90', 400]], acteurs=[V(240, -1.75, kmh=-80, couleur=GRIS)],
                       aides=[repere(ego=True, dz=-2.3, dx=-0.5, hauteur=1.25, texte=['Disque « A »', 'jeune conducteur'], p=0), cible(S=70, x=4.4, rayon=1.1, item=2, texte=['Panneau 90', 'pour toi : 80'], hauteur=3.4)]),
    ('vitesses', 7): campagne(80, signaux=[['B14:80', 90]]),
    # 3 · priorités
    ('priorites', 0): carrefour_trafic(aides=[cible(S=46, x=0, rayon=1.6, p=3, texte=['Qui passe ?', 'en premier'], hauteur=1.2)]),
    ('priorites', 6): D('ville', 25, camera='proche', carrefour={'S': 46}, signaux=[['AB1', 14]], acteurs=[V(47.75, 30, vx=-6, couleur=ROUGE)], script=[[0.3, 'arret', 39]],
                        aides=[cible(acteur=0, rayon=1.4, p=1, texte=['À ta droite', 'il passe'])]),
    # 4 · distances
    ('distances', 0): D('route', 50, ligne='discontinue', acteurs=[V(105, kmh=0, couleur=ROUGE, freine=True)], script=[[1.6, 'arret', 78]],
                        etiquettes=[[0, 'Obstacle', 'à toi de t’arrêter à temps', 1]],
                        aides=[aide('bandes', reac=15, frein=10, p=1, textes=[['15 m', 'de réaction'], ['10 m', 'de freinage']])]),
    ('distances', 5): D('autoroute', 110, chevrons=True, acteurs=[V(63, kmh=110, couleur=GRIS), V(-40, -1.75, kmh=125, couleur=BLEU)],
                        aides=[zone(ego=True, dz=32.5, long=59, large=2.4, couleur='vert', item=0, texte=['2 secondes', '≈ 60 m à 110'], etiquette=0)]),
    ('distances', 6): D('autoroute', 90, chevrons=True, acteurs=[V(52, kmh=90, couleur=ROUGE)],
                        aides=[zone(ego=True, dz=27, long=48, large=2.4, couleur='vert', p=1, texte=['2 secondes', 'au moins'], etiquette=0)]),
    # 5 · alcool
    ('alcool', 0): D('ville', 0, meteo='nuit', voie=4.6, feux={'position': True},
                     acteurs=[P(14, 6.3, kmh=3.4, haut=0xFF5A5F), P(18, 6.9, kmh=3.4), P(44, -6.6, kmh=-3), V(180, -1.75, kmh=-30, couleur=GRIS)]),
    ('alcool', 1): controle('ville', 'nuit', illu=illu('ethylotest', sang='0,5', air='0,25', suit=True)),
    ('alcool', 2): controle('ville', 'nuit', illu=illu('ethylotest', sang='0,2', air='0,1', verre=True, etapes=[0.3, 0.62, 1.2])),
    ('alcool', 3): nuit(50, acteurs=[V(260, -1.75, kmh=-60, couleur=GRIS)],
                        aides=[aide('bandes', reac=25, frein=14, item=0, textes=[['25 m', 'de réaction, au lieu de 14'], ['', '']]),
                               aide('champ', angle=110, etroit=46, portee=30, p=0, animItem=1)]),
    ('alcool', 4): nuit(50, aides=[aide('faisceau', portee=30, p=0)]),
    # 6 · carrefours et feux
    ('carrefours-feux', 0): D('ville', 22, carrefour={'S': 62}, acteurs=[A('feu', 57.5, 5.2, etat='vert'), A('velo', 26, 3.0, kmh=15), P(40, 6.6, kmh=3.5), P(50, -6.5, kmh=-3.2, haut=0xFF7A1A), P(62, 5.4, vx=-1.1, haut=0x2FA37A)]),
    ('carrefours-feux', 1): D('ville', 25, camera='proche', carrefour={'S': 46}, signaux=[['AB3a', 41.2, 7.0]],
                              acteurs=[A('feu', 41.5, 5.2, etat='rouge'), P(46, 0.6, gilet=True, cap=180), V(44.25, -48, vx=7, couleur=BLEU), V(47.75, 16, kmh=0, cap=90, couleur=GRIS)],
                              script=[[0.3, 'arret', 39.5]],
                              aides=[cible(acteur=1, rayon=1.0, item=0), cible(acteur=0, rayon=0.8, item=1), cible(S=41.2, x=7.0, rayon=0.9, item=2), cible(acteur=3, rayon=1.6, item=3)]),
    ('carrefours-feux', 3): feu_rouge(aides=[zone(S=41.9, x=1.75, long=0.7, large=3.4, couleur='rouge', opacite=0.9, contour=False, item=0)],
                                      illu=points(12, [{'points': 12}, {'points': 8, 'perdus': 4, 'texte': '−4 points'}, {'amende': '135 €'}], suit=True)),
    ('carrefours-feux', 4): D('ville', 25, camera='proche', carrefour={'S': 46}, acteurs=[A('feu', 41.5, 5.2, etat='clignotant'), V(47.75, 36, vx=-6, couleur=ROUGE), A('velo', 40.4, 3.3)],
                              script=[[0.3, 'arret', 40], ['p2', 'feu', 0, 'rouge'], ['p2+1', 'acteur', 2, 14]],
                              aides=[cible(acteur=0, rayon=0.8, item=0), cible(acteur=1, rayon=1.4, item=0), cible(acteur=2, rayon=1.0, item=2)]),
    ('carrefours-feux', 6): D('route', 30, giratoire=64, signaux=[['AB25', 22], ['AB3a', 56]], acteurs=[V(66, 9, vx=-6, couleur=ROUGE)],
                              script=[[0.3, 'arret', 36], ['p2', 'clignotant', 'd']],
                              aides=[fleche(GIR_PROCHE, couleur='vert', item=0, texte=['Sortie proche', 'voie de droite']), fleche(GIR_LOIN, couleur='bleu', item=1, texte=['Sortie lointaine', 'à gauche, puis à droite'])]),
    ('carrefours-feux', 7): D('ville', 30, carrefour={'S': 80}, acteurs=[A('feu', 75.5, 5.2, etat='vert'), V(200, -1.75, kmh=-30, couleur=BLEU), P(40, 6.6, kmh=3.4)]),
    # 7 · marquages
    ('marquages', 0): D('route', 50, ligne=[{'de': -200, 'a': 70, 'type': 'discontinue'}, {'de': 70, 'a': 120, 'type': 'annonce'}, {'de': 120, 'a': 900, 'type': 'continue'}],
                        acteurs=[V(260, -1.75, kmh=-50, couleur=GRIS)],
                        aides=[zone(S=180, x=0, long=120, large=0.6, couleur='rouge', opacite=0.5, contour=False, p=1), repere(S=150, x=0, hauteur=0.6, p=1, texte=['Ligne continue', 'interdit de la franchir'])]),
    ('marquages', 4): D('route', 20, ligne=[{'de': -200, 'a': 30, 'type': 'discontinue'}, {'de': 30, 'a': 60, 'type': 'annonce'}, {'de': 60, 'a': 900, 'type': 'continue'}],
                        marquages=[[20, -1.75, 'rabat-droite'], [32, -1.75, 'rabat-droite'], [44, -1.75, 'rabat-droite'], [56, 3.0, 'zebras'], [60.5, 3.0, 'zebras']],
                        aides=[cible(S=32, x=-1.75, rayon=1.4, item=0), cible(S=58, x=3.0, rayon=1.6, item=1),
                               zone(S=105, x=3.3, long=50, large=0.16, couleur='jaune', opacite=0.95, contour=False), zone(S=155, x=3.3, long=50, large=0.16, couleur='jaune', tirets=[1.5, 1.5]),
                               cible(S=95, x=3.3, rayon=1.2, item=2), cible(S=150, x=3.3, rayon=1.2, item=3)]),
    ('marquages', 5): campagne(50),
    # 8 · dépassement
    ('depassement', 0): D('route', 25, ligne='discontinue', acteurs=[A('tracteur', 24, kmh=25)], etiquettes=[[0, 'Véhicule lent', 'devant toi', 0]]),
    ('depassement', 1): D('route', 25, ligne='discontinue', acteurs=[A('tracteur', 22, kmh=25), V(95, -1.75, kmh=-60, couleur=BLEU)],
                          script=[['p3', 'depasser', 0, {'kmh': 60, 'marge': 8}]],
                          aides=[zone(ego=True, dx=-1.75, dz=16, long=26, large=0.5, couleur='vert', opacite=0.55, contour=False, item=0),
                                 zone(ego=True, dx=-3.5, dz=50, long=70, large=3.0, couleur='vert', opacite=0.16, item=1),
                                 angle_mort('g', item=2),
                                 fleche([[-14, 0], [-7, -0.6], [-1, -3.5], [8, -3.5], [15, -0.4], [20, 0]], acteur=0, couleur='vert', item=3)]),
    ('depassement', 5): D('route', 55, ligne='discontinue', acteurs=[V(-28, -1.75, kmh=82, couleur=ROUGE)], script=[['p1', 'voie', 2.4, 1800]],
                          aides=[cible(acteur=0, rayon=1.5, item=0), zone(ego=True, dz=13, long=14, large=2.3, couleur='vert', item=2, texte=['De la place', 'pour qu’il se rabatte'], etiquette=0)]),
    ('depassement', 6): D('route', 30, ligne='discontinue', acteurs=[A('tracteur', 26, kmh=28)]),
    # 9 · arrêt et stationnement
    ('arret-stationnement', 0): ville(22, script=[[2.2, 'vitesse', 12, 1.5]]),
    ('arret-stationnement', 1): ville(20, acteurs=[P(33, 6.4), V(170, -1.75, kmh=-30, couleur=BLEU), P(28.6, 3.4, cache=True, haut=0xFF7A1A), P(28, 2.8, cache=True, haut=0x5856D6)],
                                      script=[[0.6, 'clignotant', 'd'], [1.0, 'voie', 4.0, 2400], [1.2, 'arret', 30], [4.2, 'clignotant', None],
                                              ['p0+2.5', 'montrer', 2], ['p0+2.7', 'acteur', 2, 0, 1.1], ['p0+4.6', 'acteur', 2, 3.6, 0],
                                              ['p1+0.6', 'montrer', 3], ['p1+0.8', 'acteur', 3, 0, 1.2], ['p1+3', 'acteur', 3, -3.6, 0]],
                                      aides=[repere(ego=True, dz=0, hauteur=1.9, p=0, fin=1, texte=['Arrêt', 'conducteur à bord']), repere(ego=True, dz=0, hauteur=1.9, p=1, texte=['Stationnement', 'tu quittes ta voiture'])]),
    ('arret-stationnement', 3): D('ville', 15, marquages=[[56, 4.6, 'handicape'], [84, 3.3, 'velo']], acteurs=[V(32, 4.4, kmh=0, couleur=ROUGE), V(56, 4.6, kmh=0, couleur=GRIS), P(37, 6.6, kmh=3)],
                                  aides=piste_cyclable(70, 140) + [cible(S=32, x=4.4, rayon=1.6, item=0), cible(S=56, x=4.6, rayon=1.6, item=1), cible(S=84, x=3.3, rayon=1.3, item=2)]),
    ('arret-stationnement', 4): D('ville', 20, camera='proche', passage=40, acteurs=[V(40, 4.4, kmh=0, couleur=ROUGE), P(42.5, 6.0, vx=-0.5, haut=0xFF7A1A)], script=[[0.3, 'arret', 31]],
                                  aides=[cible(acteur=0, rayon=1.7, item=0, texte=['Très gênant', 'sur le passage'])]),
    ('arret-stationnement', 6): ville(25),
    # 10 · autoroute
    ('autoroute', 0): D('autoroute', 70, voie=5.0, acteurs=[A('camion', 36, 1.75, kmh=100), V(-8, -1.75, kmh=120, couleur=ROUGE)],
                        script=[[0.4, 'vitesse', 104, 2.5], [2.2, 'clignotant', 'g'], [3.8, 'voie', 1.75, 2600], [6.8, 'clignotant', None]],
                        aides=[fleche([[3, 5.0], [30, 5.0], [62, 2.0], [80, 1.75]], couleur='vert', p=0)]),
    ('autoroute', 2): D('autoroute', 110, acteurs=[A('camion', 32, 1.75, kmh=92), V(-60, -1.75, kmh=130, couleur=BLEU)],
                        script=[['p1', 'depasser', 0, {'kmh': 125, 'marge': 10}]],
                        aides=[zone(ego=True, dz=10, long=16, large=3.0, couleur='vert', opacite=0.18, item=0, texte=['Ta voie', 'celle de droite'], etiquette=0),
                               fleche([[-16, 0], [-8, -0.6], [-1, -3.5], [14, -3.5], [22, -0.4], [27, 0]], acteur=0, couleur='vert', item=1)]),
    ('autoroute', 4): D('autoroute', 130, signaux=[['B14:130', 70], ['B14:130', 600]], acteurs=[V(30, -1.75, kmh=134, couleur=ROUGE), V(120, kmh=128, couleur=GRIS)]),
    ('autoroute', 5): D('autoroute', 0, camera='garee', voie=5.0, acteurs=[P(0.8, 5.95), V(-50, 1.75, kmh=110, couleur=GRIS), A('camion', -170, 1.75, kmh=88), V(-110, -1.75, kmh=125, couleur=ROUGE)],
                        script=[['p1', 'feux', {'detresse': True}], ['p1+1.5', 'acteur', 0, 0, 1.3], ['p1+3.3', 'acteur', 0, 0, 0]],
                        aides=[zone(S=0, x=5.0, long=7, large=2.6, couleur='vert', item=0), fleche([[0.6, 6.0], [0.2, 7.4], [-2.5, 8.2]], couleur='vert', large=0.5, item=2),
                               aide('sos', S=22, x=7.6), cible(S=22, x=7.6, rayon=0.9, item=3)]),
    ('autoroute', 7): D('autoroute', 110, chevrons=True, acteurs=[V(70, kmh=110, couleur=GRIS), V(-30, -1.75, kmh=125, couleur=BLEU)]),
    # 11 · piétons et enfants
    ('usagers-vulnerables', 0): D('ville', 20, camera='proche', passage=46, acteurs=[P(46, 5.6, vx=-1.1, haut=0x2FA37A), P(30, 6.6, kmh=3.5), P(58, -6.5, kmh=-3.4, haut=0xFF7A1A), A('enfant', 66, 6.4, kmh=3)],
                                  script=[[0.3, 'arret', 41]], aides=[cible(acteur=0, rayon=0.9, p=2)]),
    ('usagers-vulnerables', 2): D('ville', 20, camera='proche', passage=40, acteurs=[P(40, 5.4, vx=-1.15, haut=0xFF5A5F), P(41.5, -6.2, vx=1.0)], script=[[0.2, 'arret', 35]],
                                  illu=points(12, [{'points': 6, 'perdus': 6, 'texte': '−6 points'}, {'amende': '135 €'}], suit=True)),
    ('usagers-vulnerables', 5): D('ville', 38, signaux=[['B30', 60]], acteurs=[P(60, 6.6, kmh=3.4), P(95, 0.4, kmh=3.4, haut=0xFF7A1A), P(99, -0.6, kmh=3.2)],
                                  script=[['p1', 'vitesse', 30, 2], ['p2', 'vitesse', 20, 2], ['p3', 'vitesse', 7, 2]],
                                  aides=[repere(ego=True, dz=14, hauteur=1.2, p=1, fin=2, texte=['Zone 30', '30 km/h']), repere(ego=True, dz=14, hauteur=1.2, p=2, fin=3, texte=['Zone de rencontre', '20 km/h, piétons prioritaires']),
                                         repere(ego=True, dz=14, hauteur=1.2, p=3, texte=['Aire piétonne', 'au pas'])]),
    ('usagers-vulnerables', 6): ville(20),
    # 12 · vélos et trottinettes
    ('cyclistes-edpm', 0): D('ville', 25, signaux=[['B22a', 26, 6.2]], marquages=[[40, 3.3, 'velo'], [90, 3.3, 'velo']],
                             acteurs=[A('velo', 20, 3.2, kmh=17), A('trottinette', 40, 3.2, kmh=20), A('velo', 160, -3.0, kmh=-16), P(48, 6.7, kmh=3.4)],
                             aides=piste_cyclable() + [repere(S=60, x=3.3, hauteur=0.5, p=0, texte=['Piste cyclable', 'elle longe la route'])]),
    ('cyclistes-edpm', 4): D('ville', 22, marquages=[[45, 3.3, 'velo']], acteurs=[A('trottinette', 17, 3.2, kmh=20), A('trottinette', 90, -3.0, kmh=-18, haut=0xFF7A1A), P(40, 6.7, kmh=3.4), A('trottinette', 60, 6.5, kmh=10, haut=0x2FA37A)],
                             aides=piste_cyclable() + [cible(acteur=0, rayon=0.9, item=0), repere(acteur=0, hauteur=2.4, item=1, texte=['25 km/h', 'au maximum']),
                                                     zone(acteur=3, long=2.2, large=1.2, couleur='rouge', item=3, texte=['Trottoir', 'interdit'])]),
    ('cyclistes-edpm', 5): D('ville', 25, acteurs=[A('velo', 22, 3.2, kmh=18), A('trottinette', 45, 3.2, kmh=19)], aides=piste_cyclable() + [angle_mort('d', p=1)]),
    # 13 · poids lourds, bus, motos
    ('poids-lourds-2rm', 0): D('autoroute', 80, acteurs=[A('camion', 24, 1.75, kmh=80), A('bus', 44, -1.75, kmh=84), A('moto', -14, -1.75, kmh=104)],
                               aides=[cible(acteur=0, rayon=2.2, p=0), cible(acteur=1, rayon=2.2, p=0), cible(acteur=2, rayon=1.2, p=0)]),
    ('poids-lourds-2rm', 2): D('route', 45, ligne='discontinue', acteurs=[A('camion', 22, kmh=45), V(200, -1.75, kmh=-60, couleur=BLEU)],
                               aides=[zone(acteur=0, dx=-2.6, dz=0, long=11, large=2.3, couleur='rouge', item=0, texte=['Pas à côté', 'il se déporte'], etiquette=0),
                                      zone(acteur=0, dz=15.5, long=20, large=2.4, couleur='orange', item=1, texte=['Il freine', 'sur plus long'], etiquette=0),
                                      fleche([[-13, 0], [-7, -0.7], [-1, -3.5], [16, -3.5], [26, -0.4], [31, 0]], acteur=0, couleur='vert', item=2)]),
    ('poids-lourds-2rm', 4): D('autoroute', 45, acteurs=[V(14, -1.75, kmh=45, couleur=ROUGE), V(40, -1.75, kmh=45, couleur=GRIS), V(32, 1.75, kmh=45, couleur=BLEU), A('moto', -20, 0, kmh=68)],
                               aides=[angle_mort('g', item=0), cible(acteur=3, rayon=1.1, item=1), zone(ego=True, dx=-1.75, dz=14, long=40, large=1.1, couleur='vert', opacite=0.2, item=2, texte=['Inter-files', 'laisse la place'], etiquette=0)]),
    ('poids-lourds-2rm', 5): D('route', 45, ligne='discontinue', acteurs=[A('camion', 36, kmh=45), A('moto', 120, -1.75, kmh=-60)], aides=angles_camion(0, p=1)),
    # 14 · véhicules prioritaires
    ('vehicules-prioritaires', 0): D('ville', 25, acteurs=[A('ambulance', 170, -1.75, kmh=-45)],
                                     script=[['p1', 'clignotant', 'd'], ['p1', 'voie', 2.9, 1700], ['p1', 'vitesse', 8, 3], ['p2+2', 'clignotant', None]],
                                     aides=[cible(acteur=0, rayon=1.6, p=1)]),
    ('vehicules-prioritaires', 2): D('ville', 30, acteurs=[A('ambulance', 175, -1.75, kmh=-50)],
                                     script=[['p1', 'clignotant', 'd'], ['p1', 'voie', 2.9, 1800], ['p1', 'vitesse', 6, 3], ['p2+2', 'clignotant', None]],
                                     aides=[cible(acteur=0, rayon=1.6, item=0), zone(ego=True, dx=-2.2, dz=22, long=34, large=2.6, couleur='vert', opacite=0.18, item=1, texte=['Passage libre', 'pour l’ambulance'], etiquette=0)]),
    ('vehicules-prioritaires', 3): D('route', 35, ligne='discontinue', acteurs=[V(30, kmh=18, gyro='orange', couleur=0xFFB020), A('camion', 46, kmh=18, couleur=0xFFB020)],
                                     script=[[0.4, 'vitesse', 18, 2]],
                                     aides=[aide('plots', S=44, x=-0.4, n=8, pas=3.5), cible(acteur=0, rayon=1.5, item=0)]),
    ('vehicules-prioritaires', 4): D('ville', 25, acteurs=[A('ambulance', 150, -1.75, kmh=-45)]),
    # 15 · nuit
    ('nuit-eclairage', 0): D('route', 60, meteo='couchant', ligne='discontinue', acteurs=[V(240, -1.75, kmh=-60, couleur=GRIS)],
                             script=[['p1', 'feux', {'croisement': True}]], aides=[aide('faisceau', portee=30, p=3)]),
    ('nuit-eclairage', 4): D('route', 40, camera='derriere', meteo='brouillard', feux={'croisement': True, 'brouillardAv': True}, acteurs=[V(160, -1.75, kmh=-40, couleur=GRIS)],
                             script=[['p1', 'feux', {'brouillardAr': True}], ['p2', 'meteo', 'pluie'], ['p2', 'feux', {'brouillardAr': False, 'brouillardAv': False}]],
                             aides=[repere(ego=True, dz=-2.2, dx=-0.5, hauteur=0.75, p=1, fin=2, texte=['Brouillard arrière', 'allumé']), repere(ego=True, dz=-2.2, dx=-0.5, hauteur=0.75, p=2, texte=['Sous la pluie', 'éteint']), aide('faisceau', portee=18, p=0, opacite=0.4)]),
    ('nuit-eclairage', 5): nuit(70, aides=[aide('faisceau', portee=30, item=0), aide('bandes', reac=19, frein=30, item=1, textes=[['19 m', 'de réaction'], ['30 m', 'de freinage']])]),
    ('nuit-eclairage', 7): nuit(60, aides=[aide('faisceau', portee=30, p=0)]),
    # 16 · météo
    ('intemperies', 0): D('route', 60, ligne='discontinue', acteurs=[V(80, kmh=60, couleur=GRIS)], script=[['p1', 'meteo', 'pluie'], ['p1+0.6', 'feux', {'croisement': True}]]),
    ('intemperies', 2): D('route', 70, meteo='pluie', feux={'croisement': True}, ligne='discontinue', acteurs=[V(230, -1.75, kmh=-60, couleur=GRIS)], script=[['p2', 'vitesse', 45, 1.2]],
                          aides=[aide('eau', ego=True, dz=9, long=12, large=3.0, p=0, texte=['Film d’eau', 'les pneus flottent'])]),
    ('intemperies', 4): D('route', 45, ligne='discontinue', signaux=[['A24', 35]], acteurs=[A('velo', 80, 3.4, kmh=20), A('camion', 220, -1.75, kmh=-70)], script=[['p2', 'voie', 0.7, 1800]],
                          aides=[aide('manche', S=62, x=5.6), cible(S=62, x=5.6, rayon=1.0, item=1), marge_velo(0, item=2)]),
    ('intemperies', 6): D('route', 40, meteo='neige', feux={'croisement': True}, signaux=[['B26', 40]], acteurs=[V(60, kmh=40, couleur=ROUGE)],
                          illu=illu('icones', suit=True, cols=3, items=[{'i': '📅', 't': '1er nov → 31 mars', 's': 'communes concernées', 'e': 0}, {'i': '❄️', 't': 'Pneus hiver', 's': 'ou quatre saisons', 'e': 1}, {'i': '⛓️', 't': 'Ou des chaînes', 's': 'dans le coffre', 'e': 1}])),
    ('intemperies', 7): D('route', 60, meteo='pluie', feux={'croisement': True}, acteurs=[V(75, kmh=60, couleur=GRIS)]),
    # 17 · tunnels, passages à niveau, montagne
    ('montagne-tunnels-pn', 0): D('route', 40, camera='proche', rails=54, signaux=[['A7', 18]], acteurs=[A('tram', 54, 150, couleur=0x8E9AAF)],
                                  script=[[0.4, 'arret', 47], ['p0+1', 'acteur', 0, 0, -17]], aides=[aide('pn', S=54, anim=0)]),
    ('montagne-tunnels-pn', 2): D('route', 0, camera='garee', rails=0, acteurs=[P(0.5, 3.1), P(-1.2, 3.3, haut=0xFF5A5F), A('tram', 0, 160, couleur=0x8E9AAF)],
                                  script=[['p0+1.4', 'acteur', 0, 0, 1.6], ['p0+1.6', 'acteur', 1, 0, 1.5], ['p0+5', 'acteur', 0, -1.2, 0.6], ['p0+5.2', 'acteur', 1, -1.2, 0.5], ['p0+8', 'acteur', 0, 0, 0], ['p0+8.2', 'acteur', 1, 0, 0], ['p0+1', 'acteur', 2, 0, -5]],
                                  aides=[aide('pn', S=0, ecart=3.7, baissees=True), fleche([[0, 3.6], [-3, 6.2], [-8, 8.4]], couleur='vert', large=0.6, item=1), aide('sos', S=-7, x=-5.2), cible(S=-7, x=-5.2, rayon=0.9, item=2)]),
    ('montagne-tunnels-pn', 3): D('route', 50, tunnel=30, feux={'croisement': True}, acteurs=[V(52, kmh=50, couleur=ROUGE)],
                                  aides=[aide('balises', S=60, x=4.6, n=12, pas=50), aide('issue', S=160, x=4.6), aide('issue', S=260, x=4.6), aide('issue', S=360, x=4.6), aide('faisceau', portee=30, item=0, opacite=0.35)]),
    ('montagne-tunnels-pn', 5): D('route', 35, ligne='discontinue', signaux=[['A16', 30]], acteurs=[A('camion', 26, kmh=35), V(200, -1.75, kmh=-40, couleur=GRIS)],
                                  illu=illu('icones', suit=True, cols=3, items=[{'i': '⚙️', 't': 'Rétrograde', 's': 'le frein moteur'}, {'i': '🚫', 't': 'Point mort', 's': 'jamais en descente'}, {'i': '🔥', 't': 'Freins chauds', 's': 'moins efficaces'}])),
    ('montagne-tunnels-pn', 6): D('route', 50, tunnel=90, feux={'croisement': True}),
    # 18 · fatigue et distractions
    ('fatigue-distractions', 0): D('autoroute', 90, meteo='couchant', acteurs=[V(130, kmh=90, couleur=GRIS)], aides=[aide('mesure', long=25, p=3, texte=['25 m', 'en une seconde, à 90'])]),
    ('fatigue-distractions', 1): D('autoroute', 90, acteurs=[V(80, kmh=90, couleur=ROUGE)],
                                   aides=[aide('mesure', long=14, item=0, suit=True, texte=['14 m', 'à 50 km/h'], etapes=[{'long': 14, 'texte': ['14 m', 'à 50 km/h']}, {'long': 25, 'texte': ['25 m', 'à 90 km/h']}, {'long': 36, 'texte': ['36 m', 'à 130 km/h']}])]),
    ('fatigue-distractions', 2): D('autoroute', 110, meteo='couchant', acteurs=[V(140, kmh=110, couleur=GRIS)], script=[['p0+2.5', 'voie', 0.9, 2600], ['p0+5.4', 'voie', 1.75, 900]],
                                   illu=illu('icones', suit=True, cols=3, items=[{'i': '🥱', 't': 'Bâillements', 's': 'paupières lourdes'}, {'i': '🧍', 't': 'Raideurs', 's': 'besoin de bouger'}, {'i': '❔', 't': 'Trous de mémoire', 's': 'les derniers km'}])),
    ('fatigue-distractions', 3): D('route', 45, signaux=[['C1a', 40]], acteurs=[V(52, 5.0, kmh=0, couleur=GRIS), V(60, 5.0, kmh=0, couleur=BLEU), P(56, 7.6, kmh=1.5)],
                                   script=[['p0+0.8', 'clignotant', 'd'], ['p0+1', 'vitesse', 14, 1.5]],
                                   aides=[aide('table', S=48, x=8.2), aide('table', S=64, x=8.4)],
                                   illu=illu('icones', suit=True, cols=3, items=[{'i': '⏱️', 't': 'Toutes les 2 h', 's': 'une pause'}, {'i': '😴', 't': '15 à 20 min', 's': 'de sieste'}, {'i': '☕', 't': 'Café', 's': 'ça ne suffit pas', 'barre': True}])),
    ('fatigue-distractions', 4): D('ville', 30, acteurs=[V(160, -1.75, kmh=-30, couleur=ROUGE), P(38, 6.6, kmh=3.5)],
                                   illu=points(12, [{'amende': '135 €'}, {'points': 9, 'perdus': 3, 'texte': '−3 points', 'amende': '135 €'}], suit=True, icone='📱')),
    ('fatigue-distractions', 5): D('autoroute', 110, meteo='couchant', acteurs=[V(130, kmh=110, couleur=GRIS)]),
    # 19 · drogues et médicaments
    ('drogues-medicaments', 0): gare(illu=illu('pictos', boite=True, p=0)),
    ('drogues-medicaments', 1): controle(aides=[cible(acteur=0, rayon=0.9, item=1)]),
    ('drogues-medicaments', 2): controle(),
    ('drogues-medicaments', 3): gare(illu=illu('pictos', suit=True)),
    ('drogues-medicaments', 4): ville(30),
    # 20 · permis à points
    ('permis-points', 0): ville(30, illu=points(6, [{'points': 6, 'texte': '6 points pour commencer'}], p=2)),
    ('permis-points', 1): D('route', 70, ligne='discontinue', acteurs=[V(90, kmh=70, couleur=GRIS), V(260, -1.75, kmh=-70, couleur=BLEU)],
                            illu=points(6, [{'points': 6, 'texte': 'Permis B dès 17 ans'}, {'points': 6, 'texte': '6 points au départ'}, {'points': 12, 'gagnes': 6, 'texte': '12 points ensuite'}], suit=True)),
    ('permis-points', 2): D('route', 70, ligne='discontinue', acteurs=[V(90, kmh=70, couleur=GRIS), V(260, -1.75, kmh=-70, couleur=BLEU)],
                            illu=illu('frise', suit=True, lignes=[{'titre': 'Accompagnée', 'couleur': '#1E9E4A', 'e': 0, 'noeuds': [['6', 'départ'], ['9', '1 an'], ['12', '2 ans']]},
                                                                  {'titre': 'Classique', 'couleur': '#0A84FF', 'e': 1, 'noeuds': [['6', 'départ'], ['8', '1 an'], ['10', '2 ans'], ['12', '3 ans']]}])),
    ('permis-points', 3): D('route', 80, camera='derriere', ego={'disqueA': True}, ligne='discontinue', signaux=[['B14:80', 150]], acteurs=[V(260, -1.75, kmh=-80, couleur=GRIS)],
                            aides=[repere(ego=True, dz=-2.3, dx=-0.5, hauteur=1.25, item=2, texte=['Disque « A »', 'à l’arrière'])]),
    ('permis-points', 4): D('route', 70, ligne='discontinue', acteurs=[V(90, kmh=70, couleur=GRIS)],
                            illu=illu('bareme', suit=True, items=[{'i': '📅', 't': '6 mois sans infraction', 'b': '+1', 'c': '#1E9E4A'}, {'i': '🗓️', 't': '2 ou 3 ans sans infraction', 'b': '12', 'c': '#1E9E4A'}, {'i': '🎓', 't': 'Stage de sensibilisation', 'b': '+4', 'c': '#1E9E4A'}])),
    ('permis-points', 5): campagne(70),
    # 21 · s'installer et quitter
    ('poste-conduite', 0): gare(illu=illu('siege', p=2)),
    ('poste-conduite', 1): gare(illu=illu('siege', suit=True)),
    ('poste-conduite', 3): gare(acteurs=[A('velo', -26, 2.6), P(30, 6.5, kmh=3)], script=[['p1', 'acteur', 0, 16]],
                                aides=[cible(acteur=0, rayon=1.0, item=3)],
                                illu=illu('icones', suit=True, cols=4, items=[{'i': '🅿️', 't': 'Frein', 's': 'serré'}, {'i': '⚙️', 't': 'Vitesse', 's': 'engagée'}, {'i': '🔑', 't': 'Moteur', 's': 'coupé'}, {'i': '🪞', 't': 'Rétroviseur', 's': 'avant d’ouvrir'}])),
    ('poste-conduite', 4): ville(25),
    # 22 · passagers
    ('securite-passagers', 0): gare(acteurs=[A('enfant', 1.2, 5.9), P(2.6, 6.3, haut=0xFF7A1A), V(150, -1.75, kmh=-25, couleur=BLEU)]),
    ('securite-passagers', 1): campagne(50, illu=points(12, [{'amende': '135 €'}, {'points': 9, 'perdus': 3, 'texte': '−3 points', 'amende': '135 €'}], suit=True)),
    ('securite-passagers', 2): gare(acteurs=[A('enfant', 1.2, 5.9), P(2.6, 6.3, haut=0xFF7A1A)], illu=illu('sieges', suit=True)),
    ('securite-passagers', 3): D('route', 60, camera='derriere', ligne='discontinue', acteurs=[V(90, kmh=60, couleur=GRIS), V(260, -1.75, kmh=-60, couleur=BLEU)],
                                 script=[['p2', 'ego', {'coffre': True}]], aides=[repere(ego=True, dz=0.3, hauteur=2.1, p=2, texte=['Coffre de toit', 'plus de consommation'])]),
    ('securite-passagers', 4): campagne(50),
    # 23 · entretien
    ('entretien', 0): gare(acteurs=[P(-3.5, 3.4, kmh=1.6), V(150, -1.75, kmh=-25, couleur=BLEU)], aides=[cible(ego=True, dx=0.85, dz=1.35, rayon=0.7, p=2)]),
    ('entretien', 1): gare(ego={'pneu': 'degonfle'}, illu=illu('pneu', vues=['usure', 'pression'], suit=True)),
    ('entretien', 2): gare(script=[['p1', 'feux', {'position': True}], ['p1+0.9', 'feux', {'croisement': True}], ['p1+1.8', 'feux', {'detresse': True}], ['p2', 'feux', {'detresse': False, 'croisement': False, 'position': False}]],
                           illu=illu('niveaux', suit=True, items=[['temperature', 'Refroidissement', 0], ['laveglace', 'Lave-glace', 0], ['frein', 'Liquide de frein', 0], ['huile', 'Huile', 0]])),
    ('entretien', 3): D('route', 50, ligne='discontinue', acteurs=[V(90, kmh=50, couleur=GRIS)], illu=illu('voyants', suit=True)),
    ('entretien', 4): D('route', 60, meteo='pluie', feux={'croisement': True}, acteurs=[V(50, kmh=60, couleur=ROUGE)],
                        script=[['p0+1', 'freiner', 0, 15, 6], ['p0+1.3', 'vitesse', 12, 7]], aides=[aide('bandes', reac=17, frein=22, item=0, textes=[['', ''], ['ABS', 'tu peux braquer']])]),
    ('entretien', 5): gare(),
    # 24 · aides à la conduite
    ('aides-conduite', 0): D('autoroute', 110, acteurs=[V(36, kmh=110, couleur=GRIS)], aides=[aide('radar', portee=34, p=0)]),
    ('aides-conduite', 1): D('autoroute', 110, acteurs=[V(34, kmh=110, couleur=GRIS)],
                             script=[['p2', 'freiner', 0, 90, 1.5], ['p2+0.6', 'vitesse', 90, 1.5], ['p3', 'freiner', 0, 50, 5], ['p3+0.3', 'vitesse', 50, 6], ['p3', 'aide', 0, 'act', 'rouge'], ['p4', 'voie', 1.0, 2600], ['p4+2.8', 'voie', 1.75, 1100]],
                             aides=[aide('radar', portee=32, item=2, texte=['Radar', 'il garde la distance']),
                                    zone(ego=True, dx=-1.75, dz=16, long=28, large=0.3, couleur='vert', opacite=0.85, contour=False, item=4),
                                    zone(ego=True, dx=1.75, dz=16, long=28, large=0.3, couleur='vert', opacite=0.85, contour=False, item=4)]),
    ('aides-conduite', 3): D('autoroute', 110, acteurs=[V(38, kmh=110, couleur=GRIS)],
                             illu=illu('icones', suit=True, cols=3, items=[{'i': '🙌', 't': 'Mains', 's': 'sur le volant'}, {'i': '👀', 't': 'Yeux', 's': 'sur la route'}, {'i': '⚖️', 't': 'Responsable', 's': 'c’est toi'}])),
    ('aides-conduite', 4): D('autoroute', 110, acteurs=[V(38, kmh=110, couleur=GRIS)], aides=[aide('radar', portee=32, p=0)]),
    # 25 · premiers secours
    ('premiers-secours', 0): accident(35, plus=[A('triangle', 20, 1.6, cache=True)], script=[['p1+1.5', 'montrer', 3]]),
    ('premiers-secours', 2): accident(illu=illu('telephone', suit=True, numeros=[['112', 'Urgences, partout en Europe'], ['15', 'SAMU'], ['18', 'Pompiers'], ['17', 'Police, gendarmerie'], ['114', 'Par SMS, sourds et malentendants']])),
    ('premiers-secours', 3): accident(illu=illu('telephone', suit=True, bulles=[['Où', 'le lieu exact'], ['Quoi', 'ce qui s’est passé'], ['Combien', 'les victimes, leur état'], ['Dangers', 'fuite, incendie, circulation']])),
    ('premiers-secours', 4): accident(plus=[A('moto', 30, 3.4, couche=True, cap=60)], aides=[aide('victime', S=27, x=5.6, casque=True), cible(S=27, x=5.6, rayon=1.4, item=0), cible(S=30, x=3.4, rayon=1.4, item=1)]),
    ('premiers-secours', 5): accident(),
    # 26 · papiers et assurance
    ('papiers-assurance', 0): ville(25, illu=illu('documents', p=1)),
    ('papiers-assurance', 1): controle('ville', illu=illu('documents', suit=True)),
    ('papiers-assurance', 2): ville(30, illu=illu('documents', liste=['assurance'], rc=True, suit=True)),
    ('papiers-assurance', 3): ville(25, illu=illu('frise', suit=True, lignes=[{'noeuds': [['0', 'achat', 0], ['4 ans', '1er contrôle', 0], ['+2', '', 1], ['+2', '', 1]]}])),
    ('papiers-assurance', 4): D('ville', 0, camera='garee', acteurs=[V(6.6, kmh=0, couleur=ROUGE), P(3.4, 3.9, cap=90), P(4.0, 4.6, cap=-90, haut=0xFF7A1A)], script=[[0, 'feux', {'detresse': True}]],
                                illu=illu('constat', suit=True)),
    ('papiers-assurance', 5): ville(25),
    # 27 · infractions
    ('infractions', 0): D('route', 80, ligne='discontinue', signaux=[['B14:80', 40]], acteurs=[V(240, -1.75, kmh=-80, couleur=GRIS)], aides=[aide('radarfixe', S=62, x=4.9, anim=1)]),
    ('infractions', 1): ville(30),
    ('infractions', 2): feu_rouge(illu=illu('bareme', suit=True, items=[{'i': '📱', 't': 'Ceinture, téléphone en main', 'b': '−3'}, {'i': '🚦', 't': 'Feu rouge, stop', 'b': '−4'}, {'i': '🚶', 't': 'Refus de priorité à un piéton', 'b': '−6'}, {'i': '💨', 't': 'Excès de vitesse de 50 km/h', 'b': '−6'}])),
    ('infractions', 3): D('route', 80, ligne='discontinue', signaux=[['B14:80', 30], ['B14:80', 330]], acteurs=[V(240, -1.75, kmh=-80, couleur=GRIS)], aides=[aide('radarfixe', S=60, x=4.9, anim=0)],
                          illu=illu('compteur', suit=True, e=[0, 1, 2, 3, 3])),
    ('infractions', 4): campagne(80),
    # 28 · écoconduite
    ('ecoconduite', 0): campagne(70),
    ('ecoconduite', 1): D('route', 60, carrefour={'S': 160, 'ligne': 'feu'}, acteurs=[A('feu', 155.5, 5.2, etat='rouge')],
                          script=[['p0+0.6', 'vitesse', 28, 0.9], ['p3', 'feu', 0, 'vert'], ['p3+0.5', 'vitesse', 45, 1.2]], aides=[cible(acteur=0, rayon=1.1, item=0, texte=['Feu rouge au loin', 'lève le pied tôt'])]),
    ('ecoconduite', 2): gare(ego={'coffre': True}, script=[['p1', 'ego', {'coffre': False}]], aides=[cible(ego=True, dx=0.85, dz=-1.4, rayon=0.7, item=0)]),
    ('ecoconduite', 3): campagne(70),
    # 29 · électrique, Crit'Air, ZFE
    ('vehicules-propres', 0): D('ville', 18, acteurs=[V(66, 4.6, kmh=0, couleur=0xF4F6FA), V(160, -1.75, kmh=-30, couleur=ROUGE), P(48, 6.6, kmh=3.4)],
                                aides=[aide('borne', S=65, x=6.0, vers=0), cible(S=65, x=6.0, rayon=0.9, p=0, texte=['Borne de recharge', ''], hauteur=2.2)]),
    ('vehicules-propres', 1): ville(28, illu=illu('critair', suit=True)),
    ('vehicules-propres', 2): ville(28, illu=illu('critair', zfe=True, suit=True)),
    ('vehicules-propres', 4): ville(40, script=[['p0+0.5', 'vitesse', 18, 1.6], ['p1', 'vitesse', 42, 3.2]],
                                illu=illu('icones', suit=True, cols=3, items=[{'i': '🔋', 't': 'Lever le pied', 's': 'recharge la batterie'}, {'i': '⚡', 't': 'Accélération', 's': 'immédiate'}, {'i': '❄️', 't': 'Autonomie', 's': 'baisse au froid'}])),
    ('vehicules-propres', 5): D('ville', 30, acteurs=[V(41, 4.6, kmh=0, couleur=0xF4F6FA), P(30, 6.6, kmh=3.4)], aides=[aide('borne', S=40, x=6.0, vers=0)]),
    # 30 à 35 : ouvertures et fins
    ('changer-direction-voie', 0): D('ville', 30, carrefour={'S': 70}, acteurs=[V(180, -1.75, kmh=-30, couleur=BLEU), P(40, 6.6, kmh=3.4)],
                                     script=[['p1', 'clignotant', 'd'], ['p1+0.4', 'vitesse', 14, 1.5]],
                                     aides=[fleche([[46, 1.75], [62, 1.75], [65.5, 3.0], [67.6, 6.5], [68.25, 12], [68.25, 24]], couleur='vert', p=1)]),
    ('changer-direction-voie', 7): D('autoroute', 100, acteurs=[V(46, kmh=86, couleur=GRIS)], script=[[1.2, 'clignotant', 'g'], [3.2, 'voie', -1.75, 3000], [6.4, 'clignotant', None]],
                                     aides=[angle_mort('g', p=0, fin=1), fleche([[86, 1.75], [104, 1.75], [130, -1.75], [160, -1.75]], couleur='vert', p=0)]),
    ('placement-chaussee', 0): D('autoroute', 100, acteurs=[V(60, kmh=100, couleur=GRIS), V(20, -1.75, kmh=112, couleur=ROUGE), A('camion', 140, 1.75, kmh=90)],
                                 aides=[zone(ego=True, dz=16, long=26, large=3.0, couleur='vert', opacite=0.18, p=2, texte=['À droite', 'la règle générale'], etiquette=0)]),
    ('placement-chaussee', 7): D('autoroute', 100, acteurs=[V(70, kmh=100, couleur=GRIS), V(-20, -1.75, kmh=118, couleur=BLEU)]),
    ('intersections-complexes', 0): D('ville', 25, camera='proche', carrefour={'S': 52}, rails=52, acteurs=[A('tram', 52, 70, vx=-8), A('velo', 30, 3.0, kmh=14), V(50.25, -50, vx=6, couleur=ROUGE)],
                                      script=[[0.3, 'arret', 44]],
                                      aides=[fleche([[52, 34], [52, -30]], couleur='orange', large=0.9, p=1), fleche([[50.25, -26], [50.25, 26]], couleur='bleu', p=1), fleche([[40, 3.2], [70, 3.2]], couleur='vert', p=1)]),
    ('intersections-complexes', 7): carrefour_trafic(),
    ('anticiper-dangers', 0): D('ville', 30, acteurs=[A('ballon', 42, 4.0), P(70, 6.6, kmh=3), A('enfant', 45, 6.8, cache=True)],
                                script=[['p1', 'vitesse', 12, 2], ['p1', 'acteur', 0, 0, -0.9], ['p1+3', 'acteur', 0, 0, 0], ['p2+1.5', 'montrer', 2], ['p2+1.7', 'acteur', 2, 0, -1.3], ['p2+3.1', 'acteur', 2, 0, 0]],
                                aides=[cible(acteur=0, rayon=0.8, p=1)]),
    ('anticiper-dangers', 7): D('ville', 25, passage=60, acteurs=[P(60, 6.4), P(42, 6.6, kmh=3.4)], script=[[1.0, 'vitesse', 15, 1.2]]),
    ('controles-vehicule', 0): gare(acteurs=[P(-3.5, 3.4, kmh=1.6), V(150, -1.75, kmh=-25, couleur=BLEU)], aides=[cible(ego=True, dx=0.85, dz=1.35, rayon=0.7, p=2)]),
    ('controles-vehicule', 1): gare(ego={'pneu': 'degonfle'}, illu=illu('pneu', vues=['usure', 'coupure', 'gonflage', 'pression'], suit=True)),
    ('controles-vehicule', 4): gare(illu=illu('niveaux', suit=True, items=[['temperature', 'Refroidissement', 0], ['laveglace', 'Lave-glace', 1], ['frein', 'Liquide de frein', 2], ['huile', 'Huile', 3]])),
    ('controles-vehicule', 5): gare(illu=illu('voyants', manuel=True, suit=True)),
    ('controles-vehicule', 6): gare(illu=illu('icones', suit=True, cols=3, items=[{'i': '📘', 't': 'Carnet', 's': 'les échéances'}, {'i': '🔧', 't': 'Une anomalie', 's': 'à faire examiner'}, {'i': '♨️', 't': 'Moteur chaud', 's': 'circuit fermé', 'barre': True}])),
    ('controles-vehicule', 7): gare(),
    ('demarches-conducteur', 0): gare(illu=illu('documents', p=1)),
    ('demarches-conducteur', 1): controle('ville', illu=illu('documents', liste=['permis', 'cg'], suit=True)),
    ('demarches-conducteur', 2): ville(30, illu=illu('documents', liste=['assurance'], rc=True, suit=True)),
    ('demarches-conducteur', 3): gare(illu=illu('frise', suit=True, lignes=[{'noeuds': [['0', 'mise en circulation', 0], ['4 ans', '1er contrôle', 0], ['+2', '', 1], ['+2', '', 1]]}])),
    ('demarches-conducteur', 4): gare(acteurs=[V(9, 4.6, kmh=0, couleur=ROUGE), P(26, -6.4, kmh=-3, haut=0xFF7A1A)], aides=[aide('affichette', acteur=0, texte='À VENDRE')],
                                      illu=illu('documents', liste=['ct', 'cg'], e=[1, 2], suit=True)),
    ('demarches-conducteur', 5): gare(illu=illu('documents', liste=['cession', 'cg', 'csa'], barre='cg', barreA=1, suit=True)),
    ('demarches-conducteur', 6): ville(25, illu=illu('icones', suit=True, cols=4, items=[{'i': '🏠', 't': 'Déménagement', 's': 'l’adresse'}, {'i': '🚗', 't': 'Achat', 's': 'à ton nom'}, {'i': '🤝', 't': 'Vente, don', 's': 'la cession'}, {'i': '🌐', 't': 'Sources', 's': 'officielles'}])),
    ('demarches-conducteur', 7): ville(30),
}

# aides des mises en situation : ce que la voix explique se dessine dans la scène
SITU = {
    ('depassement', 4): [marge_velo(0)],
    ('arret-stationnement', 5): [zone(acteur=0, dx=-1.5, dz=0.5, long=1.4, large=1.3, couleur='rouge')],
    ('autoroute', 1): [fleche([[60, 5.0], [95, 5.0], [150, 1.75], [175, 1.75]], couleur='vert', p=0)],
    ('cyclistes-edpm', 1): [marge_velo(0)],
    ('cyclistes-edpm', 2): [angle_mort('d')],
    ('poids-lourds-2rm', 1): angles_camion(0),
    ('poids-lourds-2rm', 3): [fleche([[0, 0], [6, -1.0], [14, -2.65], [24, -2.65]], acteur=0, couleur='vert')],
    ('nuit-eclairage', 1): [aide('faisceau', portee=30, texte=['≈ 30 m', 'feux de croisement'])],
    ('nuit-eclairage', 2): [aide('faisceau', portee=100, texte=['≈ 100 m', 'feux de route'])],
    ('nuit-eclairage', 3): [aide('faisceau', portee=100, manuel=True, texte=['Feux de route', '']), aide('faisceau', portee=30, manuel=True, texte=['Croisement', 'tu n’éblouis pas'])],
    ('intemperies', 1): [aide('bandes', reac=17, frein=30, textes=[['17 m', 'de réaction'], ['≈ 30 m', 'de freinage, sol mouillé']])],
    ('intemperies', 5): [aide('bandes', reac=11, frein=35, textes=[['11 m', 'de réaction'], ['≈ 35 m', 'de freinage, sur neige']])],
    ('poste-conduite', 2): [angle_mort('g')],
    ('aides-conduite', 2): [aide('radar', portee=30, couleur='orange', texte=['Capteurs', 'gênés par la pluie'])],
    ('changer-direction-voie', 2): [angle_mort('g')],
    ('changer-direction-voie', 5): [angle_mort('d')],
    ('changer-direction-voie', 6): [fleche([[40, 1.75], [44.5, 1.6], [46.5, 0], [47.75, -4], [47.75, -16]], couleur='orange'), fleche([[90, -1.75], [30, -1.75]], couleur='vert', p=1)],
    ('placement-chaussee', 4): [fleche([[100, 5.0], [150, 5.0], [200, 1.75], [225, 1.75]], couleur='vert')],
    ('intersections-complexes', 2): [fleche([[29, 1.75], [33, 1.4], [34.5, -1.0], [35.75, -5], [35.75, -18]], couleur='orange'), fleche([[62, -1.75], [20, -1.75]], couleur='vert', p=1)],
    ('anticiper-dangers', 5): [zone(acteur=1, dx=3.5, dz=-2.6, long=5.2, large=2.4, couleur='rouge')],
}
SITU_SCRIPT = {('nuit-eclairage', 3): [[0, 'aide', 0, 'on'], ['p0+1.6', 'aide', 0, 'off'], ['p0+1.6', 'aide', 1, 'on']]}

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

# ---------------- retours des élèves testeurs (gen/retours.py) ----------------
import importlib.util, re as _re
_spec = importlib.util.spec_from_file_location('retours', os.path.join(HERE, 'retours.py')); R = importlib.util.module_from_spec(_spec); _spec.loader.exec_module(R)
def phrases(t): return [x.strip() for x in _re.findall(r"[^.!?…]+[.!?…]+|[^.!?…]+$", t or '') if x.strip()]
def refs(sc):
    """Indices de phrases utilisés par les aides, étiquettes et gestes de la scène."""
    out = []
    for d in (sc, sc.get('decor') or {}):
        for a in d.get('aides') or []:
            out += [a[k] for k in ('p', 'fin') if isinstance(a.get(k), int)]
        for e in d.get('etiquettes') or []:
            if len(e) > 3 and isinstance(e[3], int): out.append(e[3])
        for st in d.get('script') or []:
            if isinstance(st[0], str) and st[0].startswith('p'): out.append(int(_re.match(r'p(\d+)', st[0]).group(1)))
    return out
ALERTES = []
def retoucher(sc, key, champs):
    for f, v in champs.items():
        if f.startswith('items_'):
            sc['items'][int(f[6:])] = v
        elif isinstance(v, list) and v and isinstance(v[0], tuple):
            txt = sc.get(f, '')
            for a, b, *fin in v:                 # rejouable : un remplacement déjà fait (ou déjà dépassé) n'est pas refait
                if (b and b in txt) or any(x in txt for x in fin): continue
                if a == '': txt = (txt.rstrip() + ' ' + b).strip()
                elif a in txt: txt = txt.replace(a, b, 1)
                else: ALERTES.append(f'{key} {f} : « {a[:50]} » introuvable')
            sc[f] = txt
        elif v is None:
            sc.pop(f, None)
        else:
            sc[f] = v
def corriger(d, v):
    for f in (v if isinstance(v, list) else [v]):
        if callable(f): f(d)
        else: d.update(f)
    return d
for k, v in R.DECOR.items():
    if k in DECOR: DECOR[k] = corriger(json.loads(json.dumps(DECOR[k])), v)
for cid, meta in R.COURS.items():
    c = COURS[cid]
    if 'memo_tout' in meta: c['memo'] = json.loads(json.dumps(meta['memo_tout']))
    memo = c.setdefault('memo', [])
    for debut, ligne in meta.get('memo', []):
        idx = [j for j, l in enumerate(memo) if l['texte'].startswith(debut)]
        if not idx:                              # déjà remplacée lors d'un passage précédent : rien à faire
            if ligne and all(l['texte'] != ligne['texte'] for l in memo): memo.append(ligne)
            continue
        if ligne: memo[idx[0]] = ligne
        else: del memo[idx[0]]
    for ligne in meta.get('memo+', []):
        if all(l['texte'] != ligne['texte'] for l in memo): memo.append(ligne)
    for f in ('resume', 'accroche', 'titre', 'chapitres'):
        if f in meta: c[f] = meta[f]

n_dec = n_txt = n_ill = n_sit = 0
for cid, c in COURS.items():
    changed = False
    for i, sc in enumerate(c['scenes']):
        key = (cid, i)
        if key in TEXTES:
            for k, v in TEXTES[key].items():
                if k.startswith('items_'): sc['items'][int(k[6:])] = v
                else: sc[k] = v
            n_txt += 1; changed = True
        if key in R.T:
            avant = len(phrases(sc.get('dire')))
            retoucher(sc, key, R.T[key])
            apres = len(phrases(sc.get('dire')))
            r = [x for x in refs(sc) if x >= min(avant, apres) - 1] if avant != apres else []
            if r and key not in R.DECOR: ALERTES.append(f'{key} : {avant} → {apres} phrases, renvois {sorted(set(refs(sc)))} à vérifier')
            n_txt += 1; changed = True
        before = json.dumps(sc)
        if key in DECOR:
            assert sc['type'] in ('titre', 'liste', 'chiffres', 'fin'), (key, sc['type'])
            d = dict(DECOR[key]); il = d.pop('illu', None)
            sc['decor'] = d; n_dec += 1
            if il: sc['illu'] = il; n_ill += 1
            elif 'illu' in sc: del sc['illu']
        else:
            sc.pop('decor', None); sc.pop('illu', None)
        if sc['type'] == 'situation':
            caler(sc, key)
            if key in SITU: sc['aides'] = SITU[key]; n_sit += 1
            else: sc.pop('aides', None)
            if key in SITU_SCRIPT: sc['script'] = [st for st in sc.get('script', []) if st[1] != 'aide'] + SITU_SCRIPT[key]
            if key in R.DECOR: corriger(sc, R.DECOR[key])
        rem = R.ACTEURS.get(cid)                     # usager remplacé dans toutes les images du cours
        if rem:
            for d in (sc, sc.get('decor') or {}):
                for a in d.get('acteurs') or []:
                    if a.get('type') in rem: a['type'] = rem[a['type']]
        changed = changed or json.dumps(sc) != before
    for i, j, debut in R.COURS.get(cid, {}).get('echange', []):     # deux écrans à remettre dans l'ordre de la voix
        if (c['scenes'][i].get('eyebrow') or '').startswith(debut): c['scenes'][i], c['scenes'][j] = c['scenes'][j], c['scenes'][i]; changed = True
    if changed or cid in R.COURS: W(FILES[cid], c)
missing = [(cid, i, s['type']) for cid, c in COURS.items() if c['ordre'] > 1 for i, s in enumerate(c['scenes']) if s['type'] in ('titre', 'liste', 'chiffres', 'fin') and (cid, i) not in DECOR]
print(f'{n_dec} décors ({n_ill} illustrations), {n_sit} mises en situation annotées, {n_txt} textes corrigés' + (f' ; sans décor : {missing}' if missing else ''))
for a in ALERTES: print('  ⚠', a)
