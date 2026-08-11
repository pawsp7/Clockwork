import { ELEMENT_CYCLE, ELEMENT_WEAK } from './palette.js';
import { addNotebookObservation, inferEnemy, makeEncounter } from './monsters.js';
import { activeParty, consumeSupplies, mitziAttack } from './state.js';

const INTENTS = ['attack', 'block', 'idle'];

export function startCombat(state, opts) {
  const {
    dungeonIndex = 0,
    battleIndex = 0,
    enemies = null,
    isBoss = false,
    bossId = null,
    tutorial = false,
    label = 'Battle',
  } = opts;

  let foes;
  if (enemies) foes = enemies;
  else if (isBoss && bossId === 'white_ox') foes = [makeWhiteOx(state)];
  else if (isBoss && bossId === 'woods_boss') foes = [makeDungeonBoss(0)];
  else if (isBoss && bossId === 'volcano_boss') foes = [makeDungeonBoss(1)];
  else if (isBoss && bossId === 'fort_boss') foes = [makeDungeonBoss(2)];
  else if (isBoss && bossId === 'ruins_boss') foes = [makeDungeonBoss(3)];
  else foes = makeEncounter(dungeonIndex, battleIndex);

  // roll intents
  for (const e of foes) rollIntent(e, tutorial);

  if (tutorial) {
    // scripted first intents: idle, attack
    if (foes[0]) foes[0].nextIntent = 'idle';
    if (foes[1]) foes[1].nextIntent = 'attack';
    foes._tutorialStep = 0;
  }

  state.combat = {
    label,
    dungeonIndex,
    battleIndex,
    enemies: foes,
    isBoss,
    bossId,
    tutorial,
    turn: 1,
    phase: 'select', // select | resolve | won | lost
    selectedFront: activeParty(state)[0]?.id || 'alice',
    selectedAction: null, // attack | block | study | item
    studyTarget: null,
    visionTarget: 0, // which enemy Alice sees
    log: [],
    payloadHits: 0,
    hestiaRandomAtk: null,
  };

  if (!tutorial) {
    consumeSupplies(state, 'battle');
    // bandage between fights
    for (const p of activeParty(state)) {
      if (p.alive) p.hp = Math.min(p.maxHp, p.hp + 3);
    }
  }

  // Hestia randomize
  if (state.flags.hestiaJoined) {
    state.hestia.atk = 6 + Math.floor(Math.random() * 4);
    state.combat.hestiaRandomAtk = state.hestia.atk;
  }

  state.scene = 'combat';
  return state.combat;
}

function makeDungeonBoss(d) {
  const hp = 28 + d * 12;
  return {
    id: `boss_d${d}`,
    instanceId: `boss_d${d}`,
    name: ['Hollow Stag', 'Cinder Maw', 'Fort Wraith', 'Ruin Sentinel'][d],
    eye: ['red', 'yellow', 'blue', 'green'][d],
    shape: ['triangle', 'square', 'circle', 'square'][d],
    limbs: [4, 6, 2, 4][d],
    element: ['earth', 'fire', 'electric', 'water'][d],
    attackType: ['piercing', 'slashing', 'blunt', 'piercing'][d],
    weakType: ['blunt', 'blunt', 'slashing', 'slashing'][d],
    resistType: ['slashing', 'piercing', 'blunt', 'blunt'][d],
    hp,
    maxHp: hp,
    atk: 5 + d * 2,
    knownFeatures: { eye: false, shape: false, limbs: false },
    identified: false,
    nextIntent: 'attack',
    elementWeakNext: null,
    alive: true,
    isBoss: true,
  };
}

function makeWhiteOx(state) {
  const atk = state.flags.hestiaBoost ? 10 : 8;
  return {
    id: 'white_ox',
    instanceId: 'white_ox',
    name: 'The White Ox',
    eye: 'red',
    shape: 'square',
    limbs: 4,
    element: 'earth',
    attackType: 'blunt',
    weakType: 'slashing',
    resistType: null,
    hp: 120,
    maxHp: 120,
    atk,
    defense: 7,
    knownFeatures: { eye: true, shape: true, limbs: true },
    identified: true,
    nextIntent: 'attack',
    elementWeakNext: null,
    alive: true,
    isBoss: true,
    oxWingsResist: 0.5,
    cowBellChance: 0.25,
    allElements: true,
  };
}

function rollIntent(e, tutorial) {
  if (tutorial) return;
  const r = Math.random();
  if (r < 0.5) e.nextIntent = 'attack';
  else if (r < 0.8) e.nextIntent = 'block';
  else e.nextIntent = 'idle';
}

export function visibleIntent(combat, enemyIndex) {
  // Alice sees one enemy's future move
  if (enemyIndex === combat.visionTarget) return combat.enemies[enemyIndex]?.nextIntent;
  return null;
}

export function setVisionTarget(combat, index) {
  if (index >= 0 && index < combat.enemies.length) combat.visionTarget = index;
}

function damageMultiplier(attacker, defender, state) {
  let mult = 1;
  // attack type resist/weak on defender armour
  if (defender.resist && defender.resist[attacker.attackType]) {
    mult -= defender.resist[attacker.attackType];
  }
  if (defender.weak && defender.weak[attacker.attackType]) {
    mult += defender.weak[attacker.attackType];
  }
  // elemental
  if (attacker.element && defender.element) {
    if (ELEMENT_CYCLE[attacker.element] === defender.element) mult += 0.5;
    if (ELEMENT_WEAK[attacker.element] === defender.element) mult -= 0.5;
  }
  // enemy type resist
  if (defender.resistType === attacker.attackType) mult -= 0.5;
  if (defender.weakType === attacker.attackType) mult += 0.5;
  // element weak next turn
  if (defender.elementWeakNext && attacker.element === defender.elementWeakNext) mult += 0.75;
  // ox wings
  if (defender.oxWingsResist) mult -= defender.oxWingsResist;
  // party defense boost
  if (state?.flags?.partyDefenseBoost && defender.id && !defender.eye) mult -= 0.25;
  return Math.max(0.25, mult);
}

function calcAtk(char, state) {
  let atk = char.atk;
  if (char.id === 'mitzi') atk = mitziAttack(state);
  if (char.id === 'alice' && char.uniqueBonus) atk = Math.round(atk * (1 + char.uniqueBonus));
  if (char.id === 'mitzi' && char.uniqueBonus) atk = Math.round(atk * (1 + char.uniqueBonus));
  if (char.id === 'victoria' && char.uniqueBonus) atk = Math.round(atk * (1 + char.uniqueBonus));
  if (char.id === 'hestia' && state.flags.hestiaJoined) {
    // obedience decay — may ignore and freestyle
    if (Math.random() > state.flags.hestiaObey) {
      atk = 6 + Math.floor(Math.random() * 4);
    }
  }
  return atk;
}

/** Player commits front + action, then resolve the round */
export function resolveRound(state) {
  const c = state.combat;
  if (!c || c.phase !== 'select') return;
  const party = activeParty(state);
  const front = party.find((p) => p.id === c.selectedFront) || party[0];
  const action = c.selectedAction;
  const log = [];

  // Victoria interfere
  if (
    front?.id === 'mitzi' &&
    action === 'attack' &&
    state.flags.victoriaMode === 'interfere' &&
    party.some((p) => p.id === 'victoria' && p.alive)
  ) {
    log.push('Victoria steps in front of Mitzi — "I\'ll handle this."');
    c.selectedFront = 'victoria';
  }

  const actor = party.find((p) => p.id === c.selectedFront) || front;

  // Cow bell may change action
  const ox = c.enemies.find((e) => e.id === 'white_ox' && e.alive);
  if (ox && Math.random() < (ox.cowBellChance || 0)) {
    log.push('Cow bells chime — your action warps!');
    c.selectedAction = Math.random() < 0.5 ? 'block' : 'attack';
  }

  // Study action
  if (c.selectedAction === 'study') {
    const target = c.enemies[c.studyTarget ?? 0];
    if (target && target.alive) {
      if (!state.flags.mitziCanStudy && actor.id !== 'alice') {
        log.push(`${actor.name} hesitates — studying enemies isn't second nature yet.`);
      } else {
        const kinds = ['eye', 'shape', 'limbs'];
        const unknown = kinds.filter((k) => !target.knownFeatures[k]);
        if (unknown.length === 0) {
          log.push(`${target.name} is fully noted.`);
          target.identified = true;
        } else {
          const kind = unknown[0];
          target.knownFeatures[kind] = true;
          const obs = addNotebookObservation(state.notebook, target, kind);
          log.push(`${actor.name} studies... ${kind}: ${obs.value}.`);
          log.push(`Notebook: ${obs.tags.join(', ')}`);
          if (Object.values(target.knownFeatures).every(Boolean)) {
            target.identified = true;
            log.push(`Identified: ${target.name}!`);
          }
          // infer
          const inf = inferEnemy(state.notebook, target);
          if (inf.attackGuess) log.push(`Inference: likely ${inf.attackGuess}`);
        }
      }
    }
  }

  // Player attack
  if (c.selectedAction === 'attack') {
    const targets = c.enemies.filter((e) => e.alive);
    // prefer non-blocking, else first
    let target = targets.find((e) => e.nextIntent !== 'block') || targets[0];
    if (!target) {
      log.push('No targets.');
    } else if (target.nextIntent === 'block') {
      log.push(`${target.name || 'Enemy'} blocks — no damage.`);
    } else {
      let atk = calcAtk(actor, state);
      // gem / mana embue
      if (state.mana >= 2 && actor.element) {
        state.mana -= 2;
      }
      const mult = damageMultiplier(
        { attackType: actor.attackType, element: actor.element },
        target,
        state
      );
      // defense subtract mode for ox
      let dmg = Math.max(1, Math.round(atk * mult));
      if (target.defense) dmg = Math.max(1, dmg - Math.floor(target.defense / 2));
      target.hp -= dmg;
      log.push(`${actor.name} strikes ${target.identified ? target.name : 'the shadow'} for ${dmg}.`);
      if (actor.element) target.elementWeakNext = ELEMENT_CYCLE[actor.element];
      if (target.hp <= 0) {
        target.alive = false;
        target.hp = 0;
        log.push(`${target.identified ? target.name : 'Enemy'} falls.`);
      }
    }
  }

  if (c.selectedAction === 'block') {
    log.push(`${actor.name} braces to intercept.`);
  }

  // Victoria assist chance
  let assistBlock = false;
  if (state.flags.victoriaMode === 'assist' && Math.random() < 0.35) {
    assistBlock = true;
    log.push('Victoria partially shields Mitzi!');
  }

  // Enemy actions — payload damage one at a time
  const blockers = new Set();
  if (c.selectedAction === 'block') blockers.add(actor.id);
  // each char can block one enemy — simplify: front blocker covers vision target or first attacker
  let blockCharges = c.selectedAction === 'block' ? 1 : 0;
  if (assistBlock) blockCharges += 1;

  for (const e of c.enemies) {
    if (!e.alive) continue;
    if (e.nextIntent === 'idle') {
      log.push(`${e.identified ? e.name : 'Shadow'} idles.`);
      continue;
    }
    if (e.nextIntent === 'block') {
      log.push(`${e.identified ? e.name : 'Shadow'} guards.`);
      continue;
    }
    // attack
    if (blockCharges > 0) {
      blockCharges--;
      const mult = damageMultiplier(
        { attackType: e.attackType, element: e.element },
        actor,
        state
      );
      let dmg = Math.max(1, Math.round(e.atk * mult * (assistBlock ? 0.5 : 0.35)));
      actor.hp -= dmg;
      log.push(`${actor.name} blocks — still takes ${dmg} glancing.`);
      if (e.element) actor._elWeak = ELEMENT_CYCLE[e.element];
      if (actor.hp <= 0) {
        actor.hp = 0;
        actor.alive = false;
        log.push(`${actor.name} is down!`);
      }
    } else {
      // hits payload — applied one at a time
      const pdmg = Math.max(1, Math.round(e.atk * 0.45));
      state.supplies = Math.max(0, state.supplies - pdmg);
      c.payloadHits++;
      log.push(`Unblocked hit drains supplies by ${pdmg}!`);
    }
    // ox wings degrade
    if (e.oxWingsResist != null) {
      e.oxWingsResist = Math.max(0, e.oxWingsResist - 0.1);
    }
  }

  // Element weak next for party (store on char)
  for (const p of party) {
    if (p._elWeak) {
      p.elementWeakNext = p._elWeak;
      delete p._elWeak;
    } else {
      p.elementWeakNext = null;
    }
  }

  c.log = log;
  c.turn += 1;

  // tutorial scripting next intents
  if (c.tutorial) {
    advanceTutorialIntents(c);
  } else {
    for (const e of c.enemies) {
      if (e.alive) {
        e.elementWeakNext = e.elementWeakNext; // keep if set by player element
        rollIntent(e);
      }
    }
  }

  // Hestia obedience decay in ruins
  if (state.flags.hestiaJoined && c.dungeonIndex === 3) {
    state.flags.hestiaObey = Math.max(0.2, state.flags.hestiaObey - 0.08);
  }

  // win/loss
  if (c.enemies.every((e) => !e.alive)) {
    c.phase = 'won';
    log.push('Victory.');
    const reward = 4 + (c.dungeonIndex || 0) * 2 + (c.isBoss ? 12 : 0);
    state.money += reward;
    if (Math.random() < 0.35) state.inventory.materials += 1;
    log.push(`Loot: +${reward} coin.`);
    // learn study on woods boss if never learned
    if (c.bossId === 'woods_boss' && !state.flags.mitziCanStudy) {
      state.flags.mitziCanStudy = true;
      state.flags.mitziStudyLearnedAt = 'boss';
      log.push('Mitzi, pressed by fear, finally studies the foe.');
    }
  } else if (state.supplies <= 0 || activeParty(state).length === 0) {
    c.phase = 'lost';
    log.push('The party collapses...');
  } else {
    c.phase = 'select';
    c.selectedAction = null;
    c.selectedFront = activeParty(state)[0]?.id || c.selectedFront;
  }
}

function advanceTutorialIntents(c) {
  c._tutorialStep = (c._tutorialStep || 0) + 1;
  const step = c._tutorialStep;
  // Doc beats: idle+attack → attack+block → block+unknown → one blocking thereafter
  if (step === 1) {
    if (c.enemies[0]) c.enemies[0].nextIntent = 'attack';
    if (c.enemies[1]) c.enemies[1].nextIntent = 'block';
  } else if (step === 2) {
    if (c.enemies[0]) c.enemies[0].nextIntent = 'block';
    if (c.enemies[1]) c.enemies[1].nextIntent = 'attack';
  } else {
    // Keep exactly one blocker so the other remains a valid damage target
    const alive = c.enemies.filter((e) => e.alive);
    if (alive.length >= 2) {
      alive[0].nextIntent = 'block';
      alive[1].nextIntent = step % 2 === 0 ? 'attack' : 'idle';
    } else if (alive[0]) {
      alive[0].nextIntent = 'attack';
    }
  }
}

export function applyItem(state, item) {
  const c = state.combat;
  if (item === 'potion' && state.inventory.potions > 0) {
    state.inventory.potions--;
    const party = activeParty(state);
    const hurt = party.sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
    if (hurt) {
      hurt.hp = Math.min(hurt.maxHp, hurt.hp + 15);
      c.log = [`Used potion on ${hurt.name}.`];
    }
  } else if (item === 'tonic' && state.inventory.tonic > 0) {
    state.inventory.tonic--;
    state.mana = Math.min(state.maxMana, state.mana + 10);
    c.log = ['Tonic restores mana.'];
  }
}
