/**
 * Paint Shop Pro (.psp) writer: the same layout as art/src/to_psp.py
 * (PSP 6, file format 4.0, which later versions also open), extended to keep
 * the Studio's layers, their names, opacity and visibility.
 *
 *   32-byte signature, version, then blocks:
 *     General Image Attributes block
 *     Layer Start block, holding one Layer block per layer (bottom first):
 *       layer info chunk, bitmap count chunk, then uncompressed channel
 *       blocks for red, green, blue and the transparency mask.
 * Every value is little-endian.
 */

const SIGNATURE = 'Paint Shop Pro Image File\n\x1a';
const IMAGE_BLOCK = 0;
const LAYER_START_BLOCK = 3;
const LAYER_BLOCK = 4;
const CHANNEL_BLOCK = 5;
const LAYER_RASTER = 1;
const RASTER_CONTENT = 1;
const BITMAP_IMAGE = 0;
const BITMAP_TRANS_MASK = 1;

class Writer {
  constructor() {
    this.parts = [];
    this.length = 0;
  }
  push(u8) {
    this.parts.push(u8);
    this.length += u8.length;
  }
  bytes() {
    const out = new Uint8Array(this.length);
    let o = 0;
    for (const p of this.parts) {
      out.set(p, o);
      o += p.length;
    }
    return out;
  }
}

/** Little-endian struct packing from a list of [type, value]: B H I i d. */
function struct(fields) {
  const size = { B: 1, H: 2, I: 4, i: 4, d: 8 };
  const n = fields.reduce((s, [t]) => s + size[t], 0);
  const buf = new Uint8Array(n);
  const dv = new DataView(buf.buffer);
  let o = 0;
  for (const [t, v] of fields) {
    if (t === 'B') dv.setUint8(o, v);
    else if (t === 'H') dv.setUint16(o, v, true);
    else if (t === 'I') dv.setUint32(o, v >>> 0, true);
    else if (t === 'i') dv.setInt32(o, v, true);
    else if (t === 'd') dv.setFloat64(o, v, true);
    o += size[t];
  }
  return buf;
}

function concat(...arrs) {
  const w = new Writer();
  for (const a of arrs) w.push(a);
  return w.bytes();
}

const ascii = (s) => Uint8Array.from(s, (c) => c.charCodeAt(0) & 0x7f);

/** A block: '~BK\0', WORD id, DWORD length of what follows, payload. */
function block(id, payload) {
  return concat(ascii('~BK\0'), struct([['H', id], ['I', payload.length]]), payload);
}

/** A chunk starts with a DWORD giving its own size, that DWORD included. */
function chunk(body) {
  return concat(struct([['I', body.length + 4]]), body);
}

function imageAttributes(w, h, layers, active) {
  return chunk(
    struct([
      ['i', w],
      ['i', h],
      ['d', 72],
      ['B', 1], // resolution metric: pixels per inch
      ['H', 0], // no compression
      ['H', 24], // bit depth
      ['H', 1], // planes
      ['I', 1 << 24], // colour count
      ['B', 0], // greyscale
      ['I', w * h * 3], // total image size
      ['i', active],
      ['H', layers],
      ['I', RASTER_CONTENT],
    ]),
  );
}

/** Channel planes, row by row, each row padded to 4 bytes (uncompressed rows are). */
function planes(cel, w, h) {
  const stride = w + ((4 - (w % 4)) % 4);
  const out = [0, 1, 2, 3].map(() => new Uint8Array(stride * h));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const c = cel[y * w + x];
      const o = y * stride + x;
      out[0][o] = c & 255;
      out[1][o] = (c >>> 8) & 255;
      out[2][o] = (c >>> 16) & 255;
      out[3][o] = c >>> 24;
    }
  }
  return out;
}

function layerBlock(name, w, h, cel, { opacity = 1, visible = true } = {}) {
  const nameB = ascii(name.replace(/[^\x20-\x7e]/g, '?').slice(0, 255));
  const rect = struct([['i', 0], ['i', 0], ['i', w], ['i', h]]);
  const empty = struct([['i', 0], ['i', 0], ['i', 0], ['i', 0]]);
  const ranges = new Uint8Array(20);
  for (let i = 0; i < 5; i++) ranges.set([0, 0, 255, 255], i * 4);
  const info = chunk(
    concat(
      struct([['H', nameB.length]]),
      nameB,
      struct([['B', LAYER_RASTER]]),
      rect,
      rect,
      struct([
        ['B', Math.round(Math.max(0, Math.min(1, opacity)) * 255)],
        ['B', 0], // normal blend
        ['B', visible ? 1 : 0],
        ['B', 0], // transparency protected
        ['B', 0], // link group
      ]),
      empty,
      empty,
      struct([['B', 0], ['B', 0], ['B', 0], ['H', 5]]),
      ranges,
      ranges,
    ),
  );
  const [r, g, b, a] = planes(cel, w, h);
  const bitmaps = chunk(struct([['H', 2], ['H', 4]]));
  const channel = (plane, bitmapType, channelType) =>
    block(CHANNEL_BLOCK, concat(chunk(struct([['I', plane.length], ['I', plane.length], ['H', bitmapType], ['H', channelType]])), plane));
  return block(
    LAYER_BLOCK,
    concat(info, bitmaps, channel(r, BITMAP_IMAGE, 1), channel(g, BITMAP_IMAGE, 2), channel(b, BITMAP_IMAGE, 3), channel(a, BITMAP_TRANS_MASK, 0)),
  );
}

/**
 * layers: [{ name, cel, opacity, visible }], bottom first.
 * Returns the .psp file as a Uint8Array.
 */
export function encodePsp(w, h, layers, activeIndex = layers.length - 1) {
  const sig = new Uint8Array(32);
  sig.set(ascii(SIGNATURE));
  return concat(
    sig,
    struct([['H', 4], ['H', 0]]),
    block(IMAGE_BLOCK, imageAttributes(w, h, layers.length, Math.max(0, activeIndex))),
    block(LAYER_START_BLOCK, concat(...layers.map((l) => layerBlock(l.name, w, h, l.cel, l)))),
  );
}
