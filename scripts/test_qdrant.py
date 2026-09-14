import os
from dotenv import load_dotenv
from qdrant_client import QdrantClient

# Load .env
load_dotenv()

QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")

if not QDRANT_URL:
    raise ValueError("QDRANT_URL is missing in .env")

if not QDRANT_API_KEY:
    raise ValueError("QDRANT_API_KEY is missing in .env")

# Connect to Qdrant
client = QdrantClient(
    url=QDRANT_URL,
    api_key=QDRANT_API_KEY
)

# Test connection
collections = client.get_collections()

print("=" * 60)
print("QDRANT CONNECTION SUCCESSFUL")
print("=" * 60)

print(collections)