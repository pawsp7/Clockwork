/** Per-battle balance table: node tests/battles.js [runs] */
import { seed } from '../js/core/rng.js';
import { playthrough } from './driver.js';
const runs = Number(process.argv[2] || 8);
const agg = {};
for (let i = 0; i < runs; i++) {
  seed(700 + i);
  const { report } = playthrough({ policy: process.argv[3] || 'good', combat: {}, maxRetries: 8 });
  for (const b of report.battles) {
    const k = `${b.where}${b.boss ? ' (boss)' : ''}`;
    const a = (agg[k] ||= { n: 0, rounds: 0, payload: 0, lost: 0, hp: [] });
    a.n++;
    a.rounds += b.rounds || 0;
    a.payload += b.payload || 0;
    if (b.won === false) a.lost++;
    if (b.boss) a.hp.push(b.hp);
  }
}
for (const [k, a] of Object.entries(agg)) {
  console.log(k.padEnd(24), 'n', String(a.n).padStart(3), 'rounds', (a.rounds / a.n).toFixed(1), 'payload/battle', (a.payload / a.n).toFixed(1), 'lost', a.lost);
  if (a.hp.length) console.log('   end hp sample:', a.hp.slice(0, 3).join(' || '));
}
