import { scene, BW, BH } from './backgrounds.js';

/** Scene rendering (backdrop + lights + particles + vignette) and transient effects. */

export const SW = 960;
export const SH = 540;
const SCALE = SW / BW;

function hash(i, k = 1) {
  const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

const PARTICLES = {
  ash: { n: 40, draw: (ctx, i, t) => drift(ctx, i, t, { vx: 6, vy: 14, color: 'rgba(200,184,170,', a: 0.35, size: 2 }) },
  rain: { n: 90, draw: (ctx, i, t) => rain(ctx, i, t) },
  fireflies: { n: 22, draw: (ctx, i, t) => firefly(ctx, i, t) },
  embers: { n: 46, draw: (ctx, i, t) => drift(ctx, i, t, { vx: 8, vy: -26, color: 'rgba(255,140,60,', a: 0.8, size: 2, flick: true }) },
  dust: { n: 30, draw: (ctx, i, t) => drift(ctx, i, t, { vx: 3, vy: 4, color: 'rgba(220,200,170,', a: 0.25, size: 2 }) },
  motes: { n: 34, draw: (ctx, i, t) => drift(ctx, i, t, { vx: 2, vy: -8, color: 'rgba(140,160,255,', a: 0.55, size: 2, flick: true }) },
  feathers: { n: 18, draw: (ctx, i, t) => feather(ctx, i, t) },
};

function drift(ctx, i, t, o) {
  const s = t / 1000;
  const x = (((hash(i) * SW + s * o.vx * (0.6 + hash(i, 2))) % SW) + SW) % SW;
  const y = (((hash(i, 3) * SH + s * o.vy * (0.6 + hash(i, 4))) % SH) + SH) % SH;
  const wob = Math.sin(s * 1.3 + i) * 6;
  let a = o.a * (0.5 + hash(i, 5) * 0.5);
  if (o.flick) a *= 0.6 + 0.4 * Math.sin(s * 5 + i * 3);
  ctx.fillStyle = `${o.color}${a.toFixed(3)})`;
  ctx.fillRect(Math.round((x + wob) / 2) * 2, Math.round(y / 2) * 2, o.size, o.size);
}

function rain(ctx, i, t) {
  const s = t / 1000;
  const x = (((hash(i) * SW - s * 120) % SW) + SW) % SW;
  const y = (((hash(i, 2) * SH + s * 520 * (0.8 + hash(i, 3) * 0.4)) % SH) + SH) % SH;
  ctx.fillStyle = 'rgba(170,180,210,0.28)';
  ctx.fillRect(Math.round(x), Math.round(y), 2, 10);
}

function firefly(ctx, i, t) {
  const s = t / 1000;
  const x = hash(i) * SW + Math.sin(s * 0.4 + i) * 40;
  const y = 120 + hash(i, 2) * 300 + Math.cos(s * 0.5 + i * 2) * 24;
  const a = Math.max(0, Math.sin(s * 1.5 + i * 7));
  ctx.fillStyle = `rgba(200,240,140,${(a * 0.18).toFixed(3)})`;
  ctx.fillRect(Math.round(x / 2) * 2 - 4, Math.round(y / 2) * 2 - 4, 10, 10);
  ctx.fillStyle = `rgba(220,255,170,${(a * 0.9).toFixed(3)})`;
  ctx.fillRect(Math.round(x / 2) * 2, Math.round(y / 2) * 2, 2, 2);
}

function feather(ctx, i, t) {
  const s = t / 1000;
  const x = (hash(i) * SW + Math.sin(s * 0.7 + i) * 30) % SW;
  const y = (((hash(i, 2) * SH + s * 16) % SH) + SH) % SH;
  ctx.fillStyle = 'rgba(240,232,220,0.55)';
  ctx.fillRect(Math.round(x / 2) * 2, Math.round(y / 2) * 2, 4, 2);
  ctx.fillRect(Math.round(x / 2) * 2 + 2, Math.round(y / 2) * 2 - 2, 2, 2);
}

/** Draw a backdrop with its lights and particles. opts: { dim, particles=true } */
export function drawScene(ctx, id, t, opts = {}) {
  const sc = scene(id);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sc.canvas, 0, 0, SW, SH);
  // breathing lights
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  sc.lights.forEach((l, i) => {
    const f = 1 - l.flicker * (0.5 + 0.5 * Math.sin(t * 0.006 + i * 1.7) * Math.sin(t * 0.0023 + i));
    const rad = l.r * SCALE * (0.9 + 0.1 * f);
    const g = ctx.createRadialGradient(l.x * SCALE, l.y * SCALE, 0, l.x * SCALE, l.y * SCALE, rad);
    g.addColorStop(0, hexA(l.color, 0.22 * f));
    g.addColorStop(1, hexA(l.color, 0));
    ctx.fillStyle = g;
    ctx.fillRect(l.x * SCALE - rad, l.y * SCALE - rad, rad * 2, rad * 2);
  });
  ctx.restore();
  if (opts.particles !== false && sc.particles && PARTICLES[sc.particles]) {
    const p = PARTICLES[sc.particles];
    for (let i = 0; i < p.n; i++) p.draw(ctx, i, t);
  }
  if (opts.dim) {
    ctx.fillStyle = `rgba(8,6,10,${opts.dim})`;
    ctx.fillRect(0, 0, SW, SH);
  }
  return sc;
}

export function vignette(ctx, strength = 0.55) {
  const g = ctx.createRadialGradient(SW / 2, SH / 2, SH * 0.35, SW / 2, SH / 2, SW * 0.62);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(4,2,6,${strength})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, SW, SH);
}

function hexA(hex, a) {
  const h = hex.replace('#', '');
  const v = parseInt(h, 16);
  return `rgba(${(v >> 16) & 255},${(v >> 8) & 255},${v & 255},${a.toFixed(3)})`;
}

// ─── transient effects ────────────────────────────────────────────────────

export class FxLayer {
  constructor() {
    this.items = [];
    this.shakeUntil = 0;
    this.shakeMag = 0;
    this.flashUntil = 0;
    this.flashColor = '#ffffff';
    this.flashDur = 1;
  }

  text(x, y, str, color = '#f0e6dc', opts = {}) {
    this.items.push({ kind: 'text', x, y, str, color, t0: performance.now(), dur: opts.dur || 1100, size: opts.size || 22, rise: opts.rise ?? 40 });
  }

  burst(x, y, color, n = 12, speed = 120) {
    const t0 = performance.now();
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.4;
      const v = speed * (0.5 + Math.random() * 0.7);
      this.items.push({ kind: 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, color, t0, dur: 500 + Math.random() * 300 });
    }
  }

  ring(x, y, color, r = 40) {
    this.items.push({ kind: 'ring', x, y, color, r, t0: performance.now(), dur: 450 });
  }

  slash(x, y, color = '#ffffff') {
    this.items.push({ kind: 'slash', x, y, color, t0: performance.now(), dur: 260 });
  }

  shake(mag = 6, ms = 260) {
    this.shakeMag = mag;
    this.shakeUntil = performance.now() + ms;
  }

  flash(color = '#ffffff', ms = 220) {
    this.flashColor = color;
    this.flashUntil = performance.now() + ms;
    this.flashDur = ms;
  }

  offset(now) {
    if (now > this.shakeUntil) return [0, 0];
    const k = (this.shakeUntil - now) / 260;
    return [Math.round((Math.random() * 2 - 1) * this.shakeMag * k), Math.round((Math.random() * 2 - 1) * this.shakeMag * k)];
  }

  draw(ctx, now) {
    this.items = this.items.filter((it) => now - it.t0 < it.dur);
    for (const it of this.items) {
      const p = (now - it.t0) / it.dur;
      if (it.kind === 'text') {
        const y = it.y - it.rise * easeOut(p);
        ctx.save();
        ctx.globalAlpha = p < 0.75 ? 1 : 1 - (p - 0.75) / 0.25;
        ctx.font = `${it.size}px "Pixelify Sans", monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const pop = p < 0.12 ? 1 + (0.12 - p) * 3 : 1;
        ctx.translate(it.x, y);
        ctx.scale(pop, pop);
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'rgba(10,6,12,0.9)';
        ctx.strokeText(it.str, 0, 0);
        ctx.fillStyle = it.color;
        ctx.fillText(it.str, 0, 0);
        ctx.restore();
      } else if (it.kind === 'spark') {
        const s = (now - it.t0) / 1000;
        const x = it.x + it.vx * s;
        const y = it.y + it.vy * s + 200 * s * s;
        ctx.globalAlpha = 1 - p;
        ctx.fillStyle = it.color;
        ctx.fillRect(Math.round(x / 2) * 2, Math.round(y / 2) * 2, 4, 4);
        ctx.globalAlpha = 1;
      } else if (it.kind === 'ring') {
        ctx.save();
        ctx.globalAlpha = 1 - p;
        ctx.strokeStyle = it.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(it.x, it.y, it.r * (0.4 + p), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      } else if (it.kind === 'slash') {
        ctx.save();
        ctx.globalAlpha = 1 - p;
        ctx.strokeStyle = it.color;
        ctx.lineWidth = 6 * (1 - p) + 1;
        ctx.beginPath();
        ctx.moveTo(it.x - 40 + p * 20, it.y - 40 + p * 10);
        ctx.lineTo(it.x + 40 - p * 10, it.y + 30 - p * 10);
        ctx.stroke();
        ctx.restore();
      }
    }
    if (now < this.flashUntil) {
      ctx.save();
      ctx.globalAlpha = ((this.flashUntil - now) / this.flashDur) * 0.7;
      ctx.fillStyle = this.flashColor;
      ctx.fillRect(0, 0, SW, SH);
      ctx.restore();
    }
  }
}

export function easeOut(t) {
  return 1 - Math.pow(1 - t, 3);
}
export function easeInOut(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
