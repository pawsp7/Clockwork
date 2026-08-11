import { getDialog } from './dialog.js';
import { startCombat } from './combat.js';
import { restAtInn } from './state.js';

/** Apply dialog effects & scorekeeping */
export function applyChoiceEffects(state, choice) {
  if (!choice) return;

  if (choice.score) {
    state.dialogScores[`${choice.score}Total`] =
      (state.dialogScores[`${choice.score}Total`] || 0) + 1;
    if (choice.good) {
      state.dialogScores[choice.score] = (state.dialogScores[choice.score] || 0) + 1;
    }
  }

  const e = choice.effect || {};
  if (e.mitziEncourage > 0 || e.forceStudyUnlock) {
    // accumulate woods goodness — unlock study if enough good answers before boss
    maybeUnlockMitziStudy(state);
  }
  if (e.forceStudyUnlock) {
    state.flags.mitziCanStudy = true;
    state.flags.mitziStudyLearnedAt = 'woods';
  }
  if (e.mitziDmg) {
    state._mitziDmgAcc = (state._mitziDmgAcc || 0) + e.mitziDmg;
  }
  if (e.victoriaPoint) {
    state._vicAcc = (state._vicAcc || 0) + e.victoriaPoint;
  }
  if (e.hestiaSus) {
    state.flags.hestiaSuspicion = Math.max(
      0,
      Math.min(3, state.flags.hestiaSuspicion + e.hestiaSus)
    );
  }
  if (e.aliceShortHair) state.flags.aliceShortHair = true;
  if (e.aliceEyepatch) state.flags.aliceEyepatch = true;
  if (e.redeemMitzi) {
    state.flags.redeemed.mitzi = true;
    if (state.flags.mitziDamageMod < 1.2) state.flags.mitziDamageMod = 1.25;
    if (!state.flags.mitziCanStudy) {
      state.flags.mitziCanStudy = true;
      state.flags.mitziStudyLearnedAt = 'night';
    }
  }
  if (e.redeemVictoria) {
    state.flags.redeemed.victoria = true;
    state.flags.victoriaMode = 'assist';
  }
  if (e.redeemCharon) {
    state.flags.redeemed.charon = true;
    state.flags.charonAdvice += 1;
  }
  if (e.redeemHestia) {
    // difficult — 40% chance neutralize / gain
    if (Math.random() < 0.4) {
      state.flags.redeemed.hestia = true;
      state.flags.hestiaBoost = false;
      state.flags.partyDefenseBoost = true;
    }
  }
  if (e.redeemHestiaMaybe) {
    if (Math.random() < 0.25) {
      state.flags.hestiaBoost = false;
      state.flags.redeemed.hestia = true;
    }
  }
  if (e.hestiaNightFail) state.flags.hestiaBoost = true;
  if (e.endingPush) state._endingPush = e.endingPush;
}

export function applyNodeEffects(state, node) {
  if (!node?.effect) return;
  if (node.effect.aliceShortHair) state.flags.aliceShortHair = true;
  if (node.effect.aliceEyepatch) state.flags.aliceEyepatch = true;
}

function maybeUnlockMitziStudy(state) {
  const s = state.dialogScores;
  // need several good woods answers (3+) and at least 3-5 battles worth of pressure
  if (!state.flags.mitziCanStudy && s.woods >= 3) {
    state.flags.mitziCanStudy = true;
    state.flags.mitziStudyLearnedAt = 'woods';
  }
}

export function finalizeDungeonFlags(state, dungeon) {
  if (dungeon === 'woods') {
    state.flags.woodsDone = true;
    state.party.find((c) => c.id === 'mitzi').active = true;
    state.party.find((c) => c.id === 'victoria').active = true;
  }
  if (dungeon === 'volcano') {
    state.flags.volcanoDone = true;
    // damage mod from dialog: map accumulator to 0.7 - 1.4, clamp attack 4-8 via mitziAttack
    const acc = state._mitziDmgAcc || 0;
    const total = Math.max(1, state.dialogScores.volcanoTotal || 1);
    const ratio = state.dialogScores.volcano / total;
    // perfect ~ 1.4 (atk~8), bad ~0.7 (atk~4)
    state.flags.mitziDamageMod = 0.7 + ratio * 0.7 + acc * 0.05;
    state.flags.mitziDamageMod = Math.max(0.7, Math.min(1.5, state.flags.mitziDamageMod));
    const mitzi = state.party.find((c) => c.id === 'mitzi');
    mitzi.atk = Math.round(4 + ratio * 4);
  }
  if (dungeon === 'fort') {
    state.flags.fortDone = true;
    const total = Math.max(1, state.dialogScores.fortTotal || 1);
    const ratio = state.dialogScores.fort / total;
    const acc = state._vicAcc || 0;
    if (ratio >= 1 && acc >= 2) state.flags.victoriaMode = 'assist';
    else if (ratio <= 0 || acc <= -2) state.flags.victoriaMode = 'interfere';
    else state.flags.victoriaMode = 'neutral';
  }
  if (dungeon === 'ruins') {
    state.flags.ruinsDone = true;
    state.flags.manorReady = true;
    const total = Math.max(1, state.dialogScores.ruinsTotal || 1);
    const ratio = state.dialogScores.ruins / total;
    if (ratio >= 0.75) {
      state.flags.partyDefenseBoost = true;
      state.flags.hestiaBoost = false;
    } else if (ratio <= 0.34) {
      state.flags.hestiaBoost = true;
      state.flags.partyDefenseBoost = false;
    }
    state.flags.hestiaJoined = false; // leaves party before manor as foe
    state.hestia.active = false;
  }
  // soft recover between chapters — Inn story beat
  for (const c of state.party) {
    c.hp = c.maxHp;
    c.alive = true;
  }
  state.mana = state.maxMana;
  state.supplies = Math.min(100, Math.max(state.supplies, 55) + 20);
}

/** Begin a dialog sequence */
export function startDialog(state, id) {
  const node = getDialog(id);
  if (!node) {
    state.scene = 'town';
    return;
  }
  applyNodeEffects(state, node);
  state.scene = 'dialog';
  state.dialog = {
    id,
    lineIndex: 0,
    node,
  };
}

export function advanceDialog(state) {
  const d = state.dialog;
  if (!d) return;
  const node = d.node;
  if (d.lineIndex < node.lines.length - 1) {
    d.lineIndex++;
    return;
  }
  // end of lines
  if (node.choices && node.choices.length) {
    d.awaitingChoice = true;
    return;
  }
  followNext(state, node.next);
}

export function chooseDialog(state, choiceIndex) {
  const d = state.dialog;
  if (!d?.awaitingChoice) return;
  const choice = d.node.choices[choiceIndex];
  if (!choice) return;
  applyChoiceEffects(state, choice);
  d.awaitingChoice = false;
  followNext(state, choice.next);
}

function followNext(state, next) {
  if (!next) {
    state.scene = 'town';
    return;
  }
  if (next === 'tutorial_start') {
    state.flags.tutorialDone = false;
    startCombat(state, {
      tutorial: true,
      label: 'Tutorial — Watch Thugs',
      enemies: [
        {
          id: 'thug1',
          instanceId: 'thug1',
          name: 'Idle Thug',
          eye: 'green',
          shape: 'square',
          limbs: 2,
          element: 'earth',
          attackType: 'blunt',
          weakType: 'slashing',
          resistType: 'piercing',
          hp: 12,
          maxHp: 12,
          atk: 3,
          knownFeatures: { eye: false, shape: false, limbs: false },
          identified: false,
          nextIntent: 'idle',
          alive: true,
        },
        {
          id: 'thug2',
          instanceId: 'thug2',
          name: 'Mean Thug',
          eye: 'red',
          shape: 'triangle',
          limbs: 2,
          element: 'fire',
          attackType: 'slashing',
          weakType: 'blunt',
          resistType: 'piercing',
          hp: 14,
          maxHp: 14,
          atk: 4,
          knownFeatures: { eye: false, shape: false, limbs: false },
          identified: false,
          nextIntent: 'attack',
          alive: true,
        },
      ],
    });
    state.combat.onWin = 'post_tutorial';
    return;
  }
  if (next === 'town_free' || next === 'town_after_woods' || next === 'town_after_volcano' || next === 'town_after_fort') {
    if (next === 'town_after_woods') finalizeDungeonFlags(state, 'woods');
    if (next === 'town_after_volcano') finalizeDungeonFlags(state, 'volcano');
    if (next === 'town_after_fort') finalizeDungeonFlags(state, 'fort');
    state.scene = 'town';
    state.dialog = null;
    return;
  }
  if (next === 'town_night') {
    finalizeDungeonFlags(state, 'ruins');
    startDialog(state, 'night_menu');
    return;
  }
  if (next === 'combat_woods') {
    beginDungeon(state, 'woods');
    return;
  }
  if (next === 'woods_continue') {
    continueDungeon(state);
    return;
  }
  if (next === 'combat_woods_boss') {
    state.dungeon.battleIndex = 99;
    startCombat(state, {
      dungeonIndex: 0,
      isBoss: true,
      bossId: 'woods_boss',
      label: 'Hollow Stag',
    });
    state.combat.onWin = 'woods_clear';
    return;
  }
  if (next === 'combat_volcano') {
    beginDungeon(state, 'volcano');
    return;
  }
  if (next === 'volcano_continue') {
    continueDungeon(state);
    return;
  }
  if (next === 'combat_volcano_boss') {
    startCombat(state, {
      dungeonIndex: 1,
      isBoss: true,
      bossId: 'volcano_boss',
      label: 'Cinder Maw',
    });
    state.combat.onWin = 'volcano_clear';
    return;
  }
  if (next === 'combat_fort') {
    beginDungeon(state, 'fort');
    return;
  }
  if (next === 'fort_continue') {
    continueDungeon(state);
    return;
  }
  if (next === 'combat_ruins') {
    state.flags.hestiaJoined = true;
    state.hestia.active = true;
    state.hestia.alive = true;
    beginDungeon(state, 'ruins');
    return;
  }
  if (next === 'ruins_continue') {
    continueDungeon(state);
    return;
  }
  if (next === 'combat_ruins_boss') {
    startCombat(state, {
      dungeonIndex: 3,
      isBoss: true,
      bossId: 'ruins_boss',
      label: 'Ruin Sentinel',
    });
    state.combat.onWin = 'ruins_clear';
    return;
  }
  if (next === 'combat_manor') {
    startCombat(state, {
      dungeonIndex: 4,
      isBoss: true,
      bossId: 'white_ox',
      label: 'The White Ox',
    });
    state.combat.onWin = 'post_ox';
    return;
  }
  if (next === 'ending_resolve') {
    resolveEnding(state);
    return;
  }

  // default: next dialog node
  startDialog(state, next);
}

function beginDungeon(state, name) {
  const meta = {
    woods: { index: 0, battles: 4, midDialogs: ['woods_mid_a', 'woods_mid_b', 'woods_mid_c'], preBoss: 'woods_pre_boss', joinSisters: true },
    volcano: { index: 1, battles: 4, midDialogs: ['volcano_mid_a', 'volcano_mid_b'], preBoss: 'volcano_hazard' },
    fort: { index: 2, battles: 4, midDialogs: ['fort_mid_a', 'fort_mid_b'], preBoss: null, bossDirect: true },
    ruins: { index: 3, battles: 4, midDialogs: ['ruins_mid_a', 'ruins_mid_b'], preBoss: 'ruins_trap' },
  }[name];

  if (meta.joinSisters) {
    state.party.find((c) => c.id === 'mitzi').active = true;
    state.party.find((c) => c.id === 'victoria').active = true;
  }

  state.dungeon = {
    name,
    index: meta.index,
    battleIndex: 0,
    maxBattles: meta.battles,
    midDialogs: meta.midDialogs,
    midQueue: [...meta.midDialogs],
    preBoss: meta.preBoss,
    bossDirect: meta.bossDirect,
  };

  startCombat(state, {
    dungeonIndex: meta.index,
    battleIndex: 0,
    label: `${name} — Skirmish 1`,
  });
  state.combat.onWin = '__dungeon_progress';
}

export function continueDungeon(state) {
  const d = state.dungeon;
  if (!d) {
    state.scene = 'town';
    return;
  }
  d.battleIndex++;
  if (d.battleIndex >= d.maxBattles) {
    if (d.preBoss) {
      startDialog(state, d.preBoss);
      return;
    }
    if (d.name === 'fort') {
      startCombat(state, {
        dungeonIndex: 2,
        isBoss: true,
        bossId: 'fort_boss',
        label: 'Fort Wraith',
      });
      state.combat.onWin = 'fort_clear';
      return;
    }
  }

  // interleave mid dialogs
  if (d.midQueue.length && d.battleIndex > 0 && d.battleIndex % 1 === 0) {
    // after each battle, maybe dialog then next fight — handled by onWin
  }

  startCombat(state, {
    dungeonIndex: d.index,
    battleIndex: d.battleIndex,
    label: `${d.name} — Skirmish ${d.battleIndex + 1}`,
  });
  state.combat.onWin = '__dungeon_progress';
}

export function onCombatVictory(state) {
  const c = state.combat;
  const next = c?.onWin;
  if (c?.tutorial) state.flags.tutorialDone = true;
  state.combat = null;
  if (!next) {
    state.scene = 'town';
    return;
  }
  if (next === '__dungeon_progress') {
    const d = state.dungeon;
    // unlock study after enough woods battles if dialog good
    if (d?.name === 'woods') {
      maybeUnlockMitziStudy(state);
      if (state.dialogScores.woods >= 3 && state.flags.mitziCanStudy === false) {
        // battles gate: min 3
        if (d.battleIndex >= 2) maybeUnlockMitziStudy(state);
      }
      if (d.battleIndex >= 2 && state.dialogScores.woods >= 3) {
        state.flags.mitziCanStudy = true;
        state.flags.mitziStudyLearnedAt = state.flags.mitziStudyLearnedAt || 'woods';
      }
    }
    // pull mid dialog if available
    if (d.midQueue.length) {
      const id = d.midQueue.shift();
      startDialog(state, id);
      return;
    }
    continueDungeon(state);
    return;
  }
  startDialog(state, next);
}

export function onCombatDefeat(state) {
  state.combat = null;
  state.scene = 'ending';
  state.ending = {
    id: 'gameover',
    title: 'Fallen in Gehenna',
    lines: [
      'Supplies gone — or bodies still.',
      'The White Ox does not need to open its eyes for this ending.',
      'The pocket watch ticks once... and stops.',
    ],
  };
}

export function resolveEnding(state) {
  const push = state._endingPush;
  const sistersGood =
    (state.flags.victoriaMode === 'assist' || state.flags.redeemed.victoria) &&
    (state.flags.mitziCanStudy || state.flags.redeemed.mitzi) &&
    state.flags.mitziDamageMod >= 1.0;
  const aliceGood =
    push === 'alice_good' ||
    state.flags.redeemed.charon ||
    state.flags.charonAdvice > 0;
  const hestiaBeaten = true;

  let ending;
  if (push === 'bad') {
    ending = {
      id: 'flock',
      title: 'Flock of the White Ox',
      lines: [
        'You kneel. Mass is warm. Thoughts grow quiet.',
        'Mitzi laughs softer each week. Victoria stops drinking — there is nothing left to drown.',
        'Alice\'s watch rusts open. Time forgets her name.',
      ],
      oxEyes: false,
    };
  } else if (aliceGood && hestiaBeaten) {
    ending = {
      id: 'alice_ascend',
      title: 'Clockwork Sky',
      lines: [
        'The White Ox falls. For a breath its eyes stay shut — then open, ancient and amused.',
        'Immortality nods. Defeat is a season, not an end.',
        'Alice\'s wound blooms bright. The watch spends her last seconds like coins.',
        'She alone rises toward a door of white weather.',
        sistersGood
          ? 'Below, Mitzi and Victoria walk apart — and then, carefully, choose to walk together.'
          : 'Below, the sisters remain tangled — love as a closed loop.',
        state.flags.aliceEyepatch ? 'Her eyepatch falls away in the light. She does not look back.' : 'She does not look back.',
      ],
      oxEyes: true,
      sacrifice: true,
    };
  } else if (sistersGood) {
    ending = {
      id: 'sisters',
      title: 'Two Shadows Untied',
      lines: [
        'The Ox is beaten back, not erased. Eyes slit open in the dark.',
        'Alice remains underground — watch cracked, path unclear.',
        'But Mitzi packs her own bag. Victoria leaves a glass unfinished.',
        'Sometimes heaven is only the courage to become someone new.',
      ],
      oxEyes: true,
    };
  } else {
    ending = {
      id: 'stalemate',
      title: 'Ashen Communion',
      lines: [
        'The Ox staggers. Gehenna cheers without understanding.',
        'Hestia bleeds white and smiles with red eyes when no one watches.',
        'Nothing essential changes — easiest answer wins again.',
      ],
      oxEyes: true,
    };
  }

  state.ending = ending;
  state.scene = 'ending';
}

export function embark(state, destination) {
  if (destination === 'woods' && !state.flags.woodsDone) {
    startDialog(state, 'meet_sisters');
    return;
  }
  if (destination === 'volcano' && state.flags.woodsDone && !state.flags.volcanoDone) {
    startDialog(state, 'volcano_intro');
    return;
  }
  if (destination === 'fort' && state.flags.volcanoDone && !state.flags.fortDone) {
    startDialog(state, 'fort_intro');
    return;
  }
  if (destination === 'ruins' && state.flags.fortDone && !state.flags.ruinsDone) {
    startDialog(state, 'ruins_intro');
    return;
  }
  if (destination === 'manor' && state.flags.manorReady) {
    startDialog(state, 'night_menu');
    return;
  }
}

export function townAction(state, action) {
  if (action === 'inn') {
    restAtInn(state);
    return { msg: 'You rest. Health, mana, and some supplies recover.' };
  }
  if (action === 'clinic') {
    if (state.money >= 8) {
      state.money -= 8;
      state.inventory.potions += 1;
      return { msg: 'Bought a potion (−8 coin).' };
    }
    return { msg: 'Not enough coin.' };
  }
  if (action === 'clinic_tonic') {
    if (state.money >= 12) {
      state.money -= 12;
      state.inventory.tonic += 1;
      return { msg: 'Bought a mana tonic (−12 coin).' };
    }
    return { msg: 'Not enough coin.' };
  }
  if (action === 'smith_upgrade') {
    if (state.money >= 15 && state.inventory.materials >= 1) {
      state.money -= 15;
      state.inventory.materials -= 1;
      const paths = ['sword', 'whip', 'wand'];
      const cur = state.equipment.aliceWeaponPath;
      const next = paths[(paths.indexOf(cur) + 1) % paths.length];
      state.equipment.aliceWeaponPath = next;
      const alice = state.party.find((c) => c.id === 'alice');
      alice.atk += 1;
      if (next === 'sword') alice.attackType = 'slashing';
      if (next === 'whip') alice.attackType = 'blunt';
      if (next === 'wand') alice.attackType = 'piercing';
      return { msg: `Pocket Watch reforged → ${next}. Attack +1.` };
    }
    return { msg: 'Need 15 coin and 1 material.' };
  }
  if (action === 'smith_gem') {
    if (state.money >= 20) {
      state.money -= 20;
      const gems = ['fire', 'water', 'earth', 'electric'];
      const g = gems[Math.floor(Math.random() * gems.length)];
      state.inventory.gems[g] = (state.inventory.gems[g] || 0) + 1;
      return { msg: `Purchased a ${g} gem.` };
    }
    return { msg: 'Need 20 coin.' };
  }
  if (action === 'smith_bracelet') {
    if (state.money >= 35) {
      const slots = state.inventory.bracelets.alice;
      if (slots >= 4) return { msg: 'Alice already has a 4-slot bracelet.' };
      state.money -= 35;
      state.inventory.bracelets.alice = Math.min(4, slots + 1);
      return { msg: `Bracelet slots: ${state.inventory.bracelets.alice}` };
    }
    return { msg: 'Need 35 coin.' };
  }
  return { msg: '...' };
}
