import json
from .llm_client import ask_llm


def analyze_feedback_batch(feedback_list):

    prompt = f"""
You are an expert product analyst.

Analyze EVERY customer feedback record below.

For EACH feedback record, identify:

1. theme
2. pain_point

IMPORTANT:
- You MUST analyze every feedback.
- Do NOT analyze only the first feedback.
- Do NOT combine multiple feedbacks.
- Return exactly {len(feedback_list)} JSON objects.
- Keep the original feedback text.
- Theme should be a short phrase.
- Pain point should be a short phrase.
- If there is no pain point, use "None".
- Return ONLY valid JSON.
- Do NOT use markdown.

Required format:

[
  {{
    "feedback": "original feedback",
    "theme": "main theme",
    "pain_point": "main customer pain point"
  }}
]

Customer Feedback:

{json.dumps(feedback_list, ensure_ascii=False, indent=2)}
"""

    print(
        f"Sending {len(feedback_list)} feedbacks to Groq..."
    )

    response = ask_llm(prompt)

    print("Raw Groq response:")
    print(response)

    try:

        # Remove markdown fences if Groq adds them
        response = response.replace(
            "```json",
            ""
        )

        response = response.replace(
            "```",
            ""
        )

        response = response.strip()

        result = json.loads(response)

        # Make sure result is a list
        if not isinstance(result, list):
            print("[ERROR] Groq returned something other than a JSON array")
            result = []

        print(f"[OK] Groq returned {len(result)} results")

        # Fill missing results to guarantee 1-to-1 matching with feedback_list
        while len(result) < len(feedback_list):
            idx = len(result)
            result.append({
                "feedback": feedback_list[idx],
                "theme": "General Feedback",
                "pain_point": "None"
            })

        return result[:len(feedback_list)]

    except Exception as e:

        print("[ERROR] JSON Parsing Error:", e)
        print("Groq Response:", response)

        # Return fallback items for all feedbacks in this batch
        return [
            {
                "feedback": text,
                "theme": "General Feedback",
                "pain_point": "None"
            }
            for text in feedback_list
        ]