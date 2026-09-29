// @ts-check

import { CHALLENGES as WARRIOR_CHALLENGES } from './warrior/challenges.js';
import { TREE as WARRIOR_TREE } from './warrior/tree.js';

/**
 * @typedef {import('../types.js').Character} Character
 */

/**
 * 並び順が選択肢の順になる。先頭は、保存した選択が無いときに選ばれる
 * @type {readonly Character[]}
 */
export const CHARACTERS = [
  { id: 'warrior', name: '戦士', tree: WARRIOR_TREE, challenges: WARRIOR_CHALLENGES },
  // 切替の動作確認用。マージ前に revert する
  { id: 'warrior-copy', name: '戦士（仮）', tree: WARRIOR_TREE, challenges: WARRIOR_CHALLENGES },
];
