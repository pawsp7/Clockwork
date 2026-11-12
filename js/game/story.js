/**
 * Story runner. Scenes are arrays of commands (see story/script.js).
 * The runner walks them and yields display steps to the UI:
 *   { type: 'line', speaker, text, mood }   — narration has speaker 'narrator'
 *   { type: 'choice', prompt, options }
 *   { type: 'card', title, sub }           — a chapter title card; the player continues past it
 *   { type: 'battle', opts }                — UI runs combat, then calls resume()
 *   { type: 'end', then }                   — scene finished; `then` tells the controller where to go
 * Side effects (bg / music / fx / cast) go through hooks so logic stays testable.
 */

export class StoryRunner {
  constructor(state, scenes, sceneId, hooks = {}) {
    this.state = state;
    this.scenes = scenes;
    this.hooks = hooks;
    this.sceneId = sceneId;
    this.stack = [{ list: scenes[sceneId] || [], i: 0 }];
    this.pendingChoice = null;
    this.cast = [];
    this.bg = null;
    this.cg = null;
    this.ended = false;
    if (!scenes[sceneId]) throw new Error(`Unknown scene: ${sceneId}`);
  }

  _fetch() {
    while (this.stack.length) {
      const top = this.stack[this.stack.length - 1];
      if (top.i < top.list.length) return top.list[top.i++];
      this.stack.pop();
    }
    return null;
  }

  next() {
    if (this.pendingChoice) return this.pendingChoice;
    for (let guard = 0; guard < 500; guard++) {
      const cmd = this._fetch();
      if (!cmd) {
        this.ended = true;
        return { type: 'end', then: null };
      }
      const step = this._exec(cmd);
      if (step) return step;
    }
    throw new Error('Story runner looped without output');
  }

  _push(list) {
    if (list && list.length) this.stack.push({ list, i: 0 });
  }

  _exec(cmd) {
    const s = this.state;
    switch (cmd.k) {
      case 'line': {
        const text = typeof cmd.text === 'function' ? cmd.text(s) : cmd.text;
        if (cmd.who !== 'narrator' && cmd.who !== 'system') {
          // recency list, most recent speaker last (UI decides left/right placement)
          this.cast = [...this.cast.filter((c) => c !== cmd.who), cmd.who].slice(-3);
          this.hooks.cast?.(this.cast);
        }
        return { type: 'line', speaker: cmd.who, text, mood: cmd.mood || null, cast: this.cast };
      }
      case 'bg':
        this.bg = cmd.v;
        this.hooks.bg?.(cmd.v);
        return null;
      case 'music':
        this.hooks.music?.(cmd.v);
        return null;
      case 'fx':
        this.hooks.fx?.(cmd.v);
        if (cmd.wait) return { type: 'pause', ms: cmd.wait };
        return null;
      case 'cast':
        this.cast = cmd.v.slice();
        this.hooks.cast?.(this.cast);
        return null;
      case 'do':
        cmd.fn(s);
        return null;
      case 'if':
        this._push(cmd.test(s) ? cmd.then : cmd.else);
        return null;
      case 'choice': {
        const options = cmd.options
          .map((o, index) => ({ ...o, index }))
          .filter((o) => !o.when || o.when(s));
        this.pendingChoice = { type: 'choice', prompt: cmd.prompt || null, options };
        return this.pendingChoice;
      }
      case 'battle':
        // a battle ends the scene; the story picks up again in `after` once it is won
        this.ended = true;
        this.stack = [];
        return { type: 'battle', opts: typeof cmd.opts === 'function' ? cmd.opts(s) : cmd.opts, after: cmd.after || null };
      case 'card':
        return { type: 'card', title: cmd.title, sub: cmd.sub || '' };
      case 'cg':
        this.cg = cmd.v;
        this.hooks.cg?.(cmd.v);
        if (cmd.v && typeof localStorage !== 'undefined') unlockCg(cmd.v);
        return null;
      case 'goto':
        this.stack = [{ list: this.scenes[cmd.v], i: 0 }];
        this.sceneId = cmd.v;
        return null;
      case 'end':
        this.ended = true;
        this.stack = [];
        return { type: 'end', then: cmd.v };
      default:
        throw new Error(`Unknown story command ${cmd.k}`);
    }
  }

  /** Returns the feedback note for the choice (or null), or false if nothing was chosen. */
  choose(i) {
    if (!this.pendingChoice) return false;
    const opt = this.pendingChoice.options.find((o) => o.index === i) || this.pendingChoice.options[i];
    if (!opt) return false;
    this.pendingChoice = null;
    const note = applyChoice(this.state, opt);
    this._push(opt.then);
    this.lastNote = note;
    return note;
  }
}

/** What a choice tells the player about its consequence. */
const DEFAULT_NOTES = {
  woods: { good: 'Mitzi is paying attention.', bad: 'Mitzi shrinks a little further behind her sister.' },
  volcano: {
    good: (s) => `Mitzi plants her feet. Her strength rises to ${s.flags.mitziAtk}.`,
    bad: (s) => `Mitzi holds back. Her strength falls to ${s.flags.mitziAtk}.`,
  },
  fort: { good: 'Victoria’s grip loosens.', bad: 'Victoria’s grip tightens.' },
  ruins: { good: 'Alice keeps her guard up around Hestia.', bad: 'Hestia’s smile widens.' },
};

export function applyChoice(state, opt) {
  if (opt.score) {
    const sc = state.scores[opt.score];
    sc.total += 1;
    if (opt.good) sc.good += 1;
  }
  if (opt.fx) opt.fx(state);
  let text = opt.note;
  if (text === undefined && opt.score && DEFAULT_NOTES[opt.score]) text = DEFAULT_NOTES[opt.score][opt.good ? 'good' : 'bad'];
  if (typeof text === 'function') text = text(state);
  if (!text) return null;
  const tone = opt.tone || (opt.score ? (opt.good ? 'good' : 'bad') : 'info');
  return { text, tone };
}

function unlockCg(id) {
  try {
    const set = new Set(JSON.parse(localStorage.getItem('clockwork.cgs') || '[]'));
    set.add(id);
    localStorage.setItem('clockwork.cgs', JSON.stringify([...set]));
  } catch {
    /* ignore */
  }
}

// ─── Command builders used by the script ──────────────────────────────────

export const n = (text) => ({ k: 'line', who: 'narrator', text });
export const sys = (text) => ({ k: 'line', who: 'system', text });
export const say = (who, text, mood) => ({ k: 'line', who, text, mood });
export const bg = (v) => ({ k: 'bg', v });
export const music = (v) => ({ k: 'music', v });
export const fx = (v, wait) => ({ k: 'fx', v, wait });
export const cast = (...v) => ({ k: 'cast', v });
export const run = (fn) => ({ k: 'do', fn });
export const when = (test, then, otherwise) => ({ k: 'if', test, then, else: otherwise });
export const choice = (options, prompt) => ({ k: 'choice', options, prompt });
export const opt = (text, extra = {}) => ({ text, ...extra });
export const battle = (opts, after) => ({ k: 'battle', opts, after });
export const cg = (v) => ({ k: 'cg', v });
export const card = (title, sub) => ({ k: 'card', title, sub });
export const goto = (v) => ({ k: 'goto', v });
export const end = (v) => ({ k: 'end', v });
