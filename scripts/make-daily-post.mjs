// その日の Instagram 投稿（画像 1080×1350 と投稿文）を、読みもの・用語集の中身から自動で作る
// 使い方:
//   PWPATH=$(npm root -g)/playwright node scripts/make-daily-post.mjs --out ./out [--date 2026-10-10] [--list]
//   --list はその日から先の予定を表示するだけ（画像は作らない）
// 出力: <out>/<日付>/01.jpg… caption.txt post.json と <out>/index.json（新しい順の一覧）
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { ARTICLES } from "../content/articles.mjs";
import { TERMS } from "../content/glossary.mjs";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const SITE = "https://oyanote-care.com";
const CONF = JSON.parse(fs.readFileSync(path.join(ROOT, "sns/daily.config.json"), "utf8"));

const arg = (name, def) => {
  const i = process.argv.indexOf("--" + name);
  return i > 0 ? process.argv[i + 1] : def;
};
// 日本時間の今日
const todayJst = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
const DATE = arg("date", todayJst());
const OUT = path.resolve(arg("out", path.join(ROOT, "out")));

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const link = (u) => (u || "").replace(/^@\//, SITE + "/");

// ---- 投稿の順番（記事と用語を交互に） -------------------------------------
const PEOPLE = ["caremane", "houkatsu", "musume", "obaachan", "ojiichan"];
const articlePosts = ARTICLES.filter((a) => a.summary && a.summary.length).map((a, i) => ({
  kind: "article",
  key: "article-" + a.slug,
  title: a.title,
  a,
  person: PEOPLE[i % PEOPLE.length]
}));
const termPosts = [];
for (let i = 0; i + 3 <= TERMS.length; i += 3) {
  const terms = TERMS.slice(i, i + 3);
  termPosts.push({ kind: "terms", key: "terms-" + (i / 3 + 1), title: "介護のことば：" + terms.map((t) => t[1].replace(/（.*$/, "")).join("・"), terms });
}
const PLAN = [];
for (let i = 0; i < Math.max(articlePosts.length, termPosts.length); i++) {
  if (articlePosts[i]) PLAN.push(articlePosts[i]);
  if (termPosts[i]) PLAN.push(termPosts[i]);
}
const dayIndex = (d) => Math.round((Date.parse(d) - Date.parse(CONF.startDate)) / 86400e3);
const postFor = (d) => PLAN[((dayIndex(d) % PLAN.length) + PLAN.length) % PLAN.length];

if (process.argv.includes("--list")) {
  for (let k = 0; k < PLAN.length; k++) {
    const d = new Date(Date.parse(DATE) + k * 86400e3).toISOString().slice(0, 10);
    console.log(d, postFor(d).title);
  }
  process.exit(0);
}

// ---- スライド（360×450 を3倍で撮る） ---------------------------------------
const CSS = `
  html, body { margin: 0; background: #fff; }
  .slide { width: 360px; height: 450px; position: relative; overflow: hidden; box-sizing: border-box; display: flex; flex-direction: column;
    font-family: "IPAPGothic", "IPAGothic", "Noto Sans CJK JP", sans-serif; color: #2b3027; background: #fff; }
  .bar { height: 26px; flex: none; display: flex; align-items: center; justify-content: space-between; padding: 0 10px; background: #4f8a1f; color: #fff; font-size: 11.5px; font-weight: 700; }
  .bar .n { background: #fff; color: #4f8a1f; padding: 0 6px; }
  .cover { background: #eef6e1; padding: 26px 22px 0; }
  .tag { align-self: flex-start; background: #e8792b; color: #fff; font-weight: 700; font-size: 14px; padding: 3px 10px; }
  .cover h1 { font-size: 25px; line-height: 1.4; margin: 12px 0 8px; text-wrap: balance; }
  .cover .sub { font-size: 13.5px; line-height: 1.6; color: #4f5a48; margin: 0; max-width: 200px; }
  .cover .who { position: absolute; right: 8px; bottom: 0; height: 230px; }
  .cover .who img { height: 100%; width: auto; }
  .cover .terms { list-style: none; padding: 0; margin: 14px 0 0; }
  .cover .terms li { background: #fff; border-left: 6px solid #a8d164; margin-bottom: 8px; padding: 8px 10px; font-size: 17px; font-weight: 700; max-width: 210px; }
  .brand { position: absolute; left: 22px; bottom: 20px; font-size: 13px; font-weight: 700; color: #4f8a1f; line-height: 1.5; display: flex; align-items: center; gap: 6px; }
  .brand img { width: 28px; height: 28px; }
  .swipe { position: absolute; left: 22px; bottom: 66px; font-size: 12px; color: #fff; background: #4f8a1f; padding: 3px 9px; }
  .body { flex: 1; padding: 20px 22px; display: flex; flex-direction: column; }
  .body h2 { font-size: 19px; margin: 0 0 14px; padding: 2px 0 6px 10px; border-left: 6px solid #a8d164; border-bottom: 1px solid #dde3d2; line-height: 1.45; }
  .pt { display: flex; gap: 10px; margin-bottom: 14px; font-size: 15px; line-height: 1.65; }
  .pt b { flex: none; width: 26px; height: 26px; background: #e8792b; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 14px; }
  .yomi { font-size: 12px; color: #636b5c; margin: 0 0 2px; }
  .word { font-size: 24px; font-weight: 700; line-height: 1.4; margin: 0 0 14px; padding-bottom: 10px; border-bottom: 3px solid #a8d164; }
  .desc { font-size: 16.5px; line-height: 1.85; margin: 0; }
  .side { position: absolute; right: 14px; bottom: 0; height: 170px; }
  .go { margin-top: auto; background: #fff3e8; border: 2px solid #e8792b; padding: 10px 12px; font-size: 13px; line-height: 1.6; }
  .go b { color: #b8571a; }
  .acc { margin-top: 10px; font-size: 12px; color: #636b5c; }
`;

function slidesFor(post) {
  const icon = `<img src="assets/oyanote-icon.png" alt="">`;
  const brand = `<div class="brand">${icon}<span>おやのて<br>oyanote-care.com</span></div>`;
  const end = (label, n, total, text) => `<div class="slide"><div class="bar"><span>${label}</span><span class="n">${n}/${total}</span></div><div class="body">
    <h2>もっと知りたいときは</h2>
    <div class="desc">${text}</div>
    <div class="go">全国の介護事業所・病院の検索、相談窓口の探し方、まんがでわかる介護は<br><b>プロフィールのリンク（おやのて）</b>から見られます。</div>
    <div class="acc">おやのて oyanote-care.com ／ 編集部がやさしく解説</div></div></div>`;
  if (post.kind === "article") {
    const a = post.a, total = 3;
    return [
      `<div class="slide cover"><span class="tag">保存版　介護のきほん</span><h1>${esc(a.title.replace(/｜/, "\n").split("\n")[0])}</h1><p class="sub">${esc(a.lead.length > 70 ? a.lead.slice(0, 68) + "…" : a.lead)}</p><div class="who"><img src="assets/manga/${post.person}.png" alt=""></div><span class="swipe">スワイプ →</span>${brand}</div>`,
      `<div class="slide"><div class="bar"><span>この記事のポイント</span><span class="n">2/${total}</span></div><div class="body"><h2>${esc(a.title.split("｜")[0])}</h2>${a.summary.map((s, i) => `<div class="pt"><b>${i + 1}</b><span>${esc(s)}</span></div>`).join("")}</div></div>`,
      end("くわしくは", 3, total, `<p class="desc">この記事の全文は、おやのての<b>読みもの</b>に載せています。<br>「${esc(a.title.split("｜")[0])}」</p>`)
    ];
  }
  const total = post.terms.length + 2;
  return [
    `<div class="slide cover"><span class="tag">介護のことば　3つ</span><h1>この言葉、<br>説明できますか？</h1><ul class="terms">${post.terms.map((t) => `<li>${esc(t[1])}</li>`).join("")}</ul><div class="who" style="height:200px"><img src="assets/manga/caremane.png" alt=""></div>${brand}</div>`,
    ...post.terms.map((t, i) => `<div class="slide"><div class="bar"><span>介護のことば</span><span class="n">${i + 2}/${total}</span></div><div class="body"><p class="word">${esc(t[1])}</p><p class="desc">${esc(t[2])}</p></div><img class="side" src="assets/manga/${PEOPLE[i % PEOPLE.length]}.png" alt=""></div>`),
    end("用語集", total, total, `<p class="desc">介護・医療の言葉 ${TERMS.length} 語を、おやのての<b>用語集</b>でやさしく説明しています。</p>`)
  ];
}

function captionFor(post) {
  if (post.kind === "article") {
    const a = post.a;
    return [
      a.title, "", a.lead, "",
      "【ポイント】", ...a.summary.map((s) => "・" + s), "",
      "全文はプロフィールのリンク（おやのて）の「読みもの」から。",
      `${SITE}/yomimono/${a.slug}.html`, "",
      "あとで見返せるように保存しておくと便利です📌", "",
      CONF.hashtags.article
    ].join("\n");
  }
  return [
    "介護のことば、3つ📖", "",
    ...post.terms.flatMap((t) => ["■ " + t[1], t[2], ""]),
    `ほかにも ${TERMS.length} 語を、プロフィールのリンク（おやのて）の「用語集」でやさしく説明しています。`,
    `${SITE}/yougo.html`, "",
    CONF.hashtags.terms
  ].join("\n");
}

// ---- 作る ---------------------------------------------------------------------
const post = postFor(DATE);
const dir = path.join(OUT, DATE);
fs.mkdirSync(dir, { recursive: true });
const slides = slidesFor(post);
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PWPATH || "playwright");
const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "daily-")), "slide.html");
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 360, height: 450 }, deviceScaleFactor: 3 });
const files = [];
for (let i = 0; i < slides.length; i++) {
  fs.writeFileSync(tmp, `<!doctype html><html lang="ja"><head><meta charset="utf-8"><base href="${pathToFileURL(ROOT + "/").href}"><style>${CSS}</style></head><body>${slides[i]}</body></html>`);
  await page.goto(pathToFileURL(tmp).href, { waitUntil: "load" });
  const name = String(i + 1).padStart(2, "0") + ".jpg";
  await (await page.$(".slide")).screenshot({ path: path.join(dir, name), type: "jpeg", quality: 90 });
  files.push(name);
}
await browser.close();

const caption = captionFor(post);
fs.writeFileSync(path.join(dir, "caption.txt"), caption + "\n");
const meta = { date: DATE, postAt: CONF.postAt, kind: post.kind, key: post.key, title: post.title, images: files, caption };
fs.writeFileSync(path.join(dir, "post.json"), JSON.stringify(meta, null, 2) + "\n");

// 一覧（新しい順）。keepDays より古いフォルダは消す
const keepFrom = new Date(Date.parse(DATE) - (CONF.keepDays - 1) * 86400e3).toISOString().slice(0, 10);
const list = [];
for (const d of fs.readdirSync(OUT).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort().reverse()) {
  if (d < keepFrom) { fs.rmSync(path.join(OUT, d), { recursive: true, force: true }); continue; }
  const m = JSON.parse(fs.readFileSync(path.join(OUT, d, "post.json"), "utf8"));
  list.push({ date: m.date, postAt: m.postAt, title: m.title, images: m.images.map((f) => `${d}/${f}`), caption: `${d}/caption.txt` });
}
fs.writeFileSync(path.join(OUT, "index.json"), JSON.stringify({ updated: DATE, posts: list }, null, 2) + "\n");
console.log(`${DATE}: ${post.title}（${files.length}枚）→ ${dir}`);
