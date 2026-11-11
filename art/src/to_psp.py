"""Write PNG images as Paint Shop Pro (.psp) files.

Paint Shop Pro 6 layout (format version 4.0), which later versions also open:
  32-byte signature, version, then blocks:
    General Image Attributes block
    Layer Start block
      Layer block ("Background"): layer info, bitmap info, then one
      uncompressed channel block each for red, green and blue.
All values little-endian.
Usage: python3 to_psp.py OUT_DIR image.png [image.png ...]
"""
import os
import struct
import sys
from PIL import Image

SIGNATURE = b"Paint Shop Pro Image File\n\x1a".ljust(32, b"\0")
MAJOR, MINOR = 4, 0

IMAGE_BLOCK, LAYER_START_BLOCK, LAYER_BLOCK, CHANNEL_BLOCK = 0, 3, 4, 5
COMP_NONE = 0
LAYER_RASTER = 1          # keGLTRaster
VISIBLE = 0x1             # layer flags
RASTER_CONTENT = 0x1      # graphic contents: raster layers
CHANNEL_RED, CHANNEL_GREEN, CHANNEL_BLUE = 1, 2, 3
BITMAP_IMAGE = 0


def block(block_id, payload):
    """A block: '~BK\\0', WORD id, DWORD length of what follows, payload."""
    return b"~BK\0" + struct.pack("<HI", block_id, len(payload)) + payload


def chunk(body):
    """A chunk starts with a DWORD giving its own size, that DWORD included."""
    return struct.pack("<I", len(body) + 4) + body


def image_attributes(w, h, layers=1):
    return chunk(struct.pack(
        "<iidBHHHIBIiHI",
        w, h,
        72.0, 1,                 # resolution, metric: pixels per inch
        COMP_NONE,
        24,                      # bit depth
        1,                       # plane count
        1 << 24,                 # colour count
        0,                       # greyscale flag
        w * h * 3,               # total image size
        0,                       # active layer
        layers,
        RASTER_CONTENT,
    ))


def layer(name, w, h, rgb_planes):
    name_b = name.encode("ascii")
    rect = struct.pack("<iiii", 0, 0, w, h)
    empty = struct.pack("<iiii", 0, 0, 0, 0)
    blend = bytes([0, 0, 255, 255]) * 5          # five full-range blend ranges
    info = chunk(
        struct.pack("<H", len(name_b)) + name_b
        + struct.pack("<B", LAYER_RASTER)
        + rect + rect                            # image rect, saved image rect
        + struct.pack("<BBBBB", 255, 0, VISIBLE, 0, 0)   # opacity, normal blend, flags, protect, link
        + empty + empty                          # mask rect, saved mask rect
        + struct.pack("<BBBH", 0, 0, 0, 5)       # mask linked/disabled/invert, range count
        + blend + blend                          # source and destination ranges
    )
    bitmaps = chunk(struct.pack("<HH", 1, 3))    # one bitmap, three channels
    channels = b""
    for ctype, plane in zip((CHANNEL_RED, CHANNEL_GREEN, CHANNEL_BLUE), rgb_planes):
        hdr = chunk(struct.pack("<IIHH", len(plane), len(plane), BITMAP_IMAGE, ctype))
        channels += block(CHANNEL_BLOCK, hdr + plane)
    return block(LAYER_BLOCK, info + bitmaps + channels)


def planes(im):
    """Channel planes, row by row. Uncompressed rows are padded to 4 bytes."""
    w, h = im.size
    pad = (4 - w % 4) % 4
    out = []
    for band in im.split():
        data = band.tobytes()
        if pad:
            data = b"".join(data[y * w:(y + 1) * w] + b"\0" * pad for y in range(h))
        out.append(data)
    return out


def to_psp(png_path, psp_path):
    im = Image.open(png_path).convert("RGB")
    w, h = im.size
    body = (SIGNATURE + struct.pack("<HH", MAJOR, MINOR)
            + block(IMAGE_BLOCK, image_attributes(w, h))
            + block(LAYER_START_BLOCK, layer("Background", w, h, planes(im))))
    with open(psp_path, "wb") as f:
        f.write(body)
    return w, h, len(body)


if __name__ == "__main__":
    out_dir = sys.argv[1]
    os.makedirs(out_dir, exist_ok=True)
    for src in sys.argv[2:]:
        dst = os.path.join(out_dir, os.path.splitext(os.path.basename(src))[0] + ".psp")
        w, h, n = to_psp(src, dst)
        print(f"{dst}  {w}x{h}  {n} bytes")
