// @ts-check

import { canAcquire, canRelease } from './core/build.js';
import { simulate } from './core/simulate.js';
import { CHALLENGES } from './data/challenges.js';
import { TREE } from './data/tree.js';
import { createLogView } from './ui/log-view.js';
import { createPanel } from './ui/panel.js';
import { createTreeView } from './ui/tree-view.js';

/**
 * @typedef {import('./types.js').NodeId} NodeId
 */

/** お題の選択は後続の Issue で作る。それまでは最初の1体で遊ぶ */
const challenge = CHALLENGES[0];

/**
 * 「要素が見つからない」を例外にする。null のまま進むと、何も表示されないだけで原因に気づけないため
 * @template {Element} T
 * @param {string} selector
 * @param {new () => T} type
 * @returns {T}
 */
function requireElement(selector, type) {
  const element = document.querySelector(selector);
  if (!(element instanceof type)) {
    throw new Error(`要素が見つかりません: ${selector}`);
  }
  return element;
}

const messageElement = requireElement('#message', HTMLElement);

/** @type {Set<NodeId>} */
const owned = new Set([TREE.originId]);

/** 1ノード1pt。起点は最初から持っているので数えない */
function remainingPoints() {
  return challenge.points - (owned.size - 1);
}

/**
 * タップしても見た目が変わらないときに、無反応に見えないよう理由を出す
 * @param {NodeId} nodeId
 * @returns {string | null} 取得・解除できたら null
 */
function toggleNode(nodeId) {
  if (owned.has(nodeId)) {
    if (nodeId === TREE.originId) {
      return '起点は外せません';
    }
    if (!canRelease(TREE, owned, nodeId)) {
      return '外すと起点から繋がらなくなるノードがあります';
    }
    owned.delete(nodeId);
    return null;
  }
  if (!canAcquire(TREE, owned, nodeId)) {
    return '取得済みのノードに隣接していません';
  }
  if (remainingPoints() <= 0) {
    return 'ポイントが足りません';
  }
  owned.add(nodeId);
  return null;
}

const logView = createLogView({
  root: requireElement('#log', HTMLElement),
  summary: requireElement('#log-summary', HTMLElement),
  entries: requireElement('#log-entries', HTMLOListElement),
});

const panel = createPanel(
  {
    challenge: requireElement('#challenge', HTMLElement),
    points: requireElement('#remaining-points', HTMLElement),
    challengeButton: requireElement('#challenge-button', HTMLButtonElement),
    resetButton: requireElement('#reset-button', HTMLButtonElement),
  },
  {
    onChallenge() {
      const build = TREE.nodes.filter((node) => owned.has(node.id));
      logView.render(simulate(build, challenge), challenge);
    },
    onReset() {
      owned.clear();
      owned.add(TREE.originId);
      messageElement.textContent = '';
      logView.clear();
      render();
    },
  },
);

const treeView = createTreeView(requireElement('#tree', SVGSVGElement), TREE, (nodeId) => {
  messageElement.textContent = toggleNode(nodeId) ?? '';
  render();
});

function render() {
  const points = remainingPoints();
  const acquirable = new Set(
    points > 0 ? TREE.nodes.map((node) => node.id).filter((id) => canAcquire(TREE, owned, id)) : [],
  );
  const releasable = new Set([...owned].filter((id) => canRelease(TREE, owned, id)));
  treeView.render(owned, acquirable, releasable);
  panel.render(challenge, points);
}

render();
