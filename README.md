# Clockwork

A dim-palette pixel-art RPG set in **Gehenna**, the underground afterlife.

Alice falls below with a pocket watch that can glimpse one enemy intention. Sisters Mitzi and Victoria join her road through woods, volcano, fort, and ruins — while Hestia's White Ox gospel waits at the Manor.

## Play

**GitHub Pages:** [https://pawsp7.github.io/Clockwork/](https://pawsp7.github.io/Clockwork/)

One-time setup (repo owner): **Settings → Pages → Build and deployment → Source:**
- **Deploy from a branch** → Branch `gh-pages` / folder `/` → Save  
  (or choose **GitHub Actions** and re-run the Deploy workflow)

Pushes to `main` refresh the `gh-pages` site automatically.

Or run locally:

```bash
npm start
# → http://localhost:4173
```

Open `index.html` via a static server (ES modules need HTTP, not `file://`).

## Features

- Turn-based combat with Alice's **time vision**, frontline selection, block/attack/study
- **Payload/supplies** loss condition (unblocked hits drain storage)
- Element cycle (Water→Fire→Earth→Electric→Water) and attack types
- Monster **notebook** (eye / shape / limbs) for inference
- Town hubs: Inn, Pub (mercenaries, mingle, bargain), Smithy, Clinic
- Dialog trees that alter Mitzi's study unlock & damage, Victoria's assist/interfere, Hestia's boss boost, and endings
- Detailed dialog portraits + lineless vacant-eyed chibi overworld sprites

## Controls

- Mouse click UI buttons
- Enter / Space advances dialog and commits combat turns
- Number keys 1–9 select dialog choices when shown

## Tests

```bash
npm test
```
