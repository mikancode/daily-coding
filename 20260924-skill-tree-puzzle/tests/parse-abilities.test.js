import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { ABILITIES, PERIODS, formatDefaultPeriodWord, formatDefaultWord } from '../src/core/ability-table.js';
import { parseAbilities } from '../src/core/parse-abilities.js';
import { createProfile } from '../src/core/profile.js';

/** @param {string} text */
const effectsOf = (text) => {
  const parsed = parseAbilities(text);
  assert.equal(parsed.ok, true);
  return parsed.ok ? parsed.effects : [];
};

/** @param {string} text */
const errorsOf = (text) => {
  const parsed = parseAbilities(text);
  assert.equal(parsed.ok, false);
  return parsed.ok ? [] : parsed.errors;
};

/** @param {readonly object[]} effects */
const profileOf = (effects) =>
  createProfile([{ id: 'debug', name: 'debug', pos: { x: 0, y: 0 }, effects }]);

describe('正しい語', () => {
  const validCases = [
    ['引数を省くと規定値', 'Poison', { type: 'poison', damage: 5 }],
    ['ステータスも規定値', 'HP', { type: 'stat', stat: 'hp', amount: 10 }],
    ['引数のない能力', 'Endure', { type: 'endure', hp: 1 }],
    ['復活は根性と同じ型で、戻す HP を持つ', 'Revive30', { type: 'endure', hp: 30 }],
    ['復活の引数を省くと規定値', 'Revive', { type: 'endure', hp: 50 }],
    ['属性', 'Fire', { type: 'element', element: 'fire' }],
    ['引数つき', 'ATK50', { type: 'stat', stat: 'attack', amount: 50 }],
    ['複数の引数は : で区切る', 'Cond0.3:4', { type: 'conditional', hpRatioAtMost: 0.3, damageMultiplier: 4 }],
    ['後ろの引数だけ省くと規定値', 'Multi3', { type: 'multiHit', hits: 3, ratio: 0.6 }],
    ['連撃の回数の上限ちょうど', 'Multi100:0.01', { type: 'multiHit', hits: 100, ratio: 0.01 }],
  ];
  for (const [label, word, effect] of validCases) {
    test(`${label}：${word}`, () => {
      assert.deepEqual(effectsOf(word), [effect]);
    });
  }

  test('語の大文字小文字と前後の空白は区別しない', () => {
    assert.deepEqual(effectsOf(' poison3 , FIRE '), [
      { type: 'poison', damage: 3 },
      { type: 'element', element: 'fire' },
    ]);
  });

  test('表の全行で、ボタンが追記する規定値つきの1語がパーサーを通る', () => {
    for (const ability of ABILITIES) {
      const word = formatDefaultWord(ability);
      assert.equal(parseAbilities(word).ok, true, word);
    }
  });
});

describe('createProfile との組み合わせ', () => {
  test('HP・ATK・DEF を複数書くと合算される', () => {
    const profile = profileOf(effectsOf('HP100,ATK50,DEF10,HP20,ATK5'));
    assert.equal(profile.maxHp, 120);
    assert.equal(profile.attack, 55);
    assert.equal(profile.defense, 10);
  });

  test('周期スキルは書いた順がローテーションの順になる', () => {
    assert.deepEqual(profileOf(effectsOf('Ice,Charge,Fire,Burst')).rotation, [
      { type: 'element', element: 'ice' },
      { type: 'charge', perTurn: 0.5 },
      { type: 'element', element: 'fire' },
      { type: 'burst', perMark: 0.2, ratio: 0.5 },
    ]);
  });
});

describe('不正な語', () => {
  const invalidCases = [
    ['未知の能力', ['Foo5']],
    ['数値でない引数', ['HPabc', 'Poison5x', 'Multi2:']],
    ['引数を取らない能力に引数', ['Fire5', 'Endure1']],
    ['引数が多すぎる', ['Poison1:2']],
    ['連撃の回数が整数でない', ['Multi0:0.5', 'Multi1.5:0.5']],
    ['連撃の回数が大きすぎる', ['Multi101:0.01', 'Multi99999999:1']],
    ['復活で戻す HP が1以上の整数でない', ['Revive0', 'Revive1.5']],
    ['負の数', ['HP-100', 'Poison-5']],
  ];
  for (const [label, words] of invalidCases) {
    test(`${label}はエラーにし、その語を返す`, () => {
      for (const word of words) {
        assert.deepEqual(
          errorsOf(word).map((error) => error.word),
          [word],
        );
      }
    });
  }

  test('空の語と、空の入力はエラーにする', () => {
    assert.equal(errorsOf('HP10,,ATK1').length, 1);
    assert.equal(errorsOf('').length, 1);
    assert.equal(errorsOf('  ').length, 1);
  });

  test('不正な語は最初の1つで止めず、すべて集める', () => {
    assert.deepEqual(
      errorsOf('Foo,HP10,Bar').map((error) => error.word),
      ['Foo', 'Bar'],
    );
  });
});

describe('期間で包む語', () => {
  const POISON = { type: 'poison', damage: 5 };
  const validCases = [
    ['最初の x ターン', 'First3/Poison5', { kind: 'first', turns: 3 }],
    ['x ターン目から', 'From4/Poison5', { kind: 'from', turn: 4 }],
    ['x ターン目だけ', 'At2/Poison5', { kind: 'at', turn: 2 }],
    ['ローテーション', 'Cycle2/Poison5', { kind: 'rotation', turns: 2 }],
    ['HP の割合以下', 'Below0.3/Poison5', { kind: 'hpAtMost', ratio: 0.3 }],
    ['HP の割合の引数を省くと規定値', 'Below/Poison5', { kind: 'hpAtMost', ratio: 0.5 }],
    ['復活後', 'Revived/Poison5', { kind: 'revived' }],
    ['期間の引数を省くと規定値', 'first/Poison5', { kind: 'first', turns: 3 }],
    ['区切りの前後の空白は区別しない', 'First3 / Poison5', { kind: 'first', turns: 3 }],
  ];
  for (const [label, word, period] of validCases) {
    test(`${label}：${word}`, () => {
      assert.deepEqual(effectsOf(word), [{ type: 'timed', period, effect: POISON }]);
    });
  }

  test('ローテーションの時限能力は、書いた順でローテーションに入る', () => {
    const { rotation, timed } = profileOf(effectsOf('Fire,Cycle2/Regen,First3/Poison5'));
    assert.deepEqual(rotation.map((skill) => skill.type), ['element', 'timed']);
    assert.deepEqual(timed.map((effect) => effect.period.kind), ['first']);
  });

  test('期間の表の全行で、ボタンが付ける規定値つきの期間の語がパーサーを通る', () => {
    for (const period of PERIODS) {
      const word = `${formatDefaultPeriodWord(period)}/Poison5`;
      assert.equal(parseAbilities(word).ok, true, word);
    }
  });

  const invalidCases = [
    ['HP の加算', 'First3/HP10'],
    ['根性', 'First3/Endure'],
    ['復活', 'Below0.5/Revive50'],
    ['引数を取らない期間に引数', 'Revived3/Poison5'],
    ['HP の割合が1以上', 'Below1/Poison5'],
    ['HP の割合が0', 'Below0/Poison5'],
    ['周期スキル', 'Cycle2/Fire'],
    ['入れ子', 'First3/At2/Poison5'],
    ['ターン数が0', 'At0/Poison5'],
    ['ターン数が整数でない', 'First1.5/Poison5'],
    ['未知の期間', 'Foo3/Poison5'],
    ['期間の引数が数値でない', 'First3:2/Poison5'],
    ['包む能力が無い', 'First3/'],
    ['包む能力が不正', 'First3/Foo'],
  ];
  for (const [label, word] of invalidCases) {
    test(`${label}はエラーにし、その語を返す：${word}`, () => {
      assert.deepEqual(errorsOf(word).map((error) => error.word), [word]);
    });
  }
});
