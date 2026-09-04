# Innocencer

タッチした座標で音が鳴り、波紋が描画される Web 楽器。React + Vite + Tone.js + Canvas。

リポジトリ全体のルールは `~/.claude/CLAUDE.md`（dotfiles）と `daily-coding/CLAUDE.md` にある。
ここにはこのプロダクト固有の事実だけを書く。

## コマンド

```bash
npm run dev      # vite --host（スマホ実機での確認用に --host が付いている）
npm run build    # tsc -b && vite build
npm run lint     # eslint .
npm run preview
```

テストは無い。検証は `lint` と `build`、あとは実機タッチ操作で行う。

## デプロイ

Vercel。Root Directory にこのフォルダを指定している。

**Ignored Build Step のカレントディレクトリは、既にこのフォルダの中になる。**
Root Directory 設定が効いた状態でコマンドが走るため、モノレポのつもりで
`20260104-that-instrument-innocencer` のようなパスを渡すと一致せず、
無関係な変更でも毎回ビルドが走る。**対象パスは `.` にする。**

（`daily-coding` 244c1b4 / #35 で確認。対象外フォルダの変更 → Canceled、
このフォルダ配下の変更 → 通常ビルド、を実測している）

## 設計ドキュメント

実装の意図と判断軸は [`docs/`](./docs/index.md) にある。実装変更時に追記する。

## 独立リポジトリへの移行

`package.json` を持つため、命名規約 §3 の昇格基準（独自の依存定義ファイルが必要になったら独立）
を既に満たしている。移行は #35 で予定。移行時はこのファイルも一緒に持っていく。
