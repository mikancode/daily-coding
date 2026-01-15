import { useEffect } from 'react';
import { usePointer } from './hooks/usePointer';
import { useSound } from './hooks/useSound';
import './App.css';

function App() {
  const pointer = usePointer();
  const sound = useSound();

  // Pointer と Sound をつなぐ
  useEffect(() => {
    if (pointer.isDown) {
      sound.startAudio();
      sound.playSound();
    } else {
      sound.stopSound();
    }
  }, [pointer.isDown]);

  /* =====================
   * Render
   * ===================== */
  return (
    <div
      className="app-container"
      onPointerDown={pointer.onPointerDown}
      onPointerMove={pointer.onPointerMove}
      onPointerUp={pointer.onPointerUp}
      onPointerLeave={pointer.onPointerUp}
      style={{ touchAction: 'none' }}
    >
      <div className="info-display">
        <h1>{pointer.isDown ? 'TOUCHING' : 'WAITING'}</h1>
        <p>X: {pointer.position.x}</p>
        <p>Y: {pointer.position.y}</p>

        <div
          className={`pointer-dot ${pointer.isDown ? 'active' : ''}`}
          style={{
            left: pointer.position.x,
            top: pointer.position.y,
          }}
        />
      </div>
    </div>
  );
}

export default App;
