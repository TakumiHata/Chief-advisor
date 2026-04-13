"""YouTube data collection router — search videos and collect CoC strategy data."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services import youtube_collector

router = APIRouter()


class SearchRequest(BaseModel):
    query: str | None = None
    max_results: int = 10


class VideoResult(BaseModel):
    video_id: str
    title: str
    channel: str
    published_at: str
    view_count: int
    like_count: int
    description: str
    tags: list[str]


class SearchResponse(BaseModel):
    videos: list[VideoResult]


class CommentsRequest(BaseModel):
    video_id: str
    max_comments: int = 100
    filter_relevant: bool = True


class CommentResult(BaseModel):
    video_id: str
    author: str
    text: str
    like_count: int
    published_at: str
    matched_keywords: list[str]


class CommentsResponse(BaseModel):
    comments: list[CommentResult]


class CollectRequest(BaseModel):
    query: str | None = None
    max_videos: int = 5
    max_comments_per_video: int = 50


class CollectResponse(BaseModel):
    videos_processed: int
    total_ingested: int
    videos: list[dict]


@router.post("/youtube/search", response_model=SearchResponse)
async def search(req: SearchRequest):
    """Search YouTube for CoC strategy videos."""
    try:
        videos = youtube_collector.search_videos(
            query=req.query, max_results=req.max_results
        )
        return SearchResponse(videos=[VideoResult(**v) for v in videos])
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"YouTube API error: {e}")


@router.post("/youtube/comments", response_model=CommentsResponse)
async def comments(req: CommentsRequest):
    """Collect relevant comments from a YouTube video."""
    try:
        results = youtube_collector.collect_comments(
            video_id=req.video_id,
            max_comments=req.max_comments,
            filter_relevant=req.filter_relevant,
        )
        return CommentsResponse(comments=[CommentResult(**c) for c in results])
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"YouTube API error: {e}")


@router.post("/youtube/collect", response_model=CollectResponse)
async def collect(req: CollectRequest):
    """Search videos, collect comments, and ingest everything into the knowledge base."""
    try:
        result = youtube_collector.collect_and_ingest(
            query=req.query,
            max_videos=req.max_videos,
            max_comments_per_video=req.max_comments_per_video,
        )
        return CollectResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"YouTube API error: {e}")
