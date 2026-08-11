import { createInitialState } from './state.js';
import {
  drawTitle,
  drawDialog,
  drawTown,
  drawSubpanel,
  drawCombat,
  drawEnding,
  drawEndingButtons,
  pickHit,
  W,
  H,
} from './ui.js';
import { advanceDialog, chooseDialog, startDialog, embark, townAction, onCombatVictory, onCombatDefeat } from './story.js';
import { resolveRound, applyItem, setVisionTarget } from './combat.js';
import { minglePub, hireMerc, checkMercBetrayal } from './town.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

let state = createInitialState();
let hover = null;
let boxes = [];
let panelMode = null; // pub | smithy | clinic | notebook | inn
let lastMsgTimer = 0;

function resizeCss() {
  // keep internal resolution fixed; CSS scales
}
resizeCss();

function setMsg(msg) {
  state.townMsg = msg;
  lastMsgTimer = performance.now();
}

function tick(t) {
  if (state.townMsg && t - lastMsgTimer > 4000) state.townMsg = null;

  ctx.imageSmoothingEnabled = false;
  if (state.scene === 'title') {
    boxes = drawTitle(ctx, t, hover);
  } else if (state.scene === 'dialog') {
    boxes = drawDialog(ctx, state, t, hover);
  } else if (state.scene === 'town') {
    if (panelMode) boxes = drawSubpanel(ctx, state, panelMode, hover);
    else boxes = drawTown(ctx, state, t, hover);
  } else if (state.scene === 'combat') {
    boxes = drawCombat(ctx, state, t, hover);
  } else if (state.scene === 'ending') {
    drawEnding(ctx, state, t);
    boxes = drawEndingButtons(ctx, hover);
  } else {
    boxes = drawTown(ctx, state, t, hover);
  }
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

function canvasCoords(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = W / rect.width;
  const scaleY = H / rect.height;
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY,
  };
}

canvas.addEventListener('mousemove', (e) => {
  const { x, y } = canvasCoords(e);
  const hit = pickHit(boxes, x, y);
  hover = hit ? hit.id : null;
  canvas.style.cursor = hit ? 'pointer' : 'default';
});

canvas.addEventListener('click', (e) => {
  const { x, y } = canvasCoords(e);
  const hit = pickHit(boxes, x, y);
  if (!hit) return;
  handleAction(hit);
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    if (state.scene === 'title') handleAction({ id: 'start' });
    else if (state.scene === 'dialog' && !state.dialog?.awaitingChoice) handleAction({ id: 'dialog_advance' });
    else if (state.scene === 'combat' && state.combat?.phase !== 'select') handleAction({ id: 'combat_continue' });
  }
  if (state.scene === 'dialog' && state.dialog?.awaitingChoice) {
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= 9) handleAction({ id: `choice_${n - 1}`, choiceIndex: n - 1 });
  }
});

function handleAction(hit) {
  const id = hit.id;

  if (id === 'start') {
    state = createInitialState();
    panelMode = null;
    startDialog(state, 'intro');
    return;
  }
  if (id === 'restart') {
    state = createInitialState();
    panelMode = null;
    state.scene = 'title';
    return;
  }

  if (state.scene === 'dialog') {
    if (id === 'dialog_advance') {
      advanceDialog(state);
      return;
    }
    if (id.startsWith('choice_')) {
      chooseDialog(state, hit.choiceIndex ?? parseInt(id.split('_')[1], 10));
      return;
    }
  }

  if (state.scene === 'town') {
    if (panelMode) {
      if (id === 'close_panel') {
        panelMode = null;
        return;
      }
      if (id === 'mingle') {
        minglePub(state);
        setMsg('New faces at the bar.');
        return;
      }
      if (id.startsWith('hire_')) {
        const r = hireMerc(state, parseInt(id.split('_')[1], 10));
        setMsg(r.msg);
        return;
      }
      if (id.startsWith('bargain_')) {
        const r = hireMerc(state, parseInt(id.split('_')[1], 10), { bargain: true });
        setMsg(r.msg);
        return;
      }
      if (id === 'do_rest') {
        const r = townAction(state, 'inn');
        setMsg(r.msg);
        panelMode = null;
        return;
      }
      if (['clinic', 'clinic_tonic', 'smith_upgrade', 'smith_gem', 'smith_bracelet'].includes(id)) {
        const r = townAction(state, id);
        setMsg(r.msg);
        return;
      }
      return;
    }

    if (['inn', 'pub', 'smithy', 'clinic', 'notebook'].includes(id)) {
      panelMode = id;
      if (id === 'pub' && (!state.mercenaries || !state.mercenaries.length)) minglePub(state);
      return;
    }
    if (id === 'go_woods') embark(state, 'woods');
    if (id === 'go_volcano') embark(state, 'volcano');
    if (id === 'go_fort') embark(state, 'fort');
    if (id === 'go_ruins') embark(state, 'ruins');
    if (id === 'go_manor') embark(state, 'manor');
    return;
  }

  if (state.scene === 'combat') {
    const c = state.combat;
    if (id.startsWith('vision_')) {
      setVisionTarget(c, parseInt(id.split('_')[1], 10));
      return;
    }
    if (id.startsWith('front_')) {
      c.selectedFront = id.replace('front_', '');
      return;
    }
    if (id === 'act_attack') {
      c.selectedAction = 'attack';
      c.itemMenu = false;
      return;
    }
    if (id === 'act_block') {
      c.selectedAction = 'block';
      c.itemMenu = false;
      return;
    }
    if (id === 'act_study') {
      c.selectedAction = 'study';
      c.itemMenu = false;
      return;
    }
    if (id === 'act_item') {
      c.itemMenu = true;
      return;
    }
    if (id.startsWith('study_')) {
      c.studyTarget = parseInt(id.split('_')[1], 10);
      return;
    }
    if (id === 'use_potion') {
      applyItem(state, 'potion');
      c.itemMenu = false;
      return;
    }
    if (id === 'use_tonic') {
      applyItem(state, 'tonic');
      c.itemMenu = false;
      return;
    }
    if (id === 'item_cancel') {
      c.itemMenu = false;
      return;
    }
    if (id === 'resolve') {
      resolveRound(state);
      const betray = checkMercBetrayal(state);
      if (betray) c.log.push(betray);
      return;
    }
    if (id === 'combat_continue') {
      if (c.phase === 'won') {
        if (c.tutorial) state.flags.tutorialDone = true;
        onCombatVictory(state);
      } else if (c.phase === 'lost') {
        onCombatDefeat(state);
      }
      return;
    }
  }
}

// Expose for debug
window.__clockwork = () => state;
