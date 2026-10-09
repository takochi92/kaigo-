# おやのて — Claude 向けメモ

介護の制度・相談窓口・全国の介護事業所/病院検索の公開サイト（GitHub Pages、Google 検索に載せる）。
構成とビルド方法は README.md を参照。

## 投稿原稿（Atelier）
- 司令塔（claude-hub）はもう使わない（2026-10-10 で更新終了）。claude-hub に記録しない。
- SNS の原稿は、たこさんの下書き置き場 Atelier の「自動作成された投稿」に入れる。おやのては **Instagram のみ**（project: care）。
- 毎朝 6:43 に `.github/workflows/daily-instagram.yml` が画像（sns-auto ブランチ）と原稿を作り、Atelier へ送る（Secrets の ATELIER_* 3つ）。
- 送る形：`{"project":"care","channel":"Instagram","date":"YYYY-MM-DD","slot":"morning","text":"…"}`。同じ日・媒体・slot は上書き。
