from pathlib import Path
import json
import numpy as np
from sentence_transformers import SentenceTransformer

# ==============================
# PATHS
# ==============================

BASE_DIR = Path(__file__).resolve().parent.parent

CHUNKS_DIR = BASE_DIR / "knowledge_base" / "chunks"
OUTPUT_DIR = BASE_DIR / "knowledge_base" / "embeddings"

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


# ==============================
# MODEL
# ==============================

MODEL_NAME = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"

print("=" * 60)
print("Loading embedding model...")
print("=" * 60)

model = SentenceTransformer(MODEL_NAME)

print("Model loaded successfully!")


# ==============================
# FIND CHUNK FILES
# ==============================

chunk_files = [
    f for f in CHUNKS_DIR.glob("*.json")
    if f.name != "chunks_metadata.json"
]

print(f"\nChunk files found: {len(chunk_files)}")


# ==============================
# PROCESS CHUNKS
# ==============================

all_chunks = []
all_texts = []

for file in chunk_files:

    try:
        data = json.loads(
            file.read_text(
                encoding="utf-8"
            )
        )

        for chunk in data:

            all_chunks.append(chunk)
            all_texts.append(chunk["text"])

    except Exception as e:

        print(f"ERROR reading {file.name}: {e}")


print(f"Total chunks loaded: {len(all_chunks)}")


# ==============================
# CREATE EMBEDDINGS
# ==============================

print("\nCreating embeddings...")
print("This may take some time.\n")

embeddings = model.encode(
    all_texts,
    batch_size=32,
    show_progress_bar=True,
    normalize_embeddings=True
)

embeddings = np.asarray(
    embeddings,
    dtype=np.float32
)


# ==============================
# SAVE EMBEDDINGS
# ==============================

embedding_file = OUTPUT_DIR / "embeddings.npy"
metadata_file = OUTPUT_DIR / "embedding_metadata.json"

np.save(
    embedding_file,
    embeddings
)


metadata = {
    "model": MODEL_NAME,
    "total_chunks": len(all_chunks),
    "embedding_dimension": int(embeddings.shape[1]),
    "normalized": True,
    "chunks": all_chunks
}

metadata_file.write_text(
    json.dumps(
        metadata,
        ensure_ascii=False
    ),
    encoding="utf-8"
)


# ==============================
# SUMMARY
# ==============================

print("\n" + "=" * 60)
print("EMBEDDINGS COMPLETE")
print("=" * 60)

print(f"Total chunks       : {len(all_chunks)}")
print(f"Embedding dimension: {embeddings.shape[1]}")
print(f"Embedding shape    : {embeddings.shape}")

print(f"\nSaved:")
print(f"  {embedding_file}")
print(f"  {metadata_file}")

print("\nDone!")