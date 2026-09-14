import os
import json
import time
import numpy as np

from dotenv import load_dotenv
from qdrant_client import QdrantClient
from qdrant_client.models import PointStruct


# ============================================================
# CONFIGURATION
# ============================================================

BASE_DIR = os.path.dirname(
    os.path.dirname(os.path.abspath(__file__))
)

EMBEDDINGS_DIR = os.path.join(
    BASE_DIR,
    "rag",
    "knowledge_base",
    "embeddings"
)

EMBEDDING_FILE = os.path.join(
    EMBEDDINGS_DIR,
    "embeddings.npy"
)

METADATA_FILE = os.path.join(
    EMBEDDINGS_DIR,
    "embedding_metadata.json"
)

COLLECTION_NAME = "sanyuktvaani_kb"

BATCH_SIZE = 25
QDRANT_TIMEOUT = 300
MAX_RETRIES = 5


# ============================================================
# START
# ============================================================

print("=" * 60)
print("SANYUKT VAANI - RESUME EMBEDDINGS UPLOAD")
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
# CHECK FILES
# ============================================================

print("\nChecking embedding files...")

if not os.path.exists(EMBEDDING_FILE):
    raise FileNotFoundError(
        f"Embedding file not found:\n{EMBEDDING_FILE}"
    )

if not os.path.exists(METADATA_FILE):
    raise FileNotFoundError(
        f"Metadata file not found:\n{METADATA_FILE}"
    )

print("Embedding files found.")


# ============================================================
# LOAD EMBEDDINGS
# ============================================================

print("\nLoading embeddings...")

embeddings = np.load(EMBEDDING_FILE)

print(f"Embedding shape: {embeddings.shape}")


# ============================================================
# LOAD METADATA
# ============================================================

print("\nLoading metadata...")

with open(
    METADATA_FILE,
    "r",
    encoding="utf-8"
) as f:
    metadata = json.load(f)

chunks = metadata["chunks"]

print(f"Total chunks: {len(chunks)}")
print(f"Total embeddings: {len(embeddings)}")


# ============================================================
# VALIDATION
# ============================================================

print("\nValidating embeddings...")

if len(embeddings) != len(chunks):
    raise ValueError(
        "Mismatch between embeddings and chunks!\n"
        f"Embeddings: {len(embeddings)}\n"
        f"Chunks: {len(chunks)}"
    )

if embeddings.ndim != 2:
    raise ValueError(
        f"Expected 2D embeddings, found {embeddings.shape}"
    )

if embeddings.shape[1] != 384:
    raise ValueError(
        f"Expected 384 dimensions, "
        f"found {embeddings.shape[1]}"
    )

print("Validation successful.")
print("Vector dimension: 384")
print("Distance: COSINE")


# ============================================================
# CHECK EXISTING QDRANT VECTORS
# ============================================================

print("\nChecking existing vectors in Qdrant...")

collection_info = client.get_collection(
    collection_name=COLLECTION_NAME
)

existing_points = collection_info.points_count

total_points = len(embeddings)

print(f"Existing vectors in Qdrant: {existing_points}")
print(f"Total vectors required: {total_points}")


# ============================================================
# SAFETY CHECK
# ============================================================

if existing_points > total_points:
    raise ValueError(
        "Qdrant contains more vectors than expected!"
    )

if existing_points == total_points:
    print("\nAll vectors are already uploaded!")
    print(f"Total vectors: {total_points}")
    exit()


# ============================================================
# PREPARE POINTS
# ============================================================

print("\nPreparing points...")

points = []

for index in range(
    existing_points,
    total_points
):

    embedding = embeddings[index]
    chunk = chunks[index]

    payload = {
        "text": chunk.get("text", ""),
        "metadata": {
            key: value
            for key, value in chunk.items()
            if key != "text"
        }
    }

    point = PointStruct(
        id=index,
        vector=embedding.tolist(),
        payload=payload
    )

    points.append(point)


print(f"Points to upload: {len(points)}")


# ============================================================
# UPLOAD
# ============================================================

print("\n" + "=" * 60)
print("UPLOADING VECTORS TO QDRANT")
print("=" * 60)

print(f"Collection : {COLLECTION_NAME}")
print(f"Existing   : {existing_points}")
print(f"Remaining  : {len(points)}")
print(f"Batch size : {BATCH_SIZE}")
print(f"Timeout    : {QDRANT_TIMEOUT} seconds")
print(f"Max retries: {MAX_RETRIES}")

print(
    f"\nStarting upload from vector {existing_points}..."
)


successful = existing_points

for start in range(
    0,
    len(points),
    BATCH_SIZE
):

    end = min(
        start + BATCH_SIZE,
        len(points)
    )

    batch = points[start:end]

    success = False

    for attempt in range(
        1,
        MAX_RETRIES + 1
    ):

        try:

            client.upsert(
                collection_name=COLLECTION_NAME,
                points=batch
            )

            success = True

            successful = existing_points + end

            print(
                f"Uploaded {successful}/{total_points}"
            )

            break

        except Exception as e:

            print(
                f"\nBatch {existing_points + start}"
                f"-{existing_points + end} failed "
                f"(attempt {attempt}/{MAX_RETRIES})"
            )

            print(f"Error: {e}")

            if attempt < MAX_RETRIES:

                wait_time = 2 ** attempt

                print(
                    f"Retrying in "
                    f"{wait_time} seconds..."
                )

                time.sleep(wait_time)

            else:

                print("\n" + "=" * 60)
                print("UPLOAD FAILED")
                print("=" * 60)

                print(
                    f"Last successful position: "
                    f"{successful}"
                )

                print(
                    "\nYou can safely run this script "
                    "again."
                )

                raise


# ============================================================
# FINAL VERIFICATION
# ============================================================

print("\n" + "=" * 60)
print("VERIFYING QDRANT")
print("=" * 60)

collection_info = client.get_collection(
    collection_name=COLLECTION_NAME
)

final_count = collection_info.points_count

print(f"Expected vectors : {total_points}")
print(f"Stored vectors   : {final_count}")


if final_count == total_points:

    print("\n" + "=" * 60)
    print("UPLOAD COMPLETE SUCCESSFULLY!")
    print("=" * 60)

    print(f"Collection : {COLLECTION_NAME}")
    print(f"Vectors    : {final_count}")
    print("Dimension  : 384")
    print("Distance   : COSINE")

else:

    print("\nWARNING:")
    print(
        f"Expected {total_points}, "
        f"but found {final_count}"
    )