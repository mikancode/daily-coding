# CLAUDE.md

思いついたものを、動くところまで小さく作って積み上げる実験場。**1 フォルダ = 1 プロダクト**のモノレポ。

このリポジトリで作業するエージェントが、即座に実行・参照すべき事実だけを書く。
開発規約（コミット形式・開発フロー・フォルダ名・独立リポジトリへの昇格基準）は開発者向けに `.github/CONTRIBUTING.md` へまとめてある。
作業時はエージェントもこれに従う。

## テストの実行方法

テストも CI も存在しない。リポジトリ全体で共通の依存関係・パッケージマネージャも無く、
**ルートで `npm install` しない。**

各プロダクトの検証は、そのフォルダの `package.json` にあるスクリプト
（`npm run lint` / `npm run build` など）を使う。ビルド・実行方法は各プロダクトの README を読む。

## 触ってはいけないディレクトリ

- `*/node_modules/` — 各プロダクトの依存の実体。変更はそのフォルダの `package.json` 経由で行う
- `*/dist/` — ビルド成果物。ソースを直す

## Vercel の不具合調査

Vercel にデプロイしたプロダクトは、claude.ai の Vercel コネクタ（`mcp__claude_ai_Vercel__*`）で調べる。
使えるツールは `~/.claude/settings.json`（dotfiles）の permissions で絞ってあり、
次の手順で使うもの以外は deny されている。
claude.ai 側のコネクタ設定は Claude Code には効かない。

1. `list_teams` でチーム ID を得る
2. `list_projects` に `teamId` を付けて、対象のプロジェクト ID を得る。
   `teamId` を付けないと、コネクタからアクセスできないプロジェクトも一覧に出る
3. `list_deployments` でデプロイを探す。
   Ignored Build Step でビルドを省いたデプロイも `CANCELED` になる
   （`.github/CONTRIBUTING.md`「Vercel で公開する場合」）
4. ビルドの失敗は `list_deployment_events`（ビルドログ）で見る
5. 実行時の不具合は `get_runtime_errors` で傾向を掴み、`get_runtime_logs` で個別に追う。
   Hobby プランのランタイムログは1時間しか残らないため、`since` は `1h` 以内にする

403 が返るときは、コネクタのアクセス範囲にそのプロジェクトが入っていない。
Claude アプリからは範囲を広げられないため、コネクタを切断して再接続し、そのときにプロジェクトを選び直す。

## PR 起票前

- `/code-review` を実行し、指摘を処理してから PR を作成する
- 実装中の試行錯誤や起票前レビュー対応の経緯（どの指摘にどう対応したか）は PR 本文に書かない
