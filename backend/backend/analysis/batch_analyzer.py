import json
from analysis.llm_client import ask_llm


def analyze_feedback_batch(feedback_list):

    prompt = f"""
You are an expert product analyst.

Analyze the following customer feedback records.

For each feedback, identify:

1. theme
2. pain_point


Return ONLY a JSON array.

Required format:

[
    {{
        "feedback": "original feedback text",
        "theme": "main theme",
        "pain_point": "customer issue"
    }}
]


Customer Feedback:

{json.dumps(feedback_list, indent=2)}

"""


    response = ask_llm(prompt)


    try:

        # Remove markdown if Gemini returns ```json
        response = response.replace(
            "```json",
            ""
        ).replace(
            "```",
            ""
        ).strip()


        result = json.loads(response)

        return result


    except Exception as e:

        print("❌ JSON Parsing Error:", e)

        print("Gemini Response:")
        print(response)

        return []