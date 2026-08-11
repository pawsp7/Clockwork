import { P } from './palette.js';

/**
 * Overworld chibi style (from refs):
 * - ~26–32 × 48–58 grid, large head (~1/3 height)
 * - Lineless: shapes via color blocks, no black outlines
 * - Vacant pupil-less eyes, minimal 2–3 shade depth
 * - Front idle pose
 */

export function px(ctx, x, y, c, s = 1, ax = 0, ay = 0) {
  ctx.fillStyle = c;
  ctx.fillRect(ax + x * s, ay + y * s, s, s);
}

export function rect(ctx, x, y, w, h, c, s = 1, ax = 0, ay = 0) {
  ctx.fillStyle = c;
  ctx.fillRect(ax + x * s, ay + y * s, w * s, h * s);
}

/** Vacant eye: solid pale block + single highlight pixel */
function vacantEyes(ctx, lx, rx, y, size, eye, hi, s, ax, ay) {
  rect(ctx, lx, y, size, size, eye, s, ax, ay);
  rect(ctx, rx, y, size, size, eye, s, ax, ay);
  px(ctx, lx, y, hi, s, ax, ay);
  px(ctx, rx, y, hi, s, ax, ay);
}

/** Jagged thorn crown across the head */
function thornCrown(ctx, x, y, w, s, ax, ay, ribbonSide = null) {
  rect(ctx, x, y + 1, w, 2, P.crown, s, ax, ay);
  for (let i = 0; i < Math.floor(w / 2); i++) {
    px(ctx, x + i * 2, y, P.crown, s, ax, ay);
  }
  if (ribbonSide === 'right') {
    rect(ctx, x + w - 1, y + 2, 1, 8, P.crown, s, ax, ay);
    px(ctx, x + w, y + 5, P.crown, s, ax, ay);
  }
}

export function drawPortrait(ctx, who, screenX, screenY, scale = 4, opts = {}) {
  const { angry, eyepatch, shortHair, drink } = opts;
  ctx.fillStyle = 'rgba(36, 30, 40, 0.6)';
  ctx.fillRect(screenX - 6, screenY - 6, 26 * scale + 12, 30 * scale + 12);

  if (who === 'alice') drawAlice(ctx, screenX, screenY, scale, { eyepatch, shortHair, bust: true });
  else if (who === 'mitzi') drawMitzi(ctx, screenX, screenY, scale, { bust: true });
  else if (who === 'victoria') drawVictoria(ctx, screenX, screenY, scale, { bust: true, drink });
  else if (who === 'hestia') drawHestia(ctx, screenX, screenY, scale, { bust: true, angry });
  else if (who === 'charon') drawCharon(ctx, screenX, screenY, scale, { bust: true });
}

export function drawSprite(ctx, who, screenX, screenY, scale = 3, opts = {}) {
  if (who === 'alice') drawAlice(ctx, screenX, screenY, scale, opts);
  else if (who === 'mitzi') drawMitzi(ctx, screenX, screenY, scale, opts);
  else if (who === 'victoria') drawVictoria(ctx, screenX, screenY, scale, opts);
  else if (who === 'hestia') drawHestia(ctx, screenX, screenY, scale, opts);
  else if (who === 'charon') drawCharon(ctx, screenX, screenY, scale, opts);
  else if (who === 'enemy') drawEnemy(ctx, screenX, screenY, scale, opts);
  else if (who === 'ox') drawWhiteOx(ctx, screenX, screenY, scale, opts);
}

/**
 * Victoria — dusty maroon, thorn crown, heart dress, vacant square eyes
 * Grid ~26×48 (matches ref)
 */
function drawVictoria(ctx, ax, ay, s, opts = {}) {
  const { bust, drink } = opts;
  // long hair back
  rect(ctx, 4, 4, 18, 20, P.victoriaHair, s, ax, ay);
  rect(ctx, 2, 8, 4, 16, P.victoriaHairDark, s, ax, ay);
  rect(ctx, 20, 8, 4, 16, P.victoriaHairDark, s, ax, ay);
  if (!bust) {
    rect(ctx, 2, 24, 4, 10, P.victoriaHairDark, s, ax, ay);
    rect(ctx, 20, 24, 4, 10, P.victoriaHairDark, s, ax, ay);
  }
  // face
  rect(ctx, 7, 8, 12, 11, P.victoriaSkin, s, ax, ay);
  // bangs
  rect(ctx, 7, 6, 12, 4, P.victoriaHair, s, ax, ay);
  // thorn crown + ribbon
  thornCrown(ctx, 6, 3, 14, s, ax, ay, 'right');
  // vacant square eyes 3×3 (~4×4 feel at small scale)
  vacantEyes(ctx, 9, 14, 11, 3, P.victoriaEye, P.victoriaEyeHi, s, ax, ay);
  // tiny nose hint only
  px(ctx, 12, 15, P.skinShade, s, ax, ay);

  if (bust) {
    rect(ctx, 8, 19, 10, 10, P.victoriaCloth, s, ax, ay);
    // heart
    rect(ctx, 9, 22, 2, 2, P.victoriaRose, s, ax, ay);
    if (drink) {
      rect(ctx, 19, 20, 3, 7, '#3a2030', s, ax, ay);
      rect(ctx, 19, 18, 3, 2, P.inkDim, s, ax, ay);
    }
    return;
  }

  // short sleeves + torso
  rect(ctx, 8, 19, 10, 8, P.victoriaCloth, s, ax, ay);
  rect(ctx, 6, 20, 2, 5, P.victoriaSkin, s, ax, ay);
  rect(ctx, 18, 20, 2, 5, P.victoriaSkin, s, ax, ay);
  // heart brooch (viewer left)
  rect(ctx, 9, 21, 2, 2, P.victoriaRose, s, ax, ay);
  px(ctx, 9, 23, P.victoriaRose, s, ax, ay);
  // ragged skirt
  rect(ctx, 7, 27, 12, 7, P.victoriaClothDark, s, ax, ay);
  px(ctx, 7, 34, P.victoriaClothDark, s, ax, ay);
  px(ctx, 10, 34, P.victoriaClothDark, s, ax, ay);
  px(ctx, 13, 34, P.victoriaClothDark, s, ax, ay);
  px(ctx, 16, 34, P.victoriaClothDark, s, ax, ay);
  // legs + shoes
  rect(ctx, 10, 35, 2, 8, P.victoriaSkin, s, ax, ay);
  rect(ctx, 14, 35, 2, 8, P.victoriaSkin, s, ax, ay);
  rect(ctx, 9, 43, 3, 2, P.shoe, s, ax, ay);
  rect(ctx, 14, 43, 3, 2, P.shoe, s, ax, ay);
}

/**
 * Mitzi — lavender buns + pigtails, glowing round eyes, gray shirt, jagged skirt
 * Grid ~32×52 (matches ref)
 */
function drawMitzi(ctx, ax, ay, s, opts = {}) {
  const { bust } = opts;
  // pigtail curls
  rect(ctx, 1, 10, 5, 14, P.mitziHair, s, ax, ay);
  rect(ctx, 22, 10, 5, 14, P.mitziHair, s, ax, ay);
  rect(ctx, 0, 18, 4, 8, P.mitziHairDark, s, ax, ay);
  rect(ctx, 24, 18, 4, 8, P.mitziHairDark, s, ax, ay);
  if (!bust) {
    rect(ctx, 0, 26, 4, 8, P.mitziHairDark, s, ax, ay);
    rect(ctx, 24, 26, 4, 8, P.mitziHairDark, s, ax, ay);
  }
  // head hair mass
  rect(ctx, 5, 6, 16, 12, P.mitziHair, s, ax, ay);
  // buns
  rect(ctx, 3, 2, 6, 5, P.mitziHair, s, ax, ay);
  rect(ctx, 17, 2, 6, 5, P.mitziHair, s, ax, ay);
  rect(ctx, 4, 1, 4, 2, P.mitziHairDark, s, ax, ay);
  rect(ctx, 18, 1, 4, 2, P.mitziHairDark, s, ax, ay);
  // face
  rect(ctx, 8, 9, 10, 9, P.mitziSkin, s, ax, ay);
  // bangs fringe
  rect(ctx, 8, 7, 10, 3, P.mitziHair, s, ax, ay);
  // spiky crown between buns
  thornCrown(ctx, 8, 4, 10, s, ax, ay, null);
  // large circular vacant eyes (3×3 roundish)
  vacantEyes(ctx, 9, 15, 11, 3, P.mitziEye, P.vacantEyeHi, s, ax, ay);

  if (bust) {
    rect(ctx, 8, 18, 10, 10, P.mitziCloth, s, ax, ay);
    rect(ctx, 9, 18, 8, 2, P.mitziCollar, s, ax, ay);
    rect(ctx, 11, 21, 1, 1, P.mitziAccent, s, ax, ay);
    rect(ctx, 14, 21, 1, 1, P.mitziAccent, s, ax, ay);
    return;
  }

  // long sleeves + shirt
  rect(ctx, 8, 18, 10, 10, P.mitziCloth, s, ax, ay);
  rect(ctx, 5, 19, 3, 8, P.mitziCloth, s, ax, ay);
  rect(ctx, 18, 19, 3, 8, P.mitziCloth, s, ax, ay);
  // peter pan collar
  rect(ctx, 9, 18, 8, 2, P.mitziCollar, s, ax, ay);
  px(ctx, 8, 19, P.mitziCollar, s, ax, ay);
  px(ctx, 17, 19, P.mitziCollar, s, ax, ay);
  // gold buttons
  rect(ctx, 11, 21, 1, 1, P.mitziAccent, s, ax, ay);
  rect(ctx, 14, 21, 1, 1, P.mitziAccent, s, ax, ay);
  rect(ctx, 12, 23, 1, 1, P.mitziAccent, s, ax, ay);
  // jagged lavender skirt
  rect(ctx, 7, 28, 12, 7, P.mitziSkirt, s, ax, ay);
  px(ctx, 7, 35, P.mitziSkirtDark, s, ax, ay);
  px(ctx, 10, 35, P.mitziSkirt, s, ax, ay);
  px(ctx, 13, 35, P.mitziSkirtDark, s, ax, ay);
  px(ctx, 16, 35, P.mitziSkirt, s, ax, ay);
  // pouch left hip
  rect(ctx, 5, 30, 3, 3, P.mitziPouch, s, ax, ay);
  // legs + white shoes
  rect(ctx, 10, 36, 2, 7, P.mitziSkin, s, ax, ay);
  rect(ctx, 14, 36, 2, 7, P.mitziSkin, s, ax, ay);
  rect(ctx, 9, 43, 3, 2, P.mitziShoe, s, ax, ay);
  rect(ctx, 14, 43, 3, 2, P.mitziShoe, s, ax, ay);
}

/**
 * Alice — dusty pink hair, frilly collar, vacant eyes, chibi body
 */
function drawAlice(ctx, ax, ay, s, opts = {}) {
  const { eyepatch, shortHair, bust } = opts;
  const hairH = shortHair ? 14 : 20;
  // hair
  rect(ctx, 4, 4, 18, hairH, P.aliceHair, s, ax, ay);
  rect(ctx, 2, 8, 4, shortHair ? 10 : 16, P.aliceHairDark, s, ax, ay);
  rect(ctx, 20, 8, 4, shortHair ? 10 : 16, P.aliceHairDark, s, ax, ay);
  if (!bust && !shortHair) {
    rect(ctx, 2, 24, 4, 8, P.aliceHairDark, s, ax, ay);
    rect(ctx, 20, 24, 4, 8, P.aliceHairDark, s, ax, ay);
  }
  // face
  rect(ctx, 7, 8, 12, 11, P.aliceSkin, s, ax, ay);
  rect(ctx, 7, 6, 12, 4, P.aliceHair, s, ax, ay);
  // soft headband / bow
  rect(ctx, 6, 4, 14, 2, P.aliceCollar, s, ax, ay);
  rect(ctx, 18, 3, 5, 4, P.aliceCollar, s, ax, ay);
  // eyes
  if (eyepatch) {
    rect(ctx, 8, 11, 4, 3, P.crown, s, ax, ay);
    rect(ctx, 14, 11, 3, 3, P.aliceEye, s, ax, ay);
    px(ctx, 14, 11, P.vacantEyeHi, s, ax, ay);
  } else {
    vacantEyes(ctx, 9, 14, 11, 3, P.aliceEye, P.vacantEyeHi, s, ax, ay);
  }
  px(ctx, 12, 15, P.skinShade, s, ax, ay);

  if (bust) {
    rect(ctx, 8, 19, 10, 10, P.aliceCloth, s, ax, ay);
    rect(ctx, 10, 19, 6, 2, P.aliceCollar, s, ax, ay);
    rect(ctx, 12, 22, 2, 2, P.aliceAccent, s, ax, ay);
    return;
  }

  rect(ctx, 8, 19, 10, 9, P.aliceCloth, s, ax, ay);
  rect(ctx, 6, 20, 2, 5, P.aliceSkin, s, ax, ay);
  rect(ctx, 18, 20, 2, 5, P.aliceSkin, s, ax, ay);
  rect(ctx, 10, 19, 6, 2, P.aliceCollar, s, ax, ay);
  rect(ctx, 12, 22, 2, 2, P.aliceAccent, s, ax, ay);
  // skirt
  rect(ctx, 7, 28, 12, 7, P.aliceAccent, s, ax, ay);
  px(ctx, 7, 35, P.aliceAccent, s, ax, ay);
  px(ctx, 16, 35, P.aliceAccent, s, ax, ay);
  rect(ctx, 10, 35, 2, 8, P.aliceSkinShade, s, ax, ay);
  rect(ctx, 14, 35, 2, 8, P.aliceSkinShade, s, ax, ay);
  rect(ctx, 9, 43, 3, 2, P.shoe, s, ax, ay);
  rect(ctx, 14, 43, 3, 2, P.shoe, s, ax, ay);
  // pocket watch hint
  rect(ctx, 20, 24, 2, 2, P.gold, s, ax, ay);
}

/**
 * Hestia — pale hair, frilly white habit, vacant or angry eyes
 */
function drawHestia(ctx, ax, ay, s, opts = {}) {
  const { bust, angry } = opts;
  rect(ctx, 4, 4, 18, 20, P.hestiaHair, s, ax, ay);
  rect(ctx, 2, 8, 4, 16, P.hestiaHairDark, s, ax, ay);
  rect(ctx, 20, 8, 4, 16, P.hestiaHairDark, s, ax, ay);
  if (!bust) {
    rect(ctx, 2, 24, 4, 8, P.hestiaHairDark, s, ax, ay);
    rect(ctx, 20, 24, 4, 8, P.hestiaHairDark, s, ax, ay);
  }
  rect(ctx, 7, 8, 12, 11, P.hestiaSkin, s, ax, ay);
  rect(ctx, 7, 6, 12, 4, P.hestiaHair, s, ax, ay);
  // frilly headpiece
  rect(ctx, 5, 3, 16, 3, P.hestiaCloth, s, ax, ay);
  rect(ctx, 18, 2, 6, 5, P.white, s, ax, ay);
  const eye = angry ? P.hestiaEyeAngry : P.hestiaEye;
  const hi = angry ? '#d08080' : P.vacantEyeHi;
  vacantEyes(ctx, 9, 14, 11, 3, eye, hi, s, ax, ay);
  px(ctx, 12, 15, P.skinShade, s, ax, ay);

  if (bust) {
    rect(ctx, 7, 19, 12, 10, P.hestiaCloth, s, ax, ay);
    rect(ctx, 10, 19, 6, 2, P.white, s, ax, ay);
    rect(ctx, 12, 22, 2, 2, P.hestiaGold, s, ax, ay);
    return;
  }

  rect(ctx, 8, 19, 10, 10, P.hestiaCloth, s, ax, ay);
  rect(ctx, 5, 20, 3, 6, P.hestiaClothShade, s, ax, ay);
  rect(ctx, 18, 20, 3, 6, P.hestiaClothShade, s, ax, ay);
  rect(ctx, 10, 19, 6, 2, P.white, s, ax, ay);
  rect(ctx, 12, 22, 2, 2, P.hestiaGold, s, ax, ay);
  rect(ctx, 7, 29, 12, 7, P.hestiaClothShade, s, ax, ay);
  px(ctx, 7, 36, P.hestiaClothShade, s, ax, ay);
  px(ctx, 16, 36, P.hestiaClothShade, s, ax, ay);
  rect(ctx, 10, 36, 2, 7, P.hestiaSkin, s, ax, ay);
  rect(ctx, 14, 36, 2, 7, P.hestiaSkin, s, ax, ay);
  rect(ctx, 9, 43, 3, 2, P.shoe, s, ax, ay);
  rect(ctx, 14, 43, 3, 2, P.shoe, s, ax, ay);
}

/**
 * Charon — brown hair, dark coat, coin, vacant eyes
 */
function drawCharon(ctx, ax, ay, s, opts = {}) {
  const { bust } = opts;
  rect(ctx, 5, 4, 16, 16, P.charonHair, s, ax, ay);
  rect(ctx, 3, 8, 4, 12, P.charonHairDark, s, ax, ay);
  rect(ctx, 19, 8, 4, 12, P.charonHairDark, s, ax, ay);
  rect(ctx, 7, 8, 12, 11, P.charonSkin, s, ax, ay);
  rect(ctx, 7, 6, 12, 3, P.charonHair, s, ax, ay);
  vacantEyes(ctx, 9, 14, 11, 3, P.charonEye, P.vacantEyeHi, s, ax, ay);
  px(ctx, 12, 15, P.skinShade, s, ax, ay);

  if (bust) {
    rect(ctx, 8, 19, 10, 10, P.charonCloth, s, ax, ay);
    rect(ctx, 12, 21, 2, 2, P.gold, s, ax, ay);
    return;
  }

  rect(ctx, 8, 19, 10, 12, P.charonCloth, s, ax, ay);
  rect(ctx, 6, 20, 2, 6, P.charonSkin, s, ax, ay);
  rect(ctx, 18, 20, 2, 6, P.charonSkin, s, ax, ay);
  rect(ctx, 12, 21, 2, 2, P.gold, s, ax, ay);
  rect(ctx, 7, 31, 12, 5, P.charonCloth, s, ax, ay);
  rect(ctx, 10, 36, 2, 7, P.charonSkin, s, ax, ay);
  rect(ctx, 14, 36, 2, 7, P.charonSkin, s, ax, ay);
  rect(ctx, 9, 43, 3, 2, P.shoe, s, ax, ay);
  rect(ctx, 14, 43, 3, 2, P.shoe, s, ax, ay);
}

export function drawEnemy(ctx, ax, ay, s, opts = {}) {
  const { eye, shape, limbs, identified, element } = opts;
  const body = identified ? enemyColor(element) : '#2a2838';
  const shade = identified ? '#0c0a10' : '#121018';
  const eyeC = identified ? eyeColor(eye) : '#3a3848';

  if (shape === 'triangle') {
    for (let i = 0; i < 12; i++) {
      rect(ctx, 12 - i, 8 + i, i * 2 + 2, 1, body, s, ax, ay);
    }
  } else if (shape === 'square') {
    rect(ctx, 4, 8, 16, 16, body, s, ax, ay);
  } else {
    rect(ctx, 6, 8, 12, 14, body, s, ax, ay);
    rect(ctx, 4, 11, 16, 8, body, s, ax, ay);
  }
  // vacant shadowed eyes until ID
  rect(ctx, 8, 12, 3, 3, eyeC, s, ax, ay);
  rect(ctx, 13, 12, 3, 3, eyeC, s, ax, ay);
  if (!identified) {
    rect(ctx, 8, 12, 3, 3, shade, s, ax, ay);
    rect(ctx, 13, 12, 3, 3, shade, s, ax, ay);
  } else {
    px(ctx, 8, 12, P.vacantEyeHi, s, ax, ay);
    px(ctx, 13, 12, P.vacantEyeHi, s, ax, ay);
  }
  const n = limbs || 2;
  for (let i = 0; i < Math.min(n, 6); i++) {
    rect(ctx, 4 + (i % 3) * 5, 24 + Math.floor(i / 3) * 6, 2, 6, body, s, ax, ay);
  }
}

function drawWhiteOx(ctx, ax, ay, s, opts = {}) {
  const openEyes = opts.openEyes;
  rect(ctx, 4, 10, 28, 18, P.hestiaCloth, s, ax, ay);
  rect(ctx, 2, 14, 4, 10, P.hestiaClothShade, s, ax, ay);
  rect(ctx, 30, 14, 4, 10, P.hestiaClothShade, s, ax, ay);
  rect(ctx, 10, 2, 16, 12, P.bone, s, ax, ay);
  rect(ctx, 6, 0, 4, 8, P.inkDim, s, ax, ay);
  rect(ctx, 26, 0, 4, 8, P.inkDim, s, ax, ay);
  if (openEyes) {
    rect(ctx, 13, 6, 3, 3, P.hestiaEyeAngry, s, ax, ay);
    rect(ctx, 20, 6, 3, 3, P.hestiaEyeAngry, s, ax, ay);
    px(ctx, 13, 6, '#d08080', s, ax, ay);
    px(ctx, 20, 6, '#d08080', s, ax, ay);
  } else {
    rect(ctx, 13, 7, 3, 1, P.inkFaint, s, ax, ay);
    rect(ctx, 20, 7, 3, 1, P.inkFaint, s, ax, ay);
  }
  rect(ctx, 0, 16, 6, 4, P.white, s, ax, ay);
  rect(ctx, 30, 16, 6, 4, P.white, s, ax, ay);
  rect(ctx, 16, 22, 4, 4, P.hestiaGold, s, ax, ay);
}

function eyeColor(eye) {
  return ({ green: '#3a6840', red: '#803030', blue: '#305070', yellow: '#8a7840' })[eye] || '#505060';
}

function enemyColor(el) {
  return ({ fire: '#5a3028', water: '#283848', earth: '#384028', electric: '#484028' })[el] || '#2a2830';
}

export function drawBackground(ctx, scene, w, h, t = 0) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  if (scene === 'title' || scene === 'town') {
    g.addColorStop(0, '#141018');
    g.addColorStop(1, '#0a080c');
  } else if (scene === 'woods') {
    g.addColorStop(0, P.woodsFar);
    g.addColorStop(1, P.woods);
  } else if (scene === 'volcano') {
    g.addColorStop(0, P.volcano);
    g.addColorStop(1, P.volcanoGlow);
  } else if (scene === 'fort') {
    g.addColorStop(0, '#14161a');
    g.addColorStop(1, P.fort);
  } else if (scene === 'ruins') {
    g.addColorStop(0, '#161218');
    g.addColorStop(1, P.ruins);
  } else if (scene === 'manor') {
    g.addColorStop(0, '#120e16');
    g.addColorStop(1, P.manor);
  } else {
    g.addColorStop(0, P.bg);
    g.addColorStop(1, P.void);
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  if (scene === 'woods') {
    for (let i = 0; i < 12; i++) {
      ctx.fillStyle = i % 2 ? '#0e140c' : '#121a10';
      const x = (i * 83 + Math.sin(t * 0.001 + i) * 4) % w;
      ctx.fillRect(x, 40, 18, h - 80);
    }
  }
  if (scene === 'volcano') {
    ctx.fillStyle = `rgba(120,40,20,${0.08 + Math.sin(t * 0.003) * 0.04})`;
    ctx.fillRect(0, h * 0.55, w, h * 0.45);
  }
  if (scene === 'town') {
    ctx.fillStyle = '#0e0c12';
    ctx.fillRect(40, 200, 60, 120);
    ctx.fillRect(120, 170, 40, 150);
    ctx.fillRect(200, 190, 80, 130);
    ctx.fillRect(700, 180, 50, 140);
    ctx.fillRect(780, 160, 70, 160);
    ctx.fillRect(860, 200, 40, 120);
    ctx.fillStyle = '#1a1820';
    ctx.fillRect(420, 280, 80, 40);
  }
}
