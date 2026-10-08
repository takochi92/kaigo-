#!/usr/bin/env node
// Claude の作業ログ生成スクリプト（依存パッケージなし・Node.js 20 以上）
//
// git の履歴から Claude が作ったコミット（作者が Claude、または Co-Authored-By: Claude を含む）を集め、
// 日付（日本時間）ごとに「何をしたか」「どのファイルを作った・変えたか」をまとめます。
//
// 使い方:
//   node scripts/claude-log.mjs                    … claude-data/log.json と feed.xml を出力
//   node scripts/claude-log.mjs --out dist/claude  … 出力先を指定
//   node scripts/claude-log.mjs --report 2026-10-08 … その日の日報（Markdown）を標準出力に出す。作業がなければ何も出さない
//                                         （日付の代わりに today / yesterday も使えます）
//
// すべてのブランチ（Claude のセッションごとのブランチを含む）を対象にするため、
// GitHub Actions では actions/checkout の fetch-depth: 0 で履歴を全部取得してから実行します。

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPO = process.env.GITHUB_REPOSITORY || "takochi92/kaigo-";
const SITE_URL = (process.env.SITE_URL || "https://takochi92.github.io/kaigo-").replace(/\/$/, "");

const args = process.argv.slice(2);
const argValue = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? null : args[i + 1];
};
const OUT = path.resolve(ROOT, argValue("--out") || "claude-data");
const REPORT = argValue("--report");

// 日本時間の日付・時刻
const JST = 9 * 60 * 60 * 1000;
const jstDate = (sec) => new Date(sec * 1000 + JST).toISOString().slice(0, 10);
const jstTime = (sec) => new Date(sec * 1000 + JST).toISOString().slice(11, 16);
const todayJst = () => new Date(Date.now() + JST).toISOString().slice(0, 10);

// ---------------------------------------------------------------- git から読み込み

const SEP = "\x1e";
const FIELD = "\x1f";

function readCommits() {
  const out = execFileSync("git", [
    "log", "--all", "--source", "--no-merges", "--numstat", "--summary",
    `--format=${SEP}%H${FIELD}%at${FIELD}%an${FIELD}%S${FIELD}%s${FIELD}%b${FIELD}`
  ], { cwd: ROOT, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });

  const commits = [];
  for (const chunk of out.split(SEP).slice(1)) {
    const [hash, at, author, source, subject, body, rest = ""] = chunk.split(FIELD);
    const isClaude = author === "Claude" || /Co-Authored-By:\s*Claude/i.test(body);
    if (!isClaude) continue;

    const files = new Map();
    for (const line of rest.split("\n")) {
      const num = line.match(/^(\d+|-)\t(\d+|-)\t(.+)$/);
      if (num) {
        const p = renamedPath(num[3]);
        files.set(p, { path: p, status: "M", add: Number(num[1]) || 0, del: Number(num[2]) || 0 });
        continue;
      }
      const mode = line.match(/^ (create|delete) mode \d+ (.+)$/);
      if (mode && files.has(mode[2])) files.get(mode[2]).status = mode[1] === "create" ? "A" : "D";
      const ren = line.match(/^ rename (.+) \(\d+%\)$/);
      if (ren && files.has(renamedPath(ren[1]))) files.get(renamedPath(ren[1])).status = "R";
    }

    commits.push({
      hash: hash.slice(0, 7),
      sha: hash,
      at: Number(at),
      date: jstDate(Number(at)),
      time: jstTime(Number(at)),
      branch: source.replace(/^refs\/(remotes\/origin|heads)\//, ""),
      title: subject,
      // Co-Authored-By などの署名行は載せない
      body: body.split("\n").filter((l) => l.trim() && !/^(Co-Authored-By|Claude-Session|Signed-off-by):/i.test(l)).join("\n"),
      files: [...files.values()]
    });
  }
  return commits.sort((a, b) => b.at - a.at);
}

// "dir/{old => new}/file" や "old => new" を新しいパスに
function renamedPath(p) {
  return p.replace(/\{[^{}]*? => ([^{}]*?)\}/, "$1").replace(/^.* => /, "").replace(/\/\//g, "/");
}

// ---------------------------------------------------------------- 分類

const KINDS = [
  ["ops", "自動化・設定", (c) => /ワークフロー|Actions|デプロイ/.test(c.title) || c.files.every((f) => /^\.github\//.test(f.path))],
  ["docs", "ドキュメント", (c) => c.files.length > 0 && c.files.every((f) => /\.md$/i.test(f.path))],
  ["page", "ページ・機能", (c) => c.files.some((f) => f.status === "A" && /\.html?$/.test(f.path))],
  ["design", "デザイン", (c) => /デザイン|配色|ダークモード|スタイル|レイアウト/.test(c.title) || c.files.every((f) => /\.css$/.test(f.path))],
  ["data", "データ", (c) => /データ|CSV|取り込/.test(c.title) || c.files.every((f) => /^data\/|\.(json|csv)$/.test(f.path))],
  ["page", "ページ・機能", () => true]
];
const kindOf = (c) => KINDS.find(([, , test]) => test(c))[0];
const KIND_LABEL = Object.fromEntries(KINDS.map(([k, label]) => [k, label]).reverse());

function fileType(p) {
  if (/\.html?$/.test(p)) return "page";
  if (/\.(css)$/.test(p)) return "style";
  if (/\.(m?js)$/.test(p)) return /^scripts\//.test(p) ? "script" : "code";
  if (/(^|\/)package(-lock)?\.json$/.test(p)) return "config";
  if (/\.(json|csv|xml)$/.test(p) || /^data\//.test(p)) return "data";
  if (/\.(md|txt)$/i.test(p)) return "doc";
  if (/\.(ya?ml)$/.test(p)) return "config";
  if (/\.(svg|png|jpe?g|webp|gif)$/.test(p)) return "image";
  return "other";
}

// ---------------------------------------------------------------- 集計

function build(commits) {
  const dayMap = new Map();
  for (const c of commits) {
    c.kind = kindOf(c);
    if (!dayMap.has(c.date)) dayMap.set(c.date, []);
    dayMap.get(c.date).push(c);
  }

  const days = [...dayMap.entries()].map(([date, list]) => {
    const created = new Map();
    const changed = new Map();
    let add = 0;
    let del = 0;
    // 古いコミットから順に見て、その日に作ったファイル・変えたファイルを決める
    for (const c of [...list].reverse()) {
      for (const f of c.files) {
        add += f.add;
        del += f.del;
        if (f.status === "A" || f.status === "R") created.set(f.path, fileType(f.path));
        else if (f.status === "D") { created.delete(f.path); changed.delete(f.path); }
        else if (!created.has(f.path)) changed.set(f.path, fileType(f.path));
      }
    }
    const kinds = {};
    for (const c of list) kinds[c.kind] = (kinds[c.kind] || 0) + 1;
    return {
      date,
      commits: list.map(({ sha, at, ...rest }) => rest),
      created: [...created].map(([p, type]) => ({ path: p, type })),
      changed: [...changed].map(([p, type]) => ({ path: p, type })),
      add,
      del,
      kinds
    };
  });

  // 連続して作業した日数（今日か昨日から数える）
  const dates = new Set(days.map((d) => d.date));
  let streak = 0;
  const cursor = new Date(todayJst() + "T00:00:00Z");
  if (!dates.has(cursor.toISOString().slice(0, 10))) cursor.setUTCDate(cursor.getUTCDate() - 1);
  while (dates.has(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  const allCreated = new Set(days.flatMap((d) => d.created.map((f) => f.path)));
  const allTouched = new Set(commits.flatMap((c) => c.files.map((f) => f.path)));
  const kindTotals = {};
  for (const c of commits) kindTotals[c.kind] = (kindTotals[c.kind] || 0) + 1;

  return {
    generatedAt: new Date().toISOString(),
    repo: REPO,
    kinds: KIND_LABEL,
    totals: {
      commits: commits.length,
      days: days.length,
      created: allCreated.size,
      touched: allTouched.size,
      add: days.reduce((s, d) => s + d.add, 0),
      del: days.reduce((s, d) => s + d.del, 0),
      branches: new Set(commits.map((c) => c.branch)).size,
      streak,
      kinds: kindTotals
    },
    days
  };
}

// ---------------------------------------------------------------- 出力

const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));

function feed(log) {
  const entries = log.days.slice(0, 30).map((d) => {
    const html = "<ul>" + d.commits.map((c) => `<li>${esc(c.time)} ${esc(c.title)}</li>`).join("") + "</ul>" +
      (d.created.length ? "<p>作ったファイル: " + d.created.map((f) => esc(f.path)).join(", ") + "</p>" : "");
    return `  <entry>
    <id>tag:${esc(REPO)},${d.date}:claude</id>
    <title>${d.date} Claude の作業 ${d.commits.length}件</title>
    <updated>${new Date(d.date + "T23:59:00+09:00").toISOString()}</updated>
    <link href="${SITE_URL}/claude/#${d.date}"/>
    <content type="html">${esc(html)}</content>
  </entry>`;
  }).join("\n");
  return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <id>${SITE_URL}/claude/</id>
  <title>Claude 作業ログ</title>
  <updated>${log.generatedAt}</updated>
  <link href="${SITE_URL}/claude/"/>
${entries}
</feed>
`;
}

function report(log, date) {
  const d = log.days.find((x) => x.date === date);
  if (!d) return "";
  const lines = [
    `## ${date} の Claude 日報`,
    "",
    `コミット **${d.commits.length}件** ／ 新しく作ったファイル **${d.created.length}個** ／ 変更したファイル **${d.changed.length}個** ／ +${d.add} −${d.del} 行`,
    "",
    "### やったこと",
    ...[...d.commits].reverse().map((c) => `- ${c.time} [${KIND_LABEL[c.kind]}] ${c.title} (\`${c.hash}\`)`),
    ""
  ];
  if (d.created.length) lines.push("### 作ったファイル", ...d.created.map((f) => `- \`${f.path}\``), "");
  if (d.changed.length) lines.push("### 変更したファイル", ...d.changed.map((f) => `- \`${f.path}\``), "");
  lines.push("（自動で作成された日報です。翌日の日報が来るとこの Issue は閉じられます）");
  return lines.join("\n");
}

const log = build(readCommits());

if (REPORT) {
  const date = REPORT === "today" ? todayJst()
    : REPORT === "yesterday" ? new Date(Date.now() + JST - 86400000).toISOString().slice(0, 10)
    : REPORT;
  process.stdout.write(report(log, date));
} else {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, "log.json"), JSON.stringify(log));
  fs.writeFileSync(path.join(OUT, "feed.xml"), feed(log));
  console.log(`Claude の作業ログ: ${log.totals.commits} コミット / ${log.totals.days} 日 → ${path.relative(ROOT, OUT) || "."}`);
}
