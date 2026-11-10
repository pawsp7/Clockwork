import { MERC_TEMPLATES, ITEMS, GEM_PRICE, MINGLE_COST, DUNGEON_ORDER, DUNGEONS } from '../data/world.js';
import { ARMOUR_CRAFT, REFORGE_COST, MAX_WEAPON_LEVEL, BRACELET_COST, MAX_SLOTS, HEROES } from '../data/heroes.js';
import { BOSSES } from '../data/monsters.js';
import { EYES, SHAPES, LIMBS, RULES } from '../data/constants.js';
import { chance, int, pick, weighted } from '../core/rng.js';
import { healAll } from './state.js';

const ok = (msg, extra) => ({ ok: true, msg, ...extra });
const no = (msg) => ({ ok: false, msg });

function pay(state, cost) {
  if (state.coins < (cost.coins || 0)) return `Need ${cost.coins} coins.`;
  if (state.materials < (cost.materials || 0)) return `Need ${cost.materials} materials.`;
  state.coins -= cost.coins || 0;
  state.materials -= cost.materials || 0;
  return null;
}

// ─── Inn ───────────────────────────────────────────────────────────────────

export function rest(state) {
  healAll(state);
  const scene = state.pendingRest;
  state.pendingRest = null;
  return ok('You sleep. Health and mana return.', { scene });
}

// ─── Clinic (Charon) ───────────────────────────────────────────────────────

export function buyItem(state, id) {
  const item = ITEMS[id];
  if (!item) return no('Charon has never heard of that.');
  if (state.coins < item.price) return no(`Need ${item.price} coins.`);
  state.coins -= item.price;
  state.items[id] += 1;
  return ok(`Bought ${item.name}. Charon bites the coin.`);
}

export function charonAdvice(state) {
  const tips = [];
  if (!state.cleared.woods) {
    tips.push('Every unguarded claw goes for your cart. Supplies are your second heartbeat.');
    tips.push('Your watch shows one intent a round. Spend it on the one you fear most.');
  }
  if (state.notebook.unlocked) {
    tips.push('Have the violet one study before you swing. A creature you can name is a creature you can beat.');
    tips.push('Each note sticks to a trait. Two traits that agree on an attack? Believe them.');
  }
  tips.push('Use an element and you’re weak to its counter for a turn. So are they. Water drowns fire; fire burns earth; earth grounds lightning; lightning boils water.');
  if (state.cleared.volcano) tips.push('The red one drinks while her sister sleeps. Nobody here is as fine as they say.');
  if (state.cleared.fort) tips.push('Hestia is older than this town. Ask her where she was before the milk. Watch her eyes.');
  if (state.cleared.ruins) tips.push('Tomorrow you meet the Ox. Its wings resist everything — but they thin out every turn. Outlast them.');
  tips.push('Everyone here is dead, dear. I say it every day. Nobody listens. It’s very restful.');
  tips.push('Coins? I collect them. Call it a professional habit.');
  return pick(tips);
}

// ─── Smithy ────────────────────────────────────────────────────────────────

export function reforgeCost(hero) {
  return hero.weaponLevel >= MAX_WEAPON_LEVEL ? null : REFORGE_COST[hero.weaponLevel];
}

export function reforge(state, heroId, form) {
  const h = state.heroes[heroId];
  const cost = reforgeCost(h);
  if (!cost) return no('It can’t take any more work.');
  const err = pay(state, cost);
  if (err) return no(err);
  h.weaponLevel += 1;
  if (heroId === 'alice' && form) h.form = form;
  let msg = `${HEROES[heroId].name}’s weapon reforged to level ${h.weaponLevel}.`;
  if (heroId === 'alice' && h.weaponLevel === 3) msg += ' The watch grows a second hand: Alice can glimpse two enemies a round.';
  return ok(msg);
}

export const RETUNE_COST = 8;
export function retuneWatch(state, form) {
  const h = state.heroes.alice;
  if (h.form === form) return no('It already is.');
  if (state.coins < RETUNE_COST) return no(`Need ${RETUNE_COST} coins.`);
  state.coins -= RETUNE_COST;
  h.form = form;
  return ok(`The watch folds into a ${form}.`);
}

export function buyGem(state, element) {
  if (state.coins < GEM_PRICE) return no(`Need ${GEM_PRICE} coins.`);
  state.coins -= GEM_PRICE;
  state.gems[element] += 1;
  return ok(`Bought a ${element} gem.`);
}

export function braceletCost(hero) {
  return hero.bracelet.slots >= MAX_SLOTS ? null : BRACELET_COST[hero.bracelet.slots];
}

export function upgradeBracelet(state, heroId) {
  const h = state.heroes[heroId];
  const cost = braceletCost(h);
  if (!cost) return no('Four slots is all a wrist can bear.');
  const err = pay(state, cost);
  if (err) return no(err);
  h.bracelet.slots += 1;
  return ok(`${HEROES[heroId].name}’s bracelet now holds ${h.bracelet.slots} gems.`);
}

/** Put a loose gem into a hero's bracelet, or take one out (element=null with slot index). */
export function socketGem(state, heroId, element) {
  const h = state.heroes[heroId];
  if (h.bracelet.gems.length >= h.bracelet.slots) return no('No empty slot.');
  if (!state.gems[element]) return no('No loose gem of that kind.');
  state.gems[element] -= 1;
  h.bracelet.gems.push(element);
  return ok(`Set a ${element} gem in ${HEROES[heroId].name}’s bracelet.`);
}

export function unsocketGem(state, heroId, index) {
  const h = state.heroes[heroId];
  const g = h.bracelet.gems[index];
  if (!g) return no('Nothing there.');
  h.bracelet.gems.splice(index, 1);
  state.gems[g] += 1;
  return ok(`Took the ${g} gem out.`);
}

export function craftArmour(state, armourId) {
  const recipe = ARMOUR_CRAFT[armourId];
  if (!recipe) return no('The smith shrugs.');
  const h = state.heroes[recipe.hero];
  if (h.ownedArmours.includes(armourId)) return no('Already made.');
  const err = pay(state, recipe);
  if (err) return no(err);
  h.ownedArmours.push(armourId);
  return ok('Crafted. Equip it from the Party screen.');
}

export function equipArmour(state, heroId, armourId) {
  const h = state.heroes[heroId];
  if (!h.ownedArmours.includes(armourId)) return no('Not owned.');
  h.armour = armourId;
  return ok('Equipped.');
}

// ─── Pub: mercenaries ──────────────────────────────────────────────────────

export function mercLevel(state, templateId) {
  return state.mercLevels[templateId] || 0;
}

function patronFrom(state, t, i) {
  const lvl = mercLevel(state, t.id);
  const trialP = { 1: 0.5, 2: 0.3, 3: 0.15 }[t.rarity];
  return {
    template: t.id,
    name: t.name,
    line: t.line,
    rarity: t.rarity,
    level: lvl + 1,
    hp: t.hp + 3 * lvl,
    atk: t.atk + Math.floor((lvl + 1) / 2),
    type: t.type,
    gem: t.gem,
    look: t.look,
    tint: t.tint,
    price: Math.round(t.price * Math.pow(1.25, lvl)),
    offersTrial: chance(trialP),
    slot: i,
  };
}

export function mingle(state, { free = false } = {}) {
  if (!free) {
    if (state.coins < MINGLE_COST) return no(`Buying a round costs ${MINGLE_COST} coins.`);
    state.coins -= MINGLE_COST;
  }
  const hiredIds = state.hired.map((m) => m.template);
  const pool = MERC_TEMPLATES.filter((t) => !hiredIds.includes(t.id));
  const chosen = [];
  while (chosen.length < 3 && pool.length) {
    const t = weighted(pool.map((p) => [p, 1 / p.rarity]));
    chosen.push(t);
    pool.splice(pool.indexOf(t), 1);
  }
  state.mercPool = chosen.map((t, i) => patronFrom(state, t, i));
  return ok(free ? 'The regulars look up from their cups.' : 'You buy a round. New faces drift over.');
}

/** mode: 'pay' | 'bargain' | 'trial' */
export function hire(state, index, mode = 'pay') {
  const p = state.mercPool[index];
  if (!p) return no('Nobody’s there.');
  if (state.hired.length >= RULES.maxMercs) return no('Two hired blades is all the cart can feed.');
  let price = p.price;
  if (mode === 'bargain') price = Math.floor(price * 0.6);
  if (mode === 'trial') {
    if (!p.offersTrial) return no(`${p.name} doesn’t do trials.`);
    price = 0;
  }
  if (state.coins < price) return no(`Need ${price} coins.`);
  state.coins -= price;
  const merc = {
    uid: `merc_${p.template}`,
    kind: 'merc',
    template: p.template,
    name: p.name,
    hp: p.hp,
    maxHp: p.hp,
    atk: p.atk,
    type: p.type,
    gem: p.gem,
    level: p.level,
    rarity: p.rarity,
    look: p.look,
    tint: p.tint,
    trial: mode === 'trial',
    bargained: mode === 'bargain',
    willBetray: mode === 'bargain' && chance(0.2 + 0.05 * (4 - p.rarity)),
  };
  state.hired.push(merc);
  state.mercPool.splice(index, 1);
  const msg =
    mode === 'trial'
      ? `${p.name} joins on trial. Finish a Pub quest this expedition — or they help themselves to half of everything.`
      : mode === 'bargain'
        ? `${p.name} agrees to ${price} coins. Their smile is a little too wide.`
        : `${p.name} joins for ${price} coins.`;
  return ok(msg);
}

export function dismiss(state, uid) {
  const i = state.hired.findIndex((m) => m.uid === uid);
  if (i < 0) return no('Not hired.');
  const [m] = state.hired.splice(i, 1);
  return ok(`${m.name} shrugs and returns to the bar.`);
}

// ─── Pub: odd quests ───────────────────────────────────────────────────────

const TRAIT_LABEL = (f, v) => (f === 'eye' ? `${v}-eyed` : f === 'shape' ? `${v}-bodied` : `${v}-limbed`);

export function nextDungeon(state) {
  return DUNGEON_ORDER.find((d) => !state.cleared[d]) || null;
}

export function refreshQuests(state) {
  const next = nextDungeon(state);
  if (!next) {
    state.quests.board = [];
    return;
  }
  const d = DUNGEONS[next];
  const board = [];
  const used = new Set(state.quests.active.map((q) => q.kind));
  const kinds = ['cull', 'thrift', 'haul', 'hunt'];
  if (state.notebook.unlocked) kinds.push('study');
  let tries = 0;
  while (board.length < 3 && tries++ < 20) {
    const kind = pick(kinds);
    if (used.has(kind)) continue;
    used.add(kind);
    board.push(makeQuest(kind, d));
  }
  state.quests.board = board;
}

let questSeq = 0;
function makeQuest(kind, d) {
  const id = `q${Date.now().toString(36)}${++questSeq}`;
  switch (kind) {
    case 'cull': {
      const f = pick(['eye', 'shape', 'limbs']);
      const v = f === 'eye' ? pick(EYES) : f === 'shape' ? pick(SHAPES) : pick(LIMBS);
      const count = int(2, 3);
      return { id, kind, feature: f, value: v, count, reward: 10 + 6 * count, text: `Cull ${count} ${TRAIT_LABEL(f, v)} creatures in the ${d.name}.`, giver: 'A milk-carter with a limp' };
    }
    case 'thrift': {
      const count = 30 + 5 * d.tier;
      return { id, kind, count, reward: 30, text: `Come back from the ${d.name} with at least ${count} supplies.`, giver: 'The Inn’s quartermaster' };
    }
    case 'haul': {
      const count = 2;
      return { id, kind, count, reward: 24, text: `Bring back ${count} materials from the ${d.name}.`, giver: 'The smith’s apprentice' };
    }
    case 'hunt':
      return { id, kind, boss: d.boss, reward: 28, text: `Put down ${BOSSES[d.boss].name}.`, giver: 'A deacon who won’t give his name' };
    case 'study':
    default: {
      const count = 2;
      return { id, kind: 'study', count, reward: 34, text: `Identify ${count} new species for the Pub’s bestiary.`, giver: 'A ghoul with a pencil behind his ear' };
    }
  }
}

export function acceptQuest(state, id) {
  if (state.quests.active.length >= 2) return no('You can only carry two odd jobs at once.');
  const i = state.quests.board.findIndex((q) => q.id === id);
  if (i < 0) return no('Already taken.');
  const [q] = state.quests.board.splice(i, 1);
  state.quests.active.push(q);
  return ok(`Taken: ${q.text}`);
}

export function abandonQuest(state, id) {
  const i = state.quests.active.findIndex((q) => q.id === id);
  if (i < 0) return no('No such job.');
  state.quests.active.splice(i, 1);
  return ok('Job dropped.');
}

/** Called when an expedition ends. Pays out finished jobs and returns their status. */
export function evaluateQuests(state, ex) {
  const results = [];
  for (const q of state.quests.active.slice()) {
    let done = false;
    switch (q.kind) {
      case 'cull':
        done = ex.kills.filter((k) => k[q.feature] === q.value).length >= q.count;
        break;
      case 'thrift':
        done = state.supplies >= q.count;
        break;
      case 'haul':
        done = ex.materials >= q.count;
        break;
      case 'hunt':
        done = ex.kills.some((k) => k.boss === q.boss);
        break;
      case 'study':
        done = ex.identified >= q.count;
        break;
      default:
        break;
    }
    results.push({ ...q, done });
    if (done) {
      state.coins += q.reward;
      state.quests.completed += 1;
      state.quests.active.splice(state.quests.active.indexOf(q), 1);
    }
  }
  return results;
}

export function questProgress(state, q) {
  const ex = state.expedition;
  if (!ex) return null;
  switch (q.kind) {
    case 'cull':
      return `${Math.min(q.count, ex.kills.filter((k) => k[q.feature] === q.value).length)}/${q.count}`;
    case 'haul':
      return `${Math.min(q.count, ex.materials)}/${q.count}`;
    case 'study':
      return `${Math.min(q.count, ex.identified)}/${q.count}`;
    case 'thrift':
      return `${state.supplies}/${q.count}`;
    case 'hunt':
      return ex.kills.some((k) => k.boss === q.boss) ? 'done' : 'not yet';
    default:
      return null;
  }
}
