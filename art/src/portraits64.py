"""64x64 portraits of Alice, Charon and Hestia, in the hand of Mitzi's and
Victoria's reference portraits (references/Art, stored at 64x64 in assets/art).

The faces are those portraits' own pixels: Hestia and Charon wear Victoria's
face, Alice wears Mitzi's rounder, blushing one. Eyes, lips and skin are
recoloured; hair, headwear and clothes are painted around them the way the
references are drawn: tapered locks lit on one side and shaded on the other,
dark gaps between clumps, a sheen band, and a 1px outline in the hair's
darkest hue.

Usage: python3 art/src/portraits64.py OUT_DIR
Writes <name>_portrait.png (64x64, transparent) and an 8x copy of each.
"""
import math
import os
import sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
N = 64


def hx(s):
    s = s.lstrip('#')
    return tuple(int(s[i:i + 2], 16) for i in (0, 2, 4))


def load(name):
    im = Image.open(os.path.join(ROOT, 'assets', 'art', name + '.png')).convert('RGBA')
    return {(x, y): im.getpixel((x, y))[:3] for y in range(N) for x in range(N) if im.getpixel((x, y))[3] > 0}


def bez(*p, n=48):
    """Points along a quadratic or cubic Bezier."""
    out = []
    for i in range(n + 1):
        t = i / n
        if len(p) == 3:
            a, b, c = p
            out.append(((1 - t) ** 2 * a[0] + 2 * (1 - t) * t * b[0] + t * t * c[0],
                        (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * b[1] + t * t * c[1]))
        else:
            a, b, c, d = p
            out.append(((1 - t) ** 3 * a[0] + 3 * (1 - t) ** 2 * t * b[0] + 3 * (1 - t) * t * t * c[0] + t ** 3 * d[0],
                        (1 - t) ** 3 * a[1] + 3 * (1 - t) ** 2 * t * b[1] + 3 * (1 - t) * t * t * c[1] + t ** 3 * d[1]))
    return out


class Canvas:
    def __init__(self):
        self.px = {}
        self.hair = set()
        self.under = {}  # what a hair pixel covers, so a stray one can be taken back

    def put(self, x, y, c, hair=False):
        x, y = int(x), int(y)
        if not (0 <= x < N and 0 <= y < N) or c is None:
            return
        if hair and (x, y) not in self.hair:
            self.under[(x, y)] = self.px.get((x, y))
        self.px[(x, y)] = c
        if hair:
            self.hair.add((x, y))
        else:
            self.hair.discard((x, y))
            self.under.pop((x, y), None)

    def clear(self, x, y):
        self.px.pop((x, y), None)
        self.hair.discard((x, y))

    def poly(self, pts, col, hair=False):
        ys = [p[1] for p in pts]
        for y in range(max(0, int(min(ys))), min(N, int(max(ys)) + 1)):
            cy = y + 0.5
            xs = []
            for i in range(len(pts)):
                (x0, y0), (x1, y1) = pts[i], pts[(i + 1) % len(pts)]
                if (y0 <= cy < y1) or (y1 <= cy < y0):
                    xs.append(x0 + (cy - y0) * (x1 - x0) / (y1 - y0))
            xs.sort()
            for a, b in zip(xs[::2], xs[1::2]):
                for x in range(max(0, math.ceil(a - 0.5)), min(N, math.floor(b - 0.5) + 1)):
                    self.put(x, y, col(x, y) if callable(col) else col, hair)

    def ellipse(self, cx, cy, rx, ry, col, hair=False):
        for y in range(int(cy - ry - 1), int(cy + ry + 2)):
            for x in range(int(cx - rx - 1), int(cx + rx + 2)):
                nx, ny = (x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry
                if nx * nx + ny * ny <= 1:
                    self.put(x, y, col(x, y, nx, ny) if callable(col) else col, hair)

    def lock(self, spine, w0, w1, ramp, sheen=None, flip=False, tip=0.82):
        """A tapered lock of hair along `spine`. Lit on its left edge (or right
        when flip), shaded on the other, darker toward the tip, with a dark
        line where it meets the next lock."""
        L = [0.0]
        for i in range(1, len(spine)):
            L.append(L[-1] + math.dist(spine[i - 1], spine[i]))
        total = L[-1] or 1
        wmax = max(w0, w1) + 1
        xs = [p[0] for p in spine]
        ys = [p[1] for p in spine]
        for y in range(int(min(ys) - wmax), int(max(ys) + wmax) + 1):
            for x in range(int(min(xs) - wmax), int(max(xs) + wmax) + 1):
                px, py = x + 0.5, y + 0.5
                best = None
                for i in range(len(spine) - 1):
                    (ax, ay), (bx, by) = spine[i], spine[i + 1]
                    dx, dy = bx - ax, by - ay
                    ll = dx * dx + dy * dy or 1e-9
                    t = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / ll))
                    qx, qy = ax + t * dx, ay + t * dy
                    d = math.hypot(px - qx, py - qy)
                    if best is None or d < best[0]:
                        side = (dx * (py - ay) - dy * (px - ax))
                        best = (d, (L[i] + t * math.sqrt(ll)) / total, 1 if side > 0 else -1)
                d, t, side = best
                w = w0 + (w1 - w0) * t
                if d > w:
                    continue
                u = side * d / max(w, 0.5) * (-1 if flip else 1)
                if abs(u) > 0.8 and w > 1.6:
                    lv = 1
                elif u < -0.25:
                    lv = 3
                elif u > 0.45:
                    lv = 1
                else:
                    lv = 2
                if t > tip and lv > 1:
                    lv -= 1
                if sheen and lv == 3 and sheen(x, y):
                    lv = 4
                self.put(x, y, ramp[lv], hair=True)

    def outline_hair(self, col):
        # hair tips one pixel wide, or cut off from their lock, read as dirt: take them back
        while True:
            stray = [p for p in self.hair
                     if sum((p[0] + dx, p[1] + dy) in self.hair for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))) < 2]
            if not stray:
                break
            for p in stray:
                self.hair.discard(p)
                prev = self.under.pop(p, None)
                if prev is None:
                    self.px.pop(p, None)
                else:
                    self.px[p] = prev
        edge = [p for p in self.hair
                if any((p[0] + dx, p[1] + dy) not in self.hair for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))]
        for p in edge:
            self.px[p] = col

    def image(self, scale=1):
        im = Image.new('RGBA', (N, N), (0, 0, 0, 0))
        for (x, y), c in self.px.items():
            im.putpixel((x, y), c + (255,))
        return im.resize((N * scale, N * scale), Image.NEAREST) if scale != 1 else im


# ─── faces from the references ─────────────────────────────────────────────

V = load('victoria_portrait')
M = load('mitzi_portrait')

VSKIN = ['#ffeee0', '#f2cbab', '#e6be9c', '#f9ddc4', '#fbe0cb']
VEYE = ['#666688', '#00072c', '#9797b8', '#fffcff', '#ddd9e6', '#45455d', '#5b5b7a', '#262633', '#000000']
VLIPS = ['#bf4b40', '#a63131', '#7b0a0a']
MSKIN = ['#fef1e7', '#ecd0b9', '#f6dfcc', '#f0cbad', '#d3b094', '#efd1d1', '#f9e4e4', '#f1e3d8', '#f8e8dc']
MEYE = ['#030303', '#ffffff', '#dfdfdf', '#bbc7da', '#d1d6df', '#d2d2d2', '#828d9e']
MLIPS = ['#dab3b5', '#cb9597', '#c68d90', '#ae878a']

SKIN = hx('#ffeee0')
SKIN_SHADE = hx('#f2cbab')
SKIN_DARK = hx('#e6be9c')


def victoria_face(remap):
    """Victoria's face (rows 22-44): skin, eyes and lips, recoloured by `remap`."""
    skin, eye, lips = ({hx(c) for c in g} for g in (VSKIN, VEYE, VLIPS))
    out = {}
    for (x, y), c in V.items():
        if not (22 <= y <= 44 and 22 <= x <= 44):
            continue
        if c in skin or c in lips or (c in eye and 25 <= y <= 29 and 23 <= x <= 43):
            out[(x, y)] = remap.get(c, c)
    return out


def mitzi_face(remap):
    skin, eye, lips = ({hx(c) for c in g} for g in (MSKIN, MEYE, MLIPS))
    out = {}
    for (x, y), c in M.items():
        if not (21 <= y <= 42 and 19 <= x <= 45):
            continue
        if c in skin or c in lips or (c in eye and 26 <= y <= 31 and 20 <= x <= 44) or (c == hx('#ffffff') and 36 <= y <= 38):
            out[(x, y)] = remap.get(c, c)
    return out


def remap(pairs):
    return {hx(a): hx(b) for a, b in pairs.items()}


def paste_face(cv, face, forehead):
    """Face pixels over a plain forehead (it ends up under the fringe). Gaps
    inside a row (where a mark was left out) are filled with skin."""
    cv.poly(forehead, SKIN)
    rows = {}
    for (x, y) in face:
        rows.setdefault(y, []).append(x)
    for y, xs in rows.items():
        for x in range(min(xs), max(xs) + 1):
            cv.put(x, y, face.get((x, y), SKIN))


def hash01(i, seed):
    v = math.sin(i * 12.9898 + seed * 78.233) * 43758.5453
    return v - math.floor(v)


def hair_field(cv, region, flow, H, sw=3.0, seed=1, sheen=None, ends=None, light=None):
    """Fill `region` (pixel set) with strands running along `flow` (x, y) -> s.
    Each strand is sw px across: lit, mid, then a dark edge, the rhythm of
    Victoria's hair. Strands vary a little in tone; `ends(i)` gives the row
    where strand i stops, so the hem is ragged like real hair."""
    for (x, y) in sorted(region):
        s = flow(x, y) / sw
        i = math.floor(s)
        f = s - i
        if ends:
            e = ends(i)
            if y > e or (y > e - 2 and (f < 0.22 or f > 0.78)):
                continue
        lv = 3 if f < 0.36 else 2 if f < 0.72 else 1
        r = hash01(i, seed)
        if r < 0.22 and lv > 1:
            lv -= 1
        elif r > 0.85 and lv < 3:
            lv += 1
        if light:
            lv = max(1, min(3, lv + light(x, y)))
        if sheen and lv == 3 and sheen(x, y):
            lv = 4
        cv.put(x, y, H[lv], hair=True)


def region(*polys, minus=()):
    """Pixel set covered by polygons (scanline, like Canvas.poly)."""
    tmp = Canvas()
    for p in polys:
        tmp.poly(p, (1, 1, 1))
    cut = Canvas()
    for p in minus:
        cut.poly(p, (1, 1, 1))
    return set(tmp.px) - set(cut.px)


def radial(px, py, cx, y0, y1, k=14.0):
    """Strands fanning from a part at (px, py), turning to hang straight
    between rows y0 and y1."""
    def flow(x, y):
        a = math.atan2(x + 0.5 - px, max(0.5, y + 0.5 - py)) * k
        v = (x + 0.5 - cx)
        t = max(0.0, min(1.0, (y - y0) / max(1, y1 - y0)))
        return a * (1 - t) + v * t
    return flow


def shade_under_hair(cv):
    """Skin just below hair falls into a 1px shadow, as in the references."""
    for (x, y) in list(cv.px):
        if (x, y) in cv.hair:
            continue
        if (x, y - 1) in cv.hair and cv.px[(x, y)] == SKIN:
            cv.px[(x, y)] = SKIN_SHADE


def ramp(*cols):
    return [hx(c) for c in cols]


# ─── Hestia ────────────────────────────────────────────────────────────────

def hestia():
    cv = Canvas()
    H = ramp('#8f8aad', '#b4b0cb', '#d3d1e3', '#ecebf4', '#ffffff')
    flow = radial(37, 5, 33, 17, 29)
    sheen = lambda x, y: y < 17 and 10 <= math.hypot(x - 33, y - 19) <= 12.5
    light = lambda x, y: -1 if (x > 45 and y > 18) else 0
    ends = lambda i: 57 + int(hash01(i, 3) * 4)
    back = region([(29, 5), (37, 4), (43, 7), (47, 12), (49, 19), (49, 34), (50, 50), (51, 62), (15, 62), (16, 50), (17, 34), (17, 22),
                   (18, 15), (21, 10), (25, 6)])
    hair_field(cv, back, flow, H, seed=1, sheen=sheen, ends=ends, light=light)
    # black dress, round white collar
    K = ramp('#0b0a0e', '#15131a', '#201d26', '#2e2a35')
    def habit(x, y):
        if y < 56 and (x + 0.8 * y > 64 if x < 33 else x - 0.8 * y < 2) and (x < 24 or x > 42):
            return K[3] if abs(y - (55 - abs(x - 33) * 0.55)) < 1.2 else K[1]  # light along the shoulders
        if (x in (25, 41) and y > 54) or (x in (24, 42) and y > 59):
            return K[2]  # folds
        return K[1] if x > 41 else K[0]
    cv.poly([(14, 64), (15, 55), (20, 50), (27, 46), (39, 46), (46, 50), (51, 55), (52, 64)], habit)
    cv.poly([(29, 39), (38, 39), (38, 47), (29, 47)], lambda x, y: SKIN_SHADE if x in (29, 37) or y >= 45 else SKIN)
    W = ramp('#a9a5c2', '#d6d4e3', '#efeef5', '#ffffff')
    for cx in (28, 39):
        cv.ellipse(cx, 49.5, 7.5, 4.2, lambda x, y, nx, ny, cx=cx: W[0] if ny > 0.8 else W[1] if ny > 0.4 else
                   W[3] if nx * (1 if cx < 33 else -1) < 0.1 else W[2])
    for y in range(46, 53):
        cv.put(33, y, W[0])
    face = victoria_face(remap({
        '#9797b8': '#e6e4ef', '#666688': '#aeabc4', '#5b5b7a': '#9592ad', '#45455d': '#6d6a85',
        '#00072c': '#2b2838', '#262633': '#3b3848', '#bf4b40': '#f2ae76', '#a63131': '#e98e42', '#7b0a0a': '#c96f33'}))
    paste_face(cv, face, [(24, 14), (42, 14), (44, 26), (23, 26)])
    # curtains in front of the shoulders
    front = region([(16, 19), (23, 19), (23, 31), (24, 44), (24, 58), (15, 58), (16, 40)],
                   [(43, 19), (50, 19), (50, 40), (51, 58), (43, 58), (43, 44), (44, 31)])
    hair_field(cv, front, flow, H, seed=1, sheen=sheen, ends=lambda i: 53 + int(hash01(i, 5) * 5), light=light)
    # fringe from a part above her left eye, swept across
    for spine, w0, w1 in (
        (bez((37, 6), (30, 8), (25, 14), (23, 24)), 2.6, 1.3),
        (bez((37, 6), (32, 10), (28, 16), (26, 24)), 2.3, 1.1),
        (bez((37, 7), (34, 12), (31, 18), (30, 24)), 2.2, 1.0),
        (bez((38, 7), (37, 13), (35, 18), (34, 23)), 2.0, 0.9),
        (bez((38, 7), (41, 12), (42, 18), (43, 25)), 2.2, 1.1),
        (bez((39, 7), (44, 11), (46, 17), (46, 27)), 2.4, 1.4),
    ):
        cv.lock(spine, w0, w1, H, sheen)
    cv.outline_hair(H[0])
    shade_under_hair(cv)
    # thin black hairband over the crown
    for a in range(196, 300, 2):
        r = math.radians(a)
        cv.put(round(33 + 13.5 * math.cos(r)), round(20 + 14 * math.sin(r)), hx('#141218'))
    # gold cross hairpin; a cross on a fine chain
    G = ramp('#b86428', '#e98e42', '#fcb448', '#fbd58a')
    for y in range(16, 28):
        cv.put(46, y, G[2] if y < 22 else G[1])
    for x in range(44, 49):
        cv.put(x, 19, G[2])
    cv.put(46, 19, G[3])
    for i in range(6):
        cv.put(30 + i // 2, 47 + i, G[1])
        cv.put(36 - i // 2, 47 + i, G[1])
    for y in range(53, 61):
        cv.put(33, y, G[2] if y < 57 else G[1])
    for x in range(31, 36):
        cv.put(x, 55, G[2])
    cv.put(33, 55, G[3])
    return cv


# ─── Charon ────────────────────────────────────────────────────────────────

def charon():
    cv = Canvas()
    H = ramp('#26170d', '#4e331f', '#6f4a2e', '#946640', '#bc8c5e')
    flow = radial(41, 5, 33, 18, 30)
    sheen = lambda x, y: y < 17 and 10 <= math.hypot(x - 34, y - 20) <= 12.5
    light = lambda x, y: -1 if (x > 45 and y > 20) or y > 39 else 0
    bob = region([(30, 4), (38, 4), (45, 7), (49, 12), (51, 20), (51, 30), (51, 37), (49, 42), (45, 43), (24, 44), (19, 47),
                  (15, 45), (14, 36), (15, 26), (17, 17), (20, 10), (25, 6)])
    hair_field(cv, bob, flow, H, seed=2, sheen=sheen, light=light)
    # coat with a stand-up collar, shirt, green tie
    C = ramp('#1d140d', '#2b2017', '#3d2e21', '#54402e', '#6f5640')
    cv.poly([(12, 64), (13, 56), (19, 51), (27, 48), (39, 48), (47, 51), (53, 56), (54, 64)],
            lambda x, y: C[3] if x < 21 else C[1] if x > 45 else C[2])
    cv.poly([(29, 39), (38, 39), (38, 47), (29, 47)], lambda x, y: SKIN_SHADE if x in (29, 37) or y >= 44 else SKIN)
    S = ramp('#b9ae9c', '#e8e0d0', '#f7f2e8')
    cv.poly([(28, 45), (33, 50), (38, 45), (36, 57), (31, 57)], lambda x, y: S[2] if x < 31 else S[1] if x < 35 else S[0])
    T = ramp('#1e3a26', '#2f5a3a', '#4a7f55')
    cv.poly([(32, 49), (35, 49), (36, 62), (34, 64), (32, 62)], lambda x, y: T[2] if x == 32 else T[1])
    cv.poly([(32, 47), (35, 47), (35, 50), (32, 50)], T[0])
    cv.poly([(24, 40), (29, 44), (31, 57), (25, 54), (20, 49)], lambda x, y: C[4] if x < 24 else C[3])
    cv.poly([(43, 40), (38, 44), (36, 57), (42, 54), (47, 49)], lambda x, y: C[2] if x > 42 else C[1])
    face = victoria_face(remap({
        '#9797b8': '#a8d896', '#666688': '#5f9c58', '#5b5b7a': '#4c8648', '#45455d': '#2f5e34',
        '#00072c': '#0e2412', '#262633': '#1b301d',
        '#bf4b40': '#ffeee0', '#a63131': '#ffeee0', '#7b0a0a': '#ffeee0'}))
    paste_face(cv, face, [(24, 14), (42, 14), (44, 26), (23, 26)])
    smirk = hx('#c1806c')
    for x in range(31, 35):
        cv.put(x, 35, smirk)
    cv.put(35, 34, smirk)
    cv.put(32, 36, SKIN_SHADE)
    cv.put(33, 36, SKIN_SHADE)
    # cheek locks
    cheeks = region([(15, 22), (23, 22), (23, 30), (26, 34), (26, 40), (23, 45), (18, 47), (15, 44), (14, 30)],
                    [(43, 22), (50, 22), (51, 30), (50, 39), (47, 43), (42, 41), (41, 34), (44, 30)])
    hair_field(cv, cheeks, flow, H, seed=2, sheen=sheen, light=light)
    # fringe swept across to her right
    for spine, w0, w1 in (
        (bez((41, 6), (33, 8), (26, 13), (23, 23)), 2.8, 1.4),
        (bez((41, 7), (35, 10), (29, 16), (26, 23)), 2.5, 1.2),
        (bez((42, 7), (38, 12), (33, 17), (30, 22)), 2.3, 1.0),
        (bez((42, 8), (41, 13), (38, 18), (36, 22)), 2.0, 0.9),
        (bez((43, 7), (46, 12), (47, 18), (45, 25)), 2.4, 1.2),
    ):
        cv.lock(spine, w0, w1, H, sheen)
    cv.outline_hair(H[0])
    shade_under_hair(cv)
    # head-mirror on its strap
    for a in range(212, 332, 2):
        r = math.radians(a)
        cv.put(round(33 + 14 * math.cos(r)), round(21 + 14.5 * math.sin(r)), hx('#1a120c'))
    Mr = ramp('#3e464c', '#6f7c84', '#a6b2ba', '#dce4ea')
    cv.ellipse(23.5, 11.5, 5, 5, lambda x, y, nx, ny: Mr[0] if nx * nx + ny * ny > 0.7 else Mr[3] if nx + ny < -0.6 else
               Mr[2] if nx + ny < 0.3 else Mr[1])
    cv.ellipse(24, 12, 1.2, 1.2, hx('#141414'))
    # the coin on its chain
    Gd = ramp('#8a5c1c', '#c8902e', '#e8c25a', '#ffe9a0')
    for i in range(7):
        cv.put(39 + i // 2, 50 + i, Gd[1])
    cv.ellipse(42.5, 59.5, 3, 3, lambda x, y, nx, ny: Gd[0] if nx * nx + ny * ny > 0.65 else Gd[3] if nx + ny < -0.4 else Gd[2])
    cv.put(42, 59, Gd[1])
    return cv


# ─── Alice ─────────────────────────────────────────────────────────────────

def alice():
    cv = Canvas()
    H = ramp('#7f3546', '#c26a7b', '#dc8c98', '#efadb3', '#fdd6d2')
    base = radial(32, 6, 32, 18, 30)
    flow = lambda x, y: base(x, y) + (1.3 * math.sin(y / 4.2) if y > 24 else 0)
    sheen = lambda x, y: y < 17 and 10 <= math.hypot(x - 32, y - 20) <= 12.5
    light = lambda x, y: -1 if (x > 45 and y > 20) else 0
    left = [(17 - (y - 14) * 0.07 - 1.6 * math.sin(y / 4.2), y) for y in range(14, 63, 2)]
    right = [(47 + (y - 14) * 0.07 + 1.6 * math.sin(y / 4.2 + 1.2), y) for y in range(62, 13, -2)]
    dome = [(32 + 15 * math.cos(math.radians(a)), 20 + 15.5 * math.sin(math.radians(a))) for a in range(200, 341, 10)]
    back = region(left + dome + right)
    hair_field(cv, back, flow, H, seed=4, sheen=sheen, ends=lambda i: 59 + int(hash01(i, 7) * 5), light=light)
    # pink dress, frilled white collar, the pocket watch
    D = ramp('#a9566a', '#cf7686', '#e79aa6', '#f5bfc5')
    cv.poly([(14, 64), (15, 56), (20, 51), (27, 48), (37, 48), (44, 51), (49, 56), (50, 64)],
            lambda x, y: D[0] if y in (53, 54) or (x in (24, 40) and y > 57) else D[2] if x < 21 else D[0] if x > 43 else D[1])
    cv.poly([(28, 40), (37, 40), (37, 48), (28, 48)], lambda x, y: SKIN_SHADE if x in (28, 36) or y >= 46 else SKIN)
    W = ramp('#b8b4c8', '#dcdae6', '#f0f0f0', '#ffffff')
    for i, x0 in enumerate(range(19, 46, 4)):
        cv.ellipse(x0 + 2, 49.5 + (1 if i % 2 else 0), 3, 2.6,
                   lambda x, y, nx, ny: W[0] if ny > 0.75 else W[1] if ny > 0.35 else W[3] if nx < 0 else W[2])
    face = mitzi_face(remap({
        '#fef1e7': '#ffeee0', '#ecd0b9': '#f2cbab', '#f6dfcc': '#fbe0cb', '#f0cbad': '#f2cbab', '#d3b094': '#e6be9c',
        '#f1e3d8': '#f9ddc4', '#f8e8dc': '#ffeee0', '#efd1d1': '#f8c3c0', '#f9e4e4': '#fcd7d2',
        '#828d9e': '#3f8f9c', '#bbc7da': '#6cbccb', '#d1d6df': '#9fdee5', '#d2d2d2': '#8cced6', '#dfdfdf': '#c5ebf0',
        '#dab3b5': '#f2a9b2', '#cb9597': '#e07888', '#c68d90': '#cf6a7c', '#ae878a': '#b65a6c'}))
    paste_face(cv, face, [(23, 15), (41, 15), (44, 27), (20, 27)])
    # long locks framing the face, over the collar
    front = region([(15, 22), (21, 22), (21, 32), (24, 36), (24, 44), (23, 55), (16, 56), (14, 44), (14, 30)],
                   [(43, 22), (49, 22), (50, 30), (50, 44), (48, 56), (41, 55), (40, 44), (40, 36), (43, 32)])
    hair_field(cv, front, flow, H, seed=4, sheen=sheen, ends=lambda i: 52 + int(hash01(i, 9) * 5), light=light)
    # fringe parted in the middle
    for spine, w0, w1 in (
        (bez((31, 7), (26, 10), (22, 17), (21, 26)), 2.6, 1.3),
        (bez((31, 7), (28, 12), (25, 19), (25, 26)), 2.3, 1.1),
        (bez((31, 8), (30, 14), (29, 20), (29, 25)), 2.0, 1.0),
        (bez((33, 8), (34, 14), (35, 20), (35, 25)), 2.0, 1.0),
        (bez((33, 7), (36, 12), (39, 19), (39, 26)), 2.3, 1.1),
        (bez((33, 7), (38, 10), (42, 17), (43, 26)), 2.6, 1.3),
    ):
        cv.lock(spine, w0, w1, H, sheen)
    cv.outline_hair(H[0])
    shade_under_hair(cv)
    # a white frilled hairband, resting on the crown
    band = {}
    for a10 in range(1960, 3450, 5):
        r = math.radians(a10 / 10)
        for k, rr in enumerate((12.6, 13.6)):
            band[(round(32 + rr * math.cos(r)), round(21 + rr * 1.04 * math.sin(r)))] = W[2] if k else W[3]
    for a in range(200, 341, 9):
        r = math.radians(a)
        band[(round(32 + 14.8 * math.cos(r)), round(21 + 15.4 * math.sin(r)))] = W[3]
    for (x, y), c in band.items():
        cv.put(x, y, c)
    for (x, y) in band:
        if (x, y + 1) not in band and (x, y + 1) in cv.hair:
            cv.put(x, y + 1, H[1], hair=True)
    # pocket watch on its chain
    Gd = ramp('#8a6a2a', '#c8a860', '#f0d390', '#fff3c4')
    for i in range(5):
        cv.put(30 + i // 3, 52 + i, Gd[1])
        cv.put(34 - i // 3, 52 + i, Gd[1])
    cv.ellipse(32, 60, 3.6, 3.6, lambda x, y, nx, ny: Gd[0] if nx * nx + ny * ny > 0.62 else hx('#fbf7ee'))
    cv.put(32, 57, Gd[3])
    cv.put(32, 59, hx('#3a2a20'))
    cv.put(33, 60, hx('#3a2a20'))
    return cv


def lineup(out, scale=6, pad=12):
    """All five side by side: Mitzi and Victoria (the references), then these three."""
    ims = [Image.open(os.path.join(ROOT, 'assets', 'art', n + '.png')).convert('RGBA') for n in ('mitzi_portrait', 'victoria_portrait')]
    ims += [Image.open(os.path.join(out, n + '_portrait.png')).convert('RGBA') for n in ('alice', 'hestia', 'charon')]
    s = N * scale
    sheet = Image.new('RGBA', (len(ims) * (s + pad) + pad, s + 2 * pad), hx('#18121a') + (255,))
    for i, im in enumerate(ims):
        x = pad + i * (s + pad)
        sheet.paste(Image.new('RGBA', (s, s), hx('#2e2430') + (255,)), (x, pad))
        sheet.alpha_composite(im.resize((s, s), Image.NEAREST), (x, pad))
    sheet.save(os.path.join(out, 'cast_lineup.png'))


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'art', 'portraits64')
    os.makedirs(out, exist_ok=True)
    for name, fn in (('hestia', hestia), ('charon', charon), ('alice', alice)):
        cv = fn()
        cv.image().save(os.path.join(out, f'{name}_portrait.png'))
        cv.image(8).save(os.path.join(out, f'{name}_portrait_8x.png'))
        print(f'{name}: {len(set(cv.px.values()))} colours')
    lineup(out)


if __name__ == '__main__':
    main()
