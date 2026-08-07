# Corp URL Finder ✅ Done

**企業名から、その会社の公式サイト URL を突き止める。**

経済産業省が提供する [gBizINFO](https://info.gbiz.go.jp/) の法人情報 API を使い、
企業名 → 法人番号 → 法人詳細情報（公式サイト URL を含む）の順に辿る調査用ノートブックです。

取得した URL に対しては、`robots.txt` を確認したうえでトップページを取得し、
タイトルとリンク一覧を抽出するところまでを扱っています。

[![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/mikancode/daily-coding/blob/main/20251230-corp-url-finder/01_search_official_url.ipynb)

## 🔎 Flow

| # | 処理 | 使用 API / ライブラリ |
| :--- | :--- | :--- |
| 1 | 企業名で法人を検索し、法人番号を得る | `GET /hojin/v2/hojin?name=<企業名>` |
| 2 | 法人番号で詳細情報を取得する（`metadata_flg=true`） | `GET /hojin/v2/hojin/<法人番号>` |
| 3 | ネストした JSON を項目単位に展開し、データ品質・出典を併記した表にする | pandas |
| 4 | 取得した公式 URL がクロール可能か `robots.txt` で確認する | `urllib.robotparser` |
| 5 | 公式サイトの HTML を取得し、タイトルとリンク一覧を抽出する | requests, BeautifulSoup |

手順 3 で「値そのもの」だけでなく **`data_quality` と `source`（出典）を横に並べている**のが要点です。
gBizINFO は複数の官公庁データを統合しているため、同じ項目でも情報源によって鮮度が異なります。
URL をそのまま信用せず、どのデータに基づく値なのかを確認できる形にしています。

## 🔑 Setup

gBizINFO の API トークンが必要です。

1. [gBizINFO](https://info.gbiz.go.jp/api/index.html) で API トークンを発行する
2. Colab のシークレット機能（左サイドバーの 🔑 アイコン）に `GBIZ_API_KEY` という名前で登録する
3. ノートブックを上から順に実行する

```python
# ノートブック内ではシークレットから読み込んでいる
from google.colab import userdata
headers = {"X-hojinInfo-api-token": userdata.get('GBIZ_API_KEY')}
```

> **⚠️ トークンをノートブックに直接書かないこと。** Colab のシークレット経由で読み込む前提の実装になっています。

## ⚖️ Note

- API のエンドポイントは検証用の `trial.api.info.gbiz.go.jp` を使用しています。本番運用する場合は正式なエンドポイントへの差し替えが必要です
- 公式サイトへのアクセスは `robots.txt` を確認したうえで行い、リクエストにはタイムアウトを設定しています。対象サイトの利用規約を確認してから実行してください

## 📂 Files

```text
20251230-corp-url-finder/
└── 01_search_official_url.ipynb  # 法人検索から公式サイト解析までの一連の処理
```
