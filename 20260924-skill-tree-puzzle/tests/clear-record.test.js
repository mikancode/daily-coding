import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  clearsByResults,
  clearsBySequence,
  earnedStar,
  isMinimumRevealed,
  restoreRecord,
  serializeRecord,
  updateBest,
} from '../src/core/clear-record.js';

const MINIMUM = 8;

/** @param {'win' | 'lose'} result */
const resultOf = (result) => ({ result, log: [] });

/**
 * @param {string} id
 * @param {{ debugOnly?: boolean, enemies?: number }} [options]
 */
const challengeOf = (id, options = {}) => ({
  id,
  name: id,
  enemies: Array.from({ length: options.enemies ?? 1 }, () => ({})),
  points: MINIMUM + 1,
  minimumPoints: MINIMUM,
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

describe('restoreRecord', () => {
  test('書き出した記録を読める', () => {
    assert.deepEqual(restoreRecord(serializeRecord(9, MINIMUM), MINIMUM), { status: 'recorded', best: 9 });
  });

  test('記録が無ければ none', () => {
    assert.deepEqual(restoreRecord(null, MINIMUM), { status: 'none' });
  });

  test('記録した時点の最少 pt が今と違えば捨てる', () => {
    assert.deepEqual(restoreRecord(serializeRecord(9, MINIMUM - 1), MINIMUM), { status: 'invalid' });
  });

  test('自己ベストが最少 pt より少なければ捨てる', () => {
    assert.deepEqual(restoreRecord(serializeRecord(MINIMUM - 1, MINIMUM), MINIMUM), { status: 'invalid' });
  });

  for (const raw of ['not json', 'null', '9', '[]', '{"minimum":8}', '{"best":8.5,"minimum":8}', '{"best":"9","minimum":8}']) {
    test(`形が不正なら捨てる: ${raw}`, () => {
      assert.deepEqual(restoreRecord(raw, MINIMUM), { status: 'invalid' });
    });
  }
});

describe('updateBest', () => {
  test('初めてのクリアは、その pt を自己ベストにする', () => {
    assert.deepEqual(updateBest(null, 10), { best: 10, improved: true });
  });

  test('自己ベストより少ない pt なら更新する', () => {
    assert.deepEqual(updateBest(10, 9), { best: 9, improved: true });
  });

  test('自己ベストと同じか多い pt なら更新しない', () => {
    assert.deepEqual(updateBest(9, 9), { best: 9, improved: false });
    assert.deepEqual(updateBest(9, 10), { best: 9, improved: false });
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

describe('earnedStar', () => {
  const challenge = challengeOf('a');

  test('開示した後、自己ベストが最少 pt と同じなら★', () => {
    assert.equal(earnedStar(challenge, MINIMUM, true), true);
  });

  test('開示する前は、最少 pt と同じでも★を付けない', () => {
    assert.equal(earnedStar(challenge, MINIMUM, false), false);
  });

  test('自己ベストが最少 pt より多い、または未クリアなら★を付けない', () => {
    assert.equal(earnedStar(challenge, MINIMUM + 1, true), false);
    assert.equal(earnedStar(challenge, null, true), false);
  });
});
