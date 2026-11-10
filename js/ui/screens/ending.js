import { app } from '../app.js';
import { h, btn } from '../dom.js';
import { drawScene, vignette, SW, SH } from '../../art/fx.js';
import { heroSprite } from '../../art/sprites.js';
import { bossArt, faithfulArt } from '../../art/creatures.js';
import { blit } from '../../art/pixel.js';
import { audio } from '../../core/audio.js';
import { clearSaves } from '../../game/state.js';
import { GAME_OVER } from '../../game/endings.js';
import { rewind } from '../flow.js';

const ART = {
  alice_ascend: { bg: 'manor', draw: (ctx, t, p, f) => ascend(ctx, t, p, [{ id: 'alice', x: 480 }], f) },
  alice_linger: { bg: 'town', draw: (ctx, t, p, f) => standing(ctx, t, [{ id: 'alice', x: 480 }], f, 0.35) },
  alice_flock: { bg: 'church', draw: (ctx, t, p, f) => flock(ctx, t, f) },
  sisters_up: { bg: 'inn_night', draw: (ctx, t, p, f) => ascend(ctx, t, p, [{ id: 'victoria', x: 430 }, { id: 'mitzi', x: 530 }], f) },
  victoria_up: { bg: 'inn_night', draw: (ctx, t, p, f) => (ascend(ctx, t, p, [{ id: 'victoria', x: 420 }], f), standing(ctx, t, [{ id: 'mitzi', x: 560 }], f, 0)) },
  mitzi_up: { bg: 'inn_night', draw: (ctx, t, p, f) => (ascend(ctx, t, p, [{ id: 'mitzi', x: 540 }], f), standing(ctx, t, [{ id: 'victoria', x: 400 }], f, 0)) },
  sisters_stay: { bg: 'church', draw: (ctx, t, p, f) => standing(ctx, t, [{ id: 'victoria', x: 440 }, { id: 'mitzi', x: 520 }], f, 0.2) },
  charon: { bg: 'clinic', draw: (ctx, t, p, f) => coin(ctx, t, f) },
  ox_eyes: { bg: null, draw: (ctx, t, p) => oxEyes(ctx, t, p) },
};

function standing(ctx, t, list, flags, dim) {
  for (const c of list) {
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(c.x - 36, 402, 72, 8);
    blit(ctx, heroSprite(c.id, flags), c.x, 404 + Math.round(Math.sin(t / 700)) * 2, 4, dim ? { tint: { color: '#0a0810', amount: dim }, key: `end${c.id}` } : {});
  }
}

function ascend(ctx, t, p, list, flags) {
  // light from above
  const g = ctx.createLinearGradient(0, 0, 0, SH);
  g.addColorStop(0, `rgba(255,248,232,${0.25 + p * 0.35})`);
  g.addColorStop(1, 'rgba(255,248,232,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, SW, SH);
  for (let i = 0; i < 7; i++) {
    ctx.fillStyle = `rgba(255,250,236,${0.05 + 0.03 * Math.sin(t / 600 + i)})`;
    ctx.fillRect(380 + i * 30 - 20, 0, 18, 420);
  }
  for (const c of list) {
    const rise = Math.min(1, p * 1.2) * 120;
    blit(ctx, heroSprite(c.id, flags), c.x, 404 - rise + Math.round(Math.sin(t / 500)) * 3, 4, { alpha: 1 - p * 0.35, flash: 0.15 + p * 0.3, key: `asc${c.id}` });
  }
}

function flock(ctx, t, flags) {
  for (let i = 0; i < 5; i++) blit(ctx, faithfulArt(Math.floor(t / 600 + i) % 2), 200 + i * 140, 410, 3, { alpha: 0.85 });
  blit(ctx, heroSprite('alice', flags), 480, 420, 3, { tint: { color: '#e8e2da', amount: 0.4 }, key: 'flockalice' });
}

function coin(ctx, t, flags) {
  standing(ctx, t, [{ id: 'charon', x: 480 }], flags, 0);
  const p = (t % 1600) / 1600;
  const y = 230 - Math.sin(p * Math.PI) * 90;
  ctx.fillStyle = '#e8cc70';
  const w = Math.abs(Math.cos(t / 90)) * 12 + 2;
  ctx.fillRect(500 - w / 2, y, w, 12);
}

function oxEyes(ctx, t, p) {
  ctx.fillStyle = '#060406';
  ctx.fillRect(0, 0, SW, SH);
  const open = p > 0.45;
  const glow = open ? Math.min(1, (p - 0.45) * 3) : 0;
  if (glow) {
    const g = ctx.createRadialGradient(480, 220, 10, 480, 220, 260);
    g.addColorStop(0, `rgba(200,40,40,${0.25 * glow})`);
    g.addColorStop(1, 'rgba(200,40,40,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, SW, SH);
  }
  blit(ctx, bossArt('white_ox', Math.floor(t / 700) % 2, { open }), 480, 430, 4, { alpha: 0.35 + p * 0.65 });
}

export const endingScreen = {
  enter({ ending }) {
    this.ending = ending;
    this.i = 0;
    this.t0 = performance.now();
    this.done = false;
    audio.music('ending');
    clearSaves();
    this.show();
  },

  show() {
    app.ui.replaceChildren();
    const card = this.ending.cards[this.i];
    if (!card) return this.final();
    this.t0 = performance.now();
    if (card.art === 'ox_eyes') audio.music('hestia');
    const el = h('div.ending-card', h('h2', card.title));
    card.lines.forEach((l, i) => {
      const p = h('p', l);
      p.style.animationDelay = `${0.4 + i * 1.1}s`;
      el.append(p);
    });
    el.append(h('div', { style: { marginTop: '14px' } }, btn(this.i === this.ending.cards.length - 1 ? 'The end' : 'Continue', () => this.next(), { cls: 'small', key: '↵' })));
    app.ui.append(el);
  },

  next() {
    audio.sfx('advance');
    this.i += 1;
    this.show();
  },

  final() {
    this.done = true;
    audio.music('ending');
    const s = app.state;
    const a = this.ending.arcs;
    app.ui.replaceChildren(
      h(
        'div.ending-title',
        h('div.title-sub', 'Ending'),
        h('h1', this.ending.title),
        h(
          'div.stats',
          h('span.chip', 'Battles ', h('b', String(s.stats.battles))),
          h('span.chip', 'Rounds ', h('b', String(s.stats.rounds))),
          h('span.chip', 'Supplies lost to claws ', h('b', String(s.stats.payloadLost))),
          h('span.chip', 'Species identified ', h('b', `${s.stats.identified}/36`)),
          h('span.chip', 'Rewinds ', h('b', String(s.stats.rewinds || 0))),
          h('span.chip', 'Mitzi ', h('b', a.mitziGood ? 'found herself' : 'stayed small')),
          h('span.chip', 'Victoria ', h('b', a.victoriaGood ? 'let go' : 'held on')),
        ),
        h('p.dim', { style: { maxWidth: '560px', fontSize: '15px', lineHeight: 1.5, marginBottom: '18px' } }, 'Every arc can end differently. The Dead Woods, the Caldera, the Fort and the Ruins each remember what you said — and the last night can still change a few minds.'),
        btn('Return to the title', () => app.go('title'), { cls: 'primary' }),
      ),
    );
  },

  render(ctx, t) {
    const card = this.ending?.cards[this.i];
    if (this.done || !card) {
      drawScene(ctx, 'title', t, { dim: 0.45 });
      vignette(ctx, 0.7);
      return;
    }
    const art = ART[card.art] || ART.charon;
    const p = Math.min(1, (performance.now() - this.t0) / 6000);
    if (art.bg) drawScene(ctx, art.bg, t, { dim: 0.2 });
    art.draw(ctx, t, p, app.state.flags);
    vignette(ctx, 0.65);
  },

  key(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!this.done) this.next();
    }
  },
};

export const gameOverScreen = {
  enter({ reason }) {
    audio.music('none');
    const info = GAME_OVER[reason] || GAME_OVER.party;
    this.reason = reason;
    app.ui.replaceChildren(
      h(
        'div.ending-title',
        h('h1', info.title),
        h('div', { style: { margin: '16px 0 24px', maxWidth: '560px' } }, info.lines.map((l) => h('p.dim', { style: { fontSize: '18px', lineHeight: 1.5 } }, l))),
        h(
          'div.row',
          btn('Rewind the watch', () => rewind(), { cls: 'primary', key: '↵' }),
          btn('Return to the title', () => app.go('title'), {}),
        ),
        h('p.faint', { style: { marginTop: '16px', fontSize: '13px' } }, 'Rewinding returns you to the morning you set out — or the night you last rested.'),
      ),
    );
  },
  render(ctx, t) {
    ctx.fillStyle = '#060406';
    ctx.fillRect(0, 0, SW, SH);
    // a stopped watch
    ctx.save();
    ctx.translate(480, 120);
    ctx.strokeStyle = '#8a7046';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, 44, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#c8a860';
    ctx.fillRect(-6, -58, 12, 10);
    ctx.strokeStyle = '#d8ccb8';
    ctx.lineWidth = 3;
    const a = Math.sin(t / 900) * 0.02 - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * 32, Math.sin(a) * 32);
    ctx.moveTo(0, 0);
    ctx.lineTo(18, 8);
    ctx.stroke();
    ctx.restore();
    vignette(ctx, 0.6);
  },
  key(e) {
    if (e.key === 'Enter') rewind();
  },
};
