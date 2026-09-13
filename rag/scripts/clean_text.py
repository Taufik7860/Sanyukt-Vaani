from pathlib import Path
import re

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent

INPUT_DIR = BASE_DIR / "knowledge_base" / "extracted_text"
OUTPUT_DIR = BASE_DIR / "knowledge_base" / "cleaned_text"

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def clean_text(text):
    # Normalize line endings
    text = text.replace("\r\n", "\n").replace("\r", "\n")

    # Remove null characters
    text = text.replace("\x00", "")

    # Remove excessive spaces
    text = re.sub(r"[ \t]+", " ", text)

    # Remove excessive blank lines
    text = re.sub(r"\n{3,}", "\n\n", text)

    # Fix spaces before punctuation
    text = re.sub(r"\s+([,.;:!?])", r"\1", text)

    # Remove leading/trailing whitespace
    text = text.strip()

    return text


def main():
    files = list(INPUT_DIR.glob("*.txt"))

    print(f"Found {len(files)} TXT files")

    success = 0
    failed = 0

    for file in files:
        try:
            text = file.read_text(
                encoding="utf-8",
                errors="ignore"
            )

            cleaned = clean_text(text)

            output_file = OUTPUT_DIR / file.name

            output_file.write_text(
                cleaned,
                encoding="utf-8"
            )

            print(f"Cleaned: {file.name}")

            success += 1

        except Exception as e:
            print(f"Failed: {file.name}")
            print(f"Error: {e}")
            failed += 1

    print("\n==============================")
    print("TEXT CLEANING COMPLETE")
    print("==============================")
    print(f"Total  : {len(files)}")
    print(f"Success: {success}")
    print(f"Failed : {failed}")


if __name__ == "__main__":
    main()