import { app } from '../app.js';
import { h, btn, clear } from '../dom.js';
import { drawScene, vignette, SW, SH } from '../../art/fx.js';
import { portrait } from '../../art/portraits.js';
import { blit } from '../../art/pixel.js';
import { audio } from '../../core/audio.js';
import { StoryRunner } from '../../game/story.js';
import { SCENES } from '../../story/script.js';
import { onSceneEnd } from '../flow.js';

const NAMES = {
  alice: ['Alice', 'var(--alice)'],
  mitzi: ['Mitzi', 'var(--mitzi)'],
  victoria: ['Victoria', 'var(--victoria)'],
  hestia: ['Hestia', 'var(--hestia)'],
  charon: ['Charon', 'var(--charon)'],
  thug: ['Thug', '#a89a90'],
};
const SPEED = { slow: 28, normal: 55, fast: 120, instant: 100000 };

export const storyScreen = {
  enter(params) {
    this.runner =
      params.runner ||
      new StoryRunner(app.state, SCENES, params.scene, {
        bg: (v) => this.setBg(v),
        music: (v) => audio.music(v),
        fx: (v) => this.effect(v),
        cast: () => {},
      });
    if (params.runner) {
      // re-bind hooks after a battle
      this.runner.hooks.bg = (v) => this.setBg(v);
      this.runner.hooks.fx = (v) => this.effect(v);
    }
    this.bg = this.runner.bg || this.bg || 'town';
    this.step = null;
    this.speaker = null;
    this.mood = null;
    this.typing = null;
    this.distortUntil = 0;
    this.log = this.log && params.runner ? this.log : [];
    this.box = null;
    this.advance();
  },

  exit() {
    clearInterval(this.typing?.timer);
  },

  setBg(v) {
    this.bg = v;
  },

  effect(v) {
    const now = performance.now();
    if (v === 'distort') {
      this.distortUntil = now + 1700;
      audio.sfx('warp');
    } else if (v === 'flash') {
      app.fx.flash('#fff4e0', 380);
      audio.sfx('bigstrike');
    } else if (v === 'shake') {
      app.fx.shake(10, 500);
    } else if (v === 'fadein') {
      app.fade.classList.add('on');
      setTimeout(() => app.fadeIn(), 120);
    }
  },

  advance() {
    if (this.busy) return;
    const step = this.runner.next();
    this.step = step;
    clear(app.ui);
    if (step.type === 'line') return this.showLine(step);
    if (step.type === 'choice') return this.showChoice(step);
    if (step.type === 'pause') {
      this.busy = true;
      setTimeout(() => {
        this.busy = false;
        this.advance();
      }, step.ms);
      return;
    }
    if (step.type === 'battle') {
      const runner = this.runner;
      app.go('combat', {
        opts: step.opts,
        story: true,
        onWin: () => app.go('story', { runner }),
      });
      return;
    }
    if (step.type === 'end') onSceneEnd(step.then);
  },

  showLine(step) {
    const who = step.speaker;
    this.speaker = who === 'narrator' || who === 'system' ? null : who;
    this.mood = step.mood;
    this.cast = step.cast;
    this.log.push({ who, text: step.text });
    const kind = who === 'narrator' ? 'narrator' : who === 'system' ? 'system' : 'speech';
    const text = h('div.dialog-text');
    const box = h(
      `div.panel.dialog${kind !== 'speech' ? '.' + kind : ''}`,
      { onclick: () => this.click(), role: 'button', tabindex: 0, 'aria-label': 'Continue' },
      kind === 'speech' ? this.nameplate(who) : null,
      text,
      h('div.advance', { style: { visibility: 'hidden' } }),
    );
    const tools = h(
      'div.dialog-tools',
      btn('Log', () => this.showLog(), { cls: 'tiny ghost', title: 'Backlog (L)' }),
    );
    app.ui.append(box, tools);
    this.box = box;
    this.type(text, step.text, box.querySelector('.advance'));
  },

  nameplate(who) {
    const [name, color] = NAMES[who] || [who, 'var(--ink)'];
    const left = this.slotOf(who) !== 'right';
    return h(`div.nameplate${left ? '' : '.right'}`, { style: { color } }, name);
  },

  type(el, str, arrow) {
    clearInterval(this.typing?.timer);
    const cps = SPEED[app.settings.textSpeed] || SPEED.normal;
    const shown = h('span');
    const rest = h('span.rest', str);
    el.append(shown, rest);
    let i = 0;
    const done = () => {
      clearInterval(this.typing?.timer);
      shown.textContent = str;
      rest.textContent = '';
      arrow.style.visibility = 'visible';
      this.typing = null;
    };
    if (cps > 1000) return done();
    const tick = 1000 / cps;
    const timer = setInterval(() => {
      i += 1;
      shown.textContent = str.slice(0, i);
      rest.textContent = str.slice(i);
      if (i % 3 === 0 && str[i] !== ' ') audio.sfx('blip');
      if (i >= str.length) done();
    }, tick);
    this.typing = { timer, done };
  },

  click() {
    if (this.typing) return this.typing.done();
    audio.sfx('advance');
    this.advance();
  },

  showChoice(step) {
    // keep the last line visible underneath
    const last = this.log[this.log.length - 1];
    if (last) {
      const who = last.who;
      const kind = who === 'narrator' ? 'narrator' : who === 'system' ? 'system' : 'speech';
      app.ui.append(
        h(`div.panel.dialog${kind !== 'speech' ? '.' + kind : ''}`, { style: { cursor: 'default', opacity: 0.75 } }, kind === 'speech' ? this.nameplate(who) : null, h('div.dialog-text', last.text)),
      );
    }
    const list = h(`div.choices${last ? '' : '.center'}`);
    if (step.prompt) list.append(h('div.choice-prompt', step.prompt));
    step.options.forEach((o, i) => {
      list.append(
        h(
          'button.btn.choice',
          {
            type: 'button',
            onclick: (e) => {
              e.stopPropagation();
              this.pick(o.index);
            },
          },
          h('span.num', String(i + 1)),
          o.text,
        ),
      );
    });
    app.ui.append(list);
  },

  pick(index) {
    const opt = this.step.options.find((o) => o.index === index);
    if (opt) this.log.push({ who: 'alice', text: `» ${opt.text}` });
    this.runner.choose(index);
    this.advance();
  },

  showLog() {
    app.openSheet((close) =>
      h(
        'div.panel.backlog',
        h('div.section-title', 'Backlog'),
        this.log.map((l) => h('p', l.who !== 'narrator' && l.who !== 'system' ? h('span.who', (NAMES[l.who] || [l.who])[0]) : null, l.text)),
        btn('Close', close, { cls: 'small' }),
      ),
    );
    const el = app.sheet.el;
    el.scrollTop = el.scrollHeight;
  },

  slotOf(who) {
    const cast = (this.cast || []).filter((c) => c !== 'narrator' && c !== 'system');
    if (cast.includes('alice')) return who === 'alice' ? 'left' : 'right';
    const recent = cast.slice(-2);
    if (recent.length < 2) return 'right';
    return who === recent[1] ? 'right' : 'left';
  },

  render(ctx, t) {
    const now = performance.now();
    const distort = now < this.distortUntil;
    drawScene(ctx, this.bg, t, { dim: this.speaker ? 0.12 : 0.28 });
    if (distort) this.drawDistort(ctx, now);

    // portraits
    const cast = (this.cast || []).filter((c) => NAMES[c]);
    let left = null;
    let right = null;
    if (cast.includes('alice')) {
      left = 'alice';
      right = [...cast].reverse().find((c) => c !== 'alice') || null;
    } else {
      const recent = cast.slice(-2);
      if (recent.length === 2) [left, right] = recent;
      else right = recent[0] || null;
    }
    if (this.step?.type === 'line' && (this.step.speaker === 'narrator' || this.step.speaker === 'system')) {
      left = null;
      right = null;
    }
    const flags = app.state.flags;
    for (const [who, x, flip] of [
      [left, 196, false],
      [right, 764, true],
    ]) {
      if (!who) continue;
      const active = who === this.speaker;
      const mood = active ? this.mood : null;
      const img = portrait(who, flags, mood);
      if (!img) continue;
      const bob = active ? Math.round(Math.sin(t / 500) * 1) * 2 : 0;
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(x - 100, 396, 200, 6);
      blit(ctx, img, x, 400 + bob, 5, { flip, alpha: active ? 1 : 0.92, tint: active ? null : { color: '#0c0810', amount: 0.55 }, key: `${who}${mood}` });
    }
    vignette(ctx, 0.5);
  },

  drawDistort(ctx, now) {
    const p = 1 - (this.distortUntil - now) / 1700;
    const img = ctx.getImageData(0, 0, SW, SH);
    const copy = new ImageData(new Uint8ClampedArray(img.data), SW, SH);
    const d = img.data;
    const s = copy.data;
    const amp = 40 * Math.sin(p * Math.PI);
    for (let y = 0; y < SH; y += 2) {
      const off = Math.round(Math.sin(y * 0.04 + now * 0.01) * amp);
      for (let x = 0; x < SW; x++) {
        const sx = Math.min(SW - 1, Math.max(0, x + off));
        const si = (y * SW + sx) * 4;
        const di = (y * SW + x) * 4;
        d[di] = s[si];
        d[di + 1] = s[si + 1];
        d[di + 2] = s[si + 2];
        d[di + 4 * SW] = s[si];
        d[di + 4 * SW + 1] = s[si + 1];
        d[di + 4 * SW + 2] = s[si + 2];
      }
    }
    ctx.putImageData(img, 0, 0);
    // spinning hands
    ctx.save();
    ctx.globalAlpha = Math.sin(p * Math.PI) * 0.8;
    ctx.strokeStyle = '#f4e8c8';
    ctx.lineWidth = 6;
    const a = -now * 0.02;
    ctx.beginPath();
    ctx.moveTo(480, 270);
    ctx.lineTo(480 + Math.cos(a) * 220, 270 + Math.sin(a) * 220);
    ctx.moveTo(480, 270);
    ctx.lineTo(480 + Math.cos(a * 0.3) * 140, 270 + Math.sin(a * 0.3) * 140);
    ctx.stroke();
    ctx.globalAlpha = Math.max(0, p - 0.6) * 2.2;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, SW, SH);
    ctx.restore();
  },

  key(e) {
    if (this.step?.type === 'choice') {
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= this.step.options.length) {
        e.preventDefault();
        this.pick(this.step.options[n - 1].index);
      }
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (this.step?.type === 'line') this.click();
    } else if (e.key === 'l' || e.key === 'L') {
      this.showLog();
    }
  },
};
