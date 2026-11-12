/** Colour: primary / secondary, an HSV picker with alpha, recent colours, and the palette. */
import { app, cur, emit, on } from './state.js';
import { h, clear, download } from './dom.js';
import { icon } from './icons.js';
import { toast } from './toast.js';
import { pack, unpack, toHex, fromHex, rgbToHsv, hsvToRgb, cssColor } from '../core/color.js';
import { parsePalette, toGpl, toJascPal, toHexList, sortBy, dedupe } from '../core/palette.js';
import { colorCounts } from '../core/raster.js';
import { PRESETS } from '../palettes.js';

let hsv = { h: 0, s: 0, v: 0, a: 255 };
let hsvFor = null; // the colour hsv was taken from, so greys keep their hue
const slotColor = () => (app.slot === 'primary' ? app.primary : app.secondary);

export function setSlotColor(c, slot = app.slot) {
  if (slot === 'primary') app.primary = c;
  else app.secondary = c;
  emit('color');
}

export function swapColors() {
  [app.primary, app.secondary] = [app.secondary, app.primary];
  emit('color');
}

function syncHsv() {
  const c = slotColor();
  if (c === hsvFor) return;
  const [r, g, b, a] = unpack(c);
  const [hh, ss, vv] = rgbToHsv(r, g, b);
  hsv = { h: ss && vv ? hh : hsv.h, s: vv ? ss : hsv.s, v: vv, a };
  hsvFor = c;
}

function fromHsv() {
  const [r, g, b] = hsvToRgb(hsv.h, hsv.s, hsv.v);
  const c = pack(r, g, b, hsv.a);
  hsvFor = c;
  setSlotColor(c);
}

function dragOn(el, fn) {
  const handle = (e) => {
    const r = el.getBoundingClientRect();
    fn(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)));
  };
  el.addEventListener('pointerdown', (e) => {
    el.setPointerCapture(e.pointerId);
    handle(e);
    const move = (ev) => handle(ev);
    const up = () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  });
}

function sizeCanvas(c) {
  const dpr = window.devicePixelRatio || 1;
  const r = c.getBoundingClientRect();
  const w = Math.max(1, Math.round(r.width * dpr));
  const hh = Math.max(1, Math.round(r.height * dpr));
  if (c.width !== w || c.height !== hh) {
    c.width = w;
    c.height = hh;
  }
  return [w, hh, dpr];
}

export function initColorPanel(root) {
  const prim = h('button', { class: 'swatch-big primary', title: 'Primary colour (left click). Click to edit.', onclick: () => pickSlot('primary') });
  const sec = h('button', { class: 'swatch-big secondary', title: 'Secondary colour (right click). Click to edit.', onclick: () => pickSlot('secondary') });
  const swap = h('button', { class: 'icon-btn', title: 'Swap colours (X)', html: icon('swap'), onclick: swapColors });
  const hex = h('input', { class: 'hex', type: 'text', spellcheck: 'false', maxlength: 9, 'aria-label': 'Hex colour' });
  hex.addEventListener('change', () => {
    const c = fromHex(hex.value);
    if (c == null) {
      toast('That is not a hex colour (try #c8505e or #c8505e80).', 'warn');
      hex.value = toHex(slotColor());
      return;
    }
    setSlotColor(c);
  });
  hex.addEventListener('keydown', (e) => e.key === 'Enter' && hex.blur());
  const clearBtn = h('button', { class: 'text-btn small', title: 'Make this slot transparent (draws as an eraser)', onclick: () => setSlotColor(0) }, 'Clear');
  const sv = h('canvas', { class: 'sv', 'aria-label': 'Saturation and value' });
  const hue = h('canvas', { class: 'strip hue', 'aria-label': 'Hue' });
  const alpha = h('canvas', { class: 'strip alpha', 'aria-label': 'Opacity' });
  const recent = h('div', { class: 'recent', 'aria-label': 'Recent colours' });

  dragOn(sv, (x, y) => {
    hsv.s = x;
    hsv.v = 1 - y;
    if (hsv.a === 0) hsv.a = 255;
    fromHsv();
  });
  dragOn(hue, (x) => {
    hsv.h = x * 359.9;
    if (hsv.a === 0) hsv.a = 255;
    fromHsv();
  });
  dragOn(alpha, (x) => {
    hsv.a = Math.round(x * 255);
    fromHsv();
  });

  root.append(
    h('div', { class: 'color-top' }, h('div', { class: 'slots' }, sec, prim), h('div', { class: 'color-fields' }, h('div', { class: 'row' }, hex, swap), h('div', { class: 'row' }, h('span', { class: 'slot-label' }), clearBtn))),
    sv,
    hue,
    alpha,
    recent,
  );

  const pickSlot = (slot) => {
    app.slot = slot;
    hsvFor = null;
    emit('color');
  };

  const draw = () => {
    syncHsv();
    const c = slotColor();
    prim.style.setProperty('--c', cssColor(app.primary));
    sec.style.setProperty('--c', cssColor(app.secondary));
    prim.classList.toggle('active', app.slot === 'primary');
    sec.classList.toggle('active', app.slot === 'secondary');
    prim.classList.toggle('clear', app.primary >>> 24 === 0);
    sec.classList.toggle('clear', app.secondary >>> 24 === 0);
    if (document.activeElement !== hex) hex.value = toHex(c);
    root.querySelector('.slot-label').textContent = app.slot === 'primary' ? 'Editing primary' : 'Editing secondary';

    // saturation / value square
    let [w, hh] = sizeCanvas(sv);
    let x = sv.getContext('2d');
    const [hr, hg, hb] = hsvToRgb(hsv.h, 1, 1);
    x.fillStyle = `rgb(${hr},${hg},${hb})`;
    x.fillRect(0, 0, w, hh);
    let g = x.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, '#fff');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, w, hh);
    g = x.createLinearGradient(0, 0, 0, hh);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, '#000');
    x.fillStyle = g;
    x.fillRect(0, 0, w, hh);
    marker(x, hsv.s * w, (1 - hsv.v) * hh);

    [w, hh] = sizeCanvas(hue);
    x = hue.getContext('2d');
    g = x.createLinearGradient(0, 0, w, 0);
    for (let i = 0; i <= 6; i++) {
      const [r, gg, b] = hsvToRgb(i * 60, 1, 1);
      g.addColorStop(i / 6, `rgb(${r},${gg},${b})`);
    }
    x.fillStyle = g;
    x.fillRect(0, 0, w, hh);
    bar(x, (hsv.h / 360) * w, hh);

    [w, hh] = sizeCanvas(alpha);
    x = alpha.getContext('2d');
    const cell = Math.max(3, Math.round(hh / 2));
    for (let yy = 0; yy < hh; yy += cell) for (let xx = 0; xx < w; xx += cell) {
      x.fillStyle = ((xx / cell + yy / cell) & 1) ? '#5a5060' : '#3a3240';
      x.fillRect(xx, yy, cell, cell);
    }
    const [r, gg, b] = unpack(c);
    g = x.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, `rgba(${r},${gg},${b},0)`);
    g.addColorStop(1, `rgb(${r},${gg},${b})`);
    x.fillStyle = g;
    x.fillRect(0, 0, w, hh);
    bar(x, (hsv.a / 255) * w, hh);

    clear(recent);
    for (const rc of app.recent) {
      recent.append(
        h('button', {
          class: 'swatch',
          style: { '--c': cssColor(rc) },
          title: toHex(rc),
          onclick: () => setSlotColor(rc, 'primary'),
          oncontextmenu: (e) => {
            e.preventDefault();
            setSlotColor(rc, 'secondary');
          },
        }),
      );
    }
  };
  on('color session', draw);
  window.addEventListener('resize', draw);
  requestAnimationFrame(draw);
}

function marker(x, px, py) {
  const dpr = window.devicePixelRatio || 1;
  x.lineWidth = Math.max(1, dpr);
  x.strokeStyle = '#000';
  x.strokeRect(Math.round(px - 4 * dpr) + 0.5, Math.round(py - 4 * dpr) + 0.5, 8 * dpr, 8 * dpr);
  x.strokeStyle = '#fff';
  x.strokeRect(Math.round(px - 3 * dpr) + 0.5, Math.round(py - 3 * dpr) + 0.5, 6 * dpr, 6 * dpr);
}

function bar(x, px, hh) {
  const dpr = window.devicePixelRatio || 1;
  x.fillStyle = '#000';
  x.fillRect(Math.round(px - 2 * dpr), 0, 4 * dpr, hh);
  x.fillStyle = '#fff';
  x.fillRect(Math.round(px - dpr), 0, 2 * dpr, hh);
}

// ─── palette ───────────────────────────────────────────────────────────────

export function setPalette(colors, note) {
  const s = cur();
  if (!s) return;
  s.doc.palette = dedupe(colors).slice(0, 512);
  emit('color');
  if (note) toast(note);
}

function readFile(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    if (/\.(png|gif|jpe?g|webp|bmp)$/i.test(file.name)) r.readAsDataURL(file);
    else r.readAsText(file);
  });
}

export async function importPaletteFile(file) {
  const data = await readFile(file);
  let colors;
  if (data.startsWith('data:image')) {
    const img = await new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = data;
    });
    const c = h('canvas', { width: img.width, height: img.height });
    const x = c.getContext('2d');
    x.drawImage(img, 0, 0);
    const buf = new Uint32Array(x.getImageData(0, 0, img.width, img.height).data.buffer);
    colors = [...colorCounts([buf]).keys()].map((c) => ((c & 0xffffff) | 0xff000000) >>> 0);
    colors = dedupe(colors).slice(0, 256);
  } else {
    colors = parsePalette(data);
  }
  if (!colors.length) {
    toast('No colours found in that file.', 'warn');
    return;
  }
  setPalette(colors, `Loaded ${colors.length} colours from ${file.name}`);
}

export function initPalettePanel(root, { openFile }) {
  const select = h('select', { class: 'preset', 'aria-label': 'Palette preset' }, h('option', { value: '' }, 'Load a palette…'), PRESETS.map((p) => h('option', { value: p.id }, `${p.name} (${p.colors.length})`)));
  select.addEventListener('change', () => {
    const p = PRESETS.find((x) => x.id === select.value);
    select.value = '';
    if (p) setPalette(p.colors.map(fromHex), `Palette: ${p.name}`);
  });
  const grid = h('div', { class: 'palette-grid', role: 'listbox', 'aria-label': 'Palette' });
  const count = h('span', { class: 'muted small' });
  const actions = h(
    'div',
    { class: 'palette-actions' },
    h('button', { class: 'icon-btn', title: 'Add the primary colour', html: icon('plus'), onclick: () => addSwatch(app.primary) }),
    h('button', { class: 'icon-btn', title: 'Remove the primary colour from the palette', html: icon('minus'), onclick: () => removeSwatch(app.primary) }),
    menuButton('Sort', [
      ['Into ramps (for Shade)', () => sortPal('ramps')],
      ['By hue', () => sortPal('hue')],
      ['By lightness', () => sortPal('luma')],
    ]),
    menuButton('From art', [
      ['Colours used in this drawing', () => fromArt(false)],
      ['…and add them to the palette', () => fromArt(true)],
    ]),
    menuButton('File', [
      ['Import (.gpl .pal .hex or an image)…', () => openFile('.gpl,.pal,.hex,.txt,.png,.gif,.jpg,.jpeg,.webp', importPaletteFile)],
      ['Export GIMP / Aseprite (.gpl)', () => exportPal('gpl')],
      ['Export Paint Shop Pro (.pal)', () => exportPal('pal')],
      ['Export hex list (.hex)', () => exportPal('hex')],
      ['Export as a PNG strip', () => exportPal('png')],
      ['Clear the palette', () => setPalette([], 'Palette cleared')],
    ]),
  );
  root.append(h('div', { class: 'row' }, select, count), grid, actions);

  let dragFrom = -1;
  const draw = () => {
    const s = cur();
    clear(grid);
    if (!s) return;
    const pal = s.doc.palette;
    count.textContent = `${pal.length}`;
    pal.forEach((c, i) => {
      const b = h('button', {
        class: 'swatch' + (c === app.primary ? ' is-primary' : '') + (c === app.secondary ? ' is-secondary' : ''),
        style: { '--c': cssColor(c) },
        title: `${toHex(c)} · click: primary · right-click: secondary · Shift+click: set to primary · drag to reorder`,
        draggable: 'true',
        role: 'option',
      });
      b.addEventListener('click', (e) => {
        if (e.shiftKey) {
          const p = s.doc.palette.slice();
          p[i] = app.primary;
          setPalette(p);
        } else setSlotColor(c, 'primary');
      });
      b.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        setSlotColor(c, 'secondary');
      });
      b.addEventListener('dragstart', (e) => {
        dragFrom = i;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', toHex(c));
      });
      b.addEventListener('dragover', (e) => {
        if (dragFrom >= 0) e.preventDefault();
      });
      b.addEventListener('drop', (e) => {
        e.preventDefault();
        if (dragFrom < 0 || dragFrom === i) return;
        const p = s.doc.palette.slice();
        const [m] = p.splice(dragFrom, 1);
        p.splice(i, 0, m);
        dragFrom = -1;
        setPalette(p);
      });
      b.addEventListener('dragend', () => (dragFrom = -1));
      grid.append(b);
    });
    if (!pal.length) grid.append(h('p', { class: 'muted small' }, 'Empty. Add colours with +, or load a palette.'));
  };
  on('color session', draw);
}

function addSwatch(c) {
  const s = cur();
  if (!s) return;
  if (c >>> 24 === 0) return toast('Transparent is always available; it is not a palette colour.');
  if (s.doc.palette.includes(c)) return toast(`${toHex(c)} is already in the palette.`);
  setPalette([...s.doc.palette, c]);
}

function removeSwatch(c) {
  const s = cur();
  if (!s) return;
  if (!s.doc.palette.includes(c)) return toast(`${toHex(c)} is not in the palette.`);
  setPalette(s.doc.palette.filter((x) => x !== c));
}

function sortPal(mode) {
  const s = cur();
  if (s) setPalette(sortBy(s.doc.palette, mode));
}

function fromArt(add) {
  const s = cur();
  if (!s) return;
  const counts = colorCounts(s.doc.layers.flatMap((l) => l.cels));
  const used = sortBy([...counts.keys()], 'ramps');
  if (!used.length) return toast('The drawing has no colours yet.');
  if (used.length > 512) toast('More than 512 colours: keeping the first 512.', 'warn');
  setPalette(add ? [...s.doc.palette, ...used] : used, `${used.length} colour${used.length === 1 ? '' : 's'} in this drawing`);
}

function exportPal(kind) {
  const s = cur();
  if (!s) return;
  const pal = s.doc.palette;
  if (!pal.length) return toast('The palette is empty.');
  const base = (s.doc.name || 'palette').replace(/[^\w.-]+/g, '_');
  if (kind === 'gpl') download(base + '.gpl', toGpl(s.doc.name, pal), 'text/plain');
  if (kind === 'pal') download(base + '.pal', toJascPal(pal), 'text/plain');
  if (kind === 'hex') download(base + '.hex', toHexList(pal), 'text/plain');
  if (kind === 'png') {
    const c = h('canvas', { width: pal.length, height: 1 });
    const x = c.getContext('2d');
    pal.forEach((col, i) => {
      x.fillStyle = cssColor(col);
      x.fillRect(i, 0, 1, 1);
    });
    c.toBlob((b) => download(base + '_palette.png', b));
  }
}

/** A button that opens a small list of actions. */
export function menuButton(label, items) {
  const btn = h('button', { class: 'text-btn small', 'aria-haspopup': 'menu' }, label + ' ▾');
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    openPopup(btn, items);
  });
  return btn;
}

let popup = null;
export function closePopup() {
  if (popup) popup.remove();
  popup = null;
}

export function openPopup(anchor, items) {
  closePopup();
  const r = anchor.getBoundingClientRect();
  popup = h(
    'div',
    { class: 'menu popup', role: 'menu' },
    items.map(([label, fn]) =>
      h('button', {
        class: 'menu-item',
        role: 'menuitem',
        onclick: () => {
          closePopup();
          fn();
        },
      }, h('span', {}, label)),
    ),
  );
  document.body.append(popup);
  const pw = popup.offsetWidth;
  const ph = popup.offsetHeight;
  popup.style.left = Math.max(8, Math.min(window.innerWidth - pw - 8, r.left)) + 'px';
  popup.style.top = (r.bottom + ph + 8 > window.innerHeight ? Math.max(8, r.top - ph - 4) : r.bottom + 4) + 'px';
  popup.querySelector('button')?.focus();
}

document.addEventListener('pointerdown', (e) => {
  if (popup && !popup.contains(e.target)) closePopup();
});
