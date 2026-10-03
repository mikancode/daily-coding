// @ts-check
// 入口。選んだキャラ・お題・取得済みノード・連戦の進行を状態として持ち、判定（core）と描画（ui）を繋ぐ

import { canAcquire, canRelease } from './core/build.js';
import { simulateChallenge } from './core/challenge.js';
import { createProfile } from './core/profile.js';
import { simulate } from './core/simulate.js';
import { CHARACTERS } from './data/characters.js';
import {
  STORAGE_UNAVAILABLE_MESSAGE,
  loadSavedBuild,
  loadSelectedChallenge,
  loadSelectedCharacter,
  saveBuild,
  saveSelectedChallenge,
  saveSelectedCharacter,
} from './storage.js';
import { createBuildStatsView } from './ui/build-stats.js';
import { createDebugInput } from './ui/debug-input.js';
import { createLogView } from './ui/log-view.js';
import { createNodeDescriptionView } from './ui/node-description.js';
import { createPanel } from './ui/panel.js';
import { createTreeView } from './ui/tree-view.js';

/**
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

/** URL に `?debug` を付けたときだけ、開発用のお題とデバッグ入力を出す */
const DEBUG_MODE = new URLSearchParams(location.search).has('debug');

/**
 * 画面で選べるキャラとお題。開発用のお題を外すと、保存した選択が開発用のお題でも、無い ID として先頭のお題から始まる
 * @type {readonly Character[]}
 */
const characters = DEBUG_MODE
  ? CHARACTERS
  : CHARACTERS.map((entry) => ({
      ...entry,
      challenges: entry.challenges.filter((candidate) => candidate.debugOnly !== true),
    }));

const BUILD_LOCKED_MESSAGE = '連戦中はビルドを変えられません。変えるなら「1体目からやり直す」を押してください';

let character = loadSelectedCharacter(characters);
let challenge = loadSelectedChallenge(character);

/** @type {Set<NodeId>} */
const owned = new Set([character.tree.originId]);

function resetBuild() {
  owned.clear();
  owned.add(character.tree.originId);
}

/**
 * お題を切り替えたときに、前のお題のビルドを持ち越さないよう、保存したビルドで置き換える
 * @returns {string | null} 知らせることがあればその文言
 */
function loadBuild() {
  const saved = loadSavedBuild(character, challenge);
  owned.clear();
  saved.owned.forEach((id) => owned.add(id));
  return saved.notice;
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
    bossAbilities: requireElement('#boss-abilities', HTMLDetailsElement),
    bossAbilitiesText: requireElement('#boss-abilities-text', HTMLElement),
    points: requireElement('#remaining-points', HTMLElement),
    challengeButton: requireElement('#challenge-button', HTMLButtonElement),
    resetButton: requireElement('#reset-button', HTMLButtonElement),
    sequence: requireElement('#sequence', HTMLElement),
    sequenceStatus: requireElement('#sequence-status', HTMLElement),
    sequenceEnemies: requireElement('#sequence-enemies', HTMLElement),
    sequenceRestartButton: requireElement('#sequence-restart-button', HTMLButtonElement),
  },
  characters,
  character.challenges,
  {
    onSelectCharacter(characterId) {
      const selected = characters.find((candidate) => candidate.id === characterId);
      // 選択肢は characters から作っているので、見つからなければ呼び出し側のバグ
      if (selected === undefined) {
        throw new Error(`存在しないキャラです: ${characterId}`);
      }
      character = selected;
      challenge = loadSelectedChallenge(character);
      resetProgress();
      const selectionSaved = saveSelectedCharacter(character);
      const notice = loadBuild();
      messageElement.textContent = notice ?? (selectionSaved ? '' : STORAGE_UNAVAILABLE_MESSAGE);
      treeView.setTree(character.tree);
      nodeDescriptionView.clear();
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
      const selectionSaved = saveSelectedChallenge(character, challenge);
      const notice = loadBuild();
      messageElement.textContent = notice ?? (selectionSaved ? '' : STORAGE_UNAVAILABLE_MESSAGE);
      nodeDescriptionView.clear();
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
      messageElement.textContent = saveBuild(character, challenge, owned) ? '' : STORAGE_UNAVAILABLE_MESSAGE;
      logView.clear();
      render();
    },
  },
);

requireElement('#debug', HTMLDetailsElement).hidden = !DEBUG_MODE;

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

const nodeDescriptionView = createNodeDescriptionView(requireElement('#node-description', HTMLElement));

const treeView = createTreeView(requireElement('#tree', SVGSVGElement), character.tree, (nodeId) => {
  const node = character.tree.nodes.find((candidate) => candidate.id === nodeId);
  // ノード ID はツリーの描画から来るので、見つからなければ呼び出し側のバグ
  if (node === undefined) {
    throw new Error(`存在しないノードです: ${nodeId}`);
  }
  nodeDescriptionView.render(node);
  const reason = toggleNode(nodeId);
  if (reason !== null) {
    messageElement.textContent = reason;
  } else {
    messageElement.textContent = saveBuild(character, challenge, owned) ? '' : STORAGE_UNAVAILABLE_MESSAGE;
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
