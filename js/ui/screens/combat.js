import { app } from '../app.js';
import { h, btn, bar, clear, gemEl } from '../dom.js';
import { drawScene, vignette } from '../../art/fx.js';
import { heroSprite, mercSprite, thugSprite } from '../../art/sprites.js';
import { monsterArt, bossArt, faithfulArt, EYE_GLOW } from '../../art/creatures.js';
import { blit, cached } from '../../art/pixel.js';
import { audio } from '../../core/audio.js';
import {
  createCombat,
  peek,
  canPeek,
  setPlan,
  clearPlan,
  resolveRound,
  actionsFor,
  readyToResolve,
  intentView,
  tutorialGuide,
  displayName,
} from '../../game/combat.js';
import { livingMembers, partyMembers, memberId, memberById, memberGems, attackPower, weaponType } from '../../game/state.js';
import { infer, profileShort } from '../../game/notebook.js';
import { afterBattle } from '../../game/expedition.js';
import { INTENT_INFO } from '../../data/monsters.js';
import { ITEMS } from '../../data/world.js';
import { SHORT, LABEL, RULES, COUNTER, BEATS } from '../../data/constants.js';
import { HEROES, ARMOURS } from '../../data/heroes.js';
import { defeat, playScene } from '../flow.js';

const FEET = 342;
const STEP_MS = 520;

const INTENT_ICON = { attack: '⚔', ransack: '⚔', sweep: '≋', guard: '⛨', idle: '…', summon: '✶', toll: '♪' };
const TAG_LABEL = { weak: 'WEAK', resist: 'RESIST', super: 'ELEMENT!', dull: 'DULLED', exposed: 'EXPOSED!' };

function memberSprite(m, flags) {
  return m.kind === 'merc' ? mercSprite(m) : heroSprite(m.id, flags);
}

export const combatScreen = {
  enter(params) {
    this.params = params;
    const s = app.state;
    if (params.opts) createCombat(s, params.opts);
    this.c = s.combat;
    this.anim = {};
    this.won = false;
    this.leaving = false;
    this.active = null;
    this.mode = null; // 'target' | 'item' | 'ally'
    this.pending = null;
    this.queue = [];
    this.playing = false;
    this.logLine = '';
    this.lastTip = null;
    const boss = this.c.kind === 'boss';
    audio.music(this.c.bossId === 'white_ox' ? 'ox' : boss ? 'boss' : 'battle');
    this.bannerShown = false;
    this.pickActive();
    this.sync();
    this.banner(this.c.kind === 'tutorial' ? 'Two Thugs' : boss ? this.c.enemies[0].name : 'Ambush', this.c.kind === 'tutorial' ? 'a lesson' : boss ? 'boss' : this.c.label);
  },

  exit() {
    this.tip?.remove();
  },

  banner(title, sub) {
    const b = h('div.banner', title, h('small', sub));
    app.ui.appendChild(b);
    setTimeout(() => b.remove(), 1700);
  },

  // ─── positions ─────────────────────────────────────────────────────────
  heroSlots() {
    const list = partyMembers(app.state);
    const n = list.length;
    const span = Math.min(380, 96 * (n - 1));
    const x0 = 260 - span / 2;
    return list.map((m, i) => ({ m, id: memberId(m), x: Math.round(x0 + (n > 1 ? (span / (n - 1)) * i : 0)), y: FEET + (i % 2 ? 8 : 0) }));
  },

  foeSlots() {
    const list = this.c.enemies;
    const alive = list.filter((e) => e.alive || this.anim[e.uid]?.dying);
    const n = alive.length;
    const span = Math.min(330, 120 * (n - 1));
    const x0 = 720 - span / 2;
    return alive.map((e, i) => ({ e, x: Math.round(x0 + (n > 1 ? (span / (n - 1)) * i : 0)), y: FEET + (i % 2 ? 6 : 0) }));
  },

  foeArt(e, t) {
    const frame = Math.floor(t / 520) % 2;
    if (e.human) return thugSprite(e.look);
    if (e.bossId) return bossArt(e.bossId, frame, { open: false });
    if (e.faithful) return faithfulArt(frame);
    return monsterArt(e, frame);
  },

  foeHeight(e) {
    if (e.bossId === 'white_ox') return 276;
    if (e.bossId) return 234;
    if (e.human) return 108;
    if (e.faithful) return 132;
    return 132;
  },

  // ─── planning ──────────────────────────────────────────────────────────
  pickActive() {
    const c = this.c;
    if (c.phase !== 'plan') {
      this.active = null;
      return;
    }
    const living = livingMembers(app.state);
    const next = living.find((m) => !c.plans[memberId(m)]);
    this.active = next ? memberId(next) : null;
    this.mode = null;
  },

  choose(action) {
    const c = this.c;
    const m = memberById(app.state, this.active);
    if (!m) return;
    const a = actionsFor(app.state, m).find((x) => x.id === action);
    if (!a || a.disabled) {
      if (a?.disabled) app.toast(a.disabled, false);
      return;
    }
    if (action === 'wait') {
      setPlan(app.state, this.active, { action: 'wait' });
      this.afterPlan();
      return;
    }
    if (action === 'item') {
      this.mode = 'item';
      this.pending = { action: 'item' };
      this.sync();
      return;
    }
    this.mode = 'target';
    this.pending = { action, gem: action === 'strike' ? this.gemFor(m) : null };
    // a single target needs no aiming
    const alive = c.enemies.filter((e) => e.alive);
    if (alive.length === 1 && !c.tutorial) return this.target(alive[0].uid);
    this.sync();
  },

  gemFor(m) {
    const g = this.gemChoice?.[memberId(m)];
    if (!g || !memberGems(m).includes(g) || app.state.mana < RULES.imbueCost) return null;
    return g;
  },

  target(uid) {
    if (this.mode !== 'target' || !this.pending) return;
    const ok = setPlan(app.state, this.active, { ...this.pending, target: uid });
    if (!ok) {
      const guide = tutorialGuide(app.state);
      app.toast(guide?.target && guide.target !== uid ? 'The watch is pointing at the other one.' : 'Can’t do that.', false);
      return;
    }
    audio.sfx(this.pending.action === 'guard' ? 'guard' : 'click');
    this.afterPlan();
  },

  pickItem(item) {
    const it = ITEMS[item];
    if (it.target === 'party') {
      setPlan(app.state, this.active, { action: 'item', item });
      this.afterPlan();
      return;
    }
    this.pending = { action: 'item', item };
    this.mode = 'ally';
    this.sync();
  },

  pickAlly(id) {
    if (this.mode !== 'ally') return false;
    const ok = setPlan(app.state, this.active, { ...this.pending, ally: id });
    if (ok) this.afterPlan();
    return ok;
  },

  afterPlan() {
    this.mode = null;
    this.pending = null;
    this.pickActive();
    this.sync();
  },

  selectHero(id) {
    if (this.playing || this.c.phase !== 'plan') return;
    if (this.mode === 'ally') {
      this.pickAlly(id);
      return;
    }
    const m = memberById(app.state, id);
    if (!m || m.hp <= 0) return;
    clearPlan(app.state, id);
    this.active = id;
    this.mode = null;
    this.sync();
  },

  doPeek(uid) {
    if (!canPeek(app.state, uid)) return;
    peek(app.state, uid);
    audio.sfx('peek');
    const slot = this.foeSlots().find((f) => f.e.uid === uid);
    if (slot) app.fx.ring(slot.x, FEET - this.foeHeight(slot.e) / 2, '#e8cc80', 70);
    this.sync();
  },

  endTurn() {
    if (this.playing || !readyToResolve(app.state)) return;
    const c = this.c;
    // remember which members were standing before
    this.before = {
      supplies: app.state.supplies,
    };
    const events = resolveRound(app.state);
    this.queue = events.slice();
    this.playing = true;
    this.mode = null;
    this.sync();
    this.playNext();
    void c;
  },

  playNext() {
    const ev = this.queue.shift();
    if (!ev) {
      this.playing = false;
      this.finishRound();
      return;
    }
    const wait = this.animate(ev);
    this.sync();
    setTimeout(() => this.playNext(), wait);
  },

  finishRound() {
    const c = this.c;
    this.logLine = '';
    if (c.phase === 'won') {
      audio.sfx('victory');
      this.showVictory();
      return;
    }
    if (c.phase === 'lost') {
      audio.sfx('defeat');
      setTimeout(() => defeat(c.result), 900);
      return;
    }
    // round start notices
    for (const r of c.roundStart || []) {
      if (r.type === 'awaken') {
        audio.sfx('note');
        app.toast(r.text);
      }
    }
    this.pickActive();
    this.sync();
  },

  // ─── event animation ───────────────────────────────────────────────────
  pos(id) {
    const hs = this.heroSlots().find((s) => s.id === id);
    if (hs) return { x: hs.x, y: hs.y - 54, foot: hs.y };
    const fs = this.foeSlots().find((s) => s.e.uid === id);
    if (fs) return { x: fs.x, y: fs.y - this.foeHeight(fs.e) / 2, foot: fs.y };
    return { x: 480, y: 270, foot: FEET };
  },

  kick(id, props) {
    this.anim[id] = { ...(this.anim[id] || {}), ...props, t0: performance.now() };
  },

  animate(ev) {
    const fx = app.fx;
    if (ev.text) this.logLine = ev.text;
    switch (ev.type) {
      case 'strike': {
        const to = this.pos(ev.enemy);
        this.kick(ev.who, { lunge: 1 });
        setTimeout(() => {
          this.kick(ev.enemy, { hurt: 1 });
          fx.slash(to.x, to.y, ev.element ? elementColor(ev.element) : '#ffffff');
          const big = ev.tags.includes('weak') || ev.tags.includes('super') || ev.tags.includes('exposed');
          fx.text(to.x, to.y - 30, String(ev.dmg), big ? '#ffe28a' : '#ffffff', { size: big ? 34 : 28 });
          const tags = ev.tags.filter((t) => TAG_LABEL[t]);
          tags.forEach((t, i) => fx.text(to.x + 50, to.y - 20 + i * 20, TAG_LABEL[t], t === 'resist' || t === 'dull' ? '#a8b4c8' : '#ffd070', { size: 16, rise: 26 }));
          if (big) fx.shake(5, 180);
          if (ev.element) fx.burst(to.x, to.y, elementColor(ev.element), 10, 140);
          audio.sfx(big ? 'bigstrike' : 'strike');
        }, 160);
        return STEP_MS;
      }
      case 'strikeBlocked': {
        const to = this.pos(ev.enemy);
        this.kick(ev.who, { lunge: 1 });
        setTimeout(() => {
          fx.text(to.x, to.y - 30, 'BLOCKED', '#a8c0d8', { size: 20 });
          fx.ring(to.x, to.y, '#8ab0d8', 46);
          audio.sfx('blocked');
        }, 160);
        return STEP_MS;
      }
      case 'study': {
        const to = this.pos(ev.enemy);
        this.kick(ev.who, { hop: 1 });
        audio.sfx('study');
        const r = ev.result;
        let label = 'noted';
        if (r?.feature) label = r.feature === 'limbs' ? `${r.value} limbs` : `${r.value} ${r.feature === 'eye' ? 'eyes' : 'body'}`;
        if (r?.boss) label = `weak: ${r.weak || '—'}`;
        fx.text(to.x, to.y - 50, label, '#d8c8f8', { size: 18 });
        if (r?.identified) {
          setTimeout(() => {
            fx.text(to.x, to.y - 80, 'IDENTIFIED', '#ffe28a', { size: 20 });
            fx.burst(to.x, to.y, '#e8d8a0', 16, 120);
            audio.sfx('note');
          }, 300);
        }
        return STEP_MS + 120;
      }
      case 'item': {
        const to = this.pos(ev.to || ev.who);
        audio.sfx('heal');
        fx.text(to.x, to.y - 30, ev.item === 'salts' ? 'REVIVED' : '+', '#9ae0a0', { size: 22 });
        fx.burst(to.x, to.y, '#9ae0a0', 10, 90);
        return STEP_MS;
      }
      case 'guardStance': {
        this.kick(ev.who, { guard: 1 });
        return 120;
      }
      case 'enemyAttack': {
        const from = this.pos(ev.enemy);
        this.kick(ev.enemy, { lunge: -1 });
        setTimeout(() => {
          if (ev.to === 'payload') {
            this.kick('cart', { hurt: 1 });
            fx.text(78, FEET - 90, `−${ev.dmg}`, '#ff9a7a', { size: 30 });
            fx.text(78, FEET - 120, ev.ransack ? 'RANSACKED' : 'SUPPLIES', '#ffb0a0', { size: 14, rise: 20 });
            fx.burst(78, FEET - 40, '#e8e2d8', 8, 110);
            fx.shake(ev.ransack ? 8 : 4, 200);
            audio.sfx('payload');
          } else {
            const to = this.pos(ev.to);
            if (ev.guarded) {
              fx.ring(to.x, to.y, '#9ac0e8', 50);
              audio.sfx('guard');
              fx.text(to.x, to.y - 40, ev.dmg > 0 ? `−${ev.dmg}` : 'GUARDED', ev.dmg > 0 ? '#ffb0a0' : '#c8dcf0', { size: ev.dmg ? 26 : 18 });
              if (ev.dmg > 0) this.kick(ev.to, { hurt: 1 });
            } else {
              this.kick(ev.to, { hurt: 1 });
              fx.text(to.x, to.y - 40, `−${ev.dmg}`, '#ff8a7a', { size: 28 });
              audio.sfx('hurt');
              fx.shake(4, 160);
            }
            const tags = (ev.tags || []).filter((t) => t === 'weak' || t === 'resist' || t === 'exposed');
            tags.forEach((t, i) => fx.text(to.x + 44, to.y - 30 + i * 18, TAG_LABEL[t], t === 'resist' ? '#a8b4c8' : '#ffb070', { size: 14, rise: 22 }));
          }
          // once Mitzi can read them, every attack shows its element and weapon
          if (ev.profile && app.state.notebook.unlocked && !ev.enemy.startsWith('thug')) {
            fx.text(from.x, from.y - 70, `${SHORT[ev.profile.element]}.${SHORT[ev.profile.type]}`, elementColor(ev.profile.element), { size: 16, rise: 18 });
          }
        }, 180);
        return STEP_MS + 80;
      }
      case 'sweep': {
        this.kick(ev.enemy, { lunge: -1 });
        setTimeout(() => {
          audio.sfx('bigstrike');
          fx.shake(8, 260);
          for (const hit of ev.hits) {
            const to = this.pos(hit.to);
            if (hit.guarded) fx.ring(to.x, to.y, '#9ac0e8', 40);
            else {
              this.kick(hit.to, { hurt: 1 });
              fx.text(to.x, to.y - 40, `−${hit.dmg}`, '#ff8a7a', { size: 24 });
            }
          }
        }, 180);
        return STEP_MS + 200;
      }
      case 'enemyGuard':
        this.kick(ev.enemy, { guard: 1 });
        return 160;
      case 'enemyIdle': {
        const p = this.pos(ev.enemy);
        fx.text(p.x, p.y - 50, '…', '#a89a90', { size: 22, rise: 16 });
        return 260;
      }
      case 'enemyDown': {
        this.anim[ev.enemy] = { ...(this.anim[ev.enemy] || {}), dying: performance.now() };
        const p = this.pos(ev.enemy);
        fx.burst(p.x, p.y, '#2a2230', 18, 160);
        fx.burst(p.x, p.y, '#c8b8d0', 8, 90);
        audio.sfx('kill');
        setTimeout(() => {
          delete this.anim[ev.enemy];
          this.sync();
        }, 700);
        return STEP_MS;
      }
      case 'memberDown': {
        const p = this.pos(ev.who);
        fx.text(p.x, p.y - 60, 'DOWN', '#ff7070', { size: 22 });
        audio.sfx('down');
        return STEP_MS;
      }
      case 'summon': {
        audio.sfx('summon');
        setTimeout(() => {
          const p = this.pos(ev.spawned);
          fx.burst(p.x, p.y, '#6a5a7a', 16, 120);
          this.kick(ev.spawned, { spawn: 1 });
        }, 50);
        return STEP_MS + 100;
      }
      case 'toll':
        audio.sfx('bell');
        fx.flash('#f4ead8', 300);
        return STEP_MS + 200;
      case 'tollMuffled':
        audio.sfx('guard');
        return STEP_MS;
      case 'entranced': {
        const p = this.pos(ev.who);
        fx.text(p.x, p.y - 60, 'ENTRANCED', '#f4e0b0', { size: 16 });
        return 360;
      }
      case 'interfere': {
        const p = this.pos('mitzi');
        this.kick('victoria', { hop: 1 });
        fx.text(p.x, p.y - 70, 'Victoria steps in!', '#ff9aa8', { size: 16 });
        audio.sfx('guard');
        return STEP_MS + 100;
      }
      case 'assist': {
        const p = this.pos('mitzi');
        fx.ring(p.x, p.y, '#ff9aa8', 44);
        return 300;
      }
      case 'disobey': {
        const p = this.pos('hestia');
        fx.text(p.x, p.y - 70, ev.text.includes('pray') ? '✝ prays' : '?!', '#f0e8d8', { size: 18 });
        return 400;
      }
      case 'observe':
        return 60;
      case 'victory':
      case 'defeat':
        return 400;
      default:
        return ev.text ? 360 : 60;
    }
  },

  // ─── DOM overlay ───────────────────────────────────────────────────────
  sync() {
    const s = app.state;
    const c = this.c;
    clear(app.ui);
    const ui = app.ui;

    // HUD
    ui.append(
      h(
        'div.hud',
        h('span.place', c.label),
        h('span.spacer'),
        h('span.stat', { title: 'Supplies — unguarded attacks hit these. At zero, the party falls.' }, '⛁ Supplies', h('b', String(s.supplies)), h('div.meter', bar(s.supplies, RULES.supplyMax, 'supplies'))),
        h('span.stat', { title: 'Mana — spent to imbue strikes with gems. Only rest restores it.' }, '✦ Mana', h('b', `${s.mana}`), h('div.meter', { style: { width: '70px' } }, bar(s.mana, s.maxMana, 'mana'))),
        h('span.stat', { title: 'Round' }, '◷', h('b', `${c.round}`)),
      ),
    );

    // tutorial hint
    const guide = tutorialGuide(s);
    if (guide && !this.playing && c.phase === 'plan') ui.append(h('div.tutorial-hint', guide.text));

    // enemies
    for (const slot of this.foeSlots()) this.foeDom(slot, guide);
    // heroes
    for (const slot of this.heroSlots()) this.heroDom(slot);
    // command panel, or the play-by-play while a round resolves
    if (c.phase === 'plan' && !this.playing) ui.append(this.commandPanel(guide));
    else if (this.won) ui.append(this.victoryPanel());
    else {
      ui.append(
        h(
          'div.panel.command',
          h('div.who', h('h3', `Round ${c.round}`), h('div.sub', this.playing ? 'Everything happens at once — one blow at a time.' : '')),
          h('div.acts', h('div.hint', { style: { fontSize: '19px', color: 'var(--ink)', lineHeight: 1.4 } }, this.logLine || '…')),
        ),
      );
    }
  },

  foeDom({ e, x }, guide) {
    const s = app.state;
    const c = this.c;
    const top = FEET - this.foeHeight(e);
    const name = e.identified ? e.name : '? ? ?';
    // big things carry their name tag beside them, clear of the HUD
    const big = this.foeHeight(e) > 200;
    const cardX = big ? x - (e.bossId === 'white_ox' ? 190 : 150) : x;
    const cardTop = big ? top + 64 : top - 34;
    const card = h(
      'div.foe',
      { style: { left: `${cardX}px`, top: `${cardTop}px` } },
      h(`div.name${e.identified ? '' : '.unknown'}`, name),
      bar(e.hp, e.maxHp),
    );
    if (e.known && !e.identified) {
      card.append(
        h(
          'div.feats',
          h(`span${e.known.eye ? '.known' : ''}`, { title: 'Eyes', style: e.known.eye ? { color: EYE_GLOW[e.eye] } : null }, '◉'),
          h(`span${e.known.shape ? '.known' : ''}`, { title: 'Shape' }, e.known.shape ? { triangle: '▲', square: '■', circle: '●' }[e.shape] : '?'),
          h(`span${e.known.limbs ? '.known' : ''}`, { title: 'Limbs' }, e.known.limbs ? String(e.limbs) : '?'),
        ),
      );
    }
    if (!e.alive) card.style.opacity = '0.3';
    app.ui.append(card);

    // hit area (targeting, tooltip)
    const targeting = this.mode === 'target';
    const hit = h(`button.foe-hit${targeting ? '.targetable' : ''}`, {
      type: 'button',
      'aria-label': name,
      style: { left: `${x}px`, top: `${top}px`, height: `${this.foeHeight(e)}px` },
      onclick: () => {
        if (targeting) this.target(e.uid);
        else if (canPeek(s, e.uid)) this.doPeek(e.uid);
      },
      onmouseenter: (ev) => this.showTip(e, ev),
      onmouseleave: () => this.hideTip(),
    });
    if (e.alive) app.ui.append(hit);

    // intent / vision
    if (!e.alive || c.phase !== 'plan') return;
    const view = intentView(s, e);
    const intentEl = h('div.intent', { style: { left: `${cardX}px`, top: `${big ? cardTop - 6 : top - 40}px` } });
    if (view.visible) {
      const info = INTENT_INFO[view.intent];
      const prof = view.profile;
      intentEl.append(
        h(
          `div.bubble.${view.intent}`,
          { title: info?.hint || '' },
          h('span', INTENT_ICON[view.intent] || '?'),
          h('span', info?.label || view.intent),
          prof ? h('span.prof', { style: { color: elementColor(prof.element) } }, `${SHORT[prof.element]}.${SHORT[prof.type]}${prof.certain ? '' : '?'}`) : null,
        ),
      );
    } else {
      const can = canPeek(s, e.uid);
      const highlight = guide?.peek === e.uid;
      intentEl.append(
        h(`button.eye${can ? '.can' : '.off'}`, {
          type: 'button',
          title: can ? 'Glimpse its next move with the watch' : c.visionLeft > 0 ? 'The watch is pointed elsewhere' : 'The watch has shown all it can this round',
          style: highlight ? { borderColor: '#fff0c0' } : null,
          onclick: (ev) => {
            ev.stopPropagation();
            this.doPeek(e.uid);
          },
        }),
      );
    }
    app.ui.append(intentEl);
  },

  heroDom({ m, id, x, y }) {
    const c = this.c;
    const plan = c.plans[id];
    const down = m.hp <= 0;
    let planEl = null;
    if (plan && c.phase === 'plan' && !this.playing) {
      const tgt = plan.target ? c.enemies.find((e) => e.uid === plan.target) : null;
      const txt =
        plan.action === 'item'
          ? `${ITEMS[plan.item]?.name || 'Item'}`
          : plan.action === 'wait'
            ? 'Wait'
            : `${cap(plan.action)}${tgt ? ' → ' + shortName(tgt, c) : ''}${plan.gem ? ' ✦' : ''}`;
      planEl = h(`div.plan.${plan.action}`, txt);
    }
    const card = h(
      'div.hero-card',
      { style: { left: `${x}px`, bottom: 'auto', top: `${y + 4}px`, opacity: down ? 0.55 : 1 } },
      h('div.name', { style: { color: m.kind === 'merc' ? '#c8bca8' : HEROES[m.id]?.color } }, m.name),
      bar(m.hp, m.maxHp),
      h('div.hp', down ? 'down' : m.id === 'hestia' ? `${m.hp}/?? · ???` : `${m.hp}/${m.maxHp}`),
      planEl,
    );
    app.ui.append(card);
    if (c.phase === 'plan' && !this.playing && !down) {
      app.ui.append(
        h(`button.hero-hit${this.active === id ? '.active' : ''}`, {
          type: 'button',
          'aria-label': m.name,
          title: this.mode === 'ally' ? `Use on ${m.name}` : `Plan ${m.name}'s action`,
          style: { left: `${x}px`, top: `${y - 112}px` },
          onclick: () => this.selectHero(id),
        }),
      );
    } else if (this.mode === 'ally' && down && this.pending?.item === 'salts') {
      app.ui.append(
        h('button.hero-hit', { type: 'button', style: { left: `${x}px`, top: `${y - 112}px` }, onclick: () => this.pickAlly(id) }),
      );
    }
  },

  commandPanel(guide) {
    const s = app.state;
    const c = this.c;
    const m = this.active ? memberById(s, this.active) : null;
    const ready = readyToResolve(s);
    const unplanned = livingMembers(s).filter((x) => !c.plans[memberId(x)]).length;
    const go = h(
      'div.go',
      h('div.faint', { style: { fontSize: '12px', textAlign: 'center' } }, c.visionLeft > 0 ? `◉ ${c.visionLeft} glimpse${c.visionLeft > 1 ? 's' : ''} left` : unplanned ? `${unplanned} will wait` : 'All set'),
      btn('End Turn', () => this.endTurn(), { cls: 'primary', disabled: !ready, key: '↵' }),
    );
    if (!m) {
      return h(
        'div.panel.command',
        h('div.who', h('h3', 'Ready'), h('div.sub', 'Every order is given. Click a party member to change theirs.')),
        h('div.acts', h('div.hint', this.planSummary())),
        go,
      );
    }
    const id = memberId(m);
    const acts = actionsFor(s, m);
    const who = h(
      'div.who',
      h('h3', { style: { color: m.kind === 'merc' ? '#d8ccb8' : HEROES[m.id]?.color } }, m.name),
      h('div.sub', this.memberLine(m)),
    );
    const row = h('div.row');
    acts.forEach((a, i) => {
      row.append(
        btn(a.label, () => this.choose(a.id), {
          cls: `small${this.pending?.action === a.id ? ' selected' : ''}`,
          disabled: !!a.disabled,
          title: a.disabled || actionHint(a.id),
          key: String(i + 1),
        }),
      );
    });
    const body = h('div.acts', row);
    if (this.mode === 'target') {
      body.append(h('div.hint', `Choose a target for ${cap(this.pending.action)} — click an enemy${guide?.target ? ' (the watch points at the Lanky Thug)' : ''}.`));
    } else if (this.mode === 'item') {
      const items = h('div.row');
      for (const [k, it] of Object.entries(ITEMS)) {
        items.append(btn(`${it.name} ×${s.items[k]}`, () => this.pickItem(k), { cls: 'tiny', disabled: !s.items[k], title: it.desc }));
      }
      body.append(items);
    } else if (this.mode === 'ally') {
      body.append(h('div.hint', `Choose who gets the ${ITEMS[this.pending.item].name} — click a party member.`));
    } else {
      // gem toggle for strikes
      const gems = memberGems(m);
      if (gems.length && !c.tutorial) {
        this.gemChoice ||= {};
        const cur = this.gemChoice[id] || null;
        const gr = h('div.row', h('span.faint', { style: { fontSize: '12px' } }, `Imbue strike (${RULES.imbueCost} mana):`));
        gr.append(
          btn('Neutral', () => {
            this.gemChoice[id] = null;
            this.sync();
          }, { cls: `tiny${!cur ? ' selected' : ''}` }),
        );
        for (const g of gems) {
          gr.append(
            btn(h('span.row', { style: { gap: '5px' } }, gemEl(g), LABEL[g]), () => {
              this.gemChoice[id] = cur === g ? null : g;
              this.sync();
            }, { cls: `tiny${cur === g ? ' selected' : ''}`, disabled: s.mana < RULES.imbueCost, title: `Strong vs ${LABEL[BEATS[g]]}. Leaves ${m.name} weak to ${LABEL[COUNTER[g]]} next round.` }),
          );
        }
        body.append(gr);
      } else {
        body.append(h('div.hint', guide ? '' : 'Pick an action, then a target. Strike trades blows with attackers; Guard stops them cold.'));
      }
    }
    return h('div.panel.command', who, body, go);
  },

  memberLine(m) {
    const s = app.state;
    if (m.id === 'hestia') return 'Strength: her own business. Obeys… mostly.';
    const type = weaponType(s, m, this.c);
    const atk = Math.round(attackPower(s, m, this.c));
    let line = `ATK ${atk} · ${LABEL[type]}`;
    if (m.kind !== 'merc') {
      const a = ARMOURS[m.armour];
      const r = Object.keys(a.resist).map((k) => LABEL[k]).join('/');
      const w = Object.keys(a.weak).map((k) => LABEL[k]).join('/');
      line += ` · resists ${r || '—'} · weak ${w || '—'}`;
    }
    if (m.exposed) line += ` · EXPOSED to ${LABEL[m.exposed]}`;
    return line;
  },

  planSummary() {
    const c = this.c;
    const guards = Object.values(c.plans).filter((p) => p.action === 'guard').length;
    const strikes = Object.values(c.plans).filter((p) => p.action === 'strike').length;
    const unguarded = c.enemies.filter((e) => e.alive && e.revealed && (e.intent === 'attack' || e.intent === 'ransack') && !Object.values(c.plans).some((p) => p.action === 'guard' && p.target === e.uid));
    let s = `${strikes} striking, ${guards} guarding.`;
    if (unguarded.length) s += ` ${unguarded.length} known attacker${unguarded.length > 1 ? 's' : ''} unguarded — they’ll hit someone or your supplies.`;
    return s;
  },

  // ─── tooltip ───────────────────────────────────────────────────────────
  showTip(e, ev) {
    this.hideTip();
    const s = app.state;
    const inf = infer(s, e);
    const rows = [];
    rows.push(h('h4', e.identified ? e.name : 'Unidentified shadow'));
    if (e.known) {
      rows.push(
        h('div', `Eyes: ${e.known.eye ? e.eye : '?'} · Shape: ${e.known.shape ? e.shape : '?'} · Limbs: ${e.known.limbs ? e.limbs : '?'}`),
      );
    }
    if (!s.notebook.unlocked && !e.isBoss && !e.human) {
      rows.push(h('div.faint', 'Nobody here knows how to read them yet.'));
    } else if (!e.human) {
      const p = inf.profile;
      rows.push(h('div', 'Attacks: ', p.candidates.length ? h('b', p.candidates.map(profileShort).join(' or ')) : h('span.faint', 'unknown'), p.certain ? '' : p.candidates.length ? h('span.faint', ' (notes)') : ''));
      rows.push(h('div', 'Weak to: ', inf.weak.candidates.length ? h('b.good', inf.weak.candidates.map((x) => LABEL[x]).join(' or ')) : h('span.faint', '?'), ' · Resists: ', inf.resist.candidates.length ? h('b.bad', inf.resist.candidates.map((x) => LABEL[x]).join(' or ')) : h('span.faint', inf.resist.certain ? 'nothing' : '?')));
      if (e.element && e.element !== 'all' && (e.identified && !e.human)) rows.push(h('div', 'Element: ', h(`b.${e.element}`, LABEL[e.element]), h('span.faint', ` — hit it with ${LABEL[COUNTER[e.element]]}`)));
    }
    if (e.exposed) rows.push(h('div.brass', `Exposed to ${LABEL[e.exposed]} this round.`));
    if (e.wings) rows.push(h('div', `Ox Wings resist ${Math.round(e.wings * 100)}% of everything (thinning each round).`));
    const tip = h('div.tip', rows);
    const rect = ev.currentTarget.getBoundingClientRect();
    const stageRect = app.stage.getBoundingClientRect();
    const x = (rect.left - stageRect.left) / app.scale;
    const y = (rect.top - stageRect.top) / app.scale;
    tip.style.left = `${Math.min(690, Math.max(10, x - 270))}px`;
    tip.style.top = `${Math.max(48, y + 10)}px`;
    app.ui.appendChild(tip);
    this.tip = tip;
  },
  hideTip() {
    this.tip?.remove();
    this.tip = null;
  },

  // ─── victory ───────────────────────────────────────────────────────────
  showVictory() {
    this.won = true;
    this.sync();
  },

  victoryPanel() {
    const s = app.state;
    const c = this.c;
    const r = c.rewards || { coins: 0, materials: 0, gems: [] };
    const loot = h(
      'div.loot',
      h('span.chip', '◎ ', h('b', `+${r.coins}`), ' coins'),
      r.materials ? h('span.chip', '⚒ ', h('b', `+${r.materials}`), ' materials') : null,
      ...r.gems.map((g) => h('span.chip', gemEl(g), h('b', ` ${LABEL[g]} gem`))),
    );
    return h(
      'div.panel.result',
      h('h2', 'Victory'),
      h('p', c.kind === 'tutorial' ? 'The thugs scatter into the alleys.' : `Supplies left: ${s.supplies}.`),
      loot,
      btn('Continue', () => this.leave(), { cls: 'primary', key: '↵' }),
    );
  },

  leave() {
    if (this.leaving) return;
    this.leaving = true;
    const p = this.params;
    const s = app.state;
    setTimeout(() => (this.leaving = false), 800);
    this.won = false;
    if (p.story) {
      s.combat = null;
      p.onWin();
      return;
    }
    s.combat = null;
    const after = afterBattle(s);
    for (const note of after.notes) app.toast(note, false);
    if (after.scene) playScene(after.scene);
    else app.go('trail');
  },

  // ─── render ────────────────────────────────────────────────────────────
  render(ctx, t) {
    const s = app.state;
    const c = this.c;
    if (!c) return;
    drawScene(ctx, c.bg, t);
    const now = performance.now();

    // the cart
    const cartA = this.anim.cart;
    const cartShake = cartA && now - cartA.t0 < 300 ? Math.round(Math.sin((now - cartA.t0) / 20) * 4) : 0;
    drawCart(ctx, 78 + cartShake, FEET + 2, s.supplies / RULES.supplyMax);
    ctx.font = '13px "Pixelify Sans", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = s.supplies < 25 ? '#ff9a8a' : '#c8bca8';
    ctx.fillText(`supplies ${s.supplies}`, 78, FEET + 10);

    // plan lines
    if (c.phase === 'plan' && !this.playing) this.drawPlanLines(ctx, t);

    // heroes
    for (const slot of this.heroSlots()) {
      const a = this.anim[slot.id];
      let dx = 0;
      let dy = 0;
      let flash = 0;
      if (a) {
        const p = (now - a.t0) / 360;
        if (a.lunge && p < 1) dx = Math.sin(p * Math.PI) * 40 * a.lunge;
        if (a.hop && p < 1) dy = -Math.sin(p * Math.PI) * 16;
        if (a.hurt && p < 0.8) {
          flash = 1 - p / 0.8;
          dx += Math.round(Math.sin(p * 40) * 4);
        }
      }
      const down = slot.m.hp <= 0;
      const bob = down ? 0 : Math.round(Math.sin(t / 520 + slot.x)) * 2;
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(slot.x - 24, slot.y - 3, 48, 6);
      if (this.active === slot.id && c.phase === 'plan' && !this.playing) {
        ctx.fillStyle = 'rgba(232,204,128,0.18)';
        ctx.fillRect(slot.x - 30, slot.y - 4, 60, 8);
      }
      const img = memberSprite(slot.m, s.flags);
      if (down) {
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.translate(slot.x, slot.y);
        ctx.rotate(-Math.PI / 2);
        blit(ctx, img, 18, 54, 3, { tint: { color: '#1a1420', amount: 0.6 }, key: `down${slot.id}` });
        ctx.restore();
      } else {
        blit(ctx, img, slot.x + dx, slot.y + dy + bob, 3, { flash, key: slot.id });
        if (a?.guard && now - a.t0 < 1200) {
          ctx.strokeStyle = `rgba(150,190,230,${0.6 * (1 - (now - a.t0) / 1200)})`;
          ctx.lineWidth = 3;
          ctx.strokeRect(slot.x - 30, slot.y - 112, 60, 112);
        }
        if (slot.m.exposed) {
          ctx.fillStyle = elementColor(slot.m.exposed);
          ctx.fillRect(slot.x - 3, slot.y - 124 + Math.round(Math.sin(t / 200) * 2), 6, 6);
        }
      }
    }

    // enemies
    for (const slot of this.foeSlots()) {
      const e = slot.e;
      const a = this.anim[e.uid];
      let dx = 0;
      let flash = 0;
      let alpha = 1;
      if (a) {
        const p = (now - a.t0) / 360;
        if (a.lunge && p < 1) dx = Math.sin(p * Math.PI) * 40 * a.lunge;
        if (a.hurt && p < 0.8) {
          flash = 1 - p / 0.8;
          dx += Math.round(Math.sin(p * 40) * 4);
        }
        if (a.spawn && p < 1) alpha = p;
        if (a.dying) alpha = Math.max(0, 1 - (now - a.dying) / 600);
      }
      const img = this.foeArt(e, t);
      const scale = 3;
      const bob = Math.round(Math.sin(t / 700 + slot.x * 0.1)) * 2;
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(slot.x - img.width, slot.y - 3, img.width * 2, 6);
      blit(ctx, img, slot.x + dx, slot.y + bob, scale, { flash, alpha, key: e.uid });
      if (this.mode === 'target' && e.alive) {
        ctx.strokeStyle = `rgba(232,204,128,${0.4 + 0.3 * Math.sin(t / 150)})`;
        ctx.lineWidth = 2;
        const hgt = this.foeHeight(e);
        ctx.strokeRect(slot.x - 54, slot.y - hgt - 4, 108, hgt + 8);
      }
      if (e.exposed && e.alive) {
        ctx.fillStyle = elementColor(e.exposed);
        ctx.fillRect(slot.x + 44, slot.y - 40 + Math.round(Math.sin(t / 200) * 2), 6, 6);
      }
    }
    vignette(ctx, 0.45);
  },

  drawPlanLines(ctx, t) {
    const c = this.c;
    const heroes = this.heroSlots();
    const foes = this.foeSlots();
    ctx.save();
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.lineDashOffset = -t / 40;
    for (const hs of heroes) {
      const p = c.plans[hs.id];
      if (!p || !p.target) continue;
      const fs = foes.find((f) => f.e.uid === p.target);
      if (!fs) continue;
      ctx.strokeStyle = p.action === 'guard' ? 'rgba(140,180,230,0.75)' : p.action === 'study' ? 'rgba(190,170,240,0.75)' : 'rgba(240,140,130,0.75)';
      const x0 = hs.x;
      const y0 = hs.y - 120;
      const x1 = fs.x;
      const y1 = fs.y - this.foeHeight(fs.e) - 6;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.quadraticCurveTo((x0 + x1) / 2, Math.min(y0, y1) - 60, x1, y1);
      ctx.stroke();
    }
    ctx.restore();
  },

  key(e) {
    if (this.won) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.leave();
      }
      return;
    }
    if (this.playing || this.c.phase !== 'plan') return;
    const s = app.state;
    if (e.key === 'Enter') {
      e.preventDefault();
      this.endTurn();
      return;
    }
    if (e.key === 'Escape' || e.key === 'Backspace') {
      if (this.mode) {
        this.mode = null;
        this.pending = null;
        this.sync();
      }
      return;
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      const living = livingMembers(s);
      const i = living.findIndex((m) => memberId(m) === this.active);
      const next = living[(i + 1) % living.length];
      this.selectHero(memberId(next));
      return;
    }
    const n = parseInt(e.key, 10);
    if (!n) return;
    if (this.mode === 'target') {
      const foes = this.foeSlots().filter((f) => f.e.alive);
      if (foes[n - 1]) this.target(foes[n - 1].e.uid);
      return;
    }
    if (this.mode === 'item') {
      const keys = Object.keys(ITEMS);
      if (keys[n - 1] && s.items[keys[n - 1]]) this.pickItem(keys[n - 1]);
      return;
    }
    if (this.mode === 'ally') {
      const heroes = this.heroSlots();
      if (heroes[n - 1]) this.pickAlly(heroes[n - 1].id);
      return;
    }
    const m = memberById(s, this.active);
    if (!m) return;
    const acts = actionsFor(s, m);
    if (acts[n - 1]) this.choose(acts[n - 1].id);
  },
};

// ─── helpers ───────────────────────────────────────────────────────────────

function cap(s) {
  return s[0].toUpperCase() + s.slice(1);
}

function shortName(e, c) {
  if (e.identified && e.name.length < 12) return e.name;
  const idx = c.enemies.filter((x) => x.alive).indexOf(e);
  return `#${idx + 1}`;
}

function actionHint(id) {
  return {
    strike: 'Hit an enemy. If it attacks this round, you trade blows. If it guards, the strike is wasted.',
    guard: 'Stand in front of an enemy. If it attacks, nothing gets through — except the extra from your weakness.',
    study: 'Note one feature of an enemy in the notebook.',
    item: 'Use an item from the bag.',
    wait: 'Do nothing this round.',
  }[id];
}

export function elementColor(el) {
  return { fire: '#ff9a6a', water: '#8ac0f0', earth: '#b8d07a', electric: '#ffe080' }[el] || '#ffffff';
}

/** The supply cart: crates of milk that empty as supplies fall. */
function drawCart(ctx, x, y, frac) {
  const img = cached(`cart|${Math.ceil(frac * 6)}`, 34, 26, (c) => {
    c.fillStyle = '#3a2a22';
    c.fillRect(1, 12, 32, 8);
    c.fillStyle = '#2a1e18';
    c.fillRect(1, 18, 32, 2);
    c.fillRect(30, 6, 2, 8);
    const n = Math.ceil(frac * 6);
    for (let i = 0; i < 6; i++) {
      const cx = 3 + (i % 3) * 9;
      const cy = i < 3 ? 6 : 0;
      if (i >= n) continue;
      c.fillStyle = '#6a5040';
      c.fillRect(cx, cy, 8, 6);
      c.fillStyle = '#ece6dc';
      c.fillRect(cx + 1, cy - 2, 2, 3);
      c.fillRect(cx + 5, cy - 2, 2, 3);
    }
    c.fillStyle = '#16100c';
    c.fillRect(4, 20, 6, 6);
    c.fillRect(24, 20, 6, 6);
    c.fillStyle = '#4a3a30';
    c.fillRect(6, 22, 2, 2);
    c.fillRect(26, 22, 2, 2);
  });
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(x - 36, y - 4, 72, 6);
  blit(ctx, img, x, y, 2);
}

export { displayName };
