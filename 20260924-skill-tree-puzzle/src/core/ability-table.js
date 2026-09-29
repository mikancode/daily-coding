// @ts-check

/**
 * @typedef {import('../types.js').AbilityDefinition} AbilityDefinition
 */

/** ステータスの規定値は、ボタン1回ぶんの増分でもある */
const HP_STEP = 10;
const ATTACK_STEP = 1;
const DEFENSE_STEP = 1;

/** @param {string} name @param {string} label @param {'hp' | 'attack' | 'defense'} stat @param {number} step @returns {AbilityDefinition} */
const statAbility = (name, label, stat, step) => ({
  name,
  label,
  group: 'stat',
  defaults: [step],
  build: (amount) => ({ type: 'stat', stat, amount }),
});

/** @param {string} name @param {string} label @param {'physical' | 'fire' | 'ice' | 'thunder'} element @returns {AbilityDefinition} */
const elementAbility = (name, label, element) => ({
  name,
  label,
  group: 'element',
  defaults: [],
  build: () => ({ type: 'element', element }),
});

/**
 * デバッグ入力で指定できる能力の表。入力の語・ボタンの追記値・パーサーの規定値は、すべてここから作る。
 * ボタンはこの並び順に出る
 * @type {readonly AbilityDefinition[]}
 */
export const ABILITIES = [
  statAbility('HP', 'HP', 'hp', HP_STEP),
  statAbility('ATK', '攻撃', 'attack', ATTACK_STEP),
  statAbility('DEF', '防御', 'defense', DEFENSE_STEP),
  {
    name: 'Multi',
    label: '連撃',
    group: 'ability',
    defaults: [2, 0.5],
    check: ([hits]) => (Number.isInteger(hits) && hits >= 1 ? null : '連撃の回数は1以上の整数にしてください'),
    build: (hits, ratio) => ({ type: 'multiHit', hits, ratio }),
  },
  {
    name: 'Cond',
    label: '背水',
    group: 'ability',
    defaults: [0.5, 2],
    build: (hpRatioAtMost, damageMultiplier) => ({ type: 'conditional', hpRatioAtMost, damageMultiplier }),
  },
  {
    name: 'Counter',
    label: '反撃',
    group: 'ability',
    defaults: [10],
    build: (damage) => ({ type: 'counter', damage }),
  },
  {
    name: 'Regen',
    label: '再生',
    group: 'ability',
    defaults: [8],
    build: (amount) => ({ type: 'regen', amount }),
  },
  {
    name: 'Poison',
    label: '毒',
    group: 'ability',
    defaults: [5],
    build: (damage) => ({ type: 'poison', damage }),
  },
  { name: 'Endure', label: '食いしばり', group: 'ability', defaults: [], build: () => ({ type: 'endure' }) },
  elementAbility('Physical', '物理', 'physical'),
  elementAbility('Fire', '炎', 'fire'),
  elementAbility('Ice', '氷', 'ice'),
  elementAbility('Thunder', '雷', 'thunder'),
];

/**
 * @param {string} name 大文字小文字は区別しない
 * @returns {AbilityDefinition | undefined}
 */
export function findAbility(name) {
  const lower = name.toLowerCase();
  return ABILITIES.find((ability) => ability.name.toLowerCase() === lower);
}

/**
 * ボタンが追記する、規定値つきの1語。例：`Poison5`、`Multi2:0.5`、`Fire`
 * @param {AbilityDefinition} ability
 * @returns {string}
 */
export function formatDefaultWord(ability) {
  return `${ability.name}${ability.defaults.join(':')}`;
}
