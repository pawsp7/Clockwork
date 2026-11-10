/** Balance simulator: node tests/sim.js [runs] [policy] */
import { seed } from '../js/core/rng.js';
import { playthrough } from './driver.js';

const runs = Number(process.argv[2] || 20);
const policy = process.argv[3] || 'good';
const mercs = process.argv.includes('--mercs');
const agg = { defeats: 0, endings: {}, byDungeon: {} };
for (let i = 0; i < runs; i++) {
  seed(1000 + i);
  const { ending, report, state } = playthrough({ policy, combat: {}, mercs, maxRetries: 8 });
  agg.defeats += report.defeats.length;
  agg.endings[ending.title] = (agg.endings[ending.title] || 0) + 1;
  for (const e of report.expeditions) {
    const d = (agg.byDungeon[e.dungeon] ||= { runs: 0, end: 0, min: 0, attempts: 0, hp: {} });
    d.runs++;
    d.end += e.end;
    d.min += e.minSupplies;
    d.attempts += e.attempt;
  }
  for (const f of report.defeats) {
    const k = `defeat@${f.where}:${f.reason || ''}`;
    agg[k] = (agg[k] || 0) + 1;
  }
  if (i === 0) console.log('sample stats', state.stats, 'coins', state.coins, 'flags', { mitziAtk: state.flags.mitziAtk, vic: state.flags.victoriaMode, study: state.flags.mitziStudy });
}
for (const [k, d] of Object.entries(agg.byDungeon)) {
  console.log(k, 'avg end supplies', (d.end / d.runs).toFixed(1), 'avg min', (d.min / d.runs).toFixed(1), 'retries', d.attempts);
}
console.log(JSON.stringify(agg, null, 1));
