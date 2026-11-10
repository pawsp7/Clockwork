import { app } from '../app.js';
import { h, btn, pix } from '../dom.js';
import { monsterArt, EYE_GLOW } from '../../art/creatures.js';
import { MONSTERS } from '../../data/monsters.js';
import { EYES, SHAPES, LIMBS, LABEL, SHORT } from '../../data/constants.js';
import { traitKey, profileShort } from '../../game/notebook.js';
import { elementColor } from '../screens/combat.js';

const SHAPE_ICON = { triangle: '▲', square: '■', circle: '●' };

export function openNotebook(tab = 'traits') {
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
        btn('Traits', () => {
          tab = 'traits';
          app.refreshSheet();
        }, { cls: `small${tab === 'traits' ? ' selected' : ''}` }),
        btn('Bestiary', () => {
          tab = 'bestiary';
          app.refreshSheet();
        }, { cls: `small${tab === 'bestiary' ? ' selected' : ''}` }),
        btn('How it works', () => {
          tab = 'help';
          app.refreshSheet();
        }, { cls: `small${tab === 'help' ? ' selected' : ''}` }),
      ),
      btn('✕', close, { cls: 'small ghost' }),
    );
    let body;
    if (tab === 'bestiary') body = bestiary(s);
    else if (tab === 'help') body = help();
    else body = traits(s);
    return h('div.panel.sheet.notebook-page', head, h('div.sheet-body', body));
  };
  app.openSheet(build);
}

function pills(entry) {
  if (!entry) return [h('span.faint', '—')];
  const out = [];
  for (const p of entry.profiles) {
    const [el] = p.split('.');
    out.push(h('span.tagpill', { style: { color: elementColor(el), borderColor: elementColor(el) + '88' } }, profileShort(p)));
  }
  for (const w of entry.weak) out.push(h('span.tagpill.weak', `Weak ${SHORT[w]}`));
  for (const r of entry.resist) out.push(h('span.tagpill.resist', `Resist ${SHORT[r]}`));
  return out.length ? out : [h('span.faint', 'seen, nothing noted')];
}

function traits(s) {
  const nb = s.notebook;
  const row = (feature, value, label) =>
    h('div.trait-row', h('div', label), h('div.tags', ...pills(nb.traits[traitKey(feature, value)])));
  return [
    h('p.dim', { style: { fontSize: '14px', marginBottom: '8px' } }, 'Every trait collects what creatures carrying it have done. When an enemy’s known traits agree, the notebook predicts its attack — and Alice’s watch shows it.'),
    h('div.section-title', 'Eyes'),
    EYES.map((e) => row('eye', e, h('span', h('span', { style: { color: EYE_GLOW[e] } }, '◉ '), cap(e)))),
    h('div.section-title', 'Shape'),
    SHAPES.map((sh) => row('shape', sh, `${SHAPE_ICON[sh]} ${cap(sh)}`)),
    h('div.section-title', 'Limbs'),
    LIMBS.map((l) => row('limbs', l, `${l} limbs`)),
  ];
}

function bestiary(s) {
  const nb = s.notebook;
  const grid = h('div.bestiary');
  for (const m of MONSTERS) {
    const st = nb.species[m.id];
    const known = st === 'identified';
    const learned = (nb.known || {})[m.id] || {};
    const art = monsterArt({ ...m, known: known ? null : { eye: !!learned.eye, shape: !!learned.shape, limbs: !!learned.limbs }, identified: known, seen: { profile: known } });
    const cell = h(
      `div.beast${st ? '' : '.unknown'}`,
      { title: known ? `${m.name} — ${SHORT[m.element]}.${SHORT[m.type]} · weak ${LABEL[m.weak]}${m.resist ? ' · resists ' + LABEL[m.resist] : ''}` : st ? 'Seen, not identified' : 'Not yet encountered' },
      h('span.n', String(m.index + 1)),
      pix(art, 2),
    );
    grid.append(cell);
  }
  return [h('p.dim', { style: { fontSize: '14px', marginBottom: '10px' } }, 'Identify a creature once (learn all three features) and every one of its kind is known on sight thereafter.'), grid];
}

function help() {
  return h(
    'div.col',
    { style: { fontSize: '15px', lineHeight: 1.5, color: 'var(--ink-dim)' } },
    h('p', 'Every creature in Gehenna has three features: eye colour, body shape and number of limbs. They start as shadows.'),
    h('p', 'When Mitzi STUDIES an enemy she notes one feature. Anything you then see it do — the element and weapon of its attack, what it is weak to, what it shrugs off — is written next to every feature you know.'),
    h('p', 'Next time you meet a shadow with green eyes, the notebook remembers what green-eyed things did. Know two features whose notes agree, and the guess becomes a prediction.'),
    h('p', 'Learn all three features and the creature is IDENTIFIED: its kind will be named on sight forever after.'),
    h('div.section-title', 'Elements'),
    h('p', 'Water beats Fire · Fire beats Earth · Earth beats Electric · Electric beats Water.'),
    h('p', 'Using an element leaves the user exposed to the one that beats it for the next round — enemies included. Watch for the coloured mark above a creature’s head.'),
  );
}

function cap(s) {
  return s[0].toUpperCase() + s.slice(1);
}
