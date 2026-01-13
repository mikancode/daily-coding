// src/hooks/usePointer.ts
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
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDown(true);
    updatePosition(e);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDown) {
      updatePosition(e);
    }
  };

  const handlePointerUp = () => {
    setIsDown(false);
  };

  return {
    isDown,
    position,
    handlers: {
      handlePointerDown,
      handlePointerMove,
      handlePointerUp,
    },
  };
}
