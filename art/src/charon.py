"""Charon: Gehenna's doctor, in her clinic. Behind her, the jars of coins,
labelled by year of death."""
from bust import draw_eyes
import math, sys, random
from pix import Layer, hx, ramp, dith, blend

W = H = 96
CX = 48
OUT = sys.argv[1] if len(sys.argv) > 1 else '.'

SKIN = [hx('ffeee0'), hx('f6d9c2'), hx('e9bc9c'), hx('d49c7c')]
BLUSH = hx('f2b6a6')
HAIR = [hx('3e2819'), hx('5a3c26'), hx('7a5234'), hx('9a6c46'), hx('bc8c5e')]
HAIR_LINE = hx('1c120c')
COAT = [hx('22180f'), hx('33261b'), hx('4a3828'), hx('634c37'), hx('7c6148')]
SHIRT = [hx('b5a991'), hx('dcd3c0'), hx('f1ebdf')]
TIE = [hx('2c3a2b'), hx('46593f'), hx('62785a')]
GOLD = [hx('7d5718'), hx('b8892e'), hx('e8c25a'), hx('fff0b0')]
MIRROR = [hx('3c454c'), hx('6a7880'), hx('a6b2ba'), hx('dce4ea'), hx('ffffff')]
INK = hx('1a100c')

rnd = random.Random(4)

# ── background: the clinic shelves ───────────────────────────────────────
bg = Layer(W, H)
WALL = [hx('140e0b'), hx('1c1410'), hx('271c16'), hx('34261d'), hx('443226')]
LAMP = (12, 20)
for y in range(H):
    for x in range(W):
        d = math.hypot(x - LAMP[0], (y - LAMP[1]) * 1.1)
        bg.put(x, y, ramp(x, y, 1 - min(1, d / 95), WALL))

GLASS_T = hx('9fb4b0')
LABEL = [hx('a8977a'), hx('d9cbb0')]
def jar(x0, base, w, h, fill, seed):
    r = random.Random(seed)
    for y in range(base - h, base):
        for x in range(x0, x0 + w):
            c = bg.get(x, y)
            edge = x in (x0, x0 + w - 1)
            if y >= base - int(h * fill):
                # coins: a dithered heap of gold
                t = 0.35 + 0.5 * (1 - (y - (base - h * fill)) / (h * fill + 1)) + r.uniform(-0.25, 0.25)
                c = ramp(x, y, t, GOLD[:3])
            else:
                c = blend(c, GLASS_T, 0.16)
            if edge:
                c = blend(c, GLASS_T, 0.45)
            if x == x0 + 1 and y < base - 2:
                c = blend(c, hx('ffffff'), 0.35)     # glint down the glass
            bg.put(x, y, c)
    for x in range(x0 - 1, x0 + w + 1):               # lid
        bg.put(x, base - h - 1, hx('5a4232')); bg.put(x, base - h - 2, hx('7a5c44'))
    ly = base - h // 2 - 2                             # label, year scrawled on it
    for y in range(ly, ly + 4):
        for x in range(x0 + 1, x0 + w - 1):
            bg.put(x, y, LABEL[1] if y < ly + 3 else LABEL[0])
    for x in range(x0 + 2, x0 + w - 2):
        if r.random() < 0.6:
            bg.put(x, ly + 1 + (x % 2), hx('4a3a2c'))

def shelf(y, x0, x1):
    for x in range(x0, x1):
        bg.put(x, y, hx('6e5038')); bg.put(x, y + 1, hx('4a3424')); bg.put(x, y + 2, hx('2a1c14'))
        bg.put(x, y + 3, blend(bg.get(x, y + 3), hx('000000'), 0.4))

for sy in (30, 60, 90):
    shelf(sy, 0, W)
    x = 2 + (sy // 7) % 4
    i = 0
    while x < W - 6:
        w = rnd.choice((6, 7, 8, 9))
        h = rnd.choice((10, 12, 14, 16))
        if not (24 < x + w // 2 < 72 and sy > 30):    # leave room behind her
            jar(x, sy, w, h, rnd.uniform(0.25, 0.75), sy * 10 + i)
        x += w + rnd.choice((2, 3, 4))
        i += 1

# lamplight glow over everything near the lamp
for y in range(H):
    for x in range(W):
        d = math.hypot(x - LAMP[0], y - LAMP[1])
        if d < 30:
            a = (1 - d / 30) ** 2 * 0.45
            bg.put(x, y, blend(bg.get(x, y), hx('ffb860'), a if dith(x, y, 0.6) else a * 0.6))

# ── Charon ───────────────────────────────────────────────────────────────
fig = Layer(W, H)

def hair_col(x, y, tilt=0.0):
    """Brown hair lit from the lamp on the left; chunky tousled locks."""
    t = 0.62 - (x - CX) / 55 - (y - 36) / 120
    t += 0.17 * math.sin((x + y * 0.45) * 0.8 + tilt) + 0.06 * math.sin(x * 0.31)
    return ramp(x, y, t, HAIR)

# back of the bob: longer on her right (our left), ragged ends
fig.ellipse(CX, 36, 26, 25, lambda x, y, nx, ny: hair_col(x, y))
bob = [(22, 36), (74, 36), (75, 52), (73, 60), (70, 57), (67, 62), (63, 56), (33, 56),
       (31, 64), (28, 60), (25, 68), (22, 62), (19, 66), (20, 50)]
fig.poly(bob, lambda x, y: hair_col(x, y, 0.5))

# coat with a high standing collar
def coat_col(x, y):
    t = 0.62 - (x - 20) / 110 + 0.1 * math.sin(x * 0.35 + y * 0.1)
    return ramp(x, y, t, COAT)
fig.poly([(6, 96), (10, 82), (22, 74), (36, 70), (60, 70), (74, 74), (86, 82), (90, 96)], coat_col)
fig.poly([(34, 60), (41, 64), (42, 78), (36, 80), (30, 72)], lambda x, y: COAT[3] if x < 37 else COAT[2])
fig.poly([(62, 60), (55, 64), (54, 78), (60, 80), (66, 72)], lambda x, y: COAT[1] if x > 59 else COAT[2])
# collar edges: dark seam inside, lamplit rim on top
fig.line(41, 64, 42, 79, COAT[0]); fig.line(55, 64, 54, 79, COAT[0])
fig.line(34, 60, 41, 64, COAT[4]); fig.line(62, 60, 55, 64, COAT[2])
fig.line(30, 72, 36, 80, COAT[0]); fig.line(66, 72, 60, 80, COAT[0])
# buttons
for y in (86, 93):
    fig.put(40, y, GOLD[1]); fig.put(56, y, GOLD[1]); fig.put(40, y - 1, GOLD[2]); fig.put(56, y - 1, GOLD[2])

# neck, shirt collar, tie
fig.poly([(42, 56), (54, 56), (54, 70), (42, 70)],
         lambda x, y: SKIN[2] if y < 63 else (SKIN[1] if x > 50 else SKIN[0]))
for x in range(42, 55):
    for y in range(56, 63):
        if y < 61:
            fig.put(x, y, SKIN[2] if y < 59 else SKIN[1])
fig.poly([(41, 66), (48, 72), (44, 76), (40, 71)], lambda x, y: SHIRT[2] if x < 43 else SHIRT[1])
fig.poly([(55, 66), (48, 72), (52, 76), (56, 71)], lambda x, y: SHIRT[1] if x < 54 else SHIRT[0])
fig.poly([(42, 70), (54, 70), (52, 96), (44, 96)], lambda x, y: SHIRT[1] if x < 49 else SHIRT[0])
fig.stamp(["kTTk", ".TT.", ".tT.", ".tT.", "tTTt", "tTTt", "tTTt", "tTTt",
           "tTTt", "tTTt", "tTTt", "tTTt", "tTTt", "tTTt", "tTTt", "tTTt", "tTTt", "tTTt", "tTTt", "tTTt", "tTTt", "tTTt", "tTTt", "tTTt"],
          {'T': TIE[1], 't': TIE[0], 'k': TIE[2]}, 46, 72)
for y in range(72, 96):    # coat fronts closing over the shirt
    for x in list(range(38, 44 - (96 - y) // 8)) + list(range(53 + (96 - y) // 8, 59)):
        fig.put(x, y, coat_col(x, y))

# the face
def face_hw(y):
    if y < 49:
        return 14.0
    t = min(1.0, (y - 49) / 13.5)
    return max(1.5, 14.0 * (1 - t ** 1.6) ** 0.62)

def skin_col(x, y):
    hw = face_hw(y)
    t = 0.0
    if x - CX > hw - 4: t = 0.5
    if x - CX > hw - 2: t = 0.8
    if y > 57 and abs(x - CX) > hw - 3: t = max(t, 0.45)
    return SKIN[int(t * 2 + 0.5)]   # flat bands: smooth, no speckle

face = [(CX - face_hw(y), y) for y in range(26, 64)] + [(CX + face_hw(y) + 1, y) for y in range(63, 25, -1)]
fig.poly(face, skin_col)
for side in (-1, 1):
    for x in range(CX + side * 10 - 2, CX + side * 10 + 3):
        for y in (51, 52):
            if not (y == 52 and abs(x - (CX + side * 10)) == 2):
                fig.put(x, y, BLUSH)

# eyes: green, half-lidded, sly. Her left brow (our right) arched.
draw_eyes(fig, 'lidded', ('1f4a2a', '3f8a4c', '6cbc6a', 'b8e6a0'), lash='1a100c', lid='c98e74', pupil='10301a', white='f8f2ea')
BROW = HAIR[0]
for x in range(35, 43): fig.put(x, 37, BROW)            # level brow
fig.put(34, 38, BROW)
for i, x in enumerate(range(54, 63)):                    # raised brow
    fig.put(x, 36 - (1 if 2 <= i <= 6 else 0) + (1 if i >= 8 else 0), BROW)
# nose, smirk pulled to one side
fig.put(49, 51, SKIN[2]); fig.put(49, 52, SKIN[3]); fig.put(48, 53, SKIN[2])
LIP = {'a': hx('b0645a'), 'b': hx('d98c80'), 'c': hx('e9a898')}
fig.stamp(["a....", ".aaab", "...c."], LIP, 45, 57)
fig.put(51, 56, hx('c48070'))

# bangs: parted on our left, swept hard across to the right, tousled
from bust import draw_eyes, fringe
fringe(fig, [
    (28, 22, 19, 68, 5.5, 3), (32, 24, 26, 66, 5, 2), (30, 26, 23, 62, 4, 2),
    (66, 22, 75, 62, 5.5, 3), (63, 24, 69, 60, 5, 2), (66, 26, 72, 57, 4, 2),
    (44, 12, 22, 40, 7, 9), (46, 12, 75, 36, 7, 8),
    (37, 14, 28, 50, 4.5, 8), (37, 15, 31, 38, 4, 3),             # her left side, framing
    (38, 14, 39, 30, 4.5, 2), (39, 13, 45, 32, 5, 3), (40, 13, 51, 34, 5.5, 4),
    (42, 12, 57, 35, 5.5, 5), (44, 12, 64, 38, 5, 6), (46, 12, 68, 52, 5, 9),   # swept across, then down past the cheek
], HAIR, SKIN, ring=(17, 205, 340), line=HAIR_LINE)

# head-mirror strap and the mirror itself, tilted up on her brow
for i in range(80):
    t = i / 79
    ang = math.radians(205 + 120 * t)
    fig.put(round(CX + math.cos(ang) * 25), round(37 + math.sin(ang) * 23), hx('2a1d16'))
    fig.put(round(CX + math.cos(ang) * 25), round(38 + math.sin(ang) * 23), hx('46332a'))
MX, MY = 29, 21
fig.ellipse(MX, MY, 9.5, 9.5, MIRROR[0])
def mirror_col(x, y, nx, ny):
    t = 0.55 - nx * 0.45 - ny * 0.45
    return ramp(x, y, t, MIRROR[1:4])
fig.ellipse(MX, MY, 8, 8, mirror_col)
fig.ellipse(MX, MY, 1.6, 1.6, MIRROR[0])                 # the hole in the middle
for (x, y) in ((MX - 4, MY - 4), (MX - 3, MY - 5), (MX - 5, MY - 3), (MX - 4, MY - 5), (MX - 5, MY - 4)):
    fig.put(x, y, MIRROR[4])

# the coin on its chain
for i in range(40):
    t = i / 39
    x = 55 + 9 * t
    y = 72 + 14 * t + 4 * math.sin(t * math.pi)
    if i % 2 == 0:
        fig.put(round(x), round(y), GOLD[2] if i % 4 == 0 else GOLD[1])
CNX, CNY = 65, 90
def coin_col(x, y, nx, ny):
    d = math.hypot(nx, ny)
    if d > 0.78: return GOLD[1] if nx + ny > 0 else GOLD[2]
    return ramp(x, y, 0.65 - (nx + ny) * 0.35, GOLD[1:4])
fig.ellipse(CNX, CNY, 5.5, 5.5, coin_col)
fig.stamp([".k.", "k.k", ".k."], {'k': GOLD[0]}, CNX - 1, CNY - 1)   # stamped mark

fig.outline(HAIR_LINE)

# ── compose ──────────────────────────────────────────────────────────────
out = Layer(W, H)
out.over(bg)
out.over(fig)
# lamplight rim on the left edges of hair and coat
for y in range(H):
    for x in range(W):
        c = fig.get(x, y)
        if c and c != HAIR_LINE and fig.get(x - 1, y) == HAIR_LINE and x < CX:
            out.put(x, y, blend(c, hx('ffc070'), 0.45))

out.save(f'{OUT}/charon_portrait.png')
out.save(f'{OUT}/charon_portrait_8x.png', 8)
# the same portrait without the background
out.save_cutout(f'{OUT}/charon_portrait_transparent.png', fig)
out.save_cutout(f'{OUT}/charon_portrait_transparent_8x.png', fig, 8)
print('ok')
