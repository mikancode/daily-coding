import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { formatEntry } from '../src/ui/log-view.js';

const SUMMARY = { turns: 3, playerHp: 26, playerMaxHp: 100, bossHp: 54, bossMaxHp: 160, loseReason: null };

/** @param {object} entry */
const segments = (entry) => formatEntry(/** @type {any} */ (entry), /** @type {any} */ (SUMMARY));

/** @param {ReturnType<typeof segments>} parts @returns {string} */
const text = (parts) => parts.map((part) => (typeof part === 'string' ? part : part.text)).join('');

/** @param {ReturnType<typeof segments>} parts @returns {string[]} */
const favors = (parts) => parts.flatMap((part) => (typeof part === 'string' ? [] : [`${part.text}:${part.favor}`]));

describe('formatEntry の増減', () => {
  test('ボスが受けた DEF の減と刻印の増は、味方に有利', () => {
    const parts = segments({
      type: 'hit', actor: 'player', turn: 3, element: 'physical', damage: 20, targetHpBefore: 80, targetHp: 60,
      changes: { defense: { value: 5, base: 8, up: 0, down: 3 }, marks: { before: 1, after: 2 } },
    });
    assert.equal(text(parts), '3T 物理で20ダメージ(HP80→60/160) | DEF5(8-3), 刻印1→2');
    assert.deepEqual(favors(parts), ['-3:good', '1→2:good']);
  });

  test('ボスが受けた ATK の増は、味方に不利', () => {
    const parts = segments({
      type: 'counter', actor: 'player', turn: 4, damage: 6, targetHpBefore: 60, targetHp: 54,
      changes: { attack: { value: 19, base: 16, up: 3, down: 0 } },
    });
    assert.equal(text(parts), '4T 反撃でボスに6ダメージ(HP60→54/160) | ATK19(16+3)');
    assert.deepEqual(favors(parts), ['+3:bad']);
  });

  test('味方が受けた ATK の増は有利、減と刻印の増は不利', () => {
    const parts = segments({
      type: 'hit', actor: 'boss', turn: 4, element: 'physical', damage: 9, targetHpBefore: 26, targetHp: 17,
      changes: { attack: { value: 15, base: 16, up: 2, down: 3 }, marks: { before: 0, after: 1 } },
    });
    assert.equal(text(parts), '4T ボスの物理攻撃で9ダメージ受けた(HP26→17/100) | ATK15(16+2-3), 刻印0→1');
    assert.deepEqual(favors(parts), ['+2:good', '-3:bad', '0→1:bad']);
  });

  test('増減が無ければ合計だけで、色を付けない', () => {
    const parts = segments({
      type: 'hit', actor: 'player', turn: 1, element: 'physical', damage: 10, targetHpBefore: 160, targetHp: 150,
      tempo: 1.5, changes: { defense: { value: 8, base: 8, up: 0, down: 0 } },
    });
    assert.equal(text(parts), '1T 物理で10ダメージ(HP160→150/160) | 好機で1.5倍, DEF8');
    assert.deepEqual(favors(parts), []);
  });
});
