import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { ABILITIES, resolveAbility } from '../src/core/ability-table.js';
import { createEnemyProfile } from '../src/core/profile.js';
import { describeEffect, formatBadgeLabel, profileEffects } from '../src/ui/ability-names.js';
import { formatNodeDescription } from '../src/ui/node-description.js';

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
  test('ノード名の行に続けて、能力1つを1行で並べる', () => {
    const node = {
      id: 'test',
      name: '連撃・背水',
      pos: { x: 0, y: 0 },
      effects: [resolveAbility('Multi').effect, resolveAbility('Cond').effect],
    };
    const lines = formatNodeDescription(node).split('\n');
    assert.equal(lines.length, 3);
    assert.equal(lines[0], '連撃・背水');
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
