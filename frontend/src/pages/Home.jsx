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

function Home({ onNavigate }) {
  const {
    t,
    language,
    transcript,
    isListening,
    voiceMessage,
    detectFromSpeech
  } = useLanguage();

  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const voiceStartedRef = useRef(false);
  const navigationHandledRef = useRef(false);
  const previousListeningRef = useRef(false);

  const handleVoiceClick = () => {
    if (!isListening) {
      voiceStartedRef.current = true;
      navigationHandledRef.current = false;
      setIsProcessing(false);

      detectFromSpeech();
      return;
    }
    detectFromSpeech();
  };

  useEffect(() => {
    const justStoppedListening =
      previousListeningRef.current === true && isListening === false;

    previousListeningRef.current = isListening;

    if (
      justStoppedListening &&
      voiceStartedRef.current &&
      transcript?.trim() &&
      !navigationHandledRef.current
    ) {
      navigationHandledRef.current = true;
      setIsProcessing(true);

      const timer = setTimeout(() => {
        onNavigate("chat");
      }, 250);

      return () => clearTimeout(timer);
    }
  }, [isListening, transcript, onNavigate]);

  const handleQuestionChange = (event) => {
    setQuestion(event.target.value);

    if (event.target.value.trim()) {
      voiceStartedRef.current = false;
      navigationHandledRef.current = false;
    }
  };

  const handleSendQuestion = () => {
    const typedQuestion = question.trim();

    if (!typedQuestion) {
      if (transcript?.trim()) {
        onNavigate("chat");
      }
      return;
    }

    onNavigate("chat");
  };

  const hasTranscript = Boolean(transcript?.trim());

  const voiceButtonClass = [
    "dashboard-voice",
    isListening ? "listening" : "",
    isProcessing ? "processing" : ""
  ]
    .filter(Boolean)
    .join(" ");

  let voiceTitle = t.speak || "Tap to speak";
  let voiceSubtitle = t.speakSub || "Ask your question naturally";

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
          MAIN HERO / WORKSPACE SECTION
      ====================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start mb-8">
        
        {/* LEFT SIDE - Welcome Info */}
        <section className="citizen-welcome flex flex-col justify-between h-full space-y-6">
          <div>
            <div className="eyebrow mb-3 inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {t.brandEyebrow || "AI assistance is available"}
            </div>

            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 leading-tight">
              {t.welcome || "Government & cooperative information is now easy to access"}
            </h2>

            <p className="text-slate-600 mt-4 text-sm leading-relaxed">
              {t.welcomeText || "Ask about loans, government schemes, crop insurance, PACS services, rules and grievance procedures in your language."}
            </p>
          </div>

          <div className="welcome-hello flex items-center gap-2 text-xs font-medium text-blue-600 bg-blue-50 p-3 rounded-xl border border-blue-100">
            <Sparkles size={16} />
            <span>{t.hello || "Select options below or start speaking your query"}</span>
          </div>
        </section>

        {/* RIGHT SIDE - Speaker, Query Input, & Scrollable Response */}
        <section className="ask-card voice-assistant-card bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col gap-5">
          
          {/* Top Status & Language Bar */}
          <div className="ask-head flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="ready-state flex items-center gap-2 text-xs font-semibold text-slate-700">
              <span
                className={`online-dot w-2.5 h-2.5 rounded-full ${
                  isListening
                    ? "bg-red-500 animate-ping"
                    : "bg-emerald-500"
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

            <span className="auto-language flex items-center gap-1.5 text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
              <Languages size={14} />
              <span>{language?.label || "English"}</span>
            </span>
          </div>

          {/* Speaker Button / Main Voice Section */}
          <button
            type="button"
            className={`${voiceButtonClass} w-full p-4 rounded-xl border border-blue-100 bg-blue-50/50 flex items-center justify-between transition hover:bg-blue-50`}
            onClick={handleVoiceClick}
            disabled={isProcessing}
            aria-label={isListening ? "Stop listening" : "Start listening"}
          >
            <div className="flex items-center gap-3">
              <span className="dashboard-mic p-2.5 bg-blue-600 text-white rounded-lg flex items-center justify-center">
                <Mic size={22} />
              </span>
              <div className="voice-main-text text-left">
                <strong className="block text-sm text-slate-900 font-semibold">
                  {voiceTitle}
                </strong>
                <small className="text-xs text-slate-500">
                  {voiceSubtitle}
                </small>
              </div>
            </div>
            <Volume2 size={18} className="text-blue-600 opacity-70" />
          </button>

          {/* Voice Status Updates */}
          <div className="voice-status-area text-xs text-slate-500">
            {isListening && (
              <div className="voice-live-status flex items-center gap-2 text-red-600">
                <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                <span>Listening to your question...</span>
              </div>
            )}

            {isProcessing && (
              <div className="voice-processing-status flex items-center gap-2 text-blue-600">
                <Sparkles size={15} />
                <span>Understanding your question and fetching response...</span>
              </div>
            )}
          </div>

          {/* Voice Transcript Display */}
          {hasTranscript && (
            <div className="voice-transcript-card bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div className="voice-transcript-header flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1">
                <MessageCircle size={14} />
                <span>Your question</span>
              </div>
              <p className="text-xs text-slate-600">{transcript}</p>
            </div>
          )}

          {/* Larger User Query Textarea Box */}
          <div className="typed-question-section flex flex-col gap-2">
            <label className="ask-input-label text-xs font-semibold text-slate-700">
              {t.type || "Your Query"}
            </label>

            <div className="ask-input flex flex-col gap-2">
              <textarea
                rows={3}
                value={question}
                onChange={handleQuestionChange}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    handleSendQuestion();
                  }
                }}
                placeholder={
                  t.placeholder || "Type your detailed question here..."
                }
                disabled={isListening || isProcessing}
                className="w-full p-3 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none text-slate-800"
              />

              <div className="flex justify-end">
                <button
                  type="button"
                  className="send-btn bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-xs font-medium px-4 py-2 rounded-lg flex items-center gap-1.5 transition"
                  onClick={handleSendQuestion}
                  disabled={
                    (!question.trim() && !hasTranscript) ||
                    isListening ||
                    isProcessing
                  }
                  aria-label={t.ask || "Ask question"}
                >
                  <span>{t.ask || "Send"}</span>
                  <Send size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* AI Response Box (Fixed Height + Internal Vertical Scrollbar) */}
          <div className="bg-emerald-50/70 border border-emerald-200 p-4 rounded-xl flex flex-col gap-2">
            <span className="text-xs font-bold text-emerald-800 flex items-center gap-1">
              <Sparkles size={14} /> AI Response
            </span>

            <div className="max-h-[220px] overflow-y-auto pr-2 text-xs text-emerald-950 leading-relaxed font-normal whitespace-pre-wrap">
              {response || transcript || "Your generated response will appear here in scrollable view once queried..."}
            </div>
          </div>

          {voiceMessage && (
            <p className="voice-detection-note text-[11px] text-slate-400 italic">
              {voiceMessage}
            </p>
          )}
        </section>
      </div>

      {/* =====================================================
          QUICK ACCESS
      ====================================================== */}
      <div className="section-title flex items-center justify-between my-6">
        <div>
          <h3 className="text-lg font-bold text-slate-800">
            {t.explore || "Explore Topics"}
          </h3>
          <p className="text-xs text-slate-500">
            {t.exploreSub || "Quick categories to start asking"}
          </p>
        </div>

        <button
          type="button"
          className="text-btn text-xs text-blue-600 font-semibold flex items-center gap-1 hover:underline"
          onClick={() => onNavigate("sources")}
        >
          {t.viewAll || "View All"}
          <ChevronRight size={15} />
        </button>
      </div>

      {/* =====================================================
          INFORMATION CATEGORIES
      ====================================================== */}
      <div className="info-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <InfoCard
          icon="🏦"
          title={t.loans || "Loans"}
          text={t.loansText || "Agricultural & personal loans"}
          onClick={() => onNavigate("chat")}
        />
        <InfoCard
          icon="🌾"
          title={t.insurance || "Crop Insurance"}
          text={t.insuranceText || "PMFBY and crop safety"}
          onClick={() => onNavigate("chat")}
        />
        <InfoCard
          icon="🏛️"
          title={t.schemes || "Schemes"}
          text={t.schemesText || "Government benefits"}
          onClick={() => onNavigate("chat")}
        />
        <InfoCard
          icon="⚖️"
          title={t.grievance || "Grievances"}
          text={t.grievanceText || "Support and resolution"}
          onClick={() => onNavigate("chat")}
        />
      </div>

      {/* =====================================================
          TRUST STRIP
      ====================================================== */}
      <div className="trust-strip bg-slate-900 text-white p-6 rounded-2xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <ShieldCheck size={28} className="text-emerald-400" />
          <div>
            <strong className="block text-sm font-semibold">
              {t.trust || "Official Knowledge Base"}
            </strong>
            <span className="text-xs text-slate-400">
              {t.trustText || "Verified information directly from trusted government data"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="trust-stat text-center">
            <strong className="block text-lg font-extrabold text-emerald-400">128</strong>
            <span className="text-[11px] text-slate-400">{t.sourcesCount || "Sources"}</span>
          </div>
          <div className="trust-stat text-center">
            <strong className="block text-lg font-extrabold text-emerald-400">08</strong>
            <span className="text-[11px] text-slate-400">{t.languages || "Languages"}</span>
          </div>
        </div>
      </div>
    </>
  );
}

/* =========================================================
   INFORMATION CARD
========================================================= */
function InfoCard({ icon, title, text, onClick }) {
  return (
    <button
      type="button"
      className="info-card bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between text-left hover:border-blue-300 transition shadow-sm"
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <span className="info-icon text-xl p-2 bg-slate-50 rounded-lg">{icon}</span>
        <div>
          <strong className="block text-xs font-bold text-slate-800">{title}</strong>
          <span className="text-[11px] text-slate-500">{text}</span>
        </div>
      </div>
      <ChevronRight size={17} className="text-slate-400" />
    </button>
  );
}

export default Home;