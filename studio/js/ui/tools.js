/**
 * Tools. Each gets pointer events in canvas pixel coordinates:
 *   p = { x, y, button (0 left / 2 right), shift, alt, ctrl }
 * Right click draws with the secondary colour.
 */
import { app, cur, emit } from './state.js';
import * as E from './editor.js';
import {
  brushOffsets,
  linePoints,
  snappedLine,
  rectPoints,
  ellipsePoints,
  squareEnd,
  pixelPerfectCorner,
  ditherOn,
  matchMask,
} from '../core/raster.js';
import { compositeFrame } from '../core/doc.js';
import { toast } from './toast.js';

const colorFor = (p) => (p.button === 2 ? app.secondary : app.primary);

function stamp(edit, x, y, color, op) {
  const offs = brushOffsets(app.opts.size, app.opts.shape);
  for (const [dx, dy] of offs) E.plot(edit, x + dx, y + dy, color, op);
}

/** Last point of the previous stroke, for Shift+click straight lines. */
let lastPoint = null;

/** Freehand tools share one stroke engine. `op` decides what each pixel becomes. */
function freehand({ id, name, key, icon, options, label, makeOp, perfect = false, once = false, eraser = false }) {
  let edit = null;
  let pts = [];
  let hits = null;
  let color = 0;
  let op = null;
  let seen = null;

  const paint = (x, y) => {
    if (!once) return stamp(edit, x, y, color, op);
    // each pixel changes at most once per stroke (Shade would otherwise run away)
    stamp(edit, x, y, color, (c, px, py, i) => {
      if (seen[i]) return c;
      seen[i] = 1;
      return op(c, px, py, i);
    });
  };

  const usePerfect = () => perfect && app.opts.pixelPerfect && app.opts.size === 1;

  const addPoint = (x, y) => {
    const last = pts[pts.length - 1];
    if (last && last[0] === x && last[1] === y) return;
    pts.push([x, y]);
    const i = y * edit.W + x;
    if (x >= 0 && y >= 0 && x < edit.W && y < edit.H) hits[i]++;
    paint(x, y);
    if (usePerfect()) {
      const k = pixelPerfectCorner(pts);
      if (k >= 0) {
        const [cx, cy] = pts[k];
        pts.splice(k, 1);
        if (cx >= 0 && cy >= 0 && cx < edit.W && cy < edit.H) {
          const j = cy * edit.W + cx;
          hits[j]--;
          if (hits[j] <= 0) E.unplot(edit, cx, cy);
        }
      }
    }
  };

  return {
    id,
    name,
    key,
    icon,
    options,
    cursor: 'crosshair',
    brush: true,
    down(p) {
      edit = E.beginPixels(label);
      if (!edit) return;
      color = eraser ? 0 : colorFor(p);
      if (!eraser) E.pushRecent(color);
      op = makeOp ? makeOp(p, color) : null;
      pts = [];
      hits = new Uint16Array(edit.W * edit.H);
      seen = once ? new Uint8Array(edit.W * edit.H) : null;
      if (p.shift && lastPoint) {
        for (const [x, y] of linePoints(lastPoint[0], lastPoint[1], p.x, p.y)) paint(x, y);
        pts.push([p.x, p.y]);
      } else {
        addPoint(p.x, p.y);
      }
      lastPoint = [p.x, p.y];
      emit('pixels');
    },
    move(p) {
      if (!edit) return;
      const last = pts[pts.length - 1] || [p.x, p.y];
      const line = linePoints(last[0], last[1], p.x, p.y);
      for (let i = 1; i < line.length; i++) addPoint(line[i][0], line[i][1]);
      lastPoint = [p.x, p.y];
      emit('pixels');
    },
    up() {
      if (!edit) return;
      E.endPixels(edit);
      edit = null;
    },
    cancel() {
      if (!edit) return;
      E.cancelPixels(edit);
      edit = null;
    },
  };
}

/** Shapes redraw from the snapshot on every move. */
function shape({ id, name, key, icon, options, label, points }) {
  let edit = null;
  let start = null;
  let color = 0;
  const draw = (p) => {
    edit.cel.set(edit.snapshot);
    const pts = points(start, p);
    const filled = id !== 'line' && app.opts.filled;
    for (const [x, y] of pts) {
      if (filled) E.plot(edit, x, y, color);
      else stamp(edit, x, y, color);
    }
    emit('pixels');
  };
  return {
    id,
    name,
    key,
    icon,
    options,
    cursor: 'crosshair',
    brush: true,
    down(p) {
      edit = E.beginPixels(label);
      if (!edit) return;
      color = colorFor(p);
      E.pushRecent(color);
      start = [p.x, p.y];
      draw(p);
    },
    move(p) {
      if (edit) draw(p);
    },
    up() {
      if (!edit) return;
      E.endPixels(edit);
      edit = null;
    },
    cancel() {
      if (!edit) return;
      E.cancelPixels(edit);
      edit = null;
    },
  };
}

function pickAt(p) {
  const s = cur();
  if (!s || p.x < 0 || p.y < 0 || p.x >= s.doc.w || p.y >= s.doc.h) return null;
  const src = app.opts.sampleAll ? compositeFrame(s.doc, s.frame, undefined, (l) => E.displayCel(s, l)) : E.displayCel(s, E.layerOf(s));
  return src[p.y * s.doc.w + p.x];
}

export function pick(p) {
  const c = pickAt(p);
  if (c == null) return;
  if (p.button === 2) app.secondary = c;
  else app.primary = c;
  emit('color');
}

// ─── the tools ─────────────────────────────────────────────────────────────

const shadeStep = (dir) => (c) => {
  const s = cur();
  const pal = s.doc.palette;
  const i = pal.indexOf(c);
  if (i < 0) return c;
  const j = i + dir;
  return j >= 0 && j < pal.length ? pal[j] : c;
};

/** Selection dragging (marquee) is shown by the canvas while it happens. */
export const marquee = { box: null };

export const TOOLS = [
  freehand({ id: 'pencil', name: 'Pencil', key: 'B', icon: 'pencil', label: 'Pencil', options: ['size', 'shape', 'perfect', 'mirror'], perfect: true }),
  freehand({ id: 'eraser', name: 'Eraser', key: 'E', icon: 'eraser', label: 'Erase', options: ['size', 'shape', 'perfect', 'mirror'], perfect: true, eraser: true }),
  {
    id: 'fill',
    name: 'Fill',
    key: 'G',
    icon: 'fill',
    options: ['contiguous', 'tolerance', 'sampleAll'],
    cursor: 'crosshair',
    down(p) {
      const edit = E.beginPixels('Fill');
      if (!edit) return;
      const s = edit.s;
      if (p.x < 0 || p.y < 0 || p.x >= edit.W || p.y >= edit.H) return;
      const color = colorFor(p);
      E.pushRecent(color);
      const ref = app.opts.sampleAll ? compositeFrame(s.doc, s.frame) : edit.snapshot;
      const limit = edit.sel ? (i) => E.selContains(edit.sel, i % edit.W, (i / edit.W) | 0) : null;
      const mask = matchMask(ref, edit.W, edit.H, p.x, p.y, { tolerance: app.opts.tolerance, contiguous: app.opts.contiguous, limit });
      for (let i = 0; i < mask.length; i++) if (mask[i]) edit.cel[i] = color;
      E.endPixels(edit);
    },
  },
  shape({
    id: 'line',
    name: 'Line',
    key: 'L',
    icon: 'line',
    label: 'Line',
    options: ['size', 'shape', 'mirror', 'snapHint'],
    points: (a, p) => (p.shift ? snappedLine(a[0], a[1], p.x, p.y) : linePoints(a[0], a[1], p.x, p.y)),
  }),
  shape({
    id: 'rect',
    name: 'Rectangle',
    key: 'U',
    icon: 'rect',
    label: 'Rectangle',
    options: ['filled', 'size', 'mirror', 'squareHint'],
    points: (a, p) => {
      const [x1, y1] = p.shift ? squareEnd(a[0], a[1], p.x, p.y) : [p.x, p.y];
      return rectPoints(a[0], a[1], x1, y1, app.opts.filled);
    },
  }),
  shape({
    id: 'ellipse',
    name: 'Ellipse',
    key: 'O',
    icon: 'ellipse',
    label: 'Ellipse',
    options: ['filled', 'size', 'mirror', 'squareHint'],
    points: (a, p) => {
      const [x1, y1] = p.shift ? squareEnd(a[0], a[1], p.x, p.y) : [p.x, p.y];
      return ellipsePoints(a[0], a[1], x1, y1, app.opts.filled);
    },
  }),
  freehand({
    id: 'dither',
    name: 'Dither',
    key: 'D',
    icon: 'dither',
    label: 'Dither',
    options: ['dither', 'size', 'shape', 'mirror'],
    makeOp: (p, color) => (c, x, y) => (ditherOn(x, y, app.opts.dither) ? color : c),
  }),
  freehand({
    id: 'shade',
    name: 'Shade',
    key: 'S',
    icon: 'shade',
    label: 'Shade',
    options: ['size', 'shape', 'mirror', 'shadeHint'],
    once: true,
    makeOp: (p) => shadeStep(p.button === 2 ? 1 : -1),
  }),
  {
    id: 'picker',
    name: 'Eyedropper',
    key: 'I',
    icon: 'picker',
    options: ['sampleAll'],
    cursor: 'crosshair',
    down: pick,
    move: pick,
  },
  {
    id: 'select',
    name: 'Select',
    key: 'M',
    icon: 'select',
    options: ['selectHint'],
    cursor: 'crosshair',
    down(p) {
      const s = cur();
      if (!s) return;
      E.settle(s);
      this.start = [p.x, p.y];
      this.mode = p.shift ? 'add' : p.alt ? 'subtract' : 'replace';
      marquee.box = { x0: p.x, y0: p.y, x1: p.x, y1: p.y, mode: this.mode };
      this.moved = false;
      emit('selection');
    },
    move(p) {
      if (!this.start) return;
      const [x1, y1] = p.shift && this.mode === 'replace' ? squareEnd(this.start[0], this.start[1], p.x, p.y) : [p.x, p.y];
      if (x1 !== this.start[0] || y1 !== this.start[1]) this.moved = true;
      marquee.box = { x0: this.start[0], y0: this.start[1], x1, y1, mode: this.mode };
      emit('selection');
    },
    up() {
      if (!this.start) return;
      const b = marquee.box;
      marquee.box = null;
      this.start = null;
      if (!this.moved && this.mode === 'replace') E.deselect();
      else E.setSelection(E.rectSel(b.x0, b.y0, b.x1, b.y1), this.mode);
    },
    cancel() {
      marquee.box = null;
      this.start = null;
      emit('selection');
    },
  },
  {
    id: 'wand',
    name: 'Magic wand',
    key: 'W',
    icon: 'wand',
    options: ['contiguous', 'tolerance', 'sampleAll', 'selectHint'],
    cursor: 'crosshair',
    down(p) {
      const s = cur();
      if (!s) return;
      E.settle(s);
      if (p.x < 0 || p.y < 0 || p.x >= s.doc.w || p.y >= s.doc.h) return;
      const sel = E.wandSel(s, p.x, p.y);
      E.setSelection(sel, p.shift ? 'add' : p.alt ? 'subtract' : 'replace');
    },
  },
  {
    id: 'move',
    name: 'Move',
    key: 'V',
    icon: 'move',
    options: ['moveHint'],
    cursor: 'move',
    down(p) {
      const s = cur();
      if (!s) return;
      this.s = s;
      if (s.float && !E.selContains(s.selection, p.x, p.y) && s.float.wasSelected) {
        E.commitFloat(s);
        this.drag = null;
        return;
      }
      const whole = !s.selection;
      if (!E.lift(s, whole ? 'Move layer' : s.float ? s.float.label : 'Move')) return;
      this.whole = whole;
      this.drag = { x: p.x, y: p.y, fx: s.float.x, fy: s.float.y };
    },
    move(p) {
      const d = this.drag;
      if (!d || !this.s.float) return;
      let dx = p.x - d.x;
      let dy = p.y - d.y;
      if (p.shift) Math.abs(dx) > Math.abs(dy) ? (dy = 0) : (dx = 0);
      E.moveFloat(this.s, d.fx + dx, d.fy + dy);
    },
    up() {
      if (this.drag && this.whole) E.commitFloat(this.s);
      this.drag = null;
    },
    cancel() {
      if (this.drag) E.cancelFloat(this.s);
      this.drag = null;
    },
  },
  { id: 'hand', name: 'Hand', key: 'H', icon: 'hand', options: ['handHint'], cursor: 'grab', pan: true },
];

export const toolById = (id) => TOOLS.find((t) => t.id === id) || TOOLS[0];

export function setTool(id) {
  const s = cur();
  const t = toolById(id);
  if (app.tool === t.id) return;
  if (s && s.float && t.id !== 'move' && t.id !== 'hand' && t.id !== 'select') E.settle(s);
  app.tool = t.id;
  emit('tool');
}

export { toast };
