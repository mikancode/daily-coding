import { useState } from 'react';

export type PointerPosition = {
  x: number;
  y: number;
};

export function usePointer() {
  /* =====================
   * State（UIに影響する状態）
   * ===================== */
  const [isDown, setIsDown] = useState(false);
  const [position, setPosition] = useState<PointerPosition>({ x: 0, y: 0 });

  /* =====================
   * Utility
   * ===================== */
  const updatePosition = (e: React.PointerEvent) => {
    setPosition({
      x: Math.round(e.clientX),
      y: Math.round(e.clientY),
    });
  };

  /* =====================
   * Pointer（入力イベント）
   * ===================== */
  const onPointerDown = (e: React.PointerEvent) => {
    setIsDown(true);
    updatePosition(e);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (isDown) {
      updatePosition(e);
    }
  };

  const onPointerUp = () => {
    setIsDown(false);
  };

  return {
    isDown,
    position,
    onPointerDown,
    onPointerMove,
    onPointerUp,
  };
}
