import io
import sys

import pandas as pd
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware

import os
# Add the feedback-pipeline directory to PYTHONPATH so that the shared analysis package can be imported.
feedback_pipeline_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "feedback-pipeline"))
sys.path.append(feedback_pipeline_path)

import json
from pydantic import BaseModel

from analysis.batch_analyzer import analyze_feedback_batch
from analysis.llm_client import ask_llm


class PRDRequest(BaseModel):
    question: str = ""
    feature: str = ""


app = FastAPI(
    title="AI PM Copilot Analysis Service",
    description="FastAPI service for CSV feedback upload and AI analysis",
    version="1.0.0",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/upload")
async def upload_csv(file: UploadFile = File(...)):
    """
    Upload a CSV dataset and return basic dataset information.
    """
    contents = await file.read()

    try:
        df = pd.read_csv(io.BytesIO(contents))
    except Exception as e:
        return {"error": f"Failed to read CSV: {str(e)}"}

    return {
        "message": "CSV uploaded successfully",
        "filename": file.filename,
        "total_rows": len(df),
        "total_columns": len(df.columns),
        "columns": df.columns.tolist(),
    }


@app.post("/analyze")
async def analyze_csv(file: UploadFile = File(...)):
    """
    Upload a CSV and analyze the first 3 feedback records
    using Gemini for theme and pain-point extraction.
    """
    contents = await file.read()

    try:
        df = pd.read_csv(io.BytesIO(contents))
    except Exception as e:
        return {"error": f"Failed to read CSV: {str(e)}"}

    if "feedback_text" not in df.columns:
        return {
            "error": "CSV must contain a 'feedback_text' column",
            "columns": df.columns.tolist(),
        }

    feedback = (
        df["feedback_text"]
        .dropna()
        .astype(str)
        .head(3)
        .tolist()
    )

    if not feedback:
        return {
            "error": "No feedback records found in 'feedback_text'"
        }

    try:
        results = analyze_feedback_batch(feedback)
    except Exception as e:
        return {
            "error": f"AI analysis failed: {str(e)}"
        }

    return {
        "message": "AI analysis completed",
        "filename": file.filename,
        "records_analyzed": len(feedback),
        "results": results,
    }


@app.post("/prd")
async def generate_prd(req: PRDRequest):
    """
    Generate a Product Requirements Document (PRD) JSON using LLM.
    """
    topic = req.question or req.feature or "New Product Feature"

    prompt = f"""You are an expert Product Manager.
Generate a structured Product Requirements Document (PRD) for this feature or topic:
{topic}

Return ONLY valid JSON. Do NOT use markdown code fences.

Required JSON structure:
{{
  "title": "PRD: {topic}",
  "problem_statement": "Detailed problem statement...",
  "target_users": ["Target user 1", "Target user 2"],
  "goals": ["Goal 1", "Goal 2"],
  "requirements": ["Requirement 1", "Requirement 2"],
  "user_stories": [
    {{"story": "As a user, I want X so that Y"}}
  ],
  "acceptance_criteria": [
    {{"criteria": ["Given X, when Y, then Z"]}}
  ],
  "success_metrics": ["Metric 1", "Metric 2"],
  "risks": ["Risk 1", "Risk 2"]
}}
"""
    try:
        raw_response = ask_llm(prompt)
        cleaned = raw_response.replace("```json", "").replace("```", "").strip()
        result = json.loads(cleaned)
        return result
    except Exception as e:
        return {
            "title": f"PRD: {topic}",
            "problem_statement": f"Define requirements for {topic}",
            "target_users": ["General Users", "Product Administrators"],
            "goals": ["Improve user satisfaction", "Streamline product workflow"],
            "requirements": ["Requirement 1: System stability", "Requirement 2: User interface clarity"],
            "user_stories": [{"story": f"As a user, I want to use {topic} easily so that my tasks are completed fast"}],
            "acceptance_criteria": [{"criteria": ["Given the user accesses the feature, when input is provided, then valid output is displayed"]}],
            "success_metrics": ["User adoption rate > 80%", "Customer satisfaction score > 4.5/5"],
            "risks": ["Potential integration delays", "User onboarding overhead"]
        }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
    )