from pathlib import Path
import json
import re

from pypdf import PdfReader
from docx import Document
from pdf2image import convert_from_path
import pytesseract


# ============================================================
# PATH CONFIGURATION
# ============================================================

# This file is:
# C:\SIH\sanyukt-vaani\rag\scripts\extract_documents.py
#
# parent      = scripts
# parent.parent = rag

BASE_DIR = Path(__file__).resolve().parent.parent

DOCUMENTS_DIR = BASE_DIR / "documents"

EXTRACTED_DIR = BASE_DIR / "knowledge_base" / "extracted_text"
METADATA_DIR = BASE_DIR / "knowledge_base" / "metadata"

METADATA_FILE = METADATA_DIR / "documents.json"


# ============================================================
# OCR CONFIGURATION
# ============================================================

# Tesseract is already available in your PATH.
# Therefore, we don't need to specify tesseract.exe manually.

# English OCR
OCR_LANGUAGE = "eng+hin+mar"

# DPI used when converting PDF pages to images.
# 200 is a good balance between quality and speed.
OCR_DPI = 200

# If normal PDF extraction gives fewer characters than this,
# OCR will be attempted.
MIN_TEXT_LENGTH = 50


# ============================================================
# CREATE REQUIRED DIRECTORIES
# ============================================================

EXTRACTED_DIR.mkdir(parents=True, exist_ok=True)
METADATA_DIR.mkdir(parents=True, exist_ok=True)


# ============================================================
# CLEAN TEXT
# ============================================================

def clean_text(text: str) -> str:
    """
    Basic text cleaning.

    Removes:
    - excessive spaces
    - excessive blank lines
    - unnecessary whitespace
    """

    if not text:
        return ""

    # Normalize line endings
    text = text.replace("\r\n", "\n")
    text = text.replace("\r", "\n")

    # Remove trailing spaces
    text = "\n".join(line.strip() for line in text.splitlines())

    # Replace multiple spaces/tabs with one space
    text = re.sub(r"[ \t]+", " ", text)

    # Reduce 3+ blank lines to maximum 2
    text = re.sub(r"\n{3,}", "\n\n", text)

    return text.strip()


# ============================================================
# CREATE SAFE FILE NAME
# ============================================================

def safe_filename(name: str) -> str:
    """
    Converts a filename into a safe filename for Windows.
    """

    name = re.sub(r'[<>:"/\\|?*]', "_", name)

    # Remove extra spaces
    name = re.sub(r"\s+", "_", name)

    return name.strip(" ._")


# ============================================================
# GENERATE UNIQUE OUTPUT FILE
# ============================================================

def get_unique_output_path(category: str, original_name: str) -> Path:
    """
    Creates filenames such as:

    pacs__guidelines.txt
    pacs__guidelines_2.txt
    pacs__guidelines_3.txt

    This prevents files with the same name from overwriting
    each other.
    """

    original_stem = Path(original_name).stem

    category = safe_filename(category)
    original_stem = safe_filename(original_stem)

    filename = f"{category}__{original_stem}.txt"

    output_path = EXTRACTED_DIR / filename

    counter = 2

    while output_path.exists():
        filename = f"{category}__{original_stem}_{counter}.txt"
        output_path = EXTRACTED_DIR / filename
        counter += 1

    return output_path


# ============================================================
# EXTRACT TEXT FROM PDF USING PYPDF
# ============================================================

def extract_pdf_text(pdf_path: Path) -> str:
    """
    Extract text from a normal text-based PDF using pypdf.
    """

    try:
        reader = PdfReader(str(pdf_path))

        pages_text = []

        for page_number, page in enumerate(reader.pages, start=1):

            try:
                page_text = page.extract_text()

                if page_text:
                    pages_text.append(page_text)

            except Exception as e:
                print(
                    f"   ⚠️ Could not extract page {page_number}: {e}"
                )

        return clean_text("\n\n".join(pages_text))

    except Exception as e:
        print(f"   ❌ PDF extraction error: {e}")
        return ""


# ============================================================
# OCR PDF
# ============================================================

def ocr_pdf(pdf_path: Path) -> str:
    """
    Convert PDF pages into images using Poppler,
    then run Tesseract OCR on every page.
    """

    try:

        print("   🔎 Running OCR...")

        images = convert_from_path(
            str(pdf_path),
            dpi=OCR_DPI
        )

        pages_text = []

        total_pages = len(images)

        for page_number, image in enumerate(images, start=1):

            print(
                f"      OCR page {page_number}/{total_pages}"
            )

            try:

                text = pytesseract.image_to_string(
                    image,
                    lang=OCR_LANGUAGE
                )

                if text:
                    pages_text.append(text)

            except Exception as e:

                print(
                    f"      ⚠️ OCR failed on page {page_number}: {e}"
                )

        return clean_text("\n\n".join(pages_text))

    except Exception as e:

        print(f"   ❌ OCR error: {e}")

        return ""


# ============================================================
# EXTRACT TEXT FROM DOCX
# ============================================================

def extract_docx_text(docx_path: Path) -> str:
    """
    Extract paragraphs and table contents from DOCX.
    """

    try:

        document = Document(str(docx_path))

        content = []

        # Paragraphs
        for paragraph in document.paragraphs:

            text = paragraph.text.strip()

            if text:
                content.append(text)

        # Tables
        for table in document.tables:

            for row in table.rows:

                row_text = []

                for cell in row.cells:

                    cell_text = cell.text.strip()

                    if cell_text:
                        row_text.append(cell_text)

                if row_text:
                    content.append(" | ".join(row_text))

        return clean_text("\n\n".join(content))

    except Exception as e:

        print(f"   ❌ DOCX extraction error: {e}")

        return ""


# ============================================================
# EXTRACT TEXT FROM TXT
# ============================================================

def extract_txt_text(txt_path: Path) -> str:
    """
    Read normal TXT files.
    """

    try:

        # utf-8 first
        try:

            text = txt_path.read_text(
                encoding="utf-8"
            )

        except UnicodeDecodeError:

            # fallback
            text = txt_path.read_text(
                encoding="latin-1"
            )

        return clean_text(text)

    except Exception as e:

        print(f"   ❌ TXT extraction error: {e}")

        return ""


# ============================================================
# DETERMINE CATEGORY
# ============================================================

def get_category(file_path: Path) -> str:
    """
    Uses the first folder under documents as the category.

    Example:

    documents/
        pacs/
            file.pdf

    category = pacs
    """

    try:

        relative_path = file_path.relative_to(DOCUMENTS_DIR)

        parts = relative_path.parts

        if len(parts) >= 2:
            return parts[0]

        return "uncategorized"

    except Exception:

        return "uncategorized"


# ============================================================
# PROCESS ONE FILE
# ============================================================

def process_file(file_path: Path):
    """
    Process one document.

    Returns metadata dictionary.
    """

    extension = file_path.suffix.lower()

    category = get_category(file_path)

    print()
    print("=" * 70)
    print(f"📄 Processing: {file_path.name}")
    print(f"📁 Category : {category}")
    print(f"📌 Type     : {extension}")

    text = ""
    extraction_method = "unknown"

    # --------------------------------------------------------
    # PDF
    # --------------------------------------------------------

    if extension == ".pdf":

        print("   📖 Trying normal PDF extraction...")

        text = extract_pdf_text(file_path)

        if len(text) >= MIN_TEXT_LENGTH:

            extraction_method = "pypdf"

            print(
                f"   ✅ Text extracted using pypdf "
                f"({len(text)} characters)"
            )

        else:

            print(
                "   ⚠️ Very little/no text found."
            )

            print(
                "   🔄 Switching to OCR..."
            )

            text = ocr_pdf(file_path)

            if len(text) >= MIN_TEXT_LENGTH:

                extraction_method = "ocr"

                print(
                    f"   ✅ Text extracted using OCR "
                    f"({len(text)} characters)"
                )

            else:

                extraction_method = "failed"

    # --------------------------------------------------------
    # DOCX
    # --------------------------------------------------------

    elif extension == ".docx":

        print("   📖 Extracting DOCX...")

        text = extract_docx_text(file_path)

        if len(text) >= MIN_TEXT_LENGTH:

            extraction_method = "python-docx"

        else:

            extraction_method = "failed"

    # --------------------------------------------------------
    # TXT
    # --------------------------------------------------------

    elif extension == ".txt":

        print("   📖 Reading TXT...")

        text = extract_txt_text(file_path)

        if len(text) >= MIN_TEXT_LENGTH:

            extraction_method = "txt"

        else:

            extraction_method = "failed"

    # --------------------------------------------------------
    # UNSUPPORTED
    # --------------------------------------------------------

    else:

        print(
            f"   ⚠️ Unsupported file type: {extension}"
        )

        extraction_method = "unsupported"

    # ========================================================
    # SAVE EXTRACTED TEXT
    # ========================================================

    if extraction_method not in ["failed", "unsupported"] and text:

        output_path = get_unique_output_path(
            category,
            file_path.name
        )

        output_path.write_text(
            text,
            encoding="utf-8"
        )

        print(
            f"   💾 Saved: {output_path.name}"
        )

        return {
            "source_file": str(
                file_path.relative_to(BASE_DIR)
            ),

            "output_file": str(
                output_path.relative_to(BASE_DIR)
            ),

            "category": category,

            "file_type": extension,

            "extraction_method": extraction_method,

            "text_length": len(text),

            "status": "success"
        }

    # ========================================================
    # FAILED FILE
    # ========================================================

    print(
        "   ❌ Could not extract usable text"
    )

    return {
        "source_file": str(
            file_path.relative_to(BASE_DIR)
        ),

        "output_file": None,

        "category": category,

        "file_type": extension,

        "extraction_method": extraction_method,

        "text_length": len(text),

        "status": "failed"
    }


# ============================================================
# MAIN
# ============================================================

def main():

    print()
    print("=" * 70)
    print("🚀 SANYUKTVAANI KNOWLEDGE BASE EXTRACTION")
    print("=" * 70)

    print()
    print(f"📂 Documents : {DOCUMENTS_DIR}")
    print(f"📂 Output    : {EXTRACTED_DIR}")
    print(f"📂 Metadata  : {METADATA_FILE}")
    print()

    # --------------------------------------------------------
    # Check documents folder
    # --------------------------------------------------------

    if not DOCUMENTS_DIR.exists():

        print(
            f"❌ Documents folder not found:\n"
            f"{DOCUMENTS_DIR}"
        )

        return

    # --------------------------------------------------------
    # Find documents
    # --------------------------------------------------------

    supported_extensions = {
        ".pdf",
        ".docx",
        ".txt"
    }

    files = [
        file_path
        for file_path in DOCUMENTS_DIR.rglob("*")
        if file_path.is_file()
        and file_path.suffix.lower()
        in supported_extensions
    ]

    print(
        f"📚 Found {len(files)} supported documents."
    )

    # --------------------------------------------------------
    # Process documents
    # --------------------------------------------------------

    results = []

    for file_path in files:

        result = process_file(file_path)

        results.append(result)

    # --------------------------------------------------------
    # Save metadata
    # --------------------------------------------------------

    METADATA_FILE.write_text(
        json.dumps(
            results,
            indent=4,
            ensure_ascii=False
        ),
        encoding="utf-8"
    )

    # --------------------------------------------------------
    # Statistics
    # --------------------------------------------------------

    total = len(results)

    successful = sum(
        1
        for result in results
        if result["status"] == "success"
    )

    failed = sum(
        1
        for result in results
        if result["status"] == "failed"
    )

    ocr_used = sum(
        1
        for result in results
        if result["extraction_method"] == "ocr"
    )

    normal_pdf = sum(
        1
        for result in results
        if result["extraction_method"] == "pypdf"
    )

    docx_count = sum(
        1
        for result in results
        if result["extraction_method"] == "python-docx"
    )

    txt_count = sum(
        1
        for result in results
        if result["extraction_method"] == "txt"
    )

    # --------------------------------------------------------
    # Final report
    # --------------------------------------------------------

    print()
    print("=" * 70)
    print("🎯 EXTRACTION COMPLETED")
    print("=" * 70)

    print(
        f"📄 Total documents     : {total}"
    )

    print(
        f"✅ Successfully         : {successful}"
    )

    print(
        f"❌ Failed               : {failed}"
    )

    print(
        f"🔎 OCR used            : {ocr_used}"
    )

    print(
        f"📖 Normal PDF (pypdf)  : {normal_pdf}"
    )

    print(
        f"📝 DOCX                : {docx_count}"
    )

    print(
        f"📃 TXT                 : {txt_count}"
    )

    print()
    print(
        f"📁 Extracted text      : {EXTRACTED_DIR}"
    )

    print(
        f"📋 Metadata file       : {METADATA_FILE}"
    )

    print("=" * 70)


# ============================================================
# RUN
# ============================================================

if __name__ == "__main__":
    main()