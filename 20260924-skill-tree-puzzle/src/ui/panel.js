// @ts-check

import { createEnemyProfile } from '../core/simulate.js';
import { formatAbility, formatAttack, formatReward } from './ability-names.js';
import { ELEMENT_NAMES } from './element-names.js';

/**
 * @typedef {import('../types.js').Challenge} Challenge
 * @typedef {import('../types.js').ElementId} ElementId
 * @typedef {import('../types.js').Enemy} Enemy
 * @typedef {import('../types.js').SequenceProgress} SequenceProgress
 */

const PERCENT = 100;

/**
 * @param {Enemy} enemy
 * @returns {string}
 */
function formatResistances(enemy) {
  const entries = /** @type {[ElementId, number][]} */ (Object.entries(enemy.resistances));
  if (entries.length === 0) {
    return '';
  }
  const parts = entries.map(
    ([element, reduction]) => `${ELEMENT_NAMES[element]} ${Math.round(reduction * PERCENT)}%`,
  );
  return ` / 軽減：${parts.join('・')}`;
}

/**
 * @param {Enemy} enemy
 * @returns {string}
 */
function formatRewardSuffix(enemy) {
  return enemy.reward === undefined || enemy.reward.length === 0
    ? ''
    : ` / 報酬：${enemy.reward.map(formatReward).join('・')}`;
}

/**
 * @param {Enemy} enemy
 * @returns {string}
 */
function formatEnemy(enemy) {
  // 能力のステータス加算・連撃を含めた値を出す。判定と同じ集計を通し、表示と判定がずれないようにする
  const profile = createEnemyProfile(enemy);
  const abilities = enemy.abilities.map(formatAbility).filter((text) => text !== null);
  return (
    `${enemy.name}　HP ${profile.maxHp} / ${formatAttack(profile)} / 防御 ${profile.defense}` +
    (abilities.length === 0 ? '' : ` / ${abilities.join('・')}`) +
    ` / ${enemy.turnLimit}ターン以内${formatResistances(enemy)}` +
    formatRewardSuffix(enemy)
  );
}

/**
 * @param {Challenge} challenge
 * @param {SequenceProgress} progress
 * @returns {string}
 */
function formatSequenceStatus(challenge, progress) {
  const rewards = progress.rewards.length === 0 ? 'なし' : progress.rewards.map(formatReward).join('・');
  return `連戦 ${progress.defeated.length} / ${challenge.enemies.length}体撃破\n獲得した報酬：${rewards}`;
}

/**
 * お題の選択と情報・残り pt・挑戦と全リセットのボタン。連戦のお題では、挑戦の代わりに戦う相手を選ぶボタンを出す。
 * 選んだ・押したときの処理は呼び出し側が持つ
 * @param {{
 *   challengeSelect: HTMLSelectElement,
 *   challenge: HTMLElement,
 *   points: HTMLElement,
 *   challengeButton: HTMLButtonElement,
 *   resetButton: HTMLButtonElement,
 *   sequence: HTMLElement,
 *   sequenceStatus: HTMLElement,
 *   sequenceEnemies: HTMLElement,
 *   sequenceRestartButton: HTMLButtonElement,
 * }} elements
 * @param {readonly Challenge[]} challenges
 * @param {{
 *   onSelectChallenge: (challengeId: string) => void,
 *   onChallenge: () => void,
 *   onReset: () => void,
 *   onFightEnemy: (enemyIndex: number) => void,
 *   onRestartSequence: () => void,
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
  elements.sequenceRestartButton.addEventListener('click', handlers.onRestartSequence);

  return {
    /**
     * @param {Challenge} challenge
     * @param {number} remainingPoints
     * @param {SequenceProgress | null} progress 連戦のお題のときだけ渡す
     * @param {boolean} resetDisabled 全リセットを押せなくするか
     */
    render(challenge, remainingPoints, progress, resetDisabled) {
      elements.challengeSelect.value = challenge.id;
      elements.resetButton.disabled = resetDisabled;
      // 敵ごとに1行。改行は CSS の white-space: pre-line で表示する
      elements.challenge.textContent = challenge.enemies.map(formatEnemy).join('\n');
      elements.points.textContent = `残り ${remainingPoints} / ${challenge.points} pt`;

      elements.challengeButton.hidden = progress !== null;
      elements.sequence.hidden = progress === null;
      if (progress === null) {
        return;
      }
      elements.sequenceStatus.textContent = formatSequenceStatus(challenge, progress);
      elements.sequenceEnemies.replaceChildren(
        ...challenge.enemies.map((enemy, index) => {
          const button = document.createElement('button');
          const defeated = progress.defeated.includes(index);
          button.type = 'button';
          button.className = 'button is-primary';
          button.disabled = defeated;
          button.textContent = defeated ? `${enemy.name}（撃破済み）` : `${enemy.name}と戦う`;
          button.addEventListener('click', () => handlers.onFightEnemy(index));
          return button;
        }),
      );
      elements.sequenceRestartButton.disabled = !progress.started;
    },
  };
}
