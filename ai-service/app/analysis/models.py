from pydantic import BaseModel
from typing import List


class Theme(BaseModel):
    name: str


class PainPoint(BaseModel):
    issue: str
    severity: str


class FeatureCluster(BaseModel):
    feature: str
    count: int


class Trend(BaseModel):
    issue: str
    frequency: int


class Recommendation(BaseModel):
    suggestion: str


class AnalysisResponse(BaseModel):
    summary: str

    themes: List[Theme]

    pain_points: List[PainPoint]

    feature_clusters: List[FeatureCluster]

    trends: List[Trend]

    priority: str

    recommendations: List[Recommendation]