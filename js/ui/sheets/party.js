import { app } from '../app.js';
import { h, btn, pix, gemEl, bar } from '../dom.js';
import { heroSprite, mercSprite } from '../../art/sprites.js';
import { HEROES, WEAPONS, ARMOURS } from '../../data/heroes.js';
import { ELEMENTS, LABEL, BEATS, COUNTER } from '../../data/constants.js';
import { attackPower, weaponType, saveGame } from '../../game/state.js';
import { socketGem, unsocketGem, equipArmour } from '../../game/town.js';

export function openParty(onChange) {
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
            h('div.col', { style: { gap: '4px' } }, h('h3', 'Hestia'), h('p', 'Her strength changes from fight to fight. She doesn’t say by how much.'), h('p', 'Hestia’s Cross — its edge changes with every swing.')),
          ),
        );
        continue;
      }
      const a = ARMOURS[m.armour];
      const w = WEAPONS[HEROES[id].weapon];
      const type = weaponType(s, m);
      const gems = Array.from({ length: m.bracelet.slots }, (_, i) => {
        const g = m.bracelet.gems[i];
        return g
          ? btn(h('span.row', { style: { gap: '5px' } }, gemEl(g), LABEL[g]), () => change(unsocketGem(s, id, i)), { cls: 'tiny', title: `Imbue: strong vs ${LABEL[BEATS[g]]}, leaves ${m.name} weak to ${LABEL[COUNTER[g]]} next round. Click to remove.` })
          : h('span.chip', gemEl(null), ' empty');
      });
      const loose = m.bracelet.gems.length < m.bracelet.slots ? ELEMENTS.filter((g) => s.gems[g] > 0).map((g) => btn(h('span.row', { style: { gap: '5px' } }, '+', gemEl(g), `${LABEL[g]} (${s.gems[g]})`), () => change(socketGem(s, id, g)), { cls: 'tiny' })) : [];
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
              h('div.row', h('h3', { style: { color: HEROES[id].color } }, m.name), h('span.dim', `${m.hp}/${m.maxHp}`), h('div.grow', bar(m.hp, m.maxHp))),
              h('p', `${w.name} · Lv ${m.weaponLevel} · ${LABEL[type]} · ATK ${Math.round(attackPower(s, m))}`, id === 'mitzi' && !s.cleared.woods ? h('span.faint', ' (won’t fight yet)') : ''),
              h('p.faint', HEROES[id].blurb),
              h('div.row', { style: { flexWrap: 'wrap', gap: '6px' } }, h('span.faint', { style: { fontSize: '12px' } }, 'Armour:'), m.ownedArmours.map((aid) => btn(ARMOURS[aid].name, () => change(equipArmour(s, id, aid)), { cls: `tiny${m.armour === aid ? ' selected' : ''}`, title: ARMOURS[aid].flavour }))),
              h('p', h('span.good', `Resists ${Object.keys(a.resist).map((k) => LABEL[k]).join('/') || '—'}`), ' · ', h('span.bad', `Weak to ${Object.keys(a.weak).map((k) => LABEL[k]).join('/') || '—'}`)),
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
        h('div', h('h2', 'Party'), h('div.sub', `Mana ${s.mana}/${s.maxMana} · Imbuing a strike costs 2 · Loose gems: ${ELEMENTS.map((g) => `${LABEL[g]} ${s.gems[g]}`).join(', ')}`)),
        h('div.spacer'),
        btn('✕', close, { cls: 'small ghost' }),
      ),
      h('div.sheet-body', h('div.col', cards)),
    );
  };
  const change = (r) => {
    if (!r.ok) app.toast(r.msg, false);
    else saveGame(app.state, 'auto');
    onChange?.();
    app.refreshSheet();
  };
  app.openSheet(build);
}
