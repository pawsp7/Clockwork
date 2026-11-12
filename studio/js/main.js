/**
 * Clockwork Studio: a pixel-art editor in the game's colours.
 * No build step, no dependencies: ES modules straight from the folder.
 */
import { app, cur, emit, on, newDocSession, isDirty } from './ui/state.js';
import { $, h, isTyping } from './ui/dom.js';
import { icon, LOGO } from './ui/icons.js';
import { initView, setSpace, cancelStroke, isStroking, fit } from './ui/view.js';
import { initColorPanel, initPalettePanel, closePopup } from './ui/colorpanel.js';
import { initLayers, initTimeline, initPreview } from './ui/panels.js';
import { initMenubar, initToolbar, initOptions, initTabs, initStatus } from './ui/chrome.js';
import { COMMANDS, run } from './ui/commands.js';
import { TOOLS, setTool } from './ui/tools.js';
import * as E from './ui/editor.js';
import * as F from './ui/files.js';
import * as D from './ui/dialogs.js';
import { toast } from './ui/toast.js';

// ─── layout ────────────────────────────────────────────────────────────────

$('#brand').innerHTML = LOGO + '<span class="brand-text"><span>Clockwork</span> <b>Studio</b></span>';
initMenubar($('#menubar'));
initTabs($('#tabs'));
initToolbar($('#tools'));
initOptions($('#options'));
const hoverStatus = initStatus($('#status'));
initView($('#canvasWrap'), $('#view'), hoverStatus);
initColorPanel($('#colorPanel .panel-body'));
initPalettePanel($('#palettePanel .panel-body'), { openFile: F.openFile });
initPreview($('#previewPanel .panel-body'));
initLayers($('#layersPanel .panel-body'));
initTimeline($('#timeline'));

// collapsible panels
for (const p of document.querySelectorAll('.panel')) {
  const head = p.querySelector('.panel-head');
  head.addEventListener('click', () => {
    p.classList.toggle('collapsed');
    head.setAttribute('aria-expanded', String(!p.classList.contains('collapsed')));
  });
}

// narrow screens: the side panels slide over the canvas
const sideBtn = $('#sideToggle');
sideBtn.innerHTML = icon('menu') + '<span>Panels</span>';
sideBtn.addEventListener('click', () => document.body.classList.toggle('show-side'));
$('#sideClose').innerHTML = icon('close');
$('#sideClose').addEventListener('click', () => document.body.classList.remove('show-side'));

// welcome card when no drawing is open
const welcome = $('#welcome');
welcome.append(
  h('h2', {}, 'Nothing open'),
  h('p', { class: 'muted' }, 'Start a drawing, open a PNG / GIF / project, or open a copy of the game’s own art.'),
  h(
    'div',
    { class: 'row center' },
    h('button', { class: 'text-btn primary', onclick: () => run('new') }, 'New drawing'),
    h('button', { class: 'text-btn', onclick: () => run('open') }, 'Open a file'),
    h('button', { class: 'text-btn', onclick: () => run('library') }, 'Clockwork art'),
  ),
);
on('session', () => {
  welcome.hidden = app.sessions.length > 0;
  document.title = cur() ? `${cur().doc.name}${isDirty(cur()) ? ' •' : ''} · Clockwork Studio` : 'Clockwork Studio';
});

// ─── keyboard ──────────────────────────────────────────────────────────────

const keymap = new Map();
for (const [id, c] of Object.entries(COMMANDS)) for (const k of c.keys || []) keymap.set(k, id);

function combo(e) {
  let key;
  if (/^Key[A-Z]$/.test(e.code)) key = e.code.slice(3).toLowerCase();
  else if (/^Digit\d$/.test(e.code) && !e.shiftKey) key = e.code.slice(5);
  else key = e.key.toLowerCase();
  const named = key.length > 1;
  const alnum = /^[a-z0-9]$/.test(key);
  // Shift is part of a symbol (?, +): only count it for letters and named keys
  const shift = e.shiftKey && (named || alnum);
  return (e.ctrlKey || e.metaKey ? 'ctrl+' : '') + (e.altKey ? 'alt+' : '') + (shift ? 'shift+' : '') + key;
}

window.addEventListener('keydown', (e) => {
  if (D.isOpen()) return;
  if (isTyping()) {
    if (e.key === 'Escape') document.activeElement.blur();
    return;
  }
  const s = cur();
  // Enter and Space press a focused button; leave them to it
  const focus = document.activeElement;
  if ((e.key === 'Enter' || e.code === 'Space') && focus && focus !== document.body && focus.id !== 'view' && /^(BUTTON|A|SUMMARY)$/.test(focus.tagName)) return;
  if (e.code === 'Space') {
    e.preventDefault();
    if (!e.repeat) setSpace(true);
    return;
  }
  if (e.key === 'Escape') {
    closePopup();
    document.body.classList.remove('show-side');
    if (cancelStroke()) return;
    if (s && s.float) E.cancelFloat(s);
    else if (s && s.selection) E.deselect();
    return;
  }
  const k = combo(e);
  // arrows nudge a selection, otherwise step through frames
  if (/^(shift\+)?arrow(left|right|up|down)$/.test(k) && s) {
    e.preventDefault();
    const d = e.shiftKey ? 10 : 1;
    const dir = k.replace('shift+', '').slice(5);
    if (s.selection || s.float) {
      if (isStroking()) return;
      E.nudge(dir === 'left' ? -d : dir === 'right' ? d : 0, dir === 'up' ? -d : dir === 'down' ? d : 0);
    } else if (dir === 'left' || dir === 'right') E.gotoFrame(s.frame + (dir === 'left' ? -1 : 1));
    return;
  }
  const id = keymap.get(k);
  if (id) {
    e.preventDefault();
    if (isStroking() && id !== 'swap') return;
    run(id);
    return;
  }
  if (!e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
    const t = TOOLS.find((t) => t.key.toLowerCase() === k);
    if (t) {
      e.preventDefault();
      setTool(t.id);
    }
  }
});

window.addEventListener('keyup', (e) => {
  if (e.code === 'Space') setSpace(false);
});
window.addEventListener('blur', () => setSpace(false));

// ─── paste from other apps, drag and drop ──────────────────────────────────

window.addEventListener('paste', async (e) => {
  if (D.isOpen() || isTyping()) return;
  const item = [...(e.clipboardData?.items || [])].find((i) => i.type.startsWith('image/'));
  e.preventDefault();
  if (!cur()) {
    if (item) await F.openFiles([item.getAsFile()]);
    return;
  }
  if (item) {
    const img = await F.decodeImage(item.getAsFile());
    E.paste({ w: img.w, h: img.h, data: img.frames[0].data, mask: null, x: 0, y: 0 });
    toast(`Pasted an image (${img.w}×${img.h}). Drag to place, Enter to drop it.`);
  } else E.paste();
});

window.addEventListener('copy', (e) => {
  if (D.isOpen() || isTyping()) return;
  e.preventDefault();
  run('copy');
});
window.addEventListener('cut', (e) => {
  if (D.isOpen() || isTyping()) return;
  e.preventDefault();
  run('cut');
});

let dragDepth = 0;
window.addEventListener('dragenter', (e) => {
  if (!e.dataTransfer?.types?.includes('Files')) return;
  dragDepth++;
  document.body.classList.add('dropping');
});
window.addEventListener('dragleave', () => {
  dragDepth = Math.max(0, dragDepth - 1);
  if (!dragDepth) document.body.classList.remove('dropping');
});
window.addEventListener('dragover', (e) => {
  if (e.dataTransfer?.types?.includes('Files')) e.preventDefault();
});
window.addEventListener('drop', (e) => {
  if (!e.dataTransfer?.files?.length) return;
  e.preventDefault();
  dragDepth = 0;
  document.body.classList.remove('dropping');
  D.openImageFiles([...e.dataTransfer.files]);
});

window.addEventListener('beforeunload', (e) => {
  // autosave normally covers a reload; warn only if it could not
  if (!F.flushAutosave() && app.sessions.some(isDirty)) {
    e.preventDefault();
    e.returnValue = '';
  }
});

// ─── start ─────────────────────────────────────────────────────────────────

const params = new URLSearchParams(location.search);
if (params.has('fresh')) {
  try {
    localStorage.removeItem('clockwork-studio:autosave:v1');
  } catch {
    /* storage blocked */
  }
}
if (F.restoreAutosave()) {
  toast('Welcome back: your drawings were restored from this browser.');
  emit('session', 'structure', 'pixels', 'selection', 'color', 'tool', 'view');
} else {
  const s = newDocSession(32, 32, { name: 'untitled' });
  F.addSession(s);
}
const open = params.get('open');
if (open) {
  const item = D.LIBRARY.flatMap((g) => g.items).find((it) => it[1].endsWith('/' + open) || it[1].endsWith('/' + open + '.png'));
  if (item) D.openLibraryItem(item);
}
emit('tool', 'color');
requestAnimationFrame(() => {
  for (const s of app.sessions) if (!s.view && s === cur()) fit(s);
});

// for the console and tests
window.studio = { app, cur, run, E, F };
