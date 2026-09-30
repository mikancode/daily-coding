// @ts-check
// 戦闘ログと結果の表示。敵が複数なら敵ごとのタブで切り替える

import { ELEMENT_NAMES } from './element-names.js';

/**
 * @typedef {import('../types.js').Challenge} Challenge
 * @typedef {import('../types.js').LogEntry} LogEntry
 * @typedef {import('../types.js').LoseReason} LoseReason
 * @typedef {import('../types.js').SimulationResult} SimulationResult
 * @typedef {import('../types.js').SimulationSummary} SimulationSummary
 * @typedef {import('../types.js').TargetChanges} TargetChanges
 */

/** 倍率は小数の誤差（1.6000000000000001 など）を見せないよう、小数第2位までで出す */
const MULTIPLIER_DIGITS = 2;

/** @param {number} multiplier @returns {string} */
const formatMultiplier = (multiplier) => `${Number(multiplier.toFixed(MULTIPLIER_DIGITS))}倍`;

/**
 * 攻撃の行に、掛かった好機の倍率と、受けた側の変わった状態を添える
 * @param {number | undefined} tempo
 * @param {TargetChanges | undefined} changes
 * @returns {string}
 */
function formatAddenda(tempo, changes) {
  const parts = [
    ...(tempo === undefined ? [] : [`好機で${formatMultiplier(tempo)}`]),
    ...(changes?.attack === undefined ? [] : [`逆上で攻撃 ${changes.attack}`]),
    ...(changes?.defense === undefined ? [] : [`破甲で防御 ${changes.defense}`]),
    ...(changes?.marks === undefined ? [] : [`刻印 ${changes.marks}`]),
  ];
  return parts.length === 0 ? '' : ` ／ ${parts.join('・')}`;
}

/** @type {Readonly<Record<LoseReason, string>>} */
const LOSE_REASONS = {
  defeated: 'HP が尽きた',
  turnLimit: 'ターン上限までに倒せなかった',
};

/**
 * HP は「現在/最大」で出し、どれだけ削れたか・残ったかを割合でも掴めるようにする
 * @param {LogEntry} entry
 * @param {SimulationSummary} summary
 * @returns {string}
 */
function formatEntry(entry, { playerMaxHp, bossMaxHp }) {
  const bossHp = (/** @type {number} */ hp) => `ボス残り ${hp}/${bossMaxHp}`;
  const playerHp = (/** @type {number} */ hp) => `残り HP ${hp}/${playerMaxHp}`;
  const byPlayer = entry.type !== 'turnLimit' && entry.actor === 'player';
  switch (entry.type) {
    case 'hit':
      return (
        (byPlayer
          ? `${entry.turn}T ${ELEMENT_NAMES[entry.element]}で ${entry.damage} ダメージ（${bossHp(entry.targetHp)}）`
          : `${entry.turn}T ボスの${ELEMENT_NAMES[entry.element]}攻撃で ${entry.damage} ダメージ受けた（${playerHp(entry.targetHp)}）`) +
        formatAddenda(entry.tempo, entry.changes)
      );
    case 'counter':
      return (
        (byPlayer
          ? `${entry.turn}T 反撃でボスに ${entry.damage} ダメージ（${bossHp(entry.targetHp)}）`
          : `${entry.turn}T 反撃で ${entry.damage} ダメージ受けた（${playerHp(entry.targetHp)}）`) +
        formatAddenda(undefined, entry.changes)
      );
    case 'drain':
      return byPlayer
        ? `${entry.turn}T 吸収で ${entry.amount} 回復（${playerHp(entry.hp)}）`
        : `${entry.turn}T ボスが吸収で ${entry.amount} 回復（${bossHp(entry.hp)}）`;
    case 'charge':
      return byPlayer
        ? `${entry.turn}T 溜めを放った（与ダメージ${formatMultiplier(entry.multiplier)}）`
        : `${entry.turn}T ボスが溜めを放った（与ダメージ${formatMultiplier(entry.multiplier)}）`;
    case 'burst':
      return byPlayer
        ? `${entry.turn}T 刻印 ${entry.marks} を解放（与ダメージ${formatMultiplier(entry.multiplier)}）`
        : `${entry.turn}T ボスが刻印 ${entry.marks} を解放（与ダメージ${formatMultiplier(entry.multiplier)}）`;
    case 'poison':
      return byPlayer
        ? `${entry.turn}T 毒でボスに ${entry.damage} ダメージ（${bossHp(entry.targetHp)}）`
        : `${entry.turn}T ボスの毒で ${entry.damage} ダメージ受けた（${playerHp(entry.targetHp)}）`;
    case 'regen':
      return byPlayer
        ? `${entry.turn}T 再生で ${entry.amount} 回復（${playerHp(entry.hp)}）`
        : `${entry.turn}T ボスが再生で ${entry.amount} 回復（${bossHp(entry.hp)}）`;
    case 'endure':
      return byPlayer
        ? `${entry.turn}T 食いしばりで踏みとどまった（${playerHp(entry.hp)}）`
        : `${entry.turn}T ボスが食いしばりで踏みとどまった（${bossHp(entry.hp)}）`;
    case 'turnLimit':
      return `${entry.turn}ターンが過ぎた`;
  }
}

/**
 * 自分がダメージを受けた行は、与えた行と見分けられるよう目立たせない
 * @param {LogEntry} entry
 * @returns {boolean}
 */
function isDamageTaken(entry) {
  return (entry.type === 'hit' || entry.type === 'counter' || entry.type === 'poison') && entry.actor === 'boss';
}

/**
 * @param {SimulationResult} result
 * @returns {string}
 */
function formatSummary(result) {
  const { turns, bossHp, bossMaxHp, loseReason } = result.summary;
  const outcome = loseReason === null ? '勝利！' : `敗北（${LOSE_REASONS[loseReason]}）`;
  return `${outcome}　ボスの残り HP ${bossHp} / ${bossMaxHp}・${turns}ターン経過`;
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
  /** @param {SimulationResult} result */
  function renderEntries(result) {
    elements.entries.replaceChildren(
      ...result.log.map((entry) => {
        const item = document.createElement('li');
        item.textContent = formatEntry(entry, result.summary);
        item.className = `log-entry is-${entry.type}${isDamageTaken(entry) ? ' is-taken' : ''}`;
        return item;
      }),
    );
  }

  /**
   * @param {readonly SimulationResult[]} results
   * @param {number} index
   * @param {readonly HTMLButtonElement[]} tabs
   */
  function selectEnemy(results, index, tabs) {
    const result = results[index];
    tabs.forEach((tab, tabIndex) => tab.setAttribute('aria-selected', String(tabIndex === index)));
    elements.enemySummary.textContent = formatSummary(result);
    elements.enemySummary.classList.toggle('is-win', result.result === 'win');
    renderEntries(result);
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
          tab.addEventListener('click', () => selectEnemy(results, index, tabs));
          return tab;
        });
        elements.tabs.replaceChildren(...tabs);
        // 組み直す手がかりになるよう、負けた敵があれば最初に負けた敵から見せる
        const firstLost = results.findIndex((result) => result.result === 'lose');
        selectEnemy(results, firstLost === -1 ? 0 : firstLost, tabs);
      } else {
        elements.summary.textContent = formatSummary(results[0]);
        elements.tabs.replaceChildren();
        renderEntries(results[0]);
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
