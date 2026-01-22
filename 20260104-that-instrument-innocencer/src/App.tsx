import { useRef, useEffect } from 'react';
import { mapRange } from './utils/math';
import { usePointer } from './hooks/usePointer';
import { useSound } from './hooks/useSound';
import { useParticles, PARTICLE_TYPES } from './hooks/usePerticles';
import { drawPerticle } from './utils/draw';
import './App.css';

function App() {
  const pointer = usePointer();
  const sound = useSound();
  const { perticles, addPerticle, updatePerticles } = useParticles();
  // Canvasを操作するための参照
  const canvasRef = useRef<HTMLCanvasElement>(null);

  /* =====================
    * 音の管理
    * 状態に同期させるためuseEffectを使用
    * ===================== */
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
    * 描画の管理
    * 状態に同期させるためuseEffectを使用
    * ===================== */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    const render = () => {
      // 1. 画面をクリア
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // 2. 状態を更新
      updatePerticles();
      // 3. 保存されているエフェクトをすべて描画
      perticles.forEach(perticle => {
        drawPerticle(ctx, perticle);
      });
      // 4. 次のフレームを予約（秒間60回のループ）
      animationFrameId = requestAnimationFrame(render);
    }

    render();

    // クリーンアップ関数
    return () => {
      cancelAnimationFrame(animationFrameId);
    };

  }, [perticles]); // エフェクトが増えるたびに再描画

  /* =====================
    * イベントハンドラ
    * ===================== */
  const handlePointerDown = (e: React.PointerEvent) => {
    pointer.onPointerDown(e);

    const randomIndex = Math.floor(Math.random() * PARTICLE_TYPES.length);
    const randomType = PARTICLE_TYPES[randomIndex];
    // タッチした座標にエフェクトを追加
    addPerticle(e.clientX, e.clientY, randomType);
  };

  /* =====================
   * Render
   * ===================== */
  return (
    <div
      className="app-container"
      onPointerDown={handlePointerDown}
      onPointerMove={pointer.onPointerMove}
      onPointerUp={pointer.onPointerUp}
      onPointerLeave={pointer.onPointerUp}
      style={{ touchAction: 'none' }}
    >
      {/* 描画用のキャンバス */}
      <canvas 
        ref={canvasRef} 
        width={window.innerWidth} 
        height={window.innerHeight} 
      />

      <div className="info-display">
        <h1>{pointer.isDown ? 'TOUCHING' : 'WAITING'}</h1>
        <p>X: {Math.round(pointer.position.x)} Y: {Math.round(pointer.position.y)}</p>
      </div>
    </div>
  );
}

export default App;
