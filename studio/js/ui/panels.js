/** Layers, timeline and the animation preview. */
import { app, cur, emit, on } from './state.js';
import { h, clear, drawCel, fitCanvas } from './dom.js';
import { icon } from './icons.js';
import * as E from './editor.js';
import { compositeFrame } from '../core/doc.js';

/** Redraw thumbnails at most this often while a stroke is going on. */
function throttle(fn, ms) {
  let t = 0;
  let timer = null;
  return () => {
    const now = performance.now();
    if (now - t >= ms) {
      t = now;
      fn();
    } else if (!timer) {
      timer = setTimeout(() => {
        timer = null;
        t = performance.now();
        fn();
      }, ms - (now - t));
    }
  };
}

const btn = (name, title, onclick, cls = 'icon-btn') => h('button', { class: cls, title, 'aria-label': title, html: icon(name), onclick });

// ─── layers ────────────────────────────────────────────────────────────────

export function initLayers(root) {
  const list = h('div', { class: 'layer-list', role: 'listbox', 'aria-label': 'Layers' });
  const opacity = h('input', { type: 'range', min: 0, max: 100, step: 1, 'aria-label': 'Layer opacity' });
  const opVal = h('span', { class: 'muted small num' });
  opacity.addEventListener('input', () => {
    const s = cur();
    if (s) E.setLayerProp(s.layer, 'opacity', +opacity.value / 100);
  });
  root.append(
    h(
      'div',
      { class: 'panel-tools' },
      btn('plus', 'New layer', E.addLayer),
      btn('dup', 'Duplicate layer', E.duplicateLayer),
      btn('merge', 'Merge down', E.mergeDown),
      btn('up', 'Move layer up', () => E.moveLayer(1)),
      btn('down', 'Move layer down', () => E.moveLayer(-1)),
      btn('trash', 'Delete layer', E.deleteLayer),
    ),
    list,
    h('label', { class: 'row opacity' }, h('span', { class: 'small' }, 'Opacity'), opacity, opVal),
  );

  let thumbs = [];
  let dragFrom = -1;
  const build = () => {
    const s = cur();
    clear(list);
    thumbs = [];
    if (!s) return;
    const n = s.doc.layers.length;
    for (let i = n - 1; i >= 0; i--) {
      const l = s.doc.layers[i];
      const th = h('canvas', { class: 'thumb' });
      thumbs.push([th, l]);
      const name = h('span', { class: 'layer-name', title: 'Double-click to rename' }, l.name);
      const row = h(
        'div',
        { class: 'layer' + (i === s.layer ? ' active' : '') + (l.visible ? '' : ' hidden-layer'), role: 'option', 'aria-selected': String(i === s.layer), draggable: 'true' },
        btn(l.visible ? 'eye' : 'eyeOff', l.visible ? 'Hide layer' : 'Show layer', (e) => {
          e.stopPropagation();
          E.setLayerProp(i, 'visible', !l.visible);
        }, 'icon-btn ghost'),
        btn(l.locked ? 'lock' : 'unlock', l.locked ? 'Unlock layer' : 'Lock layer', (e) => {
          e.stopPropagation();
          E.setLayerProp(i, 'locked', !l.locked);
        }, 'icon-btn ghost' + (l.locked ? ' on' : ' dim')),
        h('span', { class: 'thumb-box' }, th),
        name,
      );
      row.addEventListener('click', () => E.selectLayer(i));
      name.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        const input = h('input', { class: 'rename', type: 'text', value: l.name, maxlength: 64 });
        name.replaceWith(input);
        input.focus();
        input.select();
        const done = (save) => {
          if (save && input.value.trim()) E.setLayerProp(i, 'name', input.value.trim());
          else emit('structure');
        };
        input.addEventListener('keydown', (ev) => {
          ev.stopPropagation();
          if (ev.key === 'Enter') done(true);
          if (ev.key === 'Escape') done(false);
        });
        input.addEventListener('blur', () => done(true), { once: true });
      });
      row.addEventListener('dragstart', (e) => {
        dragFrom = i;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', l.name);
      });
      row.addEventListener('dragover', (e) => {
        if (dragFrom >= 0) {
          e.preventDefault();
          row.classList.add('drop');
        }
      });
      row.addEventListener('dragleave', () => row.classList.remove('drop'));
      row.addEventListener('drop', (e) => {
        e.preventDefault();
        row.classList.remove('drop');
        if (dragFrom >= 0) E.reorderLayer(dragFrom, i);
        dragFrom = -1;
      });
      list.append(row);
    }
    const layer = s.doc.layers[s.layer];
    opacity.value = Math.round(layer.opacity * 100);
    opVal.textContent = Math.round(layer.opacity * 100) + '%';
    paint();
  };
  const paint = () => {
    const s = cur();
    if (!s) return;
    for (const [c, l] of thumbs) {
      drawCel(c, E.displayCel(s, l), s.doc.w, s.doc.h);
      fitCanvas(c, s.doc.w, s.doc.h, 28);
    }
  };
  on('structure session', build);
  on('pixels frame', throttle(paint, 150));
}

// ─── timeline ──────────────────────────────────────────────────────────────

let playTimer = null;

export function togglePlay(force) {
  const s = cur();
  const want = force ?? !app.playing;
  clearTimeout(playTimer);
  playTimer = null;
  app.playing = false;
  if (want && s && s.doc.frames.length > 1) {
    E.settle(s);
    app.playing = true;
    const tick = () => {
      const s2 = cur();
      if (!app.playing || s2 !== s) return togglePlay(false);
      s.frame = (s.frame + 1) % s.doc.frames.length;
      emit('pixels', 'frame');
      playTimer = setTimeout(tick, s.doc.frames[s.frame].duration);
    };
    playTimer = setTimeout(tick, s.doc.frames[s.frame].duration);
  }
  emit('frame', 'playing');
}
on('stop-playing session', () => app.playing && togglePlay(false));

export function initTimeline(root) {
  const strip = h('div', { class: 'frames', role: 'listbox', 'aria-label': 'Frames' });
  const play = h('button', { class: 'icon-btn', onclick: () => togglePlay() });
  const label = h('span', { class: 'frame-label num' });
  const dur = h('input', { type: 'number', min: 10, max: 10000, step: 10, class: 'num-input', 'aria-label': 'Frame duration in milliseconds' });
  dur.addEventListener('change', () => E.setDuration(+dur.value));
  const onionBtn = h('button', { class: 'icon-btn', title: 'Onion skin: show the frames either side (Shift+O)', html: icon('onion'), onclick: () => toggleOnion() });
  root.append(
    h(
      'div',
      { class: 'timeline-bar' },
      h('span', { class: 'panel-title' }, 'Frames'),
      btn('prev', 'Previous frame (,)', () => E.gotoFrame(cur().frame - 1)),
      play,
      btn('next', 'Next frame (.)', () => E.gotoFrame(cur().frame + 1)),
      label,
      h('label', { class: 'row small', title: 'How long this frame shows' }, dur, 'ms'),
      h('button', { class: 'text-btn small', title: 'Give every frame this duration', onclick: () => E.setDuration(+dur.value, true) }, 'All'),
      h('span', { class: 'sep' }),
      btn('plus', 'New frame (Alt+N)', () => E.addFrame(false)),
      btn('dup', 'Duplicate frame (Alt+D)', () => E.addFrame(true)),
      btn('left', 'Move frame left', () => E.moveFrame(-1)),
      btn('right', 'Move frame right', () => E.moveFrame(1)),
      btn('trash', 'Delete frame', E.deleteFrame),
      h('span', { class: 'sep' }),
      onionBtn,
    ),
    strip,
  );

  let cells = [];
  let dragFrom = -1;
  const build = () => {
    const s = cur();
    clear(strip);
    cells = [];
    if (!s) return;
    s.doc.frames.forEach((f, i) => {
      const th = h('canvas', { class: 'thumb' });
      const cell = h(
        'button',
        { class: 'frame', role: 'option', title: `Frame ${i + 1} · ${f.duration} ms`, draggable: 'true' },
        h('span', { class: 'thumb-box' }, th),
        h('span', { class: 'frame-num num' }, String(i + 1)),
      );
      cell.addEventListener('click', () => E.gotoFrame(i));
      cell.addEventListener('dragstart', (e) => {
        dragFrom = i;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(i));
      });
      cell.addEventListener('dragover', (e) => {
        if (dragFrom >= 0) {
          e.preventDefault();
          cell.classList.add('drop');
        }
      });
      cell.addEventListener('dragleave', () => cell.classList.remove('drop'));
      cell.addEventListener('drop', (e) => {
        e.preventDefault();
        cell.classList.remove('drop');
        if (dragFrom >= 0) E.reorderFrame(dragFrom, i);
        dragFrom = -1;
      });
      cells.push([cell, th, i]);
      strip.append(cell);
    });
    mark();
    paintAll();
  };
  const paintFrame = (s, th, i) => {
    const buf = compositeFrame(s.doc, i, undefined, (l) => E.displayCel(s, l, i));
    drawCel(th, buf, s.doc.w, s.doc.h);
    fitCanvas(th, s.doc.w, s.doc.h, 40);
  };
  const paintAll = () => {
    const s = cur();
    if (s) for (const [, th, i] of cells) paintFrame(s, th, i);
  };
  const paintCurrent = () => {
    const s = cur();
    if (!s) return;
    const c = cells[s.frame];
    if (c) paintFrame(s, c[1], c[2]);
  };
  const mark = () => {
    const s = cur();
    if (!s) return;
    cells.forEach(([cell], i) => {
      cell.classList.toggle('active', i === s.frame);
      cell.setAttribute('aria-selected', String(i === s.frame));
    });
    const active = cells[s.frame];
    if (active) {
      // keep the current frame in view, scrolling only the strip
      const el = active[0];
      if (el.offsetLeft < strip.scrollLeft) strip.scrollLeft = el.offsetLeft - 10;
      else if (el.offsetLeft + el.offsetWidth > strip.scrollLeft + strip.clientWidth) strip.scrollLeft = el.offsetLeft + el.offsetWidth - strip.clientWidth + 10;
    }
    label.textContent = `${s.frame + 1} / ${s.doc.frames.length}`;
    if (document.activeElement !== dur) dur.value = s.doc.frames[s.frame].duration;
    play.innerHTML = icon(app.playing ? 'pause' : 'play');
    play.title = app.playing ? 'Stop (P)' : 'Play in the canvas (P)';
    onionBtn.classList.toggle('on', app.view.onion);
  };
  on('structure session', build);
  on('frame playing view', mark);
  on('pixels', throttle(() => (app.playing ? null : paintCurrent()), 150));
}

export function toggleOnion() {
  app.view.onion = !app.view.onion;
  emit('view', 'pixels');
}

// ─── preview ───────────────────────────────────────────────────────────────

export function initPreview(root) {
  const c = h('canvas', { class: 'preview-canvas' });
  const box = h('div', { class: 'preview-box' }, c);
  let scale = 'fit';
  let looping = false;
  let frame = 0;
  let timer = null;
  const scaleSel = h(
    'select',
    { class: 'small-select', 'aria-label': 'Preview size' },
    ['fit', '1', '2', '3', '4'].map((v) => h('option', { value: v }, v === 'fit' ? 'Fit' : v + '×')),
  );
  scaleSel.addEventListener('change', () => {
    scale = scaleSel.value;
    draw();
  });
  const loopBtn = h('button', { class: 'text-btn small', title: 'Loop the animation here while you keep drawing' });
  const tick = () => {
    const s = cur();
    if (!looping || !s) return;
    frame = (frame + 1) % s.doc.frames.length;
    draw();
    timer = setTimeout(tick, s.doc.frames[frame].duration);
  };
  const setLoop = (v) => {
    looping = v;
    clearTimeout(timer);
    const s = cur();
    if (looping && s) {
      frame = s.frame;
      timer = setTimeout(tick, s.doc.frames[frame].duration);
    }
    loopBtn.innerHTML = icon(looping ? 'pause' : 'play') + (looping ? ' Stop' : ' Loop');
    draw();
  };
  loopBtn.addEventListener('click', () => setLoop(!looping));
  root.append(box, h('div', { class: 'row' }, loopBtn, h('span', { class: 'grow' }), h('label', { class: 'row small' }, 'Size ', scaleSel)));
  const draw = () => {
    const s = cur();
    if (!s) return;
    const f = looping ? frame % s.doc.frames.length : s.frame;
    const buf = compositeFrame(s.doc, f, undefined, (l) => E.displayCel(s, l, f));
    drawCel(c, buf, s.doc.w, s.doc.h);
    const boxW = box.clientWidth - 8 || 220;
    if (scale === 'fit') fitCanvas(c, s.doc.w, s.doc.h, Math.min(boxW, 180));
    else {
      c.style.width = s.doc.w * +scale + 'px';
      c.style.height = s.doc.h * +scale + 'px';
    }
  };
  on('pixels structure session frame', throttle(draw, 120));
  setLoop(false);
}
