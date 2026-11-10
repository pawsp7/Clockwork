/**
 * Pixel-art toolkit.
 *  - compile(): ASCII art → cached offscreen canvas (optionally mirrored halves + patches)
 *  - Raster: crisp, un-antialiased primitives for procedural art (monsters, bosses, scenery)
 *  - blit(): integer-scaled drawing with flash / tint / alpha / flip
 */

const cache = new Map();

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function hexToRgba(hex) {
  if (!hex) return null;
  if (hex.startsWith('rgba') || hex.startsWith('rgb')) {
    const n = hex.match(/[\d.]+/g).map(Number);
    return [n[0], n[1], n[2], n[3] == null ? 255 : Math.round(n[3] * 255)];
  }
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const v = parseInt(h.slice(0, 6), 16);
  const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) : 255;
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255, a];
}

/** Expand mirrored rows: each row is the left half; the right half is its reflection. */
export function expandRows(def) {
  let rows = def.rows.slice();
  if (def.mirror) rows = rows.map((r) => r + r.split('').reverse().join(''));
  if (def.patches) {
    rows = rows.map((r) => r.split(''));
    for (const p of def.patches) {
      p.rows.forEach((pr, dy) => {
        for (let dx = 0; dx < pr.length; dx++) {
          const ch = pr[dx];
          if (ch === ' ') continue;
          const y = p.y + dy;
          const x = p.x + dx;
          if (!rows[y]) continue;
          rows[y][x] = ch === '_' ? '.' : ch;
        }
      });
    }
    rows = rows.map((r) => r.join(''));
  }
  return rows;
}

/**
 * def: { rows, palette, mirror?, patches? }  palette: { char: '#rrggbb' }
 * '.' is transparent.
 */
export function compile(key, def, paletteOverride) {
  const k = paletteOverride ? `${key}|${JSON.stringify(paletteOverride)}` : key;
  if (cache.has(k)) return cache.get(k);
  const rows = expandRows(def);
  const h = rows.length;
  const w = Math.max(...rows.map((r) => r.length));
  const pal = { ...def.palette, ...(paletteOverride || {}) };
  const rgba = {};
  for (const [ch, col] of Object.entries(pal)) rgba[ch] = hexToRgba(col);
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    const row = rows[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.' || ch === ' ') continue;
      const col = rgba[ch];
      if (!col) continue;
      const i = (y * w + x) * 4;
      img.data[i] = col[0];
      img.data[i + 1] = col[1];
      img.data[i + 2] = col[2];
      img.data[i + 3] = col[3];
    }
  }
  ctx.putImageData(img, 0, 0);
  cache.set(k, c);
  return c;
}

export function cached(key, w, h, paint) {
  if (cache.has(key)) return cache.get(key);
  const c = makeCanvas(w, h);
  paint(c.getContext('2d'), c);
  cache.set(key, c);
  return c;
}

/** Silhouette / flash variant of a sprite (all opaque pixels → one colour). */
export function solid(src, color, key) {
  const k = `solid|${key}|${color}`;
  if (cache.has(k)) return cache.get(k);
  const c = makeCanvas(src.width, src.height);
  const ctx = c.getContext('2d');
  ctx.drawImage(src, 0, 0);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, c.width, c.height);
  cache.set(k, c);
  return c;
}

/**
 * Draw a sprite with its bottom-centre at (x, y), integer scale.
 * opts: { flip, alpha, flash (0..1 white overlay), tint {color, amount}, key }
 */
export function blit(ctx, img, x, y, scale = 2, opts = {}) {
  const w = img.width * scale;
  const h = img.height * scale;
  const dx = Math.round(x - w / 2);
  const dy = Math.round(y - h);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (opts.alpha != null) ctx.globalAlpha *= opts.alpha;
  const base = ctx.globalAlpha;
  ctx.translate(opts.flip ? dx + w : dx, dy);
  if (opts.flip) ctx.scale(-1, 1);
  ctx.drawImage(img, 0, 0, w, h);
  if (opts.tint) {
    ctx.globalAlpha = base * opts.tint.amount;
    ctx.drawImage(solid(img, opts.tint.color, opts.key || 'anon'), 0, 0, w, h);
  }
  if (opts.flash) {
    ctx.globalAlpha = base * opts.flash;
    ctx.drawImage(solid(img, '#ffffff', opts.key || 'anon'), 0, 0, w, h);
  }
  ctx.restore();
  return { x: dx, y: dy, w, h };
}

// ─── Raster: crisp primitives on ImageData ────────────────────────────────

export class Raster {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.data = new Uint8ClampedArray(w * h * 4);
  }

  set(x, y, col) {
    x |= 0;
    y |= 0;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h || !col) return;
    const c = typeof col === 'string' ? hexToRgba(col) : col;
    const i = (y * this.w + x) * 4;
    if (c[3] === 255) {
      this.data[i] = c[0];
      this.data[i + 1] = c[1];
      this.data[i + 2] = c[2];
      this.data[i + 3] = 255;
    } else {
      const a = c[3] / 255;
      const da = this.data[i + 3] / 255;
      const oa = a + da * (1 - a);
      if (oa <= 0) return;
      for (let k = 0; k < 3; k++) this.data[i + k] = (c[k] * a + this.data[i + k] * da * (1 - a)) / oa;
      this.data[i + 3] = oa * 255;
    }
  }

  get(x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return null;
    const i = (y * this.w + x) * 4;
    return this.data[i + 3] ? [this.data[i], this.data[i + 1], this.data[i + 2], this.data[i + 3]] : null;
  }

  alpha(x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0;
    return this.data[(y * this.w + x) * 4 + 3];
  }

  rect(x, y, w, h, col) {
    const c = hexToRgba(col);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c);
  }

  /** Filled ellipse; shade(x, y, nx, ny) may return a colour per pixel (nx, ny in -1..1). */
  ellipse(cx, cy, rx, ry, col, shade) {
    const c = col ? hexToRgba(col) : null;
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const nx = (x + 0.5 - cx) / rx;
        const ny = (y + 0.5 - cy) / ry;
        if (nx * nx + ny * ny <= 1) this.set(x, y, shade ? hexToRgba(shade(x, y, nx, ny)) : c);
      }
    }
  }

  /** Filled polygon, even-odd rule. pts: [[x,y],...] */
  poly(pts, col, shade) {
    const c = col ? hexToRgba(col) : null;
    const ys = pts.map((p) => p[1]);
    const minY = Math.floor(Math.min(...ys));
    const maxY = Math.ceil(Math.max(...ys));
    const xs = pts.map((p) => p[0]);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    for (let y = minY; y <= maxY; y++) {
      const sy = y + 0.5;
      const nodes = [];
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i];
        const [xj, yj] = pts[j];
        if ((yi < sy && yj >= sy) || (yj < sy && yi >= sy)) nodes.push(xi + ((sy - yi) / (yj - yi)) * (xj - xi));
      }
      nodes.sort((a, b) => a - b);
      for (let k = 0; k < nodes.length; k += 2) {
        for (let x = Math.ceil(nodes[k] - 0.5); x < nodes[k + 1] - 0.5; x++) {
          const nx = (x - minX) / Math.max(1, maxX - minX);
          const ny = (y - minY) / Math.max(1, maxY - minY);
          this.set(x, y, shade ? hexToRgba(shade(x, y, nx, ny)) : c);
        }
      }
    }
  }

  line(x0, y0, x1, y1, col) {
    const c = hexToRgba(col);
    x0 |= 0;
    y0 |= 0;
    x1 |= 0;
    y1 |= 0;
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.set(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
  }

  /** Thick line made of discs. */
  stroke(x0, y0, x1, y1, r, col) {
    const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      this.ellipse(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r, r, col);
    }
  }

  /** 1px outline around opaque pixels (outside), for creatures that should pop. */
  outline(col, onlyEmpty = true) {
    const c = hexToRgba(col);
    const marks = [];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (onlyEmpty && this.alpha(x, y)) continue;
        if (this.alpha(x - 1, y) > 128 || this.alpha(x + 1, y) > 128 || this.alpha(x, y - 1) > 128 || this.alpha(x, y + 1) > 128) marks.push([x, y]);
      }
    }
    for (const [x, y] of marks) this.set(x, y, c);
  }

  toCanvas() {
    const c = makeCanvas(this.w, this.h);
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(this.w, this.h);
    img.data.set(this.data);
    ctx.putImageData(img, 0, 0);
    return c;
  }
}

export function rasterCached(key, w, h, paint) {
  if (cache.has(key)) return cache.get(key);
  const r = new Raster(w, h);
  paint(r);
  const c = r.toCanvas();
  cache.set(key, c);
  return c;
}

/** Ordered 4×4 Bayer dither threshold for gradients. */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export function dither(x, y, t) {
  return t * 16 > BAYER[(y & 3) * 4 + (x & 3)] + 0.5;
}

export function mix(a, b, t) {
  const ca = hexToRgba(a);
  const cb = hexToRgba(b);
  const r = ca.map((v, i) => Math.round(v + (cb[i] - v) * t));
  return `#${r
    .slice(0, 3)
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('')}`;
}

export { hexToRgba };
