// @ts-check
// デバッグ入力の欄とボタン。ツリーを介さず、文字列で指定した能力で戦闘を試す

import { ABILITIES, formatDefaultWord } from '../core/ability-table.js';
import { parseAbilities } from '../core/parse-abilities.js';

/**
 * @typedef {import('../types.js').AbilityDefinition} AbilityDefinition
 * @typedef {import('../types.js').AbilityError} AbilityError
 * @typedef {import('../types.js').Effect} Effect
 */

/** ツリーの起点ノードの基礎ステータスと同じ値。ここから増減して試せるようにする */
const INITIAL_TEXT = 'HP100,ATK10';
const WORD_SEPARATOR = ',';

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
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'button';
    button.textContent = formatButtonLabel(ability);
    button.addEventListener('click', () => {
      elements.text.value = appendWord(elements.text.value, formatDefaultWord(ability));
    });
    elements.buttons.append(button);
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
