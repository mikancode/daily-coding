# daily-coding

思いついたものを、動くところまで小さく作って積み上げる実験場。**1 フォルダ = 1 プロダクト**のモノレポ。

汎用の開発ルール（コミット・PR・Issue・命名）は `~/.claude/CLAUDE.md`（dotfiles）にある。
ここにはこのリポジトリ固有の事実だけを書く。

## 構成

| パス | 役割 |
|---|---|
| `YYYYMMDD-<name>/` | プロダクト1つ。**実行環境も依存もこのフォルダで完結する** |
| `scripts/` | リポジトリ横断のユーティリティ |
| `.claude/` | セッション開始時に dotfiles を取り込む hook |

リポジトリ全体で共通の依存関係・パッケージマネージャは**ない**。
ビルド・実行方法は各プロダクトの README を読むこと。ルートで `npm install` しない。

## 検証

```bash
./scripts/check-naming.sh   # フォルダ名の命名規約。CI（PR トリガー）と同じもの
```

テストは存在しない。各プロダクトの検証は `npm run lint` / `npm run build` など、
そのフォルダの `package.json` にあるものを使う。

## フォルダを追加するとき

名前は `YYYYMMDD-kebab-case`（日付は着手日、区切りはハイフンのみ）。
`lab-` `app-` などのプレフィックスは付けない。**違反すると CI が落ちる。**

`check-naming.sh` はドットで始まるディレクトリを除外するため、
ツール用のディレクトリ（`.claude` など）を足しても検査には引っかからない。

規約の原本は `dotfiles/docs/naming-conventions.md`。

## プロダクトの独立

独自の依存定義ファイル（`package.json` / `pyproject.toml` など）が必要になったら
別リポジトリへ切り出す。手順は `dotfiles/docs/naming-conventions.md` §3。
