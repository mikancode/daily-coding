// @ts-check

/**
 * @typedef {import('../../types.js').Challenge} Challenge
 * @typedef {import('../../types.js').Enemy} Enemy
 */

/**
 * カウンター型。多段で仕掛けると反撃で削り切られ、守りを固めるだけではターン上限に届かない。
 * 右側の HP・防御で耐えながら左上の背水まで繋ぎ、被弾で HP を半分まで減らして火力を上げる形を想定解にしている。
 * 想定解は 10 pt
 * @type {Enemy}
 */
const THORN_GUARD = {
  name: '棘の番人',
  hp: 300,
  attack: 24,
  defense: 0,
  abilities: [{ type: 'counter', damage: 10 }],
  resistances: {},
  turnLimit: 10,
};

/**
 * 耐性型。雷以外を 60% 軽減するので、右端の雷まで経路を伸ばさせる。反撃はしない代わりに、1撃が重い。
 * 右側の HP・防御の道を雷まで繋ぎ、その先の攻撃+3・+5 を取る形を想定解にしている。背水は使わない。
 * 想定解は HP 170・防御 4・1発 18 で、8ターン目に倒し切り、HP 16 が残る。
 * ターン上限には2ターンの余裕を持たせ、耐え切れるかを問う。
 * 想定解は 8 pt
 * @type {Enemy}
 */
const STEEL_BEETLE = {
  name: '鋼殻の甲虫',
  hp: 140,
  attack: 26,
  defense: 0,
  abilities: [],
  resistances: { physical: 0.6, fire: 0.6, ice: 0.6 },
  turnLimit: 10,
};

/**
 * ターン開始（再生）・ターン終了（毒）・致死時（食いしばり）の能力を確かめるための敵。
 * 数値は仮で、倒しやすくしてある。想定解はまだ決めておらず、難度はあとで調整する
 * @type {Enemy}
 */
const SWAMP_LICH = {
  name: '屍の沼竜',
  hp: 120,
  attack: 16,
  defense: 0,
  abilities: [{ type: 'regen', amount: 8 }, { type: 'poison', damage: 5 }, { type: 'endure' }],
  resistances: {},
  turnLimit: 10,
};

/** @type {readonly Challenge[]} */
export const CHALLENGES = [
  {
    id: 'thorn-guard',
    name: '棘の番人',
    enemies: [THORN_GUARD],
    /** 想定解の 10 pt に、寄り道を1つ許す */
    points: 11,
  },
  {
    id: 'steel-beetle',
    name: '鋼殻の甲虫',
    enemies: [STEEL_BEETLE],
    /** 想定解の 8 pt に、寄り道を1つ許す */
    points: 9,
  },
  {
    id: 'swamp-lich',
    name: '屍の沼竜',
    enemies: [SWAMP_LICH],
    /** 最少クリアの 7 pt に、寄り道を1つ許す */
    points: 8,
  },
  {
    id: 'gauntlet',
    name: '三連戦（仮）',
    mode: 'sequence',
    /**
     * 連戦の仕組みを確かめるための仮のお題。敵は単体のお題と同じで、報酬の数値・配布 pt は仮。
     * 型ごとに勝てる順番が分かれるようにするための調整は、ツリー・スキルの案が出てから行う
     */
    enemies: [
      { ...THORN_GUARD, reward: [{ type: 'stat', stat: 'hp', amount: 40 }] },
      { ...STEEL_BEETLE, reward: [{ type: 'stat', stat: 'attack', amount: 4 }] },
      { ...SWAMP_LICH, reward: [{ type: 'regen', amount: 6 }] },
    ],
    points: 11,
  },
];
