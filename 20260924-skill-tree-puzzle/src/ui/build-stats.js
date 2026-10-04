// @ts-check
// 組んだビルドのステータスと能力のバッジの表示

import { formatAttack, profileEffects, toBadge } from './ability-names.js';

/**
 * @typedef {import('../types.js').CombatantProfile} CombatantProfile
 * @typedef {import('./ability-badges.js').Badge} Badge
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
 * @param {AbilityBadges} abilityBadges
 */
export function createBuildStatsView(elements, abilityBadges) {
  return {
    /** @param {CombatantProfile} profile */
    render(profile) {
      elements.text.textContent = formatBuildStats(profile);
      abilityBadges.render(elements.badges, buildStatsBadges(profile));
    },
  };
}
