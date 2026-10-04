// @ts-check
// お題のクリアの判定と、クリアの記録（自己ベスト）の書き出し・読み込み・更新、最少 pt を開示するかの判定。localStorage には触らない

/**
 * @typedef {import('../types.js').Challenge} Challenge
 * @typedef {import('../types.js').RestoredRecord} RestoredRecord
 * @typedef {import('../types.js').SequenceProgress} SequenceProgress
 * @typedef {import('../types.js').SimulationResult} SimulationResult
 */

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
 * 記録した時点の最少 pt を一緒に書き出す。お題の調整で最少 pt が変わったとき、古い記録で★が付かないよう見分けるため
 * @param {number} best 自己ベスト
 * @param {number} minimumPoints 記録する時点の、お題の最少 pt
 * @returns {string}
 */
export function serializeRecord(best, minimumPoints) {
  return JSON.stringify({ best, minimum: minimumPoints });
}

/**
 * 記録した時点の最少 pt が今と違えば、記録を丸ごと捨てる（invalid）
 * @param {string | null} raw localStorage から読んだ値。記録が無ければ null
 * @param {number} minimumPoints 今の、お題の最少 pt
 * @returns {RestoredRecord}
 */
export function restoreRecord(raw, minimumPoints) {
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
  if (typeof parsed !== 'object' || parsed === null) {
    return { status: 'invalid' };
  }
  const { best, minimum } = /** @type {{ best?: unknown, minimum?: unknown }} */ (parsed);
  if (!Number.isInteger(best) || minimum !== minimumPoints) {
    return { status: 'invalid' };
  }
  const bestPoints = /** @type {number} */ (best);
  // 最少 pt より少ない pt ではクリアできないので、そうした記録は壊れている
  if (bestPoints < minimumPoints) {
    return { status: 'invalid' };
  }
  return { status: 'recorded', best: bestPoints };
}

/**
 * @param {number | null} previousBest 今までの自己ベスト。未クリアなら null
 * @param {number} usedPoints 今回クリアしたビルドの pt
 * @returns {{ best: number, improved: boolean }} improved は、初めてのクリアか、自己ベストより少ない pt でクリアしたとき true
 */
export function updateBest(previousBest, usedPoints) {
  if (previousBest !== null && previousBest <= usedPoints) {
    return { best: previousBest, improved: false };
  }
  return { best: usedPoints, improved: true };
}

/**
 * 公開版のお題（debugOnly 以外）をすべてクリアしたら、最少 pt を開示する。
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
 * @param {number | null} best 自己ベスト。未クリアなら null
 * @param {boolean} revealed
 * @returns {boolean}
 */
export function earnedStar(challenge, best, revealed) {
  return revealed && best === challenge.minimumPoints;
}
