/**
 * Headless driver: plays Clockwork end to end with a simple tactical AI.
 * Used by the test suite and by the balance simulator.
 */
import { createState, livingMembers, memberId, memberGems, clone } from '../js/game/state.js';
import { StoryRunner } from '../js/game/story.js';
import { SCENES } from '../js/story/script.js';
import {
  peek,
  setPlan,
  resolveRound,
  actionsFor,
  tutorialGuide,
  intentView,
  multiplier,
  canPeek,
  createCombat,
} from '../js/game/combat.js';
import { infer } from '../js/game/notebook.js';
import { startExpedition, advance, startBattle, afterBattle, openCache, makeCamp, finishExpedition } from '../js/game/expedition.js';
import { rest, buyItem, mingle, hire, refreshQuests, acceptQuest, reforge, upgradeBracelet, buyGem, socketGem } from '../js/game/town.js';
import { computeEnding } from '../js/game/endings.js';
import { DUNGEON_ORDER } from '../js/data/world.js';
import { BEATS, COUNTER, RULES } from '../js/data/constants.js';
import { pendingTalks, markTalk } from '../js/story/talks.js';

export function pickChoice(policy, options, rng = Math.random) {
  if (policy === 'good') {
    const g = options.find((o) => o.good === true);
    return (g || options[0]).index;
  }
  if (policy === 'bad') {
    const b = options.find((o) => o.good === false);
    return (b || options[options.length - 1]).index;
  }
  return options[Math.floor(rng() * options.length)].index;
}

// ─── Combat AI ─────────────────────────────────────────────────────────────

function bestGem(state, m, target) {
  if (state.mana < RULES.imbueCost) return null;
  const gems = memberGems(m);
  const inf = infer(state, target);
  const el = inf.profile.candidates.length === 1 ? inf.profile.candidates[0].split('.')[0] : null;
  for (const g of gems) {
    if (target.exposed === g) return g;
    if (el && BEATS[g] === el) return g;
  }
  return null;
}

export function planRound(state, opts = {}) {
  const c = state.combat;
  // vision
  const guide = tutorialGuide(state);
  if (guide?.peek) peek(state, guide.peek);
  let alive = c.enemies.filter((e) => e.alive);
  while (c.visionLeft > 0) {
    const cand = alive.filter((e) => canPeek(state, e.uid)).sort((x, y) => y.atk - x.atk);
    if (!cand.length) break;
    peek(state, cand[0].uid);
  }
  if (guide?.action) {
    setPlan(state, 'alice', { action: guide.action, target: guide.target });
    return;
  }

  const members = livingMembers(state);
  const free = new Set(members.map(memberId));
  const assign = (id, plan) => {
    if (setPlan(state, id, plan)) free.delete(id);
  };
  const can = (m, act) => actionsFor(state, m).some((a) => a.id === act && !a.disabled);

  // heal emergencies
  const hurt = members.filter((m) => m.hp / m.maxHp < 0.3).sort((x, y) => x.hp - y.hp)[0];
  if (hurt && state.items.salve > 0) {
    const healer = members.find((m) => can(m, 'item') && free.has(memberId(m)) && m !== hurt && m.id !== 'hestia') || hurt;
    assign(memberId(healer), { action: 'item', item: 'salve', ally: memberId(hurt) });
  }
  const downed = state.items.salts > 0 && [...Object.values(state.heroes), ...state.hired].find((m) => state.roster.includes(m.id) && m.hp <= 0);
  if (downed) {
    const reviver = members.find((m) => can(m, 'item') && free.has(memberId(m)));
    if (reviver) assign(memberId(reviver), { action: 'item', item: 'salts', ally: downed.id });
  }

  // Mitzi studies when she can
  const mitzi = members.find((m) => m.id === 'mitzi');
  if (mitzi && free.has('mitzi')) {
    const score = (e) => (e.known ? Object.values(e.known).filter(Boolean).length : 0);
    const target = alive
      .filter((e) => (!e.identified && e.known) || (e.isBoss && !e.seen.weak))
      .sort((x, y) => score(y) - score(x))[0];
    if (target && can(mitzi, 'study') && (!can(mitzi, 'strike') || Math.random() < 0.6)) assign('mitzi', { action: 'study', target: target.uid });
    else if (!can(mitzi, 'strike')) assign('mitzi', { action: 'wait' });
  }

  // sweeps: the fragile hide behind a guard on the sweeper
  for (const e of alive.filter((x) => x.revealed && x.intent === 'sweep')) {
    for (const m of members) {
      if (free.has(memberId(m)) && m.hp / m.maxHp < 0.5 && can(m, 'guard')) assign(memberId(m), { action: 'guard', target: e.uid });
    }
  }

  const order = members.filter((m) => free.has(memberId(m)));
  const attackers = alive.filter((e) => e.revealed && (e.intent === 'attack' || e.intent === 'ransack' || e.intent === 'toll'));
  const idles = alive.filter((e) => e.revealed && (e.intent === 'idle' || e.intent === 'summon' || e.intent === 'sweep'));
  const unknown = alive.filter((e) => !e.revealed);

  // guard visible attackers with whoever takes it best
  for (const e of attackers.sort((x, y) => y.atk - x.atk)) {
    const view = intentView(state, e);
    const prof = view.profile;
    const guards = order.filter((m) => free.has(memberId(m)) && can(m, 'guard'));
    if (!guards.length) break;
    guards.sort((x, y) => {
      const mx = prof ? multiplier(prof.type, prof.element, x, true).m : 1;
      const my = prof ? multiplier(prof.type, prof.element, y, true).m : 1;
      return mx - my || y.hp - x.hp;
    });
    assign(memberId(guards[0]), { action: 'guard', target: e.uid });
  }

  // strike: idles first, then guarded attackers, then unknowns
  const guarded = attackers.filter((e) => Object.values(c.plans).some((p) => p.action === 'guard' && p.target === e.uid));
  const byHp = (list) => list.slice().sort((x, y) => x.hp - y.hp);
  const strikeTargets = [...byHp(idles), ...byHp(guarded), ...byHp(unknown)];
  for (const m of order) {
    const id = memberId(m);
    if (!free.has(id)) continue;
    if (!can(m, 'strike')) {
      assign(id, { action: 'wait' });
      continue;
    }
    const t = strikeTargets.find((e) => e.alive);
    if (!t) {
      // nothing safe: guard an unknown if low HP, else wait
      const u = unknown[0] || attackers[0];
      if (u) assign(id, { action: m.hp / m.maxHp < 0.5 ? 'guard' : 'strike', target: u.uid });
      else assign(id, { action: 'wait' });
      continue;
    }
    if (unknown.includes(t) && m.hp / m.maxHp < 0.4 && can(m, 'guard')) {
      assign(id, { action: 'guard', target: t.uid });
      continue;
    }
    assign(id, { action: 'strike', target: t.uid, gem: opts.useGems === false ? null : bestGem(state, m, t) });
  }
}

export function fight(state, opts = {}) {
  let guard = 0;
  while (state.combat.phase === 'plan' && guard++ < 80) {
    planRound(state, opts);
    resolveRound(state);
  }
  if (state.combat.phase === 'plan') state.combat.phase = 'lost';
  return state.combat.phase === 'won';
}

// ─── Story ─────────────────────────────────────────────────────────────────

export function playScene(state, id, ctx) {
  const runner = new StoryRunner(state, SCENES, id, {});
  for (let i = 0; i < 2000; i++) {
    const step = runner.next();
    if (step.type === 'choice') {
      const forced = ctx.forceChoice?.(runner.sceneId, step.options);
      runner.choose(forced ?? pickChoice(ctx.policy, step.options, ctx.rng));
    } else if (step.type === 'battle') {
      const snapshot = clone(state);
      const opts = { ...step.opts, after: step.after };
      createCombat(state, opts);
      let won = fight(state, ctx.combat);
      let retries = 0;
      while (!won && retries < (ctx.maxRetries ?? 5)) {
        ctx.report.defeats.push({ where: step.opts.label, retry: retries });
        Object.assign(state, clone(snapshot));
        createCombat(state, opts);
        won = fight(state, ctx.combat);
        retries++;
      }
      if (!won) throw new Error(`Could not win story battle ${step.opts.label}`);
      ctx.report.battles.push({ where: step.opts.label, boss: true, story: true, rounds: state.combat.round, hp: livingMembers(state).map((m) => `${m.name}:${m.hp}/${m.maxHp}`).join(' ') });
      state.combat = null;
      return playScene(state, step.after, ctx);
    } else if (step.type === 'end') {
      return step.then;
    }
  }
  throw new Error(`Scene ${id} did not end`);
}

// ─── Full run ──────────────────────────────────────────────────────────────

function shop(state, ctx) {
  // keep a few salves, buy salts, then upgrades
  while (state.items.salve < 3 && state.coins >= 8 + 20) buyItem(state, 'salve');
  if (state.items.salts < 1 && state.coins >= 15 + 20) buyItem(state, 'salts');
  if (ctx.upgrades !== false) {
    for (const id of ['alice', 'victoria', 'mitzi']) {
      if (state.roster.includes(id)) reforge(state, id);
    }
    if (state.coins > 60) upgradeBracelet(state, 'alice');
    if (state.coins > 50) {
      buyGem(state, 'water');
      socketGem(state, 'alice', 'water');
    }
  }
  refreshQuests(state);
  for (const q of state.quests.board.slice(0, 2)) acceptQuest(state, q.id);
  if (ctx.mercs) {
    mingle(state, { free: true });
    const idx = state.mercPool.findIndex((p) => p.price <= state.coins - 10);
    if (idx >= 0) hire(state, idx, 'pay');
  }
}

/** Listen to everyone in town who has something to say (unless ctx.talks is false). */
function townTalks(state, ctx, step) {
  if (ctx.talks === false) return;
  for (let guard = 0; guard < 12; guard++) {
    const t = pendingTalks(state)[0];
    if (!t) return;
    markTalk(state, t.id);
    const then = step(t.id);
    if (then !== `town:${t.place}`) throw new Error(`${t.id} should end in town:${t.place}, got ${then}`);
  }
  throw new Error('town conversations never ran out');
}

export function playthrough(ctx) {
  const state = createState();
  ctx.report = { defeats: [], battles: [], expeditions: [], scenes: [] };
  const step = (id) => {
    ctx.report.scenes.push(id);
    return playScene(state, id, ctx);
  };

  let then = step('prologue');
  if (then !== 'town') throw new Error('prologue should end in town');

  for (const dId of DUNGEON_ORDER) {
    if (state.pendingRest) {
      townTalks(state, ctx, step);
      const r = rest(state);
      if (r.scene) step(r.scene);
    }
    townTalks(state, ctx, step);
    if (!state.unlocked[dId]) throw new Error(`${dId} not unlocked`);
    shop(state, ctx);
    let attempt = 0;
    let done = false;
    while (!done) {
      const snapshot = startExpedition(state, dId);
      const exReport = { dungeon: dId, attempt, battles: 0, minSupplies: 100, end: null };
      let failed = false;
      walk: for (;;) {
        const node = advance(state);
        if (!node) break;
        exReport.minSupplies = Math.min(exReport.minSupplies, state.supplies);
        if (node.type === 'story') {
          const t = step(node.scene);
          if (t === 'return') break walk;
          continue;
        }
        if (node.type === 'cache') {
          openCache(state);
          continue;
        }
        if (node.type === 'camp') {
          makeCamp(state);
          if (node.scene) step(node.scene);
          continue;
        }
        startBattle(state);
        const sup0 = state.supplies;
        const r0 = state.stats.rounds;
        const won = fight(state, ctx.combat);
        ctx.report.battles.push({ where: dId, boss: node.type === 'boss', rounds: state.stats.rounds - r0, payload: sup0 - state.supplies, won, hp: livingMembers(state).map((m) => `${m.name}:${m.hp}/${m.maxHp}`).join(' ') });
        exReport.battles += 1;
        exReport.minSupplies = Math.min(exReport.minSupplies, state.supplies);
        if (!won) {
          failed = true;
          ctx.report.defeats.push({ where: dId, node: state.expedition.node, reason: state.combat.result, supplies: state.supplies });
          break walk;
        }
        state.combat = null;
        const after = afterBattle(state);
        if (after.scene) step(after.scene);
      }
      if (failed) {
        attempt++;
        state.stats.rewinds += 1;
        const keep = state.stats;
        Object.keys(state).forEach((k) => delete state[k]);
        Object.assign(state, clone(snapshot), { stats: keep });
        if (attempt > (ctx.maxRetries ?? 5)) throw new Error(`Stuck in ${dId}`);
        continue;
      }
      exReport.end = state.supplies;
      exReport.hp = Object.fromEntries(state.roster.map((id) => [id, state.heroes[id].hp]));
      const summary = finishExpedition(state);
      exReport.quests = summary.quests.map((q) => `${q.kind}:${q.done}`);
      ctx.report.expeditions.push(exReport);
      done = true;
    }
  }

  townTalks(state, ctx, step);
  const r = rest(state);
  if (r.scene !== 'last_night') throw new Error(`expected last_night, got ${r.scene}`);
  shop(state, ctx);
  then = step('last_night');
  if (then !== 'ending') throw new Error(`finale should end in ending, got ${then}`);
  const ending = computeEnding(state);
  return { state, ending, report: ctx.report };
}
