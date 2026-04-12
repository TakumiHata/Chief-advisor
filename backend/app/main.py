from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import analyze, detect, heatmap, stats

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analyze.router, prefix="/api")
app.include_router(detect.router, prefix="/api")
app.include_router(heatmap.router, prefix="/api")
app.include_router(stats.router, prefix="/api")


@app.get("/health")
async def health():
    return {"status": "ok"}
