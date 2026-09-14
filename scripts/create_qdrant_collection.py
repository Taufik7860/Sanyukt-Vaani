import os

from dotenv import load_dotenv
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams


# ============================================================
# 1. START
# ============================================================

print("=" * 60)
print("SANYUKT VAANI - QDRANT COLLECTION SETUP")
print("=" * 60)


# ============================================================
# 2. LOAD ENVIRONMENT VARIABLES
# ============================================================

load_dotenv()

QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")


# ============================================================
# 3. CHECK ENVIRONMENT VARIABLES
# ============================================================

if not QDRANT_URL:
    raise ValueError(
        "ERROR: QDRANT_URL is missing in .env"
    )

if not QDRANT_API_KEY:
    raise ValueError(
        "ERROR: QDRANT_API_KEY is missing in .env"
    )

print("\nEnvironment variables loaded successfully.")


# ============================================================
# 4. CONNECT TO QDRANT CLOUD
# ============================================================

print("\nConnecting to Qdrant Cloud...")

client = QdrantClient(
    url=QDRANT_URL,
    api_key=QDRANT_API_KEY
)

print("Qdrant connection successful!")


# ============================================================
# 5. COLLECTION CONFIGURATION
# ============================================================

COLLECTION_NAME = "sanyuktvaani_kb"

# Your embedding model:
# sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2
VECTOR_SIZE = 384

DISTANCE_METRIC = Distance.COSINE


print("\nCollection configuration:")
print(f"  Collection name : {COLLECTION_NAME}")
print(f"  Vector size     : {VECTOR_SIZE}")
print(f"  Distance        : COSINE")


# ============================================================
# 6. CHECK EXISTING COLLECTIONS
# ============================================================

print("\nChecking existing collections...")

collections = client.get_collections().collections

existing_collections = [
    collection.name
    for collection in collections
]

print(f"Existing collections: {existing_collections}")


# ============================================================
# 7. CREATE COLLECTION
# ============================================================

if COLLECTION_NAME in existing_collections:

    print(
        f"\nCollection '{COLLECTION_NAME}' already exists."
    )

else:

    print(
        f"\nCreating collection '{COLLECTION_NAME}'..."
    )

    client.create_collection(
        collection_name=COLLECTION_NAME,
        vectors_config=VectorParams(
            size=VECTOR_SIZE,
            distance=DISTANCE_METRIC
        )
    )

    print(
        f"Collection '{COLLECTION_NAME}' created successfully!"
    )


# ============================================================
# 8. VERIFY COLLECTION
# ============================================================

print("\nVerifying collection...")

collection_info = client.get_collection(
    collection_name=COLLECTION_NAME
)

print("\nCollection verified successfully.")

print(f"  Collection : {COLLECTION_NAME}")
print(f"  Vector size: {collection_info.config.params.vectors.size}")
print(f"  Distance   : {collection_info.config.params.vectors.distance}")


# ============================================================
# 9. FINAL SUMMARY
# ============================================================

print("\n" + "=" * 60)
print("QDRANT COLLECTION SETUP COMPLETE")
print("=" * 60)

print("\nSanyukt Vaani Qdrant configuration:")
print(f"  Collection : {COLLECTION_NAME}")
print("  Vector size: 384")
print("  Distance   : COSINE")

print("\nNext step:")
print("Upload embeddings.npy and metadata to Qdrant.")

print("\nDone!")