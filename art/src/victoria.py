"""Victoria, who steps first: on the broken walls of the Abandoned Fort, spear in hand."""
import math, sys, random
from pix import Layer, hx, ramp, dith, blend
from bust import draw_eyes, W, H, CX, face, neck, eyes, nose, hair_shader, strands, wavy_lock, finish

OUT = sys.argv[1] if len(sys.argv) > 1 else '.'
SKIN = [hx('fff0e6'), hx('f7dccb'), hx('eac0a4'), hx('d29e84')]
BLUSH = hx('f0c0b8')
HAIR = [hx('3a0614'), hx('5a1226'), hx('7c2840'), hx('9c4860'), hx('ba6c84')]
LINE = hx('1e0308')
LACE = [hx('0c0a0e'), hx('1e1b22'), hx('34303a'), hx('4c4854')]
RED = [hx('4a060c'), hx('8c1018'), hx('c8242c'), hx('f06a5a')]
CREAM = hx('e8e0c4')

rnd = random.Random(3)
# ── background: the fort's broken battlements under a dull red glow ─────
bg = Layer(W, H)
SKY = [hx('100a10'), hx('1a0f16'), hx('26141c'), hx('361a22'), hx('4a2228'), hx('64302e')]
for y in range(H):
    for x in range(W):
        bg.put(x, y, ramp(x, y, (y / 70) ** 1.4, SKY))
STONE = [hx('17121a'), hx('221a24'), hx('2f2530'), hx('3e323c')]
def wall(x0, x1, top, merlon=6, gap=5, broken=()):
    for x in range(x0, x1):
        k = (x - x0) % (merlon + gap)
        t = top if k < merlon else top + 6
        for b0, b1, dy in broken:
            if b0 <= x < b1:
                t = top + dy + (x * 7 % 3)
        for y in range(t, H):
            c = ramp(x, y, 0.55 - (y - t) / 80 + 0.15 * math.sin(x * 0.9), STONE)
            if (y - t) % 5 == 0 or ((x + ((y - t) // 5) * 4) % 9 == 0):
                c = STONE[0]          # mortar
            if y == t:
                c = blend(c, hx('a05040'), 0.35)   # glow catching the top edge
            bg.put(x, y, c)
wall(0, 30, 52, broken=((14, 22, 5),))
wall(66, 96, 48, broken=((82, 90, 8),))
# a torn banner on a pole, far back
for y in range(14, 52): bg.put(9, y, hx('2a1c18'))
for y in range(15, 34):
    for x in range(10, 10 + max(1, 9 - (y - 15) // 4 - (2 if y % 7 == 0 else 0))):
        bg.put(x, y, ramp(x, y, 0.5 + 0.3 * math.sin(y * 0.6 + x * 0.3), [hx('3a0a12'), hx('5a1420'), hx('7a2230')]))
# ash drifting
for _ in range(26):
    x, y = rnd.randrange(W), rnd.randrange(60)
    bg.put(x, y, hx('7a5050') if rnd.random() < 0.6 else hx('b07a60'))

# her spear, upright beside her
for y in range(10, H):
    for x in range(81, 84):
        bg.put(x, y, [hx('8a6040'), hx('5e3e28'), hx('3a2416')][x - 81])
for y in (40, 41, 58, 59):
    for x in range(80, 85): bg.put(x, y, hx('3a2a2e'))
BLADE = [hx('2e2c36'), hx('6a6878'), hx('a8a6b6'), hx('e6e4f0')]
for y in range(0, 14):
    hw = 3.6 * math.sin(min(1, (y + 1) / 13) * math.pi * 0.9) + 0.3
    for x in range(round(82 - hw), round(82 + hw) + 1):
        bg.put(x, y, BLADE[0] if abs(x - 82) >= hw - 0.5 else (BLADE[3] if x < 82 else BLADE[1] if x > 82 else BLADE[2]))
for x in range(78, 87): bg.put(x, 14, hx('3a2a2e')); bg.put(x, 15, hx('5a4448'))
for y in range(15, 26):          # a red ribbon tied below the blade
    bg.put(84 + (y - 15) // 4, y, RED[1]); bg.put(85 + (y - 15) // 4, y, RED[0])

# ── Victoria ─────────────────────────────────────────────────────────────
fig = Layer(W, H)
hair = hair_shader(HAIR, wave=1.0)
def back_hair(x, y, tilt=0.0):
    return HAIR[max(0, HAIR.index(hair(x, y, tilt)) - 2)]

fig.ellipse(CX, 37, 25, 26, lambda x, y, nx, ny: hair(x, y))
fig.poly([(23, 37), (73, 37), (77, 96), (19, 96)], lambda x, y: hair(x, y, 0.3))
# the dark inside of the hair, framing her neck
fig.poly([(32, 50), (64, 50), (66, 80), (30, 80)], lambda x, y: back_hair(x, y))

# bare shoulders, black lace bodice
from bust import SHOULDERS
fig.poly(SHOULDERS,
         lambda x, y: SKIN[1] if x > 66 else SKIN[0])
def lace_col(x, y):
    c = ramp(x, y, 0.6 - (x - 30) / 80, LACE)
    if (x + y) % 4 == 0 and y > 82: c = LACE[3]
    if (x - y) % 6 == 0 and y > 84: c = LACE[2]
    return c
fig.poly([(28, 96), (30, 84), (36, 80), (48, 84), (60, 80), (66, 84), (68, 96)], lace_col)
for x in range(30, 67):                      # scalloped neckline
    y = 81 + round(1.5 * abs(math.sin((x - 30) * 0.52))) + (2 if 42 < x < 54 else 0)
    fig.put(x, y, LACE[0]); fig.put(x, y - 1, LACE[2] if x % 3 == 0 else LACE[0])
neck(fig, SKIN, y1=76)
for x in range(44, 53):                      # choker and its red gem
    fig.put(x, 67, LACE[0]); fig.put(x, 68, LACE[2] if x % 2 else LACE[0])
fig.stamp([".a.", "bcb", "dcd", ".d."], {'a': RED[3], 'b': RED[2], 'c': RED[1], 'd': RED[0]}, 47, 69)

face(fig, SKIN, BLUSH)
draw_eyes(fig, 'sharp', ('1c1e3a', '3c4270', '6c74a0', 'aab2d8'), lash='0a080c', lid='c49090', pupil='0e0f20')
for x in range(34, 43): fig.put(x, 35 if x > 36 else 36, HAIR[0])      # straight, serious brows
for x in range(54, 63): fig.put(x, 35 if x < 60 else 36, HAIR[0])
nose(fig, SKIN)
fig.stamp([".bab.", "bcccb", ".bbb."], {'a': RED[0], 'b': RED[2], 'c': RED[1]}, 46, 55)
fig.put(54, 57, hx('3a1a1a'))                # the mole


# blunt fringe: narrow clumps falling almost straight, ending level
from bust import fringe
cl = [(23, 28, 19, 112, 4.5, 3, 0.8, 5, 0.6), (73, 28, 77, 112, 4.5, 3, 0.8, 5, 1.4),
      (25, 32, 23, 112, 4.2, 1, 0.8, 5, 0.0), (29, 34, 30, 112, 3.8, 1, 0.6, 5, 1.0),
      (71, 32, 73, 112, 4.2, 1, 0.8, 5, 2.0), (67, 34, 66, 112, 3.8, 1, 0.6, 5, 0.5),
      (45, 12, 23, 42, 7, 9), (51, 12, 73, 42, 7, 9),
      (45, 12, 28, 54, 4.5, 9), (51, 12, 68, 54, 4.5, 9),          # framing the face
      (46, 13, 32, 41, 4, 6), (50, 13, 64, 41, 4, 6)]
# still blunt, but cut level just above the brows
for i, tx in enumerate(range(35, 63, 4)):
    cl.append((48 + (tx - 48) * 0.2, 13, tx, 34 + (i % 2), 3.4, abs(tx - 48) * 0.22))
fringe(fig, cl, HAIR, SKIN, ring=(17, 205, 335), line=LINE)

# black lace headband with cream flowers
for i in range(130):
    t = i / 129
    ang = math.radians(206 + 128 * t)
    for r in (23.5, 24.5, 25.5):
        fig.put(round(CX + math.cos(ang) * r), round(37 + math.sin(ang) * r), LACE[0] if r != 24.5 else LACE[1])
    if i % 4 == 0:
        fig.put(round(CX + math.cos(ang) * 26.6), round(37 + math.sin(ang) * 26.6), LACE[0])
for ang in (238, 262, 286, 310):
    fx, fy = round(CX + math.cos(math.radians(ang)) * 24.5), round(37 + math.sin(math.radians(ang)) * 24.5)
    fig.stamp([".c.", "cyc", ".c."], {'c': CREAM, 'y': hx('c8a050')}, fx - 1, fy - 1)

# the red rose at her temple, with a hanging pin
ROSE = {'a': RED[3], 'b': RED[2], 'c': RED[1], 'd': RED[0], 'g': hx('2e4a2a')}
fig.stamp([
    ".dccd..",
    "dbaacd.",
    "cabbacd",
    "cbcdbcd",
    "dcbbcdd",
    ".ddcdd.",
    "..gg.g.",
], ROSE, 21, 29)
for y in range(36, 50):
    fig.put(26, y, hx('7a7884') if y % 3 else hx('b0aebb'))
fig.put(26, 50, hx('d0ced8')); fig.put(25, 51, hx('7a7884')); fig.put(27, 51, hx('7a7884'))

from bust import shorten_neck
shorten_neck(fig)
res = finish(bg, fig, LINE, rim=lambda x, y: y > 30, rim_col=hx('e07050'), rim_side=-1)
res.save(f'{OUT}/victoria_portrait.png')
res.save(f'{OUT}/victoria_portrait_8x.png', 8)
# the same portrait without the background
res.save_cutout(f'{OUT}/victoria_portrait_transparent.png', fig)
res.save_cutout(f'{OUT}/victoria_portrait_transparent_8x.png', fig, 8)
print('ok')
