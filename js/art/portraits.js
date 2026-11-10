import { compile, expandRows } from './pixel.js';

/**
 * Dialog portraits, 48×48, composed from mirrored layers:
 *   hair (back) → face → clothes → hair (front) → accessories → eyes / mouth patches.
 * Alice and Hestia have "living" eyes (iris, pupil, lashes) — Hestia's are a disguise.
 * Mitzi, Victoria and Charon have the vacant eyes of Gehenna's long-dead.
 */

const W = 48;
const blank = () => Array.from({ length: 48 }, () => '.'.repeat(24));
const fill = (rows, from, to, s) => {
  for (let i = from; i <= to; i++) rows[i] = s;
  return rows;
};

function compose(layers, patches = []) {
  const out = Array.from({ length: 48 }, () => Array(W).fill('.'));
  for (const rows of layers) {
    const full = expandRows({ mirror: true, rows });
    full.forEach((r, y) => {
      for (let x = 0; x < r.length; x++) if (r[x] !== '.' && r[x] !== ' ') out[y][x] = r[x];
    });
  }
  return expandRows({ rows: out.map((r) => r.join('')), patches });
}

// ─── shared face ───────────────────────────────────────────────────────────
const FACE = (() => {
  const r = blank();
  fill(r, 12, 30, '........ssssssssssssssss');
  r[31] = '.........sssssssssssssss';
  r[32] = '.........Sssssssssssssss';
  r[33] = '..........Ssssssssssssss';
  r[34] = '..........SSssssssssssss';
  r[35] = '...........SSsssssssssss';
  r[36] = '............SSSsssssssss';
  r[37] = '..............SSSSSsssss';
  r[38] = '...................SSsss';
  r[39] = '....................Ssss';
  fill(r, 40, 47, '....................ssss');
  return r;
})();

const BANGS = (() => {
  const r = blank();
  r[11] = '....hhhhhhhhhhhhhhhhhhhh';
  r[12] = '...hhhhhhhhhhhhhhhhHhhhh';
  r[13] = '...hhhhhhhhHhhhhhHHhhhhh';
  r[14] = '...hhhhhhhHhhhhhHhhhhhHh';
  r[15] = '..hhhhhhHhhhhhhHhhhhhHhh';
  r[16] = '..hhhhhhHhhhhh.Hhhhh.Hhh';
  r[17] = '..hhhhhHhhhhh..hhhh...hh';
  r[18] = '..hhhhhHhhh.....hhh....h';
  r[19] = '..hhhhHhh........h......';
  return r;
})();

const SHEEN = (() => {
  const r = blank();
  r[4] = '............llll........';
  r[5] = '..........llllll....llll';
  r[6] = '.........lll.......lll..';
  return r;
})();

function sideLocks(r, from, to, s) {
  for (let i = from; i <= to; i++) r[i] = s;
  return r;
}

// ─── eyes & mouths ─────────────────────────────────────────────────────────
const EYE = {
  alive: ['  xxxx ', ' xxxxxx', 'xxEEEEx', 'xEwwEEE', 'xEwwpEE', ' EeppeE', ' eeeeie', '  iiii '],
  vacant: ['  SSSS ', ' SvvvvS', 'Svwwvvv', 'Svwwvvv', 'Svvvvvv', ' vvvvvu', ' uvvvvu', '  uuuu '],
  closed: ['sssssss', 'sssssss', 'sssssss', 'ssxxxss', 'sxsssxs', 'xsssssx', 'sssssss', 'sssssss'],
  aliveSad: ['sssssss', 'sssssss', 'sxxxxxs', 'xxEEEEx', 'xEwpEEE', ' EeppeE', ' eeeeie', '  iiii '],
  vacantSad: ['sssssss', 'sssssss', 'sSSSSSs', 'SSvvvvS', 'Svwvvvv', ' vvvvvu', ' uvvvvu', '  uuuu '],
  aliveShock: ['  xxxx ', ' xxxxxx', 'xEEEEEx', 'xEweeEE', 'xEepeEE', ' EeeeeE', ' eeeeie', '  iiii '],
  vacantShock: [' SSSSS ', 'Svvvvvv', 'Svwwvvv', 'Svwwvvv', 'Svvvvvv', 'Svvvvvv', ' vvvvvu', '  uuuu '],
  angryLid: ['x      ', 'xxx    ', 'xxxxx  ', '  xxxxx'],
};

const rev = (rows) => rows.map((r) => r.split('').reverse().join(''));
function eyes(rows, y = 20) {
  return [
    { x: 13, y, rows },
    { x: 28, y, rows: rev(rows) },
  ];
}

const MOUTH = {
  neutral: [{ x: 22, y: 31, rows: [' mm '] }],
  happy: [{ x: 21, y: 30, rows: ['m    m', ' mmmm '] }],
  sad: [{ x: 21, y: 30, rows: [' mmmm ', 'm    m'] }],
  shock: [{ x: 22, y: 30, rows: [' mm ', 'm  m', ' mm '] }],
  angry: [{ x: 21, y: 31, rows: ['mmmmmm'] }],
  smirk: [{ x: 22, y: 30, rows: ['    m', ' mmm '] }],
};

const BLUSH = [{ x: 11, y: 28, rows: ['bbbb'] }, { x: 33, y: 28, rows: ['bbbb'] }];
const NOSE = [{ x: 23, y: 29, rows: ['nn'] }];

function moodPatches(kind, mood, opts = {}) {
  const alive = kind === 'alive';
  let eye = alive ? EYE.alive : EYE.vacant;
  let mouth = opts.mouth || MOUTH.neutral;
  let extra = [];
  if (mood === 'happy') {
    eye = EYE.closed;
    mouth = MOUTH.happy;
  } else if (mood === 'sad') {
    eye = alive ? EYE.aliveSad : EYE.vacantSad;
    mouth = MOUTH.sad;
  } else if (mood === 'shock') {
    eye = alive ? EYE.aliveShock : EYE.vacantShock;
    mouth = MOUTH.shock;
  } else if (mood === 'angry') {
    mouth = MOUTH.angry;
    extra = eyes(EYE.angryLid, 19);
  }
  return [...eyes(eye), ...extra, ...BLUSH, ...NOSE, ...mouth];
}

// ─── characters ───────────────────────────────────────────────────────────

const ALICE_PAL = {
  h: '#d898a8', H: '#b07484', D: '#845866', l: '#f0c4cc',
  s: '#f4e8de', S: '#dfc8bc', b: '#eeb0b8', m: '#b4606e', n: '#dcb8aa',
  x: '#3a2a34', E: '#3e5878', e: '#6a9cc0', i: '#a8d0e4', p: '#1a2232', w: '#f8fcff',
  W: '#f4f0ea', V: '#cfc6c2', c: '#e6dfd8', C: '#c0b6b0', g: '#c8a860', G: '#8a7040', k: '#241e28',
};

function alice(flags = {}, mood) {
  const back = blank();
  back[1] = '...............hhhhhhhhh';
  back[2] = '............hhhhhhhhhhhh';
  back[3] = '..........hhhhhhhhhhhhhh';
  back[4] = '.........hhhhhhhhhhhhhhh';
  back[5] = '........hhhhhhhhhhhhhhhh';
  back[6] = '.......hhhhhhhhhhhhhhhhh';
  back[7] = '......hhhhhhhhhhhhhhhhhh';
  back[8] = '.....hhhhhhhhhhhhhhhhhhh';
  fill(back, 9, 11, '....hhhhhhhhhhhhhhhhhhhh');
  fill(back, 12, 30, '...hhhhhhhhhhhhhhhhhhhhh');
  if (flags.shortHair) {
    fill(back, 31, 35, '...hhhhhhhhhhhhhhhhhhhhh');
    back[36] = '...HhhHhhhhhhhhhhhhhhhhh';
    back[37] = '....H..H..hhhhhhhhhhhhhh';
  } else {
    fill(back, 31, 40, '..Hhhhhhhhhhhhhhhhhhhhhh');
    fill(back, 41, 45, '..HHhhhhhhhhhhhhhhhhhhhh');
    fill(back, 46, 47, '..DHHhhhhhhhhhhhhhhhhhhh');
  }
  const front = BANGS.slice();
  sideLocks(front, 20, 30, '..hhhhHh................');
  if (flags.shortHair) {
    sideLocks(front, 31, 34, '..hhhhhH................');
    front[35] = '..hHhhHH................';
    front[36] = '...H.HH.................';
  } else {
    sideLocks(front, 31, 44, '..hhhhhH................');
    front[45] = '..hhhhH.................';
    front[46] = '..hHhH..................';
    front[47] = '..H.H...................';
  }
  const acc = blank();
  acc[7] = '......VWWWWWWWWWWWWWWWWW';
  acc[8] = '.....VWWWWWWWWWWWWWWWWWW';
  acc[9] = '.....VWVWWVWWVWWVWWVWWVW';
  acc[10] = '.....hVhhVhhVhhVhhVhhVhh';
  const clothes = blank();
  clothes[40] = '...............WWWWWWWWW';
  clothes[41] = '............WWWWWWWVWWWW';
  clothes[42] = '..........WWWWWWWWWVWWgg';
  clothes[43] = '........cWWWWWWWWWWVWggG';
  clothes[44] = '.......ccVVWWWWWWWVcccgg';
  clothes[45] = '......cccccVVVVVVVccccgg';
  clothes[46] = '.....ccccccccccccCcccccg';
  clothes[47] = '.....cccccccccccCccccccc';
  const patches = [
    { x: 35, y: 1, rows: [' WWW    WWW ', 'WVVWW  WWVVW', 'WVWWWWgWWWVW', 'WVVWWgGgWWVW', ' WWW WgW WWW', '     W W    ', '    WV  VW  '] },
    ...moodPatches('alive', mood),
  ];
  if (flags.eyepatch) {
    patches.push({ x: 27, y: 18, rows: ['  kkkkkk', ' kkkkkkkk', 'kkkkkkkkk', 'kkkkkkkkk', 'kkkkkkkkk', 'kkkkkkkkk', ' kkkkkkkk', '  kkkkkk', '   kkkk'] });
    patches.push({ x: 14, y: 8, rows: ['kk', ' kk', '  kk', '   kk', '    kk', '     kk', '      kk', '       kk', '        kk', '         kk', '          kk', '           kkk', '             kk'] });
  }
  return compose([back, FACE, clothes, front, SHEEN, acc], patches);
}

const MITZI_PAL = {
  h: '#b4a4cc', H: '#8c7ca8', D: '#665a80', l: '#dad0ea',
  s: '#eedfd2', S: '#d6c2b6', b: '#e6b4bc', m: '#a46a7a', n: '#d4b6aa',
  v: '#e4ecf2', u: '#bccad6', w: '#ffffff',
  W: '#efebe6', V: '#cac4c2', c: '#827f8a', C: '#66636e', g: '#c8aa66', k: '#3a3440', x: '#6a5a80',
};

function mitzi(flags, mood) {
  const back = blank();
  back[0] = '....hhhhh...............';
  back[1] = '...hhlllhh..............';
  back[2] = '..hhllhhhhh.............';
  back[3] = '..hhhhhhhhh.............';
  back[4] = '..hHhhhhhHh..hhhhhhhhhhh';
  back[5] = '...hHHHHHh.hhhhhhhhhhhhh';
  back[6] = '....hhhhhhhhhhhhhhhhhhhh';
  back[7] = '.....hhhhhhhhhhhhhhhhhhh';
  fill(back, 8, 11, '....hhhhhhhhhhhhhhhhhhhh');
  fill(back, 12, 30, '...hhhhhhhhhhhhhhhhhhhhh');
  const wave = ['..hhhhhhhhhhhhhhhhhhhhhh', '.hhhhhhhhhhhhhhhhhhhhhhh', '.hHhhhhhhhhhhhhhhhhhhhhh', 'hhHhhhhhhhhhhhhhhhhhhhhh', 'hHhhhhhhhhhhhhhhhhhhhhhh', 'hHhhhhhhhhhhhhhhhhhhhhhh', '.hHhhhhhhhhhhhhhhhhhhhhh', '.hhHhhhhhhhhhhhhhhhhhhhh', '..hHhhhhhhhhhhhhhhhhhhhh', '..hhHhhhhhhhhhhhhhhhhhhh', '.hhhHhhhhhhhhhhhhhhhhhhh', '.hhHhhhhhhhhhhhhhhhhhhhh', 'hhHhhhhhhhhhhhhhhhhhhhhh', 'hHhhhhhhhhhhhhhhhhhhhhhh', 'hHDhhhhhhhhhhhhhhhhhhhhh', '.hDHhhhhhhhhhhhhhhhhhhhh', '.hhDHhhhhhhhhhhhhhhhhhhh'];
  wave.forEach((s, i) => (back[31 + i] = s));
  const front = BANGS.slice();
  sideLocks(front, 20, 30, '..hhhhHh................');
  const locks = ['..hhhhhH................', '.hhhhhH.................', '.hhhhHh.................', 'hhhhHh..................', 'hhhHhh..................', 'hhhHhh..................', '.hhhHh..................', '.hhhhHh.................', '..hhhhH.................', '..hhhhHh................', '.hhhhHh.................', '.hhhHhh.................', 'hhhHhh..................', 'hhHhh...................', 'hHhhD...................', '.hhDD...................', '.hDD....................'];
  locks.forEach((s, i) => (front[31 + i] = s));
  const acc = blank();
  acc[4] = '.................k...k..';
  acc[5] = '................kk.k.kk.';
  acc[6] = '................kkkkkkkk';
  const clothes = blank();
  clothes[40] = '...............WWWWWWWWW';
  clothes[41] = '.............WWWWWWWWWVW';
  clothes[42] = '...........cWWWWWWWWWVVc';
  clothes[43] = '.........cccVWWWWWWVVccc';
  clothes[44] = '........ccccCVVVVVVCcccc';
  clothes[45] = '.......cccccccCccccccccg';
  clothes[46] = '......cccccccccCcccccccc';
  clothes[47] = '......ccccccccccCccccccg';
  return compose([back, FACE, clothes, front, SHEEN, acc], moodPatches('vacant', mood));
}

const VICTORIA_PAL = {
  h: '#a04a5a', H: '#7a3442', D: '#52222c', l: '#c4707e',
  s: '#eee4dc', S: '#d6c6be', b: '#dc9ca4', m: '#9a5060', n: '#d4b8ae',
  v: '#d4dce2', u: '#aab4be', w: '#f6faff',
  c: '#2e2c34', C: '#1e1c22', r: '#9a3444', R: '#6a2430', k: '#2a2a30', x: '#52222c', g: '#8a7a6a',
};

function victoria(flags, mood) {
  const back = blank();
  back[1] = '................hhhhhhhh';
  back[2] = '.............hhhhhhhhhhh';
  back[3] = '...........hhhhhhhhhhhhh';
  back[4] = '..........hhhhhhhhhhhhhh';
  back[5] = '.........hhhhhhhhhhhhhhh';
  back[6] = '........hhhhhhhhhhhhhhhh';
  back[7] = '.......hhhhhhhhhhhhhhhhh';
  back[8] = '......hhhhhhhhhhhhhhhhhh';
  fill(back, 9, 11, '.....hhhhhhhhhhhhhhhhhhh');
  fill(back, 12, 20, '....hhhhhhhhhhhhhhhhhhhh');
  fill(back, 21, 30, '...hhhhhhhhhhhhhhhhhhhhh');
  fill(back, 31, 38, '..Hhhhhhhhhhhhhhhhhhhhhh');
  fill(back, 39, 43, '..HHhhhhhhhhhhhhhhhhhhhh');
  fill(back, 44, 45, '.DHHhhhhhhhhhhhhhhhhhhhh');
  fill(back, 46, 47, '.DDHHhhhhhhhhhhhhhhhhhhh');
  const front = BANGS.slice();
  sideLocks(front, 20, 30, '..hhhhHh................');
  sideLocks(front, 31, 44, '..hhhhhH................');
  front[45] = '..hhhHH.................';
  front[46] = '..hHhH..................';
  front[47] = '..H.H...................';
  const acc = blank();
  acc[5] = '...............k..k..k..';
  acc[6] = '..............kk.kk.kk.k';
  acc[7] = '.............kkkkkkkkkkk';
  acc[8] = '............kk.kk.kk.kkk';
  const clothes = blank();
  clothes[40] = '...............ccccccccc';
  clothes[41] = '.............cccccccccCc';
  clothes[42] = '...........ccccccccccCcc';
  clothes[43] = '.........cccccrrcccccCcc';
  clothes[44] = '........ccccrrRrccccCccc';
  clothes[45] = '.......cccccrRRccccCcccc';
  clothes[46] = '......ccccccccccccCccccc';
  clothes[47] = '......cccccccccccCcccccc';
  const patches = [
    { x: 33, y: 2, rows: ['  rrr', ' rRrrr', 'rrRRrr', ' rrrr', '  r'] },
    { x: 38, y: 7, rows: ['rr', 'rRr', ' rRr', ' rRr', '  rR', '  rR', '   r', '   R', '  rR', '  r'] },
    ...moodPatches('vacant', mood),
  ];
  return compose([back, FACE, clothes, front, SHEEN, acc], patches);
}

const HESTIA_PAL = {
  h: '#e2dad0', H: '#bdb4aa', D: '#968e84', l: '#f6f2ec',
  s: '#f6eadf', S: '#e0cec2', b: '#f0bcbc', m: '#bc7480', n: '#dcc0b4',
  x: '#5a4a54', E: '#4c6c88', e: '#7ea6c4', i: '#b4d4e8', p: '#22303e', w: '#ffffff',
  W: '#f8f4ee', V: '#d8d0c8', c: '#eee8e0', C: '#cec6bc', g: '#c8a858', G: '#9a7c40',
};
const HESTIA_ANGRY = { E: '#7a1c24', e: '#b83a40', i: '#e07070', p: '#2a0a0e', w: '#ffc8c0' };

function hestia(flags, mood) {
  const back = blank();
  back[1] = '..............WWWWWWWWWW';
  back[2] = '...........WWWWWWWWWWWWW';
  back[3] = '.........WWWWWWWWWWWWWWW';
  back[4] = '........WWWWWWWWWWWWWWWW';
  back[5] = '.......WWWWWWWWWWWWWWWWW';
  back[6] = '......WWWWWWWWWWWWWWWWWW';
  back[7] = '.....WWWWWWWWWWWWWWWWWWW';
  back[8] = '....WWWWWWWWWWWWWWWWWWWW';
  fill(back, 9, 11, '...WWWWWWWWWWWWWWWWWWWWW');
  fill(back, 12, 38, '..VWWWWWWWWWWWWWWWWWWWWW');
  fill(back, 39, 47, '.VVWWWWWWWWWWWWWWWWWWWWW');
  const front = BANGS.slice().map((r, i) => (i >= 11 && i <= 19 ? r.replace(/^\.\./, '.V').replace(/^\.\.\./, '.VW') : r));
  front[9] = '....VWVWVWVWVWVWVWVWVWVW';
  front[10] = '....hVhhVhhVhhVhhVhhVhhV';
  sideLocks(front, 20, 34, '...VhhhHh...............');
  front[35] = '...VhhHh................';
  front[36] = '...VhHh.................';
  const clothes = blank();
  clothes[40] = '...............WWWWWWWWW';
  clothes[41] = '.............WWWWWWWWWWW';
  clothes[42] = '...........cWWWWWWWWWWWg';
  clothes[43] = '.........cccVVWWWWWWWWWg';
  clothes[44] = '........ccccCVVVVVVVVggg';
  clothes[45] = '.......cccccccCccccccccg';
  clothes[46] = '......cccccccccCcccccccg';
  clothes[47] = '......ccccccccccCccccccg';
  const patches = [{ x: 34, y: 0, rows: [' WW   WW', 'WVVW WVVW', 'WVWWgWWVW', ' WW G WW', '    W W'] }, ...moodPatches('alive', mood)];
  return compose([back, FACE, clothes, front, SHEEN], patches);
}

const CHARON_PAL = {
  h: '#7a5a44', H: '#5a4030', D: '#3e2a20', l: '#a08068',
  s: '#e4ccb4', S: '#cab09a', b: '#d29c92', m: '#8a5a50', n: '#cca896',
  v: '#bcd6c0', u: '#94b09a', w: '#f2faf2',
  c: '#5c4a3c', C: '#3e3228', W: '#d0c8b8', V: '#aaa292', g: '#d0b060', G: '#8a7040', k: '#c4ccd2', K: '#8a949a',
};

function charon(flags, mood) {
  const back = blank();
  back[2] = '..............hhhhhhhhhh';
  back[3] = '...........hhhhhhhhhhhhh';
  back[4] = '.........hhhhhhhhhhhhhhh';
  back[5] = '........hhhhhhhhhhhhhhhh';
  back[6] = '.......hhhhhhhhhhhhhhhhh';
  back[7] = '......hhhhhhhhhhhhhhhhhh';
  fill(back, 8, 11, '.....hhhhhhhhhhhhhhhhhhh');
  fill(back, 12, 34, '....hhhhhhhhhhhhhhhhhhhh');
  back[35] = '....Hhhhhhhhhhhhhhhhhhhh';
  back[36] = '.....HHhhhhhhhhhhhhhhhhh';
  back[37] = '.......HHHhhhhhhhhhhhhhh';
  const front = BANGS.slice();
  sideLocks(front, 20, 32, '....hhHh................');
  front[33] = '....hHHh................';
  front[34] = '....HhH.................';
  front[35] = '.....H..................';
  const clothes = blank();
  clothes[40] = '..............cccccWWWWW';
  clothes[41] = '............ccccccCWWWWW';
  clothes[42] = '..........cccccccCWWWWWg';
  clothes[43] = '.........ccccccccCWWWWgG';
  clothes[44] = '........cccccccccCWWWggg';
  clothes[45] = '.......ccccccccccCWWWWgg';
  clothes[46] = '......cccccccccccCWWWWWW';
  clothes[47] = '......cccccccccccCWWWWWW';
  const patches = [
    ...moodPatches('vacant', mood, { mouth: MOUTH.smirk }),
    { x: 11, y: 8, rows: ['  KKKK ', ' KkkkkK', 'KkwwkkkK', 'KkwkkkkK', 'KkkkkkkK', ' KkkkkK', '  KKKK '] },
  ];
  return compose([back, FACE, clothes, front, SHEEN], patches);
}

const THUG_PAL = { c: '#3a3440', C: '#2a2630', K: '#120f16', e: '#d8c070', g: '#7a6a4a' };

function thug() {
  const r = blank();
  r[6] = '..............cccccccccc';
  r[7] = '...........ccccccccccccc';
  r[8] = '.........ccccccccccccccc';
  r[9] = '........cccccccccccccccc';
  fill(r, 10, 12, '.......ccccccCCCCCCCCCCC');
  fill(r, 13, 16, '......ccccccCKKKKKKKKKKK');
  fill(r, 17, 32, '.....cccccCKKKKKKKKKKKKK');
  r[22] = '.....cccccCKKKKKeeKKKKKK';
  r[23] = '.....cccccCKKKKKeeKKKKKK';
  fill(r, 33, 38, '.....ccccccCKKKKKKKKKKKK');
  fill(r, 39, 41, '....ccccccccCCCCCCCCCCCC');
  fill(r, 42, 47, '...ccccccccccccccccccccc');
  return compose([r], [{ x: 21, y: 44, rows: ['gggggg'] }]);
}

// ─── public ───────────────────────────────────────────────────────────────

const BUILDERS = {
  alice: [alice, ALICE_PAL],
  mitzi: [mitzi, MITZI_PAL],
  victoria: [victoria, VICTORIA_PAL],
  hestia: [hestia, HESTIA_PAL],
  charon: [charon, CHARON_PAL],
  thug: [thug, THUG_PAL],
};

export function portrait(who, flags = {}, mood = null) {
  const b = BUILDERS[who];
  if (!b) return null;
  const [build, pal] = b;
  const fkey = who === 'alice' ? `${flags.shortHair ? 's' : 'l'}${flags.eyepatch ? 'p' : ''}` : '';
  const key = `portrait|${who}|${fkey}|${mood || ''}`;
  const palette = who === 'hestia' && mood === 'angry' ? { ...pal, ...HESTIA_ANGRY } : pal;
  return compile(key, { rows: build(flags, mood), palette });
}

export const PORTRAIT_SIZE = 48;
