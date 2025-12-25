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
  isCleared: boolean;
  
  // アクション
  initGame: (width: number, height: number, start: { x: number, y: number }, goal: { x: number, y: number }) => void;
  resetGame: () => void;
  tryMove: (cell: Cell) => void; // ユーザーの移動試行
}

const initialGridSize: GridSize = { width: 5, height: 5 };

/**
 * GameStateを管理するZustandストア
 */
export const useGameStore = create<GameState>((set, get) => ({
  gridSize: initialGridSize,
  cells: [],
  path: [],
  isGameActive: false,
  isCleared: false,

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
      isCleared: false,
    });
  },

  resetGame: () => {
    const startCell = get().cells.find(c => c.type === 'start');
    if (startCell) {
      set({ path: [startCell], isCleared: false });
    }
  },

  tryMove: (nextCell) => {
    set(state => {
      if (!state.isGameActive || state.isCleared) return state;

      const lastCell = state.path[state.path.length - 1];
      const totalCellsToVisit = state.gridSize.width * state.gridSize.height;

      // 1. 隣接チェック (Manhattan distance == 1)
      const isAdjacent = Math.abs(lastCell.x - nextCell.x) + Math.abs(lastCell.y - nextCell.y) === 1;
      if (!isAdjacent) {
        return state; // 隣接していなければ何もしない
      }

      // 2. 訪問済みチェック (一筆書きのルール: スタートセル以外は再訪問禁止)
      const isVisited = state.path.some(cell => cell.x === nextCell.x && cell.y === nextCell.y);
      if (isVisited) {
        return state;
      }
      
      // 3. 移動とパスの更新
      const newPath = [...state.path, nextCell];
      
      // 4. クリア判定
      if (nextCell.type === 'goal') {
        // ゴールに到達し、かつ全てのセルを訪問しているかチェック
        if (newPath.length === totalCellsToVisit) {
          return { ...state, path: newPath, isCleared: true, isGameActive: false };
        } else {
          // ゴールに到達したが、全マス訪問していない場合は不正な手として移動を許可しない
          return state;
        }
      }

      return { ...state, path: newPath };
    });
  },
}));
