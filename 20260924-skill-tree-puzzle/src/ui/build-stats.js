// @ts-check
// 組んだビルドのステータスと能力のバッジの表示

import { PHYSICAL, formatAttack, profileEffects } from './ability-names.js';

/**
 * @typedef {import('../types.js').CombatantProfile} CombatantProfile
 * @typedef {import('../types.js').Effect} Effect
 * @typedef {ReturnType<typeof import('./ability-badges.js').createAbilityBadges>} AbilityBadges
 */

/**
 * 1行目に出す基本ステータス
 * @param {CombatantProfile} profile
 * @returns {string}
 */
export function formatBuildStats(profile) {
  return [`HP ${profile.maxHp}`, formatAttack(profile), `防御 ${profile.defense}`].join(' / ');
}

/**
 * 2行目にバッジで出す能力。周期スキルが無ければ毎ターン物理で殴るので、物理を先頭に置く
 * @param {CombatantProfile} profile
 * @returns {Effect[]}
 */
export function buildStatsEffects(profile) {
  const effects = profileEffects(profile);
  return profile.rotation.length === 0 ? [PHYSICAL, ...effects] : effects;
}

/**
 * 組んだビルドのステータス。挑戦前にログから初期値を読み取って暗算しなくて済むよう、常に出す
 * @param {{ text: HTMLElement, badges: HTMLElement }} elements
 * @param {AbilityBadges} abilityBadges
 */
export function createBuildStatsView(elements, abilityBadges) {
  return {
    /** @param {CombatantProfile} profile */
    render(profile) {
      elements.text.textContent = formatBuildStats(profile);
      abilityBadges.render(elements.badges, buildStatsEffects(profile));
    },
  };
}
