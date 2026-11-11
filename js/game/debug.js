import { createState } from './state.js';
import { DUNGEONS, DUNGEON_ORDER } from '../data/world.js';
import { MONSTERS } from '../data/monsters.js';
import { identify } from './notebook.js';

/**
 * Debug stage jumps: builds a believable save for any point in the story, as if
 * the player had got there making good (or bad) choices.
 */

export const STAGES = [
  { id: 'prologue', label: 'Prologue', group: 'Start' },
  { id: 'town_1', label: 'Gehenna, before the Dead Woods', group: 'Start' },
  { id: 'woods', label: 'Dead Woods — entrance', group: 'Dead Woods' },
  { id: 'woods_boss', label: 'Dead Woods — Hollow Stag', group: 'Dead Woods' },
  { id: 'town_2', label: 'Gehenna, before the Caldera', group: 'The Caldera' },
  { id: 'volcano', label: 'Caldera — entrance', group: 'The Caldera' },
  { id: 'volcano_boss', label: 'Caldera — Cinder Maw', group: 'The Caldera' },
  { id: 'town_3', label: 'Gehenna, before the Fort', group: 'Abandoned Fort' },
  { id: 'fort', label: 'Fort — entrance', group: 'Abandoned Fort' },
  { id: 'fort_boss', label: 'Fort — Gatewarden', group: 'Abandoned Fort' },
  { id: 'town_4', label: 'Gehenna, before the Ruins', group: 'The Ruins' },
  { id: 'ruins', label: 'Ruins — entrance', group: 'The Ruins' },
  { id: 'ruins_boss', label: 'Ruins — Reliquary', group: 'The Ruins' },
  { id: 'last_night', label: 'The last night', group: 'Finale' },
  { id: 'ox', label: 'The White Ox', group: 'Finale' },
  { id: 'ending', label: 'Ending', group: 'Finale' },
];

const PAGES = { woods: 'page_drawing', volcano: 'page_ledger', fort: 'page_roster', ruins: 'page_hymn' };
const CAMP_LORE = { woods: 'woods_folk', volcano: 'milk_road', fort: 'fort_garrison', ruins: 'old_faith' };

/** Mark the first `n` dungeons as cleared, with their story consequences. */
function progress(s, n, good) {
  const f = s.flags;
  s.chapter = Math.min(4, n + 1);
  s.unlocked.woods = true;
  f.seenTownIntro = true;
  s.objective = 'Debug jump.';
  if (n >= 1) {
    if (!s.roster.includes('mitzi')) s.roster.push('mitzi', 'victoria');
    s.notebook.unlocked = true;
    f.mitziStudy = good ? 'woods' : 'boss';
    f.metHestia = true;
    f.aliceUp += good ? 2 : 0;
    s.scores.woods = { good: good ? 4 : 0, total: 4 };
  }
  if (n >= 2) {
    f.shortHair = true;
    f.mitziAtk = good ? 8 : 4;
    f.mitziLocked = true;
    s.scores.volcano = { good: good ? 4 : 0, total: 4 };
  }
  if (n >= 3) {
    f.victoriaMode = good ? 'assist' : 'interfere';
    s.scores.fort = { good: good ? 4 : 0, total: 4 };
  }
  if (n >= 4) {
    f.eyepatch = true;
    f.partyDefense = good;
    f.hestiaBoost = !good;
    f.hestiaWary = good ? 1 : 0;
    s.scores.ruins = { good: good ? 4 : 0, total: 4 };
  }
  DUNGEON_ORDER.forEach((d, i) => {
    if (i < n) {
      s.cleared[d] = true;
      s.lore.found.push(PAGES[d], CAMP_LORE[d]);
    }
    if (i <= n) s.unlocked[d] = true;
  });
  // equipment and purse that roughly match the point in the story
  for (const id of ['alice', 'mitzi', 'victoria']) s.heroes[id].weaponLevel = Math.min(4, 1 + n);
  s.heroes.alice.bracelet.slots = Math.min(3, 1 + Math.floor(n / 2));
  s.coins = 60 + 70 * n;
  s.materials = 2 + 2 * n;
  s.items = { salve: 2 + n, panacea: Math.floor(n / 2), salts: 1 + Math.floor(n / 2) };
  // the bestiary of a player who has studied as they went
  if (n >= 1) {
    for (const m of MONSTERS.filter((x) => x.tier <= n)) {
      const fake = { ...m, mid: m.id, known: { eye: true, shape: true, limbs: true }, seen: {} };
      identify(s, fake);
    }
  }
}

/**
 * Returns { state, go } where go says how the UI should enter the stage:
 *   { to: 'scene', scene } | { to: 'town' } | { to: 'dungeon', dungeon } | { to: 'boss', dungeon }
 *   { to: 'rest' } | { to: 'ox' } | { to: 'ending' }
 */
export function stageState(id, { good = true } = {}) {
  const s = createState();
  const order = DUNGEON_ORDER;
  if (id === 'prologue') return { state: s, go: { to: 'scene', scene: 'prologue' } };
  const town = id.match(/^town_(\d)$/);
  if (town) {
    progress(s, Number(town[1]) - 1, good);
    return { state: s, go: { to: 'town' } };
  }
  const dungeon = id.replace(/_boss$/, '');
  if (order.includes(dungeon)) {
    progress(s, order.indexOf(dungeon), good);
    if (dungeon === 'woods') s.roster = ['alice', 'mitzi', 'victoria'];
    if (dungeon === 'ruins' && id.endsWith('_boss')) {
      s.roster.push('hestia');
      s.flags.hestiaObey = 0.5;
    }
    if (id.endsWith('_boss') && dungeon === 'woods' && good) {
      s.notebook.unlocked = true;
      s.flags.mitziStudy = 'woods';
    }
    if (id.endsWith('_boss') && dungeon === 'volcano') s.flags.shortHair = true;
    if (id.endsWith('_boss') && dungeon === 'ruins') s.flags.eyepatch = true;
    return { state: s, go: { to: id.endsWith('_boss') ? 'boss' : 'dungeon', dungeon } };
  }
  progress(s, 4, good);
  if (id === 'last_night') {
    s.pendingRest = 'last_night';
    return { state: s, go: { to: 'rest' } };
  }
  s.chapter = 5;
  s.supplies = 100;
  if (good) {
    s.flags.nightTalk = 'charon';
    s.flags.aliceUp += 2;
  }
  if (id === 'ox') return { state: s, go: { to: 'ox' } };
  s.cleared.manor = true;
  s.flags.finalChoice = good ? 'finish' : 'stay';
  return { state: s, go: { to: 'ending' } };
}

export function bossNodeIndex(dungeon) {
  return DUNGEONS[dungeon].nodes.findIndex((n) => n.type === 'boss');
}
