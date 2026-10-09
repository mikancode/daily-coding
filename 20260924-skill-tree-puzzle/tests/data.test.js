import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHARACTERS } from '../src/data/characters.js';
import { collectConnected } from '../src/core/build.js';
import { minimumClearPoints } from '../src/core/enumerate.js';

const WARRIOR_ID = 'warrior';
const WARRIOR_NODE_COUNT = 43;
const SEQUENCE_ENEMY_COUNT = 3;

/** @param {string} id */
function findCharacter(id) {
  const character = CHARACTERS.find((candidate) => candidate.id === id);
  assert.ok(character !== undefined, `キャラが見つかりません: ${id}`);
  return character;
}

test('キャラが1体以上あり、ID は重複しない', () => {
  const ids = CHARACTERS.map((character) => character.id);
  assert.ok(ids.length > 0);
  assert.equal(new Set(ids).size, ids.length);
});

test('キャラの ID は、保存キーの区切りの : を含まない', () => {
  for (const character of CHARACTERS) {
    assert.ok(!character.id.includes(':'), character.id);
  }
});

for (const { id: characterId, tree, challenges } of CHARACTERS) {
  const nodeIds = tree.nodes.map((node) => node.id);

  test(`${characterId}: ノードの ID は重複しない`, () => {
    assert.equal(new Set(nodeIds).size, nodeIds.length);
  });

  test(`${characterId}: ノードの表示位置は重ならない`, () => {
    const positions = tree.nodes.map((node) => `${node.pos.x},${node.pos.y}`);
    assert.equal(new Set(positions).size, positions.length);
  });

  test(`${characterId}: 起点は実在するノード`, () => {
    assert.ok(nodeIds.includes(tree.originId));
  });

  test(`${characterId}: 辺は実在する2つの異なるノードを結ぶ`, () => {
    for (const [a, b] of tree.edges) {
      assert.ok(nodeIds.includes(a), `未知のノード: ${a}`);
      assert.ok(nodeIds.includes(b), `未知のノード: ${b}`);
      assert.notEqual(a, b);
    }
  });

  test(`${characterId}: 同じ2ノードを結ぶ辺は重複しない`, () => {
    const keys = tree.edges.map(([a, b]) => [a, b].sort().join('|'));
    assert.equal(new Set(keys).size, keys.length);
  });

  test(`${characterId}: 全ノードを取得すれば、すべて起点から連結になる`, () => {
    const connected = collectConnected(tree, new Set(nodeIds));
    const unreachable = nodeIds.filter((id) => !connected.has(id));
    assert.deepEqual(unreachable, []);
  });

  test(`${characterId}: お題が1つ以上あり、ID は重複しない`, () => {
    const ids = challenges.map((challenge) => challenge.id);
    assert.ok(ids.length > 0);
    assert.equal(new Set(ids).size, ids.length);
  });

  test(`${characterId}: お題の数値は妥当な範囲にある`, () => {
    for (const challenge of challenges) {
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

  test(`${characterId}: お題の最少 pt は、配布 pt で組めるビルドの総当たりの結果と一致する`, () => {
    for (const challenge of challenges) {
      assert.equal(challenge.minimumPoints, minimumClearPoints(tree, challenge), `${challenge.id}.minimumPoints`);
    }
  });

  test(`${characterId}: 公開版で選べるお題が1つ以上ある`, () => {
    assert.ok(challenges.some((challenge) => challenge.debugOnly !== true));
  });

  test(`${characterId}: 連戦のお題は、敵を ${SEQUENCE_ENEMY_COUNT} 体持ち、全員が報酬を持つ`, () => {
    for (const challenge of challenges.filter((candidate) => candidate.mode === 'sequence')) {
      assert.equal(challenge.enemies.length, SEQUENCE_ENEMY_COUNT, `${challenge.id}.enemies`);
      challenge.enemies.forEach((enemy, index) => {
        assert.ok(enemy.reward !== undefined && enemy.reward.length > 0, `${challenge.id}.enemies[${index}].reward`);
      });
    }
  });
}

test(`戦士: ノードは ${WARRIOR_NODE_COUNT} 個`, () => {
  assert.equal(findCharacter(WARRIOR_ID).tree.nodes.length, WARRIOR_NODE_COUNT);
});

test('戦士: ノードの表示名と効果は、能力の表から作られる', () => {
  const byId = new Map(findCharacter(WARRIOR_ID).tree.nodes.map((node) => [node.id, node]));
  assert.equal(byId.get('origin')?.name, '起点');
  assert.deepEqual(byId.get('origin')?.effects, [
    { type: 'stat', stat: 'hp', amount: 100 },
    { type: 'stat', stat: 'attack', amount: 10 },
  ]);
  assert.equal(byId.get('atk-1')?.name, 'ATK+3');
  assert.equal(byId.get('multi-hit')?.name, '連撃');
  assert.deepEqual(byId.get('multi-hit')?.effects, [{ type: 'multiHit', hits: 2, ratio: 0.6 }]);
});

test('戦士: 連戦のお題を持つ', () => {
  const { challenges } = findCharacter(WARRIOR_ID);
  assert.ok(challenges.some((challenge) => challenge.mode === 'sequence'));
});
