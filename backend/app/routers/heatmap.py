from fastapi import APIRouter, File, HTTPException, UploadFile

from app.schemas.heatmap import DefenseDetectResponse, HeatmapResponse
from app.services.defense_detection import detect_defenses, generate_heatmap

router = APIRouter()

SUPPORTED_TYPES = ("image/jpeg", "image/png", "image/webp")


def _validate_image(file: UploadFile) -> None:
    if file.content_type not in SUPPORTED_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Unsupported image format. Use JPEG, PNG, or WebP.",
        )


@router.post("/detect-defenses", response_model=DefenseDetectResponse)
async def detect_defenses_endpoint(file: UploadFile = File(...)):
    """Detect defensive buildings in a village screenshot."""
    _validate_image(file)
    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Empty file")

    try:
        result = detect_defenses(image_bytes)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    return DefenseDetectResponse(**result)


@router.post("/generate-heatmap", response_model=HeatmapResponse)
async def generate_heatmap_endpoint(file: UploadFile = File(...)):
    """Generate a DPS distribution heatmap from a village screenshot."""
    _validate_image(file)
    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Empty file")

    try:
        result = generate_heatmap(image_bytes)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    return HeatmapResponse(**result)
