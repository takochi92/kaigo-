#!/usr/bin/env node
// 「まんがでわかる介護」ページ（manga.html）を生成するスクリプト
// 絵はすべてSVGで描いています。セリフや話を変えたいときは EPISODES を編集して
//   node scripts/make-manga.mjs
// を実行すると manga.html が作り直されます。

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

// ---------------------------------------------------------------- 登場人物

const SKIN = "#f7dcc6";
const LINE = "#6e5646";

const HAIR = {
  bob: (c) => `<path d="M24 50 Q22 16 50 16 Q78 16 76 50 L76 64 Q71 58 70 44 Q62 30 44 31 Q32 34 30 46 L29 64 Q24 58 24 50Z" fill="${c}" stroke="${LINE}" stroke-width="1.2"/>`,
  bun: (c) => `<circle cx="50" cy="15" r="10" fill="${c}" stroke="${LINE}" stroke-width="1.2"/><path d="M26 46 Q26 20 50 20 Q74 20 74 46 Q68 32 50 31 Q32 32 26 46Z" fill="${c}" stroke="${LINE}" stroke-width="1.2"/>`,
  short: (c) => `<path d="M26 44 Q26 18 50 18 Q74 18 74 44 Q70 30 54 29 Q44 34 30 34 Q27 38 26 44Z" fill="${c}" stroke="${LINE}" stroke-width="1.2"/>`,
  pony: (c) => `<ellipse cx="78" cy="40" rx="8" ry="13" fill="${c}" stroke="${LINE}" stroke-width="1.2"/><path d="M26 44 Q26 18 50 18 Q74 18 74 44 Q66 30 50 30 Q34 30 26 44Z" fill="${c}" stroke="${LINE}" stroke-width="1.2"/>`
};

const FACE = {
  smile: `<circle cx="41" cy="46" r="2.6" fill="#3b2f28"/><circle cx="59" cy="46" r="2.6" fill="#3b2f28"/><path d="M43 55 Q50 62 57 55" fill="none" stroke="#3b2f28" stroke-width="2" stroke-linecap="round"/><ellipse cx="34" cy="54" rx="4" ry="2.4" fill="#f4a6a0" opacity=".7"/><ellipse cx="66" cy="54" rx="4" ry="2.4" fill="#f4a6a0" opacity=".7"/>`,
  neutral: `<circle cx="41" cy="46" r="2.6" fill="#3b2f28"/><circle cx="59" cy="46" r="2.6" fill="#3b2f28"/><path d="M45 57 L55 57" stroke="#3b2f28" stroke-width="2" stroke-linecap="round"/>`,
  worry: `<path d="M35 39 L45 36 M65 39 L55 36" stroke="#3b2f28" stroke-width="1.8" stroke-linecap="round"/><circle cx="41" cy="46" r="2.4" fill="#3b2f28"/><circle cx="59" cy="46" r="2.4" fill="#3b2f28"/><path d="M44 59 Q50 55 56 59" fill="none" stroke="#3b2f28" stroke-width="2" stroke-linecap="round"/>`,
  surprise: `<path d="M35 36 Q41 32 46 35 M54 35 Q59 32 65 36" fill="none" stroke="#3b2f28" stroke-width="1.8" stroke-linecap="round"/><circle cx="41" cy="46" r="3" fill="#3b2f28"/><circle cx="59" cy="46" r="3" fill="#3b2f28"/><ellipse cx="50" cy="58" rx="3.5" ry="4.2" fill="#3b2f28"/>`,
  tired: `<path d="M37 46 Q41 49 45 46 M55 46 Q59 49 63 46" fill="none" stroke="#3b2f28" stroke-width="2" stroke-linecap="round"/><path d="M45 58 Q50 56 55 58" fill="none" stroke="#3b2f28" stroke-width="2" stroke-linecap="round"/><path d="M71 30 Q75 37 71 40 Q67 37 71 30Z" fill="#9fd0f0"/>`,
  happy: `<path d="M37 47 Q41 42 45 47 M55 47 Q59 42 63 47" fill="none" stroke="#3b2f28" stroke-width="2" stroke-linecap="round"/><path d="M42 54 Q50 64 58 54 Z" fill="#c4574b" stroke="#3b2f28" stroke-width="1.5"/><ellipse cx="34" cy="54" rx="4" ry="2.4" fill="#f4a6a0" opacity=".8"/><ellipse cx="66" cy="54" rx="4" ry="2.4" fill="#f4a6a0" opacity=".8"/>`
};

const PROP = {
  phone: `<rect x="70" y="38" width="10" height="18" fill="#45505c" stroke="${LINE}" stroke-width="1"/><path d="M68 52 Q74 70 62 84" fill="none" stroke="${SKIN}" stroke-width="7" stroke-linecap="round"/>`,
  clipboard: `<rect x="34" y="96" width="32" height="40" fill="#c9a56f" stroke="${LINE}" stroke-width="1.2"/><rect x="38" y="102" width="24" height="30" fill="#fff"/><path d="M41 109 H59 M41 115 H59 M41 121 H53" stroke="#9aa39a" stroke-width="2"/>`,
  paper: `<rect x="30" y="92" width="40" height="30" fill="#fff" stroke="${LINE}" stroke-width="1.2" transform="rotate(-6 50 107)"/><path d="M36 100 H62 M36 106 H62 M36 112 H54" stroke="#e8792b" stroke-width="2" transform="rotate(-6 50 107)"/>`,
  badge: `<rect x="55" y="88" width="14" height="10" fill="#fff" stroke="${LINE}" stroke-width="1"/>`,
  cane: `<path d="M84 96 L84 150 M84 96 Q84 88 76 90" fill="none" stroke="#8a5a3b" stroke-width="4" stroke-linecap="round"/>`,
  stethoscope: `<path d="M38 76 Q38 104 50 104 Q62 104 62 76" fill="none" stroke="#5b6b7a" stroke-width="2.5"/><circle cx="50" cy="108" r="4" fill="#5b6b7a"/>`
};

// 人物の基本形（幅100×高さ150、足元がy=150）
const PEOPLE = {
  sakura: { hair: ["bob", "#7a5233"], top: "#f39a4a", label: "娘のさくら" },
  hanako: { hair: ["bun", "#d6d3cf"], top: "#9cc96a", glasses: true, label: "母のはなこ", short: true },
  houkatsu: { hair: ["short", "#3a3532"], top: "#6fa63a", props: ["badge"], label: "包括の職員" },
  chosain: { hair: ["short", "#4a4038"], top: "#7d8a96", props: ["clipboard"], label: "調査員" },
  caremane: { hair: ["pony", "#5a3d2b"], top: "#4f6d8a", glasses: true, props: ["badge"], label: "ケアマネ" },
  msw: { hair: ["bob", "#3a3532"], top: "#e9a7b4", props: ["badge"], label: "相談員" },
  nurse: { hair: ["pony", "#3a3532"], top: "#8fc3df", props: ["stethoscope"], label: "看護師" },
  staff: { hair: ["short", "#5a3d2b"], top: "#f3b26b", props: ["badge"], label: "施設の職員" }
};

function person(id, { x, y: top, face = "smile", flip = false, props = [], scale = 1.15 }) {
  const p = PEOPLE[id];
  const s = p.short ? scale * 0.92 : scale;
  const y = top ?? 292 - 150 * s;
  const allProps = [...(p.props || []), ...props];
  const body = `<path d="M28 78 Q50 70 72 78 L84 150 L16 150 Z" fill="${p.top}" stroke="${LINE}" stroke-width="1.4"/>
<rect x="44" y="64" width="12" height="12" fill="${SKIN}"/>
<circle cx="50" cy="46" r="24" fill="${SKIN}" stroke="${LINE}" stroke-width="1.4"/>
${HAIR[p.hair[0]](p.hair[1])}
${FACE[face]}
${p.glasses ? `<g fill="none" stroke="#5b4b40" stroke-width="1.5"><circle cx="41" cy="46" r="6.5"/><circle cx="59" cy="46" r="6.5"/><path d="M47.5 46 H52.5"/></g>` : ""}
${allProps.map((k) => PROP[k]).join("")}`;
  const t = flip ? `translate(${x + 100 * s} ${y}) scale(${-s} ${s})` : `translate(${x} ${y}) scale(${s})`;
  return `<g transform="${t}">${body}</g>`;
}

// ---------------------------------------------------------------- 背景

const BG = {
  home: `<rect width="400" height="300" fill="#fffaf2"/><rect y="250" width="400" height="50" fill="#f0e2cc"/><rect x="292" y="34" width="78" height="70" fill="#e6f3fb" stroke="#c9b79c" stroke-width="3"/><path d="M331 34 V104 M292 69 H370" stroke="#c9b79c" stroke-width="3"/><rect x="18" y="200" width="22" height="50" fill="#b8d98a"/><circle cx="29" cy="190" r="16" fill="#a8d164"/>`,
  night: `<rect width="400" height="300" fill="#eef0f6"/><rect y="250" width="400" height="50" fill="#dcdcea"/><rect x="292" y="34" width="78" height="70" fill="#4a5a7a" stroke="#b9b6c9" stroke-width="3"/><circle cx="348" cy="56" r="10" fill="#fff4c2"/><rect x="20" y="214" width="90" height="36" fill="#d9c4a5"/>`,
  office: `<rect width="400" height="300" fill="#f6faef"/><rect x="120" y="22" width="160" height="34" fill="#4f8a1f"/><text x="200" y="45" text-anchor="middle" font-size="17" font-weight="700" fill="#fff">地域包括支援センター</text><rect y="236" width="400" height="64" fill="#cfe2ad"/><rect y="230" width="400" height="10" fill="#a8d164"/>`,
  city: `<rect width="400" height="300" fill="#f6faef"/><rect x="120" y="22" width="160" height="34" fill="#4f8a1f"/><text x="200" y="45" text-anchor="middle" font-size="17" font-weight="700" fill="#fff">介護保険の窓口</text><rect y="236" width="400" height="64" fill="#cfe2ad"/><rect y="230" width="400" height="10" fill="#a8d164"/>`,
  day: `<rect width="400" height="300" fill="#fff6ea"/><rect x="24" y="22" width="150" height="32" fill="#e8792b"/><text x="99" y="44" text-anchor="middle" font-size="16" font-weight="700" fill="#fff">デイサービス</text><rect y="250" width="400" height="50" fill="#f3e3c8"/><rect x="250" y="200" width="130" height="14" fill="#c9a56f"/><rect x="262" y="214" width="8" height="36" fill="#a8885a"/><rect x="360" y="214" width="8" height="36" fill="#a8885a"/><circle cx="300" cy="192" r="8" fill="#fff" stroke="#c9b79c" stroke-width="2"/>`,
  rail: `<rect width="400" height="300" fill="#fffaf2"/><rect y="250" width="400" height="50" fill="#f0e2cc"/><rect x="250" y="130" width="140" height="10" fill="#a8885a"/><rect x="256" y="140" width="6" height="16" fill="#8a6a45"/><rect x="378" y="140" width="6" height="16" fill="#8a6a45"/><text x="320" y="122" text-anchor="middle" font-size="14" fill="#8a6a45">手すり</text>`,
  facility: `<rect width="400" height="300" fill="#eef6e1"/><rect x="214" y="60" width="176" height="190" fill="#fff" stroke="#c7d3b4" stroke-width="3"/><g fill="#d9ecf7" stroke="#c7d3b4" stroke-width="2"><rect x="232" y="84" width="34" height="28"/><rect x="284" y="84" width="34" height="28"/><rect x="336" y="84" width="34" height="28"/><rect x="232" y="134" width="34" height="28"/><rect x="284" y="134" width="34" height="28"/><rect x="336" y="134" width="34" height="28"/></g><rect x="284" y="196" width="34" height="54" fill="#e8792b"/><rect x="222" y="34" width="160" height="24" fill="#4f8a1f"/><text x="302" y="51" text-anchor="middle" font-size="13" font-weight="700" fill="#fff">特別養護老人ホーム</text><rect y="250" width="400" height="50" fill="#cfe2ad"/>`,
  hospital: `<rect width="400" height="300" fill="#f1f7fb"/><rect y="250" width="400" height="50" fill="#dde8ef"/><rect x="210" y="184" width="176" height="40" fill="#fff" stroke="#a9bccb" stroke-width="3"/><rect x="214" y="168" width="52" height="22" fill="#fff" stroke="#a9bccb" stroke-width="2"/><rect x="210" y="224" width="8" height="26" fill="#a9bccb"/><rect x="378" y="224" width="8" height="26" fill="#a9bccb"/><rect x="230" y="190" width="150" height="22" fill="#cfe7f5"/>`,
  bed: `<rect width="400" height="300" fill="#fffaf2"/><rect y="250" width="400" height="50" fill="#f0e2cc"/><rect x="200" y="176" width="186" height="44" fill="#eaf4dc" stroke="#9cb98a" stroke-width="3"/><rect x="200" y="150" width="12" height="100" fill="#9cb98a"/><rect x="374" y="166" width="12" height="84" fill="#9cb98a"/><text x="293" y="204" text-anchor="middle" font-size="14" fill="#4f8a1f">介護ベッド（レンタル）</text>`
};

// ---------------------------------------------------------------- お話

// bubble: [x%, y%, 幅%, 文, しっぽの向き("l"|"r"), 種類("say"|"think")]
const EPISODES = [
  {
    id: "ep1",
    title: "お母さんの様子が気になる",
    sub: "相談から要介護認定の申請まで",
    panels: [
      {
        bg: "home",
        people: [["sakura", { x: 60, face: "worry" }], ["hanako", { x: 210, face: "smile", props: ["cane"], flip: true }]],
        bubbles: [[3, 4, 50, "お母さん、最近よく転ぶし、料理もつらそう…", "l"], [56, 14, 40, "大丈夫よ〜、まだまだ元気！", "r"]],
        narr: "ひとり暮らしの母・はなこさん（82歳）。最近、転ぶことが増えてきました。"
      },
      {
        bg: "home",
        people: [["sakura", { x: 130, face: "neutral", props: ["phone"] }]],
        bubbles: [[4, 6, 62, "まずは母の住む地域の「地域包括支援センター」に電話してみよう", "r"]],
        narr: "介護の相談は、地域包括支援センターへ。相談は無料で、家族だけ・電話だけでも大丈夫です。"
      },
      {
        bg: "office",
        people: [["houkatsu", { x: 40, face: "smile" }], ["sakura", { x: 240, face: "surprise", flip: true }]],
        bubbles: [[3, 22, 50, "介護保険を使うには「要介護認定」の申請が必要です。代わりに申請もできますよ", "l"], [60, 26, 36, "お願いします！", "r"]],
        narr: "申請は市区町村の窓口へ。センターやケアマネジャーが代わりに申請することもできます。申請にお金はかかりません。"
      },
      {
        bg: "home",
        people: [["chosain", { x: 24, face: "neutral" }], ["hanako", { x: 156, face: "happy" }], ["sakura", { x: 268, face: "worry", flip: true }]],
        bubbles: [[30, 4, 36, "なんでも自分でできますよ！", "l"], [62, 22, 36, "（本当は夜、トイレで転んだの…）", "r", "think"]],
        narr: "調査員が家に来て、体や生活の様子を聞き取ります。本人は頑張ってしまいがち。ふだんの困りごとは家族が伝えましょう。"
      },
      {
        bg: "home",
        people: [["sakura", { x: 70, face: "smile", props: ["paper"] }], ["hanako", { x: 214, face: "smile", flip: true }]],
        bubbles: [[3, 6, 50, "結果が届いた！「要介護1」だって", "l"], [58, 18, 38, "これでサービスが使えるのね", "r"]],
        narr: "主治医の意見書とあわせて審査され、結果は原則30日以内に届きます。要支援1・2、要介護1〜5、非該当のどれかです。"
      }
    ],
    points: [
      "最初の相談先は「地域包括支援センター」。わからなければ市区町村の介護保険の窓口へ。",
      "申請・調査・意見書に費用はかかりません。",
      "認定調査には家族が立ち会い、困っていることを具体的に伝えるのがコツ。"
    ],
    links: [["介護保険のしくみ（申請の流れ）", "seido.html#flow"], ["相談窓口の探し方", "shisetsu.html"]]
  },
  {
    id: "ep2",
    title: "ケアマネさんと家での暮らしを考える",
    sub: "ケアプランづくりと在宅サービス",
    panels: [
      {
        bg: "home",
        people: [["caremane", { x: 40, face: "smile" }], ["sakura", { x: 170, face: "neutral" }], ["hanako", { x: 270, face: "smile", flip: true }]],
        bubbles: [[3, 4, 52, "ケアマネジャーの田中です。困っていることを教えてください", "l"]],
        narr: "要介護1〜5の人は、ケアマネジャーがいる「居宅介護支援事業所」を選んで契約します。ケアプラン作りの自己負担はありません。"
      },
      {
        bg: "home",
        people: [["hanako", { x: 50, face: "worry" }], ["caremane", { x: 230, face: "smile", flip: true }]],
        bubbles: [[3, 6, 44, "ひとりでお風呂に入るのがこわいのよ", "l"], [50, 20, 46, "デイサービスで入浴できますよ。送迎もあります", "r"]],
        narr: "本人・家族の希望を聞いて、どのサービスを週に何回使うかの計画（ケアプラン）を作ります。"
      },
      {
        bg: "day",
        people: [["hanako", { x: 60, face: "happy" }], ["staff", { x: 190, face: "smile", flip: true }]],
        bubbles: [[40, 22, 56, "みんなとおしゃべりできて楽しいわ", "l"]],
        narr: "たとえば「デイサービス週2回＋ホームヘルパー週1回」。家族にとっても休める時間になります。"
      },
      {
        bg: "rail",
        people: [["caremane", { x: 40, face: "neutral" }], ["sakura", { x: 150, face: "surprise" }]],
        bubbles: [[3, 4, 58, "手すりは住宅改修で20万円まで介護保険が使えます。工事の前に申請してくださいね", "l"], [50, 32, 30, "知らなかった！", "r"]],
        narr: "手すり・段差の解消などの住宅改修や、介護ベッド・車いすのレンタルも介護保険で利用できます。"
      }
    ],
    points: [
      "自己負担は原則1割（所得により2〜3割）。要介護1なら、月に約16万7千円分までのサービスを1割負担で使えます。",
      "ケアマネジャーは変更できます。合わないと感じたら遠慮なく相談を。",
      "住宅改修は「工事の前」の申請が必要です。"
    ],
    links: [["ケアマネ事業所を探す", "search.html?cat=kyotaku"], ["デイサービスを探す", "search.html?cat=tsusho"], ["在宅サービスの種類", "shisetsu-shurui.html#zaitaku"]]
  },
  {
    id: "ep3",
    title: "施設を考えるとき",
    sub: "ショートステイ・特養の申し込み",
    panels: [
      {
        bg: "night",
        people: [["sakura", { x: 140, face: "tired" }]],
        bubbles: [[4, 6, 64, "仕事と介護の両立…ちょっと限界かも", "r", "think"]],
        narr: "介護する人が休むことはとても大切。ショートステイ（短期間のお泊まり）も使えます。"
      },
      {
        bg: "home",
        people: [["caremane", { x: 40, face: "smile" }], ["sakura", { x: 230, face: "surprise", flip: true }]],
        bubbles: [[3, 6, 52, "要介護3になったので、特養（特別養護老人ホーム）にも申し込めますよ", "l"], [58, 34, 38, "どこを選べばいいの？", "r"]],
        narr: "特養は原則「要介護3以上」。グループホームや有料老人ホームなど、ほかの住まいも選べます。"
      },
      {
        bg: "facility",
        people: [["hanako", { x: 10, face: "neutral" }], ["sakura", { x: 100, face: "neutral" }], ["staff", { x: 200, face: "smile", flip: true }]],
        bubbles: [[3, 4, 40, "見学はいつでもどうぞ。お食事もご覧ください", "l"]],
        narr: "施設は必ず見学を。費用の総額・医療への対応・看取り・退去の条件を確認しましょう。"
      },
      {
        bg: "home",
        people: [["sakura", { x: 70, face: "smile", props: ["paper"] }], ["hanako", { x: 214, face: "smile", flip: true }]],
        bubbles: [[3, 6, 52, "いくつかの施設に申し込んでおこう", "l"], [58, 20, 38, "ここなら安心ね", "r"]],
        narr: "特養は施設に直接申し込み、必要度の高い人から入所が決まります。所得が低い人は食費・部屋代の軽減（負担限度額認定）もあります。"
      }
    ],
    points: [
      "特養は原則要介護3以上。入所の順番は申し込み順ではなく、必要度で決まります。",
      "見学は必須。月の費用だけでなく、入居一時金や医療費なども含めて比べましょう。",
      "費用が心配なときは「高額介護サービス費」「負担限度額認定」を市区町村に相談。"
    ],
    links: [["施設・住まいの比較", "shisetsu-shurui.html#shisetsu"], ["特養を探す", "search.html?cat=tokuyo"], ["グループホームを探す", "search.html?cat=gh"]]
  },
  {
    id: "ep4",
    title: "入院から家に帰るとき",
    sub: "退院の準備と訪問看護",
    panels: [
      {
        bg: "hospital",
        people: [["sakura", { x: 40, face: "worry" }], ["msw", { x: 150, face: "smile" }]],
        bubbles: [[3, 4, 46, "退院したら、家でみられるかな…", "l"], [44, 22, 42, "病院の医療相談室にご相談くださいね", "r"]],
        narr: "入院中の不安は、病院の医療相談室（医療ソーシャルワーカー）へ。"
      },
      {
        bg: "hospital",
        people: [["msw", { x: 40, face: "smile" }], ["caremane", { x: 150, face: "neutral" }]],
        bubbles: [[3, 4, 58, "入院中でも介護保険の申請ができます。退院前にみんなで打ち合わせをしましょう", "l"]],
        narr: "退院前に病院・ケアマネジャー・家族が集まり、家での生活の準備を話し合います。"
      },
      {
        bg: "bed",
        people: [["nurse", { x: 40, face: "smile" }], ["hanako", { x: 140, face: "smile" }]],
        bubbles: [[3, 4, 50, "週に1回、体調とお薬を見に来ますね", "l"], [36, 30, 34, "ありがとう", "l"]],
        narr: "訪問看護では看護師が家に来て、体調の確認・医療的なケア・お薬の管理などをします。介護ベッドはレンタルできます。"
      }
    ],
    points: [
      "退院の話が出たら、すぐ医療相談室とケアマネジャー（いなければ地域包括支援センター）に連絡。",
      "訪問看護は主治医の指示で利用します。",
      "介護ベッド・車いすなどはレンタル（福祉用具貸与）で、要介護度により対象が変わります。"
    ],
    links: [["訪問看護を探す", "search.html?cat=houkan"], ["病院・診療所を探す", "search.html?cat=byoin"], ["よくある質問：退院", "faq.html"]]
  }
];

// ---------------------------------------------------------------- HTML

function panelHtml(panel, ep, i) {
  const svg = `<svg viewBox="0 0 400 300" role="img" aria-label="${esc(panel.narr)}" preserveAspectRatio="xMidYMid slice">${BG[panel.bg]}${panel.people.map(([id, opt]) => person(id, opt)).join("")}</svg>`;
  const bubbles = panel.bubbles.map(([x, y, w, text, tail, kind]) =>
    `<p class="bubble ${kind === "think" ? "think" : ""} tail-${tail}" style="left:${x}%;top:${y}%;width:${w}%">${esc(text)}</p>`).join("");
  return `<figure class="panel">
<div class="scene"><span class="koma">${i + 1}</span>${svg}${bubbles}</div>
<figcaption>${esc(panel.narr)}</figcaption>
</figure>`;
}

const cast = ["sakura", "hanako", "houkatsu", "caremane"].map((id) =>
  `<div class="cast-item"><svg viewBox="0 0 100 104" aria-hidden="true">${person(id, { x: 0, y: 2, face: "smile", scale: 1 })}</svg><span>${esc(PEOPLE[id].label)}</span></div>`).join("");

const html = `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>まんがでわかる介護｜かいごナビ</title>
<meta name="description" content="介護保険の申請から、ケアマネジャーとのケアプランづくり、デイサービス、施設の申し込み、退院の準備まで、まんがでやさしく解説します。">
<link rel="stylesheet" href="assets/style.css">
</head>
<body>
<header id="site-header"></header>

<main class="wrap">
  <h1>まんがでわかる介護</h1>
  <p class="lead">はじめて介護に向き合う家族の「さくらさん」と一緒に、介護保険の申請からサービス・施設の利用までの流れを見てみましょう。</p>

  <nav class="tiles ep-tiles" aria-label="お話の一覧">
${EPISODES.map((ep, i) => `    <a class="tile${i === 0 ? " find" : ""}" href="#${ep.id}"><strong>第${i + 1}話 ${esc(ep.title)}</strong><span>${esc(ep.sub)}</span></a>`).join("\n")}
  </nav>

  <div class="cast" aria-label="登場人物">${cast}</div>

${EPISODES.map((ep, i) => `  <section class="episode" id="${ep.id}">
    <h2>第${i + 1}話　${esc(ep.title)}<span class="count">${esc(ep.sub)}</span></h2>
    <div class="panels">
${ep.panels.map((p, j) => panelHtml(p, ep, j)).join("\n")}
    </div>
    <div class="tip"><strong>この話のポイント</strong>
      <ul>${ep.points.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
      <div class="btn-row">${ep.links.map(([t, h]) => `<a class="btn secondary" href="${h}">${esc(t)}</a>`).join("")}</div>
    </div>
    ${i < EPISODES.length - 1 ? `<p style="text-align:right"><a href="#${EPISODES[i + 1].id}">次の話：第${i + 2}話 ${esc(EPISODES[i + 1].title)} →</a></p>` : ""}
  </section>`).join("\n\n")}

  <p class="note">まんがは一般的な例です。使えるサービスや手続きは、要介護度・地域・家族の状況によって変わります。くわしくは地域包括支援センターやケアマネジャーにご相談ください。</p>
</main>

<footer id="site-footer"></footer>
<script src="assets/main.js"></script>
</body>
</html>
`;

fs.writeFileSync(path.join(ROOT, "manga.html"), html);
console.log("manga.html を生成しました");
