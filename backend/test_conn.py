import os
from dotenv import load_dotenv
from google import genai

load_dotenv()

print("=== Sanyukt Vaani backend connection test ===")

gemini_key = os.getenv("GEMINI_API_KEY")
print("GEMINI_API_KEY:", "configured" if gemini_key else "MISSING")

bhashini_user = os.getenv("BHASHINI_USER_ID")
bhashini_key = os.getenv("BHASHINI_API_KEY")
print("BHASHINI_USER_ID:", "configured" if bhashini_user else "MISSING")
print("BHASHINI_API_KEY:", "configured" if bhashini_key else "MISSING")

qdrant_url = os.getenv("QDRANT_URL")
print("QDRANT_URL:", "configured" if qdrant_url else "not configured")

if gemini_key:
    try:
        client = genai.Client(api_key=gemini_key)
        result = client.models.generate_content(
            model=os.getenv("GEMINI_MODEL", "gemini-2.5-flash"),
            contents="Reply only with: Sanyukt Vaani backend test OK",
        )
        print("Gemini:", result.text)
    except Exception as exc:
        print("Gemini FAILED:", exc)
