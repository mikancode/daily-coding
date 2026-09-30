// @ts-check

import { formatAttack, formatProfileAbilities, formatRotation } from './ability-names.js';

/**
 * @typedef {import('../types.js').CombatantProfile} CombatantProfile
 */

/**
 * @param {CombatantProfile} profile
 * @returns {string}
 */
export function formatBuildStats(profile) {
  return [
    `HP ${profile.maxHp}`,
    formatAttack(profile),
    `防御 ${profile.defense}`,
    `ローテーション：${formatRotation(profile.rotation)}`,
    ...formatProfileAbilities(profile),
  ].join(' / ');
}

/**
 * 組んだビルドのステータス。挑戦前にログから初期値を読み取って暗算しなくて済むよう、常に出す
 * @param {HTMLElement} element
 */
export function createBuildStatsView(element) {
  return {
    /** @param {CombatantProfile} profile */
    render(profile) {
      element.textContent = formatBuildStats(profile);
    },
  };
}
