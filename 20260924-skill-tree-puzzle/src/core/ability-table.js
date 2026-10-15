// @ts-check
// 能力の表。入力の語・日本語名・引数の規定値・Effect の作り方を1か所に持ち、ツリーのノードとデバッグ入力の両方から使う

/**
 * @typedef {import('../types.js').AbilityDefinition} AbilityDefinition
 * @typedef {import('../types.js').Effect} Effect
 * @typedef {import('../types.js').MarkScalingTarget} MarkScalingTarget
 * @typedef {import('../types.js').PeriodDefinition} PeriodDefinition
 * @typedef {import('../types.js').TimedEffect} TimedEffect
 * @typedef {import('../types.js').TimedPeriod} TimedPeriod
 */

/** ステータスの規定値は、ボタン1回ぶんの増分でもある */
const HP_STEP = 10;
const ATTACK_STEP = 1;
const DEFENSE_STEP = 1;
/** 連撃の回数はターンごとにログを積むので、大きすぎる値で画面が固まらないよう上限を置く */
const MAX_MULTI_HITS = 100;
/** 根性が発動したときの HP。復活は、これより大きい HP に戻す。表示で根性と復活を呼び分けるのにも使う */
export const ENDURE_HP = 1;

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
 * 表の引数は数値だけなので、刻印で強まる能力は target ごとに1行ずつ置き、型は1つで共有する
 * @param {string} name @param {string} label @param {MarkScalingTarget} target @param {number} perMark
 * @returns {AbilityDefinition}
 */
const markScalingAbility = (name, label, target, perMark) => ({
  name,
  label,
  group: 'ability',
  defaults: [perMark],
  build: (amount) => ({ type: 'markScaling', target, perMark: amount }),
});

/**
 * 能力の表。デバッグ入力の語・ボタンの追記値・パーサーの規定値と、ツリーのノードの効果・表示名は、すべてここから作る。
 * ボタンはこの並び順に出る
 * @type {readonly AbilityDefinition[]}
 */
export const ABILITIES = [
  statAbility('HP', 'HP', 'hp', HP_STEP),
  statAbility('ATK', 'ATK', 'attack', ATTACK_STEP),
  statAbility('DEF', 'DEF', 'defense', DEFENSE_STEP),
  {
    name: 'Multi',
    label: '連撃',
    group: 'ability',
    defaults: [2, 0.6],
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
  { name: 'Endure', label: '根性', group: 'ability', defaults: [], build: () => ({ type: 'endure', hp: ENDURE_HP }) },
  {
    name: 'Revive',
    label: '復活',
    group: 'ability',
    defaults: [50],
    check: ([hp]) => (Number.isInteger(hp) && hp >= 1 ? null : '復活で戻す HP は1以上の整数にしてください'),
    build: (hp) => ({ type: 'endure', hp }),
  },
  {
    name: 'Drain',
    label: '吸収',
    group: 'ability',
    defaults: [0.5],
    check: ([ratio]) => (ratio > 0 ? null : '吸収の割合は0より大きくしてください'),
    build: (ratio) => ({ type: 'drain', ratio }),
  },
  {
    name: 'Rage',
    label: '逆上',
    group: 'ability',
    defaults: [2],
    build: (amount) => ({ type: 'rage', amount }),
  },
  { name: 'Pierce', label: '貫通', group: 'ability', defaults: [], build: () => ({ type: 'pierce' }) },
  {
    name: 'Break',
    label: '破甲',
    group: 'ability',
    defaults: [1],
    build: (amount) => ({ type: 'armorBreak', amount }),
  },
  {
    name: 'Tempo',
    label: '好機',
    group: 'ability',
    defaults: [2, 2],
    check: ([every]) =>
      Number.isInteger(every) && every >= 1 ? null : '好機のターンの間隔は1以上の整数にしてください',
    build: (every, damageMultiplier) => ({ type: 'tempo', every, damageMultiplier }),
  },
  {
    name: 'Mark',
    label: '刻印',
    group: 'ability',
    defaults: [1],
    build: (amount) => ({ type: 'mark', amount }),
  },
  {
    name: 'Charge',
    label: '溜め',
    group: 'ability',
    defaults: [0.5],
    build: (perTurn) => ({ type: 'charge', perTurn }),
  },
  {
    name: 'Burst',
    label: '解放',
    group: 'ability',
    defaults: [0.2, 0.5],
    check: ([, ratio]) => (ratio > 0 && ratio <= 1 ? null : '解放で使う割合は0より大きく1以下にしてください'),
    build: (perMark, ratio) => ({ type: 'burst', perMark, ratio }),
  },
  markScalingAbility('MarkPoison', '呪陣', 'poison', 2),
  markScalingAbility('MarkAtkDown', '縛陣', 'attackDown', 1),
  markScalingAbility('MarkDefDown', '砕陣', 'defenseDown', 1),
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
 * ボタンが追記する、規定値つきの1語。例：`Poison5`、`Multi2:0.6`、`Fire`
 * @param {AbilityDefinition} ability
 * @returns {string}
 */
export function formatDefaultWord(ability) {
  return `${ability.name}${ability.defaults.join(':')}`;
}

/**
 * ノードに出す短い名前。例：`ATK+3`、`雷属性`、`連撃`、`連撃3`。
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
 * 省いた引数を規定値で埋めて検査する。デバッグ入力とツリーの定義で、同じ規則を使うため
 * @param {AbilityDefinition} ability
 * @param {readonly number[]} args
 * @returns {{ args: number[] } | { reason: string }}
 */
export function fillArguments(ability, args) {
  if (ability.defaults.length === 0 && args.length > 0) {
    return { reason: `${ability.name} は引数を取りません` };
  }
  if (args.length > ability.defaults.length) {
    return { reason: `${ability.name} の引数は最大 ${ability.defaults.length} 個です` };
  }
  const filled = ability.defaults.map((value, index) => args[index] ?? value);
  const problem = ability.check?.(filled) ?? null;
  return problem === null ? { args: filled } : { reason: problem };
}

/**
 * 英語名と引数から、効果と表示名を作る。
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
  const filled = fillArguments(ability, args);
  if ('reason' in filled) {
    throw new Error(filled.reason);
  }
  return { effect: ability.build(...filled.args), label: formatLabel(ability, filled.args) };
}

/**
 * 時限能力の期間の表。デバッグ入力の語・ボタンの規定値は、ここから作る。ボタンはこの並び順に出る
 * @type {readonly PeriodDefinition[]}
 */
export const PERIODS = [
  { name: 'First', label: '最初のxT', defaults: [3], build: (turns) => ({ kind: 'first', turns }) },
  { name: 'From', label: 'xT目から', defaults: [3], build: (turn) => ({ kind: 'from', turn }) },
  { name: 'At', label: 'xT目だけ', defaults: [3], build: (turn) => ({ kind: 'at', turn }) },
  { name: 'Cycle', label: '周期でxT', defaults: [2], build: (turns) => ({ kind: 'rotation', turns }) },
  { name: 'Below', label: 'HPx%以下', defaults: [0.5], build: (ratio) => ({ kind: 'hpAtMost', ratio }) },
  { name: 'Revived', label: '復活後', defaults: [], build: () => ({ kind: 'revived' }) },
  { name: 'Marked', label: '印x個以上', defaults: [3], build: (count) => ({ kind: 'marksAtLeast', count }) },
];

/**
 * @param {string} name 大文字小文字は区別しない
 * @returns {PeriodDefinition | undefined}
 */
export function findPeriod(name) {
  const lower = name.toLowerCase();
  return PERIODS.find((period) => period.name.toLowerCase() === lower);
}

/**
 * ボタンが能力の語の前に付ける、規定値つきの期間の語。例：`First3`・`Revived`
 * @param {PeriodDefinition} period
 * @returns {string}
 */
export function formatDefaultPeriodWord(period) {
  return `${period.name}${period.defaults.join(':')}`;
}

/**
 * 期間の引数を検査する
 * @param {TimedPeriod} period
 * @returns {string | null} 不正なら理由
 */
function checkPeriod(period) {
  switch (period.kind) {
    case 'first':
    case 'rotation':
      return Number.isInteger(period.turns) && period.turns >= 1 ? null : '期間のターン数は1以上の整数にしてください';
    case 'from':
    case 'at':
      return Number.isInteger(period.turn) && period.turn >= 1 ? null : '期間のターン数は1以上の整数にしてください';
    case 'hpAtMost':
      return period.ratio > 0 && period.ratio < 1 ? null : '期間の HP の割合は0より大きく1より小さくしてください';
    case 'revived':
      return null;
    case 'marksAtLeast':
      return Number.isInteger(period.count) && period.count >= 1 ? null : '期間の刻印の数は1以上の整数にしてください';
  }
}

/**
 * 能力を期間で包む。包めない能力と、引数が範囲外の期間は理由を返す。
 * 包めるのは、途中で増減しても意味が通る能力だけ。
 * 最大 HP が途中で変わると今の HP との関係が決まらないので HP の加算を、
 * 1回だけ・ローテーションの順で決まる能力の意味が崩れるので根性・復活と周期スキルを、それぞれ包まない
 * @param {TimedPeriod} period
 * @param {Effect} effect
 * @returns {{ effect: TimedEffect } | { reason: string }}
 */
export function wrapTimed(period, effect) {
  const problem = checkPeriod(period);
  if (problem !== null) {
    return { reason: problem };
  }
  switch (effect.type) {
    case 'stat':
      return effect.stat === 'hp'
        ? { reason: 'HP の加算は期間で包めません' }
        : { effect: { type: 'timed', period, effect } };
    case 'endure':
      return { reason: '根性・復活は期間で包めません' };
    case 'element':
    case 'charge':
    case 'burst':
      return { reason: '周期スキルは期間で包めません' };
    case 'timed':
      return { reason: '期間を入れ子にはできません' };
    case 'multiHit':
    case 'conditional':
    case 'tempo':
    case 'counter':
    case 'regen':
    case 'poison':
    case 'drain':
    case 'rage':
    case 'pierce':
    case 'armorBreak':
    case 'mark':
    case 'markScaling':
      return { effect: { type: 'timed', period, effect } };
  }
}

/**
 * 敵の定義から呼ぶ。不正な指定は読み込み時に気付けるよう例外にする
 * @param {TimedPeriod} period
 * @param {Effect} effect
 * @returns {TimedEffect}
 */
export function timed(period, effect) {
  const wrapped = wrapTimed(period, effect);
  if ('reason' in wrapped) {
    throw new Error(wrapped.reason);
  }
  return wrapped.effect;
}
