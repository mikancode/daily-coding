import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { canAcquire, canRelease, collectConnected } from '../src/core/build.js';

/** @param {string} id */
const node = (id) => ({ id, name: id, pos: { x: 0, y: 0 }, effects: [] });

// origin ─ a ─ b      a・d・c・origin は閉路になる
//   │      │
//   c ──── d
const TREE = {
  originId: 'origin',
  nodes: ['origin', 'a', 'b', 'c', 'd'].map(node),
  edges: [
    ['origin', 'a'],
    ['a', 'b'],
    ['origin', 'c'],
    ['c', 'd'],
    ['d', 'a'],
  ],
};

describe('canAcquire', () => {
  test('取得済みノードに隣接していれば取れる', () => {
    assert.equal(canAcquire(TREE, new Set(['origin']), 'a'), true);
  });

  test('取得済みノードに隣接していなければ取れない', () => {
    assert.equal(canAcquire(TREE, new Set(['origin']), 'b'), false);
  });

  test('取得済みのノードは取れない', () => {
    assert.equal(canAcquire(TREE, new Set(['origin', 'a']), 'a'), false);
  });

  test('存在しないノードは例外になる', () => {
    assert.throws(() => canAcquire(TREE, new Set(['origin']), 'missing'));
  });
});

describe('canRelease', () => {
  test('末端のノードは外せる', () => {
    assert.equal(canRelease(TREE, new Set(['origin', 'a', 'b']), 'b'), true);
  });

  test('外すと連結が切れるノードは外せない', () => {
    assert.equal(canRelease(TREE, new Set(['origin', 'a', 'b']), 'a'), false);
  });

  test('閉路上のノードは、別の経路で連結が保たれるので外せる', () => {
    assert.equal(canRelease(TREE, new Set(['origin', 'a', 'c', 'd']), 'a'), true);
  });

  test('起点は外せない', () => {
    assert.equal(canRelease(TREE, new Set(['origin', 'a']), 'origin'), false);
  });

  test('未取得のノードは外せない', () => {
    assert.equal(canRelease(TREE, new Set(['origin']), 'a'), false);
  });

  test('存在しないノードは例外になる', () => {
    assert.throws(() => canRelease(TREE, new Set(['origin']), 'missing'));
  });
});

describe('collectConnected', () => {
  test('取得済みノードだけを通って、起点からたどれるノードを返す', () => {
    // b は取得済みだが、間の a が未取得なのでたどれない
    const connected = collectConnected(TREE, new Set(['origin', 'b', 'c']));
    assert.deepEqual([...connected].sort(), ['c', 'origin']);
  });

  test('起点を取得していなければ、何もたどれない', () => {
    assert.equal(collectConnected(TREE, new Set(['a', 'b'])).size, 0);
  });
});
