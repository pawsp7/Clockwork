import { n, sys, say, bg, music, fx, run, when, choice, opt, battle, end, goto, cast, cg, card } from '../game/story.js';
import { chance } from '../core/rng.js';
import { unlockLore } from './lore.js';
import { TALK_SCENES } from './talks.js';

/* Speakers: alice, mitzi, victoria, hestia, charon, thug, smith (Horace),
   carter (Bede), flock, narrator, system.
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
const heard = (id) => (s) => !!s.talks?.includes(id);
const flag = (k, val = true) => (s) => (s.flags[k] = val);

export const SCENES = {
  // ════════════════════════════════════════════════════════════ PROLOGUE
  prologue: [
    bg('surface'),
    music('surface'),
    card('Prologue', 'A Drawer of Broken Things'),
    n('Above ground, in a city that never learned her name, Alice kept a room with one window, one kettle, and one drawer of broken things.'),
    n('A music box that played half a song. A teacup with a crack like a river. A radio that only ever got the weather. She meant to mend them all. She meant to do a great many things.'),
    n('At the very back of the drawer, under string and good intentions, she found a pocket watch.'),
    n('It was cold. It was heavy. It did not tick.'),
    a('Whose were you, I wonder?'),
    a('I don’t remember buying you. I don’t remember anyone giving you to me. I remember the teacup. Why don’t I remember you?'),
    cg('watch'),
    n('She wound it every night for a week. It never moved. She kept winding it anyway. It was the one broken thing she had not given up on.'),
    n('One evening, it opened by itself.'),
    n('The second hand ran backwards. The streetlights bent like reeds. And the floor forgot to hold her.'),
    fx('distort', 1600),
    music('none'),
    cg(null),
    bg('outskirts'),
    music('outskirts'),
    fx('fadein'),
    a('…That was not a staircase.'),
    n('Stone overhead, where the sky should be. Lanterns the colour of spilled milk. A smell of incense and wet straw.'),
    a('The watch is warm now. And it has — grown a blade?', 'shock'),
    n('And it ticks. For the first time since she found it, it ticks: steady and patient, like a heartbeat that belongs to somebody else.'),
    n('Two figures peel away from the dark between the milk carts.'),
    say('thug', 'Oi. Fresh one. Still smells like daylight.'),
    say('thug', 'Shiny watch. Bet that’s worth a few masses.'),
    a('I don’t know where I am, and I don’t know what a mass costs. But you aren’t having it.'),
    say('thug', 'Feisty. They’re all feisty the first day.'),
    a('If this is a dream, it is a very rude one.'),
    battle({ kind: 'tutorial', bg: 'outskirts', label: 'Two Thugs' }, 'prologue_after'),
  ],

  prologue_after: [
    bg('outskirts'),
    music('outskirts'),
    n('The thugs scatter into the alleys, one of them limping, both of them laughing, as if this happens every day. Perhaps it does.'),
    n('A woman in a long brown coat steps out of a doorway, flipping a coin.'),
    c('Not bad. For a corpse.'),
    a('I am not a—'),
    c('Dead? Everyone says that. Welcome to Gehenna. It’s hell, with municipal services.'),
    n('She stoops, plucks something from between the cobbles, and holds it up to the lantern-light: a small coin, worn smooth on one side.'),
    c('You dropped this.'),
    a('That isn’t mine. I didn’t bring any money.'),
    c('Everybody brings one. Hardly anybody notices.'),
    n('The coin disappears into her coat. She does not offer it back.'),
    c('I’ll hold on to it. Professional habit.'),
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
    a('I don’t remember dying. I remember a drawer. A kettle. Winding a watch.'),
    c('Nobody remembers the dying. It’s like trying to remember falling asleep.'),
    c('You’re a funny one, though. You still smell of daylight. That usually wears off on the way down.'),
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
    n('People drift along the lantern street in twos and threes. They nod to Charon, politely. They nod to Alice, politely. Nobody looks up.'),
    a('Why does nobody look up?'),
    c('Nothing up there but stone, they’ll tell you. Ask what’s behind the stone and they’ll tell you it’s lovely.'),
    c('Then they’ll invite you to mass.'),
    n('Somewhere a bell rings. Not on the hour — there are no hours here — just whenever somebody pulls the rope.'),
    c('Inn for sleeping. Pub for hired blades and odd jobs. The Smithy will fix that watch. My Clinic will fix you.'),
    c('Old Horace at the Smithy hasn’t blinked in forty years. Don’t try to stare him out. He wins.'),
    c('The gate leads out. The Dead Woods are closest.'),
    c('Two sisters live out by the woods. Red and violet. You can’t miss them. You can’t shake them, either.'),
    a('Why are you helping me?'),
    c('Who says I am? I’m sightseeing. You’re the most interesting thing to fall through the ceiling in years.'),
    c('Look around. Talk to people. A few of them still remember how.'),
    run((s) => {
      s.chapter = 1;
      s.unlocked.woods = true;
      s.flags.seenTownIntro = true;
    }),
    objective('Explore Gehenna. A … over a door means someone wants a word. When ready, take the gate to the Dead Woods.'),
    end('town'),
  ],

  // ════════════════════════════════════════════════════════════ DEAD WOODS
  woods_enter: [
    bg('woods'),
    card('Chapter One', 'The Dead Woods'),
    n('The Dead Woods. Trees that forgot how to be trees, still standing out of habit.'),
    n('At the very edge of them, where the lantern-light gives up, there is a small house with its curtains drawn and a washing line with nothing on it.'),
    cg('sisters'),
    v('Stop right there. You’re the surface girl. Alice, isn’t it?'),
    a('News travels fast for the dead.'),
    v('Bede talks. Bede talks to everyone, and then everyone talks to me.'),
    v('I’m Victoria. This is my sister, Mitzi. We live at the edge of the woods. Always have.'),
    mi('Hiii! Are you here for my gathering? It’s on Thursday. Is it Thursday? Vicky, is it Thursday?', 'happy'),
    v('There are no Thursdays here, Mitzi.'),
    mi('There SHOULD be. Thursday’s the best one. It’s got pancakes in it.'),
    n('Victoria’s face does something complicated, and then nothing at all.'),
    v('…The woods have been restless. Things scratching at the shutters. If you’re going in, we’re coming. I won’t have things crawling toward our door.'),
    cg(null),
    a('That spear looks heavy.'),
    v('It keeps things at arm’s length. That’s all I need from it.'),
    mi('She means she’s coming. I’m coming because she’s coming. I’m not fighting, though. Fighting is sweaty.'),
    mi('I do have a hammer! Somewhere. Vicky carries it. Vicky carries most things.'),
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

  woods_path: [
    bg('woods'),
    n('The path winds between trunks as pale as candles. Somewhere, something that used to be a bird practises a song it has forgotten the end of.'),
    mi('Alice. Alice. What’s it like up there?'),
    v('Mitzi, don’t pester her.'),
    mi('I’m not pestering, I’m ASKING. Asking is the opposite of pestering.'),
    choice([
      opt('“Grey, mostly. It rains. But there’s a sun behind the clouds.”', {
        fx: flag('toldSun'),
        then: [
          mi('A sun! Like a big yellow lamp?'),
          a('…Yes. Exactly like that.'),
          mi('I draw that! I’ve always drawn that. Vicky says I made it up.', 'happy'),
          n('Victoria walks on ahead without a word.'),
        ],
      }),
      opt('“Lonely. I lived on my own. I don’t think anyone noticed when I left.”', {
        then: [
          mi('That’s the saddest thing I’ve ever heard. And I live HERE.', 'sad'),
          mi('Well, we noticed. You came down ticking. You’re extremely noticeable.'),
          n('Victoria glances back, just once.'),
        ],
      }),
      opt('“I’d rather hear about you two.”', {
        then: [mi('Us? Oh, we’re boring. Vicky does everything and I do the rest.'), v('She means I do everything.'), mi('That’s what I SAID.', 'happy')],
      }),
    ]),
    v('Keep your voices down. Things out here follow voices.'),
    mi('(whispering) Things out here probably follow whispers too.'),
    end('trail'),
  ],

  woods_a: [
    bg('woods'),
    n('The creature comes apart into leaves and a smell like an attic. For a moment, before it goes, its face looks almost like a face.'),
    mi('Ugh. Another one. Can’t we wait until they get bored and leave?'),
    a('You were watching that one, Mitzi. I saw you.'),
    mi('I was watching it in a NOT-fighting way. That’s allowed.'),
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
    n('A stream that doesn’t move. They stop beside it anyway, because Victoria says so.'),
    v('Mitzi, water. No — give it here, I’ll hold the flask. You’ll spill.'),
    n('Mitzi’s hands hover, then drop. She doesn’t seem to notice they never get to try.'),
    choice([
      opt('“Let her hold it, Victoria. Small things first.”', {
        score: 'woods',
        good: true,
        then: [v('…Fine. Don’t drop it.'), mi('I won’t! …Probably.', 'happy'), n('She doesn’t drop it. She looks at the flask in her own two hands as if it is a small animal that has decided to trust her.')],
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
    n('While they rest, Victoria takes a second flask from inside her coat — a smaller one, dented — and drinks from it with her back to them.'),
    end('trail'),
  ],

  woods_c: [
    bg('woods'),
    n('Victoria scouts ahead. Mitzi drops back to walk beside Alice, swinging her arms.'),
    mi('Did you know Vicky drinks when I’m asleep? She thinks I don’t know. It’s kind of funny.', 'happy'),
    choice([
      opt('“It isn’t funny, Mitzi. She’s carrying something heavy.”', {
        score: 'woods',
        good: true,
        then: [
          mi('…Oh.', 'sad'),
          n('For a moment, Mitzi doesn’t make a joke.'),
          mi('I know it isn’t. It’s just — if I say it’s funny, it’s a joke, and jokes are small.', 'sad'),
          mi('If it isn’t funny, then it’s big. And I don’t know what to do with big things. Vicky does the big things.'),
        ],
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
    n('Victoria watches her sister’s pencil for a long time. Part of her face is proud. The rest of it is afraid.'),
    learnStudy('woods'),
    sys('Mitzi learned STUDY. She can spend her turn to note one feature of an enemy — eyes, shape or limbs. Attacks and weaknesses you witness are linked to known features in her notebook.'),
    end('trail'),
  ],

  woods_boss: [
    bg('woods'),
    cg('stag'),
    n('The trees lean apart around something tall. Antlers like a cathedral’s ribs. A hollow where its heart should be.'),
    n('Moonlight falls straight through it.'),
    mi('There’s no moon down here. Where’s the moonlight coming FROM?'),
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
    n('Where it fell lies a little heap of things: a cowbell from a cow nobody owned, a ring of keys, a pair of spectacles folded neatly, as if someone meant to come back for them.'),
    a('It was a person too, wasn’t it?'),
    v('Somebody who wandered further than the rest.'),
    when(
      (s) => s.flags.mitziStudy === 'woods',
      [mi('Did you see me? I noted stuff! I am a noter!', 'happy'), v('You were… good. You were good, Mitzi.')],
      [mi('Is it over? Can I come out? I took notes at the end. Shaky notes.'), v('You did fine. Stay behind me next time.')],
    ),
    n('Victoria says it like a word in a language she’s still learning.'),
    v('Come back to town with us. I could use a drink.'),
    mi('She could always use a drink!', 'happy'),
    n('Nobody laughs but Mitzi.'),
    when((s) => s.scores.woods.good >= 2, [n('And then, after a moment, Mitzi stops laughing too.')]),
    run((s) => {
      s.pendingRest = 'night_woods';
    }),
    objective('Back in Gehenna. See who wants a word, spend your coin, then rest at the Inn.'),
    end('return'),
  ],

  night_woods: [
    bg('inn_night'),
    music('night'),
    n('Late. The Inn’s candles have burned down to opinions.'),
    n('Alice can’t sleep. Downstairs, a glass taps a table. Tap. Tap. It keeps better time than any clock in Gehenna.'),
    v('…Can’t sleep either?'),
    v('Mitzi’s out like a lamp. She sleeps like nothing has ever happened to her. I envy that.'),
    a('Hasn’t anything happened to her?'),
    v('Not if I can help it.'),
    choice([
      opt('“What happened to you two?”', {
        then: [v('Our parents died when she was small. She doesn’t remember them. So I’m—'), v('I’m what she has.')],
      }),
      opt('“That’s your third glass.”', {
        then: [v('Fourth. Who’s counting? You, apparently.', 'angry'), v('Our parents died when she was small. Somebody has to be the grown-up.')],
      }),
    ]),
    v('We came down here after. Grew up in these streets. Gehenna’s all she knows.'),
    n('She says it like she is reading it off a card.'),
    a('Came down after what?'),
    v('After. Just — after.'),
    n('She turns the glass. The candle shows a ring of old tide-marks inside it.'),
    v('Your turn, surface girl. What did you leave up there? Everybody leaves something.'),
    choice([
      opt('“A drawer of broken things I meant to fix.”', {
        fx: flag('toldDrawer'),
        then: [
          a('A music box. A teacup. A radio. I kept them all, meaning to mend them. I never did. I never finished anything, really.'),
          v('Why keep them, then?'),
          a('Because throwing them out would mean I’d given up. Keeping them meant I was still going to.'),
          v('…Huh.'),
          v('That’s the stupidest, most sensible thing I’ve heard in years.'),
        ],
      }),
      opt('“Nobody. That’s the honest answer.”', {
        then: [
          a('A room. A kettle. A landlady who called me Agnes for three years. I never corrected her.'),
          v('Why not?'),
          a('It seemed a lot of trouble over a name nobody used.'),
          v('…I’d have corrected her.'),
          a('I know. You correct everybody.'),
          n('For the first time, Victoria almost smiles.'),
        ],
      }),
    ]),
    v('Go to bed. Tomorrow the bells will want you. They want everybody new.'),
    n('Alice goes up. Behind her the tapping starts again, slower now.'),
    goto('morning_hestia'),
  ],

  morning_hestia: [
    bg('town'),
    music('church'),
    n('Morning — or what Gehenna calls it. Bells ring from the horned church.'),
    n('All along the lantern street, doors open at once. People step out in their best clothes and walk toward the bells without talking, the way water walks downhill.'),
    mi('Mass. Every day. Every day is Sunday, Hestia says. I asked her once if one of them could be Thursday instead, and she patted my head.'),
    h('Oh! A new face. And such a lost one.', 'happy'),
    n('She is pale-haired and black-robed, with a gold cross pinned in her hair. She smells of candle-smoke and warm milk, and she takes both of Alice’s hands in hers.'),
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
    h('And Victoria. Dear, tired Victoria.', 'happy'),
    n('From a fold of her robe she produces a small bottle, stoppered with white wax.'),
    h('Communion wine. For your nerves. You carry so much, dear. The Ox doesn’t want you to carry anything at all.'),
    v('…Thank you, Sister.'),
    n('Victoria takes it. She doesn’t look at Mitzi. She doesn’t look at Alice. The bottle vanishes into her coat as if it has always lived there.'),
    h('And little Mitzi. You needn’t do anything, sweetheart. Rest. The Ox loves you exactly as you are.', 'happy'),
    mi('See? SHE gets it.', 'happy'),
    when((s) => s.flags.hestiaWary > 0, [a('(In her pocket, the watch ticks harder while Hestia talks. Alice is almost sure of it.)')]),
    h('And where are you bound next, children?'),
    mi('The Caldera! I want to see the Caldera. Vicky never lets me. It’s all fire and noise and—'),
    v('No.'),
    when(
      (s) => s.notebook.unlocked,
      [mi('You never let me do ANYTHING. I did the woods! I noted things! I’m a noter!')],
      [mi('You never let me do ANYTHING. I did the woods! I hid… very bravely… in the woods!')],
    ),
    h('The Caldera. How fitting.', 'happy'),
    h('Fire burns away what we carry, you know. You may all come back lighter. Go with the Ox’s blessing.'),
    n('Mass begins. The street empties. The three of them are left standing in the lantern-light like the last guests at a party.'),
    v('…Fine. The Caldera. But I walk first.'),
    run((s) => {
      s.flags.metHestia = true;
      s.chapter = 2;
      s.unlocked.volcano = true;
    }),
    music('town'),
    objective('The Caldera lies beyond the gate. See who wants a word, prepare, then depart.'),
    end('town'),
  ],

  // ════════════════════════════════════════════════════════════ CALDERA
  volcano_enter: [
    bg('volcano'),
    card('Chapter Two', 'The Caldera'),
    n('The Caldera. The air shimmers like it is trying to remember a word.'),
    n('Scraps of paper ride the heat up from the slag — curled, blackened, their edges still glowing. One lands on Alice’s sleeve and crumbles before she can read it.'),
    mi('It’s SO hot. Why is hell hot? That’s so on the nose.'),
    v('Stay away from the edge, Mitzi.'),
    mi('I’m nowhere NEAR the edge. The edge is near ME.'),
    a('Mitzi. Today, I need you to swing that hammer.'),
    n('Victoria unstraps the hammer from her own back — she has been carrying it all this time — and holds it out, handle first, as if it might bite.'),
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
    n('Mitzi takes the hammer. It is heavier than she expected. She doesn’t give it back.'),
    sys('Mitzi will fight now. How you speak to her in the Caldera will raise or lower her strength — and whatever it is when you leave, it stays.'),
    end('trail'),
  ],

  volcano_paper: [
    bg('volcano'),
    n('A gust from a vent sends a flurry of half-burnt paper across the path. Mitzi snatches one out of the air before it can crumble.'),
    mi('There’s writing! Tiny writing. “I never told her I was proud of her.”'),
    mi('Who’s her? Who wrote this?'),
    when(
      heard('talk_smith_caldera'),
      [a('Someone from the Old Faith. They wrote their confessions down every hour and burned them here. Horace told me.')],
      [v('The old church burned things here. Confessions. Before the Ox.')],
    ),
    mi('That’s so sad. It’s only one line. Like they only had room for one line.'),
    v('Put it down, Mitzi. It isn’t ours.'),
    mi('…“I never told her I was proud of her.”'),
    n('Mitzi reads it again. Then she looks at her sister for slightly too long.'),
    choice([
      opt('“Is there anything you’ve never told Victoria?”', {
        then: [
          mi('Loads. I tell her I’m fine, mostly. I tell her I’m bored. I tell her she’s fussing.'),
          mi('I don’t tell her the other stuff. The stuff that isn’t a joke.', 'sad'),
          v('What stuff?'),
          mi('Nothing! Nothing. Look, a rock shaped like a frog.', 'happy'),
        ],
      }),
      opt('“Let it go, Mitzi. It belongs to someone else.”', {
        then: [n('Mitzi opens her fingers. The slip lifts away on the heat, spins once, and is gone.'), mi('Bye, sad paper. I hope she knew anyway.')],
      }),
    ]),
    end('trail'),
  ],

  volcano_a: [
    bg('volcano'),
    n('Mitzi stands over a cooling carcass, hammer in both hands, breathing hard. There is soot on her nose, and an expression on her face nobody has seen there before.'),
    mi('Sparks in my hair! Is it a look? It’s a look.', 'happy'),
    mi('I hit it. I actually hit it. It went CRUNCH. Was it supposed to go crunch?'),
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
    n('They rest on a ledge of black glass. Mitzi’s palms are red and raw where the hammer’s handle has rubbed them.'),
    v('Her hands are blistering. Mitzi, give me the hammer.'),
    mi('But I was just getting good at—'),
    v('You were getting good at hurting yourself. I’ve watched you do it for an hour.'),
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
    v('You didn’t even hesitate.'),
    a('I’ve been growing it since I was twelve. I always meant to cut it. I just never got round to it.'),
    a('Lighter. That’s one way to be lighter.'),
    when(heard('talk_smith_caldera'), [n('Fire likes long hair, Horace said. Alice feels he could have been more specific.')]),
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
      [
        mi('I HIT IT. Did you SEE me? Vicky, did you see?', 'happy'),
        v('…I saw.'),
        n('Victoria looks at her sister’s raw red palms and, for once, says nothing about them at all.'),
      ],
      [
        when(
          (s) => s.flags.mitziAtk >= 5,
          [mi('I helped! I think I helped. Did I help?'), v('You helped.')],
          [mi('I… mostly held the snacks.', 'sad'), v('That’s all right. Stay behind me next time.')],
        ),
      ],
    ),
    n('On the way out, the last of the burnt slips drift past them, rising and rising toward the stone sky.'),
    mi('Where do they GO?'),
    a('Up, I think.'),
    run((s) => {
      s.flags.mitziLocked = true;
      s.pendingRest = 'night_volcano';
    }),
    sys((s) => `Mitzi’s strength is settled at ${s.flags.mitziAtk}.`),
    objective('Back in Gehenna. See who wants a word, then rest at the Inn.'),
    end('return'),
  ],

  night_volcano: [
    bg('pub'),
    music('pub'),
    n('Mitzi throws a gathering at the Pub. She invites everyone. Most of everyone comes.'),
    mi('Welcome, welcome! Snacks are on Vicky! Drinks are on Vicky!', 'happy'),
    v('…Drinks are on Vicky.'),
    n('Bede stands at the edge of it, not drinking the milk-punch. A ghoul in a bowler hat brings a cake that is mostly candle. Even Horace looks in at the door, says “Ten past”, and leaves.'),
    n('Mitzi is wonderful at listening. A ghoul tells her his troubles; she nods and gives him good advice. Then she drifts to the next table and forgets him entirely.'),
    choice([
      opt('“You’re good with people, Mitzi.”', {
        then: [mi('I know! Everyone likes me when there are snacks.', 'happy'), mi('…They like me when there are snacks, right? Not just the snacks?')],
      }),
      opt('“Who’s paying for all this?”', {
        then: [mi('Vicky! She doesn’t mind. …She doesn’t mind, right?'), n('Across the room, Victoria counts her coins twice.')],
      }),
    ]),
    n('Much later — if there were hours, it would be very late — the Pub is empty but for the three of them, and Victoria is asleep at the table with her face on her arm.'),
    n('Mitzi stands over her sister for a long moment.'),
    mi('She always does this. And I always just… go up to bed. And in the morning she’s fine.'),
    choice([
      opt('“What if, tonight, you didn’t go up to bed?”', {
        fx: flag('mitziCoat'),
        then: [
          n('Mitzi hesitates. Then she takes off her fur coat and lays it over her sister’s shoulders — clumsily, one sleeve trailing in a puddle of milk-punch.'),
          mi('It’s a terrible job. Don’t look.'),
          a('It’s a perfect job.'),
          n('Victoria doesn’t wake. But in her sleep her hand finds the edge of the coat, and holds on.'),
        ],
      }),
      opt('Say nothing. Help Mitzi up the stairs.', {
        then: [
          n('Mitzi yawns, and lets Alice steer her toward the stairs, and doesn’t look back.'),
          n('In the empty Pub, Victoria sleeps on. Nobody puts a coat over her. Nobody ever has.'),
        ],
      }),
    ]),
    goto('morning_road'),
  ],

  morning_road: [
    bg('town'),
    music('town'),
    n('Morning. The bells ring for mass. The three of them do not go.'),
    when(
      (s) => s.flags.mitziCoat,
      [
        v('Somebody put a coat on me last night.'),
        mi('Weird. Ghosts, probably.'),
        v('It smelled like you.'),
        mi('Smelly ghosts.', 'happy'),
        n('Victoria hands the coat back. She doesn’t say thank you. She doesn’t have to.'),
      ],
      [v('My neck’s killing me. Somebody could’ve woken me.'), mi('You looked comfy!')],
    ),
    v('I had a dream. A narrow place between two walls. Wet bricks. It goes on and on, and at the end of it somebody is laughing.'),
    v('I’ve had it every night for years. I never used to remember it in the morning.'),
    mi('Maybe it’s the Fort! The Fort’s all narrow places. Bede says the corridors go on for days.'),
    c('Morning, corpses.'),
    n('Charon is leaning in the Clinic doorway with a cup of something that is definitely not milk.'),
    c('You’ll want the Fort next, if you’re still set on going anywhere.'),
    a('Why the Fort?'),
    c('It sits across the only road to the Ruins, and the Ruins are where the clock-keepers wrote everything down. If anybody ever drew a map of the way up, it’s there.'),
    a('Up. Or back?'),
    c('You keep saying “back” like it’s a place. It’s a direction, dear, and it’s closed.'),
    c('The Fort gate’s been shut for years. Nobody attacked it. Nobody needed to. It’s been keeping people in.'),
    v('…The Fort.'),
    n('Victoria says it the way you say the name of a street you used to live on.'),
    run((s) => {
      s.chapter = 3;
      s.unlocked.fort = true;
    }),
    objective('The Abandoned Fort stands across the road to the Ruins. See who wants a word, then go.'),
    end('town'),
  ],

  // ════════════════════════════════════════════════════════════ ABANDONED FORT
  fort_enter: [
    bg('fort'),
    card('Chapter Three', 'The Abandoned Fort'),
    n('The Abandoned Fort. Gates sagging, banners rotted to lace. It smells of iron and old decisions.'),
    n('Victoria stops beneath the gatehouse arch and lays her hand flat against the stone, the way you would touch a horse to let it know you are there.'),
    a('Victoria?'),
    v('It’s nothing. It’s cold, that’s all.'),
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
    n('A blade swings at Mitzi. Victoria is there before it lands — spear up, shoulder down — and takes the edge of it across her own arm.'),
    v('Did you see that? It nearly took her arm. I had to.'),
    mi('It was going to miss! Probably!'),
    mi('And now YOU’RE bleeding, which is worse, because you won’t let anyone look at it.'),
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

  fort_roster: [
    bg('fort'),
    n('The page from under the crates is the garrison’s duty roster. Forty names, every one crossed out in the same neat hand: “gone to mass”.'),
    when(
      heard('talk_pub_brother'),
      [
        n('Near the top, pressed so hard the pen went through the paper: W. CARTER.'),
        choice([
          opt('“Hello, Wat. Bede says hello.”', {
            fx: flag('watHello'),
            then: [
              n('Alice says it out loud, feeling foolish. The Fort says nothing back. But it is a very particular kind of nothing: the kind that is listening.'),
              mi('Who’s Wat?'),
              a('Somebody’s brother.'),
              mi('Oh.'),
              n('Mitzi looks at Victoria, and back at the list, and is quiet for a long while.'),
            ],
          }),
          opt('Fold the roster away.', {
            then: [n('Alice folds the roster and puts it in her pocket. Some names you carry quietly.')],
          }),
        ]),
      ],
      [mi('Gone to mass. Gone to mass. Gone to mass. They ALL went.'), v('People get tired of standing guard.')],
    ),
    n('At the bottom, in a different hand: “If you are reading this, the gate held. It always holds. There is nothing left out there to keep out — only us, to keep in.”'),
    v('Only us, to keep in.'),
    v('…I don’t like this place. It feels like it knows me.'),
    end('trail'),
  ],

  fort_b: [
    bg('fort'),
    n('A corridor between two walls. Too narrow. Wet stone. Victoria stops walking.'),
    v('…I know this place.'),
    a('You’ve been here before?'),
    mi('Vicky? You’ve gone a funny colour.'),
    cg('alley'),
    v('Not here. An alley. Wet bricks. Somebody laughing. Mitzi asleep against my shoulder, because we had nowhere—', 'sad'),
    n('Rain that isn’t falling. A streetlamp that isn’t there. Two shapes at the mouth of the alley, hoods up.'),
    v('We’d lost the room. I couldn’t make the rent. I told her it was an adventure, sleeping out. She believed me. She always believes me.', 'sad'),
    v('That isn’t right. We grew up here. In Gehenna. We grew up HERE.', 'angry'),
    cg(null),
    mi('Vicky… what’s rent?'),
    n('Nobody answers her.'),
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
    n('Near the inner gate, Victoria’s hands begin to shake. She tucks them into her sleeves. It doesn’t help.'),
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
    n('Inside the helm there is nothing. Inside the breastplate, nothing. Pinned inside the gauntlet, a scrap of paper: “Keep them in.”'),
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
        mi('Can I hold your hand on the way out? Not because I’m scared. Because you are.'),
        v('…Yes.'),
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
    n('Behind them, the Fort’s far gate swings open onto the road to the Ruins. Nothing comes through it. Nothing has, for years.'),
    run((s) => {
      s.pendingRest = 'night_fort';
    }),
    objective('Back in Gehenna. The road to the Ruins is open. See who wants a word, then rest at the Inn.'),
    end('return'),
  ],

  night_fort: [
    bg('church'),
    music('hestia'),
    n('Late. The horned church is empty but for one figure in the front pew, a candle she hasn’t lit, and a bottle she hasn’t opened.'),
    h('Victoria. Dear heart. You look as if you’ve seen a ghost.', 'happy'),
    v('I remembered something, Sister. Something that isn’t right.'),
    h('Shh. Shh. Memories are such heavy things. And you carry so much already.'),
    h('Come to mass tomorrow. Just once. Let the Ox take it, and you’ll never have to think about the alley again.'),
    v('…How do you know it was an alley?'),
    n('For the smallest moment, Hestia’s smile does not move at all.'),
    h('You told me, darling. Just now. Don’t you remember?', 'happy'),
    n('Victoria doesn’t remember. She stands, leaves the bottle on the pew, and walks out into the dark without looking back.'),
    cg('hestia'),
    n('Beneath the horned church, where the candles are made of something that isn’t wax…'),
    h('Three new lambs. The sisters cling to each other like drowning swimmers. They’ll kneel by spring.', 'angry'),
    h('The red one is cracking. Good. Cracked things pour so easily.', 'angry'),
    h('But the surface girl. She still looks UP.', 'angry'),
    h('Nobody who falls here deserves the sky. They had their chance. They spent it.', 'angry'),
    n('Her eyes burn red. On the wall behind her, her shadow wears horns.'),
    n('At the sound of a footstep, the eyes cool to blue again.'),
    cg(null),
    goto('morning_guide'),
  ],

  morning_guide: [
    bg('town'),
    music('town'),
    n('Morning. Victoria is sitting on the Inn steps when Alice comes down, very straight, with her hands in her lap. There is no flask in them.'),
    v('I didn’t drink it. Her bottle. I left it in the church.'),
    v('I thought I’d feel better. I just feel thirsty.'),
    choice([
      opt('“That’s what better feels like, at first.”', {
        then: [v('Then better’s overrated.'), n('She doesn’t get up to go and fetch the bottle, though. She stays exactly where she is.')],
      }),
      opt('Sit down beside her. Say nothing.', {
        then: [n('Alice sits. The step is cold. They watch the flock file past toward the bells, and neither of them goes.')],
      }),
    ]),
    h('Children! I hear you’re bound for the Ruins.', 'happy'),
    n('Hestia comes down the lantern street with her hands folded, as though she has been walking toward them all night.'),
    h('Let me guide you. The Ruins punish the proud — and I know every stone.', 'happy'),
    mi('Every stone? That’s a LOT of stones. How long have you—'),
    h('Long enough, sweetheart.', 'happy'),
    h('I’ll meet you at the Fort’s far gate. Don’t keep the Ox waiting.'),
    n('She goes. Charon, in the Clinic doorway, watches her all the way to the end of the street.'),
    c('A word, Alice.'),
    c('She knows exactly what that place is. Ask her better questions.'),
    c('And don’t walk into any room she won’t walk into first.'),
    run((s) => {
      s.chapter = 4;
      s.unlocked.ruins = true;
    }),
    objective('Hestia will guide you through the Ruins. See who wants a word first.'),
    end('town'),
  ],

  // ════════════════════════════════════════════════════════════ RUINS
  ruins_enter: [
    bg('ruins'),
    card('Chapter Four', 'The Ruins'),
    n('Beyond the Fort the road climbs for a long time. Then the stone sky dips down to meet it, and there, half-buried in its own rubble, is the cathedral of the Old Faith.'),
    n('Every surface is carved with clock faces. Every clock face has had its hands snapped off.'),
    h('The Ruins of the Old Faith. Before the Ox, they worshipped the clock. Imagine — counting your sins by the minute.'),
    run((s) => {
      if (!s.roster.includes('hestia')) s.roster.push('hestia');
      s.flags.hestiaObey = 1;
      s.heroes.hestia.hp = s.heroes.hestia.maxHp;
    }),
    sys('Hestia joins the party. Her strength is her own business — and she listens to orders less and less.'),
    mi('(whispering) Alice. Who snapped all the hands off?'),
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

  ruins_bell: [
    bg('ruins'),
    n('The path runs through the foot of a tower. High above, in the dark, something huge and bronze hangs very still. A rope hangs down from it, grey with dust, close enough to touch.'),
    h('Mind the rope, dears. It’s rotten. The whole tower could come down.'),
    n('The rope does not look rotten. It looks as if it has been waiting.'),
    when(heard('talk_smith_ruins'), [a('(Ring it once, Horace said. For me. Don’t ask her permission.)')]),
    choice([
      opt('Ring the bell.', {
        score: 'ruins',
        good: true,
        fx: flag('rangBell'),
        then: [
          n('Alice takes the rope in both hands, and pulls.'),
          fx('shake'),
          n('BONG. The sound goes down through the stone like a key turning in a lock. Dust pours from every arch. Far below, in Gehenna, a church full of people opens its eyes at once.'),
          h('…', 'angry'),
          n('Hestia’s eyes are red. Just for a moment. Just long enough.'),
          h('How bold. The keepers would have been so proud.', 'happy'),
          mi('That was AMAZING. Do it again!'),
          v('Don’t do it again.'),
        ],
      }),
      opt('Leave it. Hestia knows these ruins.', {
        score: 'ruins',
        good: false,
        then: [h('Wise girl. Some things are better left quiet.', 'happy'), n('They walk on. Behind them the rope sways a little, though there is no wind.')],
      }),
    ]),
    end('trail'),
  ],

  ruins_a: [
    bg('ruins'),
    n('Hestia walks ahead now, humming. Now and then she lays her hand on a carved clock face as she passes, and the stone under her fingers goes smooth.'),
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
    n('A chapel of confession booths, dozens of them side by side, like stalls in a stable. A small brass clock hangs above each door. Each one stopped at a different time.'),
    mi('Did they really confess every hour? Every single one?'),
    h('Every single one. Can you imagine anything so tiring?', 'happy'),
    v('…Yes.'),
    n('Alice remembers Charon in the Clinic doorway: “She knows exactly what that place is. Ask her better questions.”'),
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
    n('A door of white stone, carved with a single clock face — the only one in the whole cathedral that still has both its hands.'),
    when(
      heard('talk_church_back'),
      [
        h('There it is. The keepers’ door. The one that runs backwards.', 'happy'),
        h('Home is through there, Alice. Your room. Your kettle. The morning before. It only opens for one — you must look alone.'),
      ],
      [h('That chamber! Sacred relics. You should look alone, Alice. The Ox favours the curious.')],
    ),
    mi('Alice, don’t. It’s a door with a CLOCK on it. In HERE. That’s basically a sign that says “trap”.'),
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
    v('…Good. That’s good, Mitzi. That’s better than I’d have done it.'),
    h('Oh, how dreadful. The relics must have been… cross with you.', 'happy'),
    n('Hestia’s face is pity. Or rehearsal.'),
    n('Behind the white door there is no room at all. Only a wall, and a saint’s carved mouth full of empty needle-holes.'),
    a('There was never a door.'),
    h('Wasn’t there? How strange. I was so sure.', 'happy'),
    a('I can still see. One eye is plenty. The watch does the rest.'),
    n('Something heavy turns in the dark at the end of the hall. A saint-shaped box of needles, still praying.'),
    end('trail'),
  ],

  ruins_clear: [
    bg('ruins'),
    n('The Reliquary’s doors fall open. Inside: nothing. It was always nothing.'),
    h('You survived. How… wonderful.', 'happy'),
    h('Come to the Manor tomorrow night. We will hold a communion in your honour. Rest well, lambs.'),
    n('She walks away down the hill toward Gehenna, humming. She doesn’t look back. She doesn’t need to.'),
    mi('Is she allowed to just LEAVE? In the middle of the ruins?'),
    v('Let her go. I’d rather have her where I can see her. But I’d rather have her gone than behind me.'),
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
    a('A communion. In my honour.'),
    v('At the Manor. At the top of the Milk Road.'),
    mi('Where all the milk goes.'),
    n('Nobody says what all three of them are thinking.'),
    objective('Back in Gehenna. See who wants a word. Then rest at the Inn: it is the last night.'),
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
    v('First the face goes. Then the name. The eyes go last.'),
    mi('The triangle one with the green eyes used to sell buttons. I’m like seventy percent sure.'),
    a('Then the things we’ve been fighting were people?'),
    v('Were. Aren’t. Don’t think about it too hard. That’s how you end up out here.'),
    choice([
      opt('“Why did they leave mass?”', {
        then: [
          v('Some got bored. Some got scared. Some just… stopped going anywhere in particular.'),
          v('Mass empties you out slowly. The woods do it fast. Either way you end up nobody.'),
          a('And you two? You don’t go to mass.'),
          v('Mitzi went once. Slept three days. I didn’t like how she looked when she woke up.'),
          v('Peaceful. Like there was nobody in there to be bothered.'),
        ],
      }),
      opt('“Does it frighten you, living so close to them?”', {
        then: [v('Only one thing frightens me, and she’s sitting right there eating my bread.'), mi('It’s OUR bread.', 'happy'), v('It’s my bread that I share with you.')],
      }),
    ]),
    n('Victoria tips something from a flask into her tea when she thinks nobody is looking. Mitzi is looking. Mitzi says nothing.'),
    n('Later, when the others are asleep, Alice hears Victoria murmuring to the fire. It sounds like a story. It sounds like it is meant for a child.'),
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
    v('When was this?'),
    mi('Ages ago. You were asleep on the table with your face on your arm, and I didn’t want to wake you because you’d be cross.'),
    n('Victoria says nothing. She knows which kind of asleep that was.'),
    n('Mitzi turns her hammer over in her hands, testing the weight like she has never held anything heavy before. Maybe she hasn’t.'),
    choice([
      opt('“How does it feel? Holding it?”', {
        then: [
          mi('Heavy. Good heavy. Like when you pick up a sleepy cat and it’s heavier than a cat should be, but it’s YOUR cat.'),
          mi('Is that weird? That’s weird.'),
          a('It isn’t weird at all.'),
        ],
      }),
      opt('“Victoria, how long have you carried that hammer for her?”', {
        then: [
          v('Since we came down. I don’t remember where it came from. It was just there, and she was too small to carry it, so I did.'),
          mi('I’m not small now.'),
          v('…No. You’re not.'),
        ],
      }),
    ]),
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
    n('On a shelf above the officers’ bunks, a single book lies on its side, swollen with damp. Victoria picks it up. Puts it down. Picks it up again.'),
    choice([
      opt('“Take it. Nobody here is going to finish it.”', {
        fx: flag('victoriaBook'),
        then: [
          v('I never finish them.'),
          a('Then this can be the first.'),
          n('Victoria slides the book into her coat, next to the flask. It is the first thing Alice has ever seen her take for herself.'),
        ],
      }),
      opt('“What is it?”', {
        fx: flag('victoriaBook'),
        then: [
          v('Some soldier’s adventure. Pirates, I think. Somebody turned down the corner of page forty and never came back.'),
          v('…I’ll just see how it ends.'),
          n('She reads by the fire until Mitzi falls asleep. Then she keeps on reading. For once, the flask stays in her coat.'),
        ],
      }),
    ]),
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
    when(heard('talk_smith_ruins'), [
      a('Horace didn’t.'),
      h('Horace.', 'angry'),
      h('Horace is an old man who forgot to go to bed. He’ll come around too. They always do.', 'happy'),
    ]),
    n('When Hestia lies down — if she sleeps at all — she lies facing the dark corners.'),
    mi('(whispering) Alice. Her shadow has horns.'),
    a('(whispering) It’s the rubble.'),
    mi('(whispering) …Right. Rubble.'),
    when(
      (s) => s.flags.victoriaBook,
      [n('Later, Alice wakes to find Victoria sitting up by the embers, the soldier’s book open on her knee, reading by the faint glow of the watch.')],
      [n('Later, Alice wakes to find Victoria sitting up by the embers, spear across her knees, watching the corner where Hestia sleeps.')],
    ),
    v('(quietly) Can’t sleep. Not with her here.'),
    choice([
      opt('“Then keep watch with me.”', {
        then: [
          n('They sit together until the false dawn, listening to the watch tick.'),
          when(
            (s) => s.flags.victoriaBook,
            [v('(quietly) The pirate dies. Page eighty. I thought he’d be the hero.'), a('(quietly) Maybe the book isn’t about him.'), v('(quietly) …Maybe not.')],
            [v('(quietly) You’re a strange one, surface girl.'), a('(quietly) So I’m told.')],
          ),
        ],
      }),
      opt('“Sleep, Victoria. I’ll watch her.”', {
        then: [
          v('(quietly) …All right. Wake me if she moves.'),
          n('Victoria lies down. For the first time Alice can remember, she falls asleep before her sister does.'),
        ],
      }),
    ]),
    run((s) => unlockLore(s, 'old_faith')),
    end('trail'),
  ],

  // ════════════════════════════════════════════════════════════ LAST NIGHT
  last_night: [
    bg('inn_night'),
    music('night'),
    card('Chapter Five', 'The Last Night'),
    n('The last night. The candles lean toward the door as if they want to leave too.'),
    n('The Inn is nearly empty. The whole town has gone to bed early, to be fresh for the communion.'),
    mi('Is it weird that I’m not scared? I should be scared. I’m going to be scared in the morning. I can feel it coming, like a sneeze.'),
    v('Eat something, Mitzi.'),
    mi('YOU eat something.'),
    v('…All right.'),
    n('Victoria eats something. Mitzi stares at her as if she has grown a second head.'),
    n('Alice turns the watch over in her hand. It is ticking faster than it used to. Not hurried. Purposeful. Like footsteps on the last stretch of a long road.'),
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
    n('Mitzi is sitting halfway up the stairs, hugging her knees, her notebook open on her lap.'),
    mi('You’re staring. Is there ash on me? There’s always ash on me.'),
    when((s) => s.notebook.unlocked, [mi('I’ve been reading my notes. Pages and pages of creatures. All in MY handwriting. I didn’t even know I had a handwriting.')]),
    when((s) => s.flags.mitziTea, [
      mi('Also I tried to make the tea. It went everywhere. Vicky got up to clean it and I said NO, and I cleaned it up myself. Badly.'),
      mi('She drank it anyway. It was horrible. She drank all of it.', 'happy'),
    ]),
    mi('…I heard Vicky crying last night. I pretended to be asleep. I’m really good at pretending to be asleep.', 'sad'),
    mi('I think maybe I’ve been pretending to be asleep for a really long time. About lots of things.'),
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
    v('Thursdays were Mum’s day off. Pancakes, and the radio on. Mitzi was too small to remember. But she still asks for Thursdays.', 'sad'),
    when((s) => s.flags.showedDrawing, [
      v('I scribbled out the sun on her drawing. Did you know that? She kept asking where the big yellow lamp had gone.', 'sad'),
      v('It was easier if it was a lantern. We had lanterns.'),
    ]),
    choice([
      opt('“Then stop raising her. Start knowing her. And live one hour for yourself.”', {
        note: 'Victoria sets down the glass.',
        tone: 'good',
        fx: (s) => {
          s.flags.victoriaRedeemed = true;
          s.flags.victoriaMode = 'assist';
        },
        then: [
          v('One hour.'),
          v('I wouldn’t know what to do with it.'),
          a((s) => (s.flags.victoriaBook ? 'Finish the book.' : 'Finish a book.')),
          n('Victoria laughs. It cracks in the middle, but it is real.'),
        ],
      }),
      opt('“It wasn’t your fault.”', {
        note: 'Something in Victoria finally lets go.',
        tone: 'good',
        fx: (s) => {
          s.flags.victoriaRedeemed = true;
          s.flags.victoriaMode = 'assist';
        },
        then: [v('…Say it again.'), a('It wasn’t your fault.'), n('Victoria turns the glass upside down on the table, and leaves it there.')],
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
    n('The Clinic is dark but for one lamp. On the counter in front of Charon sits a small jar with a single coin in it, and a label with no year.'),
    c('Tomorrow you meet the White Ox. Hestia’s real face.'),
    c('She thinks anyone who lands down here lost their shot at the sky. She feeds on the ones who agree with her.'),
    c('She wants it all to stay just like this, forever. A whole town of people who stopped, sitting very still, being milked.'),
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
    c('Your coin’s still here, by the way. Still no year on it.'),
    c('Come and get it when you’re leaving. Really leaving. You’ll know.'),
    goto('manor'),
  ],

  night_hestia: [
    run((s) => (s.flags.nightTalk = 'hestia')),
    bg('church'),
    n('The church at midnight. Hestia sits alone in the front pew, as if she has been expecting company.'),
    h('Come to see me, lamb? On the last night. How sweet.', 'happy'),
    h('Do you know how many like you I’ve seen? Ticking. Looking up. So sure there was somewhere better to be.'),
    h('Every one of them sat down, in the end. Every one of them was grateful.'),
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
    card('Finale', 'The Manor'),
    run((s) => {
      s.chapter = 5;
      s.supplies = 100;
    }),
    n('The Milk Road climbs out of Gehenna in long, patient switchbacks. Years of carts have worn two grooves into it, deep as graves.'),
    n('All the way up behind them, the flock walks in its best clothes, singing softly, to the communion.'),
    n('The Manor breathes incense and animal heat. White drapes. White candles. A white altar with nothing on it.'),
    n('Behind the altar, a great white basin. Every crate of milk that ever went up the road has been poured into it. It has never once overflowed.'),
    h('Welcome, lambs. To your final communion.', 'happy'),
    h('Do you know what you are? Failures. Every soul down here had a life above, and wasted it.'),
    h('A sister who never let go. A sister who never had to. Two coins in one jar, rattling.'),
    h('And you, little clockwork thing, with your drawer of broken things you never mended. Do you think the sky wants you?'),
    h('The sky is for the deserving. You are not. So stay. Kneel. Be emptied, gently, week by week.'),
    a('No.'),
    mi('Also no!'),
    v('…No.'),
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
    n('At the back of the hall, the flock has stopped singing. One by one, people are looking up.'),
    h('You — little clockwork thing. You don’t deserve the sky. You already failed up there.', 'angry'),
    h('Every one of them failed. Why should any of them get to try again?', 'angry'),
    mi('Because trying is the whole point?'),
    v('Because some of us never got to finish.'),
    n('In Alice’s hand, the watch is ticking — loud and steady, faster than it has ever ticked. It sounds as if it is nearly done.'),
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

  ...TALK_SCENES,
};

/** Every scene id that the script or data references, for tests. */
export const SCENE_IDS = Object.keys(SCENES);
void cast;
