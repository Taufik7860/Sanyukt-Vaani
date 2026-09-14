import os

from dotenv import load_dotenv
from qdrant_client import QdrantClient
from sentence_transformers import SentenceTransformer


# ============================================================
# CONFIGURATION
# ============================================================

COLLECTION_NAME = "sanyuktvaani_kb"

MODEL_NAME = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"

TOP_K = 30
QDRANT_TIMEOUT = 300


# ============================================================
# START
# ============================================================

print("=" * 60)
print("SANYUKT VAANI - QDRANT SEMANTIC SEARCH TEST")
print("=" * 60)


# ============================================================
# LOAD ENVIRONMENT
# ============================================================

load_dotenv()

QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")

if not QDRANT_URL:
    raise ValueError("QDRANT_URL is missing in .env")

if not QDRANT_API_KEY:
    raise ValueError("QDRANT_API_KEY is missing in .env")


# ============================================================
# CONNECT TO QDRANT
# ============================================================

print("\nConnecting to Qdrant...")

client = QdrantClient(
    url=QDRANT_URL,
    api_key=QDRANT_API_KEY,
    timeout=QDRANT_TIMEOUT
)

print("Qdrant connection successful!")


# ============================================================
# CHECK COLLECTION
# ============================================================

collection_info = client.get_collection(
    collection_name=COLLECTION_NAME
)

print("\nCollection information:")
print(f"Collection : {COLLECTION_NAME}")
print(f"Vectors    : {collection_info.points_count}")
print("Dimension  : 384")
print("Distance   : COSINE")


# ============================================================
# LOAD EMBEDDING MODEL
# ============================================================

print("\nLoading embedding model...")

model = SentenceTransformer(MODEL_NAME)

print("Embedding model loaded!")
print(f"Model: {MODEL_NAME}")


# ============================================================
# USER QUERY
# ============================================================

print("\n" + "=" * 60)
print("ENTER YOUR QUESTION")
print("=" * 60)

query = input("\nQuestion: ").strip()

if not query:
    print("Question cannot be empty.")
    exit()


# ============================================================
# CREATE QUERY EMBEDDING
# ============================================================

print("\nCreating query embedding...")

query_vector = model.encode(
    query,
    normalize_embeddings=True
).tolist()

print("Query embedding created!")
print(f"Vector dimension: {len(query_vector)}")


# ============================================================
# SEARCH QDRANT
# ============================================================

print("\nSearching Qdrant...")

results = client.query_points(
    collection_name=COLLECTION_NAME,
    query=query_vector,
    limit=TOP_K,
    with_payload=True
).points


# ============================================================
# DISPLAY RESULTS
# ============================================================

print("\n" + "=" * 60)
print(f"TOP {TOP_K} SEARCH RESULTS")
print("=" * 60)

if not results:
    print("\nNo results found.")
    exit()


for i, result in enumerate(results, start=1):

    print("\n" + "-" * 60)
    print(f"RESULT {i}")
    print("-" * 60)

    print(f"Point ID : {result.id}")
    print(f"Score    : {result.score:.4f}")

    payload = result.payload or {}

    text = payload.get("text", "")

    print("\nText:")
    print(text)

    metadata = payload.get("metadata", {})

    if metadata:
        print("\nMetadata:")
        for key, value in metadata.items():
            print(f"{key}: {value}")


# ============================================================
# COMPLETE
# ============================================================

print("\n" + "=" * 60)
print("SEMANTIC SEARCH TEST COMPLETE")
print("=" * 60)