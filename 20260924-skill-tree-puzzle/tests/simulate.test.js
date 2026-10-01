import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { clearsChallenge, simulateChallenge, simulateSequence, winningOrders } from '../src/core/challenge.js';
import { createProfile } from '../src/core/profile.js';
import { simulate } from '../src/core/simulate.js';

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
  defense: 0,
  abilities: [],
  resistances: {},
  turnLimit: 10,
  ...overrides,
});

/** @param {object[]} enemies */
const group = (enemies) => ({ id: 'test', name: 'テスト用のお題', enemies, points: 10 });

describe('既知ケース', () => {
  test('マルチヒットはカウンターで負ける', () => {
    const boss = challenge({ hp: 60, attack: 0, abilities: [{ type: 'counter', damage: 15 }] });

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
    assert.deepEqual(synergy.summary, { turns: 4, bossHp: 0, playerHp: 25, playerMaxHp: 100, bossMaxHp: 80, loseReason: null });
  });

  test('ターン上限を過ぎると、HP が残っていても負ける', () => {
    const boss = challenge({ hp: 1000, attack: 0, turnLimit: 3 });
    const outcome = simulate([ORIGIN], boss);

    assert.equal(outcome.result, 'lose');
    assert.deepEqual(outcome.summary, { turns: 3, bossHp: 970, playerHp: 100, playerMaxHp: 100, bossMaxHp: 1000, loseReason: 'turnLimit' });
    assert.deepEqual(outcome.log.at(-1), { type: 'turnLimit', turn: 3 });
  });
});

describe('ターンの流れ', () => {
  test('自分の攻撃のあとにボスが攻撃し、倒した時点で終わる', () => {
    const outcome = simulate([ORIGIN], challenge({ hp: 20, attack: 10 }));

    assert.deepEqual(outcome.log, [
      { type: 'hit', actor: 'player', turn: 1, element: 'physical', damage: 10, targetHp: 10 },
      { type: 'hit', actor: 'boss', turn: 1, element: 'physical', damage: 10, targetHp: 90 },
      { type: 'hit', actor: 'player', turn: 2, element: 'physical', damage: 10, targetHp: 0 },
    ]);
    assert.deepEqual(outcome.summary, { turns: 2, bossHp: 0, playerHp: 90, playerMaxHp: 100, bossMaxHp: 20, loseReason: null });
  });

  test('反撃は1発ごとに受ける', () => {
    const outcome = simulate([ORIGIN, MULTI_HIT], challenge({ hp: 100, attack: 0, abilities: [{ type: 'counter', damage: 5 }], turnLimit: 1 }));
    const types = outcome.log.map((entry) => entry.type);

    assert.deepEqual(types, ['hit', 'counter', 'hit', 'counter', 'hit', 'turnLimit']);
  });

  test('multiHit を重ねると、回数と係数がそれぞれ掛け合わさる', () => {
    const second = node('multi-hit-2', [{ type: 'multiHit', hits: 2, ratio: 0.5 }]);
    const outcome = simulate([ORIGIN, MULTI_HIT, second], challenge({ hp: 100, attack: 0, turnLimit: 1 }));
    const hits = outcome.log.filter((entry) => entry.type === 'hit' && entry.actor === 'player');

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
    const secondHit = outcome.log.find((entry) => entry.type === 'hit' && entry.actor === 'player' && entry.turn === 2);

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

  test('小数の誤差でダメージが 1 下がらない', () => {
    const strong = node('strong', [{ type: 'stat', stat: 'attack', amount: 90 }]);
    // 100 × (1 − 0.9) は浮動小数点で 9.999… になる
    const outcome = simulate([ORIGIN, strong], challenge({ resistances: { physical: 0.9 } }));

    assert.equal(outcome.log[0].damage, 10);
  });
});

/**
 * 自分が行動したログだけを取り出す
 * @param {import('../src/types.js').SimulationResult} outcome
 * @param {'player' | 'boss'} actor
 * @param {string} type
 */
const entriesOf = (outcome, actor, type) =>
  outcome.log.filter((entry) => entry.type === type && 'actor' in entry && entry.actor === actor);

const FIRE = node('fire', [{ type: 'element', element: 'fire' }]);
const ICE = node('ice', [{ type: 'element', element: 'ice' }]);

describe('ローテーション', () => {
  // 物理を無効にし、炎は半減、氷はそのまま通す
  const resistant = { resistances: { physical: 1, fire: 0.5 }, hp: 1000, attack: 0, turnLimit: 4 };
  /** @param {import('../src/types.js').SimulationResult} outcome */
  const elements = (outcome) => entriesOf(outcome, 'player', 'hit').map((entry) => entry.element);

  test('周期スキルが無ければ、毎ターン物理で殴る', () => {
    assert.deepEqual(elements(simulate([ORIGIN], challenge(resistant))), ['physical', 'physical', 'physical', 'physical']);
  });

  test('周期スキルが1つなら、毎ターン使う', () => {
    assert.deepEqual(elements(simulate([ORIGIN, ICE], challenge(resistant))), ['ice', 'ice', 'ice', 'ice']);
  });

  test('周期スキルが2つなら、ビルドの並び順で交互に使う', () => {
    assert.deepEqual(elements(simulate([ORIGIN, FIRE, ICE], challenge(resistant))), ['fire', 'ice', 'fire', 'ice']);
    assert.deepEqual(elements(simulate([ORIGIN, ICE, FIRE], challenge(resistant))), ['ice', 'fire', 'ice', 'fire']);
  });

  test('属性を足すと、得意な属性の頻度が下がる', () => {
    const iceOnly = simulate([ORIGIN, ICE], challenge(resistant));
    const both = simulate([ORIGIN, FIRE, ICE], challenge(resistant));

    assert.ok(iceOnly.summary.bossHp < both.summary.bossHp);
  });

  test('連撃の全段が、そのターンの属性になる', () => {
    const outcome = simulate([ORIGIN, MULTI_HIT, FIRE, ICE], challenge({ ...resistant, turnLimit: 1 }));

    assert.deepEqual(elements(outcome), ['fire', 'fire']);
  });
});

describe('能力を味方が持つ場合と敵が持つ場合', () => {
  test('stat：敵の防御は与ダメージを、能力の攻撃加算は被ダメージを変える', () => {
    const outcome = simulate(
      [ORIGIN],
      challenge({ hp: 100, attack: 10, defense: 3, abilities: [{ type: 'stat', stat: 'attack', amount: 5 }], turnLimit: 1 }),
    );

    assert.equal(entriesOf(outcome, 'player', 'hit')[0].damage, 7);
    assert.equal(entriesOf(outcome, 'boss', 'hit')[0].damage, 15);
  });

  test('multiHit：敵も1ターンに分割して殴る', () => {
    const outcome = simulate(
      [ORIGIN],
      challenge({ hp: 100, attack: 10, abilities: [{ type: 'multiHit', hits: 2, ratio: 0.5 }], turnLimit: 1 }),
    );

    assert.deepEqual(
      entriesOf(outcome, 'boss', 'hit').map((entry) => entry.damage),
      [5, 5],
    );
  });

  test('conditional：敵も自分の HP が減ると与ダメージが上がる', () => {
    const strong = node('strong', [{ type: 'stat', stat: 'attack', amount: 40 }]);
    const outcome = simulate(
      [ORIGIN, strong],
      challenge({
        hp: 100,
        attack: 10,
        abilities: [{ type: 'conditional', hpRatioAtMost: 0.5, damageMultiplier: 3 }],
        turnLimit: 1,
      }),
    );

    // 1ターン目に 50 削られて HP が半分になるので、ボスの攻撃は 3 倍になる
    assert.equal(entriesOf(outcome, 'boss', 'hit')[0].damage, 30);
  });

  test('element：敵もローテーションで属性を変える', () => {
    const outcome = simulate(
      [ORIGIN],
      challenge({
        hp: 1000,
        attack: 10,
        abilities: [
          { type: 'element', element: 'fire' },
          { type: 'element', element: 'thunder' },
        ],
        turnLimit: 3,
      }),
    );

    assert.deepEqual(
      entriesOf(outcome, 'boss', 'hit').map((entry) => entry.element),
      ['fire', 'thunder', 'fire'],
    );
  });

  test('counter：味方も被弾1発ごとに、相手の防御を引いて反撃する', () => {
    const thorns = node('thorns', [{ type: 'counter', damage: 7 }]);
    const outcome = simulate([ORIGIN, thorns], challenge({ hp: 1000, attack: 10, defense: 2, turnLimit: 1 }));

    assert.deepEqual(entriesOf(outcome, 'player', 'counter'), [
      { type: 'counter', actor: 'player', turn: 1, damage: 5, targetHp: 1000 - 8 - 5 },
    ]);
  });

  test('regen：ターン開始に回復し、最大 HP は超えない', () => {
    const regen = node('regen', [{ type: 'regen', amount: 5 }]);
    const outcome = simulate(
      [ORIGIN, regen],
      challenge({ hp: 100, attack: 10, abilities: [{ type: 'regen', amount: 8 }], turnLimit: 2 }),
    );

    // 1ターン目はどちらも満タンなので回復しない
    assert.deepEqual(
      outcome.log.filter((entry) => entry.type === 'regen'),
      [
        { type: 'regen', actor: 'player', turn: 2, amount: 5, hp: 95 },
        { type: 'regen', actor: 'boss', turn: 2, amount: 8, hp: 98 },
      ],
    );
  });

  test('poison：ターン終了に、防御を無視して相手に与える', () => {
    const venom = node('venom', [{ type: 'poison', damage: 5 }]);
    const outcome = simulate(
      [ORIGIN, venom],
      challenge({ hp: 100, attack: 0, defense: 3, abilities: [{ type: 'poison', damage: 4 }], turnLimit: 1 }),
    );

    assert.deepEqual(
      outcome.log.filter((entry) => entry.type === 'poison'),
      [
        { type: 'poison', actor: 'player', turn: 1, damage: 5, targetHp: 100 - 7 - 5 },
        { type: 'poison', actor: 'boss', turn: 1, damage: 4, targetHp: 96 },
      ],
    );
  });

  test('poison：毒で倒しても勝ちになる', () => {
    const venom = node('venom', [{ type: 'poison', damage: 5 }]);
    const outcome = simulate([ORIGIN, venom], challenge({ hp: 15, attack: 0, turnLimit: 1 }));

    assert.equal(outcome.result, 'win');
  });

  test('endure：味方は1回だけ HP 1 で踏みとどまる', () => {
    const guts = node('guts', [{ type: 'endure' }]);
    const outcome = simulate([ORIGIN, guts], challenge({ hp: 1000, attack: 150 }));

    assert.deepEqual(entriesOf(outcome, 'player', 'endure'), [{ type: 'endure', actor: 'player', turn: 1, hp: 1 }]);
    assert.equal(outcome.summary.loseReason, 'defeated');
    assert.equal(outcome.summary.turns, 2);
  });

  test('endure：敵も1回だけ踏みとどまり、2回目で倒れる', () => {
    const outcome = simulate([ORIGIN], challenge({ hp: 10, attack: 0, abilities: [{ type: 'endure' }] }));

    assert.deepEqual(entriesOf(outcome, 'boss', 'endure'), [{ type: 'endure', actor: 'boss', turn: 1, hp: 1 }]);
    assert.equal(outcome.result, 'win');
    assert.equal(outcome.summary.turns, 2);
  });
});

describe('攻撃を当てた・受けたときの能力', () => {
  // 契機になる攻撃は、通常攻撃の1発と反撃。毒は含めない

  test('drain：味方は与ダメージの割合を回復し、満タンなら回復しない', () => {
    const drain = node('drain', [{ type: 'drain', ratio: 0.5 }]);
    const outcome = simulate([ORIGIN, drain], challenge({ hp: 1000, attack: 10, turnLimit: 2 }));

    assert.deepEqual(entriesOf(outcome, 'player', 'drain'), [{ type: 'drain', actor: 'player', turn: 2, amount: 5, hp: 95 }]);
  });

  test('drain：敵も与ダメージの割合を回復する', () => {
    const outcome = simulate([ORIGIN], challenge({ hp: 100, attack: 10, abilities: [{ type: 'drain', ratio: 0.5 }], turnLimit: 1 }));

    assert.deepEqual(entriesOf(outcome, 'boss', 'drain'), [{ type: 'drain', actor: 'boss', turn: 1, amount: 5, hp: 95 }]);
  });

  test('drain：反撃では回復し、毒では回復しない', () => {
    const vampire = node('vampire', [
      { type: 'drain', ratio: 0.5 },
      { type: 'counter', damage: 6 },
      { type: 'poison', damage: 4 },
    ]);
    const outcome = simulate([ORIGIN, vampire], challenge({ hp: 1000, attack: 10, turnLimit: 1 }));

    // 被弾で HP 90 になり、反撃の 6 の半分を回復する。ターン終了の毒では回復しない
    assert.deepEqual(entriesOf(outcome, 'player', 'drain'), [{ type: 'drain', actor: 'player', turn: 1, amount: 3, hp: 93 }]);
  });

  test('rage：味方は被弾するたびに攻撃が上がり、防御で0になった1発も数える', () => {
    const rage = node('rage', [
      { type: 'rage', amount: 2 },
      { type: 'stat', stat: 'defense', amount: 20 },
    ]);
    const outcome = simulate(
      [ORIGIN, rage],
      challenge({ hp: 1000, attack: 10, abilities: [{ type: 'multiHit', hits: 2, ratio: 0.5 }], turnLimit: 2 }),
    );

    assert.deepEqual(
      entriesOf(outcome, 'boss', 'hit').slice(0, 2).map((entry) => [entry.damage, entry.changes]),
      [
        [0, { attack: 12 }],
        [0, { attack: 14 }],
      ],
    );
    assert.equal(entriesOf(outcome, 'player', 'hit')[1].damage, 14);
  });

  test('rage：敵も被弾すると攻撃が上がる', () => {
    const outcome = simulate([ORIGIN], challenge({ hp: 1000, attack: 10, abilities: [{ type: 'rage', amount: 3 }], turnLimit: 1 }));

    assert.deepEqual(entriesOf(outcome, 'player', 'hit')[0].changes, { attack: 13 });
    assert.equal(entriesOf(outcome, 'boss', 'hit')[0].damage, 13);
  });

  test('rage：反撃は被弾に数え、毒は数えない', () => {
    const rage = node('rage', [{ type: 'rage', amount: 2 }]);
    const outcome = simulate(
      [ORIGIN, rage],
      challenge({
        hp: 1000,
        attack: 0,
        abilities: [
          { type: 'counter', damage: 5 },
          { type: 'poison', damage: 4 },
        ],
        turnLimit: 2,
      }),
    );

    // 1ターン目に反撃とボスの攻撃（0 ダメージ）で +4。毒も数えると、2ターン目は 16 になる
    assert.equal(entriesOf(outcome, 'player', 'hit')[1].damage, 14);
  });

  test('pierce：味方も敵も、相手の防御を引かない。反撃にも効く', () => {
    const pierce = node('pierce', [{ type: 'pierce' }, { type: 'counter', damage: 7 }]);
    const armor = node('armor', [{ type: 'stat', stat: 'defense', amount: 5 }]);
    const outcome = simulate(
      [ORIGIN, pierce, armor],
      challenge({ hp: 1000, attack: 10, defense: 5, abilities: [{ type: 'pierce' }], turnLimit: 1 }),
    );

    assert.equal(entriesOf(outcome, 'player', 'hit')[0].damage, 10);
    assert.equal(entriesOf(outcome, 'boss', 'hit')[0].damage, 10);
    assert.equal(entriesOf(outcome, 'player', 'counter')[0].damage, 7);
  });

  test('armorBreak：味方は当てるたびに相手の防御を下げ、0 未満にはしない', () => {
    const breaker = node('break', [{ type: 'armorBreak', amount: 2 }]);
    const outcome = simulate([ORIGIN, breaker], challenge({ hp: 1000, attack: 0, defense: 5, turnLimit: 3 }));

    assert.deepEqual(
      entriesOf(outcome, 'player', 'hit').map((entry) => [entry.damage, entry.changes]),
      [
        [5, { defense: 3 }],
        [7, { defense: 1 }],
        [9, { defense: 0 }],
      ],
    );
  });

  test('armorBreak：敵も当てるたびに相手の防御を下げる', () => {
    const armor = node('armor', [{ type: 'stat', stat: 'defense', amount: 4 }]);
    const outcome = simulate(
      [ORIGIN, armor],
      challenge({ hp: 1000, attack: 10, abilities: [{ type: 'armorBreak', amount: 3 }], turnLimit: 2 }),
    );

    assert.deepEqual(
      entriesOf(outcome, 'boss', 'hit').map((entry) => entry.damage),
      [6, 9],
    );
  });

  test('armorBreak：反撃でも相手の防御を下げる', () => {
    const breaker = node('break', [
      { type: 'armorBreak', amount: 1 },
      { type: 'counter', damage: 5 },
    ]);
    const outcome = simulate([ORIGIN, breaker], challenge({ hp: 1000, attack: 10, defense: 3, turnLimit: 2 }));

    // 1ターン目の通常攻撃で 3→2、反撃で 2→1 に下がる
    assert.deepEqual(
      entriesOf(outcome, 'player', 'hit').map((entry) => entry.damage),
      [7, 9],
    );
  });

  test('mark・burst：味方は刻印を付け、解放で全部使って倍率を掛ける', () => {
    const mark = node('mark', [{ type: 'mark', amount: 1 }]);
    const burst = node('burst', [{ type: 'burst', perMark: 0.5 }]);
    const outcome = simulate([ORIGIN, mark, ICE, burst], challenge({ hp: 1000, attack: 0, turnLimit: 4 }));

    assert.deepEqual(
      entriesOf(outcome, 'player', 'hit').map((entry) => [entry.element, entry.damage, entry.changes]),
      [
        ['ice', 10, { marks: 1 }],
        ['physical', 15, { marks: 1 }],
        ['ice', 10, { marks: 2 }],
        ['physical', 20, { marks: 1 }],
      ],
    );
    assert.deepEqual(
      entriesOf(outcome, 'player', 'burst').map((entry) => [entry.marks, entry.multiplier]),
      [
        [1, 1.5],
        [2, 2],
      ],
    );
  });

  test('mark・burst：敵も刻印を付けて解放する', () => {
    const outcome = simulate(
      [ORIGIN],
      challenge({
        hp: 1000,
        attack: 10,
        abilities: [
          { type: 'mark', amount: 2 },
          { type: 'burst', perMark: 0.5 },
        ],
        turnLimit: 2,
      }),
    );

    assert.deepEqual(
      entriesOf(outcome, 'boss', 'hit').map((entry) => entry.damage),
      [10, 20],
    );
  });

  test('倒した1発では、受けた側の状態を変えない', () => {
    const mark = node('mark', [{ type: 'mark', amount: 1 }]);
    const outcome = simulate([ORIGIN, mark], challenge({ hp: 10, attack: 0 }));

    assert.equal(entriesOf(outcome, 'player', 'hit')[0].changes, undefined);
  });
});

describe('倍率の能力', () => {
  test('tempo：味方は倍数のターンだけ倍率が掛かる', () => {
    const tempo = node('tempo', [{ type: 'tempo', every: 2, damageMultiplier: 3 }]);
    const outcome = simulate([ORIGIN, tempo], challenge({ hp: 1000, attack: 0, turnLimit: 4 }));

    assert.deepEqual(
      entriesOf(outcome, 'player', 'hit').map((entry) => [entry.damage, entry.tempo]),
      [
        [10, undefined],
        [30, 3],
        [10, undefined],
        [30, 3],
      ],
    );
  });

  test('tempo：敵も倍数のターンだけ倍率が掛かり、反撃には掛からない', () => {
    const outcome = simulate(
      [ORIGIN],
      challenge({
        hp: 1000,
        attack: 10,
        abilities: [
          { type: 'tempo', every: 1, damageMultiplier: 2 },
          { type: 'counter', damage: 5 },
        ],
        turnLimit: 1,
      }),
    );

    assert.equal(entriesOf(outcome, 'boss', 'hit')[0].damage, 20);
    assert.equal(entriesOf(outcome, 'boss', 'hit')[0].tempo, 2);
    assert.equal(entriesOf(outcome, 'boss', 'counter')[0].damage, 5);
  });

  test('charge：倍率は前回の発動からの経過ターン数で決まり、初回は戦闘開始から数える', () => {
    const charge = node('charge', [{ type: 'charge', perTurn: 0.5 }]);
    const outcome = simulate([ORIGIN, charge, FIRE, ICE], challenge({ hp: 1000, attack: 0, turnLimit: 4 }));

    // 1ターン目は経過1で 1.5 倍、4ターン目は周期スキル3つぶんの経過3で 2.5 倍
    assert.deepEqual(
      entriesOf(outcome, 'player', 'hit').map((entry) => [entry.element, entry.damage]),
      [
        ['physical', 15],
        ['fire', 10],
        ['ice', 10],
        ['physical', 25],
      ],
    );
    assert.deepEqual(
      entriesOf(outcome, 'player', 'charge').map((entry) => [entry.turn, entry.multiplier]),
      [
        [1, 1.5],
        [4, 2.5],
      ],
    );
  });

  test('charge：周期スキルが溜めだけなら、毎ターン経過1の倍率で殴る', () => {
    const outcome = simulate(
      [ORIGIN],
      challenge({ hp: 1000, attack: 10, abilities: [{ type: 'charge', perTurn: 1 }], turnLimit: 2 }),
    );

    assert.deepEqual(
      entriesOf(outcome, 'boss', 'hit').map((entry) => entry.damage),
      [20, 20],
    );
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

describe('連戦のお題', () => {
  const HP_REWARD = { type: 'stat', stat: 'hp', amount: 100 };
  const ATTACK_REWARD = { type: 'stat', stat: 'attack', amount: 10 };

  /** @param {object[]} enemies */
  const sequence = (enemies) => ({ ...group(enemies), mode: 'sequence' });

  // 起点だけなら 10 ダメージ × 1 発・HP 100。
  // 強敵は 報酬なしだと 5 発目の被弾で倒れるが、HP 報酬を持っていれば 10 ターン目に倒し切れる
  const weak = challenge({ name: '弱敵', hp: 20, attack: 10, reward: [HP_REWARD] });
  const strong = challenge({ name: '強敵', hp: 100, attack: 20, turnLimit: 20, reward: [ATTACK_REWARD] });

  test('報酬はビルドの能力に足される', () => {
    const profile = createProfile([ORIGIN], [HP_REWARD, ATTACK_REWARD]);
    assert.equal(profile.maxHp, 200);
    assert.equal(profile.attack, 20);
  });

  test('報酬を渡さなければ、これまでと同じ結果になる', () => {
    assert.deepEqual(simulate([ORIGIN], weak, []), simulate([ORIGIN], weak));
    assert.deepEqual(createProfile([ORIGIN], []), createProfile([ORIGIN]));
  });

  test('倒した敵の報酬を持って、次の敵と戦う', () => {
    assert.equal(simulate([ORIGIN], strong).result, 'lose');

    const results = simulateSequence([ORIGIN], sequence([weak, strong]), [0, 1]);
    assert.deepEqual(
      results.map((result) => result.result),
      ['win', 'win'],
    );
    assert.equal(results[1].summary.playerMaxHp, 200);
  });

  test('負けた戦闘で打ち切る', () => {
    const results = simulateSequence([ORIGIN], sequence([weak, strong]), [1, 0]);
    assert.deepEqual(
      results.map((result) => result.result),
      ['lose'],
    );
  });

  test('連戦中も、戦闘ごとに自分の HP は満タンから始まる', () => {
    const results = simulateSequence([ORIGIN], sequence([weak, weak]), [0, 1]);
    // 1戦目で HP 100 のうち 10 削られても持ち越さず、2戦目は HP 報酬を足した 200 から 1 発受けた分だけ減る
    assert.equal(results[1].summary.playerHp, 190);
  });

  test('勝てる順番だけを返す', () => {
    assert.deepEqual(winningOrders([ORIGIN], sequence([weak, strong])), [[0, 1]]);
  });

  test('どの順番でも勝てなければ空', () => {
    assert.deepEqual(winningOrders([ORIGIN], sequence([strong, strong])), []);
  });

  test('ある順番で全員に勝てればクリア。独立に戦えば負ける組でも通る', () => {
    assert.equal(clearsChallenge([ORIGIN], sequence([weak, strong])), true);
    assert.equal(clearsChallenge([ORIGIN], group([weak, strong])), false);
  });
});
