from pydantic import BaseModel
from app.analysis.models import AnalysisResponse

class QuestionRequest(BaseModel):
    question: str
    session_id: str = None


class QuestionResponse(BaseModel):
    question: str
    answer: str
    sources: list