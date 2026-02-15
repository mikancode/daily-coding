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
    * 描画の管理
    * 状態に同期させるためuseEffectを使用
    * ===================== */

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
  // --- 和音対応: pointerIdごとに音を管理するためのactivePointersを追加 ---
  const activePointers = useRef(new Map<number, { x: number, y: number }>());

  // --- 和音対応: pointerIdごとに音を鳴らす ---
  // --- ドレミファソラシド音階割り当て ---
  // 画面の長い方を7分割し、各領域にC4〜B4を割り当て
  const scaleNotes = [
    261.63, // C4 ド
    293.66, // D4 レ
    329.63, // E4 ミ
    349.23, // F4 ファ
    392.00, // G4 ソ
    440.00, // A4 ラ
    493.88  // B4 シ
  ];

  // pointer位置から音階インデックスを決定
  function getNoteFromPointer(e: React.PointerEvent<HTMLCanvasElement>): number {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const isLandscape = w >= h;
    const mainLen = isLandscape ? w : h;
    const pos = isLandscape ? e.clientX : e.clientY;
    const idx = Math.min(
      scaleNotes.length - 1,
      Math.floor(pos / (mainLen / scaleNotes.length))
    );
    return scaleNotes[idx];
  }

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const freq = getNoteFromPointer(e);
    sound.startAudio();
    sound.playSound(e.pointerId, freq);
    // 必要ならaddParticle等もpointerIdごとに
    const randomIndex = Math.floor(Math.random() * PARTICLE_TYPES.length);
    const randomType = PARTICLE_TYPES[randomIndex];
    addParticle(e.clientX, e.clientY, randomType);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activePointers.current.has(e.pointerId)) {
      activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const freq = getNoteFromPointer(e);
      sound.setFrequency(e.pointerId, freq);
    }
  };

  // --- 和音対応: pointerIdごとに音を止める ---
  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    activePointers.current.delete(e.pointerId);
    sound.stopSound(e.pointerId);
  };

  /* =====================
   * Render
   * ===================== */
  return (
    <div
      className="app-container"
      style={{ touchAction: 'none' }}
    >
      {/* --- 和音対応: pointerイベントはcanvasにのみバインド --- */}
      <canvas 
        ref={canvasRef} 
        width={window.innerWidth} 
        height={window.innerHeight} 
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />

    </div>
  );
}

export default App;
