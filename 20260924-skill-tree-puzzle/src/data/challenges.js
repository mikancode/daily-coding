// @ts-check

/**
 * @typedef {import('../types.js').Challenge} Challenge
 */

/** @type {readonly Challenge[]} */
export const CHALLENGES = [
  {
    id: 'thorn-guard',
    name: '棘の番人',
    enemies: [
      /**
       * カウンター型。多段で仕掛けると反撃で削り切られ、守りを固めるだけではターン上限に届かない。
       * 右側の HP・防御で耐えながら左上の背水まで繋ぎ、被弾で HP を半分まで減らして火力を上げる形を想定解にしている。
       * 想定解は 10 pt
       */
      {
        name: '棘の番人',
        hp: 300,
        attack: 24,
        counter: 10,
        resistances: {},
        turnLimit: 10,
      },
    ],
    /** 想定解の 10 pt に、寄り道を1つ許す */
    points: 11,
  },
  {
    id: 'steel-beetle',
    name: '鋼殻の甲虫',
    enemies: [
      /**
       * 耐性型。雷以外を 60% 軽減するので、右端の雷まで経路を伸ばさせる。反撃はしない代わりに、1撃が重い。
       * 右側の HP・防御の道を雷まで繋ぎ、その先の攻撃+3・+5 を取る形を想定解にしている。背水は使わない。
       * 想定解は HP 170・防御 4・1発 18 で、8ターン目に倒し切り、HP 16 が残る。
       * ターン上限には2ターンの余裕を持たせ、耐え切れるかを問う。
       * 想定解は 8 pt
       */
      {
        name: '鋼殻の甲虫',
        hp: 140,
        attack: 26,
        counter: 0,
        resistances: { physical: 0.6, fire: 0.6, ice: 0.6 },
        turnLimit: 10,
      },
    ],
    /** 想定解の 8 pt に、寄り道を1つ許す */
    points: 9,
  },
];
