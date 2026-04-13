"""YouTube Data API v3 を使ったCoC攻略動画のメタデータ・コメント収集."""

from __future__ import annotations

import re
from dataclasses import dataclass, field, asdict
from datetime import datetime

from googleapiclient.discovery import build

from app.config import settings

# 検索に使うデフォルトクエリ
DEFAULT_QUERIES = [
    "TH18 スーパーイエティ 全壊",
    "TH18 super yeti 3 star",
    "TH18 attack strategy 2025",
    "クラクラ TH18 全壊編成",
]

# コメントから編成情報を抽出するキーワード
COMP_KEYWORDS = [
    "イエティ", "スーパーイエティ", "ゴーレム", "ラヴァ", "ドラゴン",
    "エレクトロ", "ペッカ", "ボウラー", "ウィッチ", "ホグ",
    "yeti", "super yeti", "golem", "lava", "dragon", "electro",
    "pekka", "bowler", "witch", "hog",
    "全壊", "3 star", "three star", "100%",
    "ファネリング", "クイヒー", "スイヒー",
    "funneling", "queen walk", "queen charge",
]

COMP_PATTERN = re.compile("|".join(re.escape(k) for k in COMP_KEYWORDS), re.IGNORECASE)


@dataclass
class VideoInfo:
    video_id: str
    title: str
    channel: str
    published_at: str
    view_count: int = 0
    like_count: int = 0
    description: str = ""
    tags: list[str] = field(default_factory=list)


@dataclass
class CommentInfo:
    video_id: str
    author: str
    text: str
    like_count: int = 0
    published_at: str = ""
    matched_keywords: list[str] = field(default_factory=list)


def _get_youtube():
    if not settings.youtube_api_key:
        raise ValueError("CA_YOUTUBE_API_KEY が設定されていません")
    return build("youtube", "v3", developerKey=settings.youtube_api_key)


def search_videos(
    query: str | None = None,
    max_results: int = 10,
) -> list[dict]:
    """YouTube Data API で動画を検索し、メタデータを取得する."""
    youtube = _get_youtube()
    q = query or DEFAULT_QUERIES[0]

    search_resp = youtube.search().list(
        part="snippet",
        q=q,
        type="video",
        maxResults=min(max_results, 50),
        order="relevance",
        relevanceLanguage="ja",
    ).execute()

    video_ids = [item["id"]["videoId"] for item in search_resp.get("items", [])]
    if not video_ids:
        return []

    # 統計情報を取得
    stats_resp = youtube.videos().list(
        part="snippet,statistics",
        id=",".join(video_ids),
    ).execute()

    results = []
    for item in stats_resp.get("items", []):
        snippet = item["snippet"]
        stats = item.get("statistics", {})
        info = VideoInfo(
            video_id=item["id"],
            title=snippet["title"],
            channel=snippet["channelTitle"],
            published_at=snippet["publishedAt"],
            view_count=int(stats.get("viewCount", 0)),
            like_count=int(stats.get("likeCount", 0)),
            description=snippet.get("description", ""),
            tags=snippet.get("tags", []),
        )
        results.append(asdict(info))

    return results


def collect_comments(
    video_id: str,
    max_comments: int = 100,
    filter_relevant: bool = True,
) -> list[dict]:
    """動画のコメントを収集し、CoC関連のものをフィルタリングする."""
    youtube = _get_youtube()

    comments: list[CommentInfo] = []
    page_token = None

    while len(comments) < max_comments:
        resp = youtube.commentThreads().list(
            part="snippet",
            videoId=video_id,
            maxResults=min(max_comments - len(comments), 100),
            order="relevance",
            pageToken=page_token,
            textFormat="plainText",
        ).execute()

        for item in resp.get("items", []):
            top = item["snippet"]["topLevelComment"]["snippet"]
            text = top["textDisplay"]
            matched = list(set(COMP_PATTERN.findall(text)))

            comment = CommentInfo(
                video_id=video_id,
                author=top["authorDisplayName"],
                text=text,
                like_count=int(top.get("likeCount", 0)),
                published_at=top.get("publishedAt", ""),
                matched_keywords=matched,
            )

            if filter_relevant and not matched:
                continue

            comments.append(comment)

        page_token = resp.get("nextPageToken")
        if not page_token:
            break

    return [asdict(c) for c in comments]


def collect_and_ingest(
    query: str | None = None,
    max_videos: int = 5,
    max_comments_per_video: int = 50,
) -> dict:
    """動画検索→コメント収集→ChromaDBへの投入を一括実行する."""
    from app.services import knowledge_store

    videos = search_videos(query=query, max_results=max_videos)
    total_ingested = 0
    video_summaries = []

    for video in videos:
        vid = video["video_id"]
        title = video["title"]

        # 動画のメタデータをナレッジとして投入
        desc_snippet = video["description"][:300] if video["description"] else ""
        doc_text = f"YouTube動画「{title}」(再生数{video['view_count']:,}, いいね{video['like_count']:,}): {desc_snippet}"
        tags_str = ", ".join(video.get("tags", [])[:10])
        if tags_str:
            doc_text += f" タグ: {tags_str}"

        knowledge_store.add_documents(
            documents=[doc_text],
            metadatas=[{
                "category": "youtube_video",
                "video_id": vid,
                "channel": video["channel"],
                "source": "youtube",
            }],
            ids=[f"yt_video_{vid}"],
        )
        total_ingested += 1

        # コメントを収集・投入
        try:
            comments = collect_comments(
                video_id=vid,
                max_comments=max_comments_per_video,
                filter_relevant=True,
            )
        except Exception:
            comments = []

        for i, comment in enumerate(comments):
            doc_text = f"「{title}」へのコメント(いいね{comment['like_count']}): {comment['text'][:500]}"
            knowledge_store.add_documents(
                documents=[doc_text],
                metadatas=[{
                    "category": "youtube_comment",
                    "video_id": vid,
                    "keywords": ", ".join(comment["matched_keywords"]),
                    "source": "youtube",
                }],
                ids=[f"yt_comment_{vid}_{i}"],
            )
            total_ingested += 1

        video_summaries.append({
            "video_id": vid,
            "title": title,
            "comments_collected": len(comments),
        })

    return {
        "videos_processed": len(videos),
        "total_ingested": total_ingested,
        "videos": video_summaries,
    }
