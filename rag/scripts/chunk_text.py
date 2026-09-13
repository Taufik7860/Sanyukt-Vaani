from pathlib import Path
import json
import re

BASE_DIR = Path(__file__).resolve().parent.parent

INPUT_DIR = BASE_DIR / "knowledge_base" / "cleaned_text"
OUTPUT_DIR = BASE_DIR / "knowledge_base" / "chunks"

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Chunk settings
CHUNK_SIZE = 1000
CHUNK_OVERLAP = 150


def normalize_text(text):
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def create_chunks(text):
    text = normalize_text(text)

    # Split approximately by paragraphs
    paragraphs = re.split(r"\n\s*\n", text)

    chunks = []
    current = ""

    for paragraph in paragraphs:
        paragraph = paragraph.strip()

        if not paragraph:
            continue

        # If adding paragraph keeps us within chunk size
        if len(current) + len(paragraph) + 1 <= CHUNK_SIZE:
            current += paragraph + "\n\n"

        else:
            if current.strip():
                chunks.append(current.strip())

            # Handle very large paragraphs
            if len(paragraph) > CHUNK_SIZE:
                start = 0

                while start < len(paragraph):
                    end = start + CHUNK_SIZE
                    piece = paragraph[start:end]

                    chunks.append(piece.strip())

                    start = end - CHUNK_OVERLAP
            else:
                current = paragraph + "\n\n"

    if current.strip():
        chunks.append(current.strip())

    return chunks


def main():

    files = list(INPUT_DIR.glob("*.txt"))

    print(f"Found {len(files)} cleaned TXT files")

    total_chunks = 0
    failed = 0

    all_metadata = []

    for file in files:

        try:
            text = file.read_text(
                encoding="utf-8",
                errors="ignore"
            )

            chunks = create_chunks(text)

            # Create one JSON file for each document
            output_file = OUTPUT_DIR / f"{file.stem}.json"

            document_chunks = []

            for i, chunk in enumerate(chunks):

                chunk_data = {
                    "chunk_id": f"{file.stem}_chunk_{i+1}",
                    "source_file": file.name,
                    "chunk_index": i,
                    "text": chunk
                }

                document_chunks.append(chunk_data)

            output_file.write_text(
                json.dumps(
                    document_chunks,
                    ensure_ascii=False,
                    indent=2
                ),
                encoding="utf-8"
            )

            total_chunks += len(chunks)

            all_metadata.append({
                "source_file": file.name,
                "chunk_file": output_file.name,
                "num_chunks": len(chunks)
            })

            print(
                f"Chunked: {file.name} → {len(chunks)} chunks"
            )

        except Exception as e:

            print(f"Failed: {file.name}")
            print(f"Error: {e}")

            failed += 1

    # Overall chunk metadata
    metadata_file = OUTPUT_DIR / "chunks_metadata.json"

    metadata_file.write_text(
        json.dumps(
            {
                "total_documents": len(files),
                "total_chunks": total_chunks,
                "chunk_size": CHUNK_SIZE,
                "chunk_overlap": CHUNK_OVERLAP,
                "documents": all_metadata
            },
            ensure_ascii=False,
            indent=2
        ),
        encoding="utf-8"
    )

    print("\n==============================")
    print("CHUNKING COMPLETE")
    print("==============================")
    print(f"Documents : {len(files)}")
    print(f"Total chunks: {total_chunks}")
    print(f"Failed    : {failed}")


if __name__ == "__main__":
    main()