from pydantic import BaseModel, Field


class ReplayInput(BaseModel):
    player_tag: str = ""
    army_composition: str = ""
    base_layout: str = ""
    stars: int = Field(ge=0, le=3)
    destruction_percentage: float = Field(ge=0, le=100)
    th_level: int = 18
    notes: str = ""


class ReplayRecord(BaseModel):
    id: int
    timestamp: str
    player_tag: str
    army_composition: str
    base_layout: str
    stars: int
    destruction_percentage: float
    th_level: int
    notes: str


class CompositionStats(BaseModel):
    attacks: int
    average_stars: float
    average_destruction: float
    three_star_rate: float


class MatrixEntry(BaseModel):
    attacks: int
    average_stars: float
    three_star_rate: float


class TrendPoint(BaseModel):
    attack_number: int
    timestamp: str
    stars: int
    rolling_avg_stars: float
    rolling_avg_destruction: float


class OverallStats(BaseModel):
    total_attacks: int
    average_stars: float
    average_destruction: float
    three_star_rate: float


class StatsResponse(BaseModel):
    total_attacks: int
    overall_stats: OverallStats | dict
    by_composition: dict[str, CompositionStats]
    by_layout: dict[str, CompositionStats]
    composition_layout_matrix: dict[str, dict[str, MatrixEntry]]
    trend: list[TrendPoint]
