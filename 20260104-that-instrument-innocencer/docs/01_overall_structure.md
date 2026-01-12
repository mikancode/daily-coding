# Overall Structure

## 技術スタック
- React + TypeScript
- Vite
- Tone.js
- Canvas API

## 全体構成（概念）
- UIレイヤー
- 音生成レイヤー
- 描画レイヤー
- 入力（Pointer Event）

## ディレクトリ構成（予定）

src/
- components/
- hooks/
- audio/
- visuals/
- domain/
- utils/

## 現在の構成
- App.tsx に多くの責務が集約されている

## 目標とする構成
- 責務ごとに分離
- 音・視覚・入力を独立させる

