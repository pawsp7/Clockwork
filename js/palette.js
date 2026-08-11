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
  aliceHair: '#8a5a68',
  aliceHairDark: '#5a3844',
  aliceSkin: '#c4a898',
  aliceSkinShade: '#a88878',
  aliceCloth: '#908078',
  aliceAccent: '#7a6870',
  aliceEye: '#6a7a88',

  // Mitzi — desaturated lavender
  mitziHair: '#6a5a78',
  mitziHairDark: '#443850',
  mitziSkin: '#c0a898',
  mitziCloth: '#5a5860',
  mitziAccent: '#7a6a50',
  mitziSkirt: '#584868',
  mitziEye: '#98a0a8',

  // Victoria — muted burgundy
  victoriaHair: '#6a3040',
  victoriaHairDark: '#401820',
  victoriaSkin: '#c0a090',
  victoriaCloth: '#2a282c',
  victoriaRose: '#6a2830',
  victoriaEye: '#889090',

  // Hestia — pale bone / white ox
  hestiaHair: '#a8a098',
  hestiaHairDark: '#787068',
  hestiaSkin: '#d0c0b0',
  hestiaCloth: '#e8e0d8',
  hestiaClothShade: '#c0b8b0',
  hestiaGold: '#8a7850',
  hestiaEye: '#6a8090',
  hestiaEyeAngry: '#903030',

  // Charon — earth brown
  charonHair: '#5a4030',
  charonHairDark: '#3a2818',
  charonSkin: '#b09078',
  charonCloth: '#3a3028',
  charonAccent: '#7a6040',

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
