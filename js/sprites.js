import { P } from './palette.js';

/** Tiny canvas pixel helpers */
export function px(ctx, x, y, c, s = 1) {
  ctx.fillStyle = c;
  ctx.fillRect(x * s, y * s, s, s);
}

export function rect(ctx, x, y, w, h, c, s = 1) {
  ctx.fillStyle = c;
  ctx.fillRect(x * s, y * s, w * s, h * s);
}

/** Draw character bust portrait (for dialog) */
export function drawPortrait(ctx, who, ox, oy, scale = 4, opts = {}) {
  const angry = opts.angry;
  const eyepatch = opts.eyepatch;
  const shortHair = opts.shortHair;
  const drink = opts.drink;

  if (who === 'alice') drawAlice(ctx, ox, oy, scale, { eyepatch, shortHair, bust: true });
  else if (who === 'mitzi') drawMitzi(ctx, ox, oy, scale, { bust: true });
  else if (who === 'victoria') drawVictoria(ctx, ox, oy, scale, { bust: true, drink });
  else if (who === 'hestia') drawHestia(ctx, ox, oy, scale, { bust: true, angry });
  else if (who === 'charon') drawCharon(ctx, ox, oy, scale, { bust: true });
}

/** Full-body combat sprites ~32x48 logical pixels */
export function drawSprite(ctx, who, ox, oy, scale = 3, opts = {}) {
  if (who === 'alice') drawAlice(ctx, ox, oy, scale, opts);
  else if (who === 'mitzi') drawMitzi(ctx, ox, oy, scale, opts);
  else if (who === 'victoria') drawVictoria(ctx, ox, oy, scale, opts);
  else if (who === 'hestia') drawHestia(ctx, ox, oy, scale, opts);
  else if (who === 'charon') drawCharon(ctx, ox, oy, scale, opts);
  else if (who === 'enemy') drawEnemy(ctx, ox, oy, scale, opts);
  else if (who === 'ox') drawWhiteOx(ctx, ox, oy, scale, opts);
}

function drawAlice(ctx, ox, oy, s, opts = {}) {
  const { eyepatch, shortHair, bust } = opts;
  const h = shortHair ? P.aliceHair : P.aliceHair;
  // hair back
  rect(ctx, ox + 4, oy + 2, 16, shortHair ? 14 : 22, h, s);
  rect(ctx, ox + 2, oy + 6, 4, shortHair ? 10 : 18, P.aliceHairDark, s);
  rect(ctx, ox + 18, oy + 6, 4, shortHair ? 10 : 18, P.aliceHairDark, s);
  // headband
  rect(ctx, ox + 5, oy + 4, 14, 3, P.aliceCloth, s);
  rect(ctx, ox + 16, oy + 3, 5, 4, P.white, s);
  // face
  rect(ctx, ox + 7, oy + 7, 10, 10, P.aliceSkin, s);
  // bangs
  rect(ctx, ox + 7, oy + 6, 10, 3, h, s);
  // eyes
  rect(ctx, ox + 9, oy + 10, 2, 2, eyepatch ? P.inkFaint : P.aliceEye, s);
  rect(ctx, ox + 14, oy + 10, 2, 2, P.aliceEye, s);
  if (eyepatch) rect(ctx, ox + 8, oy + 9, 4, 3, P.inkFaint, s);
  // blush
  rect(ctx, ox + 8, oy + 13, 2, 1, '#a87878', s);
  rect(ctx, ox + 15, oy + 13, 2, 1, '#a87878', s);
  // mouth
  rect(ctx, ox + 11, oy + 14, 3, 1, '#906868', s);
  if (bust) {
    // collar
    rect(ctx, ox + 6, oy + 17, 12, 10, P.aliceCloth, s);
    rect(ctx, ox + 10, oy + 17, 4, 3, P.white, s);
    rect(ctx, ox + 11, oy + 20, 2, 2, P.aliceAccent, s);
    return;
  }
  // body
  rect(ctx, ox + 7, oy + 17, 10, 12, P.aliceCloth, s);
  rect(ctx, ox + 10, oy + 17, 4, 2, P.white, s);
  rect(ctx, ox + 5, oy + 18, 3, 6, P.aliceCloth, s);
  rect(ctx, ox + 16, oy + 18, 3, 6, P.aliceCloth, s);
  // skirt
  rect(ctx, ox + 6, oy + 28, 12, 8, P.aliceAccent, s);
  // legs
  rect(ctx, ox + 9, oy + 36, 3, 8, P.aliceSkinShade, s);
  rect(ctx, ox + 13, oy + 36, 3, 8, P.aliceSkinShade, s);
  rect(ctx, ox + 8, oy + 43, 4, 2, P.inkFaint, s);
  rect(ctx, ox + 13, oy + 43, 4, 2, P.inkFaint, s);
  // pocket watch wand hint
  rect(ctx, ox + 19, oy + 22, 2, 10, P.gold, s);
  rect(ctx, ox + 18, oy + 20, 4, 3, P.gold, s);
}

function drawMitzi(ctx, ox, oy, s, opts = {}) {
  const { bust } = opts;
  // hair buns + curls
  rect(ctx, ox + 3, oy + 2, 5, 5, P.mitziHair, s);
  rect(ctx, ox + 16, oy + 2, 5, 5, P.mitziHair, s);
  rect(ctx, ox + 4, oy + 6, 16, 16, P.mitziHair, s);
  rect(ctx, ox + 2, oy + 10, 4, 14, P.mitziHairDark, s);
  rect(ctx, ox + 18, oy + 10, 4, 14, P.mitziHairDark, s);
  // jagged headband
  rect(ctx, ox + 7, oy + 4, 10, 2, P.inkFaint, s);
  px(ctx, ox + 8, oy + 3, P.inkFaint, s);
  px(ctx, ox + 11, oy + 3, P.inkFaint, s);
  px(ctx, ox + 14, oy + 3, P.inkFaint, s);
  // face
  rect(ctx, ox + 8, oy + 8, 8, 8, P.mitziSkin, s);
  // vacant pale eyes
  rect(ctx, ox + 9, oy + 10, 2, 2, P.mitziEye, s);
  rect(ctx, ox + 13, oy + 10, 2, 2, P.mitziEye, s);
  if (bust) {
    rect(ctx, ox + 7, oy + 16, 10, 10, P.mitziCloth, s);
    rect(ctx, ox + 9, oy + 16, 6, 2, P.white, s);
    rect(ctx, ox + 10, oy + 19, 1, 1, P.mitziAccent, s);
    rect(ctx, ox + 13, oy + 19, 1, 1, P.mitziAccent, s);
    return;
  }
  // shirt
  rect(ctx, ox + 8, oy + 16, 8, 10, P.mitziCloth, s);
  rect(ctx, ox + 9, oy + 16, 6, 2, P.white, s);
  rect(ctx, ox + 10, oy + 19, 1, 1, P.mitziAccent, s);
  rect(ctx, ox + 13, oy + 19, 1, 1, P.mitziAccent, s);
  // jagged skirt
  rect(ctx, ox + 7, oy + 26, 10, 8, P.mitziSkirt, s);
  px(ctx, ox + 7, oy + 34, P.mitziSkirt, s);
  px(ctx, ox + 10, oy + 34, P.mitziSkirt, s);
  px(ctx, ox + 13, oy + 34, P.mitziSkirt, s);
  px(ctx, ox + 16, oy + 34, P.mitziSkirt, s);
  // pouch
  rect(ctx, ox + 5, oy + 28, 3, 3, '#483850', s);
  // legs
  rect(ctx, ox + 9, oy + 35, 3, 7, P.mitziSkin, s);
  rect(ctx, ox + 13, oy + 35, 3, 7, P.mitziSkin, s);
  rect(ctx, ox + 9, oy + 41, 3, 2, P.white, s);
  rect(ctx, ox + 13, oy + 41, 3, 2, P.white, s);
  // hammer
  rect(ctx, ox + 19, oy + 20, 3, 3, P.inkDim, s);
  rect(ctx, ox + 20, oy + 23, 1, 10, P.charonAccent, s);
}

function drawVictoria(ctx, ox, oy, s, opts = {}) {
  const { bust, drink } = opts;
  // long hair
  rect(ctx, ox + 4, oy + 2, 16, 22, P.victoriaHair, s);
  rect(ctx, ox + 2, oy + 8, 4, 16, P.victoriaHairDark, s);
  rect(ctx, ox + 18, oy + 8, 4, 16, P.victoriaHairDark, s);
  // headband + rose
  rect(ctx, ox + 6, oy + 4, 12, 2, P.inkFaint, s);
  rect(ctx, ox + 15, oy + 3, 3, 3, P.victoriaRose, s);
  // face
  rect(ctx, ox + 8, oy + 7, 8, 9, P.victoriaSkin, s);
  rect(ctx, ox + 8, oy + 6, 8, 2, P.victoriaHair, s);
  // eyes grey-brown
  rect(ctx, ox + 9, oy + 10, 2, 2, P.victoriaEye, s);
  rect(ctx, ox + 13, oy + 10, 2, 2, P.victoriaEye, s);
  // subtle smile
  rect(ctx, ox + 11, oy + 14, 2, 1, '#806060', s);
  if (bust) {
    rect(ctx, ox + 7, oy + 16, 10, 12, P.victoriaCloth, s);
    rect(ctx, ox + 9, oy + 20, 2, 2, P.victoriaRose, s);
    rect(ctx, ox + 12, oy + 20, 2, 2, P.victoriaRose, s);
    if (drink) {
      rect(ctx, ox + 18, oy + 18, 3, 8, '#3a2030', s);
      rect(ctx, ox + 18, oy + 16, 3, 2, P.inkDim, s);
    }
    return;
  }
  // black shirt cold shoulder
  rect(ctx, ox + 8, oy + 16, 8, 12, P.victoriaCloth, s);
  rect(ctx, ox + 9, oy + 20, 2, 2, P.victoriaRose, s);
  rect(ctx, ox + 12, oy + 20, 2, 2, P.victoriaRose, s);
  // dress hem jagged
  rect(ctx, ox + 7, oy + 28, 10, 8, '#1a181c', s);
  // legs
  rect(ctx, ox + 9, oy + 36, 3, 7, P.victoriaSkin, s);
  rect(ctx, ox + 13, oy + 36, 3, 7, P.victoriaSkin, s);
  rect(ctx, ox + 9, oy + 42, 3, 2, P.inkFaint, s);
  rect(ctx, ox + 13, oy + 42, 3, 2, P.inkFaint, s);
  // spear
  rect(ctx, ox + 20, oy + 10, 1, 28, P.inkDim, s);
  rect(ctx, ox + 19, oy + 8, 3, 3, P.bone, s);
}

function drawHestia(ctx, ox, oy, s, opts = {}) {
  const { bust, angry } = opts;
  // pink-to-white frilly look dimmed to bone
  rect(ctx, ox + 3, oy + 4, 18, 20, P.hestiaHair, s);
  rect(ctx, ox + 2, oy + 8, 4, 16, P.hestiaHairDark, s);
  rect(ctx, ox + 18, oy + 8, 4, 16, P.hestiaHairDark, s);
  // frilly headband + bow
  rect(ctx, ox + 5, oy + 3, 14, 3, P.hestiaCloth, s);
  rect(ctx, ox + 16, oy + 2, 6, 5, P.white, s);
  // face
  rect(ctx, ox + 8, oy + 7, 8, 9, P.hestiaSkin, s);
  rect(ctx, ox + 8, oy + 6, 8, 2, P.hestiaHair, s);
  const eye = angry ? P.hestiaEyeAngry : P.hestiaEye;
  rect(ctx, ox + 9, oy + 10, 2, 2, eye, s);
  rect(ctx, ox + 13, oy + 10, 2, 2, eye, s);
  rect(ctx, ox + 8, oy + 13, 2, 1, '#c89898', s);
  rect(ctx, ox + 14, oy + 13, 2, 1, '#c89898', s);
  rect(ctx, ox + 11, oy + 14, 2, 1, '#a07070', s);
  if (bust) {
    rect(ctx, ox + 6, oy + 16, 12, 12, P.hestiaCloth, s);
    rect(ctx, ox + 10, oy + 16, 4, 3, P.white, s);
    rect(ctx, ox + 11, oy + 20, 2, 2, P.hestiaGold, s);
    return;
  }
  rect(ctx, ox + 7, oy + 16, 10, 14, P.hestiaCloth, s);
  rect(ctx, ox + 10, oy + 16, 4, 2, P.white, s);
  rect(ctx, ox + 11, oy + 19, 2, 2, P.hestiaGold, s);
  rect(ctx, ox + 5, oy + 18, 3, 6, P.hestiaClothShade, s);
  rect(ctx, ox + 16, oy + 18, 3, 6, P.hestiaClothShade, s);
  rect(ctx, ox + 6, oy + 30, 12, 8, P.hestiaClothShade, s);
  rect(ctx, ox + 9, oy + 38, 3, 6, P.hestiaSkin, s);
  rect(ctx, ox + 13, oy + 38, 3, 6, P.hestiaSkin, s);
  rect(ctx, ox + 9, oy + 43, 3, 2, P.inkFaint, s);
  rect(ctx, ox + 13, oy + 43, 3, 2, P.inkFaint, s);
}

function drawCharon(ctx, ox, oy, s, opts = {}) {
  const { bust } = opts;
  rect(ctx, ox + 5, oy + 3, 14, 16, P.charonHair, s);
  rect(ctx, ox + 3, oy + 8, 4, 12, P.charonHairDark, s);
  rect(ctx, ox + 17, oy + 8, 4, 12, P.charonHairDark, s);
  rect(ctx, ox + 8, oy + 7, 8, 9, P.charonSkin, s);
  rect(ctx, ox + 9, oy + 10, 2, 2, '#605040', s);
  rect(ctx, ox + 13, oy + 10, 2, 2, '#605040', s);
  rect(ctx, ox + 11, oy + 14, 2, 1, '#705040', s);
  // coin on collar
  if (bust) {
    rect(ctx, ox + 7, oy + 16, 10, 12, P.charonCloth, s);
    rect(ctx, ox + 11, oy + 18, 2, 2, P.gold, s);
    return;
  }
  rect(ctx, ox + 7, oy + 16, 10, 16, P.charonCloth, s);
  rect(ctx, ox + 11, oy + 18, 2, 2, P.gold, s);
  rect(ctx, ox + 9, oy + 32, 3, 10, P.charonSkin, s);
  rect(ctx, ox + 13, oy + 32, 3, 10, P.charonSkin, s);
  rect(ctx, ox + 9, oy + 41, 3, 2, P.inkFaint, s);
  rect(ctx, ox + 13, oy + 41, 3, 2, P.inkFaint, s);
}

/** Shadowed enemy until identified — shape encodes body */
export function drawEnemy(ctx, ox, oy, s, opts = {}) {
  const { eye, shape, limbs, identified, element, tint } = opts;
  const body = identified ? (tint || enemyColor(element)) : '#1a1820';
  const shade = identified ? '#0c0a10' : '#0e0c12';
  const eyeC = identified ? eyeColor(eye) : '#2a2830';

  // body by shape
  if (shape === 'triangle') {
    for (let i = 0; i < 12; i++) {
      rect(ctx, ox + 12 - i, oy + 8 + i, i * 2 + 2, 1, body, s);
    }
  } else if (shape === 'square') {
    rect(ctx, ox + 4, oy + 8, 16, 16, body, s);
  } else {
    // circle-ish
    rect(ctx, ox + 6, oy + 8, 12, 14, body, s);
    rect(ctx, ox + 4, oy + 11, 16, 8, body, s);
  }
  // eyes
  rect(ctx, ox + 8, oy + 12, 3, 3, eyeC, s);
  rect(ctx, ox + 13, oy + 12, 3, 3, eyeC, s);
  if (!identified) {
    rect(ctx, ox + 8, oy + 12, 3, 3, shade, s);
    rect(ctx, ox + 13, oy + 12, 3, 3, shade, s);
  }
  // limbs
  const n = limbs || 2;
  for (let i = 0; i < Math.min(n, 6); i++) {
    const lx = ox + 4 + (i % 3) * 5;
    const ly = oy + 24 + Math.floor(i / 3) * 6;
    rect(ctx, lx, ly, 2, 6, body, s);
  }
}

function drawWhiteOx(ctx, ox, oy, s, opts = {}) {
  const openEyes = opts.openEyes;
  // body
  rect(ctx, ox + 4, oy + 10, 28, 18, P.hestiaCloth, s);
  rect(ctx, ox + 2, oy + 14, 4, 10, P.hestiaClothShade, s);
  rect(ctx, ox + 30, oy + 14, 4, 10, P.hestiaClothShade, s);
  // head
  rect(ctx, ox + 10, oy + 2, 16, 12, P.bone, s);
  // horns
  rect(ctx, ox + 6, oy + 0, 4, 8, P.inkDim, s);
  rect(ctx, ox + 26, oy + 0, 4, 8, P.inkDim, s);
  // eyes — closed until ending
  if (openEyes) {
    rect(ctx, ox + 13, oy + 6, 3, 3, P.hestiaEyeAngry, s);
    rect(ctx, ox + 20, oy + 6, 3, 3, P.hestiaEyeAngry, s);
  } else {
    rect(ctx, ox + 13, oy + 7, 3, 1, P.inkFaint, s);
    rect(ctx, ox + 20, oy + 7, 3, 1, P.inkFaint, s);
  }
  // wings hint
  rect(ctx, ox + 0, oy + 16, 6, 4, P.white, s);
  rect(ctx, ox + 30, oy + 16, 6, 4, P.white, s);
  // bells
  rect(ctx, ox + 16, oy + 22, 4, 4, P.hestiaGold, s);
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

  // subtle vignette / atmosphere
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
    // distant buildings silhouette
    ctx.fillStyle = '#0e0c12';
    ctx.fillRect(40, 200, 60, 120);
    ctx.fillRect(120, 170, 40, 150);
    ctx.fillRect(200, 190, 80, 130);
    ctx.fillRect(700, 180, 50, 140);
    ctx.fillRect(780, 160, 70, 160);
    ctx.fillRect(860, 200, 40, 120);
    // milk cart hint
    ctx.fillStyle = '#1a1820';
    ctx.fillRect(420, 280, 80, 40);
  }
}
