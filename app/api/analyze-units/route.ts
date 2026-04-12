import Anthropic from "@anthropic-ai/sdk";

const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_VISION_MODEL ?? "llama3.2-vision";
const LLM_PROVIDER = process.env.LLM_PROVIDER ?? "ollama"; // "ollama" | "claude"

const UNIT_COUNT_PROMPT = `あなたはClash of Clansのリプレイ画像を分析する専門家です。
この攻撃フレーム画像を見て、画面上に見える**攻撃側のユニット（自軍）**の残数を数えてください。

以下のカテゴリごとに数えてください：
- heroes: ヒーロー（バーバリアンキング、アーチャークイーン、グランドウォーデン、ロイヤルチャンピオン等）
- tanks: タンク系（ゴーレム、イエティ、ジャイアント等）
- dps: 火力系（ウィザード、ボウラー、ウィッチ、バルキリー等）
- support: サポート系（ヒーラー等）
- spells_active: 画面上で発動中のスペルエフェクト数
- siege: 攻城兵器
- total: 全ユニット合計の概算

また、この時点の攻撃状況を1行で簡潔に説明してください（例：「タウンホール付近でインフェルノに焼かれている」）

必ず以下のJSON形式のみで返答してください。他のテキストは不要です：
{"heroes":数,"tanks":数,"dps":数,"support":数,"spells_active":数,"siege":数,"total":数,"note":"状況説明"}`;

interface FrameAnalysis {
  timestamp: string;
  heroes: number;
  tanks: number;
  dps: number;
  support: number;
  spells_active: number;
  siege: number;
  total: number;
  note: string;
}

async function analyzeWithOllama(base64Data: string): Promise<string> {
  const res = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt: UNIT_COUNT_PROMPT,
      images: [base64Data],
      stream: false,
    }),
  });

  if (!res.ok) {
    throw new Error(`Ollama error: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  return data.response ?? "";
}

async function analyzeWithClaude(
  client: Anthropic,
  mediaType: string,
  base64Data: string
): Promise<string> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 300,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType as
                | "image/jpeg"
                | "image/png"
                | "image/gif"
                | "image/webp",
              data: base64Data,
            },
          },
          { type: "text", text: UNIT_COUNT_PROMPT },
        ],
      },
    ],
  });

  return response.content[0].type === "text" ? response.content[0].text : "";
}

function parseAnalysis(text: string, ts: string): FrameAnalysis | null {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      timestamp: ts,
      heroes: parsed.heroes ?? 0,
      tanks: parsed.tanks ?? 0,
      dps: parsed.dps ?? 0,
      support: parsed.support ?? 0,
      spells_active: parsed.spells_active ?? 0,
      siege: parsed.siege ?? 0,
      total: parsed.total ?? 0,
      note: parsed.note ?? "",
    };
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const provider = LLM_PROVIDER;

  if (provider === "claude") {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: "ANTHROPIC_API_KEYが設定されていません" },
        { status: 500 }
      );
    }
  }

  const body = await request.json();
  const { frames, timestamps }: { frames: string[]; timestamps: string[] } =
    body;

  if (!frames?.length) {
    return Response.json({ error: "フレームが必要です" }, { status: 400 });
  }

  // Sample every 5 seconds (every 5th frame if 1-sec interval)
  const sampleInterval = 5;
  const sampledIndices: number[] = [];
  for (let i = 0; i < frames.length; i += sampleInterval) {
    sampledIndices.push(i);
  }
  if (sampledIndices[sampledIndices.length - 1] !== frames.length - 1) {
    sampledIndices.push(frames.length - 1);
  }

  const client =
    provider === "claude"
      ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
      : null;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const results: FrameAnalysis[] = [];

      controller.enqueue(
        encoder.encode(
          JSON.stringify({
            type: "info",
            provider,
            model: provider === "ollama" ? OLLAMA_MODEL : "claude-sonnet-4",
          }) + "\n"
        )
      );

      for (let si = 0; si < sampledIndices.length; si++) {
        const idx = sampledIndices[si];
        const frame = frames[idx];
        const ts = timestamps[idx] ?? `${idx}s`;

        controller.enqueue(
          encoder.encode(
            JSON.stringify({
              type: "progress",
              current: si + 1,
              total: sampledIndices.length,
              timestamp: ts,
            }) + "\n"
          )
        );

        try {
          const match = frame.match(/^data:(image\/\w+);base64,(.+)$/);
          if (!match) continue;

          let text: string;
          if (provider === "ollama") {
            text = await analyzeWithOllama(match[2]);
          } else {
            text = await analyzeWithClaude(client!, match[1], match[2]);
          }

          const analysis = parseAnalysis(text, ts);
          if (analysis) {
            results.push(analysis);
            controller.enqueue(
              encoder.encode(
                JSON.stringify({ type: "frame_result", data: analysis }) + "\n"
              )
            );
          }
        } catch (err) {
          console.error(`Frame analysis error at ${ts}:`, err);
        }
      }

      controller.enqueue(
        encoder.encode(
          JSON.stringify({ type: "complete", results }) + "\n"
        )
      );
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
