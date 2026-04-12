from pydantic import BaseModel


class Detection(BaseModel):
    category: str
    bbox: list[int]
    center: list[int]
    area: int
    confidence: float


class DetectResponse(BaseModel):
    frame_size: list[int]
    detections: list[Detection]
    summary: dict[str, int]
    total_detected: int


class TrackingFrame(BaseModel):
    timestamp: str
    detections: list[Detection]


class TrackingResponse(BaseModel):
    frame_count: int
    frames: list[TrackingFrame]
    movement_summary: dict[str, list[list[int]]]
