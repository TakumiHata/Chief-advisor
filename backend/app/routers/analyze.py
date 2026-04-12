from fastapi import APIRouter, File, HTTPException, UploadFile

from app.schemas.analyze import AnalyzeResponse
from app.services.image_analysis import analyze_frame

router = APIRouter()


@router.post("/analyze-frame", response_model=AnalyzeResponse)
async def analyze_frame_endpoint(file: UploadFile = File(...)):
    """Receive a frame image and return basic OpenCV analysis results."""
    if file.content_type not in ("image/jpeg", "image/png", "image/webp"):
        raise HTTPException(status_code=400, detail="Unsupported image format. Use JPEG, PNG, or WebP.")

    image_bytes = await file.read()
    if len(image_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty file")

    try:
        result = analyze_frame(image_bytes)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    return AnalyzeResponse(
        **result,
        message="Basic frame analysis complete. Unit detection will be available in Phase 2.",
    )
