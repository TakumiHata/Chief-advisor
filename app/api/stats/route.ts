const BACKEND_URL = process.env.IMAGE_ANALYSIS_URL ?? "http://localhost:8000";

export async function GET() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/stats`);
    if (!res.ok) {
      return Response.json({ error: "統計取得に失敗しました" }, { status: res.status });
    }
    return Response.json(await res.json());
  } catch {
    return Response.json(
      { error: "バックエンドに接続できません" },
      { status: 503 }
    );
  }
}
