// @ts-check

import { ELEMENT_NAMES } from './element-names.js';

/**
 * @typedef {import('../types.js').CombatantProfile} CombatantProfile
 * @typedef {import('../types.js').ConditionalEffect} ConditionalEffect
 * @typedef {import('../types.js').ElementId} ElementId
 * @typedef {import('../types.js').Effect} Effect
 */

const PERCENT = 100;
const SINGLE_HIT = 1;

/**
 * 1発の威力は丸めずに出す。判定の floor は軽減と条件の倍率を掛けたあとに行うので、
 * ここで丸めるとログのダメージと合わなくなる
 * @param {CombatantProfile} profile
 * @returns {string}
 */
export function formatAttack(profile) {
  const perHit = profile.attack * profile.ratio;
  return profile.hits === SINGLE_HIT ? `攻撃 ${perHit}` : `攻撃 ${perHit} × ${profile.hits}回`;
}

/**
 * @param {ConditionalEffect} conditional
 * @returns {string}
 */
export function formatConditional(conditional) {
  const threshold = Math.round(conditional.hpRatioAtMost * PERCENT);
  return `HP ${threshold}%以下で与ダメージ${conditional.damageMultiplier}倍`;
}

/**
 * 周期スキルが無ければ、毎ターン物理で殴る
 * @param {readonly ElementId[]} rotation
 * @returns {string}
 */
export function formatRotation(rotation) {
  return rotation.length === 0
    ? ELEMENT_NAMES.physical
    : rotation.map((element) => ELEMENT_NAMES[element]).join('→');
}

/**
 * 敵の能力の一覧に出す。ステータスの加算と連撃は、HP・攻撃・防御の表示に含めるので出さない
 * @param {Effect} effect
 * @returns {string | null}
 */
export function formatAbility(effect) {
  switch (effect.type) {
    case 'conditional':
      return formatConditional(effect);
    case 'element':
      return `${ELEMENT_NAMES[effect.element]}属性`;
    case 'counter':
      return `反撃 ${effect.damage}`;
    case 'regen':
      return `再生 ${effect.amount}`;
    case 'poison':
      return `毒 ${effect.damage}`;
    case 'endure':
      return '食いしばり';
    case 'stat':
    case 'multiHit':
      return null;
  }
}

/** @type {Readonly<Record<'hp' | 'attack' | 'defense', string>>} */
const STAT_NAMES = { hp: 'HP', attack: '攻撃', defense: '防御' };

/**
 * 連戦の報酬の一覧に出す。敵の能力の一覧と違い、ステータスの加算と連撃も報酬の中身なので省かない
 * @param {Effect} effect
 * @returns {string}
 */
export function formatReward(effect) {
  switch (effect.type) {
    case 'stat':
      return `${STAT_NAMES[effect.stat]} +${effect.amount}`;
    case 'multiHit':
      return `${effect.hits}連撃（1発 ${effect.ratio}倍）`;
    default:
      return formatAbility(effect) ?? '';
  }
}
