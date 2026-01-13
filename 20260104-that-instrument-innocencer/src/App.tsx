import { usePointer } from './hooks/usePointer';
import { useSound } from './hooks/useSound';
import './App.css';

function App() {
  const pointer = usePointer();
  const sound = useSound();

  /* =====================
   * Pointer（入力イベント）
   * ===================== */
  const handlePointerDown = async (e: React.PointerEvent) => {
    await sound.startAudio();
    sound.playSound();
    pointer.handlers.handlePointerDown(e);
  };

  const handlePointerUp = () => {
    sound.stopSound();
    pointer.handlers.handlePointerUp();
  };

  /* =====================
   * Render
   * ===================== */
  return (
    <div
      className="app-container"
      onPointerDown={handlePointerDown}
      onPointerMove={pointer.handlers.handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
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
