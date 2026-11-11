import { app } from '../app.js';
import { h, btn, pix } from '../dom.js';
import { drawScene, vignette } from '../../art/fx.js';
import { mercSprite, heroSprite } from '../../art/sprites.js';
import { audio } from '../../core/audio.js';
import { DUNGEONS } from '../../data/world.js';
import { partyMembers } from '../../game/state.js';
import { depart, toTown } from '../flow.js';
import { townHud } from './town.js';

const NODES = [
  { id: 'town', name: 'Gehenna', x: 330, y: 290 },
  { id: 'woods', x: 130, y: 170 },
  { id: 'volcano', x: 530, y: 160 },
  { id: 'fort', x: 540, y: 420 },
  { id: 'ruins', x: 120, y: 420 },
  { id: 'manor', name: 'The Manor', x: 330, y: 105 },
];

function status(s, id) {
  if (id === 'town') return 'home';
  if (id === 'manor') return s.cleared.manor ? 'done' : 'locked';
  if (s.cleared[id]) return 'done';
  if (s.unlocked[id]) return 'open';
  return 'locked';
}

export const mapScreen = {
  enter() {
    audio.music('outskirts');
    const s = app.state;
    this.sel = NODES.find((n) => n.id !== 'town' && status(s, n.id) === 'open')?.id || null;
    this.build();
  },

  build() {
    const s = app.state;
    app.ui.replaceChildren();
    app.ui.append(townHud('Beyond the Gate'));
    for (const n of NODES) {
      const st = status(s, n.id);
      const name = n.name || DUNGEONS[n.id].name;
      app.ui.append(
        h(
          `button.map-node.${st}`,
          {
            type: 'button',
            style: { left: `${n.x}px`, top: `${n.y}px` },
            'aria-label': name,
            onclick: () => {
              if (n.id === 'town') return toTown();
              this.sel = n.id;
              this.build();
            },
          },
          h('span.tag', name),
        ),
      );
    }
    if (this.sel) app.ui.append(this.info(this.sel));
    app.ui.append(h('div.dock', h('span.keyhints', { style: { alignSelf: 'center' } }, h('span', h('b', '← →'), ' choose'), h('span', h('b', 'Enter'), ' set out')), btn('◂ Back to town', () => toTown(), { cls: 'small', key: 'B' })));
  },

  info(id) {
    const s = app.state;
    const st = status(s, id);
    if (id === 'manor') {
      return h(
        'div.panel.map-info',
        h('h2', 'The Manor'),
        h('p', 'Hestia’s house. White drapes, white candles, white everything.'),
        h('p.faint', s.cleared.ruins ? 'Rest at the Inn. The communion begins after the last night.' : 'Nobody is invited yet.'),
      );
    }
    const d = DUNGEONS[id];
    const party = partyMembers(s);
    const cost = party.length;
    const out = h(
      'div.panel.map-info',
      h('h2', d.name),
      h('p', d.blurb),
      h('p.faint', `Chapter ${d.chapter} · ${d.nodes.filter((n) => n.type === 'battle').length} skirmishes and a guardian.`),
    );
    if (st === 'done') {
      out.append(h('p.good', 'Cleared.'));
      return out;
    }
    if (st === 'locked') {
      out.append(h('p.faint', 'Not yet. The story hasn’t reached it.'));
      return out;
    }
    const pm = h('div.row', { style: { gap: '2px', margin: '6px 0' } });
    for (const m of party) pm.append(pix(m.kind === 'merc' ? mercSprite(m) : heroSprite(m.id, s.flags), 1));
    out.append(
      pm,
      h('p', `The cart is packed to 100 supplies. Each step and each battle costs ${cost} (one per traveller). Unguarded blows cost more.`),
    );
    if (s.pendingRest) {
      out.append(h('p.bad', 'Rest at the Inn first — the story is waiting.'));
    } else {
      out.append(btn(`Set out for the ${d.name}`, () => depart(id), { cls: 'primary', key: '↵' }));
    }
    return out;
  },

  render(ctx, t) {
    const s = app.state;
    drawScene(ctx, 'map', t);
    // roads
    ctx.save();
    ctx.setLineDash([8, 8]);
    ctx.lineWidth = 3;
    const home = NODES[0];
    for (const n of NODES.slice(1)) {
      const st = status(s, n.id);
      ctx.strokeStyle = st === 'locked' ? 'rgba(120,100,110,0.25)' : st === 'done' ? 'rgba(140,200,140,0.5)' : 'rgba(232,204,128,0.7)';
      ctx.beginPath();
      ctx.moveTo(home.x, home.y);
      ctx.quadraticCurveTo((home.x + n.x) / 2 + (n.y - home.y) * 0.2, (home.y + n.y) / 2 - 30, n.x, n.y);
      ctx.stroke();
    }
    ctx.restore();
    for (const n of NODES) {
      const st = status(s, n.id);
      drawIcon(ctx, n.id, n.x, n.y, st, t, this.sel === n.id);
    }
    vignette(ctx, 0.5);
  },

  key(e) {
    const k = e.key.toLowerCase();
    if (k === 'b') return toTown();
    if (e.key === 'Enter' && this.sel && status(app.state, this.sel) === 'open' && !app.state.pendingRest) return depart(this.sel);
    if (e.key.startsWith('Arrow')) {
      e.preventDefault();
      const order = ['woods', 'volcano', 'fort', 'ruins', 'manor'];
      const i = Math.max(0, order.indexOf(this.sel));
      const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1;
      this.sel = order[(i + d + order.length) % order.length];
      this.build();
    }
  },
};

function drawIcon(ctx, id, x, y, st, t, selected) {
  ctx.save();
  ctx.translate(x, y);
  const pulse = st === 'open' ? 1 + Math.sin(t / 300) * 0.06 : 1;
  ctx.scale(pulse, pulse);
  ctx.globalAlpha = st === 'locked' ? 0.35 : 1;
  ctx.fillStyle = selected ? 'rgba(232,204,128,0.25)' : 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.arc(0, 0, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = st === 'done' ? '#8ac88a' : st === 'open' ? '#e8cc80' : '#6a5a60';
  ctx.lineWidth = 3;
  ctx.stroke();
  const P = (px, py, w, hh, c) => {
    ctx.fillStyle = c;
    ctx.fillRect(px, py, w, hh);
  };
  switch (id) {
    case 'town':
      P(-14, -4, 10, 14, '#5a4038');
      P(-2, -12, 8, 22, '#3a2e34');
      P(8, -2, 8, 12, '#4a3a32');
      P(0, -8, 4, 4, '#f0d090');
      P(-4, -18, 2, 6, '#d8ccb8');
      P(6, -18, 2, 6, '#d8ccb8');
      break;
    case 'woods':
      P(-2, -14, 4, 26, '#3a4a32');
      P(-12, -10, 10, 3, '#3a4a32');
      P(2, -6, 12, 3, '#3a4a32');
      P(-10, 2, 8, 3, '#3a4a32');
      break;
    case 'volcano':
      ctx.fillStyle = '#4a2a20';
      ctx.beginPath();
      ctx.moveTo(-18, 12);
      ctx.lineTo(-5, -12);
      ctx.lineTo(5, -12);
      ctx.lineTo(18, 12);
      ctx.fill();
      P(-5, -14, 10, 4, '#ff8a3a');
      break;
    case 'fort':
      P(-16, -6, 32, 18, '#4a4c54');
      for (let i = -16; i < 16; i += 8) P(i, -12, 5, 6, '#4a4c54');
      P(-4, 2, 8, 10, '#14161a');
      break;
    case 'ruins':
      P(-14, -12, 6, 24, '#4a4658');
      P(8, -4, 6, 16, '#4a4658');
      P(-16, -14, 10, 3, '#5a5668');
      P(-4, 6, 10, 6, '#3a3648');
      break;
    case 'manor':
      P(-16, -4, 32, 16, '#e8e2da');
      ctx.fillStyle = '#c8c0b6';
      ctx.beginPath();
      ctx.moveTo(-18, -4);
      ctx.lineTo(0, -16);
      ctx.lineTo(18, -4);
      ctx.fill();
      P(-3, 4, 6, 8, '#3a3036');
      break;
    default:
      break;
  }
  ctx.restore();
}
