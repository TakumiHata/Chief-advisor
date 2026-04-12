import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const SYSTEM_PROMPT = `あなたはClash of Clansの攻略アドバイザーです。
TH18・スーパーイエティ編成の専門家として、
アップロードされたリプレイ動画のフレームを時系列で分析し、
以下の観点で日本語で振り返りをサポートしてください：
- 良かった点（ファネリング・呪文タイミング・ヒーロー動線など）
- 改善できる点（どのフレームで何が問題だったか具体的に）
- 次回への提案
フレームの番号やタイムスタンプを引用しながら具体的に指摘してください。`;

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "ANTHROPIC_API_KEYが設定されていません" },
      { status: 500 }
    );
  }

  const body = await request.json();
  const { playerData, frames, selectedFrameIndex, messages, userMessage } =
    body;

  const client = new Anthropic({ apiKey });

  const conversationMessages: Anthropic.MessageParam[] = [];

  if (messages && Array.isArray(messages)) {
    for (const msg of messages) {
      conversationMessages.push({
        role: msg.role,
        content: msg.content,
      });
    }
  }

  const userContent: Anthropic.ContentBlockParam[] = [];

  let textMessage = "";
  if (playerData) {
    textMessage += `【プレイヤー情報】\nタグ: ${playerData.tag}\nTH: ${playerData.townHallLevel}\n`;
    textMessage += `ヒーロー: ${playerData.heroes?.map((h: { name: string; level: number }) => `${h.name}(Lv${h.level})`).join(", ") ?? "なし"}\n`;
    if (playerData.equipment?.length) {
      textMessage += `装備: ${playerData.equipment.map((e: { name: string; level: number }) => `${e.name}(Lv${e.level})`).join(", ")}\n`;
    }
    if (playerData.pets?.length) {
      textMessage += `ペット: ${playerData.pets.map((p: { name: string; level: number }) => `${p.name}(Lv${p.level})`).join(", ")}\n`;
    }
    textMessage += "\n";
  }

  textMessage += userMessage;
  userContent.push({ type: "text", text: textMessage });

  if (frames && Array.isArray(frames) && frames.length > 0) {
    if (selectedFrameIndex !== null && selectedFrameIndex !== undefined) {
      const frame = frames[selectedFrameIndex];
      if (frame) {
        const match = frame.match(/^data:(image\/\w+);base64,(.+)$/);
        if (match) {
          userContent.push({
            type: "text",
            text: `【選択中のフレーム: #${selectedFrameIndex + 1}】`,
          });
          userContent.push({
            type: "image",
            source: {
              type: "base64",
              media_type: match[1] as
                | "image/jpeg"
                | "image/png"
                | "image/gif"
                | "image/webp",
              data: match[2],
            },
          });
        }
      }
    } else {
      const framesToSend = frames.slice(0, 10);
      for (let i = 0; i < framesToSend.length; i++) {
        const match = framesToSend[i].match(/^data:(image\/\w+);base64,(.+)$/);
        if (match) {
          userContent.push({
            type: "text",
            text: `【フレーム #${i + 1}】`,
          });
          userContent.push({
            type: "image",
            source: {
              type: "base64",
              media_type: match[1] as
                | "image/jpeg"
                | "image/png"
                | "image/gif"
                | "image/webp",
              data: match[2],
            },
          });
        }
      }
    }
  }

  conversationMessages.push({ role: "user", content: userContent });

  try {
    const stream = client.messages.stream({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: conversationMessages,
    });

    const encoder = new TextEncoder();

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              controller.enqueue(
                encoder.encode(
                  JSON.stringify({
                    type: "text",
                    content: event.delta.text,
                  }) + "\n"
                )
              );
            }
          }
          controller.enqueue(
            encoder.encode(JSON.stringify({ type: "done" }) + "\n")
          );
        } catch (error) {
          console.error("Streaming error:", error);
          controller.enqueue(
            encoder.encode(
              JSON.stringify({
                type: "error",
                message: "AIからの応答取得に失敗しました",
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
  } catch (error) {
    console.error("Anthropic API error:", error);
    return Response.json(
      { error: "AIからの応答取得に失敗しました" },
      { status: 500 }
    );
  }
}
