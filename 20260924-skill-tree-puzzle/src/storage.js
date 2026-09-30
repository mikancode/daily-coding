// @ts-check
// ブラウザへの保存（localStorage）。保存キーの命名と、選んだキャラ・お題・ビルドの読み書きをまとめる

import { restoreBuild, serializeBuild } from './core/saved-build.js';

/**
 * @typedef {import('./types.js').Challenge} Challenge
 * @typedef {import('./types.js').Character} Character
 * @typedef {import('./types.js').NodeId} NodeId
 */

/**
 * Pages のオリジンは daily-coding の全プロダクトで共有するので、保存キーにはプロダクト名を前置する。
 * キャラごとのデータは `skill-tree-puzzle:<キャラID>:` の下に置き、選んだキャラだけはキャラの外に置く
 */
const STORAGE_KEY_PREFIX = 'skill-tree-puzzle';
const SELECTED_CHARACTER_KEY = `${STORAGE_KEY_PREFIX}:character`;
export const STORAGE_UNAVAILABLE_MESSAGE = 'ビルドを保存できない環境です';
const INVALID_SAVED_BUILD_MESSAGE = '保存したビルドが今のツリーでは組めないため、最初からにしました';

/**
 * お題の選択はキャラごとに覚える
 * @param {Character} character
 */
function selectedChallengeKey(character) {
  return `${STORAGE_KEY_PREFIX}:${character.id}:challenge`;
}

/**
 * ビルドはお題ごとに組み直すので、保存もキャラとお題ごとに分ける
 * @param {Character} character
 * @param {Challenge} challenge
 */
function buildStorageKey(character, challenge) {
  return `${STORAGE_KEY_PREFIX}:${character.id}:build:${challenge.id}`;
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
 * @param {readonly Character[]} characters
 * @returns {Character}
 */
export function loadSelectedCharacter(characters) {
  const savedId = readStorage(SELECTED_CHARACTER_KEY);
  return characters.find((candidate) => candidate.id === savedId) ?? characters[0];
}

/**
 * @param {Character} character
 * @returns {boolean} 保存できたら true
 */
export function saveSelectedCharacter(character) {
  return writeStorage(SELECTED_CHARACTER_KEY, character.id);
}

/**
 * 保存が無い、読めない、または今は無いお題の ID なら、最初のお題から始める
 * @param {Character} character
 * @returns {Challenge}
 */
export function loadSelectedChallenge(character) {
  const savedId = readStorage(selectedChallengeKey(character));
  return character.challenges.find((candidate) => candidate.id === savedId) ?? character.challenges[0];
}

/**
 * @param {Character} character
 * @param {Challenge} challenge
 * @returns {boolean} 保存できたら true
 */
export function saveSelectedChallenge(character, challenge) {
  return writeStorage(selectedChallengeKey(character), challenge.id);
}

/**
 * @param {Character} character
 * @param {Challenge} challenge
 * @param {ReadonlySet<NodeId>} owned
 * @returns {boolean} 保存できたら true
 */
export function saveBuild(character, challenge, owned) {
  return writeStorage(buildStorageKey(character, challenge), serializeBuild(character.tree, owned));
}

/**
 * 保存が無い・組めないときは起点だけを返す。お題を切り替えたときに、前のお題のビルドを持ち越さないため
 * @param {Character} character
 * @param {Challenge} challenge
 * @returns {{ owned: ReadonlySet<NodeId>, notice: string | null }} owned は起点を含む。notice は知らせることがあればその文言
 */
export function loadSavedBuild(character, challenge) {
  const originOnly = new Set([character.tree.originId]);
  const raw = readStorage(buildStorageKey(character, challenge));
  if (raw === undefined) {
    return { owned: originOnly, notice: STORAGE_UNAVAILABLE_MESSAGE };
  }
  const restored = restoreBuild(character.tree, challenge.points, raw);
  switch (restored.status) {
    case 'none':
      return { owned: originOnly, notice: null };
    case 'restored':
      return { owned: restored.owned, notice: null };
    case 'invalid': {
      // 起点だけの状態で上書きし、次に開いたときに同じ知らせを出さない
      const saved = saveBuild(character, challenge, originOnly);
      return { owned: originOnly, notice: saved ? INVALID_SAVED_BUILD_MESSAGE : STORAGE_UNAVAILABLE_MESSAGE };
    }
  }
}
