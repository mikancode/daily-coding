
import { useRef } from 'react';

export type PointerMultiState = {
  x: number;
  y: number;
  isDown: boolean;
  freq?: number;
};

/**
 * 複数pointerId対応のカスタムフック
 */
export function usePointerMulti() {
  // pointerIdごとに状態を管理
  const pointers = useRef<Map<number, PointerMultiState>>(new Map());

  // pointerイベントハンドラ
  const onPointerDown = (e: React.PointerEvent) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY, isDown: true });
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (pointers.current.has(e.pointerId)) {
      const prev = pointers.current.get(e.pointerId)!;
      pointers.current.set(e.pointerId, { ...prev, x: e.clientX, y: e.clientY });
    }
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (pointers.current.has(e.pointerId)) {
      const prev = pointers.current.get(e.pointerId)!;
      pointers.current.set(e.pointerId, { ...prev, isDown: false });
    }
  };

  // pointer情報とハンドラを返す
  return {
    pointers,
    onPointerDown,
    onPointerMove,
    onPointerUp,
  };
}
