// @ts-check

/**
 * @typedef {import('../types.js').Build} Build
 * @typedef {import('../types.js').Challenge} Challenge
 * @typedef {import('../types.js').Enemy} Enemy
 * @typedef {import('../types.js').LogEntry} LogEntry
 * @typedef {import('../types.js').LoseReason} LoseReason
 * @typedef {import('../types.js').Actor} Actor
 * @typedef {import('../types.js').CombatantProfile} CombatantProfile
 * @typedef {import('../types.js').Effect} Effect
 * @typedef {import('../types.js').SimulationResult} SimulationResult
 */

/** ローテーションに周期スキルが無いときに使う属性 */
const DEFAULT_ELEMENT = 'physical';
/** 軽減率を書いていない属性は軽減しない */
const NO_REDUCTION = 0;
/** multiHit を取っていなければ、1ターンに1回、攻撃そのままの威力で殴る */
const SINGLE_HIT = 1;
const FULL_RATIO = 1;
/** 条件を満たさない、または conditional を取っていなければ倍率は掛からない */
const NEUTRAL_MULTIPLIER = 1;
/** 食いしばりで踏みとどまったときの HP */
const ENDURE_HP = 1;
/**
 * 小数の誤差で、ダメージの floor が1つ下がったり、条件の境界ちょうどで発動しなかったりするのを防ぐ。
 * 例：100 × (1 − 0.9) は 9.999… になり floor すると 9 に、100 × 0.57 は 56.999… になり HP 57 で発動しない
 */
const FLOAT_TOLERANCE = 1e-9;

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
    rotation: [],
    counter: 0,
    regen: 0,
    poison: 0,
    endure: false,
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
    case 'element':
      profile.rotation.push(effect.element);
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
  }
}

/**
 * 勝敗の判定と画面のステータス表示の両方から使う。計算を二重に書くと、表示と判定がずれるため
 * @param {Build} build ツリーの定義順。周期スキルはこの順でローテーションに入る
 * @returns {CombatantProfile}
 */
export function createProfile(build) {
  const profile = emptyProfile({});
  for (const node of build) {
    for (const effect of node.effects) {
      applyEffect(profile, effect);
    }
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

/**
 * 条件は1発ごとに、その時点の HP で判定する。反撃で HP が減ると、同じターンの次の1発から効く
 * @param {CombatantProfile} profile
 * @param {number} hp
 * @returns {number}
 */
function conditionalMultiplier(profile, hp) {
  let multiplier = NEUTRAL_MULTIPLIER;
  for (const conditional of profile.conditionals) {
    if (hp <= profile.maxHp * conditional.hpRatioAtMost + FLOAT_TOLERANCE) {
      multiplier *= conditional.damageMultiplier;
    }
  }
  return multiplier;
}

/**
 * @param {number} value
 * @param {number} defense
 * @returns {number}
 */
function damageTaken(value, defense) {
  return Math.max(0, value - defense);
}

/**
 * 戦闘中に変わる状態。profile は総当たりで使い回せるよう、戦闘中に書き換えない
 * @typedef {{ actor: Actor, profile: CombatantProfile, hp: number, endured: boolean }} Fighter
 */

/**
 * @param {Actor} actor
 * @param {CombatantProfile} profile
 * @returns {Fighter}
 */
function createFighter(actor, profile) {
  return { actor, profile, hp: profile.maxHp, endured: false };
}

/**
 * HP を減らす処理はすべてここを通す。致死時の能力（食いしばり）を1か所で扱うため
 * @param {Fighter} target
 * @param {number} damage
 * @returns {boolean} 食いしばりで踏みとどまったら true
 */
function takeDamage(target, damage) {
  target.hp = Math.max(0, target.hp - damage);
  if (target.hp === 0 && target.profile.endure && !target.endured) {
    target.hp = ENDURE_HP;
    target.endured = true;
    return true;
  }
  return false;
}

/**
 * @param {LogEntry[]} log
 * @param {Fighter} target
 * @param {number} turn
 * @param {boolean} endured
 */
function logEndure(log, target, turn, endured) {
  if (endured) {
    log.push({ type: 'endure', actor: target.actor, turn, hp: target.hp });
  }
}

/**
 * 周期スキルを発動してから、連撃の回数だけ通常攻撃する。1発ごとに相手の反撃を受ける
 * @param {Fighter} attacker
 * @param {Fighter} defender
 * @param {number} turn
 * @param {LogEntry[]} log
 * @returns {boolean} どちらかの HP が0になったら true
 */
function act(attacker, defender, turn, log) {
  const { rotation } = attacker.profile;
  const element = rotation.length === 0 ? DEFAULT_ELEMENT : rotation[(turn - 1) % rotation.length];
  const reduction = defender.profile.resistances[element] ?? NO_REDUCTION;

  for (let hit = 0; hit < attacker.profile.hits; hit++) {
    const raw =
      attacker.profile.attack *
      attacker.profile.ratio *
      (1 - reduction) *
      conditionalMultiplier(attacker.profile, attacker.hp);
    const damage = damageTaken(Math.floor(raw + FLOAT_TOLERANCE), defender.profile.defense);
    const endured = takeDamage(defender, damage);
    log.push({ type: 'hit', actor: attacker.actor, turn, element, damage, targetHp: defender.hp });
    logEndure(log, defender, turn, endured);
    if (defender.hp === 0) {
      return true;
    }

    if (defender.profile.counter > 0) {
      const counterDamage = damageTaken(defender.profile.counter, attacker.profile.defense);
      const counterEndured = takeDamage(attacker, counterDamage);
      log.push({ type: 'counter', actor: defender.actor, turn, damage: counterDamage, targetHp: attacker.hp });
      logEndure(log, attacker, turn, counterEndured);
      if (attacker.hp === 0) {
        return true;
      }
    }
  }
  return false;
}

/**
 * @param {Fighter} fighter
 * @param {number} turn
 * @param {LogEntry[]} log
 */
function regenerate(fighter, turn, log) {
  const healed = Math.min(fighter.profile.regen, fighter.profile.maxHp - fighter.hp);
  if (healed > 0) {
    fighter.hp += healed;
    log.push({ type: 'regen', actor: fighter.actor, turn, amount: healed, hp: fighter.hp });
  }
}

/**
 * @param {Fighter} source
 * @param {Fighter} target
 * @param {number} turn
 * @param {LogEntry[]} log
 * @returns {boolean} 相手の HP が0になったら true
 */
function poison(source, target, turn, log) {
  if (source.profile.poison === 0) {
    return false;
  }
  const endured = takeDamage(target, source.profile.poison);
  log.push({ type: 'poison', actor: source.actor, turn, damage: source.profile.poison, targetHp: target.hp });
  logEndure(log, target, turn, endured);
  return target.hp === 0;
}

/**
 * ビルドと敵1体から勝敗を決める。乱数を使わないので、同じ入力なら必ず同じ結果になる。
 * 1ターンは ターン開始（再生）→ 味方の行動 → 敵の行動 → ターン終了（毒）の順で、どれも味方が先
 * @param {Build} build 取得済みノード。起点を含み、ツリーの定義順に並べる
 * @param {Enemy} enemy
 * @returns {SimulationResult}
 */
export function simulate(build, enemy) {
  const player = createFighter('player', createProfile(build));
  const boss = createFighter('boss', createEnemyProfile(enemy));
  /** @type {LogEntry[]} */
  const log = [];

  /**
   * ボスの HP が0なら、味方の HP によらず勝ち
   * @param {number} turn
   * @returns {SimulationResult}
   */
  const finish = (turn) => {
    /** @type {LoseReason | null} */
    const loseReason = boss.hp === 0 ? null : player.hp === 0 ? 'defeated' : 'turnLimit';
    return {
      result: loseReason === null ? 'win' : 'lose',
      log,
      summary: {
        turns: turn,
        bossHp: boss.hp,
        playerHp: player.hp,
        playerMaxHp: player.profile.maxHp,
        bossMaxHp: boss.profile.maxHp,
        loseReason,
      },
    };
  };

  for (let turn = 1; turn <= enemy.turnLimit; turn++) {
    regenerate(player, turn, log);
    regenerate(boss, turn, log);
    if (act(player, boss, turn, log) || act(boss, player, turn, log)) {
      return finish(turn);
    }
    if (poison(player, boss, turn, log) || poison(boss, player, turn, log)) {
      return finish(turn);
    }
  }

  log.push({ type: 'turnLimit', turn: enemy.turnLimit });
  return finish(enemy.turnLimit);
}

/**
 * お題の敵それぞれと戦った結果を、敵の順に全員分返す。結果の画面で敵ごとの勝敗を並べるため
 * @param {Build} build
 * @param {Challenge} challenge
 * @returns {SimulationResult[]}
 */
export function simulateChallenge(build, challenge) {
  return challenge.enemies.map((enemy) => simulate(build, enemy));
}

/**
 * すべての敵に勝てばクリア。総当たりで何度も呼ぶので、1体に負けた時点で残りの敵は判定しない
 * @param {Build} build
 * @param {Challenge} challenge
 * @returns {boolean}
 */
export function clearsChallenge(build, challenge) {
  return challenge.enemies.every((enemy) => simulate(build, enemy).result === 'win');
}
