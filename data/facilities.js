// 相談先・施設データ
// ------------------------------------------------------------
// ここに地域の施設情報を追加・編集してください。
// 「sample: true」の行は表示確認用の架空データです。実データに差し替えたら削除してください。
//
// type の値：
//   houkatsu  地域包括支援センター
//   kyotaku   居宅介護支援事業所（ケアマネ事業所・在宅介護支援センター）
//   gyosei    市区町村の介護保険窓口
//   tokuyo    特別養護老人ホーム
//   rouken    介護老人保健施設
//   gh        グループホーム
//   satoko    サービス付き高齢者向け住宅
//   yuryo     有料老人ホーム
//   day       デイサービス・デイケア
//   houmon    訪問介護・訪問看護
//   hotline   全国の電話相談窓口
//
// 項目：name（名称）, type, area（市区町村・地区）, address（住所）, tel（電話）,
//       hours（受付時間）, url（ホームページ）, note（メモ：空き状況・対応内容など）
// ------------------------------------------------------------
window.FACILITY_TYPES = {
  houkatsu: "地域包括支援センター",
  kyotaku: "居宅介護支援事業所",
  gyosei: "市区町村の介護保険窓口",
  tokuyo: "特別養護老人ホーム",
  rouken: "介護老人保健施設",
  gh: "グループホーム",
  satoko: "サ高住",
  yuryo: "有料老人ホーム",
  day: "デイサービス・デイケア",
  houmon: "訪問介護・訪問看護",
  hotline: "全国の電話相談"
};

window.FACILITIES = [
  // ---- 全国の電話相談窓口（実在） ----
  {
    type: "hotline",
    name: "救急車（命に関わる緊急時）",
    area: "全国",
    tel: "119",
    hours: "24時間",
    note: "意識がない、呼吸が苦しい、激しい痛みなど。"
  },
  {
    type: "hotline",
    name: "救急安心センター事業（救急車を呼ぶか迷ったとき）",
    area: "実施地域のみ",
    tel: "#7119",
    hours: "地域により異なる",
    url: "https://www.fdma.go.jp/mission/enrichment/appropriate/appropriate007.html",
    note: "実施していない地域もあります。総務省消防庁のページで確認できます。"
  },
  {
    type: "hotline",
    name: "認知症の電話相談（公益社団法人 認知症の人と家族の会）",
    area: "全国",
    tel: "0120-294-456",
    hours: "平日 10:00〜15:00（祝日を除く）",
    url: "https://www.alzheimer.or.jp/",
    note: "認知症の介護経験者などが相談に応じます。受付時間は変更されることがあります。"
  },
  {
    type: "hotline",
    name: "よりそいホットライン（一般社団法人 社会的包摂サポートセンター）",
    area: "全国",
    tel: "0120-279-338",
    hours: "24時間",
    url: "https://www.since2011.net/yorisoi/",
    note: "介護疲れなど、暮らしの悩み全般の相談。"
  },
  {
    type: "hotline",
    name: "介護サービス情報公表システム（厚生労働省）",
    area: "全国",
    url: "https://www.kaigokensaku.mhlw.go.jp/",
    note: "全国の介護事業所・施設を、地域やサービスの種類から検索できます。"
  },

  // ---- 以下はサンプル（架空）データ。地域の実データに差し替えてください ----
  {
    sample: true,
    type: "gyosei",
    name: "〇〇市役所 介護保険課",
    area: "〇〇市",
    address: "〇〇県〇〇市本町1-1-1 市役所本庁舎2階",
    tel: "000-000-0001",
    hours: "平日 8:30〜17:15",
    note: "要介護認定の申請、負担限度額認定、介護保険料の相談。"
  },
  {
    sample: true,
    type: "houkatsu",
    name: "〇〇市 中央地域包括支援センター",
    area: "〇〇市 中央地区",
    address: "〇〇県〇〇市中央2-3-4 〇〇福祉センター1階",
    tel: "000-000-0002",
    hours: "月〜土 8:30〜17:30（夜間・休日は電話転送）",
    note: "担当：本町・中央・駅前地区。訪問相談可。"
  },
  {
    sample: true,
    type: "houkatsu",
    name: "〇〇市 北部地域包括支援センター",
    area: "〇〇市 北部地区",
    address: "〇〇県〇〇市北町5-6-7",
    tel: "000-000-0003",
    hours: "平日 8:30〜17:30",
    note: "担当：北町・山手地区。"
  },
  {
    sample: true,
    type: "kyotaku",
    name: "ケアプランセンター〇〇",
    area: "〇〇市 中央地区",
    address: "〇〇県〇〇市中央1-2-3",
    tel: "000-000-0011",
    hours: "平日 9:00〜18:00",
    note: "主任ケアマネジャー在籍。新規受付可（要確認）。"
  },
  {
    sample: true,
    type: "kyotaku",
    name: "〇〇在宅介護支援センター",
    area: "〇〇市 南部地区",
    address: "〇〇県〇〇市南町8-9-10",
    tel: "000-000-0012",
    hours: "平日 8:30〜17:30"
  },
  {
    sample: true,
    type: "tokuyo",
    name: "特別養護老人ホーム 〇〇の里",
    area: "〇〇市 北部地区",
    address: "〇〇県〇〇市北町11-12",
    tel: "000-000-0021",
    hours: "見学 平日 10:00〜16:00（要予約）",
    note: "定員80名（ユニット型）。ショートステイ併設。"
  },
  {
    sample: true,
    type: "rouken",
    name: "介護老人保健施設 〇〇苑",
    area: "〇〇市 東部地区",
    address: "〇〇県〇〇市東町3-4",
    tel: "000-000-0031",
    note: "通所リハビリ併設。在宅復帰支援。"
  },
  {
    sample: true,
    type: "gh",
    name: "グループホーム 〇〇の家",
    area: "〇〇市 中央地区",
    address: "〇〇県〇〇市中央4-5-6",
    tel: "000-000-0041",
    note: "2ユニット18名。〇〇市に住民票がある方が対象。"
  },
  {
    sample: true,
    type: "satoko",
    name: "サービス付き高齢者向け住宅 〇〇レジデンス",
    area: "〇〇市 駅前地区",
    address: "〇〇県〇〇市駅前7-8-9",
    tel: "000-000-0051",
    note: "全30戸。日中常駐スタッフによる安否確認・生活相談。訪問介護事業所併設。"
  },
  {
    sample: true,
    type: "yuryo",
    name: "介護付き有料老人ホーム 〇〇ガーデン",
    area: "〇〇市 南部地区",
    address: "〇〇県〇〇市南町1-1",
    tel: "000-000-0061",
    note: "入居一時金なしプランあり。看護師日中常駐。"
  },
  {
    sample: true,
    type: "day",
    name: "デイサービスセンター 〇〇",
    area: "〇〇市 東部地区",
    address: "〇〇県〇〇市東町9-9",
    tel: "000-000-0071",
    hours: "月〜土 9:00〜16:30",
    note: "送迎あり。入浴・機能訓練。"
  },
  {
    sample: true,
    type: "houmon",
    name: "〇〇訪問看護ステーション",
    area: "〇〇市 全域",
    address: "〇〇県〇〇市中央6-7-8",
    tel: "000-000-0081",
    hours: "24時間対応（緊急時）",
    note: "看取り・医療処置に対応。"
  }
];
