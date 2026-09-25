// @ts-check

import { canAcquire, canRelease } from './core/build.js';
import { restoreBuild, serializeBuild } from './core/saved-build.js';
import { createProfile, simulateChallenge } from './core/simulate.js';
import { CHALLENGES } from './data/challenges.js';
import { TREE } from './data/tree.js';
import { createBuildStatsView } from './ui/build-stats.js';
import { createLogView } from './ui/log-view.js';
import { createPanel } from './ui/panel.js';
import { createTreeView } from './ui/tree-view.js';

/**
 * @typedef {import('./types.js').Challenge} Challenge
 * @typedef {import('./types.js').NodeId} NodeId
 */

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

/** Pages のオリジンは daily-coding の全プロダクトで共有するので、保存キーにはプロダクト名を前置する */
const SELECTED_CHALLENGE_KEY = 'skill-tree-puzzle:challenge';
const STORAGE_UNAVAILABLE_MESSAGE = 'ビルドを保存できない環境です';
const INVALID_SAVED_BUILD_MESSAGE = '保存したビルドが今のツリーでは組めないため、最初からにしました';

/**
 * ビルドはお題ごとに組み直すので、保存もお題ごとに分ける
 * @param {Challenge} target
 */
function buildStorageKey(target) {
  return `skill-tree-puzzle:build:${target.id}`;
}

/**
 * 保存が無い、読めない、または今は無いお題の ID なら、最初のお題から始める
 * @returns {Challenge}
 */
function loadSelectedChallenge() {
  /** @type {string | null} */
  let savedId;
  try {
    savedId = localStorage.getItem(SELECTED_CHALLENGE_KEY);
  } catch {
    return CHALLENGES[0];
  }
  return CHALLENGES.find((candidate) => candidate.id === savedId) ?? CHALLENGES[0];
}

/**
 * プライベートブラウズや容量超過では localStorage が例外を投げる。保存できなくても遊べるようにする
 * @returns {boolean} 保存できたら true
 */
function saveSelectedChallenge() {
  try {
    localStorage.setItem(SELECTED_CHALLENGE_KEY, challenge.id);
    return true;
  } catch {
    return false;
  }
}

let challenge = loadSelectedChallenge();

/** @type {Set<NodeId>} */
const owned = new Set([TREE.originId]);

function resetBuild() {
  owned.clear();
  owned.add(TREE.originId);
}

/**
 * @returns {boolean} 保存できたら true
 */
function saveBuild() {
  try {
    localStorage.setItem(buildStorageKey(challenge), serializeBuild(TREE, owned));
    return true;
  } catch {
    return false;
  }
}

/**
 * 保存が無い・組めないときは起点だけから始める。お題を切り替えたときに、前のお題のビルドを持ち越さないため
 * @returns {string | null} 知らせることがあればその文言
 */
function loadBuild() {
  resetBuild();
  /** @type {string | null} */
  let raw;
  try {
    raw = localStorage.getItem(buildStorageKey(challenge));
  } catch {
    return STORAGE_UNAVAILABLE_MESSAGE;
  }
  const restored = restoreBuild(TREE, challenge.points, raw);
  switch (restored.status) {
    case 'none':
      return null;
    case 'restored':
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

/** 取得済みノードを、ツリーに書いた順で返す */
function currentBuild() {
  return TREE.nodes.filter((node) => owned.has(node.id));
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
  tabs: requireElement('#log-tabs', HTMLElement),
  enemySummary: requireElement('#log-enemy-summary', HTMLElement),
  entries: requireElement('#log-entries', HTMLOListElement),
});

const panel = createPanel(
  {
    challengeSelect: requireElement('#challenge-select', HTMLSelectElement),
    challenge: requireElement('#challenge', HTMLElement),
    points: requireElement('#remaining-points', HTMLElement),
    challengeButton: requireElement('#challenge-button', HTMLButtonElement),
    resetButton: requireElement('#reset-button', HTMLButtonElement),
  },
  CHALLENGES,
  {
    onSelectChallenge(challengeId) {
      const selected = CHALLENGES.find((candidate) => candidate.id === challengeId);
      // 選択肢は CHALLENGES から作っているので、見つからなければ呼び出し側のバグ
      if (selected === undefined) {
        throw new Error(`存在しないお題です: ${challengeId}`);
      }
      challenge = selected;
      const selectionSaved = saveSelectedChallenge();
      const notice = loadBuild();
      messageElement.textContent = notice ?? (selectionSaved ? '' : STORAGE_UNAVAILABLE_MESSAGE);
      logView.clear();
      render();
    },
    onChallenge() {
      logView.render(simulateChallenge(currentBuild(), challenge), challenge);
    },
    onReset() {
      resetBuild();
      messageElement.textContent = saveBuild() ? '' : STORAGE_UNAVAILABLE_MESSAGE;
      logView.clear();
      render();
    },
  },
);

const buildStatsView = createBuildStatsView(requireElement('#build-stats', HTMLElement));

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
  buildStatsView.render(createProfile(currentBuild()));
}

messageElement.textContent = loadBuild() ?? '';
render();
