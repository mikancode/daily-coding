import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  EMPTY_RECORD,
  addAbilitySet,
  alternativeProgress,
  applyClear,
  clearsByResults,
  clearsBySequence,
  earnedAlternativeStar,
  earnedPointsStar,
  earnedTurnsStar,
  isCleared,
  isMinimumRevealed,
  restoreRecord,
  serializeRecord,
  totalTurns,
  updateBest,
} from '../src/core/clear-record.js';

const MINIMUM = 8;
const MINIMUM_TURNS = 5;
const ABILITY_NODE_IDS = new Set(['counter', 'rage', 'charge', 'drain']);

/**
 * @param {'win' | 'lose'} result
 * @param {number} [turns]
 */
const resultOf = (result, turns = 1) => ({ result, log: [], summary: { turns } });

/**
 * @param {string} id
 * @param {{ debugOnly?: boolean, enemies?: number, sequence?: boolean }} [options]
 */
const challengeOf = (id, options = {}) => ({
  id,
  name: id,
  enemies: Array.from({ length: options.enemies ?? 1 }, () => ({})),
  points: MINIMUM + 1,
  minimumPoints: MINIMUM,
  ...(options.sequence === true ? { mode: 'sequence' } : { minimumTurns: MINIMUM_TURNS }),
  ...(options.debugOnly === undefined ? {} : { debugOnly: options.debugOnly }),
});

describe('clearsByResults', () => {
  test('全員に勝てばクリア', () => {
    assert.equal(clearsByResults([resultOf('win'), resultOf('win')]), true);
  });

  test('1体でも負ければクリアではない', () => {
    assert.equal(clearsByResults([resultOf('win'), resultOf('lose')]), false);
  });

  test('結果が無ければクリアではない', () => {
    assert.equal(clearsByResults([]), false);
  });
});

describe('clearsBySequence', () => {
  const challenge = challengeOf('gauntlet', { enemies: 3 });
  const progressOf = (/** @type {number[]} */ defeated) => ({ defeated, rewards: [], started: true });

  test('最後の1体を倒せばクリア', () => {
    assert.equal(clearsBySequence(challenge, progressOf([2, 0, 1])), true);
  });

  test('倒していない敵が残っていればクリアではない', () => {
    assert.equal(clearsBySequence(challenge, progressOf([2, 0])), false);
  });
});

describe('totalTurns', () => {
  test('敵ごとのターン数を合計する', () => {
    assert.equal(totalTurns([resultOf('win', 3), resultOf('win', 4)]), 7);
  });
});

describe('restoreRecord', () => {
  const challenge = challengeOf('a');
  /** @param {string} raw */
  const restore = (raw) => restoreRecord(raw, challenge, ABILITY_NODE_IDS);
  /** @param {object} fields */
  const rawOf = (fields) =>
    JSON.stringify({ best: 9, minimum: MINIMUM, turns: 6, minimumTurns: MINIMUM_TURNS, abilitySets: [], ...fields });

  test('書き出した記録を読める', () => {
    const record = { best: 9, turns: 6, abilitySets: [['counter', 'rage'], ['charge']] };
    assert.deepEqual(restore(serializeRecord(record, challenge)), { status: 'recorded', record });
  });

  test('記録が無ければ none', () => {
    assert.deepEqual(restore(null), { status: 'none' });
  });

  for (const raw of ['not json', 'null', '9', '[]']) {
    test(`JSON のオブジェクトでなければ丸ごと捨てる: ${raw}`, () => {
      assert.deepEqual(restore(raw), { status: 'invalid' });
    });
  }

  test('最速ターンを入れる前の形式（best・minimum だけ）は、pt の記録として読む', () => {
    assert.deepEqual(restore(JSON.stringify({ best: 9, minimum: MINIMUM })), {
      status: 'recorded',
      record: { best: 9, turns: null, abilitySets: [] },
    });
  });

  test('記録した時点の最少 pt が今と違えば、pt の記録だけを捨てる', () => {
    assert.deepEqual(restore(rawOf({ minimum: MINIMUM - 1 })), {
      status: 'recorded',
      record: { best: null, turns: 6, abilitySets: [] },
    });
  });

  test('記録した時点の最速ターンが今と違えば、ターンの記録だけを捨てる', () => {
    assert.deepEqual(restore(rawOf({ minimumTurns: MINIMUM_TURNS - 1 })), {
      status: 'recorded',
      record: { best: 9, turns: null, abilitySets: [] },
    });
  });

  test('最良値より良い自己ベストは壊れているので捨てる', () => {
    assert.deepEqual(restore(rawOf({ best: MINIMUM - 1, turns: MINIMUM_TURNS - 1 })), {
      status: 'recorded',
      record: { best: null, turns: null, abilitySets: [] },
    });
  });

  for (const fields of [{ best: 8.5 }, { best: '9' }, { best: null }]) {
    test(`自己ベストの pt の形が不正なら捨てる: ${JSON.stringify(fields)}`, () => {
      assert.equal(/** @type {any} */ (restore(rawOf(fields))).record.best, null);
    });
  }

  test('最速ターンを持たない連戦では、ターンの記録を読まない', () => {
    const sequence = challengeOf('gauntlet', { sequence: true });
    const restored = restoreRecord(rawOf({ minimumTurns: null }), sequence, ABILITY_NODE_IDS);
    assert.equal(/** @type {any} */ (restored).record.turns, null);
  });

  test('今のツリーに無い能力ノードを含む組と、形が不正な組を捨てる', () => {
    const abilitySets = [['counter'], ['removed'], ['rage', 'removed'], 'counter', [1], ['charge', 'drain']];
    assert.deepEqual(/** @type {any} */ (restore(rawOf({ abilitySets }))).record.abilitySets, [
      ['counter'],
      ['charge', 'drain'],
    ]);
  });

  test('能力の組が配列でなければ、組を空にする', () => {
    assert.deepEqual(/** @type {any} */ (restore(rawOf({ abilitySets: 'counter' }))).record.abilitySets, []);
  });
});

describe('updateBest', () => {
  test('初めてのクリアは、その値を自己ベストにする', () => {
    assert.deepEqual(updateBest(null, 10), { best: 10, improved: true });
  });

  test('自己ベストより少ない値なら更新する', () => {
    assert.deepEqual(updateBest(10, 9), { best: 9, improved: true });
  });

  test('自己ベストと同じか多い値なら更新しない', () => {
    assert.deepEqual(updateBest(9, 9), { best: 9, improved: false });
    assert.deepEqual(updateBest(9, 10), { best: 9, improved: false });
  });
});

describe('alternativeProgress', () => {
  test('組が無ければ 0、能力を共有しない2組が無ければ 1', () => {
    assert.equal(alternativeProgress([]), 0);
    assert.equal(alternativeProgress([['counter', 'rage']]), 1);
    assert.equal(alternativeProgress([['counter', 'rage'], ['counter', 'charge']]), 1);
  });

  test('能力を共有しない2組があれば 2', () => {
    assert.equal(alternativeProgress([['counter', 'rage'], ['counter', 'charge'], ['charge', 'drain']]), 2);
  });

  test('ステータスだけの組（空）は、どの組とも能力を共有しない', () => {
    assert.equal(alternativeProgress([[], ['counter']]), 2);
  });
});

describe('addAbilitySet', () => {
  test('新しい組を足す', () => {
    assert.deepEqual(addAbilitySet([['counter']], ['counter', 'rage']), [['counter'], ['counter', 'rage']]);
  });

  test('同じ組は足さない', () => {
    const sets = [['counter', 'rage']];
    assert.equal(addAbilitySet(sets, ['counter', 'rage']), sets);
  });

  test('別解の★を取った後は足さない', () => {
    const sets = [['counter'], ['charge']];
    assert.equal(addAbilitySet(sets, ['drain']), sets);
  });
});

describe('applyClear', () => {
  test('初めてのクリアで、すべての軸を記録する', () => {
    assert.deepEqual(applyClear(EMPTY_RECORD, { points: 9, turns: 7, abilitySet: ['counter'] }), {
      record: { best: 9, turns: 7, abilitySets: [['counter']] },
      improvedPoints: true,
      improvedTurns: true,
    });
  });

  test('軸ごとに、良くなった軸だけを更新する', () => {
    const record = { best: 9, turns: 7, abilitySets: [['counter']] };
    assert.deepEqual(applyClear(record, { points: 10, turns: 6, abilitySet: ['charge'] }), {
      record: { best: 9, turns: 6, abilitySets: [['counter'], ['charge']] },
      improvedPoints: false,
      improvedTurns: true,
    });
  });

  test('連戦（ターンが null）は、ターンの記録を変えない', () => {
    const record = { best: 9, turns: null, abilitySets: [] };
    const updated = applyClear(record, { points: 8, turns: null, abilitySet: [] });
    assert.equal(updated.record.turns, null);
    assert.equal(updated.improvedTurns, false);
  });
});

describe('isCleared', () => {
  test('pt の記録があればクリア済み', () => {
    assert.equal(isCleared({ best: 9, turns: null, abilitySets: [] }), true);
    assert.equal(isCleared({ best: null, turns: 6, abilitySets: [['counter']] }), false);
  });
});

describe('isMinimumRevealed', () => {
  const challenges = [challengeOf('a'), challengeOf('b'), challengeOf('debug', { debugOnly: true })];

  test('公開版のお題をすべてクリアすれば開示する。開発用のお題は数えない', () => {
    const cleared = new Set(['a', 'b']);
    assert.equal(isMinimumRevealed(challenges, (challenge) => cleared.has(challenge.id)), true);
  });

  test('公開版のお題が1つでも未クリアなら伏せる', () => {
    const cleared = new Set(['a', 'debug']);
    assert.equal(isMinimumRevealed(challenges, (challenge) => cleared.has(challenge.id)), false);
  });
});

describe('earnedPointsStar', () => {
  const challenge = challengeOf('a');
  /** @param {number | null} best */
  const recordOf = (best) => ({ ...EMPTY_RECORD, best });

  test('開示した後、自己ベストが最少 pt と同じなら★', () => {
    assert.equal(earnedPointsStar(challenge, recordOf(MINIMUM), true), true);
  });

  test('開示する前は、最少 pt と同じでも★を付けない', () => {
    assert.equal(earnedPointsStar(challenge, recordOf(MINIMUM), false), false);
  });

  test('自己ベストが最少 pt より多い、または未クリアなら★を付けない', () => {
    assert.equal(earnedPointsStar(challenge, recordOf(MINIMUM + 1), true), false);
    assert.equal(earnedPointsStar(challenge, recordOf(null), true), false);
  });
});

describe('earnedTurnsStar', () => {
  /** @param {number | null} turns */
  const recordOf = (turns) => ({ ...EMPTY_RECORD, turns });

  test('開示した後、自己ベストが最速ターンと同じなら★', () => {
    assert.equal(earnedTurnsStar(challengeOf('a'), recordOf(MINIMUM_TURNS), true), true);
  });

  test('開示する前、最速ターンより遅い、未クリアなら★を付けない', () => {
    assert.equal(earnedTurnsStar(challengeOf('a'), recordOf(MINIMUM_TURNS), false), false);
    assert.equal(earnedTurnsStar(challengeOf('a'), recordOf(MINIMUM_TURNS + 1), true), false);
    assert.equal(earnedTurnsStar(challengeOf('a'), recordOf(null), true), false);
  });

  test('最速ターンを持たない連戦には付けない', () => {
    assert.equal(earnedTurnsStar(challengeOf('gauntlet', { sequence: true }), recordOf(null), true), false);
  });
});

describe('earnedAlternativeStar', () => {
  test('能力を共有しない2組でクリアしたら★', () => {
    assert.equal(earnedAlternativeStar({ ...EMPTY_RECORD, abilitySets: [['counter', 'rage'], ['charge']] }), true);
    assert.equal(earnedAlternativeStar({ ...EMPTY_RECORD, abilitySets: [['counter', 'rage'], ['rage']] }), false);
  });
});
