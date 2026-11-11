import { app } from '../app.js';
import { h, btn, pix, gemEl, bar } from '../dom.js';
import { heroSprite, mercSprite } from '../../art/sprites.js';
import { HEROES, WEAPONS, ARMOURS, REFORGE_COST, MAX_WEAPON_LEVEL } from '../../data/heroes.js';
import { ELEMENTS, LABEL, BEATS, COUNTER, RULES } from '../../data/constants.js';
import { attackPower, weaponType, saveGame, visionCount } from '../../game/state.js';
import { socketGem, unsocketGem, equipArmour } from '../../game/town.js';

/**
 * Party: every member, their gear, and an inspector that spells out
 * exactly what each piece does.
 */

const TYPE_TEXT = {
  slashing: 'Cuts. Creatures weak to Slashing take +50%; those that resist it take −50%.',
  piercing: 'Stabs. Creatures weak to Piercing take +50%; those that resist it take −50%.',
  blunt: 'Crushes. Creatures weak to Blunt take +50%; those that resist it take −50%.',
};

function pct(v) {
  return `${Math.round(v * 100)}%`;
}

function attackBreakdown(state, m) {
  const lvl = m.weaponLevel - 1;
  switch (m.id) {
    case 'alice':
      return [`Base ${HEROES.alice.baseAtk}`, lvl ? `+${lvl} from reforging` : null, `× 1.5 pocket-watch bond`];
    case 'mitzi':
      return [`Base ${state.flags.mitziAtk}${state.flags.mitziLocked ? ' (set in the Caldera)' : ''}`, lvl ? `+${lvl} from reforging` : null, '× 1.2 hammer bond'];
    case 'victoria':
      return [`Base ${HEROES.victoria.baseAtk}`, lvl ? `+${lvl} from reforging` : null, '× 1.2 spear bond'];
    default:
      return [];
  }
}

function inspector(state, sel, change) {
  if (!sel) {
    return h(
      'div.inspector',
      h('div.section-title', 'Inspect'),
      h('p.dim', 'Select a weapon, armour or gem on the left to see exactly what it does.'),
      h('div.section-title', 'How damage works'),
      h(
        'ul.rules',
        h('li', 'Attack type and element each push damage up or down: weakness +50%, resistance −50%.'),
        h('li', 'An element that beats the target’s own element: +50%. One it beats: −25%.'),
        h('li', 'Hitting a creature with the element it is exposed to: another +50%.'),
        h('li', 'Guarding blocks a blow completely — except the extra from your own weakness, which leaks through.'),
      ),
    );
  }
  const m = state.heroes[sel.hero];
  const out = [];
  if (sel.kind === 'weapon') {
    const w = WEAPONS[HEROES[m.id].weapon];
    const type = weaponType(state, m);
    out.push(h('h3', w.name), h('p.faint', `${HEROES[m.id].name}’s · level ${m.weaponLevel} of ${MAX_WEAPON_LEVEL}`));
    out.push(h('div.statline', h('span', 'Attack'), h('b', String(Math.round(attackPower(state, m))))));
    out.push(h('p.dim', attackBreakdown(state, m).filter(Boolean).join(' · ')));
    out.push(h('div.statline', h('span', 'Type'), h('b', LABEL[type])), h('p.dim', TYPE_TEXT[type]));
    out.push(h('div.statline', h('span', 'Bond'), h('b', w.note)));
    if (m.id === 'alice') {
      out.push(h('div.statline', h('span', 'Forms'), h('b', Object.values(w.forms).map((f) => `${f.label} (${LABEL[f.type]})`).join(' · '))));
      out.push(h('div.statline', h('span', 'Vision'), h('b', `${visionCount(state)} glimpse${visionCount(state) > 1 ? 's' : ''} a round`)), h('p.dim', m.weaponLevel < 3 ? 'At level 3 the watch grows a second hand: two glimpses a round.' : 'The second hand is running.'));
    }
    const next = REFORGE_COST[m.weaponLevel];
    out.push(h('p.dim', next ? `Next reforge at the Smithy: +1 base attack for ◎${next.coins} and ⚒${next.materials}.` : 'Fully reforged.'));
    out.push(h('p.lore', w.lore));
  } else if (sel.kind === 'armour') {
    const a = ARMOURS[sel.id];
    const res = Object.entries(a.resist);
    const weak = Object.entries(a.weak);
    out.push(h('h3', a.name), h('p.faint', m.armour === sel.id ? 'Worn' : m.ownedArmours.includes(sel.id) ? 'Owned' : 'Not owned'));
    for (const [k, v] of res) out.push(h('div.statline.good', h('span', 'Resists'), h('b', `${LABEL[k]} −${pct(v)} damage`)));
    for (const [k, v] of weak) out.push(h('div.statline.bad', h('span', 'Weak to'), h('b', `${LABEL[k]} +${pct(v)} damage`)));
    if (weak.length) out.push(h('p.dim', `Guarding against a ${weak.map(([k]) => LABEL[k]).join('/')} attack still lets that extra ${pct(weak[0][1])} through.`));
    out.push(h('p.lore', a.flavour));
    if (m.armour !== sel.id && m.ownedArmours.includes(sel.id)) out.push(btn('Wear this', () => change(equipArmour(state, m.id, sel.id)), { cls: 'small primary' }));
  } else if (sel.kind === 'gem') {
    const g = sel.element;
    out.push(h('h3', h('span.row', { style: { gap: '8px' } }, gemEl(g), `${LABEL[g]} gem`)));
    out.push(h('div.statline', h('span', 'Strong against'), h('b', `${LABEL[BEATS[g]]} creatures (+50%)`)));
    out.push(h('div.statline', h('span', 'Cost'), h('b', `${RULES.imbueCost} mana per imbued strike`)));
    out.push(h('div.statline.bad', h('span', 'Afterwards'), h('b', `${HEROES[m.id].name} is exposed to ${LABEL[COUNTER[g]]} for a round`)));
    out.push(h('p.dim', 'Pick it from the Imbue row in combat (or press G) before choosing Strike. Mana only returns with rest.'));
    if (sel.index != null) out.push(btn('Take it out', () => change(unsocketGem(state, m.id, sel.index), true), { cls: 'small' }));
  }
  return h('div.inspector', out);
}

export function openParty(onChange) {
  let sel = null;
  const change = (r, clearSel) => {
    if (!r.ok) app.toast(r.msg, false);
    else saveGame(app.state, 'auto');
    if (clearSel) sel = null;
    onChange?.();
    app.refreshSheet();
  };
  const pick = (v) => {
    sel = v;
    app.refreshSheet();
  };
  const build = (close) => {
    const s = app.state;
    const cards = [];
    for (const id of s.roster) {
      const m = s.heroes[id];
      if (id === 'hestia') {
        cards.push(
          h(
            'div.card.row',
            { style: { alignItems: 'flex-start', gap: '14px' } },
            pix(heroSprite('hestia'), 2, 'sprite-slot'),
            h('div.col', { style: { gap: '4px' } }, h('h3', 'Hestia'), h('p', 'Her strength changes from fight to fight. She doesn’t say by how much.'), h('p.lore', WEAPONS.cross.lore)),
          ),
        );
        continue;
      }
      const w = WEAPONS[HEROES[id].weapon];
      const type = weaponType(s, m);
      const gems = Array.from({ length: m.bracelet.slots }, (_, i) => {
        const g = m.bracelet.gems[i];
        return g
          ? btn(h('span.row', { style: { gap: '5px' } }, gemEl(g), LABEL[g]), () => pick({ hero: id, kind: 'gem', element: g, index: i }), { cls: `tiny${sel?.hero === id && sel.kind === 'gem' && sel.index === i ? ' selected' : ''}` })
          : h('span.chip', gemEl(null), ' empty');
      });
      const loose = m.bracelet.gems.length < m.bracelet.slots ? ELEMENTS.filter((g) => s.gems[g] > 0).map((g) => btn(h('span.row', { style: { gap: '5px' } }, '+', gemEl(g), `${LABEL[g]} (${s.gems[g]})`), () => change(socketGem(s, id, g)), { cls: 'tiny', title: 'Set this loose gem in the bracelet' })) : [];
      cards.push(
        h(
          'div.card',
          h(
            'div.row',
            { style: { alignItems: 'flex-start', gap: '14px' } },
            pix(heroSprite(id, s.flags), 2, 'sprite-slot'),
            h(
              'div.col.grow',
              { style: { gap: '5px' } },
              h('div.row', h('h3', { style: { color: HEROES[id].color } }, m.name), h('span.dim', `HP ${m.hp}/${m.maxHp}`), h('div.grow', bar(m.hp, m.maxHp))),
              h(
                'div.row',
                { style: { flexWrap: 'wrap', gap: '6px' } },
                h('span.faint', { style: { fontSize: '12px' } }, 'Weapon:'),
                btn(`${w.name} · Lv ${m.weaponLevel} · ${LABEL[type]} · ATK ${Math.round(attackPower(s, m))}`, () => pick({ hero: id, kind: 'weapon' }), { cls: `tiny${sel?.hero === id && sel.kind === 'weapon' ? ' selected' : ''}` }),
                id === 'mitzi' && !s.cleared.woods ? h('span.faint', '(won’t fight yet)') : null,
              ),
              h(
                'div.row',
                { style: { flexWrap: 'wrap', gap: '6px' } },
                h('span.faint', { style: { fontSize: '12px' } }, 'Armour:'),
                m.ownedArmours.map((aid) => btn(`${m.armour === aid ? '● ' : ''}${ARMOURS[aid].name}`, () => pick({ hero: id, kind: 'armour', id: aid }), { cls: `tiny${sel?.hero === id && sel.id === aid ? ' selected' : ''}` })),
              ),
              h('div.row', { style: { flexWrap: 'wrap', gap: '6px' } }, h('span.faint', { style: { fontSize: '12px' } }, `Bracelet (${m.bracelet.slots}):`), gems, loose),
            ),
          ),
        ),
      );
    }
    for (const m of s.hired) {
      cards.push(
        h(
          'div.card.row',
          { style: { gap: '14px' } },
          pix(mercSprite(m), 2, 'sprite-slot'),
          h('div.col', { style: { gap: '4px' } }, h('h3', m.name, h('span.faint', ` · hired, Lv ${m.level}`)), h('p', `HP ${m.hp}/${m.maxHp} · ATK ${m.atk} · ${LABEL[m.type]} · `, gemEl(m.gem), ` ${LABEL[m.gem]}`)),
        ),
      );
    }
    return h(
      'div.panel.sheet',
      h(
        'div.sheet-head',
        h('div', h('h2', 'Party'), h('div.sub', `Mana ${s.mana}/${s.maxMana} · Loose gems: ${ELEMENTS.map((g) => `${LABEL[g]} ${s.gems[g]}`).join(', ')}`)),
        h('div.spacer'),
        btn('✕', close, { cls: 'small ghost' }),
      ),
      h('div.sheet-body.split', h('div.col', cards), inspector(s, sel, change)),
    );
  };
  app.openSheet(build);
}
