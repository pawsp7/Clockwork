/** Persistent run state for Clockwork */

export function createInitialState() {
  return {
    scene: 'title', // title | dialog | town | combat | map | ending | notebook
    flags: {
      aliceEyepatch: false,
      aliceShortHair: false,
      mitziCanStudy: false,
      mitziStudyLearnedAt: null, // 'woods'|'boss'|null
      mitziDamageMod: 1.0, // set at end of volcano
      victoriaMode: 'unknown', // 'assist'|'neutral'|'interfere' 
      hestiaSuspicion: 0, // 0-3, higher = better (suspicious)
      hestiaBoost: false,
      partyDefenseBoost: false,
      hestiaJoined: false,
      hestiaObey: 1.0, // decays in ruins
      charonAdvice: 0,
      redeemed: { mitzi: false, victoria: false, hestia: false, charon: false },
      tutorialDone: false,
      woodsDone: false,
      volcanoDone: false,
      fortDone: false,
      ruinsDone: false,
      manorReady: false,
    },
    dialogScores: {
      woods: 0, // correct answers
      woodsTotal: 0,
      volcano: 0,
      volcanoTotal: 0,
      fort: 0,
      fortTotal: 0,
      ruins: 0,
      ruinsTotal: 0,
      night: 0,
    },
    party: [
      makeChar('alice', 'Alice', 40, 2, 'slashing', 'electric', {
        weapon: "Alice's Pocket Watch",
        armour: "Alice's Frilly Collar",
        resist: { electric: 0.25 },
        weak: { water: 0.25 },
        uniqueBonus: 0.5,
      }),
      makeChar('mitzi', 'Mitzi', 20, 4, 'blunt', 'water', {
        weapon: "Mitzi's Hammer",
        armour: "Mitzi's Fur Coat",
        resist: { water: 0.25, piercing: 0.25 },
        weak: { fire: 0.25, blunt: 0.25 },
        uniqueBonus: 0.2,
        active: false, // joins after tutorial / woods start
      }),
      makeChar('victoria', 'Victoria', 30, 5, 'piercing', 'fire', {
        weapon: "Victoria's Spear",
        armour: "Victoria's Black Shawl",
        resist: { fire: 0.25, blunt: 0.25 },
        weak: { earth: 0.25, slashing: 0.25 },
        uniqueBonus: 0.2,
        active: false,
      }),
    ],
    hestia: makeChar('hestia', 'Hestia', 35, 7, 'blunt', 'earth', {
      weapon: "Hestia's Cross",
      armour: 'White Habit',
      resist: {},
      weak: {},
      uniqueBonus: 0,
      active: false,
      hiddenStats: true,
    }),
    supplies: 100,
    money: 40,
    mana: 20,
    maxMana: 20,
    inventory: {
      potions: 2,
      tonic: 1,
      gems: { fire: 0, water: 0, earth: 0, electric: 1 },
      bracelets: { alice: 1, mitzi: 1, victoria: 1, hestia: 1 },
      materials: 3,
    },
    equipment: {
      aliceWeaponPath: 'sword', // sword|whip|wand
    },
    notebook: { notes: [] },
    mercenaries: [],
    hired: [],
    dungeon: null,
    combat: null,
    storyBeat: 'intro',
    log: [],
    ending: null,
  };
}

function makeChar(id, name, hp, atk, attackType, element, extra) {
  return {
    id,
    name,
    hp,
    maxHp: hp,
    atk,
    attackType,
    element,
    manaCost: 2,
    alive: true,
    active: extra.active !== false,
    ...extra,
  };
}

export function activeParty(state) {
  const list = state.party.filter((c) => c.active && c.alive);
  if (state.flags.hestiaJoined && state.hestia.active && state.hestia.alive) {
    list.push(state.hestia);
  }
  for (const m of state.hired) {
    if (m.alive) list.push(m);
  }
  return list;
}

export function consumeSupplies(state, reason = 'travel') {
  const n = Math.max(1, activeParty(state).length);
  state.supplies = Math.max(0, state.supplies - n);
  state.log.push(`Supplies -${n} (${reason}).`);
  return state.supplies > 0;
}

export function restAtInn(state) {
  for (const c of state.party) {
    c.hp = c.maxHp;
    c.alive = true;
  }
  if (state.hestia) {
    state.hestia.hp = state.hestia.maxHp;
    state.hestia.alive = true;
  }
  for (const m of state.hired) {
    m.hp = m.maxHp;
    m.alive = true;
  }
  state.mana = state.maxMana;
  state.supplies = Math.min(100, state.supplies + 25);
  state.log.push('Rested at the Inn. Health and mana restored.');
}

export function mitziAttack(state) {
  const base = state.party.find((c) => c.id === 'mitzi').atk;
  // dialog sets 4-8 range via damage mod applied to effective
  const mod = state.flags.mitziDamageMod;
  // before volcano end, use mid value scaling with volcano score progress
  if (!state.flags.volcanoDone) {
    const progress = state.dialogScores.volcanoTotal
      ? state.dialogScores.volcano / state.dialogScores.volcanoTotal
      : 0.5;
    return 4 + Math.round(progress * 4);
  }
  return Math.round(base * mod);
}
