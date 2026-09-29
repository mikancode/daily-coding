import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveAbility } from '../src/core/ability-table.js';

describe('resolveAbility', () => {
  const labelCases = [
    ['ステータスは値を添える', 'ATK', [3], '攻撃+3'],
    ['属性は「属性」を添える', 'Thunder', [], '雷属性'],
    ['能力は規定値なら名前だけ', 'Multi', [2, 0.5], '連撃'],
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
