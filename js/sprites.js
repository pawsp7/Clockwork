import { P } from './palette.js';

/**
 * Dual art pipeline matching refs:
 * - Portraits: higher-detail busts (Alice: soft pastel face with pupils/lashes;
 *   Mitzi/Victoria: vacant-eyed but more detailed hair/cloth)
 * - Sprites: lineless chibi overworld (~32×56), vacant eyes, dim palette
 */

export function px(ctx, x, y, c, s = 1, ax = 0, ay = 0) {
  ctx.fillStyle = c;
  ctx.fillRect(ax + x * s, ay + y * s, s, s);
}

export function rect(ctx, x, y, w, h, c, s = 1, ax = 0, ay = 0) {
  ctx.fillStyle = c;
  ctx.fillRect(ax + x * s, ay + y * s, w * s, h * s);
}

function vacantEyes(ctx, lx, rx, y, size, eye, hi, s, ax, ay) {
  rect(ctx, lx, y, size, size, eye, s, ax, ay);
  rect(ctx, rx, y, size, size, eye, s, ax, ay);
  px(ctx, lx, y, hi, s, ax, ay);
  px(ctx, rx, y, hi, s, ax, ay);
}

/** Expressive portrait eyes (Alice / Hestia style) — iris + pupil + lash + glint */
function portraitEyes(ctx, lx, rx, y, iris, dark, hi, s, ax, ay, angry = false) {
  // whites / iris block
  rect(ctx, lx, y, 4, 4, iris, s, ax, ay);
  rect(ctx, rx, y, 4, 4, iris, s, ax, ay);
  // pupils
  rect(ctx, lx + 1, y + 1, 2, 2, angry ? P.hestiaEyeAngry : dark, s, ax, ay);
  rect(ctx, rx + 1, y + 1, 2, 2, angry ? P.hestiaEyeAngry : dark, s, ax, ay);
  // glints
  px(ctx, lx, y, hi, s, ax, ay);
  px(ctx, rx, y, hi, s, ax, ay);
  // upper lashes (black reserved for eyes only)
  rect(ctx, lx, y - 1, 4, 1, '#1a1418', s, ax, ay);
  rect(ctx, rx, y - 1, 4, 1, '#1a1418', s, ax, ay);
  px(ctx, lx - 1, y, '#1a1418', s, ax, ay);
  px(ctx, rx + 4, y, '#1a1418', s, ax, ay);
}

function thornCrown(ctx, x, y, w, s, ax, ay, ribbon = false) {
  rect(ctx, x, y + 1, w, 2, P.crown, s, ax, ay);
  for (let i = 0; i < Math.floor(w / 2); i++) {
    px(ctx, x + i * 2, y, P.crown, s, ax, ay);
  }
  if (ribbon) {
    rect(ctx, x + w - 1, y + 2, 1, 10, P.crown, s, ax, ay);
    px(ctx, x + w, y + 6, P.crown, s, ax, ay);
    px(ctx, x + w - 2, y + 8, P.crown, s, ax, ay);
  }
}

// ─── Public API ─────────────────────────────────────────────

export function drawPortrait(ctx, who, screenX, screenY, scale = 4, opts = {}) {
  ctx.fillStyle = 'rgba(32, 28, 36, 0.55)';
  ctx.fillRect(screenX - 8, screenY - 8, 34 * scale + 16, 36 * scale + 16);

  if (who === 'alice') portraitAlice(ctx, screenX, screenY, scale, opts);
  else if (who === 'mitzi') portraitMitzi(ctx, screenX, screenY, scale, opts);
  else if (who === 'victoria') portraitVictoria(ctx, screenX, screenY, scale, opts);
  else if (who === 'hestia') portraitHestia(ctx, screenX, screenY, scale, opts);
  else if (who === 'charon') portraitCharon(ctx, screenX, screenY, scale, opts);
}

export function drawSprite(ctx, who, screenX, screenY, scale = 3, opts = {}) {
  if (who === 'alice') spriteAlice(ctx, screenX, screenY, scale, opts);
  else if (who === 'mitzi') spriteMitzi(ctx, screenX, screenY, scale, opts);
  else if (who === 'victoria') spriteVictoria(ctx, screenX, screenY, scale, opts);
  else if (who === 'hestia') spriteHestia(ctx, screenX, screenY, scale, opts);
  else if (who === 'charon') spriteCharon(ctx, screenX, screenY, scale, opts);
  else if (who === 'enemy') drawEnemy(ctx, screenX, screenY, scale, opts);
  else if (who === 'ox') drawWhiteOx(ctx, screenX, screenY, scale, opts);
}

// ─── PORTRAITS (detailed busts) ─────────────────────────────

/** Alice — soft pastel portrait: pupils, lashes, blush, smile, maid bow */
function portraitAlice(ctx, ax, ay, s, opts = {}) {
  const { eyepatch, shortHair } = opts;
  // hair back / shoulders
  rect(ctx, 2, 6, 28, shortHair ? 18 : 28, P.aliceHair, s, ax, ay);
  rect(ctx, 0, 10, 5, shortHair ? 14 : 24, P.aliceHairDark, s, ax, ay);
  rect(ctx, 27, 10, 5, shortHair ? 14 : 24, P.aliceHairDark, s, ax, ay);
  // face
  rect(ctx, 8, 10, 16, 14, P.aliceSkin, s, ax, ay);
  // bangs
  rect(ctx, 8, 8, 16, 5, P.aliceHair, s, ax, ay);
  rect(ctx, 8, 8, 4, 6, P.aliceHairDark, s, ax, ay);
  rect(ctx, 20, 8, 4, 6, P.aliceHairDark, s, ax, ay);
  // white ruffled headband + bow (right)
  rect(ctx, 6, 5, 20, 3, P.aliceCollar, s, ax, ay);
  px(ctx, 7, 4, P.aliceCollar, s, ax, ay);
  px(ctx, 12, 4, P.aliceCollar, s, ax, ay);
  px(ctx, 17, 4, P.aliceCollar, s, ax, ay);
  px(ctx, 22, 4, P.aliceCollar, s, ax, ay);
  rect(ctx, 22, 2, 8, 6, P.aliceCloth, s, ax, ay);
  rect(ctx, 24, 3, 4, 4, P.white, s, ax, ay);
  // eyes
  if (eyepatch) {
    rect(ctx, 10, 14, 5, 4, P.crown, s, ax, ay);
    portraitEyes(ctx, 18, 18, 14, P.aliceEye, P.aliceEyeDark, P.aliceEyeHi, s, ax, ay);
    // only right eye expressive — left covered; redraw single right eye cleanly
    rect(ctx, 18, 14, 4, 4, P.aliceEye, s, ax, ay);
    rect(ctx, 19, 15, 2, 2, P.aliceEyeDark, s, ax, ay);
    px(ctx, 18, 14, P.aliceEyeHi, s, ax, ay);
    rect(ctx, 18, 13, 4, 1, '#1a1418', s, ax, ay);
  } else {
    portraitEyes(ctx, 10, 18, 14, P.aliceEye, P.aliceEyeDark, P.aliceEyeHi, s, ax, ay);
  }
  // blush + nose + smile
  rect(ctx, 9, 19, 3, 1, P.aliceBlush, s, ax, ay);
  rect(ctx, 20, 19, 3, 1, P.aliceBlush, s, ax, ay);
  px(ctx, 15, 18, P.aliceSkinShade, s, ax, ay);
  rect(ctx, 14, 21, 4, 1, P.aliceLip, s, ax, ay);
  px(ctx, 15, 20, P.white, s, ax, ay); // tooth hint
  // collar / chest
  rect(ctx, 6, 24, 20, 12, P.aliceCloth, s, ax, ay);
  rect(ctx, 4, 26, 5, 8, P.aliceClothShade, s, ax, ay);
  rect(ctx, 23, 26, 5, 8, P.aliceClothShade, s, ax, ay);
  rect(ctx, 12, 24, 8, 3, P.aliceCollar, s, ax, ay);
  // gold trim on collar + chest clasp
  rect(ctx, 13, 25, 1, 3, P.aliceAccent, s, ax, ay);
  rect(ctx, 18, 25, 1, 3, P.aliceAccent, s, ax, ay);
  rect(ctx, 14, 28, 4, 3, P.aliceAccent, s, ax, ay);
  px(ctx, 15, 29, P.gold, s, ax, ay);
}

/** Mitzi portrait — vacant glow eyes, buns, detailed lavender hair */
function portraitMitzi(ctx, ax, ay, s) {
  // pigtail masses
  rect(ctx, 0, 12, 7, 20, P.mitziHair, s, ax, ay);
  rect(ctx, 25, 12, 7, 20, P.mitziHair, s, ax, ay);
  rect(ctx, 0, 22, 5, 10, P.mitziHairDark, s, ax, ay);
  rect(ctx, 27, 22, 5, 10, P.mitziHairDark, s, ax, ay);
  // head
  rect(ctx, 6, 8, 20, 16, P.mitziHair, s, ax, ay);
  // buns
  rect(ctx, 2, 2, 8, 7, P.mitziHair, s, ax, ay);
  rect(ctx, 22, 2, 8, 7, P.mitziHair, s, ax, ay);
  rect(ctx, 3, 1, 6, 2, P.mitziHairDark, s, ax, ay);
  rect(ctx, 23, 1, 6, 2, P.mitziHairDark, s, ax, ay);
  // face
  rect(ctx, 10, 12, 12, 11, P.mitziSkin, s, ax, ay);
  rect(ctx, 10, 10, 12, 4, P.mitziHair, s, ax, ay);
  thornCrown(ctx, 10, 6, 12, s, ax, ay, false);
  // large vacant circular eyes
  vacantEyes(ctx, 11, 18, 14, 4, P.mitziEye, P.vacantEyeHi, s, ax, ay);
  // shirt + collar
  rect(ctx, 8, 23, 16, 12, P.mitziCloth, s, ax, ay);
  rect(ctx, 10, 23, 12, 3, P.mitziCollar, s, ax, ay);
  px(ctx, 9, 25, P.mitziCollar, s, ax, ay);
  px(ctx, 22, 25, P.mitziCollar, s, ax, ay);
  rect(ctx, 13, 27, 2, 2, P.mitziAccent, s, ax, ay);
  rect(ctx, 17, 27, 2, 2, P.mitziAccent, s, ax, ay);
}

/** Victoria portrait — vacant eyes, crimson hair, thorn crown + ribbon, roses */
function portraitVictoria(ctx, ax, ay, s, opts = {}) {
  const { drink } = opts;
  rect(ctx, 2, 6, 28, 28, P.victoriaHair, s, ax, ay);
  rect(ctx, 0, 12, 5, 22, P.victoriaHairDark, s, ax, ay);
  rect(ctx, 27, 12, 5, 22, P.victoriaHairDark, s, ax, ay);
  rect(ctx, 1, 28, 4, 8, P.victoriaHairDeep, s, ax, ay);
  rect(ctx, 27, 28, 4, 8, P.victoriaHairDeep, s, ax, ay);
  rect(ctx, 9, 10, 14, 13, P.victoriaSkin, s, ax, ay);
  rect(ctx, 9, 8, 14, 5, P.victoriaHair, s, ax, ay);
  thornCrown(ctx, 8, 5, 16, s, ax, ay, true);
  // rose on crown
  rect(ctx, 20, 4, 3, 3, P.victoriaRose, s, ax, ay);
  vacantEyes(ctx, 11, 18, 14, 4, P.victoriaEye, P.victoriaEyeHi, s, ax, ay);
  // black shirt + roses
  rect(ctx, 8, 23, 16, 12, P.victoriaCloth, s, ax, ay);
  rect(ctx, 11, 26, 3, 3, P.victoriaRose, s, ax, ay);
  rect(ctx, 17, 26, 3, 3, P.victoriaRose, s, ax, ay);
  rect(ctx, 14, 27, 3, 1, P.inkDim, s, ax, ay); // chain
  if (drink) {
    rect(ctx, 26, 24, 4, 10, '#3a2030', s, ax, ay);
    rect(ctx, 26, 22, 4, 2, P.inkDim, s, ax, ay);
  }
}

function portraitHestia(ctx, ax, ay, s, opts = {}) {
  const { angry } = opts;
  rect(ctx, 2, 6, 28, 26, P.hestiaHair, s, ax, ay);
  rect(ctx, 0, 12, 5, 20, P.hestiaHairDark, s, ax, ay);
  rect(ctx, 27, 12, 5, 20, P.hestiaHairDark, s, ax, ay);
  rect(ctx, 9, 10, 14, 13, P.hestiaSkin, s, ax, ay);
  rect(ctx, 9, 8, 14, 4, P.hestiaHair, s, ax, ay);
  // frilly white headpiece + bow
  rect(ctx, 5, 4, 22, 4, P.hestiaCloth, s, ax, ay);
  px(ctx, 6, 3, P.white, s, ax, ay);
  px(ctx, 12, 3, P.white, s, ax, ay);
  px(ctx, 18, 3, P.white, s, ax, ay);
  rect(ctx, 22, 2, 8, 6, P.white, s, ax, ay);
  if (angry) {
    portraitEyes(ctx, 11, 18, 14, P.hestiaEyeAngry, '#401010', '#d08080', s, ax, ay, true);
  } else {
    portraitEyes(ctx, 11, 18, 14, P.hestiaEye, P.hestiaEyeDark, P.aliceEyeHi, s, ax, ay);
  }
  rect(ctx, 10, 19, 3, 1, P.hestiaBlush, s, ax, ay);
  rect(ctx, 20, 19, 3, 1, P.hestiaBlush, s, ax, ay);
  rect(ctx, 14, 21, 4, 1, P.hestiaLip, s, ax, ay);
  rect(ctx, 7, 23, 18, 12, P.hestiaCloth, s, ax, ay);
  rect(ctx, 12, 23, 8, 3, P.white, s, ax, ay);
  rect(ctx, 14, 27, 4, 3, P.hestiaGold, s, ax, ay);
}

function portraitCharon(ctx, ax, ay, s) {
  rect(ctx, 4, 6, 24, 22, P.charonHair, s, ax, ay);
  rect(ctx, 1, 12, 5, 16, P.charonHairDark, s, ax, ay);
  rect(ctx, 26, 12, 5, 16, P.charonHairDark, s, ax, ay);
  rect(ctx, 9, 10, 14, 13, P.charonSkin, s, ax, ay);
  rect(ctx, 9, 8, 14, 4, P.charonHair, s, ax, ay);
  portraitEyes(ctx, 11, 18, 14, P.charonEye, P.charonEyeDark, P.vacantEyeHi, s, ax, ay);
  rect(ctx, 14, 21, 4, 1, '#805040', s, ax, ay);
  rect(ctx, 8, 23, 16, 12, P.charonCloth, s, ax, ay);
  rect(ctx, 14, 26, 4, 4, P.gold, s, ax, ay);
}

// ─── OVERWORLD SPRITES (chibi ~32×48, lineless, vacant) ─────

/** Victoria sprite — matches crimson vacant-eye ref */
function spriteVictoria(ctx, ax, ay, s, opts = {}) {
  const { drink } = opts;
  // long hair
  rect(ctx, 5, 4, 18, 22, P.victoriaHair, s, ax, ay);
  rect(ctx, 3, 8, 4, 18, P.victoriaHairDark, s, ax, ay);
  rect(ctx, 21, 8, 4, 18, P.victoriaHairDark, s, ax, ay);
  rect(ctx, 2, 22, 4, 10, P.victoriaHairDeep, s, ax, ay);
  rect(ctx, 22, 22, 4, 10, P.victoriaHairDeep, s, ax, ay);
  // jagged hair tips
  px(ctx, 2, 32, P.victoriaHairDeep, s, ax, ay);
  px(ctx, 4, 33, P.victoriaHairDark, s, ax, ay);
  px(ctx, 22, 33, P.victoriaHairDark, s, ax, ay);
  px(ctx, 24, 32, P.victoriaHairDeep, s, ax, ay);
  // face
  rect(ctx, 8, 8, 12, 11, P.victoriaSkin, s, ax, ay);
  rect(ctx, 8, 6, 12, 4, P.victoriaHair, s, ax, ay);
  thornCrown(ctx, 7, 3, 14, s, ax, ay, true);
  // large oval vacant eyes (no pupils)
  vacantEyes(ctx, 9, 15, 11, 4, P.victoriaEye, P.victoriaEyeHi, s, ax, ay);
  // short-sleeve black dress
  rect(ctx, 9, 19, 10, 8, P.victoriaCloth, s, ax, ay);
  rect(ctx, 7, 20, 2, 5, P.victoriaSkin, s, ax, ay);
  rect(ctx, 19, 20, 2, 5, P.victoriaSkin, s, ax, ay);
  // heart accent
  rect(ctx, 10, 21, 2, 2, P.victoriaRose, s, ax, ay);
  px(ctx, 10, 23, P.victoriaRose, s, ax, ay);
  // jagged skirt
  rect(ctx, 8, 27, 12, 7, P.victoriaClothDark, s, ax, ay);
  px(ctx, 8, 34, P.victoriaClothDark, s, ax, ay);
  px(ctx, 11, 34, P.victoriaCloth, s, ax, ay);
  px(ctx, 14, 34, P.victoriaClothDark, s, ax, ay);
  px(ctx, 17, 34, P.victoriaCloth, s, ax, ay);
  // legs + shoes
  rect(ctx, 10, 35, 2, 9, P.victoriaSkin, s, ax, ay);
  rect(ctx, 15, 35, 2, 9, P.victoriaSkin, s, ax, ay);
  rect(ctx, 9, 44, 3, 2, P.shoe, s, ax, ay);
  rect(ctx, 15, 44, 3, 2, P.shoe, s, ax, ay);
  if (drink) {
    rect(ctx, 21, 22, 3, 7, '#3a2030', s, ax, ay);
  }
}

/** Mitzi sprite — matches lavender vacant-eye ref */
function spriteMitzi(ctx, ax, ay, s) {
  // long wavy locks
  rect(ctx, 1, 12, 6, 16, P.mitziHair, s, ax, ay);
  rect(ctx, 25, 12, 6, 16, P.mitziHair, s, ax, ay);
  rect(ctx, 0, 20, 5, 12, P.mitziHairDark, s, ax, ay);
  rect(ctx, 27, 20, 5, 12, P.mitziHairDark, s, ax, ay);
  // wave tips
  px(ctx, 0, 32, P.mitziHairDeep, s, ax, ay);
  px(ctx, 2, 34, P.mitziHairDark, s, ax, ay);
  px(ctx, 29, 34, P.mitziHairDark, s, ax, ay);
  px(ctx, 31, 32, P.mitziHairDeep, s, ax, ay);
  // head mass
  rect(ctx, 7, 7, 18, 14, P.mitziHair, s, ax, ay);
  // buns
  rect(ctx, 4, 2, 7, 6, P.mitziHair, s, ax, ay);
  rect(ctx, 21, 2, 7, 6, P.mitziHair, s, ax, ay);
  rect(ctx, 5, 1, 5, 2, P.mitziHairDark, s, ax, ay);
  rect(ctx, 22, 1, 5, 2, P.mitziHairDark, s, ax, ay);
  // face
  rect(ctx, 10, 10, 12, 10, P.mitziSkin, s, ax, ay);
  rect(ctx, 10, 8, 12, 4, P.mitziHair, s, ax, ay);
  thornCrown(ctx, 10, 5, 12, s, ax, ay, false);
  // glowing circular vacant eyes
  vacantEyes(ctx, 11, 17, 12, 4, P.mitziEye, P.vacantEyeHi, s, ax, ay);
  // gray long-sleeve + white collar
  rect(ctx, 10, 20, 12, 10, P.mitziCloth, s, ax, ay);
  rect(ctx, 6, 21, 4, 8, P.mitziCloth, s, ax, ay);
  rect(ctx, 22, 21, 4, 8, P.mitziCloth, s, ax, ay);
  rect(ctx, 7, 22, 3, 6, P.mitziClothDark, s, ax, ay);
  rect(ctx, 22, 22, 3, 6, P.mitziClothDark, s, ax, ay);
  rect(ctx, 11, 20, 10, 2, P.mitziCollar, s, ax, ay);
  px(ctx, 10, 21, P.mitziCollar, s, ax, ay);
  px(ctx, 21, 21, P.mitziCollar, s, ax, ay);
  // buttons
  rect(ctx, 13, 23, 2, 1, P.mitziAccent, s, ax, ay);
  rect(ctx, 17, 23, 2, 1, P.mitziAccent, s, ax, ay);
  // jagged lavender skirt
  rect(ctx, 9, 30, 14, 7, P.mitziSkirt, s, ax, ay);
  px(ctx, 9, 37, P.mitziSkirtDark, s, ax, ay);
  px(ctx, 12, 37, P.mitziSkirt, s, ax, ay);
  px(ctx, 15, 37, P.mitziSkirtDark, s, ax, ay);
  px(ctx, 18, 37, P.mitziSkirt, s, ax, ay);
  px(ctx, 21, 37, P.mitziSkirtDark, s, ax, ay);
  // pouch (viewer right / her left hip in ref — left side of sprite)
  rect(ctx, 6, 32, 3, 3, P.mitziPouch, s, ax, ay);
  // legs + white shoes
  rect(ctx, 12, 38, 2, 8, P.mitziSkin, s, ax, ay);
  rect(ctx, 18, 38, 2, 8, P.mitziSkin, s, ax, ay);
  rect(ctx, 11, 46, 4, 2, P.mitziShoe, s, ax, ay);
  rect(ctx, 17, 46, 4, 2, P.mitziShoe, s, ax, ay);
}

/** Alice sprite — pink hair + maid bow, vacant chibi body (sprite language) */
function spriteAlice(ctx, ax, ay, s, opts = {}) {
  const { eyepatch, shortHair } = opts;
  const hairLen = shortHair ? 14 : 20;
  rect(ctx, 5, 4, 18, hairLen, P.aliceHair, s, ax, ay);
  rect(ctx, 3, 8, 4, shortHair ? 10 : 16, P.aliceHairDark, s, ax, ay);
  rect(ctx, 21, 8, 4, shortHair ? 10 : 16, P.aliceHairDark, s, ax, ay);
  if (!shortHair) {
    rect(ctx, 2, 22, 4, 8, P.aliceHairDeep, s, ax, ay);
    rect(ctx, 22, 22, 4, 8, P.aliceHairDeep, s, ax, ay);
  }
  rect(ctx, 8, 8, 12, 11, P.aliceSkin, s, ax, ay);
  rect(ctx, 8, 6, 12, 4, P.aliceHair, s, ax, ay);
  // white headband + bow
  rect(ctx, 7, 4, 14, 2, P.aliceCollar, s, ax, ay);
  rect(ctx, 18, 2, 6, 5, P.aliceCloth, s, ax, ay);
  rect(ctx, 19, 3, 4, 3, P.white, s, ax, ay);
  if (eyepatch) {
    rect(ctx, 9, 11, 4, 3, P.crown, s, ax, ay);
    vacantEyes(ctx, 15, 15, 11, 3, P.vacantEye, P.vacantEyeHi, s, ax, ay);
  } else {
    vacantEyes(ctx, 9, 15, 11, 3, P.vacantEye, P.vacantEyeHi, s, ax, ay);
  }
  // puffy white dress
  rect(ctx, 8, 19, 12, 9, P.aliceCloth, s, ax, ay);
  rect(ctx, 5, 20, 4, 6, P.aliceClothShade, s, ax, ay);
  rect(ctx, 19, 20, 4, 6, P.aliceClothShade, s, ax, ay);
  rect(ctx, 11, 19, 6, 2, P.aliceCollar, s, ax, ay);
  rect(ctx, 12, 22, 1, 2, P.aliceAccent, s, ax, ay);
  rect(ctx, 15, 22, 1, 2, P.aliceAccent, s, ax, ay);
  rect(ctx, 13, 24, 2, 2, P.aliceAccent, s, ax, ay);
  rect(ctx, 7, 28, 14, 7, P.aliceClothShade, s, ax, ay);
  px(ctx, 7, 35, P.aliceClothShade, s, ax, ay);
  px(ctx, 18, 35, P.aliceClothShade, s, ax, ay);
  rect(ctx, 10, 35, 2, 9, P.aliceSkinShade, s, ax, ay);
  rect(ctx, 15, 35, 2, 9, P.aliceSkinShade, s, ax, ay);
  rect(ctx, 9, 44, 3, 2, P.shoe, s, ax, ay);
  rect(ctx, 15, 44, 3, 2, P.shoe, s, ax, ay);
  rect(ctx, 21, 24, 2, 2, P.gold, s, ax, ay);
}

function spriteHestia(ctx, ax, ay, s, opts = {}) {
  const { angry } = opts;
  rect(ctx, 5, 4, 18, 20, P.hestiaHair, s, ax, ay);
  rect(ctx, 3, 8, 4, 16, P.hestiaHairDark, s, ax, ay);
  rect(ctx, 21, 8, 4, 16, P.hestiaHairDark, s, ax, ay);
  rect(ctx, 8, 8, 12, 11, P.hestiaSkin, s, ax, ay);
  rect(ctx, 8, 6, 12, 4, P.hestiaHair, s, ax, ay);
  rect(ctx, 6, 3, 16, 3, P.hestiaCloth, s, ax, ay);
  rect(ctx, 18, 2, 6, 5, P.white, s, ax, ay);
  const eye = angry ? P.hestiaEyeAngry : P.vacantEye;
  const hi = angry ? '#d08080' : P.vacantEyeHi;
  vacantEyes(ctx, 9, 15, 11, 3, eye, hi, s, ax, ay);
  rect(ctx, 8, 19, 12, 10, P.hestiaCloth, s, ax, ay);
  rect(ctx, 5, 20, 4, 6, P.hestiaClothShade, s, ax, ay);
  rect(ctx, 19, 20, 4, 6, P.hestiaClothShade, s, ax, ay);
  rect(ctx, 11, 19, 6, 2, P.white, s, ax, ay);
  rect(ctx, 13, 22, 2, 2, P.hestiaGold, s, ax, ay);
  rect(ctx, 7, 29, 14, 7, P.hestiaClothShade, s, ax, ay);
  rect(ctx, 10, 36, 2, 8, P.hestiaSkin, s, ax, ay);
  rect(ctx, 15, 36, 2, 8, P.hestiaSkin, s, ax, ay);
  rect(ctx, 9, 44, 3, 2, P.shoe, s, ax, ay);
  rect(ctx, 15, 44, 3, 2, P.shoe, s, ax, ay);
}

function spriteCharon(ctx, ax, ay, s) {
  rect(ctx, 6, 4, 16, 16, P.charonHair, s, ax, ay);
  rect(ctx, 4, 8, 4, 12, P.charonHairDark, s, ax, ay);
  rect(ctx, 20, 8, 4, 12, P.charonHairDark, s, ax, ay);
  rect(ctx, 8, 8, 12, 11, P.charonSkin, s, ax, ay);
  rect(ctx, 8, 6, 12, 3, P.charonHair, s, ax, ay);
  vacantEyes(ctx, 9, 15, 11, 3, P.vacantEye, P.vacantEyeHi, s, ax, ay);
  rect(ctx, 8, 19, 12, 12, P.charonCloth, s, ax, ay);
  rect(ctx, 6, 20, 2, 6, P.charonSkin, s, ax, ay);
  rect(ctx, 20, 20, 2, 6, P.charonSkin, s, ax, ay);
  rect(ctx, 12, 22, 3, 3, P.gold, s, ax, ay);
  rect(ctx, 7, 31, 14, 5, P.charonCloth, s, ax, ay);
  rect(ctx, 10, 36, 2, 8, P.charonSkin, s, ax, ay);
  rect(ctx, 15, 36, 2, 8, P.charonSkin, s, ax, ay);
  rect(ctx, 9, 44, 3, 2, P.shoe, s, ax, ay);
  rect(ctx, 15, 44, 3, 2, P.shoe, s, ax, ay);
}

// ─── Enemies / Ox / backgrounds ─────────────────────────────

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
