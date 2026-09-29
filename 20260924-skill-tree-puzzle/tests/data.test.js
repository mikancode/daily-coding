import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TREE } from '../src/data/tree.js';
import { CHALLENGES } from '../src/data/challenges.js';
import { collectConnected } from '../src/core/build.js';

const EXPECTED_NODE_COUNT = 30;

const nodeIds = TREE.nodes.map((node) => node.id);

test(`ノードは ${EXPECTED_NODE_COUNT} 個`, () => {
  assert.equal(TREE.nodes.length, EXPECTED_NODE_COUNT);
});

test('ノードの ID は重複しない', () => {
  assert.equal(new Set(nodeIds).size, nodeIds.length);
});

test('ノードの表示位置は重ならない', () => {
  const positions = TREE.nodes.map((node) => `${node.pos.x},${node.pos.y}`);
  assert.equal(new Set(positions).size, positions.length);
});

test('ノードの表示名と効果は、能力の表から作られる', () => {
  const byId = new Map(TREE.nodes.map((node) => [node.id, node]));
  assert.equal(byId.get('origin')?.name, '起点');
  assert.deepEqual(byId.get('origin')?.effects, [
    { type: 'stat', stat: 'hp', amount: 100 },
    { type: 'stat', stat: 'attack', amount: 10 },
  ]);
  assert.equal(byId.get('atk-1')?.name, '攻撃+3');
  assert.equal(byId.get('multi-hit')?.name, '連撃');
  assert.deepEqual(byId.get('multi-hit')?.effects, [{ type: 'multiHit', hits: 2, ratio: 0.5 }]);
});

test('起点は実在するノード', () => {
  assert.ok(nodeIds.includes(TREE.originId));
});

test('辺は実在する2つの異なるノードを結ぶ', () => {
  for (const [a, b] of TREE.edges) {
    assert.ok(nodeIds.includes(a), `未知のノード: ${a}`);
    assert.ok(nodeIds.includes(b), `未知のノード: ${b}`);
    assert.notEqual(a, b);
  }
});

test('同じ2ノードを結ぶ辺は重複しない', () => {
  const keys = TREE.edges.map(([a, b]) => [a, b].sort().join('|'));
  assert.equal(new Set(keys).size, keys.length);
});

test('全ノードを取得すれば、すべて起点から連結になる', () => {
  const connected = collectConnected(TREE, new Set(nodeIds));
  const unreachable = nodeIds.filter((id) => !connected.has(id));
  assert.deepEqual(unreachable, []);
});

test('お題が1つ以上あり、ID は重複しない', () => {
  const ids = CHALLENGES.map((challenge) => challenge.id);
  assert.ok(ids.length > 0);
  assert.equal(new Set(ids).size, ids.length);
});

test('お題の数値は妥当な範囲にある', () => {
  for (const challenge of CHALLENGES) {
    assert.ok(Number.isInteger(challenge.points) && challenge.points > 0, `${challenge.id}.points`);
    assert.ok(challenge.enemies.length > 0, `${challenge.id}.enemies`);
    challenge.enemies.forEach((enemy, index) => {
      const label = `${challenge.id}.enemies[${index}]`;
      for (const key of ['hp', 'turnLimit']) {
        assert.ok(Number.isInteger(enemy[key]) && enemy[key] > 0, `${label}.${key}`);
      }
      for (const key of ['attack', 'defense']) {
        assert.ok(Number.isInteger(enemy[key]) && enemy[key] >= 0, `${label}.${key}`);
      }
      assert.ok(Array.isArray(enemy.abilities), `${label}.abilities`);
      for (const [element, reduction] of Object.entries(enemy.resistances)) {
        assert.ok(reduction >= 0 && reduction <= 1, `${label}.resistances.${element}`);
      }
    });
  }
});

test('連戦のお題は、敵を3体持ち、全員が報酬を持つ', () => {
  const sequences = CHALLENGES.filter((challenge) => challenge.mode === 'sequence');
  assert.ok(sequences.length > 0);
  for (const challenge of sequences) {
    assert.equal(challenge.enemies.length, 3, `${challenge.id}.enemies`);
    challenge.enemies.forEach((enemy, index) => {
      assert.ok(enemy.reward !== undefined && enemy.reward.length > 0, `${challenge.id}.enemies[${index}].reward`);
    });
  }
});
