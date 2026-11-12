import { app } from '../app.js';
import { h, btn } from '../dom.js';
import { listSaves, saveSlot } from '../../game/state.js';
import { DUNGEONS } from '../../data/world.js';
import { openSettings, confirmSheet } from './settings.js';
import { loadSlot } from '../flow.js';
import { debugEnabled, openDebug } from './debug.js';

/** Where the player is, for save labels. */
export function placeLabel(state) {
  if (!state) return '';
  const ch = state.chapter >= 5 ? 'Finale' : `Chapter ${Math.max(1, state.chapter)}`;
  if (state.combat) return `${state.combat.label} · round ${state.combat.round}`;
  if (state.expedition) {
    const d = DUNGEONS[state.expedition.dungeon];
    const steps = d.nodes.length;
    return `${d.name} · step ${Math.max(0, state.expedition.node + 1)}/${steps}`;
  }
  return `Gehenna · ${ch}`;
}

function when(at) {
  if (!at) return '';
  const d = new Date(at);
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/** Why saving isn't possible right now, or null. */
export function saveBlocker() {
  const scr = app.screen;
  if (!app.state) return 'Nothing to save yet.';
  if (app.screenName === 'title' || app.screenName === 'ending' || app.screenName === 'gameover') return 'Nothing to save here.';
  if (scr?.canSave && !scr.canSave()) return scr.saveBlockedReason || 'Finish the conversation first — saving works anywhere else.';
  return null;
}

export function openLoad() {
  openMenu('load');
}

export function openMenu(start = 'main') {
  if (app.screenName === 'title' && start === 'main') return;
  let view = start;
  const build = (close) => {
    const blocker = saveBlocker();
    const head = h('div.sheet-head', h('div', h('h2', view === 'save' ? 'Save' : view === 'load' ? 'Load' : view === 'keys' ? 'Controls' : 'Paused'), h('div.sub', placeLabel(app.state))), h('div.spacer'), btn('✕', close, { cls: 'small ghost', title: 'Resume (Esc)' }));
    let body;
    if (view === 'save' || view === 'load') {
      const saves = listSaves().filter((x) => view === 'load' || x.slot !== 'auto');
      body = h(
        'div.col',
        saves.map((sv, i) =>
          h(
            'div.shop-row',
            h('div.info', h('h3', sv.slot === 'auto' ? 'Autosave' : `Slot ${sv.slot.slice(-1)}`), h('p', sv.at ? `${sv.label || ''} — ${when(sv.at)}` : 'Empty')),
            view === 'save'
              ? btn('Save here', () => {
                  const doSave = () => {
                    saveSlot(app.state, sv.slot, placeLabel(app.state));
                    app.toast(`Saved to slot ${sv.slot.slice(-1)}.`);
                    app.closeSheet(true);
                  };
                  if (sv.at) confirmSheet('Overwrite?', `Slot ${sv.slot.slice(-1)} already holds “${sv.label}”.`, doSave, { yesLabel: 'Overwrite' });
                  else doSave();
                }, { cls: 'small', key: String(i + 1) })
              : btn('Load', () => {
                  confirmSheet('Load this save?', 'Anything since your last save will be lost.', () => loadSlot(sv.slot), { yesLabel: 'Load' });
                }, { cls: 'small', disabled: !sv.at, key: String(i + 1) }),
          ),
        ),
        app.screenName === 'title'
          ? null
          : btn('◂ Back', () => {
              view = 'main';
              app.refreshSheet();
            }, { cls: 'small', key: 'Bksp' }),
      );
    } else if (view === 'keys') {
      body = controlsBody(() => {
        view = 'main';
        app.refreshSheet();
      });
    } else {
      const items = [
        ['Resume', () => app.closeSheet(), {}],
        ['Save game', () => ((view = 'save'), app.refreshSheet()), { disabled: !!blocker, title: blocker || 'Three slots, plus the autosave' }],
        ['Load game', () => ((view = 'load'), app.refreshSheet()), {}],
        ['Settings', () => openSettings(), {}],
        ['Controls', () => ((view = 'keys'), app.refreshSheet()), {}],
        ...(debugEnabled() ? [['Debug', () => openDebug(), {}]] : []),
        ['Quit to title', () => confirmSheet('Quit to title?', 'Anything since your last save will be lost. (The game autosaves in town and between steps on the trail.)', () => app.go('title'), { yesLabel: 'Quit' }), {}],
      ];
      body = h(
        'div.col.menu-list',
        items.map(([label, fn, o], i) => btn(label, fn, { cls: i === 0 ? 'primary' : '', key: String(i + 1), ...o })),
        blocker ? h('p.faint', { style: { fontSize: '13px', marginTop: '4px' } }, blocker) : null,
      );
    }
    return h('div.panel.sheet.menu-sheet', head, h('div.sheet-body', body));
  };
  app.openSheet(build, {
    key: (e) => {
      const n = parseInt(e.key, 10);
      const buttons = [...app.sheet.el.querySelectorAll('.sheet-body .btn')].filter((b) => b.querySelector('.k'));
      const target = buttons.find((b) => b.querySelector('.k').textContent === String(n));
      if (n && target && !target.disabled) {
        e.preventDefault();
        target.click();
      } else if (e.key === 'Backspace' && view !== 'main') {
        e.preventDefault();
        view = 'main';
        app.refreshSheet();
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        moveFocus(e.key === 'ArrowDown' ? 1 : -1);
      }
    },
  });
}

export function moveFocus(dir) {
  const root = app.sheet?.el;
  if (!root) return;
  const list = [...root.querySelectorAll('button:not([disabled]), input')];
  if (!list.length) return;
  const i = list.indexOf(document.activeElement);
  const next = list[(i + dir + list.length) % list.length];
  next.focus();
}

const KEYS = [
  ['Anywhere', [['Esc', 'Options menu · close panels'], ['Tab / Shift+Tab', 'Move between buttons in a panel'], ['Enter / Space', 'Press the focused button']]],
  ['Dialogue', [['Enter / Space', 'Next line'], ['1–9 or ↑↓ + Enter', 'Choose'], ['A', 'Auto-advance on/off'], ['L', 'Backlog']]],
  ['Gehenna', [['1–5', 'Inn · Pub · Church · Smithy · Clinic'], ['M', 'Leave town'], ['P / N', 'Party · Notebook']]],
  ['Map', [['← → ↑ ↓', 'Pick a destination'], ['Enter', 'Set out'], ['B', 'Back to town']]],
  ['Trail', [['Enter', 'Continue'], ['P / N', 'Party · Notebook']]],
  [
    'Combat',
    [
      ['V then 1–4', 'Glimpse an enemy with the watch'],
      ['1–5', 'Strike · Guard · Item · Wait · Study (Mitzi)'],
      ['then 1–6', 'Pick the enemy (or ally) — numbers are shown on screen'],
      ['G', 'Cycle the imbue gem'],
      ['X then 1–6', 'Examine an enemy'],
      ['Tab', 'Next party member'],
      ['Backspace', 'Cancel / clear an order'],
      ['Enter', 'End turn · skip ahead while blows land'],
    ],
  ],
];

function controlsBody(back) {
  return h(
    'div.col',
    KEYS.map(([title, rows]) =>
      h('div', h('div.section-title', title), h('div.kv', rows.flatMap(([k, v]) => [h('span.kbd', k), h('span', v)]))),
    ),
    btn('◂ Back', back, { cls: 'small', key: 'Bksp' }),
  );
}

export function openControls() {
  app.openSheet((close) =>
    h('div.panel.sheet.menu-sheet', h('div.sheet-head', h('div', h('h2', 'Controls')), h('div.spacer'), btn('✕', close, { cls: 'small ghost' })), h('div.sheet-body', controlsBody(close))),
  );
}
