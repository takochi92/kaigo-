// まんがページ（manga.html）から Instagram 用の 4:5 画像（1080×1350）を作る
const { chromium } = require(process.env.PWPATH);
const fs = require("fs");
// 使い方: dist をローカルで配信（python3 -m http.server 8769 -d dist）してから
//   PWPATH=$(npm root -g)/playwright node scripts/make-instagram.cjs
// 縦長動画（リール・TikTok・ショート）用の1080×1920のコマ画像を作る。
// 使い方: dist をローカルで配信（python3 -m http.server 8769 -d dist）してから
//   PWPATH=$(npm root -g)/playwright node scripts/make-video-frames.cjs && python3 scripts/make-video.py
const OUT = require("path").join(__dirname, "..", "sns", "video", "frames");
fs.mkdirSync(OUT, { recursive: true });

const CSS = `
  body > *:not(#ig) { display: none !important; }
  html, body { margin: 0; background: #fff; }
  #ig { position: fixed; inset: 0; z-index: 99; }
  .slide { width: 360px; height: 640px; background: #fff; position: relative; overflow: hidden; display: flex; flex-direction: column; font-family: "IPAPGothic", "IPAGothic", sans-serif; color: #2b3027; }
  .bar { height: 64px; font-size: 15px !important; flex: none; display: flex; align-items: center; justify-content: space-between; padding: 0 10px; background: #4f8a1f; color: #fff; font-size: 11.5px; font-weight: 700; letter-spacing: .03em; }
  .bar .n { background: #fff; color: #4f8a1f; padding: 0 6px; }
  .slide .scene { order: 2; width: 360px; height: 360px; aspect-ratio: auto; border-bottom: 2px solid #2b3027; flex: none; }
  .slide .scene .koma { display: none; }
  .slide::after { content: "おやのて ＠kaigonavi"; position: absolute; left: 0; right: 0; bottom: 0; height: 34px; display: flex; align-items: center; justify-content: center; background: #4f8a1f; color: #fff; font-size: 12.5px; font-weight: 700; }
  .slide .cap { order: 1; flex: none; min-height: 118px; box-sizing: border-box; background: #eef6e1; padding: 12px 16px; font-size: 15px; line-height: 1.7; display: flex; align-items: center; }
  .cover { background: #eef6e1; padding: 70px 22px 0; box-sizing: border-box; }
  .cover .ep { display: inline-block; background: #e8792b; color: #fff; font-weight: 700; font-size: 15px; padding: 3px 10px; }
  .cover h1 { font-size: 25px; line-height: 1.35; margin: 12px 0 6px; text-wrap: balance; }
  .cover .sub { font-size: 14px; color: #4f5a48; margin: 0; }
  .cover .who { position: absolute; bottom: 0; right: 14px; height: 360px; display: flex; align-items: flex-end; }
  .cover .who img { height: 100%; width: auto; margin-left: -22px; }
  .cover .who img.s { height: 92%; }
  .cover .brand { display: none; left: 22px; bottom: 22px; font-size: 13px; font-weight: 700; color: #4f8a1f; line-height: 1.5; }
  .cover .swipe { position: absolute; left: 22px; bottom: 64px; font-size: 12px; color: #fff; background: #4f8a1f; padding: 3px 9px; }
  .end { padding: 24px 22px 60px; display:flex; flex-direction:column; box-sizing: border-box; }
  .end h2 { font-size: 20px; margin: 0 0 12px; padding: 2px 0 6px 10px; border-left: 6px solid #a8d164; border-bottom: 1px solid #dde3d2; }
  .end ul { margin: 0 0 14px; padding-left: 1.2em; font-size: 15.5px; line-height: 1.65; }
  .end li { margin-bottom: 6px; }
  .end .go { margin-top: 16px; font-size: 15px !important; background: #fff3e8; border: 2px solid #e8792b; padding: 10px 12px; font-size: 13px; line-height: 1.6; }
  .end .go b { color: #b8571a; }
  .end .acc { margin-top: 10px; font-size: 12px; color: #636b5c; }
`;

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 3 });
  await p.goto("http://localhost:8769/manga.html", { waitUntil: "load" });
  await p.waitForTimeout(800);
  await p.addStyleTag({ content: CSS });
  // 画像を先に全部読み込ませる
  await p.evaluate(async () => {
    document.querySelectorAll("img[loading]").forEach((i) => i.removeAttribute("loading"));
    await Promise.all([...document.images].map((i) => i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; })));
  });

  const eps = await p.evaluate(() => [...document.querySelectorAll("section.episode")].map((s) => ({
    id: s.id,
    title: s.querySelector("h2").childNodes[0].textContent.trim(),
    sub: s.querySelector("h2 .count").textContent.trim(),
    panels: s.querySelectorAll(".panel").length,
    points: [...s.querySelectorAll(".tip li")].map((l) => l.textContent.trim())
  })));

  const shot = async (name) => {
    await p.waitForTimeout(150);
    await (await p.$("#ig .slide")).screenshot({ path: `${OUT}/${name}.png` });
  };

  for (const [ei, ep] of eps.entries()) {
    const no = String(ei + 1);
    const total = ep.panels + 2;
    // 表紙
    await p.evaluate(({ ep, no }) => {
      const ig = document.getElementById("ig") || Object.assign(document.createElement("div"), { id: "ig" });
      document.body.appendChild(ig);
      const who = ep.id === "ep4"
        ? '<img src="assets/manga/musume-worry.png"><img class="s" src="assets/manga/ojiichan.png">'
        : ep.id === "ep3"
          ? '<img src="assets/manga/musume-worry.png"><img class="s" src="assets/manga/obaachan.png">'
          : ep.id === "ep2"
            ? '<img src="assets/manga/caremane.png"><img src="assets/manga/musume.png"><img class="s" src="assets/manga/obaachan.png">'
            : '<img src="assets/manga/musume-worry.png"><img class="s" src="assets/manga/obaachan.png">';
      ig.innerHTML = `<div class="slide cover"><span class="ep">まんがでわかる介護 第${no}話</span><h1>${ep.title.replace(/^第[0-9]+話[\s　]*/, "")}</h1><p class="sub">${ep.sub}</p><div class="who">${who}</div><div class="brand">おやのて<br>oyanote-care.com</div></div>`;
    }, { ep, no });
    await shot(`ep${no}-01`);

    // コマ
    for (let j = 0; j < ep.panels; j++) {
      await p.evaluate(({ id, j, no, total, title }) => {
        const fig = document.querySelectorAll(`#${id} .panel`)[j];
        const scene = fig.querySelector(".scene").cloneNode(true);
        const cap = fig.querySelector("figcaption").textContent;
        const ig = document.getElementById("ig");
        ig.innerHTML = `<div class="slide"><div class="bar"><span>第${no}話 ${title.replace(/^第[0-9]+話[\s　]*/, "")}</span><span class="n">${j + 2}/${total}</span></div></div>`;
        const slide = ig.firstChild;
        slide.appendChild(scene);
        const c = document.createElement("div");
        c.className = "cap";
        c.textContent = cap;
        slide.appendChild(c);
      }, { id: ep.id, j, no, total, title: ep.title });
      await shot(`ep${no}-${String(j + 2).padStart(2, "0")}`);
    }

    // まとめ
    await p.evaluate(({ ep, no, total }) => {
      document.getElementById("ig").innerHTML = `<div class="slide end"><div class="bar" style="margin:-24px -22px 18px"><span>第${no}話のポイント</span><span class="n">${total}/${total}</span></div><h2>この話のポイント</h2><ul>${ep.points.map((t) => `<li>${t}</li>`).join("")}</ul><div class="go">相談先・全国の介護事業所と病院の検索、ほかのお話は<br><b>プロフィールのリンク（おやのて）</b>から見られます。</div><div class="acc">おやのて oyanote-care.com ／ 編集部がやさしく解説</div></div>`;
    }, { ep, no, total });
    await shot(`ep${no}-${String(total).padStart(2, "0")}`);
  }

  console.log(fs.readdirSync(OUT).sort().join("\n"));
  await b.close();
})();
