import { compile } from './pixel.js';

/**
 * Overworld / battle chibis, 24×36. Lineless, big heads, dim palette.
 * Gehenna's residents have vacant, pupil-less eyes; Alice — still alive — has blue ones.
 * Rows are the left half; the right half is mirrored. Patches add asymmetric details.
 *
 * Legend: h/H/D/l hair · s/S skin · b blush · m mouth · x lash · e/E/w eyes
 *         W/V white cloth · c/C/K cloth · g/G gold · r/R accent · k crown/dark
 *         o/O shoes · T legs · p pouch
 */

const LEGS = ['........TT..', '........TT..', '........TT..', '........TS..', '.......ooo..', '.......oOo..'];

const ALICE_HEAD = [
  '............',
  '........hhhh',
  '......hhhhhh',
  '.....hhhhlll',
  '....hhllhhhh',
  '...hhWWWWWWW',
  '...hVWVWVWVW',
  '..hhhhhhhhhh',
  '..hhhHhhhHhh',
  '..hhHhhHhhhH',
  '.hhhHssxxxss',
  '.hhhHssewEss',
  '.hhhHsseEEss',
  '.hhhHsbeeess',
  '.hhhhHSssssm',
  '.hhhhhHSSsss',
];

const ALICE_BODY_LONG = [
  '.hhhhhhHWWWW',
  '.hhhhhHWWVWg',
  '..hhhhWWWWgg',
  '..hhhWWccccc',
  '..hhWWVccccc',
  '..hhWVVcCccc',
  '..hhVVCcCccc',
  '..hhsSCccccc',
  '...hssCccccc',
  '...hCcccccCc',
  '...Ccccccccc',
  '..Cccccccccc',
  '..CcCCcCCcCc',
  '..VWVWVWVWVW',
];

const ALICE_BODY_SHORT = [
  '.......HWWWW',
  '......WWWVWg',
  '......WWWWgg',
  '.....WWccccc',
  '....WWVccccc',
  '....WVVcCccc',
  '....VVCcCccc',
  '....sSCccccc',
  '....ssCccccc',
  '....CcccccCc',
  '...Ccccccccc',
  '..Cccccccccc',
  '..CcCCcCCcCc',
  '..VWVWVWVWVW',
];

const ALICE_HEAD_SHORT = ALICE_HEAD.map((r, i) => (i >= 14 ? r.replace(/^\.hhhh/, '..hhh') : r));

const ALICE_PAL = {
  h: '#d898a8', H: '#b07484', D: '#845866', l: '#ecbcc4',
  s: '#f2e4d8', S: '#dcc4b8', b: '#e8a8b0', m: '#b06070',
  x: '#3a2a34', e: '#78a8c8', E: '#384c68', w: '#f4f8fc',
  W: '#f2eee8', V: '#cfc6c2', c: '#e4ddd6', C: '#bdb3ae', K: '#948a88',
  g: '#c8a860', G: '#8a7040', o: '#4a4048', O: '#6a6068', T: '#e8dcd2', k: '#2a2430',
};

const ALICE_BOW = { x: 16, y: 1, rows: [' WW.WW', 'WVWgWVW', ' WWgWW', '  V V'] };
const ALICE_WATCH = { x: 18, y: 22, rows: ['g', 'Gg', 'gGg', ' g'] };
const EYEPATCH = { x: 14, y: 10, rows: ['kkkk', 'kkkk', 'kkkk', ' kk'] };
const EYEPATCH_STRAP = { x: 7, y: 6, rows: ['kk', '  kk', '    kk', '      kk', '       k'] };

function aliceDef(short, patch) {
  const rows = [...(short ? ALICE_HEAD_SHORT : ALICE_HEAD), ...(short ? ALICE_BODY_SHORT : ALICE_BODY_LONG), ...LEGS];
  const patches = [ALICE_BOW, ALICE_WATCH];
  if (patch) patches.push(EYEPATCH_STRAP, EYEPATCH);
  return { mirror: true, rows, palette: ALICE_PAL, patches };
}

const MITZI = {
  mirror: true,
  palette: {
    h: '#b4a4cc', H: '#8c7ca8', D: '#665a80', l: '#d6cce6',
    s: '#ecdccc', S: '#d4c0b4', b: '#e0b0b8', m: '#a06a78',
    e: '#dfe8ef', E: '#b6c6d2', w: '#ffffff',
    W: '#ece8e4', V: '#c8c2c0', c: '#807e88', C: '#64626c', K: '#4c4a54',
    r: '#a492bc', R: '#7a6890', k: '#3a3440', g: '#c4a868',
    o: '#e8e4e0', O: '#c8c4c0', p: '#5c4870', T: '#e4d4c8',
  },
  rows: [
    '..hhh.......',
    '.hhlhh......',
    '.hhhhHh.k.k.',
    '.hHhhH.kkkkk',
    '..hHHhhhhhhh',
    '..hhhhhhlhhh',
    '.hhhhhhhhhhh',
    '.hhhhHhhhhHh',
    '.hhhHhhHhhhH',
    'hhhhHhhHhhHh',
    'hhhHHsseeess',
    'hhhHhssweess',
    'hhhHhsseeess',
    'hhhHhsbEEEss',
    'hhhHhHSssssm',
    'hhHHhhHSSsss',
    'hhHhhhHWWWWW',
    'hHhhhcWWWVVc',
    'hHhhcccccccc',
    'hHhhcccccccg',
    'hHhccCcccccc',
    'hHhcCCcccccc',
    'DHhcCcccccCg',
    'DHhsScccccCc',
    'DDhssKKKKKKK',
    'DDhhrrrrrrrr',
    '.DDhrrrrrrrr',
    '.DDrrrrrrrrr',
    '.D.rrRrrrRrr',
    '...rR.rR.rR.',
    ...LEGS,
  ],
  patches: [{ x: 1, y: 24, rows: ['pp', 'ppp', 'pRp'] }],
};

const VICTORIA = {
  mirror: true,
  palette: {
    h: '#a04a5a', H: '#7a3442', D: '#52222c', l: '#c06a78',
    s: '#ece2da', S: '#d4c4bc', b: '#d89aa0', m: '#9a5060',
    e: '#cdd5dc', E: '#a4aeb8', w: '#f4f8fc',
    c: '#2e2c34', C: '#222028', K: '#18161c', W: '#4a4650',
    r: '#9a3444', R: '#6a2430', k: '#2a2a30',
    o: '#3a3640', O: '#56505a', T: '#e4dad2',
  },
  rows: [
    '............',
    '..........k.',
    '......k.k.kk',
    '.....kkkkkkk',
    '....hhhhhhhh',
    '...hhhhlhhhh',
    '..hhhhhhhhhh',
    '..hhhhHhhhhH',
    '.hhhhHhhhHhh',
    '.hhhHhhHhhhh',
    '.hhhHsseeess',
    '.hhhHssweess',
    '.hhhHsseeess',
    '.hhhHsbEEEss',
    '.hhhHHSssssm',
    'hhhhhHHSSsss',
    'hhhhhhHcCCcc',
    'hhhhhSccccCc',
    'hhhhSscccccc',
    'hhhSsScccccc',
    'hhHSsCcccccc',
    'hHDSsCcccccc',
    'hHDsSCcccccc',
    'DHD.sKKKKKKK',
    'DDD.CCcCCcCc',
    'DD.CcccCcccC',
    'DD.CccCccCcc',
    'D..CcCccCcCc',
    'D..CCcCCcCCc',
    '...C.CC.CC.C',
    ...LEGS,
  ],
  patches: [
    { x: 10, y: 18, rows: ['rr.rr', 'rrrrr', ' rrr', '  r'] },
    { x: 16, y: 2, rows: ['rr', 'rRr', ' rRr', '  rR', '  rR', '   r', '   R'] },
  ],
};

const HESTIA = {
  mirror: true,
  palette: {
    h: '#d8d0c6', H: '#b0a89e', D: '#8a8278', l: '#f0ebe4',
    s: '#f2e6da', S: '#dccabe', b: '#ecb8b8', m: '#b87078',
    e: '#a8c8de', E: '#7c9cb4', w: '#ffffff',
    W: '#f6f2ec', V: '#d6cec6', c: '#ece6de', C: '#ccc4ba', K: '#a8a096',
    g: '#c8a858', G: '#9a7c40', o: '#8a8278', O: '#a8a096', T: '#e8dcd0',
  },
  rows: [
    '............',
    '......WWWWWW',
    '....WWWWWWWW',
    '...WWVWWWWWW',
    '..WWVWWWWWWW',
    '..WVhhhhhhhh',
    '.WWhhhhlhhhh',
    '.WVhhhhhhhhh',
    '.WVhhHhhhHhh',
    '.WVhHhhHhhhh',
    '.WVhHsseeess',
    '.WVhHssweess',
    '.WVhHsseeess',
    '.WVhHsbEEEss',
    '.WVhhHSssssm',
    '.WVhhhHSSsss',
    '.WVVhhhWWWWW',
    '.VVccccWVVWW',
    '..Vccccccccg',
    '..Vcccccccgg',
    '..ccCcccccCg',
    '.cccCcccccCg',
    '.ccCCcccccCc',
    '.cssCcccccCc',
    '.cSsCcccccCc',
    '.cCCccccccCc',
    'ccCcccccccCc',
    'cCcccccccCcc',
    'CCccccccCccc',
    'KCKCKCKCKCKC',
    ...LEGS,
  ],
  patches: [{ x: 17, y: 0, rows: ['WW.WW', 'WVgVW', 'WW.WW'] }],
};

const HESTIA_ANGRY = { e: '#c04848', E: '#801c24', w: '#ffb0a8' };

const CHARON = {
  mirror: true,
  palette: {
    h: '#7a5a44', H: '#5a4030', D: '#3e2a20', l: '#9a7860',
    s: '#e0c8b0', S: '#c8ae98', b: '#d09a90', m: '#8a5a50',
    e: '#b4d0b8', E: '#88a890', w: '#f0f8f0',
    c: '#5c4a3c', C: '#463830', K: '#30261e', W: '#c8c0b0', V: '#a8a090',
    g: '#c8a858', G: '#8a7040', k: '#c8d0d4',
    o: '#3a3028', O: '#5a4a40', T: '#cbb8a4',
  },
  rows: [
    '............',
    '............',
    '.......hhhhh',
    '.....hhhhhhh',
    '....hhhhlhhh',
    '...hhhhhhhhh',
    '...hhhhhhhhh',
    '..hhhHhhhhHh',
    '..hhHhhhHhhh',
    '..hhHHhhhhhH',
    '..hhHsseeess',
    '..hhHssweess',
    '..hhHsseeess',
    '..hhHsbEEEss',
    '..hhhHSsssss',
    '..hhhhHSSsss',
    '...hhhCcWWWW',
    '...hCcccWVWW',
    '..CcccccCWWg',
    '..CcccccCWgg',
    '..CcccccCWgG',
    '..CccCccCWWW',
    '..CccCccCcWW',
    '..sScCccCcWW',
    '..SScCccCcWV',
    '...CcCccCccc',
    '...CcCcccCcc',
    '...CcCcccCcc',
    '...CcCcccCcc',
    '...KKKKKKKKK',
    ...LEGS,
  ],
  patches: [
    { x: 6, y: 3, rows: [' kk', 'kwkk', 'kkkk', ' kk'] },
    { x: 11, y: 14, rows: ['mm', '  m'] },
  ],
};

/** Hooded figure, palette-swapped for thugs and hired blades. */
const HOOD = {
  mirror: true,
  palette: {
    c: '#3a3440', C: '#2a2630', K: '#141218', e: '#d8c070', s: '#c8b4a0', S: '#a8947f',
    W: '#5a5262', g: '#8a7a5a', o: '#241f26', O: '#3a333c', T: '#3a343e',
  },
  rows: [
    '............',
    '............',
    '............',
    '............',
    '........cccc',
    '......cccccc',
    '.....ccccccc',
    '....cccCCCCC',
    '....ccCKKKKK',
    '...ccCKKKKKK',
    '...cCKKKKKeK',
    '...cCKKKKKKK',
    '...ccCKKKKKK',
    '...cccCCCCCC',
    '..cccccccccc',
    '..cCcccccccc',
    '..cCcccWcccc',
    '..cCccccWccc',
    '..cCcccccWcc',
    '..cCccccccWc',
    '..cCcccccccW',
    '..sCcccccccc',
    '..SCccccgggg',
    '...Ccccccccc',
    '...Ccccccccc',
    '...CCccccccc',
    '...CcCcccccc',
    '...CcCcccccc',
    '...CcCcccccc',
    '...C.CC.CC.C',
    '........TT..',
    '........TT..',
    '........TT..',
    '........TT..',
    '.......ooo..',
    '.......oOo..',
  ],
};

const KNIFE = { x: 2, y: 16, rows: ['  w', ' ww', ' w', 'w'] };

const LOOK_TINTS = {
  hood: null,
  cap: { c: '#4a4a56', C: '#34343e' },
  monk: { c: '#5a4a36', C: '#423626', W: '#8a7a5a' },
  brute: { c: '#3a4432', C: '#283022' },
};

export function heroSprite(id, flags = {}, mood) {
  switch (id) {
    case 'alice': {
      const key = `alice|${flags.shortHair ? 's' : 'l'}|${flags.eyepatch ? 'p' : ''}`;
      return compile(key, aliceDef(flags.shortHair, flags.eyepatch));
    }
    case 'mitzi':
      return compile('mitzi', MITZI);
    case 'victoria':
      return compile('victoria', VICTORIA);
    case 'hestia':
      return mood === 'angry' ? compile('hestia', HESTIA, HESTIA_ANGRY) : compile('hestia', HESTIA);
    case 'charon':
      return compile('charon', CHARON);
    default:
      return compile('hood', HOOD);
  }
}

export function mercSprite(merc) {
  const pal = { ...(LOOK_TINTS[merc.look] || {}) };
  if (merc.tint) {
    pal.c = merc.tint;
  }
  pal.e = '#d8d0b8';
  return compile(`merc|${merc.template || merc.name}`, HOOD, pal);
}

export function thugSprite(look) {
  if (look === 'knife') {
    return compile('thug_knife', { ...HOOD, patches: [{ ...KNIFE, rows: KNIFE.rows }] }, { c: '#40323a', C: '#2c2228', e: '#e08868', w: '#c8ccd0' });
  }
  return compile('thug_lanky', HOOD, { c: '#383a42', C: '#26282e', e: '#c8c060' });
}

export const SPRITE_W = 24;
export const SPRITE_H = 36;
