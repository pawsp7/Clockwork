/** Every menu item and keyboard shortcut, in one table. */
import { app, cur, emit, isDirty } from './state.js';
import * as E from './editor.js';
import * as F from './files.js';
import * as D from './dialogs.js';
import * as V from './view.js';
import { togglePlay, toggleOnion } from './panels.js';
import { swapColors } from './colorpanel.js';
import { TOOLS } from './tools.js';
import { toast } from './toast.js';

const has = () => !!cur();
const hasSel = () => !!(cur() && (cur().selection || cur().float));

export async function closeTab(i = app.active) {
  const s = app.sessions[i];
  if (!s) return;
  E.settle(s);
  if (isDirty(s) && !(await D.confirm('Close drawing', `“${s.doc.name}” has changes that are not saved or exported. Close it anyway?`, 'Close'))) return;
  F.closeSession(i);
}

function pasteSystemOrInternal() {
  // Ctrl+V also arrives as a paste event, which handles images from other apps;
  // this is the menu's route.
  if (navigator.clipboard && navigator.clipboard.read && !app.clipboard) {
    navigator.clipboard
      .read()
      .then(async (items) => {
        for (const it of items) {
          const type = it.types.find((t) => t.startsWith('image/'));
          if (type) {
            const img = await F.decodeImage(await it.getType(type));
            E.paste({ w: img.w, h: img.h, data: img.frames[0].data, mask: null });
            return;
          }
        }
        toast('Nothing to paste yet.');
      })
      .catch(() => E.paste());
    return;
  }
  E.paste();
}

export const COMMANDS = {
  // file
  new: { label: 'New…', run: D.newDialog },
  open: { label: 'Open…', keys: ['ctrl+o'], run: () => F.openFile('image/*,.png,.gif,.jpg,.jpeg,.webp,.json,.gpl,.pal,.hex', (files) => D.openImageFiles(files), true) },
  library: { label: 'Open Clockwork art…', run: D.libraryDialog },
  save: { label: 'Save project', keys: ['ctrl+s'], when: has, run: () => F.saveProject() },
  export: { label: 'Export…', keys: ['ctrl+e'], when: has, run: () => D.exportDialog() },
  exportPng: { label: 'Export PNG now', keys: ['ctrl+shift+e'], when: has, run: D.quickExport },
  exportGif: { label: 'Export animated GIF…', when: has, run: () => D.exportDialog('gif') },
  exportSheet: { label: 'Export sprite sheet…', when: has, run: () => D.exportDialog('sheet') },
  exportPsp: { label: 'Export Paint Shop Pro…', when: has, run: () => D.exportDialog('psp') },
  closeTab: { label: 'Close drawing', when: has, run: () => closeTab() },

  // edit
  undo: { label: 'Undo', keys: ['ctrl+z'], when: () => has() && (cur().history.canUndo || !!cur().float), run: E.undo },
  redo: { label: 'Redo', keys: ['ctrl+shift+z', 'ctrl+y'], when: () => has() && cur().history.canRedo, run: E.redo },
  cut: { label: 'Cut', keys: ['ctrl+x'], when: has, run: E.cut },
  copy: { label: 'Copy', keys: ['ctrl+c'], when: has, run: () => E.copy(false) },
  copyMerged: { label: 'Copy all layers', keys: ['ctrl+shift+c'], when: has, run: () => E.copy(true) },
  paste: { label: 'Paste', when: has, run: pasteSystemOrInternal },
  clear: { label: 'Clear selection', keys: ['delete', 'backspace'], when: hasSel, run: () => E.clearSelected() },
  fillSel: {
    label: 'Fill selection with primary',
    when: hasSel,
    run: () => {
      const e = E.beginPixels('Fill selection');
      if (!e) return;
      for (let i = 0; i < e.cel.length; i++) if (E.selContains(e.sel, i % e.W, (i / e.W) | 0)) e.cel[i] = app.primary;
      E.endPixels(e);
    },
  },
  selectAll: { label: 'Select all', keys: ['ctrl+a'], when: has, run: E.selectAll },
  deselect: { label: 'Deselect', keys: ['ctrl+d'], when: hasSel, run: E.deselect },
  invertSel: { label: 'Invert selection', keys: ['ctrl+shift+i'], when: has, run: E.invertSelection },
  place: { label: 'Place floating pixels', keys: ['enter'], when: () => has() && !!cur().float, run: () => E.commitFloat() },

  // image
  flipH: { label: 'Flip horizontal', keys: ['shift+h'], when: has, run: () => E.flip(true) },
  flipV: { label: 'Flip vertical', keys: ['shift+v'], when: has, run: () => E.flip(false) },
  rotCW: { label: 'Rotate 90° clockwise', keys: ['shift+r'], when: has, run: () => E.rotate(true) },
  rotCCW: { label: 'Rotate 90° anticlockwise', when: has, run: () => E.rotate(false) },
  rot180: { label: 'Rotate 180°', when: has, run: E.rotate180 },
  canvasSize: { label: 'Canvas size…', when: has, run: D.canvasSizeDialog },
  scale: { label: 'Scale image…', when: has, run: D.scaleDialog },
  crop: { label: 'Crop to selection', when: hasSel, run: E.cropToSelection },
  trim: { label: 'Trim empty edges', when: has, run: E.trim },
  outline: { label: 'Outline in primary', when: has, run: () => E.outline(app.primary, false) },
  outline8: { label: 'Outline in primary, corners too', when: has, run: () => E.outline(app.primary, true) },
  replace: { label: 'Replace primary with secondary (layer)', when: has, run: () => E.replaceColor(app.primary, app.secondary, false) },
  replaceAll: { label: 'Replace primary with secondary (all layers)', when: has, run: () => E.replaceColor(app.primary, app.secondary, true) },

  // layer
  newLayer: { label: 'New layer', keys: ['shift+n'], when: has, run: E.addLayer },
  dupLayer: { label: 'Duplicate layer', when: has, run: E.duplicateLayer },
  deleteLayer: { label: 'Delete layer', when: has, run: E.deleteLayer },
  layerUp: { label: 'Move layer up', when: has, run: () => E.moveLayer(1) },
  layerDown: { label: 'Move layer down', when: has, run: () => E.moveLayer(-1) },
  mergeDown: { label: 'Merge down', when: has, run: E.mergeDown },
  flatten: { label: 'Flatten', when: has, run: E.flatten },
  importLayer: {
    label: 'Import image as layer…',
    when: has,
    run: () =>
      F.openFile('image/*', async (file) => {
        const img = await F.decodeImage(file);
        D.importDialog(file.name.replace(/\.[^.]+$/, ''), img);
      }),
  },

  // frame
  newFrame: { label: 'New frame', keys: ['alt+n'], when: has, run: () => E.addFrame(false) },
  dupFrame: { label: 'Duplicate frame', keys: ['alt+d'], when: has, run: () => E.addFrame(true) },
  deleteFrame: { label: 'Delete frame', when: has, run: E.deleteFrame },
  prevFrame: { label: 'Previous frame', keys: [','], when: has, run: () => E.gotoFrame(cur().frame - 1) },
  nextFrame: { label: 'Next frame', keys: ['.'], when: has, run: () => E.gotoFrame(cur().frame + 1) },
  firstFrame: { label: 'First frame', keys: ['home'], when: has, run: () => E.gotoFrame(0) },
  lastFrame: { label: 'Last frame', keys: ['end'], when: has, run: () => E.gotoFrame(cur().doc.frames.length - 1) },
  play: { label: 'Play / stop', keys: ['p'], when: () => has() && cur().doc.frames.length > 1, check: () => app.playing, run: () => togglePlay() },
  onion: { label: 'Onion skin', keys: ['shift+o'], check: () => app.view.onion, run: toggleOnion },

  // view
  zoomIn: { label: 'Zoom in', keys: ['+', '='], when: has, run: () => V.zoomStep(1) },
  zoomOut: { label: 'Zoom out', keys: ['-'], when: has, run: () => V.zoomStep(-1) },
  fit: { label: 'Fit on screen', keys: ['0'], when: has, run: () => V.fit() },
  actual: { label: 'Actual size (100%)', keys: ['1'], when: has, run: V.actualSize },
  grid: { label: 'Pixel grid', keys: ["ctrl+'"], check: () => app.view.grid, run: () => toggleView('grid') },
  tileGrid: { label: 'Tile grid', check: () => app.view.tileGrid, run: () => toggleView('tileGrid') },
  tileGridSize: { label: 'Tile grid size…', run: D.tileGridDialog },
  tiled: {
    label: 'Tiled preview (seamless check)',
    keys: ['shift+t'],
    check: () => app.view.tiled,
    run: () => {
      toggleView('tiled');
      if (cur()) V.fit();
    },
  },
  lightChecks: {
    label: 'Light checkerboard',
    check: () => app.view.checks === 'light',
    run: () => {
      app.view.checks = app.view.checks === 'light' ? 'dark' : 'light';
      emit('view');
    },
  },
  mirrorX: { label: 'Mirror left ↔ right', check: () => app.opts.mirrorX, run: () => toggleOpt('mirrorX') },
  mirrorY: { label: 'Mirror top ↕ bottom', check: () => app.opts.mirrorY, run: () => toggleOpt('mirrorY') },

  // misc (keyboard only)
  swap: { label: 'Swap colours', keys: ['x'], run: swapColors },
  sizeDown: { label: 'Smaller brush', keys: ['['], run: () => setSize(app.opts.size - 1) },
  sizeUp: { label: 'Bigger brush', keys: [']'], run: () => setSize(app.opts.size + 1) },
  help: { label: 'Keyboard shortcuts', keys: ['?'], run: () => showShortcuts() },
  about: { label: 'About the Studio', run: () => showAbout() },
};

function toggleView(k) {
  app.view[k] = !app.view[k];
  emit('view');
}

function toggleOpt(k) {
  app.opts[k] = !app.opts[k];
  emit('tool', 'view');
}

export function setSize(n) {
  app.opts.size = Math.max(1, Math.min(32, n));
  emit('tool');
}

export const MENUS = [
  ['File', ['new', 'open', 'library', '-', 'save', 'export', 'exportPng', 'exportSheet', 'exportGif', 'exportPsp', '-', 'closeTab']],
  ['Edit', ['undo', 'redo', '-', 'cut', 'copy', 'copyMerged', 'paste', 'clear', 'fillSel', '-', 'selectAll', 'deselect', 'invertSel']],
  ['Image', ['flipH', 'flipV', 'rotCW', 'rotCCW', 'rot180', '-', 'canvasSize', 'scale', 'crop', 'trim', '-', 'outline', 'outline8', 'replace', 'replaceAll']],
  ['Layer', ['newLayer', 'dupLayer', 'deleteLayer', '-', 'layerUp', 'layerDown', 'mergeDown', 'flatten', '-', 'importLayer']],
  ['Frame', ['newFrame', 'dupFrame', 'deleteFrame', '-', 'prevFrame', 'nextFrame', 'firstFrame', 'lastFrame', '-', 'play', 'onion']],
  ['View', ['zoomIn', 'zoomOut', 'fit', 'actual', '-', 'grid', 'tileGrid', 'tileGridSize', 'tiled', 'lightChecks', '-', 'mirrorX', 'mirrorY']],
  ['Help', ['help', 'about']],
];

export function run(id) {
  const c = COMMANDS[id];
  if (!c) return;
  if (c.when && !c.when()) return;
  c.run();
}

export const prettyKey = (k) =>
  k
    .split('+')
    .map((p) => ({ ctrl: navigator.platform?.startsWith('Mac') ? '⌘' : 'Ctrl', shift: 'Shift', alt: navigator.platform?.startsWith('Mac') ? '⌥' : 'Alt', delete: 'Del', backspace: '⌫', enter: 'Enter', home: 'Home', end: 'End', "'": "'" }[p] || (p.length === 1 ? p.toUpperCase() : p)))
    .join(navigator.platform?.startsWith('Mac') ? '' : '+');

export function shortcutSections() {
  const pick = (ids) => ids.filter((id) => COMMANDS[id].keys).map((id) => [COMMANDS[id].keys.map(prettyKey).join(' / '), COMMANDS[id].label]);
  return [
    ['Tools', [...TOOLS.map((t) => [t.key, t.name]), ['Alt + click', 'Pick a colour while drawing'], ['Space + drag', 'Pan (or the middle button)'], ['Right click', 'Draw with the secondary colour']]],
    ['Brush & colour', [['X', 'Swap colours'], ['[  ]', 'Brush size'], ['Shift + click', 'Straight line from the last point'], ['Shift (Line)', 'Snap to pixel-art angles'], ['Shift (Rect, Ellipse)', 'Square / circle']]],
    ['Selection', [...pick(['selectAll', 'deselect', 'invertSel', 'cut', 'copy', 'copyMerged', 'clear', 'place']), [prettyKey('ctrl+v'), 'Paste (also images from other apps)'], ['Arrows', 'Nudge 1 px (Shift: 10)'], ['Esc', 'Put floating pixels back / drop the selection']]],
    ['Edit & file', pick(['undo', 'redo', 'open', 'save', 'export', 'exportPng', 'flipH', 'flipV', 'rotCW', 'newLayer'])],
    ['Frames & view', [...pick(['newFrame', 'dupFrame', 'prevFrame', 'nextFrame', 'play', 'onion', 'zoomIn', 'zoomOut', 'fit', 'actual', 'grid', 'tiled']), ['← →', 'Frames, when nothing is selected'], ['Wheel', 'Zoom (Shift: scroll sideways)'], ['Pinch', 'Zoom and pan on touch screens']]],
  ];
}

export function showShortcuts() {
  D.shortcutsDialog(shortcutSections());
}

function showAbout() {
  D.modal(
    'Clockwork Studio',
    Object.assign(document.createElement('div'), {
      innerHTML:
        '<p>A pixel-art editor for Clockwork, in the game’s own colours. It runs entirely in your browser: nothing is uploaded, and your drawings autosave in this browser until you save or export them.</p>' +
        '<p>Open the game’s sprites and portraits from <b>File › Open Clockwork art</b>. The preset palettes are built from those same pixels (<code>studio/tools/palettes.py</code>).</p>' +
        '<p>Exports: PNG at any whole-number scale, sprite sheets, animated GIF, and Paint Shop Pro (.psp) with layers, in the same format as <code>art/src/to_psp.py</code>.</p>',
    }),
  );
}
