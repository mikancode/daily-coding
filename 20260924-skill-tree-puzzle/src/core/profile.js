// @ts-check
// ビルド・敵の能力を、戦う側ごとの集計（CombatantProfile）にまとめる。
// 勝敗の判定と画面のステータス表示が、同じ集計を使うためにここへ置く

/**
 * @typedef {import('../types.js').Build} Build
 * @typedef {import('../types.js').Enemy} Enemy
 * @typedef {import('../types.js').CombatantProfile} CombatantProfile
 * @typedef {import('../types.js').Effect} Effect
 */

/** multiHit を取っていなければ、1ターンに1回、攻撃そのままの威力で殴る */
const SINGLE_HIT = 1;
const FULL_RATIO = 1;

/**
 * @param {CombatantProfile['resistances']} resistances
 * @returns {CombatantProfile}
 */
function emptyProfile(resistances) {
  return {
    maxHp: 0,
    attack: 0,
    defense: 0,
    hits: SINGLE_HIT,
    ratio: FULL_RATIO,
    conditionals: [],
    tempos: [],
    rotation: [],
    counter: 0,
    regen: 0,
    poison: 0,
    endure: false,
    drain: 0,
    rage: 0,
    pierce: false,
    armorBreak: 0,
    mark: 0,
    resistances,
  };
}

/**
 * 敵と味方で同じ集計を通す。能力の効き方が両者でずれないようにするため
 * @param {CombatantProfile} profile
 * @param {Effect} effect
 */
function applyEffect(profile, effect) {
  switch (effect.type) {
    case 'stat':
      if (effect.stat === 'hp') profile.maxHp += effect.amount;
      if (effect.stat === 'attack') profile.attack += effect.amount;
      if (effect.stat === 'defense') profile.defense += effect.amount;
      break;
    case 'multiHit':
      // 分割の重ねがけ。2回分割を2つ取れば4回になる
      profile.hits *= effect.hits;
      profile.ratio *= effect.ratio;
      break;
    case 'conditional':
      profile.conditionals.push(effect);
      break;
    case 'tempo':
      profile.tempos.push(effect);
      break;
    case 'element':
    case 'charge':
    case 'burst':
      profile.rotation.push(effect);
      break;
    case 'counter':
      profile.counter += effect.damage;
      break;
    case 'regen':
      profile.regen += effect.amount;
      break;
    case 'poison':
      profile.poison += effect.damage;
      break;
    case 'endure':
      profile.endure = true;
      break;
    case 'drain':
      profile.drain += effect.ratio;
      break;
    case 'rage':
      profile.rage += effect.amount;
      break;
    case 'pierce':
      profile.pierce = true;
      break;
    case 'armorBreak':
      profile.armorBreak += effect.amount;
      break;
    case 'mark':
      profile.mark += effect.amount;
      break;
  }
}

/**
 * 勝敗の判定と画面のステータス表示の両方から使う。計算を二重に書くと、表示と判定がずれるため
 * @param {Build} build ツリーの定義順。周期スキルはこの順でローテーションに入る
 * @param {readonly Effect[]} [rewards] 連戦で獲得した報酬。倒した順にビルドの後ろへ足す
 * @returns {CombatantProfile}
 */
export function createProfile(build, rewards = []) {
  const profile = emptyProfile({});
  for (const node of build) {
    for (const effect of node.effects) {
      applyEffect(profile, effect);
    }
  }
  for (const effect of rewards) {
    applyEffect(profile, effect);
  }
  return profile;
}

/**
 * @param {Enemy} enemy
 * @returns {CombatantProfile}
 */
export function createEnemyProfile(enemy) {
  const profile = emptyProfile(enemy.resistances);
  profile.maxHp = enemy.hp;
  profile.attack = enemy.attack;
  profile.defense = enemy.defense;
  for (const effect of enemy.abilities) {
    applyEffect(profile, effect);
  }
  return profile;
}
