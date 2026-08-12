import { ATTACK_TYPES, ELEMENTS } from './palette.js';

/** 36 unique monsters with eye / shape / limbs + attack profile */
const EYES = ['green', 'red', 'blue', 'yellow'];
const SHAPES = ['triangle', 'square', 'circle'];
const LIMBS = [2, 4, 6];

function hashPick(seed, arr) {
  return arr[Math.abs(seed) % arr.length];
}

function buildMonsters() {
  const list = [];
  let i = 0;
  for (const eye of EYES) {
    for (const shape of SHAPES) {
      for (const limbs of LIMBS) {
        const seed = i * 17 + eye.length * 3 + shape.length * 5 + limbs;
        const element = hashPick(seed, ELEMENTS);
        const attackType = hashPick(seed * 3, ATTACK_TYPES);
        const weakType = hashPick(seed * 7, ATTACK_TYPES);
        const resistType = hashPick(seed * 11, ATTACK_TYPES.filter((t) => t !== weakType));
        list.push({
          id: `m${i}`,
          name: shadowedName(eye, shape, limbs),
          eye,
          shape,
          limbs,
          element,
          attackType,
          weakType,
          resistType,
          baseAtk: 2 + Math.floor(i / 9),
          baseHp: 8 + Math.floor(i / 6) * 2,
        });
        i++;
      }
    }
  }
  return list;
}

function shadowedName(eye, shape, limbs) {
  const e = { green: 'Verdant', red: 'Crimson', blue: 'Azure', yellow: 'Amber' }[eye];
  const s = { triangle: 'Wedge', square: 'Block', circle: 'Orb' }[shape];
  return `${e} ${s}-${limbs}`;
}

export const MONSTERS = buildMonsters();

export function monstersForDungeon(dungeonIndex) {
  // each dungeon gets a band of monsters + some repeats
  const start = dungeonIndex * 8;
  const pool = [];
  for (let i = 0; i < 20; i++) {
    pool.push(MONSTERS[(start + (i % 12)) % MONSTERS.length]);
  }
  return pool;
}

export function makeEncounter(dungeonIndex, battleIndex) {
  const pool = monstersForDungeon(dungeonIndex);
  const count = 1 + ((battleIndex + dungeonIndex) % 4); // 1-4
  const enemies = [];
  for (let i = 0; i < count; i++) {
    const proto = pool[(battleIndex * 3 + i * 5) % pool.length];
    const tier = 1 + dungeonIndex;
    enemies.push({
      ...proto,
      instanceId: `${proto.id}_${battleIndex}_${i}`,
      hp: proto.baseHp + tier * 3,
      maxHp: proto.baseHp + tier * 3,
      atk: proto.baseAtk + tier,
      knownFeatures: { eye: false, shape: false, limbs: false },
      identified: false,
      nextIntent: null,
      elementWeakNext: null,
      alive: true,
    });
  }
  return enemies;
}

/** Notebook: trait -> observed attack/element/weak notes */
export function createNotebook() {
  return {
    notes: [], // { trait: 'eye:green'|'shape:circle'|'limbs:2', tags: ['E.P', 'WeakFire', ...] }
  };
}

export function traitKey(kind, value) {
  return `${kind}:${value}`;
}

export function addNotebookObservation(notebook, enemy, featureKind) {
  const value = enemy[featureKind];
  const key = traitKey(featureKind, value);
  let entry = notebook.notes.find((n) => n.trait === key);
  if (!entry) {
    entry = { trait: key, tags: [] };
    notebook.notes.push(entry);
  }
  const tags = [];
  const elShort = { fire: 'F', electric: 'E', earth: 'G', water: 'W' }[enemy.element];
  const atShort = { piercing: 'P', slashing: 'S', blunt: 'B' }[enemy.attackType];
  tags.push(`${elShort}.${atShort}`);
  tags.push(`Weak${enemy.weakType[0].toUpperCase()}`);
  if (enemy.resistType) tags.push(`Resist${enemy.resistType[0].toUpperCase()}`);
  for (const t of tags) {
    if (!entry.tags.includes(t)) entry.tags.push(t);
  }
  return { featureKind, value, tags };
}

export function inferEnemy(notebook, enemy) {
  const known = [];
  if (enemy.knownFeatures.eye) known.push(traitKey('eye', enemy.eye));
  if (enemy.knownFeatures.shape) known.push(traitKey('shape', enemy.shape));
  if (enemy.knownFeatures.limbs) known.push(traitKey('limbs', enemy.limbs));

  const tagSets = known.map((k) => {
    const e = notebook.notes.find((n) => n.trait === k);
    return e ? new Set(e.tags) : new Set();
  });

  if (tagSets.length === 0) return { attackGuess: null, elementGuess: null, weakGuess: null, certainty: 0 };

  // intersection of tags across known traits
  let inter = tagSets[0];
  for (let i = 1; i < tagSets.length; i++) {
    inter = new Set([...inter].filter((x) => tagSets[i].has(x)));
  }
  const attackGuess = [...inter].find((t) => /^\w\.\w$/.test(t)) || null;
  const weakGuess = [...inter].find((t) => t.startsWith('Weak')) || null;
  return {
    attackGuess,
    elementGuess: attackGuess ? attackGuess[0] : null,
    weakGuess,
    certainty: known.length,
    tags: [...inter],
  };
}
