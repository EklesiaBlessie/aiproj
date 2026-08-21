from app.rag.retriever import Retriever
from app.prompts.prompt_builder import PromptBuilder
from app.llm.gemini import GeminiService
from app.analysis.analyzer import FeedbackAnalyzer
from app.rag.context_manager import ContextManager


class AIService:

    def __init__(self, retriever):
        self.retriever = retriever
        self.llm = GeminiService()
        self.context_manager = ContextManager()

        self.analyzer = FeedbackAnalyzer(
            retriever=self.retriever,
            llm=self.llm
        )

    def ask(self, question: str, limit: int = 5, session_id: str = None):

        documents = self.retriever.search(
            question,
            limit=limit
        )

        history = self.context_manager.get_history(session_id) if session_id else []

        prompt = PromptBuilder.build(
            question,
            documents,
            history=history
        )

        print("Calling Gemini...")

        answer = self.llm.generate(prompt)

        if session_id:
            self.context_manager.add_message(session_id, "user", question)
            self.context_manager.add_message(session_id, "assistant", answer)

        return {
            "question": question,
            "answer": answer,
            "sources": documents,
        }

    def analyze(self, question: str):
        return self.analyzer.analyze(question)

    def close(self):
        self.retriever.close()