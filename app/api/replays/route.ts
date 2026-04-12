const BACKEND_URL = process.env.IMAGE_ANALYSIS_URL ?? "http://localhost:8000";

export async function GET() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/replays`);
    if (!res.ok) {
      return Response.json({ error: "リプレイ取得に失敗しました" }, { status: res.status });
    }
    return Response.json(await res.json());
  } catch {
    return Response.json(
      { error: "バックエンドに接続できません" },
      { status: 503 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const res = await fetch(`${BACKEND_URL}/api/replays`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Backend error" }));
      return Response.json({ error: err.detail }, { status: res.status });
    }
    return Response.json(await res.json());
  } catch {
    return Response.json(
      { error: "バックエンドに接続できません" },
      { status: 503 }
    );
  }
}
