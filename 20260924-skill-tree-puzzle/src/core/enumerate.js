// @ts-check
// 配布 pt で組めるビルドをすべて列挙する。お題の解（最少 pt・最速ターン）を総当たりで確かめるため

import { createAdjacency } from './build.js';
import { clearsChallenge, simulateChallenge } from './challenge.js';
import { clearsByResults, totalTurns } from './clear-record.js';

/**
 * @typedef {import('../types.js').Build} Build
 * @typedef {import('../types.js').Challenge} Challenge
 * @typedef {import('../types.js').NodeId} NodeId
 * @typedef {import('../types.js').SkillTree} SkillTree
 */

/**
 * 起点を含み、起点以外のノード数が maxPoints 以下の連結な部分集合を、重複なくすべて列挙する。
 * 取得に使える pt はノード1つにつき1なので、これが配布 pt で到達できるビルドのすべてになる。
 * 件数が数百万になりうるので、配列にためずに1つずつ返す
 * @param {SkillTree} tree
 * @param {number} maxPoints
 * @returns {Generator<NodeId[]>} 起点を先頭に、取得順に並んだノード ID
 */
export function* enumerateBuilds(tree, maxPoints) {
  const adjacency = createAdjacency(tree);
  const origin = tree.originId;
  if (!adjacency.has(origin)) {
    throw new Error(`ツリーに存在しないノードです: ${origin}`);
  }

  /**
   * candidates から1つ選んで足す。選び終えたノードは以降の枝で使わない（seen に入れる）ことで、
   * 同じ集合を別の順番で2回数えないようにする
   * @param {NodeId[]} current
   * @param {NodeId[]} candidates current に隣接し、まだ一度も選ばれていないノード
   * @param {ReadonlySet<NodeId>} seen current と、この枝で既に候補から外したノード
   * @returns {Generator<NodeId[]>}
   */
  function* extend(current, candidates, seen) {
    yield [...current];
    // 起点は配布 pt に含まない
    if (current.length - 1 >= maxPoints) {
      return;
    }
    const excluded = new Set(seen);
    for (let i = 0; i < candidates.length; i++) {
      const picked = candidates[i];
      excluded.add(picked);
      const nextCandidates = candidates.slice(i + 1);
      for (const neighbor of adjacency.get(picked) ?? []) {
        if (!excluded.has(neighbor) && !nextCandidates.includes(neighbor)) {
          nextCandidates.push(neighbor);
        }
      }
      current.push(picked);
      yield* extend(current, nextCandidates, excluded);
      current.pop();
    }
  }

  yield* extend([origin], [...new Set(adjacency.get(origin))], new Set([origin]));
}

/**
 * 配布 pt で組めるビルドを総当たりし、クリアできるビルドの最少 pt を返す。
 * お題のデータに書いた最少 pt が、ツリーやお題の調整で実際とずれていないかを確かめるため
 * @param {SkillTree} tree
 * @param {Challenge} challenge
 * @returns {number | null} どのビルドでもクリアできなければ null。起点だけでクリアできる 0 pt と区別する
 */
export function minimumClearPoints(tree, challenge) {
  /** @type {number | null} */
  let minimum = null;
  for (const ids of enumerateBuilds(tree, challenge.points)) {
    // 起点は配布 pt に含まない
    const points = ids.length - 1;
    if (minimum !== null && points >= minimum) {
      continue;
    }
    if (clearsChallenge(inTreeOrder(tree, ids), challenge)) {
      minimum = points;
    }
  }
  return minimum;
}

/**
 * 配布 pt で組めるビルドを総当たりし、クリアできるビルドでの、敵ごとのターン数の合計の最少を返す。
 * 独立戦では戦う順番が結果に効かないので、合計は順番によらない
 * @param {SkillTree} tree
 * @param {Challenge} challenge 独立戦のお題
 * @returns {number | null} どのビルドでもクリアできなければ null
 */
export function minimumClearTurns(tree, challenge) {
  // 連戦は順番で報酬が変わり、最良の順番が1つに決まってしまうので、最速ターンを持たない
  if (challenge.mode === 'sequence') {
    throw new Error(`連戦のお題は最速ターンを持ちません: ${challenge.id}`);
  }
  /** @type {number | null} */
  let minimum = null;
  for (const ids of enumerateBuilds(tree, challenge.points)) {
    const results = simulateChallenge(inTreeOrder(tree, ids), challenge);
    if (!clearsByResults(results)) {
      continue;
    }
    const turns = totalTurns(results);
    if (minimum === null || turns < minimum) {
      minimum = turns;
    }
  }
  return minimum;
}

/**
 * 列挙は取得順に返す。ローテーションは定義順で回るので、ツリーの定義順に並べ直す
 * @param {SkillTree} tree
 * @param {readonly NodeId[]} ids
 * @returns {Build}
 */
function inTreeOrder(tree, ids) {
  const owned = new Set(ids);
  return tree.nodes.filter((node) => owned.has(node.id));
}
