// @ts-check
// 組んだビルドのステータスと能力のバッジの表示

import { formatAttack, profileEffects, toBadge } from './ability-names.js';

/**
 * @typedef {import('../types.js').CombatantProfile} CombatantProfile
 * @typedef {import('./description-popover.js').Badge} Badge
 * @typedef {ReturnType<typeof import('./description-popover.js').createDescriptionPopover>} DescriptionPopover
 */

/**
 * 1行目に出す基本ステータス
 * @param {CombatantProfile} profile
 * @returns {string}
 */
export function formatBuildStats(profile) {
  return [`HP ${profile.maxHp}`, formatAttack(profile), `DEF ${profile.defense}`].join(' / ');
}

/**
 * 周期スキルを1つも取っていないときに、ローテーションの代わりに置くバッジ。
 * 物理の周期スキルを取ったときと取り違えないよう、説明を分ける
 * @type {Badge}
 */
const NO_ROTATION_BADGE = { label: '物理', description: '周期スキルを取っていないので、毎ターン物理で攻撃する' };

/**
 * 2行目に出す能力のバッジ。周期スキルが無ければ、毎ターン物理で殴ることを先頭に示す
 * @param {CombatantProfile} profile
 * @returns {Badge[]}
 */
export function buildStatsBadges(profile) {
  const badges = profileEffects(profile).map(toBadge);
  return profile.rotation.length === 0 ? [NO_ROTATION_BADGE, ...badges] : badges;
}

/**
 * 組んだビルドのステータス。挑戦前にログから初期値を読み取って暗算しなくて済むよう、常に出す
 * @param {{ text: HTMLElement, badges: HTMLElement }} elements
 * @param {DescriptionPopover} popover
 */
export function createBuildStatsView(elements, popover) {
  return {
    /** @param {CombatantProfile} profile */
    render(profile) {
      elements.text.textContent = formatBuildStats(profile);
      popover.renderBadges(elements.badges, buildStatsBadges(profile));
    },
  };
}
