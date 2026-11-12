/**
 * Everything that changes a document goes through here, so that it lands in
 * the undo history in one piece.
 */
import { app, cur, emit } from './state.js';
import { toast } from './toast.js';
import { cloneDoc, cloneLayer, createLayer, compositeFrame, newId } from '../core/doc.js';
import { diffCels, applyPatch } from '../core/history.js';
import { over } from '../core/color.js';
import {
  flipH,
  flipV,
  rotate90,
  placeCel,
  cropCel,
  scaleCel,
  maskBounds,
  outlineMask,
  matchMask,
} from '../core/raster.js';

// ─── helpers ───────────────────────────────────────────────────────────────

export const layerOf = (s) => s.doc.layers[s.layer];
export const celOf = (s, layer = layerOf(s), frame = s.frame) => layer.cels[frame];
const findLayer = (s, id) => s.doc.layers.find((l) => l.id === id);

export function selContains(sel, x, y) {
  const lx = x - sel.x;
  const ly = y - sel.y;
  return lx >= 0 && ly >= 0 && lx < sel.w && ly < sel.h && sel.mask[ly * sel.w + lx] === 1;
}

export function selToFull(sel, W, H) {
  const full = new Uint8Array(W * H);
  if (!sel) return full;
  for (let y = 0; y < sel.h; y++) {
    const ty = y + sel.y;
    if (ty < 0 || ty >= H) continue;
    for (let x = 0; x < sel.w; x++) {
      const tx = x + sel.x;
      if (tx < 0 || tx >= W) continue;
      if (sel.mask[y * sel.w + x]) full[ty * W + tx] = 1;
    }
  }
  return full;
}

export function fullToSel(full, W, H) {
  const b = maskBounds(full, W, H);
  if (!b) return null;
  const mask = new Uint8Array(b.w * b.h);
  for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) mask[y * b.w + x] = full[(y + b.y) * W + x + b.x];
  return { ...b, mask };
}

function editable(s, layer = layerOf(s)) {
  if (!layer.visible) {
    toast(`“${layer.name}” is hidden. Show it to draw on it.`, 'warn');
    return false;
  }
  if (layer.locked) {
    toast(`“${layer.name}” is locked.`, 'warn');
    return false;
  }
  return true;
}

function pushPatch(s, label, layer, frame, before, after) {
  const patch = diffCels(before, after, s.doc.w, s.doc.h);
  if (!patch) return null;
  const id = layer.id;
  const w = s.doc.w;
  const apply = (side) => {
    const l = findLayer(s, id);
    if (!l || !l.cels[frame]) return;
    applyPatch(l.cels[frame], w, patch, side);
    s.frame = frame;
    s.layer = s.doc.layers.indexOf(l);
    emit('pixels', 'structure');
  };
  return s.history.push({ label, undo: () => apply('before'), redo: () => apply('after'), bytes: patch.w * patch.h * 8 });
}

// ─── pixel edits (strokes, fills, shapes) ──────────────────────────────────

/** Start an edit of the active cel. Returns null (with a message) if the layer can't be drawn on. */
export function beginPixels(label) {
  const s = cur();
  if (!s) return null;
  settle(s);
  const layer = layerOf(s);
  if (!editable(s, layer)) return null;
  const cel = celOf(s, layer);
  return { s, label, layer, frame: s.frame, cel, snapshot: cel.slice(), sel: s.selection, W: s.doc.w, H: s.doc.h };
}

/** Set one pixel, honouring mirror options and the selection. */
export function plot(edit, x, y, color, op = null) {
  const { W, H, cel, sel } = edit;
  const put = (px, py) => {
    if (px < 0 || py < 0 || px >= W || py >= H) return;
    if (sel && !selContains(sel, px, py)) return;
    const i = py * W + px;
    cel[i] = op ? op(cel[i], px, py, i) : color;
  };
  put(x, y);
  const mx = W - 1 - x;
  const my = H - 1 - y;
  if (app.opts.mirrorX && mx !== x) put(mx, y);
  if (app.opts.mirrorY && my !== y) put(x, my);
  if (app.opts.mirrorX && app.opts.mirrorY && mx !== x && my !== y) put(mx, my);
}

/** Put back one pixel (and its mirrors) from the edit's snapshot: pixel-perfect strokes use it. */
export function unplot(edit, x, y) {
  plot(edit, x, y, 0, (_, px, py, i) => edit.snapshot[i]);
}

export function endPixels(edit) {
  if (!edit) return;
  pushPatch(edit.s, edit.label, edit.layer, edit.frame, edit.snapshot, edit.cel);
  emit('pixels');
}

export function cancelPixels(edit) {
  if (!edit) return;
  edit.cel.set(edit.snapshot);
  emit('pixels');
}

export function pushRecent(c) {
  if (c >>> 24 === 0) return;
  app.recent = [c, ...app.recent.filter((r) => r !== c)].slice(0, 12);
  emit('color');
}

// ─── structural edits ──────────────────────────────────────────────────────

function snap(s) {
  return { doc: cloneDoc(s.doc), layer: s.layer, frame: s.frame, selection: s.selection };
}

function restore(s, st) {
  const d = cloneDoc(st.doc);
  Object.assign(s.doc, { w: d.w, h: d.h, layers: d.layers, frames: d.frames, name: d.name });
  s.layer = Math.min(st.layer, s.doc.layers.length - 1);
  s.frame = Math.min(st.frame, s.doc.frames.length - 1);
  s.selection = st.selection;
  emit('pixels', 'structure', 'selection');
}

/** Run `fn` (which mutates s.doc) as one undoable step. */
export function structural(label, fn, s = cur()) {
  if (!s) return;
  settle(s);
  const before = snap(s);
  if (fn(s) === false) return;
  const after = snap(s);
  const size = (d) => d.w * d.h * 4 * d.layers.length * d.frames.length;
  s.history.push({ label, undo: () => restore(s, before), redo: () => restore(s, after), bytes: size(before.doc) + size(after.doc) });
  emit('pixels', 'structure', 'selection');
}

export function undo() {
  const s = cur();
  if (!s) return;
  if (s.float) {
    cancelFloat(s);
    return;
  }
  const e = s.history.undo();
  if (e) toast(`Undid ${e.label}`);
  emit('pixels', 'structure', 'selection', 'session');
}

export function redo() {
  const s = cur();
  if (!s) return;
  settle(s);
  const e = s.history.redo();
  if (e) toast(`Redid ${e.label}`);
  emit('pixels', 'structure', 'selection', 'session');
}

// ─── selection ─────────────────────────────────────────────────────────────

export function setSelection(sel, mode = 'replace', s = cur()) {
  if (!s) return;
  settle(s);
  const { w: W, h: H } = s.doc;
  if (mode === 'replace' || !s.selection) {
    if (mode === 'subtract') return;
    s.selection = sel ? fullToSel(selToFull(sel, W, H), W, H) : null;
  } else {
    const a = selToFull(s.selection, W, H);
    const b = selToFull(sel, W, H);
    for (let i = 0; i < a.length; i++) a[i] = mode === 'add' ? a[i] | b[i] : a[i] & (b[i] ^ 1);
    s.selection = fullToSel(a, W, H);
  }
  emit('selection');
}

export function rectSel(x0, y0, x1, y1) {
  const x = Math.min(x0, x1);
  const y = Math.min(y0, y1);
  const w = Math.abs(x1 - x0) + 1;
  const h = Math.abs(y1 - y0) + 1;
  return { x, y, w, h, mask: new Uint8Array(w * h).fill(1) };
}

export function selectAll() {
  const s = cur();
  if (!s) return;
  setSelection(rectSel(0, 0, s.doc.w - 1, s.doc.h - 1));
}

export function deselect() {
  const s = cur();
  if (!s) return;
  settle(s);
  s.selection = null;
  emit('selection');
}

export function invertSelection() {
  const s = cur();
  if (!s) return;
  settle(s);
  const { w: W, h: H } = s.doc;
  const full = selToFull(s.selection, W, H);
  for (let i = 0; i < full.length; i++) full[i] ^= 1;
  s.selection = fullToSel(full, W, H);
  emit('selection');
}

/** Magic wand: pixels like the one at (x, y). */
export function wandSel(s, x, y) {
  const ref = app.opts.sampleAll ? compositeFrame(s.doc, s.frame) : celOf(s);
  const full = matchMask(ref, s.doc.w, s.doc.h, x, y, { tolerance: app.opts.tolerance, contiguous: app.opts.contiguous });
  return fullToSel(full, s.doc.w, s.doc.h);
}

// ─── floating pixels (moving a selection, pasting) ─────────────────────────

function stampFloat(cel, W, H, f) {
  for (let y = 0; y < f.h; y++) {
    const ty = y + f.y;
    if (ty < 0 || ty >= H) continue;
    for (let x = 0; x < f.w; x++) {
      const tx = x + f.x;
      if (tx < 0 || tx >= W) continue;
      const j = y * f.w + x;
      if (f.mask[j] && f.data[j] >>> 24) cel[ty * W + tx] = f.data[j];
    }
  }
}

/** The cel the canvas should show for a layer: the active one gets the floating pixels drawn in. */
export function displayCel(s, layer, frame = s.frame) {
  const cel = layer.cels[frame];
  const f = s.float;
  if (!f || f.layerId !== layer.id || f.frame !== frame) return cel;
  const tmp = cel.slice();
  stampFloat(tmp, s.doc.w, s.doc.h, f);
  return tmp;
}

/** Lift the selected pixels off the active layer so they can be moved. */
export function lift(s = cur(), label = 'Move') {
  if (!s || s.float) return !!(s && s.float);
  const layer = layerOf(s);
  if (!editable(s, layer)) return false;
  const { w: W, h: H } = s.doc;
  let sel = s.selection;
  if (!sel) sel = rectSel(0, 0, W - 1, H - 1);
  const cel = celOf(s, layer);
  const base = cel.slice();
  const data = new Uint32Array(sel.w * sel.h);
  for (let y = 0; y < sel.h; y++) {
    for (let x = 0; x < sel.w; x++) {
      const j = y * sel.w + x;
      if (!sel.mask[j]) continue;
      const tx = x + sel.x;
      const ty = y + sel.y;
      if (tx < 0 || ty < 0 || tx >= W || ty >= H) continue;
      data[j] = cel[ty * W + tx];
      cel[ty * W + tx] = 0;
    }
  }
  s.float = {
    layerId: layer.id,
    frame: s.frame,
    x: sel.x,
    y: sel.y,
    w: sel.w,
    h: sel.h,
    data,
    mask: sel.mask.slice(),
    base,
    origin: { x: sel.x, y: sel.y, mask: sel.mask.slice(), w: sel.w, h: sel.h },
    label,
    wasSelected: !!s.selection,
  };
  syncFloatSel(s);
  emit('pixels', 'selection');
  return true;
}

function syncFloatSel(s) {
  const f = s.float;
  s.selection = { x: f.x, y: f.y, w: f.w, h: f.h, mask: f.mask };
}

export function moveFloat(s, x, y) {
  if (!s.float) return;
  s.float.x = x;
  s.float.y = y;
  syncFloatSel(s);
  emit('pixels', 'selection');
}

/** Drop floating pixels where they are: one undo step from lift to here. */
export function commitFloat(s = cur()) {
  const f = s && s.float;
  if (!f) return;
  const layer = findLayer(s, f.layerId);
  s.float = null;
  if (!layer) return;
  const cel = layer.cels[f.frame];
  stampFloat(cel, s.doc.w, s.doc.h, f);
  pushPatch(s, f.label, layer, f.frame, f.base, cel);
  s.selection = f.wasSelected ? fullToSel(selToFull({ ...f }, s.doc.w, s.doc.h), s.doc.w, s.doc.h) : null;
  emit('pixels', 'selection', 'session');
}

/** Put floating pixels back where they came from (or throw a paste away). */
export function cancelFloat(s = cur()) {
  const f = s && s.float;
  if (!f) return;
  const layer = findLayer(s, f.layerId);
  if (layer) layer.cels[f.frame].set(f.base);
  s.float = null;
  s.selection = f.label === 'Paste' || !f.wasSelected ? null : { x: f.origin.x, y: f.origin.y, w: f.origin.w, h: f.origin.h, mask: f.origin.mask };
  emit('pixels', 'selection');
}

/** Called before anything that isn't about the floating pixels. */
export function settle(s = cur()) {
  if (s && s.float) commitFloat(s);
}

export function nudge(dx, dy) {
  const s = cur();
  if (!s) return;
  if (!s.float && !lift(s)) return;
  moveFloat(s, s.float.x + dx, s.float.y + dy);
}

// ─── clipboard ─────────────────────────────────────────────────────────────

export function copy(merged = false) {
  const s = cur();
  if (!s) return false;
  const { w: W, h: H } = s.doc;
  const f = s.float;
  if (f) {
    app.clipboard = { w: f.w, h: f.h, data: f.data.slice(), mask: f.mask.slice(), x: f.x, y: f.y };
  } else {
    const sel = s.selection || rectSel(0, 0, W - 1, H - 1);
    const src = merged ? compositeFrame(s.doc, s.frame) : celOf(s);
    const data = new Uint32Array(sel.w * sel.h);
    for (let y = 0; y < sel.h; y++) {
      for (let x = 0; x < sel.w; x++) {
        const tx = x + sel.x;
        const ty = y + sel.y;
        if (sel.mask[y * sel.w + x] && tx >= 0 && ty >= 0 && tx < W && ty < H) data[y * sel.w + x] = src[ty * W + tx];
      }
    }
    app.clipboard = { w: sel.w, h: sel.h, data, mask: sel.mask.slice(), x: sel.x, y: sel.y };
  }
  toast(`Copied ${app.clipboard.w}×${app.clipboard.h}${merged ? ' (all layers)' : ''}`);
  return true;
}

export function clearSelected(label = 'Clear') {
  const s = cur();
  if (!s) return;
  if (s.float) {
    // the hole stays, the floating pixels go
    const f = s.float;
    const layer = findLayer(s, f.layerId);
    s.float = null;
    if (layer) pushPatch(s, label, layer, f.frame, f.base, layer.cels[f.frame]);
    s.selection = null;
    emit('pixels', 'selection');
    return;
  }
  if (!s.selection) {
    toast('Select something to clear first.');
    return;
  }
  const e = beginPixels(label);
  if (!e) return;
  for (let i = 0; i < e.cel.length; i++) if (selContains(e.sel, i % e.W, (i / e.W) | 0)) e.cel[i] = 0;
  endPixels(e);
}

export function cut() {
  if (copy()) clearSelected('Cut');
}

/** Paste the clipboard (or given pixels) as floating pixels on the active layer. */
export function paste(clip = app.clipboard) {
  const s = cur();
  if (!s) return false;
  if (!clip) {
    toast('Nothing to paste yet.');
    return false;
  }
  settle(s);
  const layer = layerOf(s);
  if (!editable(s, layer)) return false;
  const { w: W, h: H } = s.doc;
  let x = clip.x ?? 0;
  let y = clip.y ?? 0;
  if (x + clip.w <= 0 || y + clip.h <= 0 || x >= W || y >= H) {
    x = Math.floor((W - clip.w) / 2);
    y = Math.floor((H - clip.h) / 2);
  }
  s.float = {
    layerId: layer.id,
    frame: s.frame,
    x,
    y,
    w: clip.w,
    h: clip.h,
    data: clip.data.slice(),
    mask: clip.mask ? clip.mask.slice() : new Uint8Array(clip.w * clip.h).fill(1),
    base: celOf(s, layer).slice(),
    origin: { x, y, w: clip.w, h: clip.h, mask: null },
    label: 'Paste',
    wasSelected: true,
  };
  syncFloatSel(s);
  if (clip.w > W || clip.h > H) toast('The pasted pixels are bigger than the canvas; whatever hangs off the edge is cut when you place them.', 'warn');
  app.tool = 'move';
  emit('pixels', 'selection', 'tool');
  return true;
}

// ─── transforms ────────────────────────────────────────────────────────────

function transformFloat(s, fn) {
  if (!s.float && !lift(s, 'Transform')) return;
  const f = s.float;
  const r = fn(f);
  f.data = r.data;
  f.mask = r.mask;
  if (r.w !== f.w) {
    f.x += Math.floor((f.w - r.w) / 2);
    f.y += Math.floor((f.h - r.h) / 2);
  }
  f.w = r.w;
  f.h = r.h;
  syncFloatSel(s);
  emit('pixels', 'selection');
}

const maskFn = (fn) => (mask, w, h) => {
  const m32 = Uint32Array.from(mask);
  return Uint8Array.from(fn(m32, w, h));
};

export function flip(horizontal) {
  const s = cur();
  if (!s) return;
  const f1 = horizontal ? flipH : flipV;
  if (s.selection || s.float) {
    transformFloat(s, (f) => ({ data: f1(f.data, f.w, f.h), mask: maskFn(f1)(f.mask, f.w, f.h), w: f.w, h: f.h }));
    return;
  }
  structural(horizontal ? 'Flip horizontal' : 'Flip vertical', (s) => {
    for (const l of s.doc.layers) l.cels = l.cels.map((c) => f1(c, s.doc.w, s.doc.h));
  });
}

export function rotate(clockwise) {
  const s = cur();
  if (!s) return;
  if (s.selection || s.float) {
    transformFloat(s, (f) => ({
      data: rotate90(f.data, f.w, f.h, clockwise),
      mask: maskFn((m, w, h) => rotate90(m, w, h, clockwise))(f.mask, f.w, f.h),
      w: f.h,
      h: f.w,
    }));
    return;
  }
  structural(clockwise ? 'Rotate 90° clockwise' : 'Rotate 90° anticlockwise', (s) => {
    const { w, h } = s.doc;
    for (const l of s.doc.layers) l.cels = l.cels.map((c) => rotate90(c, w, h, clockwise));
    s.doc.w = h;
    s.doc.h = w;
    s.selection = null;
  });
}

export function rotate180() {
  const s = cur();
  if (!s) return;
  if (s.selection || s.float) {
    flip(true);
    flip(false);
    return;
  }
  structural('Rotate 180°', (s) => {
    for (const l of s.doc.layers) l.cels = l.cels.map((c) => flipV(flipH(c, s.doc.w, s.doc.h), s.doc.w, s.doc.h));
  });
}

/** anchor: 0..8, reading order (0 top-left, 4 centre, 8 bottom-right). */
export function resizeCanvas(nw, nh, anchor = 4) {
  structural(`Canvas size ${nw}×${nh}`, (s) => {
    const { w, h } = s.doc;
    const ax = anchor % 3;
    const ay = Math.floor(anchor / 3);
    const ox = ax === 0 ? 0 : ax === 1 ? Math.floor((nw - w) / 2) : nw - w;
    const oy = ay === 0 ? 0 : ay === 1 ? Math.floor((nh - h) / 2) : nh - h;
    for (const l of s.doc.layers) l.cels = l.cels.map((c) => placeCel(c, w, h, nw, nh, ox, oy));
    s.doc.w = nw;
    s.doc.h = nh;
    s.selection = null;
  });
}

export function scaleImage(nw, nh) {
  structural(`Scale to ${nw}×${nh}`, (s) => {
    const { w, h } = s.doc;
    for (const l of s.doc.layers) l.cels = l.cels.map((c) => scaleCel(c, w, h, nw, nh));
    s.doc.w = nw;
    s.doc.h = nh;
    s.selection = null;
  });
}

function cropTo(s, b, label) {
  structural(label, (s) => {
    const { w } = s.doc;
    for (const l of s.doc.layers) l.cels = l.cels.map((c) => cropCel(c, w, b.x, b.y, b.w, b.h));
    s.doc.w = b.w;
    s.doc.h = b.h;
    s.selection = null;
  }, s);
}

export function cropToSelection() {
  const s = cur();
  if (!s) return;
  settle(s);
  if (!s.selection) return toast('Select an area to crop to.');
  const sel = s.selection;
  const x0 = Math.max(0, sel.x);
  const y0 = Math.max(0, sel.y);
  const x1 = Math.min(s.doc.w, sel.x + sel.w);
  const y1 = Math.min(s.doc.h, sel.y + sel.h);
  if (x1 <= x0 || y1 <= y0) return;
  cropTo(s, { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }, 'Crop');
}

export function trim() {
  const s = cur();
  if (!s) return;
  settle(s);
  const { w: W, h: H } = s.doc;
  const any = new Uint8Array(W * H);
  for (const l of s.doc.layers) for (const c of l.cels) for (let i = 0; i < c.length; i++) if (c[i] >>> 24) any[i] = 1;
  const b = maskBounds(any, W, H);
  if (!b) return toast('The canvas is empty.');
  if (b.w === W && b.h === H) return toast('Nothing to trim.');
  cropTo(s, b, 'Trim');
}

export function outline(color, diagonal = false) {
  const e = beginPixels('Outline');
  if (!e) return;
  const limit = e.sel ? (i) => selContains(e.sel, i % e.W, (i / e.W) | 0) : null;
  const m = outlineMask(e.snapshot, e.W, e.H, diagonal, limit);
  for (let i = 0; i < m.length; i++) if (m[i]) e.cel[i] = color;
  endPixels(e);
}

export function replaceColor(from, to, allLayers) {
  let n = 0;
  structural('Replace colour', (s) => {
    const layers = allLayers ? s.doc.layers : [layerOf(s)];
    for (const l of layers) {
      for (const c of l.cels) {
        for (let i = 0; i < c.length; i++) {
          if (c[i] === from || (from >>> 24 === 0 && c[i] >>> 24 === 0 && to >>> 24 !== 0)) {
            c[i] = to;
            n++;
          }
        }
      }
    }
    if (!n) return false;
  });
  toast(n ? `Replaced ${n} pixel${n === 1 ? '' : 's'}` : 'That colour is not used here.');
}

// ─── layers ────────────────────────────────────────────────────────────────

function layerName(doc) {
  let n = doc.layers.length + 1;
  while (doc.layers.some((l) => l.name === `Layer ${n}`)) n++;
  return `Layer ${n}`;
}

export function addLayer() {
  structural('New layer', (s) => {
    const l = createLayer(layerName(s.doc), s.doc.w, s.doc.h, s.doc.frames.length);
    s.doc.layers.splice(s.layer + 1, 0, l);
    s.layer++;
  });
}

/** Add a layer holding the given cels (one per frame), e.g. an imported image. */
export function addLayerWith(name, cels) {
  structural('Add layer', (s) => {
    const l = createLayer(name, s.doc.w, s.doc.h, s.doc.frames.length);
    cels.forEach((c, i) => c && l.cels[i] && l.cels[i].set(c));
    s.doc.layers.splice(s.layer + 1, 0, l);
    s.layer++;
  });
}

export function duplicateLayer() {
  structural('Duplicate layer', (s) => {
    const l = cloneLayer(layerOf(s), false);
    l.name = `${l.name} copy`;
    s.doc.layers.splice(s.layer + 1, 0, l);
    s.layer++;
  });
}

export function deleteLayer() {
  const s = cur();
  if (!s) return;
  if (s.doc.layers.length < 2) return toast('A drawing needs at least one layer.');
  structural('Delete layer', (s) => {
    s.doc.layers.splice(s.layer, 1);
    s.layer = Math.max(0, s.layer - 1);
  });
}

export function moveLayer(dir) {
  const s = cur();
  if (s) reorderLayer(s.layer, s.layer + dir);
}

export function reorderLayer(from, to) {
  const s = cur();
  if (!s || from === to || to < 0 || to >= s.doc.layers.length) return;
  structural(to > from ? 'Move layer up' : 'Move layer down', (s) => {
    const [l] = s.doc.layers.splice(from, 1);
    s.doc.layers.splice(to, 0, l);
    s.layer = to;
  });
}

export function mergeDown() {
  const s = cur();
  if (!s) return;
  if (s.layer === 0) return toast('There is no layer below to merge into.');
  const top = layerOf(s);
  if (!top.visible) return toast('Show the layer before merging it.');
  structural('Merge down', (s) => {
    const below = s.doc.layers[s.layer - 1];
    below.cels.forEach((c, f) => {
      const t = top.cels[f];
      for (let i = 0; i < c.length; i++) if (t[i]) c[i] = over(c[i], t[i], top.opacity);
    });
    s.doc.layers.splice(s.layer, 1);
    s.layer--;
  });
}

export function flatten() {
  const s = cur();
  if (!s) return;
  if (s.doc.layers.length < 2) return toast('There is only one layer.');
  structural('Flatten', (s) => {
    const l = createLayer('Flattened', s.doc.w, s.doc.h, s.doc.frames.length);
    l.cels = s.doc.frames.map((_, f) => compositeFrame(s.doc, f));
    s.doc.layers = [l];
    s.layer = 0;
  });
}

export function setLayerProp(index, prop, value) {
  const s = cur();
  if (!s) return;
  const layer = s.doc.layers[index];
  if (!layer || layer[prop] === value) return;
  const id = layer.id;
  const before = layer[prop];
  const set = (v) => {
    const l = findLayer(s, id);
    if (l) l[prop] = v;
    emit('pixels', 'structure');
  };
  set(value);
  const labels = { visible: value ? 'Show layer' : 'Hide layer', locked: value ? 'Lock layer' : 'Unlock layer', opacity: 'Layer opacity', name: 'Rename layer' };
  // a run of opacity drags is one step
  const last = s.history.done[s.history.done.length - 1];
  if (prop === 'opacity' && last && last.layerOpacity === id && !s.history.undone.length) {
    last.redo = () => set(value);
    s.history.version++;
    return;
  }
  const entry = s.history.push({ label: labels[prop] || 'Layer', undo: () => set(before), redo: () => set(value) });
  if (prop === 'opacity') entry.layerOpacity = id;
}

export function selectLayer(i) {
  const s = cur();
  if (!s || i < 0 || i >= s.doc.layers.length) return;
  settle(s);
  s.layer = i;
  emit('structure');
}

// ─── frames ────────────────────────────────────────────────────────────────

export function gotoFrame(i) {
  const s = cur();
  if (!s) return;
  const n = s.doc.frames.length;
  settle(s);
  s.frame = ((i % n) + n) % n;
  emit('pixels', 'frame');
}

export function addFrame(copyCurrent = false) {
  structural(copyCurrent ? 'Duplicate frame' : 'New frame', (s) => {
    const at = s.frame + 1;
    const { w, h } = s.doc;
    s.doc.frames.splice(at, 0, { duration: s.doc.frames[s.frame].duration });
    for (const l of s.doc.layers) l.cels.splice(at, 0, copyCurrent ? l.cels[s.frame].slice() : new Uint32Array(w * h));
    s.frame = at;
  });
}

export function deleteFrame() {
  const s = cur();
  if (!s) return;
  if (s.doc.frames.length < 2) return toast('A drawing needs at least one frame.');
  structural('Delete frame', (s) => {
    s.doc.frames.splice(s.frame, 1);
    for (const l of s.doc.layers) l.cels.splice(s.frame, 1);
    s.frame = Math.min(s.frame, s.doc.frames.length - 1);
  });
}

export function moveFrame(dir) {
  const s = cur();
  if (s) reorderFrame(s.frame, s.frame + dir);
}

export function reorderFrame(from, to) {
  const s = cur();
  if (!s || from === to || to < 0 || to >= s.doc.frames.length) return;
  structural('Move frame', (s) => {
    const [f] = s.doc.frames.splice(from, 1);
    s.doc.frames.splice(to, 0, f);
    for (const l of s.doc.layers) {
      const [c] = l.cels.splice(from, 1);
      l.cels.splice(to, 0, c);
    }
    s.frame = to;
  });
}

export function setDuration(ms, all = false) {
  const v = Math.max(10, Math.min(10000, Math.round(ms) || 100));
  structural('Frame duration', (s) => {
    if (all) s.doc.frames.forEach((f) => (f.duration = v));
    else s.doc.frames[s.frame].duration = v;
  });
}

/** Replace all frames' contents from imported frames (each a full-canvas cel), as new frames after the current one. */
export function insertFrames(cels) {
  structural('Insert frames', (s) => {
    const { w, h } = s.doc;
    const at = s.frame + 1;
    cels.forEach((c, k) => {
      s.doc.frames.splice(at + k, 0, { duration: s.doc.frames[s.frame].duration });
      for (const l of s.doc.layers) l.cels.splice(at + k, 0, l === layerOf(s) ? c.slice() : new Uint32Array(w * h));
    });
    s.frame = at;
  });
}

export { newId };
