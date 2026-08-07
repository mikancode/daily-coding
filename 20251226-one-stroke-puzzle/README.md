# One-Stroke Grid Puzzle 💤 Paused

**グリッド上の全マスを一度ずつ通って、ゴールまで一筆書きする。**

グラフ理論の「ハミルトンパス（Hamiltonian path）問題」を題材にしたパズルゲームです。
スタート地点からドラッグまたはクリックで軌跡を描き、すべてのマスを重複なく通過してゴールに到達するとクリアになります。

> **⚠️ このプロジェクトは Phase 1（MVP）の途中で開発を中断しています。**
> 5x5 グリッドの描画と一筆書き判定ロジックまで動作しますが、未完成の箇所があります。詳細は [Known Issues](#-known-issues) を参照してください。

## ✨ Features

- 5x5 グリッドの描画と、スタート（S）／ゴール（G）の配置
- クリック・ドラッグ・タッチによる軌跡の描画
- 一筆書きの判定ロジック
  - 隣接判定（マンハッタン距離が 1 のマスにのみ移動可能）
  - 訪問済みマスへの再訪問禁止
  - 全マス訪問した状態でゴールに到達した場合のみクリア
- リセット機能

## 🛠 Tech Stack

| カテゴリ | 技術 | 選定理由 |
| :--- | :--- | :--- |
| **Framework** | Next.js 16 (App Router) | モダンフロントエンドの標準構成を試すため |
| **Language** | TypeScript | 軌跡データの型を厳格に扱うため |
| **Styling** | Tailwind CSS v4 | 迅速なスタイリング |
| **State** | Zustand | パス（軌跡）の保持・更新をコンポーネント外で管理するため |
| **Animation** | Motion | マス目の状態変化のアニメーション |

## 💻 Local Development

```bash
cd 20251226-one-stroke-puzzle/app
npm install
npm run dev
```

<http://localhost:3000> を開くと、5x5 のグリッドが表示されます。

## 📂 Project Structure

```text
20251226-one-stroke-puzzle/
├── app/                        # Next.js アプリケーション本体
│   └── src/
│       ├── app/
│       │   └── page.tsx        # トップページ（ボードとステータス表示）
│       ├── components/game/
│       │   └── GameBoard.tsx   # グリッド描画・ポインター入力のハンドリング
│       └── store/
│           └── useGameStore.ts # ゲーム状態と一筆書き判定ロジック
└── plans/
    └── game_development_plan.md # 開発計画書（コンセプト・ロードマップ）
```

## 🐛 Known Issues

再開する際に、まず解消すべき課題です。

- **クリア演出が表示されない**: `useGameStore` に `path` / `isCleared` 系と `grid` / `isComplete` 系という 2 つの状態モデルが並存しており、判定を行う `tryMove` は前者を、画面表示を行う `GameBoard` は後者を参照している。そのためクリア条件を満たしても「クリア！」が出ない
- **リセットが不完全**: `resetGame` が `isGameActive` を復元しないため、クリア後にリセットしても操作を再開できない
- **ステージが固定**: 5x5・スタート(0,0)・ゴール(4,4) がハードコードされており、ステージ選択機能が未実装

## 🗺 Roadmap

[開発計画書](./plans/game_development_plan.md) より抜粋。

- [x] **Phase 1**: 基本リポジトリ構築、ハミルトンパス判定ロジックの実装 ※上記 Known Issues を残して中断
- [ ] **Phase 2**: タッチ／ドラッグ操作の実装と、軌跡の視覚化
- [ ] **Phase 3**: ステージ選択機能、クリア演出、SE 追加
- [ ] **Phase 4**: Supabase によるユーザー自作ステージの投稿・共有機能、PWA 化
