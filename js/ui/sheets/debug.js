import { app } from '../app.js';
import { h, btn } from '../dom.js';
import { STAGES, stageState, bossNodeIndex } from '../../game/debug.js';
import { startExpedition, startBattle } from '../../game/expedition.js';
import { forceWin } from '../../game/combat.js';
import { rest } from '../../game/town.js';
import { saveGame, healAll } from '../../game/state.js';
import { identify } from '../../game/notebook.js';
import { computeEnding } from '../../game/endings.js';
import { MONSTERS } from '../../data/monsters.js';
import { ELEMENTS } from '../../data/constants.js';
import { SCENES } from '../../story/script.js';
import { CODEX } from '../../story/lore.js';
import { playScene, toTown, depart } from '../flow.js';

/**
 * Debug mode. Turn it on with ?debug in the URL (off with ?debug=0); it is
 * remembered in this browser. Open the panel with the ` key, from the Esc menu,
 * or from the title screen.
 */

const KEY = 'clockwork.debug';

export function initDebug() {
  try {
    const q = new URLSearchParams(location.search);
    if (q.has('debug')) localStorage.setItem(KEY, q.get('debug') === '0' ? '0' : '1');
  } catch {
    /* ignore */
  }
  if (debugEnabled()) document.body.classList.add('debug-on');
}

export function debugEnabled() {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

/** Enter a stage built by game/debug.js. */
export function jumpTo(id, good = true) {
  const { state, go } = stageState(id, { good });
  app.state = state;
  app.closeSheet(true);
  switch (go.to) {
    case 'scene':
      return playScene(go.scene);
    case 'town':
      return toTown();
    case 'dungeon':
      return depart(go.dungeon);
    case 'boss': {
      saveGame(state, 'rewind');
      startExpedition(state, go.dungeon);
      state.expedition.node = bossNodeIndex(go.dungeon);
      state.expedition.battle = 6;
      startBattle(state);
      return app.go('combat', {});
    }
    case 'rest': {
      saveGame(state, 'rewind');
      const r = rest(state);
      return playScene(r.scene);
    }
    case 'ox':
      saveGame(state, 'rewind');
      return app.go('combat', { opts: { kind: 'boss', bossId: 'white_ox', tier: 5, bg: 'manor', label: 'The White Ox', after: 'manor_after' } });
    case 'ending':
      return app.go('ending', { ending: computeEnding(state) });
    default:
      return toTown();
  }
}

function cheats() {
  const s = app.state;
  if (!s) return [];
  const done = (msg) => {
    app.toast(msg);
    app.screen?.build?.();
    app.screen?.sync?.();
    app.refreshSheet();
  };
  const out = [
    btn('Heal all + full mana', () => {
      healAll(s);
      done('Everyone is patched up.');
    }, { cls: 'tiny' }),
    btn('Supplies 100', () => {
      s.supplies = 100;
      done('The cart is full.');
    }, { cls: 'tiny' }),
    btn('+200 coins, +10 materials', () => {
      s.coins += 200;
      s.materials += 10;
      done('Pockets heavier.');
    }, { cls: 'tiny' }),
    btn('+2 of every gem', () => {
      for (const g of ELEMENTS) s.gems[g] += 2;
      done('Gems added.');
    }, { cls: 'tiny' }),
    btn('Identify all creatures', () => {
      s.notebook.unlocked = true;
      for (const m of MONSTERS) identify(s, { ...m, mid: m.id, known: { eye: true, shape: true, limbs: true }, seen: {} });
      done('The bestiary is complete.');
    }, { cls: 'tiny' }),
    btn('Reveal the whole Codex', () => {
      s.lore.found = CODEX.map((e) => e.id);
      done('Every page found.');
    }, { cls: 'tiny' }),
  ];
  if (app.screenName === 'combat' && s.combat?.phase === 'plan' && !app.screen.playing) {
    out.unshift(
      btn('Win this fight', () => {
        forceWin(s);
        app.closeSheet(true);
        app.screen.showVictory();
      }, { cls: 'tiny primary' }),
    );
  }
  if (app.screenName === 'trail' && s.expedition) {
    out.unshift(
      btn('Skip to the guardian', () => {
        const d = s.expedition.dungeon;
        s.expedition.node = bossNodeIndex(d) - 1;
        s.expedition.battle = 6;
        app.closeSheet(true);
        app.go('trail');
      }, { cls: 'tiny primary' }),
    );
  }
  return out;
}

export function openDebug() {
  let good = true;
  let scene = 'prologue';
  const build = (close) => {
    const groups = [...new Set(STAGES.map((st) => st.group))];
    return h(
      'div.panel.sheet.debug-sheet',
      h(
        'div.sheet-head',
        h('div', h('h2', 'Debug'), h('div.sub', 'Jump anywhere. Jumping replaces the current run (save first if you want it).')),
        h('div.spacer'),
        btn(good ? 'Choices: good' : 'Choices: bad', () => {
          good = !good;
          app.refreshSheet();
        }, { cls: `small${good ? ' selected' : ''}`, title: 'Build stages as if the player chose well, or badly' }),
        btn('✕', close, { cls: 'small ghost' }),
      ),
      h(
        'div.sheet-body',
        h('div.section-title', 'Jump to stage'),
        h(
          'div.debug-grid',
          groups.map((g) =>
            h(
              'div.col',
              { style: { gap: '4px' } },
              h('div.label', g),
              STAGES.filter((st) => st.group === g).map((st) => btn(st.label, () => jumpTo(st.id, good), { cls: 'tiny debug-stage' })),
            ),
          ),
        ),
        app.state ? h('div.section-title', 'Cheats') : null,
        app.state ? h('div.row', { style: { flexWrap: 'wrap', gap: '6px' } }, cheats()) : null,
        app.state ? h('div.section-title', 'Play a scene with the current save') : null,
        app.state
          ? h(
              'div.row',
              h(
                'select.debug-select',
                { onchange: (e) => (scene = e.target.value) },
                Object.keys(SCENES).map((id) => h('option', { value: id, selected: id === scene }, id)),
              ),
              btn('Play', () => {
                app.closeSheet(true);
                playScene(scene);
              }, { cls: 'tiny' }),
            )
          : null,
        h('p.faint', { style: { fontSize: '12px', marginTop: '12px' } }, 'Turn debug mode off by visiting the game with ?debug=0.'),
      ),
    );
  };
  app.openSheet(build);
}
