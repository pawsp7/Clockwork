/** Dialog trees that drive character development & endings */

export const DIALOGS = {
  intro: {
    id: 'intro',
    bg: 'title',
    speaker: 'narrator',
    lines: [
      'Above ground, Alice found an old pocket watch.',
      'When it opened, the world folded inward.',
      'She awoke beneath — in Gehenna, where milk is holy and the dead pretend otherwise.',
    ],
    next: 'intro_alice',
  },
  intro_alice: {
    id: 'intro_alice',
    bg: 'town',
    speaker: 'alice',
    lines: [
      "This watch... it's warm. Like it's waiting.",
      "If this is a dream, it's a very rude one. I need to get home.",
    ],
    next: 'intro_charon',
  },
  intro_charon: {
    id: 'intro_charon',
    bg: 'town',
    speaker: 'charon',
    lines: [
      "Welcome to hell. Coin for the living? No? Pity.",
      "I'm Charon. Doctor, ferryman, professional spoilsport.",
      "You're dead-adjacent. Try not to take it personally.",
      "Two thugs are sizing you up. Consider this a lesson.",
    ],
    next: 'tutorial_start',
  },

  // --- After tutorial ---
  post_tutorial: {
    id: 'post_tutorial',
    bg: 'town',
    speaker: 'charon',
    lines: [
      "Not bad. The watch drinks time — you'll see one intention before it happens.",
      "Protect your supplies. Unblocked claws eat the payload, not your pride.",
      "Gehenna has an Inn, Pub, Smithy, Clinic. Milk's the export. Faith's the tax.",
      "The Dead Woods wait when you're ready. Sisters live near there — red and violet.",
    ],
    next: 'town_free',
  },

  // --- Meet sisters ---
  meet_sisters: {
    id: 'meet_sisters',
    bg: 'woods',
    speaker: 'victoria',
    lines: [
      "You're the surface girl. Alice, was it?",
      "I'm Victoria. This is Mitzi. We... live here. Always have, I think.",
      "The Woods have been restless. We'll walk with you — I won't let Mitzi go alone.",
    ],
    next: 'meet_mitzi',
  },
  meet_mitzi: {
    id: 'meet_mitzi',
    bg: 'woods',
    speaker: 'mitzi',
    lines: [
      "Hi! Do I have to fight? Fighting is sweaty.",
      "Vicky does the stabbing. I do the vibes. And gatherings. Mostly gatherings.",
    ],
    choices: [
      {
        text: "Mitzi, your eyes might save us. Try watching how they move.",
        score: 'woods',
        good: true,
        effect: { mitziEncourage: 1 },
        next: 'woods_d1',
      },
      {
        text: "Stay behind Victoria. We'll handle it.",
        score: 'woods',
        good: false,
        effect: { mitziEncourage: -1 },
        next: 'woods_d1',
      },
      {
        text: "Joke with her — make the woods feel lighter.",
        score: 'woods',
        good: false,
        effect: { mitziEncourage: 0 },
        next: 'woods_d1',
      },
    ],
  },

  woods_d1: {
    id: 'woods_d1',
    bg: 'woods',
    speaker: 'alice',
    lines: ["The trees lean like they're listening. First stretch of the Dead Woods."],
    next: 'combat_woods',
  },

  woods_mid_a: {
    id: 'woods_mid_a',
    bg: 'woods',
    speaker: 'mitzi',
    lines: ["Ugh. Another one? Can't we nap and let them get bored?"],
    choices: [
      {
        text: "Look at their eyes — write it down. Patterns matter.",
        score: 'woods',
        good: true,
        next: 'woods_continue',
      },
      {
        text: "Victoria, cover her. Mitzi, stay put.",
        score: 'woods',
        good: false,
        next: 'woods_continue',
      },
    ],
  },
  woods_mid_b: {
    id: 'woods_mid_b',
    bg: 'woods',
    speaker: 'victoria',
    lines: [
      "Mitzi, drink some water. No, I'll hold the flask. You might spill.",
      "(She doesn't notice how Mitzi's hands never get to try.)",
    ],
    choices: [
      {
        text: "Let Mitzi hold it. Small freedoms stack.",
        score: 'woods',
        good: true,
        next: 'woods_continue',
      },
      {
        text: "Say nothing — sisters know best.",
        score: 'woods',
        good: false,
        next: 'woods_continue',
      },
      {
        text: "Ask Mitzi what she notices about the beasts.",
        score: 'woods',
        good: true,
        next: 'woods_continue',
      },
    ],
  },
  woods_mid_c: {
    id: 'woods_mid_c',
    bg: 'woods',
    speaker: 'mitzi',
    lines: [
      "Victoria drinks when I'm asleep, you know. Funny, right? Stress is hilarious.",
    ],
    choices: [
      {
        text: "That isn't a joke. She needs you awake for her, too.",
        score: 'woods',
        good: true,
        next: 'woods_continue',
      },
      {
        text: "Laugh along — keep morale up.",
        score: 'woods',
        good: false,
        next: 'woods_continue',
      },
    ],
  },
  woods_pre_boss: {
    id: 'woods_pre_boss',
    bg: 'woods',
    speaker: 'victoria',
    lines: ["Something larger between the trunks. Mitzi, behind me."],
    choices: [
      {
        text: "Mitzi — study it before we strike. You're the only one who can learn them.",
        score: 'woods',
        good: true,
        effect: { forceStudyUnlock: true },
        next: 'combat_woods_boss',
      },
      {
        text: "Victoria tanks. Alice finishes. Mitzi stays clear.",
        score: 'woods',
        good: false,
        next: 'combat_woods_boss',
      },
    ],
  },

  woods_clear: {
    id: 'woods_clear',
    bg: 'woods',
    speaker: 'narrator',
    lines: [
      'The Dead Woods exhale. Gehenna\'s lights glitter like false stars.',
      'Mitzi\'s notebook has a first page — or will, if she was pressed to see.',
    ],
    next: 'town_after_woods',
  },

  // --- Volcano ---
  volcano_intro: {
    id: 'volcano_intro',
    bg: 'volcano',
    speaker: 'alice',
    lines: [
      "Heat like a held breath. Charon said the old caldera still 'remembers sin.'",
    ],
    next: 'volcano_mitzi',
  },
  volcano_mitzi: {
    id: 'volcano_mitzi',
    bg: 'volcano',
    speaker: 'mitzi',
    lines: ["Okayyy I will hit things. If you ask nicely. And pack snacks."],
    choices: [
      {
        text: "I need you — not as backup, as a hammer. Trust your swing.",
        score: 'volcano',
        good: true,
        effect: { mitziDmg: 1 },
        next: 'combat_volcano',
      },
      {
        text: "Just chip in when it's safe. No heroics.",
        score: 'volcano',
        good: false,
        effect: { mitziDmg: -1 },
        next: 'combat_volcano',
      },
    ],
  },
  volcano_mid_a: {
    id: 'volcano_mid_a',
    bg: 'volcano',
    speaker: 'mitzi',
    lines: ["Sparks in my hair! Aesthetic. Also hot. Mostly hot."],
    choices: [
      {
        text: "Keep your stance low. You're stronger when you commit.",
        score: 'volcano',
        good: true,
        effect: { mitziDmg: 1 },
        next: 'volcano_continue',
      },
      {
        text: "Fall back — Victoria and I will clear the path.",
        score: 'volcano',
        good: false,
        effect: { mitziDmg: -1 },
        next: 'volcano_continue',
      },
    ],
  },
  volcano_mid_b: {
    id: 'volcano_mid_b',
    bg: 'volcano',
    speaker: 'victoria',
    lines: ["Mitzi's hands are blistering. I should take her weapon."],
    choices: [
      {
        text: "She can endure. Taking it now teaches her nothing.",
        score: 'volcano',
        good: true,
        effect: { mitziDmg: 1 },
        next: 'volcano_continue',
      },
      {
        text: "Give Victoria the hammer. Protect Mitzi at all costs.",
        score: 'volcano',
        good: false,
        effect: { mitziDmg: -1 },
        next: 'volcano_continue',
      },
    ],
  },
  volcano_hazard: {
    id: 'volcano_hazard',
    bg: 'volcano',
    speaker: 'narrator',
    lines: [
      'A vent screams open. Flame kisses Alice\'s hair — half of it gone to ash and smell.',
      'She cuts the rest unevenly with a borrowed knife. The watch ticks, unbothered.',
    ],
    effect: { aliceShortHair: true },
    next: 'combat_volcano_boss',
  },
  volcano_clear: {
    id: 'volcano_clear',
    bg: 'volcano',
    speaker: 'mitzi',
    lines: ["We lived! I hit a thing! Possibly the correct thing!"],
    next: 'town_after_volcano',
  },

  // --- Fort ---
  fort_intro: {
    id: 'fort_intro',
    bg: 'fort',
    speaker: 'victoria',
    lines: [
      "Abandoned Fort. Smells like old iron and worse decisions.",
      "Mitzi, stay in my shadow.",
    ],
    next: 'fort_interrupt',
  },
  fort_interrupt: {
    id: 'fort_interrupt',
    bg: 'fort',
    speaker: 'mitzi',
    lines: ["I can swing first this time—"],
    next: 'fort_victoria_cut',
  },
  fort_victoria_cut: {
    id: 'fort_victoria_cut',
    bg: 'fort',
    speaker: 'victoria',
    lines: ["No. I step first. Always."],
    choices: [
      {
        text: "Victoria — if you never step aside, she never learns the ground.",
        score: 'fort',
        good: true,
        effect: { victoriaPoint: 1 },
        next: 'combat_fort',
      },
      {
        text: "You're a good sister. Keep protecting her.",
        score: 'fort',
        good: false,
        effect: { victoriaPoint: -1 },
        next: 'combat_fort',
      },
      {
        text: "Mitzi asked to act. Honor that.",
        score: 'fort',
        good: true,
        effect: { victoriaPoint: 1 },
        next: 'combat_fort',
      },
    ],
  },
  fort_mid_a: {
    id: 'fort_mid_a',
    bg: 'fort',
    speaker: 'victoria',
    lines: ["I saw her flinch. I'll take the next hit for her."],
    choices: [
      {
        text: "Ask Mitzi if she wants the cover — don't assume.",
        score: 'fort',
        good: true,
        effect: { victoriaPoint: 1 },
        next: 'fort_continue',
      },
      {
        text: "Let Victoria intercept. Safer.",
        score: 'fort',
        good: false,
        effect: { victoriaPoint: -1 },
        next: 'fort_continue',
      },
    ],
  },
  fort_mid_b: {
    id: 'fort_mid_b',
    bg: 'fort',
    speaker: 'alice',
    lines: ["Victoria's spear never lowers. Even when the hall is empty."],
    choices: [
      {
        text: "What would you want, if Mitzi weren't watching?",
        score: 'fort',
        good: true,
        effect: { victoriaPoint: 1 },
        next: 'fort_continue',
      },
      {
        text: "Stay focused. Sentiment gets people killed.",
        score: 'fort',
        good: false,
        effect: { victoriaPoint: -1 },
        next: 'fort_continue',
      },
      {
        text: "Share a quiet story from above ground — life beyond duty.",
        score: 'fort',
        good: true,
        effect: { victoriaPoint: 1 },
        next: 'fort_continue',
      },
    ],
  },
  fort_clear: {
    id: 'fort_clear',
    bg: 'fort',
    speaker: 'narrator',
    lines: [
      'The fort\'s gates sag open. Somewhere Victoria\'s grip loosens — or tightens.',
      'Depending on your words, she will either shield, step back, or keep stealing Mitzi\'s turns.',
    ],
    next: 'town_after_fort',
  },

  // --- Ruins + Hestia ---
  ruins_intro: {
    id: 'ruins_intro',
    bg: 'ruins',
    speaker: 'hestia',
    lines: [
      "Children. Lost lambs. I am Hestia — keeper of Gehenna's gentle gospel.",
      "The White Ox watches the unworthy. Stay. Convert. Rest from sin.",
      "I'll guide you through the Ruins. They punish the proud.",
    ],
    next: 'ruins_join',
  },
  ruins_join: {
    id: 'ruins_join',
    bg: 'ruins',
    speaker: 'alice',
    lines: ["She smiles like a locked door. Do we trust her?"],
    choices: [
      {
        text: "Smile back — but count her steps. Something's off.",
        score: 'ruins',
        good: true,
        effect: { hestiaSus: 1 },
        next: 'combat_ruins',
      },
      {
        text: "Thank her. Faith has kept this city standing.",
        score: 'ruins',
        good: false,
        effect: { hestiaSus: -1 },
        next: 'combat_ruins',
      },
    ],
  },
  ruins_mid_a: {
    id: 'ruins_mid_a',
    bg: 'ruins',
    speaker: 'hestia',
    lines: ["Mass is mercy. Those who join us feel lighter each week. Isn't that proof?"],
    choices: [
      {
        text: "Lighter — or emptied? Who benefits from tired flocks?",
        score: 'ruins',
        good: true,
        effect: { hestiaSus: 1 },
        next: 'ruins_continue',
      },
      {
        text: "If it eases pain, maybe that's enough.",
        score: 'ruins',
        good: false,
        effect: { hestiaSus: -1 },
        next: 'ruins_continue',
      },
    ],
  },
  ruins_mid_b: {
    id: 'ruins_mid_b',
    bg: 'ruins',
    speaker: 'charon',
    portrait: 'charon',
    lines: [
      "(Charon's voice, remembered) She knows the truth of this place. Ask better questions.",
    ],
    choices: [
      {
        text: "Hestia — why do your eyes avoid the dark corners?",
        score: 'ruins',
        good: true,
        effect: { hestiaSus: 1 },
        next: 'ruins_continue',
      },
      {
        text: "Lead on. We need your blessing.",
        score: 'ruins',
        good: false,
        effect: { hestiaSus: -1 },
        next: 'ruins_continue',
      },
    ],
  },
  ruins_trap: {
    id: 'ruins_trap',
    bg: 'ruins',
    speaker: 'hestia',
    lines: [
      "That chamber. Sacred relics. You should look alone, Alice — the Ox favors the curious.",
    ],
    choices: [
      {
        text: "No. We go together — or not at all. Your urgency is a tell.",
        score: 'ruins',
        good: true,
        effect: { hestiaSus: 1 },
        next: 'ruins_trap_result',
      },
      {
        text: "Alright. I'll check it.",
        score: 'ruins',
        good: false,
        effect: { hestiaSus: -1 },
        next: 'ruins_trap_result',
      },
    ],
  },
  ruins_trap_result: {
    id: 'ruins_trap_result',
    bg: 'ruins',
    speaker: 'narrator',
    lines: [
      'Wires. Needles. A prayer carved into the trigger plate.',
      'Alice reels back — pain blooms white across one eye. Cloth becomes an eyepatch.',
      "Hestia's face is pity. Or rehearsal.",
    ],
    effect: { aliceEyepatch: true },
    next: 'combat_ruins_boss',
  },
  ruins_clear: {
    id: 'ruins_clear',
    bg: 'ruins',
    speaker: 'hestia',
    lines: [
      "You survived. Good. The Manor will host our final communion.",
      "Rest in Gehenna tonight. Tomorrow the Ox opens its gate.",
    ],
    next: 'town_night',
  },

  // --- Final night ---
  night_menu: {
    id: 'night_menu',
    bg: 'town',
    speaker: 'narrator',
    lines: [
      'Last night at the Inn. Doors soft with candle smoke.',
      'You may speak to someone — words can still bend endings.',
    ],
    choices: [
      { text: 'Talk to Mitzi', next: 'night_mitzi' },
      { text: 'Talk to Victoria', next: 'night_victoria' },
      { text: 'Talk to Charon', next: 'night_charon' },
      { text: 'Talk to Hestia', next: 'night_hestia' },
      { text: 'Rest without talk', next: 'manor_intro' },
    ],
  },
  night_mitzi: {
    id: 'night_mitzi',
    bg: 'town',
    speaker: 'mitzi',
    lines: ["You're staring. Do I have ash on my face still?"],
    choices: [
      {
        text: "You're allowed to want a life that isn't Victoria's shadow.",
        good: true,
        effect: { redeemMitzi: true },
        next: 'manor_intro',
      },
      {
        text: "Thanks for hitting things. Sleep well.",
        good: false,
        next: 'manor_intro',
      },
    ],
  },
  night_victoria: {
    id: 'night_victoria',
    bg: 'town',
    speaker: 'victoria',
    lines: ["(She turns a glass, empty, like a confession.) Mitzi's asleep."],
    choices: [
      {
        text: "Love her enough to let go a little. Live one hour for yourself.",
        good: true,
        effect: { redeemVictoria: true },
        next: 'manor_intro',
      },
      {
        text: "She's lucky to have you.",
        good: false,
        next: 'manor_intro',
      },
    ],
  },
  night_charon: {
    id: 'night_charon',
    bg: 'town',
    speaker: 'charon',
    lines: [
      "Still think you're sightseeing? This is the underground. Hell with municipal services.",
      "Heaven's a door for people who finish their unfinished business.",
      "Hestia isn't a shepherd. She's a drought wearing vestments.",
    ],
    choices: [
      {
        text: "I hear you. I'll finish this without becoming her flock.",
        good: true,
        effect: { redeemCharon: true },
        next: 'manor_intro',
      },
      {
        text: "You're just trolling. Everyone says so.",
        good: false,
        next: 'manor_intro',
      },
    ],
  },
  night_hestia: {
    id: 'night_hestia',
    bg: 'town',
    speaker: 'hestia',
    lines: [
      "Come to mass after you win. Or before you lose. The Ox is patient.",
    ],
    choices: [
      {
        text: "I know what you drain from them. I won't kneel.",
        good: true,
        effect: { redeemHestia: true },
        next: 'manor_intro',
      },
      {
        text: "Maybe peace is worth the price.",
        good: false,
        effect: { hestiaNightFail: true },
        next: 'manor_intro',
      },
      {
        text: "What are you, really?",
        good: true,
        effect: { redeemHestiaMaybe: true },
        next: 'manor_intro',
      },
    ],
  },

  manor_intro: {
    id: 'manor_intro',
    bg: 'manor',
    speaker: 'narrator',
    lines: [
      'The Manor breathes incense and animal heat.',
      'Hestia\'s habit looks whiter than bone. Somewhere a bell answers itself.',
      'The White Ox opens the floor.',
    ],
    next: 'combat_manor',
  },

  post_ox: {
    id: 'post_ox',
    bg: 'manor',
    speaker: 'hestia',
    angry: true,
    lines: [
      "You— little clockwork thing — you don't deserve sky.",
      "You already failed above. Stay. Kneel. Be emptied properly.",
    ],
    choices: [
      {
        text: "Mitzi, Victoria — your lives are yours. Walk out without me if you must.",
        effect: { endingPush: 'alice_good' },
        next: 'ending_resolve',
      },
      {
        text: "We settle in Gehenna. Better the known dark.",
        effect: { endingPush: 'bad' },
        next: 'ending_resolve',
      },
      {
        text: "Charon was right. We're dead until we change.",
        effect: { endingPush: 'alice_good' },
        next: 'ending_resolve',
      },
    ],
  },
};

export function getDialog(id) {
  return DIALOGS[id] || null;
}
