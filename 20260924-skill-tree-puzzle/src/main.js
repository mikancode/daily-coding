// @ts-check

import { canAcquire, canRelease } from './core/build.js';
import { restoreBuild, serializeBuild } from './core/saved-build.js';
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

/**
 * Pages のオリジンは daily-coding の全プロダクトで共有するので、プロダクト名を前置する。
 * お題を増やしたときに混ざらないよう、お題ごとに分ける
 */
const STORAGE_KEY = `skill-tree-puzzle:build:${challenge.id}`;
const STORAGE_UNAVAILABLE_MESSAGE = 'ビルドを保存できない環境です';
const INVALID_SAVED_BUILD_MESSAGE = '保存したビルドが今のツリーでは組めないため、最初からにしました';

/** @type {Set<NodeId>} */
const owned = new Set([TREE.originId]);

/**
 * プライベートブラウズや容量超過では localStorage が例外を投げる。保存できなくても遊べるようにする
 * @returns {boolean} 保存できたら true
 */
function saveBuild() {
  try {
    localStorage.setItem(STORAGE_KEY, serializeBuild(TREE, owned));
    return true;
  } catch {
    return false;
  }
}

/**
 * @returns {string | null} 知らせることがあればその文言
 */
function loadBuild() {
  /** @type {string | null} */
  let raw;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return STORAGE_UNAVAILABLE_MESSAGE;
  }
  const restored = restoreBuild(TREE, challenge.points, raw);
  switch (restored.status) {
    case 'none':
      return null;
    case 'restored':
      owned.clear();
      restored.owned.forEach((id) => owned.add(id));
      return null;
    case 'invalid':
      // 起点だけの状態で上書きし、次に開いたときに同じ知らせを出さない
      return saveBuild() ? INVALID_SAVED_BUILD_MESSAGE : STORAGE_UNAVAILABLE_MESSAGE;
  }
}

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
      messageElement.textContent = saveBuild() ? '' : STORAGE_UNAVAILABLE_MESSAGE;
      logView.clear();
      render();
    },
  },
);

const treeView = createTreeView(requireElement('#tree', SVGSVGElement), TREE, (nodeId) => {
  const reason = toggleNode(nodeId);
  if (reason !== null) {
    messageElement.textContent = reason;
  } else {
    messageElement.textContent = saveBuild() ? '' : STORAGE_UNAVAILABLE_MESSAGE;
  }
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

messageElement.textContent = loadBuild() ?? '';
render();
