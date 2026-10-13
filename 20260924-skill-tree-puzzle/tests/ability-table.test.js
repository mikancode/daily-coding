import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveAbility, timed } from '../src/core/ability-table.js';

describe('resolveAbility', () => {
  const labelCases = [
    ['ステータスは値を添える', 'ATK', [3], 'ATK+3'],
    ['属性は「属性」を添える', 'Thunder', [], '雷属性'],
    ['能力は規定値なら名前だけ', 'Multi', [2, 0.6], '連撃'],
    ['規定値と違えば第1引数を添える', 'Multi', [3], '連撃3'],
  ];
  for (const [label, name, args, expected] of labelCases) {
    test(`表示名：${label}`, () => {
      assert.equal(resolveAbility(name, args).label, expected);
    });
  }

  test('不正な指定は例外にする（引数の規則はデバッグ入力と共通なので、詳細はパーサーのテストで見る）', () => {
    assert.throws(() => resolveAbility('Unknown'));
    assert.throws(() => resolveAbility('Multi', [0]));
  });
});

describe('timed', () => {
  const FIRST = { kind: 'first', turns: 3 };
  test('包める能力は TimedEffect にする', () => {
    const poison = { type: 'poison', damage: 5 };
    assert.deepEqual(timed(FIRST, poison), { type: 'timed', period: FIRST, effect: poison });
    assert.equal(timed(FIRST, { type: 'stat', stat: 'attack', amount: 5 }).type, 'timed');
  });

  test('HP の条件・復活の期間でも包める', () => {
    const poison = { type: 'poison', damage: 5 };
    assert.equal(timed({ kind: 'hpAtMost', ratio: 0.5 }, poison).type, 'timed');
    assert.equal(timed({ kind: 'revived' }, poison).type, 'timed');
  });

  const invalidCases = [
    ['HP の加算', FIRST, { type: 'stat', stat: 'hp', amount: 10 }],
    ['根性', FIRST, { type: 'endure', hp: 1 }],
    ['復活', FIRST, { type: 'endure', hp: 50 }],
    ['周期スキル', FIRST, { type: 'charge', perTurn: 0.5 }],
    ['入れ子', FIRST, { type: 'timed', period: FIRST, effect: { type: 'poison', damage: 5 } }],
    ['ターン数が0', { kind: 'at', turn: 0 }, { type: 'poison', damage: 5 }],
    ['ターン数が整数でない', { kind: 'rotation', turns: 1.5 }, { type: 'poison', damage: 5 }],
    ['HP の割合が0', { kind: 'hpAtMost', ratio: 0 }, { type: 'poison', damage: 5 }],
    ['HP の割合が1', { kind: 'hpAtMost', ratio: 1 }, { type: 'poison', damage: 5 }],
  ];
  for (const [label, period, effect] of invalidCases) {
    test(`包めないものは読み込み時の例外にする：${label}`, () => {
      assert.throws(() => timed(period, effect));
    });
  }
});
