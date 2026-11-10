import { FEATURES, SHORT } from '../data/constants.js';
import { pick } from '../core/rng.js';

/**
 * Mitzi's notebook. Each trait (eye:green, shape:circle, limbs:2) collects every
 * attack profile, weakness and resistance seen on creatures known to carry it.
 * Intersecting the notes of an enemy's known traits narrows down what it is.
 */

export const traitKey = (feature, value) => `${feature}:${value}`;
export const profileKey = (element, type) => `${element}.${type}`;
export const profileShort = (key) => {
  const [el, ty] = key.split('.');
  return `${SHORT[el]}.${SHORT[ty]}`;
};

function entry(nb, key) {
  if (!nb.traits[key]) nb.traits[key] = { profiles: [], weak: [], resist: [] };
  return nb.traits[key];
}

function addUnique(arr, v) {
  if (v && !arr.includes(v)) {
    arr.push(v);
    return true;
  }
  return false;
}

export function knownTraitKeys(enemy) {
  if (!enemy.known) return [];
  return FEATURES.filter((f) => enemy.known[f]).map((f) => traitKey(f, enemy[f]));
}

function note(nb, text) {
  nb.fresh.push(text);
  if (nb.fresh.length > 30) nb.fresh.shift();
}

/** Enemy revealed its element/type by attacking (requires the notebook). */
export function recordProfile(state, enemy) {
  const nb = state.notebook;
  if (!nb.unlocked || enemy.isBoss || !enemy.known) return false;
  enemy.seen.profile = true;
  const p = profileKey(enemy.element, enemy.type);
  let added = false;
  for (const k of knownTraitKeys(enemy)) {
    if (addUnique(entry(nb, k).profiles, p)) {
      added = true;
      note(nb, `${k.replace(':', ' ')} → ${profileShort(p)}`);
    }
  }
  return added;
}

export function recordWeak(state, enemy) {
  const nb = state.notebook;
  if (!nb.unlocked || !enemy.known) return;
  enemy.seen.weak = true;
  for (const k of knownTraitKeys(enemy)) addUnique(entry(nb, k).weak, enemy.weak);
}

export function recordResist(state, enemy) {
  const nb = state.notebook;
  if (!nb.unlocked || !enemy.known || !enemy.resist) return;
  enemy.seen.resist = true;
  for (const k of knownTraitKeys(enemy)) addUnique(entry(nb, k).resist, enemy.resist);
}

export function identify(state, enemy) {
  const nb = state.notebook;
  enemy.identified = true;
  enemy.seen = { profile: true, weak: true, resist: true };
  if (enemy.mid && nb.species[enemy.mid] !== 'identified') {
    nb.species[enemy.mid] = 'identified';
    state.stats.identified += 1;
    if (state.expedition) state.expedition.identified += 1;
  }
  const p = profileKey(enemy.element, enemy.type);
  for (const f of FEATURES) {
    const e = entry(nb, traitKey(f, enemy[f]));
    addUnique(e.profiles, p);
    addUnique(e.weak, enemy.weak);
    addUnique(e.resist, enemy.resist);
  }
  note(nb, `Identified ${enemy.name}`);
}

/**
 * Study: learn one unknown feature of the enemy. Returns a description for the log.
 * Bosses have no features to learn; studying them reveals weakness and resistance.
 */
export function study(state, enemy) {
  if (enemy.isBoss) {
    const fresh = !enemy.seen.weak || !enemy.seen.resist;
    enemy.seen.weak = true;
    enemy.seen.resist = true;
    return { boss: true, fresh, weak: enemy.weak, resist: enemy.resist };
  }
  const unknown = FEATURES.filter((f) => !enemy.known[f]);
  if (!unknown.length) {
    if (!enemy.identified) identify(state, enemy);
    return { feature: null, identified: true, already: true };
  }
  const feature = pick(unknown);
  enemy.known[feature] = true;
  // features stick to the species: you'll recognise them next time
  if (enemy.mid) {
    state.notebook.known ||= {};
    state.notebook.known[enemy.mid] = { ...(state.notebook.known[enemy.mid] || {}), [feature]: true };
  }
  const key = traitKey(feature, enemy[feature]);
  const nb = state.notebook;
  const existing = nb.traits[key] ? JSON.parse(JSON.stringify(nb.traits[key])) : null;
  // back-fill what this creature already showed us into the new trait
  const e = entry(nb, key);
  if (enemy.seen.profile) addUnique(e.profiles, profileKey(enemy.element, enemy.type));
  if (enemy.seen.weak) addUnique(e.weak, enemy.weak);
  if (enemy.seen.resist) addUnique(e.resist, enemy.resist);

  let identified = false;
  if (FEATURES.every((f) => enemy.known[f])) {
    identify(state, enemy);
    identified = true;
  }
  return { feature, value: enemy[feature], key, recognized: existing, identified };
}

function intersect(lists) {
  const nonEmpty = lists.filter((l) => l && l.length);
  if (!nonEmpty.length) return [];
  return nonEmpty.reduce((acc, l) => acc.filter((x) => l.includes(x)));
}

/**
 * What the notebook suggests about an enemy.
 * certain: we have seen it directly (or it is identified).
 * candidates: notes from all known traits that agree; one candidate = a confident guess.
 */
export function infer(state, enemy) {
  const actualProfile = profileKey(enemy.element, enemy.type);
  if (enemy.isBoss) {
    return {
      profile: { certain: enemy.element !== 'all', candidates: enemy.element === 'all' ? [] : [actualProfile] },
      weak: { certain: enemy.seen.weak, candidates: enemy.seen.weak && enemy.weak ? [enemy.weak] : [] },
      resist: { certain: enemy.seen.resist, candidates: enemy.seen.resist && enemy.resist ? [enemy.resist] : [] },
    };
  }
  const nb = state.notebook;
  const entries = knownTraitKeys(enemy).map((k) => nb.traits[k]).filter(Boolean);
  const out = {};
  out.profile = enemy.seen.profile
    ? { certain: true, candidates: [actualProfile] }
    : { certain: false, candidates: intersect(entries.map((e) => e.profiles)) };
  out.weak = enemy.seen.weak
    ? { certain: true, candidates: [enemy.weak] }
    : { certain: false, candidates: intersect(entries.map((e) => e.weak)) };
  out.resist = enemy.seen.resist
    ? { certain: true, candidates: enemy.resist ? [enemy.resist] : [] }
    : { certain: false, candidates: intersect(entries.map((e) => e.resist)) };
  return out;
}

/** The single best guess at an enemy's attack, for intent display. */
export function predictedProfile(state, enemy) {
  const inf = infer(state, enemy);
  if (inf.profile.certain || inf.profile.candidates.length === 1) {
    const [element, type] = inf.profile.candidates[0].split('.');
    return { element, type, certain: inf.profile.certain };
  }
  return null;
}
