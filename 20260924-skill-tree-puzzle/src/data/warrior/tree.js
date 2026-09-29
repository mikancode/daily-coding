// @ts-check

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
 * 縦持ちの1画面に収まるよう、5列 × 7行のグリッドに置く（x: 0〜4 が左→右、y: 0〜6 が上→下）。
 * 起点は下端の中央。起点の近くでは攻撃系を左、HP・防御系を右に寄せ、挙動変更・条件シナジー・属性は遠い端に置く。
 * 正解ルートが「離れた2箇所を繋ぐ」形になるようにするため。
 * ただし起点の真上は攻撃、その左は HP にする。起点から右上へ向かう2通りの道順が同じステータスにならないようにするため
 * @type {readonly NodeDefinition[]}
 */
const NODE_DEFINITIONS = [
  { id: 'origin', pos: { x: 2, y: 6 }, abilities: [['HP', 100], ['ATK', 10]] },

  { id: 'atk-1', pos: { x: 1, y: 6 }, abilities: [['ATK', 3]] },
  { id: 'hp-1', pos: { x: 3, y: 6 }, abilities: [['HP', 20]] },

  { id: 'atk-2', pos: { x: 0, y: 5 }, abilities: [['ATK', 3]] },
  { id: 'hp-2', pos: { x: 1, y: 5 }, abilities: [['HP', 20]] },
  { id: 'atk-3', pos: { x: 2, y: 5 }, abilities: [['ATK', 3]] },
  { id: 'def-1', pos: { x: 3, y: 5 }, abilities: [['DEF', 2]] },
  { id: 'hp-3', pos: { x: 4, y: 5 }, abilities: [['HP', 20]] },

  { id: 'atk-4', pos: { x: 0, y: 4 }, abilities: [['ATK', 5]] },
  { id: 'atk-5', pos: { x: 1, y: 4 }, abilities: [['ATK', 3]] },
  { id: 'def-2', pos: { x: 2, y: 4 }, abilities: [['DEF', 2]] },
  { id: 'hp-4', pos: { x: 3, y: 4 }, abilities: [['HP', 20]] },
  { id: 'def-3', pos: { x: 4, y: 4 }, abilities: [['DEF', 2]] },

  { id: 'multi-hit', pos: { x: 0, y: 3 }, abilities: [['Multi']] },
  { id: 'atk-6', pos: { x: 1, y: 3 }, abilities: [['ATK', 3]] },
  { id: 'hp-5', pos: { x: 3, y: 3 }, abilities: [['HP', 20]] },
  { id: 'thunder', pos: { x: 4, y: 3 }, abilities: [['Thunder']] },

  { id: 'atk-7', pos: { x: 0, y: 2 }, abilities: [['ATK', 3]] },
  { id: 'def-4', pos: { x: 1, y: 2 }, abilities: [['DEF', 2]] },
  { id: 'atk-8', pos: { x: 2, y: 2 }, abilities: [['ATK', 3]] },
  { id: 'def-5', pos: { x: 3, y: 2 }, abilities: [['DEF', 2]] },
  { id: 'hp-6', pos: { x: 4, y: 2 }, abilities: [['HP', 30]] },

  { id: 'fire', pos: { x: 0, y: 1 }, abilities: [['Fire']] },
  { id: 'atk-9', pos: { x: 1, y: 1 }, abilities: [['ATK', 5]] },
  { id: 'hp-7', pos: { x: 2, y: 1 }, abilities: [['HP', 20]] },
  { id: 'atk-10', pos: { x: 3, y: 1 }, abilities: [['ATK', 5]] },
  { id: 'atk-11', pos: { x: 4, y: 1 }, abilities: [['ATK', 3]] },

  { id: 'last-stand', pos: { x: 1, y: 0 }, abilities: [['Cond']] },
  { id: 'power', pos: { x: 2, y: 0 }, abilities: [['ATK', 8]] },
  { id: 'ice', pos: { x: 3, y: 0 }, abilities: [['Ice']] },
];

/** @type {SkillTree} */
export const TREE = {
  originId: ORIGIN_ID,
  nodes: NODE_DEFINITIONS.map(toSkillNode),
  edges: [
    ['origin', 'atk-1'],
    ['origin', 'hp-1'],
    ['origin', 'atk-3'],

    ['atk-1', 'hp-2'],
    ['hp-2', 'atk-2'],
    ['hp-2', 'atk-5'],
    ['atk-2', 'atk-4'],
    ['hp-1', 'def-1'],
    ['def-1', 'hp-3'],
    ['def-1', 'hp-4'],
    ['hp-3', 'def-3'],
    ['atk-3', 'def-2'],
    ['def-2', 'atk-5'],
    ['def-2', 'hp-4'],

    ['atk-4', 'multi-hit'],
    ['atk-5', 'atk-6'],
    ['hp-4', 'hp-5'],
    ['def-3', 'thunder'],

    ['multi-hit', 'atk-7'],
    ['atk-6', 'def-4'],
    ['atk-7', 'def-4'],
    ['def-4', 'atk-8'],
    ['hp-5', 'def-5'],
    ['def-5', 'atk-8'],
    ['thunder', 'hp-6'],

    ['atk-7', 'fire'],
    ['def-4', 'atk-9'],
    ['fire', 'atk-9'],
    ['atk-8', 'hp-7'],
    ['def-5', 'atk-10'],
    ['hp-6', 'atk-11'],
    ['atk-10', 'atk-11'],

    ['atk-9', 'last-stand'],
    ['hp-7', 'power'],
    ['atk-10', 'ice'],
    ['last-stand', 'power'],
    ['power', 'ice'],
  ],
};
