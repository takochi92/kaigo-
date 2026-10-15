# おやのて — Codex引き継ぎ（2026-10-15）
## 最初に
これは既存GitHubサイトの継続開発です。作り直さず、リモートの最新状態とAGENTS.mdを確認してから進めてください。この資料は会話からの引き継ぎであり、現時点の再検証結果ではありません。
- リポジトリ: https://github.com/takochi92/kaigo-
- 2026-10-15確認のデフォルトブランチ: ccr-0d9e948d-9nfoh6（mainと決めつけない）
- 公開URL: https://oyanote-care.com/
- GitHub Pages / GitHub Actions。ドメイン・DNSはCloudflare。
- サイト名「おやのて」で確定。旧名称「かいごナビ／介護ナビ」。旧GitHub URL https://takochi92.github.io/kaigo-/。
- Instagramの利用者提供スクリーンショット上のユーザー名は @oyanote。古い投稿画像・本文に旧名称が残っていた。

## ユーザーの目的・方針
家族が介護の制度、相談先、サービス、退院準備を理解できる基盤を固め、実際の利用者を増やし、将来の収益化につなげる。
スマホ・文字拡大での読みやすさを重視。温かみがある絵・アイコンを好む。
既存のまんが・施設検索・資料を維持。名称やURLの統一、正確性、信頼性を優先。
通常の修正は自律的に進める。外部へのメール・DM送信は明示的指示なしに行わない。
公的機関や施設からの監修・推薦・提携があるような表記はしない。

## 構成・開発
静的HTML/CSS/JS + Node.js 20以上。package.json参照。
- npm run build: node scripts/build.mjs（全国データの取得・地域ページ・dist生成。通信と時間が必要）
- npm test: node --test tests/*.test.mjs
- npm run check: node scripts/check-site.mjs
- npm run serve: distを8000番で配信
- assets/main.js / assets/style.css: 共通ヘッダー、文字拡大、モバイルナビなど
- scripts/build.mjs: 厚労省のCSV/ZIPから全国データと地域ページ生成。生成物だけ直さず生成処理を修正。
- scripts/make-handouts.py: PDFチラシ、QR、OGP生成。--fontでローカルNoto Sans JP可変フォントを指定。
- scripts/make-instagram.cjs: Instagram投稿素材生成
- .github/workflows/deploy.yml: ビルド・表示チェック・Pages公開
- .github/workflows/refresh-sns.yml: SNS素材更新
- .github/workflows/claude-notify.yml: 既存通知連携。秘密情報を出力しない。

## 主要ページ
- /manga.html
- /area/34/34100.html 広島市一覧（ビルド生成）
- /share.html 配布用資料
- /contact.html 問い合わせ
- /about.html 運営者情報
- /sources.html 出典・編集・訂正・広告方針
- /policy.html プライバシー・免責

## 公開済み変更（前セッション報告。再確認する）
旧名称・URLの移行、スマホの表崩れ対策、文字拡大、ナビ・チェックリストの確認。
全国の生成HTML・内部リンク、SNSのPNG/JPG/動画の再生成を実施したとの報告あり。ただし画像内の旧名称・旧handle残存は別途点検。
Googleフォーム、GA4の名称・URL変更も実施したとの報告あり。権限は別途必要で、GitHub接続だけでは引き継がれない。
- 1f81545eaf7d27711c75d9ce8008bf90c1d0055f: 温かみのある手のアイコンをヘッダーに反映。
- bbb7346b7dcfae573efb2b3404a172d0a934f9a0: 親子の挿し絵付き全国版・広島市版チラシを反映。Pages公開後、広島市版PDFとローカルのSHA256一致まで確認。
- assets/handouts/family-conversation.jpg
- assets/handouts/oyanote-flyer.pdf
- assets/handouts/oyanote-flyer-hiroshima.pdf
両PDFは2ページ（A4案内+4枚カード）。計10個のQRを復号して正しいURLと確認。kaigonavi-flyer系の旧PDFパスも同内容へ更新。

## データと利用条件
施設情報は以下の公式オープンデータから取得する設計:
- https://www.mhlw.go.jp/stf/kaigo-kouhyou_opendata.html
- https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/kenkou_iryou/iryou/newpage_43373.html
2026-10-09の確認では規約の条件下で二次利用・商用利用が認められる。出典、加工した旨と加工主体、規約・ライセンスのリンクを点検すること。
第三者の写真・ロゴ・紹介文は別扱い。オープンデータだから全画像転載自由とはしない。
取得日と元データ公表時点を区別し、移転・廃止などの最新確認を案内する。
サイト全体の法的適合性を保証したわけではない。利用連絡フォーム・アンケートの送信は未確認。

## 集客・外部連絡の実績（ユーザー報告）
2026-10-09にユーザー本人がメール送信済み:
1. 己斐・己斐上地域包括支援センター
2. 戸山・伴・大塚地域包括支援センター
吉島、三入・可部はフォームが書きにくく未送信。重複送信しない。返信状況は未確認。
三原・福山への拡大は相談したが、送信済みとは扱わない。
高陽・亀崎・落合は営業メール不可の明記があったため候補から除外。
連絡先・規約は追加送信前に公式で再確認する。

2026-10-15、Instagramで小嶋尚人様から挨拶DMが届いたとユーザー報告。
スクリーンショット本文では、北海道釧路市のデイサービスで子どもの療育に携わるとの自己紹介。
感謝、運営者が医療従事者であること、サイトの思い、無料・登録不要の案内、ご意見をお願いする返信案を作成。実際の送信・紹介・提携は未確認。フォロワー約1万人はユーザー申告。
本名や所属先・資格の詳細は推測して公開しない。

## 会話だけで生成した画像
2026-10-09、Instagram初回紹介画像を画像生成で編集した。「おやのて／@oyanote」に変更し、スクリーンショットのUIを除去。既存の人物イラスト・緑と橙の配色を踏襲。
この画像はGitHubやInstagramに反映したとは確認していない。元生成ファイルは旧実行環境のgenerated_images配下であり、永続アクセスは保証しない。必要ならユーザーの画像から再取得。
画像内の「医療従事者」表記はあるが、具体的資格・氏名は断定しない。
このチャットで変更したことと、Instagramの投稿を実際に変更したことは区別する。

## 未完了・優先事項
1. リモート最新・本番・CIを照合。資料の完成報告だけで全ページの現状を断定しない。
2. Instagram用素材の全画像・本文・handleを点検し、おやのて / @oyanote / 独自ドメインへ統一。既存Instagram投稿の画像は自動更新されない。
3. Search Console: 新URLプロパティへの登録・サイトマップ送信後に「取得失敗」が残っていた。Google側の現状は未確認。sitemap.xml、分割サイトマップ、robots.txt、HTTP応答、URL検査を再確認。
4. GA4の実計測、重要導線（施設検索・まんが・PDF）を確認。検索語やフォーム内容などを不要に送信しない。
5. 包括からの返信・利用者の意見を反映。メールが送信されたことと利用されたことを区別。
6. 収益化は将来方針。現時点の広告有無は本番で確認し、永続「広告なし」を約束しない。導入時は広告/PR明示、通常検索の順位と協賛を切り分ける。

## Codexへの最初の依頼
このファイル、README.md、package.json、該当するAGENTS.mdを読み、最新コードと本番を確認してください。
既存サイトの機能・公開先を維持して継続開発し、まず旧名称・旧URL・Instagram handleの残存とSearch Console関連の技術的問題を調べてください。
外部への送信、資格・推薦の創作、根拠のない完了報告は行わず、実施内容・検証結果・残作業を日本語で示してください。
