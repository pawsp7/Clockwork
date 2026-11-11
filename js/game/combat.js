import { BEATS, COUNTER, ELEMENTS, TYPES, RULES, FEATURES } from '../data/constants.js';
import { MONSTERS, MONSTER_BY_ID, BOSSES, FAITHFUL, speciesForTier } from '../data/monsters.js';
import { ITEMS } from '../data/world.js';
import { rand, chance, int, pick, weighted } from '../core/rng.js';
import {
  partyMembers,
  livingMembers,
  memberById,
  memberId,
  attackPower,
  weaponType,
  armourMods,
  visionCount,
  memberGems,
} from './state.js';
import { recordProfile, recordWeak, recordResist, study, predictedProfile } from './notebook.js';

/**
 * Combat rules (from the concept doc):
 *  - Alice glimpses one enemy's next move per round (two once her watch is reforged twice).
 *  - Every party member picks an action and a target enemy.
 *      Strike  — damage it. If it was attacking, you trade blows. If it guards, wasted.
 *      Guard   — if it attacks, nothing gets through (except the extra from your weakness).
 *      Study   — Mitzi notes one feature (eyes / shape / limbs).
 *  - Attacks nobody engaged hit the supplies, one at a time.
 *  - Using an element exposes the user to its counter-element for the next round.
 */

let uidSeq = 0;
const nextUid = () => `e${++uidSeq}`;

function freshKnowledge(identified) {
  return {
    known: { eye: identified, shape: identified, limbs: identified },
    seen: { profile: identified, weak: identified, resist: identified },
    identified,
  };
}

export function spawnMonster(state, proto) {
  const nb = state.notebook;
  const identified = nb.species[proto.id] === 'identified';
  if (!nb.species[proto.id]) nb.species[proto.id] = 'seen';
  const remembered = (nb.known || {})[proto.id];
  const knowledge = freshKnowledge(identified);
  if (remembered && !identified) knowledge.known = { ...knowledge.known, ...remembered };
  return {
    uid: nextUid(),
    mid: proto.id,
    name: proto.name,
    eye: proto.eye,
    shape: proto.shape,
    limbs: proto.limbs,
    element: proto.element,
    type: proto.type,
    weak: proto.weak,
    resist: proto.resist,
    tier: proto.tier,
    hp: proto.hp,
    maxHp: proto.hp,
    atk: proto.atk,
    intents: proto.intents,
    intent: null,
    revealed: false,
    exposed: null,
    exposedNext: null,
    isBoss: false,
    alive: true,
    ...knowledge,
  };
}

function spawnBoss(state, id) {
  const b = BOSSES[id];
  const atk = id === 'white_ox' && state.flags.hestiaBoost ? 10 : b.atk;
  return {
    uid: nextUid(),
    bossId: id,
    name: b.name,
    element: b.element,
    type: b.type,
    weak: b.weak,
    resist: b.resist,
    tier: b.tier,
    hp: b.hp,
    maxHp: b.hp,
    atk,
    def: b.def || 0,
    wings: b.wings || 0,
    intents: b.intents,
    maxMinions: b.maxMinions,
    intent: null,
    revealed: false,
    exposed: null,
    exposedNext: null,
    isBoss: true,
    alive: true,
    known: null,
    seen: { profile: id !== 'white_ox', weak: false, resist: false },
    identified: true,
  };
}

function spawnFaithful() {
  const f = FAITHFUL;
  return {
    uid: nextUid(),
    mid: null,
    faithful: true,
    name: f.name,
    eye: f.eye,
    shape: f.shape,
    limbs: f.limbs,
    element: f.element,
    type: f.type,
    weak: f.weak,
    resist: f.resist,
    tier: 5,
    hp: f.hp,
    maxHp: f.hp,
    atk: f.atk,
    intents: f.intents,
    intent: null,
    revealed: false,
    exposed: null,
    exposedNext: null,
    isBoss: false,
    alive: true,
    known: null,
    seen: { profile: true, weak: true, resist: true },
    identified: true,
  };
}

function spawnThug(which) {
  const base = which === 'a'
    ? { name: 'Lanky Thug', element: 'earth', type: 'blunt', weak: 'slashing', resist: null, hp: 6, atk: 2, look: 'lanky' }
    : { name: 'Knife Thug', element: 'fire', type: 'slashing', weak: 'blunt', resist: null, hp: 6, atk: 3, look: 'knife' };
  return {
    uid: `thug_${which}`,
    human: true,
    look: base.look,
    ...base,
    maxHp: base.hp,
    tier: 0,
    intents: { attack: 0.5, guard: 0.3, idle: 0.2 },
    intent: null,
    revealed: false,
    exposed: null,
    exposedNext: null,
    isBoss: false,
    alive: true,
    known: null,
    seen: { profile: false, weak: false, resist: false },
    identified: true,
  };
}

/**
 * opts: { kind: 'tutorial' | 'battle' | 'boss', tier, size, bossId, bg, label }
 */
export function createCombat(state, opts) {
  const kind = opts.kind || 'battle';
  const c = {
    kind,
    label: opts.label || 'Skirmish',
    bg: opts.bg || 'woods',
    tier: opts.tier || 1,
    bossId: opts.bossId || null,
    dungeon: opts.dungeon || null,
    round: 0,
    enemies: [],
    plans: {},
    visionLeft: 0,
    phase: 'plan',
    events: [],
    roundStart: [],
    log: [],
    hestiaAtk: int(6, 9),
    hestiaType: pick(TYPES),
    tutorial: kind === 'tutorial' ? { round: 0 } : null,
    afterScene: opts.after || null,
    result: null,
    rewards: null,
  };

  if (kind === 'tutorial') {
    c.enemies = [spawnThug('a'), spawnThug('b')];
  } else if (kind === 'boss') {
    const boss = spawnBoss(state, opts.bossId);
    c.enemies.push(boss);
    const n = BOSSES[opts.bossId].minions;
    for (let i = 0; i < n; i++) c.enemies.push(makeMinion(state, c));
  } else {
    const pool = speciesForTier(c.tier);
    const size = Math.max(1, Math.min(4, opts.size || 2));
    for (let i = 0; i < size; i++) c.enemies.push(spawnMonster(state, pick(pool)));
  }

  // Hestia's obedience slips with every fight she joins.
  if (state.roster.includes('hestia') && kind !== 'tutorial') {
    state.flags.hestiaObey = Math.max(0.3, state.flags.hestiaObey - 0.1);
  }

  for (const m of partyMembers(state)) {
    m.exposed = null;
    m.exposedNext = null;
  }

  state.combat = c;
  beginRound(state);
  return c;
}

function makeMinion(state, c) {
  if (c.bossId === 'white_ox') return spawnFaithful();
  return spawnMonster(state, pick(speciesForTier(c.tier)));
}

// ─── Rounds ────────────────────────────────────────────────────────────────

function rollIntent(e) {
  const entries = Object.entries(e.intents);
  let intent = weighted(entries);
  if (intent === 'summon') {
    const c = e._combat;
    const minions = c ? c.enemies.filter((x) => x.alive && !x.isBoss).length : 0;
    if (minions >= (e.maxMinions || 1)) intent = 'attack';
  }
  return intent;
}

function tutorialIntents(c) {
  const [a, b] = c.enemies;
  const r = c.round;
  if (r === 1) {
    a.intent = 'idle';
    b.intent = 'attack';
  } else if (r === 2) {
    a.intent = 'attack';
    b.intent = 'guard';
  } else if (r === 3) {
    a.intent = 'guard';
    b.intent = 'attack';
  } else if (b.alive && a.alive) {
    a.intent = 'guard';
    b.intent = r % 2 === 0 ? 'idle' : 'attack';
  } else {
    const last = a.alive ? a : b;
    last.intent = r % 2 === 0 ? 'idle' : 'attack';
  }
}

export function beginRound(state) {
  const c = state.combat;
  c.round += 1;
  c.plans = {};
  c.roundStart = [];
  for (const e of c.enemies) {
    e.revealed = false;
    e._combat = c;
  }
  const alive = c.enemies.filter((e) => e.alive);
  if (c.tutorial) {
    c.tutorial.round = c.round;
    tutorialIntents(c);
  } else {
    for (const e of alive) e.intent = rollIntent(e);
  }
  for (const e of c.enemies) delete e._combat;

  c.hestiaType = pick(TYPES);

  // Mitzi's notebook awakens mid-fight against the Hollow Stag if nothing else got through to her.
  if (c.bossId === 'hollow_stag' && !state.notebook.unlocked && c.round === 2) {
    state.notebook.unlocked = true;
    state.flags.mitziStudy = 'boss';
    c.roundStart.push({
      type: 'awaken',
      text: 'Mitzi, frozen behind Victoria, stares straight at the Stag — and starts scribbling. She can STUDY now.',
    });
  }

  const alice = state.heroes.alice;
  c.visionLeft = state.roster.includes('alice') && alice.hp > 0 ? visionCount(state) : 0;
  if (c.visionLeft === 0 && state.roster.includes('alice')) {
    c.roundStart.push({ type: 'blind', text: 'Alice is down. The watch shows nothing.' });
  }
  // Nothing to decide if Alice can see everyone.
  if (!c.tutorial && alive.length <= c.visionLeft) {
    for (const e of alive) e.revealed = true;
    c.visionLeft -= alive.length;
  }
  c.phase = 'plan';
}

/** Which enemies may be peeked this round (tutorial restricts it). */
export function canPeek(state, uid) {
  const c = state.combat;
  if (!c || c.phase !== 'plan' || c.visionLeft <= 0) return false;
  const e = c.enemies.find((x) => x.uid === uid);
  if (!e || !e.alive || e.revealed) return false;
  if (c.tutorial && c.round <= 3) return uid === 'thug_a';
  return true;
}

export function peek(state, uid) {
  if (!canPeek(state, uid)) return false;
  const c = state.combat;
  const e = c.enemies.find((x) => x.uid === uid);
  e.revealed = true;
  c.visionLeft -= 1;
  return true;
}

/** What the player can see of an enemy's next move. */
export function intentView(state, e) {
  if (!e.revealed) return { visible: false };
  const view = { visible: true, intent: e.intent };
  if (e.intent === 'attack' || e.intent === 'ransack' || e.intent === 'sweep') {
    if (e.bossId === 'white_ox') {
      if (!e._oxRoll) e._oxRoll = { element: pick(ELEMENTS), type: pick(TYPES) };
      view.profile = { ...e._oxRoll, certain: true };
    } else if (e.human) {
      view.profile = null;
    } else if (state.notebook.unlocked || e.isBoss) {
      view.profile = e.isBoss ? { element: e.element, type: e.type, certain: true } : predictedProfile(state, e);
    }
  }
  return view;
}

// ─── Planning ──────────────────────────────────────────────────────────────

export function mitziFights(state) {
  return state.cleared.woods;
}

export function actionsFor(state, m) {
  const c = state.combat;
  const out = [];
  const id = memberId(m);
  const anyItem = Object.values(state.items).some((n) => n > 0);
  const woodsMitzi = m.id === 'mitzi' && !mitziFights(state);
  const tutorialLock = c?.tutorial && c.round <= 2;

  out.push({
    id: 'strike',
    label: 'Strike',
    disabled: woodsMitzi ? 'Mitzi refuses to fight in the Dead Woods.' : null,
  });
  out.push({
    id: 'guard',
    label: 'Guard',
    disabled: woodsMitzi ? 'Mitzi refuses to fight in the Dead Woods.' : null,
  });
  out.push({ id: 'item', label: 'Item', disabled: anyItem && !tutorialLock ? null : 'No items to use.' });
  out.push({ id: 'wait', label: m.id === 'mitzi' && woodsMitzi ? 'Dawdle' : 'Wait', disabled: null });
  // Study is always the fifth order, so 1–4 mean the same thing for everyone.
  if (m.id === 'mitzi') {
    out.push({
      id: 'study',
      label: 'Study',
      disabled: state.notebook.unlocked ? null : 'Mitzi hasn’t learned to study yet.',
    });
  }
  if (tutorialLock) {
    const want = c.round === 1 ? 'strike' : 'guard';
    for (const a of out) if (a.id !== want && !a.disabled) a.disabled = 'Follow the watch for now.';
  }
  void id;
  return out;
}

export function tutorialGuide(state) {
  const c = state.combat;
  if (!c?.tutorial) return null;
  const peeked = c.enemies[0].revealed;
  switch (c.round) {
    case 1:
      return peeked
        ? { text: 'It will idle — a free opening. STRIKE the Lanky Thug. The other one is going for your supplies.', action: 'strike', target: 'thug_a' }
        : { text: 'Alice’s watch can glimpse one enemy’s next move. Click the watch above the Lanky Thug.', peek: 'thug_a' };
    case 2:
      return peeked
        ? { text: 'It will attack. GUARD it — a guarded attack does no harm.', action: 'guard', target: 'thug_a' }
        : { text: 'Glimpse the Lanky Thug again.', peek: 'thug_a' };
    case 3:
      return peeked
        ? { text: 'It will block, so striking it is wasted. The Knife Thug is a mystery: STRIKE it and trade blows, or GUARD it and give nothing away. Your call.' }
        : { text: 'Glimpse the Lanky Thug once more.', peek: 'thug_a' };
    default:
      return c.round === 4 ? { text: 'You’re on your own now. Glimpse whichever thug worries you most.' } : null;
  }
}

export function setPlan(state, id, plan) {
  const c = state.combat;
  if (!c || c.phase !== 'plan') return false;
  const m = memberById(state, id);
  if (!m || m.hp <= 0) return false;
  const action = actionsFor(state, m).find((a) => a.id === plan.action);
  if (!action || action.disabled) return false;
  if (c.tutorial && c.round <= 2 && plan.target !== 'thug_a') return false;
  if (['strike', 'guard', 'study'].includes(plan.action)) {
    const e = c.enemies.find((x) => x.uid === plan.target && x.alive);
    if (!e) return false;
  }
  if (plan.action === 'item') {
    if (!state.items[plan.item]) return false;
  }
  if (plan.gem && (!memberGems(m).includes(plan.gem) || state.mana < RULES.imbueCost)) plan.gem = null;
  c.plans[id] = { ...plan };
  return true;
}

export function clearPlan(state, id) {
  if (state.combat) delete state.combat.plans[id];
}

export function readyToResolve(state) {
  const c = state.combat;
  if (!c || c.phase !== 'plan') return false;
  if (c.tutorial && c.round <= 3 && !c.enemies[0].revealed) return false;
  if (c.tutorial && c.round <= 2) return !!c.plans.alice;
  return true;
}

// ─── Damage ────────────────────────────────────────────────────────────────

/** Multiplier of an attack (type + element) against a defender. */
export function multiplier(type, element, defender, isMember) {
  let m = 1;
  const tags = [];
  if (isMember) {
    const a = armourMods(defender);
    for (const k of [type, element]) {
      if (!k) continue;
      if (a.resist[k]) {
        m -= a.resist[k];
        tags.push('resist');
      }
      if (a.weak[k]) {
        m += a.weak[k];
        tags.push('weak');
      }
    }
  } else {
    if (defender.weak && defender.weak === type) {
      m += RULES.typeMod;
      tags.push('weak');
    }
    if (defender.resist && defender.resist === type) {
      m -= RULES.typeMod;
      tags.push('resist');
    }
    if (element && defender.element && defender.element !== 'all') {
      if (BEATS[element] === defender.element) {
        m += RULES.elementAdvantage;
        tags.push('super');
      } else if (BEATS[defender.element] === element) {
        m -= RULES.elementDisadvantage;
        tags.push('dull');
      }
    }
  }
  if (element && defender.exposed === element) {
    m += RULES.exposedBonus;
    tags.push('exposed');
  }
  if (defender.wings) {
    m -= defender.wings;
    tags.push('wings');
  }
  return { m: Math.max(0, m), tags };
}

function incomingFactor(state, c) {
  return c.bossId === 'white_ox' && state.flags.partyDefense ? 1 - RULES.partyDefense : 1;
}

// ─── Resolution ────────────────────────────────────────────────────────────

const ACTIVE = ['strike', 'guard', 'study', 'item'];

export function resolveRound(state) {
  const c = state.combat;
  if (!c || c.phase !== 'plan') return [];
  const ev = [];
  const push = (e) => {
    ev.push(e);
    if (e.text) c.log.push(e.text);
  };
  const members = livingMembers(state);
  const plans = {};
  for (const m of members) plans[memberId(m)] = { ...(c.plans[memberId(m)] || { action: 'wait' }) };

  // Cow bells — unless someone guards the Ox.
  const ox = c.enemies.find((e) => e.bossId === 'white_ox' && e.alive);
  if (ox && ox.intent === 'toll') {
    const muffler = members.find((m) => plans[memberId(m)].action === 'guard' && plans[memberId(m)].target === ox.uid);
    if (muffler) {
      push({ type: 'tollMuffled', who: memberId(muffler), enemy: ox.uid, text: `${muffler.name} seizes the Ox’s bells. They do not ring.` });
    } else {
      push({ type: 'toll', enemy: ox.uid, text: 'Cow bells ring from nowhere. Thoughts go soft and white.' });
      for (const m of members) {
        const p = plans[memberId(m)];
        if (ACTIVE.includes(p.action) && chance(0.35)) {
          plans[memberId(m)] = { action: 'entranced' };
          push({ type: 'entranced', who: memberId(m), text: `${m.name} forgets what they were doing.` });
        }
      }
    }
  }

  // Victoria steps in front of Mitzi.
  const vic = members.find((m) => m.id === 'victoria');
  const mitzi = members.find((m) => m.id === 'mitzi');
  if (vic && mitzi) {
    const mode = state.flags.victoriaMode;
    const inFort = state.expedition?.dungeon === 'fort' && mode === 'protective';
    const p = inFort ? 0.45 : mode === 'interfere' ? 0.4 : 0;
    const mp = plans.mitzi;
    if (p > 0 && ACTIVE.includes(mp.action) && plans.victoria.action !== 'entranced' && chance(p)) {
      plans.victoria = mp.action === 'strike' || mp.action === 'guard' ? { ...mp, gem: null } : { action: 'wait' };
      plans.mitzi = { action: 'interrupted' };
      push({ type: 'interfere', who: 'victoria', other: 'mitzi', text: 'Victoria steps in front of Mitzi. “I’ve got it.”' });
    }
  }

  // Hestia does as she pleases more and more often.
  const hestia = members.find((m) => m.id === 'hestia');
  if (hestia && chance(1 - state.flags.hestiaObey)) {
    const targets = c.enemies.filter((e) => e.alive);
    const choice = weighted([
      ['strike', 0.45],
      ['guard', 0.25],
      ['pray', 0.3],
    ]);
    plans.hestia = choice === 'pray' ? { action: 'pray' } : { action: choice, target: pick(targets).uid };
    push({
      type: 'disobey',
      who: 'hestia',
      text: choice === 'pray' ? 'Hestia ignores you and kneels to pray.' : 'Hestia ignores your order and does as she likes.',
    });
  }

  // Engagements
  const guardOf = {};
  const strikersOf = {};
  for (const m of members) {
    const p = plans[memberId(m)];
    if (p.action === 'guard' && p.target) {
      if (!guardOf[p.target]) guardOf[p.target] = memberId(m);
    }
  }

  // Party acts, frontline first.
  for (const m of members) {
    const id = memberId(m);
    const p = plans[id];
    if (m.hp <= 0) continue;
    if (p.action === 'strike') {
      let target = c.enemies.find((e) => e.uid === p.target && e.alive);
      if (!target) target = c.enemies.find((e) => e.alive);
      if (!target) continue;
      (strikersOf[target.uid] ||= []).push(id);
      let element = null;
      if (p.gem && state.mana >= RULES.imbueCost) {
        state.mana -= RULES.imbueCost;
        element = p.gem;
        m.exposedNext = COUNTER[element];
      }
      const type = m.id === 'hestia' ? pick(TYPES) : weaponType(state, m, c);
      if (target.intent === 'guard') {
        push({ type: 'strikeBlocked', who: id, enemy: target.uid, element, text: `${m.name} strikes — ${displayName(target)} blocks it.` });
        continue;
      }
      const { m: mult, tags } = multiplier(type, element, target, false);
      let dmg = Math.round(attackPower(state, m, c) * mult) - (target.def || 0);
      dmg = mult > 0 ? Math.max(1, dmg) : 0;
      target.hp = Math.max(0, target.hp - dmg);
      if (tags.includes('weak')) recordWeak(state, target);
      if (tags.includes('resist')) recordResist(state, target);
      push({
        type: 'strike',
        who: id,
        enemy: target.uid,
        dmg,
        tags,
        element,
        atkType: type,
        text: `${m.name} hits ${displayName(target)} for ${dmg}${tagText(tags)}.`,
      });
      if (target.hp <= 0 && target.alive) {
        target.alive = false;
        onKill(state, target);
        push({ type: 'enemyDown', enemy: target.uid, text: `${displayName(target)} falls.` });
      }
    } else if (p.action === 'study') {
      const target = c.enemies.find((e) => e.uid === p.target && e.alive);
      if (!target) continue;
      if (target.human) {
        push({ type: 'study', who: id, enemy: target.uid, text: 'It’s just a person. A rude one.' });
        continue;
      }
      const r = study(state, target);
      push({ type: 'study', who: id, enemy: target.uid, result: r, text: studyText(m, target, r) });
    } else if (p.action === 'item') {
      push(useItem(state, m, p));
    } else if (p.action === 'guard') {
      push({ type: 'guardStance', who: id, enemy: p.target, text: null });
    } else if (p.action === 'pray') {
      push({ type: 'pray', who: id, text: null });
    }
  }

  // Enemies act, one at a time.
  const factor = incomingFactor(state, c);
  for (const e of c.enemies) {
    const struck = strikersOf[e.uid] || [];
    if (!e.alive && !(e.intent === 'attack' || e.intent === 'ransack')) continue;
    if (!e.alive && !struck.length) continue;
    switch (e.intent) {
      case 'idle':
        push({ type: 'enemyIdle', enemy: e.uid, text: `${displayName(e)} hesitates.` });
        break;
      case 'guard':
        push({ type: 'enemyGuard', enemy: e.uid, text: null });
        break;
      case 'toll':
        break;
      case 'summon': {
        const minions = c.enemies.filter((x) => x.alive && !x.isBoss).length;
        if (minions < (e.maxMinions || 1) && c.enemies.length < 6) {
          const minion = makeMinion(state, c);
          c.enemies.push(minion);
          push({
            type: 'summon',
            enemy: e.uid,
            spawned: minion.uid,
            text: e.bossId === 'white_ox' ? 'The Ox calls the faithful to mass. One answers.' : `${displayName(e)} calls something out of the dark.`,
          });
        } else {
          push({ type: 'enemyIdle', enemy: e.uid, text: `${displayName(e)} calls out. Nothing answers.` });
        }
        break;
      }
      case 'attack':
      case 'ransack':
        enemyAttack(state, c, e, guardOf, struck, factor, push);
        break;
      case 'sweep':
        if (e.alive) enemySweep(state, c, e, factor, push);
        break;
      default:
        break;
    }
  }

  // Ox Wings thin out every round.
  for (const e of c.enemies) if (e.wings) e.wings = Math.max(0, Math.round((e.wings - 0.1) * 100) / 100);

  // Exposure lasts exactly one round.
  for (const x of [...c.enemies, ...partyMembers(state)]) {
    x.exposed = x.exposedNext || null;
    x.exposedNext = null;
  }
  for (const e of c.enemies) delete e._oxRoll;

  state.stats.rounds += 1;
  c.events = ev;
  finishRound(state, push);
  return ev;
}

function enemyAttack(state, c, e, guardOf, struck, factor, push) {
  let element = e.element;
  let type = e.type;
  if (e.bossId === 'white_ox') {
    const roll = e._oxRoll || { element: pick(ELEMENTS), type: pick(TYPES) };
    element = roll.element;
    type = roll.type;
  }
  const profile = { element, type };
  const guardId = guardOf[e.uid];
  const guard = guardId ? memberById(state, guardId) : null;
  const ransack = e.intent === 'ransack';

  if (guard && guard.hp > 0) {
    const { m, tags } = multiplier(type, element, guard, true);
    let leak = Math.round(e.atk * Math.max(0, m - 1) * factor);
    if (leak > 0 && guard.id === 'mitzi' && assistTriggers(state)) {
      leak = Math.floor(leak / 2);
      push({ type: 'assist', who: 'victoria', other: 'mitzi', text: 'Victoria catches half of it on her spear.' });
    }
    guard.hp = Math.max(0, guard.hp - leak);
    push({
      type: 'enemyAttack',
      enemy: e.uid,
      to: guardId,
      guarded: true,
      dmg: leak,
      tags,
      profile,
      text: leak > 0 ? `${guard.name} guards ${displayName(e)} — ${leak} gets through${tagText(tags)}.` : `${guard.name} guards ${displayName(e)}. Nothing gets through.`,
    });
    afterHit(state, guard, guardId, push);
  } else if (struck.length) {
    const frontId = struck.find((id) => memberById(state, id).hp > 0) || struck[0];
    const front = memberById(state, frontId);
    const { m, tags } = multiplier(type, element, front, true);
    let dmg = m > 0 ? Math.max(1, Math.round(e.atk * m * factor)) : 0;
    if (front.id === 'mitzi' && assistTriggers(state)) {
      dmg = Math.floor(dmg / 2);
      push({ type: 'assist', who: 'victoria', other: 'mitzi', text: 'Victoria catches half of it on her spear.' });
    }
    front.hp = Math.max(0, front.hp - dmg);
    push({
      type: 'enemyAttack',
      enemy: e.uid,
      to: frontId,
      traded: true,
      dmg,
      tags,
      profile,
      text: `${displayName(e)} trades blows with ${front.name}: ${dmg}${tagText(tags)}.`,
    });
    afterHit(state, front, frontId, push);
  } else {
    const dmg = e.atk * (ransack ? 2 : 1);
    state.supplies = Math.max(0, state.supplies - dmg);
    state.stats.payloadLost += dmg;
    push({
      type: 'enemyAttack',
      enemy: e.uid,
      to: 'payload',
      dmg,
      ransack,
      profile,
      text: ransack ? `${displayName(e)} tears into the supplies: −${dmg}!` : `${displayName(e)} hits the supplies: −${dmg}.`,
    });
  }

  if (e.alive) e.exposedNext = COUNTER[element];
  if (!e.human && e.bossId !== 'white_ox' && state.notebook.unlocked) {
    const fresh = !e.seen.profile;
    recordProfile(state, e);
    if (fresh && !e.isBoss) push({ type: 'observe', enemy: e.uid, profile, text: null });
  }
}

/** Hits every living member not guarding this enemy, at half strength. */
function enemySweep(state, c, e, factor, push) {
  let element = e.element;
  let type = e.type;
  if (e.bossId === 'white_ox') {
    const roll = e._oxRoll || { element: pick(ELEMENTS), type: pick(TYPES) };
    element = roll.element;
    type = roll.type;
  }
  const hits = [];
  for (const m of livingMembers(state)) {
    const id = memberId(m);
    const p = c.plans[id];
    if (p && p.action === 'guard' && p.target === e.uid) {
      hits.push({ to: id, dmg: 0, guarded: true });
      continue;
    }
    const { m: mult, tags } = multiplier(type, element, m, true);
    const dmg = mult > 0 ? Math.max(1, Math.round(e.atk * 0.5 * mult * factor)) : 0;
    m.hp = Math.max(0, m.hp - dmg);
    hits.push({ to: id, dmg, tags });
  }
  push({
    type: 'sweep',
    enemy: e.uid,
    hits,
    profile: { element, type },
    text: `${displayName(e)} sweeps through the party${e.bossId === 'white_ox' ? ' — a stampede of white' : ''}!`,
  });
  for (const hit of hits) {
    const m = memberById(state, hit.to);
    if (hit.dmg > 0) afterHit(state, m, hit.to, push);
  }
  e.exposedNext = COUNTER[element];
}

function assistTriggers(state) {
  return state.flags.victoriaMode === 'assist' && state.heroes.victoria.hp > 0 && state.roster.includes('victoria') && chance(0.35);
}

function afterHit(state, m, id, push) {
  if (m.hp <= 0) push({ type: 'memberDown', who: id, text: `${m.name} is down!` });
}

function onKill(state, e) {
  state.stats.kills += 1;
  const ex = state.expedition;
  if (ex && !e.human) {
    ex.kills.push({ eye: e.eye, shape: e.shape, limbs: e.limbs, boss: e.bossId || null });
  }
}

function useItem(state, m, p) {
  const item = ITEMS[p.item];
  if (!item || !state.items[p.item]) return { type: 'fizzle', who: memberId(m), text: `${m.name} fumbles for an item that isn’t there.` };
  state.items[p.item] -= 1;
  if (p.item === 'panacea') {
    for (const x of livingMembers(state)) x.hp = Math.min(x.maxHp, x.hp + item.heal);
    return { type: 'item', who: memberId(m), item: p.item, text: `${m.name} passes round a Panacea. Everyone +${item.heal}.` };
  }
  const target = memberById(state, p.ally) || m;
  if (p.item === 'salts') {
    if (target.hp > 0) {
      state.items[p.item] += 1;
      return { type: 'fizzle', who: memberId(m), text: `${target.name} is still standing — the salts go back in the bag.` };
    }
    target.hp = Math.ceil(target.maxHp / 2);
    return { type: 'item', who: memberId(m), to: memberId(target), item: p.item, text: `${m.name} wakes ${target.name} with smelling salts.` };
  }
  if (target.hp <= 0) {
    state.items[p.item] += 1;
    return { type: 'fizzle', who: memberId(m), text: `${target.name} is out cold. A salve won’t reach them.` };
  }
  target.hp = Math.min(target.maxHp, target.hp + item.heal);
  return { type: 'item', who: memberId(m), to: memberId(target), item: p.item, text: `${m.name} uses a Salve on ${target.name}: +${item.heal}.` };
}

function finishRound(state, push) {
  const c = state.combat;
  if (state.supplies <= 0) {
    c.phase = 'lost';
    c.result = 'supplies';
    push({ type: 'defeat', text: 'The supplies are gone. The party cannot go on.' });
    return;
  }
  if (!livingMembers(state).length) {
    c.phase = 'lost';
    c.result = 'party';
    push({ type: 'defeat', text: 'Everyone is down.' });
    return;
  }
  if (c.enemies.every((e) => !e.alive)) {
    c.phase = 'won';
    c.result = 'won';
    c.rewards = grantRewards(state, c);
    push({ type: 'victory', text: 'Victory.' });
    return;
  }
  beginRound(state);
}

function grantRewards(state, c) {
  const r = { coins: 0, materials: 0, gems: [] };
  if (c.kind === 'tutorial') {
    r.coins = 6;
  } else {
    for (const e of c.enemies) {
      r.coins += e.isBoss ? 15 + 10 * e.tier : e.faithful ? 3 : 2 + 2 * (e.tier || 1);
    }
    if (c.kind === 'boss') {
      r.materials += 2;
      const boss = c.enemies.find((e) => e.isBoss);
      if (boss && ELEMENTS.includes(boss.element)) r.gems.push(boss.element);
    } else {
      if (chance(0.35)) r.materials += 1;
      if (chance(0.08)) r.gems.push(pick(ELEMENTS));
    }
  }
  state.coins += r.coins;
  state.materials += r.materials;
  for (const g of r.gems) state.gems[g] += 1;
  if (state.expedition) state.expedition.materials += r.materials;
  // the fallen stagger back up
  for (const m of partyMembers(state)) {
    if (m.hp <= 0) m.hp = 1;
    m.exposed = null;
  }
  state.stats.battles += 1;
  return r;
}

// ─── Text helpers ──────────────────────────────────────────────────────────

export function displayName(e) {
  if (e.identified) return e.name;
  return 'the shadow';
}

const TAG_TEXT = { weak: 'weak', resist: 'resisted', super: 'element!', dull: 'dulled', exposed: 'exposed!', wings: 'wings' };
function tagText(tags) {
  const t = tags.filter((x) => x !== 'wings').map((x) => TAG_TEXT[x]);
  return t.length ? ` (${t.join(', ')})` : '';
}

function studyText(m, e, r) {
  if (r.boss) return `${m.name} studies ${e.name}: weak to ${r.weak || 'nothing'}, resists ${r.resist || 'nothing'}.`;
  if (r.already) return `${m.name} has already noted everything about ${e.name}.`;
  const v = r.feature === 'limbs' ? `${r.value} limbs` : `${r.value} ${r.feature === 'eye' ? 'eyes' : 'body'}`;
  let s = `${m.name} notes: ${v}.`;
  if (r.identified) s += ` Identified — ${e.name}!`;
  else if (r.recognized && (r.recognized.profiles.length || r.recognized.weak.length)) s += ' She’s seen that before…';
  return s;
}

export function allFeatures() {
  return FEATURES;
}

export { MONSTERS, MONSTER_BY_ID, rand };
