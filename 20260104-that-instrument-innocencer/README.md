# Innocencer (あの楽器)

日々のコーディング学習の一環として開発している、直感的な操作が可能なWeb楽器アプリです。
画面をタッチした座標に応じて、リアルタイムに音階とビジュアルエフェクト（波紋）が生成されます。

## 🚀 Live Demo
- **Production:** [https://innocencer.vercel.app](https://innocencer.vercel.app)
- **Development Preview:** VercelのGitHub連携により、ブランチごとにプレビューURLが自動生成されます。

## 🛠 Tech Stack
- **Frontend:** React + TypeScript
- **Build Tool:** Vite
- **Sound Engine:** Tone.js (Web Audio API)
- **Visuals:** Canvas API
- **Deployment:** Vercel

## 📖 Learning Journey
このプロジェクトでは、以下の技術習得を目標としています。
- [x] Vite + React + TS による開発環境の構築
- [x] VercelによるCI/CD（自動デプロイ）環境の構築
- [ ] TypeScriptの基本（型定義、State、イベントハンドリング）
- [ ] Tone.jsを用いたシンセサイザーの制御
- [ ] Canvas APIによる低遅延なアニメーション描画
- [ ] スマホ（マルチタッチ）への最適化

## 💻 Local Development

リポジトリをクローンした後、以下のコマンドでローカル開発サーバーを起動できます。

```bash
# プロジェクトディレクトリへ移動
cd 20260104-that-instrument-innocencer/innocencer

# 依存関係のインストール
npm install

# 開発サーバー起動（スマホでテストする場合は --host を使用）
npm run dev -- --host
```

## 📂 Project Structure
```text
innocencer/
├── src/
│   ├── App.tsx    # メインロジック（State, Audio, Event）
│   ├── main.tsx   # エントリーポイント
│   └── App.css    # 全画面レイアウト、スタイリング
├── public/        # 静的アセット
└── index.html
```