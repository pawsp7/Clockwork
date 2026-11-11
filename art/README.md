# Extra art

Standalone pixel art of Clockwork's cast and world. None of it is used by the game.

| Folder | What |
| --- | --- |
| `portraits/` | Alice, Mitzi, Victoria, Hestia and Charon, each with a backdrop from the game. 96×96 originals and 768×768 (8×) copies, as PNG and Paint Shop Pro (`.psp`). `cast_lineup.png` shows all five. |
| `watch/` | *Through the Watch*: Alice falling through the pocket watch into Gehenna. 128×128 and 1024×1024 (8×) as PNG and `.psp`, plus a looping animated GIF. |
| `src/` | The Python scripts that draw all of the above, and the PSP converter. |

## Redrawing

The scripts need Python 3 and Pillow. Each one writes its PNGs into the folder you give it:

```bash
python3 art/src/hestia.py art/portraits
python3 art/src/watch.py art/watch
```

The portrait scripts share `pix.py` (drawing primitives) and `bust.py` (faces, eyes and hair). To make Paint Shop Pro copies of any PNGs:

```bash
python3 art/src/to_psp.py art/portraits art/portraits/hestia_portrait.png
```
