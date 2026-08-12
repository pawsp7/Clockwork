/** Dim gothic palette — portraits (softer detail) + overworld chibi refs */
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
  white: '#e0dcd8',
  bone: '#a09888',

  skin: '#e8dcd0',
  skinShade: '#d0c0b4',
  vacantEye: '#c8d0d8',
  vacantEyeHi: '#e8f0f4',
  crown: '#2a2a30',
  shoe: '#3a3a42',

  // Alice — muted bubblegum (portrait ref, dimmed)
  aliceHair: '#c890a0',
  aliceHairDark: '#9a6878',
  aliceHairDeep: '#6e4854',
  aliceSkin: '#f0e4d8',
  aliceSkinShade: '#d8c8bc',
  aliceBlush: '#e8b0b8',
  aliceCloth: '#e8e4e0',
  aliceClothShade: '#c8c4c0',
  aliceAccent: '#b8a878',
  aliceCollar: '#f0ece8',
  aliceEye: '#6a9ab0',
  aliceEyeDark: '#2a3848',
  aliceEyeHi: '#e8f0f8',
  aliceLip: '#c87888',

  // Mitzi — pale lavender (sprite ref)
  mitziHair: '#a898b8',
  mitziHairDark: '#786888',
  mitziHairDeep: '#584868',
  mitziSkin: '#e8d4c4',
  mitziCloth: '#7a7880',
  mitziClothDark: '#5a5860',
  mitziAccent: '#a89060',
  mitziSkirt: '#8a7898',
  mitziSkirtDark: '#5a4868',
  mitziPouch: '#4a3858',
  mitziEye: '#d0d8e0',
  mitziCollar: '#e8e4e0',
  mitziShoe: '#e0dcd8',

  // Victoria — muted crimson (sprite ref)
  victoriaHair: '#8a4454',
  victoriaHairDark: '#5a2834',
  victoriaHairDeep: '#3a1820',
  victoriaSkin: '#e8e0d8',
  victoriaCloth: '#2e2e34',
  victoriaClothDark: '#1a1a20',
  victoriaRose: '#7a3038',
  victoriaEye: '#b0b8c0',
  victoriaEyeHi: '#d8e0e8',

  // Hestia — pale bone / white ox
  hestiaHair: '#c8c0b8',
  hestiaHairDark: '#989088',
  hestiaSkin: '#f0e4d8',
  hestiaBlush: '#e8b8b8',
  hestiaCloth: '#e8e0d8',
  hestiaClothShade: '#c8c0b8',
  hestiaGold: '#9a8860',
  hestiaEye: '#6a9ab0',
  hestiaEyeDark: '#2a3848',
  hestiaEyeAngry: '#a04040',
  hestiaLip: '#c87880',

  // Charon — earth brown
  charonHair: '#6a5040',
  charonHairDark: '#4a3020',
  charonSkin: '#d8c0a8',
  charonCloth: '#3a342e',
  charonAccent: '#8a7050',
  charonEye: '#6a8a70',
  charonEyeDark: '#2a3828',

  fire: '#8a4030',
  water: '#3a5a70',
  earth: '#5a6840',
  electric: '#8a7840',

  hp: '#6a3038',
  hpFill: '#903848',
  supplies: '#687048',
  mana: '#485868',
  gold: '#8a7050',
  danger: '#903030',
  good: '#406048',

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
