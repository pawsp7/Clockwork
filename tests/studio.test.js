// Clockwork Studio: the pure parts (pixels, documents, history, file formats).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pack, unpack, toHex, fromHex, over, rgbToHsv, hsvToRgb } from '../studio/js/core/color.js';
import {
  brushOffsets,
  linePoints,
  snappedLine,
  ellipsePoints,
  rectPoints,
  pixelPerfectCorner,
  ditherOn,
  matchMask,
  outlineMask,
  flipH,
  rotate90,
  placeCel,
  scaleCel,
  detectScale,
  downscale,
} from '../studio/js/core/raster.js';
import { createDoc, compositeFrame, serialize, deserialize, cloneDoc } from '../studio/js/core/doc.js';
import { History, diffCels, applyPatch } from '../studio/js/core/history.js';
import { encodeGif, decodeGif } from '../studio/js/core/gif.js';
import { encodePsp } from '../studio/js/core/psp.js';
import { parsePalette, toGpl, toJascPal, toHexList, medianCut, sortRamps } from '../studio/js/core/palette.js';
import { PRESETS } from '../studio/js/palettes.js';

const RED = pack(200, 80, 94);
const INK = pack(28, 18, 12);

const grid = (pts, w, h) => {
  const rows = Array.from({ length: h }, () => Array(w).fill('.'));
  for (const [x, y] of pts) rows[y][x] = '#';
  return rows.map((r) => r.join(''));
};

test('studio colours: pack, hex and HSV round trips', () => {
  assert.deepEqual(unpack(pack(1, 2, 3, 4)), [1, 2, 3, 4]);
  assert.equal(toHex(RED), '#c8505e');
  assert.equal(toHex(pack(200, 80, 94, 128)), '#c8505e80');
  assert.equal(fromHex('#c8505e'), RED);
  assert.equal(fromHex('c8505e80'), pack(200, 80, 94, 128));
  assert.equal(fromHex('#abc'), pack(0xaa, 0xbb, 0xcc));
  assert.equal(fromHex('nope'), null);
  for (const c of [RED, INK, pack(255, 255, 255), pack(0, 0, 0), pack(12, 200, 99)]) {
    const [r, g, b] = unpack(c);
    assert.deepEqual(hsvToRgb(...rgbToHsv(r, g, b)), [r, g, b]);
  }
  assert.equal(over(0, RED), RED);
  assert.equal(over(INK, RED), RED);
  assert.equal(over(RED, 0), RED);
  const half = over(pack(0, 0, 0), pack(255, 255, 255), 0.5);
  assert.deepEqual(unpack(half), [128, 128, 128, 255]);
});

test('studio brushes: square and round footprints', () => {
  assert.equal(brushOffsets(1).length, 1);
  assert.equal(brushOffsets(2).length, 4);
  assert.equal(brushOffsets(3, 'round').length, 5, 'size 3 round is a plus');
  assert.equal(brushOffsets(5, 'round').length, 21, 'size 5 round is 5×5 less the corners');
  assert.equal(brushOffsets(4, 'square').length, 16);
});

test('studio lines: Bresenham ends, and Shift-snapped pixel-art angles', () => {
  const l = linePoints(0, 0, 5, 2);
  assert.deepEqual(l[0], [0, 0]);
  assert.deepEqual(l[l.length - 1], [5, 2]);
  // 2:1 lines are always "two across, one down"
  assert.deepEqual(grid(snappedLine(0, 0, 7, 3), 8, 4), ['##......', '..##....', '....##..', '......##']);
  // a drag close to 45° snaps to a perfect diagonal
  assert.deepEqual(snappedLine(0, 0, 3, 4).slice(0, 4), [[0, 0], [1, 1], [2, 2], [3, 3]]);
  assert.deepEqual(snappedLine(0, 0, 4, 0), [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]]);
});

test('studio shapes: rectangles and thin, symmetric ellipses', () => {
  assert.equal(rectPoints(0, 0, 3, 2, false).length, 10);
  assert.equal(rectPoints(3, 2, 0, 0, true).length, 12);
  const e = grid(ellipsePoints(0, 0, 9, 9, false), 10, 10);
  assert.deepEqual(e, [
    '...####...',
    '.##....##.',
    '.#......#.',
    '#........#',
    '#........#',
    '#........#',
    '#........#',
    '.#......#.',
    '.##....##.',
    '...####...',
  ]);
  for (const row of e) assert.equal(row, [...row].reverse().join(''), 'mirror symmetric');
  assert.equal(ellipsePoints(0, 0, 0, 0, false).length, 1);
});

test('studio pixel-perfect strokes drop the corner of an L', () => {
  assert.equal(pixelPerfectCorner([[0, 0], [1, 0], [1, 1]]), 1);
  assert.equal(pixelPerfectCorner([[0, 0], [1, 0], [2, 0]]), -1);
  assert.equal(pixelPerfectCorner([[0, 0], [1, 1], [2, 2]]), -1);
});

test('studio dither patterns tile and match their density', () => {
  for (const level of [2, 4, 8, 12]) {
    let n = 0;
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) n += ditherOn(x, y, level) ? 1 : 0;
    assert.equal(n, level);
  }
  assert.equal(ditherOn(1, 1, 8), ditherOn(5, 9, 8));
  // 50% is a checkerboard
  assert.equal(ditherOn(0, 0, 8), !ditherOn(1, 0, 8));
});

test('studio fill: contiguous, global, tolerance and selection limits', () => {
  const w = 5;
  const h = 5;
  const cel = new Uint32Array(w * h);
  for (let y = 0; y < 5; y++) cel[y * w + 2] = INK; // a wall down the middle
  const left = matchMask(cel, w, h, 0, 0);
  assert.equal(left.reduce((a, b) => a + b, 0), 10);
  const all = matchMask(cel, w, h, 0, 0, { contiguous: false });
  assert.equal(all.reduce((a, b) => a + b, 0), 20);
  const limited = matchMask(cel, w, h, 0, 0, { limit: (i) => i % w === 0 });
  assert.equal(limited.reduce((a, b) => a + b, 0), 5);
  const near = new Uint32Array([pack(100, 100, 100), pack(104, 100, 100), pack(140, 100, 100)]);
  assert.deepEqual([...matchMask(near, 3, 1, 0, 0, { tolerance: 5 })], [1, 1, 0]);
  // a diagonal gap stops a 4-way fill but not an 8-way one
  const diag = new Uint32Array(9);
  diag[1] = diag[3] = INK;
  assert.equal(matchMask(diag, 3, 3, 0, 0).reduce((a, b) => a + b, 0), 1);
});

test('studio outline rings the art', () => {
  const cel = new Uint32Array(25);
  cel[12] = RED;
  assert.equal(outlineMask(cel, 5, 5).reduce((a, b) => a + b, 0), 4);
  assert.equal(outlineMask(cel, 5, 5, true).reduce((a, b) => a + b, 0), 8);
});

test('studio transforms: flip, rotate, place, scale', () => {
  const cel = Uint32Array.from([1, 2, 3, 4, 5, 6]); // 3×2
  assert.deepEqual([...flipH(cel, 3, 2)], [3, 2, 1, 6, 5, 4]);
  assert.deepEqual([...rotate90(cel, 3, 2, true)], [4, 1, 5, 2, 6, 3]);
  assert.deepEqual([...rotate90(rotate90(cel, 3, 2, true), 2, 3, false)], [...cel]);
  assert.deepEqual([...placeCel(cel, 3, 2, 4, 3, 1, 1)], [0, 0, 0, 0, 0, 1, 2, 3, 0, 4, 5, 6]);
  assert.deepEqual([...scaleCel(Uint32Array.from([1, 2]), 2, 1, 4, 2)], [1, 1, 2, 2, 1, 1, 2, 2]);
});

test('studio spots art that was scaled up and shrinks it back', () => {
  const small = Uint32Array.from([RED, 0, INK, RED, INK, 0]); // 3×2
  const big = scaleCel(small, 3, 2, 48, 32);
  assert.equal(detectScale(big, 48, 32), 16);
  assert.deepEqual([...downscale(big, 48, 32, 16)], [...small]);
  big[5] = INK;
  assert.equal(detectScale(big, 48, 32), 1);
});

test('studio documents composite visible layers with opacity', () => {
  const doc = createDoc(2, 1, { frames: 2 });
  doc.layers[0].cels[0].set([RED, RED]);
  doc.layers.push({ ...doc.layers[0], id: 99, name: 'top', opacity: 0.5, cels: [Uint32Array.from([pack(0, 0, 0), 0]), new Uint32Array(2)] });
  const out = compositeFrame(doc, 0);
  assert.equal(out[1], RED);
  assert.deepEqual(unpack(out[0]), [100, 40, 47, 255]);
  doc.layers[1].visible = false;
  assert.equal(compositeFrame(doc, 0)[0], RED);
});

test('studio projects survive a save and load', () => {
  const doc = createDoc(7, 5, { name: 'sprite', frames: 3, palette: [RED, INK] });
  doc.layers[0].cels[1][17] = RED;
  doc.layers[0].cels[2].fill(pack(1, 2, 3, 4));
  doc.layers[0].opacity = 0.25;
  doc.frames[2].duration = 250;
  const json = JSON.parse(JSON.stringify(serialize(doc)));
  const back = deserialize(json);
  assert.equal(back.name, 'sprite');
  assert.equal(back.w, 7);
  assert.deepEqual(back.palette, [RED, INK]);
  assert.equal(back.frames[2].duration, 250);
  assert.equal(back.layers[0].opacity, 0.25);
  for (let f = 0; f < 3; f++) assert.deepEqual([...back.layers[0].cels[f]], [...doc.layers[0].cels[f]]);
  assert.throws(() => deserialize({ format: 'something else' }));
  const copy = cloneDoc(doc);
  copy.layers[0].cels[1][17] = 0;
  assert.equal(doc.layers[0].cels[1][17], RED, 'clones do not share pixels');
});

test('studio history stores only the changed rectangle', () => {
  const w = 8;
  const before = new Uint32Array(64);
  const after = before.slice();
  after[2 * w + 3] = RED;
  after[4 * w + 5] = INK;
  const p = diffCels(before, after, w, 8);
  assert.deepEqual([p.x, p.y, p.w, p.h], [3, 2, 3, 3]);
  const cel = before.slice();
  applyPatch(cel, w, p, 'after');
  assert.deepEqual([...cel], [...after]);
  applyPatch(cel, w, p, 'before');
  assert.deepEqual([...cel], [...before]);
  assert.equal(diffCels(before, before.slice(), w, 8), null);

  const hist = new History(2);
  let v = 0;
  for (const n of [1, 2, 3]) hist.push({ label: String(n), undo: () => (v = n - 1), redo: () => (v = n) });
  assert.equal(hist.done.length, 2, 'oldest steps fall off');
  hist.undo();
  assert.equal(v, 2);
  hist.redo();
  assert.equal(v, 3);

  // big steps (whole-document snapshots) are dropped oldest-first past the memory cap
  const capped = new History(300, 1000);
  for (let i = 0; i < 5; i++) capped.push({ label: 'big', undo() {}, redo() {}, bytes: 400 });
  assert.equal(capped.done.length, 2);
  assert.ok(capped.bytes <= 1000);
  capped.undo();
  capped.push({ label: 'small', undo() {}, redo() {}, bytes: 10 });
  assert.equal(capped.bytes, 410, 'redo steps thrown away by a new edit stop counting');
});

test('studio GIF export decodes back to the same frames', () => {
  const w = 6;
  const h = 4;
  const frames = [0, 1, 2].map((f) => {
    const data = new Uint32Array(w * h);
    for (let i = 0; i < data.length; i++) data[i] = (i + f) % 4 === 0 ? 0 : pack((i * 40) % 256, f * 60, 200);
    return { data, delay: 120 + f * 10 };
  });
  const gif = encodeGif(w, h, frames);
  assert.equal(String.fromCharCode(...gif.subarray(0, 6)), 'GIF89a');
  const back = decodeGif(gif);
  assert.equal(back.frames.length, 3);
  back.frames.forEach((f, i) => {
    assert.deepEqual([...f.data], [...frames[i].data]);
    assert.equal(f.delay, Math.round(frames[i].delay / 10) * 10);
  });
  // more than 256 colours still encodes (reduced), and every pixel stays close
  const many = new Uint32Array(40 * 40);
  for (let i = 0; i < many.length; i++) many[i] = pack(i % 256, (i * 7) % 256, (i * 13) % 256);
  const g2 = decodeGif(encodeGif(40, 40, [{ data: many, delay: 100 }]));
  let worst = 0;
  g2.frames[0].data.forEach((c, i) => {
    const a = unpack(c);
    const b = unpack(many[i]);
    worst = Math.max(worst, Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]));
  });
  assert.ok(worst < 64, `quantisation error ${worst}`);
});

test('studio opens the 16× reference GIFs at their native size', () => {
  const g = decodeGif(readFileSync(new URL('../references/Art/Mitzi_Back_Walk.gif', import.meta.url)));
  assert.equal(g.frames.length, 4);
  const k = detectScale(g.frames[0].data, g.w, g.h);
  assert.equal(k, 16);
  assert.deepEqual([g.w / k, g.h / k], [32, 48]);
});

test('studio PSP export: signature, layer count and block lengths', () => {
  const cel = new Uint32Array(5 * 3).fill(RED);
  const bytes = encodePsp(5, 3, [
    { name: 'Background', cel, opacity: 1, visible: true },
    { name: 'Ink', cel: new Uint32Array(15), opacity: 0.5, visible: false },
  ], 1);
  const dv = new DataView(bytes.buffer);
  assert.equal(String.fromCharCode(...bytes.subarray(0, 27)), 'Paint Shop Pro Image File\n\x1a');
  assert.equal(dv.getUint16(32, true), 4);
  // walk the top-level blocks: each length must land exactly on the next '~BK'
  let p = 36;
  const ids = [];
  while (p < bytes.length) {
    assert.equal(String.fromCharCode(...bytes.subarray(p, p + 3)), '~BK');
    ids.push(dv.getUint16(p + 4, true));
    p += 10 + dv.getUint32(p + 6, true);
  }
  assert.equal(p, bytes.length);
  assert.deepEqual(ids, [0, 3]);
  // image attributes: width, height, and two layers
  assert.equal(dv.getInt32(36 + 10 + 4, true), 5);
  assert.equal(dv.getInt32(36 + 10 + 8, true), 3);
  assert.equal(dv.getUint16(36 + 10 + 40, true), 2);
});

test('studio palette files: GIMP, JASC (Paint Shop Pro) and hex', () => {
  const cols = [RED, INK, pack(255, 255, 255)];
  assert.deepEqual(parsePalette(toGpl('x', cols)), cols);
  assert.deepEqual(parsePalette(toJascPal(cols)), cols);
  assert.deepEqual(parsePalette(toHexList(cols)), cols);
  assert.deepEqual(parsePalette('c8505e\n1c120c\n'), [RED, INK]);
  const ramps = sortRamps([pack(240, 240, 240), RED, pack(10, 10, 10), pack(120, 30, 40)]);
  assert.deepEqual(ramps.slice(0, 2), [pack(10, 10, 10), pack(240, 240, 240)], 'greys first, dark to light');
  const counts = new Map([[RED, 10], [pack(201, 80, 94), 1], [INK, 5]]);
  assert.equal(medianCut(counts, 2).length, 2);
});

test('studio preset palettes are well-formed', () => {
  assert.ok(PRESETS.length >= 8);
  for (const p of PRESETS) {
    assert.ok(p.id && p.name, 'named');
    assert.ok(p.colors.length >= 2 && p.colors.length <= 64, `${p.id}: ${p.colors.length} colours`);
    for (const c of p.colors) assert.ok(fromHex(c) != null, `${p.id}: ${c}`);
    assert.equal(new Set(p.colors).size, p.colors.length, `${p.id} has no duplicates`);
  }
});
