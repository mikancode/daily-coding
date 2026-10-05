// @ts-check
// キャラとお題の選択・お題の記録（自己ベスト・最少 pt・★）・お題の情報とボスの能力のバッジ・残り pt・挑戦とリセットのボタン、連戦の相手選び

import { earnedStar } from '../core/clear-record.js';
import { createEnemyProfile } from '../core/profile.js';
import { formatAttack, formatReward, profileEffects, toBadge } from './ability-names.js';
import { ELEMENT_NAMES } from './element-names.js';

/**
 * @typedef {import('../types.js').Challenge} Challenge
 * @typedef {import('../types.js').ChallengeRecords} ChallengeRecords
 * @typedef {import('../types.js').Character} Character
 * @typedef {import('../types.js').CombatantProfile} CombatantProfile
 * @typedef {import('../types.js').ElementId} ElementId
 * @typedef {import('../types.js').Enemy} Enemy
 * @typedef {import('../types.js').SequenceProgress} SequenceProgress
 * @typedef {ReturnType<typeof import('./description-popover.js').createDescriptionPopover>} DescriptionPopover
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
 * 1行目に出す、ボスの基本ステータスとお題の条件。能力は2行目のバッジに出す
 * @param {Enemy} enemy
 * @param {CombatantProfile} profile
 * @returns {string}
 */
function formatEnemy(enemy, profile) {
  return (
    `${enemy.name}　HP ${profile.maxHp} / ${formatAttack(profile)} / 防御 ${profile.defense}` +
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
 * 残り pt と同じ行に収まるよう、BEST（自己ベスト）・MIN（最少 pt）と短く書く。
 * 自己ベストが無いお題は、開示した後も最少 pt だけを出す（開発用のお題は、開示の条件に入らないため未クリアのことがある）
 * @param {Challenge} challenge
 * @param {ChallengeRecords} records
 * @returns {string}
 */
function formatRecord(challenge, records) {
  const best = records.bests.get(challenge.id) ?? null;
  const minimum = records.revealed ? `MIN ${challenge.minimumPoints}pt` : 'MIN ?pt (全クリアで表示)';
  if (best === null) {
    return minimum;
  }
  const star = earnedStar(challenge, best, records.revealed) ? '★ ' : '';
  return `${star}BEST ${best}pt / ${minimum}`;
}

/**
 * 選択肢では、名前の頭をそろえて読みやすくするため、印を名前の後ろに付ける
 * @param {Challenge} challenge
 * @param {ChallengeRecords} records
 * @returns {string}
 */
function formatChallengeOption(challenge, records) {
  const best = records.bests.get(challenge.id) ?? null;
  if (best === null) {
    return challenge.name;
  }
  return `${challenge.name} ${earnedStar(challenge, best, records.revealed) ? '★' : '✓'}`;
}

/**
 * キャラとお題の選択・お題の情報・残り pt・挑戦と全リセットのボタン。連戦のお題では、挑戦の代わりに戦う相手を選ぶボタンを出す。
 * 選んだ・押したときの処理は呼び出し側が持つ
 * @param {{
 *   characterSelect: HTMLSelectElement,
 *   challengeSelect: HTMLSelectElement,
 *   challengeRecord: HTMLElement,
 *   challenge: HTMLElement,
 *   points: HTMLElement,
 *   challengeButton: HTMLButtonElement,
 *   resetButton: HTMLButtonElement,
 *   sequence: HTMLElement,
 *   sequenceStatus: HTMLElement,
 *   sequenceEnemies: HTMLElement,
 *   sequenceRestartButton: HTMLButtonElement,
 * }} elements
 * @param {readonly Character[]} characters
 * @param {readonly Challenge[]} challenges 最初に選ばれているキャラのお題。キャラを切り替えたら setChallenges で差し替える
 * @param {DescriptionPopover} popover
 * @param {{
 *   onSelectCharacter: (characterId: string) => void,
 *   onSelectChallenge: (challengeId: string) => void,
 *   onChallenge: () => void,
 *   onReset: () => void,
 *   onFightEnemy: (enemyIndex: number) => void,
 *   onRestartSequence: () => void,
 * }} handlers
 */
export function createPanel(elements, characters, challenges, popover, handlers) {
  elements.characterSelect.replaceChildren(
    ...characters.map((character) => new Option(character.name, character.id)),
  );
  // 選ぶ余地が無いときは出さない。キャラを足せば出る
  elements.characterSelect.hidden = characters.length <= 1;
  elements.characterSelect.addEventListener('change', () => {
    handlers.onSelectCharacter(elements.characterSelect.value);
  });
  /** @param {readonly Challenge[]} options */
  function setChallenges(options) {
    elements.challengeSelect.replaceChildren(
      ...options.map((challenge) => new Option(challenge.name, challenge.id)),
    );
  }
  setChallenges(challenges);
  elements.challengeSelect.addEventListener('change', () => {
    handlers.onSelectChallenge(elements.challengeSelect.value);
  });
  elements.challengeButton.addEventListener('click', handlers.onChallenge);
  elements.resetButton.addEventListener('click', handlers.onReset);
  elements.sequenceRestartButton.addEventListener('click', handlers.onRestartSequence);

  return {
    setChallenges,
    /**
     * @param {Character} character
     * @param {Challenge} challenge
     * @param {ChallengeRecords} records キャラのお題の記録
     * @param {number} remainingPoints
     * @param {SequenceProgress | null} progress 連戦のお題のときだけ渡す
     * @param {boolean} resetDisabled 全リセットを押せなくするか
     */
    render(character, challenge, records, remainingPoints, progress, resetDisabled) {
      elements.characterSelect.value = character.id;
      // 選択肢は setChallenges で character.challenges から作っているので、並びが一致する
      character.challenges.forEach((candidate, index) => {
        elements.challengeSelect.options[index].textContent = formatChallengeOption(candidate, records);
      });
      elements.challengeSelect.value = challenge.id;
      elements.challengeRecord.textContent = formatRecord(challenge, records);
      elements.resetButton.disabled = resetDisabled;
      elements.challenge.replaceChildren(
        ...challenge.enemies.map((enemy) => {
          // 能力のステータス加算・連撃を含めた値を出す。判定と同じ集計を通し、表示と判定がずれないようにする
          const profile = createEnemyProfile(enemy);
          const stats = document.createElement('p');
          stats.className = 'enemy-stats';
          stats.textContent = formatEnemy(enemy, profile);
          const badges = document.createElement('div');
          badges.className = 'badges';
          popover.renderBadges(badges, profileEffects(profile).map(toBadge));
          const block = document.createElement('div');
          block.append(stats, badges);
          return block;
        }),
      );
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
