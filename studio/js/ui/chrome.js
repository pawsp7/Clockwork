/** Menu bar, toolbar, tool options, tabs and status bar. */
import { app, cur, emit, on, isDirty } from './state.js';
import { h, clear } from './dom.js';
import { icon } from './icons.js';
import { TOOLS, toolById, setTool } from './tools.js';
import { COMMANDS, MENUS, run, prettyKey, closeTab, setSize } from './commands.js';
import * as F from './files.js';
import { zoomPercent } from './view.js';
import { toHex, cssColor } from '../core/color.js';
import { closePopup } from './colorpanel.js';

// ─── menus ─────────────────────────────────────────────────────────────────

let openMenu = null;

function closeMenu() {
  if (!openMenu) return;
  openMenu.el.remove();
  openMenu.btn.classList.remove('open');
  openMenu.btn.setAttribute('aria-expanded', 'false');
  openMenu = null;
}

function showMenu(btn, ids) {
  closeMenu();
  closePopup();
  const el = h('div', { class: 'menu', role: 'menu' });
  for (const id of ids) {
    if (id === '-') {
      el.append(h('div', { class: 'menu-sep', role: 'separator' }));
      continue;
    }
    const c = COMMANDS[id];
    const enabled = !c.when || c.when();
    const checked = c.check ? c.check() : null;
    const item = h(
      'button',
      { class: 'menu-item', role: checked == null ? 'menuitem' : 'menuitemcheckbox', 'aria-checked': checked == null ? null : String(checked), disabled: !enabled },
      h('span', { class: 'check' }, checked ? '✓' : ''),
      h('span', { class: 'label' }, c.label),
      h('span', { class: 'keys' }, c.keys ? prettyKey(c.keys[0]) : ''),
    );
    item.addEventListener('click', () => {
      closeMenu();
      run(id);
    });
    el.append(item);
  }
  document.body.append(el);
  const r = btn.getBoundingClientRect();
  el.style.left = Math.max(4, Math.min(window.innerWidth - el.offsetWidth - 4, r.left)) + 'px';
  el.style.top = r.bottom + 2 + 'px';
  el.style.maxHeight = window.innerHeight - r.bottom - 12 + 'px';
  btn.classList.add('open');
  btn.setAttribute('aria-expanded', 'true');
  openMenu = { el, btn };
  el.addEventListener('keydown', (e) => {
    const items = [...el.querySelectorAll('.menu-item:not([disabled])')];
    const i = items.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') items[(i + 1) % items.length]?.focus();
    else if (e.key === 'ArrowUp') items[(i - 1 + items.length) % items.length]?.focus();
    else if (e.key === 'Escape') {
      closeMenu();
      btn.focus();
    } else return;
    e.preventDefault();
    e.stopPropagation();
  });
}

export function initMenubar(root) {
  for (const [name, ids] of MENUS) {
    const btn = h('button', { class: 'menu-btn', 'aria-haspopup': 'menu', 'aria-expanded': 'false' }, name);
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (openMenu && openMenu.btn === btn) closeMenu();
      else showMenu(btn, ids);
    });
    btn.addEventListener('pointerenter', () => openMenu && openMenu.btn !== btn && showMenu(btn, ids));
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        showMenu(btn, ids);
        openMenu.el.querySelector('.menu-item:not([disabled])')?.focus();
      }
    });
    root.append(btn);
  }
  document.addEventListener('pointerdown', (e) => {
    if (openMenu && !openMenu.el.contains(e.target) && !openMenu.btn.contains(e.target)) closeMenu();
  });
  window.addEventListener('resize', closeMenu);
}

// ─── toolbar ───────────────────────────────────────────────────────────────

export function initToolbar(root) {
  const btns = TOOLS.map((t) => {
    const b = h('button', { class: 'tool', title: `${t.name} (${t.key})`, 'aria-label': `${t.name} (${t.key})`, html: icon(t.icon, 2), onclick: () => setTool(t.id) });
    b.dataset.tool = t.id;
    return b;
  });
  const prim = h('span', { class: 'mini primary' });
  const sec = h('span', { class: 'mini secondary' });
  const colors = h('button', { class: 'mini-colors', title: 'Colours: X swaps them', onclick: () => document.body.classList.add('show-side') }, sec, prim);
  root.append(...btns, h('span', { class: 'grow' }), colors);
  const draw = () => {
    for (const b of btns) b.classList.toggle('on', b.dataset.tool === app.tool);
    prim.style.setProperty('--c', cssColor(app.primary));
    sec.style.setProperty('--c', cssColor(app.secondary));
    prim.classList.toggle('clear', !(app.primary >>> 24));
    sec.classList.toggle('clear', !(app.secondary >>> 24));
  };
  on('tool color', draw);
  draw();
}

// ─── tool options ──────────────────────────────────────────────────────────

const DITHERS = [
  [2, '12%'],
  [4, '25%'],
  [6, '37%'],
  [8, '50%'],
  [10, '62%'],
  [12, '75%'],
  [14, '87%'],
];

const HINTS = {
  snapHint: 'Shift snaps to clean pixel angles (1:1, 2:1, 3:1)',
  squareHint: 'Shift for a square / circle',
  selectHint: 'Shift adds · Alt subtracts · then Move (V) to drag the pixels',
  moveHint: 'Drag to move · arrows nudge · Enter places · Esc puts back',
  handHint: 'Or hold Space, or drag with the middle button',
  shadeHint: 'Click darkens, right-click lightens: one step along the palette (sort it into ramps)',
};

export function initOptions(root) {
  const check = (key, label, title) => {
    const el = h('input', { type: 'checkbox', checked: !!app.opts[key] });
    el.addEventListener('change', () => {
      app.opts[key] = el.checked;
      emit('tool', 'view');
    });
    return h('label', { class: 'check', title }, el, label);
  };
  const toggle = (key, label, title) =>
    h('button', {
      class: 'text-btn small toggle' + (app.opts[key] ? ' on' : ''),
      'aria-pressed': String(!!app.opts[key]),
      title,
      onclick: () => {
        app.opts[key] = !app.opts[key];
        emit('tool', 'view');
      },
    }, label);
  const draw = () => {
    clear(root);
    const t = toolById(app.tool);
    root.append(h('span', { class: 'tool-name' }, t.name));
    for (const o of t.options || []) {
      if (o === 'size') {
        const n = h('input', { type: 'number', class: 'num-input', min: 1, max: 32, value: app.opts.size, 'aria-label': 'Brush size' });
        n.addEventListener('change', () => setSize(+n.value || 1));
        root.append(h('div', { class: 'opt' }, h('span', { class: 'small' }, 'Size'), h('button', { class: 'icon-btn', title: 'Smaller ([)', html: icon('minus'), onclick: () => setSize(app.opts.size - 1) }), n, h('button', { class: 'icon-btn', title: 'Bigger (])', html: icon('plus'), onclick: () => setSize(app.opts.size + 1) })));
      } else if (o === 'shape') {
        const seg = (v, label) =>
          h('button', {
            class: 'text-btn small toggle' + (app.opts.shape === v ? ' on' : ''),
            'aria-pressed': String(app.opts.shape === v),
            onclick: () => {
              app.opts.shape = v;
              emit('tool');
            },
          }, label);
        root.append(h('div', { class: 'opt seg' }, seg('square', 'Square'), seg('round', 'Round')));
      } else if (o === 'perfect') root.append(check('pixelPerfect', 'Pixel-perfect', 'Removes the doubled corners a 1px freehand line leaves'));
      else if (o === 'mirror') root.append(h('div', { class: 'opt seg' }, toggle('mirrorX', 'Mirror ↔', 'Mirror left and right'), toggle('mirrorY', 'Mirror ↕', 'Mirror top and bottom')));
      else if (o === 'filled') root.append(check('filled', 'Filled'));
      else if (o === 'contiguous') root.append(check('contiguous', 'Contiguous', 'Only connected pixels; untick for every pixel of that colour'));
      else if (o === 'sampleAll') root.append(check('sampleAll', 'All layers', 'Look at every visible layer, not just this one'));
      else if (o === 'tolerance') {
        const r = h('input', { type: 'range', min: 0, max: 128, value: app.opts.tolerance, 'aria-label': 'Tolerance' });
        const v = h('span', { class: 'small num' }, String(app.opts.tolerance));
        r.addEventListener('input', () => {
          app.opts.tolerance = +r.value;
          v.textContent = r.value;
        });
        root.append(h('label', { class: 'opt', title: '0 means exactly the same colour' }, h('span', { class: 'small' }, 'Tolerance'), r, v));
      } else if (o === 'dither') {
        const sel = h('select', { class: 'small-select', 'aria-label': 'Dither density' }, DITHERS.map(([lv, l]) => h('option', { value: lv, selected: app.opts.dither === lv }, l)));
        sel.addEventListener('change', () => {
          app.opts.dither = +sel.value;
          emit('tool');
        });
        root.append(h('label', { class: 'opt' }, h('span', { class: 'small' }, 'Density'), sel));
      } else if (HINTS[o]) root.append(h('span', { class: 'hint' }, HINTS[o]));
    }
  };
  on('tool', draw);
  draw();
}

// ─── tabs ──────────────────────────────────────────────────────────────────

export function initTabs(root) {
  const draw = () => {
    clear(root);
    app.sessions.forEach((s, i) => {
      const tab = h(
        'div',
        { class: 'tab' + (i === app.active ? ' active' : ''), role: 'tab', 'aria-selected': String(i === app.active), title: `${s.doc.name} · ${s.doc.w}×${s.doc.h} · double-click to rename` },
        h('span', { class: 'tab-name' }, s.doc.name),
        isDirty(s) ? h('span', { class: 'dot', title: 'Not saved or exported yet' }, '•') : null,
        h('button', { class: 'tab-close', title: 'Close', 'aria-label': `Close ${s.doc.name}`, html: icon('close', 1.5), onclick: (e) => (e.stopPropagation(), closeTab(i)) }),
      );
      tab.addEventListener('click', () => F.switchTo(i));
      tab.addEventListener('auxclick', (e) => e.button === 1 && closeTab(i));
      tab.addEventListener('dblclick', () => {
        const label = tab.querySelector('.tab-name');
        const input = h('input', { class: 'rename', type: 'text', value: s.doc.name, maxlength: 64, 'aria-label': 'Drawing name' });
        label.replaceWith(input);
        input.focus();
        input.select();
        const done = (save) => {
          if (save && input.value.trim()) s.doc.name = input.value.trim();
          emit('session');
        };
        input.addEventListener('keydown', (ev) => {
          ev.stopPropagation();
          if (ev.key === 'Enter') input.blur();
          if (ev.key === 'Escape') {
            input.value = '';
            input.blur();
          }
        });
        input.addEventListener('blur', () => done(true), { once: true });
      });
      root.append(tab);
    });
    root.append(h('button', { class: 'tab-new', title: 'New drawing', 'aria-label': 'New drawing', html: icon('plus'), onclick: () => run('new') }));
  };
  on('session pixels structure', draw);
}

// ─── status bar ────────────────────────────────────────────────────────────

export function initStatus(root) {
  const pos = h('span', { class: 'num' });
  const col = h('span', { class: 'num status-color' });
  const chip = h('i', { class: 'chip', hidden: true });
  const info = h('span', { class: 'num grow right' });
  root.append(pos, h('span', { class: 'status-col' }, chip, col), info);
  const draw = () => {
    const s = cur();
    if (!s) {
      info.textContent = '';
      return;
    }
    const sel = s.selection;
    info.textContent = [
      sel ? `sel ${sel.w}×${sel.h}${s.float ? ' (floating)' : ''}` : '',
      `${s.doc.w}×${s.doc.h}`,
      `layer ${s.layer + 1}/${s.doc.layers.length}`,
      `frame ${s.frame + 1}/${s.doc.frames.length}`,
      `${zoomPercent(s)}%`,
    ]
      .filter(Boolean)
      .join('  ·  ');
  };
  on('session structure selection view frame', draw);
  return (p, c) => {
    if (!p) {
      pos.textContent = '';
      col.textContent = '';
      chip.hidden = true;
      return;
    }
    pos.textContent = `${p.x}, ${p.y}`;
    chip.hidden = c == null;
    col.textContent = c == null ? '' : c >>> 24 ? toHex(c) : 'clear';
    if (c != null) chip.style.background = cssColor(c);
  };
}
