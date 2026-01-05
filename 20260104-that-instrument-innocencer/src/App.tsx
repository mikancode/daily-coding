import { useState } from 'react';
import './App.css'

function App() {
  const message = "Innocencer Lab";
  const [isActive, setActive] = useState<boolean>(true);
  const [count, setCount] = useState<number>(0);
  const r = 10;
  const pi = 3;

  // 四則演算 + 条件分岐
  const culc = (a: number, b: number): number => {
    return isActive ? 2 * a * b : (a ** 2) * b;
  };

  // ループ：bの回数分、aを表示する
  const loop = (a: number, b: number): string => {
    let result = "";
    for (let i = 0; i < b; i++) {
      result += ` [${a}] `;
    }
    return result;
  };

  // 座標を保存するState（型はオブジェクト）
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // 指が動いた時の処理
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    // clientX/Y はブラウザ画面内での座標
    setPosition({
      x: Math.round(e.clientX),
      y: Math.round(e.clientY),
    });
  };

  return (
    <div 
      className="app-container"
      onPointerMove={handlePointerMove}
      style={{ touchAction: 'none' }} // スマホのスクロールやズームを防止
    >

      <div className="old-contents">
        <h1>{message}</h1>

        <section>
          {/* 計算の結果を表示 */}
          <button onClick={() => setActive(!isActive)}>
            モード切替 現在のモード: <strong>{isActive ? "円周" : "面積"}</strong>
          </button>
          <p>計算結果: {culc(r, pi)}</p>
        </section>

        <section>
          {/* ループの結果を表示 */}
          <button onClick={() => setCount(count + 1)}>
            カウントアップ (現在のカウント: {count})
          </button>
          <p>繰り返し表示: {loop(r, count)}</p>
        </section>
      </div>

      <div className="info-display">
        <h1>Touch Tracker</h1>
        <p>X: {position.x}</p>
        <p>Y: {position.y}</p>
        
        <div className="visual-guide">
          {/* 触っている場所に目印を表示 */}
          <div 
            className="pointer-dot" 
            style={{ 
              left: `${position.x}px`, 
              top: `${position.y}px` 
            }} 
          />
        </div>
      </div> 
    </div>
  );
}

export default App