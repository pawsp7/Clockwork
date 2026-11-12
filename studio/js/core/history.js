/**
 * Undo history. An entry is { label, undo(), redo() }. Pixel edits store only
 * the rectangle that changed, before and after.
 */

export class History {
  /** Keeps at most `limit` steps, and drops the oldest once they hold more than `maxBytes`. */
  constructor(limit = 300, maxBytes = 192 * 1024 * 1024) {
    this.limit = limit;
    this.maxBytes = maxBytes;
    this.bytes = 0;
    this.done = [];
    this.undone = [];
    this.version = 0; // bumps on every change; the editor compares it to know what is saved
  }

  push(entry) {
    for (const e of this.undone) this.bytes -= e.bytes || 0;
    this.undone.length = 0;
    this.done.push(entry);
    this.bytes += entry.bytes || 0;
    while (this.done.length > this.limit || (this.bytes > this.maxBytes && this.done.length > 1)) {
      this.bytes -= this.done.shift().bytes || 0;
    }
    this.version++;
    return entry;
  }

  undo() {
    const e = this.done.pop();
    if (!e) return null;
    e.undo();
    this.undone.push(e);
    this.version++;
    return e;
  }

  redo() {
    const e = this.undone.pop();
    if (!e) return null;
    e.redo();
    this.done.push(e);
    this.version++;
    return e;
  }

  get canUndo() {
    return this.done.length > 0;
  }

  get canRedo() {
    return this.undone.length > 0;
  }

  clear() {
    this.done.length = 0;
    this.undone.length = 0;
    this.bytes = 0;
  }
}

/** The changed rectangle between two cels, or null if they are identical. */
export function diffCels(before, after, w, h) {
  let x0 = w;
  let y0 = h;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      if (before[row + x] !== after[row + x]) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return null;
  const pw = x1 - x0 + 1;
  const ph = y1 - y0 + 1;
  const b = new Uint32Array(pw * ph);
  const a = new Uint32Array(pw * ph);
  for (let y = 0; y < ph; y++) {
    const src = (y + y0) * w + x0;
    b.set(before.subarray(src, src + pw), y * pw);
    a.set(after.subarray(src, src + pw), y * pw);
  }
  return { x: x0, y: y0, w: pw, h: ph, before: b, after: a };
}

/** Write one side ('before' or 'after') of a patch into a cel of width w. */
export function applyPatch(cel, w, patch, side) {
  const src = patch[side];
  for (let y = 0; y < patch.h; y++) {
    const dst = (y + patch.y) * w + patch.x;
    cel.set(src.subarray(y * patch.w, (y + 1) * patch.w), dst);
  }
}
