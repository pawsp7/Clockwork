/** Party members, signature weapons and character-exclusive armour (from the concept doc). */

export const HEROES = {
  alice: {
    id: 'alice',
    name: 'Alice',
    color: '#d895a8',
    maxHp: 40,
    baseAtk: 2,
    weapon: 'watch',
    gem: 'electric',
    armours: ['frilly_collar', 'moon_hairpiece'],
    blurb: 'Fell through a pocket watch. Sees one move ahead.',
  },
  mitzi: {
    id: 'mitzi',
    name: 'Mitzi',
    color: '#a998c4',
    maxHp: 20,
    baseAtk: 6, // 4–8, set by the Volcano dialog
    weapon: 'hammer',
    gem: 'water',
    armours: ['fur_coat', 'purple_rose'],
    blurb: 'Hosts gatherings. Avoids effort. Notices more than she lets on.',
  },
  victoria: {
    id: 'victoria',
    name: 'Victoria',
    color: '#b45a68',
    maxHp: 30,
    baseAtk: 5,
    weapon: 'spear',
    gem: 'fire',
    armours: ['black_shawl', 'red_rose'],
    blurb: 'Steps in front of her sister. Always.',
  },
  hestia: {
    id: 'hestia',
    name: 'Hestia',
    color: '#e6ddd0',
    maxHp: 35,
    baseAtk: 7,
    weapon: 'cross',
    gem: 'earth',
    armours: ['white_habit'],
    blurb: 'Keeper of the White Ox gospel. Her strength is her own business.',
  },
};

export const WEAPONS = {
  watch: {
    name: "Alice's Pocket Watch",
    forms: {
      sword: { type: 'slashing', label: 'Sword' },
      whip: { type: 'blunt', label: 'Whip' },
      wand: { type: 'piercing', label: 'Wand' },
    },
    unique: 0.5,
    note: '+50% attack while Alice wields it. Reforge it to keep it sharp.',
    lore: 'Found in a drawer of broken things above ground. In Gehenna it unfolds into a blade, a whip or a wand — and it ticks one move ahead of everyone else.',
  },
  hammer: {
    name: "Mitzi's Hammer",
    type: 'blunt',
    unique: 0.2,
    note: '+20% attack with hammers.',
    lore: 'Heavier than it looks. For years Victoria carried it for her “in case”. Mitzi is only now finding out what it weighs.',
  },
  spear: {
    name: "Victoria's Spear",
    type: 'piercing',
    unique: 0.2,
    note: '+20% attack with spears.',
    lore: 'Black-hafted and never lowered — not in empty halls, not at the dinner table, not while Mitzi sleeps.',
  },
  cross: {
    name: "Hestia's Cross",
    type: 'random',
    unique: 0,
    note: 'Its edge changes with every swing.',
    lore: 'Gold on a chain. It cuts differently every time, as if it hasn’t decided what it is. Neither has she, she says.',
  },
};

/** resist / weak: map of element or attack type → magnitude */
export const ARMOURS = {
  frilly_collar: {
    name: "Alice's Frilly Collar",
    resist: { electric: 0.5 },
    weak: { water: 0.5 },
    flavour: 'Starched stiff enough to stop a spark.',
  },
  moon_hairpiece: {
    name: 'Moon Hairpiece',
    resist: { slashing: 0.5 },
    weak: { piercing: 0.5 },
    flavour: 'A crescent of tin that turns a blade aside.',
  },
  fur_coat: {
    name: "Mitzi's Fur Coat",
    resist: { water: 0.5 },
    weak: { fire: 0.5 },
    flavour: "It's water resistant. It is not fire resistant.",
  },
  purple_rose: {
    name: 'Purple Rose',
    resist: { piercing: 0.5 },
    weak: { blunt: 0.5 },
    flavour: 'Shrugs off her sister’s spear. Folds to her own hammer.',
  },
  black_shawl: {
    name: "Victoria's Black Shawl",
    resist: { fire: 0.5 },
    weak: { earth: 0.5 },
    flavour: 'Smells of smoke and something stronger.',
  },
  red_rose: {
    name: 'Red Rose',
    resist: { blunt: 0.5 },
    weak: { slashing: 0.5 },
    flavour: 'Holds tight. Too tight.',
  },
  white_habit: {
    name: 'White Habit',
    resist: {},
    weak: {},
    flavour: 'Spotless. Suspiciously so.',
  },
};

/** Second armours are crafted at the Smithy. */
export const ARMOUR_CRAFT = {
  moon_hairpiece: { coins: 30, materials: 2, hero: 'alice' },
  purple_rose: { coins: 30, materials: 2, hero: 'mitzi' },
  red_rose: { coins: 30, materials: 2, hero: 'victoria' },
};

export const REFORGE_COST = [null, { coins: 20, materials: 1 }, { coins: 45, materials: 2 }, { coins: 80, materials: 3 }];
export const MAX_WEAPON_LEVEL = 4;

export const BRACELET_COST = [null, { coins: 30, materials: 1 }, { coins: 70, materials: 3 }, { coins: 140, materials: 5 }];
export const MAX_SLOTS = 4;
