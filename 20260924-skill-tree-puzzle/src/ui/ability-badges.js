// @ts-check
// 能力のバッジの描画と、タップしたバッジの説明を出す吹き出し

/**
 * バッジ1つぶん。名前と、タップしたときに吹き出しへ出す説明
 * @typedef {{ label: string, description: string }} Badge
 */

/**
 * 能力のバッジと、その説明の吹き出し。吹き出しは画面に1つだけ置き、周りの配置を動かさないよう重ねて出す。
 * 外をタップすると閉じる。タップは止めないので、ツリーのノードならそのまま取得・解除もされる
 * @param {HTMLElement} root 吹き出しの位置の基準。`position: relative` を持つ
 * @param {HTMLElement} popover 吹き出し。root の子に置く
 */
export function createAbilityBadges(root, popover) {
  /** @type {HTMLButtonElement | null} */
  let openButton = null;

  function close() {
    openButton?.setAttribute('aria-expanded', 'false');
    openButton = null;
    popover.hidden = true;
  }

  /**
   * 横幅は root の内側いっぱいに固定し、三角だけをバッジの中心に合わせる。
   * 横の位置を毎回求めずに済み、画面の端のバッジでもはみ出さないため
   * @param {HTMLButtonElement} button
   * @param {Badge} badge
   */
  function open(button, badge) {
    close();
    openButton = button;
    button.setAttribute('aria-expanded', 'true');
    popover.textContent = `${badge.label}：${badge.description}`;
    popover.hidden = false;
    const rootRect = root.getBoundingClientRect();
    const buttonRect = button.getBoundingClientRect();
    popover.style.top = `${buttonRect.bottom - rootRect.top}px`;
    const popoverRect = popover.getBoundingClientRect();
    popover.style.setProperty('--arrow-x', `${buttonRect.left + buttonRect.width / 2 - popoverRect.left}px`);
  }

  document.addEventListener('click', (event) => {
    const target = /** @type {Element} */ (event.target);
    // バッジのタップは、バッジ自身の処理で開閉する
    if (openButton !== null && target.closest('.badge') === null) {
      close();
    }
  });

  return {
    /** バッジを描き直すと吹き出しが指す先が無くなるので、描き直す前に呼ぶ */
    close,
    /**
     * @param {HTMLElement} container
     * @param {readonly Badge[]} badges
     */
    render(container, badges) {
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
            if (openButton === button) {
              close();
            } else {
              open(button, badge);
            }
          });
          return button;
        }),
      );
      container.hidden = badges.length === 0;
    },
  };
}
