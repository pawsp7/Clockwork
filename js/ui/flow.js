import { app } from './app.js';
import { createState, saveGame, loadGame, clone, clearSaves } from '../game/state.js';
import { startExpedition, finishExpedition } from '../game/expedition.js';
import { refreshQuests, mingle } from '../game/town.js';
import { computeEnding } from '../game/endings.js';

/** Game progression: which screen comes next, saves, rewinds. */

export function newGame() {
  clearSaves();
  app.state = createState();
  playScene('prologue');
}

export function continueGame() {
  const data = loadGame('auto');
  if (!data) return newGame();
  app.state = data.state;
  app.state.combat = null;
  // autosaves happen in town and between steps on the trail
  if (app.state.expedition) return app.go('trail', { arriving: true });
  toTown();
}

export function playScene(id, extra = {}) {
  app.go('story', { scene: id, ...extra });
}

/** Story scenes end with a destination. */
export function onSceneEnd(then) {
  switch (then) {
    case 'town':
      return toTown();
    case 'trail':
      return app.go('trail');
    case 'return':
      return returnFromExpedition();
    case 'ending':
      return app.go('ending', { ending: computeEnding(app.state) });
    default:
      return toTown();
  }
}

export function toTown() {
  const s = app.state;
  s.combat = null;
  if (!s.quests.board.length) refreshQuests(s);
  if (!s.mercPool.length) mingle(s, { free: true });
  saveGame(s, 'auto');
  app.go('town');
}

export function depart(dungeonId) {
  const s = app.state;
  const snapshot = startExpedition(s, dungeonId);
  saveGame(snapshot, 'rewind');
  saveGame(s, 'auto');
  app.go('trail', { arriving: true });
}

function returnFromExpedition() {
  const summary = finishExpedition(app.state);
  refreshQuests(app.state);
  mingle(app.state, { free: true });
  saveGame(app.state, 'auto');
  app.go('town', { summary });
}

/** Defeat: offer to rewind to the last departure (or last rest). */
export function defeat(reason) {
  app.state.stats.defeats = (app.state.stats.defeats || 0) + 1;
  app.go('gameover', { reason });
}

export function rewind() {
  const rw = loadGame('rewind') || loadGame('auto');
  if (!rw) return newGame();
  const stats = app.state?.stats;
  app.state = clone(rw.state);
  if (stats) app.state.stats = { ...stats, rewinds: (stats.rewinds || 0) + 1 };
  if (app.state.expedition) return app.go('trail', { arriving: true });
  toTown();
}

/** Snapshot before a story battle we might lose (the White Ox). */
export function checkpoint() {
  saveGame(app.state, 'rewind');
}
