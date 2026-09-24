// @ts-check

/**
 * @typedef {import('../types.js').Challenge} Challenge
 */

// 数値は仮置き。バランスは総当たり検証（#54）で調整する

/**
 * カウンター型。多段で仕掛けると反撃で削り切られ、守りを固めるだけではターン上限に届かない。
 * 被弾で HP を半分まで減らし、背水で火力を上げる形を想定解にしている
 * @type {readonly Challenge[]}
 */
export const CHALLENGES = [
  {
    id: 'thorn-guard',
    name: '棘の番人',
    hp: 240,
    attack: 20,
    counter: 8,
    resistances: {},
    turnLimit: 8,
    points: 10,
  },
];
