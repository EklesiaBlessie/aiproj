from fastapi import APIRouter

from app.rag.retriever import Retriever

from app.api.schemas import QuestionRequest, QuestionResponse

from app.services.ai_service import AIService
from app.services.prd_service import PRDService
from app.services.prioritization_service import PrioritizationService
from app.services.copilot_service import CopilotService
from app.services.agents_service import AgentsService

from app.analysis.models import AnalysisResponse
from app.analysis.prd_models import PRDResponse
from app.analysis.priority_models import (
    PrioritizationRequest,
    PrioritizationResponse,
)
from pydantic import BaseModel
from typing import List, Optional

class AgentRequest(BaseModel):
    topic: str

class SprintPlanningRequest(BaseModel):
    features: List[str]

class RiskRequest(BaseModel):
    prd_content: str


router = APIRouter()


# ---------------------------------------------------------
# Shared Retriever / Qdrant instance
# ---------------------------------------------------------

# Prevents multiple local Qdrant clients from locking
# the same local storage.

retriever = Retriever()


# ---------------------------------------------------------
# Services
# ---------------------------------------------------------

ai_service = AIService(retriever)

prd_service = PRDService(retriever)

priority_service = PrioritizationService()
agents_service = AgentsService(retriever=retriever)


# Central conversational AI Product Manager agent
copilot_service = CopilotService(
    ai_service=ai_service,
    prd_service=prd_service,
    prioritization_service=priority_service,
)


# ---------------------------------------------------------
# AI / Conversational endpoints
# ---------------------------------------------------------


@router.post("/ask", response_model=QuestionResponse)
def ask_ai(request: QuestionRequest):
    result = ai_service.ask(request.question)
    return result


@router.post("/analyze", response_model=AnalysisResponse)
def analyze(request: QuestionRequest):
    return ai_service.analyze(request.question)


@router.post("/copilot")
def copilot(request: QuestionRequest):
    """
    Central AI Product Manager conversational endpoint.

    Automatically routes the user's question to:

    - Product analysis / RAG
    - PRD generation
    - Feature prioritization
    """

    return copilot_service.answer(request.question, request.session_id)


# ---------------------------------------------------------
# PRD
# ---------------------------------------------------------


@router.post("/prd", response_model=PRDResponse)
def generate_prd(request: QuestionRequest):
    return prd_service.generate(request.question)


# ---------------------------------------------------------
# Feature prioritization
# ---------------------------------------------------------


@router.post(
    "/prioritize",
    response_model=PrioritizationResponse,
)
def prioritize_features(request: PrioritizationRequest):
    return priority_service.prioritize(
        request.framework,
        request.features,
    )


# ---------------------------------------------------------
# Dashboard
# ---------------------------------------------------------


@router.get("/dashboard")
async def dashboard():
    return {
        "total_feedback": 1000,
        "positive": 72,
        "neutral": 18,
        "negative": 10,
        "high_priority": 43,
        "avg_rating": 4.1,
        "trend": [
            {"month": "Jan", "feedback": 120},
            {"month": "Feb", "feedback": 180},
            {"month": "Mar", "feedback": 240},
            {"month": "Apr", "feedback": 210},
            {"month": "May", "feedback": 300},
            {"month": "Jun", "feedback": 350},
        ],
        "sentiment": [
            {"name": "Positive", "value": 72},
            {"name": "Neutral", "value": 18},
            {"name": "Negative", "value": 10},
        ],
        "recent_feedback": [
            {
                "id": 1,
                "issue": "Late Delivery",
                "sentiment": "Negative",
                "priority": "High",
            },
            {
                "id": 2,
                "issue": "Payment Failed",
                "sentiment": "Negative",
                "priority": "Critical",
            },
            {
                "id": 3,
                "issue": "Need Dark Mode",
                "sentiment": "Neutral",
                "priority": "Medium",
            },
        ],
    }


# ---------------------------------------------------------
# Feedback
# ---------------------------------------------------------


@router.get("/feedback")
def get_feedback():
    return [
        {
            "id": 1,
            "text": "Delivery was very late and food was cold.",
            "sentiment": "Negative",
            "priority": "High",
        },
        {
            "id": 2,
            "text": "The app UI is very clean and easy to use.",
            "sentiment": "Positive",
            "priority": "Low",
        },
        {
            "id": 3,
            "text": "Need dark mode support.",
            "sentiment": "Neutral",
            "priority": "Medium",
        },
        {
            "id": 4,
            "text": "Payment failed twice during checkout.",
            "sentiment": "Negative",
            "priority": "Critical",
        },
    ]

# ---------------------------------------------------------
# Enterprise AI Agent endpoints
# ---------------------------------------------------------

@router.post("/agent/research")
def run_agent_research(request: AgentRequest):
    result = agents_service.run_research(request.topic)
    return {"status": "success", "agent": "ResearchAgent", "result": result}

@router.post("/agent/competitor")
def run_agent_competitor(request: AgentRequest):
    result = agents_service.run_competitor_analysis(request.topic)
    return {"status": "success", "agent": "CompetitorAgent", "result": result}

@router.post("/agent/sprint-planning")
def run_agent_sprint_planning(request: SprintPlanningRequest):
    result = agents_service.run_sprint_planning(request.features)
    return {"status": "success", "agent": "SprintPlanningAgent", "result": result}

@router.post("/agent/risk")
def run_agent_risk(request: RiskRequest):
    result = agents_service.run_risk_analysis(request.prd_content)
    return {"status": "success", "agent": "RiskAgent", "result": result}