// @ts-check
// デバッグ入力の文字列を、能力の表に沿って Effect の配列にする

import { fillArguments, findAbility, findPeriod, wrapTimed } from './ability-table.js';

/**
 * @typedef {import('../types.js').AbilityError} AbilityError
 * @typedef {import('../types.js').ParsedAbilities} ParsedAbilities
 */

const WORD_SEPARATOR = ',';
const ARGUMENT_SEPARATOR = ':';
/** 期間の語と、包む能力の語の区切り。例：`First3/Poison5` */
const PERIOD_SEPARATOR = '/';
const WORD_PATTERN = /^([A-Za-z]+)(.*)$/;
const NUMBER_PATTERN = /^\d+(\.\d+)?$/;

/**
 * 期間で包まない1語を Effect にする。書式が不正なら理由を返す
 * @param {string} word
 * @returns {{ effect: import('../types.js').Effect } | { reason: string }}
 */
function parseAbilityWord(word) {
  const match = WORD_PATTERN.exec(word);
  if (match === null) {
    return { reason: '能力の名前から始めてください' };
  }
  const [, name, rest] = match;
  const ability = findAbility(name);
  if (ability === undefined) {
    return { reason: '知らない能力です' };
  }
  const texts = rest === '' ? [] : rest.split(ARGUMENT_SEPARATOR);
  const invalid = texts.find((text) => !NUMBER_PATTERN.test(text));
  if (invalid !== undefined) {
    return { reason: `引数「${invalid}」は数値ではありません` };
  }
  const filled = fillArguments(ability, texts.map(Number));
  return 'reason' in filled ? filled : { effect: ability.build(...filled.args) };
}

/**
 * 期間の語を TimedPeriod にする。引数を省くと規定値になる。範囲の検査は wrapTimed が行う。
 * 期間の引数は多くて1つなので、`:` で区切らない
 * @param {string} word
 * @returns {{ period: import('../types.js').TimedPeriod } | { reason: string }}
 */
function parsePeriodWord(word) {
  const match = WORD_PATTERN.exec(word);
  if (match === null) {
    return { reason: '期間の名前から始めてください' };
  }
  const [, name, rest] = match;
  const period = findPeriod(name);
  if (period === undefined) {
    return { reason: '知らない期間です' };
  }
  if (rest === '') {
    return { period: period.build(...period.defaults) };
  }
  if (period.defaults.length === 0) {
    return { reason: `${period.name} は引数を取りません` };
  }
  if (!NUMBER_PATTERN.test(rest)) {
    return { reason: `期間の引数「${rest}」は数値ではありません` };
  }
  return { period: period.build(Number(rest)) };
}

/**
 * 1語を Effect にする。`期間/能力` の形なら、能力を期間で包む。書式が不正なら理由を返す
 * @param {string} word
 * @returns {{ effect: import('../types.js').Effect } | { reason: string }}
 */
function parseWord(word) {
  const separator = word.indexOf(PERIOD_SEPARATOR);
  if (separator === -1) {
    return parseAbilityWord(word);
  }
  const period = parsePeriodWord(word.slice(0, separator).trim());
  if ('reason' in period) {
    return period;
  }
  const inner = parseWord(word.slice(separator + 1).trim());
  if ('reason' in inner) {
    return inner;
  }
  return wrapTimed(period.period, inner.effect);
}

/**
 * デバッグ入力の文字列を Effect の配列にする。並び順はそのまま返す
 * （HP・攻撃・防御の合算や、周期スキルの順は createProfile が行う）。
 * 不正な語は、最初の1つで止めずすべて集める
 * @param {string} text
 * @returns {ParsedAbilities}
 */
export function parseAbilities(text) {
  if (text.trim() === '') {
    return { ok: false, errors: [{ word: '', reason: '能力が1つも指定されていません' }] };
  }
  /** @type {import('../types.js').Effect[]} */
  const effects = [];
  /** @type {AbilityError[]} */
  const errors = [];
  for (const raw of text.split(WORD_SEPARATOR)) {
    const word = raw.trim();
    const parsed = word === '' ? { reason: 'カンマの間が空です' } : parseWord(word);
    if ('effect' in parsed) {
      effects.push(parsed.effect);
    } else {
      errors.push({ word, reason: parsed.reason });
    }
  }
  return errors.length === 0 ? { ok: true, effects } : { ok: false, errors };
}
