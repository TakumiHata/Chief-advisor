import { NextRequest } from "next/server";

const BACKEND_URL = process.env.IMAGE_ANALYSIS_URL ?? "http://localhost:8000";

export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  const action = url.searchParams.get("action") ?? "search";

  const endpoint = {
    search: "/api/youtube/search",
    comments: "/api/youtube/comments",
    collect: "/api/youtube/collect",
  }[action];

  if (!endpoint) {
    return Response.json({ error: "Invalid action" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const res = await fetch(`${BACKEND_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Unknown error" }));
      return Response.json(
        { error: err.detail ?? "YouTube API error" },
        { status: res.status }
      );
    }

    return Response.json(await res.json());
  } catch {
    return Response.json(
      { error: "バックエンドに接続できません" },
      { status: 503 }
    );
  }
}
