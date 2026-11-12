import { n, say, bg, music, run, when, choice, opt, end } from '../game/story.js';
import { unlockLore } from './lore.js';

/**
 * Town conversations. Between expeditions, people in Gehenna have something to say:
 * a "…" hangs over their door, and stepping inside plays the conversation first.
 * They are optional, they never change the rules or the ending, and each one is
 * only available in its own interlude, so the town moves on as the story does.
 *
 * Interludes, numbered in story order:
 *   1 before the Dead Woods · 2 the evening after them
 *   3 before the Caldera    · 4 the evening after it
 *   5 before the Fort       · 6 the evening after it
 *   7 before the Ruins      · 8 the evening after them (the last night follows)
 */

const a = (t, m) => say('alice', t, m);
const mi = (t, m) => say('mitzi', t, m);
const v = (t, m) => say('victoria', t, m);
const h = (t, m) => say('hestia', t, m);
const c = (t, m) => say('charon', t, m);
const hor = (t) => say('smith', t);
const bede = (t) => say('carter', t);
const flock = (t) => say('flock', t);
const lore = (id) => run((s) => unlockLore(s, id));
const heard = (id) => (s) => !!s.talks?.includes(id);
const flag = (k, val = true) => (s) => (s.flags[k] = val);

const DUNGEON_ORDER = ['woods', 'volcano', 'fort', 'ruins'];

/** Which interlude the town is in (0 when no conversations are due). */
export function interlude(s) {
  if (s.expedition || s.chapter < 1 || s.chapter > 4) return 0;
  const d = DUNGEON_ORDER[s.chapter - 1];
  return (s.chapter - 1) * 2 + (s.cleared[d] ? 2 : 1);
}

/** Who is waiting where. `who` is shown on the building's tag. */
export const TALKS = [
  { id: 'talk_smith_watch', window: 1, place: 'smithy', who: 'Horace stopped hammering' },
  { id: 'talk_clinic_jars', window: 1, place: 'clinic', who: 'Charon has something to show you' },
  { id: 'talk_pub_carter', window: 1, place: 'pub', who: 'A carter is watching your watch' },
  { id: 'talk_pub_drawing', window: 2, place: 'pub', who: 'The sisters have a corner table' },
  { id: 'talk_clinic_woods', window: 2, place: 'clinic', who: 'Charon wants a look at you' },
  { id: 'talk_church_mass', window: 3, place: 'church', who: 'Mass is in session' },
  { id: 'talk_smith_caldera', window: 3, place: 'smithy', who: 'Horace knows the Caldera' },
  { id: 'talk_clinic_hair', window: 4, place: 'clinic', who: 'Charon has seen your hair' },
  { id: 'talk_smith_fort', window: 5, place: 'smithy', who: 'Horace heard where you’re bound' },
  { id: 'talk_pub_brother', window: 5, place: 'pub', who: 'Bede wants a word about the Fort' },
  { id: 'talk_clinic_coins', window: 6, place: 'clinic', who: 'Charon is up late' },
  { id: 'talk_pub_mitzi', window: 6, place: 'pub', who: 'Mitzi is sitting alone' },
  { id: 'talk_smith_ruins', window: 7, place: 'smithy', who: 'Horace has a favour to ask' },
  { id: 'talk_church_back', window: 7, place: 'church', who: 'Hestia is hoping you’ll come' },
  { id: 'talk_smith_bell', window: 8, place: 'smithy', who: 'Horace is in his doorway' },
  { id: 'talk_church_empty', window: 8, place: 'church', who: 'The flock is waiting' },
  { id: 'talk_pub_bede', window: 8, place: 'pub', who: 'Bede is buying', when: heard('talk_pub_brother') },
];

/** Conversations waiting in town right now. */
export function pendingTalks(s) {
  const w = interlude(s);
  if (!w) return [];
  const seen = s.talks || [];
  return TALKS.filter((t) => t.window === w && !seen.includes(t.id) && (!t.when || t.when(s)));
}

export function talkAt(s, place) {
  return pendingTalks(s).find((t) => t.place === place) || null;
}

export function markTalk(s, id) {
  s.talks ||= [];
  if (!s.talks.includes(id)) s.talks.push(id);
}

export const TALK_SCENES = {
  // ════════════════════════════════════════════ 1 · Before the Dead Woods
  talk_smith_watch: [
    bg('smithy'),
    music('town'),
    n('The Smithy is hot and close and full of clocks. Every inch of wall is hung with clock faces — brass, enamel, painted wood — and not one of them has hands.'),
    n('The smith is old, and broad as a door, and does not look up from the anvil. His eyes are already open as wide as eyes can go.'),
    hor('Twenty past.'),
    a('Twenty past what?'),
    hor('Couldn’t tell you. Habit.'),
    hor('Horace. I mend what the road breaks. Put it on the bench.'),
    n('Alice sets the watch down. Horace stops hammering. In the sudden quiet, the watch ticks very loudly.'),
    hor('…Where did you get this?'),
    a('A drawer. Above. I don’t remember putting it there.'),
    n('He turns it over with two fingers, the way you would turn over a sleeping bird. Up close, Alice sees that his unblinking eyes are wet.'),
    hor('Keeper’s work. See the escapement? Nobody’s cut one like that since the Ox came.'),
    hor('The clock-keepers made a watch for every soul who came down with business unfinished. Wind it, and it counts what you’ve got left to do.'),
    a('Then who made this one?'),
    hor('Not me. I only ever made the cases. The winding’s done from the other end.'),
    a('The other end of what?'),
    n('Horace points one thick finger straight up, at the stone.'),
    choice([
      opt('“You were a clock-keeper.”', {
        then: [
          hor('Was. Am. You don’t stop being a thing because nobody rings the bell any more.'),
          hor('Keepers swore never to close their eyes on an hour. Most of them broke it. I didn’t.'),
          hor('Forty years, give or take. You get used to it. You get used to anything down here. That’s the trouble with the place.'),
        ],
      }),
      opt('“Can you make it see further?”', {
        then: [
          hor('Bring me scrap from the road and coin for my trouble, and I’ll teach it to look harder.'),
          hor('Reforge it enough and it’ll grow a second hand. Two hands, two glimpses. That’s how the keepers made them.'),
        ],
      }),
    ]),
    hor('One more thing. Don’t take it to mass.'),
    a('Why not?'),
    hor('Because they’ll ask you to stop it. Everyone in there has stopped theirs.'),
    n('He hands the watch back. It is warmer than when she put it down.'),
    lore('horace'),
    end('town:smithy'),
  ],

  talk_clinic_jars: [
    bg('clinic'),
    music('town'),
    n('Charon’s Clinic smells of carbolic and old pennies. Bottles line one wall. Jars line the other three.'),
    n('The jars are full of coins. Each one has a paper label in tidy brown ink: a year, and a list of names too long to read.'),
    c('Don’t touch the jars. They’re sorted.'),
    a('By what?'),
    c('Year of death. Everyone who comes down brings one coin. Their fare. Most of them drop it on the first day and never think about it again.'),
    c('I pick them up. Somebody should keep count of who came through, and who’s still waiting to go.'),
    a('Go where?'),
    c('Up, dear. Keep up.'),
    n('She lifts a small jar down from the highest shelf. It holds a single coin. The label says ALICE, and nothing else. No year at all.'),
    a('That’s the one I “dropped”.'),
    c('Mm. Funny thing. Every jar in here has a year on it. Yours wouldn’t take one. I wrote it three times. The ink slid right off.'),
    choice([
      opt('“What does that mean?”', {
        then: [c('Means you’re late, or you’re not finished. Possibly both.'), c('I’ve been doing this a very long time. I’ve never had a jar argue with me before.')],
      }),
      opt('“Could I have it back?”', {
        then: [c('Not yet. Fares are paid on the way out, not the way in.'), c('Ask me again when you’re leaving. I’ll know if you mean it.')],
      }),
      opt('“You’re enjoying this.”', {
        then: [c('Enormously. Nothing happens here, dear. Nothing has happened here for years. Then you happened.')],
      }),
    ]),
    c('Go on. The woods won’t clear themselves. And Alice—'),
    c('If anybody in a white collar is very, very kind to you, count your fingers afterwards.'),
    end('town:clinic'),
  ],

  talk_pub_carter: [
    bg('pub'),
    music('pub'),
    n('The Pub is low and brown and warm. Nobody is drinking milk.'),
    n('A carter in a milk-white apron sits alone at the end of the bar, one leg stuck out stiff in front of him. He watches Alice’s watch the way a dog watches a door.'),
    bede('You’re the one that came down ticking.'),
    a('Is that what people are saying?'),
    bede('People don’t say much, here. But I heard it on the cobbles this morning. Haven’t heard ticking in a long while.'),
    bede('Bede. I run milk. Up the long road every morning, back down every night.'),
    a('Where does the milk come from?'),
    bede('Church’s back hatch, straight after mass. Crates are full when I get there. Warm, too. Every day.'),
    bede('I don’t go in. Never been asked. Never asked to be.'),
    a('And where does it go?'),
    bede('Up the Milk Road. I leave it at the Manor’s back gate. Somebody takes it in. Crates come back down empty, washed and stacked.'),
    bede('Thirty years on that road. Never once seen who takes it.'),
    choice([
      opt('“Do you drink it?”', {
        then: [bede('Never touched a drop. Makes you sleepy. Makes you nice.'), bede('Everyone who drinks it is very nice, these days.')],
      }),
      opt('“What’s past the Manor?”', {
        then: [
          bede('More road. Steep. I went on, once, when I was new. Got as far as the bend.'),
          bede('Then my leg went, and I came back down, and I’ve walked like this ever since.'),
          bede('Funny thing. Didn’t trip on anything.'),
        ],
      }),
    ]),
    bede('You heading for the woods? You’ll meet the sisters, then. Out at the edge.'),
    bede('Good girls. The red one buys a bottle off me every week. Not milk.'),
    bede('The violet one asks me every week if it’s Thursday.'),
    a('Is it?'),
    bede('No Thursdays here, love. Not since I came down. But she asks so nicely, I hate to be the one to tell her.'),
    lore('bede'),
    end('town:pub'),
  ],

  // ════════════════════════════════════════════ 2 · After the Dead Woods
  talk_pub_drawing: [
    bg('pub'),
    music('pub'),
    n('The sisters have a corner table at the Pub. It is the same table every time, Bede says. Nobody else sits there, even when they are away.'),
    n('Victoria is at the bar. Mitzi has a menu turned over and is drawing on the back of it with the stub of a pencil.'),
    when(
      (s) => s.notebook.unlocked,
      [mi('Look! I’m doing the stag. From memory. Its antlers had nine points. No — ten. Ten and a wobbly one.', 'happy')],
      [mi('Look! I’m drawing the stag. I didn’t look at it much, so it’s mostly antlers and feelings.')],
    ),
    n('In the corner of the menu, small, almost without thinking, she has drawn a circle with lines coming out of it.'),
    a('What’s that one?'),
    mi('Oh, that’s my lamp. I always draw it. A big yellow lamp in the sky. Vicky says I made it up.'),
    when((s) => s.flags.toldSun, [mi('But YOU said it was real. A sun. I’ve been thinking about it ALL DAY.', 'happy')]),
    when(
      (s) => s.lore?.found?.includes('page_drawing'),
      [
        n('Alice thinks of the cache in the woods, and the ration card she found folded under the crates.'),
        choice([
          opt('Show Mitzi the drawing from the woods.', {
            fx: flag('showedDrawing'),
            then: [
              n('Alice unfolds it on the table. Crayon: two girls holding hands, one red-haired and one violet, under a big yellow sun. Someone has scribbled the sun out and drawn a lantern over it.'),
              n('In the corner, in careful grown-up handwriting: “M. — age 6. Before.”'),
              mi('That’s… that’s my lamp.', 'shock'),
              mi('That’s ME. Who drew me? Who scribbled out my—'),
              n('Victoria is at the table. Alice didn’t hear her come back. She takes the drawing, folds it once, twice, and puts it inside her coat.'),
              v('Where did you get this?', 'angry'),
              a('In the woods. Under some old crates. That’s your handwriting in the corner, isn’t it?'),
              v('I threw that away. A long time ago.'),
              mi('Before what, Vicky? It says “before”.'),
              v('Before you could spell your own name. Drink your drink.'),
              n('Victoria sits down. For the rest of the night she keeps one hand flat against her coat, over the drawing, as if it might get out.'),
            ],
          }),
          opt('Keep the drawing to yourself, for now.', {
            then: [
              n('Alice leaves the ration card folded in her pocket. Some things should be handed over carefully, or not at all.'),
              n('Victoria comes back with two glasses: one tall and sweet for Mitzi, one short and brown for herself.'),
            ],
          }),
        ]),
      ],
      [n('Victoria comes back with two glasses: one tall and sweet for Mitzi, one short and brown for herself.')],
    ),
    v('Has she told you about her gathering yet?'),
    mi('Oh! Yes! I’m going to throw one. A big one. For Alice, because she’s new and nobody’s thrown her anything.'),
    v('With whose money?'),
    mi('Ours!', 'happy'),
    n('Victoria opens her mouth, and closes it, and finishes her glass.'),
    end('town:pub'),
  ],

  talk_clinic_woods: [
    bg('clinic'),
    music('town'),
    c('Back on your feet. Or someone else’s. Sit. Tongue out.'),
    a('Is this necessary?'),
    c('Nothing’s necessary down here, dear. That’s the whole trouble with the place.'),
    n('Charon listens to Alice’s chest through a brass trumpet. She listens for a long time.'),
    c('No heartbeat. Lovely ticking, though.'),
    a('That’s the watch.'),
    c('Is it?'),
    n('She doesn’t explain. She writes something in a ledger, blows on the ink, and frowns when it won’t dry.'),
    choice([
      opt('“The things in the woods were people.”', {
        then: [
          c('Most things down here were people. Some of them still are, on a good day.'),
          c('The woods take the ones who stopped walking toward anything and kept walking anyway. Round and round. Feet going, nobody home.'),
          c('Mass takes the ones who stopped walking altogether. Neater. Quieter. Same result.'),
        ],
      }),
      opt('“What do you know about Victoria and Mitzi?”', {
        then: [
          c('That they’re dead. That they don’t know it. That makes them exactly like everybody else in Gehenna.'),
          c('What makes them different is how tight they hold on to each other. People who hold on that tight usually aren’t holding on. They’re holding someone down.'),
          c('Doesn’t matter which one. Usually it’s both.'),
        ],
      }),
    ]),
    c('Get some sleep, if you can. In the morning the bells will ring for you.'),
    a('For me?'),
    c('For anybody new. Somebody in white will come and be very, very kind to you.'),
    c('Remember what I said about your fingers.'),
    end('town:clinic'),
  ],

  // ════════════════════════════════════════════ 3 · Before the Caldera
  talk_church_mass: [
    bg('church'),
    music('church'),
    n('Alice slips into the back of the horned church during mass. Nobody turns around. Nobody here has turned around in years.'),
    n('The pews are full. The flock sits very straight and very still, hands folded, eyes half-closed, breathing in time with each other.'),
    n('At the altar, Hestia sings. It isn’t a hymn, exactly. It is more like a lullaby that has learned some long words.'),
    n('As the song goes on, the people in the pews grow — not smaller. Paler. Like a photograph left too long in a window.'),
    flock('Are you new, dear? How lovely. You’ll feel so much lighter.'),
    a('What did you put down? To feel lighter?'),
    flock('Oh, I… a worry, I think. Something I was meant to do.'),
    flock('I don’t remember what. That’s the beauty of it.'),
    a('What’s your name?'),
    n('The woman opens her mouth. The smile stays exactly where it is.'),
    flock('It was lovely.'),
    choice([
      opt('Stay until the song ends.', {
        then: [
          n('Alice stays. The song settles over her like a warm blanket. Her eyelids grow heavy. In her pocket, the watch ticks — ticks — ticks—'),
          n('—and she is on her feet in the aisle, wide awake, with no idea how long she was gone.'),
          n('At the altar, Hestia is looking straight at her. Smiling. Eyes closed.'),
        ],
      }),
      opt('Leave before the song ends.', {
        then: [
          n('Alice gets up. Nobody notices. At the altar, Hestia doesn’t miss a note.'),
          n('But as the door swings shut behind her, the song swells a little, as if to make sure she can still hear it.'),
        ],
      }),
    ]),
    n('Round the back of the church, a hatch slides open. Crates of white bottles roll out onto Bede’s cart. Full. Still warm.'),
    n('Inside, the singing stops. The flock files out into the lantern-light, smiling, a little lighter than they went in.'),
    end('town:church'),
  ],

  talk_smith_caldera: [
    bg('smithy'),
    music('town'),
    hor('Quarter to.'),
    a('Horace, what’s in the Caldera?'),
    hor('Heat. Slag. Things that like both.'),
    hor('And paper. Mind the paper.'),
    a('Paper?'),
    hor('The keepers confessed on the hour. Wrote it down, every sin, every hour, on a slip about so big.'),
    n('He holds up a thumb and a finger, not far apart.'),
    hor('Then they carried the slips to the Caldera and burned them. That was the bargain. You say it, you own it, you let it go.'),
    hor('The Caldera remembers every one. On a quiet night it hums them back. Sounds like lullabies, if you don’t listen to the words.'),
    choice([
      opt('“Confessing every hour sounds exhausting.”', {
        then: [
          hor('It was. That’s why they left.'),
          hor('The Ox said: one mass a day, and you’ll never have to say it again. Never even have to remember it.'),
          hor('Who wouldn’t take that bargain? I nearly did.'),
          a('Why didn’t you?'),
          hor('Because I’ve a slip I never burned. Still have it.'),
          n('He doesn’t say what is written on it. He doesn’t blink.'),
        ],
      }),
      opt('“What did you confess?”', {
        then: [
          hor('That’s between me and the furnace.'),
          hor('But I’ll tell you this much. It was always the same thing. Every hour, the same thing, for years.'),
          hor('You don’t finish a thing like that by saying it. You finish it by doing something about it.'),
        ],
      }),
    ]),
    hor('Watch the vents in there. And watch your hair. Fire likes long hair.'),
    lore('confessions'),
    end('town:smithy'),
  ],

  // ════════════════════════════════════════════ 4 · After the Caldera
  talk_clinic_hair: [
    bg('clinic'),
    music('town'),
    c('Good grief. Sit down. Who cut that, a ghoul with a grudge?'),
    a('I did. With a knife. In a volcano.'),
    c('It shows. Hold still.'),
    n('Charon takes a pair of long silver scissors from a drawer marked NOT FOR SURGERY. She circles Alice once, like a tailor, and begins.'),
    c('Funny thing about hair. Grows after you die. Nails too. People think that means something.'),
    a('Doesn’t it?'),
    c('Means the body takes a while to get the news. Like Gehenna.'),
    n('Snip. Snip. Pink curls fall to the clinic floor. Charon sweeps them, very carefully, into a jar.'),
    a('You’re keeping it?'),
    c('I keep everything people leave behind. Somebody should.'),
    choice([
      opt('“Why do you stay here, Charon?”', {
        then: [
          c('Somebody has to row the boat.'),
          a('There isn’t a river.'),
          c('There was. Long time ago. Ran right through town, up past the bend, and out under the sky. I rowed it.'),
          c('Then the flock stopped wanting to go anywhere. A river nobody uses silts up. They paved it over and called it the Milk Road.'),
          c('So I’m a doctor now. Same job, really. I tell people where they are, and wait to see who wants to leave.'),
          lore('river'),
        ],
      }),
      opt('“Do you know where the door in the sky is?”', {
        then: [
          c('Everyone knows where it is. It’s up.'),
          c('The trouble isn’t finding it, dear. It only opens for people who’ve finished what they came to do, and most of them can’t even remember what that was.'),
          c('You can. That’s what makes you dangerous.'),
          a('Dangerous to whom?'),
          c('Guess.'),
        ],
      }),
    ]),
    c('There. Short suits you. You look like you mean it.'),
    n('Alice catches herself in the dark of the window: a girl with a jaw-length bob and the same blue eyes, looking back as if she has only just been introduced.'),
    end('town:clinic'),
  ],

  // ════════════════════════════════════════════ 5 · Before the Fort
  talk_smith_fort: [
    bg('smithy'),
    music('town'),
    hor('Half past.'),
    hor('Heard you’re for the Fort.'),
    a('Charon says it stands across the road to the Ruins.'),
    hor('It does. We built it, the keepers. Not to keep anyone out. To keep the road open.'),
    hor('Pilgrims walked it every day. Up to the cathedral to hear the hour rung, back down to live. The garrison kept the wanderers off them.'),
    hor('Then the Ox came, and nobody walked up any more, and the soldiers had nothing to guard but an empty road. So they went to mass instead.'),
    a('And you?'),
    hor('I rang the bell. Top of the cathedral. Every hour, for longer than you’ve been alive.'),
    hor('One day she came up the tower stairs and sat with me. Very kind. I looked so tired, she said. Why not rest? Just the one hour. The sky would keep.'),
    hor('So I didn’t ring it. Just the once.'),
    n('He looks around at the clock faces on his walls. None of them have hands.'),
    hor('Never rang it again. That’s my slip. “I stopped.” Same two words, every hour, forty years.'),
    choice([
      opt('“You could start again.”', {
        fx: flag('horaceHope'),
        then: [
          hor('Could I. The bell’s at the top of a ruin, and the stairs are full of things that used to be my congregation.'),
          hor('…But you’re going that way anyway, aren’t you.'),
          n('For the first time, Horace looks at her properly. It is a long look. He doesn’t blink. Neither does she.'),
        ],
      }),
      opt('“It was one hour. Anyone would have rested.”', {
        then: [hor('That’s what she said.'), hor('Nobody falls down here for one hour, girl. They fall for the hour after that, and the one after that.')],
      }),
    ]),
    lore('keepers'),
    end('town:smithy'),
  ],

  talk_pub_brother: [
    bg('pub'),
    music('pub'),
    bede('The Fort. Huh.'),
    bede('My brother kept the gate there. Wat. Big lad. Laughed like a dropped crate.'),
    bede('When they all went to mass, he went too. Said there was nothing out there to stand guard over. Said it like he was relieved.'),
    a('Is he still in Gehenna?'),
    bede('Third pew from the front. Every day. I wave. He waves back.'),
    bede('He doesn’t know who I am. Hasn’t for years. Waves at everyone the same.'),
    choice([
      opt('“I’m sorry, Bede.”', {
        then: [bede('Don’t be. He’s happy. That’s what everyone says, and I suppose they’d know.'), bede('I just wish he’d been happy as himself.')],
      }),
      opt('“Why don’t you go to mass?”', {
        then: [
          bede('Somebody’s got to remember Wat. If I go, nobody will.'),
          bede('And my leg. Mass would fix my leg, Hestia says. Make it so I don’t feel it.'),
          bede('I’d rather feel it. It reminds me I went somewhere, once.'),
        ],
      }),
    ]),
    bede('If you find the duty roster in that gatehouse, his name’s on it. Wat Carter. They’ll have crossed him out.'),
    bede('Say hello to it for me. Daft, I know.'),
    end('town:pub'),
  ],

  // ════════════════════════════════════════════ 6 · After the Fort
  talk_clinic_coins: [
    bg('clinic'),
    music('night'),
    n('Charon is alone, labelling jars by lamplight. She doesn’t look up.'),
    c('So she remembered.'),
    a('How did you know?'),
    c('You can always tell. They come back from the Fort walking like the floor might give way.'),
    c('An alley off a street with no name. Cold night. Rain. Two of them. One asleep, one awake.'),
    n('She takes a jar down from the shelf. Inside are two coins, side by side, worn exactly the same.'),
    c('Same year. Same night. Same jar. In all this time I’ve never been able to tell which coin was whose.'),
    c('It was a Wednesday, if you’re wondering. They never got to Thursday.'),
    a('…Thursday.'),
    c('The little one still asks for it. She doesn’t know why. That’s how it goes down here. You forget the thing and keep the shape of it.'),
    choice([
      opt('“Why didn’t you tell them?”', {
        then: [
          c('I did. I tell everybody. First day, every day, to anyone who’ll stand still long enough.'),
          c('Nobody hears it until they’re ready. Victoria wasn’t ready. Now she’s halfway.'),
          c('Halfway’s the worst place to be. Ask anyone in Gehenna.'),
        ],
      }),
      opt('“Will they be all right?”', {
        then: [
          c('Depends what you mean by all right.'),
          c('They could stay down here forever, holding on to each other, and never be cold again. That’s one kind.'),
          c('Or they could let go enough to stand up. That’s the other kind. It hurts more, and it goes further.'),
        ],
      }),
    ]),
    c('Watch Victoria tonight. People who’ve just remembered how they died tend to go looking for somebody to help them forget.'),
    a('Hestia.'),
    c('I didn’t say that. I never say anything. Ask anyone.'),
    lore('thursdays'),
    end('town:clinic'),
  ],

  talk_pub_mitzi: [
    bg('pub'),
    music('night'),
    n('Mitzi is at the corner table on her own. No gathering. No snacks. Just a glass of milk-punch she hasn’t touched and a pencil she keeps turning over and over.'),
    mi('Oh. Hi. I’m not sad, I’m just sitting. Sitting is a thing people do.'),
    a('Where’s Victoria?'),
    mi('Church. She said she wanted to light a candle. Vicky doesn’t light candles. Vicky blows them out so we don’t waste them.', 'sad'),
    mi('Alice, what did she mean? In the Fort. About the room, and rent, and the alley.'),
    choice([
      opt('“Ask her, not me. She owes you the truth — and you owe her the asking.”', {
        then: [
          mi('But if I ask, she has to say it. And if she says it, it’s real.'),
          a('It’s already real. Asking just means she doesn’t have to carry it on her own.'),
          mi('…Oh.', 'sad'),
        ],
      }),
      opt('“I think you already know.”', {
        then: [
          mi('…I dream about rain. I never told her. I don’t even know what rain is, really, except in the dream it’s cold and it gets in your ears.', 'sad'),
          mi('And I’m asleep, and I’m warm, because she’s there. And then I’m not anything.'),
          n('She says it lightly, like the plot of a book she didn’t much enjoy.'),
        ],
      }),
    ]),
    mi('Can I tell you something awful?'),
    mi('Sometimes I don’t learn things on purpose. Carrying water. Cooking. Counting money.'),
    mi('Because if I learn them, she won’t have to do them for me. And if she doesn’t have to do anything for me—', 'sad'),
    mi('—then what does she need me for? Everyone else went somewhere without me. Mum and Dad did. I don’t even remember them, and they still went.'),
    mi('So I keep her tired. So she’ll stay. That’s the most selfish thing in the world, isn’t it?', 'sad'),
    choice([
      opt('“It isn’t selfish. It’s frightened. And she isn’t staying because you need her. She’s staying because she loves you.”', {
        then: [mi('…How do you know?'), a('Because she’s exhausted, and she’s still here.'), n('Mitzi laughs, wetly, and wipes her nose on her sleeve.')],
      }),
      opt('“Then learn one thing. Just one. And see if she leaves.”', {
        fx: flag('mitziTea'),
        then: [
          mi('One thing.'),
          mi('…I could learn to make the tea. She always makes it. Too strong, and she puts something in hers.'),
          mi('I could make it. And not put anything in it.'),
        ],
      }),
    ]),
    n('Mitzi finally sips her milk-punch, makes a face, and pushes it away.'),
    mi('It tastes like going to sleep. I don’t want to go to sleep yet.'),
    end('town:pub'),
  ],

  // ════════════════════════════════════════════ 7 · Before the Ruins
  talk_smith_ruins: [
    bg('smithy'),
    music('town'),
    hor('Five to.'),
    hor('You’re walking into the cathedral with her.'),
    a('She offered to guide us.'),
    hor('She would. She knows the way. She took it apart.'),
    hor('The keepers didn’t “come around”, whatever she tells you. She came around to each of us. One at a time. Sat with us. So kind. So tired, we looked.'),
    hor('The ones who said no, she took into the cathedral to show them something sacred. Alone.'),
    hor('They didn’t come out with all their pieces.'),
    a('What happened to them?'),
    hor('Some of them are the things on the stairs.'),
    choice([
      opt('“Then why didn’t she come for you?”', {
        then: [
          hor('She did. I said yes. One hour, remember?'),
          hor('I’m the only one who said yes and then never went to mass. She doesn’t know what to make of me. Neither do I.'),
        ],
      }),
      opt('“Come with us.”', {
        then: [hor('No. I’m forty years out of breath and twice as old as that.'), hor('But you can take something up there for me.')],
      }),
    ]),
    hor('The bell’s still in the tower. The rope too, if the rats haven’t had it.'),
    when((s) => s.flags.horaceHope, [hor('You said I could start again. I can’t climb those stairs. But you could start it for me.')]),
    hor('If you pass it — and you’ll pass it — ring it once. For me. Don’t ask her permission.'),
    hor('And mind the rooms she sends you into. Make her go first. She won’t.'),
    end('town:smithy'),
  ],

  talk_church_back: [
    bg('church'),
    music('church'),
    n('The church is empty between masses. Hestia is polishing the horned altar with a white cloth, slowly, the way you would brush down a sleeping animal.'),
    h('Alice. I was hoping you would come. Sit with me.', 'happy'),
    h('You still want to go home, don’t you? Your little room. Your kettle.'),
    when(
      (s) => s.flags.toldDrawer,
      [h('Your drawer of broken things.'), a('…I never told you about the drawer.'), h('Didn’t you? Victoria, then. People tell me things, dear. It’s my vocation.', 'happy')],
      [h('Everyone up there has a little room, dear. Everyone wants to go back to it.')],
    ),
    h('The clock-keepers built a door in their cathedral. It runs backwards, they say. Step through, and you wake in your own bed, the morning before the watch ever opened.'),
    h('Everything as it was. Nothing finished, nothing lost. Wouldn’t that be lovely?'),
    choice([
      opt('“Yes. It would.”', {
        then: [
          h('Then I will show you the way. Trust me.', 'happy'),
          n('She takes Alice’s hand. Her fingers are as warm as fresh milk. In Alice’s pocket, the watch is ticking very fast.'),
        ],
      }),
      opt('“Charon says there isn’t a back. Only up.”', {
        fx: (s) => (s.flags.hestiaWary += 1),
        then: [
          h('Charon says everyone is dead. Charon says a great many things.', 'happy'),
          h('I only offer, dear. The Ox never forces anyone. It has never needed to.'),
          n('For a moment, in the dark behind the altar, her shadow seems to have horns. Then she moves, and it is only a shadow.'),
        ],
      }),
    ]),
    end('town:church'),
  ],

  // ════════════════════════════════════════════ 8 · After the Ruins
  talk_smith_bell: [
    bg('smithy'),
    music('night'),
    when(
      (s) => s.flags.rangBell,
      [
        n('Horace is standing in the Smithy doorway when Alice comes down the street. He has been standing there, Bede says, since yesterday.'),
        hor('I heard it.'),
        hor('All the way down here. Through forty years of stone. I heard it.'),
        n('He looks at the clock faces on his walls. One of them — just one — has a hand now: a single sliver of new brass, pointing straight up.'),
        hor('Cut that last night. First hand I’ve made since the Ox.'),
        hor('It isn’t much. It’s an hour.'),
      ],
      [hor('You didn’t ring it.'), a('Hestia said the tower would come down.'), hor('Course she did.'), hor('Never mind. Some of us take forty years to do one small thing. You’ve time yet.')],
    ),
    n('He takes Alice’s chin in one huge, careful hand and turns her face to the forge-light, to look at the patch over her eye.'),
    hor('She took your eye.'),
    a('She’s taken a great many things, I think.'),
    hor('Give me the watch.'),
    n('He opens the back of it, and looks inside for a long time, and closes it again.'),
    hor('It’s nearly done counting.'),
    a('Counting what?'),
    hor('You.'),
    choice([
      opt('“What happens when it’s done?”', {
        then: [hor('It ticks on its own. Then you’ll know you’ve finished.'), hor('What you do after that is your business. Not mine. Not hers.')],
      }),
      opt('“Then I had better hurry.”', {
        then: [hor('No. Never hurry the last hour. That’s how you miss it.')],
      }),
    ]),
    hor('Go on. Get some sleep. I’ll keep the time.'),
    end('town:smithy'),
  ],

  talk_church_empty: [
    bg('church'),
    music('night'),
    n('The church is empty of its priest. The candles are still warm. Nobody has seen Hestia since the Ruins.'),
    n('The flock is here anyway. They sit in the pews in their best clothes, hands folded, waiting very patiently for a mass that does not start.'),
    when(
      (s) => s.flags.rangBell,
      [
        flock('You. You’re the new one. With the ticking.'),
        flock('I heard a bell yesterday, right in the middle of mass. And I remembered—'),
        flock('My name. It’s Ruth. Isn’t that silly? I’d quite forgotten I had one.'),
        a('It isn’t silly, Ruth.'),
        flock('I had a garden, I think. Above. I left the gate open. I always meant to go back and shut it.'),
        flock('…I should like to go and shut it.'),
        n('She looks up — just for a moment — at the stone where the sky should be. Then the habit of years folds her hands again.'),
        flock('After the communion, perhaps.'),
      ],
      [
        flock('Are you here for the communion? It’s tomorrow. Everyone’s going. We’ll all feel so much lighter.'),
        a('What will you put down, this time?'),
        flock('Oh, whatever’s left.'),
        n('She says it with a smile. The smile stays exactly where it is.'),
      ],
    ),
    choice([
      opt('“Don’t go tomorrow. Any of you.”', {
        then: [
          n('A few heads turn. Most don’t. The ones that turn look at her the way you look at a bird that has got indoors.'),
          flock('But where else would we go, dear?'),
        ],
      }),
      opt('Leave them to their waiting.', {
        then: [n('Alice lets the door close softly. Behind it, the waiting goes on, very patiently, as it has for years.')],
      }),
    ]),
    end('town:church'),
  ],

  talk_pub_bede: [
    bg('pub'),
    music('pub'),
    bede('Sit down. I’m buying. Don’t look so surprised, I do have coin.'),
    bede('Communion tomorrow. They want twice the crates sent up. Three times. I asked what for. Nobody knew.'),
    when(
      (s) => s.flags.watHello,
      [
        bede('Funny thing happened at mass this morning. I waved at Wat, like I always do.'),
        bede('He looked at me. Not past me. At me. Like he was trying to remember where he’d left something.'),
        bede('Then he waved back. Not the way he waves at everyone.'),
        bede('The way he used to.'),
        n('Bede looks into his glass for a long time.'),
        bede('You said hello to him, didn’t you. Up at the Fort.'),
        a('You asked me to.'),
        bede('So I did. Daft.'),
      ],
      [bede('I waved at Wat this morning. He waved back. Same as always.'), bede('Same as always.')],
    ),
    bede('If you’re going up the Milk Road tomorrow, I’m taking the cart. Somebody ought to see where it all goes.'),
    bede('Thirty years. About time.'),
    end('town:pub'),
  ],
};
