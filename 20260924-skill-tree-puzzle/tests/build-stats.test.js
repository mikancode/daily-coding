import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { createProfile } from '../src/core/profile.js';
import { buildStatsBadges, formatBuildStats } from '../src/ui/build-stats.js';

/** @param {string} id @param {object[]} effects */
const node = (id, effects) => ({ id, name: id, pos: { x: 0, y: 0 }, effects });

const ORIGIN = node('origin', [
  { type: 'stat', stat: 'hp', amount: 100 },
  { type: 'stat', stat: 'attack', amount: 13 },
]);

/** @param {object[]} build @returns {string[]} */
const badgeLabels = (build) => buildStatsBadges(createProfile(build)).map(({ label }) => label);

describe('formatBuildStats', () => {
  test('1行目は HP・攻撃・防御だけを出す', () => {
    assert.equal(formatBuildStats(createProfile([ORIGIN])), 'HP 100 / 攻撃 13 / 防御 0');
  });

  test('連撃は、丸めない1発の威力と回数で出す', () => {
    const build = [ORIGIN, node('multi-hit', [{ type: 'multiHit', hits: 2, ratio: 0.5 }])];
    assert.equal(formatBuildStats(createProfile(build)), 'HP 100 / 攻撃 6.5 × 2回 / 防御 0');
  });
});

describe('buildStatsBadges', () => {
  test('周期スキルが無ければ、毎ターン物理で殴るので物理のバッジを出す', () => {
    const [badge] = buildStatsBadges(createProfile([ORIGIN]));
    assert.equal(badge.label, '物理');
    assert.ok(badge.description.includes('周期スキルを取っていない'));
  });

  test('周期スキルはローテーションの順に先頭へ、ほかの能力は後ろに並べる', () => {
    const build = [
      ORIGIN,
      node('charge', [{ type: 'charge', perTurn: 0.5 }]),
      node('ice', [{ type: 'element', element: 'ice' }]),
      node('burst', [{ type: 'burst', perMark: 0.2 }]),
      node('last-stand', [{ type: 'conditional', hpRatioAtMost: 0.5, damageMultiplier: 2 }]),
      node('tempo', [{ type: 'tempo', every: 2, damageMultiplier: 2 }]),
      node('drain', [{ type: 'drain', ratio: 0.5 }]),
      node('pierce', [{ type: 'pierce' }]),
      node('mark', [{ type: 'mark', amount: 1 }]),
    ];
    assert.deepEqual(badgeLabels(build), ['溜め', '氷', '解放', '背水', '好機', '吸収 50%', '貫通', '刻印 1']);
  });

  test('同じ能力を複数取ると、合計した値で1つのバッジにする', () => {
    const build = [
      ORIGIN,
      node('counter-1', [{ type: 'counter', damage: 10 }]),
      node('counter-2', [{ type: 'counter', damage: 10 }]),
    ];
    assert.deepEqual(badgeLabels(build), ['物理', '反撃 20']);
  });
});
