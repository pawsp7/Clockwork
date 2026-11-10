import { ELEMENTS, EYES, SHAPES, LIMBS } from './constants.js';

/**
 * 36 unique monsters: every combination of eye colour × body shape × limb count.
 *
 * Features lean toward a profile (eyes → element, shape → attack type,
 * limbs → weakness, shape → resistance) but about a third break the pattern,
 * so the notebook's cross-referencing is what actually pins a creature down.
 * Each dungeon holds exactly 9 species — one of every shape/limb pair.
 */

const EYE_ELEMENT = { green: 'earth', red: 'fire', blue: 'water', yellow: 'electric' };
const SHAPE_TYPE = { triangle: 'piercing', square: 'blunt', circle: 'slashing' };
const SHAPE_RESIST = { triangle: 'slashing', square: 'piercing', circle: 'blunt' };
const LIMB_WEAK = { 2: 'blunt', 4: 'piercing', 6: 'slashing' };

const EYE_WORD = { green: 'Verdigris', red: 'Ember', blue: 'Drowned', yellow: 'Sulphur' };
const NOUN = {
  triangle: { 2: 'Shardling', 4: 'Thornhound', 6: 'Spinemite' },
  square: { 2: 'Cofferling', 4: 'Kilnback', 6: 'Cratecrawler' },
  circle: { 2: 'Bulbwalker', 4: 'Lantern Toad', 6: 'Orbweaver' },
};

const TYPE_ROTATE = { piercing: 'slashing', slashing: 'blunt', blunt: 'piercing' };

function build() {
  const list = [];
  EYES.forEach((eye, e) => {
    SHAPES.forEach((shape, sh) => {
      LIMBS.forEach((limbs, l) => {
        let element = EYE_ELEMENT[eye];
        if ((e * 7 + sh * 3 + l * 5) % 3 === 0) {
          element = ELEMENTS[(ELEMENTS.indexOf(element) + 1 + ((e + l) % 3)) % 4];
        }
        let type = SHAPE_TYPE[shape];
        if ((e * 5 + sh * 2 + l * 7) % 4 === 1) type = TYPE_ROTATE[type];
        let weak = LIMB_WEAK[limbs];
        let resist = SHAPE_RESIST[shape];
        if (resist === weak) resist = null;

        const tier = ((e + sh + l) % 4) + 1;
        const hp = 5 + 3 * tier + { triangle: 0, square: 3, circle: 1 }[shape] + { 2: 1, 4: 0, 6: -1 }[limbs];
        const atk = tier + (limbs === 6 ? 1 : 0);
        const intents = {
          2: { attack: 0.42, guard: 0.38, idle: 0.2 },
          4: { attack: 0.5, guard: 0.3, idle: 0.2 },
          6: { attack: 0.6, guard: 0.18, idle: 0.22 },
        }[limbs];

        list.push({
          id: `m${list.length}`,
          index: list.length,
          name: `${EYE_WORD[eye]} ${NOUN[shape][limbs]}`,
          eye,
          shape,
          limbs,
          element,
          type,
          weak,
          resist,
          tier,
          hp,
          atk,
          intents,
        });
      });
    });
  });
  return list;
}

export const MONSTERS = build();
export const MONSTER_BY_ID = Object.fromEntries(MONSTERS.map((m) => [m.id, m]));

export function speciesForTier(tier) {
  return MONSTERS.filter((m) => m.tier === tier);
}

/** Dungeon bosses: stats 6–9 per the concept. Not part of the 36. */
export const BOSSES = {
  hollow_stag: {
    id: 'hollow_stag',
    name: 'The Hollow Stag',
    element: 'earth',
    type: 'piercing',
    weak: 'blunt',
    resist: 'slashing',
    hp: 34,
    atk: 6,
    tier: 1,
    intents: { attack: 0.45, guard: 0.22, idle: 0.13, summon: 0.2 },
    minions: 1,
    maxMinions: 2,
    blurb: 'A cathedral of antlers around an empty chest.',
  },
  cinder_maw: {
    id: 'cinder_maw',
    name: 'Cinder Maw',
    element: 'fire',
    type: 'blunt',
    weak: 'piercing',
    resist: 'blunt',
    hp: 44,
    atk: 7,
    tier: 2,
    intents: { attack: 0.35, ransack: 0.25, guard: 0.25, idle: 0.15 },
    minions: 1,
    maxMinions: 1,
    blurb: 'All mouth, no apology.',
  },
  gatewarden: {
    id: 'gatewarden',
    name: 'The Gatewarden',
    element: 'electric',
    type: 'slashing',
    weak: 'blunt',
    resist: 'piercing',
    hp: 44,
    atk: 8,
    tier: 3,
    intents: { attack: 0.35, guard: 0.28, idle: 0.1, ransack: 0.12, sweep: 0.15 },
    minions: 2,
    maxMinions: 2,
    blurb: 'An empty suit of armour that still takes its post seriously.',
  },
  reliquary: {
    id: 'reliquary',
    name: 'The Reliquary',
    element: 'water',
    type: 'piercing',
    weak: 'slashing',
    resist: 'blunt',
    hp: 60,
    atk: 9,
    tier: 4,
    intents: { attack: 0.32, guard: 0.2, idle: 0.08, summon: 0.12, ransack: 0.13, sweep: 0.15 },
    minions: 1,
    maxMinions: 2,
    blurb: 'A saint-shaped box of needles, still praying.',
  },
  white_ox: {
    id: 'white_ox',
    name: 'The White Ox',
    element: 'all',
    type: 'random',
    weak: null,
    resist: null,
    hp: 100,
    atk: 8, // 10 with Hestia's boost
    def: 2,
    wings: 0.5, // Ox Wings: resist everything, −10% each turn
    tier: 5,
    intents: { attack: 0.34, sweep: 0.22, toll: 0.18, guard: 0.1, summon: 0.16 },
    minions: 2,
    maxMinions: 2,
    blurb: 'Hestia’s true face. Its eyes stay shut. It does not need them for you.',
  },
};

/** Hollow believers the Ox calls to mass. */
export const FAITHFUL = {
  id: 'faithful',
  name: 'Hollow Faithful',
  eye: 'blue',
  shape: 'circle',
  limbs: 2,
  element: 'earth',
  type: 'blunt',
  weak: 'slashing',
  resist: null,
  hp: 14,
  atk: 4,
  intents: { attack: 0.5, guard: 0.3, idle: 0.2 },
};

export const INTENT_INFO = {
  attack: { label: 'Attack', hint: 'Will strike. Guard it, trade blows, or let it hit your supplies.' },
  ransack: { label: 'Ransack', hint: 'Goes for the cart. Unguarded, it hits supplies twice as hard.' },
  guard: { label: 'Guard', hint: 'Will block. Striking it is wasted.' },
  idle: { label: 'Idle', hint: 'Will do nothing. A free opening.' },
  summon: { label: 'Summon', hint: 'Will call another creature to its side.' },
  sweep: { label: 'Sweep', hint: 'Hits everyone not guarding it, at half strength. Guarding it protects only the guard.' },
  toll: { label: 'Toll', hint: 'Cow bells. Each hero may lose their action — unless someone guards the Ox.' },
};
