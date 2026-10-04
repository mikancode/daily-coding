// @ts-check
// 能力やノードの説明を出す吹き出しと、能力のバッジの描画

/**
 * バッジ1つぶん。名前と、タップしたときに吹き出しへ出す説明
 * @typedef {{ label: string, description: string }} Badge
 */

/** 吹き出しの三角が、指す要素に重ならないよう空ける間隔 */
const ANCHOR_GAP_PX = 6;

/**
 * 説明の吹き出し。画面に1つだけ置き、周りの配置を動かさないよう重ねて出す。
 * 外をタップすると閉じる。タップは止めないので、ツリーのノードならそのまま取得・解除もされる。
 * 吹き出し自体のタップは閉じるだけにする。下に隠れたノードを、見えないまま取得・解除しないため
 * @param {HTMLElement} root 吹き出しの位置の基準。`position: relative` を持つ
 * @param {HTMLElement} popover 吹き出し。root の子に置く
 */
export function createDescriptionPopover(root, popover) {
  /** @type {Element | null} */
  let openAnchor = null;

  function close() {
    if (openAnchor?.classList.contains('badge')) {
      openAnchor.setAttribute('aria-expanded', 'false');
    }
    openAnchor = null;
    popover.hidden = true;
  }

  /**
   * 横幅は root の内側いっぱいに固定し、三角だけを指す要素の中心に合わせる。
   * 横の位置を毎回求めずに済み、画面の端の要素でもはみ出さないため。
   * 下に出すと画面からはみ出すときだけ、上に出す
   * @param {Element} anchor 吹き出しが指す要素
   * @param {string} text
   * @param {string} [note] 説明と分けて出す補足。ノードを取得・解除できなかった理由に使う
   */
  function open(anchor, text, note) {
    close();
    openAnchor = anchor;
    const body = document.createElement('div');
    body.textContent = text;
    popover.replaceChildren(body);
    if (note !== undefined) {
      const noteElement = document.createElement('div');
      noteElement.className = 'ability-popover-note';
      noteElement.textContent = note;
      popover.append(noteElement);
    }
    popover.classList.remove('is-above');
    popover.hidden = false;
    const rootRect = root.getBoundingClientRect();
    const anchorRect = anchor.getBoundingClientRect();
    popover.style.top = `${anchorRect.bottom + ANCHOR_GAP_PX - rootRect.top}px`;
    let popoverRect = popover.getBoundingClientRect();
    if (popoverRect.bottom > window.innerHeight) {
      popover.style.top = `${anchorRect.top - ANCHOR_GAP_PX - popoverRect.height - rootRect.top}px`;
      popover.classList.add('is-above');
      popoverRect = popover.getBoundingClientRect();
    }
    popover.style.setProperty('--arrow-x', `${anchorRect.left + anchorRect.width / 2 - popoverRect.left}px`);
  }

  document.addEventListener('click', (event) => {
    const target = /** @type {Element} */ (event.target);
    // バッジとノードのタップは、それぞれの処理で開閉する
    if (openAnchor !== null && target.closest('.badge, [data-node-id]') === null) {
      close();
    }
  });

  return {
    open,
    /** 指す要素を描き直すと吹き出しが指す先が無くなるので、描き直す前に呼ぶ */
    close,
    /**
     * 能力のバッジを並べる。同じバッジをもう一度タップすると閉じる
     * @param {HTMLElement} container
     * @param {readonly Badge[]} badges
     */
    renderBadges(container, badges) {
      container.replaceChildren(
        ...badges.map((badge) => {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'badge';
          button.setAttribute('aria-expanded', 'false');
          button.setAttribute('aria-controls', popover.id);
          const label = document.createElement('span');
          label.className = 'badge-label';
          label.textContent = badge.label;
          button.append(label);
          button.addEventListener('click', () => {
            if (openAnchor === button) {
              close();
              return;
            }
            open(button, `${badge.label}：${badge.description}`);
            button.setAttribute('aria-expanded', 'true');
          });
          return button;
        }),
      );
      container.hidden = badges.length === 0;
    },
  };
}
