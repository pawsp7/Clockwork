import { app } from '../app.js';
import { h, btn } from '../dom.js';

/** Results after an expedition: rewards, odd jobs, mercenaries. */
export function openSummary(sum) {
  app.openSheet((close) =>
    h(
      'div.panel.sheet',
      { style: { left: '210px', right: '210px', top: '70px', bottom: 'auto' } },
      h('div.sheet-head', h('div', h('h2', `${sum.dungeon} cleared`), h('div.sub', `Back in Gehenna with ${sum.supplies} supplies to spare.`))),
      h(
        'div.sheet-body',
        h(
          'div.row',
          { style: { flexWrap: 'wrap', gap: '8px' } },
          h('span.chip', '◎ ', h('b', `+${sum.reward}`), ' bounty'),
          h('span.chip', '⚔ ', h('b', String(sum.kills ?? 0)), ' creatures felled'),
          h('span.chip', '◉ ', h('b', String(sum.identified ?? 0)), ' species identified'),
          h('span.chip', '⚒ ', h('b', String(sum.materials ?? 0)), ' materials found'),
        ),
        h('p.dim', { style: { marginTop: '12px', fontSize: '15px' } }, 'Look for … over the doors: people in town have things to say about where you’ve been. Spend your coin, then rest at the Inn — the story moves on while you sleep.'),
        sum.quests.length ? h('div.section-title', 'Odd jobs') : null,
        sum.quests.map((q) => h('div.shop-row', h('div.info', h('h3', q.text)), q.done ? h('span.good', `Done · ◎ ${q.reward}`) : h('span.faint', 'Not this time'))),
        sum.mercs.length ? h('div.section-title', 'Hired blades') : null,
        sum.mercs.length ? h('p.dim', `${sum.mercs.join(' and ')} collect their pay and head back to the Pub — a little stronger, a little pricier.`) : null,
        sum.robbed ? h('p.bad', { style: { marginTop: '10px' } }, `${sum.robbed.name}’s trial went unrewarded. They helped themselves to ${sum.robbed.coins} coins and half your goods on the way out.`) : null,
      ),
      h('div.sheet-foot', h('div.spacer'), btn('Into town', close, { cls: 'primary' })),
    ),
  );
}
