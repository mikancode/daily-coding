// @ts-check

import { fillArguments, findAbility } from './ability-table.js';

/**
 * @typedef {import('../types.js').AbilityError} AbilityError
 * @typedef {import('../types.js').ParsedAbilities} ParsedAbilities
 */

const WORD_SEPARATOR = ',';
const ARGUMENT_SEPARATOR = ':';
const WORD_PATTERN = /^([A-Za-z]+)(.*)$/;
const NUMBER_PATTERN = /^\d+(\.\d+)?$/;

/**
 * 1語を Effect にする。書式が不正なら理由を返す
 * @param {string} word
 * @returns {{ effect: import('../types.js').Effect } | { reason: string }}
 */
function parseWord(word) {
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
