import { useRef, useEffect } from 'react';
import { mapRange } from './utils/math';
import { usePointer } from './hooks/usePointer';
import { useSound } from './hooks/useSound';
import { useParticles, PARTICLE_TYPES } from './hooks/useParticles';
import { drawParticle } from './utils/draw';
import './App.css';

function App() {
  const pointer = usePointer();
  const sound = useSound();
  const { particlesRef, addParticle, updateParticles } = useParticles();
  // Canvasを操作するための参照
  const canvasRef = useRef<HTMLCanvasElement>(null);

  /* =====================
    * 音の管理
    * 状態に同期させるためuseEffectを使用
    * ===================== */

  // 音程のリアルタイム変更のみuseEffectで管理
  useEffect(() => {
    if (pointer.isDown) {
      const freq = mapRange(pointer.position.x, 0, window.innerWidth, 261.63, 523.25);
      sound.setFrequency(freq);
    }
  }, [pointer.position.x, pointer.isDown]);

  /* =====================
    * 描画の管理
    * 状態に同期させるためuseEffectを使用
    * ===================== */
  // 不要になったparticlesRefのuseRefと同期処理を削除

  /* --- 描画・更新ループ（無限ループ対策版） --- */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let lastTime = performance.now();
    const render = (currentTime: number) => {
      const deltaTime = (currentTime - lastTime) / 1000;
      lastTime = currentTime;
      // 1. 画面をクリア
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // 2. 状態を更新（refの中身を直接更新）
      particlesRef.current = updateParticles(particlesRef.current, deltaTime);
      // 3. 保存されているエフェクトをすべて描画
      particlesRef.current.forEach(particle => {
        drawParticle(ctx, particle);
      });
      // 4. 次のフレームを予約（秒間60回のループ）
      animationFrameId = requestAnimationFrame(render);
    };
    // 初回呼び出し
    animationFrameId = requestAnimationFrame(render);

    // クリーンアップ関数
    return () => {
      cancelAnimationFrame(animationFrameId);
    };

  }, [updateParticles, particlesRef]);

  /* =====================
    * イベントハンドラ
    * ===================== */
  const handlePointerDown = async (e: React.PointerEvent) => {
    await sound.startAudio();
    const freq = mapRange(e.clientX, 0, window.innerWidth, 261.63, 523.25);
    sound.playSound(freq);
    pointer.onPointerDown(e);
    const randomIndex = Math.floor(Math.random() * PARTICLE_TYPES.length);
    const randomType = PARTICLE_TYPES[randomIndex];
    addParticle(e.clientX, e.clientY, randomType);
  };
  const handlePointerUp = () => {
    sound.stopSound();
    pointer.onPointerUp();
  };

  /* =====================
   * Render
   * ===================== */
  return (
    <div
      className="app-container"
      onPointerDown={handlePointerDown}
      onPointerMove={pointer.onPointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
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
