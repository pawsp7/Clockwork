/**
 * Small seedable RNG so combat and tests are reproducible.
 * Game code calls rand()/chance()/pick(); tests may call seed().
 */
let s = (Date.now() ^ 0x9e3779b9) >>> 0;

export function seed(n) {
  s = (n >>> 0) || 1;
}

/** mulberry32 */
export function rand() {
  s = (s + 0x6d2b79f5) >>> 0;
  let t = s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export const chance = (p) => rand() < p;
export const int = (lo, hi) => lo + Math.floor(rand() * (hi - lo + 1));
export const pick = (arr) => arr[Math.floor(rand() * arr.length)];

export function weighted(entries) {
  // entries: [[value, weight], ...]
  const total = entries.reduce((a, [, w]) => a + w, 0);
  let r = rand() * total;
  for (const [v, w] of entries) {
    r -= w;
    if (r <= 0) return v;
  }
  return entries[entries.length - 1][0];
}

export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Deterministic hash RNG for content generation (independent of game RNG). */
export function hashRng(seedValue) {
  let h = seedValue >>> 0;
  return () => {
    h = (h + 0x6d2b79f5) >>> 0;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
