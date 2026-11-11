"""Banque de questions des cours 30 à 35 (séries + pratiques). Écrit content/questions/<cours>.json et complète content/series.json.
Les mises en scène 3D de ces questions sont dans pratique.py (QOV). Lance : cd gen && python3 questions35.py && python3 pratique.py"""
import json, os
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'content')
def W(p, d): open(p, 'w', encoding='utf-8').write(json.dumps(d, ensure_ascii=False, indent=1) + '\n')

def Q(cid, pre, items):
    out = []
    for k, it in enumerate(items, 1):
        q, choix, bonnes, exp = it[:4]
        d = {'id': f'{pre}-{k}', 'cours': cid, 'type': 'qcm', 'q': q, 'choix': choix, 'bonnes': bonnes, 'explication': exp}
        if len(it) > 4: d['panneaux'] = it[4]
        out.append(d)
    open(f'{ROOT}/questions/{cid}.json', 'w', encoding='utf-8').write('[\n' + ',\n'.join('  ' + json.dumps(d, ensure_ascii=False) for d in out) + '\n]\n')
    return [d['id'] for d in out]

BANK = {}
BANK['changer-direction-voie'] = ('Regarder, signaler, tourner', Q('changer-direction-voie', 'cdv30', [
    ('Je veux tourner à droite. Avant de me déporter, je regarde :', ['le rétroviseur intérieur', 'le rétroviseur extérieur droit', 'l’angle mort à droite'], [0, 1, 2],
     'Rétroviseur intérieur, rétroviseur du côté de la manœuvre, puis un coup d’œil dans l’angle mort : un deux-roues peut s’y cacher.'),
    ('Mon clignotant est allumé. Les autres usagers doivent me laisser passer :', ['oui', 'non'], [1],
     'Le clignotant annonce ton intention, il ne donne aucune priorité. Tu attends un espace suffisant avant de te déporter.'),
    ('Une voiture roule à ma gauche, légèrement en arrière. Je peux changer de voie maintenant :', ['oui, mon rétroviseur gauche est libre', 'non, elle est peut-être dans mon angle mort'], [1],
     'Un véhicule légèrement en arrière, à côté de toi, se trouve souvent dans l’angle mort : le rétroviseur ne le montre pas.'),
    ('Pour changer de file, je dois :', ['me déporter d’un coup', 'me déporter progressivement', 'garder mes distances devant et derrière'], [1, 2],
     'Un changement de file se fait progressivement, sans couper la route de quelqu’un, en gardant tes distances avec les véhicules devant et derrière.'),
    ('Je tourne à droite. Un cycliste continue tout droit à ma droite :', ['je passe avant lui', 'je le laisse passer'], [1],
     'Le cycliste qui va tout droit garde la priorité sur toi qui tournes : tu le laisses passer avant de couper sa trajectoire.'),
    ('Je veux tourner à gauche. Une voiture arrive en face et va tout droit :', ['je passe en premier, j’ai mis mon clignotant', 'je la laisse passer'], [1],
     'En tournant à gauche, tu coupes la trajectoire de ceux qui viennent en face : tu les laisses passer avant de tourner.'),
    ('Je mets mon clignotant :', ['au moment de tourner le volant', 'suffisamment tôt, avant de ralentir et de me placer'], [1],
     'Le clignotant s’allume assez tôt pour que les autres comprennent ton intention avant que tu ralentisses et que tu te places.'),
]))
BANK['placement-chaussee'] = ('La bonne voie', Q('placement-chaussee', 'pc31', [
    ('Deux voies dans mon sens, circulation normale. Je roule :', ['sur la voie de droite', 'sur la voie de gauche', 'sur n’importe quelle voie'], [0],
     'En circulation normale, tu utilises la voie la plus à droite. La voie de gauche sert surtout à dépasser.'),
    ('Je vais tout droit au prochain carrefour. D’après les flèches, je me place :', ['dans la voie de gauche', 'dans la voie de droite'], [1],
     'La voie de droite porte la flèche tout droit et à droite. La voie de gauche est réservée à ceux qui tournent à gauche.'),
    ('La voie de droite est réservée aux bus et elle est vide. Je peux l’emprunter :', ['oui, puisqu’elle est libre', 'non, elle est réservée'], [1],
     'Une voie réservée reste interdite aux autres véhicules, même vide. Seuls les usagers autorisés par la signalisation l’empruntent.'),
    ('Sur la voie d’insertion, je dois :', ['m’arrêter au bout de la voie', 'adapter ma vitesse à celle du trafic', 'céder le passage aux véhicules déjà sur la chaussée'], [1, 2],
     'Tu accélères pour te rapprocher de la vitesse du trafic et tu cèdes le passage à ceux qui y circulent déjà. On ne s’arrête pas sans nécessité.'),
    ('J’ai manqué ma sortie sur une voie rapide. Je :', ['recule sur la bande d’arrêt d’urgence', 'continue jusqu’à la sortie suivante', 'coupe les voies pour la rattraper'], [1],
     'Marche arrière et changement de voie de dernière minute sont dangereux : tu continues simplement jusqu’à la sortie suivante.'),
    ('Des flèches de rabattement apparaissent dans ma voie. Je :', ['accélère pour passer avant tout le monde', 'contrôle, signale, puis me rabats quand l’espace le permet'], [1],
     'Les flèches de rabattement annoncent la fin de ta voie : rétroviseurs, angle mort, clignotant, puis tu te rabats dans un espace suffisant.'),
    ('Ce panneau m’annonce :', ['une chaussée rétrécie par la gauche', 'un virage à gauche', 'une fin de route prioritaire'], [0],
     'Ce triangle annonce que la chaussée se rétrécit par la gauche : prépare-toi à te rabattre sur la droite.', ['A3b']),
]))
BANK['intersections-complexes'] = ('Carrefours difficiles', Q('intersections-complexes', 'ic32', [
    ('Un agent règle la circulation, mais mon feu est vert. J’obéis :', ['au feu', 'à l’agent'], [1],
     'Les indications de l’agent passent avant les feux, les panneaux et les marquages.'),
    ('Feu orange clignotant, aucun panneau. Je cède le passage :', ['aux véhicules venant de droite', 'à personne : j’ai la priorité'], [0],
     'Un feu orange clignotant ne donne aucune priorité : les règles habituelles s’appliquent, ici la priorité à droite.'),
    ('Je tourne à gauche. En plus des voitures d’en face, je surveille :', ['les piétons qui traversent la rue où je vais', 'les cyclistes qui viennent en face', 'seulement mon rétroviseur'], [0, 1],
     'En tournant, tu croises aussi la route des piétons qui traversent la rue où tu entres et des cyclistes venant d’en face.'),
    ('Un tramway arrive au carrefour. Je :', ['passe avant lui s’il est encore loin', 'le laisse passer', 'peux m’arrêter sur les rails en attendant'], [1],
     'Le tramway est en général prioritaire et ne peut pas t’éviter. Laisse-le passer et ne t’arrête jamais sur les rails.'),
    ('Mon feu est vert, mais la file est arrêtée juste après le carrefour. Je :', ['m’engage quand même, j’ai le vert', 'attends avant le carrefour pour ne pas le bloquer'], [1],
     'Même au vert, tu ne t’engages pas si tu risques de rester bloqué au milieu du carrefour et de gêner la circulation transversale.'),
    ('Une camionnette masque la rue à droite. Pas de panneau. Je :', ['garde ma vitesse', 'ralentis et avance prudemment pour mieux voir', 'cède le passage à droite'], [1, 2],
     'Sans visibilité, tu ralentis pour pouvoir t’arrêter. Sans panneau, la priorité à droite s’applique : un véhicule peut surgir de la rue masquée.'),
    ('La voiture d’en face tourne aussi à gauche. Je :', ['observe le marquage et évite de couper sa trajectoire', 'passe le plus vite possible'], [0],
     'Quand deux véhicules face à face tournent à gauche, le marquage et la forme du carrefour guident les trajectoires : on ne se coupe pas la route.'),
]))
BANK['anticiper-dangers'] = ('Voir venir le danger', Q('anticiper-dangers', 'ad33', [
    ('Un ballon traverse la chaussée. Je m’attends à :', ['rien de particulier', 'voir un enfant surgir'], [1],
     'Le ballon est un indice : un enfant peut courir derrière sans regarder. Ralentis et prépare-toi à t’arrêter.'),
    ('Une camionnette est garée au bord de la rue. Je :', ['ralentis et augmente mon attention', 'klaxonne et garde ma vitesse'], [0],
     'Un véhicule garé masque le trottoir : un piéton peut surgir devant lui. Ralentis et garde une marge pour réagir.'),
    ('En roulant, je regarde surtout :', ['le véhicule juste devant moi', 'loin devant, les abords et mes rétroviseurs, à tour de rôle'], [1],
     'Un regard qui balaye loin, près, sur les côtés et dans les rétroviseurs repère les dangers avant qu’ils n’arrivent.'),
    ('Il commence à pleuvoir. Je :', ['garde ma vitesse : la limite n’a pas changé', 'réduis mon allure', 'augmente mes distances'], [1, 2],
     'Sur chaussée mouillée, l’adhérence baisse et le freinage s’allonge : moins vite, plus de distance. La limite affichée reste un maximum.'),
    ('Je roule à hauteur d’une voiture, dans son angle mort. Je :', ['reste à sa hauteur', 'évite d’y rester : je ralentis ou je la dépasse franchement'], [1],
     'Dans l’angle mort d’un autre véhicule, son conducteur ne te voit pas : ne t’y attarde pas, garde une porte de sortie.'),
    ('Près d’une école, des enfants marchent sur le trottoir. Je :', ['ralentis et surveille les abords', 'garde ma vitesse : ils sont sur le trottoir'], [0],
     'Le comportement d’un enfant est imprévisible : même sur le trottoir, il peut traverser sans regarder.'),
    ('La voiture devant moi freine fort sans raison visible. Je pense d’abord :', ['qu’elle fait une erreur', 'qu’il y a peut-être un danger que je ne vois pas encore'], [1],
     'Un freinage devant toi est un indice : piéton, obstacle, animal… Ralentis aussi et cherche la cause.'),
]))
BANK['controles-vehicule'] = ('Contrôles avant de partir', Q('controles-vehicule', 'cv34', [
    ('Je contrôle la pression des pneus de préférence :', ['à froid', 'après un long trajet'], [0],
     'La pression se mesure pneus froids, selon les valeurs indiquées par le constructeur du véhicule.'),
    ('Un pneu présente une coupure sur le flanc. Je :', ['roule doucement jusqu’au prochain contrôle technique', 'le fais remplacer'], [1],
     'Une coupure ou une déformation fragilise le pneu : il peut éclater. Fais-le vérifier et remplacer sans attendre.'),
    ('Un voyant rouge s’allume en roulant. Je :', ['continue jusqu’à destination', 'm’arrête dès que possible, en sécurité'], [1],
     'Rouge, c’est une alerte : une anomalie grave peut endommager le véhicule ou te mettre en danger. Arrête-toi dès que possible, là où c’est sûr.'),
    ('Mes essuie-glaces laissent des traces sur le pare-brise. Je :', ['change les balais', 'attends qu’ils cassent'], [0],
     'Des balais usés laissent des traces qui masquent la route, surtout de nuit et sous la pluie : remplace-les.'),
    ('Le moteur est chaud. Je peux ouvrir le bouchon du liquide de refroidissement :', ['oui', 'non'], [1],
     'Circuit chaud, liquide sous pression : il peut jaillir et te brûler. On ne l’ouvre que moteur froid.'),
    ('Avant de partir, je vérifie que fonctionnent :', ['les feux et les clignotants', 'les feux stop', 'l’autoradio'], [0, 1],
     'Feux, clignotants et feux stop te permettent de voir et d’être vu : les autres comprennent tes intentions.'),
    ('Un voyant orange s’allume. Je :', ['fais vérifier le véhicule rapidement', 'l’ignore, ce n’est pas rouge'], [0],
     'Orange signale une anomalie : ce n’est pas une urgence absolue, mais fais vérifier rapidement le véhicule.'),
]))
BANK['demarches-conducteur'] = ('Papiers et démarches', Q('demarches-conducteur', 'dc35', [
    ('Pour conduire une voiture, il faut le permis de catégorie :', ['A', 'B', 'C'], [1],
     'La catégorie B permet de conduire une voiture. A concerne les motos, C les poids lourds.'),
    ('L’assurance minimale obligatoire d’une voiture est :', ['la responsabilité civile', 'la tous risques', 'l’assurance vol'], [0],
     'La responsabilité civile est obligatoire : elle indemnise les dommages que tu causes aux autres.'),
    ('Le premier contrôle technique d’une voiture a lieu :', ['avant ses 4 ans', 'à 2 ans', 'à 10 ans'], [0],
     'Le premier contrôle a lieu dans les 6 mois qui précèdent les 4 ans de la voiture, puis tous les 2 ans.'),
    ('Je vends ma voiture de 6 ans à un particulier. Le contrôle technique doit dater de moins de :', ['6 mois', '1 an', '2 ans'], [0],
     'Pour vendre à un particulier une voiture de plus de 4 ans, le procès-verbal de contrôle technique doit dater de moins de 6 mois.'),
    ('Après une vente, je déclare la cession dans un délai de :', ['15 jours', '3 mois'], [0],
     'Le vendeur déclare la cession en ligne dans les 15 jours. Il remet aussi la carte grise barrée, datée et signée.'),
    ('J’achète une voiture d’occasion. Pour l’immatriculer à mon nom, j’ai :', ['1 mois', '1 an'], [0],
     'L’acheteur a un mois pour faire établir le certificat d’immatriculation à son nom.'),
    ('Je déménage. Ma carte grise :', ['doit être mise à jour avec ma nouvelle adresse', 'reste valable sans démarche'], [0],
     'Un changement d’adresse se déclare pour mettre à jour le certificat d’immatriculation, dans le mois qui suit.'),
]))

S = json.load(open(f'{ROOT}/series.json', encoding='utf-8'))
S = [s for s in S if s['cours'] not in BANK]
for cid, (titre, ids) in BANK.items(): S.append({'id': 'serie-' + cid, 'titre': titre, 'cours': cid, 'questions': ids})
W(f'{ROOT}/series.json', S)
print(len(S), 'séries')
