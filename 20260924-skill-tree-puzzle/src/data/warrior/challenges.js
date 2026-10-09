// @ts-check
// 戦士のお題（敵の組と配布 pt）。易しい順（最少 pt の小さい順）に並べ、敵ごとのコメントに路線を書く

/**
 * @typedef {import('../../types.js').Challenge} Challenge
 * @typedef {import('../../types.js').Enemy} Enemy
 */

/**
 * 再生・毒・根性の型。ステータスだけでは再生を上回れず、ターン上限に届かない。
 * 反撃・溜め・背水のどれか1つを取れば倒せる。いちばん易しいお題にする
 * @type {Enemy}
 */
const SWAMP_LICH = {
  name: '屍の沼竜',
  hp: 160,
  attack: 16,
  defense: 0,
  abilities: [{ type: 'regen', amount: 8 }, { type: 'poison', damage: 5 }, { type: 'endure' }],
  resistances: {},
  turnLimit: 10,
};

/**
 * 耐性型。物理を半分に軽減し、防御も高い。
 * 炎で軽減を避けるか、貫通で防御を無視して反撃を重ねるか、溜めと背水で軽減ごと押し切る
 * @type {Enemy}
 */
const STEEL_BEETLE = {
  name: '鋼殻の甲虫',
  hp: 120,
  attack: 22,
  defense: 6,
  abilities: [],
  resistances: { physical: 0.5 },
  turnLimit: 10,
};

/**
 * カウンター型。多段で仕掛けると反撃で削り切られ、守りを固めるだけではターン上限に届かない。
 * 背水か溜めで火力を上げ、吸収や逆上で反撃に耐える。いちばん難しいお題にする
 * @type {Enemy}
 */
const THORN_GUARD = {
  name: '棘の番人',
  hp: 300,
  attack: 28,
  defense: 0,
  abilities: [{ type: 'counter', damage: 10 }],
  resistances: {},
  turnLimit: 10,
};

/** @type {readonly Challenge[]} */
export const CHALLENGES = [
  {
    id: 'swamp-lich',
    name: '屍の沼竜',
    enemies: [SWAMP_LICH],
    /** 反撃・溜め・背水の3路線とも、8 pt で倒せる。寄り道を1つ許す。最少の 7 pt は、能力を2つ組み合わせたときに出る */
    points: 9,
    minimumPoints: 7,
  },
  {
    id: 'steel-beetle',
    name: '鋼殻の甲虫',
    enemies: [STEEL_BEETLE],
    /** 貫通と反撃は 8 pt、炎と、溜めと背水は 9 pt で倒せる。どの路線にも寄り道を1つ許す */
    points: 10,
    minimumPoints: 8,
  },
  {
    id: 'thorn-guard',
    name: '棘の番人',
    enemies: [THORN_GUARD],
    /** 吸収と背水は 9 pt、溜めと吸収、逆上と吸収は 10 pt で倒せる。寄り道を1〜2つ許す */
    points: 11,
    minimumPoints: 9,
  },
  {
    id: 'gauntlet',
    name: '三連戦（仮）',
    mode: 'sequence',
    /** 数値が仮なので、公開版には出さない */
    debugOnly: true,
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
    minimumPoints: 9,
  },
];
