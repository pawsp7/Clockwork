import { Raster, dither, mix, hexToRgba } from './pixel.js';
import { hashRng } from '../core/rng.js';

/**
 * Painted backdrops at 480×270 (shown at 2×). Each scene returns
 *   { canvas, lights: [{x,y,r,color,flicker}], particles: kind, ground: y, hotspots? }
 * Lights and particles are animated on top every frame by the renderer.
 */

export const BW = 480;
export const BH = 270;
const cache = new Map();

// ─── painting helpers ─────────────────────────────────────────────────────

function vgrad(r, y0, y1, stops, x0 = 0, x1 = BW) {
  for (let y = y0; y < y1; y++) {
    const t = (y - y0) / Math.max(1, y1 - y0 - 1);
    const seg = Math.min(stops.length - 2, Math.floor(t * (stops.length - 1)));
    const lt = t * (stops.length - 1) - seg;
    for (let x = x0; x < x1; x++) r.set(x, y, dither(x, y, lt) ? stops[seg + 1] : stops[seg]);
  }
}

function noise(seed) {
  const rnd = hashRng(seed);
  const pts = Array.from({ length: 64 }, () => rnd());
  return (x) => {
    const i = Math.floor(x);
    const f = x - i;
    const a = pts[((i % 64) + 64) % 64];
    const b = pts[(((i + 1) % 64) + 64) % 64];
    const s = f * f * (3 - 2 * f);
    return a + (b - a) * s;
  };
}

function ridge(r, base, amp, freq, color, seed, octaves = 2) {
  const n = noise(seed);
  const n2 = noise(seed + 7);
  for (let x = 0; x < BW; x++) {
    let h = n(x * freq) * amp;
    if (octaves > 1) h += n2(x * freq * 3.1) * amp * 0.35;
    const top = Math.round(base - h);
    for (let y = top; y < BH; y++) r.set(x, y, color);
  }
}

function ceilingRidge(r, base, amp, freq, color, seed) {
  const n = noise(seed);
  for (let x = 0; x < BW; x++) {
    const h = Math.round(base + n(x * freq) * amp);
    for (let y = 0; y < h; y++) r.set(x, y, color);
  }
}

function stalactites(r, color, seed, count = 26, maxLen = 40) {
  const rnd = hashRng(seed);
  for (let i = 0; i < count; i++) {
    const x = Math.floor(rnd() * BW);
    const w = 3 + Math.floor(rnd() * 7);
    const len = 8 + Math.floor(rnd() * maxLen);
    r.poly(
      [
        [x - w, 0],
        [x + w, 0],
        [x, len],
      ],
      color,
    );
  }
}

function deadTree(r, x, ground, h, color, seed) {
  const rnd = hashRng(seed);
  const trunkW = 2 + Math.floor(h / 40);
  r.poly(
    [
      [x - trunkW - 1, ground],
      [x + trunkW + 1, ground],
      [x + trunkW - 1, ground - h],
      [x - trunkW + 1, ground - h],
    ],
    color,
  );
  const branch = (bx, by, ang, len, depth) => {
    if (depth <= 0 || len < 3) return;
    const ex = bx + Math.cos(ang) * len;
    const ey = by + Math.sin(ang) * len;
    r.stroke(bx, by, ex, ey, Math.max(0.5, depth * 0.45), color);
    branch(ex, ey, ang - 0.35 - rnd() * 0.4, len * (0.6 + rnd() * 0.2), depth - 1);
    branch(ex, ey, ang + 0.3 + rnd() * 0.4, len * (0.55 + rnd() * 0.2), depth - 1);
  };
  for (let i = 0; i < 4; i++) {
    const by = ground - h * (0.45 + i * 0.16);
    const side = i % 2 ? 1 : -1;
    branch(x, by, -Math.PI / 2 + side * (0.7 + rnd() * 0.4), h * 0.28, 3);
  }
  branch(x, ground - h, -Math.PI / 2 + (rnd() - 0.5) * 0.4, h * 0.25, 3);
}

function building(r, x, y, w, h, o) {
  const wall = o.wall || '#2a2430';
  const dark = mix(wall, '#000000', 0.35);
  r.rect(x, y, w, h, wall);
  r.rect(x + w - 3, y, 3, h, dark);
  // roof
  if (o.roof === 'peak') {
    r.poly(
      [
        [x - 4, y + 1],
        [x + w + 4, y + 1],
        [x + w / 2, y - (o.roofH || 18)],
      ],
      o.roofColor || '#1c1820',
    );
  } else if (o.roof === 'slant') {
    r.poly(
      [
        [x - 3, y + 1],
        [x + w + 3, y + 1],
        [x + w + 3, y - 8],
        [x + 6, y - 14],
      ],
      o.roofColor || '#1c1820',
    );
  } else {
    r.rect(x - 2, y - 3, w + 4, 4, o.roofColor || '#1c1820');
  }
  // windows
  const lit = o.lit || '#e8dcb8';
  for (const [wx, wy, ww, wh] of o.windows || []) {
    r.rect(x + wx - 1, y + wy - 1, ww + 2, wh + 2, dark);
    r.rect(x + wx, y + wy, ww, wh, lit);
    r.rect(x + wx + Math.floor(ww / 2), y + wy, 1, wh, dark);
    r.rect(x + wx, y + wy + Math.floor(wh / 2), ww, 1, dark);
  }
  if (o.door) {
    const [dx, dw, dh] = o.door;
    r.rect(x + dx, y + h - dh, dw, dh, o.doorColor || '#140f14');
    r.rect(x + dx + 1, y + h - dh + 1, dw - 2, dh - 1, mix(o.doorColor || '#140f14', lit, 0.15));
  }
}

function fog(r, y, h, color, strength = 0.35, seed = 1) {
  const c = hexToRgba(color);
  const n = noise(seed);
  for (let yy = y - h; yy <= y + h; yy++) {
    const k = 1 - Math.abs(yy - y) / h;
    for (let x = 0; x < BW; x++) {
      const a = k * strength * (0.6 + 0.4 * n(x * 0.03 + yy * 0.1));
      if (dither(x, yy, a)) r.set(x, yy, [c[0], c[1], c[2], 160]);
    }
  }
}

function horns(r, cx, top, spread, color) {
  for (const d of [-1, 1]) {
    r.stroke(cx + d * 4, top + 18, cx + d * (spread * 0.7), top + 10, 1.8, color);
    r.stroke(cx + d * (spread * 0.7), top + 10, cx + d * spread, top + 2, 1.5, color);
    r.stroke(cx + d * spread, top + 2, cx + d * (spread - 3), top - 6, 1.1, color);
  }
}

function sign(r, x, y, kind) {
  r.rect(x, y, 18, 12, '#4a3428');
  r.rect(x + 1, y + 1, 16, 10, '#5e4434');
  const ic = '#e8d8b0';
  if (kind === 'inn') {
    r.rect(x + 4, y + 5, 10, 3, ic);
    r.rect(x + 4, y + 3, 3, 2, ic);
  } else if (kind === 'pub') {
    r.rect(x + 6, y + 3, 6, 7, '#d8a050');
    r.rect(x + 12, y + 4, 2, 4, ic);
    r.rect(x + 6, y + 3, 6, 1, ic);
  } else if (kind === 'smithy') {
    r.rect(x + 4, y + 4, 10, 3, '#9aa0a8');
    r.rect(x + 7, y + 7, 4, 3, '#9aa0a8');
  } else if (kind === 'clinic') {
    r.rect(x + 8, y + 2, 2, 8, '#a8e0b0');
    r.rect(x + 5, y + 5, 8, 2, '#a8e0b0');
  }
}

function smokeColumn(r, x, y, seed) {
  const rnd = hashRng(seed);
  for (let i = 0; i < 26; i++) {
    const yy = y - i * 3;
    const xx = x + Math.round(Math.sin(i * 0.5) * (i / 5)) + Math.floor(rnd() * 2);
    r.ellipse(xx, yy, 2 + i / 8, 2 + i / 10, null, (px, py) => (dither(px, py, 0.5 - i / 60) ? '#3a3238' : 'rgba(0,0,0,0)'));
  }
}

function softGlow(r, cx, cy, rad, color, strength = 0.5) {
  const c = hexToRgba(color);
  for (let y = cy - rad; y <= cy + rad; y++) {
    for (let x = cx - rad; x <= cx + rad; x++) {
      const d = Math.hypot(x - cx, y - cy) / rad;
      if (d > 1) continue;
      const a = (1 - d) * (1 - d) * strength;
      if (dither(x, y, a * 1.6)) r.set(x, y, [c[0], c[1], c[2], Math.round(a * 255)]);
    }
  }
}

function stars(r, seed, color, count, maxY) {
  const rnd = hashRng(seed);
  for (let i = 0; i < count; i++) r.set(Math.floor(rnd() * BW), Math.floor(rnd() * maxY), color);
}

function groundStrip(r, y, colors, seed) {
  vgrad(r, y, BH, colors);
  const rnd = hashRng(seed);
  for (let i = 0; i < 220; i++) {
    const x = Math.floor(rnd() * BW);
    const yy = y + 2 + Math.floor(rnd() * (BH - y - 2));
    r.set(x, yy, colors[0]);
  }
}

// ─── scenes ───────────────────────────────────────────────────────────────

function title(r) {
  vgrad(r, 0, BH, ['#100c14', '#1a141e', '#261c26', '#34242c']);
  stars(r, 3, '#5a5058', 60, 120);
  // the great clock in the cavern sky
  const cx = 240;
  const cy = 92;
  r.ellipse(cx, cy, 78, 78, '#1c1820');
  r.ellipse(cx, cy, 72, 72, '#221c26');
  r.ellipse(cx, cy, 70, 70, null, (x, y, nx, ny) => (dither(x, y, 0.3 + (1 - ny) * 0.2) ? '#2a222c' : '#241e28'));
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2;
    const len = i % 5 === 0 ? 7 : 3;
    r.line(
      Math.round(cx + Math.cos(a) * 66),
      Math.round(cy + Math.sin(a) * 66),
      Math.round(cx + Math.cos(a) * (66 - len)),
      Math.round(cy + Math.sin(a) * (66 - len)),
      i % 5 === 0 ? '#8a7a68' : '#4a4048',
    );
  }
  r.ellipse(cx, cy, 52, 52, null, (x, y, nx, ny) => {
    const d = Math.hypot(nx, ny);
    return d > 0.96 ? '#3a3038' : 'rgba(0,0,0,0)';
  });
  ceilingRidge(r, 14, 16, 0.02, '#0e0b12', 11);
  stalactites(r, '#0e0b12', 12, 30, 34);
  // town silhouette
  ridge(r, 214, 12, 0.012, '#151118', 21);
  const rnd = hashRng(5);
  for (let i = 0; i < 18; i++) {
    const x = Math.floor(rnd() * 470);
    const w = 14 + Math.floor(rnd() * 22);
    const h = 18 + Math.floor(rnd() * 34);
    building(r, x, 218 - h, w, h, { wall: '#120e14', roof: rnd() < 0.5 ? 'peak' : 'flat', roofColor: '#0e0b10', windows: rnd() < 0.7 ? [[3, 6, 3, 4]] : [], lit: '#c8b890' });
  }
  // the horned church
  building(r, 300, 150, 30, 70, { wall: '#16121a', roof: 'peak', roofH: 30, roofColor: '#120e14', windows: [[11, 18, 8, 12]], lit: '#b8a8a0' });
  horns(r, 315, 104, 18, '#d8ccb8');
  fog(r, 214, 14, '#4a3a48', 0.45, 6);
  groundStrip(r, 236, ['#1e1820', '#151018', '#0e0a10'], 9);
}

function surface(r) {
  vgrad(r, 0, 200, ['#2a2e3e', '#3a3446', '#4a3a48', '#5a4450']);
  // buildings above ground
  const rnd = hashRng(44);
  for (let i = 0; i < 9; i++) {
    const x = i * 56 - 10;
    const h = 90 + Math.floor(rnd() * 70);
    building(r, x, 210 - h, 52, h, {
      wall: i % 2 ? '#2a2632' : '#302a36',
      roof: 'flat',
      roofColor: '#201c26',
      windows: [
        [8, 14, 8, 10],
        [30, 14, 8, 10],
        [8, 40, 8, 10],
        [30, 40, 8, 10],
      ].filter(() => rnd() < 0.6),
      lit: '#e8c890',
    });
  }
  // antique shop
  building(r, 168, 120, 120, 90, { wall: '#3a2e2a', roof: 'flat', roofColor: '#2a201e', windows: [[12, 30, 40, 34], [68, 30, 40, 34]], door: [56, 14, 30], lit: '#d8b878' });
  r.rect(176, 118, 104, 10, '#2a1e1a');
  r.rect(190, 120, 76, 6, '#c8a860');
  // lamp post
  r.rect(110, 120, 3, 90, '#1a1a20');
  r.rect(104, 114, 15, 8, '#1a1a20');
  r.rect(106, 116, 11, 5, '#ffe0a0');
  groundStrip(r, 210, ['#3a3440', '#2a2630', '#1e1a24'], 31);
  for (let x = 0; x < BW; x += 24) r.rect(x, 210, 1, 60, '#26222c');
}

function outskirts(r) {
  vgrad(r, 0, BH, ['#100c12', '#161218', '#1e1820', '#241c24']);
  ceilingRidge(r, 20, 20, 0.018, '#0c0a0e', 81);
  stalactites(r, '#0c0a0e', 82, 20, 30);
  ridge(r, 170, 20, 0.02, '#151018', 83);
  building(r, 10, 90, 90, 112, { wall: '#1e1820', roof: 'slant', windows: [[14, 20, 10, 10], [60, 44, 10, 10]], lit: '#d8ccb0' });
  building(r, 380, 70, 100, 132, { wall: '#1c1620', roof: 'peak', windows: [[20, 30, 10, 12], [64, 30, 10, 12]], door: [40, 18, 30], lit: '#d8ccb0' });
  groundStrip(r, 200, ['#2a222a', '#1e181e', '#141014'], 84);
}

function town(r) {
  vgrad(r, 0, BH, ['#16111a', '#1e1820', '#281e26', '#34262c']);
  ceilingRidge(r, 12, 14, 0.015, '#0c0a0e', 61);
  stalactites(r, '#0c0a0e', 62, 30, 32);
  stars(r, 63, '#3a3238', 30, 80);
  // far silhouettes
  ridge(r, 150, 18, 0.02, '#161118', 64);
  // church (back, centre)
  building(r, 214, 64, 52, 96, { wall: '#1e1820', roof: 'peak', roofH: 34, roofColor: '#16121a', windows: [[18, 22, 16, 22]], door: [18, 16, 24], lit: '#c8b4a8' });
  horns(r, 240, 16, 22, '#d8ccb8');
  r.rect(236, 40, 8, 8, '#c8a858');
  // Inn
  building(r, 16, 96, 92, 98, { wall: '#3a2a28', roof: 'peak', roofH: 26, roofColor: '#241a1a', windows: [[12, 16, 14, 12], [64, 16, 14, 12], [12, 46, 14, 12], [64, 46, 14, 12]], door: [38, 16, 30], lit: '#f0d090' });
  // Pub
  building(r, 118, 112, 82, 82, { wall: '#2e2a22', roof: 'slant', roofColor: '#201c18', windows: [[10, 22, 22, 16], [50, 22, 22, 16]], door: [34, 14, 28], lit: '#e8b870' });
  // Smithy
  building(r, 284, 116, 78, 78, { wall: '#28262a', roof: 'flat', roofColor: '#1a181c', windows: [[10, 20, 16, 14]], door: [40, 26, 32], doorColor: '#2a120c', lit: '#ff9a50' });
  r.rect(340, 92, 10, 26, '#1a181c');
  // Clinic
  building(r, 372, 100, 92, 94, { wall: '#2a2e2c', roof: 'peak', roofH: 20, roofColor: '#1a1e1c', windows: [[12, 18, 14, 14], [66, 18, 14, 14]], door: [38, 16, 28], lit: '#c8e0c8' });
  // timber frames
  for (const [x, y, w, h] of [
    [16, 96, 92, 98],
    [118, 112, 82, 82],
  ]) {
    for (let i = x + 10; i < x + w - 6; i += 26) r.rect(i, y, 2, h, '#1e1612');
    r.rect(x, y + Math.floor(h / 2) - 4, w - 3, 2, '#1e1612');
  }
  // chimneys & smoke
  r.rect(80, 64, 8, 20, '#241a1a');
  smokeColumn(r, 84, 60, 3);
  smokeColumn(r, 345, 88, 4);
  // signs
  sign(r, 52, 150, 'inn');
  sign(r, 152, 150, 'pub');
  sign(r, 304, 152, 'smithy');
  sign(r, 408, 150, 'clinic');
  // street
  fog(r, 150, 10, '#3a2e38', 0.3, 66);
  groundStrip(r, 194, ['#30262c', '#251e24', '#1a1418'], 65);
  for (let x = 0; x < BW; x += 16) r.rect(x + ((x / 16) % 2) * 8, 206, 6, 1, '#1a1418');
  // lanterns posts
  for (const x of [112, 206, 276, 366]) {
    r.rect(x, 160, 2, 36, '#141016');
    r.rect(x - 2, 156, 6, 6, '#141016');
    r.rect(x - 1, 157, 4, 4, '#f4ecd8');
  }
  // gate (right edge → leaving town)
  r.rect(466, 120, 14, 76, '#141016');
}

function woods(r) {
  vgrad(r, 0, BH, ['#0e120e', '#141a14', '#1a2218', '#20281c']);
  stars(r, 71, '#2e3a2c', 40, 120);
  r.ellipse(380, 50, 18, 18, '#3a4436');
  r.ellipse(380, 50, 15, 15, '#4a5644');
  const rnd = hashRng(72);
  for (let i = 0; i < 9; i++) deadTree(r, 10 + i * 54 + Math.floor(rnd() * 20), 200, 120 + Math.floor(rnd() * 50), '#121812', 100 + i);
  fog(r, 170, 16, '#3a4a36', 0.4, 75);
  ridge(r, 196, 10, 0.03, '#141a12', 73);
  for (let i = 0; i < 6; i++) deadTree(r, 30 + i * 90 + Math.floor(rnd() * 30), 230, 160 + Math.floor(rnd() * 60), '#0a0e0a', 200 + i);
  groundStrip(r, 214, ['#222a1c', '#181e14', '#10140e'], 74);
  fog(r, 222, 8, '#4a5a44', 0.3, 76);
}

function volcano(r) {
  vgrad(r, 0, BH, ['#140c0c', '#22120e', '#3a1a12', '#4a2214']);
  ceilingRidge(r, 10, 16, 0.02, '#0e0808', 91);
  // distant cone
  r.poly(
    [
      [150, 200],
      [228, 70],
      [262, 70],
      [340, 200],
    ],
    '#241210',
  );
  r.rect(228, 66, 34, 6, '#ff8a3a');
  softGlow(r, 245, 66, 40, '#ff6a2a', 0.5);
  for (let i = 0; i < 30; i++) r.set(232 + ((i * 7) % 26), 72 + i * 4, dither(i, i, 0.5) ? '#c84a1e' : '#8a2a14');
  ridge(r, 170, 40, 0.012, '#1e100e', 92);
  // lava falls
  for (const x of [90, 390]) {
    for (let y = 110; y < 212; y++) {
      const w = 4 + Math.floor((y - 110) / 30);
      for (let i = -w; i <= w; i++) {
        const edge = Math.abs(i) / w;
        r.set(x + i + Math.round(Math.sin(y * 0.15) * 2), y, edge > 0.7 ? '#8a2a14' : dither(x + i, y, 0.6 - edge * 0.4) ? '#ffa040' : '#e05a22');
      }
    }
  }
  // rock spires
  for (const [x, h] of [
    [30, 70],
    [190, 46],
    [300, 54],
    [450, 80],
  ]) r.poly([[x - 12, 214], [x + 12, 214], [x + 3, 214 - h], [x - 4, 214 - h + 6]], '#140a08');
  ridge(r, 196, 16, 0.025, '#160c0a', 93);
  groundStrip(r, 214, ['#2a1610', '#1e100c', '#140a08'], 94);
  // lava river
  for (let x = 0; x < BW; x++) {
    const y = 250 + Math.round(Math.sin(x * 0.03) * 4);
    for (let j = 0; j < 7; j++) r.set(x, y + j, dither(x, y + j, 0.5 - j * 0.06) ? '#f08030' : '#b03c1c');
  }
}

function fort(r) {
  vgrad(r, 0, BH, ['#0e0f12', '#14161a', '#1a1c22', '#202228']);
  stars(r, 51, '#2c2e36', 20, 70);
  // back wall with arches
  r.rect(0, 70, BW, 140, '#1c1e24');
  for (let x = 0; x < BW; x += 12) for (let y = 70; y < 210; y += 8) r.rect(x + ((y / 8) % 2) * 6, y, 11, 7, '#22242c');
  for (const x of [60, 200, 340]) {
    r.rect(x, 110, 80, 100, '#0c0d10');
    r.ellipse(x + 40, 110, 40, 30, '#0c0d10');
  }
  // battlements
  for (let x = 0; x < BW; x += 20) r.rect(x, 58, 12, 14, '#1c1e24');
  // banners
  for (const x of [40, 180, 320, 450]) {
    r.rect(x, 74, 14, 50, '#3a1c22');
    for (let i = 0; i < 14; i += 3) r.rect(x + i, 120 + (i % 2) * 4, 2, 8, '#3a1c22');
    r.rect(x + 5, 84, 4, 4, '#8a7a5a');
  }
  groundStrip(r, 208, ['#26282e', '#1c1e22', '#121316'], 52);
  for (let x = 0; x < BW; x += 22) r.rect(x, 208, 1, 62, '#16171a');
}

function ruins(r) {
  vgrad(r, 0, BH, ['#0e0c14', '#14121c', '#1a1824', '#221e2c']);
  stars(r, 41, '#2e2c3a', 50, 140);
  // broken clock face
  r.ellipse(250, 96, 60, 60, '#1a1824');
  r.ellipse(250, 96, 56, 56, '#201e2a');
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    r.rect(Math.round(250 + Math.cos(a) * 48) - 1, Math.round(96 + Math.sin(a) * 48) - 1, 3, 3, '#4a4658');
  }
  r.poly(
    [
      [300, 60],
      [330, 40],
      [320, 120],
    ],
    '#0e0c14',
  );
  // pillars
  for (const [x, h, broken] of [
    [30, 150, false],
    [110, 120, true],
    [380, 140, false],
    [440, 100, true],
  ]) {
    r.rect(x, 210 - h, 22, h, '#2a2834');
    r.rect(x + 16, 210 - h, 6, h, '#1e1c26');
    r.rect(x - 4, 210 - h, 30, 6, '#322f3c');
    if (broken) r.poly([[x - 2, 210 - h], [x + 24, 210 - h], [x + 10, 210 - h - 12]], '#14121c');
    for (let y = 210 - h + 10; y < 210; y += 16) r.rect(x, y, 22, 1, '#1e1c26');
  }
  // vines
  const rnd = hashRng(42);
  for (let i = 0; i < 20; i++) {
    const x = Math.floor(rnd() * BW);
    const len = 10 + Math.floor(rnd() * 50);
    for (let y = 60; y < 60 + len; y++) if (rnd() < 0.8) r.set(x + Math.round(Math.sin(y * 0.3)), y, '#2a3a30');
  }
  groundStrip(r, 210, ['#242030', '#1a1824', '#121018'], 43);
}

function manor(r) {
  vgrad(r, 0, BH, ['#16121a', '#1e1820', '#262028', '#2e262c']);
  // pillars & drapes
  for (const x of [20, 120, 340, 440]) {
    r.rect(x, 20, 20, 200, '#3a3238');
    r.rect(x + 15, 20, 5, 200, '#2a2428');
  }
  for (const x of [50, 380]) {
    for (let i = 0; i < 50; i++) {
      const sway = Math.round(Math.sin(i * 0.4) * 2);
      r.rect(x + i + sway, 10, 1, 180 - Math.abs(25 - i) * 2, i % 6 < 3 ? '#e8e2da' : '#c8c0b8');
    }
  }
  // altar
  r.rect(200, 170, 80, 40, '#e8e2da');
  r.rect(196, 166, 88, 6, '#f4f0ea');
  r.rect(204, 176, 72, 2, '#c8a858');
  // ox window
  r.ellipse(240, 80, 30, 36, '#3a3036');
  r.ellipse(240, 80, 26, 32, '#5a4a50');
  r.stroke(224, 70, 214, 54, 1.4, '#e8dcc8');
  r.stroke(256, 70, 266, 54, 1.4, '#e8dcc8');
  r.ellipse(240, 84, 10, 12, '#e8dcc8');
  groundStrip(r, 210, ['#3a3034', '#2a2226', '#1e181c'], 99);
  for (let x = 0; x < BW; x += 30) for (let y = 210; y < BH; y += 15) r.rect(x + ((y / 15) % 2) * 15, y, 1, 15, '#241c20');
}

function interior(r, wall, floor, seed, extras) {
  vgrad(r, 0, BH, wall);
  for (let x = 0; x < BW; x += 60) r.rect(x, 0, 6, 200, mix(wall[0], '#000000', 0.3));
  r.rect(0, 30, BW, 6, mix(wall[0], '#000000', 0.35));
  groundStrip(r, 200, floor, seed);
  for (let y = 200; y < BH; y += 10) r.rect(0, y, BW, 1, mix(floor[1], '#000000', 0.3));
  extras(r);
}

function innNight(r) {
  interior(r, ['#1e1612', '#261c16', '#2e221a'], ['#3a2a1e', '#2e2018', '#221812'], 21, (r2) => {
    r2.rect(320, 60, 70, 60, '#141824');
    r2.rect(354, 60, 2, 60, '#2a1e16');
    r2.rect(320, 89, 70, 2, '#2a1e16');
    stars(r2, 22, '#5a6078', 6, 0);
    r2.rect(150, 170, 120, 8, '#4a3020');
    r2.rect(160, 178, 6, 30, '#3a2418');
    r2.rect(254, 178, 6, 30, '#3a2418');
    r2.rect(200, 160, 4, 10, '#e8e0d0');
    r2.rect(230, 162, 6, 8, '#7a4a3a');
    r2.rect(60, 90, 50, 80, '#2a1c14');
    for (let i = 0; i < 4; i++) r2.rect(64, 96 + i * 18, 42, 2, '#3a2a1e');
  });
}

function pub(r) {
  interior(r, ['#1e1810', '#282014', '#302618'], ['#3a2c1c', '#2c2016', '#201810'], 31, (r2) => {
    r2.rect(40, 140, 260, 60, '#3a2618');
    r2.rect(36, 136, 268, 6, '#5a3a24');
    for (let i = 0; i < 14; i++) {
      r2.rect(50 + i * 18, 70 + (i % 3) * 2, 6, 16, ['#5a7a4a', '#7a3a2a', '#c8b890', '#4a5a7a'][i % 4]);
      r2.rect(52 + i * 18, 66 + (i % 3) * 2, 2, 4, '#2a2018');
    }
    r2.rect(40, 88, 260, 4, '#4a3020');
    r2.rect(360, 150, 70, 8, '#4a3020');
    r2.rect(370, 158, 6, 40, '#3a2418');
    r2.rect(414, 158, 6, 40, '#3a2418');
  });
}

function church(r) {
  interior(r, ['#140c10', '#1c1014', '#241418'], ['#2a1a1e', '#1e1216', '#140c10'], 41, (r2) => {
    r2.ellipse(240, 70, 30, 40, '#2a1418');
    r2.ellipse(240, 70, 24, 34, '#4a1a20');
    r2.stroke(226, 60, 214, 42, 1.4, '#c8b0a0');
    r2.stroke(254, 60, 266, 42, 1.4, '#c8b0a0');
    for (let i = 0; i < 6; i++) {
      r2.rect(60 + i * 70, 150, 40, 40, '#1e1014');
      r2.rect(60 + i * 70, 146, 40, 4, '#2a161a');
    }
  });
}

function clinic(r) {
  interior(r, ['#141a18', '#1a221e', '#202a24'], ['#2a302a', '#20261f', '#161a16'], 51, (r2) => {
    for (let s = 0; s < 3; s++) {
      r2.rect(40, 60 + s * 34, 160, 4, '#3a3028');
      for (let i = 0; i < 9; i++) r2.rect(46 + i * 17, 46 + s * 34, 8, 14, ['#6a8a6a', '#8a6a5a', '#c8c0a0', '#5a6a8a'][(i + s) % 4]);
    }
    // skeleton
    r2.ellipse(380, 70, 8, 9, '#d8d0c0');
    r2.rect(379, 79, 2, 50, '#d8d0c0');
    for (let i = 0; i < 5; i++) r2.rect(370, 86 + i * 6, 20, 2, '#d8d0c0');
    r2.rect(377, 68, 2, 2, '#141a18');
    r2.rect(382, 68, 2, 2, '#141a18');
  });
}

function mapScene(r) {
  vgrad(r, 0, BH, ['#16121a', '#1c1620', '#221a24']);
  const rnd = hashRng(13);
  for (let i = 0; i < 900; i++) r.set(Math.floor(rnd() * BW), Math.floor(rnd() * BH), '#2a2230');
  // vignette paper edge
  for (let x = 0; x < BW; x++) {
    for (let y = 0; y < BH; y++) {
      const d = Math.max(Math.abs(x - BW / 2) / (BW / 2), Math.abs(y - BH / 2) / (BH / 2));
      if (d > 0.9 && dither(x, y, (d - 0.9) * 8)) r.set(x, y, '#0c0a0e');
    }
  }
}

const SCENES = {
  title: { paint: title, particles: 'ash', lights: [{ x: 315, y: 175, r: 14, color: '#d8c8b0', flicker: 0.3 }] },
  surface: { paint: surface, particles: 'rain', lights: [{ x: 111, y: 118, r: 40, color: '#ffe0a0', flicker: 0.1 }], ground: 214 },
  outskirts: { paint: outskirts, particles: 'ash', lights: [{ x: 420, y: 112, r: 26, color: '#e8dcc0', flicker: 0.2 }], ground: 214 },
  town: {
    paint: town,
    particles: 'ash',
    lights: [112, 206, 276, 366].map((x) => ({ x: x + 1, y: 159, r: 22, color: '#f4ecd8', flicker: 0.25 })),
    ground: 214,
    hotspots: [
      { id: 'inn', label: 'Inn', x: 16, y: 70, w: 92, h: 124 },
      { id: 'pub', label: 'Pub', x: 118, y: 98, w: 82, h: 96 },
      { id: 'church', label: 'Church of the Ox', x: 214, y: 30, w: 52, h: 130 },
      { id: 'smithy', label: 'Smithy', x: 284, y: 92, w: 78, h: 102 },
      { id: 'clinic', label: 'Clinic', x: 372, y: 80, w: 92, h: 114 },
    ],
  },
  woods: { paint: woods, particles: 'fireflies', lights: [], ground: 214 },
  volcano: { paint: volcano, particles: 'embers', lights: [{ x: 120, y: 200, r: 50, color: '#ff7030', flicker: 0.3 }, { x: 330, y: 200, r: 50, color: '#ff7030', flicker: 0.3 }], ground: 214 },
  fort: { paint: fort, particles: 'dust', lights: [{ x: 100, y: 150, r: 30, color: '#ffb060', flicker: 0.4 }, { x: 380, y: 150, r: 30, color: '#ffb060', flicker: 0.4 }], ground: 214 },
  ruins: { paint: ruins, particles: 'motes', lights: [{ x: 250, y: 96, r: 60, color: '#6a7ac8', flicker: 0.15 }], ground: 214 },
  manor: { paint: manor, particles: 'feathers', lights: [{ x: 210, y: 160, r: 24, color: '#ffe8c0', flicker: 0.35 }, { x: 270, y: 160, r: 24, color: '#ffe8c0', flicker: 0.35 }, { x: 240, y: 80, r: 50, color: '#f0e0d0', flicker: 0.1 }], ground: 214 },
  inn_night: { paint: innNight, particles: 'dust', lights: [{ x: 202, y: 158, r: 40, color: '#ffd090', flicker: 0.4 }], ground: 214 },
  pub: { paint: pub, particles: 'dust', lights: [{ x: 170, y: 40, r: 50, color: '#ffc070', flicker: 0.2 }, { x: 395, y: 130, r: 26, color: '#ffc070', flicker: 0.3 }], ground: 214 },
  church: { paint: church, particles: 'embers', lights: [{ x: 240, y: 70, r: 50, color: '#c03030', flicker: 0.3 }], ground: 214 },
  clinic: { paint: clinic, particles: 'dust', lights: [{ x: 300, y: 50, r: 40, color: '#c8e8c8', flicker: 0.15 }], ground: 214 },
  map: { paint: mapScene, particles: 'dust', lights: [] },
};

export function scene(id) {
  const key = SCENES[id] ? id : 'town';
  if (cache.has(key)) return cache.get(key);
  const def = SCENES[key];
  const r = new Raster(BW, BH);
  def.paint(r);
  for (const l of def.lights || []) softGlow(r, l.x, l.y, Math.round(l.r * 0.6), l.color, 0.35);
  const out = { id: key, canvas: r.toCanvas(), lights: def.lights || [], particles: def.particles, ground: def.ground || 214, hotspots: def.hotspots || [] };
  cache.set(key, out);
  return out;
}

export const SCENE_IDS = Object.keys(SCENES);
