"""Hestia: keeper of the White Ox gospel, in her white chapel.
The candlelight throws a shadow behind her that is not quite her own."""
from bust import draw_eyes
import math, sys
from pix import Layer, hx, ramp, dith, blend

W = H = 96
CX = 48
OUT = sys.argv[1] if len(sys.argv) > 1 else '.'

SKIN = [hx('fff3e8'), hx('fbe2cf'), hx('efc6aa'), hx('d9a688')]
BLUSH = hx('f7c9bd')
HAIR = [hx('9b95b6'), hx('c0bbd4'), hx('dfdcea'), hx('f2f0f7'), hx('ffffff')]
HAIR_LINE = hx('5c5674')
DRESS = [hx('110e15'), hx('1d1824'), hx('2b2534'), hx('3d354a')]
COLLAR = [hx('c9c4d6'), hx('e6e3ee'), hx('faf9fc')]
GOLD = [hx('9c6526'), hx('e0a248'), hx('ffd98c'), hx('fff4cf')]
INK = hx('16111a')

# ── background: a white chapel gone grey in the dark ─────────────────────
bg = Layer(W, H)
WALL = [hx('120e17'), hx('1a1520'), hx('231d2b'), hx('2f2838'), hx('3b3346')]
for y in range(H):
    for x in range(W):
        d = math.hypot((x - CX) / 1.2, y - 40)
        bg.put(x, y, ramp(x, y, 1 - min(1, d / 70), WALL))

# tall arched window behind her, pale light through it
def in_arch(x, y, x0, x1, ytop, ybot):
    cx, r = (x0 + x1) / 2, (x1 - x0) / 2
    if y > ybot or x < x0 or x > x1:
        return False
    return y >= ytop + r or math.hypot(x + 0.5 - cx, y + 0.5 - (ytop + r)) <= r

GLASS = [hx('433b58'), hx('595073'), hx('746a92'), hx('968cb6')]
for y in range(H):
    for x in range(W):
        if in_arch(x, y, 16, 80, 2, 78):
            t = 1 - (y - 2) / 76 * 0.7 - abs(x - CX) / 70
            c = ramp(x, y, t, GLASS)
            # leading: mullions and transoms
            if x in (CX - 1, CX, 31, 64) or (y - 2) % 16 == 0 and y > 30:
                c = hx('231e2c')
            bg.put(x, y, c)
        elif in_arch(x, y, 14, 82, 0, 80):
            bg.put(x, y, hx('2a2433') if x < CX else hx('1c1724'))

# the shadow on the wall: a woman's head, and horns
shadow = Layer(W, H)
def horn(side):
    for i in range(120):
        t = i / 119
        x = CX + side * (11 + 21 * math.sin(t * math.pi * 0.62) - 3 * t * t)
        y = 30 - 27 * t ** 1.15
        r = 5.2 * (1 - t) ** 0.8 + 0.5
        shadow.ellipse(x, y, r, r, SHADOW)

SHADOW = hx('0d0a11')
for side in (-1, 1):
    horn(side)
shadow.ellipse(CX, 38, 26, 27, SHADOW)
shadow.poly([(8, 96), (16, 70), (80, 70), (88, 96)], SHADOW)
for y in range(H):
    for x in range(W):
        if shadow.px[y][x] is not None:
            base = bg.px[y][x]
            bg.put(x, y, blend(base, SHADOW, 0.9 if dith(x, y, 0.9) else 0.75))

# candles on both sides, lit
CANDLE = [hx('8f879f'), hx('cfc9d9'), hx('f4f1f8')]
lights = []
for cx_, top, wdt in ((7, 60, 5), (15, 70, 4), (88, 58, 5), (80, 72, 4)):
    for y in range(top, H):
        for x in range(cx_ - wdt // 2, cx_ + (wdt + 1) // 2):
            k = 2 if x == cx_ - wdt // 2 else (0 if x == cx_ + (wdt + 1) // 2 - 1 else 1)
            bg.put(x, y, CANDLE[k])
    for x in range(cx_ - wdt // 2, cx_ + (wdt + 1) // 2):   # wax drip
        if (x * 3) % 4 == 0:
            bg.put(x, top + 1 + x % 3, CANDLE[2])
    bg.put(cx_, top - 1, INK)
    lights.append((cx_, top - 4))

for lx, ly in lights:     # warm glow around each flame
    for y in range(ly - 14, ly + 15):
        for x in range(lx - 14, lx + 15):
            d = math.hypot(x - lx, y - ly)
            c = bg.get(x, y)
            if c and d < 14:
                a = (1 - d / 14) ** 2 * 0.55
                bg.put(x, y, blend(c, hx('e8a050'), a if dith(x, y, 0.6) else a * 0.6))
FLAME = {'r': hx('d9662a'), 'o': hx('ffb84a'), 'y': hx('fff2b0')}
for lx, ly in lights:
    bg.stamp([".o.", ".o.", "oyo", "oyo", "ryr", ".r."], FLAME, lx - 1, ly - 2)

# ── Hestia ───────────────────────────────────────────────────────────────
fig = Layer(W, H)

def hair_col(x, y, tilt=0.0):
    """White hair: lit from the upper left, with long falling strands."""
    t = 0.62 - (x - CX) / 60 - (y - 40) / 160
    t += 0.16 * math.sin(x * 0.95 + tilt) + 0.07 * math.sin(x * 0.37 + 2 * tilt)
    return ramp(x, y, t, HAIR)

# back hair: crown and the long fall behind her shoulders
fig.ellipse(CX + 1, 36, 25, 25, lambda x, y, nx, ny: hair_col(x, y))
fig.poly([(23, 36), (74, 36), (77, 96), (19, 96)], lambda x, y: hair_col(x, y, 0.4))

# dress
def dress_col(x, y):
    t = 0.55 - (x - 30) / 90 + 0.12 * math.sin(x * 0.4)
    return ramp(x, y, t * 0.9, DRESS)
fig.poly([(10, 96), (14, 84), (24, 76), (38, 72), (58, 72), (72, 76), (82, 84), (86, 96)], dress_col)

# neck
fig.poly([(42, 56), (54, 56), (55, 74), (41, 74)],
         lambda x, y: SKIN[2] if y < 64 and x > 43 else (SKIN[1] if x > 51 else SKIN[0]))
for x in range(42, 55):      # shadow under the jaw
    for y in range(58, 64):
        if y < 62:
            fig.put(x, y, SKIN[2] if y < 60 else SKIN[1])

# round white collar, two lobes
for side in (-1, 1):
    fig.ellipse(CX + side * 7, 76, 10, 6,
                lambda x, y, nx, ny: COLLAR[0] if ny > 0.55 else (COLLAR[1] if nx * side > 0.3 or ny > 0.1 else COLLAR[2]))
fig.poly([(43, 70), (53, 70), (51, 74), (45, 74)], SKIN[1])     # V of the neckline
fig.line(44, 71, 48, 80, hx('8a7e96')); fig.line(52, 71, 48, 80, hx('8a7e96'))   # cord

# the face: the shared round one
from bust import face as round_face
round_face(fig, SKIN, BLUSH)

# eyes: calm, heavy-lashed, grey
draw_eyes(fig, 'lidded', ('3a3644', '5c5868', '8a8696', 'c4c0cc'), lash='16111a', lid='d8aa92', pupil='6a1a28')   # a red pupil: what she is
# brows: thin, pale, level
for x in range(35, 43): fig.put(x, 37 - (1 if 37 <= x <= 40 else 0), HAIR[1])
for x in range(54, 62): fig.put(x, 37 - (1 if 56 <= x <= 59 else 0), HAIR[1])
# nose and mouth
fig.put(49, 52, SKIN[2])          # a single-pixel nose
LIPS = {'a': hx('e88f56'), 'b': hx('f5b07e'), 'c': hx('d06e40')}
fig.stamp([".bab.", "bacab", ".bbb."], LIPS, 46, 55)

# bangs: clumps fanning from a part right of centre, swept over the left brow
from bust import draw_eyes, fringe
fringe(fig, [
    (23, 28, 18, 112, 4.5, 3, 0.6, 4, 0.7),
    (72, 28, 78, 112, 4.5, 3, 0.6, 4, 1.6),
    (25, 32, 22, 112, 4.5, 1, 0.6, 4, 0.0), (29, 34, 30, 112, 3.8, 1, 0.5, 4, 1.2),
    (71, 32, 74, 112, 4.5, 1, 0.6, 4, 2.0), (67, 34, 66, 112, 3.8, 1, 0.5, 4, 0.4),
    (50, 12, 23, 40, 7, 9),      # crown, left (behind)
    (60, 13, 75, 38, 6, 7),      # crown, right (behind)
    (56, 13, 28, 50, 4.5, 10),   # the long sweep, curving down outside her left cheek
    (55, 14, 32, 42, 5, 6),
    (55, 15, 38, 38, 5, 4),
    (54, 16, 44, 35, 4.5, 3),
    (54, 17, 50, 32, 4, 1.5),
    (58, 14, 58, 30, 4, 1),
    (60, 14, 65, 39, 4, 3),
    (62, 14, 68, 51, 4.5, 7),    # framing her right cheek
], HAIR, SKIN, head=(CX + 1, 36), ring=(17, 205, 335), line=HAIR_LINE)
# little gold ties on the right lock, like her reference portrait
for y in (64, 65, 80, 81):
    for x in range(65, 70):
        fig.put(x, y, GOLD[1] if y % 2 == 0 else GOLD[0])


# black headband with its little crossed knot
for i in range(60):
    t = i / 59
    ang = math.radians(200 + 95 * t)
    x, y = CX + 1 + math.cos(ang) * 23, 36 + math.sin(ang) * 23
    fig.put(round(x), round(y), INK)
fig.stamp(["k.k.", ".kk.", "k..k"], {'k': INK}, 55, 11)

# gold cross hairpin on her right
fig.stamp(["..g..", ".gGg.", "gGHGg", ".gGg.", "..g..", "..g..", "..G..", "..g.."],
          {'g': GOLD[1], 'G': GOLD[2], 'H': GOLD[3]}, 64, 30)

# the cross on its cord
fig.stamp([".g.", "gGg", ".G.", ".g.", ".g."], {'g': GOLD[1], 'G': GOLD[2]}, 47, 80)

# outline the figure against the wall
fig.outline(HAIR_LINE)

# ── compose ──────────────────────────────────────────────────────────────
out = Layer(W, H)
out.over(bg)
out.over(fig)
# candlelight catching the hair edges on both sides
for y in range(30, H):
    for x in range(W):
        c = fig.get(x, y)
        if c in HAIR and (fig.get(x - 1, y) == HAIR_LINE or fig.get(x + 1, y) == HAIR_LINE) and y > 50:
            out.put(x, y, blend(c, hx('ffd59a'), 0.35))

for y in range(70, H):          # candlelight rim on the black dress
    for x in range(W):
        c = fig.get(x, y)
        if c in DRESS and any(fig.get(x + dx, y + dy) == HAIR_LINE for dx, dy in ((-1, 0), (1, 0), (0, -1), (-1, -1), (1, -1))):
            out.put(x, y, hx('5a4650'))
out.save(f'{OUT}/hestia_portrait.png')
out.save(f'{OUT}/hestia_portrait_8x.png', 8)
# the same portrait without the background
out.save_cutout(f'{OUT}/hestia_portrait_transparent.png', fig)
out.save_cutout(f'{OUT}/hestia_portrait_transparent_8x.png', fig, 8)
print('ok')
