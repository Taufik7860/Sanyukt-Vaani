# backend/test_conn.py
import os
from dotenv import load_dotenv
from qdrant_client import QdrantClient
from google import genai

load_dotenv()

# 1. Test Qdrant Connection
try:
    qdrant = QdrantClient(
        url=os.getenv("QDRANT_URL"),
        api_key=os.getenv("QDRANT_API_KEY")
    )
    collections = qdrant.get_collections()
    print("✅ Qdrant Connected Successfully! Existing Collections:", collections)
except Exception as e:
    print("❌ Qdrant Connection Failed:", e)

# 2. Test Gemini API Connection
try:
    client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
    
    # Generate embedding
    res = client.models.embed_content(
        model="text-embedding-004",
        contents="Hello Sanyukt Vaani"
    )
    print("✅ Gemini Embedding Service Working! Vector Dimension:", len(res.embedding.values))
except Exception as e:
    print("❌ Gemini API Failed:", e)