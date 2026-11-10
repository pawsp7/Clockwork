# Clockwork

*A dim pixel-art RPG set in Gehenna, the underground afterlife.*

Alice finds an old pocket watch in a drawer of broken things. One evening it opens by itself, and she falls through it into **Gehenna**, a town under a sky of stone where milk is the export, faith is the import, and nobody believes Charon when she says they're all dead. Two sisters (Victoria, who never lets go, and Mitzi, who never has to) walk the road with her. Hestia, keeper of the White Ox gospel, waits at the end of it.

## Play

**GitHub Pages:** <https://pawsp7.github.io/Clockwork/>

Or run it locally (ES modules need a server, not `file://`):

```bash
npm start
```

Then open <http://localhost:4173>.

Everything is self-contained: no build step, no dependencies, fonts are bundled, and the music and sound effects are synthesized live.

## How it plays

**The watch.** Each round Alice can glimpse one enemy's next move (two once her watch is reforged to level 3): *Attack*, *Guard*, *Idle* and, for bigger things, *Summon*, *Sweep* or *Toll*.

**Everyone acts.** Give each party member an order and a target:

| Order | What happens |
| --- | --- |
| **Strike** | Damage the target. If it attacks this round, you trade blows. If it guards, the strike is wasted. |
| **Guard** | If the target attacks, nothing gets through, except the extra from your own weakness. |
| **Study** | Mitzi notes one feature: eye colour, body shape or limb count. |
| **Item** | Salves, Panacea, Smelling Salts. |

**The cart.** Attacks nobody engaged hit your **supplies** instead, one blow at a time. Supplies also drain by one per traveller for every step and every battle. You leave town with 100. At zero, the party falls.

**Elements.** Water beats Fire, Fire beats Earth, Earth beats Electric, Electric beats Water. Imbuing a strike with a gem costs mana, and using an element leaves the user *exposed* to its counter for the next round. That applies to enemies too.

**The notebook.** There are 36 creatures, one for every eye/shape/limb combination. They start as shadows. Whatever you see a creature do is written next to every feature you know. When the notes for an enemy's known features agree, the notebook predicts its attack, and the watch shows the prediction. Learn all three features and that species is named on sight forever after.

**Gehenna.** Rest at the **Inn** to recover and let the story move on. Hire mercenaries and take odd jobs at the **Pub**: mingle for new faces, bargain at your peril, and finish a job if you took someone on a free trial. Reforge weapons, buy gems, widen bracelets and craft armour at the **Smithy**. Buy remedies (and unsolicited advice) at Charon's **Clinic**.

## The road

1. **Prologue**: two thugs, a tutorial in reading the future.
2. **Dead Woods**: Mitzi won't fight. How you talk to her decides when she learns to study.
3. **The Caldera**: Mitzi swings a hammer. Your words set her strength for the rest of the game. Alice's hair doesn't survive.
4. **Abandoned Fort**: Victoria keeps stepping in front of her sister. Your answers decide whether she keeps doing it, stops, or learns to help.
5. **The Ruins**: Hestia guides you, listening to your orders less and less. Were you suspicious enough? Alice's eye pays for it either way.
6. **The last night & the Manor**: one conversation to change a mind, then the White Ox.

Endings are composed from every arc: Alice's fate, each sister's, a word from Charon, and the Ox.

## Controls

- **Mouse**: everything is clickable.
- **Enter / Space**: advance dialogue, end the turn, continue.
- **1–9**: choose dialogue options, combat orders and targets.
- **Tab**: next party member in combat.
- **P / N / M**: Party, Notebook, Map (in town and on the trail).
- **L**: dialogue backlog. **Esc**: close panels.

The game saves itself in town and whenever you set out. If the party falls, the watch can rewind you to the morning you left.

## Development

```bash
npm test          # rules, story wiring, and full headless playthroughs (good / bad / random choices)
npm run sim       # balance: supplies left per dungeon over 20 seeded runs
npm run balance   # per-battle rounds and supply loss
```

```
js/
  core/     rng, procedural audio
  data/     heroes, monsters (36 + bosses), items, dungeons
  game/     pure rules: combat, notebook, expedition, town, story runner, endings
  story/    the script, every line and branch
  art/      pixel toolkit, sprites, portraits, creatures, painted backdrops, effects
  ui/       app shell, screens, sheets
tests/      node:test suite + a headless driver that can play the whole game
dev/        art preview pages (sprites, portraits, creatures, scenes)
```

The game's rules live in `js/game` and never touch the DOM, so the test suite can play the whole story, from the prologue to the White Ox, under Node.

The original design notes are in [`Clockwork Game Concept.txt`](./Clockwork%20Game%20Concept.txt).
