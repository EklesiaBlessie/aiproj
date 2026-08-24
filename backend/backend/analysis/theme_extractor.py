from analysis.llm_client import ask_llm
from analysis.prompts import THEME_PROMPT


def extract_theme(feedback):

    prompt = THEME_PROMPT.format(
        feedback=feedback
    )

    return ask_llm(prompt)