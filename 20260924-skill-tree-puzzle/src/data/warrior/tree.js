// @ts-check
// 戦士のスキルツリー（ノードの配置・能力・辺）

import { resolveAbility } from '../../core/ability-table.js';

/**
 * @typedef {import('../../types.js').GridPosition} GridPosition
 * @typedef {import('../../types.js').SkillNode} SkillNode
 * @typedef {import('../../types.js').SkillTree} SkillTree
 */

const ORIGIN_ID = 'origin';
const ORIGIN_NAME = '起点';
const LABEL_SEPARATOR = '・';

/**
 * 能力は `[英語名, 引数…]` で、能力の表（`core/ability-table.js`）の行を指す。引数を省くと表の規定値になる。
 * 効果と表示名は表から作るので、ここには書かない
 * @typedef {{ id: string, pos: GridPosition, abilities: readonly (readonly [string, ...number[]])[] }} NodeDefinition
 */

/** @param {NodeDefinition} definition @returns {SkillNode} */
function toSkillNode({ id, pos, abilities }) {
  const resolved = abilities.map(([name, ...args]) => resolveAbility(name, args));
  return {
    id,
    name: id === ORIGIN_ID ? ORIGIN_NAME : resolved.map(({ label }) => label).join(LABEL_SEPARATOR),
    pos,
    effects: resolved.map(({ effect }) => effect),
  };
}

/**
 * 7列 × 7行のグリッドに置き（x: 0〜6 が左→右、y: 0〜6 が上→下）、起点を中心にする。
 * 能力は外周と、起点の斜め2か所に置き、能力どうしは縦横の距離で3マス以上離す。
 * 上は攻め（連撃）、右は受け（反撃）、下は背水、左は溜めに寄せ、その中間に破甲・貫通・根性・吸収・炎・逆上を置く。
 * 起点から上下左右に2マス先の (3,1)・(3,5) は空け、その先の能力へは回り込ませる。
 * 辺は縦横の隣どうしに疎に張る。全マスを繋ぐと、総当たりの件数が増えすぎるため
 * @type {readonly NodeDefinition[]}
 */
const NODE_DEFINITIONS = [
  { id: 'armor-break', pos: { x: 0, y: 0 }, abilities: [['Break']] },
  { id: 'hp-1', pos: { x: 1, y: 0 }, abilities: [['HP', 20]] },
  { id: 'atk-1', pos: { x: 2, y: 0 }, abilities: [['ATK', 3]] },
  { id: 'multi-hit', pos: { x: 3, y: 0 }, abilities: [['Multi']] },
  { id: 'def-1', pos: { x: 4, y: 0 }, abilities: [['DEF', 2]] },
  { id: 'atk-2', pos: { x: 5, y: 0 }, abilities: [['ATK', 3]] },

  { id: 'atk-3', pos: { x: 0, y: 1 }, abilities: [['ATK', 3]] },
  { id: 'hp-2', pos: { x: 2, y: 1 }, abilities: [['HP', 20]] },
  { id: 'hp-3', pos: { x: 4, y: 1 }, abilities: [['HP', 20]] },
  { id: 'pierce', pos: { x: 5, y: 1 }, abilities: [['Pierce']] },
  { id: 'def-2', pos: { x: 6, y: 1 }, abilities: [['DEF', 2]] },

  { id: 'hp-4', pos: { x: 0, y: 2 }, abilities: [['HP', 20]] },
  { id: 'atk-4', pos: { x: 1, y: 2 }, abilities: [['ATK', 3]] },
  { id: 'fire', pos: { x: 2, y: 2 }, abilities: [['Fire']] },
  { id: 'def-3', pos: { x: 3, y: 2 }, abilities: [['DEF', 2]] },
  { id: 'atk-5', pos: { x: 4, y: 2 }, abilities: [['ATK', 3]] },
  { id: 'hp-5', pos: { x: 5, y: 2 }, abilities: [['HP', 20]] },
  { id: 'atk-6', pos: { x: 6, y: 2 }, abilities: [['ATK', 3]] },

  { id: 'charge', pos: { x: 0, y: 3 }, abilities: [['Charge']] },
  { id: 'def-4', pos: { x: 1, y: 3 }, abilities: [['DEF', 2]] },
  { id: 'atk-7', pos: { x: 2, y: 3 }, abilities: [['ATK', 3]] },
  { id: 'origin', pos: { x: 3, y: 3 }, abilities: [['HP', 100], ['ATK', 10]] },
  { id: 'hp-6', pos: { x: 4, y: 3 }, abilities: [['HP', 20]] },
  { id: 'atk-8', pos: { x: 5, y: 3 }, abilities: [['ATK', 3]] },
  { id: 'counter', pos: { x: 6, y: 3 }, abilities: [['Counter']] },

  { id: 'atk-9', pos: { x: 0, y: 4 }, abilities: [['ATK', 3]] },
  { id: 'def-5', pos: { x: 1, y: 4 }, abilities: [['DEF', 2]] },
  { id: 'hp-7', pos: { x: 2, y: 4 }, abilities: [['HP', 20]] },
  { id: 'atk-10', pos: { x: 3, y: 4 }, abilities: [['ATK', 3]] },
  { id: 'rage', pos: { x: 4, y: 4 }, abilities: [['Rage']] },
  { id: 'atk-11', pos: { x: 5, y: 4 }, abilities: [['ATK', 3]] },
  { id: 'hp-8', pos: { x: 6, y: 4 }, abilities: [['HP', 20]] },

  { id: 'def-6', pos: { x: 0, y: 5 }, abilities: [['DEF', 2]] },
  { id: 'drain', pos: { x: 1, y: 5 }, abilities: [['Drain']] },
  { id: 'atk-12', pos: { x: 2, y: 5 }, abilities: [['ATK', 3]] },
  { id: 'def-7', pos: { x: 4, y: 5 }, abilities: [['DEF', 2]] },
  { id: 'atk-13', pos: { x: 6, y: 5 }, abilities: [['ATK', 3]] },

  { id: 'hp-9', pos: { x: 1, y: 6 }, abilities: [['HP', 20]] },
  { id: 'def-8', pos: { x: 2, y: 6 }, abilities: [['DEF', 2]] },
  { id: 'last-stand', pos: { x: 3, y: 6 }, abilities: [['Cond']] },
  { id: 'atk-14', pos: { x: 4, y: 6 }, abilities: [['ATK', 3]] },
  { id: 'hp-10', pos: { x: 5, y: 6 }, abilities: [['HP', 20]] },
  { id: 'endure', pos: { x: 6, y: 6 }, abilities: [['Endure']] },
];

/** @type {SkillTree} */
export const TREE = {
  originId: ORIGIN_ID,
  nodes: NODE_DEFINITIONS.map(toSkillNode),
  edges: [
    ['origin', 'def-3'],
    ['origin', 'atk-7'],
    ['origin', 'hp-6'],
    ['origin', 'atk-10'],

    ['def-3', 'atk-5'],
    ['atk-7', 'def-4'],
    ['hp-6', 'atk-8'],
    ['atk-10', 'hp-7'],

    ['atk-5', 'hp-3'],
    ['hp-3', 'def-1'],
    ['def-1', 'multi-hit'],
    ['def-1', 'atk-2'],
    ['atk-2', 'pierce'],
    ['atk-5', 'hp-5'],
    ['hp-5', 'atk-6'],
    ['atk-6', 'def-2'],
    ['def-2', 'pierce'],

    ['atk-8', 'hp-5'],
    ['atk-8', 'atk-11'],
    ['atk-6', 'counter'],
    ['hp-8', 'counter'],

    ['atk-11', 'rage'],
    ['def-7', 'rage'],
    ['atk-11', 'hp-8'],
    ['hp-8', 'atk-13'],
    ['atk-13', 'endure'],
    ['def-7', 'atk-14'],
    ['atk-14', 'hp-10'],
    ['hp-10', 'endure'],
    ['atk-14', 'last-stand'],

    ['hp-7', 'atk-12'],
    ['atk-12', 'def-8'],
    ['def-8', 'last-stand'],
    ['def-8', 'hp-9'],
    ['hp-9', 'drain'],
    ['def-6', 'drain'],
    ['hp-7', 'def-5'],
    ['def-5', 'atk-9'],
    ['atk-9', 'def-6'],
    ['atk-9', 'charge'],
    ['def-4', 'def-5'],

    ['def-4', 'atk-4'],
    ['atk-4', 'fire'],
    ['hp-2', 'fire'],
    ['atk-4', 'hp-4'],
    ['hp-4', 'charge'],
    ['hp-4', 'atk-3'],
    ['atk-3', 'armor-break'],
    ['hp-1', 'armor-break'],
    ['hp-1', 'atk-1'],
    ['atk-1', 'hp-2'],
    ['atk-1', 'multi-hit'],
  ],
};
