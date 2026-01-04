import './App.css'

function App() {

  // const…定数、let…変数
  const message = "Hello, World!";
  let subMessage = "Hello...";
  subMessage = "Hello...!";

  // 変数での型指定
  const r: number = 100;
  const pi: number = 3.14;
  const isActive: boolean = true;

  // 関数での型指定（引数と戻り値）
  const culc: (a: number, b: number) => number = (a, b) => {
    // 条件分岐
    if (isActive) {
      return 2 * a * b;
    }
    else {
      return (a ** 2) * b;
    }
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
    </div>
  )
}

export default App