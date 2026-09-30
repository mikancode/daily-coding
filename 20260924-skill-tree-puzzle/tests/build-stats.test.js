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
  test('起点だけなら、毎ターン物理で1発ずつ殴る', () => {
    assert.equal(formatBuildStats(createProfile([ORIGIN])), 'HP 100 / 攻撃 13 / 防御 0 / ローテーション：物理');
  });

  test('連撃は、丸めない1発の威力と回数で出す', () => {
    const build = [ORIGIN, node('multi-hit', [{ type: 'multiHit', hits: 2, ratio: 0.5 }])];
    assert.equal(formatBuildStats(createProfile(build)), 'HP 100 / 攻撃 6.5 × 2回 / 防御 0 / ローテーション：物理');
  });

  test('条件付きの倍率と、属性のローテーションを並び順に出す', () => {
    const build = [
      ORIGIN,
      node('def', [{ type: 'stat', stat: 'defense', amount: 2 }]),
      node('thunder', [{ type: 'element', element: 'thunder' }]),
      node('fire', [{ type: 'element', element: 'fire' }]),
      node('last-stand', [{ type: 'conditional', hpRatioAtMost: 0.5, damageMultiplier: 2 }]),
    ];
    assert.equal(
      formatBuildStats(createProfile(build)),
      'HP 100 / 攻撃 13 / 防御 2 / ローテーション：雷→炎 / HP 50%以下で与ダメージ2倍',
    );
  });

  test('溜め・解放はローテーションに、ほかの能力は後ろに並べる', () => {
    const build = [
      ORIGIN,
      node('charge', [{ type: 'charge', perTurn: 0.5 }]),
      node('ice', [{ type: 'element', element: 'ice' }]),
      node('burst', [{ type: 'burst', perMark: 0.2 }]),
      node('tempo', [{ type: 'tempo', every: 2, damageMultiplier: 2 }]),
      node('drain', [{ type: 'drain', ratio: 0.5 }]),
      node('pierce', [{ type: 'pierce' }]),
      node('mark', [{ type: 'mark', amount: 1 }]),
    ];
    assert.equal(
      formatBuildStats(createProfile(build)),
      'HP 100 / 攻撃 13 / 防御 0 / ローテーション：溜め→氷→解放 / 2の倍数のターンに与ダメージ2倍 / 吸収 50% / 貫通 / 刻印 1',
    );
  });
});
