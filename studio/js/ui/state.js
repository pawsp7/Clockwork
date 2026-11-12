/**
 * App state and a tiny event hub. Panels subscribe to topics:
 *   pixels     cel contents changed (canvas, thumbnails, preview)
 *   structure  layers / frames / size changed
 *   selection  selection or floating pixels changed
 *   color      primary / secondary / palette
 *   tool       tool or tool options
 *   view       zoom, pan, grid, onion skin
 *   session    tabs: opened, closed, switched, renamed, saved
 */
import { createDoc } from '../core/doc.js';
import { History } from '../core/history.js';
import { fromHex } from '../core/color.js';
import { PRESETS } from '../palettes.js';

const listeners = new Map();
const pending = new Set();
let scheduled = false;

export function on(topics, fn) {
  for (const t of topics.split(/\s+/)) {
    if (!listeners.has(t)) listeners.set(t, new Set());
    listeners.get(t).add(fn);
  }
}

/** Queue topics; listeners run once per animation frame however often this is called. */
export function emit(...topics) {
  for (const t of topics) pending.add(t);
  if (scheduled) return;
  scheduled = true;
  const run = () => {
    scheduled = false;
    const topicsNow = new Set(pending);
    pending.clear();
    const fns = new Set();
    for (const t of topicsNow) for (const fn of listeners.get(t) || []) fns.add(fn);
    for (const fn of fns) {
      try {
        fn(topicsNow);
      } catch (err) {
        console.error(err);
      }
    }
  };
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(run);
  else setTimeout(run, 0);
}

export const app = {
  sessions: [],
  active: -1,
  tool: 'pencil',
  primary: fromHex('#1c120c'),
  secondary: 0,
  slot: 'primary', // which colour the picker edits
  recent: [],
  opts: {
    size: 1,
    shape: 'square',
    pixelPerfect: true,
    mirrorX: false,
    mirrorY: false,
    filled: false,
    contiguous: true,
    tolerance: 0,
    sampleAll: true,
    dither: 8,
  },
  view: {
    grid: true,
    tileGrid: false,
    tileW: 16,
    tileH: 16,
    tiled: false,
    onion: false,
    checks: 'dark',
  },
  clipboard: null, // { w, h, data, mask, x, y }
  playing: false,
};

let sessionId = 1;

export function makeSession(doc, fileName = null) {
  return {
    id: sessionId++,
    doc,
    history: new History(),
    layer: doc.layers.length - 1,
    frame: 0,
    selection: null, // { x, y, w, h, mask }
    float: null,
    view: null, // { scale, ox, oy } set by the canvas on first show
    savedVersion: 0,
    fileName,
  };
}

export const cur = () => app.sessions[app.active] || null;

export function defaultPalette() {
  return PRESETS[0].colors.map(fromHex);
}

export function newDocSession(w, h, opts = {}) {
  const doc = createDoc(w, h, { palette: defaultPalette(), ...opts });
  return makeSession(doc);
}

export function isDirty(s) {
  return s.history.version !== s.savedVersion;
}
