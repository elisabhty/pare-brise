"""Les 70 exercices immersifs du fichier « cours immersifs » (2 par cours), mis en scène dans le simulateur.
Chaque exercice devient une situation de la pratique du cours : vidéo, arrêt sur image au moment de décider, choix unique,
puis la scène reprend et la voiture fait ce qu'il fallait faire (champ apres) pendant que la correction s'affiche.
Les réponses sont mélangées (dans le fichier, la bonne était presque toujours la première). Utilisé par pratique.py."""
import json, os, random, zlib

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = json.load(open(os.path.join(HERE, 'cours-immersifs-35.json'), encoding='utf-8'))['cours']

V = lambda S, x=1.75, kmh=None, **k: dict(type='voiture', S=S, x=x, **({'kmh': kmh} if kmh is not None else {}), **k)
P = lambda S, x, **k: dict(type='pieton', S=S, x=x, **k)
A = lambda action, **k: dict(action=action, **k)
GARE = dict(env='ville', kmh=0, voie=4.6)                        # voiture garée le long du trottoir
EXT = dict(camera='poursuite', puis='vue')                       # vue extérieure, puis place du conducteur pour décider

# positions = au moment de l'arrêt sur image (nous sommes alors à quelques mètres du départ)
STAGE = {
    'ex-01-01': dict(env='route', kmh=70, signaux=[['A1a', 28]], apres=A('ralentir', kmh=50)),
    'ex-01-02': dict(env='ville', kmh=25, **EXT, carrefour={'S': 24, 'ligne': 'stop'}, signaux=[['AB4', 18.5]], acteurs=[V(22.25, -22, vx=5)], apres=A('arret', S=19.6)),
    'ex-02-01': dict(env='ville', kmh=50, compteur=True, acteurs=[V(40, kmh=50)], apres=A('aucune')),
    'ex-02-02': dict(env='autoroute', meteo='pluie', kmh=125, compteur=True, **EXT, acteurs=[V(70, -1.75, kmh=112)], apres=A('ralentir', kmh=110, acc=1.5)),
    'ex-03-01': dict(env='ville', kmh=20, carrefour={'S': 20}, acteurs=[V(21.75, 13, vx=-5)], apres=A('arret', S=15.8)),
    'ex-03-02': dict(env='route', kmh=40, camera='drone', puis='vue', carrefour={'S': 26, 'ligne': 'cedez'}, signaux=[['AB3a', 20.5]], acteurs=[V(27.75, 26, vx=-12)], apres=A('arret', S=21.6)),
    'ex-04-01': dict(env='ville', kmh=50, compteur=True, acteurs=[dict(type='ballon', S=48, x=2.2, vx=-1.6)], apres=A('freinage', duree=5)),
    'ex-04-02': dict(env='route', kmh=80, **EXT, acteurs=[V(30, kmh=80)], apres=A('distance', kmh=68, acc=1.2)),
    'ex-05-01': dict(GARE, meteo='nuit', acteurs=[P(14, 6.6, cap=-90)], apres=A('aucune')),
    'ex-05-02': dict(GARE, meteo='nuit', camera='poursuite', acteurs=[P(1.5, 6.3, cap=-90), P(3, 6.5, cap=-100)], apres=A('aucune')),
    'ex-06-01': dict(env='ville', kmh=40, compteur=True, carrefour={'S': 46, 'ligne': 'feu'}, acteurs=[dict(type='feu', S=41.5, x=5.2, etat='orange')], apres=A('arret', S=41.6, feu=[[0, 'rouge', 1.6]])),
    'ex-06-02': dict(env='ville', kmh=20, camera='drone', giratoire=20, signaux=[['AB3a', 16, 4.6]], acteurs=[V(26.6, -7.4)], apres=A('arret', S=19.4)),
    'ex-07-01': dict(env='route', kmh=70, ligne='continue', acteurs=[V(26, kmh=55)], apres=A('distance', kmh=55)),
    'ex-07-02': dict(env='route', kmh=70, **EXT, ligne=[{'de': -200, 'a': 16, 'type': 'discontinue'}, {'de': 16, 'a': 90, 'type': 'annonce'}, {'de': 90, 'a': 900, 'type': 'continue'}], acteurs=[V(30, kmh=60)], apres=A('distance', kmh=60)),
    'ex-08-01': dict(env='route', kmh=40, ligne='continue', signaux=[['A1a', 52]], acteurs=[dict(type='tracteur', S=20, x=1.75, kmh=25)], apres=A('distance', kmh=25)),
    'ex-08-02': dict(env='route', kmh=40, camera='poursuite', ligne='discontinue', acteurs=[dict(type='velo', S=16, x=2.7, kmh=20)], apres=A('depasser', i=0, voie=-0.4, kmh=55, duree=7.5)),
    'ex-09-01': dict(env='ville', kmh=20, acteurs=[P(20, 6.6, cap=-90)], apres=A('garer', voie=4.4, S=19)),
    'ex-09-02': dict(env='ville', kmh=15, **EXT, apres=A('ralentir', kmh=15)),
    'ex-10-01': dict(env='autoroute', kmh=82, voie=5.0, feux={'clignotant': 'g'}, acteurs=[V(3, 1.75, kmh=112)], apres=A('inserer', kmh=100, attente=1.8)),
    'ex-10-02': dict(env='autoroute', kmh=0, camera='poursuite', voie=5.0, feux={'detresse': True}, acteurs=[V(-40, 1.75, kmh=110), P(3, 8.4, gilet=True, cap=-90), P(5, 8.6, gilet=True, cap=-90)], apres=A('aucune')),
    'ex-11-01': dict(env='ville', kmh=30, passage=30, acteurs=[P(30, 6.2, cap=90)], apres=A('arret', S=27.2, acteurs=[[0, 0, -1.2]])),
    'ex-11-02': dict(env='ville', kmh=30, **EXT, acteurs=[dict(type='ballon', S=24, x=3.6, vx=-1.8), dict(type='enfant', S=26, x=5.6)], apres=A('arret', S=20, acteurs=[[1, 0, -1.6]])),
    'ex-12-01': dict(env='ville', kmh=25, acteurs=[dict(type='velo', S=15, x=3.1, kmh=16), dict(type='portiere', S=26, x=4.6)], apres=A('ralentir', kmh=12, ouvrir=[1, 0.8])),
    'ex-12-02': dict(env='ville', kmh=25, **EXT, passage=32, acteurs=[dict(type='trottinette', S=24, x=3.0, kmh=14), P(32, 6.3, cap=90)], apres=A('ralentir', kmh=12)),
    'ex-13-01': dict(env='ville', kmh=20, carrefour={'S': 36, 'forme': 'T-droite'}, feux={'clignotant': 'd'}, acteurs=[dict(type='camion', S=20, x=1.75, kmh=15)], apres=A('distance', kmh=8, acteurs=[[0, 10, -0.5]])),
    'ex-13-02': dict(env='autoroute', kmh=20, camera='drone', acteurs=[V(9, -1.75, kmh=20), V(-3, -1.75, kmh=20), dict(type='moto', S=-4, x=0.0, kmh=32), V(14, 1.75, kmh=20)], etiquettes=[[2, 'Une moto', 'entre les files']], apres=A('ralentir', kmh=16)),
    'ex-14-01': dict(env='route', kmh=50, camera='arriere', acteurs=[dict(type='ambulance', S=-18, x=1.2, kmh=68)], apres=A('voie', voie=3.4, cote='d', kmh=30, attente=0.2, acteurs=[[0, 72, -0.45]])),
    'ex-14-02': dict(env='route', kmh=40, maisons=True, **EXT, acteurs=[dict(type='ambulance', S=-30, x=1.75, kmh=58)], apres=A('ralentir', kmh=15, camera='arriere')),
    'ex-15-01': dict(env='route', meteo='nuit', kmh=70, feux={'route': True, 'croisement': False}, acteurs=[V(80, -1.75, kmh=-70)], apres=A('feux', feux={'route': False, 'croisement': True})),
    'ex-15-02': dict(env='route', meteo='nuit', kmh=80, **EXT, acteurs=[P(70, 4.4, haut=0x2E3440)], apres=A('ralentir', kmh=50)),
    'ex-16-01': dict(env='route', meteo='pluie', kmh=80, acteurs=[V(32, kmh=80)], apres=A('distance', kmh=62, acc=1.4)),
    'ex-16-02': dict(env='route', meteo='brouillard', kmh=80, **EXT, acteurs=[V(46, kmh=60)], apres=A('ralentir', kmh=50, feux={'croisement': True, 'brouillardAv': True})),
    'ex-17-01': dict(env='route', kmh=50, signaux=[['A7', 22]], rails=48, acteurs=[dict(type='feu', S=43.5, x=4.6, etat='rouge'), dict(type='train', S=48, x=60, vx=-24)], apres=A('arret', S=43.4)),
    'ex-17-02': dict(env='route', kmh=70, **EXT, tunnel=22, acteurs=[V(44, kmh=70)], apres=A('distance', kmh=62, feux={'croisement': True})),
    'ex-18-01': dict(env='autoroute', meteo='couchant', kmh=110, acteurs=[V(60, kmh=110)], apres=A('ralentir', kmh=90, feux={'clignotant': 'd'})),
    'ex-18-02': dict(env='ville', kmh=30, **EXT, acteurs=[V(26, kmh=30)], apres=A('aucune')),
    'ex-19-01': dict(GARE, apres=A('aucune')),
    'ex-19-02': dict(GARE, meteo='couchant', camera='drone', apres=A('aucune')),
    'ex-20-01': dict(GARE, acteurs=[P(14, 6.6, cap=-90)], apres=A('aucune')),
    'ex-20-02': dict(GARE, meteo='couchant', camera='poursuite', apres=A('aucune')),
    'ex-21-01': dict(GARE, camera='cockpit', apres=A('aucune')),
    'ex-21-02': dict(GARE, camera='poursuite', acteurs=[dict(type='velo', S=-8, x=2.6, kmh=16)], apres=A('attendre')),
    'ex-22-01': dict(GARE, camera='poursuite', acteurs=[dict(type='enfant', S=1, x=6.5, cap=-90), P(2.5, 6.6, cap=-90)], apres=A('aucune')),
    'ex-22-02': dict(GARE, camera='poursuite', apres=A('aucune')),
    'ex-23-01': dict(env='route', kmh=70, apres=A('garer', voie=3.9, feux={'detresse': True}, duree=7)),
    'ex-23-02': dict(GARE, camera='poursuite', apres=A('aucune')),
    'ex-24-01': dict(env='autoroute', kmh=110, compteur=True, acteurs=[V(40, kmh=104)], apres=A('distance', kmh=104, acc=1)),
    'ex-24-02': dict(env='autoroute', kmh=110, camera='drone', feux={'clignotant': 'g'}, acteurs=[V(4, -1.75, kmh=110)], etiquettes=[[0, 'Angle mort', 'le capteur ne l’a pas vu']], apres=A('feux', feux={'clignotant': None})),
    'ex-25-01': dict(env='route', kmh=50, acteurs=[V(42, 1.2, cap=24), P(38, 4.6)], apres=A('garer', voie=3.9, S=26, feux={'detresse': True})),
    'ex-25-02': dict(env='route', kmh=0, camera='drone', voie=3.9, feux={'detresse': True}, acteurs=[V(30, 1.2, cap=24), P(24, 4.6), dict(type='triangle', S=-24, x=1.75)], apres=A('aucune')),
    'ex-26-01': dict(GARE, apres=A('aucune')),
    'ex-26-02': dict(env='ville', kmh=0, camera='drone', feux={'detresse': True}, acteurs=[V(6.4, 1.75, couleur=0xEC7F3A), V(12.6, 1.75, couleur=0x3A6DF0), P(9.5, -0.4, cap=90), P(9.5, 3.4, cap=-90)], apres=A('aucune')),
    'ex-27-01': dict(env='ville', kmh=30, carrefour={'S': 32, 'ligne': 'feu'}, acteurs=[dict(type='feu', S=27.5, x=5.2, etat='rouge')], apres=A('arret', S=27.6)),
    'ex-27-02': dict(env='route', meteo='pluie', kmh=80, **EXT, signaux=[['B14:80', 26]], apres=A('ralentir', kmh=60)),
    'ex-28-01': dict(env='ville', kmh=50, compteur=True, carrefour={'S': 84, 'ligne': 'feu'}, acteurs=[dict(type='feu', S=79.5, x=5.2, etat='rouge')], apres=A('arret', S=79.6)),
    'ex-28-02': dict(GARE, camera='drone', apres=A('aucune')),
    'ex-29-01': dict(env='ville', kmh=30, acteurs=[V(30, kmh=30, couleur=0x2FA37A)], apres=A('aucune')),
    'ex-29-02': dict(GARE, camera='poursuite', apres=A('aucune')),
    'ex-30-01': dict(env='ville', kmh=30, signaux=[['C12', 6]], acteurs=[V(24, 1.75, kmh=16)], apres=A('voie', voie=-1.75, cote='g')),
    'ex-30-02': dict(env='ville', kmh=15, **EXT, carrefour={'S': 24, 'forme': 'T-droite'}, feux={'clignotant': 'd'}, acteurs=[dict(type='velo', S=8, x=3.1, kmh=20)], apres=A('arret', S=20)),
    'ex-31-01': dict(env='autoroute', kmh=110, voie=-1.75, acteurs=[dict(type='camion', S=-12, x=1.75, kmh=88)], apres=A('voie', voie=1.75, cote='d')),
    'ex-31-02': dict(env='autoroute', kmh=85, **EXT, voie=5.0, feux={'clignotant': 'g'}, acteurs=[V(-5, 1.75, kmh=112), V(42, 1.75, kmh=100)], apres=A('inserer', kmh=100, attente=1.8)),
    'ex-32-01': dict(env='ville', kmh=12, carrefour={'S': 20}, feux={'clignotant': 'g'}, acteurs=[V(40, -1.75, kmh=-35)], apres=A('arret', S=17)),
    'ex-32-02': dict(env='ville', kmh=20, **EXT, carrefour={'S': 28}, rails=28, acteurs=[dict(type='tram', S=28, x=24, vx=-8)], apres=A('arret', S=23.6)),
    'ex-33-01': dict(env='ville', kmh=30, passage=32, acteurs=[dict(type='camion', S=25, x=4.5), P(32, 4.6, cap=90)], apres=A('arret', S=29, acteurs=[[1, 0, -1.2]])),
    'ex-33-02': dict(env='route', kmh=80, **EXT, signaux=[['A1a', 30]], apres=A('ralentir', kmh=50)),
    'ex-34-01': dict(GARE, apres=A('aucune')),
    'ex-34-02': dict(GARE, meteo='couchant', camera='arriere', apres=A('aucune')),
    'ex-35-01': dict(GARE, camera='poursuite', acteurs=[P(1, 6.4, cap=-90), P(3, 6.6, cap=-100)], apres=A('aucune')),
    'ex-35-02': dict(GARE, camera='drone', apres=A('aucune')),
}

def situations(cid):
    """les deux exercices immersifs d'un cours, au format des situations d'examen"""
    c = next(c for c in SRC if c['id'] == cid)
    out = []
    for e in c.get('exercices_immersifs_3d', []):
        rep = e['reponses']; good = e['bonne_reponse_index']
        order = list(range(len(rep)))
        # mélangées, sauf les réponses chiffrées qui restent dans l'ordre (30, 50, 80 km/h…)
        if not all(any(ch.isdigit() for ch in r['texte']) for r in rep): random.Random(zlib.crc32(e['id'].encode())).shuffle(order)
        ctx = (e.get('scene_3d') or {}).get('point_de_depart', '').strip()
        s = dict(q=e['question'], choix=[rep[k]['texte'] for k in order], bonnes=[order.index(good)],
                 explication=e['explication'], bien='Bien vu !', immersif=e['id'])
        # la mise en situation (« Un ami propose un café après plusieurs verres. ») : sans elle, « Que fais-tu ? » ne veut rien dire
        if ctx: s['contexte'] = ctx if ctx[-1] in '.!?…' else ctx + '.'
        s.update(json.loads(json.dumps(STAGE[e['id']])))
        out.append(s)
    return out

if __name__ == '__main__':
    from collections import Counter
    allx = [s for c in SRC for s in situations(c['id'])]
    print(len(allx), 'situations ; bonne réponse en', Counter('ABC'[s['bonnes'][0]] for s in allx))
    assert len(STAGE) == 70 and all(e['id'] in STAGE for c in SRC for e in c['exercices_immersifs_3d'])
