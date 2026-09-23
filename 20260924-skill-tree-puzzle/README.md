# スキルツリー・パズル

**固定のスキルツリーに手持ちのポイントを配ってビルドを組み、お題のボスを倒すパズル。**

スキルツリーを伸ばす楽しさのうち、取捨選択・経路の計画・シナジーの発見だけを煮詰めたミニゲームです。
通勤・通学中にスマホのブラウザで、1プレイ5〜10分で遊ぶことを想定しています。
判定はターン制で、乱数を使いません。
同じビルドなら必ず同じ結果になるので、負けた理由を考えて組み直す詰将棋のような遊び方になります。

- **遊ぶ**: <https://mikancode.github.io/daily-coding/20260924-skill-tree-puzzle/>（UI の完成後に遊べるようになる予定）

## 🛠 Tech Stack

- ビルドなしの ES Modules（JavaScript）。型は JSDoc と `@ts-check` で付け、`src/types.d.ts` に集約する
- `package.json` などの依存定義ファイルは置かない

## 💻 検証

Node.js 22 で実行します。

```bash
# 型検査（エラー0件であること）
npx -p typescript tsc -p 20260924-skill-tree-puzzle/jsconfig.json --noEmit
```

## 📂 Project Structure

```text
20260924-skill-tree-puzzle/
├── index.html      # エントリポイント（現在はタイトルだけ）
├── jsconfig.json   # 型検査の設定。依存定義ファイルではない
└── src/
    └── types.d.ts  # 型の定義
```

## 設計上の制約

- GitHub Pages ではサブパスで配信されるため、import・CSS・リンクはすべて相対パスで書く
- Pages は Jekyll を通すため、`_` で始まるファイル名・フォルダ名は使わない
- データは `.json` ではなく、定数を export する `.js` にする。
  JSON の import attributes は古い iOS Safari で動かず、fetch だと非同期の初期化が要るため

## 状態

🚧 進行中（コアロジックを作成中）
