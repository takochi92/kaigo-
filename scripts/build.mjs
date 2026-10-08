#!/usr/bin/env node
// かいごナビ ビルドスクリプト（依存パッケージなし・Node.js 20 以上）
//
// 1. 厚生労働省「介護サービス情報公表システム」オープンデータのCSV（介護事業所）と
//    「医療情報ネット」オープンデータのZIP（病院・診療所・歯科診療所）を取得
// 2. 全国の事業所・医療機関データを都道府県ごとのJSONに整形
// 3. 都道府県・市区町村ごとの静的ページ（検索エンジン向け）と sitemap.xml を生成
// 4. サイト一式を dist/ に出力
//
// 使い方:
//   node scripts/build.mjs                      … 厚労省サイトからCSVを取得してビルド
//   node scripts/build.mjs --csv-dir ./csv      … 手元の介護事業所CSVフォルダからビルド
//   node scripts/build.mjs --med-dir ./med      … 手元の医療情報ネットのZIP/CSVフォルダを使う
//   （どちらか一方だけ指定した場合、もう一方は取り込みません）
//   SITE_URL=https://example.com node scripts/build.mjs   … sitemap 等に使う公開URL

import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist");
const OPEN_DATA_PAGE = "https://www.mhlw.go.jp/stf/kaigo-kouhyou_opendata.html";
const MED_DATA_PAGE = "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/kenkou_iryou/iryou/newpage_43373.html";
const SITE_URL = (process.env.SITE_URL || "https://takochi92.github.io/kaigo-").replace(/\/$/, "");

const args = process.argv.slice(2);
const argValue = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? null : args[i + 1];
};
const CSV_DIR = argValue("--csv-dir");
const MED_DIR = argValue("--med-dir");
const LOCAL = Boolean(CSV_DIR || MED_DIR);
let MED_AS_OF = "";

const PREFS = [
  "北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県", "茨城県", "栃木県", "群馬県",
  "埼玉県", "千葉県", "東京都", "神奈川県", "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県",
  "岐阜県", "静岡県", "愛知県", "三重県", "滋賀県", "京都府", "大阪府", "兵庫県", "奈良県", "和歌山県",
  "鳥取県", "島根県", "岡山県", "広島県", "山口県", "徳島県", "香川県", "愛媛県", "高知県", "福岡県",
  "佐賀県", "長崎県", "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県"
];
const prefCode = (i) => String(i + 1).padStart(2, "0");

// サービス名 → 表示用カテゴリ（上から順に判定）
const CATEGORIES = [
  ["kyotaku", "ケアプラン作成（居宅介護支援）", /居宅介護支援|介護予防支援/],
  ["houkan", "訪問看護", /訪問看護/],
  ["houmon", "訪問介護・訪問入浴・訪問リハ", /訪問介護|訪問入浴|訪問リハ|夜間対応型|定期巡回/],
  ["shokibo", "小規模多機能", /小規模多機能/],
  ["gh", "グループホーム", /認知症対応型共同生活|共同生活介護/],
  ["tsusho", "デイサービス・デイケア", /通所|認知症対応型通所/],
  ["short", "ショートステイ", /短期入所/],
  ["tokuyo", "特別養護老人ホーム", /介護老人福祉施設|特別養護/],
  ["rouken", "介護老人保健施設", /介護老人保健施設/],
  ["iryoin", "介護医療院", /介護医療院|介護療養/],
  ["tokutei", "有料老人ホーム・ケアハウス等（特定施設）", /特定施設|有料老人|軽費|ケアハウス|サービス付き/],
  ["yogu", "福祉用具", /福祉用具/],
  ["byoin", "病院", /^病院$/],
  ["clinic", "診療所（クリニック）", /^診療所$/],
  ["shika", "歯科", /^歯科診療所$/],
  ["other", "その他", /.*/]
];
const categoryOf = (service) => CATEGORIES.findIndex(([, , re]) => re.test(service));

// ---------------------------------------------------------------- CSV

function decode(buf) {
  if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) return buf.subarray(3).toString("utf8");
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buf);
  } catch {
    return new TextDecoder("shift_jis").decode(buf);
  }
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows;
}

// 列名の表記ゆれに対応して列番号を探す
function columnIndex(header, candidates) {
  const norm = header.map((h) => h.replace(/\s|　/g, ""));
  for (const c of candidates) {
    const i = norm.indexOf(c);
    if (i !== -1) return i;
  }
  for (const c of candidates) {
    const i = norm.findIndex((h) => h.includes(c));
    if (i !== -1) return i;
  }
  return -1;
}

const COLUMNS = {
  code: ["都道府県コード又は市区町村コード", "市区町村コード", "都道府県コード"],
  pref: ["都道府県名"],
  city: ["市区町村名"],
  name: ["事業所名", "介護サービス事業所名称", "事業所名称"],
  service: ["サービスの種類", "実施サービス"],
  address: ["住所"],
  building: ["方書（ビル名等）", "方書"],
  lat: ["緯度"],
  lng: ["経度"],
  tel: ["電話番号"],
  fax: ["FAX番号"],
  corp: ["法人の名称", "法人名"],
  number: ["事業所番号"],
  capacity: ["定員"],
  url: ["URL", "ホームページ"]
};

function normalizeRows(rows, fallbackService) {
  const header = rows[0];
  const idx = {};
  for (const [key, cands] of Object.entries(COLUMNS)) idx[key] = columnIndex(header, cands);
  if (idx.name === -1 || idx.address === -1) {
    throw new Error("必要な列（事業所名・住所）が見つかりません: " + header.join(","));
  }
  const get = (r, k) => (idx[k] === -1 ? "" : (r[idx[k]] || "").trim());
  const out = [];
  for (const r of rows.slice(1)) {
    const name = get(r, "name");
    if (!name) continue;
    const code = get(r, "code").replace(/\D/g, "");
    let pi = code.length >= 2 ? Number(code.slice(0, 2)) - 1 : -1;
    if (!(pi >= 0 && pi < 47)) pi = PREFS.indexOf(get(r, "pref"));
    if (pi === -1) {
      const addr = get(r, "address");
      pi = PREFS.findIndex((p) => addr.startsWith(p));
    }
    if (pi === -1) continue;
    const cityCode = code.length >= 5 ? code.slice(0, 5) : "";
    let city = get(r, "city");
    if (!city) {
      const m = get(r, "address").replace(PREFS[pi], "").match(/^(.+?[市区町村])/);
      city = m ? m[1] : "（市区町村不明）";
    }
    const lat = Number(get(r, "lat"));
    const lng = Number(get(r, "lng"));
    let url = get(r, "url");
    if (url && !/^https?:\/\//i.test(url)) url = /^www\./i.test(url) ? "https://" + url : "";
    out.push({
      pref: pi,
      cityCode,
      city,
      name,
      service: get(r, "service") || fallbackService || "",
      address: [get(r, "address"), get(r, "building")].filter(Boolean).join(" "),
      tel: get(r, "tel"),
      fax: get(r, "fax"),
      corp: get(r, "corp"),
      number: get(r, "number"),
      capacity: get(r, "capacity"),
      url,
      depts: "",
      lat: Number.isFinite(lat) && lat > 20 && lat < 46 ? Math.round(lat * 1e5) / 1e5 : null,
      lng: Number.isFinite(lng) && lng > 122 && lng < 154 ? Math.round(lng * 1e5) / 1e5 : null
    });
  }
  return out;
}

// ---------------------------------------------------------------- 取得

async function fetchWithRetry(url, tries = 4) {
  for (let i = 0; ; i++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": "kaigo-navi-builder" }, signal: AbortSignal.timeout(180000) });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
      return Buffer.from(await res.arrayBuffer());
    } catch (err) {
      if (i >= tries - 1) throw err;
      await new Promise((r) => setTimeout(r, 2000 * 2 ** i));
    }
  }
}

// ページ内のリンクを集める。「〇年〇月〇日時点」の見出しが複数ある場合は最新（先頭）の区切りだけを使う
function collectLinks(html, pageUrl, extRe) {
  const parts = html.split(/(?:令和\d+|20\d\d)年\d{1,2}月\d{1,2}日時点/);
  const pick = (h) => [...new Set([...h.matchAll(/href="([^"]+)"/gi)].map((m) => m[1]).filter((u) => extRe.test(u)).map((u) => new URL(u, pageUrl).href))];
  if (parts.length > 2) {
    const latest = pick(parts[1]);
    if (latest.length) return latest;
  }
  return pick(html);
}

// ZIPの展開（依存なし。central directory を読んで deflate を展開）
function unzip(buf) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd === -1) throw new Error("ZIPの形式ではありません");
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const files = [];
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) break;
    const method = buf.readUInt16LE(p + 10);
    const flags = buf.readUInt16LE(p + 8);
    const size = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const rawName = buf.subarray(p + 46, p + 46 + nameLen);
    const name = flags & 0x800 ? rawName.toString("utf8") : decode(rawName);
    p += 46 + nameLen + extraLen + commentLen;
    const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const data = buf.subarray(start, start + size);
    if (name.endsWith("/")) continue;
    if (method === 0) files.push({ name, buf: data });
    else if (method === 8) files.push({ name, buf: zlib.inflateRawSync(data) });
  }
  return files;
}

async function loadMedicalSources() {
  let raw = [];
  if (MED_DIR) {
    for (const f of fs.readdirSync(MED_DIR).sort()) {
      if (/\.(zip|csv)$/i.test(f)) raw.push({ label: f, buf: fs.readFileSync(path.join(MED_DIR, f)) });
    }
  } else if (!LOCAL) {
    console.log("医療情報ネットのページを取得:", MED_DATA_PAGE);
    const html = decode(await fetchWithRetry(MED_DATA_PAGE));
    let links = collectLinks(html, MED_DATA_PAGE, /\.(zip|csv)(\?|$)/i);
    if (!links.length) throw new Error("医療情報ネットのデータへのリンクが見つかりませんでした。");
    // ファイル名の日付（例 _20260601）が最新のものだけを使う
    const dateOf = (u) => (path.basename(u).match(/(20\d{6})/) || [])[1] || "";
    const latest = links.map(dateOf).sort().pop();
    if (latest) {
      links = links.filter((u) => dateOf(u) === latest);
      MED_AS_OF = `${latest.slice(0, 4)}-${latest.slice(4, 6)}-${latest.slice(6, 8)}`;
    }
    console.log(`医療データ ${links.length} ファイルを取得します`);
    for (const url of links) {
      const buf = await fetchWithRetry(url);
      raw.push({ label: url, buf });
      console.log(`  取得 ${path.basename(url)} (${Math.round(buf.length / 1024)}KB)`);
    }
  }
  const files = [];
  for (const r of raw) {
    if (/\.zip(\?|$)/i.test(r.label)) {
      for (const f of unzip(r.buf)) if (/\.csv$/i.test(f.name)) files.push({ label: path.basename(r.label) + "/" + f.name, buf: f.buf });
    } else files.push(r);
  }
  return files;
}

// 医療機関の種類をファイル名から判定（病院・診療所・歯科診療所。助産所・薬局は取り込まない）
function medicalKind(label, header) {
  const s = label.toLowerCase();
  if (/助産|josan|midwife|薬局|pharmacy/.test(s)) return null;
  if (/歯科|dental|dent/.test(s)) return "歯科診療所";
  if (/病院|hospital|hosp/.test(s)) return "病院";
  if (/診療所|clinic/.test(s)) return "診療所";
  const h = header.join(",");
  if (/病床/.test(h) && /病院/.test(h)) return "病院";
  return null;
}

function loadMedical(files) {
  const MED_COLUMNS = {
    id: ["ID", "医療機関コード", "施設ID", "医療機関ID"],
    name: ["正式名称", "名称", "医療機関名称", "医療機関名"],
    prefCode: ["都道府県コード"],
    cityCode: ["市区町村コード"],
    city: ["市区町村名"],
    address: ["所在地", "住所"],
    lat: ["所在地座標（緯度）", "緯度"],
    lng: ["所在地座標（経度）", "経度"],
    tel: ["電話番号", "案内用電話番号", "代表電話番号"],
    url: ["案内用ホームページアドレス", "ホームページアドレス", "ホームページ", "URL"],
    dept: ["診療科目名", "診療科名", "診療科目"]
  };
  const facilities = new Map();
  const depts = new Map();
  for (const { label, buf } of files) {
    const rows = parseCsv(decode(buf));
    if (rows.length < 2) continue;
    const header = rows[0];
    const kind = medicalKind(label, header);
    if (!kind) { console.log(`  ${label}: 対象外のためスキップ`); continue; }
    const idx = {};
    for (const [k, c] of Object.entries(MED_COLUMNS)) idx[k] = columnIndex(header, c);
    const get = (r, k) => (idx[k] === -1 ? "" : (r[idx[k]] || "").trim());
    const isDeptTable = idx.dept !== -1 && idx.address === -1;
    if (isDeptTable) {
      if (idx.id === -1) continue;
      for (const r of rows.slice(1)) {
        const id = get(r, "id"), d = get(r, "dept");
        if (!id || !d) continue;
        const key = kind + "|" + id;
        if (!depts.has(key)) depts.set(key, new Set());
        depts.get(key).add(d);
      }
      console.log(`  ${label}: 診療科 ${rows.length - 1} 行`);
      continue;
    }
    if (idx.name === -1 || idx.address === -1) {
      console.warn(`  ${label}: スキップ（名称・所在地の列が見つかりません）`);
      continue;
    }
    let n = 0;
    for (const r of rows.slice(1)) {
      const name = get(r, "name");
      if (!name) continue;
      const address = get(r, "address");
      let pc = get(r, "prefCode").replace(/\D/g, "");
      let cc = get(r, "cityCode").replace(/\D/g, "");
      if (cc.length === 6) cc = cc.slice(0, 5);
      if (cc.length === 3 && pc) cc = pc.padStart(2, "0") + cc;
      let pi = cc.length === 5 ? Number(cc.slice(0, 2)) - 1 : pc ? Number(pc) - 1 : -1;
      if (!(pi >= 0 && pi < 47)) pi = PREFS.findIndex((p) => address.startsWith(p));
      if (pi === -1) continue;
      let city = get(r, "city");
      if (!city) {
        const m = address.replace(PREFS[pi], "").match(/^(.+?郡.+?[町村]|.+?市.+?区|.+?[市区町村])/);
        city = m ? m[1] : "（市区町村不明）";
      }
      const lat = Number(get(r, "lat")), lng = Number(get(r, "lng"));
      let url = get(r, "url");
      if (url && !/^https?:\/\//i.test(url)) url = /^www\./i.test(url) ? "https://" + url : "";
      const id = get(r, "id") || name + address;
      facilities.set(kind + "|" + id, {
        pref: pi, cityCode: cc.length === 5 ? cc : "", city, name, service: kind,
        address, tel: get(r, "tel"), fax: "", corp: "", number: "", capacity: "", url, depts: "",
        lat: Number.isFinite(lat) && lat > 20 && lat < 46 ? Math.round(lat * 1e5) / 1e5 : null,
        lng: Number.isFinite(lng) && lng > 122 && lng < 154 ? Math.round(lng * 1e5) / 1e5 : null
      });
      n++;
    }
    console.log(`  ${label}: ${kind} ${n} 件`);
  }
  for (const [key, f] of facilities) {
    if (depts.has(key)) f.depts = [...depts.get(key)].join("、");
  }
  return [...facilities.values()];
}

async function loadSources() {
  if (LOCAL && !CSV_DIR) return [];
  if (CSV_DIR) {
    const files = fs.readdirSync(CSV_DIR).filter((f) => /\.csv$/i.test(f)).sort();
    return files.map((f) => ({ label: f, buf: fs.readFileSync(path.join(CSV_DIR, f)) }));
  }
  console.log("オープンデータのページを取得:", OPEN_DATA_PAGE);
  const html = decode(await fetchWithRetry(OPEN_DATA_PAGE));
  const links = collectLinks(html, OPEN_DATA_PAGE, /\.csv(\?|$)/i);
  if (!links.length) throw new Error("CSVへのリンクが見つかりませんでした。ページ構成が変わった可能性があります。");
  console.log(`CSV ${links.length} 件を取得します`);
  const sources = [];
  for (const url of links) {
    const buf = await fetchWithRetry(url);
    sources.push({ label: url, buf });
    console.log(`  取得 ${path.basename(url)} (${Math.round(buf.length / 1024)}KB)`);
  }
  return sources;
}

// ---------------------------------------------------------------- HTML

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const telHref = (t) => "tel:" + t.replace(/[^0-9+]/g, "");

function page({ title, description, canonical, depth, body, jsonLd }) {
  const up = "../".repeat(depth);
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(canonical)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${esc(canonical)}">
<link rel="stylesheet" href="${up}assets/style.css">
${jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, "\\u003c")}</script>` : ""}
</head>
<body>
<header id="site-header"></header>
<main class="wrap">
${body}
</main>
<footer id="site-footer"></footer>
<script src="${up}assets/main.js"></script>
</body>
</html>
`;
}

function officeCard(o) {
  const rows = [];
  rows.push(`<dt>住所</dt><dd>${esc(o.address)}</dd>`);
  if (o.tel) rows.push(`<dt>電話</dt><dd>${esc(o.tel)}</dd>`);
  if (o.fax) rows.push(`<dt>FAX</dt><dd>${esc(o.fax)}</dd>`);
  if (o.corp) rows.push(`<dt>法人</dt><dd>${esc(o.corp)}</dd>`);
  if (o.capacity) rows.push(`<dt>定員</dt><dd>${esc(o.capacity)}</dd>`);
  if (o.depts) rows.push(`<dt>診療科</dt><dd>${esc(o.depts)}</dd>`);
  if (o.number) rows.push(`<dt>事業所番号</dt><dd>${esc(o.number)}</dd>`);
  const buttons = [];
  if (o.tel) buttons.push(`<a class="btn tel" href="${esc(telHref(o.tel))}">電話する</a>`);
  const q = o.lat && o.lng ? `${o.lat},${o.lng}` : o.address;
  buttons.push(`<a class="btn secondary" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&amp;query=${encodeURIComponent(q)}">地図</a>`);
  if (o.url) buttons.push(`<a class="btn secondary" target="_blank" rel="noopener nofollow" href="${esc(o.url)}">ホームページ</a>`);
  return `<article class="card facility">
<div>${o.services.map((s) => `<span class="type">${esc(s)}</span>`).join(" ")}</div>
<h3>${esc(o.name)}</h3>
<dl>${rows.join("")}</dl>
<div class="btn-row">${buttons.join("")}</div>
</article>`;
}

// 同じ事業所番号・同じ所在地のサービスを1件にまとめる
function groupOffices(records) {
  const map = new Map();
  for (const r of records) {
    const key = (r.number || r.name) + "|" + r.address;
    let o = map.get(key);
    if (!o) {
      o = { ...r, services: [], cats: new Set() };
      map.set(key, o);
    }
    if (r.service && !o.services.includes(r.service)) o.services.push(r.service);
    o.cats.add(categoryOf(r.service));
    if (!o.tel && r.tel) o.tel = r.tel;
    if (!o.url && r.url) o.url = r.url;
  }
  return [...map.values()];
}

// ---------------------------------------------------------------- ビルド

function copyStatic() {
  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });
  // claude/ は自分用の作業ログなのでサイトには載せない
  const skip = new Set(["dist", "scripts", "node_modules", ".git", ".github", "README.md", "claude", "claude-data", "package.json", "package-lock.json", ".gitignore"]);
  for (const entry of fs.readdirSync(ROOT)) {
    if (skip.has(entry) || entry.startsWith(".")) continue;
    fs.cpSync(path.join(ROOT, entry), path.join(DIST, entry), { recursive: true });
  }
}

function write(rel, content) {
  const file = path.join(DIST, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

async function main() {
  copyStatic();

  const sources = await loadSources();
  let records = [];
  // ページには過去の時点のファイルも並ぶため、サービスの種類ごとに最初（最新）のファイルだけを使う
  const seenServices = new Set();
  for (const { label, buf } of sources) {
    const rows = parseCsv(decode(buf));
    if (rows.length < 2) continue;
    try {
      const rs = normalizeRows(rows, "");
      const kinds = [...new Set(rs.map((r) => r.service))];
      if (kinds.length && kinds.every((k) => seenServices.has(k))) {
        console.log(`  ${path.basename(label)}: 古い時点のファイルのためスキップ`);
        continue;
      }
      kinds.forEach((k) => seenServices.add(k));
      records = records.concat(rs);
      console.log(`  ${path.basename(label)}: ${rs.length} 件`);
    } catch (err) {
      console.warn(`  ${path.basename(label)}: スキップ（${err.message.slice(0, 120)}）`);
    }
  }
  const kaigoCount = records.length;
  const medical = loadMedical(await loadMedicalSources());
  records = records.concat(medical);
  console.log(`介護事業所 ${kaigoCount} 行 / 医療機関 ${medical.length} 件`);
  if (!LOCAL && (!kaigoCount || !medical.length)) throw new Error("介護または医療のデータが1件も取り込めませんでした。");
  if (!records.length) throw new Error("データが1件も取り込めませんでした。");

  // 重複行（同じ事業所番号・サービス）を除く
  const seen = new Set();
  records = records.filter((r) => {
    const k = r.number + "|" + r.service + "|" + r.name + "|" + r.address;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  const builtAt = new Date().toISOString().slice(0, 10);
  const urls = [];
  const areas = [];
  const categoryLabels = CATEGORIES.map(([id, label]) => ({ id, label }));

  for (let pi = 0; pi < 47; pi++) {
    const pc = prefCode(pi);
    const prefRecords = records.filter((r) => r.pref === pi);
    const offices = groupOffices(prefRecords);

    // 市区町村ごと
    const cityMap = new Map();
    for (const o of offices) {
      const key = o.cityCode || o.city;
      if (!cityMap.has(key)) cityMap.set(key, { code: o.cityCode, name: o.city, offices: [] });
      cityMap.get(key).offices.push(o);
    }
    const cities = [...cityMap.values()].sort((a, b) => (a.code || "99999").localeCompare(b.code || "99999") || a.name.localeCompare(b.name, "ja"));
    cities.forEach((c, i) => { c.slug = c.code || `${pc}x${String(i).padStart(3, "0")}`; });

    // 検索ページ用JSON（列を配列で持ってサイズを抑える）
    const services = [];
    const serviceIndex = (s) => {
      let i = services.indexOf(s);
      if (i === -1) { i = services.length; services.push(s); }
      return i;
    };
    const cityIndex = new Map(cities.map((c, i) => [c, i]));
    const rows = [];
    for (const c of cities) {
      for (const o of c.offices) {
        rows.push([
          o.name, cityIndex.get(c), o.address, o.tel, o.fax, o.corp, o.number, o.capacity, o.url,
          o.lat, o.lng, o.services.map(serviceIndex), [...o.cats], o.depts
        ]);
      }
    }
    write(`data/pref/${pc}.json`, JSON.stringify({
      pref: PREFS[pi],
      builtAt,
      fields: ["name", "city", "address", "tel", "fax", "corp", "number", "capacity", "url", "lat", "lng", "services", "cats", "depts"],
      cities: cities.map((c) => ({ code: c.code, name: c.name, slug: c.slug })),
      services,
      rows
    }));

    areas.push({ code: pc, name: PREFS[pi], count: offices.length, cities: cities.map((c) => ({ slug: c.slug, name: c.name, count: c.offices.length })) });

    // 市区町村ページ
    for (const c of cities) {
      const byCat = CATEGORIES.map(() => []);
      for (const o of c.offices) {
        const main = Math.min(...o.cats);
        byCat[main].push(o);
      }
      // 種類ごとに折りたたみ（開いたときだけ一覧が出る。中身はHTMLに含めるので検索エンジンにも読まれる）
      const sections = byCat.map((list, ci) => list.length ? `
<details class="section" id="${CATEGORIES[ci][0]}">
<summary><h2>${esc(CATEGORIES[ci][1])}<span class="count">${list.length}件</span></h2></summary>
<div class="grid">${list.sort((a, b) => a.name.localeCompare(b.name, "ja")).map(officeCard).join("\n")}</div>
</details>` : "").join("");
      const rel = `area/${pc}/${c.slug}.html`;
      const canonical = `${SITE_URL}/${rel}`;
      write(rel, page({
        title: `${PREFS[pi]}${c.name}の介護事業所・病院一覧（${c.offices.length}件）｜かいごナビ`,
        description: `${PREFS[pi]}${c.name}の介護事業所・病院・診療所${c.offices.length}件の住所・電話番号。ケアマネ事業所、訪問介護、訪問看護、デイサービス、特養、グループホーム、病院、クリニックなど。`,
        canonical,
        depth: 2,
        jsonLd: {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "かいごナビ", item: `${SITE_URL}/` },
            { "@type": "ListItem", position: 2, name: PREFS[pi], item: `${SITE_URL}/area/${pc}/` },
            { "@type": "ListItem", position: 3, name: c.name, item: canonical }
          ]
        },
        body: `<p class="small muted"><a href="../../index.html">トップ</a> › <a href="index.html">${esc(PREFS[pi])}</a> › ${esc(c.name)}</p>
<h1>${esc(PREFS[pi])}${esc(c.name)}の介護事業所・病院</h1>
<p class="lead">${c.offices.length}件の介護事業所・施設・医療機関を掲載しています。電話番号をタップするとそのまま電話できます。</p>
<div class="tip">はじめて介護サービスを使う方は、まず${esc(c.name)}の<strong>地域包括支援センター</strong>か介護保険の窓口に相談しましょう（<a href="../../shisetsu.html">相談窓口の探し方</a>）。要介護の認定を受けた方は、下の「ケアプラン作成（居宅介護支援）」の事業所でケアマネジャーを探せます。</div>
<p class="btn-row" style="justify-content:space-between;align-items:center"><span class="small muted">種類を押すと一覧が開きます。</span><a class="btn secondary" href="../../search.html?pref=${pc}&amp;city=${encodeURIComponent(c.slug)}">名前・診療科で探す</a></p>
${sections}
<p class="note">出典：厚生労働省「介護サービス情報公表システム」オープンデータ、厚生労働省「医療情報ネット」オープンデータ（${builtAt} 取得・加工）。内容は公表時点のもので、休止・廃止・移転・診療時間の変更などで変わっている場合があります。利用前に直接ご確認いただくか、<a href="https://www.kaigokensaku.mhlw.go.jp/" target="_blank" rel="noopener">介護サービス情報公表システム</a>・<a href="https://www.iryou.teikyouseido.mhlw.go.jp/" target="_blank" rel="noopener">医療情報ネット（ナビイ）</a>で最新情報をご確認ください。</p>`
      }));
      urls.push(canonical);
    }

    // 都道府県ページ
    const rel = `area/${pc}/index.html`;
    const canonical = `${SITE_URL}/area/${pc}/`;
    write(rel, page({
      title: `${PREFS[pi]}の介護事業所・病院一覧（市区町村別）｜かいごナビ`,
      description: `${PREFS[pi]}の介護事業所・病院・診療所${offices.length}件を市区町村別に掲載。住所・電話番号を確認できます。`,
      canonical,
      depth: 2,
      body: `<p class="small muted"><a href="../../index.html">トップ</a> › ${esc(PREFS[pi])}</p>
<h1>${esc(PREFS[pi])}の介護事業所・病院</h1>
<p class="lead">市区町村を選んでください（全${offices.length}件）。</p>
<div class="chips">${cities.map((c) => `<a class="chip" href="${esc(c.slug)}.html">${esc(c.name)}（${c.offices.length}）</a>`).join("")}</div>
<p><a class="btn secondary" href="../../search.html?pref=${pc}">${esc(PREFS[pi])}の事業所を名前で検索</a></p>`
    }));
    urls.push(canonical);
  }

  // 全国の都道府県一覧
  write("area/index.html", page({
    title: "全国の介護事業所・病院一覧（都道府県別）｜かいごナビ",
    description: "全国の介護事業所・病院・診療所を都道府県・市区町村別に掲載。",
    canonical: `${SITE_URL}/area/`,
    depth: 1,
    body: `<h1>全国の介護事業所・病院（都道府県別）</h1>
<div class="chips">${areas.map((a) => `<a class="chip" href="${a.code}/">${esc(a.name)}（${a.count}）</a>`).join("")}</div>`
  }));
  urls.push(`${SITE_URL}/area/`);

  write("data/areas.json", JSON.stringify({ builtAt, medAsOf: MED_AS_OF, categories: categoryLabels, prefs: areas.map((a) => ({ code: a.code, name: a.name, count: a.count })) }));

  // sitemap / robots
  for (const p of ["", "index.html", "search.html", "manga.html", "seido.html", "shisetsu-shurui.html", "shisetsu.html", "jigyo.html", "faq.html"]) {
    if (p !== "index.html") urls.unshift(`${SITE_URL}/${p}`);
  }
  const chunks = [];
  for (let i = 0; i < urls.length; i += 45000) chunks.push(urls.slice(i, i + 45000));
  chunks.forEach((list, i) => {
    write(`sitemap-${i + 1}.xml`, `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${list.map((u) => `<url><loc>${esc(u)}</loc><lastmod>${builtAt}</lastmod></url>`).join("\n")}\n</urlset>\n`);
  });
  write("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${chunks.map((_, i) => `<sitemap><loc>${SITE_URL}/sitemap-${i + 1}.xml</loc><lastmod>${builtAt}</lastmod></sitemap>`).join("\n")}\n</sitemapindex>\n`);
  write("robots.txt", `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`);
  write(".nojekyll", "");

  const total = areas.reduce((n, a) => n + a.count, 0);
  console.log(`完了: 事業所 ${total} 件 / ページ ${urls.length} 件 → ${path.relative(ROOT, DIST)}/`);
}

main().catch((err) => {
  console.error("ビルド失敗:", err.message);
  process.exit(1);
});
