import { app } from '../app.js';
import { h, btn, pix, gemEl } from '../dom.js';
import { portrait } from '../../art/portraits.js';
import { mercSprite, heroSprite } from '../../art/sprites.js';
import { audio } from '../../core/audio.js';
import { saveGame } from '../../game/state.js';
import {
  rest,
  buyItem,
  charonAdvice,
  reforge,
  reforgeCost,
  retuneWatch,
  RETUNE_COST,
  buyGem,
  upgradeBracelet,
  braceletCost,
  craftArmour,
  mingle,
  hire,
  dismiss,
  acceptQuest,
  abandonQuest,
} from '../../game/town.js';
import { ITEMS, GEM_PRICE, MINGLE_COST } from '../../data/world.js';
import { HEROES, WEAPONS, ARMOURS, ARMOUR_CRAFT } from '../../data/heroes.js';
import { ELEMENTS, LABEL } from '../../data/constants.js';
import { playScene } from '../flow.js';
import { CHARON_TOPICS, charonAnswer, gossip } from '../../story/lore.js';
import { pendingTalks } from '../../story/talks.js';

function sheet(title, sub, body, { foot, portraitOf, width } = {}) {
  return (close) =>
    h(
      'div.panel.sheet',
      width ? { style: { left: `${(960 - width) / 2}px`, right: `${(960 - width) / 2}px` } } : {},
      h(
        'div.sheet-head',
        portraitOf ? pix(portrait(portraitOf, app.state.flags), 2, 'portrait-slot') : null,
        h('div', h('h2', title), sub ? h('div.sub', sub) : null),
        h('div.spacer'),
        h('div.chip', '◎ ', h('b', String(app.state.coins))),
        h('div.chip', '⚒ ', h('b', String(app.state.materials))),
        btn('✕', close, { cls: 'small ghost', title: 'Close (Esc)' }),
      ),
      h('div.sheet-body', typeof body === 'function' ? body() : body),
      foot ? h('div.sheet-foot', foot) : null,
    );
}

function act(result, onChange) {
  app.toast(result.msg, result.ok);
  if (result.ok) {
    saveGame(app.state, 'auto');
    onChange?.();
  }
  app.refreshSheet();
}

function price(n) {
  return h(`span.price${app.state.coins < n ? '.cant' : ''}`, `◎ ${n}`);
}

// ─── Inn ───────────────────────────────────────────────────────────────────
export function openInn(onChange) {
  const s = app.state;
  const story = !!s.pendingRest;
  const last = s.pendingRest === 'last_night';
  const waiting = story ? pendingTalks(s).length : 0;
  app.openSheet(
    sheet(
      'The Inn',
      'Warm beds, thin walls.',
      () =>
        h(
          'div.col',
          h('p.dim', { style: { fontSize: '16px', lineHeight: 1.5 } }, story ? (last ? 'Tomorrow is the Manor. Whatever you mean to say, tonight is the night to say it. Make sure you’ve bought what you need first.' : 'Sleep, and Gehenna will move on without asking. Something is waiting for morning.') : 'A night’s sleep restores everyone’s health and mana. Nothing else will change.'),
          waiting ? h('p.brass', { style: { fontSize: '15px' } }, `… ${waiting === 1 ? 'Someone in town still wants' : `${waiting} people in town still want`} a word tonight. Once you sleep, the chance will pass.`) : null,
          h('div.row', btn(story ? 'Rest for the night' : 'Rest', () => doRest(onChange), { cls: 'primary' })),
        ),
      { width: 520 },
    ),
  );
}

function doRest(onChange) {
  const s = app.state;
  saveGame(s, 'rewind');
  const r = rest(s);
  saveGame(s, 'auto');
  app.closeSheet(true);
  audio.sfx('heal');
  if (r.scene) playScene(r.scene);
  else {
    app.toast(r.msg);
    onChange?.();
  }
}

// ─── Clinic ────────────────────────────────────────────────────────────────
export function openClinic(onChange) {
  let said = [charonAdvice(app.state)];
  let asked = null;
  const build = () => {
    const st = app.state;
    const topics = CHARON_TOPICS.filter((t) => t.when(st));
    return h(
      'div',
      h('div.speaker-card', h('div.bubble', said.map((line) => h('p', { style: { marginBottom: '6px' } }, line)))),
      h('div.section-title', 'Ask Charon about…'),
      h(
        'div.row',
        { style: { flexWrap: 'wrap', gap: '6px', marginBottom: '6px' } },
        topics.map((t) =>
          btn(t.q, () => {
            asked = t.id;
            said = charonAnswer(t, st);
            app.refreshSheet();
          }, { cls: `tiny${asked === t.id ? ' selected' : ''}` }),
        ),
        btn('Any advice?', () => {
          asked = null;
          said = [charonAdvice(st)];
          app.refreshSheet();
        }, { cls: 'tiny' }),
      ),
      h('div.section-title', 'Remedies'),
      Object.entries(ITEMS).map(([id, it]) =>
        h(
          'div.shop-row',
          h('div.info', h('h3', it.name), h('p', it.desc)),
          h('span.owned', `have ${st.items[id]}`),
          price(it.price),
          btn('Buy', () => act(buyItem(st, id), onChange), { cls: 'small', disabled: st.coins < it.price }),
        ),
      ),
    );
  };
  app.openSheet(sheet('Charon’s Clinic', 'Doctor. Ferrywoman. Professional spoilsport.', build, { portraitOf: 'charon', width: 720 }));
}

// ─── Church ────────────────────────────────────────────────────────────────
export function openChurch() {
  const s = app.state;
  if (!s.flags.metHestia) {
    app.toast('The church doors are barred. A sign: “Mass daily. Every day is Sunday.”', false);
    return;
  }
  const line = s.cleared.ruins
    ? 'The pews are empty. The candles are still warm. Nobody has seen Hestia since the Ruins.'
    : s.cleared.fort
      ? '“You look tired, lamb. Mass would lift that right off you.” Her smile does not reach her eyes.'
      : '“Lighter every week,” the faithful murmur, filing in. None of them look up.';
  app.openSheet(
    sheet('Church of the White Ox', 'Milk-white candles. A horned altar.', h('div.speaker-card', h('div.bubble', line)), {
      portraitOf: s.cleared.ruins ? null : 'hestia',
      width: 600,
    }),
  );
}

// ─── Pub ───────────────────────────────────────────────────────────────────
export function openPub(onChange, tab = 'mercs') {
  let heard = gossip(app.state);
  const build = () => {
    const s = app.state;
    const tabs = h(
      'div.row',
      { style: { marginBottom: '12px' } },
      btn('Hired Blades', () => {
        tab = 'mercs';
        app.refreshSheet();
      }, { cls: `small${tab === 'mercs' ? ' selected' : ''}` }),
      btn(`Odd Jobs (${s.quests.board.length})`, () => {
        tab = 'jobs';
        app.refreshSheet();
      }, { cls: `small${tab === 'jobs' ? ' selected' : ''}` }),
      btn('Gossip', () => {
        tab = 'gossip';
        app.refreshSheet();
      }, { cls: `small${tab === 'gossip' ? ' selected' : ''}` }),
    );
    if (tab === 'jobs') return h('div', tabs, jobs(onChange));
    if (tab === 'gossip') return h('div', tabs, h('div.section-title', 'Overheard at the bar'), heard.map((g) => h('div.shop-row', h('div.info', h('p', { style: { fontSize: '15px', color: 'var(--ink)' } }, `“${g}”`)))), btn('Listen some more', () => ((heard = gossip(s)), app.refreshSheet()), { cls: 'small' }));
    return h('div', tabs, mercs(onChange));
  };
  app.openSheet(sheet('The Pub', 'Sticky floors. Honest prices, mostly.', build, { width: 800 }));
}

function mercs(onChange) {
  const s = app.state;
  const out = [];
  out.push(
    h(
      'div.row',
      { style: { justifyContent: 'space-between', marginBottom: '6px' } },
      h('div.section-title', { style: { margin: 0 } }, 'At the bar'),
      btn(`Buy a round (◎ ${MINGLE_COST})`, () => act(mingle(s), onChange), { cls: 'small', disabled: s.coins < MINGLE_COST, title: 'Mingle: new faces drift over' }),
    ),
  );
  if (!s.mercPool.length) out.push(h('p.faint', 'Nobody looks up. Buy a round.'));
  s.mercPool.forEach((p, i) => {
    const full = s.hired.length >= 2;
    out.push(
      h(
        'div.shop-row',
        pix(mercSprite(p), 2, 'sprite-slot'),
        h(
          'div.info',
          h('h3', `${p.name} `, h('span.faint', `Lv ${p.level} · ${'★'.repeat(p.rarity)}`)),
          h('p', `HP ${p.hp} · ATK ${p.atk} · ${LABEL[p.type]} · `, gemEl(p.gem), ` ${LABEL[p.gem]}`),
          h('p.faint', `“${p.line}”`),
        ),
        h(
          'div.col',
          { style: { gap: '6px', alignItems: 'flex-end' } },
          h('div.row', price(p.price), btn('Hire', () => act(hire(s, i, 'pay'), onChange), { cls: 'small', disabled: full || s.coins < p.price })),
          h(
            'div.row',
            btn(`Bargain ◎${Math.floor(p.price * 0.6)}`, () => act(hire(s, i, 'bargain'), onChange), { cls: 'tiny', disabled: full || s.coins < Math.floor(p.price * 0.6), title: 'Cheaper. They might run off with your coin mid-expedition.' }),
            p.offersTrial ? btn('Free trial', () => act(hire(s, i, 'trial'), onChange), { cls: 'tiny', disabled: full, title: 'Free — but finish a Pub job on the expedition, or they may take half of everything.' }) : null,
          ),
        ),
      ),
    );
  });
  out.push(h('div.section-title', `Hired (${s.hired.length}/2) — each eats 1 supply per step and per battle`));
  if (!s.hired.length) out.push(h('p.faint', 'Nobody yet. They leave when the expedition ends, a little stronger and a little pricier.'));
  for (const m of s.hired) {
    out.push(
      h(
        'div.shop-row',
        pix(mercSprite(m), 2, 'sprite-slot'),
        h('div.info', h('h3', m.name, m.trial ? h('span.brass', ' · trial') : '', m.bargained ? h('span.bad', ' · bargained') : ''), h('p', `HP ${m.hp} · ATK ${m.atk} · ${LABEL[m.type]}`)),
        btn('Dismiss', () => act(dismiss(s, m.uid), onChange), { cls: 'tiny' }),
      ),
    );
  }
  return out;
}

function jobs(onChange) {
  const s = app.state;
  const out = [h('div.section-title', 'Pinned to the board')];
  if (!s.quests.board.length) out.push(h('p.faint', 'Nothing new. Check back after your next expedition.'));
  for (const q of s.quests.board) {
    out.push(
      h(
        'div.shop-row',
        h('div.info', h('h3', q.text), h('p', `From ${q.giver}.`)),
        h('span.price', `◎ ${q.reward}`),
        btn('Take', () => act(acceptQuest(s, q.id), onChange), { cls: 'small', disabled: s.quests.active.length >= 2 }),
      ),
    );
  }
  out.push(h('div.section-title', `Your jobs (${s.quests.active.length}/2) — paid when you return to town`));
  if (!s.quests.active.length) out.push(h('p.faint', 'None. Trial mercenaries expect you to finish one.'));
  for (const q of s.quests.active) {
    out.push(h('div.shop-row', h('div.info', h('h3', q.text)), h('span.price', `◎ ${q.reward}`), btn('Drop', () => act(abandonQuest(s, q.id), onChange), { cls: 'tiny' })));
  }
  return out;
}

// ─── Smithy ────────────────────────────────────────────────────────────────
export function openSmithy(onChange) {
  const build = () => {
    const s = app.state;
    const heroes = s.roster.filter((id) => id !== 'hestia');
    const out = [];
    out.push(h('div.section-title', 'Reforge'));
    for (const id of heroes) {
      const hero = s.heroes[id];
      const cost = reforgeCost(hero);
      const w = WEAPONS[HEROES[id].weapon];
      let forms = null;
      if (id === 'alice') {
        forms = h(
          'div.row',
          { style: { marginTop: '6px' } },
          h('span.faint', { style: { fontSize: '12px' } }, `Form (retune ◎${RETUNE_COST}):`),
          Object.entries(WEAPONS.watch.forms).map(([f, info]) =>
            btn(`${info.label} · ${LABEL[info.type]}`, () => act(retuneWatch(s, f), onChange), { cls: `tiny${hero.form === f ? ' selected' : ''}`, disabled: hero.form === f || s.coins < RETUNE_COST }),
          ),
        );
      }
      out.push(
        h(
          'div.shop-row',
          pix(heroSprite(id, s.flags), 2, 'sprite-slot'),
          h(
            'div.info',
            h('h3', `${w.name} `, h('span.faint', `Lv ${hero.weaponLevel}/4`)),
            h('p', w.note, id === 'alice' && hero.weaponLevel < 3 ? ' At Lv 3 the watch grows a second hand (two glimpses a round).' : ''),
            forms,
          ),
          cost ? h('div.col', { style: { alignItems: 'flex-end', gap: '4px' } }, h('span.price', `◎ ${cost.coins} + ⚒ ${cost.materials}`), btn('Reforge', () => act(reforge(s, id), onChange), { cls: 'small', disabled: s.coins < cost.coins || s.materials < cost.materials })) : h('span.faint', 'Masterwork'),
        ),
      );
    }
    out.push(h('div.section-title', `Gems · ◎ ${GEM_PRICE} each — set them in bracelets from the Party screen`));
    out.push(
      h(
        'div.row',
        ELEMENTS.map((g) =>
          btn(h('span.row', { style: { gap: '6px' } }, gemEl(g), `${LABEL[g]} (${s.gems[g]})`), () => act(buyGem(s, g), onChange), { cls: 'small', disabled: s.coins < GEM_PRICE }),
        ),
      ),
    );
    out.push(h('div.section-title', 'Bracelets'));
    for (const id of heroes) {
      const hero = s.heroes[id];
      const cost = braceletCost(hero);
      const slots = Array.from({ length: hero.bracelet.slots }, (_, i) => gemEl(hero.bracelet.gems[i] || null));
      out.push(
        h(
          'div.shop-row',
          h('div.info', h('h3', `${HEROES[id].name}’s bracelet `), h('p.row', { style: { gap: '6px' } }, slots, h('span.faint', `${hero.bracelet.slots}/4 slots`))),
          cost ? h('span.price', `◎ ${cost.coins} + ⚒ ${cost.materials}`) : null,
          cost ? btn('Add slot', () => act(upgradeBracelet(s, id), onChange), { cls: 'small', disabled: s.coins < cost.coins || s.materials < cost.materials }) : h('span.faint', 'Full'),
        ),
      );
    }
    out.push(h('div.section-title', 'Armour'));
    for (const [aid, recipe] of Object.entries(ARMOUR_CRAFT)) {
      if (!heroes.includes(recipe.hero)) continue;
      const a = ARMOURS[aid];
      const owned = s.heroes[recipe.hero].ownedArmours.includes(aid);
      out.push(
        h(
          'div.shop-row',
          h('div.info', h('h3', a.name, h('span.faint', ` · for ${HEROES[recipe.hero].name}`)), h('p', `Resists ${Object.keys(a.resist).map((k) => LABEL[k]).join('/')} · weak to ${Object.keys(a.weak).map((k) => LABEL[k]).join('/')}. ${a.flavour}`)),
          owned ? h('span.good', 'Owned') : h('span.price', `◎ ${recipe.coins} + ⚒ ${recipe.materials}`),
          owned ? null : btn('Craft', () => act(craftArmour(s, aid), onChange), { cls: 'small', disabled: s.coins < recipe.coins || s.materials < recipe.materials }),
        ),
      );
    }
    return out;
  };
  app.openSheet(sheet('The Smithy', 'Sparks, soot, and a smith who never blinks.', build, { width: 820 }));
}
