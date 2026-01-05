import { useState } from 'react';
import './App.css'

function App() {

  const [isDown, setIsDown] = useState<boolean>(false);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
 
  // ポインターが押されたとき
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDown(true);
    updatePosition(e);
  };
  // ポインターが離されたとき
  const handlePointerUp = () => {
    setIsDown(false);
  };
  // ポインターが動いたとき
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDown) {
      updatePosition(e);
    }
  };
  // ポインターの位置を更新
  const updatePosition = (e: React.PointerEvent<HTMLDivElement>) => {
    setPosition({
      x: Math.round(e.clientX),
      y: Math.round(e.clientY),
    });
  };

  return (
    <div 
      className="app-container"
      onPointerDown ={handlePointerDown}
      onPointerUp   ={handlePointerUp}
      onPointerMove ={handlePointerMove}
      onPointerLeave={handlePointerUp} // 画面外に指が出た時用
      style={{ touchAction: 'none' }}   // スマホのスクロールやズームを防止
    >

      <div className="info-display">
        <h1>{isDown ? "TOUCHING" : "WAITING"}</h1>
        <p>X: {position.x}</p>
        <p>Y: {position.y}</p>
        
      <div 
        className={`pointer-dot ${isDown ? "active" : ""}`} 
        style={{
          left: position.x,
          top: position.y
        }}
      />
      </div> 
    </div>
  );
}

export default App