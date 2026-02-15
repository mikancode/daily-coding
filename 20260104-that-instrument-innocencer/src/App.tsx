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
  const activePointers = useRef(new Map<number, { x: number, y: number, freq?: number }>());

  // --- 和音対応: pointerIdごとに音を鳴らす ---
  // --- 2オクターブ対応: 画面上下で音域を切り替え ---
  // 下段: C4〜C5, 上段: C5〜C6
  const scaleNotesLow = [
    261.63, // C4 ド
    293.66, // D4 レ
    329.63, // E4 ミ
    349.23, // F4 ファ
    392.00, // G4 ソ
    440.00, // A4 ラ
    493.88, // B4 シ
    523.25  // C5 高いド
  ];
  const scaleNotesHigh = [
    523.25, // C5 中くらいのド
    587.33, // D5 レ
    659.25, // E5 ミ
    698.46, // F5 ファ
    783.99, // G5 ソ
    880.00, // A5 ラ
    987.77, // B5 シ
    1046.50 // C6 高いド
  ];


  /**
   * 画面を上下で2分割して音域を切り替える
   * 横方向を7分割して音階を決定する
   * @param e PointerEvent<HTMLCanvasElement>
   * @returns 音階の周波数
   * @abstraction
   * 画面の長辺でドレミを切り替え、短辺でオクターブを切り替える
   * 例: 縦長ならYでドレミ、Xでオクターブ。横長ならXでドレミ、Yでオクターブ。
   */
  function getNoteFromPointer(e: React.PointerEvent<HTMLCanvasElement>): number {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const isLandscape = w >= h;
    // 長辺でドレミ（scaleNotes）、短辺でオクターブ
    const mainLen = isLandscape ? w : h;
    const subLen = isLandscape ? h : w;
    const mainPos = isLandscape ? e.clientX : e.clientY;
    const subPos = isLandscape ? e.clientY : e.clientX;
    // 短辺の上半分/左半分で低オクターブ、下半分/右半分で高オクターブ
    const isHighOctave = subPos > subLen / 2;
    const notes = isHighOctave ? scaleNotesHigh : scaleNotesLow;
    // 長辺方向で7分割
    const idx = Math.min(
      notes.length - 1,
      Math.floor(mainPos / (mainLen / notes.length))
    );
    return notes[idx];
  }

  // --- パーティクルもpointerIdごとに管理 ---
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const freq = getNoteFromPointer(e);
    sound.startAudio();
    sound.playSound(e.pointerId, freq);
    // pointerIdごとにパーティクルを発生（音の発生と同時）
    const randomIndex = Math.floor(Math.random() * PARTICLE_TYPES.length);
    const randomType = PARTICLE_TYPES[randomIndex];
    addParticle(e.clientX, e.clientY, randomType);
    // 現在の音階をpointerIdごとに記録
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY, freq });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activePointers.current.has(e.pointerId)) {
      const prev = activePointers.current.get(e.pointerId);
      const freq = getNoteFromPointer(e);
      // 音階が変わった時のみパーティクルを発生
      if (!prev || prev.freq !== freq) {
        const randomIndex = Math.floor(Math.random() * PARTICLE_TYPES.length);
        const randomType = PARTICLE_TYPES[randomIndex];
        addParticle(e.clientX, e.clientY, randomType);
      }
      activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY, freq });
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
