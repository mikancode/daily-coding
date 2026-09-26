// @ts-check

import { ELEMENT_NAMES } from './element-names.js';

/**
 * @typedef {import('../types.js').Challenge} Challenge
 * @typedef {import('../types.js').Enemy} Enemy
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
 * HP は「現在/最大」で出し、どれだけ削れたか・残ったかを割合でも掴めるようにする
 * @param {LogEntry} entry
 * @param {Enemy} enemy
 * @param {number} playerMaxHp
 * @returns {string}
 */
function formatEntry(entry, enemy, playerMaxHp) {
  switch (entry.type) {
    case 'playerHit':
      return `${entry.turn}T ${ELEMENT_NAMES[entry.element]}で ${entry.damage} ダメージ（ボス残り ${entry.bossHp}/${enemy.hp}）`;
    case 'counter':
      return `${entry.turn}T 反撃で ${entry.damage} ダメージ受けた（残り HP ${entry.playerHp}/${playerMaxHp}）`;
    case 'bossAttack':
      return `${entry.turn}T ボスの攻撃で ${entry.damage} ダメージ受けた（残り HP ${entry.playerHp}/${playerMaxHp}）`;
    case 'turnLimit':
      return `${entry.turn}ターンが過ぎた`;
  }
}

/**
 * @param {SimulationResult} result
 * @param {Enemy} enemy
 * @returns {string}
 */
function formatSummary(result, enemy) {
  const { turns, bossHp, loseReason } = result.summary;
  const outcome = loseReason === null ? '勝利！' : `敗北（${LOSE_REASONS[loseReason]}）`;
  return `${outcome}　ボスの残り HP ${bossHp} / ${enemy.hp}・${turns}ターン経過`;
}

/**
 * @param {readonly SimulationResult[]} results
 * @returns {string}
 */
function formatOverallSummary(results) {
  const lost = results.filter((result) => result.result === 'lose').length;
  return lost === 0
    ? `勝利！　${results.length}体すべてに勝った`
    : `敗北（${results.length}体中 ${lost}体に負けた）`;
}

/**
 * 挑戦の結果を表示する。次の挑戦まで残し、組み直すときの手がかりにする。
 * 敵が2体以上なら、全体の勝敗の下に敵ごとのタブを並べ、選んだ敵の結果とログを出す
 * @param {{
 *   root: HTMLElement,
 *   summary: HTMLElement,
 *   tabs: HTMLElement,
 *   enemySummary: HTMLElement,
 *   entries: HTMLOListElement,
 * }} elements
 */
export function createLogView(elements) {
  /**
   * @param {SimulationResult} result
   * @param {Enemy} enemy
   */
  function renderEntries(result, enemy) {
    elements.entries.replaceChildren(
      ...result.log.map((entry) => {
        const item = document.createElement('li');
        item.textContent = formatEntry(entry, enemy, result.summary.playerMaxHp);
        item.className = `log-entry is-${entry.type}`;
        return item;
      }),
    );
  }

  /**
   * @param {readonly SimulationResult[]} results
   * @param {Challenge} challenge
   * @param {number} index
   * @param {readonly HTMLButtonElement[]} tabs
   */
  function selectEnemy(results, challenge, index, tabs) {
    const result = results[index];
    const enemy = challenge.enemies[index];
    tabs.forEach((tab, tabIndex) => tab.setAttribute('aria-selected', String(tabIndex === index)));
    elements.enemySummary.textContent = formatSummary(result, enemy);
    elements.enemySummary.classList.toggle('is-win', result.result === 'win');
    renderEntries(result, enemy);
  }

  return {
    /**
     * @param {readonly SimulationResult[]} results お題の敵と同じ順
     * @param {Challenge} challenge
     */
    render(results, challenge) {
      const cleared = results.every((result) => result.result === 'win');
      elements.summary.classList.toggle('is-win', cleared);
      const multiple = challenge.enemies.length > 1;
      elements.tabs.hidden = !multiple;
      elements.enemySummary.hidden = !multiple;
      if (multiple) {
        elements.summary.textContent = formatOverallSummary(results);
        const tabs = challenge.enemies.map((enemy, index) => {
          const tab = document.createElement('button');
          tab.type = 'button';
          tab.setAttribute('role', 'tab');
          tab.className = `log-tab${results[index].result === 'win' ? ' is-win' : ''}`;
          tab.textContent = `${enemy.name} ${results[index].result === 'win' ? '勝利' : '敗北'}`;
          tab.addEventListener('click', () => selectEnemy(results, challenge, index, tabs));
          return tab;
        });
        elements.tabs.replaceChildren(...tabs);
        // 組み直す手がかりになるよう、負けた敵があれば最初に負けた敵から見せる
        const firstLost = results.findIndex((result) => result.result === 'lose');
        selectEnemy(results, challenge, firstLost === -1 ? 0 : firstLost, tabs);
      } else {
        elements.summary.textContent = formatSummary(results[0], challenge.enemies[0]);
        elements.tabs.replaceChildren();
        renderEntries(results[0], challenge.enemies[0]);
      }
      elements.root.hidden = false;
      elements.root.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },

    clear() {
      elements.root.hidden = true;
      elements.summary.textContent = '';
      elements.tabs.replaceChildren();
      elements.enemySummary.textContent = '';
      elements.entries.replaceChildren();
    },
  };
}
