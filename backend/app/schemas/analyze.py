from pydantic import BaseModel


class AnalyzeResponse(BaseModel):
    width: int
    height: int
    dominant_colors: list[list[int]]
    brightness: float
    edge_density: float
    message: str
