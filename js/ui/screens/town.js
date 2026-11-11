import { app } from '../app.js';
import { h, btn, bar } from '../dom.js';
import { drawScene, vignette } from '../../art/fx.js';
import { heroSprite, mercSprite } from '../../art/sprites.js';
import { blit } from '../../art/pixel.js';
import { scene as sceneDef } from '../../art/backgrounds.js';
import { audio } from '../../core/audio.js';
import { HEROES } from '../../data/heroes.js';
import { partyMembers } from '../../game/state.js';
import { openInn, openPub, openSmithy, openClinic, openChurch } from '../sheets/town.js';
import { openNotebook } from '../sheets/notebook.js';
import { openParty } from '../sheets/party.js';
import { openSettings } from '../sheets/settings.js';
import { openSummary } from '../sheets/summary.js';

const OPEN = { inn: openInn, pub: openPub, smithy: openSmithy, clinic: openClinic, church: openChurch };
const BLURB = {
  inn: 'Rest · the story moves on',
  pub: 'Hired blades · odd jobs',
  smithy: 'Reforge · gems · bracelets',
  clinic: 'Charon’s remedies',
  church: 'Church of the White Ox',
};

export function townHud(place) {
  const s = app.state;
  return h(
    'div.hud',
    h('span.place', place),
    h('span.spacer'),
    h('span.stat', { title: 'Coins' }, '◎', h('b', String(s.coins))),
    h('span.stat', { title: 'Materials (for the Smithy)' }, '⚒', h('b', String(s.materials))),
    h('span.stat', { title: 'Mana (restored by rest)' }, '✦', h('b', `${s.mana}/${s.maxMana}`)),
    h('span.stat', { title: 'Salves · Panacea · Smelling Salts' }, '✚', h('b', `${s.items.salve}·${s.items.panacea}·${s.items.salts}`)),
  );
}

export const townScreen = {
  enter(params = {}) {
    audio.music('town');
    this.hover = null;
    this.build();
    if (params.summary) setTimeout(() => openSummary(params.summary), 350);
  },

  build() {
    const s = app.state;
    app.ui.replaceChildren();
    app.ui.append(townHud('Gehenna'));
    if (s.objective) app.ui.append(h('div.objective', s.objective));
    const sc = sceneDef('town');
    sc.hotspots.forEach((hs, idx) => {
      const el = h(
        'button.hotspot',
        {
          type: 'button',
          'aria-label': hs.label,
          style: { left: `${hs.x * 2}px`, top: `${hs.y * 2}px`, width: `${hs.w * 2}px`, height: `${hs.h * 2}px` },
          onmouseenter: () => (this.hover = hs.id),
          onmouseleave: () => (this.hover = null),
          onfocus: () => (this.hover = hs.id),
          onblur: () => (this.hover = null),
          onclick: () => OPEN[hs.id]?.(() => this.build()),
        },
        h('span.tag', h('span.badge', String(idx + 1)), hs.label, h('small', hs.id === 'inn' && s.pendingRest ? 'Rest — the story continues' : BLURB[hs.id])),
      );
      app.ui.append(el);
    });
    // party strip
    const strip = h('div.party-strip');
    for (const m of partyMembers(s)) {
      strip.append(
        h(
          'div.panel.mini',
          { style: { position: 'relative' } },
          h('div.nm', h('b', { style: { color: m.kind === 'merc' ? '#d8ccb8' : HEROES[m.id]?.color } }, m.name), h('span.dim', `${m.hp}/${m.maxHp}`)),
          bar(m.hp, m.maxHp),
        ),
      );
    }
    app.ui.append(strip);
    const canLeave = Object.entries(s.unlocked).some(([k, v]) => v && !s.cleared[k] && k !== 'manor');
    app.ui.append(
      h(
        'div.dock',
        btn('Party', () => openParty(() => this.build()), { cls: 'small', key: 'P' }),
        btn('Notebook', () => openNotebook(), { cls: 'small', key: 'N' }),
        btn('⚙', () => openSettings(), { cls: 'small', title: 'Settings' }),
        btn('Leave Town ▸', () => app.go('map'), {
          cls: `depart${canLeave && !s.pendingRest ? ' primary' : ''}`,
          key: 'M',
          title: s.pendingRest ? 'Rest at the Inn first — the story is waiting.' : 'Travel beyond the gate',
        }),
      ),
    );
  },

  render(ctx, t) {
    const s = app.state;
    drawScene(ctx, 'town', t);
    const sc = sceneDef('town');
    if (this.hover) {
      const hs = sc.hotspots.find((x) => x.id === this.hover);
      if (hs) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = `rgba(255,220,160,${0.07 + 0.03 * Math.sin(t / 200)})`;
        ctx.fillRect(hs.x * 2, hs.y * 2, hs.w * 2, hs.h * 2);
        ctx.restore();
        ctx.strokeStyle = 'rgba(232,204,128,0.6)';
        ctx.lineWidth = 2;
        ctx.strokeRect(hs.x * 2 + 1, hs.y * 2 + 1, hs.w * 2 - 2, hs.h * 2 - 2);
      }
    }
    // townsfolk
    const people = [];
    if (s.chapter >= 1 && s.flags.metHestia && !s.cleared.ruins) people.push({ img: heroSprite('hestia'), x: 480, y: 420 });
    people.push({ img: heroSprite('charon'), x: 852, y: 424 });
    const party = partyMembers(s);
    party.forEach((m, i) => {
      people.push({ img: m.kind === 'merc' ? mercSprite(m) : heroSprite(m.id, s.flags), x: 290 + i * 60, y: 456 + (i % 2) * 6 });
    });
    for (const p of people) {
      const bob = Math.round(Math.sin(t / 600 + p.x)) * 2;
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(p.x - 22, p.y - 3, 44, 5);
      blit(ctx, p.img, p.x, p.y + bob, 2);
    }
    vignette(ctx, 0.5);
  },

  key(e) {
    const k = e.key.toLowerCase();
    const n = parseInt(e.key, 10);
    const spots = sceneDef('town').hotspots;
    if (n >= 1 && n <= spots.length) {
      e.preventDefault();
      this.hover = spots[n - 1].id;
      OPEN[spots[n - 1].id]?.(() => this.build());
    } else if (k === 'p') openParty(() => this.build());
    else if (k === 'n') openNotebook();
    else if (k === 'm') app.go('map');
  },
};
