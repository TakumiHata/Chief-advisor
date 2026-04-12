import { extractFrames } from "@/lib/ffmpeg";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("video") as File | null;

  if (!file) {
    return Response.json({ error: "動画ファイルが必要です" }, { status: 400 });
  }

  const validTypes = ["video/mp4", "video/quicktime"];
  if (!validTypes.includes(file.type)) {
    return Response.json(
      { error: "mp4またはmov形式の動画をアップロードしてください" },
      { status: 400 }
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        controller.enqueue(
          encoder.encode(
            JSON.stringify({ type: "progress", message: "動画を読み込み中..." }) + "\n"
          )
        );

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        controller.enqueue(
          encoder.encode(
            JSON.stringify({ type: "progress", message: "フレームを抽出中..." }) + "\n"
          )
        );

        const result = await extractFrames(buffer);

        controller.enqueue(
          encoder.encode(
            JSON.stringify({
              type: "complete",
              frames: result.frames,
              timestamps: result.timestamps,
            }) + "\n"
          )
        );
      } catch (error) {
        console.error("Frame extraction error:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        controller.enqueue(
          encoder.encode(
            JSON.stringify({
              type: "error",
              message: `フレーム抽出に失敗しました: ${errorMessage}`,
            }) + "\n"
          )
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
