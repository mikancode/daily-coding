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

return (
    <div style={{ padding: '20px' }}>
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
  );
}

export default App