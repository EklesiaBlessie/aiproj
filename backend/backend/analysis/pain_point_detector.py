from analysis.llm_client import ask_llm
from analysis.prompts import PAIN_POINT_PROMPT


def detect_pain_point(feedback):

    prompt = PAIN_POINT_PROMPT.format(
        feedback=feedback
    )

    return ask_llm(prompt)