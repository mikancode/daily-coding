import { useState } from 'react';
import './App.css'

function App() {
  // 座標を保存するState（型はオブジェクト）
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // 指が動いた時の処理
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    // clientX/Y はブラウザ画面内での座標
    setPosition({
      x: Math.round(e.clientX),
      y: Math.round(e.clientY),
    });
  };

  return (
    <div 
      className="app-container"
      onPointerMove={handlePointerMove}
      style={{ touchAction: 'none' }} // スマホのスクロールやズームを防止
    >

      <div className="info-display">
        <h1>Touch Tracker</h1>
        <p>X: {position.x}</p>
        <p>Y: {position.y}</p>
        
        <div className="visual-guide">
          {/* 触っている場所に目印を表示 */}
          <div 
            className="pointer-dot" 
            style={{ 
              left: `${position.x}px`, 
              top: `${position.y}px` 
            }} 
          />
        </div>
      </div> 
    </div>
  );
}

export default App