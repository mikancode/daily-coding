import { useEffect } from 'react';
import { mapRange } from './utils/math';
import { usePointer } from './hooks/usePointer';
import { useSound } from './hooks/useSound';
import './App.css';

function App() {
  const pointer = usePointer();
  const sound = useSound();

  // 音の再生・停止
  useEffect(() => {
    if (pointer.isDown) {
      sound.startAudio();
      const freq = mapRange(pointer.position.x, 0, window.innerWidth, 261.63, 523.25);
      sound.playSound(freq);
    } else {
      sound.stopSound();
    }
    // 依存配列
  }, [pointer.isDown]);

  // 音程のリアルタイム変更
  useEffect(() => {
    if (pointer.isDown) {
      const freq = mapRange(pointer.position.x, 0, window.innerWidth, 261.63, 523.25);
      sound.setFrequency(freq);
    }
    // 依存配列
  }, [pointer.position.x]);
  
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
