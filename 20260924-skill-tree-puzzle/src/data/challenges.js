// @ts-check

/**
 * @typedef {import('../types.js').Challenge} Challenge
 */

/** @type {readonly Challenge[]} */
export const CHALLENGES = [
  /**
   * カウンター型。多段で仕掛けると反撃で削り切られ、守りを固めるだけではターン上限に届かない。
   * 右側の HP・防御で耐えながら左上の背水まで繋ぎ、被弾で HP を半分まで減らして火力を上げる形を想定解にしている。
   * 想定解は 10 pt で、配布は寄り道を1つ許す 11 pt
   */
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
  /**
   * 耐性型。雷以外を半減するので、右端の雷まで経路を伸ばさせる。
   * 右側の HP・防御の道を雷まで繋ぎ、その先の攻撃+3・+5 を取る形を想定解にしている。背水は使わない。
   * 想定解は HP 170・防御 4・1発 18 で、10ターン目にちょうど倒し切り、HP 17 が残る。
   * 想定解は 8 pt で、配布は寄り道を1つ許す 9 pt
   */
  {
    id: 'steel-beetle',
    name: '鋼殻の甲虫',
    hp: 180,
    attack: 15,
    counter: 10,
    resistances: { physical: 0.5, fire: 0.5, ice: 0.5 },
    turnLimit: 10,
    points: 9,
  },
];
