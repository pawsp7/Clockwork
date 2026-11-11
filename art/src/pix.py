"""Tiny pixel-art raster toolkit shared by the portrait scripts."""
import math
from PIL import Image

BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]


def hx(s):
    s = s.lstrip('#')
    return tuple(int(s[i:i + 2], 16) for i in (0, 2, 4))


def dith(x, y, t):
    return t * 16 > BAYER[y & 3][x & 3] + 0.5


def ramp(x, y, t, stops, zone=0.18):
    """Pick a colour for t in [0,1]. Flat bands, with a short dithered seam
    only where one band meets the next (no checkerboard over whole areas)."""
    t = max(0.0, min(1.0, t)) * (len(stops) - 1)
    i = min(len(stops) - 2, int(t))
    f = t - i
    if f < 0.5 - zone:
        return stops[i]
    if f > 0.5 + zone:
        return stops[i + 1]
    return stops[i + 1] if dith(x, y, (f - (0.5 - zone)) / (2 * zone)) else stops[i]


def blend(c, d, a):
    return tuple(round(c[i] * (1 - a) + d[i] * a) for i in range(3))


class Layer:
    def __init__(self, w, h, fill=None):
        self.w, self.h = w, h
        self.px = [[fill] * w for _ in range(h)]

    def put(self, x, y, c):
        x, y = int(x), int(y)
        if 0 <= x < self.w and 0 <= y < self.h and c is not None:
            self.px[y][x] = c

    def get(self, x, y):
        if 0 <= x < self.w and 0 <= y < self.h:
            return self.px[y][x]
        return None

    def poly(self, pts, col):
        """Fill polygon; col is a colour or fn(x, y) -> colour."""
        ys = [p[1] for p in pts]
        for y in range(max(0, int(min(ys))), min(self.h, int(max(ys)) + 1)):
            cy = y + 0.5
            xs = []
            for i in range(len(pts)):
                (x0, y0), (x1, y1) = pts[i], pts[(i + 1) % len(pts)]
                if (y0 <= cy < y1) or (y1 <= cy < y0):
                    xs.append(x0 + (cy - y0) * (x1 - x0) / (y1 - y0))
            xs.sort()
            for a, b in zip(xs[::2], xs[1::2]):
                for x in range(max(0, math.ceil(a - 0.5)), min(self.w, math.floor(b - 0.5) + 1)):
                    self.put(x, y, col(x, y) if callable(col) else col)

    def ellipse(self, cx, cy, rx, ry, col):
        for y in range(int(cy - ry - 1), int(cy + ry + 2)):
            for x in range(int(cx - rx - 1), int(cx + rx + 2)):
                nx, ny = (x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry
                if nx * nx + ny * ny <= 1:
                    self.put(x, y, col(x, y, nx, ny) if callable(col) else col)

    def line(self, x0, y0, x1, y1, col):
        n = int(max(abs(x1 - x0), abs(y1 - y0))) * 2 + 1
        for i in range(n + 1):
            t = i / n
            self.put(round(x0 + (x1 - x0) * t), round(y0 + (y1 - y0) * t), col)

    def stamp(self, rows, pal, x, y, mirror=False):
        for j, r in enumerate(rows):
            if mirror:
                r = r[::-1]
            for i, ch in enumerate(r):
                if ch in pal:
                    self.put(x + i, y + j, pal[ch])

    def outline(self, col, where=None):
        """Draw `col` on empty pixels touching filled ones (4-neighbour)."""
        add = []
        for y in range(self.h):
            for x in range(self.w):
                if self.px[y][x] is not None:
                    continue
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    if self.get(x + dx, y + dy) is not None:
                        add.append((x, y))
                        break
        for x, y in add:
            if where is None or where(x, y):
                self.px[y][x] = col

    def over(self, other):
        for y in range(self.h):
            for x in range(self.w):
                if other.px[y][x] is not None:
                    self.px[y][x] = other.px[y][x]

    def save_cutout(self, path, mask, scale=1):
        """Save this layer's colours only where `mask` has pixels; transparent
        everywhere else (the character without the background)."""
        im = Image.new('RGBA', (self.w, self.h))
        im.putdata([(c + (255,)) if m is not None else (0, 0, 0, 0)
                    for row, mrow in zip(self.px, mask.px) for c, m in zip(row, mrow)])
        if scale != 1:
            im = im.resize((self.w * scale, self.h * scale), Image.NEAREST)
        im.save(path)
        return im

    def save(self, path, scale=1):
        im = Image.new('RGB', (self.w, self.h))
        im.putdata([c or (0, 0, 0) for row in self.px for c in row])
        if scale != 1:
            im = im.resize((self.w * scale, self.h * scale), Image.NEAREST)
        im.save(path)
        return im
