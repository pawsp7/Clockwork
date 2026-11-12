/** Modal dialogs. */
import { app, cur, emit, newDocSession } from './state.js';
import { h, clear, drawCel, fitCanvas } from './dom.js';
import { toast } from './toast.js';
import * as E from './editor.js';
import * as F from './files.js';
import { detectScale } from '../core/raster.js';
import { fromHex } from '../core/color.js';
import { PRESETS } from '../palettes.js';

let dlg = null;

/** Open a modal. buttons: [{ label, primary?, run?() → false keeps it open }] */
export function modal(title, body, buttons = [{ label: 'Close' }], { wide = false } = {}) {
  close();
  const d = h('dialog', { class: 'dialog' + (wide ? ' wide' : ''), 'aria-label': title });
  dlg = d;
  const foot = h('div', { class: 'dialog-buttons' });
  const form = h('form', { method: 'dialog' }, h('h2', {}, title), h('div', { class: 'dialog-body' }, body), foot);
  for (const b of buttons) {
    const el = h('button', { class: b.primary ? 'text-btn primary' : 'text-btn', type: b.primary ? 'submit' : 'button', value: b.label }, b.label);
    el.addEventListener('click', async (e) => {
      e.preventDefault();
      if (b.run && (await b.run()) === false) return;
      close();
    });
    foot.append(el);
  }
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const p = buttons.find((b) => b.primary);
    if (p) foot.querySelector('.primary').click();
  });
  d.append(form);
  // each dialog tidies up only itself: 'close' fires later, maybe after the next one opened
  d.addEventListener('close', () => {
    d.remove();
    if (dlg === d) dlg = null;
  });
  d.addEventListener('keydown', (e) => e.stopPropagation());
  document.body.append(d);
  d.showModal();
  const first = d.querySelector('input:not([type=hidden]), select, .primary');
  if (first) first.focus();
  return d;
}

export function close() {
  const d = dlg;
  dlg = null;
  if (!d) return;
  if (d.open) d.close();
  d.remove();
}

export const isOpen = () => !!dlg;

export function confirm(title, message, ok = 'OK') {
  return new Promise((res) => {
    let answered = false;
    const d = modal(title, h('p', {}, message), [
      { label: 'Cancel', run: () => ((answered = true), res(false)) },
      { label: ok, primary: true, run: () => ((answered = true), res(true)) },
    ]);
    d.addEventListener('close', () => !answered && res(false));
  });
}

const num = (value, min, max, attrs = {}) => h('input', { type: 'number', class: 'num-input', value, min, max, step: 1, ...attrs });
const field = (label, ...kids) => h('label', { class: 'field' }, h('span', {}, label), ...kids);
const clampInt = (v, lo, hi, d) => {
  const n = Math.round(+v);
  return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : d;
};

// ─── new drawing ───────────────────────────────────────────────────────────

const SIZES = [
  [16, 16, 'Icon'],
  [32, 32, 'Tile'],
  [32, 48, 'Sprite (like Mitzi)'],
  [64, 64, 'Portrait (game)'],
  [96, 96, 'Bust (art/portraits)'],
  [128, 128, 'Scene piece'],
  [256, 144, 'Backdrop'],
];

export function newDialog() {
  const w = num(32, 1, 1024, { 'aria-label': 'Width' });
  const hh = num(32, 1, 1024, { 'aria-label': 'Height' });
  const frames = num(1, 1, 256, { 'aria-label': 'Frames' });
  const bg = h('select', {}, h('option', { value: '' }, 'Transparent'), h('option', { value: '#ffffff' }, 'White'), h('option', { value: '#0c0a0e' }, 'Gehenna black'), h('option', { value: 'primary' }, 'The primary colour'));
  const pal = h('select', {}, PRESETS.map((p) => h('option', { value: p.id }, p.name)));
  const name = h('input', { type: 'text', value: 'untitled', maxlength: 64 });
  const presets = h(
    'div',
    { class: 'size-presets' },
    SIZES.map(([pw, ph, label]) =>
      h('button', {
        type: 'button',
        class: 'preset-btn',
        onclick: () => {
          w.value = pw;
          hh.value = ph;
        },
      }, h('b', { class: 'num' }, `${pw}×${ph}`), h('span', {}, label)),
    ),
  );
  modal(
    'New drawing',
    h('div', {}, presets, h('div', { class: 'fields' }, field('Name', name), field('Width', w), field('Height', hh), field('Frames', frames), field('Background', bg), field('Palette', pal))),
    [
      { label: 'Cancel' },
      {
        label: 'Create',
        primary: true,
        run: () => {
          const W = clampInt(w.value, 1, 1024, 32);
          const H = clampInt(hh.value, 1, 1024, 32);
          const background = bg.value === 'primary' ? app.primary : bg.value ? fromHex(bg.value) : 0;
          const s = newDocSession(W, H, { name: name.value.trim() || 'untitled', frames: clampInt(frames.value, 1, 256, 1), background });
          const p = PRESETS.find((x) => x.id === pal.value);
          if (p) s.doc.palette = p.colors.map(fromHex);
          F.addSession(s);
        },
      },
    ],
  );
}

// ─── canvas size / scale ───────────────────────────────────────────────────

export function canvasSizeDialog() {
  const s = cur();
  if (!s) return;
  const w = num(s.doc.w, 1, 2048);
  const hh = num(s.doc.h, 1, 2048);
  let anchor = 4;
  const grid = h('div', { class: 'anchor-grid', role: 'radiogroup', 'aria-label': 'Anchor' });
  const paint = () => {
    clear(grid);
    for (let i = 0; i < 9; i++) {
      grid.append(h('button', { type: 'button', class: 'anchor' + (i === anchor ? ' on' : ''), 'aria-label': `Anchor ${i + 1}`, onclick: () => ((anchor = i), paint()) }));
    }
  };
  paint();
  modal('Canvas size', h('div', {}, h('p', { class: 'muted' }, `Now ${s.doc.w}×${s.doc.h}. The art keeps its size; the canvas grows or crops around the anchor.`), h('div', { class: 'fields' }, field('Width', w), field('Height', hh), field('Anchor', grid))), [
    { label: 'Cancel' },
    { label: 'Resize', primary: true, run: () => E.resizeCanvas(clampInt(w.value, 1, 2048, s.doc.w), clampInt(hh.value, 1, 2048, s.doc.h), anchor) },
  ]);
}

export function scaleDialog() {
  const s = cur();
  if (!s) return;
  const w = num(s.doc.w * 2, 1, 4096);
  const hh = num(s.doc.h * 2, 1, 4096);
  const lock = h('input', { type: 'checkbox', checked: true });
  const ratio = s.doc.h / s.doc.w;
  w.addEventListener('input', () => lock.checked && (hh.value = Math.max(1, Math.round(+w.value * ratio))));
  hh.addEventListener('input', () => lock.checked && (w.value = Math.max(1, Math.round(+hh.value / ratio))));
  const quick = h(
    'div',
    { class: 'row' },
    [0.5, 2, 3, 4].map((k) =>
      h('button', {
        type: 'button',
        class: 'text-btn small',
        onclick: () => {
          w.value = Math.max(1, Math.round(s.doc.w * k));
          hh.value = Math.max(1, Math.round(s.doc.h * k));
        },
      }, k === 0.5 ? '½' : `${k}×`),
    ),
  );
  modal('Scale image', h('div', {}, h('p', { class: 'muted' }, `Now ${s.doc.w}×${s.doc.h}. Nearest-neighbour, so pixels stay hard-edged. Whole-number scales look best.`), quick, h('div', { class: 'fields' }, field('Width', w), field('Height', hh), h('label', { class: 'check' }, lock, 'Keep proportions'))), [
    { label: 'Cancel' },
    { label: 'Scale', primary: true, run: () => E.scaleImage(clampInt(w.value, 1, 4096, s.doc.w), clampInt(hh.value, 1, 4096, s.doc.h)) },
  ]);
}

export function tileGridDialog() {
  const w = num(app.view.tileW, 1, 512);
  const hh = num(app.view.tileH, 1, 512);
  modal('Tile grid', h('div', { class: 'fields' }, field('Tile width', w), field('Tile height', hh)), [
    { label: 'Cancel' },
    {
      label: 'Show grid',
      primary: true,
      run: () => {
        app.view.tileW = clampInt(w.value, 1, 512, 16);
        app.view.tileH = clampInt(hh.value, 1, 512, 16);
        app.view.tileGrid = true;
        emit('view');
      },
    },
  ]);
}

// ─── export ────────────────────────────────────────────────────────────────

let lastExport = { kind: 'png', scale: 1, layout: 'row', cols: 4, layered: true };

export function exportDialog(kind) {
  const s = cur();
  if (!s) return;
  if (kind) lastExport.kind = kind;
  const o = { ...lastExport };
  const kinds = [
    ['png', 'PNG', 'This frame'],
    ['sheet', 'Sprite sheet', 'Every frame in one PNG'],
    ['gif', 'Animated GIF', 'Every frame, with its timing'],
    ['psp', 'Paint Shop Pro', 'This frame as a .psp'],
    ['project', 'Project', 'Layers, frames and palette (.json)'],
  ];
  const kindBox = h('div', { class: 'kind-grid', role: 'radiogroup' });
  const scale = h('select', {}, [1, 2, 3, 4, 5, 6, 8, 10, 12, 16].map((k) => h('option', { value: k, selected: k === o.scale }, `${k}×`)));
  const layout = h('select', {}, [['row', 'One row'], ['column', 'One column'], ['grid', 'Grid']].map(([v, l]) => h('option', { value: v, selected: v === o.layout }, l)));
  const cols = num(o.cols, 1, 256);
  const layered = h('input', { type: 'checkbox', checked: o.layered });
  const info = h('p', { class: 'muted num' });
  const extra = h('div', { class: 'fields' });
  const update = () => {
    clear(kindBox);
    for (const [k, label, sub] of kinds) {
      kindBox.append(h('button', { type: 'button', class: 'kind' + (o.kind === k ? ' on' : ''), role: 'radio', 'aria-checked': String(o.kind === k), onclick: () => ((o.kind = k), update()) }, h('b', {}, label), h('span', {}, sub)));
    }
    clear(extra);
    if (o.kind !== 'project') extra.append(field('Scale', scale));
    if (o.kind === 'sheet') {
      extra.append(field('Layout', layout));
      if (layout.value === 'grid') extra.append(field('Columns', cols));
    }
    if (o.kind === 'psp') extra.append(h('label', { class: 'check' }, layered, 'Keep layers (names, opacity, visibility)'));
    const k = +scale.value;
    const n = s.doc.frames.length;
    if (o.kind === 'png' || o.kind === 'psp') info.textContent = `${s.doc.w * k}×${s.doc.h * k} px${n > 1 ? ` · frame ${s.frame + 1} of ${n}` : ''}`;
    else if (o.kind === 'gif') info.textContent = `${s.doc.w * k}×${s.doc.h * k} px · ${n} frame${n > 1 ? 's' : ''}. GIF has no partial transparency: pixels under 50% opacity become clear.`;
    else if (o.kind === 'sheet') {
      const { cols: c, rows } = F.sheetLayout(n, layout.value, +cols.value);
      info.textContent = `${s.doc.w * k * c}×${s.doc.h * k * rows} px · ${c}×${rows} cells of ${s.doc.w * k}×${s.doc.h * k}`;
    } else info.textContent = 'Opens again in the Studio with File › Open. Kept in full: nothing is flattened.';
  };
  [scale, layout, cols].forEach((el) => el.addEventListener('input', update));
  update();
  modal('Export', h('div', {}, kindBox, extra, info), [
    { label: 'Cancel' },
    {
      label: 'Export',
      primary: true,
      run: async () => {
        lastExport = { kind: o.kind, scale: +scale.value, layout: layout.value, cols: +cols.value, layered: layered.checked };
        const k = +scale.value;
        if (o.kind === 'png') await F.exportPng(s, k);
        if (o.kind === 'sheet') await F.exportSheet(s, { scale: k, layout: layout.value, cols: +cols.value });
        if (o.kind === 'gif') F.exportGif(s, k);
        if (o.kind === 'psp') F.exportPsp(s, { scale: k, layered: layered.checked });
        if (o.kind === 'project') F.saveProject(s);
      },
    },
  ]);
}

export function quickExport() {
  const s = cur();
  if (s) F.exportPng(s, lastExport.scale || 1);
}

// ─── importing images ──────────────────────────────────────────────────────

/** Shown when an image is opened: undo an upscale, slice a sheet, choose where it goes. */
export function importDialog(name, img, { defaultFrameW = 0, defaultFrameH = 0 } = {}) {
  const k = detectScale(img.frames[0].data, img.w, img.h);
  const shrink = h('input', { type: 'checkbox', checked: k > 1 });
  const fw = num(defaultFrameW || img.w, 1, img.w, { 'aria-label': 'Frame width' });
  const fh = num(defaultFrameH || img.h, 1, img.h, { 'aria-label': 'Frame height' });
  const slice = h('input', { type: 'checkbox', checked: !!defaultFrameW && img.frames.length === 1 });
  const where = h('select', {}, h('option', { value: 'new' }, 'A new tab'), cur() && h('option', { value: 'layer' }, 'A new layer in this drawing'), cur() && h('option', { value: 'paste' }, 'Floating pixels I can place'));
  const thumb = h('canvas', { class: 'import-thumb' });
  const info = h('p', { class: 'muted num' });
  const opts = () => {
    const sk = shrink.checked ? k : 1;
    return { shrink: sk, fw: slice.checked ? Math.max(1, Math.round(+fw.value / sk) || 0) : 0, fh: slice.checked ? Math.max(1, Math.round(+fh.value / sk) || 0) : 0 };
  };
  const update = () => {
    const p = F.prepareFrames(img, opts());
    drawCel(thumb, p.frames[0].data, p.w, p.h);
    fitCanvas(thumb, p.w, p.h, 160);
    info.textContent = `${p.w}×${p.h} px · ${p.frames.length} frame${p.frames.length === 1 ? '' : 's'}`;
    fw.disabled = fh.disabled = !slice.checked;
  };
  [shrink, slice, fw, fh].forEach((el) => el.addEventListener('input', update));
  update();
  const body = h(
    'div',
    { class: 'import' },
    h('div', { class: 'import-preview' }, thumb, info),
    h(
      'div',
      { class: 'fields' },
      h('p', { class: 'muted' }, `${img.w}×${img.h} px${img.frames.length > 1 ? `, ${img.frames.length} frames` : ''}.`),
      k > 1 && h('label', { class: 'check' }, shrink, `It's drawn at ${k}× — shrink it back to ${img.w / k}×${img.h / k}`),
      img.frames.length === 1 && h('label', { class: 'check' }, slice, 'Cut into frames (a sprite sheet)'),
      img.frames.length === 1 && h('div', { class: 'row' }, field('Frame width', fw), field('Frame height', fh)),
      field('Open as', where),
    ),
  );
  return new Promise((res) => {
    const d = modal(`Open ${name}`, body, [
      { label: 'Cancel', run: () => res(null) },
      {
        label: 'Open',
        primary: true,
        run: () => {
          const p = F.prepareFrames(img, opts());
          placeImport(name, p, where.value);
          res(p);
        },
      },
    ], { wide: true });
    d.addEventListener('close', () => res(null));
  });
}

function placeImport(name, p, where) {
  const s = cur();
  if (where === 'new' || !s) {
    F.addSession(F.sessionFromFrames(name, p));
    return;
  }
  if (where === 'paste') {
    E.paste({ w: p.w, h: p.h, data: p.frames[0].data, mask: null, x: 0, y: 0 });
    if (p.frames.length > 1) toast('Pasted the first frame only.');
    return;
  }
  if (p.w !== s.doc.w || p.h !== s.doc.h) {
    toast(`The image is ${p.w}×${p.h} but the drawing is ${s.doc.w}×${s.doc.h}; it was placed at the top left.`, 'warn');
  }
  const cels = p.frames.slice(0, s.doc.frames.length).map((f) => {
    const out = new Uint32Array(s.doc.w * s.doc.h);
    for (let y = 0; y < Math.min(p.h, s.doc.h); y++) for (let x = 0; x < Math.min(p.w, s.doc.w); x++) out[y * s.doc.w + x] = f.data[y * p.w + x];
    return out;
  });
  E.addLayerWith(name, cels);
  if (p.frames.length > s.doc.frames.length) toast(`The drawing has ${s.doc.frames.length} frame(s); the extra ones were left out.`);
}

export async function openImageFiles(files) {
  await F.openFiles(files, { onImage: (name, img) => importDialog(name, img) });
}

// ─── Clockwork's own art ───────────────────────────────────────────────────

export const LIBRARY = [
  { group: 'Sprites (assets/art)', items: [
    ['Alice', '../assets/art/alice_sprite_forward.png'],
    ['Mitzi', '../assets/art/mitzi_sprite_forward.png'],
    ['Mitzi walking', '../assets/art/mitzi_walk.png', 32, 48, 160],
    ['Mitzi from behind', '../assets/art/mitzi_back.png'],
    ['Mitzi walking away', '../assets/art/mitzi_back_walk.png', 32, 48, 160],
    ['Victoria', '../assets/art/victoria_sprite_forward.png'],
  ] },
  { group: 'Game portraits (assets/art)', items: [
    ['Mitzi', '../assets/art/mitzi_portrait.png'],
    ['Victoria', '../assets/art/victoria_portrait.png'],
    ['Hestia', '../assets/art/hestia_portrait.png'],
    ['Hestia blinking', '../assets/art/hestia_blink.png', 64, 64, 120],
  ] },
  { group: 'Bust portraits (art/portraits)', items: [
    ['Alice', '../art/portraits/alice_portrait.png'],
    ['Mitzi', '../art/portraits/mitzi_portrait.png'],
    ['Victoria', '../art/portraits/victoria_portrait.png'],
    ['Hestia', '../art/portraits/hestia_portrait.png'],
    ['Charon', '../art/portraits/charon_portrait.png'],
    ['Alice, no background', '../art/portraits/alice_portrait_transparent.png'],
    ['Mitzi, no background', '../art/portraits/mitzi_portrait_transparent.png'],
    ['Victoria, no background', '../art/portraits/victoria_portrait_transparent.png'],
    ['Hestia, no background', '../art/portraits/hestia_portrait_transparent.png'],
    ['Charon, no background', '../art/portraits/charon_portrait_transparent.png'],
  ] },
  { group: 'Pieces (art/watch)', items: [['Through the Watch', '../art/watch/through_the_watch.png']] },
];

export async function openLibraryItem([name, path, fw, fh, delay]) {
  try {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`${res.status}`);
    const img = await F.decodeImage(await res.blob());
    if (delay) img.frames.forEach((f) => (f.delay = delay));
    const p = F.prepareFrames(img, { shrink: detectScale(img.frames[0].data, img.w, img.h), fw: fw || 0, fh: fh || 0 });
    const s = F.sessionFromFrames(name.toLowerCase().replace(/[^a-z0-9]+/g, '_'), p);
    F.addSession(s);
    toast(`Opened ${name}: ${p.w}×${p.h}${p.frames.length > 1 ? `, ${p.frames.length} frames` : ''}, palette taken from the art`);
  } catch (err) {
    toast(`Couldn't load ${path} (${err.message}). Open the Studio from the game's folder or site.`, 'warn');
  }
}

export function libraryDialog() {
  const body = h(
    'div',
    { class: 'library' },
    h('p', { class: 'muted' }, 'Open a copy of the game’s art to study it, recolour it, or start something new from it. Nothing in the game changes until you export and replace a file yourself.'),
    LIBRARY.map(({ group, items }) =>
      h(
        'section',
        {},
        h('h3', {}, group),
        h(
          'div',
          { class: 'lib-grid' },
          items.map((it) =>
            h('button', {
              type: 'button',
              class: 'lib-item',
              title: it[1].replace('../', ''),
              onclick: () => {
                close();
                openLibraryItem(it);
              },
            }, h('img', { src: it[1], alt: '', loading: 'lazy', onerror: (e) => e.target.closest('.lib-item').classList.add('missing') }), h('span', {}, it[0])),
          ),
        ),
      ),
    ),
  );
  modal('Clockwork art', body, [{ label: 'Close' }], { wide: true });
}

// ─── help ──────────────────────────────────────────────────────────────────

export function shortcutsDialog(sections) {
  const body = h(
    'div',
    { class: 'shortcuts' },
    sections.map(([title, rows]) =>
      h('section', {}, h('h3', {}, title), h('dl', {}, rows.map(([k, d]) => [h('dt', {}, h('kbd', {}, k)), h('dd', {}, d)]))),
    ),
  );
  modal('Shortcuts', body, [{ label: 'Close' }], { wide: true });
}
