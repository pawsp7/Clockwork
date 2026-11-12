import { refSprite, hoodSprite } from './refart.js';

/**
 * Overworld / battle sprites, 32×48 — drawn from the reference art in references/Art.
 * Alice, Mitzi and Victoria come straight from the references; Hestia and Charon are
 * derived from them; thugs, hired blades and the faithful wear hoods.
 */

export function heroSprite(id, flags = {}, mood, walkFrame = null) {
  return refSprite(id, flags, mood, walkFrame);
}

const LOOK_TINTS = {
  hood: {},
  cap: { c: '#4a4a56', C: '#34343e' },
  monk: { c: '#5a4a36', C: '#423626', W: '#8a7a5a' },
  brute: { c: '#3a4432', C: '#283022' },
};

export function mercSprite(merc) {
  const pal = { ...(LOOK_TINTS[merc.look] || {}), e: '#d8d0b8' };
  if (merc.tint) pal.c = merc.tint;
  return hoodSprite(`merc|${merc.template || merc.name}`, pal);
}

export function thugSprite(look) {
  if (look === 'knife') return hoodSprite('thug_knife', { c: '#40323a', C: '#2c2228', e: '#e08868', s: '#c8ccd0', S: '#9aa0a8' });
  return hoodSprite('thug_lanky', { c: '#383a42', C: '#26282e', e: '#c8c060' });
}

export function faithfulSprite() {
  return hoodSprite('faithful', { c: '#e8e2da', C: '#c8c0b6', K: '#2a2630', e: '#8aa0b8', W: '#d8d0c6', g: '#c8a858', T: '#d8d0c8', o: '#8a8278', O: '#a8a096' });
}

export const SPRITE_W = 32;
export const SPRITE_H = 48;
