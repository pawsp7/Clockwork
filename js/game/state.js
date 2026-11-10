import { HEROES, WEAPONS, ARMOURS } from '../data/heroes.js';
import { RULES } from '../data/constants.js';

export const SAVE_VERSION = 3;

function makeHero(id) {
  const h = HEROES[id];
  return {
    id,
    kind: 'hero',
    name: h.name,
    hp: h.maxHp,
    maxHp: h.maxHp,
    armour: h.armours[0],
    ownedArmours: [h.armours[0]],
    weaponLevel: 1,
    form: id === 'alice' ? 'sword' : null,
    bracelet: { slots: 1, gems: [h.gem] },
  };
}

export function createState() {
  return {
    version: SAVE_VERSION,
    chapter: 0,
    cleared: { woods: false, volcano: false, fort: false, ruins: false, manor: false },
    unlocked: { woods: false, volcano: false, fort: false, ruins: false, manor: false },
    pendingRest: null, // scene id that plays when resting at the Inn
    objective: 'Survive.',
    heroes: {
      alice: makeHero('alice'),
      mitzi: makeHero('mitzi'),
      victoria: makeHero('victoria'),
      hestia: makeHero('hestia'),
    },
    roster: ['alice'],
    mercPool: [],
    hired: [],
    mercLevels: {}, // template id → times used
    supplies: RULES.supplyMax,
    mana: RULES.manaMax,
    maxMana: RULES.manaMax,
    coins: 30,
    materials: 2,
    items: { salve: 2, panacea: 0, salts: 1 },
    gems: { fire: 0, water: 0, earth: 0, electric: 0 },
    notebook: { unlocked: false, traits: {}, species: {}, known: {}, fresh: [] },
    quests: { board: [], active: [], completed: 0 },
    flags: {
      shortHair: false,
      eyepatch: false,
      mitziStudy: null, // 'woods' | 'boss' | 'night'
      mitziAtk: 6,
      mitziLocked: false,
      victoriaMode: 'protective', // protective (story) → assist | neutral | interfere
      victoriaRedeemed: false,
      mitziRedeemed: false,
      hestiaBoost: false,
      partyDefense: false,
      hestiaObey: 1,
      hestiaWary: 0,
      aliceUp: 0,
      nightTalk: null,
      finalChoice: null,
      metHestia: false,
      seenTownIntro: false,
    },
    scores: {
      woods: { good: 0, total: 0 },
      volcano: { good: 0, total: 0 },
      fort: { good: 0, total: 0 },
      ruins: { good: 0, total: 0 },
    },
    expedition: null,
    stats: { battles: 0, kills: 0, rounds: 0, payloadLost: 0, identified: 0, rewinds: 0 },
    ending: null,
  };
}

/** Everyone who takes a turn in combat, in frontline order. */
export function partyMembers(state) {
  const list = state.roster.map((id) => state.heroes[id]);
  for (const m of state.hired) list.push(m);
  return list;
}

export function livingMembers(state) {
  return partyMembers(state).filter((m) => m.hp > 0);
}

export function memberById(state, id) {
  return state.heroes[id] || state.hired.find((m) => m.uid === id) || null;
}

export function memberId(m) {
  return m.kind === 'merc' ? m.uid : m.id;
}

export function weaponType(state, m, combat) {
  if (m.kind === 'merc') return m.type;
  if (m.id === 'alice') return WEAPONS.watch.forms[m.form].type;
  if (m.id === 'hestia') return combat?.hestiaType || 'blunt';
  return WEAPONS[HEROES[m.id].weapon].type;
}

/** Attack value before multipliers. */
export function attackPower(state, m, combat) {
  if (m.kind === 'merc') return m.atk;
  const lvl = m.weaponLevel - 1;
  switch (m.id) {
    case 'alice':
      return (HEROES.alice.baseAtk + lvl) * (1 + WEAPONS.watch.unique);
    case 'mitzi':
      return (state.flags.mitziAtk + lvl) * (1 + WEAPONS.hammer.unique);
    case 'victoria':
      return (HEROES.victoria.baseAtk + lvl) * (1 + WEAPONS.spear.unique);
    case 'hestia':
      return combat?.hestiaAtk ?? 7;
    default:
      return 3;
  }
}

export function armourMods(m) {
  if (m.kind === 'merc') return { resist: {}, weak: {} };
  return ARMOURS[m.armour] || { resist: {}, weak: {} };
}

export function visionCount(state) {
  return state.heroes.alice.weaponLevel >= 3 ? 2 : 1;
}

export function memberGems(m) {
  return m.kind === 'merc' ? [m.gem] : m.bracelet.gems.filter(Boolean);
}

export function healAll(state) {
  for (const m of partyMembers(state)) m.hp = m.maxHp;
  state.heroes.hestia.hp = state.heroes.hestia.maxHp;
  state.mana = state.maxMana;
}

export function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// ─── Persistence ───────────────────────────────────────────────────────────

const KEY = 'clockwork.save';

function storage() {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

export function saveGame(state, slot = 'auto') {
  const ls = storage();
  if (!ls) return false;
  try {
    ls.setItem(`${KEY}.${slot}`, JSON.stringify({ at: Date.now(), state }));
    return true;
  } catch {
    return false;
  }
}

export function loadGame(slot = 'auto') {
  const ls = storage();
  if (!ls) return null;
  try {
    const raw = ls.getItem(`${KEY}.${slot}`);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data?.state || data.state.version !== SAVE_VERSION) return null;
    return data;
  } catch {
    return null;
  }
}

export function clearSaves() {
  const ls = storage();
  if (!ls) return;
  try {
    ls.removeItem(`${KEY}.auto`);
    ls.removeItem(`${KEY}.rewind`);
  } catch {
    /* ignore */
  }
}
