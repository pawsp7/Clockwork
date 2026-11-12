import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seed } from '../js/core/rng.js';
import { MONSTERS, speciesForTier } from '../js/data/monsters.js';
import { DUNGEONS } from '../js/data/world.js';
import { SCENES } from '../js/story/script.js';
import { createState } from '../js/game/state.js';
import { createCombat, peek, setPlan, resolveRound, multiplier, actionsFor } from '../js/game/combat.js';
import { study, infer, recordProfile, identify } from '../js/game/notebook.js';
import { startExpedition, advance, startBattle } from '../js/game/expedition.js';
import { hire, mingle, refreshQuests, acceptQuest, reforge } from '../js/game/town.js';
import { playthrough } from './driver.js';
import { StoryRunner } from '../js/game/story.js';
import { migrate } from '../js/game/state.js';
import { codexEntries, CODEX, CHARON_TOPICS } from '../js/story/lore.js';
import { openCache } from '../js/game/expedition.js';
import { TALKS, pendingTalks, talkAt, interlude, markTalk } from '../js/story/talks.js';
import { stageState } from '../js/game/debug.js';

test('36 unique monsters, 9 per dungeon, one of each shape/limb pair', () => {
  assert.equal(MONSTERS.length, 36);
  const combos = new Set(MONSTERS.map((m) => `${m.eye}/${m.shape}/${m.limbs}`));
  assert.equal(combos.size, 36);
  for (let t = 1; t <= 4; t++) {
    const sp = speciesForTier(t);
    assert.equal(sp.length, 9);
    assert.equal(new Set(sp.map((m) => `${m.shape}/${m.limbs}`)).size, 9);
  }
  // features lean on a profile but a good share break the pattern
  const offElement = MONSTERS.filter((m) => ({ green: 'earth', red: 'fire', blue: 'water', yellow: 'electric' })[m.eye] !== m.element);
  assert.ok(offElement.length >= 8 && offElement.length <= 16, `off-pattern elements: ${offElement.length}`);
});

test('tutorial follows the concept script', () => {
  seed(1);
  const s = createState();
  const c = createCombat(s, { kind: 'tutorial' });
  const [a, b] = c.enemies;
  assert.equal(a.intent, 'idle');
  assert.equal(b.intent, 'attack');
  assert.equal(peek(s, b.uid), false, 'round 1 vision is fixed on the idle thug');
  assert.ok(peek(s, a.uid));
  assert.equal(setPlan(s, 'alice', { action: 'guard', target: a.uid }), false, 'round 1 must strike');
  assert.ok(setPlan(s, 'alice', { action: 'strike', target: a.uid }));
  resolveRound(s);
  assert.ok(a.hp < a.maxHp, 'struck the idle thug');
  assert.equal(s.supplies, 100 - b.atk, 'unguarded attack hits the supplies');
  // round 2: guard the attacker, nothing gets through, other one guards
  assert.equal(a.intent, 'attack');
  assert.equal(b.intent, 'guard');
  peek(s, a.uid);
  setPlan(s, 'alice', { action: 'guard', target: a.uid });
  const hp = s.heroes.alice.hp;
  resolveRound(s);
  assert.equal(s.heroes.alice.hp, hp);
  // round 3: one blocks, the other attacks — striking it trades blows
  assert.equal(a.intent, 'guard');
  assert.equal(b.intent, 'attack');
  peek(s, a.uid);
  setPlan(s, 'alice', { action: 'strike', target: b.uid });
  resolveRound(s);
  assert.ok(b.hp < b.maxHp);
  assert.ok(s.heroes.alice.hp < hp, 'trading blows hurts');
});

test('elements: user is exposed to the counter element next round', () => {
  seed(3);
  const s = createState();
  s.mana = 20;
  const c = createCombat(s, { kind: 'battle', tier: 1, size: 1 });
  const e = c.enemies[0];
  e.intent = 'idle';
  setPlan(s, 'alice', { action: 'strike', target: e.uid, gem: 'electric' });
  resolveRound(s);
  assert.equal(s.mana, 18);
  assert.equal(s.heroes.alice.exposed, 'earth', 'electric user is weak to earth next turn');
  const { m, tags } = multiplier('blunt', 'earth', s.heroes.alice, true);
  assert.ok(tags.includes('exposed'));
  assert.ok(m >= 1.5);
});

test('guards block fully unless weak to the attack', () => {
  const s = createState();
  const alice = s.heroes.alice; // Frilly Collar: resist electric, weak water
  assert.equal(multiplier('slashing', 'electric', alice, true).m, 0.5);
  assert.equal(multiplier('slashing', 'water', alice, true).m, 1.5);
  assert.equal(multiplier('slashing', 'fire', alice, true).m, 1);
});

test('notebook narrows a creature down from shared traits (concept example)', () => {
  seed(5);
  const s = createState();
  s.notebook.unlocked = true;
  const c = createCombat(s, { kind: 'battle', tier: 1, size: 1 });
  const e = c.enemies[0];
  const r1 = study(s, e);
  assert.ok(r1.feature);
  recordProfile(s, e);
  const inf = infer(s, e);
  assert.equal(inf.profile.certain, true);
  // a second creature sharing that trait inherits the note as a candidate
  const twin = { ...e, uid: 'x', known: { eye: false, shape: false, limbs: false }, seen: { profile: false, weak: false, resist: false }, identified: false };
  twin.known[r1.feature] = true;
  const guess = infer(s, twin);
  assert.ok(guess.profile.candidates.includes(`${e.element}.${e.type}`));
  identify(s, e);
  assert.equal(s.notebook.species[e.mid], 'identified');
});

test('every member keeps 1–4 as Strike/Guard/Item/Wait; Study is 5 for Mitzi', () => {
  const s = createState();
  s.roster = ['alice', 'mitzi', 'victoria'];
  s.notebook.unlocked = true;
  s.cleared.woods = true;
  createCombat(s, { kind: 'battle', tier: 1, size: 2 });
  for (const id of ['alice', 'victoria']) assert.deepEqual(actionsFor(s, s.heroes[id]).map((a) => a.id), ['strike', 'guard', 'item', 'wait']);
  assert.deepEqual(actionsFor(s, s.heroes.mitzi).map((a) => a.id), ['strike', 'guard', 'item', 'wait', 'study']);
});

test('dialogue choices report their consequences', () => {
  const s = createState();
  const r = new StoryRunner(s, SCENES, 'volcano_enter');
  let step = r.next();
  while (step.type !== 'choice') step = r.next();
  const good = step.options.find((o) => o.good);
  const note = r.choose(good.index);
  assert.equal(note.tone, 'good');
  assert.match(note.text, /strength rises to 7/);
  const r2 = new StoryRunner(createState(), SCENES, 'fort_enter');
  let st2 = r2.next();
  while (st2.type !== 'choice') st2 = r2.next();
  const bad = st2.options.find((o) => o.good === false);
  assert.equal(r2.choose(bad.index).tone, 'bad');
});

test('story battles end their scene and name the scene that follows', () => {
  for (const [scene, after] of [
    ['prologue', 'prologue_after'],
    ['manor', 'manor_after'],
  ]) {
    const s = createState();
    const r = new StoryRunner(s, SCENES, scene);
    let step = r.next();
    for (let i = 0; i < 200 && step.type !== 'battle'; i++) step = step.type === 'choice' ? (r.choose(step.options[0].index), r.next()) : r.next();
    assert.equal(step.type, 'battle');
    assert.equal(step.after, after);
    assert.ok(SCENES[after]);
  }
});

test('caches hold codex pages, camps tell campfire stories', () => {
  seed(31);
  const s = createState();
  s.roster = ['alice', 'mitzi', 'victoria'];
  startExpedition(s, 'woods');
  const node = DUNGEONS.woods.nodes.findIndex((n) => n.type === 'cache');
  s.expedition.node = node;
  const loot = openCache(s);
  assert.equal(loot.page, 'page_drawing');
  assert.ok(codexEntries(s).some((e) => e.id === 'page_drawing'));
  for (const d of Object.values(DUNGEONS)) {
    const camp = d.nodes.find((n) => n.type === 'camp');
    assert.ok(SCENES[camp.scene], camp.scene);
    assert.ok(d.nodes.find((n) => n.type === 'cache').page);
  }
  assert.ok(CODEX.length >= 25);
  assert.ok(CHARON_TOPICS.length >= 6);
});

test('old saves gain new fields when loaded', () => {
  const s = createState();
  delete s.lore;
  delete s.notebook.known;
  migrate(s);
  assert.deepEqual(s.lore, { found: [] });
  assert.deepEqual(s.notebook.known, {});
});

test('Mitzi refuses to fight in the Dead Woods, studies once taught', () => {
  const s = createState();
  s.roster = ['alice', 'mitzi', 'victoria'];
  createCombat(s, { kind: 'battle', tier: 1, size: 2 });
  const acts = actionsFor(s, s.heroes.mitzi);
  assert.ok(acts.find((a) => a.id === 'strike').disabled);
  assert.ok(acts.find((a) => a.id === 'study').disabled);
  s.notebook.unlocked = true;
  assert.equal(actionsFor(s, s.heroes.mitzi).find((a) => a.id === 'study').disabled, null);
  s.cleared.woods = true;
  assert.equal(actionsFor(s, s.heroes.mitzi).find((a) => a.id === 'strike').disabled, null);
});

test('supplies: 1 per member per screen change and per battle', () => {
  seed(9);
  const s = createState();
  s.roster = ['alice', 'mitzi', 'victoria'];
  startExpedition(s, 'woods');
  advance(s); // story node: free
  assert.equal(s.supplies, 100);
  advance(s); // battle node: screen change
  assert.equal(s.supplies, 97);
  startBattle(s);
  assert.equal(s.supplies, 94);
});

test('town: mercs, quests, reforging', () => {
  seed(11);
  const s = createState();
  s.coins = 500;
  s.materials = 10;
  mingle(s, { free: true });
  assert.equal(s.mercPool.length, 3);
  assert.ok(hire(s, 0, 'pay').ok);
  assert.equal(s.hired.length, 1);
  refreshQuests(s);
  assert.ok(s.quests.board.length >= 2);
  assert.ok(acceptQuest(s, s.quests.board[0].id).ok);
  assert.ok(reforge(s, 'alice', 'wand').ok);
  assert.equal(s.heroes.alice.form, 'wand');
  assert.equal(s.heroes.alice.weaponLevel, 2);
});

test('every scene referenced by dungeons exists', () => {
  for (const d of Object.values(DUNGEONS)) {
    for (const node of d.nodes) if (node.scene) assert.ok(SCENES[node.scene], node.scene);
  }
  for (const id of ['prologue', 'town_intro', 'mitzi_learns', 'night_woods', 'night_volcano', 'night_fort', 'last_night', 'manor']) {
    assert.ok(SCENES[id], id);
  }
});

for (const policy of ['good', 'bad', 'random']) {
  test(`full playthrough reaches an ending (${policy} choices)`, () => {
    seed(policy.length * 101);
    // the bad run walks straight past everyone in town; the others stop to listen
    const talks = policy !== 'bad';
    const { ending, state } = playthrough({ policy, combat: {}, maxRetries: 10, talks });
    assert.equal(state.talks.length, talks ? TALKS.length : 0, 'town conversations heard');
    assert.ok(ending.cards.length >= 4);
    assert.equal(state.cleared.manor, true);
    assert.equal(state.flags.shortHair, true);
    assert.equal(state.flags.eyepatch, true);
    assert.ok(state.flags.mitziStudy);
    // all four dungeon pages and campfire lore were found along the way
    for (const id of ['page_drawing', 'page_ledger', 'page_roster', 'page_hymn', 'woods_folk', 'old_faith']) assert.ok(state.lore.found.includes(id), id);
    if (policy === 'good') {
      assert.equal(ending.title, 'Clockwork Sky');
      assert.equal(state.flags.victoriaMode, 'assist');
      assert.equal(state.flags.mitziStudy, 'woods');
      // threads picked up on the way pay off at the end
      assert.equal(state.flags.rangBell, true);
      assert.ok(ending.cards.some((c) => c.art === 'gehenna'), 'the town remembers');
      for (const id of ['horace', 'bede', 'keepers', 'thursdays']) assert.ok(codexEntries(state).some((e) => e.id === id), id);
    }
    if (policy === 'bad') {
      assert.equal(ending.title, 'Flock of the White Ox');
      assert.equal(state.flags.mitziStudy, 'boss');
      assert.equal(state.flags.victoriaMode, 'interfere');
      assert.equal(state.flags.hestiaBoost, true);
    }
  });
}

test('town conversations: every interlude has some, each ends back in its building', () => {
  for (let w = 1; w <= 8; w++) assert.ok(TALKS.some((t) => t.window === w), `interlude ${w}`);
  for (const t of TALKS) {
    assert.ok(SCENES[t.id], t.id);
    assert.ok(['inn', 'pub', 'church', 'smithy', 'clinic'].includes(t.place), t.place);
    const ends = JSON.stringify(SCENES[t.id].filter((c) => c.k === 'end'));
    assert.match(ends, new RegExp(`town:${t.place}`), `${t.id} returns to the ${t.place}`);
  }
  // one conversation per building at a time, so a visit is never ambiguous
  for (let w = 1; w <= 8; w++) {
    const places = TALKS.filter((t) => t.window === w).map((t) => t.place);
    assert.equal(new Set(places).size, places.length, `interlude ${w}`);
  }
  // they follow the story: before the woods, then the evening after them
  const s = stageState('town_1').state;
  assert.equal(interlude(s), 1);
  assert.ok(talkAt(s, 'smithy'));
  markTalk(s, 'talk_smith_watch');
  assert.equal(talkAt(s, 'smithy'), null, 'heard once');
  s.cleared.woods = true;
  assert.equal(interlude(s), 2);
  assert.ok(pendingTalks(s).every((t) => t.window === 2));
  s.expedition = {};
  assert.equal(pendingTalks(s).length, 0, 'nobody talks to you on the road');
});

test('chapter cards open each act', () => {
  for (const id of ['prologue', 'woods_enter', 'volcano_enter', 'fort_enter', 'ruins_enter', 'last_night', 'manor']) {
    const r = new StoryRunner(stageState('last_night').state, SCENES, id);
    let step = r.next();
    assert.equal(step.type, 'card', id);
    assert.ok(step.title, id);
  }
});

test('every scene plays through along its first and its last choices', () => {
  for (const id of Object.keys(SCENES)) {
    for (const pick of ['first', 'last']) {
      for (const good of [true, false]) {
        seed(id.length);
        const { state } = stageState('last_night', { good });
        state.roster = ['alice', 'mitzi', 'victoria'];
        if (good) Object.assign(state.flags, { toldSun: true, toldDrawer: true, showedDrawing: true, mitziCoat: true, mitziTea: true, victoriaBook: true, horaceHope: true, rangBell: true, watHello: true });
        if (good) state.talks = TALKS.map((t) => t.id);
        const r = new StoryRunner(state, SCENES, id);
        let step = r.next();
        let n = 0;
        while (step.type !== 'end' && step.type !== 'battle') {
          assert.ok(++n < 400, `${id} never ends`);
          if (step.type === 'line') assert.ok(typeof step.text === 'string' && step.text.length, `${id}: empty line`);
          if (step.type === 'choice') r.choose(step.options[pick === 'first' ? 0 : step.options.length - 1].index);
          step = r.next();
        }
      }
    }
  }
});

test('every line fits its dialogue box', () => {
  const limits = { narrator: 190, system: 220, choice: 130 };
  const walk = (list, scene) => {
    for (const c of list || []) {
      if (c.k === 'line' && typeof c.text === 'string') assert.ok(c.text.length <= (limits[c.who] || 200), `${scene}: ${c.text}`);
      if (c.k === 'if') (walk(c.then, scene), walk(c.else, scene));
      if (c.k === 'choice') for (const o of c.options) (assert.ok(o.text.length <= limits.choice, `${scene}: ${o.text}`), walk(o.then, scene));
    }
  };
  for (const [id, list] of Object.entries(SCENES)) walk(list, id);
});

test('debug: every stage builds a playable state', async () => {
  const { STAGES, stageState, bossNodeIndex } = await import('../js/game/debug.js');
  const { fight } = await import('./driver.js');
  const { startBattle } = await import('../js/game/expedition.js');
  seed(77);
  for (const st of STAGES) {
    for (const good of [true, false]) {
      const { state, go } = stageState(st.id, { good });
      assert.ok(go.to, st.id);
      if (go.to === 'dungeon' || go.to === 'boss') {
        assert.ok(state.unlocked[go.dungeon] && !state.cleared[go.dungeon], `${st.id} unlocked`);
        assert.ok(state.roster.includes('mitzi'), `${st.id} has the sisters`);
      }
      if (go.to === 'boss' && good) {
        startExpedition(state, go.dungeon);
        state.expedition.node = bossNodeIndex(go.dungeon);
        startBattle(state);
        assert.ok(state.combat.enemies[0].isBoss);
        assert.ok(fight(state, {}), `${st.id} boss is winnable`);
      }
    }
  }
  assert.equal(stageState('last_night').state.pendingRest, 'last_night');
  assert.equal(stageState('town_3', { good: false }).state.flags.mitziAtk, 4);
});
