// @ts-check

import { ELEMENT_NAMES } from './element-names.js';

/**
 * @typedef {import('../types.js').Challenge} Challenge
 * @typedef {import('../types.js').ElementId} ElementId
 */

const PERCENT = 100;

/**
 * @param {Challenge} challenge
 * @returns {string}
 */
function formatResistances(challenge) {
  const entries = /** @type {[ElementId, number][]} */ (Object.entries(challenge.resistances));
  if (entries.length === 0) {
    return '';
  }
  const parts = entries.map(
    ([element, reduction]) => `${ELEMENT_NAMES[element]} ${Math.round(reduction * PERCENT)}%`,
  );
  return ` / 軽減：${parts.join('・')}`;
}

/**
 * お題の選択と情報・残り pt・挑戦と全リセットのボタン。選んだ・押したときの処理は呼び出し側が持つ
 * @param {{
 *   challengeSelect: HTMLSelectElement,
 *   challenge: HTMLElement,
 *   points: HTMLElement,
 *   challengeButton: HTMLButtonElement,
 *   resetButton: HTMLButtonElement,
 * }} elements
 * @param {readonly Challenge[]} challenges
 * @param {{
 *   onSelectChallenge: (challengeId: string) => void,
 *   onChallenge: () => void,
 *   onReset: () => void,
 * }} handlers
 */
export function createPanel(elements, challenges, handlers) {
  elements.challengeSelect.replaceChildren(
    ...challenges.map((challenge) => new Option(challenge.name, challenge.id)),
  );
  elements.challengeSelect.addEventListener('change', () => {
    handlers.onSelectChallenge(elements.challengeSelect.value);
  });
  elements.challengeButton.addEventListener('click', handlers.onChallenge);
  elements.resetButton.addEventListener('click', handlers.onReset);

  return {
    /**
     * @param {Challenge} challenge
     * @param {number} remainingPoints
     */
    render(challenge, remainingPoints) {
      elements.challengeSelect.value = challenge.id;
      elements.challenge.textContent =
        `${challenge.name}　HP ${challenge.hp} / 攻撃 ${challenge.attack} / 反撃 ${challenge.counter}` +
        ` / ${challenge.turnLimit}ターン以内${formatResistances(challenge)}`;
      elements.points.textContent = `残り ${remainingPoints} / ${challenge.points} pt`;
    },
  };
}
