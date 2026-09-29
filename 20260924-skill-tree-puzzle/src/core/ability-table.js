// @ts-check

/**
 * @typedef {import('../types.js').AbilityDefinition} AbilityDefinition
 * @typedef {import('../types.js').Effect} Effect
 */

/** ステータスの規定値は、ボタン1回ぶんの増分でもある */
const HP_STEP = 10;
const ATTACK_STEP = 1;
const DEFENSE_STEP = 1;
/** 連撃の回数はターンごとにログを積むので、大きすぎる値で画面が固まらないよう上限を置く */
const MAX_MULTI_HITS = 100;

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
 * 能力の表。デバッグ入力の語・ボタンの追記値・パーサーの規定値と、ツリーのノードの効果・表示名は、すべてここから作る。
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
    check: ([hits]) =>
      Number.isInteger(hits) && hits >= 1 && hits <= MAX_MULTI_HITS
        ? null
        : `連撃の回数は1以上${MAX_MULTI_HITS}以下の整数にしてください`,
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

/**
 * ノードに出す短い名前。例：`攻撃+3`、`雷属性`、`連撃`、`連撃3`。
 * 能力は規定値と違うときだけ第1引数を添える。ノードの幅に収めるため、第2引数は出さない
 * @param {AbilityDefinition} ability
 * @param {readonly number[]} args 規定値で埋めたあとの引数
 * @returns {string}
 */
function formatLabel(ability, args) {
  switch (ability.group) {
    case 'stat':
      return `${ability.label}+${args[0]}`;
    case 'element':
      return `${ability.label}属性`;
    case 'ability':
      return args.every((arg, index) => arg === ability.defaults[index])
        ? ability.label
        : `${ability.label}${args[0]}`;
  }
}

/**
 * 英語名と引数から、効果と表示名を作る。省いた引数は規定値で埋める。
 * ツリーの定義から呼ぶので、不正な指定は読み込み時に気付けるよう例外にする
 * @param {string} name
 * @param {readonly number[]} [args]
 * @returns {{ effect: Effect, label: string }}
 */
export function resolveAbility(name, args = []) {
  const ability = findAbility(name);
  if (ability === undefined) {
    throw new Error(`知らない能力です: ${name}`);
  }
  if (args.length > ability.defaults.length) {
    throw new Error(`${ability.name} の引数は最大 ${ability.defaults.length} 個です`);
  }
  const filled = ability.defaults.map((value, index) => args[index] ?? value);
  const problem = ability.check?.(filled) ?? null;
  if (problem !== null) {
    throw new Error(problem);
  }
  return { effect: ability.build(...filled), label: formatLabel(ability, filled) };
}
