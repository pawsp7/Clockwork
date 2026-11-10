import { app } from '../app.js';
import { h, btn } from '../dom.js';
import { drawScene, vignette } from '../../art/fx.js';
import { heroSprite } from '../../art/sprites.js';
import { blit } from '../../art/pixel.js';
import { audio } from '../../core/audio.js';
import { newGame, continueGame } from '../flow.js';
import { openSettings, confirmSheet } from '../sheets/settings.js';

const CAST = [
  { id: 'victoria', x: 118 },
  { id: 'mitzi', x: 206 },
  { id: 'alice', x: 300 },
  { id: 'hestia', x: 664 },
  { id: 'charon', x: 760 },
];

export const titleScreen = {
  enter() {
    audio.music('title');
    const has = app.hasSave();
    const menu = h(
      'div.title-menu',
      has ? btn('Continue', () => continueGame(), { cls: 'primary', key: '↵' }) : null,
      btn(has ? 'New Game' : 'Begin', () => {
        if (has) confirmSheet('Start over?', 'Your saved journey will be lost. The watch does not keep two timelines.', () => newGame(), { yesLabel: 'Start over' });
        else newGame();
      }, { cls: has ? '' : 'primary', key: has ? null : '↵' }),
      btn('Settings', () => openSettings()),
    );
    app.ui.append(
      h('div.title-wrap', h('div.title-logo', 'Clockwork'), h('div.title-sub', 'a dim tale of Gehenna')),
      menu,
      h('div.title-foot', 'Click or press Enter · Number keys pick choices · Esc closes panels'),
    );
    this.has = has;
  },
  render(ctx, t) {
    drawScene(ctx, 'title', t);
    // the great clock: slow hands
    const cx = 480;
    const cy = 184;
    const hour = (t / 60000) * Math.PI * 2 - Math.PI / 2;
    const min = (t / 5000) * Math.PI * 2 - Math.PI / 2;
    ctx.save();
    ctx.lineCap = 'square';
    ctx.strokeStyle = '#8a7a68';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(hour) * 70, cy + Math.sin(hour) * 70);
    ctx.stroke();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#a89480';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(min) * 110, cy + Math.sin(min) * 110);
    ctx.stroke();
    ctx.fillStyle = '#c8a860';
    ctx.fillRect(cx - 6, cy - 6, 12, 12);
    ctx.restore();
    CAST.forEach((c, i) => {
      const bob = Math.round(Math.sin(t / 600 + i * 1.3)) * 2;
      // shadow
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(c.x - 26, 486, 52, 6);
      blit(ctx, heroSprite(c.id), c.x, 488 + bob, 3);
    });
    vignette(ctx, 0.6);
  },
  key(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (this.has) continueGame();
      else newGame();
    }
  },
};
