import {
  Sparkles,
  FileCheck2,
  ShieldCheck,
  Volume2
} from "lucide-react";

import { useLanguage } from "../context/LanguageContext";

/**
 * Clean text ONLY for Text-to-Speech.
 *
 * IMPORTANT:
 * - This function never changes the text displayed in the chat.
 * - It only prepares a clean, natural version for speech.
 * - English / Hindi / Marathi Unicode is preserved.
 * - Important technical terms such as PACS, NABARD, RBI,
 *   PMFBY, KCC, etc. are preserved.
 */
function cleanTextForSpeech(text) {
  if (!text) {
    return "";
  }

  let cleaned = String(text);

  // ---------------------------------------------------------
  // 1. Normalize Unicode
  // ---------------------------------------------------------
  cleaned = cleaned.normalize("NFKC");

  // ---------------------------------------------------------
  // 2. Remove URLs
  // ---------------------------------------------------------
  cleaned = cleaned.replace(
    /https?:\/\/[^\s]+/gi,
    " "
  );

  // ---------------------------------------------------------
  // 3. Remove Markdown headings
  //
  // ### Documents Required
  // becomes:
  // Documents Required
  // ---------------------------------------------------------
  cleaned = cleaned.replace(
    /^\s*#{1,6}\s*/gm,
    ""
  );

  // ---------------------------------------------------------
  // 4. Remove Markdown bold / italic markers
  //
  // **text** -> text
  // __text__ -> text
  // *text* -> text
  // _text_ -> text
  // ---------------------------------------------------------
  cleaned = cleaned.replace(
    /(\*\*|__|\*|_)/g,
    ""
  );

  // ---------------------------------------------------------
  // 5. Remove inline code markers
  //
  // `PACS` -> PACS
  // ---------------------------------------------------------
  cleaned = cleaned.replace(
    /`+/g,
    ""
  );

  // ---------------------------------------------------------
  // 6. Remove decorative separator lines
  //
  // --------------------
  // ____________________
  // ++++++++++++++++++++
  // ********************
  // ====================
  // ~~~~~~~~~~~~~~~~~~~~
  // ---------------------------------------------------------
  cleaned = cleaned.replace(
    /^\s*[_\-+=*~]{3,}\s*$/gm,
    ""
  );

  // ---------------------------------------------------------
  // 7. Remove long underscore sequences
  //
  // Name: ____________
  // becomes:
  // Name:
  // ---------------------------------------------------------
  cleaned = cleaned.replace(
    /_{2,}/g,
    " "
  );

  // ---------------------------------------------------------
  // 8. Remove repeated decorative symbols
  //
  // +++++ -> removed
  // ----- -> removed
  // ***** -> removed
  // ===== -> removed
  // ~~~~~ -> removed
  //
  // Normal single hyphens remain.
  // Example:
  // PM-KISAN remains PM-KISAN
  // ---------------------------------------------------------
  cleaned = cleaned.replace(
    /\+{2,}/g,
    " "
  );

  cleaned = cleaned.replace(
    /-{3,}/g,
    " "
  );

  cleaned = cleaned.replace(
    /\*{2,}/g,
    " "
  );

  cleaned = cleaned.replace(
    /={2,}/g,
    " "
  );

  cleaned = cleaned.replace(
    /~{2,}/g,
    " "
  );

  // ---------------------------------------------------------
  // 9. Remove Markdown bullet formatting
  //
  // - Aadhaar Card
  // * Application Form
  // • Land Record
  //
  // becomes normal spoken lines.
  // ---------------------------------------------------------
  cleaned = cleaned.replace(
    /^\s*[-*•]\s+/gm,
    ""
  );

  // ---------------------------------------------------------
  // 10. Remove blockquote formatting
  //
  // > Important information
  // becomes:
  // Important information
  // ---------------------------------------------------------
  cleaned = cleaned.replace(
    /^\s*>\s*/gm,
    ""
  );

  // ---------------------------------------------------------
  // 11. Remove Markdown table separator rows
  //
  // |------|------|
  // |:----:|------|
  // ---------------------------------------------------------
  cleaned = cleaned.replace(
    /^\s*\|?[\s\-:|]+\|?\s*$/gm,
    ""
  );

  // ---------------------------------------------------------
  // 12. Remove table pipe characters
  //
  // This prevents the TTS engine from reading table
  // formatting as strange pauses or symbols.
  // ---------------------------------------------------------
  cleaned = cleaned.replace(
    /\|/g,
    " "
  );

  // ---------------------------------------------------------
  // 13. Remove common decorative Unicode symbols
  //
  // Keep normal Hindi / Marathi / English characters.
  // ---------------------------------------------------------
  cleaned = cleaned.replace(
    /[★☆✦✧◆◇▪▫►▶✔✓✕✖]/g,
    " "
  );

  // ---------------------------------------------------------
  // 14. Remove decorative brackets
  //
  // Keep normal punctuation such as:
  // . , ? ! : ;
  // ---------------------------------------------------------
  cleaned = cleaned.replace(
    /[\[\]{}]/g,
    " "
  );

  // ---------------------------------------------------------
  // 15. Remove repeated punctuation
  //
  // !!!!!! -> !
  // ?????? -> ?
  // ...... -> ...
  // ---------------------------------------------------------
  cleaned = cleaned.replace(
    /!{2,}/g,
    "!"
  );

  cleaned = cleaned.replace(
    /\?{2,}/g,
    "?"
  );

  cleaned = cleaned.replace(
    /\.{4,}/g,
    "..."
  );

  // ---------------------------------------------------------
  // 16. Remove common internal/system leakage
  //
  // These should never be spoken if accidentally returned
  // by backend/RAG.
  // ---------------------------------------------------------
  cleaned = cleaned.replace(
    /\b(?:source|sources|retrieval|retrieved|context|embedding|reranker|qdrant|gemini)\s*[:=]\s*[^\n]+/gi,
    " "
  );

  // ---------------------------------------------------------
  // 17. Remove common internal source markers
  //
  // Examples:
  // [SOURCE]
  // [DOCUMENT]
  // [CHUNK]
  // [METADATA]
  // ---------------------------------------------------------
  cleaned = cleaned.replace(
    /\[(?:source|sources|document|documents|chunk|metadata|retrieval|context)\]/gi,
    " "
  );

  // ---------------------------------------------------------
  // 18. Remove accidental internal confidence/debug labels
  //
  // These are not useful in speech.
  // ---------------------------------------------------------
  cleaned = cleaned.replace(
    /\b(?:final score|similarity score|rerank score|retrieval score|confidence score)\s*[:=]?\s*\d+(?:\.\d+)?%?\b/gi,
    " "
  );

  // ---------------------------------------------------------
  // 19. Normalize line endings
  // ---------------------------------------------------------
  cleaned = cleaned.replace(
    /\r\n/g,
    "\n"
  );

  cleaned = cleaned.replace(
    /\r/g,
    "\n"
  );

  // ---------------------------------------------------------
  // 20. Prevent excessive empty lines
  // ---------------------------------------------------------
  cleaned = cleaned.replace(
    /\n{3,}/g,
    "\n\n"
  );

  // ---------------------------------------------------------
  // 21. Clean spaces around punctuation
  // ---------------------------------------------------------
  cleaned = cleaned.replace(
    /[ \t]{2,}/g,
    " "
  );

  cleaned = cleaned.replace(
    /\s+([,.!?;:])/g,
    "$1"
  );

  // ---------------------------------------------------------
  // 22. Clean spaces after opening punctuation
  // ---------------------------------------------------------
  cleaned = cleaned.replace(
    /([(\[])\s+/g,
    "$1"
  );

  // ---------------------------------------------------------
  // 23. Clean spaces before closing punctuation
  // ---------------------------------------------------------
  cleaned = cleaned.replace(
    /\s+([)\]])/g,
    "$1"
  );

  // ---------------------------------------------------------
  // 24. Convert colon-only labels into natural pauses
  //
  // Example:
  //
  // Name:
  // Taufik Ali
  //
  // becomes:
  //
  // Name.
  // Taufik Ali
  //
  // We only do this for short label-like lines.
  // ---------------------------------------------------------
  cleaned = cleaned.replace(
    /(^|\n)([A-Za-z\u0900-\u097F][^:\n]{1,40}):\s*(?=\n|$)/g,
    "$1$2.\n"
  );

  // ---------------------------------------------------------
  // 25. Clean each line
  // ---------------------------------------------------------
  cleaned = cleaned
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");

  // ---------------------------------------------------------
  // 26. Final whitespace cleanup
  // ---------------------------------------------------------
  cleaned = cleaned
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .trim();

  return cleaned;
}

/**
 * Normalize backend/frontend language values.
 *
 * Supports:
 * en / english / English
 * hi / hindi / Hindi
 * mr / marathi / Marathi
 */
function normalizeLanguage(language, fallback = "en") {
  const value = String(language || "")
    .trim()
    .toLowerCase();

  if (
    value === "en" ||
    value === "english" ||
    value === "eng"
  ) {
    return "en";
  }

  if (
    value === "hi" ||
    value === "hindi" ||
    value === "hin"
  ) {
    return "hi";
  }

  if (
    value === "mr" ||
    value === "marathi" ||
    value === "mar"
  ) {
    return "mr";
  }

  return fallback;
}

function ChatMessage({
  message,
  onSpeak
}) {
  const {
    languageId,
    speakText
  } = useLanguage();

  const isAI = message.role === "assistant";

  /**
   * Speak the answer again.
   *
   * IMPORTANT:
   * The UI continues displaying message.text exactly as received.
   * Only the speech copy is cleaned.
   */
  const handleSpeak = () => {
    const speechText = cleanTextForSpeech(
      message.text
    );

    if (!speechText) {
      return;
    }

    /**
     * Prefer the language associated with this specific
     * response when available.
     *
     * Otherwise use the currently selected UI language.
     */
    const speechLanguage = normalizeLanguage(
      message.language ||
        message.detected_language ||
        message.response_language ||
        languageId,
      normalizeLanguage(languageId, "en")
    );

    if (onSpeak) {
      onSpeak(
        speechText,
        speechLanguage
      );
      return;
    }

    speakText(
      speechText,
      speechLanguage
    );
  };

  return (
    <div
      className={`message-row ${
        isAI ? "ai" : "user"
      }`}
    >
      {/* -------------------------------------------------
          MESSAGE AVATAR
      -------------------------------------------------- */}
      <div
        className={`message-avatar ${
          isAI ? "ai" : "user"
        }`}
      >
        {isAI ? (
          <Sparkles size={15} />
        ) : (
          "T"
        )}
      </div>

      {/* -------------------------------------------------
          MESSAGE CONTENT
      -------------------------------------------------- */}
      <div className="message-bubble">

        {/* -------------------------------------------------
            ORIGINAL CHAT TEXT

            IMPORTANT:
            Never pass the cleaned TTS text here.

            The citizen should see the complete answer
            exactly as returned by the backend.
        -------------------------------------------------- */}
        <p>
          {message.text}
        </p>

        {/* -------------------------------------------------
            SPEAK AGAIN BUTTON
        -------------------------------------------------- */}
        {isAI && !message.error && (
          <div
            className="message-actions"
            style={{
              marginTop: "8px"
            }}
          >
            <button
              type="button"
              className="speak-again-btn"
              onClick={handleSpeak}
              disabled={!message.text}
              aria-label="Listen to this answer"
              title="Listen / सुनें / ऐका"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: "transparent",
                border:
                  "1px solid rgba(0,0,0,0.1)",
                padding: "4px 10px",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "12px"
              }}
            >
              <Volume2 size={14} />
              <span>
                Listen / सुनें / ऐका
              </span>
            </button>
          </div>
        )}

        {/* -------------------------------------------------
            SOURCE + CONFIDENCE INFORMATION
        -------------------------------------------------- */}
        {isAI &&
          !message.error &&
          message.source && (
            <div className="answer-meta">

              <div className="source-mini">
                <FileCheck2 size={14} />

                <span>
                  <strong>
                    {message.source}
                  </strong>

                  {message.page != null && (
                    <small>
                      Page {message.page}
                      {" • "}
                      Official source
                    </small>
                  )}

                  {message.page == null && (
                    <small>
                      Official source
                    </small>
                  )}
                </span>
              </div>

              <span className="confidence">
                <ShieldCheck size={13} />

                {message.confidence ||
                  "Verified"}
              </span>
            </div>
          )}
      </div>
    </div>
  );
}

export default ChatMessage;