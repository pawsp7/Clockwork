"""'Through the Watch' - a 128x128 pixel-art piece in Clockwork's palette.
Alice falls through the face of the pocket watch into Gehenna.
Usage: python3 watch.py OUT_DIR
"""
import math, sys, random
from PIL import Image

W = H = 128
OUT = sys.argv[1] if len(sys.argv) > 1 else '.'

def hx(s):
    s = s.lstrip('#')
    return tuple(int(s[i:i + 2], 16) for i in (0, 2, 4))

BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]
def dith(x, y, t):
    return t * 16 > BAYER[y & 3][x & 3] + 0.5

def ramp(x, y, t, stops):
    """Dithered pick from a list of colours, t in [0,1]."""
    t = max(0.0, min(1.0, t)) * (len(stops) - 1)
    i = min(len(stops) - 2, int(t))
    return stops[i + 1] if dith(x, y, t - i) else stops[i]

# ── palette ──────────────────────────────────────────────────────────────
BG = [hx(c) for c in ('0b0910', '120e18', '1a1421', '231a28', '2e2130')]
GOLD = [hx(c) for c in ('2a190b', '5a3916', '8c5f22', 'c08c34', 'e6bf5e', 'fff0a6')]
SKY = [hx(c) for c in ('17121d', '201927', '2b2132', '3a2b3e', '553846', '7a4a48')]
ROCK = hx('3a2d41'); ROCK_HI = hx('54425a'); ROCK_LO = hx('231a29')
RIDGE_FAR = hx('2a1f2f'); RIDGE_NEAR = hx('1d1623')
TOWN = hx('110d15'); TOWN_EDGE = hx('2a1d25')
WIN = [hx('d9822f'), hx('ffcf6a')]
ROAD = [hx('2c2128'), hx('433231'), hx('5e4639')]
TICK = hx('ecdfc2'); TICK_DIM = hx('9c8c78')
SPARK = [hx('fff7d6'), hx('ffd98a'), hx('f6b8c4')]
GEAR = hx('1c1623'); GEAR_HI = hx('251d2c')

img = [[BG[0]] * W for _ in range(H)]
def put(x, y, c):
    if 0 <= x < W and 0 <= y < H and c is not None:
        img[y][x] = c
def get(x, y):
    return img[y][x]
def blend(c, d, a):
    return tuple(round(c[i] * (1 - a) + d[i] * a) for i in range(3))

CX, CY = 64, 74          # watch centre
R_OUT, R_CASE_IN, R_FACE = 45, 39, 36

# ── background: dithered vignette + warm halo behind the watch ──────────
for y in range(H):
    for x in range(W):
        d = math.hypot(x - CX, y - CY)
        t = 1 - min(1, d / 92)
        img[y][x] = ramp(x, y, t ** 1.6, BG)

# drifting gears, barely lighter than the dark
def gear(cx, cy, r, teeth, hole, rot, col, hi):
    for y in range(int(cy - r - 4), int(cy + r + 5)):
        for x in range(int(cx - r - 4), int(cx + r + 5)):
            dx, dy = x - cx, y - cy
            d = math.hypot(dx, dy)
            a = math.atan2(dy, dx) + rot
            tooth = (math.cos(a * teeth) > 0.25)
            rr = r + (3 if tooth else 0)
            if d <= rr and d >= hole:
                spoke = d < r - 3 and d > hole + 2 and min(abs(math.sin(a * 2)), 1) > 0.35
                if spoke:
                    continue
                c = hi if (dx + dy) < -r * 0.6 else col
                put(x, y, c)

gear(8, 116, 22, 10, 6, 0.2, GEAR, GEAR_HI)
gear(122, 20, 16, 8, 4, 0.5, GEAR, GEAR_HI)
gear(118, 120, 10, 6, 3, 0.1, GEAR, GEAR_HI)

# ── the chain, trailing upward as everything falls ───────────────────────
def bez(p0, p1, p2, p3, t):
    u = 1 - t
    return tuple(u**3 * p0[i] + 3 * u * u * t * p1[i] + 3 * u * t * t * p2[i] + t**3 * p3[i] for i in range(2))

pts = [bez((64, 9), (60, -6), (26, 30), (-4, 14), i / 600) for i in range(601)]
acc, last = 0, pts[0]
for p in pts[1:]:
    acc += math.hypot(p[0] - last[0], p[1] - last[1]); last = p
    x, y = round(p[0]), round(p[1])
    k = int(acc) % 4
    put(x, y + 1, GOLD[0])
    put(x, y, (GOLD[4], GOLD[3], GOLD[1], GOLD[2])[k])
    if k == 0: put(x, y - 1, GOLD[2])

# ── bow (ring) and crown ─────────────────────────────────────────────────
top = CY - R_OUT
for y in range(top - 22, top + 1):
    for x in range(CX - 10, CX + 11):
        # bow: elliptical ring
        ex, ey = (x - CX) / 7.5, (y - (top - 15)) / 6.5
        e = math.hypot(ex, ey)
        if 0.72 <= e <= 1.15:
            t = 0.5 - 0.5 * (ex * 0.6 + ey * 0.8) / max(e, 0.01)
            t = t * 0.8 + (0.2 if e < 0.95 else 0)
            put(x, y, ramp(x, y, t, GOLD[1:5]))
        elif 1.15 < e <= 1.32:
            put(x, y, GOLD[0])
for y in range(top - 9, top - 3):          # crown, knurled
    for x in range(CX - 4, CX + 5):
        edge = x in (CX - 4, CX + 4) or y in (top - 9, top - 4)
        c = GOLD[0] if edge else (GOLD[4] if (x + y) % 2 == 0 else GOLD[2])
        if not edge and x < CX - 1: c = GOLD[5] if (x + y) % 2 == 0 else GOLD[3]
        put(x, y, c)
for y in range(top - 3, top + 1):          # stem
    for x in range(CX - 2, CX + 3):
        put(x, y, GOLD[0] if x in (CX - 2, CX + 2) else (GOLD[4] if x < CX else GOLD[2]))

# ── the case: a lit gold torus, light from the upper left ────────────────
L = (-0.55, -0.65, 0.52)
ln = math.sqrt(sum(v * v for v in L)); L = tuple(v / ln for v in L)
rmid, half = (R_OUT + R_CASE_IN) / 2, (R_OUT - R_CASE_IN) / 2
for y in range(CY - R_OUT - 2, CY + R_OUT + 3):
    for x in range(CX - R_OUT - 2, CX + R_OUT + 3):
        dx, dy = x - CX, y - CY
        d = math.hypot(dx, dy)
        if R_OUT < d <= R_OUT + 1.2:
            put(x, y, GOLD[0]); continue
        if R_CASE_IN <= d <= R_OUT:
            s = (d - rmid) / half
            s = max(-1, min(1, s))
            nz = math.sqrt(max(0, 1 - s * s))
            nx, ny = dx / d * s, dy / d * s
            lit = nx * L[0] + ny * L[1] + nz * L[2]
            t = (lit + 0.15) / 1.1
            c = ramp(x, y, t, GOLD[1:6])
            # engraved line round the middle of the case
            if abs(d - rmid - 0.6) < 0.5:
                c = blend(c, GOLD[0], 0.55)
            put(x, y, c)
        elif R_FACE < d < R_CASE_IN:       # recessed lip
            ang = math.atan2(dy, dx)
            t = 0.5 + 0.5 * math.cos(ang - math.atan2(1, 1))   # lit on lower right
            put(x, y, ramp(x, y, t * 0.9, GOLD[0:4]))

# ── the face: a window onto Gehenna ──────────────────────────────────────
rng = random.Random(7)
def noise1(seed):
    r = random.Random(seed); pts = [r.random() for _ in range(64)]
    def f(x):
        i = math.floor(x); fr = x - i
        a, b = pts[i % 64], pts[(i + 1) % 64]
        s = fr * fr * (3 - 2 * fr)
        return a + (b - a) * s
    return f

face = {}
def inface(x, y):
    return math.hypot(x - CX, y - CY) <= R_FACE - 0.3

HORIZON = CY + 12
ceil_n = noise1(3)
for y in range(CY - R_FACE, CY + R_FACE + 1):
    for x in range(CX - R_FACE, CX + R_FACE + 1):
        if not inface(x, y): continue
        # stone sky: dark overhead, warm glow near the town
        t = (y - (CY - R_FACE)) / (HORIZON - (CY - R_FACE))
        face[(x, y)] = ramp(x, y, t ** 1.35, SKY)

# rock ceiling with stalactites
for x in range(CX - R_FACE, CX + R_FACE + 1):
    h = CY - R_FACE + 5 + ceil_n(x * 0.18) * 7
    for y in range(CY - R_FACE, int(h) + 1):
        if (x, y) in face:
            face[(x, y)] = ROCK_LO if y > h - 1.5 else (ROCK_HI if (x * 7 + y * 3) % 11 == 0 else ROCK)
stal = random.Random(11)
for _ in range(14):
    sx = stal.randint(CX - R_FACE + 3, CX + R_FACE - 3)
    base = int(CY - R_FACE + 5 + ceil_n(sx * 0.18) * 7)
    ln_ = stal.randint(4, 12)
    for i in range(ln_):
        wdt = max(0, round((1 - i / ln_) * 1.6))
        for dx in range(-wdt, wdt + 1):
            p = (sx + dx, base + i)
            if p in face:
                face[p] = ROCK_LO if dx > 0 else (ROCK_HI if dx < 0 else ROCK)

# far and near ridges
far, near = noise1(21), noise1(33)
for x in range(CX - R_FACE, CX + R_FACE + 1):
    hf = HORIZON - 3 - far(x * 0.12) * 6
    hn = HORIZON + 2 - near(x * 0.09) * 4
    for y in range(int(hf), CY + R_FACE + 1):
        if (x, y) in face:
            face[(x, y)] = RIDGE_NEAR if y >= hn else RIDGE_FAR

# the town of Gehenna: crooked roofs, one clock tower, lit windows
buildings = [  # (x0, width, height, roof)
    (CX - 30, 6, 7, 'peak'), (CX - 24, 5, 10, 'flat'), (CX - 19, 7, 8, 'peak'),
    (CX - 12, 5, 12, 'peak'), (CX - 7, 5, 9, 'flat'),
    (CX + 4, 6, 11, 'peak'), (CX + 10, 5, 8, 'flat'), (CX + 15, 7, 13, 'peak'),
    (CX + 22, 5, 7, 'peak'), (CX + 27, 6, 9, 'flat'),
]
ground = HORIZON + 6
win = random.Random(5)
windows = []
for bx, bw, bh, roof in buildings:
    for x in range(bx, bx + bw):
        for y in range(ground - bh, ground + 1):
            if (x, y) in face: face[(x, y)] = TOWN
    if roof == 'peak':
        for i in range((bw + 1) // 2 + 1):
            for x in range(bx + i, bx + bw - i):
                p = (x, ground - bh - i)
                if p in face: face[p] = TOWN
    for wy in range(ground - bh + 2, ground - 1, 3):
        for wx in range(bx + 1, bx + bw - 1, 2):
            if win.random() < 0.6:
                windows.append((wx, wy))

# clock tower, centre-left, with a glowing dial
TX, TW, TH = CX, 7, 13
for x in range(TX - TW // 2, TX + TW // 2 + 1):
    for y in range(ground - TH, ground + 1):
        if (x, y) in face: face[(x, y)] = TOWN
for i in range(7):                         # spire
    for x in range(TX - 3 + i // 2, TX + 4 - i // 2):
        p = (x, ground - TH - i)
        if p in face: face[p] = TOWN
face[(TX, ground - TH - 7)] = TOWN
dial_y = ground - TH + 5
for dy in range(-2, 3):
    for dx in range(-2, 3):
        if dx * dx + dy * dy <= 5 and (TX + dx, dial_y + dy) in face:
            face[(TX + dx, dial_y + dy)] = WIN[1] if dx * dx + dy * dy <= 2 else WIN[0]
face[(TX, dial_y)] = TOWN; face[(TX, dial_y - 1)] = TOWN; face[(TX + 1, dial_y)] = TOWN

# warm rim light on rooftops from the lamp glow
for (x, y), c in list(face.items()):
    if c == TOWN and face.get((x, y - 1)) not in (TOWN, None) and y < ground and dith(x, y, 0.5):
        face[(x, y)] = TOWN_EDGE

# foreground: dark ground and a road winding up to the gate
for y in range(ground + 1, CY + R_FACE + 1):
    for x in range(CX - R_FACE, CX + R_FACE + 1):
        if (x, y) in face:
            face[(x, y)] = RIDGE_NEAR if dith(x, y, 0.3) else hx('17111b')
for y in range(ground + 1, CY + R_FACE + 1):
    t = (y - ground) / (CY + R_FACE - ground)
    centre = CX + 2 + math.sin(t * 3.2) * 6
    half_w = 1 + t * 7
    for x in range(int(centre - half_w), int(centre + half_w) + 1):
        if (x, y) in face:
            edge = abs(x - centre) > half_w - 1.2
            face[(x, y)] = ROAD[0] if edge else ramp(x, y, 0.3 + 0.6 * (1 - t), ROAD)

# lanterns along the road
for lx, ly in ((CX - 8, ground + 11), (CX + 13, ground + 8), (CX - 3, ground + 16)):
    for yy in range(ly - 4, ly + 1):
        if (lx, yy) in face: face[(lx, yy)] = TOWN
    if (lx, ly - 5) in face: face[(lx, ly - 5)] = WIN[1]

LANTERNS = ((CX - 8, ground + 11), (CX + 13, ground + 8), (CX - 3, ground + 16))
for (x, y), c in list(face.items()):
    for lx, ly in LANTERNS:
        d = math.hypot(x - lx, (y - ly + 2) * 1.4)
        if d < 7 and y > ground:
            face[(x, y)] = blend(c, hx('6b4433'), 0.55 * (1 - d / 7) if dith(x, y, 0.7) else 0.3 * (1 - d / 7))

def paint_face(frame):
    for (x, y), c in face.items():
        put(x, y, c)
    fr = random.Random(100 + frame // 2)
    for wx, wy in windows:
        if (wx, wy) in face:
            put(wx, wy, WIN[1] if fr.random() < 0.7 else WIN[0])

# ── Alice, falling feet first, hair streaming up ─────────────────────────
def _r(l, m, r): return l + m + r
BODY = [
    "..dhHHhHHHhHHhd..",
    "s.dhHHHHHHHHHhd.s",
    "S.dhHHhHHHhHHhd.S",
    _r(".sdh", "HhHHhHHhH", "hds."),
    _r(".sdh", "sssssssss", "hds."),
    _r(".sdh", "seesssees", "hds."),
    _r(".s.d", "sEEsssEEs", "d.s."),
    _r(".s..", "scssmsscs", "..s."),
    _r("..w.", ".SsssssS.", ".w.."),
    _r("..w.", "...SsS...", ".w.."),
    _r("..ww", "wwwWwWwww", "ww.."),
    _r("...W", "wwwwbwwww", "W..."),
    _r("....", "wwwwwwwww", "...."),
    _r("....", "WwwwbwwwW", "...."),
    _r("...p", "PpppPpppP", "p..."),
    _r("..pp", "ppppppppp", "pp.."),
    _r(".pPp", "ppPpppPpp", "pPp."),
    _r(".PPp", "PpPPpPPpP", "pPP."),
    _r("....", "..sS.sS..", "...."),
    _r("....", "..sS.sS..", "...."),
    _r("....", "..ww.ww..", "...."),
    _r("....", "..WW.WW..", "...."),
]
LOCK_H = 9
ALICE = [list('.' * 17) for _ in range(LOCK_H)] + [list(r) for r in BODY]
# long hair streaming upward in wavy locks, all leaning the same way
for base, length, ph in ((3.6, 7, 0.0), (5.8, 9, 1.3), (8.2, 8, 2.4), (10.6, 9, 0.7), (12.6, 6, 1.9)):
    for u in range(0, length + 1):
        y = LOCK_H + 1 - u
        if y < 0: break
        cx = base + 1.1 * math.sin(u * 0.75 + ph) - 0.22 * u
        w = 2.6 * (1 - u / (length + 1)) + 0.7
        x0, x1 = round(cx - w / 2), round(cx + w / 2)
        for x in range(x0, x1 + 1):
            if not 0 <= x < 17: continue
            ch = 'd' if x == x1 and x1 > x0 else ('h' if x == x0 else 'H')
            if u == length: ch = 'h'
            if ALICE[y][x] in '.hd' or y < LOCK_H:
                ALICE[y][x] = ch
# white ribbon tied in the hair
for x, y, ch in ((12, LOCK_H, 'k'), (13, LOCK_H, 'k'), (12, LOCK_H - 1, 'k'), (13, LOCK_H + 1, 'K'), (11, LOCK_H + 1, 'K')):
    ALICE[y][x] = ch
ALICE = [''.join(r) for r in ALICE]
assert all(len(r) == 17 for r in ALICE), [len(r) for r in ALICE]
ALICE_PAL = {
    'h': hx('eaa3b2'), 'H': hx('fbd2d8'), 'd': hx('c27688'), 'k': hx('f2eef2'),
    's': hx('fde6d8'), 'S': hx('e6b49e'), 'e': hx('a8eef2'), 'E': hx('3f9fb2'),
    'm': hx('b9606a'), 'c': hx('f7c3c3'),
    'w': hx('f7f4f4'), 'K': hx('c9c0cc'), 'W': hx('cfc6cf'), 'b': hx('e6bf5e'),
    'p': hx('f2c3cc'), 'P': hx('d699a6'),
}
OUTLINE = hx('3a2030')

def paint_alice(ax, ay):
    grid = [list(r) for r in ALICE]
    hh, ww = len(grid), len(grid[0])
    # 1px dark outline so she reads against sky and gold alike
    for y in range(-1, hh + 1):
        for x in range(-1, ww + 1):
            here = 0 <= y < hh and 0 <= x < ww and grid[y][x] != '.'
            if here: continue
            near = any(0 <= y + j < hh and 0 <= x + i < ww and grid[y + j][x + i] != '.'
                       for i, j in ((1, 0), (-1, 0), (0, 1), (0, -1)))
            if near: put(ax + x, ay + y, OUTLINE)
    for y in range(hh):
        for x in range(ww):
            ch = grid[y][x]
            if ch != '.': put(ax + x, ay + y, ALICE_PAL[ch])

# ── watch hands, ticks, glass ────────────────────────────────────────────
def line(x0, y0, x1, y1, c):
    n = int(max(abs(x1 - x0), abs(y1 - y0))) * 2 + 1
    for i in range(n + 1):
        t = i / n
        put(round(x0 + (x1 - x0) * t), round(y0 + (y1 - y0) * t), c)

def hand(angle_deg, length, width, col, dark):
    a = math.radians(angle_deg - 90)
    ex, ey = CX + math.cos(a) * length, CY + math.sin(a) * length
    px, py = -math.sin(a), math.cos(a)
    line(CX + px, CY + py, ex + px * 0.3, ey + py * 0.3, dark)
    line(CX, CY, ex, ey, col)
    if width > 1:
        # spade near the tip
        sx, sy = CX + math.cos(a) * length * 0.72, CY + math.sin(a) * length * 0.72
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                if abs(dx) + abs(dy) <= 1: put(round(sx + dx), round(sy + dy), col)
        put(round(sx), round(sy), dark)

def paint_dial(frame):
    for i in range(60):
        a = math.radians(i * 6 - 90)
        major = i % 5 == 0
        r0 = R_FACE - (3.5 if i % 15 == 0 else 2.5 if major else 1)
        for r in [R_FACE - 0.6, r0] if major else [R_FACE - 0.6]:
            x, y = round(CX + math.cos(a) * r), round(CY + math.sin(a) * r)
            put(x, y, TICK if major else TICK_DIM)
        if major:
            line(CX + math.cos(a) * r0, CY + math.sin(a) * r0,
                 CX + math.cos(a) * (R_FACE - 0.6), CY + math.sin(a) * (R_FACE - 0.6), TICK)
    hand(-62, 17, 2, GOLD[4], GOLD[0])        # hour: ~10
    hand(72, 27, 2, GOLD[4], GOLD[0])         # minute: ~12 past
    sec = (330 + frame * 15) % 360            # second hand ticks each frame
    a = math.radians(sec - 90)
    line(CX - math.cos(a) * 5, CY - math.sin(a) * 5,
         CX + math.cos(a) * 30, CY + math.sin(a) * 30, hx('b8474f'))
    for dx in (-1, 0, 1):
        for dy in (-1, 0, 1):
            put(CX + dx, CY + dy, GOLD[0] if abs(dx) + abs(dy) == 2 else GOLD[3])
    put(CX, CY, GOLD[5])

def paint_glass():
    for y in range(CY - R_FACE, CY + R_FACE):
        for x in range(CX - R_FACE, CX + R_FACE):
            if not inface(x, y): continue
            d = math.hypot(x - CX, y - CY)
            ang = math.degrees(math.atan2(y - CY, x - CX)) % 360
            if 198 <= ang <= 252 and R_FACE - 6 <= d <= R_FACE - 3:
                core = 210 <= ang <= 240 and R_FACE - 5 <= d <= R_FACE - 4
                a = 0.26 if core else (0.12 if dith(x, y, 0.6) else 0.0)
                img[y][x] = blend(img[y][x], (255, 250, 235), a)
    for x, y in ((CX - 20, CY - 20), (CX - 19, CY - 21), (CX - 21, CY - 19), (CX - 20, CY - 21), (CX - 21, CY - 20)):
        img[y][x] = blend(img[y][x], (255, 255, 255), 0.5)

def star(x, y, size, c):
    put(x, y, c)
    for i in range(1, size + 1):
        cc = c if i < size else blend(c, get(x, y) if 0 <= x < W and 0 <= y < H else c, 0.4)
        for dx, dy in ((i, 0), (-i, 0), (0, i), (0, -i)):
            put(x + dx, y + dy, cc)

SPARKS = [(22, 30, 2), (104, 46, 1), (12, 62, 1), (110, 92, 2), (30, 104, 1),
          (96, 12, 1), (50, 8, 1), (118, 64, 1), (6, 40, 1), (78, 120, 1)]

def frame_image(frame, nframes):
    global img
    base = [row[:] for row in BASE]
    img = base
    paint_face(frame)
    paint_dial(frame)
    # Alice drifts down through the dial, a pixel every few frames
    bob = round(math.sin(frame / nframes * 2 * math.pi) * 1.5)
    paint_alice(CX + 4, CY - 41 + bob)
    # her trail of light, above her through the crystal and out of it
    for i, (tx, ty) in enumerate(((CX + 9, CY - 39), (CX + 17, CY - 44), (CX + 11, CY - 50), (CX + 19, CY - 55))):
        on = (frame + i) % 4
        if on != 3: star(tx, ty + bob, 1 if on else 0, SPARK[i % 3])
    paint_glass()
    for i, (sx, sy, sz) in enumerate(SPARKS):
        ph = (frame + i * 3) % 8
        if ph < 5:
            star(sx, sy, sz if ph in (1, 2, 3) else 0, SPARK[i % 2])
    return img

BASE = [row[:] for row in img]
NF = 24
frames = []
for f in range(NF):
    im = Image.new('RGB', (W, H))
    im.putdata([c for row in frame_image(f, NF) for c in row])
    frames.append(im)

frames[0].save(f'{OUT}/through_the_watch.png')
frames[0].resize((W * 8, H * 8), Image.NEAREST).save(f'{OUT}/through_the_watch_8x.png')
big = [f.resize((W * 4, H * 4), Image.NEAREST) for f in frames]
big[0].save(f'{OUT}/through_the_watch.gif', save_all=True, append_images=big[1:],
            duration=180, loop=0, optimize=False, disposal=1)
print('ok')
