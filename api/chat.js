// AI質問用のサーバーレス関数（Vercel の Node.js ランタイム想定）
// 環境変数 ANTHROPIC_API_KEY を設定してデプロイしてください。
// APIキーはブラウザに渡さず、必ずこのサーバー側でだけ使います。
import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-opus-5-5";
const MAX_MESSAGES = 20;
const MAX_CHARS = 2000;

const SYSTEM_PROMPT = `あなたは日本の介護情報サイト「かいごナビ」の相談アシスタントです。
利用者は、家族の介護を始める人、介護中の家族、介護事業を始めたい事業者などです。

回答のしかた：
- やさしい日本語で、専門用語には短い説明を添えてください。
- まず結論や「次にやること」を伝え、そのあと理由や補足を書いてください。長すぎない回答を心がけてください。
- 相談先を案内するときは、地域包括支援センター、市区町村の介護保険窓口、ケアマネジャー（居宅介護支援事業所）、病院の医療相談室など、具体的な窓口名を挙げてください。
- 制度の数字（限度額、負担割合、人員基準など）は2024年度介護報酬改定時点の一般的な内容として伝え、改定や自治体によって異なる可能性があること、最終確認は市区町村や指定権者で行うよう添えてください。
- 確実でないことは推測で断定せず、確認先を案内してください。
- 個別の病状の診断、法律・税務の個別判断はせず、医師・専門家への相談を勧めてください。
- 命に関わる緊急の状況（意識がない、呼吸が苦しい、虐待で危険が迫っているなど）が読み取れる場合は、最初に119番・110番への連絡を案内してください。
- 介護者の疲れや不安には、まず気持ちに寄り添ってから、休む方法や相談先を伝えてください。
- 利用者が個人情報（氏名・住所・電話番号など）を書いた場合、それを繰り返さないでください。

サイト内の関連ページ（必要に応じて案内してください）：
- 介護保険のしくみ: seido.html
- 施設・サービスの種類: shisetsu-shurui.html
- 相談先・施設一覧: shisetsu.html
- 事業者向け 指定要件: jigyo.html
- よくある質問: faq.html
施設を探す公式サイト: 介護サービス情報公表システム https://www.kaigokensaku.mhlw.go.jp/`;

const client = new Anthropic();

function validate(body) {
  const messages = body && Array.isArray(body.messages) ? body.messages : null;
  if (!messages || messages.length === 0 || messages.length > MAX_MESSAGES) return null;
  const clean = [];
  for (const m of messages) {
    if (!m || (m.role !== "user" && m.role !== "assistant")) return null;
    if (typeof m.content !== "string") return null;
    const content = m.content.trim().slice(0, MAX_CHARS);
    if (!content) return null;
    clean.push({ role: m.role, content });
  }
  // 先頭と末尾はユーザーの発言、役割は交互であること
  if (clean[0].role !== "user" || clean[clean.length - 1].role !== "user") return null;
  for (let i = 1; i < clean.length; i++) {
    if (clean[i].role === clean[i - 1].role) return null;
  }
  return clean;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "POST only" });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: "AI is not configured" });
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = null; }
  }
  const messages = validate(body);
  if (!messages) {
    return res.status(400).json({ error: "invalid messages" });
  }

  try {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
      thinking: { type: "adaptive" },
      output_config: { effort: "medium" },
      // 安全分類器で回答が止まった場合に、サーバー側で推奨モデルへ自動フォールバック
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      messages,
    });

    if (response.stop_reason === "refusal") {
      return res.status(200).json({
        reply: "申し訳ありません、この質問にはお答えできませんでした。地域包括支援センターや市区町村の窓口にご相談ください。",
      });
    }

    const reply = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("")
      .trim();

    return res.status(200).json({
      reply: reply || "回答を作成できませんでした。質問を言いかえてもう一度お試しください。",
    });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return res.status(429).json({ error: "rate limited" });
    }
    if (err instanceof Anthropic.AuthenticationError) {
      console.error("Anthropic authentication failed; check ANTHROPIC_API_KEY");
      return res.status(503).json({ error: "AI is not configured" });
    }
    if (err instanceof Anthropic.APIError) {
      console.error("Anthropic API error", err.status, err.message);
      return res.status(502).json({ error: "upstream error" });
    }
    console.error(err);
    return res.status(500).json({ error: "internal error" });
  }
}
