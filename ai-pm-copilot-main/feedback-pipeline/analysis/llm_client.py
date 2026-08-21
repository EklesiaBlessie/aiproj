import os
from dotenv import load_dotenv
from groq import Groq

# Load environment variables (.env in feedback-pipeline or parent)
env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".env"))
if os.path.exists(env_path):
    load_dotenv(dotenv_path=env_path)
else:
    load_dotenv()

# Get Groq API key
api_key = os.getenv("GROQ_API_KEY")

if not api_key:
    raise ValueError("GROQ_API_KEY not found in .env")

print("[OK] Groq API Key Loaded")

# Create Groq client
client = Groq(api_key=api_key)


def ask_llm(prompt: str) -> str:
    """
    Send a prompt to Groq and return the generated text.
    """

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ],
        temperature=0.2,
        max_tokens=4096
    )

    return response.choices[0].message.content.strip()