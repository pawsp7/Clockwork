import { Raster, makeCanvas, hexToRgba } from './pixel.js';

/**
 * Charon's portrait, 64×64, painted to sit beside the reference portraits:
 * a tousled brown bob swept to one side, a doctor's head-mirror on its strap,
 * sly green eyes, a high-collared coat and the coin she keeps on a chain.
 */

const P = {
  outline: '#24160f',
  hair0: '#3e2819',
  hair1: '#5a3c26',
  hair2: '#7a5234',
  hair3: '#9a6c46',
  hair4: '#bc8c5e',
  skin: '#ffeee0',
  skin1: '#f6d9c2',
  skin2: '#e9bc9c',
  skin3: '#d49c7c',
  blush: '#f2b6a6',
  coat0: '#2a1e17',
  coat1: '#3e2e23',
  coat2: '#56412f',
  coat3: '#6e553f',
  shirt: '#ece4d4',
  shirt1: '#c9bea8',
  tie: '#4a5e46',
  gold: '#e8c25a',
  gold1: '#a87e2c',
  strap: '#2e2018',
  mirror0: '#5c6870',
  mirror1: '#a6b2ba',
  mirror2: '#dce4ea',
  white: '#ffffff',
};

function base() {
  const r = new Raster(64, 64);
  // ── back hair: a bob that ends at the jaw, longer on the left
  r.ellipse(32, 27, 20, 21, null, (x, y, nx, ny) => hairShade(nx, ny));
  r.poly(
    [
      [12, 26],
      [52, 26],
      [53, 44],
      [47, 47],
      [42, 41],
      [22, 41],
      [16, 49],
      [10, 46],
    ],
    null,
    (x, y) => hairShade((x - 32) / 21, (y - 30) / 20),
  );
  // ── coat and shoulders
  r.poly(
    [
      [4, 64],
      [8, 54],
      [18, 48],
      [28, 46],
      [36, 46],
      [46, 48],
      [56, 54],
      [60, 64],
    ],
    null,
    (x, y, nx) => (nx < 0.18 ? P.coat3 : nx < 0.55 ? P.coat2 : nx < 0.85 ? P.coat1 : P.coat0),
  );
  // high collar
  r.poly([[20, 47], [27, 44], [29, 52], [24, 56]], P.coat1);
  r.poly([[44, 47], [37, 44], [35, 52], [40, 56]], P.coat0);
  // shirt and green cravat
  r.poly([[27, 46], [37, 46], [35, 56], [32, 60], [29, 56]], P.shirt);
  r.poly([[30, 47], [34, 47], [33, 51], [31, 51]], P.tie);
  r.poly([[31, 51], [33, 51], [34, 55], [32, 57], [30, 55]], '#3a4c38');
  r.line(27, 47, 29, 55, P.shirt1);
  // coat buttons
  r.rect(22, 58, 2, 2, P.gold1);
  r.rect(41, 58, 2, 2, P.gold1);
  // coin on a chain
  for (let i = 0; i < 9; i++) r.set(36 + Math.round(i * 0.6), 48 + i, i % 2 ? P.gold1 : P.gold);
  r.ellipse(41, 59, 3, 3, P.gold);
  r.rect(40, 58, 2, 2, '#fff0b0');
  r.set(43, 61, P.gold1);
  r.set(42, 61, P.gold1);
  // ── neck
  r.rect(28, 40, 8, 7, P.skin1);
  r.rect(28, 44, 8, 2, P.skin2);
  // ── face
  r.poly(
    [
      [21, 21],
      [43, 21],
      [43, 33],
      [40, 39],
      [35, 43],
      [29, 43],
      [24, 39],
      [21, 33],
    ],
    null,
    (x, y, nx, ny) => (nx > 0.86 ? P.skin2 : nx > 0.72 || ny > 0.92 ? P.skin1 : P.skin),
  );
  // jaw shade under the hair
  r.line(24, 39, 29, 43, P.skin2);
  r.line(40, 39, 35, 43, P.skin2);
  // ── side-swept bangs, heavier on her right (viewer's left)
  r.poly(
    [
      [14, 18],
      [26, 10],
      [40, 9],
      [50, 16],
      [46, 22],
      [42, 20],
      [38, 25],
      [33, 21],
      [28, 27],
      [24, 22],
      [21, 31],
      [19, 26],
      [15, 34],
    ],
    null,
    (x, y) => hairShade((x - 30) / 20, (y - 16) / 14),
  );
  // strands
  for (const [x0, y0, x1, y1] of [
    [24, 13, 21, 28],
    [30, 12, 27, 25],
    [37, 11, 36, 21],
    [43, 13, 45, 20],
    [17, 24, 15, 40],
    [48, 26, 50, 42],
  ]) {
    r.line(x0, y0, x1, y1, P.hair1);
  }
  // shine
  for (let x = 26; x < 40; x++) if (x % 3) r.set(x, 12 + Math.round(Math.abs(x - 33) / 4), P.hair4);
  // ── the head-mirror and its strap
  for (let x = 14; x <= 50; x++) {
    const y = Math.round(15 - (x - 14) * 0.12);
    r.set(x, y, P.strap);
    r.set(x, y + 1, P.strap);
  }
  r.ellipse(23, 14, 6, 6, P.mirror0);
  r.ellipse(23, 14, 5, 5, null, (x, y, nx, ny) => (nx + ny < -0.7 ? P.mirror2 : nx + ny < 0.2 ? P.mirror1 : P.mirror0));
  r.ellipse(23, 14, 1, 1, '#3a4248');
  r.set(21, 11, P.white);
  r.set(20, 12, P.white);
  r.outline(P.outline);
  return r;
}

function hairShade(nx, ny) {
  const l = -nx * 0.5 - ny * 0.8;
  if (l > 0.75) return P.hair4;
  if (l > 0.35) return P.hair3;
  if (l > -0.15) return P.hair2;
  if (l > -0.6) return P.hair1;
  return P.hair0;
}

// ── faces ───────────────────────────────────────────────────────────────
// Eyes: left at x=23, right at x=34, row 26. Legend: x lash, i iris dark,
// I iris, j iris light, w glint, e white, s skin, k lid shade, b blush.
const EYES = {
  // sly and half-lidded: one move ahead of you, and amused about it
  neutral: [['  xxxxx ', 'xxxxxxxx', ' eiiIwex', ' eiIIjee', ' eIjjIe ', '  kkkk  ']],
  happy: [['        ', '        ', '  xxxx  ', ' x    xx', '        ', '        ']],
  sad: [['        ', '   xxxxx', ' xxkkkkx', ' eiIIwee', ' eIjjIe ', '  kkkk  ']],
  angry: [['x       ', 'xxxx    ', ' xxxxxxx', ' eiiIwex', ' eIjjIe ', '  kkkk  ']],
  shock: [['  xxxxx ', ' xxxxxxx', 'xeiiIwee', 'xeiIIjee', ' eIjjIe ', '  eeee  ']],
  blink: [['        ', '        ', '        ', ' xxxxxxx', '  kkkk  ', '        ']],
};

const MOUTHS = {
  neutral: ['    m ', ' mmm  '], // the smirk
  happy: ['m    m', ' mmmm '],
  sad: [' mmmm ', 'm    m'],
  angry: ['mmmmmm', '      '],
  shock: ['  mm  ', ' mrrm ', '  mm  '],
  blink: ['    m ', ' mmm  '],
};

const FACE_PAL = {
  x: P.outline,
  i: '#24402a',
  I: '#4c8a4a',
  j: '#a8d070',
  w: P.white,
  e: '#f8f4ee',
  s: P.skin,
  k: P.skin2,
  m: '#a65a50',
  r: '#6a2a28',
  b: P.blush,
};

function stamp(r, x, y, rows, mirror = false) {
  rows.forEach((row, dy) => {
    const line = mirror ? row.split('').reverse().join('') : row;
    for (let dx = 0; dx < line.length; dx++) {
      const ch = line[dx];
      if (ch === ' ') continue;
      r.set(x + dx, y + dy, hexToRgba(FACE_PAL[ch]));
    }
  });
}

const cache = new Map();

export function charonPortrait(mood) {
  const key = mood || 'neutral';
  if (cache.has(key)) return cache.get(key);
  const r = base();
  const m = EYES[key] ? key : 'neutral';
  const eye = EYES[m][0];
  // clear the eye band to skin, then outline where the bangs meet it
  for (let y = 22; y < 31; y++) for (let x = 22; x < 43; x++) r.set(x, y, hexToRgba(y > 28 && (x > 40 || x < 24) ? P.skin1 : P.skin));
  for (let x = 21; x <= 43; x++) r.set(x, 21, hexToRgba(P.hair0));
  for (let x = 21; x <= 27; x++) r.set(x, 22, hexToRgba(P.hair1));
  stamp(r, 22, 24, eye);
  stamp(r, 34, 24, eye, true);
  // brows
  if (m === 'angry') {
    r.line(23, 22, 29, 24, P.outline);
    r.line(42, 22, 36, 24, P.outline);
  } else if (m === 'sad') {
    r.line(23, 24, 29, 22, P.hair0);
    r.line(42, 24, 36, 22, P.hair0);
  } else {
    r.line(23, 23, 29, 23, P.hair0);
    r.line(36, 22, 41, 22, P.hair0); // one brow raised, always
    r.set(42, 23, hexToRgba(P.hair0));
  }
  // nose, blush, mouth
  r.set(32, 33, hexToRgba(P.skin2));
  r.set(32, 34, hexToRgba(P.skin3));
  stamp(r, 24, 33, ['bb']);
  stamp(r, 39, 33, ['bb']);
  stamp(r, 29, 37, MOUTHS[m] || MOUTHS.neutral);
  const c = makeCanvas(64, 64);
  c.getContext('2d').drawImage(r.toCanvas(), 0, 0);
  cache.set(key, c);
  return c;
}
