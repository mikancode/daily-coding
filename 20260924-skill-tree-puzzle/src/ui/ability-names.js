// @ts-check

import { ELEMENT_NAMES } from './element-names.js';

/**
 * @typedef {import('../types.js').CombatantProfile} CombatantProfile
 * @typedef {import('../types.js').ConditionalEffect} ConditionalEffect
 * @typedef {import('../types.js').Effect} Effect
 * @typedef {import('../types.js').RotationSkill} RotationSkill
 * @typedef {import('../types.js').TempoEffect} TempoEffect
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
function formatConditional(conditional) {
  const threshold = Math.round(conditional.hpRatioAtMost * PERCENT);
  return `HP ${threshold}%以下で与ダメージ${conditional.damageMultiplier}倍`;
}

/**
 * @param {TempoEffect} tempo
 * @returns {string}
 */
function formatTempo(tempo) {
  return `${tempo.every}の倍数のターンに与ダメージ${tempo.damageMultiplier}倍`;
}

/**
 * @param {RotationSkill} skill
 * @returns {string}
 */
function formatRotationSkill(skill) {
  switch (skill.type) {
    case 'element':
      return ELEMENT_NAMES[skill.element];
    case 'charge':
      return '溜め';
    case 'burst':
      return '解放';
  }
}

/**
 * 周期スキルが無ければ、毎ターン物理で殴る
 * @param {readonly RotationSkill[]} rotation
 * @returns {string}
 */
export function formatRotation(rotation) {
  return rotation.length === 0 ? ELEMENT_NAMES.physical : rotation.map(formatRotationSkill).join('→');
}

/**
 * 集計した能力のうち、ステータス・連撃・ローテーション以外を並べる。組んだビルドのステータス表示に出す
 * @param {CombatantProfile} profile
 * @returns {string[]}
 */
export function formatProfileAbilities(profile) {
  return [
    ...profile.conditionals.map(formatConditional),
    ...profile.tempos.map(formatTempo),
    ...(profile.counter > 0 ? [`反撃 ${profile.counter}`] : []),
    ...(profile.regen > 0 ? [`再生 ${profile.regen}`] : []),
    ...(profile.poison > 0 ? [`毒 ${profile.poison}`] : []),
    ...(profile.endure ? ['食いしばり'] : []),
    ...(profile.drain > 0 ? [formatDrain(profile.drain)] : []),
    ...(profile.rage > 0 ? [formatRage(profile.rage)] : []),
    ...(profile.pierce ? ['貫通'] : []),
    ...(profile.armorBreak > 0 ? [formatArmorBreak(profile.armorBreak)] : []),
    ...(profile.mark > 0 ? [formatMark(profile.mark)] : []),
  ];
}

/** @param {number} ratio @returns {string} */
const formatDrain = (ratio) => `吸収 ${Math.round(ratio * PERCENT)}%`;
/** @param {number} amount @returns {string} */
const formatRage = (amount) => `逆上 攻撃+${amount}`;
/** @param {number} amount @returns {string} */
const formatArmorBreak = (amount) => `破甲 防御-${amount}`;
/** @param {number} amount @returns {string} */
const formatMark = (amount) => `刻印 ${amount}`;

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
    case 'drain':
      return formatDrain(effect.ratio);
    case 'rage':
      return formatRage(effect.amount);
    case 'pierce':
      return '貫通';
    case 'armorBreak':
      return formatArmorBreak(effect.amount);
    case 'tempo':
      return formatTempo(effect);
    case 'charge':
      return `溜め（経過1ターンにつき+${effect.perTurn}倍）`;
    case 'mark':
      return formatMark(effect.amount);
    case 'burst':
      return `解放（刻印1つにつき+${effect.perMark}倍）`;
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
