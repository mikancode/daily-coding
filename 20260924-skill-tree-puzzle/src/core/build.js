// @ts-check

/**
 * @typedef {import('../types.js').NodeId} NodeId
 * @typedef {import('../types.js').SkillTree} SkillTree
 */

/**
 * @param {SkillTree} tree
 * @returns {Map<NodeId, NodeId[]>}
 */
export function createAdjacency(tree) {
  /** @type {Map<NodeId, NodeId[]>} */
  const adjacency = new Map(tree.nodes.map((node) => [node.id, []]));
  for (const [a, b] of tree.edges) {
    adjacency.get(a)?.push(b);
    adjacency.get(b)?.push(a);
  }
  return adjacency;
}

/**
 * 「取れない（false）」と「そのノードが無い（呼び出し側のバグ）」を区別するため、未知の ID は例外にする
 * @param {SkillTree} tree
 * @param {NodeId} nodeId
 */
function assertNodeExists(tree, nodeId) {
  if (!tree.nodes.some((node) => node.id === nodeId)) {
    throw new Error(`ツリーに存在しないノードです: ${nodeId}`);
  }
}

/**
 * 起点から、owned に含まれるノードだけを通ってたどれるノードを返す
 * @param {SkillTree} tree
 * @param {ReadonlySet<NodeId>} owned
 * @returns {Set<NodeId>}
 */
export function collectConnected(tree, owned) {
  /** @type {Set<NodeId>} */
  const connected = new Set();
  if (!owned.has(tree.originId)) {
    return connected;
  }
  const adjacency = createAdjacency(tree);
  const queue = [tree.originId];
  connected.add(tree.originId);
  while (queue.length > 0) {
    const current = /** @type {NodeId} */ (queue.shift());
    for (const next of adjacency.get(current) ?? []) {
      if (owned.has(next) && !connected.has(next)) {
        connected.add(next);
        queue.push(next);
      }
    }
  }
  return connected;
}

/**
 * 未取得で、取得済みノードに隣接していれば取れる。ポイント残量はお題ごとに違うので、ここでは見ない
 * @param {SkillTree} tree
 * @param {ReadonlySet<NodeId>} owned
 * @param {NodeId} nodeId
 * @returns {boolean}
 */
export function canAcquire(tree, owned, nodeId) {
  assertNodeExists(tree, nodeId);
  if (owned.has(nodeId)) {
    return false;
  }
  const neighbors = createAdjacency(tree).get(nodeId) ?? [];
  return neighbors.some((neighbor) => owned.has(neighbor));
}

/**
 * 取得済みで起点ではなく、外しても残りがすべて起点から連結なら外せる
 * @param {SkillTree} tree
 * @param {ReadonlySet<NodeId>} owned
 * @param {NodeId} nodeId
 * @returns {boolean}
 */
export function canRelease(tree, owned, nodeId) {
  assertNodeExists(tree, nodeId);
  if (!owned.has(nodeId) || nodeId === tree.originId) {
    return false;
  }
  const remaining = new Set(owned);
  remaining.delete(nodeId);
  return collectConnected(tree, remaining).size === remaining.size;
}
