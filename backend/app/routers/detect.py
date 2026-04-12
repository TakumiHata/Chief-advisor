from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.schemas.detection import DetectResponse, TrackingFrame, TrackingResponse
from app.services.unit_detection import detect_all

router = APIRouter()

SUPPORTED_TYPES = ("image/jpeg", "image/png", "image/webp")


def _validate_image(file: UploadFile) -> None:
    if file.content_type not in SUPPORTED_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Unsupported image format. Use JPEG, PNG, or WebP.",
        )


@router.post("/detect-units", response_model=DetectResponse)
async def detect_units_endpoint(file: UploadFile = File(...)):
    """Detect units/spells/heroes in a single frame."""
    _validate_image(file)

    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Empty file")

    try:
        result = detect_all(image_bytes)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    return DetectResponse(**result)


@router.post("/track-units", response_model=TrackingResponse)
async def track_units_endpoint(
    files: list[UploadFile] = File(...),
    timestamps: list[str] = Form(...),
):
    """Detect units across multiple frames and track movement over time.

    Accepts multiple frame images with corresponding timestamps.
    Returns per-frame detections and movement paths by category.
    """
    if len(files) != len(timestamps):
        raise HTTPException(
            status_code=400,
            detail=f"Number of files ({len(files)}) must match timestamps ({len(timestamps)}).",
        )

    if len(files) > 20:
        raise HTTPException(status_code=400, detail="Maximum 20 frames per request.")

    frames: list[TrackingFrame] = []
    # category -> list of center points across frames
    movement: dict[str, list[list[int]]] = {}

    for file, ts in zip(files, timestamps):
        _validate_image(file)
        image_bytes = await file.read()
        if not image_bytes:
            continue

        try:
            result = detect_all(image_bytes)
        except ValueError:
            continue

        frame = TrackingFrame(timestamp=ts, detections=result["detections"])
        frames.append(frame)

        for det in result["detections"]:
            cat = det["category"]
            if cat not in movement:
                movement[cat] = []
            movement[cat].append(det["center"])

    return TrackingResponse(
        frame_count=len(frames),
        frames=frames,
        movement_summary=movement,
    )
