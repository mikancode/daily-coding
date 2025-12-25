'use client';

import { useGameStore } from '@/store/useGameStore';
import { motion } from 'motion/react';
import { useEffect } from 'react';

/**
 * 個々のマス目を表示するコンポーネント
 */
const CellComponent: React.FC<{ x: number; y: number; type: 'start' | 'goal' | 'normal' }> = ({ x, y, type }) => {
  const isVisited = useGameStore((state) => state.path.some(cell => cell.x === x && cell.y === y));
  
  // マス目の基本スタイル
  let bgColor = isVisited ? 'bg-indigo-500' : 'bg-gray-700';
  let indicator = null;

  if (type === 'start') {
    bgColor = 'bg-green-500';
    indicator = 'S';
  } else if (type === 'goal') {
    bgColor = 'bg-red-500';
    indicator = 'G';
  }

  return (
    <motion.div
      className={`w-full h-full border border-gray-600 flex items-center justify-center text-white cursor-pointer transition-colors duration-200 ${bgColor}`}
      layout
      transition={{ type: 'spring', stiffness: 700, damping: 30 }}
    >
      {/* 訪れたマス目を視覚的に確認するためのドット（デバッグ用） */}
      {isVisited && type === 'normal' && (
        <div className="w-2 h-2 rounded-full bg-white opacity-70"></div>
      )}
      {indicator && <span className="font-bold text-lg">{indicator}</span>}
    </motion.div>
  );
};


/**
 * グリッドボード全体を表示するコンポーネント
 */
const GameBoard: React.FC = () => {
  const { gridSize, cells, initGame } = useGameStore();

  // 初回ロード時にゲームを初期化
  useEffect(() => {
    // 5x5のグリッドで、スタート(0,0)、ゴール(4,4)を設定
    if (cells.length === 0) {
      initGame(5, 5, { x: 0, y: 0 }, { x: 4, y: 4 });
    }
  }, [cells.length, initGame]);

  // CSS Gridを使ってレスポンシブなグリッドレイアウトを構築
  const gridStyle = {
    gridTemplateColumns: `repeat(${gridSize.width}, 1fr)`,
    gridTemplateRows: `repeat(${gridSize.height}, 1fr)`,
  };

  return (
    <div className="w-full max-w-xl aspect-square p-4 bg-gray-800 rounded-lg shadow-2xl">
      <div
        style={gridStyle}
        className="grid gap-1 h-full w-full"
      >
        {cells.map((cell) => (
          <CellComponent key={`${cell.x}-${cell.y}`} {...cell} />
        ))}
      </div>
    </div>
  );
};

export default GameBoard;
