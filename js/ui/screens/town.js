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
import { pendingTalks, talkAt } from '../../story/talks.js';
import { playTalk } from '../flow.js';

const OPEN = { inn: openInn, pub: openPub, smithy: openSmithy, clinic: openClinic, church: openChurch };
const PLACE_NAME = { inn: 'the Inn', pub: 'the Pub', church: 'the Church', smithy: 'the Smithy', clinic: 'the Clinic' };
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
    // after a conversation, step inside the place it happened — without focusing a
    // button, so Enter pressed to finish the dialogue can't buy something by accident
    else if (params.open && OPEN[params.open]) {
      setTimeout(() => {
        if (app.sheet || app.screenName !== 'town') return;
        OPEN[params.open](() => this.build());
        setTimeout(() => document.activeElement?.blur?.(), 0);
      }, 380);
    }
  },

  /** Somebody with something to say plays first; otherwise the building opens. */
  visit(place) {
    const talk = talkAt(app.state, place);
    if (talk) return playTalk(talk);
    OPEN[place]?.(() => this.build());
  },

  /** Leaving with conversations unheard asks once: they won't wait for you. */
  leave() {
    const waiting = pendingTalks(app.state);
    if (!waiting.length) return app.go('map');
    const places = [...new Set(waiting.map((t) => PLACE_NAME[t.place]))];
    const where = places.length > 1 ? `${places.slice(0, -1).join(', ')} and ${places[places.length - 1]}` : places[0];
    app.openSheet((close) =>
      h(
        'div.panel.sheet',
        { style: { left: '230px', right: '230px', top: '150px', bottom: 'auto' } },
        h('div.sheet-head', h('div', h('h2', 'Before you go…'), h('div.sub', 'Gehenna moves on while you are away.'))),
        h(
          'div.sheet-body',
          h('p.dim', { style: { fontSize: '16px', lineHeight: 1.5 } }, `Someone at ${where} still wants a word. Once you set out, the chance will pass.`),
        ),
        h(
          'div.sheet-foot',
          btn('Stay and listen', close, { cls: 'small', key: 'Esc' }),
          h('div.spacer'),
          btn('Leave anyway ▸', () => app.go('map'), { cls: 'primary' }),
        ),
      ),
    );
  },

  build() {
    const s = app.state;
    app.ui.replaceChildren();
    app.ui.append(townHud('Gehenna'));
    const waiting = pendingTalks(s);
    if (s.objective) {
      app.ui.append(
        h(
          'div.objective',
          s.objective,
          waiting.length ? h('div.objective-talk', `… ${waiting.length === 1 ? 'Someone wants' : `${waiting.length} people want`} a word.`) : null,
        ),
      );
    }
    const sc = sceneDef('town');
    sc.hotspots.forEach((hs, idx) => {
      const talk = waiting.find((t) => t.place === hs.id);
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
          onclick: () => this.visit(hs.id),
        },
        h('span.tag', h('span.badge', String(idx + 1)), hs.label, h('small', talk ? `… ${talk.who}` : hs.id === 'inn' && s.pendingRest ? 'Rest — the story continues' : BLURB[hs.id])),
        talk ? h('span.talk-mark', { 'aria-hidden': 'true' }, '…') : null,
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
        btn('Leave Town ▸', () => this.leave(), {
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
      this.visit(spots[n - 1].id);
    } else if (k === 'p') openParty(() => this.build());
    else if (k === 'n') openNotebook();
    else if (k === 'm') this.leave();
  },
};
