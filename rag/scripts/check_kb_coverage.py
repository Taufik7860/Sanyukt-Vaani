import os
import json
import re
from collections import defaultdict

# ============================================================
# SANYUKT VAANI - KNOWLEDGE BASE COVERAGE CHECKER
# ============================================================

BASE_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "knowledge_base")
)

CHUNKS_DIR = os.path.join(BASE_DIR, "chunks")


# ------------------------------------------------------------
# Topics we want to check
# ------------------------------------------------------------

TOPICS = {
    "Agricultural Loan": [
        "agricultural loan",
        "agriculture loan",
        "agricultural credit",
        "farm loan",
        "farmer loan",
        "crop loan",
        "agriculture credit",
        "farm credit",
        "agricultural finance",
        "कृषि ऋण",
        "कृषि कर्ज",
        "शेतकरी कर्ज",
        "पीक कर्ज",
    ],

    "KCC / Kisan Credit Card": [
        "kcc",
        "kisan credit card",
        "kisan credit",
        "kisan credit card scheme",
        "किसान क्रेडिट कार्ड",
        "किसान क्रेडिट",
        "किसान कार्ड",
        "किसान क्रेडिट कार्ड योजना",
    ],

    "Loan Documents": [
        "loan documents",
        "documents required for loan",
        "documents required",
        "required documents",
        "loan application",
        "loan application form",
        "documents for loan",
        "loan papers",
        "आवश्यक दस्तावेज",
        "ऋण दस्तावेज",
        "कर्जासाठी आवश्यक कागदपत्रे",
        "कर्ज कागदपत्रे",
    ],

    "PACS Membership": [
        "pacs membership",
        "membership of pacs",
        "member of pacs",
        "pacs member",
        "admission of member",
        "admission of members",
        "membership eligibility",
        "eligibility for membership",
        "member eligibility",
        "सभासदत्व",
        "सभासद",
        "सदस्यता",
        "सदस्य",
    ],

    "PACS Membership Documents": [
        "pacs membership documents",
        "documents for pacs membership",
        "documents required for pacs",
        "membership application",
        "membership application form",
        "application for membership",
        "admission application",
        "documents required for membership",
        "membership documents",
        "सभासदत्व कागदपत्रे",
        "सभासद होण्यासाठी कागदपत्रे",
        "सदस्यता दस्तावेज",
        "सदस्य बनने के लिए दस्तावेज",
    ],

    "Financial Literacy": [
        "financial literacy",
        "financial education",
        "financial awareness",
        "financial inclusion",
        "banking awareness",
        "money management",
        "saving",
        "savings",
        "credit awareness",
        "financial planning",
        "वित्तीय साक्षरता",
        "वित्तीय जागरूकता",
        "आर्थिक साक्षरता",
        "आर्थिक जागरूकता",
    ],

    "Cooperative Schemes": [
        "cooperative scheme",
        "cooperative schemes",
        "government scheme",
        "government schemes",
        "ministry of cooperation",
        "ministry of cooperation scheme",
        "scheme for cooperative",
        "cooperative development scheme",
        "सहकारी योजना",
        "सहकार योजना",
        "सरकारी योजना",
    ],

    "PMFBY / Crop Insurance": [
        "pmfby",
        "pradhan mantri fasal bima yojana",
        "crop insurance",
        "crop insurance scheme",
        "fasal bima",
        "फसल बीमा",
        "प्रधानमंत्री फसल बीमा योजना",
        "पीक विमा",
        "प्रधानमंत्री पीक विमा योजना",
    ],

    "Cooperative Grievance": [
        "grievance",
        "grievance redressal",
        "complaint",
        "complaint against cooperative",
        "complaint against cooperative society",
        "cooperative complaint",
        "register complaint",
        "file complaint",
        "शिकायत",
        "शिकायत निवारण",
        "तक्रार",
        "तक्रार निवारण",
    ],
}


# ------------------------------------------------------------
# Read chunk files
# ------------------------------------------------------------

def load_chunks():

    if not os.path.exists(CHUNKS_DIR):
        print("\nERROR: chunks folder not found!")
        print("Expected location:")
        print(CHUNKS_DIR)
        return []

    all_chunks = []

    print("\nScanning:")
    print(CHUNKS_DIR)
    print()

    for root, dirs, files in os.walk(CHUNKS_DIR):

        for filename in files:

            filepath = os.path.join(root, filename)

            try:

                # ------------------------------------------------
                # JSON
                # ------------------------------------------------
                if filename.lower().endswith(".json"):

                    with open(filepath, "r", encoding="utf-8") as f:
                        data = json.load(f)

                    if isinstance(data, list):
                        for item in data:
                            if isinstance(item, dict):
                                item["_file"] = filename
                                item["_filepath"] = filepath
                                all_chunks.append(item)

                    elif isinstance(data, dict):

                        # Sometimes JSON contains a list under a key
                        found_list = False

                        for value in data.values():

                            if isinstance(value, list):

                                for item in value:

                                    if isinstance(item, dict):
                                        item["_file"] = filename
                                        item["_filepath"] = filepath
                                        all_chunks.append(item)

                                found_list = True

                        if not found_list:
                            data["_file"] = filename
                            data["_filepath"] = filepath
                            all_chunks.append(data)

                # ------------------------------------------------
                # JSONL
                # ------------------------------------------------
                elif filename.lower().endswith(".jsonl"):

                    with open(filepath, "r", encoding="utf-8") as f:

                        for line in f:

                            line = line.strip()

                            if not line:
                                continue

                            try:
                                item = json.loads(line)

                                if isinstance(item, dict):
                                    item["_file"] = filename
                                    item["_filepath"] = filepath
                                    all_chunks.append(item)

                            except json.JSONDecodeError:
                                continue

                # ------------------------------------------------
                # TXT
                # ------------------------------------------------
                elif filename.lower().endswith(".txt"):

                    with open(filepath, "r", encoding="utf-8") as f:
                        text = f.read()

                    all_chunks.append({
                        "text": text,
                        "_file": filename,
                        "_filepath": filepath
                    })

            except Exception as e:

                print(f"Could not read {filepath}")
                print(f"Reason: {e}")

    return all_chunks


# ------------------------------------------------------------
# Convert chunk to searchable text
# ------------------------------------------------------------

def chunk_to_text(chunk):

    parts = []

    for key, value in chunk.items():

        if key.startswith("_"):
            continue

        if value is None:
            continue

        if isinstance(value, (dict, list)):
            value = json.dumps(
                value,
                ensure_ascii=False
            )

        parts.append(str(value))

    return " ".join(parts)


# ------------------------------------------------------------
# Search topic
# ------------------------------------------------------------

def search_topic(chunks, keywords):

    matches = []

    for chunk in chunks:

        text = chunk_to_text(chunk)

        if not text:
            continue

        text_lower = text.lower()

        matched_keywords = []

        for keyword in keywords:

            keyword_lower = keyword.lower()

            # Normal substring search
            if keyword_lower in text_lower:
                matched_keywords.append(keyword)

        if matched_keywords:

            matches.append({
                "chunk": chunk,
                "keywords": matched_keywords
            })

    return matches


# ------------------------------------------------------------
# Get source name
# ------------------------------------------------------------

def get_source(chunk):

    metadata = chunk.get("metadata", {})

    if isinstance(metadata, dict):

        source = (
            metadata.get("source_file")
            or metadata.get("source")
            or metadata.get("filename")
        )

        if source:
            return str(source)

    return (
        chunk.get("source_file")
        or chunk.get("source")
        or chunk.get("_file")
        or "Unknown"
    )


# ------------------------------------------------------------
# Get chunk ID
# ------------------------------------------------------------

def get_chunk_id(chunk):

    metadata = chunk.get("metadata", {})

    if isinstance(metadata, dict):

        chunk_id = (
            metadata.get("chunk_id")
            or metadata.get("id")
        )

        if chunk_id:
            return str(chunk_id)

    return str(
        chunk.get("chunk_id")
        or chunk.get("id")
        or "Unknown"
    )


# ------------------------------------------------------------
# Get actual text
# ------------------------------------------------------------

def get_text(chunk):

    text = chunk.get("text", "")

    if text:
        return str(text)

    return chunk_to_text(chunk)


# ------------------------------------------------------------
# Main
# ------------------------------------------------------------

def main():

    print("=" * 70)
    print("SANYUKT VAANI - KNOWLEDGE BASE COVERAGE CHECK")
    print("=" * 70)

    chunks = load_chunks()

    print()
    print(f"Total chunks found: {len(chunks):,}")

    if not chunks:
        print("\nNo chunks found.")
        return

    print("\n" + "=" * 70)
    print("TOPIC COVERAGE")
    print("=" * 70)

    results = {}

    for topic, keywords in TOPICS.items():

        matches = search_topic(chunks, keywords)

        results[topic] = matches

        print("\n" + "-" * 70)
        print(f"TOPIC: {topic}")
        print("-" * 70)

        print(f"Matching chunks: {len(matches):,}")

        if len(matches) == 0:
            status = "❌ MISSING"

        elif len(matches) < 5:
            status = "⚠️ VERY WEAK"

        elif len(matches) < 20:
            status = "⚠️ PARTIAL"

        else:
            status = "✅ GOOD"

        print(f"Status: {status}")

        if matches:

            # ----------------------------------------------------
            # Show maximum 5 unique sources
            # ----------------------------------------------------

            sources = []

            for match in matches:

                source = get_source(match["chunk"])

                if source not in sources:
                    sources.append(source)

                if len(sources) >= 5:
                    break

            print("\nExample source files:")

            for source in sources:
                print(f"  • {source}")

            # ----------------------------------------------------
            # Show first 3 matching chunks
            # ----------------------------------------------------

            print("\nSample matching chunks:")

            for i, match in enumerate(matches[:3], start=1):

                chunk = match["chunk"]

                source = get_source(chunk)
                chunk_id = get_chunk_id(chunk)
                text = get_text(chunk)

                # Clean whitespace
                text = re.sub(r"\s+", " ", text).strip()

                # Limit preview
                if len(text) > 350:
                    text = text[:350] + "..."

                print(f"\n  [{i}] Source : {source}")
                print(f"      Chunk  : {chunk_id}")
                print(f"      Match  : {', '.join(match['keywords'])}")
                print(f"      Text   : {text}")

    # ------------------------------------------------------------
    # Final summary
    # ------------------------------------------------------------

    print("\n\n" + "=" * 70)
    print("FINAL SUMMARY")
    print("=" * 70)

    for topic, matches in results.items():

        count = len(matches)

        if count == 0:
            status = "❌ MISSING"

        elif count < 5:
            status = "⚠️ VERY WEAK"

        elif count < 20:
            status = "⚠️ PARTIAL"

        else:
            status = "✅ GOOD"

        print(f"{topic:<35} {count:>6,} chunks   {status}")

    print("\n" + "=" * 70)
    print("IMPORTANT")
    print("=" * 70)

    print("""
This script only CHECKS the Knowledge Base.

It does NOT:
- delete documents
- modify chunks
- modify embeddings
- modify Qdrant
- upload anything

After seeing this report, we will decide whether:
1. Existing documents are enough
2. Retrieval/reranking needs improvement
3. Additional official documents are required
""")

    print("=" * 70)


if __name__ == "__main__":
    main()