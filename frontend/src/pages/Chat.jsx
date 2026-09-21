import {
  FileCheck2,
  Languages,
  Mic,
  Plus,
  Send,
  ShieldCheck,
  Sparkles,
  X
} from "lucide-react";

import React, { useEffect, useRef, useState } from "react";

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
  language: "en"
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
    "sa-in": "sa"
  };

  return (
    aliases[value] ||
    (["en", "hi", "mr", "gu", "kn", "sa"].includes(value)
      ? value
      : fallback)
  );
}

/* =========================================================
   CLEAN TEXT FOR BROWSER SPEECH

   IMPORTANT:
   This function ONLY cleans the text sent to speech.

   The actual answer displayed in the chat remains
   completely unchanged.
========================================================= */

function cleanTextForSpeech(text) {
  if (!text) {
    return "";
  }

  let cleaned = String(text);

  /* -------------------------------------------------------
     1. Unicode normalization
  ------------------------------------------------------- */

  cleaned = cleaned.normalize("NFKC");

  /* -------------------------------------------------------
     2. Remove URLs
  ------------------------------------------------------- */

  cleaned = cleaned.replace(
    /https?:\/\/[^\s]+/gi,
    " "
  );

  /* -------------------------------------------------------
     3. Remove fenced code blocks
  ------------------------------------------------------- */

  cleaned = cleaned.replace(
    /```[\s\S]*?```/g,
    " "
  );

  /* -------------------------------------------------------
     4. Remove inline code markers
  ------------------------------------------------------- */

  cleaned = cleaned.replace(
    /`([^`]*)`/g,
    "$1"
  );

  /* -------------------------------------------------------
     5. Remove internal source markers

     Examples:
     [Source 1]
     [Document 2]
     [Chunk 3]
     [Evidence 4]
  ------------------------------------------------------- */

  cleaned = cleaned.replace(
    /\[(?:Source|Document|Chunk|Evidence)\s+\d+\]/gi,
    " "
  );

  /* -------------------------------------------------------
     6. Remove source/reference lines
  ------------------------------------------------------- */

  cleaned = cleaned.replace(
    /^\s*(?:source|sources|reference|references|evidence)\s*:.*$/gim,
    " "
  );

  /* -------------------------------------------------------
     7. Remove Markdown headings
  ------------------------------------------------------- */

  cleaned = cleaned.replace(
    /^\s{0,3}#{1,6}\s*/gm,
    ""
  );

  /* -------------------------------------------------------
     8. Remove Markdown bold / italic markers

     **text** -> text
     __text__ -> text
     *text* -> text
     _text_ -> text
  ------------------------------------------------------- */

  cleaned = cleaned.replace(
    /(\*\*|__)/g,
    ""
  );

  cleaned = cleaned.replace(
    /(^|\s)[*_]+(?=\S)/g,
    "$1"
  );

  cleaned = cleaned.replace(
    /(?<=\S)[*_]+(?=\s|$)/g,
    ""
  );

  /* -------------------------------------------------------
     9. Remove bullet formatting
  ------------------------------------------------------- */

  cleaned = cleaned.replace(
    /^\s*[-•●▪◦‣]\s+/gm,
    ""
  );

  /* -------------------------------------------------------
     10. Remove numbered list formatting

     1. Text
     2) Text
  ------------------------------------------------------- */

  cleaned = cleaned.replace(
    /^\s*\d+[.)]\s+/gm,
    ""
  );

  /* -------------------------------------------------------
     11. Remove table formatting
  ------------------------------------------------------- */

  cleaned = cleaned.replace(
    /^\s*\|?[\s\-:|]+\|?\s*$/gm,
    ""
  );

  cleaned = cleaned.replace(
    /\|/g,
    " "
  );

  /* -------------------------------------------------------
     12. Remove decorative separator lines
  ------------------------------------------------------- */

  cleaned = cleaned.replace(
    /^\s*[_\-+=*~^]{3,}\s*$/gm,
    " "
  );

  /* -------------------------------------------------------
     13. Remove repeated decorative symbols
  ------------------------------------------------------- */

  cleaned = cleaned.replace(
    /\+{2,}/g,
    " "
  );

  cleaned = cleaned.replace(
    /-{3,}/g,
    " "
  );

  cleaned = cleaned.replace(
    /\*{3,}/g,
    " "
  );

  cleaned = cleaned.replace(
    /={3,}/g,
    " "
  );

  cleaned = cleaned.replace(
    /~{3,}/g,
    " "
  );

  cleaned = cleaned.replace(
    /_{2,}/g,
    " "
  );

  /* -------------------------------------------------------
     14. Remove decorative Unicode symbols
  ------------------------------------------------------- */

  cleaned = cleaned.replace(
    /[★☆◆◇■□●○►▶→←↑↓✓✔✕✖️🔹🔸🔺🔻]/gu,
    " "
  );

  /* -------------------------------------------------------
     15. Remove HTML tags
  ------------------------------------------------------- */

  cleaned = cleaned.replace(
    /<[^>]*>/g,
    " "
  );

  /* -------------------------------------------------------
     16. Remove common internal/debug leakage

     These should never be spoken.
  ------------------------------------------------------- */

  cleaned = cleaned.replace(
    /\b(?:source|sources|retrieval|retrieved|embedding|reranker|qdrant|gemini)\s*[:=]\s*[^\n]+/gi,
    " "
  );

  /* -------------------------------------------------------
     17. Remove internal metadata labels
  ------------------------------------------------------- */

  cleaned = cleaned.replace(
    /\b(?:final score|similarity score|rerank score|retrieval score|confidence score)\s*[:=]?\s*\d+(?:\.\d+)?%?\b/gi,
    " "
  );

  /* -------------------------------------------------------
     18. Preserve normal Unicode letters/numbers and
         useful punctuation.

     This keeps:
     English
     Hindi
     Marathi
     Numbers
     ₹
     %
  ------------------------------------------------------- */

  cleaned = cleaned.replace(
    /[^\p{L}\p{N}\s.,?!:;'"()/%₹-]/gu,
    " "
  );

  /* -------------------------------------------------------
     19. Clean punctuation spacing
  ------------------------------------------------------- */

  cleaned = cleaned.replace(
    /\s+([,.?!:;])/g,
    "$1"
  );

  /* -------------------------------------------------------
     20. Repeated punctuation

     !!! -> !
     ??? -> ?
  ------------------------------------------------------- */

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

  /* -------------------------------------------------------
     21. Normalize line breaks
  ------------------------------------------------------- */

  cleaned = cleaned.replace(
    /\r\n/g,
    "\n"
  );

  cleaned = cleaned.replace(
    /\r/g,
    "\n"
  );

  cleaned = cleaned.replace(
    /\n{3,}/g,
    "\n\n"
  );

  /* -------------------------------------------------------
     22. Convert line breaks into natural speech pauses

     This prevents the browser speech engine from treating
     every short line as a separate strange fragment.
  ------------------------------------------------------- */

  cleaned = cleaned.replace(
    /\n+/g,
    ". "
  );

  /* -------------------------------------------------------
     23. Remove excessive whitespace
  ------------------------------------------------------- */

  cleaned = cleaned.replace(
    /\s+/g,
    " "
  );

  /* -------------------------------------------------------
     24. Final cleanup
  ------------------------------------------------------- */

  cleaned = cleaned
    .replace(/\s+([,.?!:;])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();

  return cleaned;
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
    speakText
  } = useLanguage();

  const [input, setInput] = useState("");

  const [messages, setMessages] = useState([
    INITIAL_MESSAGE
  ]);

  const [isLoading, setIsLoading] = useState(false);

  const [activeSources, setActiveSources] = useState([]);

  /*
    From main:
    Selected source is displayed in an in-app preview panel.
  */
  const [selectedSource, setSelectedSource] = useState(null);

  const textareaRef = useRef(null);

  /* =======================================================
     LIVE VOICE TRANSCRIPT → CHAT INPUT

     LanguageContext updates `transcript` continuously
     while the user is speaking.

     IMPORTANT:
     Do NOT clear transcript here. The voice context needs
     the live value until the final voice request completes.
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
  }, [transcript, isListening]);

  /* =======================================================
     FINAL VOICE RESULT → CHAT

     Flow:

     START MIC
       ↓
     live transcript appears in textarea
       ↓
     STOP MIC
       ↓
     BHASHINI final STT + language detection
       ↓
     RAG + Gemini
       ↓
     voiceResult
       ↓
     user message + assistant answer
       ↓
     automatic speech in detected language

     Voice is NOT sent through /api/chat/text again.
     /api/chat/voice already performs STT + RAG + answer.
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

    const sources = Array.isArray(
      voiceResult?.sources
    )
      ? voiceResult.sources
      : [];

    /* -----------------------------------------------------
       Keep sources visible for the latest answer.
    ----------------------------------------------------- */

    setActiveSources(sources);

    /* -----------------------------------------------------
       First source metadata.
    ----------------------------------------------------- */

    const firstSource =
      sources.length > 0
        ? sources[0]
        : null;

    const sourceTitle =
      firstSource?.title ||
      firstSource?.source ||
      firstSource?.metadata?.source_file ||
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

    /* -----------------------------------------------------
       Add BOTH messages together.

       The question keeps the detected language so that
       future per-message actions can use it.
    ----------------------------------------------------- */

    setMessages((previous) => [
      ...previous,

      {
        role: "user",
        text: question,
        language: detectedLanguage
      },

      {
        role: "assistant",
        text:
          answer ||
          "No response text received.",
        language: detectedLanguage,
        source: sourceTitle,
        page: sourcePage,
        confidence
      }
    ]);

    /* -----------------------------------------------------
       The live transcript was already visible in the input.
       Clear the composer after the final result arrives.
    ----------------------------------------------------- */

    setInput("");
    setTranscript("");

    /* -----------------------------------------------------
       Make the detected language the active UI language,
       if that language exists in the language selector.
    ----------------------------------------------------- */

    const supportedLanguage =
      languages.some(
        (item) =>
          item.id === detectedLanguage
      );

    if (
      supportedLanguage &&
      detectedLanguage !== languageId
    ) {
      setLanguage(detectedLanguage);
    }

    /* -----------------------------------------------------
       Automatically speak the final answer.

       ONLY cleaned speech text is sent to TTS.
       The visible answer remains unchanged.
    ----------------------------------------------------- */

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

    /* -----------------------------------------------------
       Consume the result.

       This prevents the same voice answer from being
       inserted again on a later render.
    ----------------------------------------------------- */

    setVoiceResult(null);

  }, [
    voiceResult,
    languageId,
    languages,
    setLanguage,
    setTranscript,
    setVoiceResult,
    speakText
  ]);

  /* =======================================================
     SEND MESSAGE
  ======================================================== */

  const sendMessage = async () => {
    const cleanQuery = input.trim();

    if (
      !cleanQuery ||
      isLoading ||
      isTranscribing
    ) {
      return;
    }

    /* -------------------------------------------------------
       Clear input immediately
    ------------------------------------------------------- */

    setInput("");
    setActiveSources([]);

    /* -------------------------------------------------------
       Close any previous source preview
    ------------------------------------------------------- */

    setSelectedSource(null);

    /* -------------------------------------------------------
       Add user message
    ------------------------------------------------------- */

    setMessages((previous) => [
      ...previous,

      {
        role: "user",
        text: cleanQuery
      }
    ]);

    setIsLoading(true);

    try {
      /* -----------------------------------------------------
         Send selected frontend language to backend.

         English -> en
         Hindi   -> hi
         Marathi -> mr
      ----------------------------------------------------- */

      const requestLanguage =
        normalizeResponseLanguage(
          languageId,
          "en"
        );

      const result =
        await askSanyuktVaani(
          cleanQuery,
          requestLanguage
        );

      /* -----------------------------------------------------
         Extract answer
      ----------------------------------------------------- */

      const answer = String(
        result?.answer || ""
      ).trim();

      /* -----------------------------------------------------
         Extract sources safely
      ----------------------------------------------------- */

      const sources = Array.isArray(
        result?.sources
      )
        ? result.sources
        : [];

      /* -----------------------------------------------------
         Determine response language.

         Backend language has priority.
         If backend doesn't return a language,
         selected frontend language is used.
      ----------------------------------------------------- */

      const answerLanguage =
        normalizeResponseLanguage(
          result?.language,
          requestLanguage
        );

      /* -----------------------------------------------------
         Save active sources
      ----------------------------------------------------- */

      setActiveSources(sources);

      /* -----------------------------------------------------
         First source
      ----------------------------------------------------- */

      const firstSource =
        sources.length > 0
          ? sources[0]
          : null;

      const sourceTitle =
        firstSource?.title ||
        firstSource?.source ||
        firstSource?.metadata?.source_file ||
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

      /* -----------------------------------------------------
         ADD ASSISTANT MESSAGE

         language: answerLanguage

         This allows ChatMessage.jsx to speak this
         particular answer in the correct language even
         if the user changes the language selector later.
      ----------------------------------------------------- */

      setMessages((previous) => [
        ...previous,

        {
          role: "assistant",
          text:
            answer ||
            "No response text received.",
          language: answerLanguage,
          source: sourceTitle,
          page: sourcePage,
          confidence
        }
      ]);

      /* -----------------------------------------------------
         Update frontend language if backend explicitly
         returned a supported language.
      ----------------------------------------------------- */

      const supportedLanguage =
        languages.some(
          (item) =>
            item.id === answerLanguage
        );

      if (
        supportedLanguage &&
        answerLanguage !== languageId
      ) {
        setLanguage(answerLanguage);
      }

      /* -----------------------------------------------------
         AUTOMATIC SPEECH

         Only the cleaned answer is spoken.
         The original answer shown in the UI is NOT
         modified.
      ----------------------------------------------------- */

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

      /* -----------------------------------------------------
         Error message
      ----------------------------------------------------- */

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
            "Unable to get an answer right now."
        }
      ]);

    } finally {
      setIsLoading(false);
    }
  };

  /* =======================================================
     KEYBOARD HANDLER
  ======================================================== */

  const handleKeyDown = (event) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();
      sendMessage();
    }
  };

  /* =======================================================
     NEW CHAT
  ======================================================== */

  const handleNewChat = () => {
    setMessages([
      INITIAL_MESSAGE
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

  /* =======================================================
     VOICE BUTTON
  ======================================================== */

  const handleVoiceClick = async () => {
    /*
      LanguageContext handles the complete voice lifecycle:

      FIRST CLICK
      ↓
      MediaRecorder starts
      +
      browser live SpeechRecognition starts
      ↓
      transcript updates continuously
      ↓
      textarea shows the live question

      SECOND CLICK
      ↓
      live SpeechRecognition stops
      ↓
      final audio is sent to /api/chat/voice
      ↓
      BHASHINI final transcript + language detection
      ↓
      RAG + Gemini answer
      ↓
      voiceResult is exposed by LanguageContext
      ↓
      the effect above adds question + answer
      ↓
      answer is spoken in detected language

      IMPORTANT:
      We do NOT call askSanyuktVaani() here.
      The voice endpoint already generates the answer.
    */

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

  /* =======================================================
     RENDER
  ======================================================== */

  return (
    <div className="chat-workspace">

      {/* ===================================================
          HEADER
      =================================================== */}

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
              {" "}
              Verified knowledge mode
            </small>

          </div>

        </div>

        <div className="chat-header-status">
          <ShieldCheck size={15} />
          RAG Online
        </div>

      </header>

      {/* ===================================================
          BODY
      =================================================== */}

      <div className="chat-workspace-body">

        {/* =================================================
            LEFT TOOL BAR
        ================================================== */}

        <aside
          className="chat-utility-bar"
          aria-label="Chat tools"
        >

          {/* NEW CHAT */}

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

          {/* LANGUAGE */}

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

        {/* =================================================
            CONVERSATION
        ================================================== */}

        <section className="conversation-panel">

          <div className="conversation-scroll">

            {/* =============================================
                INTRO
            ============================================== */}

            <div className="conversation-intro">

              <span className="intro-kicker">
                CITIZEN KNOWLEDGE ASSISTANT
              </span>

              <h1>
                How can we help you today?
              </h1>

              <p>
                Ask in English, Hindi,
                Marathi, or your preferred
                supported language.
              </p>

            </div>

            {/* =============================================
                MESSAGES
            ============================================== */}

            <div className="message-list">

              {messages.map(
                (message, index) => (

                  <React.Fragment
                    key={`${message.role}-${index}`}
                  >

                    <ChatMessage
                      message={message}
                    />

                    {/* ===================================
                        SOURCES
                    ==================================== */}

                    {message.role === "assistant" &&
                      index === messages.length - 1 &&
                      activeSources.length > 0 && (

                        <div className="live-sources">

                          <div className="live-sources-title">

                            <FileCheck2
                              size={15}
                            />

                            Sources used

                          </div>

                          <div className="live-source-list">

                            {activeSources.map(
                              (
                                source,
                                sourceIndex
                              ) => {

                                const title =
                                  source?.title ||
                                  source?.source ||
                                  source?.source_file ||
                                  source?.metadata
                                    ?.source_file ||
                                  "Official document";

                                const score =
                                  source?.score;

                                return (
                                  <a
                                    key={`${title}-${sourceIndex}`}
                                    className="live-source-chip"
                                    href="#source-preview"
                                    onClick={(event) => {
                                      event.preventDefault();
                                      setSelectedSource(
                                        source
                                      );
                                    }}
                                    aria-label={`Open source ${title}`}
                                  >

                                    {title}

                                    {score != null &&
                                      ` · ${Math.round(
                                        Number(score) *
                                          100
                                      )}%`}

                                  </a>
                                );
                              }
                            )}

                          </div>

                        </div>
                      )}

                  </React.Fragment>
                )
              )}

              {/* =========================================
                  THINKING / VOICE PROCESSING
              ========================================== */}

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
              SOURCE PREVIEW
          ================================================== */}

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
                      {selectedSource.title ||
                        selectedSource.source ||
                        selectedSource.source_file ||
                        selectedSource.metadata
                          ?.source_file ||
                        "Official document"}
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
                    selectedSource.source_file ||
                    selectedSource.metadata
                      ?.source_file ||
                    "Official document"}

                  {selectedSource.page != null &&
                    ` · Page ${selectedSource.page}`}

                </div>

                <p className="source-preview-note">
                  Relevant verified excerpt from
                  this document
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
          ================================================== */}

          <div className="composer-wrap">

            <div className="chat-composer">

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
                rows={1}
                disabled={
                  isLoading ||
                  isTranscribing
                }
                aria-label="Ask Sanyukt Vaani"
              />

              <div className="composer-actions">

                {/* =======================================
                    MICROPHONE
                ======================================== */}

                <button
                  type="button"
                  className={`composer-mic ${
                    isListening
                      ? "is-listening"
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

                  <Mic size={19} />

                </button>

                {/* =======================================
                    SEND
                ======================================== */}

                <button
                  type="button"
                  className="composer-send"
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

                  <Send size={18} />

                </button>

              </div>

            </div>

            {/* =============================================
                COMPOSER HELP
            ============================================== */}

            <small>
              Enter to send · Shift + Enter
              for a new line · Don’t share
              sensitive personal information.
            </small>

          </div>

        </section>

      </div>

    </div>
  );
}

export default Chat;