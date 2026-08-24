from app.llm.gemini import GeminiService
from app.analysis.json_parser import JSONParser


class PRDService:

    def __init__(self, retriever):
        self.retriever = retriever
        self.llm = GeminiService()

    def generate(self, feature: str):

        documents = self.retriever.search(
            feature,
            limit=8
        )

        context_parts = []

        for doc in documents:

            if isinstance(doc, dict):
                payload = doc.get("payload", {})
            else:
                payload = getattr(doc, "payload", {})

            if isinstance(payload, dict):
                text = payload.get("text", "")

                if text:
                    context_parts.append(text)

        context = "\n\n".join(context_parts)

        prompt = f"""
You are an expert Product Manager.

Generate a structured Product Requirements Document (PRD)
for this feature:

FEATURE:
{feature}

Use the customer feedback below to ground the PRD.

CUSTOMER FEEDBACK:
{context}

Return ONLY valid JSON.

Required structure:

{{
  "title": "string",
  "problem_statement": "string",
  "target_users": ["string"],
  "goals": ["string"],
  "requirements": ["string"],
  "user_stories": [
    {{
      "story": "As a ... I want ... so that ..."
    }}
  ],
  "acceptance_criteria": [
    {{
      "criteria": [
        "Given ... When ... Then ..."
      ]
    }}
  ],
  "success_metrics": ["string"],
  "risks": ["string"]
}}

Rules:
- Ground the PRD in the supplied customer feedback.
- Do not invent unsupported customer problems.
- Requirements must be actionable.
- User stories must use the format:
  As a [user], I want [goal], so that [benefit].
- Acceptance criteria must be testable.
- Return JSON only.
"""

        response = self.llm.generate(prompt)

        return JSONParser.parse(response)