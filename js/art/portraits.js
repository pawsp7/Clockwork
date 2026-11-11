import { refPortrait } from './refart.js';
import { rasterCached } from './pixel.js';

/**
 * Dialog portraits, 64×64. Mitzi, Victoria and Hestia are the reference portraits;
 * Alice and Charon are derived from them. Moods: happy, sad, angry (Hestia's eyes
 * go red), and blinks.
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

export function portrait(who, flags = {}, mood = null, blink = false) {
  if (who === 'thug') return thug();
  return refPortrait(who, flags, mood, blink);
}

export const PORTRAIT_SIZE = 64;
