/** Minimal DOM helpers. h('div.panel.dialog', {onclick}, ...children) */

export function h(sel, props = {}, ...kids) {
  const [tag, ...classes] = sel.split('.');
  const el = document.createElement(tag || 'div');
  if (classes.length) el.className = classes.join(' ');
  if (props && (typeof props !== 'object' || props instanceof Node || Array.isArray(props))) {
    kids.unshift(props);
    props = {};
  }
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k === 'class') el.className += ` ${v}`;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'html') el.innerHTML = v;
    else if (k in el && k !== 'list') el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  append(el, kids);
  return el;
}

function append(el, kids) {
  for (const k of kids.flat(Infinity)) {
    if (k == null || k === false) continue;
    el.appendChild(k instanceof Node ? k : document.createTextNode(String(k)));
  }
}

export function clear(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
  return el;
}

/** A DOM canvas showing a pixel sprite at integer scale. */
export function pix(src, scale = 2, cls = '') {
  const c = document.createElement('canvas');
  c.width = src.width * scale;
  c.height = src.height * scale;
  if (cls) c.className = cls;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(src, 0, 0, c.width, c.height);
  c.style.imageRendering = 'pixelated';
  return c;
}

export function bar(value, max, cls = '') {
  const pct = Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100));
  return h(`div.bar${cls ? '.' + cls : ''}`, h('i', { style: { width: `${pct}%` } }));
}

export function gemEl(el, title) {
  return h(`span.gem.${el || 'empty'}`, { title: title || el || 'empty slot' });
}

export function btn(label, onClick, opts = {}) {
  const b = h(`button.btn${opts.cls ? '.' + opts.cls.split(' ').join('.') : ''}`, {
    type: 'button',
    disabled: !!opts.disabled,
    title: opts.title || null,
    onclick: (e) => {
      e.stopPropagation();
      if (b.disabled) return;
      onClick?.(e);
    },
  });
  if (opts.key) b.appendChild(h('span.k', opts.key));
  b.appendChild(typeof label === 'string' ? document.createTextNode(label) : label);
  return b;
}
