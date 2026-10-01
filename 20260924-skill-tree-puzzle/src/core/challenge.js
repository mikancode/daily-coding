// @ts-check
// お題単位の判定。敵ごとの独立戦・報酬を持ち越す連戦・戦う順番の総当たりから、お題をクリアできるかを決める

import { simulate } from './simulate.js';

/**
 * @typedef {import('../types.js').Build} Build
 * @typedef {import('../types.js').Challenge} Challenge
 * @typedef {import('../types.js').Effect} Effect
 * @typedef {import('../types.js').SimulationResult} SimulationResult
 */

/**
 * お題の敵それぞれと戦った結果を、敵の順に全員分返す。結果の画面で敵ごとの勝敗を並べるため
 * @param {Build} build
 * @param {Challenge} challenge
 * @returns {SimulationResult[]}
 */
export function simulateChallenge(build, challenge) {
  return challenge.enemies.map((enemy) => simulate(build, enemy));
}

/**
 * 敵を order の順に1体ずつ倒し、勝つたびにその敵の報酬を足して次の敵と戦う。
 * 負けた戦闘で打ち切るので、返す結果は order より短くなることがある
 * @param {Build} build
 * @param {Challenge} challenge
 * @param {readonly number[]} order 戦う敵の challenge.enemies での位置
 * @returns {SimulationResult[]}
 */
export function simulateSequence(build, challenge, order) {
  /** @type {Effect[]} */
  const rewards = [];
  /** @type {SimulationResult[]} */
  const results = [];
  for (const index of order) {
    const enemy = challenge.enemies[index];
    const result = simulate(build, enemy, rewards);
    results.push(result);
    if (result.result === 'lose') {
      break;
    }
    rewards.push(...(enemy.reward ?? []));
  }
  return results;
}

/**
 * @template T
 * @param {readonly T[]} items
 * @returns {T[][]}
 */
function permutations(items) {
  if (items.length <= 1) {
    return [[...items]];
  }
  return items.flatMap((item, index) =>
    permutations([...items.slice(0, index), ...items.slice(index + 1)]).map((rest) => [item, ...rest]),
  );
}

/**
 * @param {Challenge} challenge
 * @returns {number[][]}
 */
function enemyOrders(challenge) {
  return permutations(challenge.enemies.map((_, index) => index));
}

/**
 * 全員に勝てる戦う順番（敵の位置の並び）をすべて返す。独立のお題では順番に意味が無いので使わない
 * @param {Build} build
 * @param {Challenge} challenge
 * @returns {number[][]}
 */
export function winningOrders(build, challenge) {
  return enemyOrders(challenge).filter((order) => wonAll(build, challenge, order));
}

/**
 * @param {Build} build
 * @param {Challenge} challenge
 * @param {readonly number[]} order
 * @returns {boolean}
 */
function wonAll(build, challenge, order) {
  const results = simulateSequence(build, challenge, order);
  return results.length === order.length && results.every((result) => result.result === 'win');
}

/**
 * 独立のお題は、すべての敵に勝てばクリア。総当たりで何度も呼ぶので、1体に負けた時点で残りの敵は判定しない。
 * 連戦のお題は、全員に勝てる順番が1つでもあればクリア
 * @param {Build} build
 * @param {Challenge} challenge
 * @returns {boolean}
 */
export function clearsChallenge(build, challenge) {
  if (challenge.mode === 'sequence') {
    return enemyOrders(challenge).some((order) => wonAll(build, challenge, order));
  }
  return challenge.enemies.every((enemy) => simulate(build, enemy).result === 'win');
}
