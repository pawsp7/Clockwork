/** Rules vocabulary shared by logic, art and UI. */

export const ELEMENTS = ['fire', 'water', 'earth', 'electric'];
export const TYPES = ['slashing', 'piercing', 'blunt'];

/** Water → Fire → Earth → Electric → Water  (key beats value) */
export const BEATS = { water: 'fire', fire: 'earth', earth: 'electric', electric: 'water' };
/** The element that beats the key. Using an element exposes you to its counter next turn. */
export const COUNTER = { fire: 'water', earth: 'fire', electric: 'earth', water: 'electric' };

export const SHORT = {
  fire: 'F',
  water: 'W',
  earth: 'G',
  electric: 'E',
  slashing: 'S',
  piercing: 'P',
  blunt: 'B',
};

export const LABEL = {
  fire: 'Fire',
  water: 'Water',
  earth: 'Earth',
  electric: 'Electric',
  slashing: 'Slashing',
  piercing: 'Piercing',
  blunt: 'Blunt',
};

export const EYES = ['green', 'red', 'blue', 'yellow'];
export const SHAPES = ['triangle', 'square', 'circle'];
export const LIMBS = [2, 4, 6];
export const FEATURES = ['eye', 'shape', 'limbs'];

export const ELEMENT_COLOR = {
  fire: '#c4643c',
  water: '#4f86a8',
  earth: '#7f9a4c',
  electric: '#d2b44a',
};

export const TYPE_COLOR = {
  slashing: '#c9a0a8',
  piercing: '#a8b8c8',
  blunt: '#b8a890',
};

/** Rules knobs, kept together so balance passes touch one place. */
export const RULES = {
  supplyMax: 100,
  manaMax: 20,
  imbueCost: 2,
  exposedBonus: 0.5,
  elementAdvantage: 0.5,
  elementDisadvantage: 0.25,
  typeMod: 0.5,
  armourMod: 0.5,
  partyDefense: 0.25, // perfect Ruins dialog: incoming damage ×0.75 in the finale
  campHeal: 0.4,
  campMana: 6,
  maxMercs: 2,
};
