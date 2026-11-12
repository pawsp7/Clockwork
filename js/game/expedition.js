import { DUNGEONS } from '../data/world.js';
import { RULES, ELEMENTS } from '../data/constants.js';
import { chance, int, pick } from '../core/rng.js';
import { partyMembers, clone } from './state.js';
import { createCombat } from './combat.js';
import { evaluateQuests } from './town.js';

/**
 * Expeditions walk a fixed trail of nodes. Every step onto a new spot is a
 * "screen change" and every battle costs supplies: 1 per party member each
 * (concept doc). Supplies are restocked to 100 when you leave town.
 */

export function partySize(state) {
  return partyMembers(state).length;
}

export function consume(state, reason) {
  const n = partySize(state);
  state.supplies = Math.max(0, state.supplies - n);
  return { amount: n, reason };
}

/** Returns a snapshot for the "rewind" save before anything changes. */
export function startExpedition(state, dungeonId) {
  const snapshot = clone(state);
  state.supplies = RULES.supplyMax;
  state.expedition = {
    dungeon: dungeonId,
    node: -1,
    battle: 0,
    kills: [],
    identified: 0,
    materials: 0,
    betrayed: [],
    lastConsume: null,
  };
  return snapshot;
}

export function dungeonOf(state) {
  return state.expedition ? DUNGEONS[state.expedition.dungeon] : null;
}

export function currentNode(state) {
  const d = dungeonOf(state);
  if (!d) return null;
  return d.nodes[state.expedition.node] || null;
}

export function peekNext(state) {
  const d = dungeonOf(state);
  return d ? d.nodes[state.expedition.node + 1] || null : null;
}

/** Step to the next node. Non-story nodes cost a screen change. */
export function advance(state) {
  const ex = state.expedition;
  const d = dungeonOf(state);
  ex.node += 1;
  const node = d.nodes[ex.node] || null;
  ex.lastConsume = null;
  if (node && node.type !== 'story') {
    ex.lastConsume = consume(state, 'travel');
  }
  return node;
}

export function startBattle(state) {
  const ex = state.expedition;
  const d = dungeonOf(state);
  const node = currentNode(state);
  const cost = consume(state, 'battle');
  if (node.type === 'boss') {
    createCombat(state, { kind: 'boss', bossId: d.boss, tier: d.tier, bg: d.bg, label: d.name, dungeon: d.id });
  } else {
    const size = d.sizes[Math.min(ex.battle, d.sizes.length - 1)];
    createCombat(state, {
      kind: 'battle',
      tier: d.tier,
      size,
      bg: d.bg,
      label: `${d.name} · Skirmish ${ex.battle + 1}`,
      dungeon: d.id,
    });
  }
  return cost;
}

/**
 * After a won fight. Returns follow-ups for the controller:
 *  { scene?: id, notes: [text] }
 */
export function afterBattle(state) {
  const ex = state.expedition;
  const node = currentNode(state);
  const out = { scene: null, notes: [] };
  if (node?.type === 'battle') ex.battle += 1;

  // Bargained mercenaries may run off with the takings.
  for (let i = state.hired.length - 1; i >= 0; i--) {
    const m = state.hired[i];
    if (m.willBetray && chance(0.35)) {
      const stolen = Math.floor(state.coins * 0.3);
      state.coins -= stolen;
      const owned = Object.keys(state.items).filter((k) => state.items[k] > 0);
      let item = null;
      if (owned.length) {
        item = pick(owned);
        state.items[item] -= 1;
      }
      state.hired.splice(i, 1);
      ex.betrayed.push(m.name);
      out.notes.push(`${m.name} slips away in the night with ${stolen} coins${item ? ' and a ' + item : ''}. So much for a bargain.`);
    }
  }

  // Mitzi starts to notice things (Dead Woods): earliest after the 3rd battle.
  if (ex.dungeon === 'woods' && node?.type === 'battle' && !state.notebook.unlocked && ex.battle >= 3 && state.scores.woods.good >= 2) {
    out.scene = 'mitzi_learns';
  }
  return out;
}

export function openCache(state) {
  const d = dungeonOf(state);
  const node = currentNode(state);
  const loot = { supplies: 10 + int(0, 6), coins: int(4, 10) * d.tier, materials: chance(0.6) ? 1 : 0, gem: chance(0.3) ? pick(ELEMENTS) : null };
  state.supplies = Math.min(RULES.supplyMax, state.supplies + loot.supplies);
  state.coins += loot.coins;
  state.materials += loot.materials;
  state.expedition.materials += loot.materials;
  if (loot.gem) state.gems[loot.gem] += 1;
  if (node?.page) {
    state.lore ||= { found: [] };
    if (!state.lore.found.includes(node.page)) {
      state.lore.found.push(node.page);
      loot.page = node.page;
    }
  }
  return loot;
}

export function makeCamp(state) {
  const healed = {};
  for (const m of partyMembers(state)) {
    const before = m.hp;
    m.hp = Math.min(m.maxHp, Math.max(1, m.hp) + Math.ceil(m.maxHp * RULES.campHeal));
    healed[m.name] = m.hp - before;
  }
  const mana = Math.min(state.maxMana - state.mana, RULES.campMana);
  state.mana += mana;
  return { healed, mana };
}

/** Wrap up a cleared dungeon. Returns a summary for the UI. */
export function finishExpedition(state) {
  const ex = state.expedition;
  const d = DUNGEONS[ex.dungeon];
  const summary = { dungeon: d.name, reward: d.reward, quests: [], mercs: [], robbed: null, supplies: state.supplies, kills: ex.kills.length, identified: ex.identified, materials: ex.materials };

  state.cleared[ex.dungeon] = true;
  state.coins += d.reward;

  summary.quests = evaluateQuests(state, ex);

  // Mercenaries finish their contract and grow with use.
  const questDone = summary.quests.some((q) => q.done);
  for (const m of state.hired) {
    state.mercLevels[m.template] = (state.mercLevels[m.template] || 0) + 1;
    if (m.trial && !questDone) {
      const p = 0.3 + 0.15 * m.rarity;
      if (chance(p)) {
        const coins = Math.floor(state.coins / 2);
        state.coins -= coins;
        for (const k of Object.keys(state.items)) state.items[k] = Math.floor(state.items[k] / 2);
        state.materials = Math.floor(state.materials / 2);
        summary.robbed = { name: m.name, coins };
        continue;
      }
    }
    summary.mercs.push(m.name);
  }
  state.hired = [];
  state.mercPool = [];
  state.expedition = null;
  state.combat = null;
  // everyone limps home on their feet
  for (const m of partyMembers(state)) if (m.hp <= 0) m.hp = 1;
  return summary;
}
