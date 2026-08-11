import { P } from './palette.js';
import { drawBackground, drawPortrait, drawSprite, drawEnemy } from './sprites.js';
import { visibleIntent } from './combat.js';
import { activeParty } from './state.js';

const W = 960;
const H = 540;

export function clear(ctx) {
  ctx.fillStyle = P.void;
  ctx.fillRect(0, 0, W, H);
}

function font(ctx, size, pixel = false) {
  ctx.font = `${size}px ${pixel ? '"Press Start 2P"' : '"IBM Plex Sans"'}`;
  ctx.textBaseline = 'top';
}

function panel(ctx, x, y, w, h, fill = P.panel) {
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = P.frame;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

function text(ctx, str, x, y, color = P.ink, size = 14, pixel = false) {
  font(ctx, size, pixel);
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

function wrapText(ctx, str, x, y, maxWidth, lineHeight, color = P.ink, size = 15) {
  font(ctx, size);
  ctx.fillStyle = color;
  const words = str.split(' ');
  let line = '';
  let yy = y;
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth) {
      ctx.fillText(line, x, yy);
      line = w;
      yy += lineHeight;
    } else line = test;
  }
  if (line) ctx.fillText(line, x, yy);
  return yy + lineHeight;
}

export function hitBoxes() {
  return [];
}

/** Title screen */
export function drawTitle(ctx, t, hover) {
  drawBackground(ctx, 'title', W, H, t);
  // soft particles
  for (let i = 0; i < 20; i++) {
    const x = (i * 97 + t * 0.02) % W;
    const y = (i * 53 + Math.sin(t * 0.001 + i) * 20) % H;
    ctx.fillStyle = 'rgba(140,120,110,0.15)';
    ctx.fillRect(x, y, 2, 2);
  }
  text(ctx, 'CLOCKWORK', W / 2 - 140, 100, P.ink, 28, true);
  text(ctx, 'a dim tale of Gehenna', W / 2 - 90, 150, P.inkDim, 16);
  // dialog-style portraits on title
  drawPortrait(ctx, 'alice', 40, 180, 3.2, {});
  drawPortrait(ctx, 'mitzi', 200, 185, 3.0, {});
  drawPortrait(ctx, 'victoria', 360, 180, 3.2, {});
  drawPortrait(ctx, 'hestia', 540, 180, 3.2, {});
  drawPortrait(ctx, 'charon', 720, 185, 3.0, {});

  const btn = { x: W / 2 - 100, y: 430, w: 200, h: 44, id: 'start' };
  drawButton(ctx, btn, 'Begin Descent', hover === 'start');
  text(ctx, 'Arrows/click · Enter to confirm', W / 2 - 110, 480, P.inkFaint, 12);
  return [btn];
}

function drawButton(ctx, btn, label, hot) {
  panel(ctx, btn.x, btn.y, btn.w, btn.h, hot ? P.panel2 : P.panel);
  if (hot) {
    ctx.strokeStyle = P.gold;
    ctx.strokeRect(btn.x + 0.5, btn.y + 0.5, btn.w - 1, btn.h - 1);
  }
  font(ctx, 10, true);
  ctx.fillStyle = hot ? P.white : P.ink;
  const tw = ctx.measureText(label).width;
  ctx.fillText(label, btn.x + (btn.w - tw) / 2, btn.y + 16);
}

/** Dialog scene */
export function drawDialog(ctx, state, t, hover) {
  const d = state.dialog;
  const node = d.node;
  const bg = node.bg || 'town';
  drawBackground(ctx, bg, W, H, t);

  const speaker = node.speaker === 'narrator' ? null : node.speaker;
  if (speaker) {
    drawPortrait(ctx, speaker, 48, 60, 5, {
      angry: node.angry,
      eyepatch: state.flags.aliceEyepatch && speaker === 'alice',
      shortHair: state.flags.aliceShortHair && speaker === 'alice',
      drink: speaker === 'victoria',
    });
  }

  panel(ctx, 40, 340, W - 80, 160, 'rgba(18,14,22,0.92)');
  const name = node.speaker === 'narrator' ? '—' : (node.speaker || '').toUpperCase();
  text(ctx, name, 60, 355, speakerColor(node.speaker), 10, true);
  const line = node.lines[d.lineIndex] || '';
  wrapText(ctx, line, 60, 380, W - 140, 22, P.ink, 16);

  const boxes = [];
  if (d.awaitingChoice && node.choices) {
    panel(ctx, 300, 40, W - 340, Math.min(280, 24 + node.choices.length * 52), 'rgba(18,14,22,0.94)');
    text(ctx, 'CHOOSE', 320, 52, P.gold, 10, true);
    node.choices.forEach((ch, i) => {
      const btn = {
        x: 320,
        y: 78 + i * 50,
        w: W - 380,
        h: 42,
        id: `choice_${i}`,
        choiceIndex: i,
      };
      drawButton(ctx, btn, ch.text.length > 64 ? ch.text.slice(0, 61) + '…' : ch.text, hover === btn.id);
      boxes.push(btn);
    });
  } else {
    text(ctx, '▼ click / enter', W - 200, 470, P.inkFaint, 12);
    boxes.push({ x: 40, y: 340, w: W - 80, h: 160, id: 'dialog_advance' });
  }
  return boxes;
}

function speakerColor(s) {
  return (
    {
      alice: P.aliceHair,
      mitzi: P.mitziHair,
      victoria: P.victoriaHair,
      hestia: P.hestiaHair,
      charon: P.charonAccent,
      narrator: P.inkDim,
    }[s] || P.ink
  );
}

/** Town hub */
export function drawTown(ctx, state, t, hover) {
  drawBackground(ctx, 'town', W, H, t);
  text(ctx, 'GEHENNA', 40, 24, P.ink, 18, true);
  text(ctx, 'Milk · Faith · Quiet Sins', 40, 52, P.inkDim, 14);

  drawHud(ctx, state);

  const places = [
    { id: 'inn', label: 'Inn', x: 40, y: 100 },
    { id: 'pub', label: 'Pub', x: 200, y: 100 },
    { id: 'smithy', label: 'Smithy', x: 360, y: 100 },
    { id: 'clinic', label: 'Clinic', x: 520, y: 100 },
    { id: 'notebook', label: 'Notebook', x: 680, y: 100 },
  ];
  const boxes = [];
  for (const p of places) {
    const btn = { x: p.x, y: p.y, w: 140, h: 48, id: p.id };
    drawButton(ctx, btn, p.label, hover === p.id);
    boxes.push(btn);
  }

  // destinations
  text(ctx, 'ROADS', 40, 180, P.inkDim, 10, true);
  const roads = [
    { id: 'go_woods', label: 'Dead Woods', locked: state.flags.woodsDone, done: state.flags.woodsDone, avail: !state.flags.woodsDone },
    { id: 'go_volcano', label: 'Volcano', locked: !state.flags.woodsDone || state.flags.volcanoDone, done: state.flags.volcanoDone, avail: state.flags.woodsDone && !state.flags.volcanoDone },
    { id: 'go_fort', label: 'Abandoned Fort', locked: !state.flags.volcanoDone || state.flags.fortDone, done: state.flags.fortDone, avail: state.flags.volcanoDone && !state.flags.fortDone },
    { id: 'go_ruins', label: 'Ruins', locked: !state.flags.fortDone || state.flags.ruinsDone, done: state.flags.ruinsDone, avail: state.flags.fortDone && !state.flags.ruinsDone },
    { id: 'go_manor', label: 'Manor (Finale)', locked: !state.flags.manorReady, done: false, avail: state.flags.manorReady },
  ];
  roads.forEach((r, i) => {
    const btn = { x: 40 + (i % 3) * 220, y: 210 + Math.floor(i / 3) * 50, w: 200, h: 40, id: r.id, disabled: !r.avail };
    const label = r.done ? `${r.label} ✓` : r.label;
    drawButton(ctx, btn, label, hover === r.id && r.avail);
    if (!r.avail) {
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(btn.x, btn.y, btn.w, btn.h);
    }
    boxes.push(btn);
  });

  // party strip
  text(ctx, 'PARTY', 40, 330, P.inkDim, 10, true);
  const party = activeParty(state);
  party.forEach((c, i) => {
    drawSprite(ctx, c.id, 40 + i * 100, 340, 2.6, {
      eyepatch: state.flags.aliceEyepatch,
      shortHair: state.flags.aliceShortHair,
    });
    text(ctx, c.name, 40 + i * 100, 468, P.inkDim, 11);
    text(ctx, `${c.hp}/${c.maxHp}`, 40 + i * 100, 486, P.hpFill, 11);
  });

  if (state.townMsg) {
    panel(ctx, 400, 330, 520, 60);
    wrapText(ctx, state.townMsg, 420, 348, 480, 18, P.ink, 14);
  }

  return boxes;
}

function drawHud(ctx, state) {
  panel(ctx, W - 280, 20, 240, 70);
  text(ctx, `Supplies ${state.supplies}`, W - 260, 30, P.supplies, 12);
  text(ctx, `Coin ${state.money}   Mana ${state.mana}`, W - 260, 50, P.gold, 12);
  text(ctx, `Potions ${state.inventory.potions}  Tonic ${state.inventory.tonic}`, W - 260, 68, P.inkDim, 11);
}

/** Sub-panels for pub/smithy/clinic */
export function drawSubpanel(ctx, state, mode, hover) {
  const boxes = drawTown(ctx, state, 0, null).filter(() => false);
  // dim
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 0, W, H);
  panel(ctx, 120, 60, W - 240, H - 120, P.panel);

  const btns = [];
  const close = { x: W - 200, y: 80, w: 100, h: 32, id: 'close_panel' };
  drawButton(ctx, close, 'Close', hover === 'close_panel');
  btns.push(close);

  if (mode === 'pub') {
    text(ctx, 'PUB — Mercenaries', 150, 90, P.ink, 12, true);
    text(ctx, 'Mingle to refresh patrons. Bargain at your peril.', 150, 115, P.inkDim, 13);
    const mingle = { x: 150, y: 145, w: 160, h: 36, id: 'mingle' };
    drawButton(ctx, mingle, 'Mingle', hover === 'mingle');
    btns.push(mingle);
    (state.mercenaries || []).forEach((m, i) => {
      const y = 200 + i * 70;
      panel(ctx, 150, y, W - 420, 60);
      text(ctx, `${m.name}  ATK ${m.atk}  HP ${m.hp}  ${m.element}/${m.attackType}`, 170, y + 12, P.ink, 14);
      text(ctx, `Price ${m.price}${m.trial ? ' (TRIAL)' : ''}`, 170, y + 34, P.gold, 12);
      const hire = { x: W - 360, y: y + 12, w: 90, h: 32, id: `hire_${i}` };
      const barg = { x: W - 260, y: y + 12, w: 100, h: 32, id: `bargain_${i}` };
      drawButton(ctx, hire, 'Hire', hover === hire.id);
      drawButton(ctx, barg, 'Bargain', hover === barg.id);
      btns.push(hire, barg);
    });
  } else if (mode === 'smithy') {
    text(ctx, 'SMITHY', 150, 90, P.ink, 12, true);
    text(ctx, `Materials: ${state.inventory.materials}  Watch: ${state.equipment.aliceWeaponPath}`, 150, 120, P.inkDim, 14);
    const opts = [
      { id: 'smith_upgrade', label: 'Reforge Watch (15c + mat)' },
      { id: 'smith_gem', label: 'Buy Element Gem (20c)' },
      { id: 'smith_bracelet', label: 'Expand Bracelet (35c)' },
    ];
    opts.forEach((o, i) => {
      const b = { x: 150, y: 170 + i * 50, w: 360, h: 40, id: o.id };
      drawButton(ctx, b, o.label, hover === o.id);
      btns.push(b);
    });
  } else if (mode === 'clinic') {
    text(ctx, 'CLINIC', 150, 90, P.ink, 12, true);
    const opts = [
      { id: 'clinic', label: 'Buy Potion (8c)' },
      { id: 'clinic_tonic', label: 'Buy Tonic (12c)' },
    ];
    opts.forEach((o, i) => {
      const b = { x: 150, y: 160 + i * 50, w: 280, h: 40, id: o.id };
      drawButton(ctx, b, o.label, hover === o.id);
      btns.push(b);
    });
  } else if (mode === 'notebook') {
    text(ctx, 'FIELD NOTEBOOK', 150, 90, P.ink, 12, true);
    text(ctx, 'Traits observed → attacks / resists inferred', 150, 115, P.inkDim, 13);
    const notes = state.notebook.notes;
    if (!notes.length) text(ctx, 'Empty. Study enemies in battle (Mitzi/Alice).', 150, 160, P.inkDim, 14);
    notes.forEach((n, i) => {
      text(ctx, `${n.trait}  →  ${n.tags.join(', ')}`, 150, 150 + i * 22, P.ink, 13);
    });
  } else if (mode === 'inn') {
    text(ctx, 'INN', 150, 90, P.ink, 12, true);
    text(ctx, 'Rest restores HP, mana, and some supplies. Story waits for morning.', 150, 130, P.ink, 14);
    const b = { x: 150, y: 180, w: 200, h: 40, id: 'do_rest' };
    drawButton(ctx, b, 'Rest', hover === 'do_rest');
    btns.push(b);
  }
  return btns;
}

/** Combat */
export function drawCombat(ctx, state, t, hover) {
  const c = state.combat;
  const scene = ['woods', 'volcano', 'fort', 'ruins', 'manor'][c.dungeonIndex] || 'woods';
  drawBackground(ctx, scene, W, H, t);
  text(ctx, c.label, 24, 16, P.ink, 12, true);
  drawHud(ctx, state);

  // enemies
  const enemies = c.enemies;
  enemies.forEach((e, i) => {
    if (!e.alive && e.hp <= 0) return;
    const x = 520 + (i % 2) * 160;
    const y = 80 + Math.floor(i / 2) * 140;
    if (e.id === 'white_ox') {
      drawSprite(ctx, 'ox', x - 20, y, 3, { openEyes: false });
    } else {
      drawEnemy(ctx, x, y, 3, {
        eye: e.eye,
        shape: e.shape,
        limbs: e.limbs,
        identified: e.identified,
        element: e.element,
      });
    }
    const intent = visibleIntent(c, i);
    const label = e.identified || e.id === 'white_ox' ? e.name : '???';
    text(ctx, label, x, y + 100, P.ink, 12);
    text(ctx, `HP ${Math.max(0, e.hp)}`, x, y + 116, P.hpFill, 11);
    if (intent) {
      text(ctx, `VISION: ${intent.toUpperCase()}`, x, y + 132, P.electric, 10, true);
    } else {
      text(ctx, '· · ·', x, y + 132, P.inkFaint, 12);
    }
  });

  // party
  const party = activeParty(state);
  party.forEach((p, i) => {
    const x = 40 + i * 100;
    const y = 200;
    const selected = c.selectedFront === p.id;
    if (selected) {
      ctx.fillStyle = 'rgba(138,112,80,0.25)';
      ctx.fillRect(x - 4, y - 4, 70, 100);
    }
    drawSprite(ctx, p.id, x, y, 2.8, {
      eyepatch: state.flags.aliceEyepatch,
      shortHair: state.flags.aliceShortHair,
      angry: p.id === 'hestia' && state.flags.hestiaSuspicion > 1,
    });
    text(ctx, p.name, x, y + 130, selected ? P.gold : P.ink, 11);
    text(ctx, `${p.hp}/${p.maxHp}`, x, y + 146, P.hpFill, 11);
  });

  const boxes = [];
  // vision target select
  text(ctx, 'Focus vision on enemy:', 24, 70, P.inkDim, 12);
  enemies.forEach((e, i) => {
    if (!e.alive) return;
    const b = { x: 24 + i * 70, y: 90, w: 60, h: 28, id: `vision_${i}` };
    drawButton(ctx, b, `#${i + 1}`, hover === b.id || c.visionTarget === i);
    boxes.push(b);
  });

  if (c.phase === 'select') {
    panel(ctx, 24, 360, W - 48, 170);
    text(ctx, '1) Choose frontline  2) Choose action', 40, 372, P.inkDim, 12);
    party.forEach((p, i) => {
      const b = { x: 40 + i * 120, y: 400, w: 110, h: 32, id: `front_${p.id}` };
      drawButton(ctx, b, p.name, hover === b.id || c.selectedFront === p.id);
      boxes.push(b);
    });
    const actions = [
      { id: 'act_attack', label: 'Attack' },
      { id: 'act_block', label: 'Block' },
      { id: 'act_study', label: 'Study' },
      { id: 'act_item', label: 'Item' },
    ];
    actions.forEach((a, i) => {
      const b = { x: 40 + i * 140, y: 450, w: 130, h: 36, id: a.id };
      drawButton(ctx, b, a.label, hover === b.id || c.selectedAction === a.id.replace('act_', ''));
      boxes.push(b);
    });
    if (c.selectedAction === 'study') {
      enemies.forEach((e, i) => {
        if (!e.alive) return;
        const b = { x: 600 + i * 50, y: 400, w: 44, h: 28, id: `study_${i}` };
        drawButton(ctx, b, `E${i + 1}`, hover === b.id);
        boxes.push(b);
      });
    }
    if (c.selectedFront && c.selectedAction && (c.selectedAction !== 'study' || c.studyTarget != null)) {
      const go = { x: W / 2 - 90, y: 488, w: 180, h: 40, id: 'resolve' };
      // brighten ready state
      ctx.fillStyle = P.gold;
      ctx.fillRect(go.x - 2, go.y - 2, go.w + 4, go.h + 4);
      drawButton(ctx, go, 'COMMIT ▶', hover === 'resolve');
      boxes.push(go);
    } else {
      text(ctx, 'Select frontline + action, then COMMIT', 40, 500, P.inkFaint, 12);
    }
  } else if (c.phase === 'won' || c.phase === 'lost') {
    panel(ctx, 200, 160, W - 400, 200);
    text(ctx, c.phase === 'won' ? 'VICTORY' : 'DEFEAT', 240, 180, c.phase === 'won' ? P.good : P.danger, 16, true);
    let y = 220;
    for (const line of (c.log || []).slice(-5)) {
      y = wrapText(ctx, line, 240, y, W - 480, 18, P.ink, 13);
    }
    const cont = { x: W / 2 - 80, y: 320, w: 160, h: 36, id: 'combat_continue' };
    drawButton(ctx, cont, 'Continue', hover === 'combat_continue');
    boxes.push(cont);
  } else {
    // show log briefly when phase still select after resolve — also show last log at bottom
  }

  if (c.log?.length && c.phase === 'select') {
    panel(ctx, 520, 300, 400, 50);
    wrapText(ctx, c.log[c.log.length - 1], 530, 312, 380, 16, P.inkDim, 12);
  }

  // item submenu
  if (c.itemMenu) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, W, H);
    panel(ctx, 300, 180, 360, 160);
    text(ctx, 'ITEMS', 320, 200, P.ink, 12, true);
    const potion = { x: 320, y: 240, w: 140, h: 36, id: 'use_potion' };
    const tonic = { x: 480, y: 240, w: 140, h: 36, id: 'use_tonic' };
    drawButton(ctx, potion, `Potion (${state.inventory.potions})`, hover === 'use_potion');
    drawButton(ctx, tonic, `Tonic (${state.inventory.tonic})`, hover === 'use_tonic');
    boxes.push(potion, tonic, { x: 320, y: 290, w: 100, h: 32, id: 'item_cancel' });
    drawButton(ctx, { x: 320, y: 290, w: 100, h: 32 }, 'Cancel', hover === 'item_cancel');
  }

  return boxes;
}

export function drawEnding(ctx, state, t) {
  drawBackground(ctx, 'manor', W, H, t);
  if (state.ending?.oxEyes) {
    drawSprite(ctx, 'ox', 380, 60, 4, { openEyes: true });
  } else {
    drawSprite(ctx, 'ox', 380, 60, 4, { openEyes: false });
  }
  panel(ctx, 80, 200, W - 160, 280);
  text(ctx, state.ending?.title || 'End', 110, 220, P.ink, 16, true);
  let y = 260;
  for (const line of state.ending?.lines || []) {
    y = wrapText(ctx, line, 110, y, W - 220, 20, P.ink, 14);
    y += 4;
  }
}

export function drawEndingButtons(ctx, hover) {
  const btn = { x: W / 2 - 100, y: H - 50, w: 200, h: 36, id: 'restart' };
  drawButton(ctx, btn, 'New Cycle', hover === 'restart');
  return [btn];
}

export function pickHit(boxes, mx, my) {
  for (let i = boxes.length - 1; i >= 0; i--) {
    const b = boxes[i];
    if (b.disabled) continue;
    if (mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) return b;
  }
  return null;
}

export { W, H };
