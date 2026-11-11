"""Alice, just arrived: under Gehenna's stone sky, the open watch at her throat."""
import math, sys, random
from pix import Layer, hx, ramp, dith, blend
from bust import draw_eyes, W, H, CX, face, neck, eyes, nose, hair_shader, strands, wavy_lock, finish

OUT = sys.argv[1] if len(sys.argv) > 1 else '.'
SKIN = [hx('fff0e6'), hx('fbdccc'), hx('efc0a8'), hx('d9a088')]
BLUSH = hx('f7bcbc')
HAIR = [hx('a65a70'), hx('cf8496'), hx('e8a6b4'), hx('f7c8d0'), hx('fde4e8')]
LINE = hx('4e2232')
LACE = [hx('a9a2b0'), hx('d4d0da'), hx('f4f2f6')]
BLOUSE = [hx('a8a0b4'), hx('d2ccd8'), hx('eeebf2'), hx('fbfafd')]
GOLD = [hx('8a5c1c'), hx('c8902e'), hx('ecc25e'), hx('fff0b0')]

# ── background: stone sky, stalactites, the town's lights below ─────────
bg = Layer(W, H)
SKY = [hx('120e18'), hx('1b1522'), hx('251c2d'), hx('34283a'), hx('4a3443'), hx('6a4248')]
for y in range(H):
    for x in range(W):
        bg.put(x, y, ramp(x, y, (y / H) ** 1.2 * 0.95, SKY))
rnd = random.Random(2)
def n1(seed):
    r = random.Random(seed); p = [r.random() for _ in range(64)]
    def f(x):
        i = math.floor(x); fr = x - i; s = fr * fr * (3 - 2 * fr)
        return p[i % 64] + (p[(i + 1) % 64] - p[i % 64]) * s
    return f
ceil = n1(5)
ROCK = [hx('1c1622'), hx('2c2333'), hx('3e3246'), hx('54445a')]
for x in range(W):
    h = 8 + ceil(x * 0.12) * 9
    for y in range(int(h) + 1):
        t = 0.35 + 0.4 * math.sin(x * 0.7 + y * 0.9) * 0.5 + (0.3 if y > h - 2 else 0)
        bg.put(x, y, ramp(x, y, 0.6 - (y / h) * 0.4 + 0.15 * math.sin(x * 0.8 + y), ROCK) if y < h - 1 else ROCK[0])
for _ in range(16):
    sx = rnd.randint(0, W - 1); base = int(8 + ceil(sx * 0.12) * 9); ln = rnd.randint(5, 16)
    for i in range(ln):
        w = max(0, round((1 - i / ln) * 2.2))
        for dx in range(-w, w + 1):
            bg.put(sx + dx, base + i, ROCK[0] if dx > 0 else (ROCK[2] if dx < 0 else ROCK[1]))
# far town on both sides of her
TOWN = hx('0e0a12'); WIN = [hx('d9822f'), hx('ffcf6a')]
x = 0
while x < W:
    w = rnd.randint(4, 8); h = rnd.randint(8, 20)
    top = 74 - h
    for xx in range(x, min(W, x + w)):
        for yy in range(top, H):
            bg.put(xx, yy, TOWN)
    if rnd.random() < 0.6:
        for i in range((w + 1) // 2):
            for xx in range(x + i, x + w - i):
                bg.put(xx, top - i, TOWN)
    for wy in range(top + 2, 72, 3):
        for wx in range(x + 1, x + w - 1, 2):
            if rnd.random() < 0.5:
                bg.put(wx, wy, WIN[rnd.random() < 0.6])
    x += w + rnd.randint(0, 2)
for y in range(40, 76):    # haze where the lamps are
    for x in range(W):
        c = bg.get(x, y)
        if c != TOWN and c not in WIN:
            a = (1 - abs(y - 64) / 24) * 0.35
            if a > 0:
                bg.put(x, y, blend(c, hx('7a4a48'), a if dith(x, y, 0.5) else a * 0.5))

# ── Alice ────────────────────────────────────────────────────────────────
fig = Layer(W, H)
hair = hair_shader(HAIR, wave=0.8)
def back_hair(x, y, tilt=0.0):
    c = hair(x, y, tilt)
    i = HAIR.index(c)
    return HAIR[max(0, i - 1)]

# big soft back hair, wider at the bottom, wavy edges
fig.ellipse(CX, 36, 25, 25, lambda x, y, nx, ny: back_hair(x, y))
for y in range(30, H):
    t = (y - 30) / (H - 30)
    hw = 25 + 10 * t + 2.2 * math.sin(y * 0.45)
    for x in range(round(CX - hw), round(CX + hw) + 1):
        fig.put(x, y, back_hair(x, y, 0.3))

# blouse: white, puffed shoulders, gold buttons
def blouse_col(x, y):
    t = 0.75 - (x - 30) / 100 + 0.12 * math.sin(x * 0.5 + y * 0.2)
    return ramp(x, y, t, BLOUSE)
fig.poly([(14, 96), (18, 82), (28, 74), (40, 71), (56, 71), (68, 74), (78, 82), (82, 96)], blouse_col)
for side in (-1, 1):   # puffed sleeves
    fig.ellipse(CX + side * 26, 84, 10, 9, lambda x, y, nx, ny: ramp(x, y, 0.8 - nx * 0.3 - ny * 0.4, BLOUSE))
neck(fig, SKIN)
for side in (-1, 1):   # little rounded collar
    fig.ellipse(CX + side * 5, 74, 7, 4, lambda x, y, nx, ny: BLOUSE[0] if ny > 0.5 else BLOUSE[3])
for y in (80, 86, 92):
    fig.put(48, y, GOLD[2]); fig.put(49, y, GOLD[1]); fig.put(48, y + 1, GOLD[1]); fig.put(49, y + 1, GOLD[0])

face(fig, SKIN, BLUSH)
draw_eyes(fig, 'wide', ('1f5f70', '2f8fa2', '5fc4d2', 'b4f0f4'), lash='3e1c28', lid='e0a4a0', pupil='123a46')
for x in range(35, 42): fig.put(x, 36 - (1 if 37 <= x <= 39 else 0), HAIR[1])
for x in range(55, 62): fig.put(x, 36 - (1 if 57 <= x <= 59 else 0), HAIR[1])
nose(fig, SKIN)
fig.stamp([".a.", "aba", ".a."], {'a': hx('c06a6e'), 'b': hx('7a3640')}, 47, 57)   # a small 'oh'


# fringe: soft clumps from a centre part, curling in toward the face
from bust import fringe
fringe(fig, [
    (24, 26, 15, 112, 5, 3, 2.4, 9.0, 1.1),
    (21, 38, 12, 112, 4, 2, 2.4, 9.0, 2.6),
    (72, 26, 81, 112, 5, 3, 2.4, 9.0, 0.3),
    (75, 38, 84, 112, 4, 2, 2.4, 9.0, 1.8),
    (24, 32, 19, 112, 4.2, 1, 2.0, 9.0, 0.0),
    (29, 32, 29, 112, 4.0, 1, 1.4, 9.0, 1.9),
    (72, 32, 77, 112, 4.2, 1, 2.0, 9.0, 2.2),
    (67, 32, 67, 112, 4.0, 1, 1.4, 9.0, 0.7),
    (46, 12, 23, 40, 7, 9), (52, 12, 73, 40, 7, 9),
    (46, 13, 28, 52, 4.5, 9), (52, 13, 68, 52, 4.5, 9),           # framing the face
    (47, 14, 31, 38, 4.5, 6), (51, 14, 65, 38, 4.5, 6),           # parted, sweeping out
    (48, 14, 39, 33, 4, 3), (50, 14, 57, 33, 4, 3),
    (49, 15, 45, 31, 3, 1), (49, 15, 53, 31, 3, 1),
], HAIR, SKIN, ring=(17, 205, 335), line=LINE)

# the white lace headdress, frilled along the top
for i in range(140):
    t = i / 139
    ang = math.radians(198 + 144 * t)
    for r in (23.0, 24.0, 25.0):
        x, y = CX + math.cos(ang) * r, 36 + math.sin(ang) * r
        fig.put(round(x), round(y), LACE[2] if r < 24.5 else LACE[1])
    if i % 7 < 3:      # scallops
        x, y = CX + math.cos(ang) * 26.3, 36 + math.sin(ang) * 26.3
        fig.put(round(x), round(y), LACE[1] if i % 7 else LACE[0])
    if i % 9 == 0:     # lace holes
        x, y = CX + math.cos(ang) * 24, 36 + math.sin(ang) * 24
        fig.put(round(x), round(y), LACE[0])

# the pocket watch on its chain, open, glowing
for i in range(36):
    t = i / 35
    x = 52 + 9 * t; y = 71 + 11 * t + 3 * math.sin(t * math.pi)
    if i % 2 == 0:
        fig.put(round(x), round(y), GOLD[2] if i % 4 == 0 else GOLD[1])
WX, WY = 62, 87
def case(x, y, nx, ny):
    return ramp(x, y, 0.6 - (nx + ny) * 0.4, GOLD)
fig.ellipse(WX, WY, 7.5, 7.5, case)
DIAL = [hx('d8cfb8'), hx('f4ecd4'), hx('fffbea')]
fig.ellipse(WX, WY, 5.6, 5.6, lambda x, y, nx, ny: ramp(x, y, 0.8 - (nx + ny) * 0.3, DIAL))
fig.line(WX, WY, WX - 2, WY - 3, hx('2a1a10')); fig.line(WX, WY, WX + 3, WY - 1, hx('2a1a10'))
for a in range(0, 360, 90):
    fig.put(round(WX + math.cos(math.radians(a)) * 4.6), round(WY + math.sin(math.radians(a)) * 4.6), hx('8a7a60'))
fig.put(WX, WY - 8, GOLD[2]); fig.put(WX, WY - 9, GOLD[1])

res = finish(bg, fig, LINE, rim=lambda x, y: y > 40, rim_col=hx('ffb070'), rim_side=1)
# the dial's glow spilling over her blouse
for y in range(H):
    for x in range(W):
        d = math.hypot(x - WX, y - WY)
        if 7.6 < d < 15 and fig.get(x, y) is not None:
            a = (1 - (d - 7.6) / 7.4) * 0.4
            res.put(x, y, blend(res.get(x, y), hx('fff2c0'), a if dith(x, y, 0.6) else a * 0.5))
res.save(f'{OUT}/alice_portrait.png')
res.save(f'{OUT}/alice_portrait_8x.png', 8)
print('ok')
