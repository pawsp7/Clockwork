import { n, sys, say, bg, music, fx, run, when, choice, opt, battle, end, goto, cast, cg } from '../game/story.js';
import { chance } from '../core/rng.js';

/* Speakers: alice, mitzi, victoria, hestia, charon, thug, narrator, system.
   Moods: 'happy', 'sad', 'angry' (Hestia's eyes go red), 'shock'. */

const a = (t, m) => say('alice', t, m);
const mi = (t, m) => say('mitzi', t, m);
const v = (t, m) => say('victoria', t, m);
const h = (t, m) => say('hestia', t, m);
const c = (t, m) => say('charon', t, m);

const joinSisters = run((s) => {
  for (const id of ['mitzi', 'victoria']) if (!s.roster.includes(id)) s.roster.push(id);
});
const learnStudy = (when) =>
  run((s) => {
    if (!s.notebook.unlocked) {
      s.notebook.unlocked = true;
      s.flags.mitziStudy = when;
    }
  });
const mitziAtk = (d) => (s) => {
  if (!s.flags.mitziLocked) s.flags.mitziAtk = Math.max(4, Math.min(8, s.flags.mitziAtk + d));
};
const up = (d) => (s) => {
  s.flags.aliceUp += d;
};
const objective = (text) => run((s) => (s.objective = text));
function unlockLore(s, id) {
  s.lore ||= { found: [] };
  if (!s.lore.found.includes(id)) s.lore.found.push(id);
}

export const SCENES = {
  // ════════════════════════════════════════════════════════════ PROLOGUE
  prologue: [
    bg('surface'),
    music('surface'),
    n('Above ground, in a city that never learned her name, Alice found a pocket watch in a drawer of broken things.'),
    n('It was cold. It was heavy. It did not tick.'),
    a('Whose were you, I wonder?'),
    cg('watch'),
    n('One evening, it opened by itself.'),
    n('The second hand ran backwards. The streetlights bent like reeds. And the floor forgot to hold her.'),
    fx('distort', 1600),
    music('none'),
    cg(null),
    bg('outskirts'),
    music('outskirts'),
    fx('fadein'),
    a('…That was not a staircase.'),
    a('The watch is warm now. And it has — grown a blade?', 'shock'),
    n('Two figures peel away from the dark between the milk carts.'),
    say('thug', 'Oi. Fresh one. Still smells like daylight.'),
    say('thug', 'Shiny watch. Bet that’s worth a few masses.'),
    a('If this is a dream, it is a very rude one.'),
    battle({ kind: 'tutorial', bg: 'outskirts', label: 'Two Thugs' }, 'prologue_after'),
  ],

  prologue_after: [
    bg('outskirts'),
    music('outskirts'),
    n('The thugs scatter into the alleys. A woman in a long brown coat steps out of a doorway, flipping a coin.'),
    c('Not bad. For a corpse.'),
    a('I am not a—'),
    c('Dead? Everyone says that. Welcome to Gehenna. It’s hell, with municipal services.'),
    c('Charon. Doctor. I take coins, give advice, and wait to see who gets out.'),
    choice([
      opt('“Gets out? So there is a way back?”', {
        fx: up(1),
        note: 'Alice will remember that there might be a way up.',
        tone: 'info',
        then: [c('Back? No. Up? Maybe.'), c('The sky takes people who finish what they started. Most never do.')],
      }),
      opt('“You’re joking.”', {
        then: [c('I never joke. Nobody believes me anyway. It’s very freeing.')],
      }),
    ]),
    c('That watch of yours looked ahead, didn’t it? One move. One enemy.'),
    c('Keep it wound. Things down here can’t stand being seen coming.'),
    c('And mind your cart. Gehenna’s beasts go for the supplies before the throat. Run out, and you sit down in the dark for good.'),
    goto('town_intro'),
  ],

  town_intro: [
    bg('town'),
    music('town'),
    n('Gehenna: a town under a sky of stone, lit by lanterns that burn the colour of spilled milk.'),
    n('Carts of white bottles creak past a church whose spire wears horns.'),
    n('Nobody here owns a cow. Nobody asks where the milk comes from. The carts leave full every morning by the long road past the Manor, and come back empty.'),
    c('Milk’s the export. Faith’s the import. Don’t take either on an empty stomach.'),
    c('Inn for sleeping. Pub for hired blades and odd jobs. The Smithy will fix that watch. My Clinic will fix you.'),
    c('The gate leads out. The Dead Woods are closest.'),
    c('Two sisters live out by the woods. Red and violet. You can’t miss them. You can’t shake them, either.'),
    run((s) => {
      s.chapter = 1;
      s.unlocked.woods = true;
      s.flags.seenTownIntro = true;
    }),
    objective('Explore Gehenna. When ready, take the gate to the Dead Woods.'),
    end('town'),
  ],

  // ════════════════════════════════════════════════════════════ DEAD WOODS
  woods_enter: [
    bg('woods'),
    n('The Dead Woods. Trees that forgot how to be trees, still standing out of habit.'),
    cg('sisters'),
    v('Stop right there. You’re the surface girl. Alice, isn’t it?'),
    a('News travels fast for the dead.'),
    v('I’m Victoria. This is my sister, Mitzi. We live at the edge of the woods. Always have.'),
    mi('Hiii! Are you here for my gathering? It’s on Thursday. Is it Thursday? Vicky, is it Thursday?', 'happy'),
    v('There are no Thursdays here, Mitzi.'),
    v('The woods have been restless. If you’re going in, we’re coming. I won’t have things crawling toward our door.'),
    cg(null),
    mi('She means she’s coming. I’m coming because she’s coming. I’m not fighting, though. Fighting is sweaty.'),
    choice([
      opt('“You don’t have to fight. But you could watch. Noticing things is a skill too.”', {
        score: 'woods',
        good: true,
        then: [mi('Watching? I am GREAT at watching. Mostly ceilings.', 'happy')],
      }),
      opt('“Stay behind Victoria. We’ll handle it.”', {
        score: 'woods',
        good: false,
        then: [v('She always does.'), mi('Yay!', 'happy')],
      }),
      opt('“Fine. Just don’t get in the way.”', {
        score: 'woods',
        good: false,
        then: [mi('Rude. Accurate, but rude.')],
      }),
    ]),
    joinSisters,
    sys('Mitzi and Victoria join you. Mitzi won’t fight in the Dead Woods — but her eyes might be useful, if someone convinces her to use them.'),
    end('trail'),
  ],

  woods_a: [
    bg('woods'),
    mi('Ugh. Another one. Can’t we wait until they get bored and leave?'),
    choice([
      opt('“Look at its eyes before it runs. What colour were they?”', {
        score: 'woods',
        good: true,
        then: [mi('…Green? Greenish. Like old soup. Why does that matter?'), a('Because the next green one might fight the same way.')],
      }),
      opt('“Victoria, keep her out of sight.”', {
        score: 'woods',
        good: false,
        then: [v('Already doing it.')],
      }),
      opt('“Sure, take a nap. We’ll wake you.”', {
        score: 'woods',
        good: false,
        then: [mi('Best. Expedition. Ever.', 'happy')],
      }),
    ]),
    end('trail'),
  ],

  woods_b: [
    bg('woods'),
    v('Mitzi, water. No — give it here, I’ll hold the flask. You’ll spill.'),
    n('Mitzi’s hands hover, then drop. She doesn’t seem to notice they never get to try.'),
    choice([
      opt('“Let her hold it, Victoria. Small things first.”', {
        score: 'woods',
        good: true,
        then: [v('…Fine. Don’t drop it.'), mi('I won’t! …Probably.', 'happy')],
      }),
      opt('“Mitzi, what did you notice about the last beast?”', {
        score: 'woods',
        good: true,
        then: [mi('It had a lot of legs. Like, rude amounts of legs. And it only bit when the big one did.'), v('…You noticed that?')],
      }),
      opt('Say nothing.', {
        score: 'woods',
        good: false,
        then: [n('Victoria screws the cap back on. Mitzi hums.')],
      }),
    ]),
    end('trail'),
  ],

  woods_c: [
    bg('woods'),
    mi('Did you know Vicky drinks when I’m asleep? She thinks I don’t know. It’s kind of funny.', 'happy'),
    choice([
      opt('“It isn’t funny, Mitzi. She’s carrying something heavy.”', {
        score: 'woods',
        good: true,
        then: [mi('…Oh.', 'sad'), n('For a moment, Mitzi doesn’t make a joke.')],
      }),
      opt('“Ha! Everyone needs a hobby.”', {
        score: 'woods',
        good: false,
        then: [mi('Right?!', 'happy'), n('Ahead, Victoria walks a little faster.')],
      }),
    ]),
    end('trail'),
  ],

  mitzi_learns: [
    bg('woods'),
    mi('Wait. Wait wait wait.', 'shock'),
    mi('That one had green eyes and it hit just like the other green one. Same squishy sort of stab.'),
    mi('Alice. Alice! Give me something to write on!'),
    n('Alice hands over the back of a pub menu. Mitzi’s tongue pokes out. She draws an eye. Then a triangle. Then, with great ceremony, legs.'),
    v('…Since when do you write things down?'),
    mi('Since now. Shh. I’m being clever.', 'happy'),
    learnStudy('woods'),
    sys('Mitzi learned STUDY. She can spend her turn to note one feature of an enemy — eyes, shape or limbs. Attacks and weaknesses you witness are linked to known features in her notebook.'),
    end('trail'),
  ],

  woods_boss: [
    bg('woods'),
    cg('stag'),
    n('The trees lean apart around something tall. Antlers like a cathedral’s ribs. A hollow where its heart should be.'),
    n('Moonlight falls straight through it.'),
    v('Mitzi. Behind me. Now.'),
    cg(null),
    when(
      (s) => s.notebook.unlocked,
      [
        choice([
          opt('“Mitzi — study it. Find what it’s afraid of.”', {
            score: 'woods',
            good: true,
            then: [mi('Studying! From… a reasonable distance!')],
          }),
          opt('“Victoria, take point. I’ll follow.”', {
            score: 'woods',
            good: false,
            then: [v('Always.')],
          }),
        ]),
      ],
      [
        choice([
          opt('“No. Mitzi, look at it. You’re the only one who can learn it before it learns us.”', {
            score: 'woods',
            good: true,
            then: [
              mi('Me? I— okay. Okay. Eyes, shape, legs. Eyes, shape, legs.'),
              learnStudy('woods'),
              sys('Mitzi learned STUDY. She can spend her turn to note one feature of an enemy. What you witness gets linked to those features in her notebook.'),
            ],
          }),
          opt('“Victoria tanks. I strike. Mitzi stays clear.”', {
            score: 'woods',
            good: false,
            then: [v('Finally, a plan I like.'), n('Mitzi crouches behind a stump, shaking.')],
          }),
        ]),
      ],
    ),
    end('trail'),
  ],

  woods_clear: [
    bg('woods'),
    n('The Hollow Stag folds down into the roots like a tent being struck.'),
    when(
      (s) => s.flags.mitziStudy === 'woods',
      [mi('Did you see me? I noted stuff! I am a noter!', 'happy'), v('You were… good. You were good, Mitzi.')],
      [mi('Is it over? Can I come out? I took notes at the end. Shaky notes.'), v('You did fine. Stay behind me next time.')],
    ),
    n('Victoria says it like a word in a language she’s still learning.'),
    v('Come back to town with us. I could use a drink.'),
    mi('She could always use a drink!', 'happy'),
    n('Nobody laughs but Mitzi.'),
    run((s) => {
      s.pendingRest = 'night_woods';
    }),
    objective('Back in Gehenna. Spend your coin, then rest at the Inn.'),
    end('return'),
  ],

  night_woods: [
    bg('inn_night'),
    music('night'),
    n('Late. The Inn’s candles have burned down to opinions.'),
    n('Alice can’t sleep. Downstairs, a glass taps a table. Tap. Tap.'),
    v('…Can’t sleep either?'),
    v('Mitzi’s out like a lamp. She sleeps like nothing has ever happened to her. I envy that.'),
    choice([
      opt('“What happened to you two?”', {
        then: [
          v('Our parents died when she was small. She doesn’t remember them. So I’m—'),
          v('I’m what she has.'),
        ],
      }),
      opt('“That’s your third glass.”', {
        then: [v('Fourth. Who’s counting? You, apparently.', 'angry'), v('Our parents died when she was small. Somebody has to be the grown-up.')],
      }),
    ]),
    v('We came down here after. Grew up in these streets. Gehenna’s all she knows.'),
    n('She says it like she is reading it off a card.'),
    goto('morning_hestia'),
  ],

  morning_hestia: [
    bg('town'),
    music('church'),
    n('Morning — or what Gehenna calls it. Bells ring from the horned church.'),
    h('Oh! A new face. And such a lost one.', 'happy'),
    h('I am Hestia. I tend the flock of the White Ox. You will come to mass, won’t you? Everyone feels so much lighter after.'),
    mi('I went once! I napped for three days. Super restful.', 'happy'),
    choice([
      opt('“Lighter how, exactly?”', {
        note: 'Hestia notices the question. So does Alice.',
        tone: 'good',
        fx: (s) => {
          s.flags.hestiaWary += 1;
          s.flags.aliceUp += 1;
        },
        then: [h('Unburdened, dear. Of worry. Of striving. Of all that tiresome… wanting.')],
      }),
      opt('“Maybe some other time.”', {
        then: [h('The Ox is patient. So am I.', 'happy')],
      }),
    ]),
    n('When she smiles, her eyes close. Like a door being politely shut.'),
    run((s) => {
      s.flags.metHestia = true;
      s.chapter = 2;
      s.unlocked.volcano = true;
    }),
    music('town'),
    objective('The Caldera lies beyond the gate. Prepare, then depart.'),
    end('town'),
  ],

  // ════════════════════════════════════════════════════════════ CALDERA
  volcano_enter: [
    bg('volcano'),
    n('The Caldera. The air shimmers like it is trying to remember a word.'),
    mi('It’s SO hot. Why is hell hot? That’s so on the nose.'),
    a('Mitzi. Today, I need you to swing that hammer.'),
    mi('Okayyy. But only if you ask nicely. And carry the snacks.'),
    choice([
      opt('“I’m not asking for backup. I’m asking you to be you — swinging.”', {
        score: 'volcano',
        good: true,
        fx: mitziAtk(1),
        then: [mi('…Me. Swinging. Okay. I can be that.', 'happy')],
      }),
      opt('“Just chip in when it’s safe.”', {
        score: 'volcano',
        good: false,
        fx: mitziAtk(-1),
        then: [mi('Safe is my favourite time to do things!', 'happy')],
      }),
    ]),
    sys('Mitzi will fight now. How you speak to her in the Caldera will raise or lower her strength — and whatever it is when you leave, it stays.'),
    end('trail'),
  ],

  volcano_a: [
    bg('volcano'),
    mi('Sparks in my hair! Is it a look? It’s a look.', 'happy'),
    choice([
      opt('“Plant your feet. You hit harder when you mean it.”', {
        score: 'volcano',
        good: true,
        fx: mitziAtk(1),
        then: [mi('Feet: planted. Meaning: …meant!')],
      }),
      opt('“Fall back. Victoria and I will clear the way.”', {
        score: 'volcano',
        good: false,
        fx: mitziAtk(-1),
        then: [v('Good.'), n('Mitzi falls back. She always does.')],
      }),
    ]),
    end('trail'),
  ],

  volcano_b: [
    bg('volcano'),
    v('Her hands are blistering. Mitzi, give me the hammer.'),
    mi('But I was just getting good at—'),
    choice([
      opt('“Let her keep it. Blisters heal. Never trying doesn’t.”', {
        score: 'volcano',
        good: true,
        fx: mitziAtk(1),
        then: [v('You don’t know her like I do.', 'angry'), mi('Maybe she does. A little.')],
      }),
      opt('“Mitzi — what do you want?”', {
        score: 'volcano',
        good: true,
        fx: mitziAtk(1),
        then: [mi('I want… to keep it?'), v('…Fine.')],
      }),
      opt('“Victoria’s right. Hand it over.”', {
        score: 'volcano',
        good: false,
        fx: mitziAtk(-1),
        then: [n('Mitzi hands it over. She doesn’t argue. She never argues.')],
      }),
    ]),
    end('trail'),
  ],

  volcano_hazard: [
    bg('volcano'),
    n('A vent splits beside the path with a sound like a breath held far too long.'),
    fx('flash'),
    fx('shake'),
    n('Fire licks over Alice’s shoulder. The smell of burning hair — sweet, and wrong.'),
    mi('ALICE! Your hair! Half your — oh no. Oh no, it’s uneven.', 'shock'),
    a('…Knife.'),
    cg('haircut'),
    n('She saws the rest off at the jaw. It isn’t neat. Pink curls drift down into the heat and are gone before they land.'),
    run((s) => (s.flags.shortHair = true)),
    n('The watch ticks on, unbothered.'),
    a('Lighter. That’s one way to be lighter.'),
    cg('maw'),
    n('Below, the lava heaves. Something rises out of it with a mouth where its whole front should be.'),
    mi('Is it— is it SMILING at us?'),
    cg(null),
    end('trail'),
  ],

  volcano_clear: [
    bg('volcano'),
    n('Cinder Maw sinks back into the slag, still chewing.'),
    when(
      (s) => s.flags.mitziAtk >= 7,
      [mi('I HIT IT. Did you SEE me? Vicky, did you see?', 'happy'), v('…I saw.')],
      [
        when(
          (s) => s.flags.mitziAtk >= 5,
          [mi('I helped! I think I helped. Did I help?'), v('You helped.')],
          [mi('I… mostly held the snacks.', 'sad'), v('That’s all right. Stay behind me next time.')],
        ),
      ],
    ),
    run((s) => {
      s.flags.mitziLocked = true;
      s.pendingRest = 'night_volcano';
    }),
    sys((s) => `Mitzi’s strength is settled at ${s.flags.mitziAtk}.`),
    objective('Rest at the Inn.'),
    end('return'),
  ],

  night_volcano: [
    bg('pub'),
    music('pub'),
    n('Mitzi throws a gathering at the Pub. She invites everyone. Most of everyone comes.'),
    mi('Welcome, welcome! Snacks are on Vicky! Drinks are on Vicky!', 'happy'),
    v('…Drinks are on Vicky.'),
    n('Mitzi is wonderful at listening. A ghoul tells her his troubles; she nods and gives him good advice. Then she drifts to the next table and forgets him entirely.'),
    choice([
      opt('“You’re good with people, Mitzi.”', {
        then: [mi('I know! Everyone likes me when there are snacks.', 'happy')],
      }),
      opt('“Who’s paying for all this?”', {
        then: [mi('Vicky! She doesn’t mind. …She doesn’t mind, right?'), n('Across the room, Victoria counts her coins twice.')],
      }),
    ]),
    run((s) => {
      s.chapter = 3;
      s.unlocked.fort = true;
    }),
    music('town'),
    objective('The Abandoned Fort waits beyond the gate.'),
    end('town'),
  ],

  // ════════════════════════════════════════════════════════════ ABANDONED FORT
  fort_enter: [
    bg('fort'),
    n('The Abandoned Fort. Gates sagging, banners rotted to lace. It smells of iron and old decisions.'),
    v('Stay in my shadow, Mitzi.'),
    mi('I can go first this time, I’ve been practising my—'),
    cg('argument'),
    v('No. I step first. Always.', 'angry'),
    mi('You ALWAYS step first! You stepped first at breakfast! You step first into ROOMS!', 'angry'),
    v('Because something might be in them, Mitzi!', 'angry'),
    n('The fort swallows the echo. Neither of them looks away first.'),
    cg(null),
    sys('In the Fort, Victoria will step in front of Mitzi whenever Mitzi tries to act.'),
    choice([
      opt('“Victoria, if you never step aside, she never learns where to stand.”', {
        score: 'fort',
        good: true,
        then: [v('She doesn’t NEED to learn. That’s what I’m for.', 'angry')],
      }),
      opt('“Mitzi asked to go first. Let her.”', {
        score: 'fort',
        good: true,
        then: [v('…We’ll see.')],
      }),
      opt('“You’re a good sister. Keep her safe.”', {
        score: 'fort',
        good: false,
        then: [v('I know.')],
      }),
    ]),
    end('trail'),
  ],

  fort_a: [
    bg('fort'),
    v('Did you see that? It nearly took her arm. I had to.'),
    mi('It was going to miss! Probably!'),
    choice([
      opt('“Ask her if she wants cover, Victoria. Don’t decide for her.”', {
        score: 'fort',
        good: true,
        then: [v('…Mitzi. Do you want me to cover you?'), mi('Sometimes! Not always! Ask me!', 'happy')],
      }),
      opt('“You did the right thing.”', {
        score: 'fort',
        good: false,
        then: [v('I always do.')],
      }),
    ]),
    end('trail'),
  ],

  fort_b: [
    bg('fort'),
    n('A corridor between two walls. Too narrow. Wet stone. Victoria stops walking.'),
    v('…I know this place.'),
    a('You’ve been here before?'),
    cg('alley'),
    v('Not here. An alley. Wet bricks. Somebody laughing. Mitzi asleep against my shoulder, because we had nowhere—', 'sad'),
    n('Rain that isn’t falling. A streetlamp that isn’t there. Two shapes at the mouth of the alley, hoods up.'),
    v('That isn’t right. We grew up here. In Gehenna. We grew up HERE.', 'angry'),
    cg(null),
    choice([
      opt('“Victoria. What would you do, if you didn’t have to watch her every second?”', {
        score: 'fort',
        good: true,
        then: [v('I don’t know. Sleep, maybe. A whole night.'), v('Read something. Something that isn’t a price list.')],
      }),
      opt('“Tell me about one hour you had to yourself. Before.”', {
        score: 'fort',
        good: true,
        then: [v('There was a library. I’d go while she napped. I never finished a single book.', 'sad')],
      }),
      opt('“Focus. Sentiment gets people killed.”', {
        score: 'fort',
        good: false,
        then: [v('…Right. Yes. Right.')],
      }),
    ]),
    end('trail'),
  ],

  fort_c: [
    bg('fort'),
    mi('Vicky, you’re shaking.'),
    v('I’m fine.'),
    mi('You said that last time and then you drank the whole—'),
    v('Mitzi.', 'angry'),
    choice([
      opt('“Mitzi. Hold her hand. Not for you. For her.”', {
        score: 'fort',
        good: true,
        then: [mi('…Oh. Okay.'), n('Mitzi takes her sister’s hand. Victoria doesn’t know what to do with it, so she lets it stay.')],
      }),
      opt('“Let’s keep moving.”', {
        score: 'fort',
        good: false,
        then: [n('They keep moving. Victoria’s hand stays a fist.')],
      }),
    ]),
    n('Ahead, an empty suit of armour stands at the gate, still taking its post very seriously.'),
    end('trail'),
  ],

  fort_clear: [
    bg('fort'),
    n('The Gatewarden comes apart, plate by plate, like a promise nobody meant.'),
    run((s) => {
      const sc = s.scores.fort;
      s.flags.victoriaMode = sc.total && sc.good === sc.total ? 'assist' : sc.good === 0 ? 'interfere' : 'neutral';
    }),
    when(
      (s) => s.flags.victoriaMode === 'assist',
      [
        v('Mitzi. Next time, you take the first swing.'),
        v('I’ll be right beside you. Beside. Not in front.'),
        mi('Beside! I like beside!', 'happy'),
        sys('Victoria stops stepping in. Sometimes, she’ll catch part of a blow meant for Mitzi.'),
      ],
      [
        when(
          (s) => s.flags.victoriaMode === 'neutral',
          [v('I’ll… try to stay out of your way.'), n('She doesn’t promise. But she doesn’t step in, either.'), sys('Victoria will leave Mitzi to her own fights.')],
          [
            v('I am not letting anything touch her. Not again. Never again.', 'angry'),
            n('Again? Nobody asks.'),
            sys('Victoria will keep stepping in front of Mitzi for the rest of the journey.'),
          ],
        ),
      ],
    ),
    run((s) => {
      s.pendingRest = 'night_fort';
    }),
    objective('Rest at the Inn.'),
    end('return'),
  ],

  night_fort: [
    bg('church'),
    music('hestia'),
    cg('hestia'),
    n('Beneath the horned church, where the candles are made of something that isn’t wax…'),
    h('Three new lambs. The sisters cling to each other like drowning swimmers. They’ll kneel by spring.', 'angry'),
    h('But the surface girl. She still looks UP.', 'angry'),
    h('Nobody who falls here deserves the sky. They had their chance. They spent it.', 'angry'),
    n('Her eyes burn red. On the wall behind her, her shadow wears horns.'),
    n('At the sound of a footstep, the eyes cool to blue again.'),
    cg(null),
    bg('town'),
    music('town'),
    h('Children! I hear you’re bound for the Ruins.', 'happy'),
    h('Let me guide you. The Ruins punish the proud — and I know every stone.', 'happy'),
    run((s) => {
      s.chapter = 4;
      s.unlocked.ruins = true;
    }),
    objective('Hestia will guide you through the Ruins.'),
    end('town'),
  ],

  // ════════════════════════════════════════════════════════════ RUINS
  ruins_enter: [
    bg('ruins'),
    h('The Ruins of the Old Faith. Before the Ox, they worshipped the clock. Imagine — counting your sins by the minute.'),
    run((s) => {
      if (!s.roster.includes('hestia')) s.roster.push('hestia');
      s.flags.hestiaObey = 1;
      s.heroes.hestia.hp = s.heroes.hestia.maxHp;
    }),
    sys('Hestia joins the party. Her strength is her own business — and she listens to orders less and less.'),
    a('(She smiles like a locked door.)'),
    choice([
      opt('Smile back. Count her steps.', {
        score: 'ruins',
        good: true,
        then: [n('Alice smiles. Hestia smiles. Neither of them means it.')],
      }),
      opt('“Thank you, Hestia. We’re grateful.”', {
        score: 'ruins',
        good: false,
        then: [h('Gratitude is the first step toward the pew.', 'happy')],
      }),
    ]),
    end('trail'),
  ],

  ruins_a: [
    bg('ruins'),
    h('Mass is mercy. Those who join feel lighter every week. Isn’t that proof enough?'),
    choice([
      opt('“Lighter — or emptier? Who grows fat on a tired flock?”', {
        score: 'ruins',
        good: true,
        then: [h('What an odd thing to say.', 'angry'), n('For a single frame, her eyes flicker red.')],
      }),
      opt('“If it eases the pain, maybe that’s enough.”', {
        score: 'ruins',
        good: false,
        then: [h('Exactly. Exactly, darling.', 'happy')],
      }),
    ]),
    end('trail'),
  ],

  ruins_b: [
    bg('ruins'),
    n('Alice remembers Charon flipping a coin: “She knows exactly what this place is. Ask her better questions.”'),
    choice([
      opt('“Hestia, how long have you been in Gehenna?”', {
        score: 'ruins',
        good: true,
        then: [h('Since before the milk. Since before the town.'), h('…I mean, it feels that way. Doesn’t it?', 'happy')],
      }),
      opt('“Why do your eyes avoid the dark corners?”', {
        score: 'ruins',
        good: true,
        then: [h('I don’t like what is in them.'), h('Dust, dear. I mean dust.', 'happy')],
      }),
      opt('“Lead on. We trust you.”', {
        score: 'ruins',
        good: false,
        then: [h('Good lambs.', 'happy')],
      }),
    ]),
    end('trail'),
  ],

  ruins_trap: [
    bg('ruins'),
    h('That chamber! Sacred relics. You should look alone, Alice. The Ox favours the curious.'),
    choice([
      opt('“We go together or not at all. You’re in a hurry — why?”', {
        score: 'ruins',
        good: true,
        then: [h('…Of course. Together.'), n('She is not pleased. They go together. It doesn’t help: the floor has opinions.')],
      }),
      opt('“All right. I’ll take a look.”', {
        score: 'ruins',
        good: false,
        then: [n('Alice steps inside alone. Hestia waits at the door, hands folded.')],
      }),
    ]),
    fx('flash'),
    fx('shake'),
    cg('trap'),
    n('A click. Wires sing. A volley of needles from a carved saint’s mouth.'),
    n('Pain blooms white across Alice’s left eye.'),
    cg(null),
    mi('ALICE!', 'shock'),
    v('Hold still. Hold STILL. Mitzi — the cloth.'),
    n('Mitzi’s hands shake, but she ties it. Clean. Tight. Her first bandage.'),
    run((s) => (s.flags.eyepatch = true)),
    h('Oh, how dreadful. The relics must have been… cross with you.', 'happy'),
    n('Hestia’s face is pity. Or rehearsal.'),
    a('I can still see. One eye is plenty. The watch does the rest.'),
    n('Something heavy turns in the dark at the end of the hall. A saint-shaped box of needles, still praying.'),
    end('trail'),
  ],

  ruins_clear: [
    bg('ruins'),
    n('The Reliquary’s doors fall open. Inside: nothing. It was always nothing.'),
    h('You survived. How… wonderful.', 'happy'),
    h('Come to the Manor tomorrow night. We will hold a communion in your honour. Rest well, lambs.'),
    run((s) => {
      s.roster = s.roster.filter((id) => id !== 'hestia');
      const sc = s.scores.ruins;
      const ratio = sc.total ? sc.good / sc.total : 0;
      if (ratio >= 1) s.flags.partyDefense = true;
      else if (ratio < 0.5) s.flags.hestiaBoost = true;
      s.pendingRest = 'last_night';
    }),
    sys('Hestia leaves the party.'),
    when(
      (s) => s.flags.partyDefense,
      [sys('You never stopped watching her. Your party will take less damage in the final battle.')],
      [when((s) => s.flags.hestiaBoost, [sys('She found you easy to lead. Something tells you she’ll hit harder for it.')], [])],
    ),
    objective('Rest at the Inn. It is the last night.'),
    end('return'),
  ],


  // ════════════════════════════════════════════════════════════ CAMPFIRES
  woods_camp: [
    bg('woods'),
    n('They make camp in a ring of dead birches. Victoria builds the fire. Mitzi supervises.'),
    mi('You don’t need fire for warmth in Gehenna. It’s more of a vibe.'),
    v('Fire keeps the things in the trees honest.'),
    a('What lives out here?'),
    v('People who wandered off from mass. The longer they stay out, the less they look like anyone.'),
    mi('The triangle one with the green eyes used to sell buttons. I’m like seventy percent sure.'),
    n('Victoria tips something from a flask into her tea when she thinks nobody is looking. Mitzi is looking. Mitzi says nothing.'),
    run((s) => unlockLore(s, 'woods_folk')),
    end('trail'),
  ],

  volcano_camp: [
    bg('volcano'),
    n('A shelf of cooled rock above the lava. Warm enough to sleep without blankets, if you don’t mind dreaming of ovens.'),
    v('Even the Milk Guild won’t haul through here. Too hot. The milk turns.'),
    a('Where does the milk go, anyway?'),
    v('Up the long road past the Manor. Every morning. Nobody follows the carts.'),
    mi('I followed one once! It just kept going up and up. Then I got bored and came home.'),
    v('…You never told me that.'),
    mi('You never asked!', 'happy'),
    n('Mitzi turns her hammer over in her hands, testing the weight like she has never held anything heavy before. Maybe she hasn’t.'),
    run((s) => unlockLore(s, 'milk_road')),
    end('trail'),
  ],

  fort_camp: [
    bg('fort'),
    n('They sleep in the old barracks. Every bunk is made, corners tucked. Nobody has slept in them for a very long time.'),
    a('Who kept this place?'),
    v('Soldiers, before the Ox. They guarded the road to the Ruins.'),
    v('Then the church said there was nothing left out there to guard against, and they all went to mass instead.'),
    mi('Vicky, you’re doing the voice.'),
    v('What voice?'),
    mi('The bedtime-story voice. You used to do it every night. Back when—'),
    n('Mitzi stops. Neither of them finishes the sentence. The fire does it for them, popping once.'),
    run((s) => unlockLore(s, 'fort_garrison')),
    end('trail'),
  ],

  ruins_camp: [
    bg('ruins'),
    n('A collapsed chapel. A clock face the size of a door lies on its back in the rubble, its hands rusted at midnight.'),
    h('The Old Faith counted sins by the hour. A bell every hour, a confession every bell. Exhausting.'),
    h('The Ox offered something kinder: one mass a day, and you never have to count again.'),
    a('And the clock-keepers?'),
    h('They came around. Everyone comes around.', 'happy'),
    n('When Hestia lies down — if she sleeps at all — she lies facing the dark corners.'),
    mi('(whispering) Alice. Her shadow has horns.'),
    a('(whispering) It’s the rubble.'),
    mi('(whispering) …Right. Rubble.'),
    run((s) => unlockLore(s, 'old_faith')),
    end('trail'),
  ],

  // ════════════════════════════════════════════════════════════ LAST NIGHT
  last_night: [
    bg('inn_night'),
    music('night'),
    n('The last night. The candles lean toward the door as if they want to leave too.'),
    n('There is time to speak with one person. Words can still bend what comes next.'),
    choice(
      [
        opt('Talk to Mitzi', { then: [goto('night_mitzi')] }),
        opt('Talk to Victoria', { then: [goto('night_victoria')] }),
        opt('Talk to Charon', { then: [goto('night_charon')] }),
        opt('Talk to Hestia', { then: [goto('night_hestia')] }),
        opt('Sleep', { then: [n('Alice lies awake and listens to the town breathe.'), goto('manor')] }),
      ],
      'Who will you seek out?',
    ),
  ],

  night_mitzi: [
    run((s) => (s.flags.nightTalk = 'mitzi')),
    mi('You’re staring. Is there ash on me? There’s always ash on me.'),
    mi('…I heard Vicky crying last night. I pretended to be asleep. I’m really good at pretending to be asleep.', 'sad'),
    choice([
      opt('“Next time, don’t pretend. Go downstairs. Sit with her.”', {
        note: 'Mitzi has decided to stay up for her sister.',
        tone: 'good',
        fx: (s) => (s.flags.mitziRedeemed = true),
        then: [mi('And say what?'), a('Nothing. Just be the one who stays up, for once.'), mi('…Okay. Okay. I can do that.')],
      }),
      opt('“What would you do, if Victoria wasn’t there to do it for you?”', {
        note: 'Mitzi has decided to try being her own person.',
        tone: 'good',
        fx: (s) => (s.flags.mitziRedeemed = true),
        then: [mi('Panic? Then… figure it out? Then panic again, but smaller?'), a('That’s called living.'), mi('Huh. It sounds exhausting. I want to try it.', 'happy')],
      }),
      opt('“She’ll be fine. She always is.”', {
        note: 'Mitzi goes back to pretending.',
        tone: 'bad',
        then: [mi('Yeah. She always is.'), n('Mitzi rolls over. She is very good at pretending to be asleep.')],
      }),
    ]),
    goto('manor'),
  ],

  night_victoria: [
    run((s) => (s.flags.nightTalk = 'victoria')),
    v('Mitzi’s asleep.'),
    n('She turns an empty glass, like a confession.'),
    v('I remembered the rest. The alley. The knife. I couldn’t— I wasn’t strong enough.', 'sad'),
    v('She was asleep when they came. She never woke up. I held her the whole time.', 'sad'),
    v('We didn’t grow up here. We died. And I’ve been raising her in a graveyard.'),
    choice([
      opt('“Then stop raising her. Start knowing her. And live one hour for yourself.”', {
        note: 'Victoria sets down the glass.',
        tone: 'good',
        fx: (s) => {
          s.flags.victoriaRedeemed = true;
          s.flags.victoriaMode = 'assist';
        },
        then: [v('One hour.'), v('I wouldn’t know what to do with it.'), a('Finish a book.'), n('Victoria laughs. It cracks in the middle, but it is real.')],
      }),
      opt('“It wasn’t your fault.”', {
        note: 'Something in Victoria finally lets go.',
        tone: 'good',
        fx: (s) => {
          s.flags.victoriaRedeemed = true;
          s.flags.victoriaMode = 'assist';
        },
        then: [v('…Say it again.'), a('It wasn’t your fault.'), n('Victoria puts the glass upside down on the table, and leaves it there.')],
      }),
      opt('“She’s lucky to have you.”', {
        note: 'Victoria pours another glass.',
        tone: 'bad',
        then: [v('Is she?'), n('She pours another glass.')],
      }),
    ]),
    goto('manor'),
  ],

  night_charon: [
    run((s) => (s.flags.nightTalk = 'charon')),
    bg('clinic'),
    c('Can’t sleep? Corpses rarely can. It’s the posture.'),
    c('Tomorrow you meet the White Ox. Hestia’s real face.'),
    c('She thinks anyone who lands down here lost their shot at the sky. She feeds on the ones who agree with her.'),
    c('You, though. You’re still holding a watch that ticks.'),
    c('The sky takes people who finish their business. Even when finishing costs them.'),
    choice([
      opt('“What is my business?”', {
        fx: up(2),
        note: 'Alice feels the door in the sky a little closer.',
        tone: 'good',
        then: [c('Letting go of the way back. There is no back. There is only up.')],
      }),
      opt('“Why help me?”', {
        fx: up(2),
        note: 'Alice feels the door in the sky a little closer.',
        tone: 'good',
        then: [c('I collect coins. You’re a rare one.'), c('I’d like to see you spent well.')],
      }),
      opt('“Everyone says you’re just trolling.”', {
        fx: up(1),
        note: 'Charon shrugs. The door feels a little closer anyway.',
        tone: 'info',
        then: [c('Everyone’s dead, dear. They say a lot of things.')],
      }),
    ]),
    goto('manor'),
  ],

  night_hestia: [
    run((s) => (s.flags.nightTalk = 'hestia')),
    bg('church'),
    h('Come to see me, lamb? On the last night. How sweet.', 'happy'),
    h('Tomorrow you will kneel, or you will break. Either way, you will stay.'),
    choice([
      opt('“I know what you are. I won’t kneel.”', {
        fx: (s) => (s.flags.hestiaNightWin = chance(0.4)),
        then: [goto('night_hestia_roll')],
      }),
      opt('“What are you, really?”', {
        fx: (s) => (s.flags.hestiaNightWin = chance(0.25)),
        then: [goto('night_hestia_roll')],
      }),
      opt('“Maybe peace is worth the price.”', {
        note: 'Hestia will remember how easily you bent.',
        tone: 'bad',
        fx: (s) => {
          s.flags.hestiaBoost = true;
          s.flags.hestiaNightWin = false;
        },
        then: [h('It is. Oh, it is.', 'happy'), n('Her smile stays on Alice’s back all the way up the stairs.'), goto('manor')],
      }),
    ]),
  ],

  night_hestia_roll: [
    when(
      (s) => s.flags.hestiaNightWin,
      [
        h('…', 'angry'),
        n('For a long moment her eyes are red, and she forgets to hide them.'),
        n('Then she looks away first.'),
        run((s) => {
          if (s.flags.hestiaBoost) s.flags.hestiaBoost = false;
          else s.flags.partyDefense = true;
        }),
        sys('Hestia is rattled. The White Ox will not be at its strongest.'),
      ],
      [h('Darling. You know nothing at all.', 'happy'), n('Her eyes stay blue. She has had a very long time to practise.')],
    ),
    goto('manor'),
  ],

  // ════════════════════════════════════════════════════════════ MANOR
  manor: [
    bg('manor'),
    music('manor'),
    run((s) => {
      s.chapter = 5;
      s.supplies = 100;
    }),
    n('The Manor breathes incense and animal heat. White drapes. White candles. A white altar with nothing on it.'),
    h('Welcome, lambs. To your final communion.', 'happy'),
    h('Do you know what you are? Failures. Every soul down here had a life above, and wasted it.'),
    h('The sky is for the deserving. You are not. So stay. Kneel. Be emptied, gently, week by week.'),
    a('No.'),
    h('Then I will empty you all at once.', 'angry'),
    fx('flash'),
    fx('shake'),
    music('ox'),
    cg('ox'),
    n('Hestia’s habit splits like a seed husk. What rises is white, and vast, and horned. Its wings are hymn-sheets. Its bells ring without moving.'),
    n('Its eyes stay closed. It does not need them for you.'),
    cg(null),
    battle({ kind: 'boss', bossId: 'white_ox', tier: 5, bg: 'manor', label: 'The White Ox' }, 'manor_after'),
  ],

  manor_after: [
    bg('manor'),
    music('after'),
    n('The White Ox kneels. The bells go quiet, one by one.'),
    n('Where it stood, Hestia sits in the ash of her habit, eyes red and unhidden.'),
    h('You — little clockwork thing. You don’t deserve the sky. You already failed up there.', 'angry'),
    choice(
      [
        opt('“Maybe I did. That’s what finishing is for.”', { fx: (s) => (s.flags.finalChoice = 'finish') }),
        opt('“Mitzi. Victoria. Your lives are yours now. Go — even without me.”', { fx: (s) => (s.flags.finalChoice = 'free') }),
        opt('“…Maybe she’s right. Maybe we stay.”', { fx: (s) => (s.flags.finalChoice = 'stay') }),
      ],
      'The last word is yours.',
    ),
    run((s) => (s.cleared.manor = true)),
    end('ending'),
  ],
};

/** Every scene id that the script or data references, for tests. */
export const SCENE_IDS = Object.keys(SCENES);
void cast;
