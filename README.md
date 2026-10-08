# かいごナビ

介護が必要になったときに「何をすればいいか」「どこに連絡すればいいか」がわかる情報サイトです。

## ページ構成

| ファイル | 内容 |
|---|---|
| `index.html` | トップ：利用開始までの流れ、都道府県別の入り口、困りごと別の連絡先 |
| `search.html` | 全国の介護事業所・病院検索（都道府県・市区町村・サービス種類・キーワード・現在地から近い順） |
| `area/〇〇/〇〇〇〇〇.html` | 市区町村ごとの事業所一覧ページ（ビルド時に自動生成。Google検索向け） |
| `manga.html` | まんがでわかる介護（全4話。`npm run manga` で `scripts/make-manga.mjs` から生成） |
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
3. `https://takochi92.github.io/kaigo-/` で公開されます

Google検索に出すには、[Google Search Console](https://search.google.com/search-console) にサイトを登録し、`sitemap.xml` を送信してください。独自ドメインを使う場合は Pages の Custom domain を設定します（sitemap のURLは自動で切り替わります）。

## Claude 作業ログ（`claude/`）

Claude がつくったファイル・データを毎日まとめるダッシュボードです（`https://takochi92.github.io/kaigo-/claude/`。検索エンジンには出しません）。

| ファイル | 内容 |
|---|---|
| `claude/index.html` | ダッシュボード：今日の作業数・作ったファイル・連続日数・活動ヒートマップ・タイムライン |
| `claude/tasks.json` | Claude に頼んでいるタスクのまとめ（手で編集して増やせます） |
| `claude/widget.html` | スマホ用の小さなウィジェット表示（ホーム画面に追加できます） |
| `claude/scriptable-widget.js` | iPhone の「Scriptable」アプリで本物のホーム画面ウィジェットにするスクリプト |
| `scripts/claude-log.mjs` | git の全ブランチの履歴から Claude のコミットを集めて `log.json`・`feed.xml` を生成 |
| `.github/workflows/claude-daily.yml` | push のたびにログを `claude-log` ブランチへ更新、毎朝 7:47 に前日の日報を Issue で通知 |

日報 Issue はリポジトリの持ち主に割り当てられるので、GitHub アプリの通知をオンにしておくとスマホに届きます。毎朝の実行（schedule）はデフォルトブランチに入ってから動きます。

```bash
node scripts/claude-log.mjs --out dist/claude   # ログを生成
node scripts/claude-log.mjs --report yesterday  # 前日の日報（Markdown）を表示
```

## 注意

制度の解説は主に2024年度介護報酬改定時点の一般的な情報です。制度・金額・基準は改定や自治体によって変わるため、定期的に厚生労働省・指定権者・市区町村の最新情報で確認してください。
