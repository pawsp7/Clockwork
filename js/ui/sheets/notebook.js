import { app } from '../app.js';
import { h, btn, pix } from '../dom.js';
import { monsterArt, EYE_GLOW } from '../../art/creatures.js';
import { MONSTERS } from '../../data/monsters.js';
import { EYES, SHAPES, LIMBS, LABEL } from '../../data/constants.js';
import { traitKey, profileLabel } from '../../game/notebook.js';
import { codexEntries, codexCount, bestiaryNote } from '../../story/lore.js';
import { elementColor } from '../screens/combat.js';

const SHAPE_ICON = { triangle: '▲', square: '■', circle: '●' };
const TABS = [
  ['traits', 'Traits'],
  ['bestiary', 'Bestiary'],
  ['codex', 'Codex'],
  ['help', 'How it works'],
];

export function openNotebook(tab = 'traits') {
  let beast = null;
  let entry = null;
  const build = (close) => {
    const s = app.state;
    const nb = s.notebook;
    const identified = Object.values(nb.species).filter((v) => v === 'identified').length;
    const seen = Object.keys(nb.species).length;
    const head = h(
      'div.sheet-head',
      h('div', h('h2', 'Mitzi’s Notebook'), h('div.sub', nb.unlocked ? `${identified} of 36 identified · ${seen} seen` : 'Mostly doodles. Mitzi hasn’t learned to study yet.')),
      h(
        'div.tabs',
        TABS.map(([id, label], i) =>
          btn(label, () => {
            tab = id;
            app.refreshSheet();
          }, { cls: `small${tab === id ? ' selected' : ''}`, key: String(i + 1) }),
        ),
      ),
      btn('✕', close, { cls: 'small ghost' }),
    );
    let body;
    if (tab === 'bestiary') body = bestiary(s, beast, (m) => ((beast = m), app.refreshSheet()));
    else if (tab === 'codex') body = codex(s, entry, (e) => ((entry = e), app.refreshSheet()));
    else if (tab === 'help') body = help();
    else body = traits(s);
    return h('div.panel.sheet.notebook-page', head, h('div.sheet-body', body));
  };
  app.openSheet(build, {
    key: (e) => {
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= TABS.length) {
        tab = TABS[n - 1][0];
        app.refreshSheet();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const i = TABS.findIndex(([id]) => id === tab);
        tab = TABS[(i + (e.key === 'ArrowRight' ? 1 : -1) + TABS.length) % TABS.length][0];
        app.refreshSheet();
      }
    },
  });
}

function pills(entry) {
  if (!entry) return [h('span.faint', '—')];
  const out = [];
  for (const p of entry.profiles) {
    const [el] = p.split('.');
    out.push(h('span.tagpill', { style: { color: elementColor(el), borderColor: elementColor(el) + '88' } }, profileLabel(p)));
  }
  for (const w of entry.weak) out.push(h('span.tagpill.weak', `Weak to ${LABEL[w]}`));
  for (const r of entry.resist) out.push(h('span.tagpill.resist', `Resists ${LABEL[r]}`));
  return out.length ? out : [h('span.faint', 'seen, nothing noted')];
}

function traits(s) {
  const nb = s.notebook;
  const row = (feature, value, label) => h('div.trait-row', h('div', label), h('div.tags', ...pills(nb.traits[traitKey(feature, value)])));
  return [
    h('p.dim', { style: { fontSize: '14px', marginBottom: '6px' } }, 'Each line lists what creatures with that trait have been seen doing: the element and weapon of their attacks (“Fire Slashing”), what hurt them extra, and what they shrugged off. When an enemy’s known traits agree, the notebook predicts its attack — and Alice’s watch shows it.'),
    h('div.section-title', 'Eyes'),
    EYES.map((e) => row('eye', e, h('span', h('span', { style: { color: EYE_GLOW[e] } }, '◉ '), cap(e)))),
    h('div.section-title', 'Shape'),
    SHAPES.map((sh) => row('shape', sh, `${SHAPE_ICON[sh]} ${cap(sh)}`)),
    h('div.section-title', 'Limbs'),
    LIMBS.map((l) => row('limbs', l, `${l} limbs`)),
  ];
}

function bestiary(s, sel, pick) {
  const nb = s.notebook;
  const grid = h('div.bestiary');
  for (const m of MONSTERS) {
    const st = nb.species[m.id];
    const known = st === 'identified';
    const learned = (nb.known || {})[m.id] || {};
    const art = monsterArt({ ...m, known: known ? null : { eye: !!learned.eye, shape: !!learned.shape, limbs: !!learned.limbs }, identified: known, seen: { profile: known } });
    grid.append(
      h(
        `button.beast${st ? '' : '.unknown'}${sel === m.id ? '.selected' : ''}`,
        { type: 'button', title: known ? m.name : st ? 'Seen, not identified' : 'Not yet encountered', onclick: () => pick(m.id) },
        h('span.n', String(m.index + 1)),
        pix(art, 2),
      ),
    );
  }
  let detail = h('p.dim', { style: { fontSize: '14px' } }, 'Identify a creature once — learn all three features — and every one of its kind is known on sight thereafter. Select one for details.');
  if (sel) {
    const m = MONSTERS.find((x) => x.id === sel);
    const st = nb.species[m.id];
    const learned = (nb.known || {})[m.id] || {};
    if (st === 'identified') {
      detail = h(
        'div.inspector',
        h('h3', m.name),
        h('div.statline', h('span', 'Features'), h('b', `${cap(m.eye)} eyes · ${m.shape} · ${m.limbs} limbs`)),
        h('div.statline', h('span', 'Attacks with'), h('b', { style: { color: elementColor(m.element) } }, `${LABEL[m.element]} ${LABEL[m.type]}`)),
        h('div.statline.good', h('span', 'Weak to'), h('b', `${LABEL[m.weak]} · ${LABEL[{ fire: 'water', earth: 'fire', electric: 'earth', water: 'electric' }[m.element]]}`)),
        h('div.statline.bad', h('span', 'Resists'), h('b', m.resist ? LABEL[m.resist] : 'nothing')),
        h('div.statline', h('span', 'Found in'), h('b', ['Dead Woods', 'The Caldera', 'Abandoned Fort', 'The Ruins'][m.tier - 1])),
        h('p.lore', bestiaryNote(m)),
      );
    } else if (st) {
      const bits = [learned.eye ? `${cap(m.eye)} eyes` : '? eyes', learned.shape ? m.shape : '? shape', learned.limbs ? `${m.limbs} limbs` : '? limbs'];
      detail = h('div.inspector', h('h3', 'An unidentified shadow'), h('div.statline', h('span', 'Noted so far'), h('b', bits.join(' · '))), h('p.dim', 'Study it again in battle to learn the rest.'));
    } else {
      detail = h('div.inspector', h('h3', 'Not yet encountered'), h('p.dim', `Somewhere in ${['the Dead Woods', 'the Caldera', 'the Abandoned Fort', 'the Ruins'][m.tier - 1]}.`));
    }
  }
  return h('div.split-notebook', grid, detail);
}

function codex(s, sel, pick) {
  const entries = codexEntries(s);
  const cats = ['People', 'Places', 'Faith', 'Things', 'Pages'];
  const list = h('div.codex-list');
  for (const cat of cats) {
    const items = entries.filter((e) => e.cat === cat);
    if (!items.length) continue;
    list.append(h('div.section-title', cat));
    for (const e of items) {
      list.append(btn(e.title, () => pick(e.id), { cls: `tiny codex-item${sel === e.id ? ' selected' : ''}` }));
    }
  }
  const cur = entries.find((e) => e.id === sel) || entries[0];
  const page = h(
    'div.inspector.codex-page',
    h('h3', cur.title),
    cur.found ? h('p.faint', `Found in ${cur.found}`) : h('p.faint', cur.cat),
    cur.text.map((t) => h('p', t)),
  );
  return [h('p.dim', { style: { fontSize: '13px', marginBottom: '8px' } }, `${entries.length} of ${codexCount()} entries. Pages turn up in caches; the rest fills in as the story moves.`), h('div.split-codex', list, page)];
}

function help() {
  return h(
    'div.col',
    { style: { fontSize: '15px', lineHeight: 1.5, color: 'var(--ink-dim)' } },
    h('p', 'Every creature in Gehenna has three features: eye colour, body shape and number of limbs. They start as shadows.'),
    h('p', 'When Mitzi STUDIES an enemy she notes one feature. Features stay noted for that kind of creature, so you’ll recognise them next time.'),
    h('p', 'Anything you see a creature do — the element and weapon of its attack, what hurt it extra, what it shrugged off — is written next to every feature you know.'),
    h('p', 'Meet a shadow with green eyes, and the notebook remembers what green-eyed things did. Know two features whose notes agree, and the guess becomes a prediction.'),
    h('div.section-title', 'Words used'),
    h(
      'div.kv',
      h('span', 'Elements'),
      h('span', 'Fire, Water, Earth, Electric'),
      h('span', 'Weapons'),
      h('span', 'Slashing (blades), Piercing (spears, needles), Blunt (hammers, fists)'),
      h('span', 'Weak to X'),
      h('span', 'takes +50% from X'),
      h('span', 'Resists X'),
      h('span', 'takes −50% from X'),
      h('span', 'Exposed'),
      h('span', 'just used an element — weak to the one that beats it for a round'),
    ),
    h('div.section-title', 'Elements'),
    h('p', 'Water beats Fire · Fire beats Earth · Earth beats Electric · Electric beats Water.'),
  );
}

function cap(s) {
  return s[0].toUpperCase() + s.slice(1);
}
