import os
from dotenv import load_dotenv
from google import genai

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    raise RuntimeError(
        "GEMINI_API_KEY not found. Check the .env file location and variable name."
    )

client = genai.Client(api_key=api_key)

response = client.models.generate_content(
    model="gemini-3.6-flash",
    contents=(
        "Reply in English only. "
        "Say exactly: Gemini integration successful."
    ),
)

print("Response received:")
print(response.text)