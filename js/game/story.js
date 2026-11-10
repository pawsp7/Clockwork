/**
 * Story runner. Scenes are arrays of commands (see story/script.js).
 * The runner walks them and yields display steps to the UI:
 *   { type: 'line', speaker, text, mood }   — narration has speaker 'narrator'
 *   { type: 'choice', prompt, options }
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
        return { type: 'battle', opts: typeof cmd.opts === 'function' ? cmd.opts(s) : cmd.opts };
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

  choose(i) {
    if (!this.pendingChoice) return false;
    const opt = this.pendingChoice.options.find((o) => o.index === i) || this.pendingChoice.options[i];
    if (!opt) return false;
    this.pendingChoice = null;
    applyChoice(this.state, opt);
    this._push(opt.then);
    return true;
  }
}

export function applyChoice(state, opt) {
  if (opt.score) {
    const sc = state.scores[opt.score];
    sc.total += 1;
    if (opt.good) sc.good += 1;
  }
  if (opt.fx) opt.fx(state);
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
export const battle = (opts) => ({ k: 'battle', opts });
export const goto = (v) => ({ k: 'goto', v });
export const end = (v) => ({ k: 'end', v });
