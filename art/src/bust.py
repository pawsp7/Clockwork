"""Shared pieces for the 96x96 bust portraits: face, neck, eyes, hair shading."""
import math
from pix import Layer, hx, ramp, dith, blend

W = H = 96
CX = 48


def face_hw(y, top_w=14.2, jaw=44, bottom=63):
    """Half-width of the face: a round face. The cheeks stay full well below
    the eyes (a little fuller around the blush), then curve round into a soft
    chin instead of tapering to a point."""
    if y < jaw:
        return top_w
    t = min(1.0, (y - jaw) / (bottom - jaw))
    fuller = 0.7 * math.sin(min(1.0, t * 1.6) * math.pi)    # chubby cheeks
    return max(1.5, (top_w + fuller) * (1 - t ** 2.4) ** 0.5)


def face(fig, SKIN, BLUSH, top=26, bottom=63, blush_y=52):
    """Lit from the upper left, in flat bands: a shadow down the right side and
    under the jaw, a darker line along the jaw, a lit cheek on the left."""
    def col(x, y):
        hw = face_hw(y)
        dx = x - CX
        k = 0
        if dx > hw - 5 or (y > 56 and abs(dx) > hw - 3): k = 1
        if dx > hw - 2 or (y > 59 and abs(dx) > hw - 1.5): k = 2
        if y >= bottom - 1: k = max(k, 1)
        return SKIN[k]
    pts = [(CX - face_hw(y), y) for y in range(top, bottom + 1)] + \
          [(CX + face_hw(y) + 1, y) for y in range(bottom, top - 1, -1)]
    fig.poly(pts, col)
    # jawline: one darker pixel along the lower edge on the shadow side
    for y in range(50, bottom + 1):
        x = round(CX + face_hw(y))
        if fig.get(x, y) in SKIN:
            fig.put(x, y, SKIN[3])
    for x in range(CX - 2, CX + 4):
        if fig.get(x, bottom) in SKIN:
            fig.put(x, bottom, SKIN[2])
    for side in (-1, 1):
        for x in range(CX + side * 10 - 2, CX + side * 10 + 3):
            for y in (blush_y, blush_y + 1):
                if not (y == blush_y + 1 and abs(x - (CX + side * 10)) == 2):
                    fig.put(x, y, BLUSH)


# Eyes, 11 wide x 9 tall, drawn for the viewer's left eye and mirrored.
# k lash  w white  1-4 iris dark->light  p pupil  h highlight  l lower lid
EYE_SHAPES = {
    'wide': [            # open and bright (Alice, Mitzi)
        "...kkkkkk..",
        ".kkkkkkkkkk",
        "kk.w11111k.",
        "...whh122w.",
        "...wh2p22w.",
        "...w33p3hw.",
        "...w34443w.",
        "....l444l..",
        "...........",
    ],
    'lidded': [          # heavy lid, half-closed (Hestia, Charon)
        "...........",
        "...........",
        "..kkkkkkkk.",
        "kkkkkkkkkkk",
        "k..wh1111w.",
        "...wh2p22w.",
        "...w33p3hw.",
        "....l444l..",
        "...........",
    ],
    'sharp': [           # lined top and bottom (Victoria)
        "..kkkkkkk..",
        "kkkkkkkkkkk",
        "kk.w11111kk",
        "...whh122w.",
        "...wh2p22w.",
        "...w33p3hw.",
        "...w34443k.",
        "....k444k..",
        ".....kkk...",
    ],
}


def draw_eyes(fig, shape, iris, lash, lid, y=39, lx=33, rx=53, pupil=None, white='f8f6fb'):
    """iris: four colours dark->light (hex). Shaded top to bottom, a pupil,
    a big highlight upper left and a small one lower right."""
    from pix import hx as _hx
    pal = {'k': _hx(lash), 'w': _hx(white), 'h': (255, 255, 255), 'l': _hx(lid),
           '1': _hx(iris[0]), '2': _hx(iris[1]), '3': _hx(iris[2]), '4': _hx(iris[3]),
           'p': _hx(pupil or iris[0])}
    rows = EYE_SHAPES[shape]
    fig.stamp(rows, pal, lx, y)
    fig.stamp(rows, pal, rx, y, mirror=True)


def neck(fig, SKIN, y0=56, y1=74, x0=42, x1=54):
    fig.poly([(x0, y0), (x1, y0), (x1 + 1, y1), (x0 - 1, y1)],
             lambda x, y: SKIN[1] if x > x1 - 3 else SKIN[0])
    for x in range(x0 - 1, x1 + 2):
        for y in range(y0 + 2, y0 + 8):
            if y < y0 + 6:
                fig.put(x, y, SKIN[2] if y < y0 + 4 else SKIN[1])


def eyes(fig, rows, pal, y=41, lx=33, rx=53):
    fig.stamp(rows, pal, lx, y)
    fig.stamp(rows, pal, rx, y, mirror=True)


def nose(fig, SKIN, y=52):
    fig.put(49, y, SKIN[2]); fig.put(49, y + 1, SKIN[3]); fig.put(48, y + 2, SKIN[2])


def hair_shader(stops, light_x=-1.0, wave=0.95, diag=0.0):
    """Lit from the upper left; `diag` slants the strands, `wave` sets their width."""
    def col(x, y, tilt=0.0):
        t = 0.62 + light_x * (x - CX) / 60 - (y - 40) / 160
        t += 0.16 * math.sin((x + y * diag) * wave + tilt) + 0.07 * math.sin(x * 0.37 + 2 * tilt)
        return ramp(x, y, t, stops)
    return col


def strands(fig, stops, lines, dark):
    for (x0, y0, x1, y1) in lines:
        for i in range(30):
            t = i / 29
            x, y = round(x0 + (x1 - x0) * t), round(y0 + (y1 - y0) * t + 2 * math.sin(t * 3))
            if fig.get(x, y) in stops and dith(x, y, 0.7):
                fig.put(x, y, dark)


def wavy_lock(fig, col, x_top, y_top, y_bot, w_top, w_bot, amp, freq, ph, tilt=0.0):
    """A long lock of hair hanging from (x_top, y_top), swaying as it falls."""
    for y in range(y_top, y_bot + 1):
        t = (y - y_top) / max(1, y_bot - y_top)
        cx = x_top + amp * math.sin(t * freq + ph) * min(1, t * 3) + tilt * t
        w = w_top + (w_bot - w_top) * t
        for x in range(round(cx - w / 2), round(cx + w / 2) + 1):
            fig.put(x, y, col(x, y, ph))


def finish(bg, fig, outline, rim=None, rim_col=None, rim_side=-1, out=None):
    fig.outline(outline)
    res = Layer(W, H)
    res.over(bg)
    res.over(fig)
    if rim_col:
        for y in range(H):
            for x in range(W):
                c = fig.get(x, y)
                if c and c != outline and fig.get(x + rim_side, y) == outline and (rim is None or rim(x, y)):
                    res.put(x, y, blend(c, rim_col, 0.4))
    return res


def big_form(x, y, lock=True):
    """Light on the whole head of hair: lit at the crown and outer edge,
    shadowed underneath and where the hair falls against the cheek."""
    dist = abs(x - CX)
    t = 0.6 - max(0, y - 16) / 220 - (x - CX) / 260
    if lock and 13 <= dist <= 20 and y > 36:
        t -= 0.2                       # one flat band of shadow beside the cheek
    return t


def fringe(fig, clumps, HAIR, SKIN, head=(CX, 36), ring=None, line=None):
    """Front hair built from tapered clumps that fan out from the part.

    clumps: (root_x, root_y, tip_x, tip_y, width, bend), drawn in order (later on top).
    Each clump is lit on its upper-left side; where one clump overlaps an earlier
    one, the earlier gets a dark edge. The fringe casts a shadow on the skin below,
    and `ring` = (radius, a0, a1) adds a highlight band across the crown.
    """
    ids = {}
    shade = {}
    hx_, hy_ = head
    n = len(HAIR) - 1
    # re-shade the hair already drawn behind (the back of the head and the long
    # fall) with the same big-form light as the clumps, a touch darker, so the
    # front melts into it instead of sitting on top of it
    hairset = set(HAIR)
    before = {}
    for y in range(fig.h):
        for x in range(fig.w):
            if fig.px[y][x] in hairset:
                t = big_form(x, y, lock=y > 34) - 0.06
                fig.px[y][x] = HAIR[int(max(0, min(1, t)) * n + 0.5)]
            before[(x, y)] = fig.px[y][x]
    for k, cl in enumerate(clumps):
        rx, ry, tx, ty, w0, bend = cl[:6]
        amp, freq, ph = (cl[6:9] if len(cl) >= 9 else (0, 0, 0))
        mx, my = (rx + tx) / 2, (ry + ty) / 2
        ox, oy = mx - hx_, my - hy_
        on = math.hypot(ox, oy) or 1
        cx_, cy_ = mx + ox / on * bend, my + oy / on * bend
        steps = 200
        for i in range(steps + 1):
            v = i / steps
            px = (1 - v) ** 2 * rx + 2 * (1 - v) * v * cx_ + v * v * tx
            py = (1 - v) ** 2 * ry + 2 * (1 - v) * v * cy_ + v * v * ty
            dx = 2 * (1 - v) * (cx_ - rx) + 2 * v * (tx - cx_)
            dy = 2 * (1 - v) * (cy_ - ry) + 2 * v * (ty - cy_)
            dl = math.hypot(dx, dy) or 1
            nx, ny = -dy / dl, dx / dl
            if nx > 0 or (nx == 0 and ny > 0):      # make +u the left/upper (lit) side
                nx, ny = -nx, -ny
            # full width by a third of the way down, then a long taper to a point
            w = w0 * min(1.0, 0.55 + v * 1.4) * (1 - v) ** 0.85 + 0.3
            sway = amp * math.sin(v * freq + ph) * min(1, v * 3)
            u = -w
            while u <= w:
                x, y = round(px + nx * (u + sway)), round(py + ny * (u + sway))
                un = u / w
                lock = ty > 100
                # big form first: lit at the crown and outer edge, shadowed
                # underneath and where the hair sits against the cheek
                t = big_form(x, y, lock)
                # small per-clump modelling on top
                t += 0.06 * un
                ids[(x, y)] = k
                shade[(x, y)] = t
                u += 0.25
    # only the bangs over the forehead shape the clean edge; the long pieces
    # framing the face, the side locks and the crown keep their own shape
    bang = {k for k, cl in enumerate(clumps) if 30 <= cl[2] <= 66 and cl[3] <= hy_ + 7}
    tips = sorted((clumps[k][2], clumps[k][3]) for k in bang)
    edge = {}
    if len(tips) >= 3:
        xs = range(round(tips[0][0]), round(tips[-1][0]) + 1)
        raw = {}
        for x in xs:
            for (x0, y0), (x1, y1) in zip(tips, tips[1:]):
                if x0 <= x <= x1:
                    raw[x] = y0 + (y1 - y0) * ((x - x0) / (x1 - x0) if x1 > x0 else 0)
                    break
        for _ in range(2):        # smooth the zigzag into one clean curve
            raw = {x: sum(raw.get(x + d, raw[x]) for d in range(-2, 3)) / 5 for x in raw}
        edge = {x: round(y) - 2 for x, y in raw.items()}   # sit clear of the lashes
        locks = {k for k, cl in enumerate(clumps) if cl[3] > 100}
        for (x, y) in list(ids):
            if x in edge and y > edge[x] and ids[(x, y)] in bang and y < hy_ + 20:
                del ids[(x, y)]; del shade[(x, y)]
                fig.put(x, y, before.get((x, y)))
        for x, ey in edge.items():   # fill any face showing above the curve
            for y in range(hy_ - 12, ey + 1):
                if (x, y) not in ids and fig.get(x, y) in set(SKIN):
                    ids[(x, y)] = len(clumps) - 1
                    shade[(x, y)] = big_form(x, y, False)
    for (x, y), t in shade.items():     # flat bands, no dithering: cleaner clumps
        fig.put(x, y, HAIR[int(max(0, min(1, t)) * (len(HAIR) - 1) + 0.5)])
    # crown highlight ring
    if ring:
        r0, a0, a1 = ring
        for (x, y) in ids:
            d = math.hypot(x + 0.5 - hx_, y + 0.5 - hy_)
            a = math.degrees(math.atan2(y + 0.5 - hy_, x + 0.5 - hx_)) % 360
            if a0 <= a <= a1 and abs(d - r0) < 1.3 and shade[(x, y)] > 0.3:
                fig.put(x, y, HAIR[-1] if abs(d - r0) < 0.7 else HAIR[-2])
    # dark edges where a clump tucks under the one above it
    is_lock = [cl[3] > 100 for cl in clumps]
    for (x, y), k in ids.items():
        for ddx, ddy in ((1, 0), (-1, 0), (0, 1)):
            k2 = ids.get((x + ddx, y + ddy))
            if k2 is not None and k2 > k:
                # one step darker everywhere: bangs get a solid line, the long
                # locks a broken one, so front and back read as one head of hair
                if not (is_lock[k] and is_lock[k2]):
                    c = fig.get(x, y)
                    if c in HAIR:
                        fig.put(x, y, HAIR[max(0, HAIR.index(c) - 1)])
                break
    # crisp bottom edge and the shadow cast on the skin under it
    skin = set(SKIN)
    for (x, y) in ids:
        below = fig.get(x, y + 1)
        if (x, y + 1) not in ids and below in skin:
            fig.put(x, y, line or HAIR[0])
            fig.put(x, y + 1, SKIN[2])
            if fig.get(x, y + 2) in skin and dith(x, y + 2, 0.5):
                fig.put(x, y + 2, SKIN[1])
    return ids
