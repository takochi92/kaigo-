#!/usr/bin/env node
// 読みもの（content/articles.mjs）と用語集（content/glossary.mjs）から HTML を作る
//   node scripts/make-articles.mjs
// 作るもの：yomimono/<slug>.html、yomimono/index.html、yougo.html
// yomimono/taiin.html は手書きのページなので上書きしない（一覧には載せる）

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ARTICLE_SOURCES } from "../content/article-sources.mjs";
import { ARTICLES, CATEGORIES } from "../content/articles.mjs";
import { TERMS } from "../content/glossary.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const catName = Object.fromEntries(CATEGORIES);

// 手書きの記事（一覧に載せるだけ）
const HANDWRITTEN = [
  { slug: "taiin", cat: "zaitaku", date: "2026-10-08", title: "親が退院することになったら｜家に帰る前にやること", lead: "相談先、介護保険の申請、退院前の打ち合わせ、家の準備、チェックリスト。" }
];

const rel = (html, up) => html.replace(/@\//g, up);

function page({ title, description, up, body, jsonLd }) {
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="stylesheet" href="${up}assets/style.css">
${jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>` : ""}
</head>
<body>
<header id="site-header"></header>

${body}

<footer id="site-footer"></footer>
<script src="${up}assets/main.js"></script>
</body>
</html>
`;
}

const all = [...ARTICLES, ...HANDWRITTEN];

// ---- 記事ページ
for (const a of ARTICLES) {
  const up = "../";
  const toc = [...a.body.matchAll(/<h2 id="([^"]+)">([^<]+)<\/h2>/g)].map((m) => `<a href="#${m[1]}">${esc(m[2])}</a>`).join("");
  const related = all.filter((b) => b.slug !== a.slug && b.cat === a.cat).slice(0, 3);
  const body = `<main class="wrap" style="max-width:48em">
  <p class="small muted"><a href="${up}index.html">トップ</a> › <a href="index.html">読みもの</a> › ${esc(catName[a.cat])}</p>
  <h1>${esc(a.title)}</h1>
  <p class="small muted">おやのて編集部／${a.date.replace(/^(\d+)-0?(\d+)-0?(\d+)$/, "$1年$2月$3日")}</p>
  <p class="lead">${esc(a.lead)}</p>
  <div class="tip"><strong>この記事のポイント</strong><ul style="margin:6px 0 0">${a.summary.map((s) => `<li>${esc(s)}</li>`).join("")}</ul></div>
  ${toc ? `<nav class="toc" aria-label="この記事の目次">${toc}</nav>` : ""}
  ${rel(a.body, up)}
  <h2>参考資料・制度の確認先</h2><ul>${(ARTICLE_SOURCES[a.slug] || []).map(([label, url]) => `<li><a href="${esc(url)}">${esc(label)}</a></li>`).join("")}</ul><p class="small muted">対象条件や手続きは、上記の資料とお住まいの自治体・担当者に確認してください。</p>
  ${a.links?.length ? `<h2>関連ページ</h2><div class="btn-row">${a.links.map(([t, h]) => `<a class="btn secondary" href="${rel(h, up)}">${esc(t)}</a>`).join("")}</div>` : ""}
  ${related.length ? `<h2>同じテーマの読みもの</h2><ul>${related.map((b) => `<li><a href="${b.slug}.html">${esc(b.title)}</a></li>`).join("")}</ul>` : ""}
  <p class="note">この記事は一般的な解説です。制度や手続きは自治体や状況によって異なることがあります。具体的なことは、地域包括支援センター・ケアマネジャー・主治医などにご相談ください。わからない言葉は<a href="${up}yougo.html">用語集</a>で調べられます。</p>
</main>`;
  fs.writeFileSync(path.join(ROOT, "yomimono", `${a.slug}.html`), page({
    title: `${a.title}｜おやのて`,
    description: `${a.lead} ${a.summary.join("。")}。`.slice(0, 160),
    up,
    body,
    jsonLd: { "@context": "https://schema.org", "@type": "Article", headline: a.title, author: { "@type": "Organization", name: "おやのて編集部" }, publisher: { "@type": "Organization", name: "おやのて" }, datePublished: a.date, dateModified: a.date, inLanguage: "ja" }
  }));
}

// ---- 読みもの一覧
{
  const up = "../";
  const sections = CATEGORIES.map(([id, name]) => {
    const list = all.filter((a) => a.cat === id);
    if (!list.length) return "";
    return `<h2 id="${id}">${esc(name)}<span class="count">${list.length}本</span></h2>
<div class="grid">${list.map((a) => `<a class="card" href="${a.slug}.html"><h3 style="margin:0 0 6px;font-size:1.02rem">${esc(a.title)}</h3><p class="muted small" style="margin:0">${esc(a.lead)}</p></a>`).join("")}</div>`;
  }).join("\n");
  const toc = CATEGORIES.filter(([id]) => all.some((a) => a.cat === id)).map(([id, name]) => `<a href="#${id}">${esc(name)}</a>`).join("");
  fs.writeFileSync(path.join(ROOT, "yomimono", "index.html"), page({
    title: "読みもの｜介護の制度・相談先をやさしく解説｜おやのて",
    description: "地域包括支援センター、要介護1のサービスと費用、認知症、特養の申し込み、介護休業、訪問看護、病院の種類、在宅での看取りなど、介護でよくある悩みに編集部が制度や相談先を案内します。",
    up,
    body: `<main class="wrap">
  <p class="small muted"><a href="${up}index.html">トップ</a> › 読みもの</p>
  <h1>読みもの</h1>
  <p class="lead">介護でよくある悩みに、編集部が制度や相談先を案内します（全${all.length}本）。わからない言葉は<a href="${up}yougo.html">用語集</a>へ。</p>
  <nav class="toc" aria-label="テーマ">${toc}</nav>
  ${sections}
</main>`
  }));
}

// ---- 用語集
{
  const up = "";
  const GYO = [["あ", "あいうえお"], ["か", "かきくけこがぎぐげご"], ["さ", "さしすせそざじずぜぞ"], ["た", "たちつてとだぢづでど"], ["な", "なにぬねの"], ["は", "はひふへほばびぶべぼぱぴぷぺぽ"], ["ま", "まみむめも"], ["や", "やゆよ"], ["ら", "らりるれろ"], ["わ", "わをん"]];
  const gyoOf = (yomi) => (GYO.find(([, chars]) => chars.includes(yomi[0])) || ["わ"])[0];
  const sorted = [...TERMS].sort((a, b) => a[0].localeCompare(b[0], "ja"));
  const groups = GYO.map(([g]) => [g, sorted.filter((t) => gyoOf(t[0]) === g)]).filter(([, l]) => l.length);
  const body = `<main class="wrap" style="max-width:52em">
  <p class="small muted"><a href="index.html">トップ</a> › 用語集</p>
  <h1>介護・医療の用語集</h1>
  <p class="lead">ケアマネジャー、ADL、ショートステイ…。介護や医療でよく出てくる言葉を、やさしく説明します（${TERMS.length}語）。</p>
  <div class="search-bar" role="search"><input type="search" id="yq" placeholder="言葉で探す（例：ケアプラン、胃ろう）" aria-label="用語を検索" autocomplete="off"></div>
  <nav class="toc" aria-label="五十音">${groups.map(([g]) => `<a href="#g-${g}">${g}行</a>`).join("")}</nav>
  ${groups.map(([g, list]) => `<h2 id="g-${g}">${g}行</h2>
  <dl class="yougo">${list.map(([, word, desc, link]) => `<div class="term"><dt>${esc(word)}</dt><dd>${esc(desc)}${link ? ` <a href="${rel(link, up)}">くわしく →</a>` : ""}</dd></div>`).join("")}</dl>`).join("\n")}
</main>
<script>
(function () {
  var q = document.getElementById("yq");
  q.addEventListener("input", function () {
    var w = q.value.trim().toLowerCase();
    document.querySelectorAll(".yougo .term").forEach(function (t) {
      t.hidden = w && t.textContent.toLowerCase().indexOf(w) === -1;
    });
    document.querySelectorAll("main h2").forEach(function (h) {
      var dl = h.nextElementSibling;
      h.hidden = dl && !dl.querySelector(".term:not([hidden])");
    });
  });
})();
</script>`;
  fs.writeFileSync(path.join(ROOT, "yougo.html"), page({
    title: "介護・医療の用語集｜おやのて",
    description: "ケアマネジャー、ケアプラン、ADL、要介護認定、ショートステイ、訪問看護、胃ろう、ACP（人生会議）など、介護・医療でよく出てくる言葉をやさしく説明します。",
    up,
    body,
    jsonLd: { "@context": "https://schema.org", "@type": "DefinedTermSet", name: "介護・医療の用語集", hasDefinedTerm: TERMS.map(([, w, d]) => ({ "@type": "DefinedTerm", name: w, description: d })) }
  }));
}

console.log(`記事 ${ARTICLES.length} 本、一覧（全${all.length}本）、用語集 ${TERMS.length} 語を作りました`);
