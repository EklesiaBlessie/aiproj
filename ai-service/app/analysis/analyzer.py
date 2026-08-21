from app.analysis.json_parser import JSONParser
from google.genai.errors import ClientError

from app.analysis.prompt_templates import PromptTemplates
from app.analysis.models import AnalysisResponse

class FeedbackAnalyzer:

    def __init__(self, retriever, llm):
        self.retriever = retriever
        self.llm = llm

    def analyze(self, question: str):
        try:
            documents = self.retriever.search(question)

            context = "\n\n".join(
                [doc["text"] for doc in documents]
            )

            prompt = PromptTemplates.ANALYZE_FEEDBACK.format(
                context=context
            )

            response = self.llm.generate(prompt)

            result = JSONParser.parse(response)

            return AnalysisResponse(**result)

        except ClientError:
            return AnalysisResponse(
                summary="Gemini API quota exceeded. Please try again later.",
                themes=[],
                pain_points=[],
                feature_clusters=[],
                trends=[],
                priority="N/A",
                recommendations=[]
            )