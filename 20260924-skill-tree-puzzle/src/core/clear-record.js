// @ts-check
// お題のクリアの判定と、クリアの記録（最少 pt・最速ターン・別解の3軸）の書き出し・読み込み・更新、最良値を開示するか・★の判定。localStorage には触らない

/**
 * @typedef {import('../types.js').Challenge} Challenge
 * @typedef {import('../types.js').ClearRecord} ClearRecord
 * @typedef {import('../types.js').ClearResult} ClearResult
 * @typedef {import('../types.js').NodeId} NodeId
 * @typedef {import('../types.js').RestoredRecord} RestoredRecord
 * @typedef {import('../types.js').SequenceProgress} SequenceProgress
 * @typedef {import('../types.js').SimulationResult} SimulationResult
 */

/** 別解の★に要る、能力を共有しない組の数 */
export const ALTERNATIVE_SET_COUNT = 2;

/** @type {ClearRecord} */
export const EMPTY_RECORD = { best: null, turns: null, abilitySets: [] };

/**
 * 「挑戦」の結果から判定する。敵が複数いるお題は、全員に勝てばクリア
 * @param {readonly SimulationResult[]} results お題の敵全員と戦った結果
 * @returns {boolean}
 */
export function clearsByResults(results) {
  return results.length > 0 && results.every((result) => result.result === 'win');
}

/**
 * 連戦は、最後の1体を倒したときにクリア
 * @param {Challenge} challenge
 * @param {SequenceProgress} progress
 * @returns {boolean}
 */
export function clearsBySequence(challenge, progress) {
  return progress.defeated.length === challenge.enemies.length;
}

/**
 * クリアするたびに pt の記録を書くので、pt の記録があればクリア済み
 * @param {ClearRecord} record
 * @returns {boolean}
 */
export function isCleared(record) {
  return record.best !== null;
}

/**
 * 最速ターンの軸で比べる値。敵ごとのターン数を合計する
 * @param {readonly SimulationResult[]} results
 * @returns {number}
 */
export function totalTurns(results) {
  return results.reduce((sum, result) => sum + result.summary.turns, 0);
}

/**
 * 記録した時点の最少 pt・最速ターンを一緒に書き出す。お題の調整で変わったとき、古い記録で★が付かないよう軸ごとに見分けるため
 * @param {ClearRecord} record
 * @param {Challenge} challenge
 * @returns {string}
 */
export function serializeRecord(record, challenge) {
  return JSON.stringify({
    best: record.best,
    minimum: challenge.minimumPoints,
    turns: record.turns,
    minimumTurns: challenge.minimumTurns ?? null,
    abilitySets: record.abilitySets,
  });
}

/**
 * 軸ごとに確かめ、今のお題に合わない軸だけを捨てる。
 * 最少 pt・最速ターンは記録した時点の値が今と違えば、能力の組は今のツリーに無い能力ノードを含めば捨てる。
 * 形が JSON のオブジェクトでなければ、記録を丸ごと捨てる（invalid）
 * @param {string | null} raw localStorage から読んだ値。記録が無ければ null
 * @param {Challenge} challenge
 * @param {ReadonlySet<NodeId>} abilityNodeIds 今のツリーの能力ノードの ID
 * @returns {RestoredRecord}
 */
export function restoreRecord(raw, challenge, abilityNodeIds) {
  if (raw === null) {
    return { status: 'none' };
  }
  /** @type {unknown} */
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { status: 'invalid' };
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { status: 'invalid' };
  }
  const { best, minimum, turns, minimumTurns, abilitySets } =
    /** @type {{ best?: unknown, minimum?: unknown, turns?: unknown, minimumTurns?: unknown, abilitySets?: unknown }} */ (parsed);
  return {
    status: 'recorded',
    record: {
      best: restoreBest(best, minimum, challenge.minimumPoints),
      turns: challenge.minimumTurns === undefined ? null : restoreBest(turns, minimumTurns, challenge.minimumTurns),
      abilitySets: Array.isArray(abilitySets)
        ? abilitySets.filter(
            (set) => Array.isArray(set) && set.every((id) => typeof id === 'string' && abilityNodeIds.has(id)),
          )
        : [],
    },
  };
}

/**
 * @param {unknown} best 保存した自己ベスト
 * @param {unknown} recordedMinimum 記録した時点の最良値
 * @param {number} minimum 今の最良値
 * @returns {number | null}
 */
function restoreBest(best, recordedMinimum, minimum) {
  // 最良値より良い値ではクリアできないので、そうした記録は壊れている
  if (!Number.isInteger(best) || recordedMinimum !== minimum || /** @type {number} */ (best) < minimum) {
    return null;
  }
  return /** @type {number} */ (best);
}

/**
 * pt とターンの自己ベストを更新する。どちらも少ないほど良い
 * @param {number | null} previousBest 今までの自己ベスト。未クリアなら null
 * @param {number} value 今回クリアしたときの値
 * @returns {{ best: number, improved: boolean }} improved は、初めてのクリアか、自己ベストより少ない値でクリアしたとき true
 */
export function updateBest(previousBest, value) {
  if (previousBest !== null && previousBest <= value) {
    return { best: previousBest, improved: false };
  }
  return { best: value, improved: true };
}

/**
 * 別解の進み具合。能力を共有しない組を、最大でいくつ持っているか（ALTERNATIVE_SET_COUNT で頭打ち）
 * @param {readonly (readonly NodeId[])[]} abilitySets
 * @returns {number}
 */
export function alternativeProgress(abilitySets) {
  if (abilitySets.length === 0) {
    return 0;
  }
  const hasDisjointPair = abilitySets.some((a, index) =>
    abilitySets.slice(index + 1).some((b) => a.every((id) => !b.includes(id))),
  );
  return hasDisjointPair ? ALTERNATIVE_SET_COUNT : 1;
}

/**
 * クリアに使った能力の組を足す。同じ組は足さず、別解の★を取ったら、それ以上は足さない
 * @param {readonly (readonly NodeId[])[]} abilitySets
 * @param {readonly NodeId[]} abilitySet ツリーの定義順
 * @returns {readonly (readonly NodeId[])[]}
 */
export function addAbilitySet(abilitySets, abilitySet) {
  const key = abilitySet.join(',');
  if (alternativeProgress(abilitySets) === ALTERNATIVE_SET_COUNT || abilitySets.some((set) => set.join(',') === key)) {
    return abilitySets;
  }
  return [...abilitySets, abilitySet];
}

/**
 * クリアした1回を記録に反映する
 * @param {ClearRecord} record
 * @param {ClearResult} clear
 * @returns {{ record: ClearRecord, improvedPoints: boolean, improvedTurns: boolean }}
 */
export function applyClear(record, clear) {
  const points = updateBest(record.best, clear.points);
  const turns = clear.turns === null ? { best: record.turns, improved: false } : updateBest(record.turns, clear.turns);
  return {
    record: { best: points.best, turns: turns.best, abilitySets: addAbilitySet(record.abilitySets, clear.abilitySet) },
    improvedPoints: points.improved,
    improvedTurns: turns.improved,
  };
}

/**
 * 公開版のお題（debugOnly 以外）をすべてクリアしたら、最少 pt と最速ターンを開示する。
 * 開示したかは保存せず、記録から毎回決める。お題を足したり記録を捨てたりしたら、再び伏せる
 * @param {readonly Challenge[]} challenges キャラのお題
 * @param {(challenge: Challenge) => boolean} isCleared
 * @returns {boolean}
 */
export function isMinimumRevealed(challenges, isCleared) {
  return challenges.filter((challenge) => challenge.debugOnly !== true).every(isCleared);
}

/**
 * ★は最少 pt を漏らすので、開示するまで付けない
 * @param {Challenge} challenge
 * @param {ClearRecord} record
 * @param {boolean} revealed
 * @returns {boolean}
 */
export function earnedPointsStar(challenge, record, revealed) {
  return revealed && record.best === challenge.minimumPoints;
}

/**
 * ★は最速ターンを漏らすので、開示するまで付けない。最速ターンを持たない連戦には付けない
 * @param {Challenge} challenge
 * @param {ClearRecord} record
 * @param {boolean} revealed
 * @returns {boolean}
 */
export function earnedTurnsStar(challenge, record, revealed) {
  return revealed && challenge.minimumTurns !== undefined && record.turns === challenge.minimumTurns;
}

/**
 * 最良値を漏らさないので、開示の前から付ける
 * @param {ClearRecord} record
 * @returns {boolean}
 */
export function earnedAlternativeStar(record) {
  return alternativeProgress(record.abilitySets) === ALTERNATIVE_SET_COUNT;
}
