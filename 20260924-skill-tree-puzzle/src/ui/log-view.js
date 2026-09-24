// @ts-check

import { ELEMENT_NAMES } from './element-names.js';

/**
 * @typedef {import('../types.js').Challenge} Challenge
 * @typedef {import('../types.js').LogEntry} LogEntry
 * @typedef {import('../types.js').LoseReason} LoseReason
 * @typedef {import('../types.js').SimulationResult} SimulationResult
 */

/** @type {Readonly<Record<LoseReason, string>>} */
const LOSE_REASONS = {
  defeated: 'HP が尽きた',
  turnLimit: 'ターン上限までに倒せなかった',
};

/**
 * @param {LogEntry} entry
 * @returns {string}
 */
function formatEntry(entry) {
  switch (entry.type) {
    case 'playerHit':
      return `${entry.turn}T ${ELEMENT_NAMES[entry.element]}で ${entry.damage} ダメージ（ボス残り ${entry.bossHp}）`;
    case 'counter':
      return `${entry.turn}T 反撃で ${entry.damage} ダメージ受けた（残り HP ${entry.playerHp}）`;
    case 'bossAttack':
      return `${entry.turn}T ボスの攻撃で ${entry.damage} ダメージ受けた（残り HP ${entry.playerHp}）`;
    case 'turnLimit':
      return `${entry.turn}ターンが過ぎた`;
  }
}

/**
 * @param {SimulationResult} result
 * @param {Challenge} challenge
 * @returns {string}
 */
function formatSummary(result, challenge) {
  const { turns, bossHp, loseReason } = result.summary;
  const outcome = loseReason === null ? '勝利！' : `敗北（${LOSE_REASONS[loseReason]}）`;
  return `${outcome}　ボスの残り HP ${bossHp} / ${challenge.hp}・${turns}ターン経過`;
}

/**
 * 挑戦の結果を表示する。次の挑戦まで残し、組み直すときの手がかりにする
 * @param {{ root: HTMLElement, summary: HTMLElement, entries: HTMLOListElement }} elements
 */
export function createLogView(elements) {
  return {
    /**
     * @param {SimulationResult} result
     * @param {Challenge} challenge
     */
    render(result, challenge) {
      elements.summary.textContent = formatSummary(result, challenge);
      elements.summary.classList.toggle('is-win', result.result === 'win');
      elements.entries.replaceChildren(
        ...result.log.map((entry) => {
          const item = document.createElement('li');
          item.textContent = formatEntry(entry);
          item.className = `log-entry is-${entry.type}`;
          return item;
        }),
      );
      elements.root.hidden = false;
      elements.root.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },

    clear() {
      elements.root.hidden = true;
      elements.summary.textContent = '';
      elements.entries.replaceChildren();
    },
  };
}
