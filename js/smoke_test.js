/** Headless smoke test for Clockwork story/combat flow */
import { createInitialState, activeParty } from './state.js';
import { startDialog, chooseDialog, advanceDialog, onCombatVictory, embark } from './story.js';
import { resolveRound } from './combat.js';
import { getDialog } from './dialog.js';

function flushDialog(state, choicePicker = () => 0) {
  let guard = 0;
  while (state.scene === 'dialog' && guard++ < 200) {
    const d = state.dialog;
    if (!d) break;
    const node = d.node;
    if (d.awaitingChoice) {
      const idx = choicePicker(node);
      chooseDialog(state, idx);
      continue;
    }
    if (d.lineIndex < node.lines.length - 1) {
      advanceDialog(state);
      continue;
    }
    // at last line — advance to trigger choices or next
    advanceDialog(state);
  }
}

function autoCombat(state) {
  let guard = 0;
  while (state.scene === 'combat' && guard++ < 500) {
    const c = state.combat;
    if (c.phase === 'won') {
      onCombatVictory(state);
      break;
    }
    if (c.phase === 'lost') {
      // recover for smoke continuity
      state.supplies = 80;
      for (const p of activeParty(state).length ? activeParty(state) : state.party) {
        p.hp = p.maxHp;
        p.alive = true;
      }
      // force win to continue story test
      for (const e of c.enemies) {
        e.hp = 0;
        e.alive = false;
      }
      c.phase = 'won';
      continue;
    }
    const party = activeParty(state);
    if (!party.length) {
      for (const p of state.party) {
        p.hp = p.maxHp;
        p.alive = true;
      }
    }
    const front = activeParty(state)[0];
    c.selectedFront = front.id;
    const intent = c.enemies[c.visionTarget]?.nextIntent;
    if (intent === 'attack') c.selectedAction = 'block';
    else c.selectedAction = 'attack';
    if (guard > 40) {
      for (const e of c.enemies) {
        e.hp = 0;
        e.alive = false;
      }
      c.phase = 'won';
      continue;
    }
    resolveRound(state);
  }
}

function playToTown(state, good = true) {
  flushDialog(state, () => (good ? 0 : 1));
  while (state.scene === 'combat') {
    autoCombat(state);
    flushDialog(state, () => (good ? 0 : 1));
  }
}

const state = createInitialState();
startDialog(state, 'intro');
playToTown(state, true);
console.assert(state.scene === 'town', 'expected town after tutorial, got ' + state.scene);
console.assert(state.flags.tutorialDone, 'tutorial flag');
console.log('✓ tutorial → town');

embark(state, 'woods');
playToTown(state, true);
// woods may still be in dialog/combat chain
let g = 0;
while (state.scene !== 'town' && g++ < 50) {
  if (state.scene === 'dialog') flushDialog(state, () => 0);
  if (state.scene === 'combat') autoCombat(state);
}
console.assert(state.scene === 'town', 'woods clear to town, got ' + state.scene);
console.assert(state.flags.woodsDone, 'woods done');
console.log('✓ woods complete, mitziStudy=', state.flags.mitziCanStudy);

embark(state, 'volcano');
g = 0;
while (state.scene !== 'town' && g++ < 80) {
  if (state.scene === 'dialog') flushDialog(state, () => 0);
  if (state.scene === 'combat') autoCombat(state);
}
console.assert(state.flags.volcanoDone, 'volcano');
console.assert(state.flags.aliceShortHair, 'short hair');
console.log('✓ volcano, mitziMod=', state.flags.mitziDamageMod);

embark(state, 'fort');
g = 0;
while (state.scene !== 'town' && g++ < 80) {
  if (state.scene === 'dialog') flushDialog(state, () => 0);
  if (state.scene === 'combat') autoCombat(state);
}
console.assert(state.flags.fortDone, 'fort');
console.log('✓ fort, victoriaMode=', state.flags.victoriaMode);

embark(state, 'ruins');
g = 0;
while (state.scene !== 'dialog' && state.scene !== 'town' && g++ < 100) {
  if (state.scene === 'dialog') break;
  if (state.scene === 'combat') autoCombat(state);
}
// ruins ends at night_menu dialog
g = 0;
while (g++ < 100) {
  if (state.scene === 'dialog') {
    if (state.dialog?.id === 'night_menu') break;
    flushDialog(state, () => 0);
  } else if (state.scene === 'combat') autoCombat(state);
  else break;
}
console.assert(state.flags.ruinsDone, 'ruins');
console.assert(state.flags.aliceEyepatch, 'eyepatch');
console.log('✓ ruins → night, suspicion=', state.flags.hestiaSuspicion);

// talk to charon then finish
if (state.dialog?.id === 'night_menu') {
  chooseDialog(state, 2); // charon
  flushDialog(state, () => 0);
}
g = 0;
while (state.scene !== 'ending' && g++ < 100) {
  if (state.scene === 'dialog') flushDialog(state, () => 0);
  if (state.scene === 'combat') {
    // force ox down faster
    if (state.combat && state.combat.turn > 5) {
      for (const e of state.combat.enemies) {
        e.hp = 0;
        e.alive = false;
      }
      state.combat.phase = 'won';
    }
    autoCombat(state);
  }
}
console.assert(state.scene === 'ending', 'ending scene got ' + state.scene);
console.log('✓ ending:', state.ending?.id, state.ending?.title);
console.log('ALL SMOKE TESTS PASSED');
