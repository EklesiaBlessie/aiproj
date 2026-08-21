from typing import List, Optional
from pydantic import BaseModel


class FeatureInput(BaseModel):
    name: str

    # RICE
    reach: Optional[float] = None
    impact: Optional[float] = None
    confidence: Optional[float] = None
    effort: Optional[float] = None

    # ICE
    ease: Optional[float] = None

    # MoSCoW
    mos_cow: Optional[str] = None


class PrioritizationRequest(BaseModel):
    framework: str
    features: List[FeatureInput]


class RankedFeature(BaseModel):
    name: str
    score: float
    rank: int
    framework: str


class PrioritizationResponse(BaseModel):
    framework: str
    ranked_features: List[RankedFeature]