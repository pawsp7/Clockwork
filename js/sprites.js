import { P } from './palette.js';

/** Grid cell helpers — ax/ay are screen-pixel anchors */
export function px(ctx, x, y, c, s = 1, ax = 0, ay = 0) {
  ctx.fillStyle = c;
  ctx.fillRect(ax + x * s, ay + y * s, s, s);
}

export function rect(ctx, x, y, w, h, c, s = 1, ax = 0, ay = 0) {
  ctx.fillStyle = c;
  ctx.fillRect(ax + x * s, ay + y * s, w * s, h * s);
}

/** Bust portrait — screenX/screenY are pixel anchors */
export function drawPortrait(ctx, who, screenX, screenY, scale = 4, opts = {}) {
  const { angry, eyepatch, shortHair, drink } = opts;
  ctx.fillStyle = 'rgba(40, 34, 44, 0.55)';
  ctx.fillRect(screenX - 8, screenY - 8, 28 * scale + 16, 32 * scale + 16);

  if (who === 'alice') drawAlice(ctx, screenX, screenY, scale, { eyepatch, shortHair, bust: true });
  else if (who === 'mitzi') drawMitzi(ctx, screenX, screenY, scale, { bust: true });
  else if (who === 'victoria') drawVictoria(ctx, screenX, screenY, scale, { bust: true, drink });
  else if (who === 'hestia') drawHestia(ctx, screenX, screenY, scale, { bust: true, angry });
  else if (who === 'charon') drawCharon(ctx, screenX, screenY, scale, { bust: true });
}

/** Full-body sprite — screen pixel anchors */
export function drawSprite(ctx, who, screenX, screenY, scale = 3, opts = {}) {
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  ctx.fillRect(screenX + 4, screenY + 44 * scale, 20 * scale, 4 * scale);

  if (who === 'alice') drawAlice(ctx, screenX, screenY, scale, opts);
  else if (who === 'mitzi') drawMitzi(ctx, screenX, screenY, scale, opts);
  else if (who === 'victoria') drawVictoria(ctx, screenX, screenY, scale, opts);
  else if (who === 'hestia') drawHestia(ctx, screenX, screenY, scale, opts);
  else if (who === 'charon') drawCharon(ctx, screenX, screenY, scale, opts);
  else if (who === 'enemy') drawEnemy(ctx, screenX, screenY, scale, opts);
  else if (who === 'ox') drawWhiteOx(ctx, screenX, screenY, scale, opts);
}

function drawAlice(ctx, ax, ay, s, opts = {}) {
  const { eyepatch, shortHair, bust } = opts;
  const h = P.aliceHair;
  rect(ctx, 4, 2, 16, shortHair ? 14 : 22, h, s, ax, ay);
  rect(ctx, 2, 6, 4, shortHair ? 10 : 18, P.aliceHairDark, s, ax, ay);
  rect(ctx, 18, 6, 4, shortHair ? 10 : 18, P.aliceHairDark, s, ax, ay);
  rect(ctx, 5, 4, 14, 3, P.aliceCloth, s, ax, ay);
  rect(ctx, 16, 3, 5, 4, P.white, s, ax, ay);
  rect(ctx, 7, 7, 10, 10, P.aliceSkin, s, ax, ay);
  rect(ctx, 7, 6, 10, 3, h, s, ax, ay);
  rect(ctx, 9, 10, 2, 2, eyepatch ? P.inkFaint : P.aliceEye, s, ax, ay);
  rect(ctx, 14, 10, 2, 2, P.aliceEye, s, ax, ay);
  if (eyepatch) rect(ctx, 8, 9, 4, 3, P.inkFaint, s, ax, ay);
  rect(ctx, 8, 13, 2, 1, '#a87878', s, ax, ay);
  rect(ctx, 15, 13, 2, 1, '#a87878', s, ax, ay);
  rect(ctx, 11, 14, 3, 1, '#906868', s, ax, ay);
  if (bust) {
    rect(ctx, 6, 17, 12, 10, P.aliceCloth, s, ax, ay);
    rect(ctx, 10, 17, 4, 3, P.white, s, ax, ay);
    rect(ctx, 11, 20, 2, 2, P.aliceAccent, s, ax, ay);
    return;
  }
  rect(ctx, 7, 17, 10, 12, P.aliceCloth, s, ax, ay);
  rect(ctx, 10, 17, 4, 2, P.white, s, ax, ay);
  rect(ctx, 5, 18, 3, 6, P.aliceCloth, s, ax, ay);
  rect(ctx, 16, 18, 3, 6, P.aliceCloth, s, ax, ay);
  rect(ctx, 6, 28, 12, 8, P.aliceAccent, s, ax, ay);
  rect(ctx, 9, 36, 3, 8, P.aliceSkinShade, s, ax, ay);
  rect(ctx, 13, 36, 3, 8, P.aliceSkinShade, s, ax, ay);
  rect(ctx, 8, 43, 4, 2, P.inkFaint, s, ax, ay);
  rect(ctx, 13, 43, 4, 2, P.inkFaint, s, ax, ay);
  rect(ctx, 19, 22, 2, 10, P.gold, s, ax, ay);
  rect(ctx, 18, 20, 4, 3, P.gold, s, ax, ay);
}

function drawMitzi(ctx, ax, ay, s, opts = {}) {
  const { bust } = opts;
  rect(ctx, 3, 2, 5, 5, P.mitziHair, s, ax, ay);
  rect(ctx, 16, 2, 5, 5, P.mitziHair, s, ax, ay);
  rect(ctx, 4, 6, 16, 16, P.mitziHair, s, ax, ay);
  rect(ctx, 2, 10, 4, 14, P.mitziHairDark, s, ax, ay);
  rect(ctx, 18, 10, 4, 14, P.mitziHairDark, s, ax, ay);
  rect(ctx, 7, 4, 10, 2, P.inkFaint, s, ax, ay);
  px(ctx, 8, 3, P.inkFaint, s, ax, ay);
  px(ctx, 11, 3, P.inkFaint, s, ax, ay);
  px(ctx, 14, 3, P.inkFaint, s, ax, ay);
  rect(ctx, 8, 8, 8, 8, P.mitziSkin, s, ax, ay);
  rect(ctx, 9, 10, 2, 2, P.mitziEye, s, ax, ay);
  rect(ctx, 13, 10, 2, 2, P.mitziEye, s, ax, ay);
  if (bust) {
    rect(ctx, 7, 16, 10, 10, P.mitziCloth, s, ax, ay);
    rect(ctx, 9, 16, 6, 2, P.white, s, ax, ay);
    rect(ctx, 10, 19, 1, 1, P.mitziAccent, s, ax, ay);
    rect(ctx, 13, 19, 1, 1, P.mitziAccent, s, ax, ay);
    return;
  }
  rect(ctx, 8, 16, 8, 10, P.mitziCloth, s, ax, ay);
  rect(ctx, 9, 16, 6, 2, P.white, s, ax, ay);
  rect(ctx, 10, 19, 1, 1, P.mitziAccent, s, ax, ay);
  rect(ctx, 13, 19, 1, 1, P.mitziAccent, s, ax, ay);
  rect(ctx, 7, 26, 10, 8, P.mitziSkirt, s, ax, ay);
  px(ctx, 7, 34, P.mitziSkirt, s, ax, ay);
  px(ctx, 10, 34, P.mitziSkirt, s, ax, ay);
  px(ctx, 13, 34, P.mitziSkirt, s, ax, ay);
  px(ctx, 16, 34, P.mitziSkirt, s, ax, ay);
  rect(ctx, 5, 28, 3, 3, '#483850', s, ax, ay);
  rect(ctx, 9, 35, 3, 7, P.mitziSkin, s, ax, ay);
  rect(ctx, 13, 35, 3, 7, P.mitziSkin, s, ax, ay);
  rect(ctx, 9, 41, 3, 2, P.white, s, ax, ay);
  rect(ctx, 13, 41, 3, 2, P.white, s, ax, ay);
  rect(ctx, 19, 20, 3, 3, P.inkDim, s, ax, ay);
  rect(ctx, 20, 23, 1, 10, P.charonAccent, s, ax, ay);
}

function drawVictoria(ctx, ax, ay, s, opts = {}) {
  const { bust, drink } = opts;
  rect(ctx, 4, 2, 16, 22, P.victoriaHair, s, ax, ay);
  rect(ctx, 2, 8, 4, 16, P.victoriaHairDark, s, ax, ay);
  rect(ctx, 18, 8, 4, 16, P.victoriaHairDark, s, ax, ay);
  rect(ctx, 6, 4, 12, 2, P.inkFaint, s, ax, ay);
  rect(ctx, 15, 3, 3, 3, P.victoriaRose, s, ax, ay);
  rect(ctx, 8, 7, 8, 9, P.victoriaSkin, s, ax, ay);
  rect(ctx, 8, 6, 8, 2, P.victoriaHair, s, ax, ay);
  rect(ctx, 9, 10, 2, 2, P.victoriaEye, s, ax, ay);
  rect(ctx, 13, 10, 2, 2, P.victoriaEye, s, ax, ay);
  rect(ctx, 11, 14, 2, 1, '#806060', s, ax, ay);
  if (bust) {
    rect(ctx, 7, 16, 10, 12, P.victoriaCloth, s, ax, ay);
    rect(ctx, 9, 20, 2, 2, P.victoriaRose, s, ax, ay);
    rect(ctx, 12, 20, 2, 2, P.victoriaRose, s, ax, ay);
    if (drink) {
      rect(ctx, 18, 18, 3, 8, '#3a2030', s, ax, ay);
      rect(ctx, 18, 16, 3, 2, P.inkDim, s, ax, ay);
    }
    return;
  }
  rect(ctx, 8, 16, 8, 12, P.victoriaCloth, s, ax, ay);
  rect(ctx, 9, 20, 2, 2, P.victoriaRose, s, ax, ay);
  rect(ctx, 12, 20, 2, 2, P.victoriaRose, s, ax, ay);
  rect(ctx, 7, 28, 10, 8, '#1a181c', s, ax, ay);
  rect(ctx, 9, 36, 3, 7, P.victoriaSkin, s, ax, ay);
  rect(ctx, 13, 36, 3, 7, P.victoriaSkin, s, ax, ay);
  rect(ctx, 9, 42, 3, 2, P.inkFaint, s, ax, ay);
  rect(ctx, 13, 42, 3, 2, P.inkFaint, s, ax, ay);
  rect(ctx, 20, 10, 1, 28, P.inkDim, s, ax, ay);
  rect(ctx, 19, 8, 3, 3, P.bone, s, ax, ay);
}

function drawHestia(ctx, ax, ay, s, opts = {}) {
  const { bust, angry } = opts;
  rect(ctx, 3, 4, 18, 20, P.hestiaHair, s, ax, ay);
  rect(ctx, 2, 8, 4, 16, P.hestiaHairDark, s, ax, ay);
  rect(ctx, 18, 8, 4, 16, P.hestiaHairDark, s, ax, ay);
  rect(ctx, 5, 3, 14, 3, P.hestiaCloth, s, ax, ay);
  rect(ctx, 16, 2, 6, 5, P.white, s, ax, ay);
  rect(ctx, 8, 7, 8, 9, P.hestiaSkin, s, ax, ay);
  rect(ctx, 8, 6, 8, 2, P.hestiaHair, s, ax, ay);
  const eye = angry ? P.hestiaEyeAngry : P.hestiaEye;
  rect(ctx, 9, 10, 2, 2, eye, s, ax, ay);
  rect(ctx, 13, 10, 2, 2, eye, s, ax, ay);
  rect(ctx, 8, 13, 2, 1, '#c89898', s, ax, ay);
  rect(ctx, 14, 13, 2, 1, '#c89898', s, ax, ay);
  rect(ctx, 11, 14, 2, 1, '#a07070', s, ax, ay);
  if (bust) {
    rect(ctx, 6, 16, 12, 12, P.hestiaCloth, s, ax, ay);
    rect(ctx, 10, 16, 4, 3, P.white, s, ax, ay);
    rect(ctx, 11, 20, 2, 2, P.hestiaGold, s, ax, ay);
    return;
  }
  rect(ctx, 7, 16, 10, 14, P.hestiaCloth, s, ax, ay);
  rect(ctx, 10, 16, 4, 2, P.white, s, ax, ay);
  rect(ctx, 11, 19, 2, 2, P.hestiaGold, s, ax, ay);
  rect(ctx, 5, 18, 3, 6, P.hestiaClothShade, s, ax, ay);
  rect(ctx, 16, 18, 3, 6, P.hestiaClothShade, s, ax, ay);
  rect(ctx, 6, 30, 12, 8, P.hestiaClothShade, s, ax, ay);
  rect(ctx, 9, 38, 3, 6, P.hestiaSkin, s, ax, ay);
  rect(ctx, 13, 38, 3, 6, P.hestiaSkin, s, ax, ay);
  rect(ctx, 9, 43, 3, 2, P.inkFaint, s, ax, ay);
  rect(ctx, 13, 43, 3, 2, P.inkFaint, s, ax, ay);
}

function drawCharon(ctx, ax, ay, s, opts = {}) {
  const { bust } = opts;
  rect(ctx, 5, 3, 14, 16, P.charonHair, s, ax, ay);
  rect(ctx, 3, 8, 4, 12, P.charonHairDark, s, ax, ay);
  rect(ctx, 17, 8, 4, 12, P.charonHairDark, s, ax, ay);
  rect(ctx, 8, 7, 8, 9, P.charonSkin, s, ax, ay);
  rect(ctx, 9, 10, 2, 2, '#605040', s, ax, ay);
  rect(ctx, 13, 10, 2, 2, '#605040', s, ax, ay);
  rect(ctx, 11, 14, 2, 1, '#705040', s, ax, ay);
  if (bust) {
    rect(ctx, 7, 16, 10, 12, P.charonCloth, s, ax, ay);
    rect(ctx, 11, 18, 2, 2, P.gold, s, ax, ay);
    return;
  }
  rect(ctx, 7, 16, 10, 16, P.charonCloth, s, ax, ay);
  rect(ctx, 11, 18, 2, 2, P.gold, s, ax, ay);
  rect(ctx, 9, 32, 3, 10, P.charonSkin, s, ax, ay);
  rect(ctx, 13, 32, 3, 10, P.charonSkin, s, ax, ay);
  rect(ctx, 9, 41, 3, 2, P.inkFaint, s, ax, ay);
  rect(ctx, 13, 41, 3, 2, P.inkFaint, s, ax, ay);
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
  rect(ctx, 8, 12, 3, 3, eyeC, s, ax, ay);
  rect(ctx, 13, 12, 3, 3, eyeC, s, ax, ay);
  if (!identified) {
    rect(ctx, 8, 12, 3, 3, shade, s, ax, ay);
    rect(ctx, 13, 12, 3, 3, shade, s, ax, ay);
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
