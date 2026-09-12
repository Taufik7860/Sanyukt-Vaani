"""
BHASHINI ASR Test
-----------------

Tests the complete BHASHINI Speech-to-Text flow:

    WAV Audio
        ↓
    BHASHINI Pipeline Config
        ↓
    ASR Service
        ↓
    BHASHINI Inference
        ↓
    Text

Usage:

    python tests/test_bhashini_asr.py

Default audio file:

    tests/audio/hindi_test.wav
"""

from __future__ import annotations

import sys
from pathlib import Path


# ---------------------------------------------------------------------------
# Make project root available when this file is executed directly
# ---------------------------------------------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parent.parent

if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))


# ---------------------------------------------------------------------------
# Import BHASHINI service
# ---------------------------------------------------------------------------

from backend.services.bhashini import (
    bhashini,
    BhashiniError,
)


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

AUDIO_FILE = (
    PROJECT_ROOT
    / "tests"
    / "audio"
    / "hindi_test.wav"
)

SOURCE_LANGUAGE = "hi"
AUDIO_FORMAT = "wav"
SAMPLING_RATE = 16000


# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------

def print_line():
    print("=" * 50)


def print_header():
    print()
    print_line()
    print("          BHASHINI ASR TEST")
    print_line()
    print()


def check_audio_file() -> bool:
    """Check whether the test audio file exists."""

    print("Audio file:")
    print(AUDIO_FILE)
    print()

    if not AUDIO_FILE.exists():
        print("ERROR: Audio file was not found.")
        print()
        print("Please create this file:")
        print(AUDIO_FILE)
        print()
        print("Example:")
        print("tests/audio/hindi_test.wav")
        return False

    if not AUDIO_FILE.is_file():
        print("ERROR: The audio path is not a file.")
        return False

    file_size = AUDIO_FILE.stat().st_size

    if file_size == 0:
        print("ERROR: Audio file is empty.")
        return False

    print("Audio file found.")
    print(f"Audio size: {file_size:,} bytes")
    print()

    return True


def load_audio() -> bytes:
    """Read the audio file as bytes."""

    print("Reading audio file...")

    with open(AUDIO_FILE, "rb") as audio_file:
        audio_bytes = audio_file.read()

    print(f"Audio bytes loaded: {len(audio_bytes):,}")
    print()

    return audio_bytes


# ---------------------------------------------------------------------------
# Main ASR test
# ---------------------------------------------------------------------------

def main():
    print_header()

    # -----------------------------------------------------------------------
    # Step 1: Check audio
    # -----------------------------------------------------------------------

    print("[1/4] Checking audio file...")
    print()

    if not check_audio_file():
        print()
        print_line()
        print("           ASR TEST FAILED")
        print_line()
        return 1

    # -----------------------------------------------------------------------
    # Step 2: Read audio
    # -----------------------------------------------------------------------

    print("[2/4] Loading audio...")
    print()

    try:
        audio_bytes = load_audio()

    except OSError as exc:
        print("ERROR: Could not read audio file.")
        print(f"Details: {exc}")
        print()
        print_line()
        print("           ASR TEST FAILED")
        print_line()
        return 1

    # -----------------------------------------------------------------------
    # Step 3: Send audio to BHASHINI
    # -----------------------------------------------------------------------

    print("[3/4] Sending audio to BHASHINI ASR...")
    print()
    print(f"Language      : {SOURCE_LANGUAGE}")
    print(f"Audio format  : {AUDIO_FORMAT}")
    print(f"Sampling rate : {SAMPLING_RATE}")
    print()
    print("Please wait...")
    print()

    try:
        result = bhashini.speech_to_text(
            audio_bytes=audio_bytes,
            source_language=SOURCE_LANGUAGE,
            audio_format=AUDIO_FORMAT,
            sampling_rate=SAMPLING_RATE,
        )

    except BhashiniError as exc:
        print_line()
        print("           BHASHINI ASR ERROR")
        print_line()
        print()
        print("Error:")
        print(exc)
        print()
        print("Possible things to check:")
        print("1. BHASHINI credentials in .env")
        print("2. BHASHINI pipeline ID")
        print("3. Audio format")
        print("4. Sampling rate")
        print("5. ASR language")
        print("6. Internet connection")
        print()
        return 1

    except Exception as exc:
        print_line()
        print("           UNEXPECTED ERROR")
        print_line()
        print()
        print("Error type:", type(exc).__name__)
        print("Error:", exc)
        print()
        return 1

    # -----------------------------------------------------------------------
    # Step 4: Display result
    # -----------------------------------------------------------------------

    print("[4/4] Processing BHASHINI response...")
    print()

    text = result.get("text", "")
    language = result.get("language", "")

    print_line()
    print("           BHASHINI ASR SUCCESS")
    print_line()
    print()

    print("Detected/Requested Language:")
    print(language)
    print()

    print("Recognized Text:")
    print("-" * 50)

    if text.strip():
        print(text)
    else:
        print("(No text returned)")

    print("-" * 50)
    print()

    if text.strip():
        print("Voice → Text conversion is working.")
        print()
        print_line()
        print("             TEST PASSED")
        print_line()
        return 0

    print("WARNING: BHASHINI responded but returned empty text.")
    print()
    print_line()
    print("        TEST COMPLETED WITH WARNING")
    print_line()

    return 1


# ---------------------------------------------------------------------------
# Run test
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    raise SystemExit(main())