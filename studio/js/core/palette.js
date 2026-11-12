/**
 * Palette files and palette maths.
 *   .gpl  GIMP / Aseprite / Krita palette
 *   .pal  JASC-PAL, Paint Shop Pro's own palette format
 *   .hex  one RRGGBB per line (Lospec style)
 */
import { pack, unpack, toHex, fromHex, rgbToHsv, luma, distance } from './color.js';

export function parsePalette(text) {
  const t = text.replace(/^﻿/, '');
  const lines = t.split(/\r?\n/);
  const out = [];
  if (/^GIMP Palette/i.test(lines[0])) {
    for (const line of lines.slice(1)) {
      const m = line.match(/^\s*(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})/);
      if (m) out.push(pack(+m[1] & 255, +m[2] & 255, +m[3] & 255));
    }
    return out;
  }
  if (/^JASC-PAL/i.test(lines[0])) {
    for (const line of lines.slice(3)) {
      const m = line.match(/^\s*(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})(?:\s+(\d{1,3}))?/);
      if (m) out.push(pack(+m[1] & 255, +m[2] & 255, +m[3] & 255, m[4] != null ? +m[4] & 255 : 255));
    }
    return out;
  }
  // Anything else: pick out hex colours wherever they are.
  for (const m of t.matchAll(/#?\b([0-9a-f]{8}|[0-9a-f]{6})\b/gi)) {
    const c = fromHex(m[1]);
    if (c != null) out.push(c);
  }
  return out;
}

export function toGpl(name, colors) {
  const rows = colors.map((c) => {
    const [r, g, b] = unpack(c);
    return `${String(r).padStart(3)} ${String(g).padStart(3)} ${String(b).padStart(3)}\t${toHex(c).slice(1)}`;
  });
  return `GIMP Palette\nName: ${name}\nColumns: 8\n#\n${rows.join('\n')}\n`;
}

export function toJascPal(colors) {
  const rows = colors.map((c) => unpack(c).slice(0, 3).join(' '));
  return `JASC-PAL\r\n0100\r\n${colors.length}\r\n${rows.join('\r\n')}\r\n`;
}

export function toHexList(colors) {
  return colors.map((c) => toHex(c).slice(1)).join('\n') + '\n';
}

export function dedupe(colors) {
  return [...new Set(colors)];
}

/** Greys first, then hue families round the wheel, each dark→light: ramps the Shade tool can walk. */
export function sortRamps(colors) {
  const groups = new Map();
  for (const c of colors) {
    const [r, g, b] = unpack(c);
    const [h, s, v] = rgbToHsv(r, g, b);
    const key = s < 0.14 || v < 0.1 ? -1 : Math.floor(((h + 15) % 360) / 30);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(c);
  }
  return [...groups.keys()].sort((a, b) => a - b).flatMap((k) => groups.get(k).sort((a, b) => luma(a) - luma(b)));
}

export function sortBy(colors, mode) {
  const c = colors.slice();
  if (mode === 'luma') return c.sort((a, b) => luma(a) - luma(b));
  if (mode === 'hue') {
    return c.sort((a, b) => {
      const ha = rgbToHsv(...unpack(a).slice(0, 3));
      const hb = rgbToHsv(...unpack(b).slice(0, 3));
      return ha[0] - hb[0] || ha[2] - hb[2];
    });
  }
  return sortRamps(c);
}

/**
 * Median cut: reduce weighted colours (Map colour → count) to at most n.
 * Each box's colour is its weighted mean.
 */
export function medianCut(counts, n) {
  const items = [...counts].map(([c, w]) => {
    const [r, g, b] = unpack(c);
    return { r, g, b, w };
  });
  if (items.length <= n) return items.map((i) => pack(i.r, i.g, i.b));
  let boxes = [items];
  while (boxes.length < n) {
    let bi = -1;
    let bestRange = -1;
    let axis = 'r';
    boxes.forEach((box, i) => {
      if (box.length < 2) return;
      for (const ax of ['r', 'g', 'b']) {
        let lo = 255;
        let hi = 0;
        for (const it of box) {
          if (it[ax] < lo) lo = it[ax];
          if (it[ax] > hi) hi = it[ax];
        }
        if (hi - lo > bestRange) {
          bestRange = hi - lo;
          bi = i;
          axis = ax;
        }
      }
    });
    if (bi < 0 || bestRange <= 0) break;
    const box = boxes[bi].sort((a, b) => a[axis] - b[axis]);
    const total = box.reduce((s, it) => s + it.w, 0);
    let acc = 0;
    let cut = 1;
    for (let i = 0; i < box.length - 1; i++) {
      acc += box[i].w;
      if (acc >= total / 2) {
        cut = i + 1;
        break;
      }
    }
    boxes.splice(bi, 1, box.slice(0, cut), box.slice(cut));
  }
  return boxes.map((box) => {
    const t = box.reduce((s, it) => s + it.w, 0) || 1;
    const m = (ax) => Math.round(box.reduce((s, it) => s + it[ax] * it.w, 0) / t);
    return pack(m('r'), m('g'), m('b'));
  });
}

export function nearest(palette, c) {
  let best = 0;
  let bd = Infinity;
  for (let i = 0; i < palette.length; i++) {
    const d = distance(palette[i], c);
    if (d < bd) {
      bd = d;
      best = i;
    }
  }
  return best;
}
