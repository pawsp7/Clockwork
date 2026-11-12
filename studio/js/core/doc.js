/**
 * The document: a stack of layers over a strip of frames. Every layer holds
 * one cel (a w×h Uint32Array of packed colours) per frame.
 */
import { over, fromHex, toHex } from './color.js';

let nextId = 1;
export const newId = () => nextId++;

export function createLayer(name, w, h, frames, fill = 0) {
  return {
    id: newId(),
    name,
    visible: true,
    locked: false,
    opacity: 1,
    cels: Array.from({ length: frames }, () => {
      const c = new Uint32Array(w * h);
      if (fill) c.fill(fill);
      return c;
    }),
  };
}

export function createDoc(w, h, { name = 'untitled', frames = 1, palette = [], background = 0 } = {}) {
  return {
    name,
    w,
    h,
    frames: Array.from({ length: frames }, () => ({ duration: 100 })),
    layers: [createLayer(background ? 'Background' : 'Layer 1', w, h, frames, background)],
    palette: palette.slice(),
  };
}

export function cloneLayer(l, keepId = true) {
  return { ...l, id: keepId ? l.id : newId(), cels: l.cels.map((c) => c.slice()) };
}

export function cloneDoc(doc) {
  return {
    ...doc,
    frames: doc.frames.map((f) => ({ ...f })),
    layers: doc.layers.map((l) => cloneLayer(l)),
    palette: doc.palette.slice(),
  };
}

/**
 * Flatten one frame into `out`. `celFor(layer, index)` can swap in a cel (the
 * editor uses it to show a floating selection). Hidden layers are skipped.
 */
export function compositeFrame(doc, frame, out = new Uint32Array(doc.w * doc.h), celFor = null, onlyVisible = true) {
  out.fill(0);
  let first = true;
  for (let li = 0; li < doc.layers.length; li++) {
    const layer = doc.layers[li];
    if (onlyVisible && !layer.visible) continue;
    const cel = celFor ? celFor(layer, li) : layer.cels[frame];
    if (!cel) continue;
    const op = layer.opacity;
    if (first && op >= 1) {
      out.set(cel);
      first = false;
      continue;
    }
    first = false;
    for (let i = 0; i < out.length; i++) {
      const s = cel[i];
      if (s === 0) continue;
      out[i] = op >= 1 && s >>> 24 === 255 ? s : over(out[i], s, op);
    }
  }
  return out;
}

// ─── save files ────────────────────────────────────────────────────────────
// A project is JSON. Each cel is run-length encoded ([count, colour] pairs of
// uint32) and base64'd: pixel art is mostly long runs, transparency above all.

export const FORMAT = 'clockwork-studio';

function rle(cel) {
  const out = [];
  let i = 0;
  while (i < cel.length) {
    const v = cel[i];
    let n = 1;
    while (i + n < cel.length && cel[i + n] === v) n++;
    out.push(n, v);
    i += n;
  }
  return new Uint32Array(out);
}

function unrle(pairs, length) {
  const out = new Uint32Array(length);
  let o = 0;
  for (let i = 0; i + 1 < pairs.length && o < length; i += 2) {
    out.fill(pairs[i + 1], o, Math.min(length, o + pairs[i]));
    o += pairs[i];
  }
  return out;
}

export function bytesToBase64(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

export function base64ToBytes(b64) {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

function u32ToBytes(u32) {
  // explicit little-endian so files are portable whatever the machine
  const b = new Uint8Array(u32.length * 4);
  const dv = new DataView(b.buffer);
  for (let i = 0; i < u32.length; i++) dv.setUint32(i * 4, u32[i], true);
  return b;
}

function bytesToU32(b) {
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const out = new Uint32Array(b.length >> 2);
  for (let i = 0; i < out.length; i++) out[i] = dv.getUint32(i * 4, true);
  return out;
}

export function serialize(doc) {
  return {
    format: FORMAT,
    version: 1,
    name: doc.name,
    width: doc.w,
    height: doc.h,
    palette: doc.palette.map((c) => toHex(c)),
    frames: doc.frames.map((f) => ({ duration: f.duration })),
    layers: doc.layers.map((l) => ({
      name: l.name,
      visible: l.visible,
      locked: l.locked,
      opacity: l.opacity,
      cels: l.cels.map((c) => bytesToBase64(u32ToBytes(rle(c)))),
    })),
  };
}

export function deserialize(obj) {
  if (!obj || obj.format !== FORMAT) throw new Error('Not a Clockwork Studio project');
  const w = obj.width | 0;
  const h = obj.height | 0;
  if (w < 1 || h < 1 || w > 4096 || h > 4096) throw new Error('Bad canvas size');
  const frames = (obj.frames || [{ duration: 100 }]).map((f) => ({ duration: Math.max(10, f.duration | 0 || 100) }));
  const layers = (obj.layers || []).map((l) => ({
    id: newId(),
    name: String(l.name || 'Layer'),
    visible: l.visible !== false,
    locked: !!l.locked,
    opacity: Math.max(0, Math.min(1, l.opacity == null ? 1 : +l.opacity)),
    cels: frames.map((_, i) => (l.cels && l.cels[i] ? unrle(bytesToU32(base64ToBytes(l.cels[i])), w * h) : new Uint32Array(w * h))),
  }));
  if (!layers.length) layers.push(createLayer('Layer 1', w, h, frames.length));
  return {
    name: String(obj.name || 'untitled'),
    w,
    h,
    frames,
    layers,
    palette: (obj.palette || []).map(fromHex).filter((c) => c != null),
  };
}
