import { makeCanvas, hexToRgba } from './pixel.js';

/**
 * Character art from references/Art, stored at native resolution in assets/art.
 * Characters without their own reference (Alice's portrait, Charon, Hestia's sprite)
 * are derived from the drawn ones by hue-remapping and small pixel patches, so
 * everything shares one hand.
 */

const FILES = {
  alice_sprite: 'alice_sprite_forward.png',
  mitzi_sprite: 'mitzi_sprite_forward.png',
  victoria_sprite: 'victoria_sprite_forward.png',
  mitzi_back: 'mitzi_back.png',
  mitzi_walk: 'mitzi_walk.png',
  mitzi_back_walk: 'mitzi_back_walk.png',
  mitzi_portrait: 'mitzi_portrait.png',
  victoria_portrait: 'victoria_portrait.png',
  hestia_portrait: 'hestia_portrait.png',
  hestia_blink: 'hestia_blink.png',
};

const ART = {};
const cache = new Map();

export async function loadArt(base = './assets/art/') {
  await Promise.all(
    Object.entries(FILES).map(
      ([key, file]) =>
        new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            const c = makeCanvas(img.width, img.height);
            c.getContext('2d').drawImage(img, 0, 0);
            ART[key] = c;
            resolve();
          };
          img.onerror = () => {
            console.warn('Missing art', file);
            resolve();
          };
          img.src = base + file;
        }),
    ),
  );
}

export function raw(key) {
  return ART[key];
}

export function frame(key, i, w) {
  const k = `frame|${key}|${i}`;
  if (cache.has(k)) return cache.get(k);
  const src = ART[key];
  const h = src.height;
  const c = makeCanvas(w, h);
  c.getContext('2d').drawImage(src, i * w, 0, w, h, 0, 0, w, h);
  cache.set(k, c);
  return c;
}

// ─── colour helpers ────────────────────────────────────────────────────────

function hsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return [h, s, l];
}

const rgb = (hex) => hexToRgba(hex);

/**
 * Remap pixels. rules: [{ test(h,s,l,x,y,rgba) → bool, ramp: [dark..light] , lo, hi }]
 * The pixel's lightness is mapped across the ramp (lo..hi lightness range).
 */
function remap(src, rules) {
  const c = makeCanvas(src.width, src.height);
  const ctx = c.getContext('2d');
  ctx.drawImage(src, 0, 0);
  const img = ctx.getImageData(0, 0, c.width, c.height);
  const d = img.data;
  const ramps = rules.map((r) => r.ramp.map(rgb));
  for (let y = 0; y < c.height; y++) {
    for (let x = 0; x < c.width; x++) {
      const i = (y * c.width + x) * 4;
      if (!d[i + 3]) continue;
      const [h, s, l] = hsl(d[i], d[i + 1], d[i + 2]);
      for (let k = 0; k < rules.length; k++) {
        const rule = rules[k];
        if (!rule.test(h, s, l, x, y)) continue;
        if (rule.clear) {
          d[i + 3] = 0;
          break;
        }
        const lo = rule.lo ?? 0;
        const hi = rule.hi ?? 1;
        const t = Math.max(0, Math.min(0.999, (l - lo) / (hi - lo)));
        const col = ramps[k][Math.floor(t * ramps[k].length)];
        d[i] = col[0];
        d[i + 1] = col[1];
        d[i + 2] = col[2];
        break;
      }
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/** ASCII patches: { x, y, rows, pal: {char: hex|null} }  (' ' skips, null clears) */
function patch(src, patches) {
  const c = makeCanvas(src.width, src.height);
  const ctx = c.getContext('2d');
  ctx.drawImage(src, 0, 0);
  const img = ctx.getImageData(0, 0, c.width, c.height);
  const d = img.data;
  for (const p of patches) {
    p.rows.forEach((row, dy) => {
      for (let dx = 0; dx < row.length; dx++) {
        const ch = row[dx];
        if (ch === ' ') continue;
        const x = p.x + dx;
        const y = p.y + dy;
        if (x < 0 || y < 0 || x >= c.width || y >= c.height) continue;
        const i = (y * c.width + x) * 4;
        const v = p.pal[ch];
        if (v === null) {
          d[i + 3] = 0;
          continue;
        }
        if (!v) continue;
        const col = rgb(v);
        d[i] = col[0];
        d[i + 1] = col[1];
        d[i + 2] = col[2];
        d[i + 3] = 255;
      }
    });
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

function memo(key, fn) {
  if (cache.has(key)) return cache.get(key);
  const v = fn();
  cache.set(key, v);
  return v;
}

const between = (h, a, b) => (a <= b ? h >= a && h <= b : h >= a || h <= b);

// ─── ramps ────────────────────────────────────────────────────────────────

const PINK_HAIR = ['#6e3a4a', '#9a5468', '#c0748a', '#d898a8', '#ecbcc6', '#f8dce2'];
const RUFFLE = ['#a8a09c', '#ccc6c2', '#e6e2de', '#f6f4f2', '#ffffff'];
const CYAN_EYE = ['#1e4a5a', '#3a7a90', '#5eb0c8', '#9ad8e6', '#d0f0f6'];
const BLOUSE = ['#8a827e', '#b4aca8', '#d6d0cc', '#eeeae6', '#faf8f6'];
const GOLD = ['#5a4018', '#8a6828', '#c09848', '#e6c87a', '#fae6b0'];
const BROWN_HAIR = ['#2e2018', '#4a3426', '#6a4c38', '#8a684e', '#a88466', '#c4a080'];
const BROWN_COAT = ['#1e1612', '#2e2219', '#43342a', '#5c4a3c', '#76604e'];
const GREEN_EYE = ['#1e3226', '#3a5a44', '#6a8a70', '#a4c4aa', '#d4ead6'];
const ROSE_LIP = ['#5a3430', '#7a4a44', '#9a6458', '#b8806e'];
const SILVER_HAIR = ['#7a7890', '#a4a2ba', '#c8c6da', '#e2e0ec', '#f4f2f8', '#ffffff'];
const PATCH = '#241e28';

// ─── portraits ────────────────────────────────────────────────────────────

/** Per-portrait face geometry, for blinks and moods. */
const FACE = {
  mitzi: { eyes: [[21, 27, 27, 31], [35, 41, 27, 31]], skin: '#fef1e7', line: '#2a1a1e', mouth: [29, 34, 36] },
  alice: { eyes: [[21, 27, 27, 31], [35, 41, 27, 31]], skin: '#fef1e7', line: '#2a1a1e', mouth: [29, 34, 36] },
  victoria: { eyes: [[24, 30, 25, 30], [35, 41, 25, 30]], skin: '#ffeee0', line: '#140608', mouth: [30, 34, 35] },
  charon: { eyes: [[24, 30, 25, 30], [35, 41, 25, 30]], skin: '#ffeee0', line: '#2a1a14', mouth: [30, 34, 35] },
  hestia: { eyes: [[21, 29, 22, 27], [34, 42, 22, 27]], skin: '#ffeee0', line: '#000000', mouth: [29, 34, 35] },
};

function basePortrait(who, flags) {
  switch (who) {
    case 'mitzi':
      return ART.mitzi_portrait;
    case 'victoria':
      return ART.victoria_portrait;
    case 'hestia':
      return ART.hestia_portrait;
    case 'alice':
      return alicePortrait(flags);
    case 'charon':
      return charonPortrait();
    default:
      return null;
  }
}

function alicePortrait(flags = {}) {
  const key = `p|alice|${flags.shortHair ? 's' : 'l'}${flags.eyepatch ? 'p' : ''}`;
  return memo(key, () => {
    let c = remap(ART.mitzi_portrait, [
      // pendant → gold
      { test: (h, s, l, x, y) => y >= 44 && x >= 26 && x <= 38 && between(h, 250, 330) && s > 0.2, ramp: GOLD, lo: 0.05, hi: 0.6 },
      // eyes → living cyan
      { test: (h, s, l, x, y) => y >= 27 && y <= 32 && x >= 20 && x <= 42 && s < 0.25 && l > 0.45 && l < 0.92, ramp: CYAN_EYE, lo: 0.45, hi: 0.92 },
      // hair → pink
      { test: (h, s, l) => between(h, 250, 335) && s > 0.12, ramp: PINK_HAIR, lo: 0.15, hi: 0.9 },
      // black bow → white ruffle, ribbon tails → pale pink bow
      { test: (h, s, l, x, y) => y < 24 && s < 0.15 && l < 0.45, ramp: RUFFLE, lo: 0.05, hi: 0.45 },
      { test: (h, s, l, x, y) => y >= 24 && y < 38 && x > 38 && s < 0.15 && l < 0.45, ramp: ['#b87a8a', '#dca4b2', '#f2ccd4'], lo: 0.0, hi: 0.45 },
      // grey cardigan → white blouse
      { test: (h, s, l, x, y) => y >= 40 && s < 0.22 && l > 0.3 && l < 0.7 && between(h, 200, 270), ramp: BLOUSE, lo: 0.3, hi: 0.7 },
    ]);
    // living pupils and a glint
    c = patch(c, [
      { x: 23, y: 29, rows: ['dd', 'dd'], pal: { d: '#0e2a36' } },
      { x: 37, y: 29, rows: ['dd', 'dd'], pal: { d: '#0e2a36' } },
      { x: 23, y: 28, rows: ['w'], pal: { w: '#ffffff' } },
      { x: 37, y: 28, rows: ['w'], pal: { w: '#ffffff' } },
    ]);
    if (flags.shortHair) {
      c = remap(c, [{ test: (h, s, l, x, y) => y >= 40 && (x < 22 || x > 43) && between(h, 320, 360) && s > 0.1, clear: true, ramp: [] }]);
      c = remap(c, [{ test: (h, s, l, x, y) => y >= 40 && (x < 22 || x > 43) && between(h, 0, 20) && s > 0.1, clear: true, ramp: [] }]);
    }
    if (flags.eyepatch) {
      c = patch(c, [
        { x: 34, y: 26, rows: [' kkkkkkk ', 'kkkkkkkkk', 'kkkkkkkkk', 'kkkkkkkkk', 'kkkkkkkkk', ' kkkkkkk ', '  kkkkk  '], pal: { k: PATCH } },
        { x: 20, y: 17, rows: ['k', ' k', '  k', '   kk', '     kk', '       kk', '         kk', '           kk', '             kk'], pal: { k: PATCH } },
      ]);
    }
    return c;
  });
}

function charonPortrait() {
  return memo('p|charon', () => {
    let c = remap(ART.victoria_portrait, [
      // lips → muted rose
      { test: (h, s, l, x, y) => y >= 34 && y <= 37 && x >= 29 && x <= 35 && s > 0.3 && between(h, 330, 20), ramp: ROSE_LIP, lo: 0.15, hi: 0.6 },
      // jewel → gold coin
      { test: (h, s, l, x, y) => y >= 44 && x >= 26 && x <= 38 && s > 0.35 && between(h, 330, 20), ramp: GOLD, lo: 0.1, hi: 0.55 },
      // eyes → green
      { test: (h, s, l, x, y) => y >= 24 && y <= 31 && x >= 23 && x <= 42 && between(h, 200, 260) && s > 0.08, ramp: GREEN_EYE, lo: 0.05, hi: 0.8 },
      // hair, headband, rose → brown hair
      { test: (h, s, l, x, y) => (between(h, 320, 30) && s > 0.2 && l < 0.6) || (y < 26 && l < 0.3), ramp: BROWN_HAIR, lo: 0.0, hi: 0.55 },
      // black dress → brown coat
      { test: (h, s, l, x, y) => y >= 42 && l < 0.35, ramp: BROWN_COAT, lo: 0.0, hi: 0.35 },
    ]);
    // the head mirror
    c = patch(c, [
      {
        x: 23,
        y: 15,
        rows: ['  mmmm  ', ' mllllm ', 'mlwwllkm', 'mlwlllkm', 'mlllllkm', 'mkllllkm', ' mkkkkm ', '  mmmm  '],
        pal: { m: '#6a7278', l: '#c8d0d6', k: '#9aa4ac', w: '#ffffff' },
      },
    ]);
    return c;
  });
}

/** Closed or mood-shaped eyes painted over a portrait. */
function moodPatch(who, src, mood) {
  const f = FACE[who];
  if (!f) return src;
  const patches = [];
  const fillEye = ([x0, x1, y0, y1], rowsToFill) => {
    const rows = [];
    for (let y = y0; y <= y1; y++) rows.push(rowsToFill(y - y0, x1 - x0 + 1, y1 - y0 + 1));
    patches.push({ x: x0, y: y0, rows, pal: { s: f.skin, k: f.line, r: '#c0283a' } });
  };
  if (mood === 'blink' || mood === 'happy') {
    for (const e of f.eyes) {
      fillEye(e, (dy, w, h) => {
        const mid = mood === 'happy' ? 1 : h - 2;
        if (mood === 'happy') {
          if (dy === mid) return 's' + 'k'.repeat(w - 2) + 's';
          if (dy === mid + 1) return 'k' + 's'.repeat(w - 2) + 'k';
          return 's'.repeat(w);
        }
        if (dy === mid) return 'k'.repeat(w);
        if (dy === mid - 1) return 'k' + 's'.repeat(w - 2) + 'k';
        return 's'.repeat(w);
      });
    }
  } else if (mood === 'sad') {
    f.eyes.forEach((e, idx) => {
      fillEye(e, (dy, w) => {
        if (dy === 0) return 's'.repeat(w);
        if (dy === 1) return idx === 0 ? 'k'.repeat(w - 2) + 'ss' : 'ss' + 'k'.repeat(w - 2);
        return ' '.repeat(w);
      });
    });
  } else if (mood === 'angry') {
    f.eyes.forEach(([x0, x1, y0], idx) => {
      const w = x1 - x0 + 1;
      // lids slant down toward the nose
      const rows = idx === 0 ? ['k' + ' '.repeat(w - 1), 'kkk' + ' '.repeat(w - 3), ' '.repeat(2) + 'kkkk'.slice(0, w - 2)] : [' '.repeat(w - 1) + 'k', ' '.repeat(w - 3) + 'kkk', 'kkkk'.slice(0, w - 2)];
      patches.push({ x: x0, y: y0 - 1, rows, pal: { k: f.line } });
    });
  }
  if (mood === 'happy' || mood === 'sad') {
    const [mx0, mx1, my] = f.mouth;
    const w = mx1 - mx0 + 1;
    const line = (txt) => ({ x: mx0, y: my, rows: txt, pal: { m: '#b06070', s: f.skin } });
    if (mood === 'happy') patches.push(line(['m' + 's'.repeat(w - 2) + 'm', 's' + 'm'.repeat(w - 2) + 's']));
    else patches.push(line(['s' + 'm'.repeat(w - 2) + 's', 'm' + 's'.repeat(w - 2) + 'm']));
  }
  return patch(src, patches);
}

export function refPortrait(who, flags = {}, mood = null, blink = false) {
  const base = basePortrait(who, flags);
  if (!base) return null;
  const fkey = who === 'alice' ? `${flags.shortHair ? 's' : 'l'}${flags.eyepatch ? 'p' : ''}` : '';
  const m = blink && mood !== 'happy' ? 'blink' : mood;
  return memo(`pm|${who}|${fkey}|${m || ''}`, () => {
    if (who === 'hestia') {
      if (m === 'blink') return frame('hestia_blink', 2, 64);
      if (m === 'angry') {
        // red eyes she only shows when nobody is watching
        const red = remap(base, [{ test: (h, s, l, x, y) => y >= 21 && y <= 28 && x >= 20 && x <= 43 && s < 0.12 && l > 0.25 && l < 0.85, ramp: ['#5a0a12', '#a01c28', '#e04048', '#ff9a90'], lo: 0.25, hi: 0.85 }]);
        return moodPatch('hestia', red, 'angry');
      }
    }
    if (who === 'alice' && flags.eyepatch && m) {
      // keep the patch on top of any mood
      return alicePortraitMood(flags, m);
    }
    return m ? moodPatch(who, base, m) : base;
  });
}

function alicePortraitMood(flags, mood) {
  const noPatch = alicePortrait({ ...flags, eyepatch: false });
  const moody = moodPatch('alice', noPatch, mood);
  return patch(moody, [
    { x: 34, y: 26, rows: [' kkkkkkk ', 'kkkkkkkkk', 'kkkkkkkkk', 'kkkkkkkkk', 'kkkkkkkkk', ' kkkkkkk ', '  kkkkk  '], pal: { k: PATCH } },
    { x: 20, y: 17, rows: ['k', ' k', '  k', '   kk', '     kk', '       kk', '         kk', '           kk', '             kk'], pal: { k: PATCH } },
  ]);
}

// ─── sprites ──────────────────────────────────────────────────────────────

function aliceSprite(flags = {}) {
  const key = `s|alice|${flags.shortHair ? 's' : 'l'}${flags.eyepatch ? 'p' : ''}`;
  return memo(key, () => {
    let c = ART.alice_sprite;
    if (flags.shortHair) {
      c = remap(c, [
        { test: (h, s, l, x, y) => y >= 21 && y <= 23 && (x <= 10 || x >= 21), clear: true, ramp: [] },
        { test: (h, s, l, x, y) => y >= 24 && (x <= 7 || x >= 24), clear: true, ramp: [] },
      ]);
      c = patch(c, [
        { x: 3, y: 19, rows: ['hk', ' h'], pal: { h: '#e4b7b7', k: '#edbebe' } },
        { x: 26, y: 19, rows: ['kh', 'h '], pal: { h: '#e4b7b7', k: '#edbebe' } },
      ]);
    }
    if (flags.eyepatch) {
      c = patch(c, [
        { x: 17, y: 13, rows: ['kkkkk', 'kkkkk', 'kkkkk', ' kkk '], pal: { k: PATCH } },
        { x: 10, y: 9, rows: ['k', ' k', '  kk', '    kk', '      k'], pal: { k: PATCH } },
      ]);
    }
    return c;
  });
}

function hestiaSprite(mood) {
  return memo(`s|hestia|${mood || ''}`, () => {
    let c = remap(ART.victoria_sprite, [
      { test: (h, s, l, x, y) => y >= 13 && y <= 17 && x >= 10 && x <= 22 && between(h, 200, 240) && s > 0.08, ramp: mood === 'angry' ? ['#5a0a12', '#a01c28', '#e04048', '#ff9a90'] : ['#46566e', '#6a86a4', '#9cb8d2', '#d4e4f2'], lo: 0.3, hi: 0.85 },
      { test: (h, s, l) => between(h, 330, 20) && s > 0.25, ramp: SILVER_HAIR, lo: 0.2, hi: 0.7 },
    ]);
    c = patch(c, [
      // white collar and a gold cross where the rose was
      { x: 11, y: 22, rows: ['wwwwwwwwww', ' wwwwwwww ', '   wwww   '], pal: { w: '#f4f2ee' } },
      { x: 15, y: 25, rows: [' g ', 'ggg', ' g ', ' g '], pal: { g: '#e0b850' } },
      // cross ornament in her hair
      { x: 23, y: 8, rows: [' g', 'ggg', ' g', ' g'], pal: { g: '#e0b850' } },
    ]);
    return c;
  });
}

function charonSprite() {
  return memo('s|charon', () => {
    let c = remap(ART.victoria_sprite, [
      { test: (h, s, l, x, y) => y >= 13 && y <= 17 && x >= 10 && x <= 22 && between(h, 200, 240) && s > 0.08, ramp: GREEN_EYE, lo: 0.3, hi: 0.9 },
      { test: (h, s, l, x, y) => between(h, 330, 20) && s > 0.25, ramp: BROWN_HAIR, lo: 0.15, hi: 0.7 },
      { test: (h, s, l, x, y) => y < 12 && l < 0.4, ramp: BROWN_HAIR, lo: 0.1, hi: 0.4 },
      { test: (h, s, l, x, y) => y >= 21 && l < 0.4, ramp: BROWN_COAT, lo: 0.08, hi: 0.4 },
    ]);
    c = patch(c, [
      { x: 13, y: 24, rows: [' ww ', 'wwww', 'wggw', 'wggw', ' ww '], pal: { w: '#d6cfc0', g: '#e0b850' } },
      { x: 9, y: 7, rows: [' mm ', 'mlwm', 'mllm', ' mm '], pal: { m: '#6a7278', l: '#c8d0d6', w: '#ffffff' } },
    ]);
    return c;
  });
}

/** Hooded figure, 32×48, palette-swappable: thugs, hired blades, the faithful. */
const HOOD_ROWS = [
  '................',
  '................',
  '................',
  '................',
  '..........cccccc',
  '........cccccccc',
  '.......ccccccccc',
  '......cccccCCCCC',
  '......ccccCCCCCC',
  '.....cccccCKKKKK',
  '.....ccccCKKKKKK',
  '.....cccCKKKKKKK',
  '....ccccCKKKKKKK',
  '....cccCKKKKKKKK',
  '....cccCKKKKKeeK',
  '....cccCKKKKKeeK',
  '....cccCKKKKKKKK',
  '....ccccCKKKKKKK',
  '....cccccCKKKKKK',
  '....ccccccCCCCCC',
  '...ccccccccccccc',
  '...cCcccccccccWc',
  '...cCccccccccWcc',
  '..ccCcccccccWccc',
  '..ccCccccccWcccc',
  '..ccCcccccWccccc',
  '..ccCccccWcccccc',
  '..ssCccccccccccc',
  '..SSCcccccgggggg',
  '...cCccccccccccc',
  '...cCccccccccccc',
  '...cCCcccccccccc',
  '...cCcCccccccccc',
  '...cCcCccccccccc',
  '...cCcCccccccccc',
  '...cCcCccccccccc',
  '...cCcCCcccccccc',
  '...c.CC.cCC.cCC.',
  '................',
  '...........TT...',
  '...........TT...',
  '...........TT...',
  '...........TT...',
  '...........TT...',
  '...........TT...',
  '..........ooo...',
  '..........oOo...',
  '................',
].map((r) => r + r.split('').reverse().join(''));

function hood(palette) {
  const c = makeCanvas(32, 48);
  const ctx = c.getContext('2d');
  HOOD_ROWS.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const v = palette[row[x]];
      if (!v) continue;
      ctx.fillStyle = v;
      ctx.fillRect(x, y, 1, 1);
    }
  });
  return c;
}

const HOOD_BASE = { c: '#3a3440', C: '#2a2630', K: '#141218', e: '#d8c070', s: '#c8b4a0', S: '#a8947f', W: '#5a5262', g: '#8a7a5a', o: '#241f26', O: '#3a333c', T: '#3a343e' };

export function hoodSprite(key, overrides = {}) {
  return memo(`hood|${key}`, () => hood({ ...HOOD_BASE, ...overrides }));
}

export function refSprite(id, flags = {}, mood = null, walkFrame = null) {
  switch (id) {
    case 'alice':
      return aliceSprite(flags);
    case 'mitzi':
      return walkFrame != null && ART.mitzi_walk ? frame('mitzi_walk', walkFrame % 4, 32) : ART.mitzi_sprite;
    case 'victoria':
      return ART.victoria_sprite;
    case 'hestia':
      return hestiaSprite(mood);
    case 'charon':
      return charonSprite();
    default:
      return hoodSprite('default');
  }
}

export function artReady() {
  return !!ART.alice_sprite;
}
