/**
 * GIF89a, both ways: an encoder for animated exports and a decoder so
 * animated GIFs (like the ones in references/Art) open as frames.
 */
import { pack } from './color.js';
import { medianCut, nearest } from './palette.js';

// ─── encoder ───────────────────────────────────────────────────────────────

class Bytes {
  constructor() {
    this.buf = new Uint8Array(1 << 16);
    this.n = 0;
  }
  byte(b) {
    if (this.n >= this.buf.length) {
      const nb = new Uint8Array(this.buf.length * 2);
      nb.set(this.buf);
      this.buf = nb;
    }
    this.buf[this.n++] = b;
  }
  word(w) {
    this.byte(w & 255);
    this.byte((w >> 8) & 255);
  }
  bytes(arr) {
    for (const b of arr) this.byte(b);
  }
  str(s) {
    for (let i = 0; i < s.length; i++) this.byte(s.charCodeAt(i));
  }
  result() {
    return this.buf.slice(0, this.n);
  }
}

function lzwEncode(indices, minCode, out) {
  const clear = 1 << minCode;
  const eoi = clear + 1;
  let size = minCode + 1;
  let next = eoi + 1;
  let dict = new Map();
  let acc = 0;
  let bits = 0;
  const block = [];
  const emit = (code) => {
    acc |= code << bits;
    bits += size;
    while (bits >= 8) {
      block.push(acc & 255);
      acc >>>= 8;
      bits -= 8;
      if (block.length === 255) {
        out.byte(255);
        out.bytes(block);
        block.length = 0;
      }
    }
  };
  emit(clear);
  let prefix = indices[0];
  for (let i = 1; i < indices.length; i++) {
    const k = indices[i];
    const key = prefix * 256 + k;
    const hit = dict.get(key);
    if (hit !== undefined) {
      prefix = hit;
      continue;
    }
    emit(prefix);
    if (next < 4096) {
      dict.set(key, next++);
      if (next > 1 << size && size < 12) size++;
    } else {
      emit(clear);
      dict = new Map();
      size = minCode + 1;
      next = eoi + 1;
    }
    prefix = k;
  }
  emit(prefix);
  emit(eoi);
  if (bits > 0) block.push(acc & 255);
  if (block.length) {
    out.byte(block.length);
    out.bytes(block);
  }
  out.byte(0);
}

/**
 * frames: [{ data: Uint32Array (w*h packed colours), delay: ms }]
 * Pixels with alpha < 128 become transparent. More than 255 colours are
 * reduced by median cut.
 */
export function encodeGif(w, h, frames, { loop = 0 } = {}) {
  const counts = new Map();
  let transparent = false;
  for (const f of frames) {
    for (let i = 0; i < f.data.length; i++) {
      const c = f.data[i];
      if (c >>> 24 < 128) {
        transparent = true;
        continue;
      }
      const o = (c & 0xffffff) | 0xff000000;
      counts.set(o >>> 0, (counts.get(o >>> 0) || 0) + 1);
    }
  }
  const maxColors = transparent ? 255 : 256;
  let pal = [...counts.keys()];
  let exact = true;
  if (pal.length > maxColors) {
    pal = medianCut(counts, maxColors);
    exact = false;
  }
  const tIndex = transparent ? pal.length : -1;
  const total = pal.length + (transparent ? 1 : 0);
  let bits = 1;
  while (1 << bits < total) bits++;
  const lookup = new Map();
  if (exact) pal.forEach((c, i) => lookup.set(c, i));

  const out = new Bytes();
  out.str('GIF89a');
  out.word(w);
  out.word(h);
  out.byte(0x80 | ((bits - 1) << 4) | (bits - 1)); // global colour table
  out.byte(0); // background index
  out.byte(0); // aspect
  for (let i = 0; i < 1 << bits; i++) {
    const c = pal[i] || 0;
    out.byte(c & 255);
    out.byte((c >>> 8) & 255);
    out.byte((c >>> 16) & 255);
  }
  if (frames.length > 1) {
    out.bytes([0x21, 0xff, 11]);
    out.str('NETSCAPE2.0');
    out.bytes([3, 1, loop & 255, (loop >> 8) & 255, 0]);
  }
  const minCode = Math.max(2, bits);
  for (const f of frames) {
    const delay = Math.max(2, Math.round((f.delay || 100) / 10));
    out.bytes([0x21, 0xf9, 4]);
    // disposal 2 (clear to background) so transparent areas don't show the last frame
    out.byte(((transparent ? 2 : 1) << 2) | (transparent ? 1 : 0));
    out.word(delay);
    out.byte(transparent ? tIndex : 0);
    out.byte(0);
    out.byte(0x2c);
    out.word(0);
    out.word(0);
    out.word(w);
    out.word(h);
    out.byte(0);
    const idx = new Uint8Array(w * h);
    for (let i = 0; i < idx.length; i++) {
      const c = f.data[i];
      if (c >>> 24 < 128) {
        idx[i] = tIndex;
        continue;
      }
      const o = ((c & 0xffffff) | 0xff000000) >>> 0;
      let k = lookup.get(o);
      if (k === undefined) {
        k = nearest(pal, o);
        lookup.set(o, k);
      }
      idx[i] = k;
    }
    out.byte(minCode);
    lzwEncode(idx, minCode, out);
  }
  out.byte(0x3b);
  return out.result();
}

// ─── decoder ───────────────────────────────────────────────────────────────

function lzwDecode(data, minCode, count) {
  const out = new Uint8Array(count);
  const clear = 1 << minCode;
  const eoi = clear + 1;
  let size = minCode + 1;
  let next = eoi + 1;
  const prefix = new Int16Array(4096);
  const suffix = new Uint8Array(4096);
  const first = new Uint8Array(4096);
  for (let i = 0; i < clear; i++) {
    prefix[i] = -1;
    suffix[i] = i;
    first[i] = i;
  }
  const stack = new Uint8Array(4097);
  let acc = 0;
  let bits = 0;
  let pos = 0;
  let o = 0;
  let prev = -1;
  while (o < count) {
    while (bits < size && pos < data.length) {
      acc |= data[pos++] << bits;
      bits += 8;
    }
    if (bits < size) break;
    const code = acc & ((1 << size) - 1);
    acc >>>= size;
    bits -= size;
    if (code === clear) {
      size = minCode + 1;
      next = eoi + 1;
      prev = -1;
      continue;
    }
    if (code === eoi) break;
    let c = code;
    let sp = 0;
    if (prev < 0) {
      out[o++] = suffix[c];
      prev = c;
      continue;
    }
    if (c >= next) {
      // the KwKwK case: the code being defined right now
      stack[sp++] = first[prev];
      c = prev;
    }
    while (c >= clear) {
      stack[sp++] = suffix[c];
      c = prefix[c];
    }
    stack[sp++] = c;
    const head = c;
    while (sp && o < count) out[o++] = stack[--sp];
    if (next < 4096) {
      prefix[next] = prev;
      suffix[next] = head;
      first[next] = first[prev];
      next++;
      if (next === 1 << size && size < 12) size++;
    }
    prev = code;
  }
  return out;
}

/** Returns { w, h, frames: [{ data: Uint32Array, delay }] } with every frame fully composed. */
export function decodeGif(bytes) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const sig = String.fromCharCode(...b.subarray(0, 6));
  if (sig !== 'GIF87a' && sig !== 'GIF89a') throw new Error('Not a GIF');
  let p = 6;
  const word = () => b[p++] | (b[p++] << 8);
  const w = word();
  const h = word();
  const flags = b[p++];
  p += 2;
  const readTable = (n) => {
    const t = [];
    for (let i = 0; i < n; i++) {
      t.push(pack(b[p], b[p + 1], b[p + 2]));
      p += 3;
    }
    return t;
  };
  const global = flags & 0x80 ? readTable(1 << ((flags & 7) + 1)) : null;
  const frames = [];
  const canvas = new Uint32Array(w * h);
  let gce = { disposal: 0, delay: 100, transparent: -1 };
  const subBlocks = () => {
    const parts = [];
    let len = 0;
    for (;;) {
      const n = b[p++];
      if (!n) break;
      parts.push(b.subarray(p, p + n));
      len += n;
      p += n;
    }
    const all = new Uint8Array(len);
    let o = 0;
    for (const part of parts) {
      all.set(part, o);
      o += part.length;
    }
    return all;
  };
  while (p < b.length) {
    const intro = b[p++];
    if (intro === 0x3b) break;
    if (intro === 0x21) {
      const label = b[p++];
      if (label === 0xf9) {
        p++; // block size (4)
        const f = b[p++];
        const delay = word();
        const t = b[p++];
        p++; // terminator
        gce = { disposal: (f >> 2) & 7, delay: (delay || 10) * 10, transparent: f & 1 ? t : -1 };
      } else {
        subBlocks();
      }
      continue;
    }
    if (intro !== 0x2c) break;
    const fx = word();
    const fy = word();
    const fw = word();
    const fh = word();
    const f = b[p++];
    const table = f & 0x80 ? readTable(1 << ((f & 7) + 1)) : global || [];
    const interlaced = !!(f & 0x40);
    const minCode = b[p++];
    const idx = lzwDecode(subBlocks(), minCode, fw * fh);
    const before = gce.disposal === 3 ? canvas.slice() : null;
    const rows = [];
    if (interlaced) {
      for (const [start, step] of [[0, 8], [4, 8], [2, 4], [1, 2]]) for (let y = start; y < fh; y += step) rows.push(y);
    } else {
      for (let y = 0; y < fh; y++) rows.push(y);
    }
    rows.forEach((row, r) => {
      const ty = fy + row;
      if (ty >= h) return;
      for (let x = 0; x < fw; x++) {
        const tx = fx + x;
        if (tx >= w) continue;
        const k = idx[r * fw + x];
        if (k === gce.transparent) continue;
        canvas[ty * w + tx] = table[k] ?? 0;
      }
    });
    frames.push({ data: canvas.slice(), delay: gce.delay });
    if (gce.disposal === 2) {
      for (let y = fy; y < Math.min(h, fy + fh); y++) canvas.fill(0, y * w + fx, y * w + Math.min(w, fx + fw));
    } else if (before) {
      canvas.set(before);
    }
    gce = { disposal: 0, delay: 100, transparent: -1 };
  }
  return { w, h, frames };
}
