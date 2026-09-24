// @ts-check

/**
 * @typedef {import('../types.js').Effect} Effect
 * @typedef {import('../types.js').ElementId} ElementId
 * @typedef {import('../types.js').SkillTree} SkillTree
 */

/** @param {number} amount @returns {Effect} */
const attack = (amount) => ({ type: 'stat', stat: 'attack', amount });
/** @param {number} amount @returns {Effect} */
const hp = (amount) => ({ type: 'stat', stat: 'hp', amount });
/** @param {number} amount @returns {Effect} */
const defense = (amount) => ({ type: 'stat', stat: 'defense', amount });
/** @param {ElementId} element @returns {Effect} */
const element = (element) => ({ type: 'element', element });

/**
 * 縦持ちの1画面に収まるよう、5列 × 7行のグリッドに置く（x: 0〜4 が左→右、y: 0〜6 が上→下）。
 * 起点は下端の中央。起点の近くでは攻撃系を左、HP・防御系を右に寄せ、挙動変更・条件シナジー・属性は遠い端に置く。
 * 正解ルートが「離れた2箇所を繋ぐ」形になるようにするため
 * @type {SkillTree}
 */
export const TREE = {
  originId: 'origin',
  nodes: [
    { id: 'origin', name: '起点', pos: { x: 2, y: 6 }, effects: [hp(100), attack(10)] },

    { id: 'atk-1', name: '攻撃+3', pos: { x: 1, y: 6 }, effects: [attack(3)] },
    { id: 'hp-1', name: 'HP+20', pos: { x: 3, y: 6 }, effects: [hp(20)] },

    { id: 'atk-2', name: '攻撃+3', pos: { x: 0, y: 5 }, effects: [attack(3)] },
    { id: 'atk-3', name: '攻撃+3', pos: { x: 1, y: 5 }, effects: [attack(3)] },
    { id: 'hp-2', name: 'HP+20', pos: { x: 2, y: 5 }, effects: [hp(20)] },
    { id: 'def-1', name: '防御+2', pos: { x: 3, y: 5 }, effects: [defense(2)] },
    { id: 'hp-3', name: 'HP+20', pos: { x: 4, y: 5 }, effects: [hp(20)] },

    { id: 'atk-4', name: '攻撃+5', pos: { x: 0, y: 4 }, effects: [attack(5)] },
    { id: 'atk-5', name: '攻撃+3', pos: { x: 1, y: 4 }, effects: [attack(3)] },
    { id: 'def-2', name: '防御+2', pos: { x: 2, y: 4 }, effects: [defense(2)] },
    { id: 'hp-4', name: 'HP+20', pos: { x: 3, y: 4 }, effects: [hp(20)] },
    { id: 'def-3', name: '防御+2', pos: { x: 4, y: 4 }, effects: [defense(2)] },

    {
      id: 'multi-hit',
      name: '連撃',
      pos: { x: 0, y: 3 },
      effects: [{ type: 'multiHit', hits: 2, ratio: 0.5 }],
    },
    { id: 'atk-6', name: '攻撃+3', pos: { x: 1, y: 3 }, effects: [attack(3)] },
    { id: 'hp-5', name: 'HP+20', pos: { x: 3, y: 3 }, effects: [hp(20)] },
    { id: 'thunder', name: '雷属性', pos: { x: 4, y: 3 }, effects: [element('thunder')] },

    { id: 'atk-7', name: '攻撃+3', pos: { x: 0, y: 2 }, effects: [attack(3)] },
    { id: 'def-4', name: '防御+2', pos: { x: 1, y: 2 }, effects: [defense(2)] },
    { id: 'atk-8', name: '攻撃+3', pos: { x: 2, y: 2 }, effects: [attack(3)] },
    { id: 'def-5', name: '防御+2', pos: { x: 3, y: 2 }, effects: [defense(2)] },
    { id: 'hp-6', name: 'HP+30', pos: { x: 4, y: 2 }, effects: [hp(30)] },

    { id: 'fire', name: '炎属性', pos: { x: 0, y: 1 }, effects: [element('fire')] },
    { id: 'atk-9', name: '攻撃+5', pos: { x: 1, y: 1 }, effects: [attack(5)] },
    { id: 'hp-7', name: 'HP+20', pos: { x: 2, y: 1 }, effects: [hp(20)] },
    { id: 'atk-10', name: '攻撃+5', pos: { x: 3, y: 1 }, effects: [attack(5)] },
    { id: 'atk-11', name: '攻撃+3', pos: { x: 4, y: 1 }, effects: [attack(3)] },

    {
      id: 'last-stand',
      name: '背水',
      pos: { x: 1, y: 0 },
      effects: [{ type: 'conditional', hpRatioAtMost: 0.5, damageMultiplier: 2 }],
    },
    { id: 'power', name: '攻撃+8', pos: { x: 2, y: 0 }, effects: [attack(8)] },
    { id: 'ice', name: '氷属性', pos: { x: 3, y: 0 }, effects: [element('ice')] },
  ],
  edges: [
    ['origin', 'atk-1'],
    ['origin', 'hp-1'],
    ['origin', 'hp-2'],

    ['atk-1', 'atk-3'],
    ['atk-3', 'atk-2'],
    ['atk-3', 'atk-5'],
    ['atk-2', 'atk-4'],
    ['hp-1', 'def-1'],
    ['def-1', 'hp-3'],
    ['def-1', 'hp-4'],
    ['hp-3', 'def-3'],
    ['hp-2', 'def-2'],
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
