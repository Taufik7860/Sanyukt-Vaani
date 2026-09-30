import json
import os
import time
import numpy as np
from pathlib import Path
from dotenv import load_dotenv
from qdrant_client import QdrantClient, models

load_dotenv()

METADATA_PATH = Path(
    r"rag\knowledge_base\embeddings\embedding_metadata.json"
)

EMBEDDINGS_PATH = Path(
    r"rag\knowledge_base\embeddings\embeddings.npy"
)

metadata = json.loads(
    METADATA_PATH.read_text(encoding="utf-8")
)

embeddings = np.load(
    EMBEDDINGS_PATH,
    mmap_mode="r"
)

client = QdrantClient(
    url=os.getenv("QDRANT_URL"),
    api_key=os.getenv("QDRANT_API_KEY"),
    timeout=300,
)

collection = os.getenv(
    "QDRANT_COLLECTION",
    "sanyuktvaani_kb"
)

total = len(metadata["chunks"])
batch_size = 25
max_retries = 5

print("=" * 60)
print("QDRANT KNOWLEDGE BASE UPLOAD")
print("=" * 60)
print(f"Collection       : {collection}")
print(f"Total vectors    : {total}")
print(f"Embedding shape  : {embeddings.shape}")
print(f"Batch size       : {batch_size}")
print("=" * 60)

for start in range(0, total, batch_size):

    end = min(start + batch_size, total)

    points = models.Batch(
        ids=list(range(start, end)),
        vectors=embeddings[start:end].tolist(),
        payloads=[
            {
                "text": chunk["text"],
                "metadata": {
                    "chunk_id": chunk["chunk_id"],
                    "source_file": chunk["source_file"],
                    "chunk_index": chunk["chunk_index"],
                },
            }
            for chunk in metadata["chunks"][start:end]
        ],
    )

    success = False

    for attempt in range(1, max_retries + 1):
        try:
            client.upsert(
                collection_name=collection,
                points=points,
                wait=True,
            )

            success = True
            break

        except Exception as error:
            print(
                f"Batch {start}-{end} failed "
                f"(attempt {attempt}/{max_retries}): {error}"
            )

            if attempt < max_retries:
                time.sleep(3)

    if not success:
        print(f"UPLOAD STOPPED at {start}/{total}")
        raise RuntimeError("Qdrant upload failed after retries.")

    print(f"Uploaded: {end}/{total}")

print("=" * 60)
print("UPLOAD COMPLETE")
print("=" * 60)

info = client.get_collection(collection)

print(f"Qdrant points: {info.points_count}")
print(f"Status       : {info.status}")