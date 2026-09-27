// @ts-check

import { ELEMENT_NAMES } from './element-names.js';

/**
 * @typedef {import('../types.js').ConditionalEffect} ConditionalEffect
 * @typedef {import('../types.js').ElementId} ElementId
 * @typedef {import('../types.js').Effect} Effect
 */

const PERCENT = 100;

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
 * 敵の能力の一覧に出す。ステータスの加算と連撃は、敵では基礎ステータスとして書くので出さない
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
