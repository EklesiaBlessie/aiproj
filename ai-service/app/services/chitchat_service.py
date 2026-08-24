"""
Chitchat reply generation.

Classification (deciding WHETHER a message is chitchat) now lives in
intent_classifier.py. This file only builds the prompt used to generate a
natural reply once something has already been classified as chitchat.
"""

import re
from app.services.intent_classifier import is_chitchat

# Only these trigger the "here's what I can help with" capability blurb —
# a plain "hi" shouldn't be met with a feature list.
_CAPABILITY_PATTERN = re.compile(
    r"who\s+are\s+you|what\s+are\s+you|what\s+can\s+you\s+do",
    re.IGNORECASE,
)


def build_chitchat_prompt(question: str, history_block: str = "") -> str:
    """
    Builds a short persona prompt for a freeform LLM call (no RAG context,
    no JSON schema) — just a natural, brief conversational reply.
    """
    is_capability_question = bool(_CAPABILITY_PATTERN.search(question))

    conversation_section = (
        f"\nConversation so far (most recent last):\n{history_block}\n"
        if history_block
        else ""
    )

    capability_note = (
        "\nSince the user is asking who you are or what you can do, briefly "
        "mention that you can help the team by analyzing customer feedback, "
        "writing product requirement documents (PRDs), generating user stories, "
        "and helping prioritize features."
        if is_capability_question
        else ""
    )

    return f"""You are Aria, a friendly AI Product Manager Copilot.

The user just sent a casual message (a greeting, farewell, thanks, or
small talk) rather than a real product question. Reply briefly and
naturally, like a helpful colleague would — one or two sentences, no
bullet points, no forced product-management framing.{capability_note}
{conversation_section}
User: {question}
Aria:"""