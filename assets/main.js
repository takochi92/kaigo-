// 全ページ共通：ヘッダー・フッターの差し込み、メニュー開閉、文字サイズ切替
(function () {
  // サイトのルート（このスクリプトの場所から逆算。サブフォルダのページでもリンクが正しくなる）
  var script = document.currentScript;
  var base = script ? script.src.replace(/assets\/main\.js(\?.*)?$/, "") : "";
  window.SITE_BASE = base;

  var pages = [
    ["index.html", "トップ"],
    ["search.html", "事業所・病院検索"],
    ["manga.html", "まんがでわかる"],
    ["yomimono/index.html", "読みもの"],
    ["seido.html", "介護保険のしくみ"],
    ["shisetsu-shurui.html", "施設・サービスの種類"],
    ["shisetsu.html", "相談窓口"],
    ["jigyo.html", "事業者向け 指定要件"],
    ["faq.html", "よくある質問"]
  ];
  var here = location.href.split(/[?#]/)[0];
  if (/\/$/.test(here)) here += "index.html";

  var nav = pages.map(function (p) {
    var href = base + p[0];
    var cur = href === here ? ' aria-current="page"' : "";
    return '<a href="' + href + '"' + cur + ">" + p[1] + "</a>";
  }).join("");

  var header = document.getElementById("site-header");
  if (header) {
    header.className = "site-header";
    header.innerHTML =
      '<div class="wrap">' +
      '<a class="logo" href="' + base + 'index.html"><span class="logo-mark" aria-hidden="true">介</span>かいごナビ</a>' +
      '<button class="font-btn" id="font-btn" type="button" aria-pressed="false">文字 大</button>' +
      '<button class="nav-toggle" id="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav">メニュー</button>' +
      '<nav class="site-nav" id="site-nav" aria-label="メインメニュー">' + nav + "</nav>" +
      "</div>";
    header.insertAdjacentHTML("afterend",
      '<div class="urgent"><div class="wrap">' +
      '<strong>命に関わる緊急時は 119</strong>。迷ったら、まずはお住まいの地域包括支援センターか市区町村の介護保険窓口へ（<a href="' + base + 'shisetsu.html">相談窓口の探し方</a>）。' +
      "</div></div>");

    var toggle = document.getElementById("nav-toggle");
    var siteNav = document.getElementById("site-nav");
    toggle.addEventListener("click", function () {
      var open = siteNav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
    });

    var fontBtn = document.getElementById("font-btn");
    var applyFont = function (large) {
      document.documentElement.classList.toggle("font-lg", large);
      fontBtn.setAttribute("aria-pressed", String(large));
      fontBtn.textContent = large ? "文字 標準" : "文字 大";
    };
    var saved = false;
    try { saved = localStorage.getItem("kaigo-font-lg") === "1"; } catch (e) {}
    applyFont(saved);
    fontBtn.addEventListener("click", function () {
      var large = !document.documentElement.classList.contains("font-lg");
      applyFont(large);
      try { localStorage.setItem("kaigo-font-lg", large ? "1" : "0"); } catch (e) {}
    });
  }

  // ページ内リンクの行き先が折りたたみの中なら開く
  function openTarget() {
    var id = decodeURIComponent(location.hash.slice(1));
    var el = id && document.getElementById(id);
    if (el && el.tagName === "DETAILS") el.open = true;
  }
  window.addEventListener("hashchange", openTarget);
  openTarget();

  var footer = document.getElementById("site-footer");
  if (footer) {
    footer.className = "site-footer";
    footer.innerHTML =
      '<div class="wrap">' +
      "<p>このサイトの情報は一般的な解説です（主に2024年度介護報酬改定時点の制度にもとづきます）。" +
      "制度・料金・人員基準は改定や自治体によって変わります。最終的な判断は、市区町村の介護保険窓口、地域包括支援センター、" +
      '<a href="https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/hukushi_kaigo/kaigo_koureisha/index.html" target="_blank" rel="noopener">厚生労働省</a>、' +
      "指定権者（都道府県・市区町村）の最新情報でご確認ください。</p>" +
      '<p>事業所データの出典：厚生労働省「<a href="https://www.mhlw.go.jp/stf/kaigo-kouhyou_opendata.html" target="_blank" rel="noopener">介護サービス情報公表システム オープンデータ</a>」、「<a href="https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/kenkou_iryou/iryou/newpage_43373.html" target="_blank" rel="noopener">医療情報ネット オープンデータ</a>」（当サイトで加工して掲載）</p>' +
      '<p><a href="' + base + 'about.html">このサイトについて・運営者情報</a>　<a href="' + base + 'policy.html">プライバシーポリシー・免責事項</a>　<a href="https://docs.google.com/forms/d/1Q9pIKgnPZdZeB-6XsWSoyjGqBBqIUtSKXlVnkmED6Hg/viewform" target="_blank" rel="noopener">お問い合わせ</a></p>' +
      "<p>© かいごナビ</p>" +
      "</div>";
  }
})();
