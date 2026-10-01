import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { findAbility } from '../src/core/ability-table.js';
import { addAbilityWord } from '../src/ui/debug-input.js';

/** @param {string} name */
const abilityOf = (name) => {
  const ability = findAbility(name);
  assert.notEqual(ability, undefined, name);
  return ability;
};

/** @param {string} text @param {readonly string[]} names 押すボタンの英語名。押す順に並べる */
const press = (text, names) => names.reduce((current, name) => addAbilityWord(current, abilityOf(name)), text);

describe('addAbilityWord', () => {
  const cases = [
    ['同じステータスの語の値に足す', 'HP100,ATK10', ['HP', 'HP'], 'HP120,ATK10'],
    ['同じステータスの語が無ければ末尾に足す', 'HP100,ATK10', ['DEF'], 'HP100,ATK10,DEF1'],
    ['同じステータスの語が2つ以上あれば最後の語に足す', 'HP100,HP20', ['HP'], 'HP100,HP30'],
    ['書き換えない語の内容と並び順を保つ', 'Fire,HP100, Poison3', ['HP'], 'Fire,HP110, Poison3'],
    ['書き換える語の前後の空白は保つ', 'ATK10 , HP100', ['ATK'], 'ATK11 , HP100'],
    ['引数を省いた語は規定値に足す', 'HP', ['HP'], 'HP20'],
    ['値が0の語にも足す', 'DEF0', ['DEF'], 'DEF1'],
    ['小数の語は、浮動小数点の誤差を出さずに足す', 'ATK1.07', ['ATK'], 'ATK2.07'],
    ['小数の語に何度足しても、桁数は元の語のまま', 'ATK0.03', ['ATK', 'ATK', 'ATK'], 'ATK3.03'],
    ['大文字小文字を区別せず、表の英語名にそろえる', 'hp100', ['HP'], 'HP110'],
    ['不正な同じステータスの語は書き換えず、手前の語に足す', 'HP100,HP1:2', ['HP'], 'HP110,HP1:2'],
    ['不正な同じステータスの語しか無ければ末尾に足す', 'HP1:2', ['HP'], 'HP1:2,HP10'],
    ['ステータス以外は、同じ能力の語があっても末尾に足す', 'Poison5', ['Poison'], 'Poison5,Poison5'],
    ['空の欄には1語だけ書く', '', ['HP'], 'HP10'],
    ['末尾のカンマの後ろの空の語は書き換えない', 'HP100,', ['HP'], 'HP110,'],
  ];
  for (const [label, text, names, expected] of cases) {
    test(`${label}：${JSON.stringify(text)} → ${JSON.stringify(expected)}`, () => {
      assert.equal(press(text, names), expected);
    });
  }
});
