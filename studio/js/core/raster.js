/**
 * Pure pixel algorithms over packed-colour cels (Uint32Array, row-major, w×h).
 * Nothing here touches the DOM, so the test suite runs it under Node.
 */
import { channelDiff } from './color.js';

// ─── brushes ───────────────────────────────────────────────────────────────

/** Pixel offsets of a brush. Even sizes lean up and left of the cursor pixel. */
export function brushOffsets(size, shape = 'square') {
  const out = [];
  const lo = -Math.floor((size - 1) / 2);
  const hi = lo + size - 1;
  const c = (lo + hi) / 2;
  const r2 = (size / 2) ** 2 * 0.8; // trims the corners: 3 → plus, 5 → 5×5 less corners
  for (let y = lo; y <= hi; y++) {
    for (let x = lo; x <= hi; x++) {
      if (shape === 'round' && size > 2 && (x - c) ** 2 + (y - c) ** 2 > r2) continue;
      out.push([x, y]);
    }
  }
  return out;
}

// ─── lines and shapes ──────────────────────────────────────────────────────

/** Bresenham line, both ends included. */
export function linePoints(x0, y0, x1, y1) {
  const pts = [];
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;
  for (;;) {
    pts.push([x, y]);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
  return pts;
}

/** Pixel-art angles: flat, upright, 1:1, 2:1, 1:2, 3:1, 1:3. */
const SNAP_DIRS = [
  [1, 0],
  [0, 1],
  [1, 1],
  [2, 1],
  [1, 2],
  [3, 1],
  [1, 3],
];

/**
 * Snap a drag to the nearest clean pixel-art angle and build the line from
 * whole steps, so a 2:1 line is always "two across, one down".
 */
export function snappedLine(x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  if (!dx && !dy) return [[x0, y0]];
  const ang = Math.atan2(Math.abs(dy), Math.abs(dx));
  let best = SNAP_DIRS[0];
  let bestD = Infinity;
  for (const d of SNAP_DIRS) {
    const diff = Math.abs(Math.atan2(d[1], d[0]) - ang);
    if (diff < bestD) {
      bestD = diff;
      best = d;
    }
  }
  const sx = dx < 0 ? -1 : 1;
  const sy = dy < 0 ? -1 : 1;
  const [ax, ay] = best;
  // whole runs: a 2:1 line is runs of two pixels, each run one row further on
  const run = Math.max(ax, ay);
  const major = ax >= ay ? Math.abs(dx) : Math.abs(dy);
  const n = Math.max(1, Math.round((major + 1) / run));
  const pts = [];
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < run; k++) {
      if (ax >= ay) pts.push([x0 + sx * (i * ax + k), y0 + sy * i * ay]);
      else pts.push([x0 + sx * i * ax, y0 + sy * (i * ay + k)]);
    }
  }
  return pts;
}

/** Constrain a drag to a square box (Shift with Rectangle / Ellipse). */
export function squareEnd(x0, y0, x1, y1) {
  const s = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  return [x0 + (x1 < x0 ? -s : s), y0 + (y1 < y0 ? -s : s)];
}

export function rectPoints(x0, y0, x1, y1, filled) {
  const ax = Math.min(x0, x1);
  const bx = Math.max(x0, x1);
  const ay = Math.min(y0, y1);
  const by = Math.max(y0, y1);
  const pts = [];
  for (let y = ay; y <= by; y++) {
    for (let x = ax; x <= bx; x++) {
      if (filled || y === ay || y === by || x === ax || x === bx) pts.push([x, y]);
    }
  }
  return pts;
}

/**
 * Ellipse inscribed in the box. The outline takes the outermost pixel of each
 * row and each column of the filled shape, which gives a thin closed curve
 * with no doubled corners.
 */
export function ellipsePoints(x0, y0, x1, y1, filled) {
  const ax = Math.min(x0, x1);
  const bx = Math.max(x0, x1);
  const ay = Math.min(y0, y1);
  const by = Math.max(y0, y1);
  const w = bx - ax + 1;
  const h = by - ay + 1;
  const rx = w / 2;
  const ry = h / 2;
  const inside = (x, y) => {
    const nx = (x + 0.5 - rx) / rx;
    const ny = (y + 0.5 - ry) / ry;
    return nx * nx + ny * ny <= 1 + 1e-9;
  };
  const mask = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) mask[y * w + x] = inside(x, y) ? 1 : 0;
  // Very thin boxes: the sample test can miss whole rows; fill those.
  if (w <= 2 || h <= 2) mask.fill(1);
  const pts = [];
  if (filled) {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (mask[y * w + x]) pts.push([ax + x, ay + y]);
    return pts;
  }
  const edge = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    let l = -1;
    let r = -1;
    for (let x = 0; x < w; x++) if (mask[y * w + x]) (l < 0 && (l = x), (r = x));
    if (l >= 0) edge[y * w + l] = edge[y * w + r] = 1;
  }
  for (let x = 0; x < w; x++) {
    let t = -1;
    let b = -1;
    for (let y = 0; y < h; y++) if (mask[y * w + x]) (t < 0 && (t = y), (b = y));
    if (t >= 0) edge[t * w + x] = edge[b * w + x] = 1;
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (edge[y * w + x]) pts.push([ax + x, ay + y]);
  return pts;
}

/**
 * Pixel-perfect strokes: when the newest three points of a 1px stroke make an
 * L (two orthogonal steps that could have been one diagonal), the corner pixel
 * is redundant. Returns the index of the point to drop, or -1.
 */
export function pixelPerfectCorner(pts) {
  const n = pts.length;
  if (n < 3) return -1;
  const [a, b, c] = [pts[n - 3], pts[n - 2], pts[n - 1]];
  const ab = Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) === 1;
  const bc = Math.abs(b[0] - c[0]) + Math.abs(b[1] - c[1]) === 1;
  const diag = Math.abs(a[0] - c[0]) === 1 && Math.abs(a[1] - c[1]) === 1;
  return ab && bc && diag ? n - 2 : -1;
}

// ─── dither ────────────────────────────────────────────────────────────────

export const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

/** True where a dither of density level/16 puts a pixel. Anchored to the canvas so it tiles. */
export function ditherOn(x, y, level) {
  return BAYER[y & 3][x & 3] < level;
}

// ─── fill and selection masks ──────────────────────────────────────────────

/**
 * Pixels matching the colour at (x, y) within `tolerance` (0..255 per channel).
 * contiguous: scanline flood fill (4-way, or 8-way with diagonal); otherwise
 * every matching pixel. `limit(i)` optionally restricts to a selection.
 */
export function matchMask(ref, w, h, x, y, { tolerance = 0, contiguous = true, diagonal = false, limit = null } = {}) {
  const mask = new Uint8Array(w * h);
  if (x < 0 || y < 0 || x >= w || y >= h) return mask;
  const target = ref[y * w + x];
  const ok = (i) => (!limit || limit(i)) && channelDiff(ref[i], target) <= tolerance;
  if (!contiguous) {
    for (let i = 0; i < w * h; i++) if (ok(i)) mask[i] = 1;
    return mask;
  }
  if (!ok(y * w + x)) return mask;
  const seen = new Uint8Array(w * h);
  const stack = [x, y];
  while (stack.length) {
    const sy = stack.pop();
    const sx = stack.pop();
    let l = sx;
    while (l > 0 && !seen[sy * w + l - 1] && ok(sy * w + l - 1)) l--;
    let r = sx;
    while (r < w - 1 && !seen[sy * w + r + 1] && ok(sy * w + r + 1)) r++;
    for (let i = l; i <= r; i++) {
      seen[sy * w + i] = 1;
      mask[sy * w + i] = 1;
    }
    const lo = diagonal ? Math.max(0, l - 1) : l;
    const hi = diagonal ? Math.min(w - 1, r + 1) : r;
    for (const ny of [sy - 1, sy + 1]) {
      if (ny < 0 || ny >= h) continue;
      let run = false;
      for (let i = lo; i <= hi; i++) {
        const j = ny * w + i;
        const good = !seen[j] && ok(j);
        if (good && !run) stack.push(i, ny);
        run = good;
        if (!good) run = false;
      }
    }
  }
  return mask;
}

/** Transparent pixels touching an opaque one (the outline ring). */
export function outlineMask(cel, w, h, diagonal = false, limit = null) {
  const mask = new Uint8Array(w * h);
  const solid = (x, y) => x >= 0 && y >= 0 && x < w && y < h && cel[y * w + x] >>> 24 > 0;
  const nb = diagonal
    ? [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]
    : [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (cel[i] >>> 24 > 0 || (limit && !limit(i))) continue;
      for (const [dx, dy] of nb) {
        if (solid(x + dx, y + dy)) {
          mask[i] = 1;
          break;
        }
      }
    }
  }
  return mask;
}

/** Bounding box of set mask entries (or non-transparent pixels when given a cel). */
export function maskBounds(mask, w, h, isCel = false) {
  let x0 = w;
  let y0 = h;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const v = mask[y * w + x];
      if (isCel ? v >>> 24 === 0 : !v) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

// ─── whole-cel transforms ──────────────────────────────────────────────────

export function flipH(cel, w, h) {
  const out = new Uint32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) out[y * w + x] = cel[y * w + (w - 1 - x)];
  return out;
}

export function flipV(cel, w, h) {
  const out = new Uint32Array(w * h);
  for (let y = 0; y < h; y++) out.set(cel.subarray((h - 1 - y) * w, (h - y) * w), y * w);
  return out;
}

/** Quarter turn. Returns a cel of size h×w. */
export function rotate90(cel, w, h, clockwise = true) {
  const out = new Uint32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const nx = clockwise ? h - 1 - y : y;
      const ny = clockwise ? x : w - 1 - x;
      out[ny * h + nx] = cel[y * w + x];
    }
  }
  return out;
}

/** Place a w×h cel at (ox, oy) inside a new nw×nh cel, cropping what falls outside. */
export function placeCel(cel, w, h, nw, nh, ox, oy) {
  const out = new Uint32Array(nw * nh);
  for (let y = 0; y < h; y++) {
    const ty = y + oy;
    if (ty < 0 || ty >= nh) continue;
    for (let x = 0; x < w; x++) {
      const tx = x + ox;
      if (tx < 0 || tx >= nw) continue;
      out[ty * nw + tx] = cel[y * w + x];
    }
  }
  return out;
}

export function cropCel(cel, w, x0, y0, cw, ch) {
  const out = new Uint32Array(cw * ch);
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) out[y * cw + x] = cel[(y + y0) * w + x + x0];
  return out;
}

/** Nearest-neighbour resample. */
export function scaleCel(cel, w, h, nw, nh) {
  const out = new Uint32Array(nw * nh);
  for (let y = 0; y < nh; y++) {
    const sy = Math.min(h - 1, Math.floor(((y + 0.5) * h) / nh));
    for (let x = 0; x < nw; x++) {
      const sx = Math.min(w - 1, Math.floor(((x + 0.5) * w) / nw));
      out[y * nw + x] = cel[sy * w + sx];
    }
  }
  return out;
}

// ─── imported art ──────────────────────────────────────────────────────────

const gcd = (a, b) => (b ? gcd(b, a % b) : a);

/**
 * Art that was scaled up by an integer factor (like the 16× files in
 * references/Art) is made of k×k blocks of one colour. Returns the largest
 * such k, or 1.
 */
export function detectScale(data, w, h) {
  const g = gcd(w, h);
  for (let k = g; k > 1; k--) {
    if (g % k) continue;
    let ok = true;
    for (let by = 0; by < h && ok; by += k) {
      for (let bx = 0; bx < w && ok; bx += k) {
        const c = data[by * w + bx];
        const t = c >>> 24 === 0;
        for (let y = by; y < by + k && ok; y++) {
          for (let x = bx; x < bx + k; x++) {
            const d = data[y * w + x];
            if (d !== c && !(t && d >>> 24 === 0)) {
              ok = false;
              break;
            }
          }
        }
      }
    }
    if (ok) return k;
  }
  return 1;
}

/** Shrink k×k blocks back to single pixels (samples each block's centre). */
export function downscale(data, w, h, k) {
  const nw = Math.floor(w / k);
  const nh = Math.floor(h / k);
  const out = new Uint32Array(nw * nh);
  const o = Math.floor(k / 2);
  for (let y = 0; y < nh; y++) for (let x = 0; x < nw; x++) out[y * nw + x] = data[(y * k + o) * w + x * k + o];
  return out;
}

/** Every colour used (alpha > 0), with pixel counts. */
export function colorCounts(cels) {
  const m = new Map();
  for (const cel of cels) {
    for (let i = 0; i < cel.length; i++) {
      const c = cel[i];
      if (c >>> 24 === 0) continue;
      m.set(c, (m.get(c) || 0) + 1);
    }
  }
  return m;
}
