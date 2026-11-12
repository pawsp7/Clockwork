import { app } from '../app.js';
import { h, btn } from '../dom.js';
import { CG_LIST, cgThumb } from '../../art/cgs.js';

/** Gallery of event illustrations you have seen, kept across playthroughs. */
export function seenCgs() {
  try {
    return new Set(JSON.parse(localStorage.getItem('clockwork.cgs') || '[]'));
  } catch {
    return new Set();
  }
}

export function openMemories() {
  let view = null;
  const build = (close) => {
    const seen = seenCgs();
    if (view) {
      const cg = CG_LIST.find((c) => c.id === view);
      const c = document.createElement('canvas');
      c.width = 960;
      c.height = 540;
      c.className = 'memory-full';
      cgThumb(c, cg.id, 1);
      return h('div.panel.sheet', h('div.sheet-head', h('div', h('h2', cg.title), h('div.sub', cg.where)), h('div.spacer'), btn('◂ Gallery', () => ((view = null), app.refreshSheet()), { cls: 'small' })), h('div.sheet-body', c));
    }
    const grid = h('div.memories');
    for (const cg of CG_LIST) {
      const has = seen.has(cg.id);
      const c = document.createElement('canvas');
      c.width = 320;
      c.height = 180;
      if (has) cgThumb(c, cg.id, 1 / 3);
      grid.append(
        h(
          `button.memory${has ? '' : '.locked'}`,
          { type: 'button', disabled: !has, onclick: () => ((view = cg.id), app.refreshSheet()) },
          c,
          h('span', has ? cg.title : '???'),
        ),
      );
    }
    return h('div.panel.sheet', h('div.sheet-head', h('div', h('h2', 'Memories'), h('div.sub', `${[...seen].filter((id) => CG_LIST.some((c) => c.id === id)).length} of ${CG_LIST.length} remembered`)), h('div.spacer'), btn('✕', close, { cls: 'small ghost' })), h('div.sheet-body', grid));
  };
  app.openSheet(build);
}
