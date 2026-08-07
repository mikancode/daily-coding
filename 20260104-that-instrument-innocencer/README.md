# Innocencer（あの楽器）

> **Note**: 本プロジェクトは独立リポジトリへの移行を予定しています（[#35](https://github.com/mikancode/daily-coding/issues/35)）。移行後はこのディレクトリを削除します。

**画面をタッチすると、音と波紋が生まれる。**  
Innocencer は、直感的な操作で演奏できるWeb楽器アプリです。

タッチした座標に応じて音が鳴り、同時にビジュアルエフェクトがリアルタイムに描画されます。  
スマホ・PC のどちらでも、指先ひとつで「音を出す体験」を楽しめます。

<!--
📸 スクリーンショットを置くならここ
例: docs/images/hero.png
-->

## 🚀 Live Demo

- **Production:** https://innocencer.vercel.app  
- **Preview:** VercelのGitHub 連携により、ブランチごとに自動生成

※ スマートフォンでのタッチ操作推奨

## ✨ What You Can Do

- 画面タッチで即座に音を再生
- ポインター位置に追従するビジュアル表示
- ブラウザ上で完結（インストール不要）

## 🛠 Tech Stack

- **Frontend:** React + TypeScript
- **Build Tool:** Vite
- **Sound:** Tone.js（Web Audio API）
- **Visual:** Canvas API
- **Deployment:** Vercel

## 📐 Design & Architecture

このプロジェクトでは、  
**入力・音・描画の責務を分離し、機能追加しやすい構造**を意識しています。

設計上の判断理由や、今後の拡張を見据えた構成については`docs/` にまとめています。

→ [設計ドキュメントを読む](docs/index.md)

## 📖 Learning Journey

学習・検証を目的とした個人開発プロジェクトとして、以下に取り組んでいます。

- [x] Vite + React + TypeScript による開発環境構築
- [x] Vercel による CI/CD（自動デプロイ）
- [ ] TypeScript の基本（型定義 / State / イベント）
- [ ] Tone.js によるシンセ制御
- [ ] Canvas API を用いた低遅延アニメーション
- [ ] スマホでのマルチタッチ最適化

## 💻 Local Development

```bash
cd 20260104-that-instrument-innocencer
npm install
npm run dev -- --host
```
## 📂 Project Structure
```
20260104-that-instrument-innocencer/
├── src/
│   ├── App.tsx    # 全体制御（入力・音・描画の起点）
│   ├── main.tsx   # エントリーポイント
│   └── App.css    # 全画面レイアウト
├── public/
└── index.html
```

## 🎼 Inspiration

Innocencerは、2007年に公開された楽曲「Innocence」に関連する動画に登場する、架空の楽器表現から着想を得ています。  
当時、映像内の抽象的な楽器表現を技術的に再現しようとする試みがエンジニアコミュニティで数多く見られました。  
本プロジェクトでは、その発想を現代のWeb技術（Web Audio / Canvas）で再解釈し、
ブラウザ上で触れる形に落とし込むことを目的としています。
