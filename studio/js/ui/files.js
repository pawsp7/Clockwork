/** Opening, saving, exporting and autosave. */
import { app, cur, emit, on, makeSession, isDirty, defaultPalette } from './state.js';
import { h, download } from './dom.js';
import { toast } from './toast.js';
import * as E from './editor.js';
import { serialize, deserialize, compositeFrame, createDoc } from '../core/doc.js';
import { scaleCel, detectScale, downscale, colorCounts } from '../core/raster.js';
import { encodeGif, decodeGif } from '../core/gif.js';
import { encodePsp } from '../core/psp.js';
import { sortBy } from '../core/palette.js';

// ─── sessions ──────────────────────────────────────────────────────────────

export function addSession(s) {
  app.sessions.push(s);
  app.active = app.sessions.length - 1;
  emit('session', 'structure', 'pixels', 'selection', 'color', 'view');
  return s;
}

export function switchTo(i) {
  if (i < 0 || i >= app.sessions.length || i === app.active) return;
  E.settle(app.sessions[app.active]);
  app.active = i;
  emit('session', 'structure', 'pixels', 'selection', 'color', 'view');
}

export function closeSession(i) {
  app.sessions.splice(i, 1);
  if (app.active >= app.sessions.length) app.active = app.sessions.length - 1;
  else if (i < app.active) app.active--;
  emit('session', 'structure', 'pixels', 'selection', 'color', 'view');
}

export const baseName = (s) => (s.doc.name || 'untitled').replace(/[\\/:*?"<>|]+/g, '_').trim() || 'untitled';

// ─── reading files ─────────────────────────────────────────────────────────

let input = null;
export function openFile(accept, handler, multiple = false) {
  input?.remove();
  input = h('input', { type: 'file', accept, hidden: true });
  if (multiple) input.multiple = true;
  input.addEventListener('change', () => {
    const files = [...input.files];
    input.remove();
    input = null;
    if (files.length) handler(multiple ? files : files[0]);
  });
  document.body.append(input);
  input.click();
}

function loadImage(src) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => rej(new Error('Could not read that image'));
    img.src = src;
  });
}

function imagePixels(img) {
  const c = h('canvas', { width: img.naturalWidth || img.width, height: img.naturalHeight || img.height });
  const x = c.getContext('2d', { willReadFrequently: true });
  x.drawImage(img, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height);
  return { w: c.width, h: c.height, data: new Uint32Array(d.data.buffer.slice(0)) };
}

/** Any image (PNG, GIF with all its frames, JPEG, WebP) → { w, h, frames: [{ data, delay }] }. */
export async function decodeImage(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const isGif = bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46;
  if (isGif) {
    try {
      return decodeGif(bytes);
    } catch (err) {
      console.warn('GIF decode failed, falling back to the browser', err);
    }
  }
  const url = URL.createObjectURL(blob);
  try {
    const img = await loadImage(url);
    const p = imagePixels(img);
    return { w: p.w, h: p.h, frames: [{ data: p.data, delay: 100 }] };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Turn decoded image frames into document frames: optionally undo an integer
 * upscale, and/or cut a sprite sheet into frames of fw×fh (read across, then down).
 */
export function prepareFrames(img, { shrink = 1, fw = 0, fh = 0 } = {}) {
  let { w, h } = img;
  let frames = img.frames.map((f) => ({ data: f.data, delay: f.delay }));
  if (shrink > 1) {
    frames = frames.map((f) => ({ data: downscale(f.data, w, h, shrink), delay: f.delay }));
    w = Math.floor(w / shrink);
    h = Math.floor(h / shrink);
  }
  if (fw > 0 && fh > 0 && (fw < w || fh < h) && frames.length === 1) {
    const src = frames[0].data;
    const cols = Math.floor(w / fw);
    const rows = Math.floor(h / fh);
    const out = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cel = new Uint32Array(fw * fh);
        for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) cel[y * fw + x] = src[(r * fh + y) * w + c * fw + x];
        out.push({ data: cel, delay: frames[0].delay || 100 });
      }
    }
    // drop trailing empty cells of a part-filled sheet
    while (out.length > 1 && !out[out.length - 1].data.some((v) => v >>> 24)) out.pop();
    frames = out;
    w = fw;
    h = fh;
  }
  return { w, h, frames };
}

export function sessionFromFrames(name, prep, { paletteFromArt = true } = {}) {
  const doc = createDoc(prep.w, prep.h, { name, frames: prep.frames.length, palette: defaultPalette() });
  doc.layers[0].name = 'Layer 1';
  prep.frames.forEach((f, i) => {
    doc.layers[0].cels[i].set(f.data);
    doc.frames[i].duration = Math.max(20, f.delay || 100);
  });
  if (paletteFromArt) {
    const used = [...colorCounts(doc.layers[0].cels).keys()].map((c) => ((c & 0xffffff) | 0xff000000) >>> 0);
    const uniq = [...new Set(used)];
    if (uniq.length && uniq.length <= 256) doc.palette = sortBy(uniq, 'ramps');
  }
  return makeSession(doc);
}

export async function openProjectText(text, fileName) {
  const doc = deserialize(JSON.parse(text));
  const s = makeSession(doc, fileName);
  addSession(s);
  toast(`Opened ${doc.name}`);
  return s;
}

/** Library entries and files dropped / chosen by the person. */
export async function openFiles(files, { onImage } = {}) {
  for (const file of files) {
    const n = file.name || 'image';
    try {
      if (/\.json$/i.test(n)) await openProjectText(await file.text(), n);
      else if (/\.(gpl|pal|hex|txt)$/i.test(n)) {
        const { importPaletteFile } = await import('./colorpanel.js');
        await importPaletteFile(file);
      } else if (/\.(png|gif|jpe?g|webp|bmp)$/i.test(n) || /^image\//.test(file.type)) {
        const img = await decodeImage(file);
        const name = n.replace(/\.[^.]+$/, '');
        if (onImage) await onImage(name, img);
        else addSession(sessionFromFrames(name, prepareFrames(img, { shrink: detectScale(img.frames[0].data, img.w, img.h) })));
      } else {
        toast(`Can't open ${n}: use PNG, GIF, JPEG, a .json project or a palette file.`, 'warn');
      }
    } catch (err) {
      console.error(err);
      toast(`Couldn't open ${n}: ${err.message}`, 'warn');
    }
  }
}

// ─── saving & exporting ────────────────────────────────────────────────────

export function saveProject(s = cur()) {
  if (!s) return;
  E.settle(s);
  const json = JSON.stringify(serialize(s.doc));
  const name = baseName(s) + '.studio.json';
  download(name, json, 'application/json');
  s.savedVersion = s.history.version;
  s.fileName = name;
  emit('session');
  toast(`Saved ${name}`);
}

function framePixels(s, frame, scale = 1) {
  const buf = compositeFrame(s.doc, frame, undefined, (l) => E.displayCel(s, l, frame));
  return scale === 1 ? buf : scaleCel(buf, s.doc.w, s.doc.h, s.doc.w * scale, s.doc.h * scale);
}

function toBlob(buf, w, hh) {
  const c = h('canvas', { width: w, height: hh });
  c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(buf.buffer, buf.byteOffset, w * hh * 4), w, hh), 0, 0);
  return new Promise((res) => c.toBlob(res, 'image/png'));
}

const markExported = (s) => {
  // exported pixels count as "kept" for the close-tab warning
  s.savedVersion = s.history.version;
  emit('session');
};

export async function exportPng(s = cur(), scale = 1) {
  if (!s) return;
  const buf = framePixels(s, s.frame, scale);
  const suffix = s.doc.frames.length > 1 ? `_f${s.frame + 1}` : '';
  download(`${baseName(s)}${suffix}${scale > 1 ? `_${scale}x` : ''}.png`, await toBlob(buf, s.doc.w * scale, s.doc.h * scale));
  markExported(s);
}

/** layout: 'row' | 'column' | 'grid' (cols across). */
export function sheetLayout(n, layout, cols) {
  if (layout === 'column') return { cols: 1, rows: n };
  if (layout === 'grid') {
    const c = Math.max(1, Math.min(n, cols || Math.ceil(Math.sqrt(n))));
    return { cols: c, rows: Math.ceil(n / c) };
  }
  return { cols: n, rows: 1 };
}

export async function exportSheet(s = cur(), { scale = 1, layout = 'row', cols = 0 } = {}) {
  if (!s) return;
  const n = s.doc.frames.length;
  const { cols: c, rows } = sheetLayout(n, layout, cols);
  const fw = s.doc.w * scale;
  const fh = s.doc.h * scale;
  const W = fw * c;
  const H = fh * rows;
  const out = new Uint32Array(W * H);
  for (let f = 0; f < n; f++) {
    const buf = framePixels(s, f, scale);
    const ox = (f % c) * fw;
    const oy = Math.floor(f / c) * fh;
    for (let y = 0; y < fh; y++) out.set(buf.subarray(y * fw, (y + 1) * fw), (oy + y) * W + ox);
  }
  download(`${baseName(s)}_sheet${scale > 1 ? `_${scale}x` : ''}.png`, await toBlob(out, W, H));
  markExported(s);
}

export function exportGif(s = cur(), scale = 1) {
  if (!s) return;
  const frames = s.doc.frames.map((f, i) => ({ data: framePixels(s, i, scale), delay: f.duration }));
  const bytes = encodeGif(s.doc.w * scale, s.doc.h * scale, frames);
  download(`${baseName(s)}${scale > 1 ? `_${scale}x` : ''}.gif`, bytes, 'image/gif');
  markExported(s);
}

export function exportPsp(s = cur(), { scale = 1, layered = true } = {}) {
  if (!s) return;
  const { w, h: hh } = s.doc;
  const W = w * scale;
  const H = hh * scale;
  const up = (cel) => (scale === 1 ? cel : scaleCel(cel, w, hh, W, H));
  const layers = layered
    ? s.doc.layers.map((l) => ({ name: l.name, cel: up(E.displayCel(s, l)), opacity: l.opacity, visible: l.visible }))
    : [{ name: 'Background', cel: framePixels(s, s.frame, scale), opacity: 1, visible: true }];
  const bytes = encodePsp(W, H, layers, layered ? s.layer : 0);
  const suffix = s.doc.frames.length > 1 ? `_f${s.frame + 1}` : '';
  download(`${baseName(s)}${suffix}${scale > 1 ? `_${scale}x` : ''}.psp`, bytes, 'application/octet-stream');
  markExported(s);
}

// ─── autosave ──────────────────────────────────────────────────────────────
// Kept in this browser only (localStorage), so a reload or a crash loses nothing.

const KEY = 'clockwork-studio:autosave:v1';
let saveTimer = null;
let warned = false;

function writeAutosave() {
  try {
    const data = {
      active: app.active,
      primary: app.primary,
      secondary: app.secondary,
      recent: app.recent,
      opts: app.opts,
      view: app.view,
      sessions: app.sessions.map((s) => ({ project: serialize(s.doc), fileName: s.fileName, dirty: isDirty(s), frame: s.frame, layer: s.layer })),
    };
    localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch (err) {
    if (!warned) {
      warned = true;
      toast('Autosave is off for this drawing (too big for browser storage, or storage is blocked). Save the project to keep it.', 'warn');
    }
    return false;
  }
}

export function scheduleAutosave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(writeAutosave, 1200);
}

export function flushAutosave() {
  clearTimeout(saveTimer);
  return writeAutosave();
}

export function restoreAutosave() {
  let raw = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return false;
  }
  if (!raw) return false;
  try {
    const data = JSON.parse(raw);
    const sessions = (data.sessions || []).map((d) => {
      const s = makeSession(deserialize(d.project), d.fileName || null);
      s.frame = Math.min(d.frame | 0, s.doc.frames.length - 1);
      s.layer = Math.min(d.layer ?? s.doc.layers.length - 1, s.doc.layers.length - 1);
      // a restored drawing that had unsaved work is still unsaved
      if (d.dirty) s.savedVersion = -1;
      return s;
    });
    if (!sessions.length) return false;
    app.sessions = sessions;
    app.active = Math.max(0, Math.min(sessions.length - 1, data.active | 0));
    if (typeof data.primary === 'number') app.primary = data.primary >>> 0;
    if (typeof data.secondary === 'number') app.secondary = data.secondary >>> 0;
    if (Array.isArray(data.recent)) app.recent = data.recent.filter((n) => typeof n === 'number').map((n) => n >>> 0);
    if (data.opts) Object.assign(app.opts, data.opts);
    if (data.view) Object.assign(app.view, data.view);
    return true;
  } catch (err) {
    console.warn('Autosave unreadable', err);
    return false;
  }
}

on('pixels structure session color tool view', scheduleAutosave);
