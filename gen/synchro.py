"""Synchronise l'image et la voix : pour chaque liste, chaque série de chiffres et chaque groupe de panneaux,
calcule le moment où la voix parle de chaque élément (champ « sync »).
sync[n] = numéro de la phrase + fraction de la phrase (2.4 : à 40 % de la 3e phrase).
Le lecteur fait apparaître (ou met en avant) chaque élément à ce moment-là.
Lance : cd gen && python3 synchro.py            (relecture : où chaque élément tombe)
        cd gen && python3 synchro.py --ecrire   (écrit les « sync » dans content/cours)"""
import json, glob, os, re, sys, unicodedata

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, '..', 'content')
def norm(t): return ''.join(c for c in unicodedata.normalize('NFD', t.lower()) if unicodedata.category(c) != 'Mn').replace('’', "'")
STOP = set('avec dans pour plus sans sous elle elles ils leur leurs tout tous toute toutes etre avoir fait faire cette celui celle ceux mais donc puis quand comme aussi encore entre apres chaque meme jamais toujours votre notre tres bien vers peut doit sont sera seul seule panneau panneaux'.split())
WORD = re.compile(r"[a-z0-9]+(?:,[0-9]+)?")
def stem(w):
    if re.fullmatch(r"[0-9][0-9,]*", w): return w
    w = re.sub(r"(?<=[a-z]{3})[sx]$", '', w)          # pluriels : bébés → bebe, feux → feu
    return w[:5]
def keep(w): return (len(w) >= 4 and w not in STOP) or re.fullmatch(r"[0-9][0-9,]*", w)
def toks(t): return {stem(w) for w in WORD.findall(norm(t)) if keep(w)}
SPLIT = re.compile(r"[^.!?…]+[.!?…]+|[^.!?…]+$")       # même découpage que le lecteur (voice.js)
def sents(t): return [s.strip() for s in SPLIT.findall(t) if s.strip()]

def where(tset, s):
    """position (0..1) du premier mot de la phrase qui correspond à l'élément, ou None"""
    n = norm(s)
    for m in WORD.finditer(n):
        if keep(m.group()) and stem(m.group()) in tset: return m.start() / max(1, len(n))
    return None

def score(title, rest, s):
    st = toks(s); return 2 * len(title & st) + len(rest & st)

def solve(elems, ss, ordered):
    """elems : [(tokens titre, tokens reste)] → [phrase + fraction] ; ordered : l'ordre de l'écran suit l'ordre de la voix"""
    n, m = len(elems), len(ss)
    common = {w for w in set().union(*[t for t, r in elems]) if sum(w in t for t, r in elems) > 1}
    elems = [((t - common) or t, r - common) for t, r in elems]
    sc = [[score(t, r, s) for s in ss] for t, r in elems]
    if ordered:
        best = [[-1e9] * m for _ in range(n)]; prev = [[0] * m for _ in range(n)]
        for k in range(m): best[0][k] = sc[0][k] - k * 0.01
        for i in range(1, n):
            run, arg = -1e9, 0
            for k in range(m):
                if best[i - 1][k] > run: run, arg = best[i - 1][k], k
                best[i][k] = run + sc[i][k] + (k - arg) * (0.01 if sc[i][k] > 0 else -0.01); prev[i][k] = arg
        k = max(range(m), key=lambda j: best[n - 1][j]); out = [0] * n
        for i in range(n - 1, -1, -1): out[i] = k; k = prev[i][k]
    else:
        out = [max(range(m), key=lambda k: (row[k], -k)) for row in sc]
    vals = []
    for i, ((t, r), k) in enumerate(zip(elems, out)):
        f = where(t, ss[k]) if sc[i][k] else None
        if f is None and sc[i][k]: f = where(r, ss[k])
        vals.append(None if f is None else round(k + max(0.0, min(0.9, f - 0.03)), 2))
    # éléments que la voix ne nomme pas : répartis entre leurs voisins
    for i in range(n):
        if vals[i] is not None: continue
        a = next((j for j in range(i - 1, -1, -1) if vals[j] is not None), None)
        b = next((j for j in range(i + 1, n) if vals[j] is not None), None)
        k = out[i]
        lo = vals[a] if a is not None else float(k)
        hi = vals[b] if b is not None else k + 0.9
        if hi < lo: hi = lo
        span = (b if b is not None else n) - (a if a is not None else -1)
        vals[i] = round(lo + (hi - lo) * (i - (a if a is not None else -1)) / span, 2)
    if ordered:
        for i in range(1, n):
            if vals[i] < vals[i - 1]: vals[i] = vals[i - 1]
    return vals, out, sc

# noms des panneaux (signs.js) pour savoir quand la voix parle de chacun
SIGNS = {}
for m in re.finditer(r"(\w+): \[(?:'([^']*)'|v => `([^`]*)`)", open(os.path.join(HERE, '..', 'src', 'app', 'signs.js'), encoding='utf-8').read()):
    SIGNS[m.group(1)] = m.group(2) or m.group(3)
# les mots que la voix emploie pour parler de chaque panneau (en plus de son nom officiel)
ALIAS = {'B14': 'vitesse', 'B33': 'barrée vitesse', 'B31': 'interdictions', 'B40': 'piste', 'B6a1': 'barre une fois', 'B6d': 'croix arrêt',
         'AB6': 'losange', 'AB7': 'barré noir', 'EB10': 'commence nom ville', 'EB20': 'sortie', 'B21a1': 'contourner obstacle', 'B211': 'direction imposée',
         'B22a': 'emprunter voie réservée', 'C1a': 'parking', 'C12': 'sens unique', 'C20a': 'passage', 'AB4': 'stop', 'AB3a': 'cédez',
         'AK5': 'travaux', 'AK14': 'jaune', 'A13a': 'enfant école', 'A13b': 'passage', 'AB1': 'droite', 'AB2': 'prochaine', 'AB25': 'giratoire',
         'B3': 'dépasser', 'B2a': 'tourner', 'A1a': 'virage', 'A4': 'glissante'}
def sign_name(id_):
    b, _, v = id_.partition(':'); n = SIGNS.get(b, '')
    return n.replace('${v || 50}', v or '50') + ' ' + ALIAS.get(b, '')

def elements(s):
    if s['type'] == 'liste':
        return [(toks(it[0] if isinstance(it, list) else it), toks(' '.join(it[1:]) if isinstance(it, list) else '')) for it in s['items']], True
    if s['type'] == 'chiffres':
        return [(toks(f"{it[0]} {it[1] or ''}"), toks(it[2] or '')) for it in s['items']], False
    if s['type'] in ('famille', 'panneaux') and len(s.get('panneaux', [])) >= 2:
        et = s.get('etiquettes') or [[]] * len(s['panneaux'])
        return [(toks(sign_name(p)) | toks(' '.join(str(x) for x in (et[k] or [])[:1])), toks(' '.join(str(x) for x in (et[k] or [])[1:]))) for k, p in enumerate(s['panneaux'])], False
    return None, None

# réglages à la main, quand la voix ne nomme pas les éléments un par un
OVR = {
    'panneaux-12': [0.0, 0.5, 1.0, 1.14, 1.28, 1.42, 1.56],   # « Bravo ! Tu connais les sept règles » : la récap défile pendant la phrase
}
ECRIRE = '--ecrire' in sys.argv
for f in sorted(glob.glob(f'{ROOT}/cours/*.json')):
    c = json.load(open(f, encoding='utf-8')); changed = False
    for i, s in enumerate(c['scenes']):
        el, ordered = elements(s)
        if not el: continue
        ss = sents(s['dire'])
        vals, out, sc = solve(el, ss, ordered)
        named = sum(1 for k, row in zip(out, sc) if row[k])
        # des panneaux que la voix ne nomme pas : on ne force rien (ils restent tous visibles)
        if s['type'] in ('famille', 'panneaux') and named < 2: vals = None
        if f"{c['id']}-{i}" in OVR: vals = OVR[f"{c['id']}-{i}"]
        if not ECRIRE:
            print(f"\n{c['ordre']}-{i} {s['type']} « {s.get('titre', '')} » ({len(ss)} phrases){'' if vals else '  — pas de sync'}")
            labels = s.get('items') or s.get('panneaux')
            for n, (k, row) in enumerate(zip(out, sc)):
                it = labels[n]; txt = ' / '.join(str(x) for x in it if x) if isinstance(it, list) else str(it)
                print(f"   {vals[n] if vals else '-':>5} [{row[k]}] {txt[:52]:52} ← {ss[k][:64]}")
        if vals is None:
            if 'sync' in s: del s['sync']; changed = True
        elif s.get('sync') != vals: s['sync'] = vals; changed = True
    if ECRIRE and changed: open(f, 'w', encoding='utf-8').write(json.dumps(c, ensure_ascii=False, indent=1) + '\n')
