from typing import Any

from app.services.ai_service import AIService
from app.services.prd_service import PRDService
from app.services.prioritization_service import PrioritizationService
from app.analysis.priority_models import FeatureInput
from app.services.intent_classifier import classify_full
from app.services.chitchat_service import build_chitchat_prompt
from app.rag.context_manager import ContextManager


class CopilotService:
    """
    Central conversational router for the AI Product Manager.

    Step 1: classify() decides chitchat vs business (intent_classifier.py).
    Step 2 (business only): detect_intent() further splits into
    prd / user_story / acceptance_criteria / prioritize / analyze.
    """

    def __init__(
        self,
        ai_service: AIService,
        prd_service: PRDService,
        prioritization_service: PrioritizationService,
    ):
        self.ai_service = ai_service
        self.prd_service = prd_service
        self.prioritization_service = prioritization_service
        self.context_manager = ContextManager()

    def detect_intent(self, question: str) -> str:
        _, sub_intent, _ = classify_full(question, ai_service=self.ai_service)
        return sub_intent

    def _extract_framework(self, question: str) -> str:
        q = question.lower()

        if "moscow" in q:
            return "MOSCOW"

        if "ice" in q and "rice" not in q:
            return "ICE"

        return "RICE"

    def _default_features(self):
        return [
            FeatureInput(
                name="Accurate Real-time Order Tracking",
                reach=80,
                impact=4,
                confidence=0.9,
                effort=5,
            ),
            FeatureInput(
                name="Delivery Issue Customer Support",
                reach=70,
                impact=3,
                confidence=0.85,
                effort=4,
            ),
            FeatureInput(
                name="Delivery Status Notifications",
                reach=60,
                impact=4,
                confidence=0.8,
                effort=6,
            ),
        ]

    def prioritize(self, question: str):
        framework = self._extract_framework(question)
        features = self._default_features()
        return self.prioritization_service.prioritize(framework, features)

    def generate_prd(self, question: str):
        return self.prd_service.generate(question)

    def generate_user_stories(self, question: str):
        prd = self.prd_service.generate(question)
        if isinstance(prd, dict):
            return prd.get("user_stories", [])
        return []

    def generate_acceptance_criteria(self, question: str):
        prd = self.prd_service.generate(question)
        if isinstance(prd, dict):
            return prd.get("acceptance_criteria", [])
        return []

    def answer(self, question: str, session_id: str = None) -> dict[str, Any]:
        if not question or not question.strip():
            raise ValueError("Question cannot be empty")

        if not session_id:
            import uuid
            session_id = str(uuid.uuid4())

        # Call classify_full once to decide both top-level and business sub-intent
        top_level_intent, business_sub_intent, debug_info = classify_full(question, ai_service=self.ai_service)

        if top_level_intent == "chitchat":
            history_block = ""
            if session_id:
                history = self.context_manager.get_history(session_id)
                if history:
                    history_block = "\n".join([f"{msg['role'].upper()}: {msg['content']}" for msg in history])

            prompt = build_chitchat_prompt(question, history_block=history_block)
            reply = self.ai_service.llm.generate(prompt)

            if session_id:
                self.context_manager.add_message(session_id, "user", question)
                self.context_manager.add_message(session_id, "assistant", reply)

            return {
                "intent": "chitchat",
                "answer": reply,
                "session_id": session_id,
            }

        # Handle business sub-intents
        if business_sub_intent == "prd":
            result = self.generate_prd(question)
            if session_id:
                self.context_manager.add_message(session_id, "user", question)
                self.context_manager.add_message(session_id, "assistant", f"Generated PRD for: {question}")
            return {
                "intent": "prd",
                "answer": result,
                "session_id": session_id,
            }

        if business_sub_intent == "user_story":
            result = self.generate_user_stories(question)
            if session_id:
                self.context_manager.add_message(session_id, "user", question)
                self.context_manager.add_message(session_id, "assistant", f"Generated user stories for: {question}")
            return {
                "intent": "user_story",
                "answer": result,
                "session_id": session_id,
            }

        if business_sub_intent == "acceptance_criteria":
            result = self.generate_acceptance_criteria(question)
            if session_id:
                self.context_manager.add_message(session_id, "user", question)
                self.context_manager.add_message(session_id, "assistant", f"Generated acceptance criteria for: {question}")
            return {
                "intent": "acceptance_criteria",
                "answer": result,
                "session_id": session_id,
            }

        if business_sub_intent == "prioritize":
            result = self.prioritize(question)
            if session_id:
                framework = self._extract_framework(question)
                self.context_manager.add_message(session_id, "user", question)
                self.context_manager.add_message(session_id, "assistant", f"Prioritized features using {framework} framework.")
            return {
                "intent": "prioritize",
                "answer": result,
                "session_id": session_id,
            }

        # Otherwise business_sub_intent == "analyze"
        result = self.ai_service.ask(question, session_id=session_id)

        return {
            "intent": "analyze",
            "answer": result.get("answer", ""),
            "sources": result.get("sources", []),
            "session_id": session_id,
        }