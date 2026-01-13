import { useState, useRef } from 'react';
import * as Tone from 'tone';
import './App.css';

function App() {
  /* =====================
   * State（UIに影響する状態）
   * ===================== */
  const [isDown, setIsDown] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  /* =====================
   * ref（内部処理用の値）
   * ===================== */
  const synthRef = useRef<Tone.Synth | null>(null);
  const audioStartedRef = useRef(false);

  /* =====================
   * Sound（音の初期化・制御）
   * ===================== */
  const startAudioIfNeeded = async () => {
    if (!audioStartedRef.current) {
      await Tone.start();
      audioStartedRef.current = true;
    }

    if (!synthRef.current) {
      synthRef.current = new Tone.Synth().toDestination();
    }
  };

  const playSound = () => {
    synthRef.current?.triggerAttack('A4');
  };

  const stopSound = () => {
    synthRef.current?.triggerRelease();
  };

  /* =====================
   * Pointer（入力イベント）
   * ===================== */
  const handlePointerDown = async (e: React.PointerEvent) => {
    await startAudioIfNeeded();

    setIsDown(true);
    updatePosition(e);
    playSound();
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDown) return;
    updatePosition(e);
  };

  const handlePointerUp = () => {
    setIsDown(false);
    stopSound();
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
