from __future__ import annotations

import re


SUPPORTED_LANGUAGES = {
    "en": "English",
    "hi": "Hindi",
    "mr": "Marathi",
}


# Common Marathi words that help distinguish Marathi
# from Hindi when both use Devanagari script.
MARATHI_WORDS = {
    "आहे",
    "आहेत",
    "होते",
    "होती",
    "होता",
    "होईल",
    "होणार",
    "करा",
    "करावे",
    "करायचे",
    "करण्यासाठी",
    "काय",
    "कसे",
    "कशी",
    "कुठे",
    "कोठे",
    "कोणते",
    "कोणत्या",
    "माझे",
    "माझ्या",
    "तुमचे",
    "तुमच्या",
    "आपले",
    "आपल्या",
    "शेतकरी",
    "शेतकऱ्यांना",
    "शेतकऱ्यांसाठी",
    "पीक",
    "कर्ज",
    "माहिती",
    "द्या",
    "सांगा",
    "मला",
    "मध्ये",
    "साठी",
    "पासून",
    "पर्यंत",
    "आणि",
    "पण",
    "जर",
    "तर",
    "नाही",
    "नको",
    "कृपया",
    "अर्ज",
    "कागदपत्रे",
    "लाभ",
    "पात्रता",
}


# Common Hindi words that help distinguish Hindi
# from Marathi when both use Devanagari script.
HINDI_WORDS = {
    "है",
    "हैं",
    "था",
    "थी",
    "थे",
    "होगा",
    "होगी",
    "होंगे",
    "करें",
    "करना",
    "करने",
    "क्या",
    "कैसे",
    "कैसी",
    "कहाँ",
    "कौन",
    "कौनसे",
    "कौनसी",
    "मेरा",
    "मेरे",
    "मेरी",
    "आपका",
    "आपके",
    "आपकी",
    "योजना",
    "किसान",
    "किसानों",
    "फसल",
    "ऋण",
    "जानकारी",
    "बताएं",
    "बताइए",
    "मुझे",
    "में",
    "लिए",
    "से",
    "तक",
    "और",
    "लेकिन",
    "अगर",
    "तो",
    "नहीं",
    "कृपया",
    "आवेदन",
    "दस्तावेज",
    "लाभ",
    "पात्रता",
}


def _extract_tokens(text: str) -> list[str]:
    """
    Extract Devanagari and English alphabet tokens.
    """
    return re.findall(
        r"[\u0900-\u097F]+|[A-Za-z]+",
        text.lower(),
    )


def detect_language(text: str) -> str:
    """
    Detect the user's language.

    Supported:
        en = English
        hi = Hindi
        mr = Marathi

    Returns:
        A two-letter language code.
    """

    text = (text or "").strip()

    if not text:
        return "en"

    tokens = _extract_tokens(text)

    if not tokens:
        return "en"

    devanagari_tokens = [
        token
        for token in tokens
        if any(
            "\u0900" <= character <= "\u097F"
            for character in token
        )
    ]

    english_tokens = [
        token
        for token in tokens
        if token.isascii() and token.isalpha()
    ]

    # Pure English / Latin-script question.
    if english_tokens and not devanagari_tokens:
        return "en"

    # Hindi and Marathi both use Devanagari,
    # so we need lexical clues to distinguish them.
    if devanagari_tokens:
        normalized_tokens = {
            token.strip()
            for token in devanagari_tokens
        }

        marathi_score = sum(
            1
            for token in normalized_tokens
            if token in MARATHI_WORDS
        )

        hindi_score = sum(
            1
            for token in normalized_tokens
            if token in HINDI_WORDS
        )

        if marathi_score > hindi_score:
            return "mr"

        if hindi_score > marathi_score:
            return "hi"

        # Additional Marathi-specific patterns.
        marathi_patterns = [
            r"आहेत",
            r"माझ्या",
            r"तुमच्या",
            r"आपल्या",
            r"शेतकऱ्य",
            r"कागदपत्रे",
            r"सांगा",
            r"द्या",
            r"करावे",
            r"कोणत्या",
            r"कुठे",
        ]

        # Additional Hindi-specific patterns.
        hindi_patterns = [
            r"हैं",
            r"मुझे",
            r"आपके",
            r"मेरे",
            r"किसानों",
            r"बताइए",
            r"दस्तावेज",
            r"करें",
            r"कौनसे",
            r"कहाँ",
        ]

        marathi_pattern_score = sum(
            len(re.findall(pattern, text))
            for pattern in marathi_patterns
        )

        hindi_pattern_score = sum(
            len(re.findall(pattern, text))
            for pattern in hindi_patterns
        )

        if marathi_pattern_score > hindi_pattern_score:
            return "mr"

        return "hi"

    # Safe default.
    return "en"


def get_language_name(language: str) -> str:
    """
    Convert language code into display name.
    """

    return SUPPORTED_LANGUAGES.get(
        (language or "").strip().lower(),
        "English",
    )