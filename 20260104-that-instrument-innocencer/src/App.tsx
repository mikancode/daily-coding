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
  }, [pointer.position.x, pointer.isDown, sound]);

  /* =====================
    * 描画の管理
    * 状態に同期させるためuseEffectを使用
    * ===================== */
  // 不要になったparticlesRefのuseRefと同期処理を削除

  /* --- Canvas のリサイズとDPI対応 --- */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      
      // CSS表示サイズに合わせて解像度を設定
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      
      // コンテキストをDPRに合わせてスケール
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
    };

    // 初期化
    resizeCanvas();

    // リサイズイベントのリスナー
    window.addEventListener('resize', resizeCanvas);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

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
    // 入力状態・座標は先に更新して UI を即座に反映させる
    pointer.onPointerDown(e);
    const x = e.clientX;
    const y = e.clientY;
    const freq = mapRange(x, 0, window.innerWidth, 261.63, 523.25);
    const randomIndex = Math.floor(Math.random() * PARTICLE_TYPES.length);
    const randomType = PARTICLE_TYPES[randomIndex];
    addParticle(x, y, randomType);

    // 音声の初期化・再生はその後に行う
    await sound.startAudio();
    sound.playSound(freq);
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
      <canvas ref={canvasRef} />

      <div className="info-display">
        <h1>{pointer.isDown ? 'TOUCHING' : 'WAITING'}</h1>
        <p>X: {Math.round(pointer.position.x)} Y: {Math.round(pointer.position.y)}</p>
      </div>
    </div>
  );
}

export default App;
