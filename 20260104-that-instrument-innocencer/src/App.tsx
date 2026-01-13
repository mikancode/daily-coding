import { useState } from 'react';
import { useSound } from './hooks/useSound';
import './App.css';

function App() {
  /* =====================
   * State（UIに影響する状態）
   * ===================== */
  const [isDown, setIsDown] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const sound = useSound();

  /* =====================
   * Pointer（入力イベント）
   * ===================== */
    const handlePointerDown = async (e: React.PointerEvent) => {
    await sound.startAudio();
    sound.playSound();

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
    sound.stopSound();
  };

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
   * Render
   * ===================== */
  return (
    <div
      className="app-container"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      style={{ touchAction: 'none' }}
    >
      <div className="info-display">
        <h1>{isDown ? 'TOUCHING' : 'WAITING'}</h1>
        <p>X: {position.x}</p>
        <p>Y: {position.y}</p>

        <div
          className={`pointer-dot ${isDown ? 'active' : ''}`}
          style={{
            left: position.x,
            top: position.y,
          }}
        />
      </div>
    </div>
  );
}

export default App;
