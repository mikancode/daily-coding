// @ts-check

/**
 * @typedef {import('../types.js').Challenge} Challenge
 */

/**
 * カウンター型。多段で仕掛けると反撃で削り切られ、守りを固めるだけではターン上限に届かない。
 * 右側の HP・防御で耐えながら左上の背水まで繋ぎ、被弾で HP を半分まで減らして火力を上げる形を想定解にしている。
 * 想定解は 10 pt で、配布は寄り道を1つ許す 11 pt
 * @type {readonly Challenge[]}
 */
export const CHALLENGES = [
  {
    id: 'thorn-guard',
    name: '棘の番人',
    hp: 300,
    attack: 24,
    counter: 10,
    resistances: {},
    turnLimit: 10,
    points: 11,
  },
];
