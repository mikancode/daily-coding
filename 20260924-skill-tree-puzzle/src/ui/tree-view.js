// @ts-check
// スキルツリーの描画と、ノードのタップの通知

/**
 * @typedef {import('../types.js').NodeId} NodeId
 * @typedef {import('../types.js').SkillTree} SkillTree
 * @typedef {import('../types.js').GridPosition} GridPosition
 * @typedef {import('../types.js').SkillNode} SkillNode
 * @typedef {import('../types.js').StatId} StatId
 */

/**
 * 塗りの色の系統。ステータスを足すだけのノードは足すステータスで分け、
 * 挙動を変えるノード（起点・連撃・背水・属性）はまとめて special にする
 * @typedef {StatId | 'special'} NodeCategory
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * viewBox 上の1マスの大きさ。画面上の大きさは SVG の表示サイズに合わせて伸縮する。
 * 7列を幅 360px のスマホに収めたとき、ラベルが 10px 前後で読めるよう、ノードとの隙間を詰めてある。
 * 隙間を残すのは、左右・上下に隣接するノードの間を通る辺（破線）を見えるようにするため
 */
const CELL_WIDTH = 64;
const CELL_HEIGHT = 56;
/** ラベル「ATK+3」が収まるよう、見た目は円ではなく横長の角丸矩形にする */
const NODE_WIDTH = 48;
const NODE_HEIGHT = 40;
const NODE_CORNER_RADIUS = 8;
/** special は枠を状態の表示に使うため、形（角丸の大きいピル形）で見分ける */
const SPECIAL_NODE_CORNER_RADIUS = NODE_HEIGHT / 2;
const LABEL_FONT_SIZE = 13;
/** 枠に収まらない長いラベルは、ノードの枠から左右にこの余白を残して縮める */
const LABEL_PADDING = 3;
const MAX_LABEL_WIDTH = NODE_WIDTH - LABEL_PADDING * 2;
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
  return { x: pos.x * CELL_WIDTH + CELL_WIDTH / 2, y: pos.y * CELL_HEIGHT + CELL_HEIGHT / 2 };
}

/**
 * @param {SkillTree} tree
 * @param {SkillNode} node
 * @returns {NodeCategory}
 */
function nodeCategory(tree, node) {
  if (node.id === tree.originId) {
    return 'special';
  }
  let category = /** @type {NodeCategory | null} */ (null);
  for (const effect of node.effects) {
    if (effect.type !== 'stat') {
      return 'special';
    }
    category ??= effect.stat;
  }
  if (category === null) {
    throw new Error(`効果の無いノードです: ${node.id}`);
  }
  return category;
}

/**
 * ツリーを描画し、ノードのタップを通知する。取得・解除できるかの判定は呼び出し側が持つ。
 * キャラを切り替えたら setTree で描き直す
 * @param {SVGSVGElement} svg
 * @param {SkillTree} tree
 * @param {(nodeId: NodeId) => void} onTap
 */
export function createTreeView(svg, tree, onTap) {
  /** @type {{ element: SVGElement, from: NodeId, to: NodeId }[]} */
  let edgeElements = [];
  /** @type {Map<NodeId, SVGElement>} */
  let nodeElements = new Map();

  /** @param {SkillTree} target */
  function draw(target) {
    svg.replaceChildren();
    const columns = Math.max(...target.nodes.map((node) => node.pos.x)) + 1;
    const rows = Math.max(...target.nodes.map((node) => node.pos.y)) + 1;
    svg.setAttribute('viewBox', `0 0 ${columns * CELL_WIDTH} ${rows * CELL_HEIGHT}`);
    svg.style.minHeight = `${rows * MIN_TAP_PX}px`;

    const positions = new Map(target.nodes.map((node) => [node.id, node.pos]));
    edgeElements = [];
    for (const [from, to] of target.edges) {
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

    nodeElements = new Map();
    for (const node of target.nodes) {
      const center = cellCenter(node.pos);
      const category = nodeCategory(target, node);
      const group = createSvgElement('g', {
        class: 'tree-node',
        'data-node-id': node.id,
        'data-category': category,
      });
      group.append(
        createSvgElement('rect', {
          class: 'tree-node-hit',
          x: node.pos.x * CELL_WIDTH,
          y: node.pos.y * CELL_HEIGHT,
          width: CELL_WIDTH,
          height: CELL_HEIGHT,
        }),
        createSvgElement('rect', {
          class: 'tree-node-body',
          x: center.x - NODE_WIDTH / 2,
          y: center.y - NODE_HEIGHT / 2,
          width: NODE_WIDTH,
          height: NODE_HEIGHT,
          rx: category === 'special' ? SPECIAL_NODE_CORNER_RADIUS : NODE_CORNER_RADIUS,
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
      // 文字の幅はフォントで変わるので、描画してから測る。収まるラベルは縮めない
      if (/** @type {SVGTextElement} */ (label).getComputedTextLength() > MAX_LABEL_WIDTH) {
        label.setAttribute('textLength', String(MAX_LABEL_WIDTH));
        label.setAttribute('lengthAdjust', 'spacingAndGlyphs');
      }
      nodeElements.set(node.id, group);
    }
  }

  draw(tree);

  // ノードに付けず svg に1つだけ付けるので、描き直しても増えない
  svg.addEventListener('click', (event) => {
    const target = /** @type {Element} */ (event.target);
    const group = target.closest('[data-node-id]');
    const nodeId = group?.getAttribute('data-node-id');
    if (nodeId) {
      onTap(nodeId);
    }
  });

  return {
    setTree: draw,
    /**
     * ノードの見た目の矩形。吹き出しで指すときに使う
     * @param {NodeId} nodeId
     * @returns {Element}
     */
    nodeBody(nodeId) {
      const body = nodeElements.get(nodeId)?.querySelector('.tree-node-body');
      // ノード ID はタップの通知から来るので、見つからなければ呼び出し側のバグ
      if (body == null) {
        throw new Error(`存在しないノードです: ${nodeId}`);
      }
      return body;
    },
    /**
     * @param {ReadonlySet<NodeId>} owned
     * @param {ReadonlySet<NodeId>} acquirable 今タップすれば取れるノード
     * @param {ReadonlySet<NodeId>} releasable 今タップすれば外せるノード
     */
    render(owned, acquirable, releasable) {
      for (const [nodeId, element] of nodeElements) {
        element.classList.toggle('is-owned', owned.has(nodeId));
        element.classList.toggle('is-acquirable', acquirable.has(nodeId));
        element.classList.toggle('is-releasable', releasable.has(nodeId));
      }
      for (const { element, from, to } of edgeElements) {
        element.classList.toggle('is-owned', owned.has(from) && owned.has(to));
        element.classList.toggle(
          'is-acquirable',
          (owned.has(from) && acquirable.has(to)) || (owned.has(to) && acquirable.has(from)),
        );
      }
    },
  };
}
