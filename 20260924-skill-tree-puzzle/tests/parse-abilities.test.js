import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { ABILITIES, formatDefaultWord } from '../src/core/ability-table.js';
import { parseAbilities } from '../src/core/parse-abilities.js';
import { createProfile } from '../src/core/simulate.js';

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

describe('規定値', () => {
  test('引数を省くと規定値になる', () => {
    assert.deepEqual(effectsOf('Poison'), [{ type: 'poison', damage: 5 }]);
    assert.deepEqual(effectsOf('Regen'), [{ type: 'regen', amount: 8 }]);
    assert.deepEqual(effectsOf('Counter'), [{ type: 'counter', damage: 10 }]);
    assert.deepEqual(effectsOf('HP'), [{ type: 'stat', stat: 'hp', amount: 10 }]);
  });

  test('引数のない能力は、そのまま Effect になる', () => {
    assert.deepEqual(effectsOf('Endure,Fire'), [
      { type: 'endure' },
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

describe('引数', () => {
  test('引数つきの語は、その値になる', () => {
    assert.deepEqual(effectsOf('Poison7'), [{ type: 'poison', damage: 7 }]);
    assert.deepEqual(effectsOf('ATK50'), [{ type: 'stat', stat: 'attack', amount: 50 }]);
  });

  test('複数の引数は : で区切る', () => {
    assert.deepEqual(effectsOf('Multi3:0.4'), [{ type: 'multiHit', hits: 3, ratio: 0.4 }]);
    assert.deepEqual(effectsOf('Cond0.3:4'), [
      { type: 'conditional', hpRatioAtMost: 0.3, damageMultiplier: 4 },
    ]);
  });

  test('複数の引数の後ろを省くと、その引数だけ規定値になる', () => {
    assert.deepEqual(effectsOf('Multi3'), [{ type: 'multiHit', hits: 3, ratio: 0.5 }]);
  });

  test('語の大文字小文字と前後の空白は区別しない', () => {
    assert.deepEqual(effectsOf(' poison3 , FIRE '), [
      { type: 'poison', damage: 3 },
      { type: 'element', element: 'fire' },
    ]);
  });
});

describe('createProfile との組み合わせ', () => {
  test('HP・ATK・DEF を複数書くと合算される', () => {
    const profile = profileOf(effectsOf('HP100,ATK50,DEF10,HP20,ATK5'));
    assert.equal(profile.maxHp, 120);
    assert.equal(profile.attack, 55);
    assert.equal(profile.defense, 10);
  });

  test('属性は書いた順がローテーションの順になる', () => {
    assert.deepEqual(profileOf(effectsOf('Ice,Fire,Thunder')).rotation, ['ice', 'fire', 'thunder']);
    assert.deepEqual(profileOf(effectsOf('Fire,Ice')).rotation, ['fire', 'ice']);
  });

  test('例の書式が、そのまま集計される', () => {
    const profile = profileOf(effectsOf('HP100,ATK50,DEF10,Poison5,Fire'));
    assert.equal(profile.maxHp, 100);
    assert.equal(profile.poison, 5);
    assert.deepEqual(profile.rotation, ['fire']);
  });
});

describe('不正な書式', () => {
  test('未知の能力はその語を返す', () => {
    const errors = errorsOf('HP100,Foo5');
    assert.equal(errors.length, 1);
    assert.equal(errors[0].word, 'Foo5');
  });

  test('数値でない引数はエラーにする', () => {
    assert.equal(errorsOf('HPabc')[0].word, 'HPabc');
    assert.equal(errorsOf('Poison5x')[0].word, 'Poison5x');
    assert.equal(errorsOf('Multi2:')[0].word, 'Multi2:');
  });

  test('引数を取らない能力に引数を書くとエラーにする', () => {
    assert.equal(errorsOf('Fire5')[0].word, 'Fire5');
    assert.equal(errorsOf('Endure1')[0].word, 'Endure1');
  });

  test('引数が多すぎるとエラーにする', () => {
    assert.equal(errorsOf('Poison1:2')[0].word, 'Poison1:2');
  });

  test('連撃の回数が整数でないとエラーにする', () => {
    assert.equal(errorsOf('Multi0:0.5')[0].word, 'Multi0:0.5');
    assert.equal(errorsOf('Multi1.5:0.5')[0].word, 'Multi1.5:0.5');
  });

  test('空の語と、空の入力はエラーにする', () => {
    assert.equal(errorsOf('HP10,,ATK1').length, 1);
    assert.equal(errorsOf('').length, 1);
    assert.equal(errorsOf('  ').length, 1);
  });

  test('不正な語はすべて集める', () => {
    assert.deepEqual(
      errorsOf('Foo,HP10,Bar').map((error) => error.word),
      ['Foo', 'Bar'],
    );
  });
});
