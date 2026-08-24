import os
from dotenv import load_dotenv
from google import genai

load_dotenv()

class GeminiService:
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")

        if not api_key:
            raise ValueError("GEMINI_API_KEY not found")

        self.client = genai.Client(api_key=api_key)

    def generate(self, prompt: str):
        print("Inside Gemini.generate()")

        try:
            response = self.client.models.generate_content(
                model="gemini-3.5-flash",
                contents=prompt,
            )
        except Exception as e:
            print(f"⚠️ Warning: gemini-3.5-flash call failed, attempting fallback to gemini-3.6-flash. Error: {e}")
            response = self.client.models.generate_content(
                model="gemini-3.6-flash",
                contents=prompt,
            )

        return response.text