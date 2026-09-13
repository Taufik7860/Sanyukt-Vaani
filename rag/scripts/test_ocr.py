from pathlib import Path
from pdf2image import convert_from_path
import pytesseract

PDF_FILE = Path(r"C:\SIH\sanyukt-vaani\rag\documents\maharashtra_cooperation\20260418448942157.pdf")

OUTPUT_FILE = Path(r"C:\SIH\sanyukt-vaani\rag\knowledge_base\test_marathi_ocr.txt")

OCR_LANGUAGE = "eng+hin+mar"

print("Starting OCR...")
print(f"PDF: {PDF_FILE}")

images = convert_from_path(
    PDF_FILE,
    dpi=300
)

print(f"Pages found: {len(images)}")

all_text = []

for i, image in enumerate(images, start=1):
    print(f"OCR processing page {i}/{len(images)}...")

    text = pytesseract.image_to_string(
        image,
        lang=OCR_LANGUAGE
    )

    all_text.append(text)

OUTPUT_FILE.write_text(
    "\n\n".join(all_text),
    encoding="utf-8"
)

print("\nOCR completed successfully!")
print(f"Output: {OUTPUT_FILE}")