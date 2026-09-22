import {
  FileCheck2,
  Languages,
  Mic,
  Plus,
  Send,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";

import React, {
  useEffect,
  useRef,
  useState,
} from "react";

import { useLanguage } from "../context/LanguageContext";
import { askSanyuktVaani } from "../services/api";
import ChatMessage from "../components/ChatMessage";

/* =========================================================
   INITIAL MESSAGE
========================================================= */

const INITIAL_MESSAGE = {
  role: "assistant",
  text:
    "Ask me about cooperatives, government schemes, loans, laws, and citizen services. I will answer from the verified knowledge base.",
  language: "en",
  sources: [],
};

/* =========================================================
   LANGUAGE HELPERS
========================================================= */

function normalizeResponseLanguage(language, fallback = "en") {
  if (!language) {
    return fallback;
  }

  const value = String(language)
    .trim()
    .toLowerCase();

  const aliases = {
    english: "en",
    eng: "en",
    "en-us": "en",
    "en-in": "en",

    hindi: "hi",
    hin: "hi",
    "hi-in": "hi",
    हिंदी: "hi",
    हिन्दी: "hi",

    marathi: "mr",
    mar: "mr",
    "mr-in": "mr",
    मराठी: "mr",

    gujarati: "gu",
    guj: "gu",
    "gu-in": "gu",

    kannada: "kn",
    kan: "kn",
    "kn-in": "kn",

    sanskrit: "sa",
    san: "sa",
    "sa-in": "sa",
  };

  return (
    aliases[value] ||
    (
      [
        "en",
        "hi",
        "mr",
        "gu",
        "kn",
        "sa",
      ].includes(value)
        ? value
        : fallback
    )
  );
}

/* =========================================================
   QUERY LANGUAGE DETECTION
   Project answer-language scope:
   English / Hindi / Marathi
   ========================================================= */

const MARATHI_QUERY_PATTERNS = [
  /\bआहे\b/u,
  /\bआहेत\b/u,
  /\bआहोत\b/u,
  /\bसाठी\b/u,
  /\bमध्ये\b/u,
  /\bकोणती\b/u,
  /\bकोणते\b/u,
  /\bकागदपत्रे\b/u,
  /\bशेतकरी\b/u,
  /\bयोजना\b/u,
  /\bलाभ\b/u,
  /\bआवश्यक\b/u,
  /\bकसे\b/u,
  /\bकाय\b/u,
  /\bमिळेल\b/u,
  /\bकरण्यासाठी\b/u,
  /\bयासाठी\b/u,
];

function detectQuestionLanguage(text) {
  const value = String(text || "").trim();

  if (!value) {
    return "en";
  }

  /*
   * Pure Latin/English text is English for the project's
   * automatic answer-language contract.
   */
  if (/^[A-Za-z0-9\s.,?!'"()_\\\-/:%&+₹$]+$/.test(value)) {
    return "en";
  }

  /*
   * Hindi and Marathi both use Devanagari.
   * Use multiple strong Marathi indicators before selecting mr;
   * otherwise treat Devanagari as Hindi.
   */
  if (/[\u0900-\u097F]/u.test(value)) {
    const marathiMatches = MARATHI_QUERY_PATTERNS.filter(
      (pattern) => pattern.test(value)
    ).length;

    if (marathiMatches >= 2) {
      return "mr";
    }

    return "hi";
  }

  return "en";
}

/* =========================================================
   CLEAN TEXT FOR BROWSER SPEECH
   IMPORTANT:
   - Screen keeps Markdown such as **bold**
   - Speech receives plain text
   - Asterisks and Markdown are NEVER spoken
========================================================= */

const cleanTextForSpeech = (text) => {
  if (!text) return "";

  let cleaned = String(text);

  // Normalize
  cleaned = cleaned
    .normalize("NFKC")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");

  // Remove code blocks
  cleaned = cleaned.replace(/```[\s\S]*?```/g, " ");

  // Remove markdown links but keep visible text
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

  // Remove plain URLs
  cleaned = cleaned.replace(
    /https?:\/\/[^\s]+/gi,
    " "
  );

  // Remove HTML tags
  cleaned = cleaned.replace(/<[^>]*>/g, " ");

  // Remove inline code
  cleaned = cleaned.replace(/`([^`]+)`/g, "$1");

  // Remove source/reference metadata
  cleaned = cleaned.replace(
    /^\s*(sources?|references?|document sources?|source references?)\s*:?\s*$/gim,
    " "
  );

  cleaned = cleaned.replace(
    /^\s*(source|document|page|section|score|confidence|metadata)\s*:\s*.*$/gim,
    " "
  );

  // Remove internal evidence markers
  cleaned = cleaned.replace(
    /\[?(evidence|source|document)\s*#?\s*\d+\]?/gi,
    " "
  );

  // Remove markdown headings
  cleaned = cleaned.replace(/^\s*#{1,6}\s*/gm, "");

  // Remove markdown blockquotes
  cleaned = cleaned.replace(/^\s*>\s?/gm, "");

  // Remove markdown table separators/rows
  cleaned = cleaned.replace(/^\s*\|.*\|\s*$/gm, " ");
  cleaned = cleaned.replace(
    /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?\s*$/gm,
    " "
  );

  // Remove numbered list markers
  cleaned = cleaned.replace(/^\s*\d+[.)]\s+/gm, "");

  // Remove bullet markers
  cleaned = cleaned.replace(/^\s*[-+•◦▪●○]\s+/gm, "");

  // IMPORTANT:
  // Remove ALL markdown asterisks.
  // This handles:
  // **Bold**
  // *Italic*
  // ***Bold italic***
  // and any leftover standalone *
  cleaned = cleaned.replace(/\*/g, "");

  // Remove underscores used for markdown emphasis
  cleaned = cleaned.replace(/_{1,3}/g, "");

  // Remove tildes used for strikethrough
  cleaned = cleaned.replace(/~{2,}/g, "");

  // Remove decorative markdown separators
  cleaned = cleaned.replace(/^\s*[-_=]{3,}\s*$/gm, " ");

  // Remove common decorative symbols
  cleaned = cleaned.replace(/[✓✔✕✖★☆→←⇒⇐►◄◆◇■□]/g, " ");

  // Remove excessive backslashes
  cleaned = cleaned.replace(/\\/g, "");

  // Remove repeated punctuation
  cleaned = cleaned.replace(/[|]{2,}/g, " ");
  cleaned = cleaned.replace(/:{2,}/g, ":");

  // Normalize whitespace
  cleaned = cleaned
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join(". ");

  // Final safety pass:
  // NOTHING markdown-related should reach speech.
  cleaned = cleaned
    .replace(/\*/g, "")
    .replace(/_/g, "")
    .replace(/`/g, "")
    .replace(/#+/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned;
};

/* =========================================================
   SOURCE HELPERS
========================================================= */

function normalizeSources(sources) {
  if (!Array.isArray(sources)) {
    return [];
  }

  return sources
    .filter(Boolean)
    .map((source, index) => {
      if (typeof source === "string") {
        return {
          id: `source-${index}`,
          title: source,
          source,
          filename: source,
          page: null,
          section: null,
          score: null,
          pdf_url: null,
        };
      }

      const pdfUrl =
        source?.pdf_url ||
        source?.pdfUrl ||
        source?.document_url ||
        source?.documentUrl ||
        source?.url ||
        null;

      const metadata =
        source?.metadata &&
        typeof source.metadata === "object"
          ? source.metadata
          : {};

      const title =
        source?.title ||
        source?.document_title ||
        source?.name ||
        source?.filename ||
        source?.file_name ||
        source?.source ||
        source?.source_file ||
        metadata?.source_file ||
        `Reference Document ${index + 1}`;

      return {
        ...source,

        id:
          source?.id ||
          `source-${index}`,

        title,

        source:
          source?.source ||
          source?.source_file ||
          source?.filename ||
          source?.file_name ||
          title,

        filename:
          source?.filename ||
          source?.file_name ||
          source?.source_file ||
          title,

        page:
          source?.page ??
          source?.page_number ??
          null,

        section:
          source?.section ||
          source?.heading ||
          null,

        score:
          source?.score ?? null,

        pdf_url: pdfUrl,
      };
    });
}

/* =========================================================
   PDF URL HELPER
========================================================= */

function getSourcePdfUrl(source) {
  return (
    source?.pdf_url ||
    source?.pdfUrl ||
    source?.document_url ||
    source?.documentUrl ||
    source?.url ||
    null
  );
}

/* =========================================================
   SOURCE TITLE HELPER
========================================================= */

function getSourceTitle(source, index = 0) {
  return (
    source?.title ||
    source?.document_title ||
    source?.name ||
    source?.filename ||
    source?.file_name ||
    source?.source ||
    source?.source_file ||
    source?.metadata?.source_file ||
    `Reference Document ${index + 1}`
  );
}

/* =========================================================
   CHAT PAGE
========================================================= */

function Chat() {
  const {
    languageId,
    languages,
    setLanguage,
    transcript,
    setTranscript,
    isListening,
    isTranscribing,
    voiceResult,
    setVoiceResult,
    detectFromSpeech,
    speakText,
  } = useLanguage();

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    INITIAL_MESSAGE,
  ]);

  const [isLoading, setIsLoading] = useState(false);

  const [activeSources, setActiveSources] = useState([]);

  const [selectedSource, setSelectedSource] = useState(null);

  const textareaRef = useRef(null);
  const scrollRef = useRef(null);

  /* =======================================================
     AUTO SCROLL
  ======================================================== */

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop =
        scrollRef.current.scrollHeight;
    }
  }, [
    messages,
    isLoading,
    isListening,
    isTranscribing,
  ]);

  /* =======================================================
     LIVE VOICE TRANSCRIPT → CHAT INPUT
  ======================================================== */

  useEffect(() => {
    if (!isListening) {
      return;
    }

    const liveText = String(
      transcript || ""
    ).trim();

    if (!liveText) {
      return;
    }

    setInput(liveText);

    window.setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);
  }, [
    transcript,
    isListening,
  ]);

  /* =======================================================
     FINAL VOICE RESULT → CHAT
  ======================================================== */

  useEffect(() => {
    if (!voiceResult) {
      return;
    }

    const question = String(
      voiceResult?.transcribed_text || ""
    ).trim();

    const answer = String(
      voiceResult?.answer || ""
    ).trim();

    if (!question) {
      setVoiceResult(null);
      return;
    }

    const detectedLanguage =
      normalizeResponseLanguage(
        voiceResult?.detected_language,
        normalizeResponseLanguage(
          languageId,
          "en"
        )
      );

    const sources = normalizeSources(
      voiceResult?.sources
    );

    setActiveSources(sources);

    const firstSource =
      sources.length > 0
        ? sources[0]
        : null;

    const sourceTitle =
      firstSource?.title ||
      firstSource?.source ||
      firstSource?.filename ||
      null;

    const sourcePage =
      firstSource?.page ?? null;

    const sourceScore =
      firstSource?.score;

    const confidence =
      sourceScore == null
        ? "Verified"
        : `${Math.round(
            Number(sourceScore) * 100
          )}%`;

    /* Add user + assistant messages */

    setMessages((previous) => [
      ...previous,

      {
        role: "user",
        text: question,
        language: detectedLanguage,
      },

      {
        role: "assistant",
        text:
          answer ||
          "No response text received.",

        language: detectedLanguage,

        source: sourceTitle,

        page: sourcePage,

        confidence,

        sources,
      },
    ]);

    /* Reset input state */

    setInput("");

    setTranscript("");

    /* Update selected UI language */

    const supportedLanguage =
      languages.some(
        (item) =>
          item.id === detectedLanguage
      );

    if (
      supportedLanguage &&
      detectedLanguage !== languageId
    ) {
      setLanguage(
        detectedLanguage
      );
    }

    /* =====================================================
       AUTO SPEAK

       IMPORTANT:
       Never send raw Markdown directly to TTS.

       cleanTextForSpeech() removes:
       **bold**
       # headings
       - bullets
       URLs
       source metadata
       decorative symbols
       etc.
    ===================================================== */

    if (answer) {
      window.setTimeout(() => {
        const cleanSpeech =
          cleanTextForSpeech(answer);

        if (!cleanSpeech) {
          return;
        }

        speakText(
          cleanSpeech,
          detectedLanguage
        );
      }, 100);
    }

    setVoiceResult(null);
  }, [
    voiceResult,
    languageId,
    languages,
    setLanguage,
    setTranscript,
    setVoiceResult,
    speakText,
  ]);

  /* =========================================================
     SEND MESSAGE
  ========================================================= */

  const sendMessage = async () => {
    const cleanQuery =
      input.trim();

    if (
      !cleanQuery ||
      isLoading ||
      isTranscribing
    ) {
      return;
    }

    /* Clear composer */

    setInput("");

    /* Clear source selection */

    setActiveSources([]);

    setSelectedSource(null);

    /* ===================================================
       AUTO-DETECT QUESTION LANGUAGE

       The question language is authoritative for the
       answer language. This keeps typed questions aligned
       with the same English / Hindi / Marathi contract
       used by the voice flow.
    =================================================== */

    const detectedQuestionLanguage =
      detectQuestionLanguage(cleanQuery);

    const requestLanguage =
      normalizeResponseLanguage(
        detectedQuestionLanguage,
        normalizeResponseLanguage(languageId, "en")
      );

    /* Add user message immediately */

    setMessages((previous) => [
      ...previous,

      {
        role: "user",
        text: cleanQuery,
        language: requestLanguage,
      },
    ]);

    setIsLoading(true);

    try {
      /* ===================================================
         CALL BACKEND
      =================================================== */

      const result =
        await askSanyuktVaani(
          cleanQuery,
          requestLanguage
        );

      const answer = String(
        result?.answer || ""
      ).trim();

      /* Normalize source objects */

      const sources =
        normalizeSources(
          result?.sources
        );

      /* Backend response language */

      const answerLanguage =
        normalizeResponseLanguage(
          result?.language,
          requestLanguage
        );

      /* ===================================================
         UPDATE SOURCES
      =================================================== */

      setActiveSources(
        sources
      );

      const firstSource =
        sources.length > 0
          ? sources[0]
          : null;

      const sourceTitle =
        firstSource?.title ||
        firstSource?.source ||
        firstSource?.filename ||
        null;

      const sourcePage =
        firstSource?.page ?? null;

      const sourceScore =
        firstSource?.score;

      const confidence =
        sourceScore == null
          ? "Verified"
          : `${Math.round(
              Number(sourceScore) * 100
            )}%`;

      /* ===================================================
         ADD ASSISTANT RESPONSE

         IMPORTANT:
         Keep Markdown here.

         Example:

         **Direct Answer**

         The scheme provides **₹3 lakh**...

         ChatMessage.jsx is responsible for rendering
         this as visual bold text.
      =================================================== */

      setMessages((previous) => [
        ...previous,

        {
          role: "assistant",

          text:
            answer ||
            "No response text received.",

          language:
            answerLanguage,

          source:
            sourceTitle,

          page:
            sourcePage,

          confidence,

          sources,
        },
      ]);

      /* ===================================================
         UPDATE UI LANGUAGE
      =================================================== */

      const supportedLanguage =
        languages.some(
          (item) =>
            item.id === answerLanguage
        );

      if (
        supportedLanguage &&
        answerLanguage !== languageId
      ) {
        setLanguage(
          answerLanguage
        );
      }

      /* ===================================================
         AUTO SPEAK ANSWER

         DO NOT pass raw Markdown.

         This:

         **Important:** Farmers must apply...

         becomes:

         Important: Farmers must apply...

         before going to TTS.
      =================================================== */

      if (answer) {
        window.setTimeout(() => {
          const cleanSpeech =
            cleanTextForSpeech(answer);

          if (!cleanSpeech) {
            return;
          }

          speakText(
            cleanSpeech,
            answerLanguage
          );
        }, 100);
      }
    } catch (error) {
      console.error(
        "Sanyukt Vaani chat error:",
        error
      );

      /* ===================================================
         ERROR MESSAGE
      =================================================== */

      setMessages((previous) => [
        ...previous,

        {
          role: "assistant",

          error: true,

          language:
            normalizeResponseLanguage(
              languageId,
              "en"
            ),

          text:
            error?.message ||
            "Unable to get an answer right now.",

          sources: [],
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  /* =========================================================
     KEYBOARD HANDLER
  ========================================================= */

  const handleKeyDown = (event) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();

      sendMessage();
    }
  };

  /* =========================================================
     NEW CHAT
  ========================================================= */

  const handleNewChat = () => {
    setMessages([
      INITIAL_MESSAGE,
    ]);

    setActiveSources([]);

    setSelectedSource(null);

    setInput("");

    setTranscript("");

    setVoiceResult(null);

    window.setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);
  };

  /* =========================================================
     VOICE BUTTON
  ========================================================= */

  const handleVoiceClick = async () => {
    if (
      isLoading ||
      isTranscribing
    ) {
      return;
    }

    try {
      await detectFromSpeech();
    } catch (error) {
      console.error(
        "Voice interaction error:",
        error
      );
    }
  };

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div className="chat-workspace">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="chat-header">

        <div className="chat-brand">

          <div className="brand-mark">
            <Sparkles size={19} />
          </div>

          <div>
            <strong>
              Sanyukt Vaani{" "}
              <span>AI</span>
            </strong>

            <small>
              <span className="status-dot" />
              Verified knowledge mode
            </small>
          </div>

        </div>

        <div className="chat-header-status">
          <ShieldCheck size={15} />
          RAG Online
        </div>

      </header>

      {/* =====================================================
          BODY
      ===================================================== */}

      <div className="chat-workspace-body">

        {/* ===================================================
            LEFT TOOL BAR
        =================================================== */}

        <aside
          className="chat-utility-bar"
          aria-label="Chat tools"
        >

          <button
            className="new-chat-btn"
            type="button"
            onClick={handleNewChat}
            disabled={
              isLoading ||
              isTranscribing ||
              isListening
            }
          >
            <Plus size={17} />
            <span>New chat</span>
          </button>

          <div className="utility-divider" />

          <span className="utility-label">
            Language
          </span>

          <div className="language-picker">

            <Languages size={15} />

            <select
              value={languageId}
              onChange={(event) =>
                setLanguage(
                  event.target.value
                )
              }
              disabled={
                isLoading ||
                isTranscribing ||
                isListening
              }
            >

              {languages.map(
                (language) => (
                  <option
                    key={language.id}
                    value={language.id}
                  >
                    {language.label}
                  </option>
                )
              )}

            </select>

          </div>

          <p className="utility-note">
            Answers are grounded in official
            cooperative knowledge sources.
          </p>

        </aside>

        {/* ===================================================
            CONVERSATION AREA
        =================================================== */}

        <section className="conversation-panel">

          {/* =================================================
              SCROLLABLE MESSAGE AREA
          ================================================= */}

          <div
            ref={scrollRef}
            className="conversation-scroll"
          >

            {/* =================================================
                INTRO
            ================================================= */}

            <div className="conversation-intro">

              <span className="intro-kicker">
                CITIZEN KNOWLEDGE ASSISTANT
              </span>

              <h1>
                How can we help you today?
              </h1>

              <p>
                Ask in English, Hindi, or Marathi.
                The answer language is detected automatically.
              </p>

            </div>

            {/* =================================================
                MESSAGES
            ================================================= */}

            <div className="message-list">

              {messages.map(
                (message, index) => (
                  <React.Fragment
                    key={`${message.role}-${index}`}
                  >

                    <ChatMessage
                      message={message}
                    />

                    {/* =========================================
                        SOURCE CHIPS
                    ========================================= */}

                    {message.role ===
                      "assistant" &&
                      index ===
                        messages.length - 1 &&
                      activeSources.length >
                        0 && (

                        <div className="live-sources">

                          <div className="live-sources-title">

                            <FileCheck2
                              size={15}
                            />

                            <span>
                              Verified references
                            </span>

                          </div>

                          <div className="live-source-list">

                            {activeSources.map(
                              (
                                source,
                                sourceIndex
                              ) => {

                                const title =
                                  getSourceTitle(
                                    source,
                                    sourceIndex
                                  );

                                const score =
                                  source?.score;

                                const pdfUrl =
                                  getSourcePdfUrl(
                                    source
                                  );

                                return (
                                  <div
                                    key={
                                      source?.id ||
                                      `${title}-${sourceIndex}`
                                    }
                                    className="live-source-item"
                                  >

                                    <button
                                      type="button"
                                      className="live-source-chip"
                                      onClick={() =>
                                        setSelectedSource(
                                          source
                                        )
                                      }
                                      aria-label={`Preview ${title}`}
                                    >

                                      <FileCheck2
                                        size={14}
                                      />

                                      <span>
                                        {title}
                                      </span>

                                      {score !=
                                        null && (
                                        <span>
                                          {" · "}
                                          {Math.round(
                                            Number(
                                              score
                                            ) *
                                              100
                                          )}
                                          %
                                        </span>
                                      )}

                                    </button>

                                    {pdfUrl && (
                                      <a
                                        className="live-source-pdf-link"
                                        href={
                                          pdfUrl
                                        }
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                        PDF
                                      </a>
                                    )}

                                  </div>
                                );
                              }
                            )}

                          </div>

                        </div>
                      )}

                  </React.Fragment>
                )
              )}

              {/* =================================================
                  THINKING / VOICE PROCESSING
              ================================================= */}

              {(isLoading ||
                isTranscribing ||
                isListening) && (

                <div
                  className="thinking-row"
                  role="status"
                  aria-live="polite"
                >

                  <div className="thinking-avatar">

                    {isListening ? (
                      <Mic size={15} />
                    ) : (
                      <Sparkles size={15} />
                    )}

                  </div>

                  <div className="thinking-card">

                    <span>
                      {isListening
                        ? "Listening..."
                        : isTranscribing
                        ? "Processing voice..."
                        : "Thinking..."}
                    </span>

                    <i />
                    <i />
                    <i />

                  </div>

                </div>
              )}

            </div>

          </div>

          {/* =================================================
              SOURCE PREVIEW MODAL
          ================================================= */}

          {selectedSource && (

            <div
              className="source-preview-backdrop"
              role="presentation"
              onClick={() =>
                setSelectedSource(null)
              }
            >

              <section
                className="source-preview-panel"
                role="dialog"
                aria-modal="true"
                aria-labelledby="source-preview-title"
                onClick={(event) =>
                  event.stopPropagation()
                }
              >

                <div className="source-preview-header">

                  <div>

                    <span className="intro-kicker">
                      VERIFIED SOURCE
                    </span>

                    <h2 id="source-preview-title">
                      {getSourceTitle(
                        selectedSource
                      )}
                    </h2>

                  </div>

                  <button
                    type="button"
                    className="source-preview-close"
                    onClick={() =>
                      setSelectedSource(null)
                    }
                    aria-label="Close source preview"
                  >
                    <X size={18} />
                  </button>

                </div>

                <div className="source-preview-meta">

                  {selectedSource.source ||
                    selectedSource.filename ||
                    selectedSource.source_file ||
                    selectedSource.metadata
                      ?.source_file ||
                    "Official document"}

                  {selectedSource.page !=
                    null &&
                    ` · Page ${selectedSource.page}`}

                  {selectedSource.section &&
                    ` · ${selectedSource.section}`}

                </div>

                {getSourcePdfUrl(
                  selectedSource
                ) && (

                  <div className="source-preview-document-link">

                    <a
                      href={getSourcePdfUrl(
                        selectedSource
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open reference PDF
                    </a>

                  </div>
                )}

                <p className="source-preview-note">
                  Relevant verified excerpt
                  from this document
                </p>

                <pre className="source-preview-text">

                  {selectedSource.excerpt ||
                    selectedSource.text ||
                    selectedSource.content ||
                    "The document excerpt is not available for this result."}

                </pre>

              </section>

            </div>
          )}

          {/* =================================================
              COMPOSER
          ================================================= */}

          <div className="composer-wrap mt-3 pt-2 border-t border-gray-100">

            <div className="chat-composer flex flex-col gap-2">

              <textarea
                ref={textareaRef}
                value={input}
                onChange={(event) =>
                  setInput(
                    event.target.value
                  )
                }
                onKeyDown={handleKeyDown}
                placeholder="Ask about cooperatives, schemes, loans, laws..."
                rows={4}
                style={{
                  minHeight: "100px",
                  resize: "none",
                }}
                disabled={
                  isLoading ||
                  isTranscribing
                }
                aria-label="Ask Sanyukt Vaani"
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <div className="composer-actions flex justify-between items-center mt-1">

                <small className="text-gray-500 text-xs">
                  Enter to send · Shift + Enter
                  for a new line
                </small>

                <div className="flex gap-2">

                  {/* =========================================
                      MICROPHONE
                  ========================================= */}

                  <button
                    type="button"
                    className={`composer-mic p-2 rounded-full ${
                      isListening
                        ? "is-listening bg-red-100 text-red-600"
                        : ""
                    }`}
                    onClick={
                      handleVoiceClick
                    }
                    disabled={
                      isLoading ||
                      isTranscribing
                    }
                    aria-label={
                      isListening
                        ? "Stop listening"
                        : "Use microphone"
                    }
                    title={
                      isListening
                        ? "Stop listening"
                        : "Start voice input"
                    }
                  >

                    <Mic size={20} />

                  </button>

                  {/* =========================================
                      SEND
                  ========================================= */}

                  <button
                    type="button"
                    className="composer-send bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-1 hover:bg-blue-700 disabled:opacity-50"
                    onClick={
                      sendMessage
                    }
                    disabled={
                      isLoading ||
                      isTranscribing ||
                      isListening ||
                      !input.trim()
                    }
                    aria-label="Send message"
                    title="Send message"
                  >

                    <span>
                      Send
                    </span>

                    <Send size={16} />

                  </button>

                </div>

              </div>

            </div>

          </div>

        </section>

      </div>

    </div>
  );
}

export default Chat;