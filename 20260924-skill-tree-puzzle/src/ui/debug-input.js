// @ts-check
// デバッグ入力の欄とボタン。ツリーを介さず、文字列で指定した能力で戦闘を試す

import { ABILITIES, PERIODS, formatDefaultPeriodWord, formatDefaultWord } from '../core/ability-table.js';
import { parseAbilities } from '../core/parse-abilities.js';

/**
 * @typedef {import('../types.js').AbilityDefinition} AbilityDefinition
 * @typedef {import('../types.js').AbilityError} AbilityError
 * @typedef {import('../types.js').Effect} Effect
 * @typedef {import('../types.js').PeriodDefinition} PeriodDefinition
 * @typedef {import('../types.js').StatId} StatId
 */

/** ツリーの起点ノードの基礎ステータスと同じ値。ここから増減して試せるようにする */
const INITIAL_TEXT = 'HP100,ATK10';
const WORD_SEPARATOR = ',';
const PERIOD_SEPARATOR = '/';

/**
 * 能力のボタンに出す文字。ステータスは、押すと増える量が分かるようにする
 * @param {AbilityDefinition} ability
 * @returns {string}
 */
function formatButtonLabel(ability) {
  return ability.group === 'stat' ? `${ability.label}+${ability.defaults[0]}` : ability.label;
}

/**
 * @param {AbilityError} error
 * @returns {string}
 */
function formatError({ word, reason }) {
  return word === '' ? reason : `「${word}」：${reason}`;
}

/**
 * @param {string} text
 * @param {string} word
 * @returns {string}
 */
function appendWord(text, word) {
  const trimmed = text.trimEnd();
  if (trimmed === '') {
    return word;
  }
  return trimmed.endsWith(WORD_SEPARATOR) ? `${trimmed}${word}` : `${trimmed}${WORD_SEPARATOR}${word}`;
}

/**
 * 1語が指定したステータスの語なら、その値を返す。
 * 判定と同じ規則で読むため、パーサーに1語ずつ渡す（大文字小文字・前後の空白・引数の省略も同じに扱う）
 * @param {string} word
 * @param {StatId} stat
 * @returns {number | undefined} 別の能力の語や不正な語なら undefined（値が0の語と区別する）
 */
function readStatAmount(word, stat) {
  const parsed = parseAbilities(word);
  if (!parsed.ok) {
    return undefined;
  }
  const [effect] = parsed.effects;
  return effect.type === 'stat' && effect.stat === stat ? effect.amount : undefined;
}

/**
 * @param {number} value
 * @returns {number} 小数点以下の桁数。整数なら0
 */
function countDecimalPlaces(value) {
  return (String(value).split('.')[1] ?? '').length;
}

/**
 * 2つの値の和。
 * 浮動小数点の誤差（`1.07 + 1` が `2.0700000000000003` になる）を欄に出さないよう、小数点以下の桁数が多いほうにそろえて丸める。
 * 末尾の0は残さない（`1.5 + 1.5` は `3`）
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
function addKeepingDecimalPlaces(a, b) {
  const places = Math.max(countDecimalPlaces(a), countDecimalPlaces(b));
  return Number((a + b).toFixed(places));
}

/**
 * 能力のボタンを押したあとの欄の文字列。
 * ステータスは、最後にある同じステータスの語の値に足して書き換える。押すたびに語が増えると、今の値が読み取りにくくなるため。
 * 同じステータスの語が無いときと、ステータス以外の能力は、規定値つきの1語を末尾に足す
 * @param {string} text
 * @param {AbilityDefinition} ability
 * @returns {string}
 */
export function addAbilityWord(text, ability) {
  const effect = ability.build(...ability.defaults);
  if (effect.type === 'stat') {
    const words = text.split(WORD_SEPARATOR);
    for (let index = words.length - 1; index >= 0; index -= 1) {
      const amount = readStatAmount(words[index], effect.stat);
      if (amount !== undefined) {
        words[index] = words[index].replace(words[index].trim(), `${ability.name}${addKeepingDecimalPlaces(amount, effect.amount)}`);
        return words.join(WORD_SEPARATOR);
      }
    }
  }
  return appendWord(text, formatDefaultWord(ability));
}

/**
 * 期間のボタンを押したあとの欄の文字列。最後の語の前に、規定値つきの期間の語を付けて包む（`Poison5` → `First3/Poison5`）。
 * 最後の語が空なら、期間の語だけを足して、続けて能力を書けるようにする
 * @param {string} text
 * @param {PeriodDefinition} period
 * @returns {string}
 */
export function wrapLastWord(text, period) {
  const prefix = `${formatDefaultPeriodWord(period)}${PERIOD_SEPARATOR}`;
  const words = text.split(WORD_SEPARATOR);
  const last = words[words.length - 1];
  if (last.trim() === '') {
    return appendWord(text, prefix);
  }
  words[words.length - 1] = last.replace(last.trim(), `${prefix}${last.trim()}`);
  return words.join(WORD_SEPARATOR);
}

/**
 * @param {string} label
 * @param {() => void} onClick
 * @returns {HTMLButtonElement}
 */
function createButton(label, onClick) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'button';
  button.textContent = label;
  button.addEventListener('click', onClick);
  return button;
}

/**
 * @param {{
 *   text: HTMLTextAreaElement,
 *   buttons: HTMLElement,
 *   error: HTMLElement,
 *   resetButton: HTMLButtonElement,
 *   fightButton: HTMLButtonElement,
 * }} elements
 * @param {{
 *   onFight: (effects: readonly Effect[]) => void,
 *   onInvalid: () => void,
 * }} handlers
 */
export function createDebugInput(elements, handlers) {
  function reset() {
    elements.text.value = INITIAL_TEXT;
    elements.error.textContent = '';
  }

  for (const ability of ABILITIES) {
    elements.buttons.append(
      createButton(formatButtonLabel(ability), () => {
        elements.text.value = addAbilityWord(elements.text.value, ability);
      }),
    );
  }
  for (const period of PERIODS) {
    elements.buttons.append(
      createButton(period.label, () => {
        elements.text.value = wrapLastWord(elements.text.value, period);
      }),
    );
  }

  elements.resetButton.addEventListener('click', reset);
  elements.fightButton.addEventListener('click', () => {
    const parsed = parseAbilities(elements.text.value);
    if (!parsed.ok) {
      elements.error.textContent = parsed.errors.map(formatError).join('\n');
      handlers.onInvalid();
      return;
    }
    elements.error.textContent = '';
    handlers.onFight(parsed.effects);
  });

  reset();
}
