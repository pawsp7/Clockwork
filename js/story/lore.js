/**
 * World-building: the codex (People / Places / Faith / Things / Pages),
 * Charon's answers, pub gossip and bestiary notes.
 * Entries unlock from story progress (`when`) or by being found (`state.lore.found`).
 */

const met = (s, id) => s.roster.includes(id) || s.cleared.woods;

/** Mark a codex entry as found (campfires, caches and conversations call this). */
export function unlockLore(s, id) {
  s.lore ||= { found: [] };
  if (!s.lore.found.includes(id)) s.lore.found.push(id);
}

export const CODEX = [
  // ─── People ──────────────────────────────────────────────────────────────
  {
    id: 'alice',
    cat: 'People',
    title: 'Alice',
    when: () => true,
    text: [
      'A girl from above ground, holding a pocket watch that would not tick until the night it opened by itself.',
      'She does not remember dying. Charon says that is the most interesting thing about her.',
      'Everyone in Gehenna has vacant eyes. Alice’s are still blue.',
    ],
  },
  {
    id: 'charon',
    cat: 'People',
    title: 'Charon',
    when: () => true,
    text: [
      'Doctor, ferrywoman, professional spoilsport. Runs the clinic at the end of the lantern street.',
      'She tells everyone they are dead. Nobody believes her, which she finds restful.',
      'She collects coins: every soul brings one down, she says, and most of them drop it without noticing.',
    ],
  },
  {
    id: 'mitzi',
    cat: 'People',
    title: 'Mitzi',
    when: (s) => met(s, 'mitzi'),
    text: [
      'The younger sister. Hosts gatherings the way other people breathe, and forgets every guest the moment they leave her table.',
      'She has never carried her own water. She has never had to.',
    ],
  },
  {
    id: 'mitzi_2',
    cat: 'People',
    title: 'Mitzi, noticing',
    when: (s) => s.notebook.unlocked,
    text: [
      'It turns out Mitzi notices everything — eye colours, legs, the way a thing breathes before it bites.',
      'She just never thought noticing was worth anything until somebody asked her to write it down.',
    ],
  },
  {
    id: 'victoria',
    cat: 'People',
    title: 'Victoria',
    when: (s) => met(s, 'victoria'),
    text: [
      'The elder sister. Steps first. Always.',
      'She says their parents died when Mitzi was small and Gehenna is all either of them has known. She says it like she is reading it off a card.',
      'She drinks only when Mitzi is asleep. Mitzi is always asleep.',
    ],
  },
  {
    id: 'victoria_2',
    cat: 'People',
    title: 'Victoria, remembering',
    when: (s) => s.cleared.fort,
    text: [
      'An alley. Wet bricks. Two hoods at the mouth of it, laughing.',
      'The sisters did not grow up in Gehenna. They died above it, one holding the other, and came down together.',
      'Victoria has been raising Mitzi in a graveyard ever since, and calling it a home.',
    ],
  },
  {
    id: 'hestia',
    cat: 'People',
    title: 'Hestia',
    when: (s) => s.flags.metHestia,
    text: [
      'Keeper of the White Ox gospel. Pale hair, a black habit, a gold cross worn in her hair like a promise.',
      'When she smiles, her eyes close — like a door being politely shut.',
      'Everyone who goes to her mass feels lighter afterwards. Nobody can remember what they put down.',
    ],
  },
  {
    id: 'white_ox',
    cat: 'People',
    title: 'The White Ox',
    when: (s) => s.cleared.manor || s.chapter >= 5,
    text: [
      'A high demon, older than the town and older than the milk. Hestia is the face it wears to church.',
      'It believes anyone who falls into Gehenna already spent their chance at the sky. It feeds on those who agree, a little every mass.',
      'Its eyes stay shut. It has never needed them.',
    ],
  },
  {
    id: 'hestia_2',
    cat: 'People',
    title: 'Hestia, up close',
    when: (s) => s.cleared.ruins,
    text: [
      'She took the cathedral apart one keeper at a time: sat with each of them, so kind, so sorry they looked so tired.',
      'The ones who said no, she took to see something sacred. Alone.',
      'In the Ruins she offered Alice a room to look into by herself. There was never anything in it but needles.',
    ],
  },
  {
    id: 'horace',
    cat: 'People',
    title: 'Horace',
    when: () => false,
    text: [
      'The smith. Broad as a door, old as the cathedral’s last bell, and he has not blinked in forty years.',
      'He was a clock-keeper. Keepers swore never to close their eyes on an hour. Most broke the vow. He didn’t.',
      'He tells the time to anyone who comes in — “Twenty past” — though nobody in Gehenna could tell you of what.',
    ],
  },
  {
    id: 'bede',
    cat: 'People',
    title: 'Bede',
    when: () => false,
    text: [
      'A milk-carter with a stiff leg. Thirty years up the Milk Road every morning; thirty years of empty crates coming back down.',
      'He has never drunk the milk. It makes you sleepy, he says. It makes you nice.',
      'His brother Wat sits third pew from the front, and waves at everyone the same.',
    ],
  },
  {
    id: 'flock',
    cat: 'People',
    title: 'The Flock',
    when: (s) => s.flags.metHestia,
    text: [
      'Gehenna’s churchgoers. Gentle, tired, polite.',
      'Ask one of them about last week and they will smile and tell you it was lovely. Ask what happened in it and the smile stays exactly where it is.',
    ],
  },

  // ─── Places ──────────────────────────────────────────────────────────────
  {
    id: 'gehenna',
    cat: 'Places',
    title: 'Gehenna',
    when: () => true,
    text: [
      'A town under a sky of stone, lit by lanterns that burn the colour of spilled milk.',
      'Everyone here was going somewhere once. Charon says you don’t come here when you die — you come here when you stop.',
      'There are no Thursdays. There are, somehow, Sundays every day.',
    ],
  },
  {
    id: 'woods',
    cat: 'Places',
    title: 'The Dead Woods',
    when: (s) => s.unlocked.woods,
    text: [
      'Trees that forgot how to be trees and kept standing out of habit.',
      'The creatures that live here were people once, the sisters say: churchgoers who wandered off between masses and kept wandering.',
    ],
  },
  {
    id: 'woods_folk',
    cat: 'Places',
    title: 'What lives in the trees',
    when: () => false,
    text: [
      'The longer you stay out past mass, the less you look like anyone. First the face goes, then the name. The eyes go last.',
      'Mitzi swears one of the triangle-headed things used to sell buttons on Lantern Street.',
    ],
  },
  {
    id: 'caldera',
    cat: 'Places',
    title: 'The Caldera',
    when: (s) => s.unlocked.volcano,
    text: [
      'Gehenna’s furnace. The air shimmers like it is trying to remember a word.',
      'The Old Faith said the Caldera remembers every sin that was ever burned. It hums with them on quiet nights. Lullabies, mostly.',
    ],
  },
  {
    id: 'milk_road',
    cat: 'Places',
    title: 'The Milk Road',
    when: () => false,
    text: [
      'Every morning the carts leave Gehenna full and climb the long road past the Manor. Every evening they come back empty.',
      'Nobody follows them. Mitzi did, once, a long way up. She got bored and came home before she saw where it ended.',
    ],
  },
  {
    id: 'river',
    cat: 'Places',
    title: 'The River That Was',
    when: () => false,
    text: [
      'Once a river ran through Gehenna, up past the bend and out under the sky. Charon rowed it.',
      'Then the flock stopped wanting to go anywhere, and a river nobody uses silts up. They paved it over and called it the Milk Road.',
    ],
  },
  {
    id: 'fort',
    cat: 'Places',
    title: 'The Abandoned Fort',
    when: (s) => s.unlocked.fort,
    text: [
      'Built to guard the road to the Ruins, back when Gehenna believed there was something out there to guard against.',
      'It never fell. Nobody attacked it. The garrison simply stopped coming to work.',
    ],
  },
  {
    id: 'fort_garrison',
    cat: 'Places',
    title: 'The Garrison',
    when: () => false,
    text: [
      'Every bunk in the barracks is made, corners tucked. The church told the soldiers there was nothing left to fear, and they believed it, and went to mass instead.',
      'Their armour still stands its post. Some of it still stands up.',
    ],
  },
  {
    id: 'ruins',
    cat: 'Places',
    title: 'The Ruins',
    when: (s) => s.unlocked.ruins,
    text: [
      'What remains of the Old Faith’s cathedral. A clock face the size of a door lies on its back in the rubble, its hands rusted at midnight.',
      'Hestia knows every stone. She walks them like someone visiting a grave she dug.',
    ],
  },
  {
    id: 'manor',
    cat: 'Places',
    title: 'The Manor',
    when: (s) => s.cleared.ruins,
    text: ['Hestia’s house at the top of the Milk Road. White drapes, white candles, a white altar with nothing on it.', 'It smells of incense and animal heat.'],
  },
  {
    id: 'sky',
    cat: 'Places',
    title: 'The Door in the Sky',
    when: (s) => s.flags.aliceUp > 0 || s.cleared.volcano,
    text: [
      'You cannot see it from the streets. Charon swears it is there.',
      'It opens for people who finish what they started. Most never finish. Most never start.',
    ],
  },

  // ─── Faith ───────────────────────────────────────────────────────────────
  {
    id: 'church',
    cat: 'Faith',
    title: 'The Church of the White Ox',
    when: (s) => s.flags.metHestia,
    text: [
      'The horned church at the heart of Gehenna. Mass is daily, because every day is Sunday.',
      'The gospel is simple: you already failed once, so stop trying. Rest. Kneel. Be emptied, gently, week by week.',
      'It is the easiest answer anyone in Gehenna has ever been given, and almost everyone takes it.',
    ],
  },
  {
    id: 'old_faith',
    cat: 'Faith',
    title: 'The Old Faith',
    when: () => false,
    text: [
      'Before the Ox, Gehenna worshipped the clock. Every hour a bell; every bell a confession; every confession a step closer to the sky.',
      'It was exhausting. The Ox offered one mass a day and an end to counting. The clock-keepers “came around”.',
      'Alice’s watch ticks in the same rhythm as the bells that used to ring here.',
    ],
  },

  {
    id: 'keepers',
    cat: 'Faith',
    title: 'The Clock-Keepers',
    when: () => false,
    text: [
      'The priests of the Old Faith. They rang the cathedral bell every hour, and swore never to close their eyes on one.',
      'They made a watch for every soul who came down with business unfinished. The cases were made down here. The winding, Horace says, is done from the other end.',
      'The last bell-ringer stopped for one hour, because someone kind told him he looked tired. He never rang it again.',
    ],
  },
  {
    id: 'confessions',
    cat: 'Faith',
    title: 'Burnt Slips',
    when: () => false,
    text: [
      'Every hour, a keeper wrote a confession on a slip of paper no bigger than a thumbnail, and carried the slips to the Caldera to burn.',
      'You say it, you own it, you let it go. That was the bargain.',
      'The Caldera remembers every one. Some of them still ride the heat, one line long.',
    ],
  },

  // ─── Things ──────────────────────────────────────────────────────────────
  {
    id: 'watch',
    cat: 'Things',
    title: 'The Pocket Watch',
    when: () => true,
    text: [
      'Found in a drawer of broken things. Cold, heavy, silent — until it opened by itself.',
      'In Gehenna it grows a blade and looks one move ahead. Reforged often enough, it grows a second hand and looks at two.',
      'Charon says watches like this don’t come from shops. Someone wound it for Alice. She would like to know who.',
    ],
  },
  {
    id: 'milk',
    cat: 'Things',
    title: 'Milk',
    when: () => true,
    text: ['Gehenna’s only export. Nobody owns a cow. Charon asked where it comes from, once. She says the answer had horns.'],
  },
  {
    id: 'supplies',
    cat: 'Things',
    title: 'The Supply Cart',
    when: (s) => s.unlocked.woods,
    text: [
      'A hand-cart of milk crates and provisions — a hundred days of bread, bandages and lamp oil, give or take.',
      'Gehenna’s beasts go for the cart before the throat. Every step costs a little. Every unguarded claw costs a lot.',
    ],
  },
  {
    id: 'gems',
    cat: 'Things',
    title: 'Gems and Bracelets',
    when: () => true,
    text: [
      'Elemental gems set in bracelets let a fighter imbue a strike: Water beats Fire, Fire beats Earth, Earth beats Electric, Electric beats Water.',
      'Using an element leaves you open to whatever beats it, for one breath. Monsters too.',
      'Each imbued strike costs mana, and mana only comes back with rest.',
    ],
  },
  {
    id: 'thursdays',
    cat: 'Things',
    title: 'Thursdays',
    when: () => false,
    text: [
      'There are no Thursdays in Gehenna. Every day is Sunday.',
      'The sisters came down on a Wednesday night. They never got as far as Thursday.',
      'Mitzi still asks for it. She doesn’t know why. That is how it goes down here: you forget the thing and keep the shape of it.',
    ],
  },
  {
    id: 'coins',
    cat: 'Things',
    title: 'Coins',
    when: () => true,
    text: ['Minted from nothing anyone remembers. Charon keeps hers in jars on the clinic shelves, labelled by year of death.'],
  },

  // ─── Pages (found in caches) ─────────────────────────────────────────────
  {
    id: 'page_drawing',
    cat: 'Pages',
    title: 'A Child’s Drawing',
    when: () => false,
    found: 'Dead Woods',
    text: [
      'Crayon on the back of a ration card: two girls holding hands, one red-haired and one violet, under a big yellow sun.',
      'Someone has scribbled the sun out and drawn a lantern in its place.',
      'In the corner, in careful grown-up handwriting: “M. — age 6. Before.”',
    ],
  },
  {
    id: 'page_ledger',
    cat: 'Pages',
    title: 'Milk Guild Ledger, page 40',
    when: () => false,
    found: 'The Caldera',
    text: [
      'Rows and rows of shipments. Crates out: 400. Crates returned: 400, empty.',
      'The column marked DESTINATION has been left blank on every line. Someone has pencilled “up?” in the margin, and someone else has rubbed it out.',
    ],
  },
  {
    id: 'page_roster',
    cat: 'Pages',
    title: 'Duty Roster',
    when: () => false,
    found: 'Abandoned Fort',
    text: [
      'Forty names. Every one crossed out in the same neat hand, with the same note beside it: “gone to mass”.',
      'Near the top, pressed so hard the pen went through the paper: W. CARTER.',
      'At the bottom: “If you are reading this, the gate held. It always holds. There is nothing left out there to keep out — only us, to keep in.”',
    ],
  },
  {
    id: 'page_hymn',
    cat: 'Pages',
    title: 'Hymn of the Clock',
    when: () => false,
    found: 'The Ruins',
    text: ['“Count the hour, count the sin, / Wind the hand and let it in. / Ring the bell and say it true — / the sky is keeping time for you.”', 'A child has drawn horns on the bell in the margin.'],
  },
];

export function codexEntries(state) {
  const found = state.lore?.found || [];
  return CODEX.filter((e) => found.includes(e.id) || e.when(state));
}

export function codexCount() {
  return CODEX.length;
}

// ─── Charon's answers ──────────────────────────────────────────────────────
export const CHARON_TOPICS = [
  {
    id: 'gehenna',
    q: 'What is Gehenna?',
    when: () => true,
    a: [
      'It’s where you go when you stop. Not when you die — when you stop. Plenty of people die and keep going. They don’t end up here.',
      'Everyone in Gehenna was on their way somewhere. Now they buy milk and go to church.',
    ],
  },
  {
    id: 'milk',
    q: 'Where does the milk come from?',
    when: () => true,
    a: ['I asked once.', 'The answer had horns. I stopped asking.'],
  },
  {
    id: 'coins',
    q: 'Why do you collect coins?',
    when: () => true,
    a: [
      'Every soul brings one down. A fare, the old stories call it. Most people drop theirs on the first day without noticing.',
      'I pick them up. Somebody should keep count of who came through.',
    ],
  },
  {
    id: 'sky',
    q: 'Is there really a way out?',
    when: (s) => s.chapter >= 1,
    a: [
      'Not out. Up. There’s a door in the sky — you can’t see it from the streets.',
      'It opens for people who finish what they started. Most don’t finish. Most don’t start. They go to mass instead.',
    ],
  },
  {
    id: 'sisters',
    q: 'What do you know about the sisters?',
    when: (s) => s.cleared.woods,
    a: [
      'Sweet girls. Dead as doornails, the both of them.',
      'The red one is carrying the violet one, and neither of them knows how heavy that is. That’s what’s keeping them here.',
    ],
  },
  {
    id: 'hestia',
    q: 'Who is Hestia, really?',
    when: (s) => s.flags.metHestia,
    a: (s) =>
      s.cleared.fort
        ? ['She’s older than the town. Older than the milk.', 'Ask her where she was before Gehenna. Watch her eyes when she lies.']
        : ['The nice lady with the church. Everybody loves her.', 'I’d love her too, if I didn’t keep a ledger of who stops coming back from mass.'],
  },
  {
    id: 'watch',
    q: 'What is this watch?',
    when: (s) => s.cleared.volcano,
    a: [
      'Watches like that don’t come from shops. Somebody wound it for you, dear.',
      'It looks one move ahead. Down here, most people can’t see past the end of the week.',
    ],
  },
  {
    id: 'horace',
    q: 'What’s Horace’s story?',
    when: (s) => s.chapter >= 2 || !!s.talks?.includes('talk_smith_watch'),
    a: [
      'Last of the clock-keepers. Hasn’t blinked since the bell stopped.',
      'He thinks he’s being punished. He isn’t. He’s waiting. There’s a difference, and one day he’ll notice it.',
    ],
  },
  {
    id: 'thursdays',
    q: 'What happened to Thursdays?',
    when: (s) => s.cleared.woods,
    a: [
      'Gone. The Ox made every day Sunday. Fewer days to remember, fewer days to regret.',
      'Some people still keep the shape of one, though. Ask the little violet one.',
    ],
  },
  {
    id: 'stop',
    q: 'Why don’t you stop Hestia?',
    when: (s) => s.cleared.volcano,
    a: [
      'Not my job, dear. I row the boat. I don’t steer it.',
      'Besides, she never makes anybody kneel. She only asks. That’s the awful part: they all say yes.',
    ],
  },
  {
    id: 'ferry',
    q: 'Were you really a ferrywoman?',
    when: (s) => !!s.lore?.found?.includes('river'),
    a: ['Still am. Just haven’t had a fare in a while.', 'Yours might be the first in years. Don’t keep me waiting too long.'],
  },
  {
    id: 'ox',
    q: 'What is the White Ox?',
    when: (s) => s.cleared.ruins,
    a: [
      'Hestia’s real face. A demon that thinks anyone who lands here already wasted their chance at the sky.',
      'It doesn’t eat people. It eats the wanting out of them. A little every mass, until there’s nothing left to want with.',
    ],
  },
];

export function charonAnswer(topic, state) {
  return typeof topic.a === 'function' ? topic.a(state) : topic.a;
}

// ─── Pub gossip ────────────────────────────────────────────────────────────
const GOSSIP = [
  [0, 'Milk prices are up again. Faith is still free.'],
  [0, 'Charon told me I was dead. Rude. True, but rude.'],
  [0, 'The smith hasn’t blinked in forty years. We timed it.'],
  [0, 'There used to be Thursdays, you know. Nobody remembers who took them.'],
  [1, 'They say the Dead Woods had leaves, once. Then someone started going to mass.'],
  [1, 'Two sisters live out by the woods. The red one never sleeps. The violet one never wakes up properly.'],
  [2, 'A ghoul swears the Caldera sings at night. Lullabies, mostly.'],
  [2, 'The violet sister threw a gathering. Lovely snacks. She forgot my name halfway through.'],
  [3, 'The fort never fell. Nobody attacked it. They just stopped coming to work.'],
  [3, 'Hestia blessed my cart. Now it’s lighter. Everything’s lighter. I can’t remember what was in it.'],
  [4, 'Somebody saw a big white shape on the Manor roof. Horned. Probably a weathervane.'],
  [4, 'The clock-keepers used to ring a bell every hour. Imagine having to remember things that often.'],
  [5, 'Mass is extra long tonight. Communion, they’re saying. For the surface girl.'],
  [1, 'Old Horace says it’s “twenty past”. Twenty past WHAT, Horace?'],
  [1, 'The violet sister asked me if it was Thursday. I said yes, to see what would happen. She hugged me.'],
  [2, 'Bede’s never touched the milk. Thirty years. Strange fellow. Lovely fellow. Strange.'],
  [2, 'The surface girl came to mass. Her pocket was ticking the whole way through. Put everyone right off the song.', (s) => s.talks?.includes('talk_church_mass')],
  [4, 'Saw the red sister in church the other night with a bottle in front of her. Didn’t touch it. Just looked at it.'],
  [3, 'They say the Fort gate’s open again. What would anyone want out THERE?', (s) => s.cleared.fort],
  [4, 'I heard a bell yesterday, right in the middle of mass. Now I can’t stop thinking about my mother.', (s) => s.flags.rangBell],
  [4, 'Hestia came back from the Ruins still smiling. But it was on wrong, somehow.', (s) => s.cleared.ruins],
];

export function gossip(state, n = 3) {
  const pool = GOSSIP.filter(([ch, , when]) => ch <= state.chapter && (!when || when(state))).map(([, t]) => t);
  const out = [];
  const copy = pool.slice();
  while (out.length < n && copy.length) out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
  return out;
}

// ─── Bestiary notes ────────────────────────────────────────────────────────
const EYE_NOTE = {
  green: 'Its green eyes never quite blink.',
  red: 'Its red eyes smoulder like coals left in a grate.',
  blue: 'Its blue eyes are wet, and very patient.',
  yellow: 'Its yellow eyes crackle when it is about to move.',
};
const SHAPE_NOTE = {
  triangle: 'Sharp at every angle, and it knows it.',
  square: 'Built like a box someone forgot to bury.',
  circle: 'It rolls when it is happy. It is rarely happy.',
};
const LIMB_NOTE = {
  2: 'It walks upright, as if it still remembers being someone.',
  4: 'It lopes along on four limbs, low to the ground.',
  6: 'It skitters on six legs and never seems to tire.',
};

export function bestiaryNote(m) {
  return `${EYE_NOTE[m.eye]} ${SHAPE_NOTE[m.shape]} ${LIMB_NOTE[m.limbs]}`;
}
