// @ts-check
// 入口。選んだキャラ・お題・取得済みノード・連戦の進行を状態として持ち、判定（core）と描画（ui）を繋ぐ。クリアしたら記録する

import { canAcquire, canRelease } from './core/build.js';
import { simulateChallenge } from './core/challenge.js';
import { clearsByResults, clearsBySequence, isMinimumRevealed } from './core/clear-record.js';
import { createProfile } from './core/profile.js';
import { simulate } from './core/simulate.js';
import { CHARACTERS } from './data/characters.js';
import {
  STORAGE_UNAVAILABLE_MESSAGE,
  loadBest,
  loadSavedBuild,
  loadSelectedChallenge,
  loadSelectedCharacter,
  saveBuild,
  saveClear,
  saveSelectedChallenge,
  saveSelectedCharacter,
} from './storage.js';
import { createBuildStatsView } from './ui/build-stats.js';
import { createDescriptionPopover } from './ui/description-popover.js';
import { createDebugInput } from './ui/debug-input.js';
import { formatNodeDescription } from './ui/ability-names.js';
import { createLogView } from './ui/log-view.js';
import { createPanel } from './ui/panel.js';
import { createTreeView } from './ui/tree-view.js';

/**
 * @typedef {import('./types.js').Character} Character
 * @typedef {import('./types.js').ChallengeRecords} ChallengeRecords
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

/** ノードのタップ以外の知らせ（保存できない・保存したビルドを捨てた・連戦の結果）。ノードの理由は吹き出しに出す */
const noticeElement = requireElement('#notice', HTMLElement);

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
const RECORD_UNAVAILABLE_MESSAGE = '記録を保存できない環境です';
const MINIMUM_REVEALED_MESSAGE = '全お題クリア！ 最少 pt を開示しました';

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
 * 記録の持ち場は保存だけにし、画面に出すたびに読む。保存できない環境では、未クリアとして出る
 * @returns {ChallengeRecords}
 */
function loadRecords() {
  const bests = new Map(character.challenges.map((candidate) => [candidate.id, loadBest(character, candidate)]));
  return { bests, revealed: isMinimumRevealed(character.challenges, (candidate) => bests.get(candidate.id) !== null) };
}

/**
 * 今のビルドでクリアしたことを記録し、知らせる文言を返す
 * @param {string} clearedMessage 先頭に付ける、クリアの知らせ
 * @returns {string}
 */
function recordClear(clearedMessage) {
  const wasRevealed = loadRecords().revealed;
  const previousBest = loadBest(character, challenge);
  const usedPoints = owned.size - 1;
  const { improved, saved } = saveClear(character, challenge, usedPoints);
  if (!saved) {
    return `${clearedMessage} ${RECORD_UNAVAILABLE_MESSAGE}`;
  }
  if (!wasRevealed && loadRecords().revealed) {
    return MINIMUM_REVEALED_MESSAGE;
  }
  const used = `${clearedMessage} 使った pt ${usedPoints}`;
  if (previousBest === null) {
    return used;
  }
  return improved ? `${used}（自己ベスト更新）` : `${used}（自己ベスト ${previousBest} pt）`;
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

const popover = createDescriptionPopover(
  requireElement('.app', HTMLElement),
  requireElement('#ability-popover', HTMLElement),
);

const panel = createPanel(
  {
    characterSelect: requireElement('#character-select', HTMLSelectElement),
    challengeSelect: requireElement('#challenge-select', HTMLSelectElement),
    challengeRecord: requireElement('#challenge-record', HTMLElement),
    challenge: requireElement('#challenge', HTMLElement),
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
  popover,
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
      noticeElement.textContent = notice ?? (selectionSaved ? '' : STORAGE_UNAVAILABLE_MESSAGE);
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
      const selectionSaved = saveSelectedChallenge(character, challenge);
      const notice = loadBuild();
      noticeElement.textContent = notice ?? (selectionSaved ? '' : STORAGE_UNAVAILABLE_MESSAGE);
      logView.clear();
      render();
    },
    onChallenge() {
      const results = simulateChallenge(currentBuild(), challenge);
      // 前の挑戦のクリアの知らせを、負けた結果と並べて残さない
      noticeElement.textContent = clearsByResults(results) ? recordClear('クリア！') : '';
      logView.render(results, challenge);
      render();
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
        noticeElement.textContent = `${enemy.name}に負けました。次の相手を選び直すか、1体目からやり直してください`;
      } else if (clearsBySequence(challenge, progress)) {
        noticeElement.textContent = recordClear('連戦クリア！');
      } else {
        noticeElement.textContent = `${enemy.name}を倒して報酬を得ました。次の相手を選んでください`;
      }
      logView.render([result], { ...challenge, enemies: [enemy] });
      render();
    },
    onRestartSequence() {
      resetProgress();
      noticeElement.textContent = '';
      logView.clear();
      render();
    },
    onReset() {
      resetBuild();
      noticeElement.textContent = saveBuild(character, challenge, owned) ? '' : STORAGE_UNAVAILABLE_MESSAGE;
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
      // ツリーを介さず、指定した能力を1つの疑似ノードとして渡す。並び順がローテーションの順になる。
      // ツリーで組んだビルドではないので、勝ってもクリアとして記録しない
      const build = [{ id: 'debug', name: 'debug', pos: { x: 0, y: 0 }, effects }];
      logView.render(simulateChallenge(build, challenge), challenge);
    },
    onInvalid() {
      logView.clear();
    },
  },
);

const buildStatsView = createBuildStatsView(
  {
    text: requireElement('#build-stats-text', HTMLElement),
    badges: requireElement('#build-stats-badges', HTMLElement),
  },
  popover,
);

const treeView = createTreeView(requireElement('#tree', SVGSVGElement), character.tree, (nodeId) => {
  const node = character.tree.nodes.find((candidate) => candidate.id === nodeId);
  // ノード ID はツリーの描画から来るので、見つからなければ呼び出し側のバグ
  if (node === undefined) {
    throw new Error(`存在しないノードです: ${nodeId}`);
  }
  const reason = toggleNode(nodeId);
  if (reason === null) {
    noticeElement.textContent = saveBuild(character, challenge, owned) ? '' : STORAGE_UNAVAILABLE_MESSAGE;
  }
  // render が吹き出しを閉じるので、描き直してから開く。取得・解除できなかったノードの効き方も読めるようにする
  render();
  popover.open(treeView.nodeBody(nodeId), formatNodeDescription(node), reason ?? undefined, {
    preferAbove: isBelowOrigin(character.tree, node),
  });
});

/**
 * 起点より下の行のノード。吹き出しを上に出し、下に続くノードと「挑戦」ボタンを隠さないようにする
 * @param {import('./types.js').SkillTree} tree
 * @param {import('./types.js').SkillNode} node
 */
function isBelowOrigin(tree, node) {
  const origin = tree.nodes.find((candidate) => candidate.id === tree.originId);
  // 起点の ID はツリーのデータが持ち、tests/data.test.js で実在を確かめている
  if (origin === undefined) {
    throw new Error(`起点が見つかりません: ${tree.originId}`);
  }
  return node.pos.y > origin.pos.y;
}

function render() {
  popover.close();
  const points = remainingPoints();
  const acquirable = new Set(
    points > 0
      ? character.tree.nodes.map((node) => node.id).filter((id) => canAcquire(character.tree, owned, id))
      : [],
  );
  const releasable = new Set([...owned].filter((id) => canRelease(character.tree, owned, id)));
  treeView.render(owned, acquirable, releasable);
  // 押しても何も起きない・拒否される状態では、ボタンを押せなくする
  panel.render(character, challenge, loadRecords(), points, progress, isBuildLocked() || owned.size <= 1);
  buildStatsView.render(createProfile(currentBuild(), progress?.rewards));
}

resetProgress();
noticeElement.textContent = loadBuild() ?? '';
render();
