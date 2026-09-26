import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { clearsChallenge, simulate, simulateChallenge } from '../src/core/simulate.js';

// 数値は実データ（#54 で調整する）に依存させず、テスト内で固定する

/** @param {string} id @param {object[]} effects */
const node = (id, effects) => ({ id, name: id, pos: { x: 0, y: 0 }, effects });

const ORIGIN = node('origin', [
  { type: 'stat', stat: 'hp', amount: 100 },
  { type: 'stat', stat: 'attack', amount: 10 },
]);
const MULTI_HIT = node('multi-hit', [{ type: 'multiHit', hits: 2, ratio: 0.5 }]);
const LAST_STAND = node('last-stand', [
  { type: 'conditional', hpRatioAtMost: 0.5, damageMultiplier: 3 },
]);

/** @param {object} overrides */
const challenge = (overrides) => ({
  name: 'テスト用の敵',
  hp: 60,
  attack: 10,
  counter: 0,
  resistances: {},
  turnLimit: 10,
  ...overrides,
});

/** @param {object[]} enemies */
const group = (enemies) => ({ id: 'test', name: 'テスト用のお題', enemies, points: 10 });

describe('既知ケース', () => {
  test('マルチヒットはカウンターで負ける', () => {
    const boss = challenge({ hp: 60, attack: 0, counter: 15 });

    // 10 ダメージ × 6 発。最後の1発で倒すので、反撃は 5 回（75 ダメージ）で済む
    const single = simulate([ORIGIN], boss);
    assert.equal(single.result, 'win');

    // 5 ダメージ × 12 発。反撃を 7 回受けた時点で HP が尽きる
    const multi = simulate([ORIGIN, MULTI_HIT], boss);
    assert.equal(multi.result, 'lose');
    assert.equal(multi.summary.loseReason, 'defeated');
  });

  test('条件シナジーで勝つ', () => {
    const boss = challenge({ hp: 80, attack: 25 });

    // 4 ターン目のボスの攻撃で HP が尽きる
    const plain = simulate([ORIGIN], boss);
    assert.equal(plain.result, 'lose');
    assert.equal(plain.summary.loseReason, 'defeated');

    // 2 ターン目の被弾で HP が半分になり、3・4 ターン目は 3 倍の 30 ダメージで押し切る
    const synergy = simulate([ORIGIN, LAST_STAND], boss);
    assert.equal(synergy.result, 'win');
    assert.deepEqual(synergy.summary, { turns: 4, bossHp: 0, playerHp: 25, playerMaxHp: 100, loseReason: null });
  });

  test('ターン上限を過ぎると、HP が残っていても負ける', () => {
    const boss = challenge({ hp: 1000, attack: 0, turnLimit: 3 });
    const outcome = simulate([ORIGIN], boss);

    assert.equal(outcome.result, 'lose');
    assert.deepEqual(outcome.summary, { turns: 3, bossHp: 970, playerHp: 100, playerMaxHp: 100, loseReason: 'turnLimit' });
    assert.deepEqual(outcome.log.at(-1), { type: 'turnLimit', turn: 3 });
  });
});

describe('ターンの流れ', () => {
  test('自分の攻撃のあとにボスが攻撃し、倒した時点で終わる', () => {
    const outcome = simulate([ORIGIN], challenge({ hp: 20, attack: 10 }));

    assert.deepEqual(outcome.log, [
      { type: 'playerHit', turn: 1, element: 'physical', damage: 10, bossHp: 10 },
      { type: 'bossAttack', turn: 1, damage: 10, playerHp: 90 },
      { type: 'playerHit', turn: 2, element: 'physical', damage: 10, bossHp: 0 },
    ]);
    assert.deepEqual(outcome.summary, { turns: 2, bossHp: 0, playerHp: 90, playerMaxHp: 100, loseReason: null });
  });

  test('反撃は1発ごとに受ける', () => {
    const outcome = simulate([ORIGIN, MULTI_HIT], challenge({ hp: 100, attack: 0, counter: 5, turnLimit: 1 }));
    const types = outcome.log.map((entry) => entry.type);

    assert.deepEqual(types, ['playerHit', 'counter', 'playerHit', 'counter', 'bossAttack', 'turnLimit']);
  });

  test('multiHit を重ねると、回数と係数がそれぞれ掛け合わさる', () => {
    const second = node('multi-hit-2', [{ type: 'multiHit', hits: 2, ratio: 0.5 }]);
    const outcome = simulate([ORIGIN, MULTI_HIT, second], challenge({ hp: 100, attack: 0, turnLimit: 1 }));
    const hits = outcome.log.filter((entry) => entry.type === 'playerHit');

    assert.equal(hits.length, 4);
    assert.ok(hits.every((entry) => entry.damage === 2));
  });

  test('防御が被ダメージを上回っても、HP は回復しない', () => {
    const armor = node('armor', [{ type: 'stat', stat: 'defense', amount: 20 }]);
    const outcome = simulate([ORIGIN, armor], challenge({ hp: 1000, attack: 10, turnLimit: 1 }));

    assert.equal(outcome.summary.playerHp, 100);
  });
});

describe('条件シナジー', () => {
  test('HP が閾値ちょうどでも、小数の誤差で発動し損ねない', () => {
    const edge = node('edge', [{ type: 'conditional', hpRatioAtMost: 0.57, damageMultiplier: 3 }]);
    // 1 ターン目の被弾で HP が 57 になる。100 × 0.57 は浮動小数点で 56.999… になる
    const outcome = simulate([ORIGIN, edge], challenge({ hp: 1000, attack: 43, turnLimit: 2 }));
    const secondHit = outcome.log.find((entry) => entry.type === 'playerHit' && entry.turn === 2);

    assert.equal(secondHit?.damage, 30);
  });
});

describe('属性と軽減率', () => {
  test('軽減率の分だけダメージが減る', () => {
    const outcome = simulate([ORIGIN], challenge({ resistances: { physical: 0.5 } }));

    assert.equal(outcome.log[0].damage, 5);
  });

  test('軽減率 1 の属性は無効になる', () => {
    const outcome = simulate([ORIGIN], challenge({ resistances: { physical: 1 }, turnLimit: 1 }));

    assert.equal(outcome.log[0].damage, 0);
  });

  test('使える属性のうち、軽減率が最も低いものを使う', () => {
    const fire = node('fire', [{ type: 'element', element: 'fire' }]);
    const ice = node('ice', [{ type: 'element', element: 'ice' }]);
    const outcome = simulate([ORIGIN, fire, ice], challenge({ resistances: { physical: 1, fire: 0.5 } }));

    assert.equal(outcome.log[0].element, 'ice');
    assert.equal(outcome.log[0].damage, 10);
  });

  test('小数の誤差でダメージが 1 下がらない', () => {
    const strong = node('strong', [{ type: 'stat', stat: 'attack', amount: 90 }]);
    // 100 × (1 − 0.9) は浮動小数点で 9.999… になる
    const outcome = simulate([ORIGIN, strong], challenge({ resistances: { physical: 0.9 } }));

    assert.equal(outcome.log[0].damage, 10);
  });
});

describe('組のお題', () => {
  // 起点だけのビルドは 10 ダメージ × 1 発・HP 100
  const beatable = challenge({ hp: 20, attack: 10 });
  const unbeatable = challenge({ hp: 1000, attack: 0, turnLimit: 1 });

  test('全員に勝てば勝ち', () => {
    assert.equal(clearsChallenge([ORIGIN], group([beatable, beatable])), true);
  });

  test('1体でも負ければ負け', () => {
    assert.equal(clearsChallenge([ORIGIN], group([beatable, unbeatable])), false);
    assert.equal(clearsChallenge([ORIGIN], group([unbeatable, beatable])), false);
  });

  test('敵ごとの結果を、お題の順に全員分返す', () => {
    const results = simulateChallenge([ORIGIN], group([unbeatable, beatable]));
    assert.deepEqual(
      results.map((result) => result.result),
      ['lose', 'win'],
    );
  });

  test('敵ごとの戦闘は、自分の HP が満タンから始まる', () => {
    const [first, second] = simulateChallenge([ORIGIN], group([beatable, beatable]));
    assert.deepEqual(first.summary, second.summary);
  });
});
