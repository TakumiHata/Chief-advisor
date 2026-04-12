from fastapi import APIRouter, HTTPException

from app.schemas.stats import ReplayInput, ReplayRecord, StatsResponse
from app.services.replay_store import delete_replay, get_all_replays, save_replay
from app.services.stats_analysis import analyze_stats

router = APIRouter()


@router.post("/replays", response_model=ReplayRecord)
async def add_replay(data: ReplayInput):
    """Record an attack replay result for statistical tracking."""
    record = save_replay(data.model_dump())
    return ReplayRecord(**record)


@router.get("/replays", response_model=list[ReplayRecord])
async def list_replays():
    """Get all recorded replays."""
    return [ReplayRecord(**r) for r in get_all_replays()]


@router.delete("/replays/{replay_id}")
async def remove_replay(replay_id: int):
    """Delete a replay record."""
    if not delete_replay(replay_id):
        raise HTTPException(status_code=404, detail="Replay not found")
    return {"status": "deleted"}


@router.get("/stats", response_model=StatsResponse)
async def get_stats():
    """Get comprehensive attack statistics and trends."""
    replays = get_all_replays()
    result = analyze_stats(replays)
    return StatsResponse(**result)
