import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { createProfile } from '../src/core/simulate.js';
import { formatBuildStats } from '../src/ui/build-stats.js';

/** @param {string} id @param {object[]} effects */
const node = (id, effects) => ({ id, name: id, pos: { x: 0, y: 0 }, effects });

const ORIGIN = node('origin', [
  { type: 'stat', stat: 'hp', amount: 100 },
  { type: 'stat', stat: 'attack', amount: 13 },
]);

describe('formatBuildStats', () => {
  test('起点だけなら、物理だけで1発ずつ殴る', () => {
    assert.equal(formatBuildStats(createProfile([ORIGIN])), 'HP 100 / 攻撃 13 / 防御 0 / 属性：物理');
  });

  test('連撃は、丸めない1発の威力と回数で出す', () => {
    const build = [ORIGIN, node('multi-hit', [{ type: 'multiHit', hits: 2, ratio: 0.5 }])];
    assert.equal(formatBuildStats(createProfile(build)), 'HP 100 / 攻撃 6.5 × 2回 / 防御 0 / 属性：物理');
  });

  test('条件付きの倍率と、追加した属性を出す', () => {
    const build = [
      ORIGIN,
      node('def', [{ type: 'stat', stat: 'defense', amount: 2 }]),
      node('thunder', [{ type: 'element', element: 'thunder' }]),
      node('last-stand', [{ type: 'conditional', hpRatioAtMost: 0.5, damageMultiplier: 2 }]),
    ];
    assert.equal(
      formatBuildStats(createProfile(build)),
      'HP 100 / 攻撃 13 / 防御 2 / 属性：物理・雷 / HP 50%以下で与ダメージ2倍',
    );
  });
});
