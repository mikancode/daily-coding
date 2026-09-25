import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { restoreBuild, serializeBuild } from '../src/core/saved-build.js';

/** @param {string} id */
const node = (id) => ({ id, name: id, pos: { x: 0, y: 0 }, effects: [] });

// origin ─ a ─ b
//   │
//   c
const TREE = {
  originId: 'origin',
  nodes: ['origin', 'a', 'b', 'c'].map(node),
  edges: [
    ['origin', 'a'],
    ['a', 'b'],
    ['origin', 'c'],
  ],
};
const POINTS = 2;

describe('serializeBuild', () => {
  test('起点を除き、ツリーのノード順で並べる', () => {
    assert.equal(serializeBuild(TREE, new Set(['b', 'origin', 'a'])), '["a","b"]');
  });
});

describe('restoreBuild', () => {
  test('保存したビルドを元に戻せる', () => {
    const owned = new Set(['origin', 'a', 'b']);
    assert.deepEqual(restoreBuild(TREE, POINTS, serializeBuild(TREE, owned)), { status: 'restored', owned });
  });

  test('起点だけのビルドも元に戻せる', () => {
    assert.deepEqual(restoreBuild(TREE, POINTS, '[]'), { status: 'restored', owned: new Set(['origin']) });
  });

  test('保存が無ければ none', () => {
    assert.deepEqual(restoreBuild(TREE, POINTS, null), { status: 'none' });
  });

  const invalidCases = [
    ['JSON として読めない', '["a"'],
    ['配列でない', '{"a":true}'],
    ['文字列でない要素がある', '[1]'],
    ['存在しないノードがある', '["a","missing"]'],
    ['起点を含む', '["origin","a"]'],
    ['重複がある', '["a","a"]'],
    ['配布 pt を超える', '["a","b","c"]'],
    ['起点から繋がらない', '["b"]'],
  ];
  for (const [label, raw] of invalidCases) {
    test(`${label}なら invalid`, () => {
      assert.deepEqual(restoreBuild(TREE, POINTS, raw), { status: 'invalid' });
    });
  }
});
