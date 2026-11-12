import { h, clear } from './dom.js';
import { FxLayer, SW, SH } from '../art/fx.js';
import { audio } from '../core/audio.js';
import { saveGame, latestSave } from '../game/state.js';
import { openMenu, moveFocus } from './sheets/menu.js';
import { debugEnabled, openDebug } from './sheets/debug.js';

/**
 * App shell: owns the stage, the render loop, screen switching, modal sheets and toasts.
 * Screens are objects: { enter(params), exit(), render(ctx, t, dt), key(e) }.
 */
export const app = {
  state: null,
  screen: null,
  screenName: null,
  screens: {},
  sheet: null,
  fx: new FxLayer(),
  busy: false,
  settings: { textSpeed: 'normal', battleSpeed: 'normal' },

  init() {
    this.stage = document.getElementById('stage');
    this.canvas = document.getElementById('scene');
    this.ctx = this.canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.ui = document.getElementById('ui');
    this.overlay = document.getElementById('overlay');
    this.toasts = document.getElementById('toasts');
    this.fade = document.getElementById('fade');
    try {
      Object.assign(this.settings, JSON.parse(localStorage.getItem('clockwork.settings') || '{}'));
    } catch {
      /* ignore */
    }
    window.addEventListener('resize', () => this.fit());
    this.fit();
    const unlock = () => audio.unlock();
    window.addEventListener('pointerdown', unlock, { capture: true });
    window.addEventListener('keydown', unlock, { capture: true });
    window.addEventListener('keydown', (e) => this.onKey(e));
    this.stage.addEventListener('pointerover', (e) => {
      const b = e.target.closest?.('.btn:not([disabled]), .choice, .hotspot, .map-node');
      if (b && b !== this._lastHover) audio.sfx('hover');
      this._lastHover = b;
    });
    this.stage.addEventListener('click', (e) => {
      if (e.target.closest?.('.btn:not([disabled]), .choice, .hotspot, .map-node')) audio.sfx('click');
    });
    let last = performance.now();
    const loop = (now) => {
      const dt = Math.min(64, now - last);
      last = now;
      this.frame(now, dt);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  },

  saveSettings() {
    try {
      localStorage.setItem('clockwork.settings', JSON.stringify(this.settings));
    } catch {
      /* ignore */
    }
  },

  fit() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let s = Math.min(vw / SW, vh / SH);
    // Prefer crisp integer-ish scales on big screens.
    if (s > 1.5) s = Math.floor(s * 4) / 4;
    this.scale = s;
    this.stage.style.transform = `scale(${s})`;
    this.stage.style.left = `${Math.round((vw - SW * s) / 2)}px`;
    this.stage.style.top = `${Math.round((vh - SH * s) / 2)}px`;
  },

  frame(now, dt) {
    const ctx = this.ctx;
    const [ox, oy] = this.fx.offset(now);
    ctx.save();
    ctx.translate(ox, oy);
    if (this.screen?.render) this.screen.render(ctx, now, dt);
    ctx.restore();
    this.fx.draw(ctx, now);
  },

  register(name, screen) {
    this.screens[name] = screen;
  },

  /** Switch screens, with a short fade. */
  async go(name, params = {}, { fade = true } = {}) {
    this.transitioning = true;
    if (fade) await this.fadeOut();
    this.closeSheet(true);
    if (this.screen?.exit) this.screen.exit();
    clear(this.ui);
    this.screenName = name;
    this.screen = this.screens[name];
    if (!this.screen) throw new Error(`No screen ${name}`);
    this.screen.enter?.(params);
    this.transitioning = false;
    if (fade) this.fadeIn();
  },

  fadeOut(ms = 280) {
    this.fade.classList.add('on');
    return new Promise((r) => setTimeout(r, ms));
  },
  fadeIn() {
    this.fade.classList.remove('on');
  },

  // ─── modal sheets ──────────────────────────────────────────────────────
  openSheet(build, opts = {}) {
    this.closeSheet(true);
    const scrim = h('div.scrim', { onclick: () => !opts.locked && this.closeSheet() });
    const el = build(() => this.closeSheet());
    this.overlay.append(scrim, el);
    this.sheet = { el, scrim, opts, rebuild: () => this.openSheet(build, opts) };
    if (!opts.silent) audio.sfx('door');
    // keyboard players land on the first useful button
    const first = el.querySelector('.sheet-body button:not([disabled])') || el.querySelector('button:not([disabled])');
    if (first && !opts.noFocus) setTimeout(() => first.focus({ preventScroll: true }), 0);
    return el;
  },
  refreshSheet() {
    if (!this.sheet) return;
    const body = this.sheet.el.querySelector('.sheet-body');
    const scroll = body ? body.scrollTop : 0;
    this.sheet.opts.silent = true;
    this.sheet.rebuild();
    const nb = this.sheet?.el.querySelector('.sheet-body');
    if (nb) nb.scrollTop = scroll;
  },
  closeSheet(silent = false) {
    if (!this.sheet) return;
    const { opts } = this.sheet;
    this.sheet.el.remove();
    this.sheet.scrim.remove();
    this.sheet = null;
    if (!silent) {
      audio.sfx('back');
      opts.onClose?.();
    }
  },

  toast(msg, ok = true) {
    const t = h('div.toast', msg);
    if (!ok) t.style.borderColor = '#8a3a40';
    this.toasts.appendChild(t);
    setTimeout(() => t.remove(), 3300);
    audio.sfx(ok ? 'buy' : 'deny');
  },

  onKey(e) {
    if (this.transitioning) {
      e.preventDefault();
      return;
    }
    if (e.key === '`' && debugEnabled()) {
      e.preventDefault();
      if (this.sheet) this.closeSheet(true);
      openDebug();
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      if (this.sheet) {
        if (!this.sheet.opts.locked) this.closeSheet();
        return;
      }
      if (this.screen?.escape?.()) return;
      this.openMenu();
      return;
    }
    if (this.sheet) {
      if (this.sheet.opts.key) this.sheet.opts.key(e);
      else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        moveFocus(e.key === 'ArrowDown' ? 1 : -1);
      }
      return;
    }
    this.screen?.key?.(e);
  },

  openMenu() {
    openMenu();
  },

  // ─── persistence ───────────────────────────────────────────────────────
  save() {
    if (this.state) saveGame(this.state, 'auto');
  },
  hasSave() {
    return !!latestSave();
  },
};
