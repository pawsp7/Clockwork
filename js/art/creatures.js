import { Raster, rasterCached, mix, dither } from './pixel.js';

/**
 * Procedural monsters built from their three features.
 * Unknown features stay hidden in shadow: an unstudied creature is just smoke and two dim glints.
 *   eye known    → eyes glow in their colour
 *   shape known  → the body takes its true outline
 *   limbs known  → legs / arms appear
 *   identified   → full colour, by element
 */

export const EYE_GLOW = { green: '#8ee07a', red: '#ff6a5a', blue: '#7ac4ff', yellow: '#ffd75a' };
const BODY = {
  fire: ['#e0845a', '#a8483a', '#6a2a2a', '#3a1820'],
  water: ['#7aa8c8', '#4a7098', '#2e4668', '#1a2640'],
  earth: ['#a4b46a', '#6a7c44', '#44502e', '#26301e'],
  electric: ['#e8d070', '#b09444', '#76602e', '#3e3420'],
};
const SHADOW = ['#4a4256', '#352e40', '#241f2c', '#15121a'];

const SIZE = 40;

function ramp(c, nx, ny) {
  const light = -nx * 0.55 - ny * 0.75; // light from upper left
  if (light > 0.55) return c[0];
  if (light > -0.1) return c[1];
  if (light > -0.6) return c[2];
  return c[3];
}

function bodyMask(r, shape, colors, cx, cy) {
  if (shape === 'triangle') {
    r.poly(
      [
        [cx, cy - 15],
        [cx + 14, cy + 9],
        [cx - 14, cy + 9],
      ],
      null,
      (x, y) => {
        const nx = (x - cx) / 14;
        const ny = (y - (cy - 3)) / 12;
        return ramp(colors, nx, ny);
      },
    );
    // spikes
    r.set(cx, cy - 16, colors[1]);
    r.set(cx - 7, cy - 3, colors[0]);
  } else if (shape === 'square') {
    r.rect(cx - 11, cy - 10, 22, 19, colors[2]);
    for (let y = cy - 10; y < cy + 9; y++) {
      for (let x = cx - 11; x < cx + 11; x++) {
        if ((x === cx - 11 || x === cx + 10) && (y === cy - 10 || y === cy + 8)) continue; // rounded corners
        r.set(x, y, ramp(colors, (x - cx) / 11, (y - cy) / 10));
      }
    }
    // plates
    for (let x = cx - 9; x < cx + 9; x += 6) r.set(x, cy + 2, colors[3]);
  } else {
    r.ellipse(cx, cy - 1, 12, 11, null, (x, y, nx, ny) => ramp(colors, nx, ny));
    r.set(cx - 5, cy - 8, colors[0]);
    r.set(cx - 6, cy - 7, colors[0]);
  }
}

function smokeBlob(r, cx, cy, t) {
  r.ellipse(cx, cy, 13, 12, null, (x, y, nx, ny) => {
    const d = nx * nx + ny * ny;
    if (d > 0.72 && !dither(x + t, y, 1 - (d - 0.72) / 0.28)) return 'rgba(0,0,0,0)';
    return ramp(SHADOW, nx, ny);
  });
  // wisps
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + t * 0.7;
    r.set(Math.round(cx + Math.cos(a) * 14), Math.round(cy + Math.sin(a) * 12), SHADOW[2]);
  }
}

function limbsOf(r, shape, limbs, color, cx, cy, frame) {
  const footY = cy + 17;
  const sway = frame ? 1 : 0;
  const legs = [];
  if (limbs === 2) legs.push([-5, 0], [5, 0]);
  else if (limbs === 4) legs.push([-6, 0], [6, 0]);
  else legs.push([-9, 0], [-3, 0], [3, 0], [9, 0]);
  for (let i = 0; i < legs.length; i++) {
    const [dx] = legs[i];
    const s = i % 2 ? sway : -sway;
    r.stroke(cx + dx, cy + 6, cx + dx + Math.sign(dx) * 2 + s, footY, 1, color);
    r.rect(cx + dx + Math.sign(dx) * 2 + s - 1, footY, 3, 1, color);
  }
  if (limbs >= 4) {
    // arms
    const armY = shape === 'triangle' ? cy + 2 : cy - 1;
    const reach = shape === 'square' ? 13 : 12;
    r.stroke(cx - reach + 1, armY, cx - reach - 4, armY + 6 - sway * 2, 1, color);
    r.stroke(cx + reach - 1, armY, cx + reach + 4, armY + 6 + sway * 2, 1, color);
    r.set(cx - reach - 5, armY + 7 - sway * 2, color);
    r.set(cx + reach + 5, armY + 7 + sway * 2, color);
  }
  if (limbs === 6) {
    // extra back legs peeking out
    r.stroke(cx - 12, cy + 4, cx - 16, footY - 2, 0.6, color);
    r.stroke(cx + 12, cy + 4, cx + 16, footY - 2, 0.6, color);
  }
}

function eyesOf(r, shape, glow, cx, cy, known) {
  const y = shape === 'triangle' ? cy + 1 : cy - 2;
  const gap = shape === 'triangle' ? 4 : 5;
  for (const sx of [-1, 1]) {
    const x = cx + sx * gap;
    if (known) {
      r.rect(x - 1, y - 1, 3, 3, mix(glow, '#000000', 0.55));
      r.rect(x - 1, y, 3, 1, glow);
      r.set(x, y - 1, glow);
      r.set(x, y, '#ffffff');
    } else {
      r.set(x, y, '#8a8094');
    }
  }
}

/**
 * e: enemy instance (eye, shape, limbs, element, known, identified, seen)
 * Returns a canvas SIZE×(SIZE+4), anchored bottom-centre.
 */
export function monsterArt(e, frame = 0) {
  const k = e.known || { eye: true, shape: true, limbs: true };
  const colorKnown = e.identified || e.seen?.profile;
  const key = `mon|${e.eye}|${e.shape}|${e.limbs}|${e.element}|${+k.eye}${+k.shape}${+k.limbs}|${+!!colorKnown}|${frame}`;
  return rasterCached(key, SIZE, SIZE + 4, (r) => {
    const cx = 20;
    const cy = 20;
    const colors = colorKnown ? BODY[e.element] || SHADOW : SHADOW;
    if (k.limbs) limbsOf(r, e.shape, e.limbs, colors[2], cx, cy, frame);
    if (k.shape) bodyMask(r, e.shape, colors, cx, cy);
    else smokeBlob(r, cx, cy, frame);
    eyesOf(r, k.shape ? e.shape : 'circle', EYE_GLOW[e.eye], cx, cy, k.eye);
    if (k.shape && colorKnown) {
      // a mouth, so they look like they mean it
      const my = e.shape === 'triangle' ? cy + 5 : cy + 3;
      r.rect(cx - 2, my, 5, 1, colors[3]);
      if (frame) r.set(cx, my + 1, colors[3]);
    }
    if (k.shape) r.outline('#0c0a10');
    if (!k.limbs) {
      // feet lost in smoke
      for (let x = cx - 9; x <= cx + 9; x++) if (dither(x, frame, 0.5)) r.set(x, cy + 13 + ((x + frame) % 2), SHADOW[3]);
    }
  });
}

// ─── Bosses ────────────────────────────────────────────────────────────────

function stag(r, frame) {
  const cx = 40;
  // legs
  const leg = '#3a3430';
  for (const dx of [-12, -5, 5, 12]) r.stroke(cx + dx, 52, cx + dx + (frame && dx > 0 ? 1 : 0), 70, 1.2, leg);
  // body
  r.ellipse(cx, 48, 18, 11, null, (x, y, nx, ny) => ramp(['#7a7268', '#5a544c', '#403a34', '#28241f'], nx, ny));
  // hollow chest
  r.ellipse(cx - 2, 49, 6, 6, '#0a0806');
  r.ellipse(cx - 2, 50, 3, 3, frame ? '#5a9a4a' : '#3e6a34');
  // neck + head
  r.poly(
    [
      [cx - 6, 44],
      [cx + 4, 40],
      [cx + 2, 26],
      [cx - 6, 26],
    ],
    '#5a544c',
  );
  r.ellipse(cx - 2, 24, 6, 5, null, (x, y, nx, ny) => ramp(['#8a8278', '#6a6258', '#4a443c', '#2a2620'], nx, ny));
  r.rect(cx - 5, 27, 6, 3, '#4a443c');
  r.set(cx - 4, 23, '#9cf08a');
  r.set(cx + 1, 23, '#9cf08a');
  // antlers
  const ant = '#d8ccb8';
  const branch = (x0, y0, dir) => {
    r.stroke(x0, y0, x0 + dir * 10, y0 - 12, 0.7, ant);
    r.stroke(x0 + dir * 10, y0 - 12, x0 + dir * 14, y0 - 20, 0.6, ant);
    r.stroke(x0 + dir * 5, y0 - 6, x0 + dir * 2, y0 - 16, 0.6, ant);
    r.stroke(x0 + dir * 10, y0 - 12, x0 + dir * 18, y0 - 13, 0.6, ant);
    r.stroke(x0 + dir * 12, y0 - 16, x0 + dir * 10, y0 - 22, 0.5, ant);
  };
  branch(cx - 5, 21, -1);
  branch(cx + 1, 21, 1);
}

function maw(r, frame) {
  const cx = 40;
  r.ellipse(cx, 50, 30, 22, null, (x, y, nx, ny) => {
    const crack = (x * 7 + y * 13) % 23 === 0;
    if (crack) return frame ? '#ffb050' : '#e07030';
    return ramp(['#6a3a2e', '#4a2620', '#321a18', '#1e1012'], nx, ny);
  });
  // mouth
  r.ellipse(cx, 52, 20, frame ? 12 : 10, '#1a0608');
  r.ellipse(cx, 56, 14, 5, '#a8301c');
  for (let i = -18; i <= 18; i += 4) {
    r.poly(
      [
        [cx + i - 2, 42 + Math.abs(i) / 6],
        [cx + i + 2, 42 + Math.abs(i) / 6],
        [cx + i, 48 + Math.abs(i) / 8],
      ],
      '#f0c890',
    );
    r.poly(
      [
        [cx + i - 2, 62 - Math.abs(i) / 6],
        [cx + i + 2, 62 - Math.abs(i) / 6],
        [cx + i, 57 - Math.abs(i) / 8],
      ],
      '#d8a870',
    );
  }
  // eyes
  r.rect(cx - 16, 34, 4, 2, '#ffd060');
  r.rect(cx + 12, 34, 4, 2, '#ffd060');
  // lava drip
  r.rect(cx - 24, 60, 2, frame ? 8 : 6, '#e86a2a');
  r.rect(cx + 22, 58, 2, frame ? 6 : 9, '#e86a2a');
}

function warden(r, frame) {
  const cx = 40;
  const steel = ['#a8b0b8', '#7a828c', '#545a64', '#30343c'];
  // halberd
  r.stroke(cx + 22, 8, cx + 22, 74, 0.8, '#6a5a44');
  r.poly(
    [
      [cx + 22, 4],
      [cx + 30, 14],
      [cx + 22, 18],
    ],
    '#c8d0d8',
  );
  r.poly(
    [
      [cx + 22, 10],
      [cx + 14, 12],
      [cx + 22, 16],
    ],
    '#a8b0b8',
  );
  // legs
  r.rect(cx - 9, 56, 7, 18, steel[2]);
  r.rect(cx + 2, 56, 7, 18, steel[2]);
  r.rect(cx - 10, 72, 9, 3, steel[3]);
  r.rect(cx + 1, 72, 9, 3, steel[3]);
  // torso
  r.poly(
    [
      [cx - 14, 30],
      [cx + 14, 30],
      [cx + 10, 58],
      [cx - 10, 58],
    ],
    null,
    (x, y, nx, ny) => ramp(steel, nx * 2 - 1, ny * 2 - 1),
  );
  r.rect(cx - 1, 32, 2, 24, steel[3]);
  // pauldrons
  r.ellipse(cx - 16, 32, 6, 5, null, (x, y, nx, ny) => ramp(steel, nx, ny));
  r.ellipse(cx + 16, 32, 6, 5, null, (x, y, nx, ny) => ramp(steel, nx, ny));
  // arm to halberd
  r.stroke(cx + 18, 36, cx + 22, 44, 1.5, steel[2]);
  r.stroke(cx - 18, 36, cx - 20, 50, 1.5, steel[2]);
  // helmet
  r.ellipse(cx, 20, 9, 10, null, (x, y, nx, ny) => ramp(steel, nx, ny));
  r.rect(cx - 7, 19, 14, 3, '#121418');
  r.rect(cx - 5, 20, 10, 1, frame ? '#fff0a0' : '#e8c850');
  r.rect(cx - 1, 6, 2, 6, '#9a3444');
  r.rect(cx - 2, 4, 4, 3, '#9a3444');
}

function reliquary(r, frame) {
  const cx = 40;
  const gold = ['#e8cc80', '#c8a858', '#8a7040', '#4a3a24'];
  // halo
  for (let a = 0; a < 40; a++) {
    const t = (a / 40) * Math.PI * 2;
    r.set(Math.round(cx + Math.cos(t) * 13), Math.round(12 + Math.sin(t) * 5), frame ? '#bfe4ff' : '#8ac4f0');
  }
  // case
  r.poly(
    [
      [cx - 16, 70],
      [cx + 16, 70],
      [cx + 16, 26],
      [cx + 10, 16],
      [cx, 12],
      [cx - 10, 16],
      [cx - 16, 26],
    ],
    null,
    (x, y, nx, ny) => ramp(gold, nx * 2 - 1, ny * 2 - 1),
  );
  r.poly(
    [
      [cx - 12, 66],
      [cx + 12, 66],
      [cx + 12, 28],
      [cx + 7, 20],
      [cx, 17],
      [cx - 7, 20],
      [cx - 12, 28],
    ],
    '#141c2a',
  );
  // saint silhouette inside
  r.ellipse(cx, 30, 5, 6, '#2a3a52');
  r.poly(
    [
      [cx - 9, 64],
      [cx + 9, 64],
      [cx + 6, 38],
      [cx - 6, 38],
    ],
    '#22304a',
  );
  r.set(cx - 2, 30, '#a8d8ff');
  r.set(cx + 2, 30, '#a8d8ff');
  // needles
  for (let i = 0; i < 9; i++) {
    const y = 34 + i * 3.5;
    const len = 6 + ((i * 5 + frame * 2) % 5);
    r.line(cx - 16, Math.round(y), cx - 16 - len, Math.round(y - 2), '#d0d8e0');
    r.line(cx + 16, Math.round(y), cx + 16 + len, Math.round(y - 2), '#d0d8e0');
  }
  // water drip
  r.rect(cx - 1, 70, 2, frame ? 4 : 2, '#6aa8d8');
}

function ox(r, frame, open) {
  const cx = 56;
  const white = ['#ffffff', '#e8e2da', '#c4bcb2', '#8a8278'];
  // wings — hymn sheets
  for (const dir of [-1, 1]) {
    for (let i = 0; i < 7; i++) {
      const bx = cx + dir * (16 + i * 5);
      const by = 26 + i * 2 - (frame ? 1 : 0);
      r.poly(
        [
          [bx, by],
          [bx + dir * 8, by - 6 - i],
          [bx + dir * 10, by + 18 - i],
          [bx + dir * 2, by + 22],
        ],
        i % 2 ? white[1] : white[0],
      );
      for (let l = 0; l < 3; l++) r.line(bx + dir * 2, by + 4 + l * 4, bx + dir * 7, by + 2 + l * 4 - i / 2, white[2]);
    }
  }
  // body
  r.ellipse(cx, 66, 22, 16, null, (x, y, nx, ny) => ramp(white, nx, ny));
  // forelegs
  r.rect(cx - 14, 70, 7, 18, white[2]);
  r.rect(cx + 7, 70, 7, 18, white[2]);
  r.rect(cx - 15, 86, 9, 3, '#5a524a');
  r.rect(cx + 6, 86, 9, 3, '#5a524a');
  // head
  r.ellipse(cx, 42, 13, 15, null, (x, y, nx, ny) => ramp(white, nx, ny));
  r.ellipse(cx, 52, 9, 6, '#e8d8d0');
  r.set(cx - 3, 52, '#a89088');
  r.set(cx + 3, 52, '#a89088');
  // horns
  const horn = '#e0d0b0';
  r.stroke(cx - 11, 32, cx - 20, 26, 1.6, horn);
  r.stroke(cx - 20, 26, cx - 22, 16, 1.2, horn);
  r.stroke(cx + 11, 32, cx + 20, 26, 1.6, horn);
  r.stroke(cx + 20, 26, cx + 22, 16, 1.2, horn);
  // ears
  r.ellipse(cx - 15, 38, 4, 2, white[2]);
  r.ellipse(cx + 15, 38, 4, 2, white[2]);
  // eyes
  if (open) {
    r.ellipse(cx - 6, 40, 3, 2, '#2a0a0e');
    r.ellipse(cx + 6, 40, 3, 2, '#2a0a0e');
    r.rect(cx - 7, 40, 3, 1, '#ff3a3a');
    r.rect(cx + 5, 40, 3, 1, '#ff3a3a');
    r.set(cx - 6, 39, '#ffd0c0');
    r.set(cx + 6, 39, '#ffd0c0');
  } else {
    r.line(cx - 9, 40, cx - 4, 41, '#8a7e74');
    r.line(cx + 4, 41, cx + 9, 40, '#8a7e74');
  }
  // bell collar
  r.rect(cx - 10, 56, 20, 2, '#8a6a3a');
  r.poly(
    [
      [cx - 3, 57],
      [cx + 3, 57],
      [cx + 5, 65],
      [cx - 5, 65],
    ],
    '#d8b050',
  );
  r.set(cx, 65, '#6a5020');
  // halo
  for (let a = 0; a < 48; a++) {
    const t = (a / 48) * Math.PI * 2;
    if (a % 3 === frame % 3) continue;
    r.set(Math.round(cx + Math.cos(t) * 18), Math.round(14 + Math.sin(t) * 4), '#f4e8c0');
  }
}

const BOSS_PAINT = { hollow_stag: stag, cinder_maw: maw, gatewarden: warden, reliquary };

export function bossArt(id, frame = 0, opts = {}) {
  if (id === 'white_ox')
    return rasterCached(`boss|ox|${frame}|${opts.open ? 1 : 0}`, 112, 92, (r) => {
      ox(r, frame, opts.open);
      r.outline('#2a2430');
    });
  return rasterCached(`boss|${id}|${frame}`, 80, 78, (r) => {
    BOSS_PAINT[id](r, frame);
    r.outline('#0c0a10');
  });
}

/** Hollow Faithful: a robed believer with an empty face. */
export function faithfulArt(frame = 0) {
  return rasterCached(`faithful|${frame}`, 32, 44, (r) => {
    const cx = 16;
    r.poly(
      [
        [cx - 9, 42],
        [cx + 9, 42],
        [cx + 6, 14],
        [cx - 6, 14],
      ],
      null,
      (x, y, nx) => (nx < 0.35 ? '#e8e2da' : nx < 0.7 ? '#c8c0b6' : '#a8a096'),
    );
    r.ellipse(cx, 12, 7, 8, '#ece6de');
    r.ellipse(cx, 13, 5, 6, '#2a2630');
    r.set(cx - 2, 13, frame ? '#9ab0c8' : '#6a7a90');
    r.set(cx + 2, 13, frame ? '#9ab0c8' : '#6a7a90');
    r.rect(cx - 6, 26, 12, 2, '#c8a858');
    r.rect(cx - 1, 20, 2, 8, '#c8a858');
  });
}

export { Raster };
