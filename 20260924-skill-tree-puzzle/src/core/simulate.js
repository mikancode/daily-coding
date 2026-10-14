// @ts-check
// ビルドと敵1体の戦闘を1ターンずつ進め、ログと勝敗を返す。
// 戦闘中に変わる状態（Fighter）はこのファイルの中に閉じる

import { createEnemyProfile, createProfile, withEffects } from './profile.js';

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
 * @typedef {import('../types.js').TimedEffect} TimedEffect
 * @typedef {import('../types.js').TimedPeriod} TimedPeriod
 * @typedef {import('../types.js').RotationSkill} RotationSkill
 */

/** ローテーションに周期スキルが無いときに使う属性 */
const DEFAULT_ELEMENT = 'physical';
/** 軽減率を書いていない属性は軽減しない */
const NO_REDUCTION = 0;
/** 条件を満たさない、または conditional を取っていなければ倍率は掛からない */
const NEUTRAL_MULTIPLIER = 1;
/**
 * 小数の誤差で、ダメージの floor が1つ下がったり、条件の境界ちょうどで倍率が掛からなかったりするのを防ぐ。
 * 例：100 × (1 − 0.9) は 9.999… になり floor すると 9 に、100 × 0.57 は 56.999… になり HP 57 で掛からない
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
 * 時限能力1つぶんの、戦闘中の記録。
 * 同じ定義の時限能力を2つ持っても別々に数えるよう、集計の中の位置ごとに持つ
 * @typedef {{
 *   effect: TimedEffect,
 *   rotationIndex: number | null,
 *   activatedAt: number | null,
 *   active: boolean,
 * }} TimedSlot
 */

/**
 * 戦闘中に変わる状態。base は総当たりで使い回せるよう、戦闘中に書き換えない。
 * profile は、base にそのターンに有効な時限能力の中身を足したもの。時限能力が無ければ base そのもの
 * @typedef {{
 *   actor: Actor,
 *   base: CombatantProfile,
 *   profile: CombatantProfile,
 *   hp: number,
 *   endured: boolean,
 *   attackBonus: number,
 *   defenseDown: number,
 *   marks: number,
 *   timedSlots: TimedSlot[],
 * }} Fighter
 */

/**
 * @param {Actor} actor
 * @param {CombatantProfile} profile
 * @returns {Fighter}
 */
function createFighter(actor, profile) {
  /** @type {TimedSlot[]} */
  const timedSlots = profile.timed.map((effect) => ({ effect, rotationIndex: null, activatedAt: null, active: false }));
  profile.rotation.forEach((skill, rotationIndex) => {
    if (skill.type === 'timed') {
      timedSlots.push({ effect: skill, rotationIndex, activatedAt: null, active: false });
    }
  });
  return {
    actor,
    base: profile,
    profile,
    hp: profile.maxHp,
    endured: false,
    attackBonus: 0,
    defenseDown: 0,
    marks: 0,
    timedSlots,
  };
}

/**
 * @param {readonly RotationSkill[]} rotation
 * @param {number} turn
 * @returns {number | null} ローテーションが空なら null
 */
function rotationIndexAt(rotation, turn) {
  return rotation.length === 0 ? null : (turn - 1) % rotation.length;
}

/**
 * @param {TimedPeriod} period
 * @param {number} turn
 * @param {number | null} activatedAt rotation：ローテーションで最後に回ってきたターン。
 *   hpAtMost・revived：条件を満たしたターン。ほかの期間では使わない
 * @returns {boolean}
 */
function isTimedActive(period, turn, activatedAt) {
  switch (period.kind) {
    case 'first':
      return turn <= period.turns;
    case 'from':
      return turn >= period.turn;
    case 'at':
      return turn === period.turn;
    case 'rotation':
      return activatedAt !== null && turn < activatedAt + period.turns;
    case 'hpAtMost':
    case 'revived':
      return activatedAt !== null;
  }
}

/**
 * 有効な時限能力の中身を base に足して、集計を作り直す
 * @param {Fighter} fighter
 */
function refreshProfile(fighter) {
  const effects = fighter.timedSlots.filter((slot) => slot.active).map((slot) => slot.effect.effect);
  fighter.profile = withEffects(fighter.base, effects);
}

/**
 * ターン開始時に、時限能力が有効かを決め直す。
 * ローテーションの時限能力は、回ってきたターンから有効になる。有効な間に再び回ってきたら、そのターンから数え直す。
 * 効き方が変わったときだけ、そのターンの集計を作り直す
 * @param {Fighter} fighter
 * @param {number} turn
 * @param {LogEntry[]} log
 */
function updateTimed(fighter, turn, log) {
  if (fighter.timedSlots.length === 0) {
    return;
  }
  const rotationIndex = rotationIndexAt(fighter.base.rotation, turn);
  let changed = false;
  for (const slot of fighter.timedSlots) {
    const triggered = slot.rotationIndex !== null && slot.rotationIndex === rotationIndex;
    if (triggered) {
      slot.activatedAt = turn;
    }
    const active = isTimedActive(slot.effect.period, turn, slot.activatedAt);
    if (active !== slot.active) {
      slot.active = active;
      changed = true;
      log.push({ type: 'timed', actor: fighter.actor, turn, effect: slot.effect, state: active ? 'start' : 'end' });
    } else if (triggered) {
      log.push({ type: 'timed', actor: fighter.actor, turn, effect: slot.effect, state: 'renew' });
    }
  }
  if (changed) {
    refreshProfile(fighter);
  }
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
 * HP を減らす処理はすべてここを通す。致死時の能力（根性・復活）を1か所で扱うため
 * @param {Fighter} target
 * @param {number} damage
 * @returns {boolean} 根性・復活が発動したら true
 */
function takeDamage(target, damage) {
  target.hp = Math.max(0, target.hp - damage);
  if (target.hp === 0 && target.profile.endureHp > 0 && !target.endured) {
    target.hp = Math.min(target.profile.endureHp, target.profile.maxHp);
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
 * @param {TimedPeriod} period
 * @param {Fighter} fighter
 * @param {boolean} endured
 * @returns {boolean} ダメージの直後に満たす開始条件なら、満たしたかどうか。ほかの期間は false
 */
function meetsDamageCondition(period, fighter, endured) {
  switch (period.kind) {
    case 'hpAtMost':
      return fighter.hp <= fighter.profile.maxHp * period.ratio + FLOAT_TOLERANCE;
    case 'revived':
      return endured;
    default:
      return false;
  }
}

/**
 * ダメージを受けた直後の処理。根性・復活をログに出し、HP・復活の条件を満たした時限能力を有効にする。
 * 有効になった能力は、同じターンの次の1発から効く。一度有効になったら、回復しても切れない。
 * HP が0で戦闘が終わるときは何もしない
 * @param {LogEntry[]} log
 * @param {Fighter} target
 * @param {number} turn
 * @param {boolean} endured
 */
function afterDamage(log, target, turn, endured) {
  if (endured) {
    log.push({ type: 'endure', actor: target.actor, turn, hp: target.hp });
  }
  if (target.hp === 0) {
    return;
  }
  let changed = false;
  for (const slot of target.timedSlots) {
    if (slot.activatedAt === null && meetsDamageCondition(slot.effect.period, target, endured)) {
      slot.activatedAt = turn;
      slot.active = true;
      changed = true;
      log.push({ type: 'timed', actor: target.actor, turn, effect: slot.effect, state: 'start' });
    }
  }
  if (changed) {
    refreshProfile(target);
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
  afterDamage(log, target, turn, endured);
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
 * 溜め・解放・時限能力のターンは物理で殴る。ローテーションの時限能力が有効になるのはターン開始（updateTimed）で扱う
 * @param {Fighter} attacker
 * @param {Fighter} defender
 * @param {number} turn
 * @param {LogEntry[]} log
 * @returns {{ element: ElementId, multiplier: number }}
 */
function useRotationSkill(attacker, defender, turn, log) {
  const { rotation } = attacker.base;
  const index = rotationIndexAt(rotation, turn);
  if (index === null) {
    return { element: DEFAULT_ELEMENT, multiplier: NEUTRAL_MULTIPLIER };
  }
  const skill = rotation[index];
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
    case 'timed':
      return { element: DEFAULT_ELEMENT, multiplier: NEUTRAL_MULTIPLIER };
  }
}

/**
 * 周期スキルを発動してから、連撃の回数だけ通常攻撃する。1発ごとに相手の反撃を受ける。
 * 連撃の回数は行動の最初に決め、途中で時限能力が有効になっても変えない。
 * 威力・防御・反撃は1発ごとに今の集計を読むので、有効になった能力は次の1発から効く
 * @param {Fighter} attacker
 * @param {Fighter} defender
 * @param {number} turn
 * @param {LogEntry[]} log
 * @returns {boolean} どちらかの HP が0になったら true
 */
function act(attacker, defender, turn, log) {
  const { element, multiplier: skillMultiplier } = useRotationSkill(attacker, defender, turn, log);
  const reduction = defender.profile.resistances[element] ?? NO_REDUCTION;
  const { hits } = attacker.profile;

  for (let hit = 0; hit < hits; hit++) {
    const tempo = tempoMultiplier(attacker.profile, turn);
    const raw =
      currentAttack(attacker) *
      attacker.profile.ratio *
      (1 - reduction) *
      conditionalMultiplier(attacker.profile, attacker.hp) *
      tempo *
      skillMultiplier;
    const damage = damageTaken(Math.floor(raw + FLOAT_TOLERANCE), defenseAgainst(attacker, defender));
    // 反撃はこの1発への応答なので、この1発で有効になった反撃は返さない（逆上と同じく、次の1発から効く）
    const { counter } = defender.profile;
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

    if (counter > 0) {
      const counterDamage = damageTaken(counter, defenseAgainst(defender, attacker));
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
  afterDamage(log, target, turn, endured);
  return target.hp === 0;
}

/**
 * ビルドと敵1体から勝敗を決める。乱数を使わないので、同じ入力なら必ず同じ結果になる。
 * 1ターンは ターン開始（時限能力の切り替え・再生）→ 味方の行動 → 敵の行動 → ターン終了（毒）の順で、どれも味方が先
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
    updateTimed(player, turn, log);
    updateTimed(boss, turn, log);
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
