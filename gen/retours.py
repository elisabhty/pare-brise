"""Corrections issues des retours de cinq élèves testeurs (novembre 2026) : Inès (cours 1 à 7), Karim (8 à 14),
Lucie (15 à 21), Bernard (22 à 28) et Maya (29 à 35). Rapports complets : gen/retours-eleves/.

Appliqué par mise-en-scene.py (textes des cours, fiches mémo, décors) et pratique.py (questions de la pratique).
Les points de droit signalés « doute » par les élèves ont été vérifiés avant d'être écrits (sources dans le README).

Format :
  T[(cours, écran)] = { champ: valeur }     valeur = texte complet, ou liste de remplacements [(ancien, nouveau), …]
                                             (« ancien » = '' : ajouté à la fin) ; items_N = une ligne de la carte
  COURS[cours] = { 'resume': …, 'memo': [(début du texte, nouvelle ligne | None)], 'memo+': [nouvelles lignes] }
  P[(cours, début de la question)] = { champs } ou None (question retirée de la pratique)
  DECOR[(cours, écran)] = { champs du décor remplacés }
Le cours 1 garde sa narration (texte d'origine) : seules ses cartes et sa pratique changent.
"""
import re
T, COURS, P, DECOR, EXP = {}, {}, {}, {}, {}
# ---- corrections de décor (appliquées au décor existant) ----
def decale(n, de=1):
    """les renvois à la phrase n et suivantes avancent de « de » phrases (une phrase a été ajoutée avant)"""
    def f(d):
        for a in d.get('aides') or []:
            for k in ('p', 'fin'):
                if isinstance(a.get(k), int) and a[k] >= n: a[k] += de
        for e in d.get('etiquettes') or []:
            if len(e) > 3 and isinstance(e[3], int) and e[3] >= n: e[3] += de
        for st in d.get('script') or []:
            if isinstance(st[0], str): st[0] = re.sub(r'^p(\d+)', lambda m: 'p' + str(int(m.group(1)) + (de if int(m.group(1)) >= n else 0)), st[0])
    return f
def aide_(i, **k):
    def f(d): d['aides'][i].update(k)
    return f
def sans_aide(i):
    def f(d): d['aides'].pop(i)
    return f
def etiquette(i, val):
    def f(d): d['etiquettes'][i] = val
    return f
def acteur(i, **k):
    def f(d): d['acteurs'][i].update(k)
    return f
def sans(*cles):
    def f(d):
        for c in cles: d.pop(c, None)
    return f
def t(cid, i, **k):
    for f, v in k.items():
        cur = T.setdefault((cid, i), {})
        if isinstance(v, list) and v and isinstance(v[0], tuple) and isinstance(cur.get(f), list): cur[f] += v
        else: cur[f] = v
def p(cid, q, fix): P[(cid, q)] = fix
def memo(cid, *ops): COURS.setdefault(cid, {}).setdefault('memo', []).extend(ops)
def memo_plus(cid, *lignes): COURS.setdefault(cid, {}).setdefault('memo+', []).extend(lignes)
def m(texte, tag=None, panneau=None): d = {'texte': texte}; d.update({k: v for k, v in (('tag', tag), ('panneau', panneau)) if v}); return d
def cours(cid, **k): COURS.setdefault(cid, {}).update(k)

# =============================== 1 · Panneaux (narration d'origine conservée) ===============================
t('panneaux', 2, puce='150 m avant hors ville · 50 m en ville')
t('panneaux', 7, puce='Fin de la règle')
t('panneaux', 10, puce='Le panneau jaune l’emporte')
t('panneaux', 12, items_4=['Panneau barré', 'Fin de la règle'], items_6=['Fond jaune', 'Temporaire (sauf le losange de la route prioritaire)'])
t('panneaux', 13, stats=[['7', 'règles'], ['3', 'étapes'], ['13', 'questions']])
p('panneaux', 'Ce panneau appartient à la famille :', {'explication': 'Il est bleu, mais bordé de rouge : c’est le bord rouge qui compte. C’est une interdiction : ici, stationnement interdit.'})
p('panneaux', 'Ici, je peux m\'arrêter quelques instants', {'explication': 'Une seule barre : stationnement interdit, mais tu peux t’arrêter un instant pour déposer quelqu’un, en restant au volant ou juste à côté.'})
p('panneaux', 'À partir de ce panneau :', {'explication': 'Panneau barré de noir : la limitation à 50 prend fin. Tu reprends la vitesse normale de la route, par exemple 80 sur une route à double sens (cours 2).'})
p('panneaux', 'Lequel de ces panneaux m\'oblige à tourner à droite ?', {'explication': 'Panneau A, un triangle : il annonce un virage, c’est un danger. Panneau B, un rond bleu : tourner à droite est obligatoire.'})
p('panneaux', 'Ce panneau signale :', {'explication': 'Deux réponses : c’est un triangle, donc un danger, et son fond jaune dit qu’il est temporaire, pour des travaux par exemple. Le panneau jaune l’emporte sur les panneaux habituels.'})
p('panneaux', 'Lequel de ces deux panneaux est une interdiction ?', {'explication': 'Panneau A, rond rouge avec une barre blanche : sens interdit, c’est une interdiction. Panneau B, carré bleu : sens unique, c’est une indication. Ils se ressemblent, la forme les sépare.'})

# =============================== 2 · Vitesses ===============================
t('vitesses', 1, etiquettes=[['Ville', 'Agglomération'], ['Route', 'Une voie par sens'], ['Voie rapide', 'Sens séparés'], ['Autoroute', 'Panneau bleu']], dire=[('En agglomération : 50.', 'En agglomération, c’est-à-dire en ville ou au village : 50.'),
                       ('Sur une route à double sens sans séparateur central : 80.', 'Une voie dans chaque sens, rien au milieu : 80.'),
                       ('Sur une route à chaussées séparées : 110.', 'Les deux sens séparés par un muret ou une glissière : 110.'),
                       ('Sur autoroute : 130.', 'Sur autoroute, après le panneau bleu de l’autoroute : 130.')])
t('vitesses', 2, dire=[('L\'agglomération commence au panneau blanc bordé de rouge qui porte le nom de la ville.', 'L’agglomération, c’est la ville ou le village : elle commence au panneau blanc bordé de rouge qui porte son nom.'),
                       ('Barré, il marque la sortie.', 'Barré, il marque la sortie : tu reprends la vitesse de la route, souvent 80.'),
                       ('', 'Certains quartiers sont en zone 30 : un panneau l’annonce, et c’est 30 jusqu’au panneau de sortie de la zone.')])
t('vitesses', 3, dire=[('Depuis 2018, ces routes sont à 80 par défaut.', 'Depuis 2018, les routes à double sens sont à 80 par défaut.'),
                       ('Mais beaucoup de départements en ont relevé une partie à 90.', 'Mais certains départements en ont remonté une partie à 90.')])
t('vitesses', 4, items_2=['80', 'km/h', 'route à double sens, même celles à 90'])
t('vitesses', 5, dire=[('', 'Repère sur autoroute : un trait et un espace de la bande d’arrêt d’urgence font environ 50 mètres.')])
t('vitesses', 6, dire='Après l’examen, ton permis est probatoire : trois ans, ou deux ans après la conduite accompagnée, à tout âge. '
                      'Tu poses le disque « A » à l’arrière de ta voiture. '
                      'Tes vitesses : 110 sur autoroute, 100 sur route à chaussées séparées, et 80 sur les routes à double sens, même celles relevées à 90.')
memo('vitesses', ('Route à double sens', m('Route à double sens, rien au milieu', '80 km/h · 90 si un panneau le dit', 'B14:80')))
memo_plus('vitesses', m('Pluie : 110 · 100 · 80', 'Autoroute · chaussées séparées · double sens'), m('Permis probatoire : 110 · 100 · 80', '3 ans, 2 après la conduite accompagnée'))
p('vitesses', 'Quelle limite générale s’applique ?', {'explication': 'Sous la pluie, l’autoroute passe de 130 à 110 km/h.'})
p('vitesses', 'Je roule à 80 km/h. Je dois :', {'explication': 'Le panneau d’entrée d’agglomération impose 50 dès qu’on le passe : tu dois déjà rouler à 50 à sa hauteur, donc tu freines avant.'})
p('vitesses', 'Il pleut. Sur cette autoroute, je roule au maximum à :',
  {'q': 'Il pleut, sur une route à chaussées séparées limitée à 110. Je roule au maximum à :', 'choix': ['110 km/h', '100 km/h', '80 km/h'], 'bonnes': [1], 'mode': 'qcm',
   'explication': 'Sous la pluie, les routes à chaussées séparées passent de 110 à 100 km/h.'})

# =============================== 3 · Priorités ===============================
t('priorites', 1, dire=[('', 'Ceux qui arrivent de ta gauche, eux, doivent te laisser passer.'),
                        ('', 'Et si tu tournes à gauche, laisse d’abord passer ceux d’en face qui vont tout droit.')])
t('priorites', 2, eyebrow='Prioritaire une seule fois',
  dire=[('Ce panneau-là te donne la priorité, mais seulement à la prochaine intersection.', 'Ce triangle avec un gros trait noir te donne la priorité, mais seulement à la prochaine intersection.')])
t('priorites', 4, dire=[('Au cédez le passage, tu laisses passer et tu ne t\'arrêtes que si quelqu\'un arrive.', 'Au cédez le passage, tu laisses passer tout le monde, à gauche comme à droite : tu t’arrêtes seulement si quelqu’un arrive.'),
                        ('Au stop, l\'arrêt est obligatoire dans tous les cas, même si la route est vide.', 'Au stop, tu t’arrêtes à la ligne blanche, roues immobiles, même si la route est vide.')])
t('priorites', 5, titre='Ceux du rond-point passent',
  dire=[('Ce panneau annonce un carrefour à sens giratoire.', 'Ce panneau annonce un carrefour giratoire : un rond-point.'),
        ('À l\'entrée, il y a presque toujours un cédez le passage : tu laisses passer ceux qui sont déjà engagés sur l\'anneau.', 'À l’entrée, il y a presque toujours un cédez le passage. Tu laisses passer ceux qui sont déjà dans le rond-point : ils arrivent de ta gauche.')])
t('priorites', 6, stats=[['1', 'règle par défaut'], ['6', 'panneaux clés'], ['1', 'question : qui passe ?']])
p('priorites', 'À une intersection sans panneau ni feu, je cède le passage', None)       # 4e fois la même question
p('priorites', 'Que fais-tu ?', {'contexte': 'Une voiture arrive sur la route que tu veux prendre. Tu as un cédez-le-passage.', 'explication': 'Au cédez-le-passage, tu laisses passer tous ceux qui arrivent, à gauche comme à droite, et tu t’arrêtes si c’est nécessaire.'})
p('priorites', 'Lequel te rend prioritaire à la prochaine', {'explication': 'Prioritaire une seule fois : c’est le triangle avec un gros trait noir. Le losange jaune dure jusqu’à son panneau de fin, et la croix annonce la priorité à droite.'})

# =============================== 4 · Distances ===============================
t('distances', 1, puce='Vitesse sans le zéro × 3',
  dire=[('Calcul rapide : le chiffre des dizaines fois 3.', 'Calcul rapide : prends ta vitesse sans le zéro, et fais fois 3.'),
        ('', 'Une seconde, c’est quand tu es en forme : fatigue, alcool ou téléphone l’allongent beaucoup.')])
t('distances', 2, puce='Vitesse sans le zéro, au carré',
  dire=[('on prend le chiffre des dizaines au carré.', 'on prend ta vitesse sans le zéro, au carré.'),
        ('Réaction comprise.', 'Ces 25 mètres, c’est 15 mètres pour réagir et 10 pour freiner : la distance d’arrêt, c’est réaction plus freinage.')])
t('distances', 4, eyebrow='Sol mouillé · à 80 km/h', titre='Arrêt : 96 m',
  dire=[('Sur sol mouillé, on multiplie par une fois et demie.', 'Sur sol mouillé, on multiplie la distance d’arrêt par 1,5.'),
        ('À 90, on passe de 81 à environ 121 mètres.', 'À 80, 8 fois 8 font 64 mètres : sous la pluie, environ 96.')])
t('distances', 5, items_1=['2', 'traits', 'ou 2 chevrons au sol, sur autoroute'],
  dire='Avec le véhicule de devant, garde au moins deux secondes d’écart. '
       'Pour compter : quand il passe un poteau, dis « un crocodile, deux crocodiles » : tu dois l’atteindre après. '
       'À 80, deux secondes, c’est environ 44 mètres. '
       'Sur autoroute, regarde les traits blancs au bord de la bande d’arrêt d’urgence, la voie des pannes : garde au moins deux traits entre toi et lui. '
       'Quand des chevrons sont peints au sol, garde-en au moins deux.')
DECOR[('distances', 5)] = aide_(0, texte=['2 secondes', 'au moins'])
t('distances', 6, stats=[['× 3', 'réaction'], ['5 × 5', 'arrêt à 50, sol sec'], ['× 1,5', 'sol mouillé']])
p('distances', 'À 50 km/h sur sol sec, ma distance d’arrêt', {'explication': 'Ta vitesse sans le zéro, au carré : 5 × 5 = 25 m. C’est 15 m pour réagir, plus 10 m pour freiner.'})
p('distances', 'À 70 km/h sur sol sec', {'explication': 'Ta vitesse sans le zéro, au carré : 7 × 7 = 49 m. 21 m, c’est seulement la distance de réaction.'})
p('distances', 'Quel repère minimal utiliser ?', {'explication': 'Garde au moins deux secondes d’écart, et plus sous la pluie, la nuit ou si tu es fatigué.'})
p('distances', 'À 50 km/h sur sol sec, ma distance d\'arrêt est d\'environ :',     # doublon de la question 4 : au-dessus de 100
  {'q': 'À 110 km/h sur sol sec, ma distance d’arrêt est d’environ :', 'choix': ['33 m', '121 m', '220 m'], 'bonnes': [1], 'mode': 'qcm',
   'explication': 'Ta vitesse sans le zéro, au carré : 11 × 11 = 121 m. 33 m, c’est seulement la distance de réaction.'})
p('distances', 'À 90 km/h, pendant mon temps de réaction (1 s)', {'kmh': 90})
p('distances', 'Sur sol mouillé, la distance d\'arrêt est multipliée', {'explication': 'Sur sol mouillé, multiplie la distance d’arrêt par 1,5 : à 50, environ 38 m au lieu de 25.'})
p('distances', 'Ma distance de réaction s\'allonge si :', {'explication': 'La fatigue et l’alcool ralentissent ton cerveau : tu réagis plus tard. La route mouillée, elle, allonge le freinage, pas la réaction.'})

# =============================== 5 · Alcool ===============================
t('alcool', 1, dire=[('Avec un permis définitif, le taux maximal est de 0,5 gramme par litre de sang.', 'Quand ton permis n’est plus probatoire, il est définitif : le taux maximal est de 0,5 gramme d’alcool par litre de sang.'),
                     ('Mesuré à l\'éthylotest, ça correspond à 0,25 milligramme par litre d\'air expiré.', 'Mesurée dans ton souffle, c’est la même limite, écrite autrement : 0,25 milligramme par litre d’air expiré.')])
t('alcool', 2, dire=[('En permis probatoire, c’est 0,2', 'En permis probatoire, et déjà en conduite accompagnée, c’est 0,2'),
                     ('Dans les faits, un seul verre peut suffire à le dépasser.', 'Un seul verre peut suffire à le dépasser : pour toi, c’est zéro verre.')])
t('alcool', 3, titre='Tu réagis plus tard, tu vois moins',
  dire=[('', 'Et rien ne fait baisser l’alcoolémie, la quantité d’alcool dans ton sang : ni café, ni eau, ni douche. Seul le temps compte.')])
t('alcool', 4, dire='Cours terminé. Concrètement : celui qui conduit ne boit pas ; sinon, dors sur place ou rentre autrement. Passe à la pratique pour vérifier les chiffres.')
p('alcool', 'Un café fait baisser l\'alcoolémie.', None)
p('alcool', 'En permis probatoire, le taux d\'alcool maximal', {'explication': '0,2 g/L : un seul verre peut suffire à le dépasser. Si tu conduis, tu ne bois pas.'})
p('alcool', '0,5 g/L de sang correspond, dans l\'air expiré', {'explication': 'C’est la même limite, mesurée dans ton souffle : 0,5 g par litre de sang = 0,25 mg par litre d’air expiré.'})

# =============================== 6 · Carrefours et feux ===============================
t('carrefours-feux', 1, items_1=['Les feux', 'Ils passent avant les panneaux'],
  dire=[('L’agent de circulation commande en premier, même s’il contredit un feu.', 'L’agent de circulation commande en premier, même s’il contredit un feu : bras levé, tout le monde s’arrête ; de face ou de dos, tu t’arrêtes ; de profil, tu passes.')])
t('carrefours-feux', 2, titre='Je m’arrête, sauf si c’est dangereux')
t('carrefours-feux', 3, items_0=['0', '', 'tolérance : on s’arrête avant la ligne blanche'],
  dire=[('Au feu rouge, l’arrêt est absolu, à la ligne d’effet du feu.', 'Au feu rouge, tu t’arrêtes toujours, avant la ligne blanche au sol.'),
        ('', 'Avec un permis probatoire, tu n’as que 6 points : il ne t’en resterait que 2.')])
t('carrefours-feux', 4, items_2=['Panonceau vélo sous le feu', 'Les vélos peuvent passer au rouge, toi non'],
  dire=[('Un feu orange clignotant ne donne aucune priorité : il signale un danger, et ce sont les règles habituelles qui s’appliquent.', 'Un feu orange clignotant ne donne aucune priorité : suis le panneau placé sous le feu ; sans panneau, c’est la priorité à droite.'),
        ('Une flèche verte t’autorise à aller dans sa direction.', 'Une flèche verte t’autorise à aller dans sa direction. Au vert, un piéton déjà sur le passage finit de traverser avant toi.'),
        ('Et le petit panonceau vélo, sous un feu, permet aux cyclistes de franchir le rouge pour aller dans la direction indiquée, en cédant le passage.', 'Un petit panneau vélo sous le feu ? Les cyclistes peuvent passer au rouge dans le sens de la flèche. Toi, tu restes arrêté.'),
        ('', 'Devant certains feux, une case avec un vélo peint au sol est réservée aux cyclistes : le sas vélo. Toi, tu t’arrêtes à la première ligne, avant cette case.')])
t('carrefours-feux', 6, dire=[('Pour une sortie proche, reste sur la voie de droite.', 'Pour une sortie proche, la première ou tout droit, reste sur la voie de droite.'),
                              ('Dans tous les cas, mets ton clignotant à droite avant de sortir.', 'Dans tous les cas, mets ton clignotant à droite juste après la sortie qui précède la tienne.')])
memo('carrefours-feux', ('Sas vélo', m('Sas vélo : arrêt à la première ligne', 'Interdit aux voitures')))
p('carrefours-feux', 'À l’entrée d’un giratoire avec un cédez-le-passage', {'q': 'Tu prends la première sortie du rond-point. Tu te places :', 'choix': ['sur la voie de droite', 'sur la voie de gauche'], 'bonnes': [0],
  'explication': 'Pour une sortie proche, la première ou tout droit, tu restes sur la voie de droite, et tu mets ton clignotant à droite avant de sortir.'})
p('carrefours-feux', 'Le sas vélo devant un feu rouge', {'explication': 'Le sas vélo est réservé aux cyclistes : une voiture s’arrête à la première ligne, avant la case avec le vélo peint.'})

# =============================== 7 · Marquages ===============================
t('marquages', 1, dire=[('Une ligne continue ne se franchit pas, et ne se chevauche pas non plus.', 'Une ligne continue, tu ne passes pas dessus : ni avec toute la voiture, ni avec une seule roue.'),
                        ('Elle signale souvent une zone sans visibilité : virage, sommet de côte.', 'Elle est souvent là où tu ne vois pas loin : un virage, le haut d’une montée.'),
                        ('', 'Seule exception : tu peux rouler dessus avec les roues de gauche pour dépasser un vélo ou une trottinette, si c’est sans danger.')])
t('marquages', 2, dire='La ligne discontinue a des traits courts et de grands espaces. '
                       'Tu peux la franchir pour dépasser ou tourner à gauche, si c’est sans danger. '
                       'Parfois, une continue et une discontinue sont collées : c’est une ligne mixte. Regarde celle de ton côté : discontinue, tu peux passer ; continue, c’est interdit.')
t('marquages', 3, dire=[('', 'Tu as déjà commencé à doubler ? Termine vite si tu as la place, sinon reviens derrière.')])
t('marquages', 4, items_0=['Flèches de rabattement', 'Reviens dans ta voie, à droite'],
  dire=[('Les flèches de rabattement, inclinées, t’obligent à te rabattre : une ligne continue approche.', 'Des flèches penchées au sol ? Ce sont des flèches de rabattement : reviens dans ta voie, à droite, une ligne continue ou la fin de ta voie approche.'),
        ('Le long du trottoir, une ligne jaune continue interdit l’arrêt et le stationnement, une ligne jaune discontinue interdit seulement le stationnement.',
         'Ligne jaune continue au bord du trottoir : ni arrêt, ni stationnement. Ligne jaune en pointillés : tu peux t’arrêter un instant, mais pas te garer.')])
memo_plus('marquages', m('Ligne mixte', 'On lit la ligne de son côté'), m('Zébras', 'Ni rouler, ni se garer dessus'))
p('marquages', 'Des traits longs et rapprochés annoncent :', {'q': 'Ces hachures blanches au sol, les zébras : je peux rouler dessus ?', 'choix': ['Oui, si la voie est libre', 'Non'], 'bonnes': [1], 'mode': 'qcm',
  'explication': 'Les zébras interdisent d’y rouler et de s’y garer : ils protègent une zone, souvent avant une séparation de voies.', 'signaux': None})
p('marquages', 'Peux-tu la franchir pour dépasser une voiture ?', {'explication': 'Une ligne continue ne se franchit pas pour dépasser une voiture : attends une ligne discontinue.'})
p('marquages', 'Une ligne mixte : continue de ton côté', {'explication': 'Sur une ligne mixte, regarde la ligne de ton côté : elle est continue, tu ne la franchis pas.'})
p('marquages', 'Peut-on chevaucher une ligne continue', {'explication': 'Pour dépasser une voiture, tu ne passes pas sur la ligne continue, même un peu. Seule exception : dépasser un vélo ou une trottinette, si c’est sans danger.'})
p('marquages', 'Des flèches inclinées au milieu de la voie', {'explication': 'Ce sont des flèches de rabattement : reviens dans ta voie, à droite, une ligne continue approche.'})
DECOR[('marquages', 1)] = {'aides': [{'type': 'repere', 'ego': True, 'dx': -1.75, 'dz': 14, 'hauteur': 0.6, 'texte': ['Ligne continue', 'on ne passe pas dessus'], 'p': 0}]}
DECOR[('marquages', 2)] = {'aides': [{'type': 'repere', 'ego': True, 'dx': -1.75, 'dz': 14, 'hauteur': 0.6, 'texte': ['Ligne discontinue', 'tu peux la franchir'], 'p': 0}]}
DECOR[('marquages', 3)] = {'aides': [{'type': 'repere', 'ego': True, 'dx': -1.75, 'dz': 16, 'hauteur': 0.6, 'texte': ['Ligne d’annonce', 'traits longs, petits espaces'], 'p': 0}]}
memo('marquages', ('Ligne continue', m('Ligne continue', 'Ne pas franchir · sauf pour dépasser un vélo')))

# corrections de décor, cours 2 à 6
DECOR[('vitesses', 6)] = decale(0, 1)                                   # le disque « A » est dit à la 2e phrase
DECOR[('carrefours-feux', 4)] = decale(2, 1)                            # une phrase sur le piéton avant celle du vélo
DECOR[('alcool', 3)] = aide_(0, textes=[['25 m', 'de réaction, au lieu de 15'], ['', '']])   # 15 m à 50 (cours 4)
# le panneau des feux tricolores est montré au début de la situation, la voix en parle à ce moment-là
t('carrefours-feux', 2, dire='Ce triangle avec trois feux annonce des feux, souvent là où tu ne les attends pas. '
                             'Ici, le feu passe à l’orange : l’orange fixe impose l’arrêt. '
                             'La seule exception : tu es si près qu’il faudrait freiner très fort. Dans ce cas, tu continues.')
DECOR[('carrefours-feux', 2)] = [{'kmh': 22, 'signaux': [['A17', 40, 5.2]], 'script': [['p1', 'feu', 0, 'orange'], ['p1+0.2', 'arret', 51], ['p1+2.8', 'feu', 0, 'rouge']]}, acteur(0, etat='vert')]
p('carrefours-feux', 'À qui cèdes-tu ?', {'explication': 'Ceux qui sont déjà dans le rond-point passent avant toi : ils arrivent de ta gauche.'})
p('carrefours-feux', 'J’entre dans le giratoire. Je dois :', {'explication': 'Au cédez-le-passage du rond-point, tu laisses passer ceux qui y tournent déjà, même s’ils arrivent de ta gauche.'})
p('carrefours-feux', 'Mon feu est vert. Je peux passer :', {'explication': 'Feu vert, mais un piéton est déjà sur le passage : il finit de traverser avant toi.'})
p('carrefours-feux', 'Un agent te fait signe de passer', {'explication': 'Les gestes de l’agent passent avant les feux : s’il te fait signe de passer, tu passes, même au rouge.'})

# =============================== explications de la banque (séries et pratiques) ===============================
# Elles étaient trop courtes (« 1,6 mm. », « Jusqu’à 10 ans. ») et la pratique les complétait en recopiant la question,
# ce qui donnait des phrases bancales. Chacune dit maintenant la réponse et la raison, en phrase entière.
EXP.update({
 'ac24-1': 'Le limiteur t’empêche de dépasser la vitesse que tu as choisie. Le régulateur, lui, maintient une vitesse constante.',
 'ac24-3': 'Par brouillard, les caméras et les capteurs voient mal : les aides peuvent être moins fiables, voire se couper.',
 'ac24-4': 'Même avec une aide activée, c’est toi, le conducteur, qui restes responsable de ta conduite.',
 'a02': '0,2 g/L : un seul verre peut suffire à le dépasser. Si tu conduis, tu ne bois pas.',
 'a03': 'Non : ni café, ni eau, ni douche. Seul le temps fait baisser l’alcoolémie, la quantité d’alcool dans ton sang.',
 'a05': 'C’est la même limite, mesurée dans ton souffle : 0,5 g par litre de sang = 0,25 mg par litre d’air expiré.',
 'as09-3': 'Se garer sur un passage piéton est un stationnement très gênant : 135 € d’amende, et ta voiture peut partir à la fourrière.',
 'as09-4': 'Avant d’ouvrir, regarde ton rétroviseur et ton angle mort : un vélo ou une voiture peut arriver le long de ta portière.',
 'a10-1': 'Sur autoroute, tu roules sur la voie de droite. Les voies de gauche servent à dépasser.',
 'a10-3': 'Un seul chevron d’écart, c’est trop près : danger. Garde au moins deux chevrons : c’est la sécurité.',
 'a10-4': 'Un véhicule d’intervention est arrêté : change de voie si tu peux, sinon ralentis bien. C’est le corridor de sécurité.',
 'a10-5': 'Ce panneau bleu marque l’entrée d’une autoroute : par temps sec, tu peux y rouler jusqu’à 130.',
 'a10-6': 'Sous la pluie, l’autoroute passe de 130 à 110 km/h.',
 'cf06-6': 'Franchir un feu rouge coûte 135 € d’amende et 4 points.',
 'ce12-2': 'Il faut avoir au moins 14 ans pour conduire une trottinette électrique, depuis 2023.',
 'ce12-3': 'Une trottinette électrique est bridée : 25 km/h au maximum.',
 'd02': 'Ta vitesse sans le zéro, au carré : 5 × 5 = 25 m. C’est 15 m pour réagir, plus 10 m pour freiner.',
 'd03': 'Ta vitesse sans le zéro, fois 3 : 9 × 3 = 27 m parcourus avant même de commencer à freiner.',
 'd05': 'Garde au moins 2 secondes : quand la voiture de devant passe un repère, tu dois l’atteindre deux secondes après.',
 'dm19-1': 'Pour les stupéfiants, il n’y a aucun seuil : une simple trace dans ta salive ou ton sang suffit à être en infraction.',
 'dm19-2': 'Pictogramme orange, niveau 2 : sois très prudent, et ne conduis pas sans l’avis d’un médecin ou d’un pharmacien.',
 'dm19-3': 'Conduire après avoir pris des stupéfiants est un délit : 6 points en moins, en plus de l’amende et de la suspension possible.',
 'e28-1': 'Des pneus pas assez gonflés frottent plus sur la route : ta voiture consomme plus, et freine moins bien.',
 'e28-3': 'Un coffre de toit, même vide, freine la voiture dans l’air : tu consommes plus. Retire-le quand tu ne t’en sers pas.',
 'e28-4': 'À l’arrêt prolongé, coupe le moteur : au ralenti, il consomme et pollue pour rien.',
 'e23-1': 'Le minimum légal est 1,6 mm de profondeur dans les rainures du pneu. En dessous, il faut le changer.',
 'e23-2': 'Contrôle la pression à froid, avant de rouler : un pneu chaud donne une mesure faussée.',
 'e23-3': 'Voyant orange : une anomalie, à faire vérifier rapidement. Voyant rouge : arrête-toi dès que tu peux le faire sans danger.',
 'e23-4': 'L’ABS empêche les roues de se bloquer : tu peux encore tourner le volant en freinant fort. Il ne raccourcit pas forcément le freinage.',
 'fd18-1': 'Fais une pause au moins toutes les 2 heures de route : quelques minutes pour marcher et te reposer.',
 'fd18-2': 'Le café ne remplace pas le sommeil : arrête-toi dans un endroit sûr et dors 15 à 20 minutes.',
 'fd18-3': 'Téléphone tenu en main au volant : 135 € d’amende et 3 points, même arrêté dans un bouchon.',
 'fd18-4': 'Écouteurs, oreillettes, casque : tout ce qui se met sur ou dans l’oreille est interdit au volant (135 € et 3 points).',
 'fd18-5': {'choix': ['9 m', '27 m', '50 m'], 'explication': 'Ta vitesse sans le zéro, fois 3 : 9 × 3 = 27 m en une seconde, comme au cours 4.'},
 'i27-1': 'Une amende de 4e classe : 135 € en forfaitaire, 90 € si tu paies dans les 15 jours, 375 € si tu paies trop tard.',
 'i27-2': 'Franchir un feu rouge : 135 € d’amende et 4 points retirés.',
 'i27-3': '25 km/h de trop, c’est la tranche de 20 à 29 km/h : 2 points et 135 € d’amende.',
 'i27-4': 'Ne pas boucler ta ceinture quand tu conduis : 135 € et 3 points.',
 'i16-2': 'Visibilité sous 50 mètres : 50 km/h au maximum partout, même sur autoroute.',
 'i16-5': 'Ce triangle, avec une voiture qui dérape, annonce une chaussée particulièrement glissante : ralentis.',
 'mtp17-1': 'Feux rouges clignotants au passage à niveau : tu t’arrêtes, même si les barrières sont encore levées.',
 'mtp17-3': 'Dans un tunnel, allume tes feux de croisement, même s’il est éclairé.',
 'mtp17-4': 'En descente, rétrograde pour garder le frein moteur. Jamais au point mort : tes freins chaufferaient.',
 'mtp17-5': 'Incendie dans un tunnel : arrête-toi, coupe le moteur et sors à pied par l’issue de secours la plus proche. Jamais de demi-tour.',
 'ne15-1': 'Les feux de croisement éclairent environ 30 mètres devant toi : la nuit, adapte ta vitesse à cette distance.',
 'ne15-2': 'Le feu de brouillard arrière est interdit sous la pluie : il sert seulement par brouillard ou quand la neige tombe.',
 'ne15-5': 'Les feux de route servent sur une route non éclairée, quand tu n’éblouis personne, ni devant ni en face.',
 'pa26-1': 'Le minimum obligatoire est la responsabilité civile, dite « au tiers » : elle paie les dommages que tu causes aux autres.',
 'pa26-3': 'Le constat doit arriver chez ton assureur dans les 5 jours ouvrés après l’accident.',
 'pa26-4': 'Une fois signé, le constat ne se modifie plus : relis tout avant de signer.',
 'pp20-1': 'Avec un permis probatoire, tu démarres avec 6 points, qui montent jusqu’à 12 si tu ne commets pas d’infraction.',
 'pp20-4': 'Un stage volontaire de sensibilisation rend jusqu’à 4 points, une fois par an au maximum.',
 'pp20-5': 'Depuis le 1er janvier 2024, on peut passer le permis B dès 17 ans.',
 'pl213-1': 'Si tu ne vois pas le chauffeur dans son rétroviseur, il ne te voit pas non plus : tu es dans son angle mort.',
 'pl213-3': 'Dans un virage serré, l’arrière d’un camion déborde sur le côté : ne reste pas à côté de lui.',
 'pl213-4': 'Une moto est étroite : elle paraît plus loin et plus lente qu’elle ne l’est. On sous-estime souvent sa vitesse.',
 'pc21-2': 'Avant de partir : rétroviseur, clignotant, coup d’œil dans l’angle mort, puis tu t’insères doucement.',
 'pc21-3': 'Garé en pente : serre le frein de parking et laisse une vitesse engagée, pour que la voiture ne roule pas.',
 'ps25-1': 'D’abord protéger, pour éviter un nouvel accident ; puis alerter (15, 18 ou 112) ; enfin secourir.',
 'ps25-4': 'Ne retire jamais le casque d’un motard blessé : seuls les secours le font, pour ne pas abîmer sa colonne vertébrale.',
 'ps25-5': 'Inconsciente mais qui respire : mets-la en position latérale de sécurité, sur le côté, pour qu’elle ne s’étouffe pas.',
 'sp22-1': 'La ceinture est obligatoire à toutes les places, à l’avant comme à l’arrière.',
 'sp22-2': 'Siège bébé dos à la route à l’avant : désactive l’airbag passager, il pourrait blesser gravement le bébé.',
 'sp22-3': 'Un siège ou un rehausseur adapté est obligatoire jusqu’à 10 ans.',
 'uv11-2': 'Ne pas laisser passer un piéton qui traverse, ou qui montre clairement qu’il va traverser : 135 € et 6 points.',
 'uv11-3': 'Dans une zone de rencontre : 20 km/h au maximum, et les piétons passent avant toi.',
 'uv11-4': 'Ce triangle avec deux enfants annonce un endroit fréquenté par des enfants, souvent une école : ralentis.',
 'vp14-1': 'Feux bleus et sirène à deux tons : les pompiers en intervention passent avant tout le monde. Facilite leur passage.',
 'vp14-2': 'Un gyrophare orange signale un véhicule lent ou un danger : sois prudent, mais il n’a pas de priorité.',
 'vp14-3': 'Serre-toi à droite, ralentis ou arrête-toi si besoin, sans geste brusque, pour lui libérer le passage.',
 'vp29-1': 'Une voiture électrique a la vignette Crit’Air 0, la verte : la plus propre.',
 'vp29-2': 'Pour circuler dans une ZFE, ta voiture doit avoir une vignette Crit’Air autorisée dans cette zone.',
 'vp29-3': 'Quand tu lèves le pied, le moteur électrique freine la voiture et recharge un peu la batterie.',
 'vp29-4': 'À basse vitesse, une voiture électrique fait très peu de bruit : les piétons risquent de ne pas l’entendre arriver.',
 'v06': 'Sous la pluie, les routes à 80 restent à 80. Seules l’autoroute et les routes à chaussées séparées baissent.',
 'r02': 'Ce triangle avec un gros trait noir te rend prioritaire à la prochaine intersection seulement. Ensuite, la priorité à droite reprend.',
 'p06': 'Deux réponses : c’est un triangle, donc un danger, et son fond jaune dit qu’il est temporaire. Le panneau jaune l’emporte sur les panneaux habituels.',
 'p07': 'Panneau barré de noir : la limitation à 50 prend fin. Tu reprends la vitesse normale de la route, par exemple 80 sur une route à double sens.',
})

# =============================== 8 · Dépassement (Karim) ===============================
t('depassement', 0, dire=[('On ne la commence que si tout est réuni.', 'Tu la commences seulement si toutes les vérifications sont bonnes.')])
t('depassement', 1, items_2=['Rétros, clignotant, angle mort', 'Personne ne te double déjà'], items_3=['Dépasser vite', 'Puis revenir à droite sans gêner'],
  dire='Avant de doubler : une ligne discontinue et aucun panneau d’interdiction. '
       'Personne en face, et assez de visibilité pour aller au bout. '
       'Regarde tes rétroviseurs, mets ton clignotant, puis tourne la tête vers ton angle mort : la zone que tes rétroviseurs ne montrent pas. Personne ne doit déjà te doubler. '
       'Dépasse vite, sans hésiter, puis reviens à droite sans gêner celui que tu as doublé.')
t('depassement', 2, dire=[('', 'On dépasse toujours par la gauche. Une seule exception : la voiture devant met son clignotant à gauche pour tourner, alors tu la dépasses par la droite.')])
t('depassement', 3, titre='Les cas interdits', panneaux=['B3', 'A21'],
  dire='Ce panneau rond, avec une voiture rouge et une noire, interdit de dépasser les voitures, les camions et les tracteurs. '
       'Tu peux quand même dépasser un vélo, une moto ou un scooter. '
       'Dépasser est aussi interdit avant un carrefour où tu n’as pas la priorité, et quand tu ne vois pas assez loin : dans un virage ou en haut d’une montée. '
       'Le triangle avec un vélo, lui, prévient que des cyclistes peuvent arriver sur ta route par le côté.')
t('depassement', 4, dire=[('Et c’est la seule exception : tu peux chevaucher une ligne continue pour le faire, si c’est sans danger.',
                           'Rappel du cours 7 : une ligne continue, tu ne roules pas dessus. Seule exception : pour dépasser un vélo ou une trottinette, tes roues de gauche peuvent rouler sur la ligne, si tu vois loin et que personne n’arrive.')])
t('depassement', 5, dire=[('', 'Et croiser, c’est passer à côté d’une voiture qui vient en face : sur une route étroite, serre-toi à droite et ralentis.')])
t('depassement', 6, stats=[['4', 'vérifications avant de doubler'], ['1,5', 'm pour un vélo hors agglomération'], ['1', 'exception : vélo ou trottinette']])
cours('depassement', chapitres=['Avant de doubler', 'Les interdictions', 'Le vélo, et quand on te double'])
memo('depassement', ('Panneau B3', m('Dépassement interdit', 'Voitures, camions, tracteurs : pas les vélos ni les motos', 'B3')),
     ('Cycliste', m('Dépasser un vélo', '1 m en agglomération · 1,50 m hors agglomération')))
memo_plus('depassement', m('Débouché de cyclistes', 'Des vélos peuvent arriver par le côté', 'A21'))
p('depassement', 'Je peux dépasser ce tracteur :', {'explication': 'Ce panneau interdit de dépasser les voitures, les camions et les tracteurs, même si la ligne est discontinue.'})
p('depassement', 'Ce panneau interdit de dépasser :', {'choix': ['tous les véhicules', 'les voitures, camions et tracteurs, mais pas les vélos ni les motos'],
  'explication': 'Ce panneau interdit de dépasser les véhicules à moteur : voitures, camions, tracteurs. Tu peux encore dépasser un vélo, une moto ou un scooter.'})
p('depassement', 'Pour dépasser un cycliste, peux-tu chevaucher', {'q': 'Pour dépasser un cycliste, tes roues peuvent-elles rouler sur une ligne continue ?',
  'explication': 'Oui, c’est la seule exception : pour dépasser un vélo ou une trottinette, si tu vois loin et que personne n’arrive en face.'})
p('depassement', 'Un véhicule devant toi tourne à gauche', {'explication': 'Il a mis son clignotant à gauche et s’est décalé pour tourner : c’est la seule fois où tu le dépasses par la droite.'})

# =============================== 9 · Arrêt et stationnement ===============================
t('arret-stationnement', 1, items_0=['Arrêt', 'Un court moment : tu restes au volant ou juste à côté'], items_1=['Stationnement', 'Tout le reste : tu t’éloignes, ou tu attends longtemps'],
  dire='L’arrêt, c’est un court moment pour déposer quelqu’un ou charger un objet : tu restes au volant, ou juste à côté, prêt à repartir. '
       'Le stationnement, c’est tout le reste : tu t’éloignes, par exemple pour monter un colis, ou tu attends longtemps, même assis dedans.')
t('arret-stationnement', 2, titre='Deux interdictions',
  dire='Fond bleu, bord rouge, une seule barre : stationnement interdit, mais tu peux t’arrêter. Barré d’une croix : arrêt et stationnement interdits.')
t('arret-stationnement', 3, eyebrow='Toujours interdit', items_0=['Passages piétons et trottoirs', 'Arrêt et stationnement : très gênant'],
  items_1=['Places handicapé', 'Sans la carte : très gênant, même un arrêt'], items_3=['Autoroute, tunnel, passage à niveau', 'Interdits, sauf urgence'],
  dire='Même sans panneau, certains endroits sont toujours interdits, même pour dix secondes. '
       'Le passage piéton, le trottoir, la voie de bus et la piste cyclable. '
       'La place handicapé aussi, sauf avec la carte de stationnement pour personnes handicapées. '
       'Et sur autoroute, dans un tunnel ou sur un passage à niveau, là où la route croise une voie ferrée : interdit, sauf urgence.')
t('arret-stationnement', 4, items_0=['135', '€', 'd’amende'], items_1=['+', '', 'fourrière possible'],
  dire='Se garer sur un passage piéton ou une place handicapé coûte 135 euros. Et ta voiture peut partir à la fourrière : la police la fait enlever, et tu paies pour la récupérer.')
t('arret-stationnement', 5, dire=[('Astuce : ouvre avec la main opposée, tu te retournes naturellement.', 'Astuce : ouvre ta portière avec la main droite. Ton corps tourne, et tu vois derrière toi.')])
t('arret-stationnement', 6, stats=[['2', 'panneaux'], ['8', 'lieux toujours interdits'], ['1', 'réflexe avant d’ouvrir']],
  dire=[('Retiens surtout le réflexe rétroviseur avant d’ouvrir ta portière.', 'Retiens surtout : rétroviseur et angle mort avant d’ouvrir ta portière.')])
cours('arret-stationnement', resume='La différence entre arrêt et stationnement, les endroits toujours interdits, les panneaux et la sortie de voiture.')
memo('arret-stationnement', ('Arrêt', m('Arrêt', 'Un court moment, au volant ou juste à côté')))
p('arret-stationnement', 'De quoi s’agit-il ?', {'explication': 'Tu t’arrêtes un court moment pour déposer quelqu’un, et tu restes au volant : c’est un arrêt.'})
p('arret-stationnement', 'Peux-tu y stationner deux minutes ?', {'q': 'Peux-tu t’y arrêter deux minutes, feux de détresse allumés ?', 'choix': ['Oui, avec les feux de détresse', 'Non', 'Oui'],
  'explication': 'Non. Sans la carte, même un arrêt est interdit sur une place handicapé. Les feux de détresse n’y changent rien.'})
p('arret-stationnement', 'Stationnement en descente', None)        # le stationnement en pente est au cours 21
p('arret-stationnement', 'Je peux m’arrêter ici quelques secondes', {'explication': 'Barré d’une croix : arrêt et stationnement interdits, même pour quelques secondes.'})

# =============================== 10 · Autoroute ===============================
t('autoroute', 0, dire=[('On y roule vite : chaque règle compte double.', 'On y roule vite : la moindre erreur devient très grave.')])
t('autoroute', 1, dire='Sur la voie d’insertion, mets ton clignotant à gauche et accélère jusqu’à la vitesse des autres. '
                       'Regarde ton rétroviseur et ton angle mort, puis glisse-toi dans un espace libre. '
                       'Ceux qui sont déjà sur l’autoroute sont prioritaires : pas d’espace ? Adapte ta vitesse pour en trouver un avant la fin de la voie.')
t('autoroute', 2, dire=[('', 'L’autoroute commence au panneau bleu avec une route qui passe sous un pont : piétons, vélos et petits scooters de 50 y sont interdits.'),
                        ('', 'Une voie rapide, aux deux sens séparés, suit presque les mêmes règles, mais à 110 au maximum.')])
t('autoroute', 3, dire='Sur certaines autoroutes, de grandes flèches en V sont peintes sur ta voie : ce sont les chevrons. '
                       'Garde au moins deux chevrons entre toi et la voiture de devant : un seul, c’est trop près. '
                       'Sans chevrons, garde deux traits de la bande d’arrêt d’urgence, comme au cours 4. '
                       'Bouchon soudain devant toi ? Allume tes feux de détresse pour prévenir ceux qui te suivent.')
t('autoroute', 4, items_1=['110', 'km/h', 'sous la pluie, ou en permis probatoire'],
  dire='Rappel : 130 par temps sec, 110 sous la pluie. Pendant ton permis probatoire, c’est 110 aussi, à tout âge. Et 50 si tu vois à moins de 50 mètres.')
t('autoroute', 5, items_3=['Alerter', 'Borne orange ou 112'],
  dire='En cas de panne, va sur la bande d’arrêt d’urgence, la petite voie tout à droite, le plus à droite possible. '
       'Allume tes feux de détresse et enfile ton gilet jaune avant de sortir. '
       'Tout le monde sort côté droit et passe derrière la glissière, la barrière de métal au bord. '
       'Puis appelle avec une borne orange d’appel d’urgence, ou le 112.')
t('autoroute', 6, dire='Un véhicule est arrêté sur la bande d’arrêt d’urgence, avec une lumière bleue ou orange qui tourne ? '
                       'Ralentis, et change de voie si tu peux. Sinon, écarte-toi le plus possible dans ta voie. C’est le corridor de sécurité.')
cours('autoroute', titre='Autoroute et voies rapides')
memo('autoroute', ('Distance', m('Distance', 'Deux chevrons, ou deux traits de la bande d’arrêt d’urgence')))
memo_plus('autoroute', m('Corridor de sécurité', 'Ralentis, change de voie ou écarte-toi'))
p('autoroute', 'Où te mets-tu après sécurisation', {'q': 'Ta voiture est sur la bande d’arrêt d’urgence, feux de détresse allumés. Où attends-tu les secours ?'})
p('autoroute', 'Après ce panneau :', {'explication': 'Le panneau bleu d’entrée d’autoroute : piétons, vélos et petits scooters de 50 y sont interdits, comme le demi-tour et la marche arrière. Par temps sec, c’est 130 au maximum.'})
EXP['a10-2'] = 'Gilet enfilé, tout le monde attend derrière la glissière. Le triangle, tu le poses seulement si tu peux le faire sans danger.'

# =============================== 11 · Piétons et enfants ===============================
t('usagers-vulnerables', 0, dire=[('Tu traverses une rue commerçante fréquentée par des piétons.', 'Tu roules dans une rue commerçante pleine de piétons.')])
t('usagers-vulnerables', 1, dire='Laisse passer le piéton qui a commencé à traverser la route. '
                                 'Et aussi celui qui veut traverser : il est au bord, il regarde vers toi, ou il fait un signe. Pas seulement sur le passage piéton.')
t('usagers-vulnerables', 2, dire='Ne pas laisser passer un piéton coûte 135 euros et 6 points. '
                                 'Tu perds autant de points qu’en roulant 50 kilomètres heure au-dessus de la limite. '
                                 'Avec un permis probatoire, tu n’as que 6 points : un seul refus, et tu perds ton permis.')
t('usagers-vulnerables', 3, dire=[('', 'Le triangle avec deux enfants annonce une école ou un parc. Celui avec un piéton annonce un passage piéton.')])
t('usagers-vulnerables', 4, dire=[('', 'Même réflexe derrière un bus arrêté : des piétons peuvent traverser devant lui, passe doucement.')])
t('usagers-vulnerables', 5, eyebrow='Les zones lentes', items_2=['Aire piétonne', 'Au pas, seulement si un panneau t’y autorise'],
  dire=[('L’aire piétonne : on y roule au pas, seulement si l’accès est autorisé, et les piétons sont toujours prioritaires.',
         'L’aire piétonne : tu y entres seulement si un panneau t’y autorise, comme les livreurs, et tu roules au pas, à la vitesse d’une personne qui marche. Les piétons y sont toujours prioritaires.')])
DECOR[('usagers-vulnerables', 5)] = {'kmh': 25}
memo('usagers-vulnerables', ('Piéton engagé', m('Piéton qui traverse ou veut traverser', 'Tu le laisses passer')))
memo_plus('usagers-vulnerables', m('Permis probatoire', 'Un refus de priorité = 6 points : tout ton capital'))
p('usagers-vulnerables', 'Que fais-tu ?', {'explication': 'Tu dois laisser passer le piéton qui montre clairement qu’il veut traverser.'})
p('usagers-vulnerables', 'Ce piéton attend au bord du passage', {'choix': ['m’arrête pour le laisser traverser', 'passe : il n’a pas encore commencé à traverser']})
p('usagers-vulnerables', 'Un ballon traverse la rue. Je :', {'choix': ['freine tout de suite : un enfant peut suivre', 'klaxonne et continue'], 'explication': 'Un ballon annonce souvent un enfant qui court derrière : freine tout de suite.'})
p('usagers-vulnerables', 'Ce piéton traverse en dehors', {'explication': 'Tu laisses passer le piéton qui traverse, même en dehors d’un passage piéton.'})
p('usagers-vulnerables', 'Un piéton attend au bord du trottoir', {'choix': ['passes : il n’a pas encore commencé à traverser', 't’arrêtes pour le laisser passer'],
  'explication': 'Il montre clairement qu’il veut traverser : tu le laisses passer, même s’il n’a pas encore posé le pied sur la route.'})
p('usagers-vulnerables', 'Un piéton manifeste clairement', {'q': 'Un piéton montre clairement qu’il veut traverser. Tu dois :',
  'explication': 'Le piéton qui traverse, ou qui montre qu’il veut traverser, passe avant toi.'})
EXP['uv11-5'] = 'Un ballon qui roule annonce souvent un enfant qui court derrière : freine tout de suite.'

# =============================== 12 · Vélos et trottinettes ===============================
t('cyclistes-edpm', 0, dire=[('Plusieurs mobilités partagent l’espace.', 'Voitures, vélos, trottinettes et piétons se partagent la rue.')])
t('cyclistes-edpm', 1, dire=[('', 'Une trottinette électrique se dépasse de la même façon.'), ('', 'Et à vélo, un enfant de moins de 12 ans doit porter un casque.')])
t('cyclistes-edpm', 3, panneaux=['B22a'], puce='Interdit aux voitures',
  dire='La piste cyclable est réservée aux vélos : tu n’y roules pas et tu ne t’y arrêtes pas. '
       'Au feu, le sas vélo, c’est la case avec un vélo peint au sol, entre deux lignes : arrête-toi à la première ligne que tu rencontres, avant la case. '
       'Certaines rues sont à sens unique pour les voitures, mais à double sens pour les vélos : un petit panneau « sauf vélos » te prévient, des vélos peuvent arriver en face.')
t('cyclistes-edpm', 4, items_1=['25 km/h maximum', 'Elle ne peut pas aller plus vite'], items_3=['Pas sur le trottoir', 'Sauf panneau, et alors au pas'],
  dire='Le code appelle les trottinettes électriques des « EDPM » : engins de déplacement personnel motorisés. '
       'Il faut avoir 14 ans au moins, monter seul, et rouler à 25 kilomètres heure au maximum. '
       'Le trottoir est interdit. Seule exception : un panneau l’autorise, et alors on roule au pas. '
       'Toi, en voiture, tu dépasses une trottinette comme un vélo.')
memo('cyclistes-edpm', ('Dépasser un vélo', m('Dépasser un vélo ou une trottinette', '1 m en agglomération · 1,50 m hors agglomération')),
     ('Piste cyclable obligatoire', m('Piste cyclable obligatoire', 'Réservée aux vélos', 'B22a')))
memo_plus('cyclistes-edpm', m('Casque à vélo', 'Obligatoire avant 12 ans'))
p('cyclistes-edpm', 'Quel réflexe ?', {'choix': ['Accélérer pour passer', 'Rester prêt à freiner : elle peut changer de direction d’un coup', 'L’ignorer'],
  'explication': 'Une trottinette peut changer de direction d’un coup, surtout près d’un passage piéton : reste prêt à freiner.'})
EXP['ce12-5'] = 'Rond bleu avec un vélo : piste obligatoire pour les vélos. Toi, en voiture, tu n’y vas pas.'

# =============================== 13 · Poids lourds, bus et motos ===============================
t('poids-lourds-2rm', 0, sous='les très grands et les très petits')
cours('poids-lourds-2rm', accroche='les très grands et les très petits', resume='Angles morts des camions, bus qui quittent leur arrêt, motos et inter-files.')
t('poids-lourds-2rm', 1, dire='Un camion a 4 grands angles morts : devant, à gauche, à droite et derrière. Le plus grand est à droite : ne reste pas là. '
                              'La règle : pour que le chauffeur te voie, tu dois voir son visage dans son rétroviseur.')
t('poids-lourds-2rm', 2, items_0=['Virages', 'Il prend plus de place : ne reste pas à côté'],
  dire=[('Dans un virage, un camion se déporte : ne te glisse pas à côté de lui.', 'Dans un virage, un camion a besoin de plus de place : il peut venir sur ta voie. Ne reste pas à côté de lui.')])
t('poids-lourds-2rm', 4, items_1=['Vitesse trompeuse', 'Elles arrivent plus vite que tu le penses'], items_2=['Inter-files', 'Dans les bouchons : reste bien dans ta voie'],
  dire=[('La circulation inter-files est autorisée sous conditions, entre les deux voies les plus à gauche : ne leur ferme pas la porte.',
         'Dans les bouchons, sur autoroute ou voie rapide, les motos peuvent rouler entre les deux voies de gauche : c’est l’inter-files. Quand une moto arrive derrière toi, reste bien dans ta voie, sans te décaler vers elle.')])
memo('poids-lourds-2rm', ('Camion', m('Camion', 'Vois son visage dans son rétro, sinon il ne te voit pas')))
memo_plus('poids-lourds-2rm', m('Inter-files', 'Motos entre les deux voies de gauche, dans les bouchons'))
p('poids-lourds-2rm', 'Quel danger principal ?', {'choix': ['Ses angles morts et la place qu’il prend dans les virages', 'Ses phares', 'Sa couleur'],
  'explication': 'Un camion a de très grands angles morts, et il prend plus de place dans les virages.'})
p('poids-lourds-2rm', 'En ville, un bus met son clignotant',          # 3e question sur le bus : remplacée par l'inter-files
  {'q': 'Bouchon sur autoroute : une moto arrive entre ta voie et celle de gauche. Tu :', 'choix': ['restes bien dans ta voie', 'te décales pour lui fermer le passage'], 'bonnes': [0], 'mode': 'qcm',
   'explication': 'Dans les bouchons, les motos peuvent rouler entre les deux voies de gauche : c’est l’inter-files. Reste dans ta voie, sans te décaler vers elle.'})
p('poids-lourds-2rm', 'En agglomération, un bus quitte son arrêt', None)
p('poids-lourds-2rm', 'Tu ne vois pas le chauffeur du camion', None)
p('poids-lourds-2rm', 'Si je ne vois pas le chauffeur', {'explication': 'Tu es dans son angle mort : si tu ne vois pas son visage dans son rétroviseur, il ne te voit pas.'})
EXP['pl213-3'] = {'choix': ['reste au centre de sa voie', 'peut prendre de la place sur le côté'], 'explication': 'Dans un virage serré, un camion a besoin de plus de place : il peut venir sur le côté. Ne reste pas à côté de lui.'}

# =============================== 14 · Véhicules prioritaires ===============================
t('vehicules-prioritaires', 0, dire=[('Un véhicule d’intervention approche.', 'Un véhicule prioritaire approche.'),
                                     ('Cours numéro 14 : les véhicules d’urgence.', 'Cours numéro 14 : les véhicules prioritaires.')])
t('vehicules-prioritaires', 1, dire='Police, gendarmerie, pompiers, SAMU, c’est-à-dire les médecins d’urgence : avec feux bleus et sirène à deux tons, ils passent avant tout le monde. '
                                    'Même si ton feu est vert, même si tu as la priorité : tu les laisses passer. '
                                    'Une ambulance privée n’est pas prioritaire, mais tu l’aides aussi à passer.')
t('vehicules-prioritaires', 3, eyebrow='Les gyrophares orange', items_0=['Gyrophare orange', 'Dépanneuse, travaux, convoi très large'],
  dire='Un gyrophare, c’est une lumière qui tourne sur le toit. '
       'Orange, il signale un véhicule lent ou un danger : dépanneuse, engin de chantier, ou convoi exceptionnel, c’est-à-dire un camion très large ou très long. '
       'Ce n’est pas une priorité de passage, mais ralentis et sois prudent.')
memo('vehicules-prioritaires', ('Feu orange tournant', m('Gyrophare orange', 'Prudence, pas de priorité')))
p('vehicules-prioritaires', 'Que fais-tu ?', {'contexte': 'Un véhicule prioritaire arrive avec ses feux bleus et sa sirène.'})
p('vehicules-prioritaires', 'Quel premier réflexe ?', {'contexte': 'Tu entends une sirène, mais tu ne sais pas d’où elle vient.', 'q': 'Que fais-tu d’abord ?',
  'choix': ['Je regarde partout pour la trouver, sans geste brusque', 'J’accélère', 'Je tourne au hasard'], 'bonnes': [0],
  'explication': 'Cherche d’abord d’où vient le véhicule, dans tes rétroviseurs et autour de toi : ensuite seulement, tu lui fais de la place.'})
p('vehicules-prioritaires', 'Au feu rouge, une ambulance arrive', {'choix': ['avancer légèrement si c’est sans danger', 'passer le feu rouge']})
EXP['vp14-4'] = 'Tu peux avancer un peu, seulement pour lui faire de la place et si c’est sans danger. Tu ne passes pas le feu rouge.'
p('poids-lourds-2rm', 'Quel comportement sûr ?', {'contexte': 'Bouchon sur autoroute : une moto remonte entre les deux voies de gauche.',
  'explication': 'Avant de bouger, regarde tes rétroviseurs et ton angle mort : une moto peut arriver entre les files.'})
DECOR[('depassement', 1)] = decale(3, 1)                                # « Personne ne doit déjà te doubler » ajoutée avant le dépassement

# =============================== 15 · Nuit et éclairage (Lucie) ===============================
t('nuit-eclairage', 1, eyebrow='Position et croisement',
  dire='Les feux de position sont les plus faibles : ils n’éclairent pas la route, ils servent à ce qu’on te voie. '
       'La nuit, garé au bord d’une route non éclairée, tu les laisses allumés. '
       'Pour rouler, les feux de croisement éclairent à environ 30 mètres. '
       'Ce sont tes feux de base la nuit, et de jour quand la visibilité baisse.')
t('nuit-eclairage', 2, dire=[('Utilise-les hors agglomération, sur route non éclairée, quand tu n’éblouis personne.', 'Utilise-les seulement sur une route non éclairée, et seulement si tu n’éblouis personne.')])
t('nuit-eclairage', 3, dire=[('Dès qu’une voiture arrive en face, ou que tu en suis une, repasse en feux de croisement.', 'Dès qu’un usager arrive en face, ou que tu suis un véhicule de près, repasse en feux de croisement.')])
DECOR[('nuit-eclairage', 3)] = aide_(0, texte=['Feux de route', 'tu l’éblouis'])
t('nuit-eclairage', 4, items_1=['Brouillard arrière', 'Brouillard ou neige qui tombe, uniquement'],
  dire=[('', 'Et dans le brouillard, jamais de feux de route : leur lumière se reflète, et c’est toi qu’elle éblouit.')])
t('nuit-eclairage', 5, items_0=['30', 'm', 'vus en feux de croisement'], items_1=['49', 'm', 'pour s’arrêter à 70 km/h'],
  dire='À 70 kilomètres heure, ta distance d’arrêt est d’environ 49 mètres, alors que tes feux de croisement n’éclairent qu’à 30 mètres. '
       'En feux de croisement, au-dessus d’environ 50, tu ne peux plus t’arrêter dans la zone éclairée : la nuit, adapte ta vitesse à ce que tu vois.')
DECOR[('nuit-eclairage', 5)] = aide_(1, reac=21, frein=28, textes=[['21 m', 'de réaction'], ['28 m', 'de freinage']])
t('nuit-eclairage', 6, dire=[('Hors agglomération, un gilet réfléchissant change tout.', 'Avec un gilet réfléchissant, tu le vois de bien plus loin. Sans gilet, ralentis et écarte-toi dès que tu le devines.')])
t('nuit-eclairage', 7, stats=[['30', 'm en croisement'], ['100', 'm en route'], ['2', 'feux de brouillard : avant, arrière']])
memo('nuit-eclairage', ('Brouillard arrière', m('Brouillard arrière', 'Brouillard ou neige qui tombe, jamais sous la pluie')),
     ('Route', m('Feux de route', 'Route non éclairée, et personne ébloui')))
memo_plus('nuit-eclairage', m('Feux de position', 'Garé la nuit sur une route non éclairée'))
p('nuit-eclairage', 'Que fais-tu ?', {'contexte': 'Une silhouette sombre apparaît au bord de la route.'})
p('nuit-eclairage', 'Je suis garé la nuit au bord', {'explication': 'La nuit, garé au bord d’une route non éclairée, ta voiture doit rester visible : feux de position allumés.'})
p('nuit-eclairage', 'Sous la pluie, le feu de brouillard arrière est :', None)            # même question que la 10
p('nuit-eclairage', 'La nuit, une voiture arrive en face. Tes feux :',                     # 3e fois « voiture en face »
  {'q': 'Brouillard épais. En plus des feux de croisement, tu peux allumer :', 'choix': ['tes feux de brouillard avant', 'tes feux de route'], 'bonnes': [0],
   'explication': 'Dans le brouillard, les feux de brouillard avant t’aident à voir. Les feux de route, eux, se reflètent sur le brouillard et t’éblouissent.'})
EXP['ne15-5'] = {'choix': ['en ville éclairée', 'sur une route non éclairée, si tu n’éblouis personne'],
                 'explication': 'Les feux de route servent seulement sur une route non éclairée, et seulement si tu n’éblouis personne, ni devant ni en face.'}
EXP['ne15-1'] = 'Environ 30 mètres : c’est pour ça qu’en feux de croisement, tu ralentis la nuit.'

# =============================== 16 · Intempéries ===============================
t('intemperies', 0, dire=[('Elle ne change pas les règles…', 'Elle change les vitesses maximales…'), ('elle change les distances.', 'et surtout les distances.')])
t('intemperies', 1, dire='Sous la pluie, ta distance d’arrêt s’allonge : compte environ une fois et demie celle sur sol sec. '
                         'Les premières gouttes après une période sèche sont les pires : mêlées à la poussière et à l’huile, elles rendent la route savonneuse.')
DECOR[('intemperies', 1)] = {'aides': [{'type': 'bandes', 'reac': 18, 'frein': 36, 'textes': [['18 m', 'de réaction'], ['≈ 36 m', 'de freinage, sol mouillé']]}]}
t('intemperies', 2, items_0=['Ne freine pas', 'Les roues ne touchent plus la route'], items_2=['Tiens le volant droit', 'Jusqu’à ce que les pneus accrochent'],
  dire=[('Ne freine pas fort, lève le pied doucement et tiens le volant droit jusqu’à retrouver l’adhérence.',
         'Ne freine pas, ne donne pas de coup de volant : lève le pied doucement et tiens le volant droit, jusqu’à ce que les pneus accrochent de nouveau la route.')])
t('intemperies', 3, dire='Quand la visibilité tombe sous 50 mètres, c’est 50 maximum, même sur autoroute, même si un panneau indique plus. '
                         'Repère sur autoroute : un trait et un espace de la bande d’arrêt d’urgence font environ 50 mètres. '
                         'Feux de croisement, feux de brouillard, et grandes distances.')
DECOR[('intemperies', 5)] = {'aides': [{'type': 'bandes', 'reac': 12, 'frein': 35, 'textes': [['12 m', 'de réaction'], ['≈ 35 m', 'de freinage, sur neige']]}]}
t('intemperies', 6, dire='Du 1er novembre au 31 mars, dans les communes de montagne signalées par un panneau à l’entrée, ta voiture doit être équipée. '
                         'Soit des pneus hiver ou quatre saisons, marqués d’une montagne avec un flocon. '
                         'Soit des chaînes ou des chaussettes à neige dans le coffre.')
DECOR[('intemperies', 6)] = sans('signaux')             # le panneau « chaînes » (B26) n'est pas celui de la loi montagne
t('intemperies', 7, stats=[['1,5', '× la distance d’arrêt sous la pluie'], ['50', 'km/h si on voit à moins de 50 m'], ['5', 'mois d’équipement hiver']])
memo('intemperies', ('Visibilité < 50 m', m('Visibilité < 50 m', '50 km/h, même sans panneau')))
memo_plus('intemperies', m('Loi montagne', '1er nov. → 31 mars : pneus hiver, ou chaînes dans le coffre'))
p('intemperies', 'Quelle adaptation ?', {'explication': 'Sur route mouillée, tu t’arrêtes sur une distance environ une fois et demie plus longue : garde plus d’écart.'})
p('intemperies', 'Ta voiture part en aquaplaning. Tu :',            # 3 fois l'aquaplaning : place au vent
  {'q': 'Vent fort, tu dépasses un camion. Tu :', 'choix': ['tiens le volant à deux mains et gardes de la marge', 'le serres de près pour aller vite'], 'bonnes': [0],
   'explication': 'Une rafale peut déporter le camion, ou toi en sortant de son abri : volant à deux mains et de la marge.'})
p('intemperies', 'Aquaplaning : le bon réflexe est de :',
  {'q': 'Le 15 décembre, dans une commune de montagne signalée, avec des pneus d’été. Il te faut :', 'choix': ['des chaînes ou des chaussettes dans le coffre', 'rien de spécial'], 'bonnes': [0],
   'explication': 'Du 1er novembre au 31 mars, dans les communes signalées : pneus hiver ou quatre saisons, sinon chaînes ou chaussettes à neige dans le coffre.'})
EXP['i16-1'] = 'Sous la pluie, compte environ une fois et demie ta distance d’arrêt sur sol sec : à 50, environ 38 m au lieu de 25.'

# =============================== 17 · Tunnels, passages à niveau, montagne ===============================
DECOR[('montagne-tunnels-pn', 0)] = acteur(0, type='train')
DECOR[('montagne-tunnels-pn', 2)] = acteur(2, type='train')
t('montagne-tunnels-pn', 1, dire='Au passage à niveau, dès que le feu rouge clignote, tu t’arrêtes : même sans sonnerie, même si les barrières sont encore levées. '
                                 'Et ne t’engage jamais si tu n’es pas sûr de pouvoir dégager la voie de l’autre côté. '
                                 'Sans barrières, le train passe toujours en premier : ralentis, regarde des deux côtés, puis seulement tu t’engages.')
t('montagne-tunnels-pn', 2, items_2=['Prévenir', 'Téléphone d’urgence du passage à niveau, ou 112'],
  dire='Si ta voiture reste bloquée sur les rails : fais sortir tout le monde, et éloignez-vous tous des voies. '
       'Puis préviens : le téléphone d’urgence du passage à niveau s’il y en a un, sinon le 112.')
t('montagne-tunnels-pn', 3, items=[['Feux de croisement', 'Toujours allumés'], ['Distance', 'Au moins deux balises bleues'], ['Toujours interdits', 'Demi-tour, marche arrière'],
                                   ['Dépasser', 'Interdit si un panneau le dit'], ['Incendie', 'On sort à pied par les issues de secours']],
  dire='Dans un tunnel, allume tes feux de croisement. '
       'S’il y a des balises bleues sur la paroi, garde au moins deux balises entre toi et le véhicule devant. '
       'Demi-tour et marche arrière sont toujours interdits ; le dépassement, quand un panneau l’interdit. '
       'Incendie devant toi : range-toi à droite, coupe le moteur, et rejoins à pied l’issue de secours la plus proche.')
t('montagne-tunnels-pn', 4, dire='Sur une route de montagne trop étroite, celui qui descend s’arrête et cède le passage à celui qui monte, en reculant si besoin. '
                                 'Sauf si celui qui monte peut se ranger plus facilement. '
                                 'Pourquoi ? Redémarrer en montée est plus difficile. '
                                 'Entre une voiture et un camion, c’est le plus léger qui manœuvre.')
t('montagne-tunnels-pn', 5, items_0=['Frein moteur', 'Une vitesse plus basse avant la descente'], items_1=['Jamais au point mort', 'Sans vitesse, le moteur ne retient plus rien'],
  dire='En descente, passe une vitesse plus basse : le moteur retient la voiture, c’est le frein moteur. '
       'Repère : prends la vitesse que tu prendrais pour monter cette pente. '
       'Ne roule jamais au point mort, sans vitesse : le moteur ne retiendrait plus rien. '
       'Et freiner sans arrêt fait chauffer les freins, qui perdent leur efficacité.')
memo('montagne-tunnels-pn', ('Feux rouges clignotants', m('Feux rouges clignotants au passage à niveau', 'Arrêt, même barrières levées')),
     ('Route étroite en montagne', m('Route étroite en montagne', 'Celui qui descend cède, et recule si besoin')),
     ('Tunnel', m('Tunnel', 'Feux de croisement, deux balises bleues d’écart, ni demi-tour ni marche arrière')))
p('montagne-tunnels-pn', 'Feux rouges clignotants au passage à niveau, barrières levées',      # même question que la 4
  {'q': 'Un bouchon commence juste après les rails, les barrières sont levées. Tu :', 'choix': ['attends avant les rails', 't’engages : les barrières sont levées'], 'bonnes': [0], 'mode': 'qcm',
   'explication': 'Ne t’engage jamais si tu n’es pas sûr de dégager les rails de l’autre côté : tu attends avant.'})
p('montagne-tunnels-pn', 'En montagne, sur une route étroite, qui recule ?', {'explication': 'Celui qui descend s’arrête et recule si besoin, sauf si celui qui monte peut se ranger plus facilement : redémarrer en montée est plus difficile.'})
p('montagne-tunnels-pn', 'Dans un tunnel, les feux de croisement sont :',                     # même question que la 3
  {'q': 'Dans ce tunnel, aucun panneau n’interdit de dépasser. Tu peux doubler ?', 'choix': ['oui, avec les précautions habituelles', 'non, jamais dans un tunnel'], 'bonnes': [0],
   'explication': 'Dans un tunnel, demi-tour et marche arrière sont toujours interdits ; le dépassement, seulement quand un panneau ou une ligne continue l’interdit.'})
p('montagne-tunnels-pn', 'Les feux rouges du passage à niveau clignotent', {'explication': 'Dès que le feu rouge clignote, tu t’arrêtes : même sans sonnerie, même si les barrières sont encore levées.'})

# =============================== 18 · Fatigue et distractions ===============================
t('fatigue-distractions', 0, dire=[('Une seconde d’inattention à 90, c’est 25 mètres parcourus les yeux fermés.', 'Une seconde d’inattention à 90, c’est 27 mètres parcourus sans regarder la route.')])
DECOR[('fatigue-distractions', 0)] = aide_(0, long=27, texte=['27 m', 'en une seconde, à 90'])
t('fatigue-distractions', 1, items=[['15', 'm', 'à 50 km/h'], ['27', 'm', 'à 90 km/h'], ['39', 'm', 'à 130 km/h']],
  dire=[('En une seconde, tu parcours 14 mètres à 50, 25 mètres à 90 et 36 mètres à 130.', 'En une seconde, tu parcours 15 mètres à 50, 27 à 90 et 39 à 130 : ta vitesse sans le zéro, fois 3, comme au cours 4.')])
DECOR[('fatigue-distractions', 1)] = aide_(0, long=15, texte=['15 m', 'à 50 km/h'], etapes=[{'long': 15, 'texte': ['15 m', 'à 50 km/h']}, {'long': 27, 'texte': ['27 m', 'à 90 km/h']}, {'long': 39, 'texte': ['39 m', 'à 130 km/h']}])
t('fatigue-distractions', 3, titre='Pause et sieste',
  dire=[('Fais une pause toutes les deux heures.', 'Conseil : fais une pause d’au moins un quart d’heure toutes les deux heures, même sans fatigue.')])
t('fatigue-distractions', 4, dire='Le téléphone tenu en main au volant : 135 euros et 3 points, même arrêté à un feu rouge ou dans un bouchon. '
                                  'Les écouteurs, oreillettes et casques sont interdits aussi, avec la même sanction. '
                                  'Le kit mains libres par les haut-parleurs de la voiture reste autorisé, mais il te distrait quand même. '
                                  'Et avec une autre infraction en même temps, un excès de vitesse par exemple, les policiers peuvent te retirer ton permis sur-le-champ.')
t('fatigue-distractions', 5, stats=[['2', 'heures entre deux pauses'], ['15 à 20', 'minutes de sieste'], ['3', 'points pour le téléphone']])
cours('fatigue-distractions', resume='Somnolence, pauses, téléphone et oreillettes : les pièges de l’attention et leurs sanctions.')
memo('fatigue-distractions', ('Kit oreillettes', m('Écouteurs, oreillettes', 'Interdits : 135 € et 3 points')))
memo_plus('fatigue-distractions', m('Haut-parleurs de la voiture', 'Autorisés, mais ils distraient quand même'))
p('fatigue-distractions', 'Tu téléphones avec des oreillettes',                               # même question que la 7
  {'q': 'Arrêté à un feu rouge, tu peux prendre ton téléphone en main ?', 'choix': ['oui, la voiture est arrêtée', 'non'], 'bonnes': [1],
   'explication': 'Même arrêté au feu rouge ou dans un bouchon, tu es encore dans la circulation : téléphone en main interdit. Gare-toi d’abord.'})

# =============================== 19 · Drogues et médicaments ===============================
t('drogues-medicaments', 0, dire=[('Avant de conduire, tu observes une boîte de médicaments et les risques liés aux substances.', 'Avant de prendre le volant, tu regardes la boîte de ton médicament.')])
t('drogues-medicaments', 2, items_0=['2', 'ans', 'de prison au maximum (3 avec de l’alcool)'], items_1=['4 500', '€', 'd’amende au maximum (9 000 avec de l’alcool)'],
  dire=[('', 'C’est un délit : une infraction grave, jugée au tribunal.')])
t('drogues-medicaments', 3, items=[['Niveau 1, jaune', '« Soyez prudent » : lis la notice'], ['Niveau 2, orange', '« Soyez très prudent » : avis d’un médecin ou d’un pharmacien'],
                                   ['Niveau 3, rouge', '« Attention, danger » : ne conduis pas']],
  dire=[('Jaune : sois prudent.', 'Jaune : sois prudent, lis la notice avant de conduire.'), ('Rouge : ne conduis pas.', 'Rouge : ne conduis pas. Ton médecin te dira quand reprendre le volant.')])
memo('drogues-medicaments', ('Pictogramme orange', m('Pictogramme orange', 'Avis d’un médecin ou d’un pharmacien')))
p('drogues-medicaments', 'Le pictogramme est rouge', {'explication': 'Niveau 3, rouge : ne conduis pas. Ton médecin te dira quand reprendre le volant.'})
EXP['dm19-1'] = 'Aucun : contrairement à l’alcool, il n’y a pas de taux toléré. Une simple trace suffit.'
EXP['dm19-2'] = {'choix': ['aucun risque', 'sois très prudent, demande l’avis d’un médecin ou d’un pharmacien'],
                 'explication': 'Pictogramme orange, niveau 2 : sois très prudent, et ne conduis pas sans l’avis d’un médecin ou d’un pharmacien.'}
EXP['dm19-3'] = 'Conduire après des stupéfiants est un délit, une infraction grave jugée au tribunal : 6 points en moins, en plus de l’amende.'

# =============================== 20 · Permis à points ===============================
t('permis-points', 1, dire=[('qui monte à 12 au bout de la période probatoire, si tu ne commets pas d’infraction.', 'qui monte à 12 au bout de la période probatoire, si tu ne perds aucun point.')])
t('permis-points', 2, items=[['Conduite accompagnée', 'Probatoire de 2 ans : +3 points par an'], ['Formation classique', 'Probatoire de 3 ans : +2 points par an']],
  dire='Si tu as fait la conduite accompagnée, ta période probatoire dure 2 ans : plus 3 points par an. '
       'Sinon, elle dure 3 ans : plus 2 points par an. '
       'Toujours à condition de ne commettre aucune infraction qui retire des points.')
t('permis-points', 3, items_1=['Vitesses réduites', '110, 100, et 80 sur les routes à double sens'], items_2=['Disque « A »', 'Obligatoire, à l’arrière'],
  dire='Pendant la période probatoire : alcool limité à 0,2 gramme par litre de sang, autant dire aucun verre. '
       'Vitesses réduites : 110 sur autoroute, 100 sur les routes à chaussées séparées, et 80 sur les routes à double sens, même celles à 90. '
       'Et le disque « A » à l’arrière, obligatoire pendant toute la période probatoire. '
       'À zéro point, ton permis n’est plus valable : tu dois le repasser. Avec 6 points, une seule grosse infraction peut suffire.')
t('permis-points', 4, items=[['6 mois', 'Pour un seul point perdu'], ['2 ou 3 ans', 'Sans perdre de point : capital complet'], ['Stage de sensibilisation', '+4 points, une fois par an au maximum']],
  dire='Un seul point perdu revient après six mois sans perdre de point. '
       'Sinon, tout ton capital revient après 2 ans sans perdre de point, ou 3 ans si ta dernière infraction était un délit ou une amende de 135 euros ou plus. '
       'Un stage de sensibilisation rend 4 points, au maximum une fois par an. '
       'En probatoire, si tu perds 3 points ou plus d’un coup, ce stage devient obligatoire. '
       'Et ton solde de points se consulte sur le site officiel Télépoints.')
memo('permis-points', ('Stage volontaire', m('Stage de sensibilisation', '+4 points, une fois par an · obligatoire si −3 en probatoire')))
memo_plus('permis-points', m('Zéro point', 'Permis plus valable : à repasser'), m('Télépoints', 'Le site officiel de ton solde de points'))
p('permis-points', 'De combien de points dispose-t-il', {'explication': 'Un permis probatoire démarre avec 6 points, qui montent jusqu’à 12 sans perte de points.'})
p('permis-points', 'Quelle démarche ?', {'choix': ['Consulter le site officiel Télépoints', 'Demander à un ami', 'Attendre une infraction'], 'explication': 'Ton solde de points se consulte sur le site officiel Télépoints.'})
p('permis-points', 'Jeune conducteur, tu as bu un verre de vin', {'q': 'Jeune conducteur, tu as bu un verre de vin. Tu peux conduire ?', 'choix': ['Non : un seul verre peut suffire à dépasser 0,2 g/L', 'Oui, un verre est toléré'], 'bonnes': [0],
  'explication': 'En probatoire, la limite est 0,2 g/L : un seul verre peut suffire à la dépasser. Si tu conduis, tu ne bois pas.'})
p('permis-points', 'En période probatoire, ton capital de départ',      # même question que la 1
  {'q': 'En probatoire, tu as 6 points. Tu refuses la priorité à un piéton (6 points). Ton permis :', 'choix': ['n’est plus valable', 'reste valable avec 0 point'], 'bonnes': [0], 'mode': 'qcm',
   'explication': 'À zéro point, le permis n’est plus valable : il faut le repasser. En probatoire, une seule grosse infraction peut suffire.'})
EXP['pp20-2'] = 'Après la conduite accompagnée, la période probatoire dure 2 ans, avec 3 points de plus par an sans en perdre.'
EXP['pp20-4'] = 'Un stage de sensibilisation rend jusqu’à 4 points, une fois par an au maximum. En probatoire, il devient obligatoire si tu perds 3 points ou plus d’un coup.'

# =============================== 21 · S’installer et quitter ===============================
t('poste-conduite', 1, items_0=['Le siège', 'Pédale de gauche au fond, jambe un peu pliée'], items_1=['Le dossier', 'Bras tendus, poignets sur le haut du volant'],
  items_3=['Les rétroviseurs', 'Un petit bout de carrosserie sur les côtés'],
  dire='D’abord le siège : pédale de gauche enfoncée à fond, ou le frein en boîte automatique, ta jambe reste légèrement fléchie. '
       'Puis le dossier : dos collé, bras tendus, tes poignets touchent le haut du volant ; mains sur le volant, tes bras sont alors légèrement pliés. '
       'L’appui-tête, son haut au niveau du haut de ton crâne. '
       'Les rétroviseurs : sur les côtés, un petit bout de ta carrosserie ; au milieu, toute la lunette arrière. '
       'Et la ceinture, bien à plat, sur l’épaule et le bassin.')
t('poste-conduite', 2, dire='Avant de démarrer : rétroviseurs, clignotant, coup d’œil dans l’angle mort, puis tu t’insères sans gêner ceux qui arrivent.')
t('poste-conduite', 3, items_1=['Une vitesse engagée', '1re en montée, marche arrière en descente'], items_3=['Portière', 'Rétroviseur et angle mort avant d’ouvrir'],
  dire='En quittant ta voiture : frein de parking serré, une vitesse engagée, moteur coupé. '
       'En pente : la première en montée, la marche arrière en descente ; en boîte automatique, le levier sur P. '
       'Et avant d’ouvrir : rétroviseur, puis coup d’œil dans l’angle mort. Un cycliste peut arriver.')
DECOR[('poste-conduite', 3)] = decale(1, 1)
memo('poste-conduite', ('Avant de partir', m('Avant de partir', 'Rétroviseur, clignotant, angle mort')))
p('poste-conduite', 'Le haut de l’appui-tête',                          # même question que la 3
  {'q': 'Rétroviseur extérieur bien réglé, tu y vois :', 'choix': ['un petit bout de ta carrosserie', 'surtout ta carrosserie'], 'bonnes': [0],
   'explication': 'Un petit bout de carrosserie te sert de repère ; tout le reste du miroir montre la route derrière toi.'})
EXP['pc21-3'] = 'Si le frein lâche, la vitesse engagée retient la voiture : la première en montée, la marche arrière en descente.'
EXP['pc21-2'] = 'Avant de partir : rétroviseur, clignotant, coup d’œil dans l’angle mort, puis tu t’insères doucement.'
EXP['pc21-4'] = {'q': 'Le siège est bien réglé quand, pédale de gauche enfoncée à fond, ta jambe est :', 'explication': 'Légèrement fléchie : tu gardes de la force et du contrôle sur la pédale.'}

# =============================== 22 · Sécurité des passagers (Bernard) ===============================
t('securite-passagers', 1, items_1=['3', 'points', 'si toi, tu n’es pas attaché'],
  dire='La ceinture est obligatoire à toutes les places. '
       'Si toi, tu ne la boucles pas : 135 euros et 3 points. '
       'Un passager adulte non attaché paie lui-même son amende. '
       'Un passager de moins de 18 ans n’est pas attaché ? C’est toi qui paies les 135 euros, sans perte de points.')
t('securite-passagers', 2, items=[['Moins de 10 ans', 'Siège auto ou rehausseur, à l’arrière'], ['Bébé', 'Dos à la route, le plus longtemps possible'], ['À l’avant, dos à la route', 'Seulement avec l’airbag passager désactivé']],
  dire='Tant qu’il a moins de 10 ans, un enfant voyage dans un siège auto ou un rehausseur adapté à sa taille et à son poids, et à l’arrière, sauf exceptions. '
       'Un bébé voyage dos à la route, le plus longtemps possible. '
       'L’exception la plus courante : un siège bébé dos à la route à l’avant, mais alors l’airbag passager doit être désactivé.')
DECOR[('securite-passagers', 2)] = {'acteurs': []}
t('securite-passagers', 3, items_1=['Plage arrière', 'Le plus sûr : vide'], items_3=['Animaux', 'Attachés ou en cage'],
  dire=[('Rien sur la plage arrière : en cas de choc, chaque objet devient un projectile.', 'Le plus sûr : rien sur la plage arrière, car en cas de choc, chaque objet devient un projectile.'),
        ('Et les animaux voyagent attachés ou en cage.', 'Les animaux voyagent attachés ou en cage : s’ils te gênent pour conduire, c’est une infraction.'),
        ('', 'Et ton chargement ne doit cacher ni ta vue, ni tes feux, ni ta plaque.')])
t('securite-passagers', 4, stats=[['10', 'ans : siège adapté'], ['3', 'points si toi, tu n’es pas attaché']])
memo('securite-passagers', ('Ceinture non bouclée', m('Ceinture non bouclée', 'Toi : 135 € et 3 points · passager mineur : 135 € pour toi, sans points')),
     ('Enfants', m('Enfant de moins de 10 ans', 'Siège adapté, à l’arrière sauf exceptions')))
p('securite-passagers', 'Ton passager de 15 ans', {'explication': 'Pour un passager de moins de 18 ans, c’est toi, le conducteur, qui paies l’amende de 135 €, sans perte de points.'})
p('securite-passagers', 'Que vérifier ?', {'explication': 'Ton chargement doit être bien calé, et ne cacher ni ta vue, ni tes feux, ni ta plaque.'})
p('securite-passagers', 'Quel équipement ?', {'choix': ['Un siège auto ou un rehausseur adapté', 'Aucun équipement à l’arrière', 'La ceinture adulte dans tous les cas'],
  'explication': 'Avant 10 ans, l’enfant voyage dans un siège auto ou un rehausseur adapté à sa taille et à son poids.'})
EXP['sp22-3'] = {'q': 'Jusqu’à quel âge un siège auto ou un rehausseur adapté est-il obligatoire ?', 'explication': 'Jusqu’à 10 ans : avant, la ceinture adulte passe sur le cou et le ventre de l’enfant, et le blesse en cas de choc.'}
EXP['sp22-4'] = {'q': 'Sur la plage arrière, le plus sûr est de poser :', 'explication': 'Le plus sûr, c’est rien : en cas de choc, tout objet devient un projectile.'}

# =============================== 23 · Entretien ===============================
t('entretien', 1, titre='La loi et le bon réflexe', items_1=['1', 'fois par mois', 'la pression, à froid : un conseil'],
  dire='Les pneus doivent avoir au moins 1,6 millimètre de sculpture. '
       'Pour le voir, regarde les témoins d’usure, des petits bourrelets au fond des rainures : s’ils arrivent au niveau du pneu, change-le. '
       'En dessous, c’est une infraction : amende, et ta voiture peut être immobilisée. '
       'Conseil : vérifie la pression une fois par mois, à froid. Un pneu sous-gonflé s’use vite, consomme plus et freine moins bien.')
t('entretien', 2, titre='Une fois par mois', dire=[('Régulièrement : les niveaux', 'Une fois par mois et avant un long trajet : les niveaux'),
                                                  ('', 'Et si la pédale de frein devient molle, ou si la voiture tire d’un côté en freinant, fais contrôler tes freins sans attendre.')])
t('entretien', 3, items_0=['Rouge', 'Alerte : huile, température, freins'], items_1=['Orange', 'Anomalie : fais vérifier rapidement'],
  dire='Au tableau de bord, trois couleurs. '
       'Rouge : une alerte, comme l’huile, la température ou les freins. Arrête-toi dès que possible, en sécurité. Certains rouges sont de simples rappels : ceinture, frein à main, porte ouverte. '
       'Orange : une anomalie, à faire vérifier rapidement. '
       'Vert ou bleu : simple information, par exemple tes feux de route allumés, en bleu.')
t('entretien', 4, dire=[('Mais aucun des deux ne raccourcit miraculeusement la distance d’arrêt.', 'Mais ni l’un ni l’autre ne raccourcit ta distance d’arrêt : garde tes distances.')])
cours('entretien', resume='Pneus, niveaux, freins, éclairage, couleurs des voyants et aides au freinage.', chapitres=['Pneus et niveaux', 'Le tableau de bord'])
memo('entretien', ('Pneus', m('Pneus', 'Sculptures : 1,6 mm de profondeur au minimum')))
p('entretien', 'Quel réflexe ?', {'contexte': 'Le voyant rouge de pression d’huile s’allume.', 'choix': ['S’arrêter en sécurité et lire la notice du véhicule', 'Continuer longtemps', 'Accélérer']})

# =============================== 24 · Aides à la conduite ===============================
t('aides-conduite', 1, items=[['Limiteur de vitesse', 'Il t’empêche d’accélérer au-delà de la vitesse choisie'], ['Régulateur', 'Il maintient la vitesse choisie'],
                              ['Régulateur adaptatif', 'Il garde aussi la distance avec la voiture de devant'], ['Freinage d’urgence automatique', 'Il peut freiner si tu ne réagis pas, sans garantie'],
                              ['Alerte de franchissement de ligne', 'Elle te prévient si tu dérives'], ['Alerte d’angle mort', 'Un voyant s’allume dans le rétro si quelqu’un est caché à côté']],
  dire=[('Le limiteur t’empêche de dépasser une vitesse.', 'Le limiteur t’empêche d’accélérer au-delà de la vitesse choisie, mais en descente, il ne freine pas : surveille ton compteur.'),
        ('', 'Enfin, l’alerte d’angle mort allume un voyant dans le rétroviseur quand quelqu’un est caché à côté de toi.')])
t('aides-conduite', 2, dire=[('Ils peuvent aussi ne pas détecter un piéton, un cycliste ou un obstacle inhabituel.', 'Ils peuvent aussi rater un piéton, un cycliste, un animal ou un objet tombé sur la route.'),
                             ('', 'Sur route mouillée ou enneigée, coupe le régulateur : en aquaplaning, il continuerait d’accélérer.')])
t('aides-conduite', 4, stats=[['6', 'aides à connaître'], ['1', 'règle : tu restes responsable']])
DECOR[('aides-conduite', 3)] = lambda d: d.get('illu') and [it.update(i='🛞') for it in d['illu'].get('items', []) if it.get('i') == '🙌']
memo('aides-conduite', ('Freinage d’urgence', m('Freinage d’urgence automatique', 'Peut freiner, sans garantie')))
p('aides-conduite', 'Le régulateur adaptatif est activé', {'explication': 'Non. Téléphone en main, c’est 135 € et 3 points, régulateur ou pas : tu restes le conducteur.'})
EXP['ac24-4'] = {'q': 'Pour le code de la route, qui répond d’un accident avec une aide activée ?', 'explication': 'C’est toi qui conduis : tu réponds des infractions et de l’accident, même avec une aide activée.'}

# =============================== 25 · Premiers secours ===============================
t('premiers-secours', 0, dire=[('Trois mots, dans cet ordre : protéger, alerter, secourir.', 'Trois mots, dans cet ordre : protéger, alerter, secourir. La loi t’oblige à agir, au minimum en alertant les secours : ne rien faire est un délit, la non-assistance à personne en danger.')])
t('premiers-secours', 1, dire='D’abord, protéger : feux de détresse, gilet enfilé avant de sortir, et le triangle à au moins 30 mètres, avant le virage ou le haut de la côte, si tu peux le poser sans danger. '
                              'Gilet et triangle sont obligatoires à bord : garde le gilet à portée de main. '
                              'Fais mettre tout le monde à l’abri, loin des voitures, derrière la glissière s’il y en a une. Coupe le contact des voitures accidentées, et pas de cigarette.')
t('premiers-secours', 2, dire=[('Le 112 fonctionne partout en Europe.', 'Le 112 fonctionne dans toute l’Union européenne, en France aussi : si tu hésites, fais le 112.')])
t('premiers-secours', 4, dire='Enfin, secourir. '
                              'Ne déplace pas une victime, sauf danger immédiat : un incendie, ou un risque d’être percutée. '
                              'Ne retire jamais le casque d’un motard. '
                              'Un saignement : appuie fort sur la plaie. '
                              'Pour savoir si une victime inconsciente respire, regarde son ventre et sa poitrine se soulever pendant 10 secondes. Si elle respire : position latérale de sécurité, sur le côté, pour qu’elle ne s’étouffe pas. '
                              'Si elle ne respire plus : appuie fort et vite au centre de sa poitrine, et fais chercher un défibrillateur.')
t('premiers-secours', 5, stats=[['3', 'étapes : P, A, S'], ['30', 'm pour le triangle'], ['112', 'dans toute l’Union européenne']])
memo('premiers-secours', ('112', m('112', 'Numéro d’urgence de toute l’Union européenne')))
memo_plus('premiers-secours', m('Gilet et triangle', 'Obligatoires à bord'), m('Ne rien faire', 'Non-assistance à personne en danger : un délit'))
DECOR[('premiers-secours', 2)] = lambda d: d['illu'].update(numeros=[['112', 'Urgences, dans toute l’UE'], ['15', 'SAMU'], ['18', 'Pompiers'], ['17', 'Police, gendarmerie'], ['114', 'Par SMS, sourds et malentendants']])
p('premiers-secours', 'Quel numéro d’urgence européen', {'explication': 'Le 112 permet de joindre les secours dans toute l’Union européenne, en France aussi.'})
p('premiers-secours', 'Le numéro d’urgence européen est :',             # même question que la 2
  {'q': 'Tu appelles les secours. Que donnes-tu en premier ?', 'choix': ['le lieu exact', 'ton nom et ton adresse', 'la marque des voitures'], 'bonnes': [0], 'mode': 'qcm',
   'explication': 'D’abord le lieu exact, pour qu’on te trouve ; puis ce qui s’est passé, le nombre de victimes et leur état, et les dangers.'})
p('premiers-secours', 'Un motard blessé : son casque doit être :',      # même question que la 3
  {'q': 'Une victime saigne beaucoup. Tu :', 'choix': ['appuies fort sur la plaie', 'la fais marcher jusqu’à l’ombre'], 'bonnes': [0], 'mode': 'qcm',
   'explication': 'Un saignement : appuie fort sur la plaie, avec ta main ou un tissu, jusqu’à l’arrivée des secours.'})

# =============================== 26 · Papiers et assurance ===============================
t('papiers-assurance', 1, items_0=['Permis de conduire', 'Papier, ou sur ton téléphone avec France Identité'], items_2=['Assurance', 'Vérifiée par la police dans un fichier national'],
  dire='Lors d’un contrôle : ton permis, en papier ou sur ton téléphone, dans France Identité, l’appli officielle de l’État, et le certificat d’immatriculation, la carte grise. '
       'La police vérifie ton assurance dans un fichier national : plus de carte verte sur le pare-brise. '
       'Pas tes papiers sur toi ? Une petite amende, et quelques jours pour les présenter à la police ou à la gendarmerie. '
       'Tu déménages ? Tu as un mois pour mettre à jour l’adresse de ta carte grise.')
t('papiers-assurance', 2, items_0=['RC', 'minimum', 'la responsabilité civile : les dégâts que tu causes aux autres'],
  dire='Assurer sa voiture est obligatoire, au minimum en responsabilité civile, dite « au tiers » : elle paie les dommages que tu causes aux autres. '
       'Rouler sans assurance est un délit, une infraction grave : amende, jusqu’à 3 750 euros au tribunal, permis suspendu, voiture confisquée.')
t('papiers-assurance', 3, dire='Le premier contrôle technique a lieu dans les six mois qui précèdent les quatre ans de la voiture, puis tous les deux ans. '
                               'Le compte démarre à sa première mise en circulation, écrite sur la carte grise, pas au jour de l’achat. '
                               'En retard ? Amende, et ta voiture peut être immobilisée.')
DECOR[('papiers-assurance', 3)] = lambda d: d['illu']['lignes'][0]['noeuds'].__setitem__(0, ['0', '1re carte grise', 0])
DECOR[('demarches-conducteur', 3)] = lambda d: d['illu']['lignes'][0]['noeuds'].__setitem__(0, ['0', '1re carte grise', 0])
t('papiers-assurance', 4, dire='Après un accrochage sans blessé : remplissez un constat amiable ensemble, sur place. '
                               'Vérifie bien les cases et le croquis avant de signer : après, on ne modifie plus. '
                               'Chacun garde un exemplaire et l’envoie à son assureur sous cinq jours ouvrés, c’est-à-dire cinq jours de semaine, sans les week-ends ni les jours fériés. '
                               'S’il y a un blessé : protège, alerte, et attends la police ou la gendarmerie. Si l’autre refuse le constat, note sa plaque, prends des photos et des témoins.')
memo('papiers-assurance', ('Constat amiable', m('Constat amiable', 'À l’assureur sous 5 jours ouvrés (jours de semaine)')))
p('papiers-assurance', 'Que faut-il pouvoir justifier ?', {'explication': 'Ta voiture doit être assurée : la police le vérifie dans un fichier national, plus besoin de carte verte sur le pare-brise.'})
p('papiers-assurance', 'Le constat amiable doit être envoyé',            # même question que la 3
  {'q': 'Tu achètes une voiture de 3 ans. Son premier contrôle technique a lieu :', 'choix': ['avant ses 4 ans, comptés depuis sa 1re mise en circulation', '4 ans après ton achat'], 'bonnes': [0], 'mode': 'qcm',
   'explication': 'Le compte démarre à la première mise en circulation, écrite sur la carte grise : dans les 6 mois avant ses 4 ans, puis tous les 2 ans.'})
EXP['pa26-2'] = 'Dans les 6 mois avant ses 4 ans, comptés depuis sa première mise en circulation, puis tous les 2 ans.'

# =============================== 27 · Infractions et sanctions ===============================
t('infractions', 1, dire='Les amendes forfaitaires les plus courantes : 35 euros pour la deuxième classe, 68 pour la troisième, 135 pour la quatrième. '
                         'Tu paies vite, elle baisse ; tu tardes, elle monte. '
                         'Exemple, une amende à 135 euros : 90 si tu paies dans les 15 jours, 375 si tu paies trop tard.')
t('infractions', 2, dire='Les retraits les plus fréquents. '
                         '3 points : la ceinture, ou le téléphone tenu en main. '
                         '4 points : un feu rouge ou un stop grillé. '
                         '6 points : refuser le passage à un piéton, ou 50 kilomètres heure de trop. '
                         'Plusieurs infractions en même temps ? Tu perds 8 points au maximum.')
t('infractions', 3, items_0=['1', 'point', 'de 5 à 19 km/h au-dessus'],
  dire='Pour la vitesse : moins de 5 kilomètres heure de trop, une amende, mais aucun point. '
       '1 point de 5 à 19, 2 points de 20 à 29, 3 points de 30 à 39, 4 points de 40 à 49. '
       'À partir de 40 de trop, ton permis peut t’être retiré sur-le-champ. '
       'À 50 de trop ou plus : 6 points, et c’est désormais un délit, plus grave qu’une amende : tribunal, et prison possible. '
       'Les autres délits à connaître : l’alcool à 0,8 gramme ou plus, les stupéfiants, rouler sans assurance. Entre 0,5 et 0,8 gramme, c’est 135 euros et 6 points.')
t('infractions', 4, stats=[['135', '€ : 4e classe'], ['6', 'points au maximum par infraction'], ['8', 'points au maximum d’un coup']],
  dire='Cours terminé. Retiens deux mots : une suspension, ton permis t’est retiré pour un temps ; une annulation, tu dois le repasser. Passe à la pratique pour connaître le prix de chaque infraction.')
memo_plus('infractions', m('Alcool de 0,5 à 0,8 g/L', '135 € et 6 points'), m('50 km/h de trop ou plus', 'Délit, 6 points'), m('Plusieurs infractions d’un coup', '8 points au maximum'))
p('infractions', 'Peux-tu le franchir si personne ne vient ?', {'explication': 'Non. Au rouge, tu t’arrêtes, même si personne ne vient. Seul un agent qui te fait signe peut te faire passer.'})
p('infractions', 'Ne pas respecter un feu rouge retire',                  # même chose que le stop
  {'q': 'Tu commets trois infractions en même temps. Tu perds au maximum :', 'choix': ['6 points', '8 points', '12 points'], 'bonnes': [1], 'mode': 'qcm',
   'explication': 'Pour plusieurs infractions commises en même temps, tu perds 8 points au maximum.'})

# =============================== 28 · Écoconduite ===============================
t('ecoconduite', 1, items_1=['Passer les rapports tôt', 'Vers 2 000 tours en diesel, 2 500 en essence'],
  dire=[('Anticipe : lève le pied tôt plutôt que de freiner tard.', 'Anticipe : lève le pied tôt plutôt que de freiner tard, en gardant ta vitesse passée : le moteur retient la voiture et ne consomme presque rien.'),
        ('Passe les rapports tôt.', 'Passe la vitesse supérieure tôt, vers 2 000 tours en diesel et 2 500 en essence, ou quand le tableau de bord te l’indique.')])
t('ecoconduite', 2, eyebrow='Côté voiture', titre='Les bons réflexes',
  items=[['Pneus bien gonflés', 'Sous-gonflés, ils consomment plus'], ['Coffre de toit retiré', 'Il prend le vent : tu consommes plus'], ['Climatisation', 'Quand il fait très chaud, ou pour désembuer'], ['Moteur coupé', 'Quand tu attends à l’arrêt']],
  dire='Côté voiture : des pneus bien gonflés, et pas de coffre de toit quand il ne sert pas. '
       'La climatisation quand il fait vraiment chaud ou pour désembuer, pas en permanence. '
       'Et quand tu attends à l’arrêt, coupe le moteur.')
DECOR[('ecoconduite', 2)] = {'script': [['p0+2.6', 'ego', {'coffre': False}]]}
t('ecoconduite', 3, stats=[['4', 'gestes en roulant'], ['4', 'réflexes côté voiture']])
p('ecoconduite', 'Pour économiser du carburant, il vaut mieux',           # même chose que la 1
  {'q': 'Sur autoroute, rouler un peu moins vite :', 'choix': ['ne change rien', 'fait baisser la consommation'], 'bonnes': [1], 'mode': 'qcm',
   'explication': 'La consommation grimpe vite avec la vitesse : sur autoroute, rouler un peu moins vite la fait nettement baisser.'})

# =============================== 29 · Véhicules propres (Maya) ===============================
DECOR[('vehicules-propres', 0)] = aide_(1, texte=['Borne de recharge', 'pour recharger la batterie'])
t('vehicules-propres', 1, titre='Six vignettes, de 0 à 5', items_2=['Crit’Air 2 à 5', 'Du moins polluant (2) au plus polluant (5)'],
  dire='Il y a six vignettes Crit’Air, de 0 à 5. '
       '0, la verte, c’est l’électrique. Puis de 1 à 5, du moins au plus polluant : 5, c’est la plus polluante. '
       'Tu commandes la vignette sur le site officiel, puis tu la colles sur ton pare-brise.')
t('vehicules-propres', 2, items_1=['Vignette obligatoire', 'Les plus polluantes sont interdites'],
  dire='ZFE, ça veut dire zone à faibles émissions : une zone où les voitures qui polluent trop n’ont pas le droit de rouler. '
       'Pour y circuler, ta voiture doit avoir sa vignette Crit’Air, et les plus polluantes sont interdites. '
       'Les ZFE existent dans certaines grandes villes, et leurs règles peuvent changer : vérifie celles de ta ville.')
t('vehicules-propres', 3, dire='À basse vitesse, une voiture électrique fait très peu de bruit : les piétons ne l’entendent pas arriver. '
                               'Jusqu’à 20 kilomètres heure environ, elle émet un petit son d’alerte, mais un piéton distrait peut ne pas l’entendre : ralentis et regarde-le.')
t('vehicules-propres', 4, items_1=['Accélération immédiate', 'Appuie doucement'], items_2=['Autonomie', 'Les km possibles, batterie pleine : moins avec le froid'],
  dire='Au volant d’une électrique, quand tu lâches l’accélérateur, la voiture ralentit nettement et recharge sa batterie : c’est le freinage régénératif. '
       'L’accélération est immédiate : appuie doucement. '
       'L’autonomie, c’est le nombre de kilomètres que tu peux faire batterie pleine : elle baisse avec le froid et la vitesse. '
       'Avant un long trajet, repère où tu pourras recharger.')
memo('vehicules-propres', ('ZFE', m('ZFE, zone à faibles émissions', 'Vignette Crit’Air obligatoire, les plus polluantes interdites')))
p('vehicules-propres', 'Pour circuler dans une ZFE', {'mode': 'qcm', 'signaux': None})          # le panneau montré était celui de la zone 30
p('vehicules-propres', 'Que dois-tu vérifier ?', {'contexte': 'Tu arrives à l’entrée d’une ZFE, une zone à faibles émissions.'})

# =============================== 30 · Changer de direction et de voie ===============================
# Une seule méthode, dans le même ordre partout (cours 8, 10, 21, 30, 31) : rétros, clignotant, angle mort, puis on y va si c'est libre.
t('changer-direction-voie', 0, dire=[('Avant de déplacer le volant, il faut préparer la manœuvre : observer, signaler, adapter ta vitesse, puis agir quand la voie est libre.',
                                      'Avant de tourner, il y a 4 étapes, toujours dans le même ordre : les rétros, le clignotant, l’angle mort, puis tu y vas si c’est libre.')])
t('changer-direction-voie', 1, eyebrow='Étape 1 · les rétros',
  dire='Étape 1, les rétros : regarde le rétroviseur du milieu, puis celui du côté où tu vas. Tu vas à droite ? Le rétro du milieu, puis le rétro droit. '
       'Un deux-roues peut se rapprocher sans être encore à ta hauteur.')
t('changer-direction-voie', 2, eyebrow='Étape 3 · l’angle mort',
  dire='Étape 3, l’angle mort : même si le rétroviseur semble libre, un véhicule peut se trouver à côté de toi. '
       'Tourne vite la tête vers ton épaule, du côté où tu vas, puis regarde de nouveau devant toi.')
t('changer-direction-voie', 3, eyebrow='Étape 2 · le clignotant',
  dire='Entre les deux, étape 2, le clignotant : mets-le tôt, avant de ralentir et avant de te placer. '
       'Il prévient les autres, mais ne les oblige jamais à te laisser passer. '
       'Attends un espace suffisant avant de te décaler.')
t('changer-direction-voie', 4, eyebrow='Étape 4 · y aller',
  dire='Étape 4 : quand c’est libre, décale-toi doucement. Garde tes distances devant et derrière. Une fois dans ta nouvelle voie, éteins le clignotant.')
t('changer-direction-voie', 5, dire=[('Laisse-le passer lorsque tu dois lui céder la priorité.', 'Il va tout droit : il passe avant toi. Attends qu’il soit passé pour tourner.')])
t('changer-direction-voie', 6, dire='Pour tourner à gauche, ralentis et serre à gauche de ta voie, près du milieu de la route. '
                                    'Ceux d’en face qui vont tout droit passent avant toi : attends qu’ils soient passés, puis tourne.')
t('changer-direction-voie', 7, dire='Avant chaque changement de direction ou de voie : les rétros, le clignotant, l’angle mort, puis tu y vas seulement si c’est libre. '
                                    'Passe à la pratique pour t’entraîner en situation.')
memo('changer-direction-voie', ('Rétroviseur intérieur', m('Rétroviseur du milieu, puis du côté où tu vas', '1 · les rétros')),
     ('Clignotant assez tôt', m('Clignotant tôt, avant de ralentir', '2 · le clignotant')),
     ('Coup d’œil dans l’angle mort', m('Coup d’œil dans l’angle mort', '3 · tourner la tête')),
     ('Seulement si la voie est libre', m('Seulement si c’est libre', '4 · y aller')))
p('changer-direction-voie', 'Quelle séquence ?', {'choix': ['Tourner sans regarder', 'Clignotant puis déplacement immédiat', 'Rétros, clignotant, angle mort, puis manœuvre si c’est libre'],
  'explication': 'Toujours dans le même ordre : les rétros, le clignotant, l’angle mort, puis tu y vas seulement si c’est libre.'})
# même ordre au cours 10 (insertion sur autoroute)
t('autoroute', 1, dire='Sur la voie d’insertion, accélère jusqu’à la vitesse des autres. '
                       'Rétroviseur, clignotant à gauche, coup d’œil dans l’angle mort, puis glisse-toi dans un espace libre. '
                       'Ceux qui sont déjà sur l’autoroute sont prioritaires : pas d’espace ? Adapte ta vitesse pour en trouver un avant la fin de la voie.')

# =============================== 31 · Se placer sur la chaussée ===============================
t('placement-chaussee', 1, dire='Sur route et sur autoroute, roule sur la voie la plus à droite. '
                                'La voie de gauche sert à dépasser : ensuite, tu reviens à droite. '
                                'En ville, avec plusieurs voies dans ton sens, choisis plutôt ta voie selon ta direction.')
t('placement-chaussee', 2, ch=0, titre='Lire les flèches au sol', dire='À l’approche d’un carrefour, regarde les flèches peintes au sol : à gauche pour tourner à gauche, à droite pour aller tout droit ou à droite. '
                                      'Place-toi à temps, sans traverser plusieurs voies au dernier moment.')
DECOR[('placement-chaussee', 2)] = {'aides': [{'type': 'repere', 'S': 30, 'x': 1.75, 'hauteur': 0.5, 'texte': ['Flèche au sol', 'tout droit ou à droite'], 'p': 0}]}
t('placement-chaussee', 3, ch=0, dire='Une voie de bus est réservée aux bus : même vide, tu n’as pas le droit d’y rouler. Pareil pour une piste cyclable. '
                                      'Regarde les panneaux et les marquages au sol, comme ce « BUS » peint sur la voie.')
DECOR[('placement-chaussee', 3)] = sans('signaux')
t('placement-chaussee', 4, titre='S’insérer sur une autoroute',
  dire='Sur la voie d’insertion, qu’on appelle aussi voie d’accélération, accélère pour rouler à la vitesse des autres. '
       'Rétros, clignotant, angle mort : cède le passage à ceux qui sont déjà sur la voie, puis glisse-toi dans un espace libre. '
       'Ne force jamais ton insertion.')
t('placement-chaussee', 5, dire='Pour prendre une sortie, repère les panneaux assez tôt. '
                                'Mets-toi sur la voie de droite : rétros, clignotant, angle mort. Puis prends la voie de sortie : c’est là que tu ralentis. '
                                'Si tu rates la sortie, continue jusqu’à la suivante.')
t('placement-chaussee', 6, dire='Ce triangle annonce que la route se rétrécit par la gauche : la voie de gauche va s’arrêter. '
                                'Rétros, clignotant, angle mort : puis rabats-toi quand il y a la place. '
                                'Les flèches de rabattement au sol te disent de te rabattre : ta voie va finir, ou une ligne continue arrive.')
t('placement-chaussee', 7, dire='Retiens trois réflexes : je roule à droite, je lis les flèches et les panneaux tôt, et je regarde avant de changer de voie. Place à la pratique.')
cours('placement-chaussee', chapitres=['Choisir sa voie', 'S’insérer et sortir', 'Quand une voie se termine'])
p('placement-chaussee', 'Des flèches de rabattement apparaissent', {'choix': ['accélère pour passer avant tout le monde', 'regarde mes rétros, mets mon clignotant, regarde l’angle mort, puis me rabats quand il y a la place'],
  'explication': 'Les flèches de rabattement te disent de te rabattre : ta voie va finir. Rétros, clignotant, angle mort, puis tu te rabats quand il y a la place.'})

# =============================== 32 · Intersections complexes ===============================
t('intersections-complexes', 1, puce='Feu orange clignotant : il ne donne pas la priorité',
  dire='Un : l’agent qui dirige la circulation. Deux : les feux. Trois : les panneaux. '
       'Quatre : pas d’agent, pas de feu, pas de panneau ? Priorité à droite. '
       'Ici, le feu clignote orange : il ne donne pas la priorité, et sans panneau, c’est la priorité à droite.')
t('intersections-complexes', 3, dire='Toi et la voiture d’en face, vous tournez tous les deux à gauche. '
                                     'S’il y a des marquages au sol, suis-les : ils montrent par où passer. '
                                     'Sans marquage, vous vous contournez : chacun passe derrière l’autre.')
t('intersections-complexes', 4, dire='À l’approche de rails, repère la signalisation et le tramway. '
                                     'Le tramway est prioritaire : il ne peut ni t’éviter, ni s’arrêter vite. Laisse-le passer, et s’il y a des feux, respecte-les. '
                                     'Ne t’avance pas sur les rails si tu risques d’y rester bloqué.')
t('intersections-complexes', 5, dire=[('Et si tu tournes, reste attentif aux usagers qui traversent légalement la chaussée.', 'Et si tu tournes, laisse passer les piétons qui traversent au feu vert.')])
t('intersections-complexes', 6, dire='Un camion garé cache une rue sur ta droite. '
                                     'Pas de panneau : priorité à droite, une voiture peut sortir de cette rue. '
                                     'Ralentis, et avance doucement jusqu’à bien voir la rue.')
t('intersections-complexes', 7, stats=[['4', 'niveaux : agent, feux, panneaux, priorité à droite'], ['1', 'réflexe : ne jamais s’arrêter sur les rails']],
  dire='À chaque carrefour : qui commande ? L’agent, le feu, le panneau, sinon la priorité à droite. Puis : qui croise ta route ? Passe à la pratique pour appliquer cette méthode.')
memo('intersections-complexes', ('Rien du tout', m('Pas d’agent, de feu ni de panneau', 'priorité à droite')))
p('intersections-complexes', 'Quel réflexe ?', {'choix': ['Le dépasser systématiquement', 'S’arrêter sur ses rails', 'Le laisser passer, sans jamais s’arrêter sur ses rails'],
  'explication': 'Le tramway est prioritaire et ne peut pas t’éviter : laisse-le passer, et ne t’arrête jamais sur ses rails.'})
p('intersections-complexes', 'Une camionnette masque la rue', {'q': 'Un camion garé masque la rue à droite. Pas de panneau. Je :'})
p('intersections-complexes', 'La voiture d’en face tourne aussi à gauche', {'explication': 'Suis les marquages au sol s’il y en a. Sans marquage, vous vous contournez : chacun passe derrière l’autre, sans couper sa route.'})

# =============================== 33 · Anticiper les dangers ===============================
t('anticiper-dangers', 0, dire=[('Une balle apparaît près du trottoir.', 'Un ballon roule près du trottoir.'),
                                ('Aucun enfant n’est encore visible, mais cette balle est déjà un indice : quelqu’un peut surgir.', 'Tu ne vois pas d’enfant, mais ce ballon est un indice : un enfant peut courir derrière.')])
t('anticiper-dangers', 1, dire='Regarde loin, regarde les côtés de la route, et regarde tes rétros, chacun à son tour. '
                               'Si tu regardes seulement la voiture devant, tu rates cette biche, là-bas. '
                               'Et dans un virage dont tu ne vois pas la sortie, ralentis avant, pas dedans.')
t('anticiper-dangers', 2, eyebrow='Caché', titre='Un camion garé peut cacher un piéton',
  dire='Un camion garé cache une partie du trottoir. Un piéton pourrait traverser devant lui. '
       'Ralentis, regarde sous le camion, tu peux voir des pieds, et garde le pied prêt à freiner.')
t('anticiper-dangers', 3, dire='Des enfants marchent près de la route. Ils peuvent courir sur la chaussée sans regarder. Ralentis, regarde les trottoirs, et prépare-toi à freiner.')
t('anticiper-dangers', 4, titre='Quand la route glisse',
  dire='La pluie rend la route glissante : les pneus accrochent moins bien, et tu freines plus long. '
       'Roule moins vite, garde plus de distance et évite les gestes brusques. '
       'La limite affichée, c’est un maximum : sous la pluie, roule en dessous.')
DECOR[('anticiper-dangers', 4)] = {'script': [[1.6, 'vitesse', 55, 1.4]]}
t('anticiper-dangers', 5, titre='Garder de l’espace autour de toi',
  dire='Garde un espace libre autour de toi : de quoi t’échapper si ça freine devant. '
       'Tu es dans l’angle mort d’une voiture ? Ralentis, ou dépasse-la franchement. '
       'Plus tu gardes de marge, plus tu peux réagir sans te précipiter.')
t('anticiper-dangers', 6, dire='Une voiture devant freine, un vélo approche et un piéton attend au passage piéton. '
                               'Regarde comment la scène évolue, pas une seule image. '
                               'Le plus urgent ici : la voiture qui freine devant toi. Freine aussi.')
t('anticiper-dangers', 7, dire='Trois étapes : j’observe, je prévois, j’adapte. Je vois le ballon, je pense à l’enfant, je ralentis. Passe à la pratique pour t’entraîner à repérer les risques.')
memo('anticiper-dangers', ('Ballon, portière', m('Ballon, camion garé, voiture qui freine', 'des indices')))
p('anticiper-dangers', 'Une camionnette est garée au bord', {'q': 'Un camion est garé au bord de la rue. Je :'})

# =============================== 34 · Contrôles du véhicule ===============================
t('controles-vehicule', 1, items=[['L’usure', 'Les témoins d’usure : 1,6 mm minimum'], ['Coupures et bosses', 'Un pneu abîmé se remplace'], ['Le sous-gonflage', 'Un pneu écrasé manque d’air'], ['La pression', 'Une fois par mois, pneus froids']],
  dire='Regarde tes pneus : pas de coupure, pas de bosse. '
       'Au fond des creux, il y a des petites bosses : les témoins d’usure. Usé jusqu’à elles ? Il ne reste que 1,6 millimètre : change-le. '
       'Un pneu qui paraît écrasé manque d’air : vérifie la pression une fois par mois, avant de rouler, pneus froids. '
       'Les bons chiffres sont sur une étiquette, souvent dans l’encadrement de la portière.')
t('controles-vehicule', 2, ch=0, dire='Allume tes feux et fais le tour de la voiture : avant, arrière, clignotants. '
                                      'Pour les feux stop, demande à quelqu’un de regarder pendant que tu freines. '
                                      'Des feux en panne t’empêchent de bien voir, et les autres ne comprennent pas ce que tu fais.')
t('controles-vehicule', 3, ch=0, dire='Un pare-brise sale ou des essuie-glaces usés peuvent cacher un danger. '
                                      'Les balais, c’est le caoutchouc des essuie-glaces : s’ils laissent des traces, change-les. '
                                      'En hiver, prends un lave-glace qui ne gèle pas.')
t('controles-vehicule', 4, dire='Sous le capot, les réservoirs ont deux traits : mini et maxi. Le niveau doit être entre les deux. '
                                'Liquide de refroidissement, lave-glace, liquide de frein, et l’huile, à la jauge : le manuel te montre où ils sont.')
t('controles-vehicule', 5, items=[['Rouge', 'Grave : arrête-toi dès que possible'], ['Orange', 'Pas urgent : fais vérifier vite'], ['Vert ou bleu', 'Simple information']],
  dire='Voyant rouge : c’est grave, par exemple l’huile, la température du moteur ou les freins. Arrête-toi dès que tu peux, dans un endroit sûr. '
       'Voyant orange : ce n’est pas urgent, mais fais vérifier vite. '
       'Vert ou bleu, c’est juste une information. Le manuel donne le sens exact de chaque voyant.')
t('controles-vehicule', 6, items_2=['Moteur chaud', 'N’ouvre jamais le bouchon du refroidissement'],
  dire='Même si tout va bien, fais la révision aux dates du carnet d’entretien. Un bruit bizarre ou un voyant ? Fais vérifier sans attendre. '
       'Moteur chaud : n’ouvre jamais le bouchon du liquide de refroidissement. Il est sous pression : il peut jaillir et te brûler.')
DECOR[('controles-vehicule', 6)] = lambda d: d['illu']['items'][2].update(s='ne pas ouvrir')
t('controles-vehicule', 7, stats=[['4', 'choses à vérifier avant de partir'], ['2', 'couleurs qui demandent d’agir']],
  dire='Avant de partir : pneus, feux, vitres, voyants. Et de temps en temps, les niveaux sous le capot. Place à la pratique.')
cours('controles-vehicule', chapitres=['Avant de partir', 'Sous le capot', 'Alertes et entretien'])

# =============================== 35 · Documents et démarches ===============================
t('demarches-conducteur', 1, items_2=['Lors d’un contrôle', 'Permis et carte grise ; l’assurance, dans un fichier'],
  dire='Pour conduire une voiture, il te faut le permis B. Le A, c’est pour les motos, le C pour les camions. '
       'Ta voiture doit avoir une carte grise : son nom officiel, certificat d’immatriculation. '
       'Lors d’un contrôle, tu montres ton permis et ta carte grise ; l’assurance, la police la vérifie dans un fichier.')
t('demarches-conducteur', 2, items_1=['À quoi elle sert', 'Payer les dégâts que tu fais aux autres'],
  dire='Ta voiture doit être assurée. Le minimum s’appelle la responsabilité civile : elle paie les dégâts que tu fais aux autres, par exemple la voiture que tu as abîmée. '
       'Sans assurance, la voiture ne doit pas rouler.')
t('demarches-conducteur', 3, items_0=['Premier contrôle', 'Dans les 6 mois avant ses 4 ans'],
  dire='Le contrôle technique, c’est un centre qui vérifie ta voiture : freins, pneus, feux, pollution. '
       'Le premier se fait dans les 6 mois avant les 4 ans de la voiture, comptés depuis sa première mise en circulation, puis tous les 2 ans. '
       'Il ne remplace pas la révision chez le garagiste.')
t('demarches-conducteur', 4, ch=2)
t('demarches-conducteur', 5, items=[['Cession', '15 jours, en ligne'], ['Carte grise', 'Barrée, datée, signée'], ['Certificat de situation', 'Pour l’acheteur']],
  dire='Tu vends ou tu donnes ta voiture ? C’est une cession. Tu la déclares en ligne, dans les 15 jours. '
       'Tu donnes à l’acheteur la carte grise barrée, datée et signée, et un papier récent qui prouve que la voiture peut être vendue : le certificat de situation administrative.')
t('demarches-conducteur', 6, items_3=['Où', 'En ligne, sur le site officiel de l’État'],
  dire='Tu déménages ? Change l’adresse de ta carte grise dans le mois. Tu achètes ? Mets la carte grise à ton nom, dans le mois aussi. Tu vends ou tu donnes ? Déclare la cession. '
       'Ces démarches se font en ligne, sur le site officiel de l’État : les délais peuvent changer, vérifie-les là-bas.')
t('demarches-conducteur', 7, dire='Quatre choses en règle : permis, carte grise, assurance, contrôle technique. Si tu vends : 15 jours pour déclarer la cession. '
                                  'Tu as vu tout le programme : passe à la pratique, puis place aux examens blancs.')
memo_plus('demarches-conducteur', m('Contrôle technique', '6 mois avant les 4 ans, puis tous les 2 ans'))
EXP['dc35-3'] = {'choix': ['dans les 6 mois avant ses 4 ans', 'à 2 ans', 'à 10 ans'], 'explication': 'Le premier contrôle a lieu dans les 6 mois qui précèdent les 4 ans de la voiture, comptés depuis sa première mise en circulation, puis tous les 2 ans.'}
t('cyclistes-edpm', 3, etiquettes=[['B22a', 'Piste cyclable obligatoire']], sync=None)
t('depassement', 3, etiquettes=[['B3', 'Interdiction de dépasser'], ['A21', 'Débouché de cyclistes']])

# questions de la banque remplacées par une autre question (doublons) : l'explication réécrite de l'ancienne question ne s'applique plus
for _q in ('d02', 'i27-2', 'mtp17-1', 'mtp17-3', 'pp20-1', 'ps25-4', 'pa26-3'): EXP.pop(_q, None)
p('papiers-assurance', 'Après un accrochage, tu dois envoyer ton constat', {'explication': 'Sous 5 jours ouvrés, c’est-à-dire 5 jours de semaine, sans compter les week-ends ni les jours fériés.'})
