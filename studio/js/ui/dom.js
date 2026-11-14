/** Small DOM helpers. */
import { toast } from './toast.js';

export function h(tag, props = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'style' && typeof v === 'object') {
      for (const [p, val] of Object.entries(v)) p.startsWith('--') ? el.style.setProperty(p, val) : (el.style[p] = val);
    }
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'value' || k === 'checked' || k === 'disabled' || k === 'selected') el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid == null || kid === false) continue;
    el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return el;
}

export const $ = (sel, root = document) => root.querySelector(sel);

export function clear(el) {
  while (el.firstChild) el.firstChild.remove();
  return el;
}

/** A canvas showing a w×h Uint32Array cel, scaled by CSS to fit a box. */
export function celCanvas(buf, w, h, box, cls = 'thumb') {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  c.className = cls;
  drawCel(c, buf, w, h);
  fitCanvas(c, w, h, box);
  return c;
}

export function drawCel(c, buf, w, h) {
  if (c.width !== w || c.height !== h) {
    c.width = w;
    c.height = h;
  }
  const img = new ImageData(new Uint8ClampedArray(buf.buffer, buf.byteOffset, w * h * 4).slice(), w, h);
  c.getContext('2d').putImageData(img, 0, 0);
}

export function fitCanvas(c, w, h, box) {
  const k = Math.min(box / w, box / h);
  // whole-number scale when it fits, so thumbnails stay crisp
  const s = k >= 1 ? Math.floor(k) : k;
  c.style.width = Math.max(1, Math.round(w * s)) + 'px';
  c.style.height = Math.max(1, Math.round(h * s)) + 'px';
}

// Inside a claude.ai artifact the page cannot start a download itself; it asks
// the viewer through the `downloads` capability, which takes only some types.
const HOST = typeof window !== 'undefined' && window.claude && typeof window.claude.use === 'function' ? window.claude : null;
const HOSTED_TYPES = new Set(['gif', 'png', 'jpg', 'jpeg', 'webp', 'txt', 'json', 'md']);
let saver = HOST ? undefined : null; // undefined while the viewer is still answering
const saverReady = HOST ? HOST.use('downloads').then((d) => (saver = d), () => (saver = null)) : Promise.resolve(null);

/** Can a file of this type be saved here? (Everything can, outside an artifact.) */
export const canSaveType = (ext) => !HOST || HOSTED_TYPES.has(String(ext).toLowerCase());
/** False once we know this view cannot save files at all. */
export const canDownload = () => !HOST || saver !== null;

/** Save a file for the viewer. Resolves true once it is on its way, false if not. */
export async function download(name, data, type) {
  const blob = data instanceof Blob ? data : new Blob([data], { type });
  if (HOST) {
    const d = saver === undefined ? await saverReady : saver;
    if (!d) {
      toast('Saving files is not available in this view.', 'warn');
      return false;
    }
    try {
      await d.save({ filename: name, data: blob });
      return true;
    } catch (err) {
      const code = err && err.code;
      if (code === 'declined') return false;
      toast(code === 'rate_limited' ? 'A save is already waiting for your answer.' : `Couldn't save ${name} (${code || 'unknown error'}).`, 'warn');
      return false;
    }
  }
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: name });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return true;
}

export const isTyping = (el = document.activeElement) =>
  !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable) && el.type !== 'checkbox' && el.type !== 'range' && el.type !== 'button';
