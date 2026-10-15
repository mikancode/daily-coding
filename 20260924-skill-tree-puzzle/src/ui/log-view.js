// @ts-check
// 戦闘ログと結果の表示。敵が複数なら敵ごとのタブで切り替える

import { ENDURE_HP } from '../core/ability-table.js';
import { formatBadgeLabel } from './ability-names.js';
import { ELEMENT_NAMES } from './element-names.js';

/**
 * @typedef {import('../types.js').Challenge} Challenge
 * @typedef {import('../types.js').LogEntry} LogEntry
 * @typedef {import('../types.js').LoseReason} LoseReason
 * @typedef {import('../types.js').SimulationResult} SimulationResult
 * @typedef {import('../types.js').SimulationSummary} SimulationSummary
 * @typedef {import('../types.js').TargetChanges} TargetChanges
 * @typedef {import('../types.js').StatBreakdown} StatBreakdown
 */

/** 倍率は小数の誤差（1.6000000000000001 など）を見せないよう、小数第2位までで出す */
const MULTIPLIER_DIGITS = 2;

/** @param {number} multiplier @returns {string} */
const formatMultiplier = (multiplier) => `${Number(multiplier.toFixed(MULTIPLIER_DIGITS))}倍`;

/**
 * 合計のあとに、ベースの値と増減の内訳を添える。例：`11(10+3-2)`。増減が無ければ合計だけ
 * @param {StatBreakdown} stat
 * @returns {string}
 */
function formatBreakdown({ value, base, up, down }) {
  const parts = [`${base}`, ...(up > 0 ? [`+${up}`] : []), ...(down > 0 ? [`-${down}`] : [])];
  return parts.length === 1 ? `${value}` : `${value}(${parts.join('')})`;
}

/** @param {number} before @param {number} after @returns {string} */
const formatMarkChange = (before, after) => `${before}→${after}`;

/**
 * 行の本文のあとに、`|` で区切って添える。添えるものが無ければ空
 * @param {readonly string[]} parts
 * @returns {string}
 */
const formatDetail = (parts) => (parts.length === 0 ? '' : ` | ${parts.join(', ')}`);

/**
 * 攻撃の行に、有効だった好機の倍率と、受けた側の変わった状態を添える
 * @param {number | undefined} tempo
 * @param {TargetChanges | undefined} changes
 * @returns {string}
 */
function formatAddenda(tempo, changes) {
  return formatDetail([
    ...(tempo === undefined ? [] : [`好機で${formatMultiplier(tempo)}`]),
    ...(changes?.attack === undefined ? [] : [`ATK${formatBreakdown(changes.attack)}`]),
    ...(changes?.defense === undefined ? [] : [`DEF${formatBreakdown(changes.defense)}`]),
    ...(changes?.marks === undefined ? [] : [`刻印${formatMarkChange(changes.marks.before, changes.marks.after)}`]),
  ]);
}

/** @type {Readonly<Record<'start' | 'renew' | 'end', string>>} */
const TIMED_STATES = { start: '有効になった', renew: '再発動した', end: '切れた' };

/** @type {Readonly<Record<LoseReason, string>>} */
const LOSE_REASONS = {
  defeated: 'HPが尽きた',
  turnLimit: 'ターン上限までに倒せなかった',
};

/**
 * HP は「前→後/最大」で出し、どれだけ削れたか・残ったかを割合でも掴めるようにする。
 * 1行の幅を抑えるため、かっこ・区切りは半角にし、数値の前後に空白を入れない
 * @param {LogEntry} entry
 * @param {SimulationSummary} summary
 * @returns {string}
 */
function formatEntry(entry, { playerMaxHp, bossMaxHp }) {
  /** 変化の前後と最大を、敵と味方で同じ形で出す。例：`HP43→33/160` */
  const hpChange = (/** @type {number} */ before, /** @type {number} */ after, /** @type {number} */ max) =>
    `HP${before}→${after}/${max}`;
  const bossHp = (/** @type {number} */ before, /** @type {number} */ after) => hpChange(before, after, bossMaxHp);
  const playerHp = (/** @type {number} */ before, /** @type {number} */ after) => hpChange(before, after, playerMaxHp);
  const byPlayer = entry.type !== 'turnLimit' && entry.actor === 'player';
  switch (entry.type) {
    case 'hit':
      return (
        (byPlayer
          ? `${entry.turn}T ${ELEMENT_NAMES[entry.element]}で${entry.damage}ダメージ(${bossHp(entry.targetHpBefore, entry.targetHp)})`
          : `${entry.turn}T ボスの${ELEMENT_NAMES[entry.element]}攻撃で${entry.damage}ダメージ受けた(${playerHp(entry.targetHpBefore, entry.targetHp)})`) +
        formatAddenda(entry.tempo, entry.changes)
      );
    case 'counter':
      return (
        (byPlayer
          ? `${entry.turn}T 反撃でボスに${entry.damage}ダメージ(${bossHp(entry.targetHpBefore, entry.targetHp)})`
          : `${entry.turn}T 反撃で${entry.damage}ダメージ受けた(${playerHp(entry.targetHpBefore, entry.targetHp)})`) +
        formatAddenda(undefined, entry.changes)
      );
    case 'drain':
      return byPlayer
        ? `${entry.turn}T 吸収で${entry.amount}回復(${playerHp(entry.hp - entry.amount, entry.hp)})`
        : `${entry.turn}T ボスが吸収で${entry.amount}回復(${bossHp(entry.hp - entry.amount, entry.hp)})`;
    case 'charge':
      return byPlayer
        ? `${entry.turn}T 溜めを放った(与ダメージ${formatMultiplier(entry.multiplier)})`
        : `${entry.turn}T ボスが溜めを放った(与ダメージ${formatMultiplier(entry.multiplier)})`;
    case 'burst': {
      const detail = `${formatMarkChange(entry.marks + entry.remaining, entry.remaining)}, 与ダメージ${formatMultiplier(entry.multiplier)}`;
      return byPlayer ? `${entry.turn}T 刻印を解放(${detail})` : `${entry.turn}T ボスが刻印を解放(${detail})`;
    }
    case 'poison': {
      // 呪陣が乗ったら、毒のぶんと呪陣のぶんを分けて添える
      const detail =
        entry.markDamage === undefined || entry.marks === undefined
          ? ''
          : formatDetail([`${entry.damage - entry.markDamage}+呪陣${entry.markDamage}(刻印${entry.marks})`]);
      return byPlayer
        ? `${entry.turn}T 毒でボスに${entry.damage}ダメージ(${bossHp(entry.targetHpBefore, entry.targetHp)})${detail}`
        : `${entry.turn}T ボスの毒で${entry.damage}ダメージ受けた(${playerHp(entry.targetHpBefore, entry.targetHp)})${detail}`;
    }
    case 'regen':
      return byPlayer
        ? `${entry.turn}T 再生で${entry.amount}回復(${playerHp(entry.hp - entry.amount, entry.hp)})`
        : `${entry.turn}T ボスが再生で${entry.amount}回復(${bossHp(entry.hp - entry.amount, entry.hp)})`;
    case 'endure': {
      // 戻したあとの HP で呼び分ける。最大 HP の頭打ちで1に戻った復活も、働きは根性と同じなので根性と出す
      const name = entry.hp === ENDURE_HP ? '根性' : '復活';
      return byPlayer
        ? `${entry.turn}T ${name}が発動した(${playerHp(0, entry.hp)})`
        : `${entry.turn}T ボスの${name}が発動した(${bossHp(0, entry.hp)})`;
    }
    case 'timed':
      return byPlayer
        ? `${entry.turn}T ${formatBadgeLabel(entry.effect)}が${TIMED_STATES[entry.state]}`
        : `${entry.turn}T ボスの${formatBadgeLabel(entry.effect)}が${TIMED_STATES[entry.state]}`;
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
  const outcome = loseReason === null ? '勝利!' : `敗北(${LOSE_REASONS[loseReason]})`;
  return `${outcome} ボスHP${bossHp}/${bossMaxHp}, ${turns}ターン経過`;
}

/**
 * @param {readonly SimulationResult[]} results
 * @returns {string}
 */
function formatOverallSummary(results) {
  const lost = results.filter((result) => result.result === 'lose').length;
  return lost === 0
    ? `勝利! ${results.length}体すべてに勝った`
    : `敗北(${results.length}体中${lost}体に負けた)`;
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
