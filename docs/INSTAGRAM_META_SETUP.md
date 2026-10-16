# Instagram @oyanote のログイン不要な日次公開

## 状態

この仕組みは `IG_AUTOPUBLISH_ENABLED=true` にするまで動きません。2026-10-16現在、Metricool の当日12:00予約と既存の Codex 定期実行があるため、二重投稿を避けるためにも Meta 側の接続検証を終えてから切り替えます。**予約と公開は別です。**

2026-10-16 12:00 JST の Metricool 投稿は `Published Post` と [Instagram の公開 URL](https://www.instagram.com/p/DeihWCoCr_L/) を確認しました。Meta アプリでは `instagram_business_basic` と `instagram_business_content_publish` が「テスト準備完了」です。@oyanote を Instagram テスターに追加しようとした際、Meta が「フォームを保存できません」と返したため、アクセストークン生成と GitHub Actions の有効化は未実施です。

GitHub Actions は日本時間10:02に最初の公開を試み、原稿生成や Actions 起動が遅れた場合は10:20、11:00、12:00、15:00に再確認します。GitHub のスケジュールは正確な時刻の実行を保証しません。投稿に失敗した場合は Actions の失敗として残り、公開要求の結果が不明なら自動再送を止めます。

## 初回設定（所有者が行う）

1. [Meta for Developers](https://developers.facebook.com/apps/1566972251896103/dashboard/) の **Oyanote Auto Publisher**（Meta アプリ ID `1566972251896103`、Instagram アプリ ID `4077866365852062`）を使用します。2026-10-16 に Instagram ログインを使った Instagram API のユースケースで作成済みです。@oyanote が Instagram プロアカウントであることも画面で確認済みです。
2. `instagram_business_basic` と `instagram_business_content_publish` の権限を @oyanote に付与し、長期間有効な Instagram ユーザーアクセストークンと Instagram ユーザー ID を取得します。認証画面で付与する範囲を確認してください。アクセストークンをチャット、issue、コミットに貼らないでください。
3. この GitHub リポジトリの **Settings → Secrets and variables → Actions → Repository secrets** に `IG_USER_ID`、`IG_ACCESS_TOKEN`、`IG_TOKEN_ENCRYPTION_KEY` を登録します。最後の値は推測されにくい32文字以上のランダム文字列です。トークンは `sns-auto/instagram-token.enc.json` に AES-256-GCM で暗号化して保存し、7日ごとに更新します。鍵は GitHub Secret のみに保存します。
4. Actions で **Publish Instagram via Meta** を `dry_run=true` で手動実行し、当日原稿・画像の検証が成功することを確認します。この実行では Instagram に送信しません。
5. 有効化前に、Metricool の当日・翌日予約を確認し、Codex の「おやのて Instagram 毎日1件」「おやのて Instagram 昼の再確認」を停止します。二つの経路を同時に動かさないでください。
6. **Repository variables** に `IG_AUTOPUBLISH_ENABLED`=`true` を登録します。翌日の実行後、Actions の結果と Instagram の実際の投稿 URL を確認します。

## 処理と安全策

- `sns-auto/YYYY-MM-DD/post.json` と JPG を使用します。公開サーバーで読める GitHub の画像 URL を Meta に渡します。
- API の `/me` で投稿先が `@oyanote` であることを確認します。直近の Instagram 投稿に同じ日付・本文があれば追加しません。
- 複数 JPG は子コンテナからカルーセルを作り、準備完了を確認してから公開します。
- 公開リクエストの**前**に `instagram-published.json` に `publishing` を保存します。応答が失われても二重投稿しないよう、状態が不明な場合は再送を止めて人間の確認を求めます。
- Meta からメディア ID が返った場合だけ `published` と記録します。Instagram のプロフィールでも実際の表示を確認してください。
- 長期間有効なトークンは Meta の更新 API で定期更新します。更新に失敗した場合は Actions を失敗させます。Meta 側の権限変更・失効・アプリ制限は自動修復できません。

## 注意

Meta の[コンテンツ公開仕様](https://developers.facebook.com/documentation/instagram-platform/content-publishing)では、JPG が公開アクセス可能なサーバーにあり、プロアカウントと公開権限が必要です。初回の認証と実際の公開テストが済むまで、自動投稿が完成したとは扱いません。
