// @ts-check

import { canAcquire, canRelease } from './core/build.js';
import { restoreBuild, serializeBuild } from './core/saved-build.js';
import { createProfile, simulate, simulateChallenge } from './core/simulate.js';
import { CHARACTERS } from './data/characters.js';
import { createBuildStatsView } from './ui/build-stats.js';
import { createDebugInput } from './ui/debug-input.js';
import { createLogView } from './ui/log-view.js';
import { createPanel } from './ui/panel.js';
import { createTreeView } from './ui/tree-view.js';

/**
 * @typedef {import('./types.js').Challenge} Challenge
 * @typedef {import('./types.js').Character} Character
 * @typedef {import('./types.js').NodeId} NodeId
 * @typedef {import('./types.js').SequenceProgress} SequenceProgress
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

/**
 * Pages のオリジンは daily-coding の全プロダクトで共有するので、保存キーにはプロダクト名を前置する。
 * キャラごとのデータは `skill-tree-puzzle:<キャラID>:` の下に置き、選んだキャラだけはキャラの外に置く
 */
const STORAGE_KEY_PREFIX = 'skill-tree-puzzle';
const SELECTED_CHARACTER_KEY = `${STORAGE_KEY_PREFIX}:character`;
const STORAGE_UNAVAILABLE_MESSAGE = 'ビルドを保存できない環境です';
const BUILD_LOCKED_MESSAGE = '連戦中はビルドを変えられません。変えるなら「1体目からやり直す」を押してください';
const INVALID_SAVED_BUILD_MESSAGE = '保存したビルドが今のツリーでは組めないため、最初からにしました';

/** お題の選択はキャラごとに覚える */
function selectedChallengeKey() {
  return `${STORAGE_KEY_PREFIX}:${character.id}:challenge`;
}

/**
 * ビルドはお題ごとに組み直すので、保存もキャラとお題ごとに分ける
 * @param {Challenge} target
 */
function buildStorageKey(target) {
  return `${STORAGE_KEY_PREFIX}:${character.id}:build:${target.id}`;
}

/**
 * localStorage から読む。保存が無ければ null。プライベートブラウズなどで読めなければ undefined
 * @param {string} key
 * @returns {string | null | undefined}
 */
function readStorage(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return undefined;
  }
}

/**
 * プライベートブラウズや容量超過では localStorage が例外を投げる。保存できなくても遊べるようにする
 * @param {string} key
 * @param {string} value
 * @returns {boolean} 保存できたら true
 */
function writeStorage(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

/**
 * 保存が無い、読めない、または今は無いキャラの ID なら、最初のキャラから始める
 * @returns {Character}
 */
function loadSelectedCharacter() {
  const savedId = readStorage(SELECTED_CHARACTER_KEY);
  return CHARACTERS.find((candidate) => candidate.id === savedId) ?? CHARACTERS[0];
}

/**
 * 保存が無い、読めない、または今は無いお題の ID なら、最初のお題から始める
 * @returns {Challenge}
 */
function loadSelectedChallenge() {
  const savedId = readStorage(selectedChallengeKey());
  return character.challenges.find((candidate) => candidate.id === savedId) ?? character.challenges[0];
}

let character = loadSelectedCharacter();
let challenge = loadSelectedChallenge();

/** @type {Set<NodeId>} */
const owned = new Set([character.tree.originId]);

function resetBuild() {
  owned.clear();
  owned.add(character.tree.originId);
}

/**
 * @returns {boolean} 保存できたら true
 */
function saveBuild() {
  return writeStorage(buildStorageKey(challenge), serializeBuild(character.tree, owned));
}

/**
 * 保存が無い・組めないときは起点だけから始める。お題を切り替えたときに、前のお題のビルドを持ち越さないため
 * @returns {string | null} 知らせることがあればその文言
 */
function loadBuild() {
  resetBuild();
  const raw = readStorage(buildStorageKey(challenge));
  if (raw === undefined) {
    return STORAGE_UNAVAILABLE_MESSAGE;
  }
  const restored = restoreBuild(character.tree, challenge.points, raw);
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

/**
 * 連戦の進行は保存しない（保存するのはビルドだけ）。連戦のお題でなければ null
 * @type {SequenceProgress | null}
 */
let progress = null;

function resetProgress() {
  progress = challenge.mode === 'sequence' ? { defeated: [], rewards: [], started: false } : null;
}

/** 連戦中にビルドを組み直せると、各戦闘を単体のお題として解けてしまうため、1戦でも戦ったら変えられない */
function isBuildLocked() {
  return progress !== null && progress.started;
}

/** 1ノード1pt。起点は最初から持っているので数えない */
function remainingPoints() {
  return challenge.points - (owned.size - 1);
}

/** 取得済みノードを、ツリーに書いた順で返す */
function currentBuild() {
  return character.tree.nodes.filter((node) => owned.has(node.id));
}

/**
 * タップしても見た目が変わらないときに、無反応に見えないよう理由を出す
 * @param {NodeId} nodeId
 * @returns {string | null} 取得・解除できたら null
 */
function toggleNode(nodeId) {
  if (isBuildLocked()) {
    return BUILD_LOCKED_MESSAGE;
  }
  if (owned.has(nodeId)) {
    if (nodeId === character.tree.originId) {
      return '起点は外せません';
    }
    if (!canRelease(character.tree, owned, nodeId)) {
      return '外すと起点から繋がらなくなるノードがあります';
    }
    owned.delete(nodeId);
    return null;
  }
  if (!canAcquire(character.tree, owned, nodeId)) {
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
    characterSelect: requireElement('#character-select', HTMLSelectElement),
    challengeSelect: requireElement('#challenge-select', HTMLSelectElement),
    challenge: requireElement('#challenge', HTMLElement),
    points: requireElement('#remaining-points', HTMLElement),
    challengeButton: requireElement('#challenge-button', HTMLButtonElement),
    resetButton: requireElement('#reset-button', HTMLButtonElement),
    sequence: requireElement('#sequence', HTMLElement),
    sequenceStatus: requireElement('#sequence-status', HTMLElement),
    sequenceEnemies: requireElement('#sequence-enemies', HTMLElement),
    sequenceRestartButton: requireElement('#sequence-restart-button', HTMLButtonElement),
  },
  CHARACTERS,
  character.challenges,
  {
    onSelectCharacter(characterId) {
      const selected = CHARACTERS.find((candidate) => candidate.id === characterId);
      // 選択肢は CHARACTERS から作っているので、見つからなければ呼び出し側のバグ
      if (selected === undefined) {
        throw new Error(`存在しないキャラです: ${characterId}`);
      }
      character = selected;
      challenge = loadSelectedChallenge();
      resetProgress();
      const selectionSaved = writeStorage(SELECTED_CHARACTER_KEY, character.id);
      const notice = loadBuild();
      messageElement.textContent = notice ?? (selectionSaved ? '' : STORAGE_UNAVAILABLE_MESSAGE);
      treeView.setTree(character.tree);
      panel.setChallenges(character.challenges);
      logView.clear();
      render();
    },
    onSelectChallenge(challengeId) {
      const selected = character.challenges.find((candidate) => candidate.id === challengeId);
      // 選択肢は character.challenges から作っているので、見つからなければ呼び出し側のバグ
      if (selected === undefined) {
        throw new Error(`存在しないお題です: ${challengeId}`);
      }
      challenge = selected;
      resetProgress();
      const selectionSaved = writeStorage(selectedChallengeKey(), challenge.id);
      const notice = loadBuild();
      messageElement.textContent = notice ?? (selectionSaved ? '' : STORAGE_UNAVAILABLE_MESSAGE);
      logView.clear();
      render();
    },
    onChallenge() {
      logView.render(simulateChallenge(currentBuild(), challenge), challenge);
    },
    onFightEnemy(enemyIndex) {
      // 連戦のお題のときだけ、戦う相手を選ぶボタンが出る
      if (progress === null) {
        throw new Error('連戦のお題ではありません');
      }
      const enemy = challenge.enemies[enemyIndex];
      const result = simulate(currentBuild(), enemy, progress.rewards);
      const won = result.result === 'win';
      const defeated = won ? [...progress.defeated, enemyIndex] : progress.defeated;
      progress = {
        defeated,
        rewards: won ? [...progress.rewards, ...(enemy.reward ?? [])] : progress.rewards,
        started: true,
      };
      if (!won) {
        messageElement.textContent = `${enemy.name}に負けました。次の相手を選び直すか、1体目からやり直してください`;
      } else if (defeated.length === challenge.enemies.length) {
        messageElement.textContent = '連戦クリア！';
      } else {
        messageElement.textContent = `${enemy.name}を倒して報酬を得ました。次の相手を選んでください`;
      }
      logView.render([result], { ...challenge, enemies: [enemy] });
      render();
    },
    onRestartSequence() {
      resetProgress();
      messageElement.textContent = '';
      logView.clear();
      render();
    },
    onReset() {
      resetBuild();
      messageElement.textContent = saveBuild() ? '' : STORAGE_UNAVAILABLE_MESSAGE;
      logView.clear();
      render();
    },
  },
);

createDebugInput(
  {
    text: requireElement('#debug-text', HTMLTextAreaElement),
    buttons: requireElement('#debug-buttons', HTMLElement),
    error: requireElement('#debug-error', HTMLElement),
    resetButton: requireElement('#debug-reset-button', HTMLButtonElement),
    fightButton: requireElement('#debug-fight-button', HTMLButtonElement),
  },
  {
    onFight(effects) {
      // ツリーを介さず、指定した能力を1つの疑似ノードとして渡す。並び順がローテーションの順になる
      const build = [{ id: 'debug', name: 'debug', pos: { x: 0, y: 0 }, effects }];
      logView.render(simulateChallenge(build, challenge), challenge);
    },
    onInvalid() {
      logView.clear();
    },
  },
);

const buildStatsView = createBuildStatsView(requireElement('#build-stats', HTMLElement));

const treeView = createTreeView(requireElement('#tree', SVGSVGElement), character.tree, (nodeId) => {
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
    points > 0
      ? character.tree.nodes.map((node) => node.id).filter((id) => canAcquire(character.tree, owned, id))
      : [],
  );
  const releasable = new Set([...owned].filter((id) => canRelease(character.tree, owned, id)));
  treeView.render(owned, acquirable, releasable);
  // 押しても何も起きない・拒否される状態では、ボタンを押せなくする
  panel.render(character, challenge, points, progress, isBuildLocked() || owned.size <= 1);
  buildStatsView.render(createProfile(currentBuild(), progress?.rewards));
}

resetProgress();
messageElement.textContent = loadBuild() ?? '';
render();
