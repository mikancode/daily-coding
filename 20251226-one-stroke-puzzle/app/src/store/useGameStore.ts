import { create } from 'zustand';

// グリッドの状態を定義する型
export type GridSize = { width: number; height: number };
export type Cell = { x: number; y: number; type: 'start' | 'goal' | 'normal' };
export type PathSegment = { from: Cell; to: Cell };

export interface GameState {
  gridSize: GridSize;
  cells: Cell[];
  path: Cell[];
  isGameActive: boolean;
  
  // アクション
  initGame: (width: number, height: number, start: { x: number, y: number }, goal: { x: number, y: number }) => void;
  // clearPath: () => void;
  // move: (cell: Cell) => void;
}

const initialGridSize: GridSize = { width: 5, height: 5 };

/**
 * GameStateを管理するZustandストア
 */
export const useGameStore = create<GameState>((set) => ({
  gridSize: initialGridSize,
  cells: [],
  path: [],
  isGameActive: false,

  initGame: (width, height, start, goal) => {
    const cells: Cell[] = [];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let type: Cell['type'] = 'normal';
        if (x === start.x && y === start.y) {
          type = 'start';
        } else if (x === goal.x && y === goal.y) {
          type = 'goal';
        }

        cells.push({ x, y, type });
      }
    }

    set({
      gridSize: { width, height },
      cells: cells,
      path: [cells.find(c => c.type === 'start')!], // スタート地点を初期パスに設定
      isGameActive: true,
    });
  },
}));
