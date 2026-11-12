/**
 * Endings are composed from each arc rather than picked from a short list:
 * Alice's fate, Victoria's, Mitzi's, a word from Charon, and — always — the Ox.
 */

export function arcs(state) {
  const f = state.flags;
  const ruins = state.scores.ruins;
  const mitziGood = f.mitziRedeemed || (f.mitziStudy === 'woods' && f.mitziAtk >= 6);
  const victoriaGood = f.victoriaRedeemed || f.victoriaMode === 'assist';
  const ruinsSharp = ruins.total > 0 && ruins.good / ruins.total >= 0.75 ? 1 : 0;
  const finalBonus = f.finalChoice === 'finish' ? 2 : f.finalChoice === 'free' ? 1 : 0;
  const aliceScore = f.aliceUp + ruinsSharp + finalBonus;
  const alice = f.finalChoice === 'stay' ? 'flock' : aliceScore >= 4 ? 'ascend' : 'linger';
  return { alice, aliceScore, mitziGood, victoriaGood };
}

export function computeEnding(state) {
  const a = arcs(state);
  const f = state.flags;
  const heard = (id) => !!state.talks?.includes(id);
  const cards = [];

  if (a.alice === 'ascend') {
    cards.push({
      art: 'alice_ascend',
      title: 'Alice',
      lines: [
        'The White Ox falls, and the watch in Alice’s hand begins, at last, to tick on its own.',
        'It has been counting all along. Not hours — her. The last of her, spent one blow at a time.',
        'She does not ask for it back.',
        f.eyepatch ? 'In the white light the eyepatch slips away. Both eyes see the door.' : 'In the white light she sees a door.',
        'Alice goes up alone. It is the first thing she has finished in a long time.',
      ],
    });
  } else if (a.alice === 'linger') {
    cards.push({
      art: 'alice_linger',
      title: 'Alice',
      lines: [
        'The White Ox falls. Gehenna’s bells forget their tune.',
        'Alice waits for a door. None opens.',
        'She still wants the way back — the drawer of broken things, the street that never learned her name.',
        'There is no back. There is only up, and up takes letting go.',
        'The watch stops at the minute she arrived. She keeps winding it anyway.',
      ],
    });
  } else {
    cards.push({
      art: 'alice_flock',
      title: 'Alice',
      lines: [
        'The Ox is beaten. Then Alice kneels to it anyway.',
        'Mass is warm. Thoughts grow quiet. Each week she feels a little lighter.',
        'The watch rusts open on her nightstand.',
        'Time forgets her name, and she lets it.',
      ],
    });
  }

  if (a.victoriaGood && a.mitziGood) {
    cards.push({
      art: 'sisters_up',
      title: 'Victoria & Mitzi',
      lines: [
        'Victoria sleeps through a whole night. Then another.',
        'Mitzi learns to cook — badly — and makes her sister breakfast. Pancakes. Victoria eats every bite.',
        'Nobody in Gehenna can say what day it is. Mitzi insists it is a Thursday, and nobody can prove otherwise.',
        f.victoriaBook
          ? 'One morning their room at the Inn is empty, the bed made, a damp soldier’s book about pirates on the pillow. Finished.'
          : 'One morning their room at the Inn is empty, the bed made, a library book on the pillow. Finished.',
        'They went up as two people. Not one person and her shadow.',
      ],
    });
  } else if (a.victoriaGood) {
    cards.push({
      art: 'victoria_up',
      title: 'Victoria',
      lines: [
        'Victoria puts down the glass. She lets Mitzi carry her own flask, her own hammer, her own bad days.',
        f.victoriaBook ? 'She finishes the soldier’s book. Then she simply goes — up, lighter than she has ever been.' : 'One morning she is simply gone — up, lighter than she has ever been.',
        'Mitzi waits by the door for weeks. Nobody comes to do things for her.',
        'Slowly, crossly, she begins to do them herself.',
      ],
    });
  } else if (a.mitziGood) {
    cards.push({
      art: 'mitzi_up',
      title: 'Mitzi',
      lines: [
        'Mitzi starts staying up when Victoria does. She sits. She listens. She doesn’t make it a joke.',
        'It is not enough to loosen her sister’s grip. But it is enough for Mitzi.',
        'She goes up first, crying, proud, her notebook full.',
        'Victoria pours a drink for two and doesn’t touch either.',
      ],
    });
  } else {
    cards.push({
      art: 'sisters_stay',
      title: 'Victoria & Mitzi',
      lines: [
        'The sisters stay, tangled as ever.',
        'Victoria drinks when Mitzi sleeps. Mitzi laughs when Victoria drinks.',
        'They go to mass on Sundays. They feel so much lighter.',
        'The flock grows by two.',
      ],
    });
  }

  // the town remembers whoever you listened to
  if (a.alice !== 'flock') {
    const town = [];
    if (f.rangBell) town.push('In the Ruins, the keepers’ bell rings on the hour again. Nobody admits to climbing up there to ring it. Horace’s knees say otherwise.');
    else if (heard('talk_smith_watch')) town.push('Horace keeps the time in his Smithy, hour after hour, for nobody in particular. He still doesn’t blink.');
    if (heard('talk_pub_brother')) {
      town.push('Bede takes his cart up the Milk Road one last time, empty. He doesn’t stop at the Manor. He keeps going, past the bend.');
      if (f.watHello) town.push('Wat walks beside him, laughing like a dropped crate.');
    }
    if (f.rangBell && heard('talk_church_empty')) town.push('Ruth goes home to shut her garden gate.');
    if (town.length) cards.push({ art: 'gehenna', title: 'Gehenna', lines: [...town, 'Here and there, along the lantern street, people are looking up.'] });
  }

  cards.push({
    art: 'charon',
    title: 'Charon',
    lines:
      a.alice === 'ascend'
        ? [
            'Charon flips a coin she took from Alice on the first day.',
            'On the top shelf, the little jar marked ALICE finally has a year on its label. The ink went on first time.',
            '“Called it,” she tells nobody. Nobody believes her. She doesn’t mind.',
          ]
        : a.alice === 'linger'
          ? ['Charon finds Alice winding a stopped watch on the Inn steps.', '“Still sightseeing?” She sits down beside her anyway. “I’ve got time. Everyone does, here.”']
          : ['Charon watches the new faithful file into the horned church.', '“Every one of them was going somewhere,” she says, and pockets another coin.'],
  });

  cards.push({
    art: 'ox_eyes',
    title: 'The White Ox',
    lines: ['Beneath the Manor, in the white dark, something vast and patient breathes.', 'For the first time, the White Ox opens its eyes.'],
  });

  const title = a.alice === 'ascend' ? 'Clockwork Sky' : a.alice === 'linger' ? 'The Watch Stops' : 'Flock of the White Ox';
  return { title, arcs: a, cards };
}

export const GAME_OVER = {
  supplies: {
    title: 'The Cart Runs Dry',
    lines: ['The last crate splits. The party sits down in the dark and doesn’t get up.', 'The pocket watch ticks once… and waits.'],
  },
  party: {
    title: 'Fallen in Gehenna',
    lines: ['Everyone is down. The beasts are not in a hurry.', 'The pocket watch ticks once… and waits.'],
  },
};
