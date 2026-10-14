import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { ABILITIES, resolveAbility, timed } from '../src/core/ability-table.js';
import { createEnemyProfile } from '../src/core/profile.js';
import { describeEffect, formatBadgeLabel, formatNodeDescription, formatReward, profileEffects } from '../src/ui/ability-names.js';

describe('describeEffect', () => {
  for (const ability of ABILITIES) {
    test(`能力の表の ${ability.name} に説明文とバッジ名がある`, () => {
      const effect = ability.build(...ability.defaults);
      assert.notEqual(describeEffect(effect).trim(), '');
      assert.notEqual(formatBadgeLabel(effect).trim(), '');
    });
  }

  const argumentCases = [
    ['背水は HP の割合と倍率を埋め込む', 'Cond', [0.3, 3], ['30%', '3 倍']],
    ['連撃は回数と1発の倍率を埋め込む', 'Multi', [3, 0.4], ['3 回', '0.4 倍']],
    ['吸収は割合を百分率で埋め込む', 'Drain', [0.25], ['25%']],
    ['好機はターンの間隔と倍率を埋め込む', 'Tempo', [3, 1.5], ['3 の倍数', '1.5 倍']],
  ];
  for (const [label, name, args, fragments] of argumentCases) {
    test(label, () => {
      const description = describeEffect(resolveAbility(name, args).effect);
      for (const fragment of fragments) {
        assert.ok(description.includes(fragment), `${description} に ${fragment} が無い`);
      }
    });
  }
});

describe('formatNodeDescription', () => {
  test('ノード名は出さず、能力1つを1行で並べる', () => {
    const node = {
      id: 'test',
      name: '連撃・背水',
      pos: { x: 0, y: 0 },
      effects: [resolveAbility('Multi').effect, resolveAbility('Cond').effect],
    };
    const lines = formatNodeDescription(node).split('\n');
    assert.equal(lines.length, 2);
    assert.ok(!lines.includes('連撃・背水'));
  });
});

describe('profileEffects', () => {
  const enemy = { name: 'テスト', hp: 100, attack: 10, defense: 0, resistances: {}, turnLimit: 10 };

  test('ボスの能力は、ステータスの加算と連撃を除いてバッジにする', () => {
    const effects = profileEffects(
      createEnemyProfile({
        ...enemy,
        abilities: [
          { type: 'stat', stat: 'attack', amount: 5 },
          { type: 'multiHit', hits: 2, ratio: 0.5 },
          { type: 'counter', damage: 10 },
          { type: 'element', element: 'fire' },
        ],
      }),
    );
    assert.deepEqual(effects.map(formatBadgeLabel), ['炎', '反撃 10']);
  });

  test('能力が無いボスは、バッジを出さない', () => {
    assert.deepEqual(profileEffects(createEnemyProfile({ ...enemy, abilities: [] })), []);
  });
});

describe('根性・復活の表示', () => {
  const enemy = { name: 'テスト', hp: 100, attack: 10, defense: 0, resistances: {}, turnLimit: 10 };

  test('戻す HP が1なら根性、それより大きければ復活と呼ぶ', () => {
    assert.equal(formatBadgeLabel({ type: 'endure', hp: 1 }), '根性');
    assert.equal(formatReward({ type: 'endure', hp: 1 }), '根性');
    assert.equal(formatBadgeLabel({ type: 'endure', hp: 50 }), '復活 50');
    assert.equal(formatReward({ type: 'endure', hp: 50 }), '復活 50');
    assert.ok(describeEffect({ type: 'endure', hp: 50 }).includes('HP を 50 に戻す'));
  });

  test('根性と復活を両方持つボスは、戻す HP の大きいほうを1つだけバッジにする', () => {
    const effects = profileEffects(
      createEnemyProfile({
        ...enemy,
        abilities: [
          { type: 'endure', hp: 1 },
          { type: 'endure', hp: 30 },
        ],
      }),
    );
    assert.deepEqual(effects.map(formatBadgeLabel), ['復活 30']);
  });
});

describe('時限能力の表示', () => {
  const POISON = { type: 'poison', damage: 5 };
  const cases = [
    ['最初の x ターン', { kind: 'first', turns: 3 }, '毒 5（〜3T）', '最初の 3 ターンだけ有効。'],
    ['x ターン目から', { kind: 'from', turn: 4 }, '毒 5（4T〜）', '4 ターン目から有効。'],
    ['x ターン目だけ', { kind: 'at', turn: 2 }, '毒 5（2T）', '2 ターン目だけ有効。'],
    ['ローテーション', { kind: 'rotation', turns: 2 }, '毒 5（周期2T）', 'そのターンから 2 ターン有効'],
    ['HP の割合以下', { kind: 'hpAtMost', ratio: 0.5 }, '毒 5（HP50%以下）', '50% 以下になったら有効になり、回復しても切れない。'],
    ['復活後', { kind: 'revived' }, '毒 5（復活後）', '根性・復活が発動したら有効になる。'],
  ];
  for (const [label, period, badge, fragment] of cases) {
    test(`${label}：バッジ名に期間を添え、説明は期間の文に中身の説明を続ける`, () => {
      const effect = timed(period, POISON);
      assert.equal(formatBadgeLabel(effect), badge);
      const description = describeEffect(effect);
      assert.ok(description.includes(fragment), `${description} に ${fragment} が無い`);
      assert.ok(description.endsWith(describeEffect(POISON)), description);
    });
  }

  test('報酬の一覧では、中身の名前に期間を添える', () => {
    const effect = timed({ kind: 'first', turns: 3 }, { type: 'stat', stat: 'attack', amount: 5 });
    assert.equal(formatReward(effect), 'ATK +5（〜3T）');
  });

  test('ボスの時限能力は、ステータスの加算を包んでいてもバッジにする', () => {
    const effects = profileEffects(
      createEnemyProfile({
        name: 'テスト',
        hp: 100,
        attack: 10,
        defense: 0,
        resistances: {},
        turnLimit: 10,
        abilities: [
          timed({ kind: 'from', turn: 4 }, { type: 'stat', stat: 'attack', amount: 5 }),
          timed({ kind: 'rotation', turns: 2 }, { type: 'counter', damage: 10 }),
        ],
      }),
    );
    assert.deepEqual(effects.map(formatBadgeLabel), ['反撃 10（周期2T）', 'ATK +5（4T〜）']);
  });
});
