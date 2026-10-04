// @ts-check
// 能力・攻撃・報酬の表示用の文言と、能力のバッジ名・説明

import { ELEMENT_NAMES } from './element-names.js';

/**
 * @typedef {import('../types.js').CombatantProfile} CombatantProfile
 * @typedef {import('../types.js').ConditionalEffect} ConditionalEffect
 * @typedef {import('../types.js').Effect} Effect
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

/** @param {number} ratio @returns {string} */
const formatDrain = (ratio) => `吸収 ${Math.round(ratio * PERCENT)}%`;
/** @param {number} amount @returns {string} */
const formatRage = (amount) => `逆上 攻撃+${amount}`;
/** @param {number} amount @returns {string} */
const formatArmorBreak = (amount) => `破甲 防御-${amount}`;
/** @param {number} amount @returns {string} */
const formatMark = (amount) => `刻印 ${amount}`;

/**
 * 報酬の一覧に出す能力の名前。ステータスの加算と連撃は formatReward が扱う
 * @param {Effect} effect
 * @returns {string | null}
 */
function formatAbility(effect) {
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
 * 連戦の報酬の一覧に出す。ステータスの加算と連撃も報酬の中身なので省かない
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

/**
 * 説明文の主語。英字の後ろだけ助詞の前に空白を入れるので、助詞まで含める
 * @type {Readonly<Record<'hp' | 'attack' | 'defense', string>>}
 */
const STAT_SUBJECTS = { hp: '最大 HP が', attack: '攻撃が', defense: '防御が' };

/**
 * 能力のバッジ。名前と説明は、ノードとボスで同じ文言を使う
 * @param {Effect} effect
 * @returns {import('./ability-badges.js').Badge}
 */
export function toBadge(effect) {
  return { label: formatBadgeLabel(effect), description: describeEffect(effect) };
}

/**
 * 能力の効き方の説明。ノードとボスの能力を、同じ文言で説明する
 * @param {Effect} effect
 * @returns {string}
 */
export function describeEffect(effect) {
  switch (effect.type) {
    case 'stat':
      return `${STAT_SUBJECTS[effect.stat]} ${effect.amount} 上がる`;
    case 'multiHit':
      return `通常攻撃が ${effect.hits} 回になる。1発の威力は攻撃の ${effect.ratio} 倍`;
    case 'conditional':
      return `HP が ${Math.round(effect.hpRatioAtMost * PERCENT)}% 以下のとき、与えるダメージが ${effect.damageMultiplier} 倍`;
    case 'element':
      return effect.element === 'physical'
        ? '周期スキル。回ってきたターンは物理で攻撃する'
        : `周期スキル。回ってきたターンは${ELEMENT_NAMES[effect.element]}属性で攻撃する`;
    case 'counter':
      return `攻撃を1発受けるたびに、${effect.damage} − 相手の防御 のダメージを返す`;
    case 'regen':
      return `ターン開始時に、HP を ${effect.amount} 回復する`;
    case 'poison':
      return `ターン終了時に、相手の防御を無視して ${effect.damage} のダメージを与える`;
    case 'endure':
      return '戦闘中に1回だけ、倒れるダメージを受けても HP 1 で踏みとどまる';
    case 'drain':
      return `攻撃を当てるたびに、与えたダメージの ${Math.round(effect.ratio * PERCENT)}% だけ HP を回復する`;
    case 'rage':
      return `攻撃を受けるたびに、この戦闘中の攻撃が ${effect.amount} 上がる`;
    case 'pierce':
      return '攻撃で、相手の防御を引かない';
    case 'armorBreak':
      return `攻撃を当てるたびに、この戦闘中の相手の防御を ${effect.amount} 下げる`;
    case 'tempo':
      return `${effect.every} の倍数のターンに、与えるダメージが ${effect.damageMultiplier} 倍`;
    case 'charge':
      return `周期スキル。回ってきたターンは物理で攻撃し、前回から経過した1ターンにつき与えるダメージ +${effect.perTurn} 倍`;
    case 'mark':
      return `攻撃を当てるたびに、相手に刻印を ${effect.amount} 付ける`;
    case 'burst':
      return `周期スキル。回ってきたターンは物理で攻撃し、相手の刻印を全部使って、1つにつき与えるダメージ +${effect.perMark} 倍`;
  }
}

/**
 * 集計した能力を、バッジに並べる Effect の形に戻す。ステータスと連撃は1行目に出すので含めない。
 * 合計した値で戻すので、反撃を2つ取れば反撃1つぶんの合計値になる。
 * ローテーションはその順に先頭へ並べる
 * @param {CombatantProfile} profile
 * @returns {Effect[]}
 */
export function profileEffects(profile) {
  /** @type {Effect[]} */
  const effects = [...profile.rotation, ...profile.conditionals, ...profile.tempos];
  if (profile.counter > 0) effects.push({ type: 'counter', damage: profile.counter });
  if (profile.regen > 0) effects.push({ type: 'regen', amount: profile.regen });
  if (profile.poison > 0) effects.push({ type: 'poison', damage: profile.poison });
  if (profile.endure) effects.push({ type: 'endure' });
  if (profile.drain > 0) effects.push({ type: 'drain', ratio: profile.drain });
  if (profile.rage > 0) effects.push({ type: 'rage', amount: profile.rage });
  if (profile.pierce) effects.push({ type: 'pierce' });
  if (profile.armorBreak > 0) effects.push({ type: 'armorBreak', amount: profile.armorBreak });
  if (profile.mark > 0) effects.push({ type: 'mark', amount: profile.mark });
  return effects;
}

/**
 * バッジに出す短い名前。数値は説明の吹き出しで読めるので、量で差が出る能力にだけ添える
 * @param {Effect} effect
 * @returns {string}
 */
export function formatBadgeLabel(effect) {
  switch (effect.type) {
    case 'stat':
      return `${STAT_NAMES[effect.stat]} +${effect.amount}`;
    case 'multiHit':
      return `${effect.hits}連撃`;
    case 'conditional':
      return '背水';
    case 'element':
      return ELEMENT_NAMES[effect.element];
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
      return `逆上 +${effect.amount}`;
    case 'pierce':
      return '貫通';
    case 'armorBreak':
      return `破甲 -${effect.amount}`;
    case 'tempo':
      return '好機';
    case 'charge':
      return '溜め';
    case 'mark':
      return formatMark(effect.amount);
    case 'burst':
      return '解放';
  }
}
