const BACKEND_URL = process.env.IMAGE_ANALYSIS_URL ?? "http://localhost:8000";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("frame") as File | null;

  if (!file) {
    return Response.json(
      { error: "フレーム画像が必要です" },
      { status: 400 }
    );
  }

  const backendForm = new FormData();
  backendForm.append("file", file);

  try {
    const res = await fetch(`${BACKEND_URL}/api/analyze-frame`, {
      method: "POST",
      body: backendForm,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Backend error" }));
      return Response.json(
        { error: err.detail ?? "画像解析バックエンドでエラーが発生しました" },
        { status: res.status }
      );
    }

    const data = await res.json();
    return Response.json(data);
  } catch {
    return Response.json(
      { error: "画像解析バックエンドに接続できません。バックエンドが起動しているか確認してください。" },
      { status: 503 }
    );
  }
}
