"""Mitzi, hostess: a party room full of lights, and her hammer propped behind her."""
import math, sys, random
from pix import Layer, hx, ramp, dith, blend
from bust import draw_eyes, W, H, CX, face, neck, eyes, nose, hair_shader, strands, wavy_lock, finish

OUT = sys.argv[1] if len(sys.argv) > 1 else '.'
SKIN = [hx('fdf1ea'), hx('f8dccc'), hx('ecc0a6'), hx('d6a086')]
BLUSH = hx('f3bccb')
HAIR = [hx('3e2450'), hx('5c3876'), hx('7e5098'), hx('a678c2'), hx('d2a6e6')]
LINE = hx('22122c')
BAND = [hx('141016'), hx('2a262e'), hx('4a4650'), hx('6a6670')]
HOOD = [hx('4a4c5e'), hx('686a7e'), hx('8a8c9e'), hx('a8aabb')]
FRILL = [hx('c6c2d2'), hx('e6e3ee'), hx('fbfafd')]
GEM = [hx('2a0f3a'), hx('5a1d78'), hx('9a4ac0'), hx('e0b0ff')]

rnd = random.Random(9)
# ── background: striped plum wallpaper, strings of lights ───────────────
bg = Layer(W, H)
for y in range(H):
    for x in range(W):
        d = math.hypot(x - CX, y - 50)
        t = 1 - min(1, d / 80)
        stripe = (x // 6) % 2 == 0
        stops = [hx('1a1020'), hx('26182e'), hx('34213c'), hx('42294a')] if stripe else \
                [hx('170e1c'), hx('211429'), hx('2d1c35'), hx('3a2442')]
        bg.put(x, y, ramp(x, y, t, stops))
for x in range(W):             # dado rail
    bg.put(x, 70, hx('5a3e3a')); bg.put(x, 71, hx('3a2626'))
    for y in range(72, H):
        bg.put(x, y, ramp(x, y, 0.35 + 0.2 * math.sin(x * 0.2), [hx('140c14'), hx('22161e'), hx('2e1e26')]))

BULBS = [hx('ffd66a'), hx('ff9ec0'), hx('a6e6ff'), hx('c6a6ff')]
lights = []
for row, (y0, sag, ph) in enumerate(((6, 9, 0), (20, 7, 3))):
    for i in range(W + 1):
        x = i
        y = y0 + sag * math.sin((x / W) * math.pi * 2 + ph) ** 2
        bg.put(x, round(y), hx('2e2026'))
        if (i + row * 4) % 8 == 0:
            lights.append((x, round(y) + 2, BULBS[(i // 8 + row) % 4]))
for lx, ly, c in lights:
    for y in range(ly - 6, ly + 7):
        for x in range(lx - 6, lx + 7):
            d = math.hypot(x - lx, y - ly)
            if d < 6 and bg.get(x, y):
                a = (1 - d / 6) ** 2 * 0.5
                bg.put(x, y, blend(bg.get(x, y), c, a if dith(x, y, 0.5) else a * 0.5))
for lx, ly, c in lights:
    bg.put(lx, ly - 1, hx('2e2026')); bg.put(lx, ly, c); bg.put(lx, ly + 1, c)
    bg.put(lx, ly, blend(c, hx('ffffff'), 0.5))

# her hammer, propped behind her shoulder
METAL = [hx('2c2a32'), hx('4a4852'), hx('6e6c78'), hx('9a98a4'), hx('cfcdd8')]
WOOD = [hx('3a2216'), hx('5e3a22'), hx('86583a')]
for y in range(58, H):
    for x in range(11, 16):
        bg.put(x, y, WOOD[2] if x == 12 else (WOOD[0] if x == 15 else WOOD[1]))
for y in range(42, 60):
    for x in range(1, 26):
        edge = x in (1, 25) or y in (42, 59)
        t = 0.75 - (y - 42) / 30 - (x - 1) / 80
        c = METAL[0] if edge else ramp(x, y, t, METAL[1:])
        if x in (6, 7, 19, 20) and not edge:
            c = hx('8a5a9a') if x in (6, 19) else hx('5a3a6a')     # painted bands
        bg.put(x, y, c)
for x in range(2, 25):
    bg.put(x, 43, METAL[4])

# ── Mitzi ────────────────────────────────────────────────────────────────
fig = Layer(W, H)
hair = hair_shader(HAIR, wave=1.1, diag=0.25)
def back_hair(x, y, tilt=0.0):
    return HAIR[max(0, HAIR.index(hair(x, y, tilt)) - 1)]

fig.ellipse(CX, 37, 26, 26, lambda x, y, nx, ny: back_hair(x, y))
for side in (-1, 1):   # the soft puffs at the top of each side
    fig.ellipse(CX + side * 24, 34, 9, 11, lambda x, y, nx, ny: hair(x, y, 1.2))
for y in range(34, H):
    t = (y - 34) / (H - 34)
    hw = 27 + 6 * t + 2.0 * math.sin(y * 0.5)
    for x in range(round(CX - hw), round(CX + hw) + 1):
        fig.put(x, y, back_hair(x, y, 0.4))

# grey hoodie, frilly white collar, drawstrings
def hood_col(x, y):
    return ramp(x, y, 0.7 - (x - 24) / 90 + 0.1 * math.sin(x * 0.45 + y * 0.15), HOOD)
fig.poly([(12, 96), (16, 82), (28, 75), (40, 72), (56, 72), (68, 75), (80, 82), (84, 96)], hood_col)
neck(fig, SKIN)
for i, x in enumerate(range(34, 63, 3)):        # ruffled collar
    fig.ellipse(x + 1, 76 + (1 if i % 2 else 0), 3.2, 3.6,
                lambda xx, yy, nx, ny: FRILL[0] if ny > 0.4 else (FRILL[1] if nx > 0.2 else FRILL[2]))
for x in range(42, 55):                         # choker
    fig.put(x, 68, BAND[0]); fig.put(x, 69, BAND[1])
fig.stamp([".a.", "abc", "bcd", ".b."], {'a': GEM[3], 'b': GEM[1], 'c': GEM[2], 'd': GEM[0]}, 47, 69)
for x0 in (44, 52):                             # drawstrings
    fig.line(x0, 80, x0 - (1 if x0 < 48 else -1), 95, BAND[0])
    fig.put(x0 - (1 if x0 < 48 else -1), 95, BAND[2])

face(fig, SKIN, BLUSH)
for side in (-1, 1):   # stronger blush: she is always mid-laugh
    for x in range(CX + side * 10 - 3, CX + side * 10 + 4):
        if abs(x - (CX + side * 10)) <= 2: fig.put(x, 51, BLUSH)
draw_eyes(fig, 'wide', ('3a4060', '5a6488', '8f9cc0', 'cdd6ec'), lash='0e0a10', lid='c79494', pupil='22263a')
for x in range(35, 42): fig.put(x, 35 - (1 if 36 <= x <= 39 else 0), HAIR[1])
for x in range(55, 62): fig.put(x, 35 - (1 if 57 <= x <= 60 else 0), HAIR[1])
nose(fig, SKIN)
fig.stamp(["kkkkk", "kmmmk", ".kmk."],
          {'k': hx('9a4a5a'), 'm': hx('e07a8a')}, 46, 55)   # open, laughing


# full, choppy fringe: many clumps, tips at uneven lengths
from bust import fringe
fringe(fig, [
    (23, 28, 15, 112, 5, 3, 2.2, 11.0, 1.0),
    (20, 40, 13, 112, 4, 2, 2.2, 11.0, 2.4),
    (73, 28, 81, 112, 5, 3, 2.2, 11.0, 0.6),
    (76, 40, 83, 112, 4, 2, 2.2, 11.0, 1.9),
    (24, 32, 19, 112, 3.8, 1, 1.8, 11.0, 0.4),
    (29, 32, 29, 112, 3.8, 1, 1.3, 11.0, 2.0),
    (72, 32, 77, 112, 3.8, 1, 1.8, 11.0, 1.4),
    (67, 32, 67, 112, 3.8, 1, 1.3, 11.0, 0.2),
    (45, 12, 22, 40, 7, 9), (51, 12, 74, 40, 7, 9),
    (46, 13, 28, 52, 4.5, 9), (51, 13, 68, 52, 4.5, 9),           # framing the face
    (46, 13, 32, 39, 4.5, 6), (51, 13, 64, 39, 4.5, 6),
    # choppy, but stopping above the brows
    (47, 14, 37, 34, 3.8, 2.2), (47, 14, 41, 31, 3.8, 1.4), (48, 14, 45, 34, 3.8, 0.6),
    (48, 14, 49, 31, 3.6, 0.2), (49, 14, 53, 34, 3.8, 0.6), (49, 14, 57, 31, 3.8, 1.4),
    (50, 14, 61, 34, 3.8, 2.2),
], HAIR, SKIN, ring=(17, 205, 335), line=LINE)

# black headband with two cat ears
for i in range(120):
    t = i / 119
    ang = math.radians(205 + 130 * t)
    for r in (24.0, 25.0):
        fig.put(round(CX + math.cos(ang) * r), round(37 + math.sin(ang) * r), BAND[0] if r > 24.5 else BAND[1])
for side in (-1, 1):
    bx = CX + side * 15
    pts = [(bx - 7, 20), (bx + side * 2 - 1, 5), (bx + 7, 18)] if side < 0 else [(bx - 7, 18), (bx + side * 2 + 1, 5), (bx + 7, 20)]
    fig.poly(pts, BAND[0])
    inner = [(bx - 4, 18), (bx + side * 2, 9), (bx + 4, 17)]
    fig.poly(inner, lambda x, y: BAND[2] if (x - bx) * side < 0 else BAND[1])

# the big black bow at her temple
BOW = {'k': BAND[0], 'g': BAND[1], 'G': BAND[2], 'h': BAND[3]}
fig.stamp([
    "kk.......kk",
    "kGkk...kkgk",
    "khGgk.kggGk",
    "kGggkkkgggk",
    "kGgggkggggk",
    "kgggkkkgggk",
    "kggk.k.kggk",
    "kkk.kgk.kkk",
    "....kgk....",
    "...kggk....",
    "...kgk.....",
], BOW, 64, 30)

from bust import shorten_neck
shorten_neck(fig)
res = finish(bg, fig, LINE, rim=lambda x, y: x > CX, rim_col=hx('ffb0d0'), rim_side=1)
res.save(f'{OUT}/mitzi_portrait.png')
res.save(f'{OUT}/mitzi_portrait_8x.png', 8)
# the same portrait without the background
res.save_cutout(f'{OUT}/mitzi_portrait_transparent.png', fig)
res.save_cutout(f'{OUT}/mitzi_portrait_transparent_8x.png', fig, 8)
print('ok')
