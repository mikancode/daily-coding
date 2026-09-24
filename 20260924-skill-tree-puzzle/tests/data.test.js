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
    for (const key of ['hp', 'turnLimit', 'points']) {
      assert.ok(Number.isInteger(challenge[key]) && challenge[key] > 0, `${challenge.id}.${key}`);
    }
    for (const key of ['attack', 'counter']) {
      assert.ok(Number.isInteger(challenge[key]) && challenge[key] >= 0, `${challenge.id}.${key}`);
    }
    for (const [element, reduction] of Object.entries(challenge.resistances)) {
      assert.ok(reduction >= 0 && reduction <= 1, `${challenge.id}.resistances.${element}`);
    }
  }
});
