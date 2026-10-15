import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveAbility, timed } from '../src/core/ability-table.js';

describe('resolveAbility', () => {
  const labelCases = [
    ['ステータスは値を添える', 'ATK', [3], 'ATK+3'],
    ['属性は「属性」を添える', 'Thunder', [], '雷属性'],
    ['能力は規定値なら名前だけ', 'Multi', [2, 0.6], '連撃'],
    ['規定値と違えば第1引数を添える', 'Multi', [3], '連撃3'],
    ['刻印で強まる能力も、規定値なら名前だけ', 'MarkAtkDown', [1], '縛陣'],
  ];
  for (const [label, name, args, expected] of labelCases) {
    test(`表示名：${label}`, () => {
      assert.equal(resolveAbility(name, args).label, expected);
    });
  }

  test('解放は、使う割合を規定値 0.5 で埋め、0 以下・1 より大きい割合を例外にする', () => {
    assert.deepEqual(resolveAbility('Burst', [0.2]).effect, { type: 'burst', perMark: 0.2, ratio: 0.5 });
    assert.equal(resolveAbility('Burst', [0.2, 1]).effect.type, 'burst');
    assert.throws(() => resolveAbility('Burst', [0.2, 0]));
    assert.throws(() => resolveAbility('Burst', [0.2, 1.5]));
  });

  test('刻印で強まる能力は、語ごとに target を変えた1つの型にする', () => {
    assert.deepEqual(resolveAbility('MarkPoison').effect, { type: 'markScaling', target: 'poison', perMark: 2 });
    assert.deepEqual(resolveAbility('MarkAtkDown').effect, { type: 'markScaling', target: 'attackDown', perMark: 1 });
    assert.deepEqual(resolveAbility('MarkDefDown', [3]).effect, {
      type: 'markScaling',
      target: 'defenseDown',
      perMark: 3,
    });
  });

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

  test('刻印の数の期間で包め、刻印で強まる能力も包める', () => {
    const markPoison = { type: 'markScaling', target: 'poison', perMark: 2 };
    assert.equal(timed({ kind: 'marksAtLeast', count: 3 }, markPoison).type, 'timed');
    assert.equal(timed(FIRST, markPoison).type, 'timed');
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
    ['刻印の数が0', { kind: 'marksAtLeast', count: 0 }, { type: 'poison', damage: 5 }],
    ['刻印の数が整数でない', { kind: 'marksAtLeast', count: 1.5 }, { type: 'poison', damage: 5 }],
  ];
  for (const [label, period, effect] of invalidCases) {
    test(`包めないものは読み込み時の例外にする：${label}`, () => {
      assert.throws(() => timed(period, effect));
    });
  }
});
