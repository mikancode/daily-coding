import { useState } from 'react';
import './App.css'

function App() {

  // const…定数、let…変数
  const message = "Hello, World!";
  let subMessage = "Hello...";
  subMessage = "Hello...!";

  // 変数での型指定
  const r: number = 100;
  const pi: number = 3.14;
  
  // 型を明示する場合（省略も可）
  const [isActive, setActive] = useState<boolean>(true);

  // 関数での型指定（引数と戻り値）
  const culc: (a: number, b: number) => number = (a, b) => {
    let result: number = 0;
    // 条件分岐
    if (isActive) {
      result = 2 * a * b;
    }
    else {
      result = (a ** 2) * b;
    }
    return result;
  };

  const loop: (a: number, b: number) => string = (a, b) => {
    // 繰り返し
    let result: string = "";
    for (let i: number = 0; i < b; i++) {
      result += a.toString();
    }
    return result;
  };

  return (
    <div>
      <h1>{message}</h1>
      <h2>{subMessage}</h2>
      <h3>{culc(r, pi)}</h3>
      <h4>{loop(r, pi)}</h4>
      <button onClick={() => setActive(!isActive)}>
        計算モードを切り替える
      </button>
    </div>
  )
}

export default App