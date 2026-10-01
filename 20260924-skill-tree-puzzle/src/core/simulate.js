// @ts-check
// ビルドと敵1体の戦闘を1ターンずつ進め、ログと勝敗を返す。
// 戦闘中に変わる状態（Fighter）はこのファイルの中に閉じる

import { createEnemyProfile, createProfile } from './profile.js';

/**
 * @typedef {import('../types.js').Build} Build
 * @typedef {import('../types.js').Enemy} Enemy
 * @typedef {import('../types.js').LogEntry} LogEntry
 * @typedef {import('../types.js').LoseReason} LoseReason
 * @typedef {import('../types.js').Actor} Actor
 * @typedef {import('../types.js').CombatantProfile} CombatantProfile
 * @typedef {import('../types.js').ElementId} ElementId
 * @typedef {import('../types.js').TargetChanges} TargetChanges
 * @typedef {import('../types.js').Effect} Effect
 * @typedef {import('../types.js').SimulationResult} SimulationResult
 */

/** ローテーションに周期スキルが無いときに使う属性 */
const DEFAULT_ELEMENT = 'physical';
/** 軽減率を書いていない属性は軽減しない */
const NO_REDUCTION = 0;
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
 * @param {CombatantProfile} profile
 * @param {number} turn
 * @returns {number}
 */
function tempoMultiplier(profile, turn) {
  let multiplier = NEUTRAL_MULTIPLIER;
  for (const tempo of profile.tempos) {
    if (turn % tempo.every === 0) {
      multiplier *= tempo.damageMultiplier;
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
 * @typedef {{
 *   actor: Actor,
 *   profile: CombatantProfile,
 *   hp: number,
 *   endured: boolean,
 *   attackBonus: number,
 *   defenseDown: number,
 *   marks: number,
 * }} Fighter
 */

/**
 * @param {Actor} actor
 * @param {CombatantProfile} profile
 * @returns {Fighter}
 */
function createFighter(actor, profile) {
  return { actor, profile, hp: profile.maxHp, endured: false, attackBonus: 0, defenseDown: 0, marks: 0 };
}

/**
 * 逆上で上がった分を含む、今の攻撃
 * @param {Fighter} fighter
 * @returns {number}
 */
function currentAttack(fighter) {
  return fighter.profile.attack + fighter.attackBonus;
}

/**
 * 破甲で下がった分を含む、今の防御。0 未満にはしない
 * @param {Fighter} fighter
 * @returns {number}
 */
function currentDefense(fighter) {
  return Math.max(0, fighter.profile.defense - fighter.defenseDown);
}

/**
 * 攻撃側が貫通を持っていれば、防御を引かない
 * @param {Fighter} attacker
 * @param {Fighter} target
 * @returns {number}
 */
function defenseAgainst(attacker, target) {
  return attacker.profile.pierce ? 0 : currentDefense(target);
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
 * @param {Fighter} fighter
 * @param {number} amount
 * @returns {number} 実際に回復した量。最大 HP は超えない
 */
function heal(fighter, amount) {
  const healed = Math.min(amount, fighter.profile.maxHp - fighter.hp);
  fighter.hp += healed;
  return healed;
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
 * 攻撃が当たった直後に、受けた側の状態を変える（逆上・破甲・刻印）
 * @param {Fighter} attacker
 * @param {Fighter} target
 * @returns {TargetChanges | undefined} 何も変わらなければ undefined
 */
function applyStrikeEffects(attacker, target) {
  /** @type {{ attack?: number, defense?: number, marks?: number }} */
  const changes = {};
  if (target.profile.rage > 0) {
    target.attackBonus += target.profile.rage;
    changes.attack = currentAttack(target);
  }
  if (attacker.profile.armorBreak > 0) {
    target.defenseDown += attacker.profile.armorBreak;
    changes.defense = currentDefense(target);
  }
  if (attacker.profile.mark > 0) {
    target.marks += attacker.profile.mark;
    changes.marks = target.marks;
  }
  return Object.keys(changes).length === 0 ? undefined : changes;
}

/**
 * 攻撃（通常攻撃の1発・反撃）を当てる。
 * 攻撃を当てた・受けたときの能力（吸収・逆上・破甲・刻印）はここで扱い、毒では起きないようにする。
 * 倒した1発では、戦闘が終わるので状態を変えない
 * @param {Fighter} attacker
 * @param {Fighter} target
 * @param {number} damage
 * @param {number} turn
 * @param {LogEntry[]} log
 * @param {(targetHp: number, changes: TargetChanges | undefined) => LogEntry} toEntry
 * @returns {boolean} 相手の HP が0になったら true
 */
function strike(attacker, target, damage, turn, log, toEntry) {
  const endured = takeDamage(target, damage);
  const changes = target.hp === 0 ? undefined : applyStrikeEffects(attacker, target);
  log.push(toEntry(target.hp, changes));
  logEndure(log, target, turn, endured);
  if (target.hp === 0) {
    return true;
  }
  const drained = heal(attacker, Math.floor(damage * attacker.profile.drain + FLOAT_TOLERANCE));
  if (drained > 0) {
    log.push({ type: 'drain', actor: attacker.actor, turn, amount: drained, hp: attacker.hp });
  }
  return false;
}

/**
 * ローテーションで今のターンの周期スキルを発動し、この行動の属性と倍率を決める。
 * 溜めと解放のターンは物理で殴る
 * @param {Fighter} attacker
 * @param {Fighter} defender
 * @param {number} turn
 * @param {LogEntry[]} log
 * @returns {{ element: ElementId, multiplier: number }}
 */
function useRotationSkill(attacker, defender, turn, log) {
  const { rotation } = attacker.profile;
  if (rotation.length === 0) {
    return { element: DEFAULT_ELEMENT, multiplier: NEUTRAL_MULTIPLIER };
  }
  const skill = rotation[(turn - 1) % rotation.length];
  switch (skill.type) {
    case 'element':
      return { element: skill.element, multiplier: NEUTRAL_MULTIPLIER };
    case 'charge': {
      // 同じ溜めは rotation.length ターンごとに回ってくる。初回は戦闘開始から数えるので、経過はそのターン数になる
      const elapsed = Math.min(turn, rotation.length);
      const multiplier = NEUTRAL_MULTIPLIER + skill.perTurn * elapsed;
      log.push({ type: 'charge', actor: attacker.actor, turn, multiplier });
      return { element: DEFAULT_ELEMENT, multiplier };
    }
    case 'burst': {
      const marks = defender.marks;
      defender.marks = 0;
      const multiplier = NEUTRAL_MULTIPLIER + skill.perMark * marks;
      log.push({ type: 'burst', actor: attacker.actor, turn, marks, multiplier });
      return { element: DEFAULT_ELEMENT, multiplier };
    }
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
  const { element, multiplier: skillMultiplier } = useRotationSkill(attacker, defender, turn, log);
  const reduction = defender.profile.resistances[element] ?? NO_REDUCTION;
  const tempo = tempoMultiplier(attacker.profile, turn);

  for (let hit = 0; hit < attacker.profile.hits; hit++) {
    const raw =
      currentAttack(attacker) *
      attacker.profile.ratio *
      (1 - reduction) *
      conditionalMultiplier(attacker.profile, attacker.hp) *
      tempo *
      skillMultiplier;
    const damage = damageTaken(Math.floor(raw + FLOAT_TOLERANCE), defenseAgainst(attacker, defender));
    const defeated = strike(attacker, defender, damage, turn, log, (targetHp, changes) => ({
      type: 'hit',
      actor: attacker.actor,
      turn,
      element,
      damage,
      targetHp,
      ...(tempo !== NEUTRAL_MULTIPLIER && { tempo }),
      ...(changes && { changes }),
    }));
    if (defeated) {
      return true;
    }

    if (defender.profile.counter > 0) {
      const counterDamage = damageTaken(defender.profile.counter, defenseAgainst(defender, attacker));
      const counterDefeated = strike(defender, attacker, counterDamage, turn, log, (targetHp, changes) => ({
        type: 'counter',
        actor: defender.actor,
        turn,
        damage: counterDamage,
        targetHp,
        ...(changes && { changes }),
      }));
      if (counterDefeated) {
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
  const healed = heal(fighter, fighter.profile.regen);
  if (healed > 0) {
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
 * @param {readonly Effect[]} [rewards] 連戦で獲得済みの報酬
 * @returns {SimulationResult}
 */
export function simulate(build, enemy, rewards = []) {
  const player = createFighter('player', createProfile(build, rewards));
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
