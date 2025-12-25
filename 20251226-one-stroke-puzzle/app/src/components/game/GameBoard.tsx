'use client';

import { useGameStore } from '@/store/useGameStore';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';

/**
 * 個々のマス目を表示するコンポーネント
 */
const CellComponent: React.FC<{ 
  x: number; 
  y: number; 
  type: 'start' | 'goal' | 'normal'; 
  onClick: (x: number, y: number) => void;
  onMouseDown: (x: number, y: number) => void;
  onMouseEnter: (x: number, y: number) => void;
  onTouchStart: (x: number, y: number) => void;
}> = ({ x, y, type, onClick, onMouseDown, onMouseEnter, onTouchStart }) => {
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

  const handleClick = () => onClick(x, y);
  const handleMouseDown = () => onMouseDown(x, y);
  const handleMouseEnter = () => onMouseEnter(x, y);
  const handleTouchStart = () => onTouchStart(x, y);

  return (
    <motion.div
      className={`w-full h-full border border-gray-600 flex items-center justify-center text-white cursor-pointer transition-colors duration-200 ${bgColor}`}
      layout
      transition={{ type: 'spring', stiffness: 700, damping: 30 }}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseEnter={handleMouseEnter}
      onTouchStart={handleTouchStart}
      data-cell
      data-x={x}
      data-y={y}
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
  const { gridSize, cells, initGame, grid, path, tryMove, resetGame, isComplete } = useGameStore();
  const [isDrawing, setIsDrawing] = useState(false);

  // 初回ロード時にゲームを初期化
  useEffect(() => {
    // 5x5のグリッドで、スタート(0,0)、ゴール(4,4)を設定
    if (cells.length === 0) {
      initGame(5, 5, { x: 0, y: 0 }, { x: 4, y: 4 });
    }
  }, [cells.length, initGame]);

  const handleCellClick = (x: number, y: number) => {
    const cell = cells.find(c => c.x === x && c.y === y);
    if (cell) {
      tryMove(cell);
    }
  };

  const handleMouseDown = (x: number, y: number) => {
    setIsDrawing(true);
    handleCellClick(x, y);
  };

  const handleMouseEnter = (x: number, y: number) => {
    if (isDrawing) {
      handleCellClick(x, y);
    }
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  // タッチ対応
  const handleTouchStart = (x: number, y: number) => {
    setIsDrawing(true);
    handleCellClick(x, y);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDrawing) return;
    const touch = e.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    if (element) {
      const cellElement = element.closest('[data-cell]');
      if (cellElement) {
        const x = parseInt(cellElement.getAttribute('data-x') || '0');
        const y = parseInt(cellElement.getAttribute('data-y') || '0');
        handleCellClick(x, y);
      }
    }
  };

  const handleTouchEnd = () => {
    setIsDrawing(false);
  };

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
        onMouseUp={handleMouseUp}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
      >
        {cells.map((cell) => (
          <CellComponent 
            key={`${cell.x}-${cell.y}`} 
            {...cell} 
            onClick={handleCellClick}
            onMouseDown={handleMouseDown}
            onMouseEnter={handleMouseEnter}
            onTouchStart={handleTouchStart}
          />
        ))}
      </div>
      {isComplete && <p className="text-green-500">クリア！</p>}
      <button onClick={resetGame} className="mt-4 px-4 py-2 bg-red-500 text-white rounded">
        リセット
      </button>
    </div>
  );
};

export default GameBoard;
