import {
  Sparkles,
  FileCheck2,
  ShieldCheck,
  Volume2,
  ExternalLink,
  FileText,
} from "lucide-react";

import { useLanguage } from "../context/LanguageContext";

/**
 * ============================================================
 * TEXT-TO-SPEECH CLEANER
 * ============================================================
 *
 * IMPORTANT:
 * This function is ONLY used for speech.
 *
 * It does NOT modify the answer shown on screen.
 *
 * Screen:
 *   - Markdown
 *   - bold
 *   - headings
 *   - bullets
 *   - references
 *
 * Speech:
 *   - natural text only
 *   - no markdown symbols
 *   - no URLs
 *   - no filenames
 *   - no references
 *   - no scores
 *   - no debug metadata
 *   - no decorative symbols
 *   - NO ASTERISKS
 */
function cleanTextForSpeech(text) {
  if (!text) {
    return "";
  }

  let cleaned = String(text).normalize("NFKC");

  // ==========================================================
  // 1. Normalize escaped Markdown FIRST
  // ==========================================================
  //
  // Gemini may sometimes return:
  //
  // \*\*Important\*\*
  // \*Important\*
  // \_\_Important\_\_
  // \_Important\_
  //
  // Convert escaped Markdown into normal Markdown first.
  //
  cleaned = cleaned
    .replace(/\\\*\\\*/g, "**")
    .replace(/\\\*/g, "*")
    .replace(/\\_/g, "_")
    .replace(/\\#/g, "#")
    .replace(/\\~/g, "~")
    .replace(/\\`/g, "`")
    .replace(/\\\[/g, "[")
    .replace(/\\\]/g, "]")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")");

  // ==========================================================
  // 2. Remove URLs
  // ==========================================================

  cleaned = cleaned.replace(
    /https?:\/\/[^\s<>"')]+/gi,
    " "
  );

  cleaned = cleaned.replace(
    /\bwww\.[^\s<>"')]+/gi,
    " "
  );

  // ==========================================================
  // 3. Remove Markdown links
  //
  // [PACS information](https://example.com)
  //
  // becomes:
  //
  // PACS information
  // ==========================================================

  cleaned = cleaned.replace(
    /\[([^\]]+)\]\([^)]+\)/g,
    "$1"
  );

  // ==========================================================
  // 4. Remove fenced code blocks
  // ==========================================================

  cleaned = cleaned.replace(
    /```[\s\S]*?```/g,
    " "
  );

  // ==========================================================
  // 5. Remove inline code markers
  // ==========================================================

  cleaned = cleaned.replace(
    /`([^`]+)`/g,
    "$1"
  );

  cleaned = cleaned.replace(
    /`+/g,
    " "
  );

  // ==========================================================
  // 6. Remove Markdown headings
  //
  // ## Important Information
  //
  // becomes:
  //
  // Important Information
  // ==========================================================

  cleaned = cleaned.replace(
    /^\s*#{1,6}\s+/gm,
    ""
  );

  // ==========================================================
  // 7. Remove bold + italic Markdown
  //
  // ***important***
  // **important**
  // __important__
  // *important*
  // _important_
  // ==========================================================

  cleaned = cleaned.replace(
    /\*\*\*(.*?)\*\*\*/gs,
    "$1"
  );

  cleaned = cleaned.replace(
    /\*\*(.*?)\*\*/gs,
    "$1"
  );

  cleaned = cleaned.replace(
    /___(.*?)___/gs,
    "$1"
  );

  cleaned = cleaned.replace(
    /__(.*?)__/gs,
    "$1"
  );

  cleaned = cleaned.replace(
    /(?<!\w)\*(.*?)\*(?!\w)/gs,
    "$1"
  );

  cleaned = cleaned.replace(
    /(?<!\w)_(.*?)_(?!\w)/gs,
    "$1"
  );

  // ==========================================================
  // 8. Remove Markdown bullet markers
  //
  // - item
  // * item
  // + item
  // • item
  // ==========================================================

  cleaned = cleaned.replace(
    /^\s*[-*+•●▪◦‣]\s+/gm,
    ""
  );

  // ==========================================================
  // 9. Remove numbered list markers
  //
  // 1. item
  // 2) item
  // ==========================================================

  cleaned = cleaned.replace(
    /^\s*\d+[.)]\s+/gm,
    ""
  );

  // ==========================================================
  // 10. Remove blockquote markers
  // ==========================================================

  cleaned = cleaned.replace(
    /^\s*>\s?/gm,
    ""
  );

  // ==========================================================
  // 11. Remove decorative separator lines
  // ==========================================================

  cleaned = cleaned.replace(
    /^\s*[-_=+~*]{3,}\s*$/gm,
    ""
  );

  // ==========================================================
  // 12. Remove Markdown table separator rows
  // ==========================================================

  cleaned = cleaned.replace(
    /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/gm,
    ""
  );

  // ==========================================================
  // 13. Remove table pipe characters
  // ==========================================================

  cleaned = cleaned.replace(
    /\|/g,
    " "
  );

  // ==========================================================
  // 14. Remove internal source markers
  //
  // [SOURCE]
  // [DOCUMENT]
  // [EVIDENCE]
  // [METADATA]
  // ==========================================================

  cleaned = cleaned.replace(
    /\[(?:SOURCE|SOURCES|DOCUMENT|DOCUMENTS|CHUNK|METADATA|CONTEXT|RETRIEVAL|EVIDENCE)\]/gi,
    " "
  );

  // ==========================================================
  // 15. Remove numbered references
  //
  // [Source 1]
  // [Document 2]
  // [Evidence 3]
  // [Reference 4]
  // [Ref 5]
  // ==========================================================

  cleaned = cleaned.replace(
    /\[(?:source|document|evidence|reference|ref|chunk)\s*#?\s*\d+\]/gi,
    " "
  );

  // ==========================================================
  // 16. Remove citation-style references
  //
  // [1]
  // [2]
  // [12]
  // ==========================================================

  cleaned = cleaned.replace(
    /\[\s*\d+\s*\]/g,
    " "
  );

  // ==========================================================
  // 17. Remove debug labels
  // ==========================================================

  cleaned = cleaned.replace(
    /^\s*(?:source|sources|document reference|document references|retrieval|retrieved|context|embedding|reranker|qdrant|gemini|metadata|chunk|evidence)\s*[:=]\s*.*$/gim,
    ""
  );

  // ==========================================================
  // 18. Remove score/debug lines
  // ==========================================================

  cleaned = cleaned.replace(
    /^\s*(?:final score|similarity score|rerank score|retrieval score|confidence score|score)\s*[:=]?\s*\d+(?:\.\d+)?%?\s*$/gim,
    ""
  );

  // ==========================================================
  // 19. Remove source filename-only lines
  //
  // example:
  // maharashtra_cooperation_2025.txt
  // document.pdf
  // report.docx
  // ==========================================================

  cleaned = cleaned.replace(
    /^\s*[\w.-]+\.(?:txt|pdf|docx|doc|csv|json)\s*$/gim,
    ""
  );

  // ==========================================================
  // 20. Remove common reference lines
  // ==========================================================

  cleaned = cleaned.replace(
    /^\s*(?:source|sources|reference|references|document|documents|pdf|document reference|source reference)\s*[:\-]\s*.*$/gim,
    ""
  );

  // ==========================================================
  // 21. Remove inline debug metadata
  // ==========================================================

  cleaned = cleaned.replace(
    /\b(?:status|answerability|answerable|domain|intent|sub-intent|retrieval|candidate count|evidence count|gemini allowed|batch gemini allowed)\s*[:=]\s*[^\n]+/gi,
    " "
  );

  // ==========================================================
  // 22. Remove HTML tags
  // ==========================================================

  cleaned = cleaned.replace(
    /<[^>]*>/g,
    " "
  );

  // ==========================================================
  // 23. Remove brackets but KEEP their content
  // ==========================================================

  cleaned = cleaned.replace(
    /[\[\]{}]/g,
    " "
  );

  // ==========================================================
  // 24. FINAL MARKDOWN SAFETY LAYER
  //
  // THIS IS THE MOST IMPORTANT PART.
  //
  // Even if Gemini or another regex leaves Markdown behind,
  // these characters can NEVER reach TTS.
  //
  // Removes:
  // *
  // _
  // ~
  // #
  // `
  // backslash
  // ==========================================================

  cleaned = cleaned.replace(
    /[*_~#`\\]/g,
    " "
  );

  // ==========================================================
  // 25. Remove decorative Unicode symbols
  // ==========================================================

  cleaned = cleaned.replace(
    /[★☆✦✧◆◇▪▫►▶✔✓✕✖❖●○■□🔹🔸🔺🔻]/gu,
    " "
  );

  // ==========================================================
  // 26. Remove arrows / decorative directional symbols
  // ==========================================================

  cleaned = cleaned.replace(
    /[→←↑↓⇒⇐↔]/g,
    " "
  );

  // ==========================================================
  // 27. Normalize excessive punctuation
  // ==========================================================

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

  // ==========================================================
  // 28. Normalize line endings
  // ==========================================================

  cleaned = cleaned.replace(
    /\r\n/g,
    "\n"
  );

  cleaned = cleaned.replace(
    /\r/g,
    "\n"
  );

  // ==========================================================
  // 29. Convert label lines into natural speech pauses
  //
  // Name:
  // Taufik Ali
  //
  // becomes:
  //
  // Name.
  // Taufik Ali
  // ==========================================================

  cleaned = cleaned.replace(
    /(^|\n)([A-Za-z\u0900-\u097F\u0D00-\u0D7F\u0C00-\u0C7F][^:\n]{1,40}):\s*(?=\n|$)/g,
    "$1$2.\n"
  );

  // ==========================================================
  // 30. Remove remaining backslashes
  // ==========================================================

  cleaned = cleaned.replace(
    /\\/g,
    " "
  );

  // ==========================================================
  // 31. Remove excessive spaces
  // ==========================================================

  cleaned = cleaned.replace(
    /[ \t]{2,}/g,
    " "
  );

  cleaned = cleaned.replace(
    /\s+([,.!?;:])/g,
    "$1"
  );

  // ==========================================================
  // 32. Clean empty lines
  // ==========================================================

  cleaned = cleaned
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");

  // ==========================================================
  // 33. Convert paragraphs into natural speech pauses
  // ==========================================================

  cleaned = cleaned.replace(
    /\n+/g,
    ". "
  );

  // ==========================================================
  // 34. FINAL ABSOLUTE SAFETY CLEANUP
  //
  // Nothing decorative or Markdown-related should survive.
  // ==========================================================

  cleaned = cleaned
    .replace(/[*_~#`\\]/g, "")
    .replace(/\s+([,.!?;:])/g, "$1")
    .replace(/\.{2,}/g, ". ")
    .replace(/\s{2,}/g, " ")
    .trim();

  return cleaned;
}

/**
 * ============================================================
 * LANGUAGE NORMALIZATION
 * ============================================================
 */

function normalizeLanguage(language, fallback = "en") {
  const value = String(language || "")
    .trim()
    .toLowerCase();

  if (
    value === "en" ||
    value === "english" ||
    value === "eng" ||
    value === "en-us" ||
    value === "en-in"
  ) {
    return "en";
  }

  if (
    value === "hi" ||
    value === "hindi" ||
    value === "hin" ||
    value === "hi-in" ||
    value === "हिंदी" ||
    value === "हिन्दी"
  ) {
    return "hi";
  }

  if (
    value === "mr" ||
    value === "marathi" ||
    value === "mar" ||
    value === "mr-in" ||
    value === "मराठी"
  ) {
    return "mr";
  }

  /*
   * The backend/frontend language contract is:
   * English = en, Hindi = hi, Marathi = mr.
   *
   * "auto" is intentionally not returned to TTS. The caller
   * falls back to the active UI language when no concrete
   * response language is available.
   */
  if (
    value === "auto" ||
    value === "automatic" ||
    value === "detect"
  ) {
    return normalizeLanguage(fallback, "en");
  }

  return fallback;
}

/**
 * ============================================================
 * DOCUMENT URL HELPER
 * ============================================================
 *
 * Supports all known backend URL field names.
 *
 * IMPORTANT:
 * We never create/fake a PDF URL.
 */

function getDocumentUrl(source) {
  if (!source || typeof source !== "object") {
    return null;
  }

  return (
    source.pdf_url ||
    source.pdfUrl ||
    source.document_url ||
    source.documentUrl ||
    source.url ||
    null
  );
}

/**
 * ============================================================
 * SAFE MARKDOWN RENDERING
 * ============================================================
 *
 * The answer shown on screen keeps its formatting.
 *
 * Supported:
 * - **bold**
 * - __bold__
 * - # headings
 * - - bullets
 * - 1. numbered items
 * - `inline code`
 */

function renderInlineText(
  text,
  keyPrefix = "inline"
) {
  if (!text) {
    return null;
  }

  const parts = String(text).split(
    /(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`)/
  );

  return parts.map((part, index) => {
    if (!part) {
      return null;
    }

    const key = `${keyPrefix}-${index}`;

    if (
      part.startsWith("**") &&
      part.endsWith("**")
    ) {
      return (
        <strong key={key}>
          {part.slice(2, -2)}
        </strong>
      );
    }

    if (
      part.startsWith("__") &&
      part.endsWith("__")
    ) {
      return (
        <strong key={key}>
          {part.slice(2, -2)}
        </strong>
      );
    }

    if (
      part.startsWith("`") &&
      part.endsWith("`")
    ) {
      return (
        <code key={key}>
          {part.slice(1, -1)}
        </code>
      );
    }

    return (
      <span key={key}>
        {part}
      </span>
    );
  });
}

/**
 * ============================================================
 * ANSWER RENDERER
 * ============================================================
 */

function renderAnswer(text) {
  if (!text) {
    return null;
  }

  const lines = String(text)
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n");

  const elements = [];

  let bulletItems = [];
  let numberedItems = [];

  const flushBullets = () => {
    if (bulletItems.length === 0) {
      return;
    }

    elements.push(
      <ul
        className="answer-list"
        key={`bullets-${elements.length}`}
      >
        {bulletItems.map((item, index) => (
          <li key={`bullet-${index}`}>
            {renderInlineText(
              item,
              `bullet-${index}`
            )}
          </li>
        ))}
      </ul>
    );

    bulletItems = [];
  };

  const flushNumbered = () => {
    if (numberedItems.length === 0) {
      return;
    }

    elements.push(
      <ol
        className="answer-list answer-numbered-list"
        key={`numbered-${elements.length}`}
      >
        {numberedItems.map((item, index) => (
          <li key={`number-${index}`}>
            {renderInlineText(
              item,
              `number-${index}`
            )}
          </li>
        ))}
      </ol>
    );

    numberedItems = [];
  };

  lines.forEach((rawLine, index) => {
    const line = rawLine.trim();

    // --------------------------------------------------------
    // Empty line
    // --------------------------------------------------------

    if (!line) {
      flushBullets();
      flushNumbered();

      elements.push(
        <div
          className="answer-spacer"
          key={`space-${index}`}
        />
      );

      return;
    }

    // --------------------------------------------------------
    // Heading
    // --------------------------------------------------------

    const headingMatch = line.match(
      /^#{1,6}\s+(.+)$/
    );

    if (headingMatch) {
      flushBullets();
      flushNumbered();

      elements.push(
        <h4
          className="answer-heading"
          key={`heading-${index}`}
        >
          {renderInlineText(
            headingMatch[1],
            `heading-${index}`
          )}
        </h4>
      );

      return;
    }

    // --------------------------------------------------------
    // Bullet
    // --------------------------------------------------------

    const bulletMatch = line.match(
      /^[-*•]\s+(.+)$/
    );

    if (bulletMatch) {
      flushNumbered();

      bulletItems.push(
        bulletMatch[1]
      );

      return;
    }

    // --------------------------------------------------------
    // Numbered list
    // --------------------------------------------------------

    const numberedMatch = line.match(
      /^\d+[.)]\s+(.+)$/
    );

    if (numberedMatch) {
      flushBullets();

      numberedItems.push(
        numberedMatch[1]
      );

      return;
    }

    // --------------------------------------------------------
    // Normal paragraph
    // --------------------------------------------------------

    flushBullets();
    flushNumbered();

    elements.push(
      <p
        className="answer-paragraph"
        key={`paragraph-${index}`}
      >
        {renderInlineText(
          line,
          `paragraph-${index}`
        )}
      </p>
    );
  });

  flushBullets();
  flushNumbered();

  return elements;
}

/**
 * ============================================================
 * SOURCE NORMALIZATION
 * ============================================================
 */

function normalizeSources(message) {
  if (!message) {
    return [];
  }

  let rawSources = [];

  if (Array.isArray(message.sources)) {
    rawSources = message.sources;
  } else if (
    Array.isArray(message.source_documents)
  ) {
    rawSources =
      message.source_documents;
  } else if (
    Array.isArray(message.documents)
  ) {
    rawSources = message.documents;
  } else if (message.source) {
    rawSources = [
      {
        source: message.source,
        title: message.title,
        filename: message.filename,
        page: message.page,
        section: message.section,
        pdf_url:
          message.pdf_url ||
          message.pdfUrl ||
          message.document_url ||
          message.documentUrl ||
          message.url ||
          null,
        excerpt: message.excerpt,
        text: message.text,
        content: message.content,
      },
    ];
  }

  return rawSources
    .filter(Boolean)
    .map((source, index) => {
      // ------------------------------------------------------
      // String source
      // ------------------------------------------------------

      if (typeof source === "string") {
        return {
          id: `source-${index}`,
          title: source,
          source,
          filename: source,
          page: null,
          section: null,
          score: null,
          pdfUrl: null,
          excerpt: "",
          text: "",
          content: "",
        };
      }

      const documentUrl =
        getDocumentUrl(source);

      return {
        // Preserve every original field.
        ...source,

        id:
          source.id ||
          source.source_id ||
          source.chunk_id ||
          `source-${index}`,

        title:
          source.title ||
          source.document_title ||
          source.name ||
          source.filename ||
          source.file_name ||
          source.source ||
          `Reference Document ${index + 1}`,

        source:
          source.source ||
          source.filename ||
          source.file_name ||
          source.name ||
          "",

        filename:
          source.filename ||
          source.file_name ||
          source.source ||
          source.name ||
          "",

        page:
          source.page ??
          source.page_number ??
          null,

        section:
          source.section ||
          source.heading ||
          null,

        score:
          source.score ??
          source.final_score ??
          source.similarity_score ??
          null,

        pdfUrl: documentUrl,

        excerpt:
          source.excerpt ||
          source.snippet ||
          "",

        text:
          source.text ||
          source.chunk_text ||
          "",

        content:
          source.content ||
          source.chunk ||
          "",
      };
    });
}

/**
 * ============================================================
 * SOURCE REFERENCES
 * ============================================================
 *
 * These are UI-only.
 *
 * They are NEVER passed to TTS.
 */

function SourceReferences({ message }) {
  const sources = normalizeSources(message);

  if (sources.length === 0) {
    return null;
  }

  return (
    <div className="source-references">
      <div className="source-references-header">
        <FileCheck2 size={16} />

        <strong>
          Reference Documents
        </strong>
      </div>

      <div className="source-reference-list">
        {sources.map((source, index) => {
          const documentUrl =
            source.pdfUrl ||
            getDocumentUrl(source);

          const isPdf =
            typeof documentUrl === "string" &&
            /\.pdf(?:$|[?#])/i.test(
              documentUrl
            );

          return (
            <div
              className="source-reference-card"
              key={
                source.id ||
                `source-${index}`
              }
            >
              <div className="source-reference-icon">
                <FileText size={17} />
              </div>

              <div className="source-reference-content">
                <div className="source-reference-title">
                  {source.title}
                </div>

                <div className="source-reference-details">
                  {source.page != null && (
                    <span>
                      Page {source.page}
                    </span>
                  )}

                  {source.section && (
                    <span>
                      {source.section}
                    </span>
                  )}

                  {source.score != null && (
                    <span>
                      Verified reference
                    </span>
                  )}
                </div>
              </div>

              {documentUrl && (
                <a
                  href={documentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="source-pdf-button"
                  aria-label={`Open ${source.title}`}
                  title={
                    isPdf
                      ? "Open PDF"
                      : "Open reference document"
                  }
                >
                  <ExternalLink size={14} />

                  <span>
                    {isPdf
                      ? "Open PDF"
                      : "Open"}
                  </span>
                </a>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * ============================================================
 * CHAT MESSAGE
 * ============================================================
 */

function resolveMessageSpeechLanguage(message, fallbackLanguage = "en") {
  if (!message || typeof message !== "object") {
    return normalizeLanguage(fallbackLanguage, "en");
  }

  const candidates = [
    message.language,
    message.detected_language,
    message.response_language,
  ];

  for (const candidate of candidates) {
    const normalized = normalizeLanguage(candidate, "");

    if (normalized === "en" || normalized === "hi" || normalized === "mr") {
      return normalized;
    }
  }

  return normalizeLanguage(fallbackLanguage, "en");
}

function ChatMessage({
  message,
  onSpeak,
}) {
  const {
    languageId,
    speakText,
  } = useLanguage();

  const isAI =
    message.role === "assistant";

  /**
   * ----------------------------------------------------------
   * SPEAK ANSWER
   * ----------------------------------------------------------
   *
   * IMPORTANT:
   *
   * Only message.text goes through cleanTextForSpeech().
   *
   * Sources, PDF information, scores, filenames and UI
   * elements NEVER go to the speech engine.
   */

  const handleSpeak = () => {
    const speechText =
      cleanTextForSpeech(
        message.text
      );

    if (!speechText) {
      return;
    }

    /*
     * The backend response language is authoritative.
     * Chat.jsx stores it on message.language, while the
     * additional fields support older/alternate response shapes.
     *
     * TTS never receives "auto"; it always receives one of:
     * en / hi / mr.
     */
    const speechLanguage =
      resolveMessageSpeechLanguage(
        message,
        languageId
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
      {/* =====================================================
          MESSAGE AVATAR
      ====================================================== */}

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

      {/* =====================================================
          MESSAGE CONTENT
      ====================================================== */}

      <div className="message-bubble">

        {/* ===================================================
            ANSWER / QUERY
        ==================================================== */}

        <div className="message-answer">
          {isAI ? (
            renderAnswer(
              message.text
            )
          ) : (
            <p className="answer-paragraph">
              {message.text}
            </p>
          )}
        </div>

        {/* ===================================================
            SPEAK BUTTON
        ==================================================== */}

        {isAI &&
          !message.error && (
            <div className="message-actions">
              <button
                type="button"
                className="speak-again-btn"
                onClick={handleSpeak}
                disabled={!message.text}
                aria-label="Listen to this answer"
                title="Listen / सुनें / ऐका"
              >
                <Volume2 size={14} />

                <span>
                  Listen / सुनें / ऐका
                </span>
              </button>
            </div>
          )}

        {/* ===================================================
            SOURCE + CONFIDENCE INFORMATION
        ==================================================== */}

        {isAI &&
          !message.error &&
          (message.source ||
            message.confidence) && (
            <div className="answer-meta">

              {message.source && (
                <div className="source-mini">
                  <FileCheck2 size={14} />

                  <span>
                    <strong>
                      {message.source}
                    </strong>

                    {message.page != null ? (
                      <small>
                        Page{" "}
                        {message.page}
                        {" • "}
                        Official source
                      </small>
                    ) : (
                      <small>
                        Official source
                      </small>
                    )}
                  </span>
                </div>
              )}

              {message.confidence && (
                <span className="confidence">
                  <ShieldCheck size={13} />

                  {message.confidence}
                </span>
              )}
            </div>
          )}

        {/* ===================================================
            REFERENCE DOCUMENTS / PDFS

            UI ONLY.

            NEVER passed to TTS.
        ==================================================== */}

        {isAI &&
          !message.error && (
            <SourceReferences
              message={message}
            />
          )}
      </div>
    </div>
  );
}

export default ChatMessage;