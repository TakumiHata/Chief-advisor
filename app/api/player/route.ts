import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const tag = request.nextUrl.searchParams.get("tag");
  if (!tag) {
    return NextResponse.json({ error: "プレイヤータグが必要です" }, { status: 400 });
  }

  const token = process.env.COC_API_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "COC_API_TOKENが設定されていません" }, { status: 500 });
  }

  const encodedTag = encodeURIComponent(tag);
  const res = await fetch(
    `https://api.clashofclans.com/v1/players/${encodedTag}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json(
      { error: `CoC API エラー: ${res.status}`, detail: text },
      { status: res.status }
    );
  }

  const data = await res.json();

  return NextResponse.json({
    name: data.name,
    tag: data.tag,
    townHallLevel: data.townHallLevel,
    troops: data.troops ?? [],
    heroes: data.heroes ?? [],
    spells: data.spells ?? [],
  });
}
