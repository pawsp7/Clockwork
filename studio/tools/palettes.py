"""Build the Studio's preset palettes from Clockwork's own art.

Each character palette is the colours that character is actually drawn in
(sprite + portrait), merged down to a usable count and sorted into ramps
(dark to light within each hue family), so the Studio's Shade tool can step
along them. Writes studio/js/palettes.js.

Usage (from the repo root): python3 studio/tools/palettes.py
Needs Python 3 and Pillow.
"""
import colorsys
import json
import os
from collections import Counter
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def colours(paths):
    count = Counter()
    for p in paths:
        im = Image.open(os.path.join(ROOT, p)).convert('RGBA')
        for r, g, b, a in im.getdata():
            if a >= 128:
                count[(r, g, b)] += 1
    return count


def dist(c, d):
    # "redmean" weighted RGB distance: cheap and close enough to perceptual
    rm = (c[0] + d[0]) / 2
    dr, dg, db = c[0] - d[0], c[1] - d[1], c[2] - d[2]
    return ((2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db) ** 0.5


def reduce(count, n):
    """Merge the closest pair until n remain. The more common colour of the
    pair survives unchanged, so every swatch is a colour from the art."""
    cols = dict(count)
    while len(cols) > n:
        keys = list(cols)
        best = None
        for i, a in enumerate(keys):
            for b in keys[i + 1:]:
                d = dist(a, b)
                if best is None or d < best[0]:
                    best = (d, a, b)
        _, a, b = best
        keep, drop = (a, b) if cols[a] >= cols[b] else (b, a)
        cols[keep] += cols.pop(drop)
    return list(cols)


def luma(c):
    return 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]


def ramps(cols):
    """Greys first, then hue families from red round to magenta, each dark→light."""
    groups = {}
    for c in cols:
        h, s, v = colorsys.rgb_to_hsv(*(x / 255 for x in c))
        key = -1 if s < 0.14 or v < 0.1 else int(((h * 360 + 15) % 360) // 30)
        groups.setdefault(key, []).append(c)
    out = []
    for k in sorted(groups):
        out += sorted(groups[k], key=luma)
    return ['#%02x%02x%02x' % c for c in out]


def from_art(paths, n):
    return ramps(reduce(colours(paths), n))


def generic_ramps():
    """A neutral starter set: 8 hue ramps of 4 plus 8 greys (not from the game)."""
    out = ['#%02x%02x%02x' % ((v,) * 3) for v in (12, 36, 60, 88, 120, 156, 200, 240)]
    for hue in (0, 28, 50, 95, 160, 205, 250, 300):
        for s, v in ((0.65, 0.28), (0.6, 0.5), (0.5, 0.72), (0.32, 0.92)):
            r, g, b = colorsys.hsv_to_rgb(hue / 360, s, v)
            out.append('#%02x%02x%02x' % (round(r * 255), round(g * 255), round(b * 255)))
    return out


A = 'assets/art/'
P = 'art/portraits/'
PALETTES = [
    ('clockwork', 'Clockwork (whole cast)', [
        A + 'alice_sprite_forward.png', A + 'mitzi_sprite_forward.png', A + 'victoria_sprite_forward.png',
        P + 'alice_portrait_transparent.png', P + 'mitzi_portrait_transparent.png',
        P + 'victoria_portrait_transparent.png', P + 'hestia_portrait_transparent.png',
        P + 'charon_portrait_transparent.png'], 64),
    ('gehenna', 'Gehenna (the watch piece)', ['art/watch/through_the_watch.png'], 48),
    ('alice', 'Alice', [A + 'alice_sprite_forward.png', P + 'alice_portrait_transparent.png'], 32),
    ('mitzi', 'Mitzi', [A + 'mitzi_sprite_forward.png', A + 'mitzi_back.png', A + 'mitzi_portrait.png'], 32),
    ('victoria', 'Victoria', [A + 'victoria_sprite_forward.png', A + 'victoria_portrait.png'], 32),
    ('hestia', 'Hestia', [A + 'hestia_portrait.png', P + 'hestia_portrait_transparent.png'], 32),
    ('charon', 'Charon', [P + 'charon_portrait_transparent.png'], 32),
]

# The game's interface colours (css/style.css :root), in ramp order.
UI = ['#060408', '#0c0a0e', '#18121a', '#241b26', '#2e2430', '#4a3a42', '#6a5660', '#74686a',
      '#b0a29a', '#ece2d8', '#5a2028', '#c8505e', '#cc6474', '#e07070', '#e0a0b2', '#b8946e',
      '#8a7046', '#d0b06a', '#e6c674', '#e8cc68', '#e0845a', '#a6b86e', '#a4b46a', '#8ac88a',
      '#78a8d8', '#7aa8d8', '#b4a4d4', '#ece4d8']


def main():
    out = []
    for key, name, paths, n in PALETTES:
        cols = from_art(paths, n)
        out.append({'id': key, 'name': name, 'colors': cols})
        print(f'{name}: {len(cols)} colours')
    out.append({'id': 'ui', 'name': 'Clockwork interface', 'colors': UI})
    out.append({'id': 'starter', 'name': 'Starter ramps', 'colors': generic_ramps()})
    out.append({'id': 'grey', 'name': 'Greys (16)', 'colors': ['#%02x%02x%02x' % ((round(i * 255 / 15),) * 3) for i in range(16)]})
    out.append({'id': 'mono', 'name': '1-bit', 'colors': ['#0c0a0e', '#ece2d8']})
    lines = ['  { id: %s, name: %s,\n    colors: %s },' % (json.dumps(p['id']), json.dumps(p['name']),
             json.dumps(p['colors']).replace('", "', "','").replace('["', "['").replace('"]', "']"))
             for p in out]
    js = ('// Generated by studio/tools/palettes.py from the game\'s art. Do not edit by hand.\n'
          'export const PRESETS = [\n' + '\n'.join(lines) + '\n];\n')
    with open(os.path.join(ROOT, 'studio/js/palettes.js'), 'w') as f:
        f.write(js)


if __name__ == '__main__':
    main()
