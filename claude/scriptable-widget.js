// Claude 作業ログ ウィジェット（iPhone / iPad の無料アプリ「Scriptable」用）
//
// 使い方:
//  1. App Store で「Scriptable」を入れる
//  2. Scriptable を開いて右上の ＋ → このファイルの中身をすべて貼り付け → 名前を「Claudeログ」にする
//  3. ホーム画面を長押し → 左上の ＋ → Scriptable → 小 or 中 を追加
//  4. 追加したウィジェットを長押し →「ウィジェットを編集」→ Script で「Claudeログ」を選ぶ
// タップすると GitHub の日報 Issue 一覧が開きます。iOS が15分〜1時間おきに自動で更新します。
//
// リポジトリを非公開にした場合:
//  GitHub → Settings → Developer settings → Fine-grained tokens で、このリポジトリだけ
//  「Contents: Read-only」のトークンを作り、Scriptable のアプリ内でこのスクリプトを一度実行して貼り付けます
//  （トークンは iPhone のキーチェーンにだけ保存されます）。

const REPO = "takochi92/kaigo-";
const LOG_URL = `https://api.github.com/repos/${REPO}/contents/log.json?ref=claude-log`;
const OPEN_URL = `https://github.com/${REPO}/issues?q=${encodeURIComponent('is:issue "Claude 日報" in:title')}`;
const TOKEN_KEY = "claude-log-github-token";

const C = {
  bg1: new Color("#1a1210"),
  bg2: new Color("#0b0d12"),
  text: new Color("#eef0f5"),
  muted: new Color("#8b93a7"),
  coral: new Color("#ff8a5c"),
  amber: new Color("#ffc857"),
  cyan: new Color("#5ce1e6"),
  lime: new Color("#a3e635"),
  line: new Color("#ffffff", 0.12)
};
const KIND_COLOR = { page: C.coral, data: C.cyan, design: new Color("#a78bfa"), ops: C.amber, docs: C.lime };

function todayJst() {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

async function loadLog() {
  const fm = FileManager.local();
  const cache = fm.joinPath(fm.cacheDirectory(), "claude-log.json");
  try {
    const req = new Request(LOG_URL);
    req.headers = { Accept: "application/vnd.github.raw+json", "Cache-Control": "no-cache" };
    if (Keychain.contains(TOKEN_KEY)) req.headers.Authorization = "Bearer " + Keychain.get(TOKEN_KEY);
    req.timeoutInterval = 15;
    const log = await req.loadJSON();
    if (!log || !log.days) throw new Error((log && log.message) || "log.json を読めません");
    fm.writeString(cache, JSON.stringify(log));
    return log;
  } catch (e) {
    if (fm.fileExists(cache)) return JSON.parse(fm.readString(cache));
    throw e;
  }
}

function series(log, n) {
  const map = {};
  log.days.forEach((d) => (map[d.date] = d.commits.length));
  const out = [];
  const base = new Date(todayJst() + "T00:00:00Z");
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(base);
    d.setUTCDate(d.getUTCDate() - i);
    out.push(map[d.toISOString().slice(0, 10)] || 0);
  }
  return out;
}

function sparkImage(values, w, h) {
  const ctx = new DrawContext();
  ctx.size = new Size(w, h);
  ctx.opaque = false;
  ctx.respectScreenScale = true;
  const max = Math.max(1, ...values);
  const gap = 3;
  const bw = (w - gap * (values.length - 1)) / values.length;
  values.forEach((v, i) => {
    const bh = Math.max(3, (v / max) * h);
    ctx.setFillColor(v ? C.coral : C.line);
    const path = new Path();
    path.addRoundedRect(new Rect(i * (bw + gap), h - bh, bw, bh), 2, 2);
    ctx.addPath(path);
    ctx.fillPath();
  });
  return ctx.getImage();
}

function text(stack, str, size, color, opts = {}) {
  const t = stack.addText(String(str));
  t.font = opts.mono ? Font.boldMonospacedSystemFont(size) : opts.bold ? Font.boldSystemFont(size) : Font.systemFont(size);
  t.textColor = color;
  t.lineLimit = opts.lines || 1;
  if (opts.min) t.minimumScaleFactor = opts.min;
  return t;
}

async function build() {
  const w = new ListWidget();
  const g = new LinearGradient();
  g.colors = [C.bg1, C.bg2];
  g.locations = [0, 1];
  g.startPoint = new Point(1, 0);
  g.endPoint = new Point(0, 1);
  w.backgroundGradient = g;
  w.setPadding(14, 14, 14, 14);
  w.url = OPEN_URL;
  w.refreshAfterDate = new Date(Date.now() + 30 * 60 * 1000);

  let log;
  try {
    log = await loadLog();
  } catch (e) {
    text(w, "Claude ログ", 13, C.coral, { bold: true });
    text(w, "読み込めませんでした", 11, C.muted, { lines: 2 });
    return w;
  }

  const family = config.widgetFamily || "medium";
  const today = todayJst();
  const d = log.days.find((x) => x.date === today);

  const head = w.addStack();
  head.centerAlignContent();
  text(head, "✳︎ CLAUDE", 10, C.coral, { mono: true });
  head.addSpacer();
  text(head, today.slice(5).replace("-", "/"), 10, C.muted, { mono: true });
  w.addSpacer(4);

  const big = w.addStack();
  big.bottomAlignContent();
  text(big, d ? d.commits.length : 0, family === "small" ? 40 : 44, C.amber, { mono: true });
  big.addSpacer(6);
  const unit = big.addStack();
  unit.layoutVertically();
  text(unit, d ? "commits" : "おやすみ中", 11, C.muted);
  text(unit, `📄${d ? d.created.length : 0}  🔥${log.totals.streak}`, 11, C.text, { mono: true });

  w.addSpacer(6);
  const img = w.addImage(sparkImage(series(log, 14), family === "small" ? 120 : 280, 22));
  img.imageSize = new Size(family === "small" ? 120 : 280, 22);

  if (family !== "small") {
    w.addSpacer(6);
    const src = d || log.days[0];
    const items = src ? src.commits.slice(0, family === "large" ? 8 : 2) : [];
    for (const c of items) {
      const row = w.addStack();
      row.centerAlignContent();
      const dot = row.addText("●");
      dot.font = Font.systemFont(8);
      dot.textColor = KIND_COLOR[c.kind] || C.coral;
      row.addSpacer(5);
      text(row, `${d ? "" : src.date.slice(5) + " "}${c.time} ${c.title}`, 11, C.text, { min: 0.8 });
    }
  }
  w.addSpacer();
  return w;
}

// アプリ内で実行したとき：トークンの登録・削除
if (!config.runsInWidget) {
  const a = new Alert();
  a.title = "Claude ログ";
  a.message = Keychain.contains(TOKEN_KEY)
    ? "GitHub トークンは登録済みです。"
    : "リポジトリが非公開なら GitHub トークン（Contents: Read-only）を貼り付けてください。公開のままなら空欄で OK。";
  a.addSecureTextField("github_pat_…", "");
  a.addAction("保存してプレビュー");
  if (Keychain.contains(TOKEN_KEY)) a.addDestructiveAction("トークンを削除");
  a.addCancelAction("プレビューだけ");
  const i = await a.presentAlert();
  const token = a.textFieldValue(0).trim();
  if (i === 0 && token) Keychain.set(TOKEN_KEY, token);
  if (i === 1) Keychain.remove(TOKEN_KEY);
}

const widget = await build();
if (config.runsInWidget) {
  Script.setWidget(widget);
} else {
  await widget.presentMedium();
}
Script.complete();
