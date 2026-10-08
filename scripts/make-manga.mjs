#!/usr/bin/env node
// 「まんがでわかる介護」ページ（manga.html）を生成するスクリプト
// 登場人物の絵は assets/manga/*.png、背景はSVGで描いています。
// セリフや話を変えたいときは EPISODES を編集して
//   node scripts/make-manga.mjs
// を実行すると manga.html が作り直されます。

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

// ---------------------------------------------------------------- 登場人物

// h: コマの高さに対する身長（%）。画像はすべて高さ640px。
const PEOPLE = {
  sakura: { img: "musume", label: "娘のさくら", h: 70 },
  "sakura-worry": { img: "musume-worry", label: "娘のさくら（困り顔）", h: 70, hidden: true },
  "sakura-cry": { img: "musume-cry", label: "娘のさくら（泣き顔）", h: 70, hidden: true },
  hanako: { img: "obaachan", label: "母のはなこ", h: 64 },
  masao: { img: "ojiichan", label: "父のまさお", h: 67 },
  houkatsu: { img: "houkatsu", label: "包括の職員", h: 70 },
  caremane: { img: "caremane", label: "ケアマネの田中さん", h: 72 }
};
const SIZE = Object.fromEntries(Object.keys(PEOPLE).map((id) => {
  const buf = fs.readFileSync(path.join(ROOT, "assets/manga", PEOPLE[id].img + ".png"));
  return [id, { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) }];
}));

// x: 左端からの位置（%）
function actor(id, x) {
  const p = PEOPLE[id];
  return `<img class="actor" src="assets/manga/${p.img}.png" alt="" width="${SIZE[id].w}" height="${SIZE[id].h}" style="left:${x}%;height:${p.h}%" loading="lazy">`;
}

// ---------------------------------------------------------------- 背景

// 写真の背景（assets/manga/bg/*.jpg）。pos は object-position（どこを中心に切り取るか）
const PHOTO = {
  living: { file: "living", pos: "45% 50%" },
  kitchen: { file: "kitchen", pos: "60% 50%" },
  hospital: { file: "hospital", pos: "40% 50%" },
  houkatsu: { file: "houkatsu", pos: "50% 50%" },
  day: { file: "day", pos: "6% 50%" },
  rail: { file: "rail", pos: "20% 50%" },
  night: { file: "night", pos: "50% 50%" },
  facility: { file: "facility", pos: "50% 50%" },
  bed: { file: "bed", pos: "60% 50%" }
};

const BG = {
  home: `<rect width="400" height="300" fill="#fffaf2"/><rect y="250" width="400" height="50" fill="#f0e2cc"/><rect x="292" y="34" width="78" height="70" fill="#e6f3fb" stroke="#c9b79c" stroke-width="3"/><path d="M331 34 V104 M292 69 H370" stroke="#c9b79c" stroke-width="3"/><rect x="18" y="200" width="22" height="50" fill="#b8d98a"/><circle cx="29" cy="190" r="16" fill="#a8d164"/>`,
  night: `<rect width="400" height="300" fill="#eef0f6"/><rect y="250" width="400" height="50" fill="#dcdcea"/><rect x="292" y="34" width="78" height="70" fill="#4a5a7a" stroke="#b9b6c9" stroke-width="3"/><circle cx="348" cy="56" r="10" fill="#fff4c2"/><rect x="20" y="214" width="90" height="36" fill="#d9c4a5"/>`,
  office: `<rect width="400" height="300" fill="#f6faef"/><rect x="120" y="22" width="160" height="34" fill="#4f8a1f"/><text x="200" y="45" text-anchor="middle" font-size="17" font-weight="700" fill="#fff">地域包括支援センター</text><rect y="236" width="400" height="64" fill="#cfe2ad"/><rect y="230" width="400" height="10" fill="#a8d164"/>`,
  city: `<rect width="400" height="300" fill="#f6faef"/><rect x="120" y="22" width="160" height="34" fill="#4f8a1f"/><text x="200" y="45" text-anchor="middle" font-size="17" font-weight="700" fill="#fff">介護保険の窓口</text><rect y="236" width="400" height="64" fill="#cfe2ad"/><rect y="230" width="400" height="10" fill="#a8d164"/>`,
  day: `<rect width="400" height="300" fill="#fff6ea"/><rect x="200" y="200" width="150" height="32" fill="#e8792b"/><text x="275" y="222" text-anchor="middle" font-size="16" font-weight="700" fill="#fff">デイサービス</text><rect y="250" width="400" height="50" fill="#f3e3c8"/><rect x="210" y="236" width="130" height="14" fill="#c9a56f"/><circle cx="250" cy="228" r="8" fill="#fff" stroke="#c9b79c" stroke-width="2"/>`,
  rail: `<rect width="400" height="300" fill="#fffaf2"/><rect y="250" width="400" height="50" fill="#f0e2cc"/><rect x="250" y="130" width="140" height="10" fill="#a8885a"/><rect x="256" y="140" width="6" height="16" fill="#8a6a45"/><rect x="378" y="140" width="6" height="16" fill="#8a6a45"/><text x="320" y="122" text-anchor="middle" font-size="14" fill="#8a6a45">手すり</text>`,
  facility: `<rect width="400" height="300" fill="#eef6e1"/><rect x="164" y="60" width="176" height="190" fill="#fff" stroke="#c7d3b4" stroke-width="3"/><g fill="#d9ecf7" stroke="#c7d3b4" stroke-width="2"><rect x="182" y="84" width="34" height="28"/><rect x="234" y="84" width="34" height="28"/><rect x="286" y="84" width="34" height="28"/><rect x="182" y="134" width="34" height="28"/><rect x="234" y="134" width="34" height="28"/><rect x="286" y="134" width="34" height="28"/></g><rect x="234" y="196" width="34" height="54" fill="#e8792b"/><rect x="172" y="34" width="160" height="24" fill="#4f8a1f"/><text x="252" y="51" text-anchor="middle" font-size="13" font-weight="700" fill="#fff">特別養護老人ホーム</text><rect y="250" width="400" height="50" fill="#cfe2ad"/>`,
  hospital: `<rect width="400" height="300" fill="#f1f7fb"/><rect y="250" width="400" height="50" fill="#dde8ef"/><rect x="210" y="184" width="176" height="40" fill="#fff" stroke="#a9bccb" stroke-width="3"/><rect x="214" y="168" width="52" height="22" fill="#fff" stroke="#a9bccb" stroke-width="2"/><rect x="210" y="224" width="8" height="26" fill="#a9bccb"/><rect x="378" y="224" width="8" height="26" fill="#a9bccb"/><rect x="230" y="190" width="150" height="22" fill="#cfe7f5"/>`,
  bed: `<rect width="400" height="300" fill="#fffaf2"/><rect y="250" width="400" height="50" fill="#f0e2cc"/><rect x="160" y="176" width="186" height="44" fill="#eaf4dc" stroke="#9cb98a" stroke-width="3"/><rect x="160" y="150" width="12" height="100" fill="#9cb98a"/><rect x="334" y="166" width="12" height="84" fill="#9cb98a"/><text x="253" y="204" text-anchor="middle" font-size="14" fill="#4f8a1f">介護ベッド（レンタル）</text>`
};

// ---------------------------------------------------------------- お話

// people: [人物, 左からの位置%]
// bubbles: [x%, y%, 幅%, 文, しっぽ("l"|"r"|"off"), 種類("say"|"think"), 話し手の名前（コマの外の人）]
const EPISODES = [
  {
    id: "ep1",
    title: "お母さんの様子が気になる",
    sub: "相談から要介護認定の申請まで",
    panels: [
      {
        bg: "kitchen",
        people: [["sakura-worry", 22], ["hanako", 60]],
        bubbles: [[2, 3, 47, "お母さん、最近よく転ぶし、料理もつらそう…", "l"], [52, 3, 45, "大丈夫よ〜、まだまだ元気！", "r"]],
        narr: "ひとり暮らしの母・はなこさん（82歳）。最近、転ぶことが増えてきました。"
      },
      {
        bg: "living",
        people: [["sakura-worry", 42]],
        bubbles: [[4, 3, 62, "まずは母の住む地域の「地域包括支援センター」に電話してみよう", "r", "think"]],
        narr: "介護の相談は、地域包括支援センターへ。相談は無料で、家族だけ・電話だけでも大丈夫です。"
      },
      {
        bg: "houkatsu",
        people: [["houkatsu", 14], ["sakura", 66]],
        bubbles: [[2, 13, 58, "介護保険を使うには「要介護認定」の申請が必要です。代わりに申請もできますよ", "l"], [64, 16, 32, "お願いします！", "r"]],
        narr: "申請は市区町村の窓口へ。センターやケアマネジャーが代わりに申請することもできます。申請にお金はかかりません。"
      },
      {
        bg: "living",
        people: [["hanako", 32], ["sakura-worry", 66]],
        bubbles: [[4, 4, 44, "なんでも自分でできますよ！", "r"], [52, 4, 46, "（本当は夜、トイレで転んだの…）", "r", "think"]],
        narr: "調査員が家に来て、体や生活の様子を聞き取ります。本人は頑張ってしまいがち。ふだんの困りごとは家族が伝えましょう。"
      },
      {
        bg: "living",
        people: [["sakura", 24], ["hanako", 60]],
        bubbles: [[2, 3, 46, "結果が届いた！「要介護1」だって", "l"], [54, 3, 43, "これでサービスが使えるのね", "r"]],
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
        bg: "living",
        people: [["caremane", 8], ["sakura", 46], ["hanako", 72]],
        bubbles: [[2, 3, 56, "ケアマネジャーの田中です。困っていることを教えてください", "l"]],
        narr: "要介護1〜5の人は、ケアマネジャーがいる「居宅介護支援事業所」を選んで契約します。ケアプラン作りの自己負担はありません。"
      },
      {
        bg: "living",
        people: [["hanako", 18], ["caremane", 64]],
        bubbles: [[2, 3, 44, "ひとりでお風呂に入るのがこわいのよ", "l"], [48, 3, 50, "デイサービスで入浴できますよ。送迎もあります", "r"]],
        narr: "本人・家族の希望を聞いて、どのサービスを週に何回使うかの計画（ケアプラン）を作ります。"
      },
      {
        bg: "day",
        people: [["hanako", 22]],
        bubbles: [[52, 18, 44, "はなこさん、お茶をどうぞ", "off", "say", "デイの職員"], [4, 4, 46, "みんなとおしゃべりできて楽しいわ", "l"]],
        narr: "たとえば「デイサービス週2回＋ホームヘルパー週1回」。家族にとっても休める時間になります。"
      },
      {
        bg: "rail",
        people: [["caremane", 10], ["sakura", 44]],
        bubbles: [[2, 3, 58, "手すりは住宅改修で20万円まで介護保険が使えます。工事の前に申請してくださいね", "l"], [64, 4, 34, "知らなかった！", "l"]],
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
        people: [["sakura-cry", 40]],
        bubbles: [[4, 3, 60, "仕事と介護の両立…ちょっと限界かも", "r", "think"]],
        narr: "介護する人が休むことはとても大切。ショートステイ（短期間のお泊まり）も使えます。"
      },
      {
        bg: "living",
        people: [["caremane", 12], ["sakura-worry", 62]],
        bubbles: [[2, 3, 56, "要介護3になったので、特養（特別養護老人ホーム）にも申し込めますよ", "l"], [62, 16, 36, "どこを選べばいいの？", "r"]],
        narr: "特養は原則「要介護3以上」。グループホームや有料老人ホームなど、ほかの住まいも選べます。"
      },
      {
        bg: "facility",
        people: [["hanako", 54], ["sakura", 76]],
        bubbles: [[2, 4, 50, "見学はいつでもどうぞ。お食事もご覧ください", "off", "say", "施設の職員"]],
        narr: "施設は必ず見学を。費用の総額・医療への対応・看取り・退去の条件を確認しましょう。"
      },
      {
        bg: "living",
        people: [["sakura", 24], ["hanako", 60]],
        bubbles: [[2, 3, 48, "いくつかの施設に申し込んでおこう", "l"], [54, 3, 43, "ここなら安心ね", "r"]],
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
    title: "お父さんが入院から家に帰るとき",
    sub: "退院の準備と訪問看護",
    panels: [
      {
        bg: "hospital",
        people: [["sakura-worry", 14]],
        bubbles: [[2, 3, 44, "退院したら、家でみられるかな…", "l", "think"], [48, 3, 50, "退院後のことは、病院の医療相談室にご相談くださいね", "off", "say", "病院の相談員"]],
        narr: "父・まさおさん（85歳）が転んで骨折し、入院。入院中の不安は、病院の医療相談室（医療ソーシャルワーカー）へ。"
      },
      {
        bg: "hospital",
        people: [["caremane", 10], ["sakura", 40]],
        bubbles: [[2, 3, 60, "入院中でも介護保険の申請ができます。退院前にみんなで打ち合わせをしましょう", "l"]],
        narr: "退院前に病院・ケアマネジャー・家族が集まり、家での生活の準備を話し合います。"
      },
      {
        bg: "bed",
        people: [["masao", 14]],
        bubbles: [[44, 3, 54, "週に1回、体調とお薬を見に来ますね", "off", "say", "訪問看護師"], [4, 3, 36, "家はやっぱり落ち着くなあ", "l"]],
        narr: "訪問看護では看護師が家に来て、体調の確認・医療的なケア・お薬の管理などをします。介護ベッドはレンタルできます。"
      }
    ],
    points: [
      "退院の話が出たら、すぐ医療相談室とケアマネジャー（いなければ地域包括支援センター）に連絡。",
      "訪問看護は主治医の指示で利用します。",
      "介護ベッド・車いすなどはレンタル（福祉用具貸与）で、要介護度により対象が変わります。"
    ],
    links: [["訪問看護を探す", "search.html?cat=houkan"], ["病院・診療所を探す", "search.html?cat=byoin"], ["よくある質問：退院", "faq.html"]]
  },
  {
    id: "ep5",
    title: "お母さん、もしかして認知症？",
    sub: "物忘れの相談と受診",
    panels: [
      {
        bg: "kitchen",
        people: [["sakura-worry", 20], ["hanako", 60]],
        bubbles: [[2, 3, 48, "お母さん、お鍋こがしたの今週3回目だよ…", "l"], [54, 3, 43, "あら、そうだったかしら？", "r"]],
        narr: "同じことを何度も聞く、火の消し忘れ、しまい忘れが増える…。気になる変化は、日付と一緒にメモしておきましょう。"
      },
      {
        bg: "houkatsu",
        people: [["houkatsu", 14], ["sakura-worry", 66]],
        bubbles: [[2, 13, 58, "まずはかかりつけ医に相談してみましょう。治療で良くなる病気が隠れていることもあります", "l"], [62, 4, 36, "本人がいやがったら…？", "r"]],
        narr: "相談先はかかりつけ医か地域包括支援センター。正常圧水頭症や甲状腺の病気、薬の影響など、治療で良くなる原因が見つかることもあります。"
      },
      {
        bg: "living",
        people: [["sakura", 24], ["hanako", 60]],
        bubbles: [[2, 3, 50, "血圧のついでに、一緒に健康診断に行こうよ", "l"], [54, 3, 43, "あんたも一緒なら行こうかね", "r"]],
        narr: "「認知症の検査」ではなく「健康診断」として誘うのがコツ。かかりつけ医に事前に様子を伝えておくと、先生から勧めてもらえます。"
      },
      {
        bg: "hospital",
        people: [["sakura", 22], ["hanako", 56]],
        bubbles: [[2, 3, 60, "早く分かったから、使えるサービスや、お金のことも今のうちに話し合えるね", "l"]],
        narr: "早めに分かれば、進行をゆるやかにする治療や支援を早く始められ、本人の意思で将来のことを決められます。"
      }
    ],
    points: [
      "相談先はかかりつけ医か地域包括支援センター。受診をいやがるときは専門職が訪問してくれることも（認知症初期集中支援チーム）",
      "治療で良くなる病気が隠れていることがあるので、早めの受診が大切",
      "判断力があるうちに、お金の管理（成年後見・任意後見など）を家族で話し合う"
    ],
    links: [["親が認知症かもと思ったら", "yomimono/ninchisho.html"], ["グループホームを探す", "search.html?cat=gh"]]
  },
  {
    id: "ep6",
    title: "介護のお金、いくらかかる？",
    sub: "自己負担と軽くする制度",
    panels: [
      {
        bg: "night",
        people: [["sakura-worry", 40]],
        bubbles: [[4, 3, 62, "サービスを増やしたいけど、お金が続くか心配…", "r", "think"]],
        narr: "介護が長くなると、お金の心配も出てきます。まずは「いくらかかるか」を知ることから。"
      },
      {
        bg: "living",
        people: [["caremane", 10], ["sakura", 58]],
        bubbles: [[2, 3, 58, "自己負担は原則1割です。使う回数から、毎月の目安を一緒に計算しましょう", "l"], [62, 4, 36, "1割なんだ！", "r"]],
        narr: "自己負担は原則1割（所得により2〜3割）。要介護度ごとに、1か月に使える上限があります。"
      },
      {
        bg: "living",
        people: [["caremane", 10], ["sakura", 58]],
        bubbles: [[2, 3, 58, "1か月の自己負担が上限をこえたら「高額介護サービス費」で戻ってきますよ", "l"], [62, 4, 36, "施設の食費は？", "r"]],
        narr: "自己負担の上限は所得によって変わります（一般的な世帯で月44,400円）。超えた分は申請すると戻ってきます。"
      },
      {
        bg: "houkatsu",
        people: [["houkatsu", 14], ["sakura", 66]],
        bubbles: [[2, 13, 58, "所得や預貯金が一定以下なら「負担限度額認定」で、施設の食費と部屋代が軽くなります", "l"]],
        narr: "施設やショートステイの食費・部屋代は、市区町村に申請して「負担限度額認定証」を受けると軽くなります。"
      }
    ],
    points: [
      "自己負担は原則1割。上限（区分支給限度額）を超えた分は全額自己負担",
      "1か月の自己負担が上限を超えたら「高額介護サービス費」で戻る",
      "施設の食費・部屋代は「負担限度額認定」で軽くなることがある。医療費と介護費の年間の合算制度もある"
    ],
    links: [["自己負担かんたん計算", "hiyou.html"], ["負担を軽くする制度", "seido.html#relief"]]
  },
  {
    id: "ep7",
    title: "お父さんの「最期は家で」",
    sub: "在宅での看取りと人生会議",
    panels: [
      {
        bg: "bed",
        people: [["masao", 14]],
        bubbles: [[4, 3, 40, "最期は、この家で過ごしたいなあ", "l"], [46, 3, 52, "その気持ち、みんなで話し合っておきましょうね", "off", "say", "訪問看護師"]],
        narr: "病気が進んできたお父さん。「最期は家で」という希望を口にしました。"
      },
      {
        bg: "living",
        people: [["sakura-worry", 20], ["hanako", 58]],
        bubbles: [[2, 3, 50, "延命の治療とか、どうしたいか聞いておかないとね", "l"], [54, 3, 43, "元気なうちに話しておけてよかったわ", "r"]],
        narr: "どこで過ごしたいか、どんな医療を受けたいかを、家族と医療・介護の専門職で話し合っておく。これを「人生会議（ACP）」と言います。"
      },
      {
        bg: "living",
        people: [["caremane", 10], ["sakura", 58]],
        bubbles: [[2, 3, 58, "訪問診療の先生と訪問看護で、24時間支える体制をつくりましょう", "l"]],
        narr: "在宅医（訪問診療）・訪問看護・ケアマネジャーがチームになって、家での療養と看取りを支えます。"
      },
      {
        bg: "bed",
        people: [["sakura", 50]],
        bubbles: [[2, 3, 58, "いざというときは、救急車じゃなくて、まず訪問看護に電話するんだったね", "l", "think"]],
        narr: "家で看取ると決めたら、息を引き取ったときの連絡先（訪問看護・在宅医）と順番を、前もってチームと確認しておきます。"
      }
    ],
    points: [
      "在宅医・訪問看護・ケアマネジャーのチームで、家での看取りを支えられる",
      "受けたい医療やケアを前もって話し合う「人生会議」。気持ちは変わってもいいので、何度でも",
      "いざというときの連絡先と順番を、前もって確認しておく"
    ],
    links: [["在宅での看取りと人生会議", "yomimono/mitori.html"], ["訪問看護を探す", "search.html?cat=houkan"]]
  }
];

// 写真の縦横（JPEGのSOFから読む）
for (const v of Object.values(PHOTO)) {
  const b = fs.readFileSync(path.join(ROOT, "assets/manga/bg", v.file + ".jpg"));
  for (let i = 2; i < b.length; ) {
    const len = b.readUInt16BE(i + 2);
    if (b[i + 1] >= 0xc0 && b[i + 1] <= 0xc3) { v.h = b.readUInt16BE(i + 5); v.w = b.readUInt16BE(i + 7); break; }
    i += 2 + len;
  }
}

// ---------------------------------------------------------------- HTML

function panelHtml(panel, i) {
  const svg = PHOTO[panel.bg]
    ? `<img class="bgphoto" src="assets/manga/bg/${PHOTO[panel.bg].file}.jpg" alt="" width="${PHOTO[panel.bg].w}" height="${PHOTO[panel.bg].h}" style="object-position:${PHOTO[panel.bg].pos}" loading="lazy">`
    : `<svg viewBox="0 0 400 300" aria-hidden="true" preserveAspectRatio="xMidYMid slice">${BG[panel.bg]}</svg>`;
  const actors = panel.people.map(([id, x]) => actor(id, x)).join("");
  const bubbles = panel.bubbles.map(([x, y, w, text, tail, kind, who]) =>
    `<p class="bubble${kind === "think" ? " think" : ""} tail-${tail}" style="left:${x}%;top:${y}%;width:${w}%">${who ? `<span class="who">${esc(who)}</span>` : ""}${esc(text)}</p>`).join("");
  return `<figure class="panel">
<div class="scene" role="img" aria-label="${esc(panel.narr)}"><span class="koma">${i + 1}</span>${svg}${actors}${bubbles}</div>
<figcaption>${esc(panel.narr)}</figcaption>
</figure>`;
}

const cast = Object.keys(PEOPLE).filter((id) => !PEOPLE[id].hidden).map((id) =>
  `<div class="cast-item"><span class="cast-face"><img src="assets/manga/${PEOPLE[id].img}.png" alt="" width="${SIZE[id].w}" height="${SIZE[id].h}"></span><span>${esc(PEOPLE[id].label)}</span></div>`).join("");

const html = `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>まんがでわかる介護｜おやのて</title>
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
${ep.panels.map((p, j) => panelHtml(p, j)).join("\n")}
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
