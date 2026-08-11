/** Pub / mercenaries */

const MERC_POOL = [
  { id: 'merc_ash', name: 'Ash-Knee', atk: 3, hp: 18, attackType: 'slashing', element: 'fire', price: 12, rarity: 1 },
  { id: 'merc_nil', name: 'Nil Hook', atk: 4, hp: 16, attackType: 'piercing', element: 'water', price: 16, rarity: 2 },
  { id: 'merc_grub', name: 'Grubmasher', atk: 5, hp: 22, attackType: 'blunt', element: 'earth', price: 22, rarity: 2 },
  { id: 'merc_volt', name: 'Volt Sister', atk: 6, hp: 14, attackType: 'piercing', element: 'electric', price: 28, rarity: 3 },
  { id: 'merc_free', name: 'Trial Rat', atk: 3, hp: 12, attackType: 'slashing', element: 'earth', price: 0, rarity: 1, trial: true },
];

export function minglePub(state) {
  const count = 2 + Math.floor(Math.random() * 2);
  const patrons = [];
  for (let i = 0; i < count; i++) {
    const weights = MERC_POOL.map((m) => 1 / m.rarity);
    const sum = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * sum;
    let pick = MERC_POOL[0];
    for (let j = 0; j < MERC_POOL.length; j++) {
      r -= weights[j];
      if (r <= 0) {
        pick = MERC_POOL[j];
        break;
      }
    }
    const uses = state._mercUses?.[pick.id] || 0;
    const price = Math.round(pick.price * (1 + uses * 0.15));
    patrons.push({
      ...pick,
      price,
      instanceId: `${pick.id}_${Date.now()}_${i}`,
      hp: pick.hp + uses,
      maxHp: pick.hp + uses,
      atk: pick.atk + Math.floor(uses / 2),
      alive: true,
      active: true,
      resist: {},
      weak: {},
      merc: true,
    });
  }
  state.mercenaries = patrons;
  return patrons;
}

export function hireMerc(state, index, { bargain = false } = {}) {
  const m = state.mercenaries[index];
  if (!m) return { ok: false, msg: 'No one there.' };
  if (state.hired.length >= 2) return { ok: false, msg: 'Only two mercenary slots.' };

  let price = m.price;
  let betrayRisk = 0;
  if (bargain) {
    price = Math.floor(price * 0.6);
    betrayRisk = 0.35;
  }
  if (state.money < price) return { ok: false, msg: 'Not enough coin.' };

  state.money -= price;
  state._mercUses = state._mercUses || {};
  state._mercUses[m.id] = (state._mercUses[m.id] || 0) + 1;

  const hired = { ...m, pricePaid: price, betrayRisk, trial: m.trial };
  if (m.trial) {
    hired.trialQuestDue = true;
    hired.msg = 'Trial run — finish a quest or they rob you.';
  }
  state.hired.push(hired);
  state.mercenaries.splice(index, 1);

  if (betrayRisk > 0 && Math.random() < betrayRisk) {
    hired.willBetray = true;
  }
  return { ok: true, msg: `Hired ${hired.name} for ${price} coin.` };
}

export function checkMercBetrayal(state) {
  for (let i = state.hired.length - 1; i >= 0; i--) {
    const m = state.hired[i];
    if (m.willBetray && Math.random() < 0.5) {
      const steal = Math.min(state.money, 10 + Math.floor(Math.random() * 15));
      state.money -= steal;
      state.inventory.potions = Math.max(0, state.inventory.potions - 1);
      state.hired.splice(i, 1);
      return `${m.name} flees with ${steal} coin and a potion!`;
    }
    if (m.trialQuestDue && state.flags.woodsDone) {
      // trial resolved if any dungeon progressed
      m.trialQuestDue = false;
    } else if (m.trial && m.trialQuestDue && state.flags.tutorialDone && Math.random() < 0.3) {
      // chance to rob if neglected
    }
  }
  return null;
}

export function resolveTrialFailure(state) {
  for (let i = state.hired.length - 1; i >= 0; i--) {
    const m = state.hired[i];
    if (m.trial && m.trialQuestDue) {
      // weighed by rarity
      const chance = 0.3 + m.rarity * 0.1;
      if (Math.random() < chance) {
        state.money = Math.floor(state.money / 2);
        state.inventory.potions = Math.floor(state.inventory.potions / 2);
        state.hired.splice(i, 1);
        return `${m.name} ends the trial — takes half your coin and items.`;
      }
    }
  }
  return null;
}
