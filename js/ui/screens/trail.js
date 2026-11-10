import { app } from '../app.js';
import { h, btn, bar } from '../dom.js';
import { drawScene, vignette } from '../../art/fx.js';
import { heroSprite, mercSprite } from '../../art/sprites.js';
import { blit } from '../../art/pixel.js';
import { audio } from '../../core/audio.js';
import { RULES } from '../../data/constants.js';
import { partyMembers, saveGame } from '../../game/state.js';
import { dungeonOf, currentNode, peekNext, advance, startBattle, openCache, makeCamp } from '../../game/expedition.js';
import { questProgress } from '../../game/town.js';
import { playScene, defeat } from '../flow.js';
import { openParty } from '../sheets/party.js';
import { openNotebook } from '../sheets/notebook.js';

const NODE_INFO = {
  battle: { label: 'Skirmish', icon: '⚔', text: 'Something waits in the dark.' },
  boss: { label: 'Guardian', icon: '☠', text: 'The thing that rules this place.' },
  cache: { label: 'Cache', icon: '▣', text: 'Abandoned supplies, if you are lucky.' },
  camp: { label: 'Camp', icon: '♨', text: 'Somewhere to sit down. Heals and restores a little mana.' },
  story: { label: 'Talk', icon: '…', text: '' },
};

function nodeX(i, n) {
  return 90 + (780 * i) / Math.max(1, n - 1);
}
function nodeY(i) {
  return 150 + Math.sin(i * 0.9) * 26;
}

export const trailScreen = {
  enter() {
    saveGame(app.state, 'auto');
    const d = dungeonOf(app.state);
    audio.music(d.music);
    this.walk = null;
    this.build();
  },

  build(note) {
    const s = app.state;
    const d = dungeonOf(s);
    const ex = s.expedition;
    app.ui.replaceChildren();
    app.ui.append(
      h(
        'div.hud',
        h('span.place', d.name),
        h('span.spacer'),
        h('span.stat', { title: 'Supplies' }, '⛁ Supplies', h('b', String(s.supplies)), h('div.meter', bar(s.supplies, RULES.supplyMax, 'supplies'))),
        h('span.stat', { title: 'Mana' }, '✦', h('b', `${s.mana}/${s.maxMana}`), h('div.meter', { style: { width: '60px' } }, bar(s.mana, s.maxMana, 'mana'))),
        h('span.stat', { title: 'Coins' }, '◎', h('b', String(s.coins))),
      ),
    );
    const next = peekNext(s);
    const info = next ? NODE_INFO[next.type] : null;
    const cost = partyMembers(s).length;
    const costText = !next ? '' : next.type === 'story' ? 'No cost' : next.type === 'battle' || next.type === 'boss' ? `−${cost} to travel, −${cost} to fight` : `−${cost} supplies to travel`;
    const nextBox = h(
      'div.trail-next',
      h('div', h('div.label', 'Next'), h('h3', next ? `${info.icon} ${info.label}` : 'The way home'), h('p', note || (next ? info.text || 'The party has something to say.' : ''))),
      h('div.row', btn(next?.type === 'boss' ? 'Face the guardian ▸' : 'Continue ▸', () => this.go(), { cls: 'primary', key: '↵' }), h('span.faint', { style: { fontSize: '13px' } }, costText)),
    );
    const quests = h('ul.trail-quests', h('div.label', { style: { marginBottom: '6px' } }, 'Odd jobs'));
    if (!s.quests.active.length) quests.append(h('li.faint', 'None taken.'));
    for (const q of s.quests.active) quests.append(h('li', h('b', questProgress(s, q) || ''), ' — ', q.text));
    if (s.hired.some((m) => m.trial)) quests.append(h('li.brass', 'A trial mercenary is watching whether you finish a job.'));
    const side = h('div.col', { style: { width: '120px', justifyContent: 'flex-end' } }, btn('Party', () => openParty(() => this.build()), { cls: 'small', key: 'P' }), btn('Notebook', () => openNotebook(), { cls: 'small', key: 'N' }));
    app.ui.append(h('div.panel.trail-panel', nextBox, quests, side));
    void ex;
  },

  go() {
    if (this.walk || app.sheet || app.transitioning) return;
    const s = app.state;
    const from = s.expedition.node;
    const node = advance(s);
    if (!node) return;
    if (s.supplies <= 0) {
      audio.sfx('defeat');
      return defeat('supplies');
    }
    this.walk = { from, to: s.expedition.node, t0: performance.now(), node };
    audio.sfx('step');
    setTimeout(() => audio.sfx('step'), 220);
    setTimeout(() => this.arrive(node), node.type === 'story' ? 200 : 650);
  },

  arrive(node) {
    this.walk = null;
    const s = app.state;
    if (node.type === 'story') return playScene(node.scene);
    if (node.type === 'battle' || node.type === 'boss') {
      startBattle(s);
      if (s.supplies <= 0) return defeat('supplies');
      return app.go('combat', {});
    }
    if (node.type === 'cache') {
      const loot = openCache(s);
      audio.sfx('coin');
      const bits = [`+${loot.supplies} supplies`, `+${loot.coins} coins`];
      if (loot.materials) bits.push(`+${loot.materials} material`);
      if (loot.gem) bits.push(`a ${loot.gem} gem`);
      saveGame(s, 'auto');
      return this.build(`You find a forgotten cache: ${bits.join(', ')}.`);
    }
    if (node.type === 'camp') {
      const r = makeCamp(s);
      audio.sfx('heal');
      saveGame(s, 'auto');
      return this.build(`The party makes camp. Wounds close a little${r.mana ? `; +${r.mana} mana` : ''}.`);
    }
    this.build();
  },

  render(ctx, t) {
    const s = app.state;
    const d = dungeonOf(s);
    if (!d) return;
    drawScene(ctx, d.bg, t, { dim: 0.18 });
    const n = d.nodes.length;
    const cur = s.expedition.node;
    // path
    ctx.save();
    ctx.lineWidth = 4;
    ctx.setLineDash([2, 8]);
    ctx.strokeStyle = 'rgba(232,220,200,0.35)';
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const x = nodeX(i, n);
      const y = nodeY(i);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
    for (let i = 0; i < n; i++) {
      const node = d.nodes[i];
      const x = nodeX(i, n);
      const y = nodeY(i);
      const done = i <= cur;
      const nxt = i === cur + 1;
      const r = node.type === 'story' ? 6 : node.type === 'boss' ? 16 : 12;
      ctx.fillStyle = done ? 'rgba(120,110,100,0.8)' : nxt ? '#e8cc80' : 'rgba(30,22,30,0.9)';
      ctx.strokeStyle = node.type === 'boss' ? '#c84a4a' : done ? '#6a6058' : '#c8b8a8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, r * (nxt ? 1 + Math.sin(t / 250) * 0.1 : 1), 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      if (node.type !== 'story') {
        ctx.font = `${node.type === 'boss' ? 18 : 13}px "Pixelify Sans", monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = nxt ? '#1a1012' : done ? '#2a2226' : '#e8dccc';
        ctx.fillText(NODE_INFO[node.type].icon, x, y + 1);
      }
    }
    // the party marker
    let px = nodeX(Math.max(0, cur), n);
    let py = nodeY(Math.max(0, cur));
    if (cur < 0) px -= 50;
    if (this.walk) {
      const p = Math.min(1, (performance.now() - this.walk.t0) / 600);
      const a = Math.max(0, this.walk.from);
      const ax = this.walk.from < 0 ? nodeX(0, n) - 50 : nodeX(a, n);
      const ay = nodeY(a);
      px = ax + (nodeX(this.walk.to, n) - ax) * p;
      py = ay + (nodeY(this.walk.to) - ay) * p;
    }
    ctx.fillStyle = '#ece6dc';
    ctx.beginPath();
    ctx.moveTo(px, py - 26);
    ctx.lineTo(px - 7, py - 38);
    ctx.lineTo(px + 7, py - 38);
    ctx.fill();

    // party walking in the scene
    const party = partyMembers(s);
    const walking = !!this.walk;
    party.forEach((m, i) => {
      const x = 480 - ((party.length - 1) * 70) / 2 + i * 70;
      const y = 392 + (i % 2) * 6;
      const step = walking ? Math.round(Math.abs(Math.sin(t / 90 + i))) * 4 : Math.round(Math.sin(t / 600 + i)) * 2;
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(x - 24, y - 3, 48, 6);
      blit(ctx, m.kind === 'merc' ? mercSprite(m) : heroSprite(m.id, s.flags), x, y - step, 3);
    });
    vignette(ctx, 0.5);
    void currentNode;
  },

  key(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.go();
    } else if (e.key.toLowerCase() === 'p') openParty(() => this.build());
    else if (e.key.toLowerCase() === 'n') openNotebook();
  },
};
