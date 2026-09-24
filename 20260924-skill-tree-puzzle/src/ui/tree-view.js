// @ts-check

/**
 * @typedef {import('../types.js').NodeId} NodeId
 * @typedef {import('../types.js').SkillTree} SkillTree
 * @typedef {import('../types.js').GridPosition} GridPosition
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

/** viewBox 上の1マスの大きさ。画面上の大きさは SVG の表示サイズに合わせて伸縮する */
const CELL_SIZE = 64;
/** ラベル「攻撃+3」が収まるよう、見た目は円ではなく横長の角丸矩形にする */
const NODE_WIDTH = 56;
const NODE_HEIGHT = 40;
const NODE_CORNER_RADIUS = 8;
const LABEL_FONT_SIZE = 13;
const EDGE_WIDTH = 4;
/**
 * タップ領域はマス全体にする。隣のマスと重ならない範囲で最も広いため。
 * 1マスがこの値を下回らないよう、SVG の最小の高さを 行数 × この値 にする
 */
const MIN_TAP_PX = 44;

/**
 * @param {string} tagName
 * @param {Record<string, string | number>} attributes
 * @returns {SVGElement}
 */
function createSvgElement(tagName, attributes) {
  const element = /** @type {SVGElement} */ (document.createElementNS(SVG_NS, tagName));
  for (const [name, value] of Object.entries(attributes)) {
    element.setAttribute(name, String(value));
  }
  return element;
}

/**
 * @param {GridPosition} pos
 * @returns {{ x: number, y: number }}
 */
function cellCenter(pos) {
  return { x: pos.x * CELL_SIZE + CELL_SIZE / 2, y: pos.y * CELL_SIZE + CELL_SIZE / 2 };
}

/**
 * ツリーを描画し、ノードのタップを通知する。取得・解除できるかの判定は呼び出し側が持つ
 * @param {SVGSVGElement} svg
 * @param {SkillTree} tree
 * @param {(nodeId: NodeId) => void} onTap
 */
export function createTreeView(svg, tree, onTap) {
  const columns = Math.max(...tree.nodes.map((node) => node.pos.x)) + 1;
  const rows = Math.max(...tree.nodes.map((node) => node.pos.y)) + 1;
  svg.setAttribute('viewBox', `0 0 ${columns * CELL_SIZE} ${rows * CELL_SIZE}`);
  svg.style.minHeight = `${rows * MIN_TAP_PX}px`;

  const positions = new Map(tree.nodes.map((node) => [node.id, node.pos]));
  /** @type {{ element: SVGElement, from: NodeId, to: NodeId }[]} */
  const edgeElements = [];
  for (const [from, to] of tree.edges) {
    const start = cellCenter(/** @type {GridPosition} */ (positions.get(from)));
    const end = cellCenter(/** @type {GridPosition} */ (positions.get(to)));
    const line = createSvgElement('line', {
      class: 'tree-edge',
      x1: start.x,
      y1: start.y,
      x2: end.x,
      y2: end.y,
      'stroke-width': EDGE_WIDTH,
    });
    svg.append(line);
    edgeElements.push({ element: line, from, to });
  }

  /** @type {Map<NodeId, SVGElement>} */
  const nodeElements = new Map();
  for (const node of tree.nodes) {
    const center = cellCenter(node.pos);
    const group = createSvgElement('g', { class: 'tree-node', 'data-node-id': node.id });
    group.append(
      createSvgElement('rect', {
        class: 'tree-node-hit',
        x: node.pos.x * CELL_SIZE,
        y: node.pos.y * CELL_SIZE,
        width: CELL_SIZE,
        height: CELL_SIZE,
      }),
      createSvgElement('rect', {
        class: 'tree-node-body',
        x: center.x - NODE_WIDTH / 2,
        y: center.y - NODE_HEIGHT / 2,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        rx: NODE_CORNER_RADIUS,
      }),
    );
    const label = createSvgElement('text', {
      class: 'tree-node-label',
      x: center.x,
      y: center.y,
      'font-size': LABEL_FONT_SIZE,
    });
    label.textContent = node.name;
    group.append(label);
    svg.append(group);
    nodeElements.set(node.id, group);
  }

  svg.addEventListener('click', (event) => {
    const target = /** @type {Element} */ (event.target);
    const group = target.closest('[data-node-id]');
    const nodeId = group?.getAttribute('data-node-id');
    if (nodeId) {
      onTap(nodeId);
    }
  });

  return {
    /**
     * @param {ReadonlySet<NodeId>} owned
     * @param {ReadonlySet<NodeId>} acquirable 今タップすれば取れるノード
     */
    render(owned, acquirable) {
      for (const [nodeId, element] of nodeElements) {
        element.classList.toggle('is-owned', owned.has(nodeId));
        element.classList.toggle('is-acquirable', acquirable.has(nodeId));
      }
      for (const { element, from, to } of edgeElements) {
        element.classList.toggle('is-owned', owned.has(from) && owned.has(to));
      }
    },
  };
}
