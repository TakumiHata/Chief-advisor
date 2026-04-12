import { NextRequest } from "next/server";

const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_CHAT_MODEL ?? "llama3.2-vision";

const SYSTEM_PROMPT = `あなたはClash of Clansの攻略アドバイザーです。
TH18の攻撃リプレイの分析データに基づいて、以下の観点で日本語でアドバイスしてください：

- 攻撃全体の流れの評価
- ユニットが大量に失われたタイミングとその原因の推測
- 良かった点（ファネリング・呪文タイミング・ヒーロー動線など）
- 改善できる点（具体的なタイムスタンプを引用して）
- 次回への提案

ユニット残数データの「note」フィールドに各時点の状況が記録されています。
残数が急減しているポイントに注目して、原因と対策を分析してください。`;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

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

function buildAnalysisContext(analysisResults: FrameAnalysis[]): string {
  if (!analysisResults?.length) return "";

  let context = "【ユニット残数タイムライン】\n";
  context += "時間 | 合計 | ヒーロー | タンク | 火力 | サポート | 攻城 | 状況\n";
  context += "---|---|---|---|---|---|---|---\n";

  for (const r of analysisResults) {
    context += `${r.timestamp} | ${r.total} | ${r.heroes} | ${r.tanks} | ${r.dps} | ${r.support} | ${r.siege} | ${r.note}\n`;
  }

  // Highlight big drops
  const drops: string[] = [];
  for (let i = 1; i < analysisResults.length; i++) {
    const loss = analysisResults[i - 1].total - analysisResults[i].total;
    if (loss >= 3) {
      drops.push(
        `${analysisResults[i - 1].timestamp}→${analysisResults[i].timestamp}: -${loss}体 (${analysisResults[i].note})`
      );
    }
  }

  if (drops.length > 0) {
    context += "\n【大量ロストポイント】\n";
    for (const d of drops) {
      context += `- ${d}\n`;
    }
  }

  return context;
}

function buildPlayerContext(playerData: Record<string, unknown> | null): string {
  if (!playerData) return "";

  let text = `【プレイヤー情報】\nタグ: ${playerData.tag}\nTH: ${playerData.townHallLevel}\n`;
  if (Array.isArray(playerData.heroes)) {
    text += `ヒーロー: ${playerData.heroes.map((h: { name: string; level: number }) => `${h.name}(Lv${h.level})`).join(", ")}\n`;
  }
  if (Array.isArray(playerData.equipment) && playerData.equipment.length) {
    text += `装備: ${playerData.equipment.map((e: { name: string; level: number }) => `${e.name}(Lv${e.level})`).join(", ")}\n`;
  }
  if (Array.isArray(playerData.pets) && playerData.pets.length) {
    text += `ペット: ${playerData.pets.map((p: { name: string; level: number }) => `${p.name}(Lv${p.level})`).join(", ")}\n`;
  }
  return text + "\n";
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { playerData, messages, userMessage, analysisResults } = body;

  const history = (messages as ChatMessage[] ?? [])
    .map((m) => `${m.role === "user" ? "ユーザー" : "アドバイザー"}: ${m.content}`)
    .join("\n");

  const playerContext = buildPlayerContext(playerData);
  const analysisContext = buildAnalysisContext(analysisResults);

  const prompt = [
    SYSTEM_PROMPT,
    playerContext,
    analysisContext,
    history ? `【会話履歴】\n${history}` : "",
    `ユーザー: ${userMessage}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const encoder = new TextEncoder();

  const readableStream = new ReadableStream({
    async start(controller) {
      try {
        const res = await fetch(`${OLLAMA_URL}/api/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: OLLAMA_MODEL,
            prompt,
            stream: true,
          }),
        });

        if (!res.ok || !res.body) {
          const errText = await res.text().catch(() => "Unknown error");
          controller.enqueue(
            encoder.encode(
              JSON.stringify({
                type: "error",
                message: `Ollama接続エラー (${res.status}): ${errText}`,
              }) + "\n"
            )
          );
          controller.close();
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const data = JSON.parse(line);
              if (data.response) {
                controller.enqueue(
                  encoder.encode(
                    JSON.stringify({ type: "text", content: data.response }) + "\n"
                  )
                );
              }
              if (data.done) {
                controller.enqueue(
                  encoder.encode(JSON.stringify({ type: "done" }) + "\n")
                );
              }
            } catch {
              // skip
            }
          }
        }

        controller.enqueue(
          encoder.encode(JSON.stringify({ type: "done" }) + "\n")
        );
      } catch (error) {
        console.error("Ollama error:", error);
        controller.enqueue(
          encoder.encode(
            JSON.stringify({
              type: "error",
              message: "Ollamaに接続できません。docker compose up -d ollama で起動してください。",
            }) + "\n"
          )
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readableStream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
