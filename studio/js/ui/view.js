/**
 * The drawing canvas: renders the active document and turns pointer input
 * into tool calls. Zoom is a whole number of device pixels per art pixel, so
 * pixels stay perfectly square and crisp at every zoom and screen density.
 */
import { app, cur, emit, on } from './state.js';
import { compositeFrame } from '../core/doc.js';
import { brushOffsets, ditherOn } from '../core/raster.js';
import { cssColor } from '../core/color.js';
import { toolById, marquee } from './tools.js';
import * as E from './editor.js';

const LADDER = [1, 2, 3, 4, 5, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32, 40, 48, 56, 64, 80, 96, 128, 160, 192, 256];
const ALT_PICK = new Set(['pencil', 'eraser', 'fill', 'line', 'rect', 'ellipse', 'dither', 'shade']);
const CHECKS = {
  dark: ['#2b2431', '#362d3c'],
  light: ['#d6d1da', '#bfb9c5'],
};

let canvas;
let ctx;
let dpr = 1;
let cw = 0;
let ch = 0;
let comp = null;
let compCtx = null;
let compBuf = null;
let compImg = null;
let compKey = '';
const onion = { prev: null, next: null };
let onionKey = '';
let pattern = null;
let patternKey = '';
let hover = null;
let stroke = null;
let spaceDown = false;
let antsOffset = 0;
let needsComposite = true;
let renderQueued = false;
let onHover = () => {};
const pointers = new Map();
let gesture = null;
let pendingTouch = null;
let wheelAcc = 0;
let workBg = '#0f0b11';

export function initView(wrapEl, canvasEl, hoverFn) {
  canvas = canvasEl;
  ctx = canvas.getContext('2d');
  onHover = hoverFn || onHover;
  workBg = getComputedStyle(canvas).getPropertyValue('--work').trim() || workBg;
  const ro = new ResizeObserver(() => resize(wrapEl));
  ro.observe(wrapEl);
  resize(wrapEl);
  on('pixels structure session', () => {
    needsComposite = true;
    queue();
  });
  on('selection view tool color', queue);
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onCancel);
  canvas.addEventListener('pointerleave', () => {
    if (!stroke) {
      hover = null;
      onHover(null);
      queue();
    }
  });
  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  setInterval(() => {
    const s = cur();
    if (s && (s.selection || marquee.box)) {
      antsOffset = (antsOffset + 1) % 8;
      queue();
    }
  }, 140);
}

function resize(wrap) {
  dpr = window.devicePixelRatio || 1;
  const r = wrap.getBoundingClientRect();
  const nw = Math.max(1, Math.round(r.width * dpr));
  const nh = Math.max(1, Math.round(r.height * dpr));
  if (nw === cw && nh === ch) return;
  const s = cur();
  // keep the drawing centred where it was
  if (s && s.view && cw) {
    s.view.ox += Math.round((nw - cw) / 2);
    s.view.oy += Math.round((nh - ch) / 2);
  }
  cw = nw;
  ch = nh;
  canvas.width = cw;
  canvas.height = ch;
  canvas.style.width = r.width + 'px';
  canvas.style.height = r.height + 'px';
  queue();
}

export function queue() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    render();
  });
}

// ─── zoom & pan ────────────────────────────────────────────────────────────

export function fit(s = cur()) {
  if (!s || !cw) return;
  const pad = 48 * dpr;
  const k = app.view.tiled ? 3 : 1; // tiled preview: fit the 3×3 repeat
  const sc = Math.max(1, Math.floor(Math.min((cw - pad) / (s.doc.w * k), (ch - pad) / (s.doc.h * k))));
  s.view = { scale: Math.min(sc, 256), ox: 0, oy: 0 };
  center(s);
  emit('view');
}

function center(s) {
  s.view.ox = Math.round((cw - s.doc.w * s.view.scale) / 2);
  s.view.oy = Math.round((ch - s.doc.h * s.view.scale) / 2);
}

export function ensureView(s = cur()) {
  if (s && !s.view) fit(s);
}

export function setScale(sc, ax = cw / 2, ay = ch / 2) {
  const s = cur();
  if (!s) return;
  ensureView(s);
  const v = s.view;
  sc = Math.max(1, Math.min(256, Math.round(sc)));
  if (sc === v.scale) return;
  const px = (ax - v.ox) / v.scale;
  const py = (ay - v.oy) / v.scale;
  v.scale = sc;
  v.ox = Math.round(ax - px * sc);
  v.oy = Math.round(ay - py * sc);
  emit('view');
}

export function zoomStep(dir, ax, ay) {
  const s = cur();
  if (!s) return;
  ensureView(s);
  const sc = s.view.scale;
  const next = dir > 0 ? LADDER.find((z) => z > sc) || 256 : [...LADDER].reverse().find((z) => z < sc) || 1;
  setScale(next, ax, ay);
}

export function actualSize() {
  setScale(Math.max(1, Math.round(dpr)));
  const s = cur();
  if (s) {
    center(s);
    emit('view');
  }
}

export function zoomPercent(s = cur()) {
  return s && s.view ? Math.round((s.view.scale / dpr) * 100) : 100;
}

export function setSpace(down) {
  spaceDown = down;
  updateCursor();
}

function updateCursor() {
  if (!canvas) return;
  const t = toolById(app.tool);
  canvas.style.cursor = stroke && stroke.mode === 'pan' ? 'grabbing' : spaceDown || t.pan ? 'grab' : t.cursor || 'crosshair';
}
on('tool', updateCursor);

// ─── input ─────────────────────────────────────────────────────────────────

function toPixel(e) {
  const s = cur();
  const r = canvas.getBoundingClientRect();
  const dx = (e.clientX - r.left) * dpr;
  const dy = (e.clientY - r.top) * dpr;
  const fx = (dx - s.view.ox) / s.view.scale;
  const fy = (dy - s.view.oy) / s.view.scale;
  return { x: Math.floor(fx), y: Math.floor(fy), fx, fy, dx, dy };
}

function pointerInfo(e) {
  return { ...toPixel(e), button: e.button === 2 ? 2 : 0, shift: e.shiftKey, alt: e.altKey, ctrl: e.ctrlKey || e.metaKey };
}

function beginStroke(e) {
  const s = cur();
  if (!s) return;
  const pan = e.button === 1 || spaceDown || toolById(app.tool).pan;
  if (pan) {
    stroke = { mode: 'pan', id: e.pointerId, last: [e.clientX, e.clientY] };
    updateCursor();
    return;
  }
  if (e.button !== 0 && e.button !== 2) return;
  if (app.playing) emit('stop-playing');
  const tool = e.altKey && ALT_PICK.has(app.tool) ? toolById('picker') : toolById(app.tool);
  const p = pointerInfo(e);
  stroke = { mode: 'tool', id: e.pointerId, tool, button: p.button };
  tool.down(p);
}

function onDown(e) {
  const s = cur();
  if (!s) return;
  ensureView(s);
  canvas.focus({ preventScroll: true });
  try {
    canvas.setPointerCapture(e.pointerId);
  } catch {
    /* synthetic pointers */
  }
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (e.pointerType === 'touch') {
    if (pointers.size === 2) {
      // a second finger: this is a pinch / pan, not drawing
      if (pendingTouch) clearTimeout(pendingTouch.timer);
      pendingTouch = null;
      if (stroke && stroke.mode === 'tool' && stroke.tool.cancel) stroke.tool.cancel();
      stroke = null;
      startGesture(s);
      return;
    }
    if (pointers.size > 2) return;
    // wait a moment before drawing, in case a second finger follows
    const down = e;
    pendingTouch = {
      e: down,
      timer: setTimeout(() => {
        if (pendingTouch && pendingTouch.e === down) {
          pendingTouch = null;
          beginStroke(down);
        }
      }, 70),
    };
    return;
  }
  if (pointers.size > 1) return;
  beginStroke(e);
}

function flushPendingTouch() {
  if (!pendingTouch) return;
  clearTimeout(pendingTouch.timer);
  const down = pendingTouch.e;
  pendingTouch = null;
  beginStroke(down);
}

function onMove(e) {
  const s = cur();
  if (!s || !s.view) return;
  if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (gesture) {
    moveGesture(s);
    return;
  }
  if (pendingTouch && pendingTouch.e.pointerId === e.pointerId) flushPendingTouch();
  const p = toPixel(e);
  if (!hover || hover.x !== p.x || hover.y !== p.y) {
    hover = { x: p.x, y: p.y };
    onHover(hover, compBuf && p.x >= 0 && p.y >= 0 && p.x < s.doc.w && p.y < s.doc.h ? compBuf[p.y * s.doc.w + p.x] : null);
    queue();
  }
  if (!stroke || stroke.id !== e.pointerId) return;
  if (stroke.mode === 'pan') {
    s.view.ox += Math.round((e.clientX - stroke.last[0]) * dpr);
    s.view.oy += Math.round((e.clientY - stroke.last[1]) * dpr);
    stroke.last = [e.clientX, e.clientY];
    emit('view');
    return;
  }
  const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
  if (!stroke.tool.move) return;
  for (const ev of events.length ? events : [e]) stroke.tool.move({ ...pointerInfo(ev), button: stroke.button });
}

function endPointer(e, cancelled) {
  pointers.delete(e.pointerId);
  if (gesture) {
    if (pointers.size < 2) gesture = null;
    return;
  }
  if (pendingTouch && pendingTouch.e.pointerId === e.pointerId) {
    if (cancelled) {
      clearTimeout(pendingTouch.timer);
      pendingTouch = null;
      return;
    }
    flushPendingTouch(); // a tap
  }
  if (!stroke || stroke.id !== e.pointerId) return;
  const st = stroke;
  stroke = null;
  if (st.mode === 'tool') {
    if (cancelled && st.tool.cancel) st.tool.cancel();
    else st.tool.up && st.tool.up({ ...pointerInfo(e), button: st.button });
  }
  updateCursor();
}

const onUp = (e) => endPointer(e, false);
const onCancel = (e) => endPointer(e, true);

/** Esc during a drag. */
export function cancelStroke() {
  if (stroke && stroke.mode === 'tool' && stroke.tool.cancel) {
    stroke.tool.cancel();
    stroke = null;
    return true;
  }
  return false;
}

export const isStroking = () => !!stroke;

function startGesture(s) {
  const [a, b] = [...pointers.values()];
  gesture = {
    d0: Math.hypot(a.x - b.x, a.y - b.y) || 1,
    m0: [(a.x + b.x) / 2, (a.y + b.y) / 2],
    scale0: s.view.scale,
    ox0: s.view.ox,
    oy0: s.view.oy,
  };
}

function moveGesture(s) {
  const pts = [...pointers.values()];
  if (pts.length < 2) return;
  const [a, b] = pts;
  const d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
  const m = [(a.x + b.x) / 2, (a.y + b.y) / 2];
  const r = canvas.getBoundingClientRect();
  const g = gesture;
  const sc = Math.max(1, Math.min(256, Math.round(g.scale0 * (d / g.d0))));
  // keep the art point under the first midpoint under the current midpoint
  const ax = (g.m0[0] - r.left) * dpr;
  const ay = (g.m0[1] - r.top) * dpr;
  const px = (ax - g.ox0) / g.scale0;
  const py = (ay - g.oy0) / g.scale0;
  s.view.scale = sc;
  s.view.ox = Math.round((m[0] - r.left) * dpr - px * sc);
  s.view.oy = Math.round((m[1] - r.top) * dpr - py * sc);
  emit('view');
}

function onWheel(e) {
  const s = cur();
  if (!s) return;
  e.preventDefault();
  ensureView(s);
  const r = canvas.getBoundingClientRect();
  const ax = (e.clientX - r.left) * dpr;
  const ay = (e.clientY - r.top) * dpr;
  const unit = e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? 400 : 1;
  const dx = e.deltaX * unit;
  const dy = e.deltaY * unit;
  if (e.shiftKey || (!e.ctrlKey && Math.abs(dx) > Math.abs(dy) * 1.5)) {
    // sideways scroll pans
    s.view.ox -= Math.round((e.shiftKey ? dy || dx : dx) * dpr);
    if (!e.shiftKey) s.view.oy -= Math.round(dy * dpr);
    emit('view');
    return;
  }
  wheelAcc += dy;
  const step = e.ctrlKey ? 12 : 40;
  while (Math.abs(wheelAcc) >= step) {
    zoomStep(wheelAcc < 0 ? 1 : -1, ax, ay);
    wheelAcc -= Math.sign(wheelAcc) * step;
  }
}

// ─── rendering ─────────────────────────────────────────────────────────────

function ensureComp(s) {
  const { w, h } = s.doc;
  if (!comp || comp.width !== w || comp.height !== h) {
    comp = document.createElement('canvas');
    comp.width = w;
    comp.height = h;
    compCtx = comp.getContext('2d');
    compBuf = new Uint32Array(w * h);
    compImg = new ImageData(new Uint8ClampedArray(compBuf.buffer), w, h);
    needsComposite = true;
  }
  const key = `${s.id}|${s.frame}`;
  if (key !== compKey) needsComposite = true;
  if (!needsComposite) return;
  compKey = key;
  compositeFrame(s.doc, s.frame, compBuf, (l) => E.displayCel(s, l));
  compCtx.putImageData(compImg, 0, 0);
  // the neighbouring frames only change between strokes, not during one
  const ok = `${s.id}|${s.frame}|${s.doc.frames.length}|${s.doc.w}x${s.doc.h}|${s.history.version}|${app.view.onion}`;
  if (ok !== onionKey) {
    onionKey = ok;
    onion.prev = onion.next = null;
    if (app.view.onion && s.doc.frames.length > 1) {
      onion.prev = s.frame > 0 ? tinted(s, s.frame - 1, '#e0606a') : null;
      onion.next = s.frame < s.doc.frames.length - 1 ? tinted(s, s.frame + 1, '#60a0e0') : null;
    }
  }
  needsComposite = false;
}

function tinted(s, frame, tint) {
  const { w, h } = s.doc;
  const buf = compositeFrame(s.doc, frame);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const cx = c.getContext('2d');
  cx.putImageData(new ImageData(new Uint8ClampedArray(buf.buffer), w, h), 0, 0);
  cx.globalCompositeOperation = 'source-atop';
  cx.globalAlpha = 0.45;
  cx.fillStyle = tint;
  cx.fillRect(0, 0, w, h);
  return c;
}

function checker() {
  const cell = Math.max(4, Math.round(8 * dpr));
  const key = `${app.view.checks}|${cell}`;
  if (pattern && key === patternKey) return pattern;
  const [a, b] = CHECKS[app.view.checks] || CHECKS.dark;
  const c = document.createElement('canvas');
  c.width = c.height = cell * 2;
  const x = c.getContext('2d');
  x.fillStyle = a;
  x.fillRect(0, 0, cell * 2, cell * 2);
  x.fillStyle = b;
  x.fillRect(cell, 0, cell, cell);
  x.fillRect(0, cell, cell, cell);
  pattern = ctx.createPattern(c, 'repeat');
  patternKey = key;
  return pattern;
}

/** Outline edges of a mask, in mask-local pixel corners: [x1, y1, x2, y2]. */
const edgeCache = new WeakMap();
function maskEdges(mask, w, h) {
  const hit = edgeCache.get(mask);
  if (hit && hit.w === w) return hit.segs;
  const segs = [];
  const at = (x, y) => x >= 0 && y >= 0 && x < w && y < h && mask[y * w + x] === 1;
  for (let y = 0; y <= h; y++) {
    let run = -1;
    for (let x = 0; x <= w; x++) {
      const edge = x < w && at(x, y) !== at(x, y - 1);
      if (edge && run < 0) run = x;
      if (!edge && run >= 0) {
        segs.push([run, y, x, y]);
        run = -1;
      }
    }
  }
  for (let x = 0; x <= w; x++) {
    let run = -1;
    for (let y = 0; y <= h; y++) {
      const edge = y < h && at(x, y) !== at(x - 1, y);
      if (edge && run < 0) run = y;
      if (!edge && run >= 0) {
        segs.push([x, run, x, y]);
        run = -1;
      }
    }
  }
  edgeCache.set(mask, { w, segs });
  return segs;
}

function strokeSegs(segs, offX, offY, v, style) {
  ctx.beginPath();
  for (const [x1, y1, x2, y2] of segs) {
    const ax = Math.round(v.ox + (x1 + offX) * v.scale) + 0.5;
    const ay = Math.round(v.oy + (y1 + offY) * v.scale) + 0.5;
    const bx = Math.round(v.ox + (x2 + offX) * v.scale) + 0.5;
    const by = Math.round(v.oy + (y2 + offY) * v.scale) + 0.5;
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
  }
  ctx.lineWidth = 1;
  if (style === 'ants') {
    ctx.setLineDash([]);
    ctx.strokeStyle = '#000';
    ctx.stroke();
    ctx.setLineDash([4 * dpr, 4 * dpr]);
    ctx.lineDashOffset = -antsOffset * dpr;
    ctx.strokeStyle = '#fff';
    ctx.stroke();
    ctx.setLineDash([]);
  } else {
    ctx.strokeStyle = 'rgba(0,0,0,.75)';
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.9)';
    ctx.lineWidth = 1;
    ctx.save();
    ctx.translate(-1, -1);
    ctx.stroke();
    ctx.restore();
  }
}

function render() {
  if (!ctx) return;
  const s = cur();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.fillStyle = workBg;
  ctx.fillRect(0, 0, cw, ch);
  if (!s) return;
  ensureView(s);
  ensureComp(s);
  const v = s.view;
  const { w: W, h: H } = s.doc;
  const aw = W * v.scale;
  const ah = H * v.scale;
  ctx.imageSmoothingEnabled = false;
  const tiles = app.view.tiled ? [-1, 0, 1] : [0];
  const pat = checker();
  pat.setTransform && pat.setTransform(new DOMMatrix([1, 0, 0, 1, v.ox, v.oy]));
  for (const ty of tiles) {
    for (const tx of tiles) {
      const x = v.ox + tx * aw;
      const y = v.oy + ty * ah;
      ctx.fillStyle = pat;
      ctx.fillRect(x, y, aw, ah);
      if (tx === 0 && ty === 0) {
        if (onion.prev) ctx.drawImage(onion.prev, x, y, aw, ah);
        if (onion.next) ctx.drawImage(onion.next, x, y, aw, ah);
      }
      ctx.drawImage(comp, x, y, aw, ah);
      if (tx || ty) {
        ctx.fillStyle = 'rgba(12,10,14,.35)';
        ctx.fillRect(x, y, aw, ah);
      }
    }
  }

  // visible pixel range
  const x0 = Math.max(0, Math.floor(-v.ox / v.scale));
  const x1 = Math.min(W, Math.ceil((cw - v.ox) / v.scale));
  const y0 = Math.max(0, Math.floor(-v.oy / v.scale));
  const y1 = Math.min(H, Math.ceil((ch - v.oy) / v.scale));
  const top = v.oy + y0 * v.scale;
  const left = v.ox + x0 * v.scale;
  const vh = (y1 - y0) * v.scale;
  const vw = (x1 - x0) * v.scale;

  if (app.view.grid && v.scale >= 6 * Math.max(1, dpr * 0.75)) {
    ctx.fillStyle = 'rgba(150,140,160,.2)';
    for (let x = x0 + 1; x < x1; x++) ctx.fillRect(v.ox + x * v.scale, top, 1, vh);
    for (let y = y0 + 1; y < y1; y++) ctx.fillRect(left, v.oy + y * v.scale, vw, 1);
  }
  if (app.view.tileGrid) {
    ctx.fillStyle = 'rgba(208,176,106,.55)';
    const tw = Math.max(1, app.view.tileW);
    const th = Math.max(1, app.view.tileH);
    for (let x = Math.ceil(x0 / tw) * tw; x <= x1; x += tw) if (x > 0 && x < W) ctx.fillRect(v.ox + x * v.scale, top, Math.max(1, Math.round(dpr)), vh);
    for (let y = Math.ceil(y0 / th) * th; y <= y1; y += th) if (y > 0 && y < H) ctx.fillRect(left, v.oy + y * v.scale, vw, Math.max(1, Math.round(dpr)));
  }
  if (app.opts.mirrorX || app.opts.mirrorY) {
    ctx.strokeStyle = 'rgba(208,176,106,.9)';
    ctx.setLineDash([6 * dpr, 4 * dpr]);
    ctx.lineWidth = Math.max(1, Math.round(dpr));
    ctx.beginPath();
    if (app.opts.mirrorX) {
      const mx = Math.round(v.ox + (W / 2) * v.scale) + 0.5;
      ctx.moveTo(mx, v.oy - 8 * dpr);
      ctx.lineTo(mx, v.oy + ah + 8 * dpr);
    }
    if (app.opts.mirrorY) {
      const my = Math.round(v.oy + (H / 2) * v.scale) + 0.5;
      ctx.moveTo(v.ox - 8 * dpr, my);
      ctx.lineTo(v.ox + aw + 8 * dpr, my);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // canvas edge
  ctx.strokeStyle = 'rgba(106,86,96,.9)';
  ctx.lineWidth = 1;
  ctx.strokeRect(v.ox - 0.5, v.oy - 0.5, aw + 1, ah + 1);

  // hover preview: the brush footprint, mirrored too
  const tool = toolById(app.tool);
  if (hover && !spaceDown && !tool.pan && (!stroke || stroke.mode === 'tool')) {
    const brush = tool.brush && !(app.tool === 'rect' || app.tool === 'ellipse') ? brushOffsets(app.opts.size, app.opts.shape) : [[0, 0]];
    const showColor = ['pencil', 'line', 'rect', 'ellipse', 'dither'].includes(app.tool) && !stroke;
    const spots = [[hover.x, hover.y]];
    if (tool.brush) {
      if (app.opts.mirrorX) spots.push([W - 1 - hover.x, hover.y]);
      if (app.opts.mirrorY) spots.push([hover.x, H - 1 - hover.y]);
      if (app.opts.mirrorX && app.opts.mirrorY) spots.push([W - 1 - hover.x, H - 1 - hover.y]);
    }
    let lo = 0;
    let hi = 0;
    for (const [dx, dy] of brush) {
      lo = Math.min(lo, dx, dy);
      hi = Math.max(hi, dx, dy);
    }
    const n = hi - lo + 1;
    const mask = new Uint8Array(n * n);
    for (const [dx, dy] of brush) mask[(dy - lo) * n + (dx - lo)] = 1;
    const segs = maskEdges(mask, n, n);
    for (const [hx, hy] of spots) {
      if (showColor && app.primary >>> 24) {
        ctx.fillStyle = cssColor(app.primary);
        ctx.globalAlpha = 0.55;
        for (const [dx, dy] of brush) {
          const px = hx + dx;
          const py = hy + dy;
          if (px < 0 || py < 0 || px >= W || py >= H) continue;
          if (app.tool === 'dither' && !ditherHit(px, py)) continue;
          ctx.fillRect(v.ox + px * v.scale, v.oy + py * v.scale, v.scale, v.scale);
        }
        ctx.globalAlpha = 1;
      }
      strokeSegs(segs, hx + lo, hy + lo, v, 'cursor');
    }
  }

  // selection
  if (s.selection) {
    const sel = s.selection;
    strokeSegs(maskEdges(sel.mask, sel.w, sel.h), sel.x, sel.y, v, 'ants');
  }
  if (marquee.box) {
    const b = marquee.box;
    const sel = E.rectSel(b.x0, b.y0, b.x1, b.y1);
    strokeSegs(maskEdges(sel.mask, sel.w, sel.h), sel.x, sel.y, v, 'ants');
  }
}

const ditherHit = (x, y) => ditherOn(x, y, app.opts.dither);

export function compositeBuffer() {
  return compBuf;
}
