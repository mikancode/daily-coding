# Daily Coding

思いついたものを、動くところまで小さく作って積み上げる実験場です。
「技術で遊ぶ」をテーマに、データ可視化・数学的モデリング・Web アプリを **1 フォルダ 1 プロダクト** のモノレポで管理しています。

## 📦 Products

| Project | Overview | Stack | Status |
| :--- | :--- | :--- | :--- |
| [🎹 Innocencer（あの楽器）](./20260104-that-instrument-innocencer/) | 画面をタッチすると音と波紋が生まれる Web 楽器 | React / Vite / Tone.js / Canvas | 🟢 Live |
| [🏢 Corp URL Finder](./20251230-corp-url-finder/) | gBizINFO API から企業の公式 URL を特定する調査ノート | Colab / requests / pandas | ✅ Done |
| [🧩 One-Stroke Grid Puzzle](./20251226-one-stroke-puzzle/) | ハミルトンパスを題材にした一筆書きパズル | Next.js / TypeScript / Zustand | 💤 Paused |
| [🎄 Digital Xmas Tree](./20251224_xmas_tree/) | 数学的なサンプリングで組み上げた 3D ツリー | Python / Plotly / NumPy | ✅ Done |

> **Status の凡例**
> 🟢 Live = 公開稼働中 ／ ✅ Done = 完成・凍結 ／ 💤 Paused = 開発中断 ／ 🚧 WIP = 開発中

---

### 🎹 Innocencer（あの楽器） 🟢 Live

タッチした座標に応じて音が鳴り、同時に波紋のビジュアルがリアルタイムに描画される Web 楽器です。
`pointerId` ごとに音を管理することでマルチタッチの和音演奏に対応し、画面の上下で 2 オクターブを切り替えられます。

- **Demo**: <https://innocencer.vercel.app>（スマートフォンでのタッチ操作推奨）
- **Stack**: React 19, TypeScript, Vite, Tone.js, Canvas API, Vercel
- **Docs**: [README](./20260104-that-instrument-innocencer/README.md) ／ [設計ドキュメント](./20260104-that-instrument-innocencer/docs/index.md)

### 🏢 Corp URL Finder ✅ Done

企業名を入力すると、経済産業省の [gBizINFO](https://info.gbiz.go.jp/) API を経由して法人番号を特定し、
公式サイトの URL を含む法人情報を取り出す調査用ノートブックです。

- **Notebook**: [Open in Colab](https://colab.research.google.com/github/mikancode/daily-coding/blob/main/20251230-corp-url-finder/01_search_official_url.ipynb)
- **Stack**: Google Colab, requests, pandas
- **Docs**: [README](./20251230-corp-url-finder/README.md)

### 🧩 One-Stroke Grid Puzzle 💤 Paused

グリッド上の全マスを一度ずつ通ってゴールを目指す一筆書きパズルです。
グラフ理論のハミルトンパス問題を題材に、5x5 グリッドの MVP まで実装して中断しています。

- **Stack**: Next.js 16 (App Router), TypeScript, Tailwind CSS, Zustand, Motion
- **Docs**: [README](./20251226-one-stroke-puzzle/README.md) ／ [開発計画書](./20251226-one-stroke-puzzle/plans/game_development_plan.md)

### 🎄 Digital Xmas Tree ✅ Done

円錐の方程式による点群サンプリングと、正弦波を用いた周期的なアニメーション制御で構築した 3D ツリーです。
Notebook を実行すると、そのまま公開できる `index.html` が生成されます。

- **Demo**: [Interactive 3D Tree](https://mikancode.github.io/daily-coding/20251224_xmas_tree/index.html)
- **Stack**: Python, Plotly, NumPy, Seaborn
- **Docs**: [README](./20251224_xmas_tree/README.md)

---

## 📂 Repository Structure

```text
daily-coding/
├── YYYYMMDD-project-name/   # 1 プロダクト = 1 フォルダ。実行環境も各フォルダで完結する
├── scripts/                 # リポジトリ横断のユーティリティ
│   └── license-simple-check.py   # 依存ライブラリのライセンス検査
├── .gitmessage              # コミットメッセージのテンプレート
└── README.md                # このファイル
```

フォルダは日付を接頭辞に付けることで、時系列に並ぶようにしています。

## 🛠 Environment

プロダクトごとに言語もツールチェインも異なり、リポジトリ全体で共通の依存関係はありません。
**環境構築と実行方法は、各プロダクトの README を参照してください。**

## 📝 Contributing

個人開発リポジトリですが、以下の流れで運用しています。

1. Issue を起票する（背景 / 対応内容 / 備考）
2. `feat/<Issue番号>-<機能名>` 形式でブランチを切る
3. Pull Request を作成し、本文に `Closes #<番号>` を含める

コミットメッセージは `.gitmessage` のテンプレートに従います。

```bash
git config commit.template .gitmessage
```

## 📄 License

[MIT License](./LICENSE)
