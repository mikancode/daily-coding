// @ts-check

import { formatConditional, formatRotation } from './ability-names.js';

/**
 * @typedef {import('../types.js').CombatantProfile} CombatantProfile
 */

const SINGLE_HIT = 1;

/**
 * 1発の威力は丸めずに出す。判定の floor は軽減と条件の倍率を掛けたあとに行うので、
 * ここで丸めるとログのダメージと合わなくなる
 * @param {CombatantProfile} profile
 * @returns {string}
 */
function formatAttack(profile) {
  const perHit = profile.attack * profile.ratio;
  return profile.hits === SINGLE_HIT ? `攻撃 ${perHit}` : `攻撃 ${perHit} × ${profile.hits}回`;
}

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
    ...profile.conditionals.map(formatConditional),
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
