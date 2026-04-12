"""JSON file-based replay data store.

Stores attack replay results for statistical analysis.
Data is persisted to a Docker volume-mounted JSON file.
"""

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

DATA_DIR = Path("/app/data")
REPLAYS_FILE = DATA_DIR / "replays.json"


def _ensure_data_dir() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if not REPLAYS_FILE.exists():
        REPLAYS_FILE.write_text("[]")


def _load_replays() -> list[dict]:
    _ensure_data_dir()
    return json.loads(REPLAYS_FILE.read_text())


def _save_replays(replays: list[dict]) -> None:
    _ensure_data_dir()
    REPLAYS_FILE.write_text(json.dumps(replays, ensure_ascii=False, indent=2))


def save_replay(data: dict[str, Any]) -> dict:
    """Save a replay result to the store."""
    replays = _load_replays()

    record = {
        "id": len(replays) + 1,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "player_tag": data.get("player_tag", ""),
        "army_composition": data.get("army_composition", ""),
        "base_layout": data.get("base_layout", ""),
        "stars": data["stars"],
        "destruction_percentage": data["destruction_percentage"],
        "th_level": data.get("th_level", 18),
        "notes": data.get("notes", ""),
    }

    replays.append(record)
    _save_replays(replays)
    return record


def get_all_replays() -> list[dict]:
    """Get all stored replays."""
    return _load_replays()


def delete_replay(replay_id: int) -> bool:
    """Delete a replay by ID."""
    replays = _load_replays()
    filtered = [r for r in replays if r["id"] != replay_id]
    if len(filtered) == len(replays):
        return False
    _save_replays(filtered)
    return True
