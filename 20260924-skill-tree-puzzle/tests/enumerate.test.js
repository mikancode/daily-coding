import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { enumerateBuilds } from '../src/core/enumerate.js';
import { collectConnected } from '../src/core/build.js';

/** @param {string} id */
const node = (id) => ({ id, name: id, pos: { x: 0, y: 0 }, effects: [] });

// origin ─ a
//   │      │     4ノードの閉路
//   c ──── b
const CYCLE = {
  originId: 'origin',
  nodes: ['origin', 'a', 'b', 'c'].map(node),
  edges: [
    ['origin', 'a'],
    ['a', 'b'],
    ['b', 'c'],
    ['c', 'origin'],
  ],
};

// origin ─ a ─ b      x はどこにも繋がらない
//   │
//   c
const BRANCH = {
  originId: 'origin',
  nodes: ['origin', 'a', 'b', 'c', 'x'].map(node),
  edges: [
    ['origin', 'a'],
    ['a', 'b'],
    ['origin', 'c'],
  ],
};

/** @param {Iterable<string[]>} builds */
const toKeys = (builds) => [...builds].map((build) => [...build].sort().join(',')).sort();

describe('enumerateBuilds', () => {
  test('閉路：pt が足りれば、起点を含む連結な部分集合をすべて数える', () => {
    // 1個：{origin}、2個：+a / +c、3個：+a+b / +c+b / +a+c、4個：全部
    assert.equal(toKeys(enumerateBuilds(CYCLE, 3)).length, 7);
  });

  test('閉路：起点以外が pt 以下のものだけを数える', () => {
    assert.deepEqual(toKeys(enumerateBuilds(CYCLE, 2)), [
      'a,b,origin',
      'a,c,origin',
      'a,origin',
      'b,c,origin',
      'c,origin',
      'origin',
    ]);
  });

  test('木：親を取らずに子だけを取るビルドと、繋がらないノードは出ない', () => {
    assert.deepEqual(toKeys(enumerateBuilds(BRANCH, 10)), [
      'a,b,c,origin',
      'a,b,origin',
      'a,c,origin',
      'a,origin',
      'c,origin',
      'origin',
    ]);
  });

  test('pt が0なら、起点だけのビルドになる', () => {
    assert.deepEqual([...enumerateBuilds(CYCLE, 0)], [['origin']]);
  });

  test('出てくるビルドは重複せず、すべて起点から連結', () => {
    const builds = [...enumerateBuilds(CYCLE, 3)];
    assert.equal(new Set(toKeys(builds)).size, builds.length);
    for (const build of builds) {
      assert.equal(collectConnected(CYCLE, new Set(build)).size, build.length);
    }
  });

  test('起点がツリーに無ければ例外になる', () => {
    assert.throws(() => [...enumerateBuilds({ ...CYCLE, originId: 'missing' }, 3)]);
  });
});
