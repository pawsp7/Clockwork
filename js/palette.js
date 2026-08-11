/** Dim gothic palette for Clockwork */
export const P = {
  black: '#000000',
  void: '#0a080c',
  bg: '#121018',
  panel: '#1a161e',
  panel2: '#221c26',
  frame: '#2e2630',
  ink: '#b8aea6',
  inkDim: '#7a7068',
  inkFaint: '#4a4248',
  white: '#c8c0b8',
  bone: '#a09888',

  // Alice — muted dusty pink
  aliceHair: '#a86878',
  aliceHairDark: '#6a4450',
  aliceSkin: '#d4b8a8',
  aliceSkinShade: '#b89888',
  aliceCloth: '#a09088',
  aliceAccent: '#8a7880',
  aliceEye: '#7a8a98',

  // Mitzi — desaturated lavender
  mitziHair: '#7a6a88',
  mitziHairDark: '#544860',
  mitziSkin: '#d0b8a8',
  mitziCloth: '#6a6870',
  mitziAccent: '#8a7a58',
  mitziSkirt: '#685878',
  mitziEye: '#a8b0b8',

  // Victoria — muted burgundy
  victoriaHair: '#8a4050',
  victoriaHairDark: '#501828',
  victoriaSkin: '#d0b0a0',
  victoriaCloth: '#3a383c',
  victoriaRose: '#8a3840',
  victoriaEye: '#98a098',

  // Hestia — pale bone / white ox
  hestiaHair: '#b8b0a8',
  hestiaHairDark: '#888078',
  hestiaSkin: '#e0d0c0',
  hestiaCloth: '#f0e8e0',
  hestiaClothShade: '#d0c8c0',
  hestiaGold: '#9a8860',
  hestiaEye: '#7a90a0',
  hestiaEyeAngry: '#a04040',

  // Charon — earth brown
  charonHair: '#6a5040',
  charonHairDark: '#4a3020',
  charonSkin: '#c0a088',
  charonCloth: '#4a4038',
  charonAccent: '#8a7050',

  // Elements
  fire: '#8a4030',
  water: '#3a5a70',
  earth: '#5a6840',
  electric: '#8a7840',

  // UI
  hp: '#6a3038',
  hpFill: '#903848',
  supplies: '#687048',
  mana: '#485868',
  gold: '#8a7050',
  danger: '#903030',
  good: '#406048',

  // Environments
  woods: '#1a2418',
  woodsFar: '#121810',
  volcano: '#2a1814',
  volcanoGlow: '#4a2818',
  fort: '#1a1c20',
  ruins: '#1c1820',
  manor: '#18141c',
  town: '#16141a',
};

export const ELEMENT_CYCLE = {
  water: 'fire',
  fire: 'earth',
  earth: 'electric',
  electric: 'water',
};

export const ELEMENT_WEAK = {
  fire: 'water',
  earth: 'fire',
  electric: 'earth',
  water: 'electric',
};

export const ATTACK_TYPES = ['slashing', 'piercing', 'blunt'];
export const ELEMENTS = ['fire', 'electric', 'earth', 'water'];
