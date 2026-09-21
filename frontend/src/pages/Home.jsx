import {
  Mic,
  Send,
  Languages,
  ShieldCheck,
  Sparkles,
  ChevronRight,
  MessageCircle,
  Volume2
} from "lucide-react";

import {
  useEffect,
  useRef,
  useState
} from "react";

import { useLanguage } from "../context/LanguageContext";

function Home({
  onNavigate
}) {
  const {
    t,
    language,
    transcript,
    isListening,
    voiceMessage,
    detectFromSpeech
  } = useLanguage();

  const [question, setQuestion] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  /*
   * Used to know whether the user actually started a
   * voice interaction from this page.
   *
   * This prevents automatic navigation when an old transcript
   * already exists in LanguageContext.
   */
  const voiceStartedRef = useRef(false);

  /*
   * Prevent multiple automatic navigations.
   */
  const navigationHandledRef = useRef(false);

  /*
   * Keep track of the previous listening state.
   *
   * false -> true  = started listening
   * true  -> false  = stopped listening
   */
  const previousListeningRef = useRef(false);

  /*
   * ---------------------------------------------------------
   * VOICE START / STOP
   * ---------------------------------------------------------
   *
   * Your LanguageContext already owns the actual speech
   * recognition logic.
   *
   * We intentionally call the existing detectFromSpeech()
   * instead of creating another SpeechRecognition instance
   * here.
   */
  const handleVoiceClick = () => {
    /*
     * User is starting a new voice interaction.
     */
    if (!isListening) {
      voiceStartedRef.current = true;
      navigationHandledRef.current = false;
      setIsProcessing(false);

      detectFromSpeech();
      return;
    }

    /*
     * User is already listening.
     *
     * Your LanguageContext's detectFromSpeech() should toggle
     * the recognition state and stop listening.
     */
    detectFromSpeech();
  };

  /*
   * ---------------------------------------------------------
   * AUTOMATIC CHAT NAVIGATION
   * ---------------------------------------------------------
   *
   * When:
   *
   *     Listening
   *        ↓
   *     Stopped
   *        ↓
   *     Transcript available
   *
   * automatically move to Chat.
   *
   * This removes the unnecessary "Send" click from voice mode.
   */
  useEffect(() => {
    const justStoppedListening =
      previousListeningRef.current === true &&
      isListening === false;

    previousListeningRef.current = isListening;

    if (
      justStoppedListening &&
      voiceStartedRef.current &&
      transcript?.trim() &&
      !navigationHandledRef.current
    ) {
      navigationHandledRef.current = true;

      setIsProcessing(true);

      /*
       * Small delay gives the UI time to show:
       *
       * "Processing your question..."
       *
       * before moving to the chat screen.
       */
      const timer = setTimeout(() => {
        onNavigate("chat");
      }, 250);

      return () => clearTimeout(timer);
    }
  }, [
    isListening,
    transcript,
    onNavigate
  ]);

  /*
   * ---------------------------------------------------------
   * TYPED QUESTION
   * ---------------------------------------------------------
   */
  const handleQuestionChange = (event) => {
    setQuestion(event.target.value);

    /*
     * If the user starts typing, don't treat an old voice
     * transcript as the active question.
     */
    if (event.target.value.trim()) {
      voiceStartedRef.current = false;
      navigationHandledRef.current = false;
    }
  };

  const handleSendQuestion = () => {
    const typedQuestion = question.trim();

    if (!typedQuestion) {
      /*
       * If no typed question exists, use the voice transcript.
       */
      if (transcript?.trim()) {
        onNavigate("chat");
      }

      return;
    }

    onNavigate("chat");
  };

  /*
   * ---------------------------------------------------------
   * UI STATE
   * ---------------------------------------------------------
   */

  const hasTranscript = Boolean(
    transcript?.trim()
  );

  const voiceButtonClass = [
    "dashboard-voice",
    isListening ? "listening" : "",
    isProcessing ? "processing" : ""
  ]
    .filter(Boolean)
    .join(" ");

  let voiceTitle = t.speak || "Tap to speak";
  let voiceSubtitle =
    t.speakSub ||
    "Ask your question naturally";

  if (isListening) {
    voiceTitle = t.detecting || "Listening...";
    voiceSubtitle = "Tap again to stop";
  } else if (isProcessing) {
    voiceTitle = "Processing...";
    voiceSubtitle = "Finding the best answer";
  }

  return (
    <>
      {/* =====================================================
          WELCOME
      ====================================================== */}

      <section className="citizen-welcome">
        <div className="welcome-copy">
          <div className="eyebrow">
            {t.brandEyebrow}
          </div>

          <h2>
            {t.welcome}
          </h2>

          <p>
            {t.welcomeText}
          </p>

          <div className="welcome-hello">
            <Sparkles size={16} />
            {t.hello}
          </div>
        </div>

        <div className="welcome-orb">
          <Sparkles size={28} />
        </div>
      </section>

      {/* =====================================================
          VOICE ASSISTANT
      ====================================================== */}

      <section className="ask-card voice-assistant-card">

        {/* Header */}
        <div className="ask-head">

          <div className="ready-state">
            <span
              className={`online-dot ${
                isListening
                  ? "voice-active-dot"
                  : ""
              }`}
            />

            <span>
              {isListening
                ? "Listening"
                : isProcessing
                  ? "Processing"
                  : t.ready || "Ready"}
            </span>
          </div>

          <span className="auto-language">
            <Languages size={14} />

            <span>
              {language?.label || "English"}
            </span>
          </span>
        </div>

        {/* =================================================
            MAIN VOICE BUTTON
        ================================================== */}

        <button
          type="button"
          className={voiceButtonClass}
          onClick={handleVoiceClick}
          disabled={isProcessing}
          aria-label={
            isListening
              ? "Stop listening"
              : "Start listening"
          }
        >

          <span className="dashboard-mic">

            {isListening ? (
              <span className="mic-listening-animation">
                <Mic size={30} />
              </span>
            ) : (
              <Mic size={30} />
            )}

          </span>

          <span className="voice-main-text">

            <strong>
              {voiceTitle}
            </strong>

            <small>
              {voiceSubtitle}
            </small>

          </span>

          <span className="voice-language-chip">
            {language?.label || "English"}
          </span>

        </button>

        {/* =================================================
            STATUS MESSAGE
        ================================================== */}

        <div className="voice-status-area">

          {isListening && (
            <div className="voice-live-status">
              <span className="voice-pulse" />

              <span>
                Listening to your question...
              </span>
            </div>
          )}

          {isProcessing && (
            <div className="voice-processing-status">
              <Sparkles size={15} />

              <span>
                Understanding your question and finding
                the relevant information...
              </span>
            </div>
          )}

          {!isListening &&
            !isProcessing &&
            !hasTranscript && (
              <div className="voice-ready-hint">
                <Volume2 size={15} />

                <span>
                  Tap the microphone and ask your question
                </span>
              </div>
            )}

        </div>

        {/* =================================================
            LIVE TRANSCRIPT
        ================================================== */}

        {hasTranscript && (
          <div className="voice-transcript-card">

            <div className="voice-transcript-header">
              <MessageCircle size={15} />

              <span>
                Your question
              </span>
            </div>

            <p>
              {transcript}
            </p>

          </div>
        )}

        {/* =================================================
            OPTIONAL TYPED QUESTION
        ================================================== */}

        <div className="typed-question-section">

          <label className="ask-input-label">
            {t.type || "Or type your question"}
          </label>

          <div className="ask-input">

            <input
              value={question}
              onChange={handleQuestionChange}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  handleSendQuestion();
                }
              }}
              placeholder={
                t.placeholder ||
                "Type your question..."
              }
              disabled={
                isListening ||
                isProcessing
              }
            />

            <button
              type="button"
              className="send-btn"
              onClick={handleSendQuestion}
              disabled={
                !question.trim() ||
                isListening ||
                isProcessing
              }
              aria-label={
                t.ask || "Ask question"
              }
            >
              <Send size={18} />
            </button>

          </div>

        </div>

        {/* Existing voice detection message */}
        {voiceMessage && (
          <p className="voice-detection-note">
            {voiceMessage}
          </p>
        )}

      </section>

      {/* =====================================================
          QUICK ACCESS
      ====================================================== */}

      <div className="section-title">

        <div>
          <h3>
            {t.explore}
          </h3>

          <p>
            {t.exploreSub}
          </p>
        </div>

        <button
          type="button"
          className="text-btn"
          onClick={() =>
            onNavigate("sources")
          }
        >
          {t.viewAll}

          <ChevronRight size={15} />
        </button>

      </div>

      {/* =====================================================
          INFORMATION CATEGORIES
      ====================================================== */}

      <div className="info-grid">

        <InfoCard
          icon="🏦"
          title={t.loans}
          text={t.loansText}
          onClick={() =>
            onNavigate("chat")
          }
        />

        <InfoCard
          icon="🌾"
          title={t.insurance}
          text={t.insuranceText}
          onClick={() =>
            onNavigate("chat")
          }
        />

        <InfoCard
          icon="🏛️"
          title={t.schemes}
          text={t.schemesText}
          onClick={() =>
            onNavigate("chat")
          }
        />

        <InfoCard
          icon="⚖️"
          title={t.grievance}
          text={t.grievanceText}
          onClick={() =>
            onNavigate("chat")
          }
        />

      </div>

      {/* =====================================================
          TRUST STRIP
      ====================================================== */}

      <div className="trust-strip">

        <ShieldCheck size={22} />

        <div>
          <strong>
            {t.trust}
          </strong>

          <span>
            {t.trustText}
          </span>
        </div>

        <div className="trust-stat">
          <strong>
            128
          </strong>

          <span>
            {t.sourcesCount}
          </span>
        </div>

        <div className="trust-stat">
          <strong>
            08
          </strong>

          <span>
            {t.languages}
          </span>
        </div>

      </div>
    </>
  );
}


/* =========================================================
   INFORMATION CARD
========================================================= */

function InfoCard({
  icon,
  title,
  text,
  onClick
}) {
  return (
    <button
      type="button"
      className="info-card"
      onClick={onClick}
    >

      <div className="info-icon">
        {icon}
      </div>

      <div>
        <strong>
          {title}
        </strong>

        <span>
          {text}
        </span>
      </div>

      <ChevronRight size={17} />

    </button>
  );
}


export default Home;