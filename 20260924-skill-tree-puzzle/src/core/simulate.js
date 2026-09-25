// @ts-check

/**
 * @typedef {import('../types.js').Build} Build
 * @typedef {import('../types.js').Challenge} Challenge
 * @typedef {import('../types.js').ElementId} ElementId
 * @typedef {import('../types.js').LogEntry} LogEntry
 * @typedef {import('../types.js').LoseReason} LoseReason
 * @typedef {import('../types.js').PlayerProfile} PlayerProfile
 * @typedef {import('../types.js').SimulationResult} SimulationResult
 */

/** 属性ノードを取らなくても使える属性 */
const DEFAULT_ELEMENT = 'physical';
/** 軽減率を書いていない属性は軽減しない */
const NO_REDUCTION = 0;
/** multiHit を取っていなければ、1ターンに1回、攻撃そのままの威力で殴る */
const SINGLE_HIT = 1;
const FULL_RATIO = 1;
/** 条件を満たさない、または conditional を取っていなければ倍率は掛からない */
const NEUTRAL_MULTIPLIER = 1;
/**
 * 小数の誤差で、ダメージの floor が1つ下がったり、条件の境界ちょうどで発動しなかったりするのを防ぐ。
 * 例：100 × (1 − 0.9) は 9.999… になり floor すると 9 に、100 × 0.57 は 56.999… になり HP 57 で発動しない
 */
const FLOAT_TOLERANCE = 1e-9;

/**
 * 勝敗の判定と画面のステータス表示の両方から使う。計算を二重に書くと、表示と判定がずれるため
 * @param {Build} build
 * @returns {PlayerProfile}
 */
export function createProfile(build) {
  /** @type {PlayerProfile} */
  const profile = {
    maxHp: 0,
    attack: 0,
    defense: 0,
    hits: SINGLE_HIT,
    ratio: FULL_RATIO,
    conditionals: [],
    elements: new Set([DEFAULT_ELEMENT]),
  };
  for (const node of build) {
    for (const effect of node.effects) {
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
          profile.elements.add(effect.element);
          break;
      }
    }
  }
  return profile;
}

/**
 * 使える属性のうち、お題の軽減率が最も低いものを選ぶ。属性ノードを取って弱くなることはない
 * @param {Set<ElementId>} elements
 * @param {Challenge['resistances']} resistances
 * @returns {{ element: ElementId, reduction: number }}
 */
function chooseElement(elements, resistances) {
  /** @type {{ element: ElementId, reduction: number } | null} */
  let best = null;
  for (const element of elements) {
    const reduction = resistances[element] ?? NO_REDUCTION;
    if (best === null || reduction < best.reduction) {
      best = { element, reduction };
    }
  }
  // elements には常に DEFAULT_ELEMENT が入っているので、ここで null にはならない
  return /** @type {{ element: ElementId, reduction: number }} */ (best);
}

/**
 * 条件は1発ごとに、その時点の HP で判定する。反撃で HP が減ると、同じターンの次の1発から効く
 * @param {PlayerProfile} profile
 * @param {number} playerHp
 * @returns {number}
 */
function conditionalMultiplier(profile, playerHp) {
  let multiplier = NEUTRAL_MULTIPLIER;
  for (const conditional of profile.conditionals) {
    if (playerHp <= profile.maxHp * conditional.hpRatioAtMost + FLOAT_TOLERANCE) {
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
 * ビルドとお題から勝敗を決める。乱数を使わないので、同じ入力なら必ず同じ結果になる
 * @param {Build} build 取得済みノード。起点を含む（基礎ステータスは起点の効果で持つ）
 * @param {Challenge} challenge
 * @returns {SimulationResult}
 */
export function simulate(build, challenge) {
  const profile = createProfile(build);
  const { element, reduction } = chooseElement(profile.elements, challenge.resistances);
  /** @type {LogEntry[]} */
  const log = [];
  let bossHp = challenge.hp;
  let playerHp = profile.maxHp;

  /**
   * @param {number} turn
   * @param {LoseReason | null} loseReason
   * @returns {SimulationResult}
   */
  const finish = (turn, loseReason) => ({
    result: loseReason === null ? 'win' : 'lose',
    log,
    summary: { turns: turn, bossHp, playerHp, loseReason },
  });

  for (let turn = 1; turn <= challenge.turnLimit; turn++) {
    for (let hit = 0; hit < profile.hits; hit++) {
      const raw =
        profile.attack * profile.ratio * (1 - reduction) * conditionalMultiplier(profile, playerHp);
      const damage = Math.floor(raw + FLOAT_TOLERANCE);
      bossHp = Math.max(0, bossHp - damage);
      log.push({ type: 'playerHit', turn, element, damage, bossHp });
      if (bossHp === 0) {
        return finish(turn, null);
      }

      if (challenge.counter > 0) {
        const counterDamage = damageTaken(challenge.counter, profile.defense);
        playerHp = Math.max(0, playerHp - counterDamage);
        log.push({ type: 'counter', turn, damage: counterDamage, playerHp });
        if (playerHp === 0) {
          return finish(turn, 'defeated');
        }
      }
    }

    const attackDamage = damageTaken(challenge.attack, profile.defense);
    playerHp = Math.max(0, playerHp - attackDamage);
    log.push({ type: 'bossAttack', turn, damage: attackDamage, playerHp });
    if (playerHp === 0) {
      return finish(turn, 'defeated');
    }
  }

  log.push({ type: 'turnLimit', turn: challenge.turnLimit });
  return finish(challenge.turnLimit, 'turnLimit');
}
