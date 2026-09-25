// @ts-check

import { ELEMENT_NAMES } from './element-names.js';

/**
 * @typedef {import('../types.js').ConditionalEffect} ConditionalEffect
 * @typedef {import('../types.js').PlayerProfile} PlayerProfile
 */

const PERCENT = 100;
const SINGLE_HIT = 1;

/**
 * 1発の威力は丸めずに出す。判定の floor は軽減と条件の倍率を掛けたあとに行うので、
 * ここで丸めるとログのダメージと合わなくなる
 * @param {PlayerProfile} profile
 * @returns {string}
 */
function formatAttack(profile) {
  const perHit = profile.attack * profile.ratio;
  return profile.hits === SINGLE_HIT ? `攻撃 ${perHit}` : `攻撃 ${perHit} × ${profile.hits}回`;
}

/**
 * @param {ConditionalEffect} conditional
 * @returns {string}
 */
function formatConditional(conditional) {
  const threshold = Math.round(conditional.hpRatioAtMost * PERCENT);
  return `HP ${threshold}%以下で与ダメージ${conditional.damageMultiplier}倍`;
}

/**
 * @param {PlayerProfile} profile
 * @returns {string}
 */
export function formatBuildStats(profile) {
  const elements = [...profile.elements].map((element) => ELEMENT_NAMES[element]).join('・');
  return [
    `HP ${profile.maxHp}`,
    formatAttack(profile),
    `防御 ${profile.defense}`,
    `属性：${elements}`,
    ...profile.conditionals.map(formatConditional),
  ].join(' / ');
}

/**
 * 組んだビルドのステータス。挑戦前にログから初期値を読み取って暗算しなくて済むよう、常に出す
 * @param {HTMLElement} element
 */
export function createBuildStatsView(element) {
  return {
    /** @param {PlayerProfile} profile */
    render(profile) {
      element.textContent = formatBuildStats(profile);
    },
  };
}
