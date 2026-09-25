// @ts-check

import { collectConnected } from './build.js';

/**
 * @typedef {import('../types.js').NodeId} NodeId
 * @typedef {import('../types.js').RestoredBuild} RestoredBuild
 * @typedef {import('../types.js').SkillTree} SkillTree
 */

/**
 * 起点は常に持っているので保存しない。並びを tree.nodes の順にそろえ、取った順番に依らない値にする
 * @param {SkillTree} tree
 * @param {ReadonlySet<NodeId>} owned
 * @returns {string}
 */
export function serializeBuild(tree, owned) {
  const ids = tree.nodes.map((node) => node.id).filter((id) => id !== tree.originId && owned.has(id));
  return JSON.stringify(ids);
}

/**
 * 保存したビルドを、今のツリーと配布 pt で組めるときだけ復元する。
 * ツリーの調整でノードや辺が変わると組めなくなるので、一部だけ残すことはせず、丸ごと invalid にする
 * @param {SkillTree} tree
 * @param {number} points
 * @param {string | null} raw localStorage から読んだ値。保存が無ければ null
 * @returns {RestoredBuild}
 */
export function restoreBuild(tree, points, raw) {
  if (raw === null) {
    return { status: 'none' };
  }
  /** @type {unknown} */
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { status: 'invalid' };
  }
  if (!Array.isArray(parsed) || !parsed.every((id) => typeof id === 'string')) {
    return { status: 'invalid' };
  }
  const nodeIds = new Set(tree.nodes.map((node) => node.id));
  const ids = /** @type {NodeId[]} */ (parsed);
  const hasUnknownOrOrigin = ids.some((id) => !nodeIds.has(id) || id === tree.originId);
  const hasDuplicate = new Set(ids).size !== ids.length;
  if (hasUnknownOrOrigin || hasDuplicate || ids.length > points) {
    return { status: 'invalid' };
  }
  const owned = new Set([tree.originId, ...ids]);
  if (collectConnected(tree, owned).size !== owned.size) {
    return { status: 'invalid' };
  }
  return { status: 'restored', owned };
}
