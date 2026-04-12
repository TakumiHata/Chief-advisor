from pydantic import BaseModel


class DefenseDetection(BaseModel):
    type: str
    label: str
    bbox: list[int]
    center: list[int]
    area: int
    dps: int
    range_tiles: int


class DefenseDetectResponse(BaseModel):
    frame_size: list[int]
    defenses: list[DefenseDetection]
    summary: dict[str, int]
    total_detected: int


class DangerZone(BaseModel):
    bbox: list[int]
    center: list[int]
    max_dps: float


class HeatmapResponse(BaseModel):
    frame_size: list[int]
    heatmap_image: str
    defenses: list[DefenseDetection]
    danger_zones: list[DangerZone]
    total_defenses: int
