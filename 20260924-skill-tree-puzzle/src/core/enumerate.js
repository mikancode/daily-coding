// @ts-check

import { createAdjacency } from './build.js';

/**
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
