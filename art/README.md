# Extra art

Standalone pixel art of Clockwork's cast and world. None of it is used by the game.

| Folder | What |
| --- | --- |
| `portraits/` | Alice, Mitzi, Victoria, Hestia and Charon, each with a backdrop from the game. 96×96 originals and 768×768 (8×) copies, as PNG and Paint Shop Pro (`.psp`). `cast_lineup.png` shows all five. The `_transparent` files are the same portraits without the background. |
| `portraits64/` | Alice, Hestia and Charon at 64×64, drawn to match Mitzi's and Victoria's reference portraits (`references/Art`): the faces are those portraits' own pixels, with hair, headwear and clothes painted around them. Transparent PNGs, 8× copies and `.psp` files. `cast_lineup.png` shows them beside Mitzi and Victoria. |
| `watch/` | *Through the Watch*: Alice falling through the pocket watch into Gehenna. 128×128 and 1024×1024 (8×) as PNG and `.psp`, plus a looping animated GIF. |
| `src/` | The Python scripts that draw all of the above, and the PSP converter. |

## Redrawing

The scripts need Python 3 and Pillow. Each one writes its PNGs, with and without the background, into the folder you give it:

```bash
python3 art/src/hestia.py art/portraits
python3 art/src/watch.py art/watch
python3 art/src/portraits64.py art/portraits64
```

The portrait scripts share `pix.py` (drawing primitives) and `bust.py` (faces, eyes and hair). To make Paint Shop Pro copies of any PNGs (transparency is kept):

```bash
python3 art/src/to_psp.py art/portraits art/portraits/hestia_portrait.png
```
