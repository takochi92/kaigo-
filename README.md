# おやのて

介護が必要になったときに「何をすればいいか」「どこに連絡すればいいか」がわかる情報サイトです。

## ページ構成

| ファイル | 内容 |
|---|---|
| `index.html` | トップ：利用開始までの流れ、都道府県別の入り口、困りごと別の連絡先 |
| `search.html` | 全国の介護事業所・病院検索（都道府県・市区町村・サービス種類・キーワード・現在地から近い順） |
| `area/〇〇/〇〇〇〇〇.html` | 市区町村ごとの事業所一覧ページ（ビルド時に自動生成。Google検索向け） |
| `manga.html` | まんがでわかる介護（現在7話。`npm run manga` で `scripts/make-manga.mjs` から生成） |
| `yomimono/` | 読みもの（記事）。`content/articles.mjs` を直して `npm run articles` で作り直す |
| `yougo.html` | 介護・医療の用語集（`content/glossary.mjs`） |
| `seido.html` | 介護保険のしくみ |
| `shisetsu-shurui.html` | 施設・サービスの種類 |
| `shisetsu.html` | 相談窓口：地域包括支援センターの探し方、全国の電話相談 |
| `jigyo.html` | 事業者向け：指定要件・開業の流れ・チェックリスト |
| `faq.html` | よくある質問 |

## 事業所データ（国のオープンデータ）

`scripts/build.mjs` が、厚生労働省「[介護サービス情報公表システム オープンデータ](https://www.mhlw.go.jp/stf/kaigo-kouhyou_opendata.html)」のCSV（全国の介護サービス事業所。訪問看護ステーションを含む）を取得し、

- `dist/data/pref/〇〇.json`（検索ページ用）
- `dist/area/〇〇/…html`（市区町村別ページ）
- `dist/sitemap.xml`・`robots.txt`

を生成します。病院・診療所・歯科診療所は、厚生労働省「[医療情報ネット オープンデータ](https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/kenkou_iryou/iryou/newpage_43373.html)」（ZIP）から取り込み、診療科も検索できます（助産所・薬局は対象外）。

国のデータは年2回（6月末・12月末時点）更新されるため、GitHub Actions で毎月自動的に再取得・再公開します。出典表記はフッター・各ページに入っています。

```bash
npm run build                                   # 厚労省から取得してビルド
node scripts/build.mjs --csv-dir ./csv --med-dir ./med   # 手元に保存したCSV/ZIPからビルド
npm run serve                                   # http://localhost:8000 で確認
```

`data/facilities.js` には、オープンデータに含まれない全国の電話相談窓口を手作業で登録しています。

## 公開（GitHub Pages）

1. GitHub のリポジトリ → Settings → Pages → Source を「GitHub Actions」にする
2. Actions タブで「Build and deploy」を実行（push でも自動実行）
3. `https://oyanote-care.com/` で公開されます

Google検索に出すには、[Google Search Console](https://search.google.com/search-console) にサイトを登録し、`sitemap.xml` を送信してください。独自ドメインを使う場合は Pages の Custom domain を設定します（sitemap のURLは自動で切り替わります）。

## インスタ投稿の自動作成

`.github/workflows/daily-instagram.yml` が毎朝（日本時間 6:43）、読みもの・用語集からその日の投稿（1080×1350 の画像と投稿文）を作り、`sns-auto` ブランチの日付フォルダに置きます。日曜日は、その日に公開されたまんがの画像と投稿文を使います。順番の確認は `node scripts/make-daily-post.mjs --list`。投稿の推奨時刻は日本時間 10:00 です。

`content/manga-queue.mjs` に用意した7題は、`.github/workflows/weekly-manga.yml` が2026年10月18日から毎週日曜日03:00（日本時間）に1話ずつ公開します。画像・動画は続けて `refresh-sns.yml` で生成します。用意した題材が尽きたら自動生成は止まるため、内容を確認した新しい題材をキューに追加してください。

2026年10月17日10:00の投稿は Metricool に自動公開で予約済みです。予約と公開は別の状態なので、当日の公開結果を確認します。

10月18日以降に Meta API へ切り替えるための GitHub Actions は用意していますが、アクセストークンの発行と Secrets 登録、実際の公開テストが終わるまで無効です。切り替え条件と二重投稿防止策は [Instagram Meta API 設定手順](docs/INSTAGRAM_META_SETUP.md) を参照してください。切り替えまでは Codex の定期実行が Metricool を使い、`sns-auto` の原稿を検品・予約します。

## Claude の作業通知

Claude がコミットを push すると、`.github/workflows/claude-notify.yml` がスマホの ntfy アプリに通知します（Secrets の `NTFY_TOPIC` を設定したときだけ）。タスク・作成物・ツイートの一覧は非公開リポジトリ `claude-hub` にまとめています。

## 注意

制度の解説は主に2024年度介護報酬改定時点の一般的な情報です。制度・金額・基準は改定や自治体によって変わるため、定期的に厚生労働省・指定権者・市区町村の最新情報で確認してください。
