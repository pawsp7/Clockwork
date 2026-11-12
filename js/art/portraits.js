import { refPortrait } from './refart.js';
import { rasterCached } from './pixel.js';

/**
 * Dialog portraits, 64×64. Mitzi, Victoria and Hestia are the reference portraits;
 * Alice and Charon are derived from them. Moods: happy, sad, angry (Hestia's eyes
 * go red), and blinks.
 *
 * Gehenna's townsfolk (the thugs, Horace the smith, Bede the carter, the flock)
 * are painted here as lantern-lit silhouettes: faces in shadow, eyes catching
 * the light.
 */

function thug() {
  return rasterCached('portrait|thug', 64, 64, (r) => {
    r.ellipse(32, 30, 22, 26, '#3a3440');
    r.ellipse(32, 34, 15, 18, '#120f16');
    r.rect(10, 50, 44, 14, '#3a3440');
    r.rect(14, 54, 36, 10, '#2a2630');
    r.rect(25, 32, 3, 2, '#d8c070');
    r.rect(36, 32, 3, 2, '#d8c070');
    r.rect(22, 58, 20, 2, '#7a6a4a');
  });
}

/** Horace: broad as a door, soot on his scalp, eyes that never close. */
function smith() {
  return rasterCached('portrait|smith', 64, 64, (r) => {
    // shoulders like a door, a leather apron
    r.ellipse(32, 64, 31, 17, '#3a2a22');
    r.rect(18, 50, 28, 14, '#5a3a24');
    r.rect(18, 50, 28, 2, '#6a4a30');
    r.rect(20, 45, 3, 7, '#5a3a24');
    r.rect(41, 45, 3, 7, '#5a3a24');
    r.rect(26, 43, 12, 6, '#2a1e1a');
    // a bald, lamp-lit head with soot on the scalp
    r.ellipse(19, 30, 2, 4, '#4a382c');
    r.ellipse(45, 30, 2, 4, '#4a382c');
    r.ellipse(32, 27, 13, 16, '#5a4638');
    r.ellipse(30, 15, 7, 3, '#7a6450');
    r.rect(35, 17, 3, 2, '#2a2220');
    r.rect(26, 19, 2, 1, '#2a2220');
    // the face in shadow, a short grey beard
    r.ellipse(32, 33, 11, 11, '#1c1412');
    r.ellipse(32, 42, 10, 6, '#6a625c');
    r.ellipse(32, 45, 7, 4, '#58504a');
    r.rect(29, 39, 6, 1, '#1c1412');
    // heavy brows over eyes that never close
    r.rect(22, 24, 8, 2, '#8a8078');
    r.rect(34, 24, 8, 2, '#8a8078');
    r.rect(23, 27, 6, 4, '#ece4d4');
    r.rect(35, 27, 6, 4, '#ece4d4');
    r.rect(25, 28, 2, 2, '#141010');
    r.rect(37, 28, 2, 2, '#141010');
  });
}

/** Bede: flat cap, a scarf, a milk-white apron, tired eyes. */
function carter(blink) {
  return rasterCached(`portrait|carter|${blink ? 1 : 0}`, 64, 64, (r) => {
    r.ellipse(32, 62, 28, 14, '#3a3830');
    r.rect(22, 50, 3, 14, '#d8d4c8');
    r.rect(39, 50, 3, 14, '#d8d4c8');
    r.rect(17, 44, 30, 7, '#6a3a30');
    r.rect(17, 44, 30, 1, '#7a4a3a');
    r.rect(36, 48, 5, 10, '#5a3028');
    r.ellipse(32, 31, 14, 15, '#2c2622');
    r.ellipse(32, 34, 11, 11, '#16120f');
    r.ellipse(32, 19, 17, 8, '#3a4238');
    r.rect(13, 22, 38, 3, '#262c24');
    r.rect(20, 15, 18, 1, '#4a5248');
    if (blink) {
      r.rect(25, 31, 4, 1, '#8a8470');
      r.rect(35, 31, 4, 1, '#8a8470');
    } else {
      r.rect(25, 30, 4, 2, '#c8c0a0');
      r.rect(35, 30, 4, 2, '#c8c0a0');
      r.rect(25, 29, 4, 1, '#2c2622');
      r.rect(35, 29, 4, 1, '#2c2622');
    }
    r.rect(28, 40, 8, 1, '#2c2622');
  });
}

/** One of the flock: a white veil, a pale and pleasant face, eyes politely shut. */
function flock() {
  return rasterCached('portrait|flock', 64, 64, (r) => {
    r.ellipse(32, 62, 26, 13, '#e0dce4');
    r.ellipse(32, 62, 20, 10, '#cac4d2');
    r.ellipse(32, 30, 20, 26, '#d8d4dc');
    r.ellipse(32, 32, 15, 21, '#b4aec0');
    r.ellipse(32, 33, 11, 14, '#cbbcb4');
    r.ellipse(32, 38, 9, 8, '#c0b0a8');
    r.rect(25, 31, 5, 1, '#5a4a52');
    r.rect(34, 31, 5, 1, '#5a4a52');
    r.rect(25, 32, 1, 1, '#5a4a52');
    r.rect(38, 32, 1, 1, '#5a4a52');
    r.rect(29, 40, 6, 1, '#8a6a6a');
    r.rect(28, 39, 1, 1, '#8a6a6a');
    r.rect(35, 39, 1, 1, '#8a6a6a');
    r.rect(30, 54, 4, 4, '#c8a860');
    r.rect(29, 53, 1, 2, '#c8a860');
    r.rect(34, 53, 1, 2, '#c8a860');
  });
}

export function portrait(who, flags = {}, mood = null, blink = false) {
  if (who === 'thug') return thug();
  if (who === 'smith') return smith();
  if (who === 'carter') return carter(blink);
  if (who === 'flock') return flock();
  return refPortrait(who, flags, mood, blink);
}

export const PORTRAIT_SIZE = 64;
