/**
 * Colours are packed into one 32-bit number laid out like ImageData bytes on a
 * little-endian machine (every browser and Node in practice):
 *   R | G << 8 | B << 16 | A << 24
 * so a Uint32Array over an ImageData buffer reads and writes them directly.
 * 0 is fully transparent.
 */

export const CLEAR = 0;

export function pack(r, g, b, a = 255) {
  return ((a << 24) | (b << 16) | (g << 8) | r) >>> 0;
}

export function unpack(c) {
  return [c & 255, (c >>> 8) & 255, (c >>> 16) & 255, c >>> 24];
}

export const alphaOf = (c) => c >>> 24;

const h2 = (n) => n.toString(16).padStart(2, '0');

/** '#rrggbb', or '#rrggbbaa' when the colour is not fully opaque. */
export function toHex(c, forceAlpha = false) {
  const [r, g, b, a] = unpack(c);
  return '#' + h2(r) + h2(g) + h2(b) + (a < 255 || forceAlpha ? h2(a) : '');
}

/** Parses #rgb, #rgba, #rrggbb, #rrggbbaa (the # is optional). null if invalid. */
export function fromHex(s) {
  if (typeof s !== 'string') return null;
  let h = s.trim().replace(/^#/, '');
  if (!/^[0-9a-f]+$/i.test(h)) return null;
  if (h.length === 3 || h.length === 4) h = h.split('').map((c) => c + c).join('');
  if (h.length !== 6 && h.length !== 8) return null;
  const v = (i) => parseInt(h.slice(i, i + 2), 16);
  return pack(v(0), v(2), v(4), h.length === 8 ? v(6) : 255);
}

export function rgbToHsv(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, max ? d / max : 0, max];
}

export function hsvToRgb(h, s, v) {
  h = ((h % 360) + 360) % 360;
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  const [r, g, b] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

export function luma(c) {
  const [r, g, b] = unpack(c);
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/** Normal-blend `src` (scaled by opacity 0..1) over `dst`. Straight (not premultiplied) alpha. */
export function over(dst, src, opacity = 1) {
  const sa = ((src >>> 24) / 255) * opacity;
  if (sa <= 0) return dst;
  const da = (dst >>> 24) / 255;
  if (sa >= 1 || da === 0) {
    if (sa >= 1) return src;
    return ((Math.round(sa * 255) << 24) | (src & 0xffffff)) >>> 0;
  }
  const oa = sa + da * (1 - sa);
  const k = (da * (1 - sa)) / oa;
  const j = sa / oa;
  const r = Math.round((src & 255) * j + (dst & 255) * k);
  const g = Math.round(((src >>> 8) & 255) * j + ((dst >>> 8) & 255) * k);
  const b = Math.round(((src >>> 16) & 255) * j + ((dst >>> 16) & 255) * k);
  return pack(r, g, b, Math.round(oa * 255));
}

/** Largest per-channel difference; every fully transparent pixel counts as the same colour. */
export function channelDiff(a, b) {
  if (a === b) return 0;
  const aa = a >>> 24;
  const ba = b >>> 24;
  if (aa === 0 && ba === 0) return 0;
  return Math.max(
    Math.abs((a & 255) - (b & 255)),
    Math.abs(((a >>> 8) & 255) - ((b >>> 8) & 255)),
    Math.abs(((a >>> 16) & 255) - ((b >>> 16) & 255)),
    Math.abs(aa - ba),
  );
}

/** Weighted RGB distance ("redmean"), for nearest-colour matching. */
export function distance(a, b) {
  const [r1, g1, b1] = unpack(a);
  const [r2, g2, b2] = unpack(b);
  const rm = (r1 + r2) / 2;
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return Math.sqrt((2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db);
}

export function cssColor(c) {
  const [r, g, b, a] = unpack(c);
  return `rgba(${r},${g},${b},${(a / 255).toFixed(3)})`;
}
