// @ts-check
// タップしたノードの能力の説明の表示

import { describeEffect } from './ability-names.js';

/**
 * @typedef {import('../types.js').SkillNode} SkillNode
 */

/**
 * ノード名の行に続けて、能力1つを1行で並べる。ノード名が能力名を並べたものなので、行には能力名を繰り返さない
 * @param {SkillNode} node
 * @returns {string}
 */
export function formatNodeDescription(node) {
  return [node.name, ...node.effects.map(describeEffect)].join('\n');
}

/**
 * タップしたノードの説明。取得・解除できたかに関わらず出し、取得できないノードの効き方も読めるようにする
 * @param {HTMLElement} element
 */
export function createNodeDescriptionView(element) {
  return {
    /** @param {SkillNode} node */
    render(node) {
      element.textContent = formatNodeDescription(node);
    },
    clear() {
      element.textContent = '';
    },
  };
}
