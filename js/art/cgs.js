import { Raster, makeCanvas, solid, dither, hexToRgba, mix } from './pixel.js';
import { hashRng } from '../core/rng.js';
import { refPortrait, refSprite, hoodSprite } from './refart.js';
import { bossArt } from './creatures.js';

/**
 * Event illustrations, painted at 320×180 and shown at 3×.
 * Each CG = a painted backdrop (Raster) + the cast composed on top + an animated overlay.
 */

const W = 320;
const H = 180;
const S = 3;

export const CG_LIST = [
  { id: 'watch', title: 'The Watch Opens', where: 'Prologue' },
  { id: 'sisters', title: 'Red and Violet', where: 'Dead Woods' },
  { id: 'stag', title: 'The Hollow Stag', where: 'Dead Woods' },
  { id: 'haircut', title: 'Lighter', where: 'The Caldera' },
  { id: 'maw', title: 'Cinder Maw', where: 'The Caldera' },
  { id: 'argument', title: 'I Step First', where: 'Abandoned Fort' },
  { id: 'alley', title: 'Wet Bricks', where: 'Abandoned Fort' },
  { id: 'hestia', title: 'When Nobody Is Watching', where: 'Beneath the Church' },
  { id: 'trap', title: 'The Saint’s Mouth', where: 'The Ruins' },
  { id: 'ox', title: 'The White Ox', where: 'The Manor' },
];

// ─── painting helpers ─────────────────────────────────────────────────────

function vgrad(r, stops, y0 = 0, y1 = H) {
  for (let y = y0; y < y1; y++) {
    const t = (y - y0) / Math.max(1, y1 - y0 - 1);
    const seg = Math.min(stops.length - 2, Math.floor(t * (stops.length - 1)));
    const lt = t * (stops.length - 1) - seg;
    for (let x = 0; x < W; x++) r.set(x, y, dither(x, y, lt) ? stops[seg + 1] : stops[seg]);
  }
}

function glow(r, cx, cy, rad, color, strength = 0.6) {
  const c = hexToRgba(color);
  for (let y = Math.floor(cy - rad); y <= cy + rad; y++) {
    for (let x = Math.floor(cx - rad); x <= cx + rad; x++) {
      const d = Math.hypot(x - cx, y - cy) / rad;
      if (d > 1) continue;
      const a = (1 - d) * (1 - d) * strength;
      if (dither(x, y, a * 1.5)) r.set(x, y, [c[0], c[1], c[2], Math.round(Math.min(1, a * 1.4) * 255)]);
    }
  }
}

function rays(r, cx, cy, n, len, color, spread = 0.06, seed = 1) {
  const rnd = hashRng(seed);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rnd() * 0.2;
    const l = len * (0.6 + rnd() * 0.4);
    r.poly(
      [
        [cx, cy],
        [cx + Math.cos(a - spread) * l, cy + Math.sin(a - spread) * l],
        [cx + Math.cos(a + spread) * l, cy + Math.sin(a + spread) * l],
      ],
      null,
      (x, y) => {
        const d = Math.hypot(x - cx, y - cy) / l;
        return dither(x, y, 0.55 * (1 - d)) ? color : 'rgba(0,0,0,0)';
      },
    );
  }
}

function deadTree(r, x, ground, h, color, seed) {
  const rnd = hashRng(seed);
  r.poly(
    [
      [x - 3, ground],
      [x + 3, ground],
      [x + 1, ground - h],
      [x - 1, ground - h],
    ],
    color,
  );
  const branch = (bx, by, ang, len, depth) => {
    if (depth <= 0 || len < 3) return;
    const ex = bx + Math.cos(ang) * len;
    const ey = by + Math.sin(ang) * len;
    r.stroke(bx, by, ex, ey, Math.max(0.5, depth * 0.4), color);
    branch(ex, ey, ang - 0.4 - rnd() * 0.3, len * 0.65, depth - 1);
    branch(ex, ey, ang + 0.35 + rnd() * 0.3, len * 0.6, depth - 1);
  };
  for (let i = 0; i < 4; i++) branch(x, ground - h * (0.4 + i * 0.17), -Math.PI / 2 + (i % 2 ? 0.8 : -0.8), h * 0.3, 3);
}

function fog(r, y, h, color, strength, seed) {
  const c = hexToRgba(color);
  const rnd = hashRng(seed);
  const wob = Array.from({ length: 40 }, () => rnd());
  for (let yy = y - h; yy <= y + h; yy++) {
    const k = 1 - Math.abs(yy - y) / h;
    for (let x = 0; x < W; x++) {
      const a = k * strength * (0.6 + 0.4 * wob[Math.floor(x / 8) % 40]);
      if (dither(x, yy, a)) r.set(x, yy, [c[0], c[1], c[2], 170]);
    }
  }
}

function moon(r, cx, cy, rad, light, shade) {
  glow(r, cx, cy, rad * 2.2, light, 0.35);
  r.ellipse(cx, cy, rad, rad, null, (x, y, nx, ny) => (nx * 0.6 + ny * 0.5 > 0.45 && dither(x, y, 0.6) ? shade : light));
}

/** Draw a sprite/portrait onto the composition with optional rim light and tint. */
function put(ctx, img, x, y, scale, opts = {}) {
  const w = img.width * scale;
  const hgt = img.height * scale;
  if (opts.rim) {
    const rim = solid(img, opts.rim, `rim${opts.key}`);
    ctx.drawImage(rim, x + (opts.rimDx ?? 1), y + (opts.rimDy ?? 0), w, hgt);
  }
  if (opts.flip) {
    ctx.save();
    ctx.translate(x + w, y);
    ctx.scale(-1, 1);
    ctx.drawImage(img, 0, 0, w, hgt);
    ctx.restore();
  } else ctx.drawImage(img, x, y, w, hgt);
  if (opts.tint) {
    const t = solid(img, opts.tint, `tint${opts.key}`);
    ctx.save();
    ctx.globalAlpha = opts.tintAmount ?? 0.3;
    if (opts.flip) {
      ctx.translate(x + w, y);
      ctx.scale(-1, 1);
      ctx.drawImage(t, 0, 0, w, hgt);
    } else ctx.drawImage(t, x, y, w, hgt);
    ctx.restore();
  }
}

function silhouette(ctx, img, x, y, scale, color, key) {
  ctx.drawImage(solid(img, color, key), x, y, img.width * scale, img.height * scale);
}

// ─── the paintings ────────────────────────────────────────────────────────

const PAINT = {
  watch(r) {
    vgrad(r, ['#0a060c', '#160c18', '#22121e']);
    glow(r, 160, 96, 140, '#e8c890', 0.35);
    rays(r, 160, 96, 22, 190, '#f4dca0', 0.05, 3);
    // chain
    for (let i = 0; i < 26; i++) {
      const t = i / 25;
      const x = 160 - 70 * t - 30 * t * t;
      const y = 40 - 34 * Math.sin(t * Math.PI) + 120 * t * t;
      r.ellipse(x, y, 2.2, 1.6, i % 2 ? '#a0803c' : '#d8b860');
    }
    // open lid
    r.ellipse(98, 58, 40, 46, null, (x, y, nx, ny) => (nx * nx + ny * ny > 0.82 ? '#e0c070' : nx + ny < -0.2 ? '#b8963e' : '#8a6a28'));
    r.ellipse(98, 58, 30, 36, '#5a4420');
    // case
    r.ellipse(170, 100, 60, 60, null, (x, y, nx, ny) => {
      const l = -nx * 0.6 - ny * 0.7;
      return l > 0.5 ? '#fae6a0' : l > 0 ? '#e0c070' : l > -0.5 ? '#b8963e' : '#7a5c22';
    });
    r.rect(164, 34, 12, 8, '#d8b860');
    r.rect(166, 30, 8, 5, '#b8963e');
    // face
    r.ellipse(170, 100, 52, 52, null, (x, y, nx, ny) => (dither(x, y, 0.15 + (nx + ny) * 0.12) ? '#e8dcc4' : '#f8f0e0'));
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      r.stroke(170 + Math.cos(a) * 44, 100 + Math.sin(a) * 44, 170 + Math.cos(a) * 49, 100 + Math.sin(a) * 49, i % 3 ? 0.6 : 1.1, '#3a2c20');
    }
    // the face is falling inward
    for (let k = 0; k < 120; k++) {
      const a = k * 0.35;
      const rr = 40 - k * 0.32;
      if (rr < 2) break;
      r.set(Math.round(170 + Math.cos(a) * rr), Math.round(100 + Math.sin(a) * rr), k % 3 ? '#b8a890' : '#6a5a48');
    }
  },

  sisters(r) {
    vgrad(r, ['#070a08', '#0e140e', '#18201a', '#202a20']);
    moon(r, 248, 46, 22, '#d8e4cc', '#b4c4a8');
    for (let i = 0; i < 6; i++) deadTree(r, 10 + i * 62 + (i % 2) * 14, 170, 110 + (i % 3) * 20, '#0c120c', 40 + i);
    fog(r, 150, 16, '#56664e', 0.45, 2);
    fog(r, 176, 10, '#3a4636', 0.5, 3);
  },

  stag(r) {
    vgrad(r, ['#05080a', '#0c1414', '#162020']);
    moon(r, 160, 70, 56, '#e4ecd8', '#c4d0b8');
    for (let i = 0; i < 4; i++) deadTree(r, 14 + i * 34, 180, 150 - i * 12, '#060a08', 60 + i);
    for (let i = 0; i < 4; i++) deadTree(r, 306 - i * 34, 180, 150 - i * 12, '#060a08', 70 + i);
    r.rect(0, 160, W, 20, '#060908');
    fog(r, 150, 14, '#4a5a4a', 0.4, 5);
  },

  haircut(r) {
    vgrad(r, ['#1a0806', '#3a120a', '#6a2410', '#a8401a']);
    glow(r, 220, 200, 160, '#ff8a3a', 0.6);
    const rnd = hashRng(9);
    for (let i = 0; i < 40; i++) r.set(Math.floor(rnd() * W), Math.floor(rnd() * 120), '#ffb060');
  },

  maw(r) {
    vgrad(r, ['#100606', '#260c08', '#4a160c', '#7a2a12']);
    glow(r, 160, 150, 150, '#ff7a2a', 0.55);
    // cavern walls
    r.poly([[0, 0], [70, 0], [40, 80], [56, 180], [0, 180]], '#120806');
    r.poly([[320, 0], [250, 0], [282, 70], [262, 180], [320, 180]], '#120806');
    // lava lake
    for (let y = 140; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const w = Math.sin(x * 0.08 + y * 0.3) + Math.sin(x * 0.03 - y * 0.2);
        r.set(x, y, w > 1.1 ? '#ffd070' : w > 0.2 ? '#f07a2a' : dither(x, y, 0.4) ? '#c04a1a' : '#8a2a10');
      }
    }
    // ledge with the party
    r.poly([[0, 150], [90, 140], [110, 180], [0, 180]], '#0a0404');
  },

  argument(r) {
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const left = x + y * 0.35 < 170;
        const brick = ((y >> 3) + (x >> 4)) % 2 === 0 && (x + (y >> 3) * 8) % 16 < 1;
        const base = left ? (dither(x, y, y / H) ? '#2a0c10' : '#1a0608') : dither(x, y, y / H) ? '#1e1430' : '#120c1e';
        r.set(x, y, brick || y % 8 === 0 ? mix(base, '#000000', 0.4) : base);
      }
    }
    // the crack between them
    const rnd = hashRng(4);
    let x = 172;
    for (let y = 0; y < H; y += 2) {
      x += (rnd() - 0.5) * 6 - 0.7;
      r.rect(Math.round(x) - 1, y, 3, 2, '#fff4e0');
      r.rect(Math.round(x) - 2, y, 1, 2, '#e8a0b0');
      r.rect(Math.round(x) + 2, y, 1, 2, '#b0a0e8');
    }
  },

  alley(r) {
    vgrad(r, ['#0e0204', '#1e060a', '#2e0a10']);
    // walls converging to the lamp
    const vx = 160;
    const vy = 70;
    r.poly([[0, 0], [vx - 26, vy - 40], [vx - 26, vy + 50], [0, 180]], '#2a080e');
    r.poly([[320, 0], [vx + 26, vy - 40], [vx + 26, vy + 50], [320, 180]], '#24060c');
    for (let i = 0; i < 12; i++) {
      const t = i / 12;
      const yl = vy - 40 + (0 - (vy - 40)) * (1 - t);
      void yl;
      r.line(0, Math.round(i * 15), vx - 26, Math.round(vy - 40 + i * 7.5), '#3a0e16');
      r.line(320, Math.round(i * 15), vx + 26, Math.round(vy - 40 + i * 7.5), '#3a0e16');
    }
    glow(r, vx, vy - 10, 70, '#ff8a7a', 0.5);
    r.rect(vx - 1, vy - 10, 2, 40, '#120204');
    r.rect(vx - 4, vy - 14, 8, 5, '#ffd0c0');
    // wet ground
    for (let y = 130; y < H; y++) for (let x = 0; x < W; x++) if ((x * 7 + y * 13) % 29 === 0) r.set(x, y, '#6a1a24');
    for (let y = 132; y < H; y += 3) r.rect(vx - 6 - (y - 130), y, 12 + (y - 130) * 2, 1, 'rgba(255,140,130,0.25)');
    // the sisters, huddled against the wall: one holding the other
    const fig = '#0c0204';
    r.ellipse(118, 130, 9, 10, fig); // victoria's head
    r.poly([[104, 136], [132, 136], [140, 172], [98, 172]], fig);
    r.ellipse(134, 152, 8, 7, fig); // mitzi's head on her lap
    r.poly([[132, 156], [176, 160], [178, 172], [128, 172]], fig);
    r.stroke(110, 150, 136, 156, 2, fig);
  },

  hestia(r) {
    vgrad(r, ['#020001', '#0a0204', '#16040a']);
    // horned shadow on the wall
    const sh = '#2a060c';
    r.ellipse(160, 74, 54, 46, sh);
    r.stroke(118, 50, 84, 24, 6, sh);
    r.stroke(84, 24, 80, 4, 4, sh);
    r.stroke(202, 50, 236, 24, 6, sh);
    r.stroke(236, 24, 240, 4, 4, sh);
    r.ellipse(160, 112, 30, 22, sh);
    // candles
    for (const [x, hgt] of [
      [40, 26],
      [70, 18],
      [250, 22],
      [282, 30],
    ]) {
      glow(r, x, 176 - hgt - 6, 30, '#ff5a3a', 0.6);
      r.rect(x - 3, 176 - hgt, 6, hgt, '#c8b8a8');
      r.rect(x - 1, 176 - hgt - 6, 2, 5, '#ffd080');
    }
  },

  trap(r) {
    vgrad(r, ['#0a0a12', '#141420', '#1e1c2c']);
    glow(r, 236, 50, 60, '#8aa0e0', 0.4);
    // the saint
    const stone = (x, y, nx) => (nx < 0.3 ? '#8a8898' : nx < 0.65 ? '#6a6878' : '#4a4858');
    r.poly([[200, 180], [272, 180], [262, 70], [210, 70]], null, (x, y, nx) => stone(x, y, nx));
    r.ellipse(236, 54, 18, 22, null, (x, y, nx, ny) => (nx < -0.2 ? '#9a98a8' : nx < 0.4 ? '#7a7888' : '#5a5868'));
    for (let a = 0; a < 40; a++) r.set(Math.round(236 + Math.cos((a / 40) * Math.PI * 2) * 26), Math.round(28 + Math.sin((a / 40) * Math.PI * 2) * 6), '#c8d8ff');
    r.ellipse(236, 62, 6, 5, '#05050a');
    r.rect(228, 48, 4, 2, '#2a2836');
    r.rect(240, 48, 4, 2, '#2a2836');
    // needles flying from its mouth
    const rnd = hashRng(12);
    for (let i = 0; i < 26; i++) {
      const a = Math.PI * (0.78 + rnd() * 0.3);
      const d0 = 10 + rnd() * 60;
      const len = 10 + rnd() * 14;
      const x0 = 236 + Math.cos(a) * d0;
      const y0 = 62 + Math.sin(a) * d0 * 0.6;
      r.line(Math.round(x0), Math.round(y0), Math.round(x0 + Math.cos(a) * len), Math.round(y0 + Math.sin(a) * len * 0.6), '#e8eef8');
    }
    // pillars and rubble
    r.rect(14, 30, 26, 150, '#2a2836');
    r.rect(40, 60, 14, 120, '#22202c');
    r.poly([[0, 168], [120, 160], [180, 180], [0, 180]], '#14121c');
  },

  ox(r) {
    vgrad(r, ['#f4ecdc', '#e8dccc', '#cfc2b0']);
    rays(r, 160, 70, 28, 220, '#ffffff', 0.05, 8);
    glow(r, 160, 60, 110, '#fff8e8', 0.6);
    for (let a = 0; a < 80; a++) r.set(Math.round(160 + Math.cos((a / 80) * Math.PI * 2) * 54), Math.round(26 + Math.sin((a / 80) * Math.PI * 2) * 12), '#d8b860');
    // torn black habit, falling
    const rnd = hashRng(21);
    for (let i = 0; i < 14; i++) {
      const x = 60 + rnd() * 200;
      const y = 110 + rnd() * 70;
      r.poly([[x, y], [x + 8 + rnd() * 6, y + 2], [x + 4, y + 9 + rnd() * 5]], '#1a1418');
    }
  },
};

/** Cast composed on top of the painted backdrop. */
const COMPOSE = {
  watch(ctx) {
    // a tiny Alice, falling into the face
    const a = refSprite('alice');
    ctx.globalAlpha = 0.55;
    silhouette(ctx, a, 162, 88, 0.5, '#2a1e18', 'watchAlice');
    ctx.globalAlpha = 1;
  },
  sisters(ctx) {
    const v = refSprite('victoria');
    const m = refSprite('mitzi');
    // Mitzi peeks out from behind her sister's shoulder
    put(ctx, m, 132, 28, 3, { rim: '#d8e4cc', key: 'cgsm', tint: '#0a120a', tintAmount: 0.25 });
    put(ctx, v, 84, 40, 3, { rim: '#d8e4cc', key: 'cgsv' });
    // Victoria's spear, held low and level across the path
    ctx.fillStyle = '#121014';
    for (let i = 0; i < 150; i++) ctx.fillRect(Math.round(60 + i * 1.5), Math.round(150 - i * 0.12), 3, 3);
    ctx.fillStyle = '#d8dce0';
    ctx.fillRect(282, 130, 8, 3);
    ctx.fillRect(288, 129, 6, 3);
    ctx.fillRect(292, 130, 4, 2);
    // grass silhouettes in front
    ctx.fillStyle = '#050805';
    for (let x = 0; x < W; x += 3) ctx.fillRect(x, 172 - ((x * 7) % 9), 2, 12);
  },
  stag(ctx) {
    const stag = bossArt('hollow_stag', 0);
    silhouette(ctx, stag, 80, -10, 2, '#06090a', 'cgstag');
    ctx.fillStyle = '#7adc6a';
    ctx.fillRect(152, 82, 6, 6);
    ctx.fillStyle = 'rgba(122,220,106,0.25)';
    ctx.fillRect(146, 76, 18, 18);
    // the party, small, looking up
    const party = [refSprite('alice', {}), refSprite('mitzi'), refSprite('victoria')];
    party.forEach((img, i) => silhouette(ctx, img, 40 + i * 16, 146, 0.75, '#020303', `cgstagp${i}`));
  },
  haircut(ctx, flags) {
    const p = refPortrait('alice', { ...flags, shortHair: false }, 'blink');
    put(ctx, p, 40, 56, 2, { tint: '#ff7a30', tintAmount: 0.18, key: 'cghair' });
    // the borrowed knife at her jaw, sawing through a curl
    ctx.fillStyle = '#2a1a14';
    ctx.fillRect(152, 138, 16, 6);
    ctx.fillStyle = '#d8dce0';
    for (let i = 0; i < 22; i++) ctx.fillRect(152 - i, 139 - Math.round(i * 0.45), 2, 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(134, 130, 3, 1);
    // a cut curl already falling
    ctx.fillStyle = '#c87890';
    for (const [x, y] of [[176, 150], [179, 153], [181, 157], [182, 161], [184, 165]]) ctx.fillRect(x, y, 3, 2);
  },
  maw(ctx) {
    const maw = bossArt('cinder_maw', 1);
    put(ctx, maw, 90, 32, 2, { key: 'cgmaw' });
    const party = [refSprite('alice', { shortHair: true }), refSprite('mitzi'), refSprite('victoria')];
    party.forEach((img, i) => silhouette(ctx, img, 14 + i * 20, 116, 1, '#050202', `cgmawp${i}`));
  },
  argument(ctx) {
    put(ctx, refPortrait('victoria', {}, 'angry'), 12, 52, 2, { flip: true, tint: '#c03040', tintAmount: 0.12, key: 'cgargv' });
    put(ctx, refPortrait('mitzi', {}, 'angry'), 180, 52, 2, { tint: '#7a50c0', tintAmount: 0.12, key: 'cgargm' });
  },
  alley(ctx) {
    // two hoods at the mouth of the alley, against the lamp
    const thug = hoodSprite('thug_lanky');
    silhouette(ctx, thug, 140, 72, 1, '#050102', 'cgalley1');
    silhouette(ctx, thug, 168, 70, 1, '#030001', 'cgalley2');
  },
  hestia(ctx) {
    put(ctx, refPortrait('hestia', {}, 'angry'), 96, 52, 2, { tint: '#ff3a2a', tintAmount: 0.2, key: 'cghes' });
  },
  trap(ctx, flags) {
    const a = refSprite('alice', { ...flags, eyepatch: false });
    put(ctx, a, 66, 46, 3, { tint: '#141420', tintAmount: 0.55, rim: '#e8eef8', rimDx: 2, key: 'cgtrap' });
  },
  ox(ctx) {
    put(ctx, bossArt('white_ox', 0, { open: false }), 48, 16, 2, { key: 'cgox' });
  },
};

const cache = new Map();

function base(id, flags = {}) {
  const key = `${id}|${flags.shortHair ? 1 : 0}${flags.eyepatch ? 1 : 0}`;
  if (cache.has(key)) return cache.get(key);
  const r = new Raster(W, H);
  PAINT[id]?.(r);
  const c = makeCanvas(W, H);
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(r.toCanvas(), 0, 0);
  COMPOSE[id]?.(ctx, flags);
  cache.set(key, c);
  return c;
}

// ─── animated overlays (stage coordinates) ────────────────────────────────

function hash(i, k = 1) {
  const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

const OVERLAY = {
  watch(ctx, t) {
    const cx = 510;
    const cy = 300;
    ctx.save();
    ctx.lineCap = 'square';
    ctx.strokeStyle = '#2a1e18';
    ctx.lineWidth = 6;
    const a = -t / 900;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * 120, cy + Math.sin(a) * 120);
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a / 12) * 80, cy + Math.sin(a / 12) * 80);
    ctx.stroke();
    ctx.fillStyle = '#b8963e';
    ctx.fillRect(cx - 6, cy - 6, 12, 12);
    ctx.restore();
  },
  sisters(ctx, t) {
    fireflies(ctx, t, 14);
  },
  stag(ctx, t) {
    const a = 0.25 + 0.2 * Math.sin(t / 400);
    ctx.fillStyle = `rgba(150,240,130,${a.toFixed(3)})`;
    ctx.fillRect(438, 228, 54, 54);
  },
  haircut(ctx, t) {
    // pink curls drifting down into the heat
    for (let i = 0; i < 16; i++) {
      const p = ((t / 2600 + hash(i)) % 1 + 1) % 1;
      const x = 560 + hash(i, 2) * 300 + Math.sin(t / 500 + i) * 20;
      const y = 300 + p * 260;
      ctx.globalAlpha = 1 - p;
      ctx.fillStyle = i % 2 ? '#e8a4b4' : '#c87890';
      ctx.fillRect(Math.round(x / 3) * 3, Math.round(y / 3) * 3, 6, 3);
      ctx.fillRect(Math.round(x / 3) * 3 + 3, Math.round(y / 3) * 3 + 3, 6, 3);
    }
    ctx.globalAlpha = 1;
    embers(ctx, t, 30);
  },
  maw(ctx, t) {
    embers(ctx, t, 50);
    ctx.fillStyle = `rgba(255,120,40,${(0.06 + 0.04 * Math.sin(t / 300)).toFixed(3)})`;
    ctx.fillRect(0, 0, 960, 540);
  },
  argument(ctx, t) {
    if (Math.sin(t / 130) > 0.92) {
      ctx.fillStyle = 'rgba(255,244,224,0.12)';
      ctx.fillRect(0, 0, 960, 540);
    }
  },
  alley(ctx, t) {
    for (let i = 0; i < 90; i++) {
      const s = t / 1000;
      const x = (((hash(i) * 960 - s * 90) % 960) + 960) % 960;
      const y = (((hash(i, 2) * 540 + s * 600 * (0.8 + hash(i, 3) * 0.4)) % 540) + 540) % 540;
      ctx.fillStyle = 'rgba(255,170,170,0.22)';
      ctx.fillRect(Math.round(x), Math.round(y), 2, 12);
    }
  },
  hestia(ctx, t) {
    const f = 0.08 + 0.05 * Math.sin(t / 90) * Math.sin(t / 37);
    ctx.fillStyle = `rgba(255,60,40,${f.toFixed(3)})`;
    ctx.fillRect(0, 0, 960, 540);
  },
  trap(ctx, t) {
    for (let i = 0; i < 18; i++) {
      const p = ((t / 700 + hash(i)) % 1 + 1) % 1;
      const a = Math.PI * (0.8 + hash(i, 2) * 0.25);
      const d = 40 + p * 520;
      const x = 708 + Math.cos(a) * d;
      const y = 186 + Math.sin(a) * d * 0.55;
      ctx.strokeStyle = `rgba(240,246,255,${(1 - p).toFixed(3)})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a) * 30, y + Math.sin(a) * 16);
      ctx.stroke();
    }
    if ((t % 2400) < 120) {
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillRect(0, 0, 960, 540);
    }
  },
  ox(ctx, t) {
    // hymn-sheets on the wind
    for (let i = 0; i < 22; i++) {
      const p = ((t / 6000 + hash(i)) % 1 + 1) % 1;
      const x = hash(i, 2) * 960 + Math.sin(t / 700 + i) * 40;
      const y = 560 - p * 600;
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.fillRect(Math.round(x), Math.round(y), 12, 15);
      ctx.fillStyle = 'rgba(160,150,140,0.8)';
      ctx.fillRect(Math.round(x) + 2, Math.round(y) + 4, 8, 2);
      ctx.fillRect(Math.round(x) + 2, Math.round(y) + 9, 7, 2);
    }
  },
};

function embers(ctx, t, n) {
  for (let i = 0; i < n; i++) {
    const s = t / 1000;
    const x = (hash(i) * 960 + s * 10) % 960;
    const y = ((((hash(i, 3) * 540 - s * 40 * (0.6 + hash(i, 4))) % 540) + 540) % 540);
    ctx.fillStyle = `rgba(255,170,80,${(0.5 + 0.4 * Math.sin(s * 6 + i)).toFixed(3)})`;
    ctx.fillRect(Math.round(x / 3) * 3, Math.round(y / 3) * 3, 3, 3);
  }
}

function fireflies(ctx, t, n) {
  for (let i = 0; i < n; i++) {
    const s = t / 1000;
    const x = hash(i) * 960 + Math.sin(s * 0.4 + i) * 40;
    const y = 100 + hash(i, 2) * 380 + Math.cos(s * 0.5 + i * 2) * 24;
    const a = Math.max(0, Math.sin(s * 1.5 + i * 7));
    ctx.fillStyle = `rgba(220,255,170,${(a * 0.9).toFixed(3)})`;
    ctx.fillRect(Math.round(x / 3) * 3, Math.round(y / 3) * 3, 3, 3);
  }
}

/** Full-screen CG, with its animation, a gentle vignette and a letterbox top. */
export function drawCg(ctx, id, t, flags) {
  const img = base(id, flags || window.__clockwork?.state?.flags || {});
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0, W * S, H * S);
  OVERLAY[id]?.(ctx, t);
  const g = ctx.createRadialGradient(480, 270, 200, 480, 270, 620);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 960, 540);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, 960, 18);
}

/** Static render for the Memories gallery. */
export function cgThumb(canvas, id, scale = 1) {
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const img = base(id, { shortHair: id !== 'haircut' && id !== 'sisters' && id !== 'stag' && id !== 'watch', eyepatch: id === 'ox' });
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  void scale;
}
