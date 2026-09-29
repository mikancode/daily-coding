import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveAbility } from '../src/core/ability-table.js';

describe('resolveAbility の表示名', () => {
  test('ステータスは値を添える', () => {
    assert.equal(resolveAbility('ATK', [3]).label, '攻撃+3');
    assert.equal(resolveAbility('HP', [20]).label, 'HP+20');
  });

  test('属性は「属性」を添える', () => {
    assert.equal(resolveAbility('Thunder').label, '雷属性');
  });

  test('能力は規定値なら名前だけ、違えば第1引数を添える', () => {
    assert.equal(resolveAbility('Multi').label, '連撃');
    assert.equal(resolveAbility('Multi', [2, 0.5]).label, '連撃');
    assert.equal(resolveAbility('Multi', [3]).label, '連撃3');
    assert.equal(resolveAbility('Cond', [0.5, 3]).label, '背水0.5');
  });
});

describe('resolveAbility の効果', () => {
  test('省いた引数は規定値で埋める', () => {
    assert.deepEqual(resolveAbility('Multi', [3]).effect, { type: 'multiHit', hits: 3, ratio: 0.5 });
  });

  test('知らない名前・多すぎる引数・範囲外の引数は例外にする', () => {
    assert.throws(() => resolveAbility('Unknown'));
    assert.throws(() => resolveAbility('Fire', [1]));
    assert.throws(() => resolveAbility('Multi', [0]));
  });
});
