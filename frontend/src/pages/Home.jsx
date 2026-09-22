import {
  Mic,
  Send,
  Languages,
  ShieldCheck,
  Sparkles,
  ChevronRight,
  Volume2,
  ExternalLink,
  User,
  RotateCcw
} from "lucide-react";

import {
  useEffect,
  useRef,
  useState
} from "react";

import { useLanguage } from "../context/LanguageContext";
import { askSanyuktVaani } from "../services/api";

function formatChatbotText(text) {
  if (!text) return "";
  return text
    .replace(/\\([*_#~`[\]()])/g, "$1")
    .replace(/^\s{0,4}#{1,6}\s*(.+)$/gm, "$1")
    .replace(/\*\*\*([^*]+)\*\*\*/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/___([^_]+)___/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/[*#_~`\\]/g, "")
    .trim();
}

function Home({ onNavigate }) {
  const {
    t,
    language,
    languageId,
    transcript,
    isListening,
    voiceMessage,
    detectFromSpeech,
    speakText
  } = useLanguage();

  const [question, setQuestion] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    {
      role: "assistant",
      text: t.hello || "Namaste! Tap the blue voice button or type below to ask about cooperative schemes, loans, and government policies."
    }
  ]);

  const voiceStartedRef = useRef(false);
  const previousListeningRef = useRef(false);
  const chatScrollRef = useRef(null);

  // Auto-scroll ONLY inside the chat container (website will not scroll)
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, isProcessing, isListening]);

  const handleSendMessage = async (queryText) => {
    const cleanQuery = String(queryText || "").trim();
    if (!cleanQuery || isProcessing) return;

    // 1. Add user query to chat history
    setChatMessages((prev) => [
      ...prev,
      { role: "user", text: cleanQuery }
    ]);
    setQuestion("");
    setIsProcessing(true);

    try {
      const activeLang = languageId || language?.id || "hi";
      const result = await askSanyuktVaani(cleanQuery, activeLang);
      const answer = String(result?.answer || "No response text received.").trim();

      // 2. Add AI response to chat
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", text: answer }
      ]);

      // 3. Natural speech output without any asterisks or hashes
      speakText(answer, activeLang);
    } catch (err) {
      console.error("Home chatbot error:", err);
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "Kshama karein, uttar prapt karne me samasya aayi. Kripya punah prayas karein."
        }
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVoiceClick = () => {
    if (!isListening) {
      voiceStartedRef.current = true;
      detectFromSpeech();
      return;
    }
    detectFromSpeech();
  };

  // When speech recognition stops, process question right here beside the button
  useEffect(() => {
    const justStoppedListening =
      previousListeningRef.current === true && isListening === false;

    previousListeningRef.current = isListening;

    if (
      justStoppedListening &&
      voiceStartedRef.current &&
      transcript?.trim()
    ) {
      voiceStartedRef.current = false;
      handleSendMessage(transcript);
    }
  }, [isListening, transcript]);

  const handleQuestionChange = (event) => {
    setQuestion(event.target.value);
  };

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
    voiceSubtitle = "Finding verified answer";
  }

  return (
    <>
      {/* =====================================================
          MAIN HERO / WORKSPACE SECTION
      ====================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch mb-8">
        
        {/* LEFT SIDE - Welcome Info */}
        <section className="citizen-welcome lg:col-span-4 flex flex-col justify-between space-y-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <div className="eyebrow mb-3 inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {t.brandEyebrow || "AI assistance is available"}
            </div>

            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 leading-tight">
              {t.welcome || "Government & cooperative information is now easy to access"}
            </h2>

            <p className="text-slate-600 mt-3 text-xs leading-relaxed">
              {t.welcomeText || "Ask about loans, government schemes, crop insurance, PACS services, rules and grievance procedures in your language."}
            </p>
          </div>

          <div className="welcome-hello flex items-center gap-2 text-xs font-medium text-blue-700 bg-blue-50 p-3 rounded-xl border border-blue-100">
            <Sparkles size={16} className="flex-shrink-0 text-blue-600" />
            <span>{t.hello || "Start speaking or type your query in the chatbot"}</span>
          </div>
        </section>

        {/* RIGHT SIDE - SIDE-BY-SIDE: Blue Voice Button (Left) + Scrollable Chatbot (Right) */}
        <section className="ask-card voice-assistant-card lg:col-span-8 bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col gap-4">
          
          {/* Top Status & Language Bar */}
          <div className="ask-head flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="ready-state flex items-center gap-2 text-xs font-semibold text-slate-700">
              <span
                className={`online-dot w-2.5 h-2.5 rounded-full ${
                  isListening
                    ? "bg-red-500 animate-ping"
                    : isProcessing
                    ? "bg-blue-500 animate-pulse"
                    : "bg-emerald-500"
                }`}
              />
              <span>
                {isListening
                  ? "Listening..."
                  : isProcessing
                  ? "Thinking..."
                  : t.ready || "Ready"}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="auto-language flex items-center gap-1.5 text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                <Languages size={13} />
                <span>{language?.label || "English"}</span>
              </span>
              <button
                type="button"
                onClick={() => onNavigate("chat")}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 px-2 py-0.5 rounded hover:bg-blue-50 transition"
                title="Open full conversation view"
              >
                <span>Full Chat</span>
                <ExternalLink size={12} />
              </button>
            </div>
          </div>

          {/* MAIN TWO-COLUMN CONTAINER: Blue Voice Button & Chatbot side-by-side */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
            
            {/* 1. BLUE VOICE BUTTON COLUMN */}
            <div className="md:col-span-4 flex flex-col justify-between items-center p-4 bg-gradient-to-b from-blue-50/70 to-slate-50 rounded-xl border border-blue-100 text-center gap-3">
              <div className="w-full text-center">
                <span className="text-[11px] font-bold tracking-wider text-blue-900 uppercase">
                  Voice Assistant
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {isListening ? "Listening now..." : "Tap mic to speak"}
                </p>
              </div>

              {/* BLUE VOICE BUTTON */}
              <button
                type="button"
                className={`${voiceButtonClass} transition-all duration-300 transform active:scale-95`}
                onClick={handleVoiceClick}
                disabled={isProcessing}
                aria-label={isListening ? "Stop listening" : "Start listening"}
                style={{
                  width: "100%",
                  minHeight: "76px",
                  borderRadius: "14px",
                  background: isListening 
                    ? "linear-gradient(135deg, #dc2626, #ef4444)" 
                    : "linear-gradient(135deg, #0a3e66, #176faa)",
                  boxShadow: isListening
                    ? "0 0 20px rgba(239, 68, 68, 0.45)"
                    : "0 8px 20px rgba(11, 53, 88, 0.22)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "12px",
                  padding: "12px 14px",
                  border: "none",
                  cursor: "pointer",
                  color: "#ffffff"
                }}
              >
                <div 
                  className="dashboard-mic"
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "50%",
                    background: "rgba(255, 255, 255, 0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0
                  }}
                >
                  <Mic size={22} className={isListening ? "animate-pulse text-white" : "text-white"} />
                </div>
                <div className="text-left flex-1 min-w-0">
                  <strong className="block text-xs font-semibold text-white truncate">
                    {voiceTitle}
                  </strong>
                  <small className="block text-[10px] text-blue-100 truncate">
                    {voiceSubtitle}
                  </small>
                </div>
              </button>

              {/* Reset / Info footer */}
              <div className="w-full flex items-center justify-between text-[11px] text-slate-500 pt-1">
                <span>{language?.label || "Hindi / Eng"}</span>
                {chatMessages.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      setChatMessages([
                        {
                          role: "assistant",
                          text: t.hello || "Namaste! Tap the blue voice button or type below to ask about cooperative schemes, loans, and government policies."
                        }
                      ]);
                    }}
                    className="text-slate-400 hover:text-slate-600 flex items-center gap-1 transition"
                    title="Clear chat"
                  >
                    <RotateCcw size={11} />
                    <span>Clear</span>
                  </button>
                )}
              </div>
            </div>

            {/* 2. CHATBOT COLUMN (User Query & AI Response with INTERNAL SCROLL ONLY) */}
            <div className="md:col-span-8 flex flex-col h-full bg-slate-50/70 rounded-xl border border-slate-200 overflow-hidden shadow-inner">
              
              {/* Chatbot Header */}
              <div className="px-3.5 py-2 bg-white border-b border-slate-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                  <Sparkles size={14} className="text-blue-600" />
                  <span>Sanyukt Vaani Chatbot</span>
                </div>
                <span className="text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-medium">
                  Verified Data
                </span>
              </div>

              {/* SCROLLABLE CHAT CONTAINER (Only this scrolls, NOT the website) */}
              <div
                ref={chatScrollRef}
                className="flex-1 p-3 flex flex-col gap-2.5 overflow-y-auto"
                style={{
                  height: "260px",
                  maxHeight: "260px",
                  scrollBehavior: "smooth"
                }}
              >
                {chatMessages.map((msg, index) => {
                  const isUser = msg.role === "user";
                  return (
                    <div
                      key={index}
                      className={`flex gap-2 items-start ${
                        isUser ? "justify-end" : "justify-start"
                      }`}
                    >
                      {!isUser && (
                        <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0 text-[10px] mt-0.5 shadow-sm">
                          <Sparkles size={12} />
                        </div>
                      )}

                      <div
                        className={`text-xs p-3 rounded-2xl max-w-[85%] leading-relaxed ${
                          isUser
                            ? "bg-blue-600 text-white rounded-br-none shadow-sm"
                            : "bg-white text-slate-800 border border-slate-200 rounded-bl-none shadow-sm"
                        }`}
                      >
                        <div className="whitespace-pre-wrap font-normal">
                          {isUser ? msg.text : formatChatbotText(msg.text)}
                        </div>

                        {!isUser && index !== 0 && (
                          <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                            <span className="text-[9px] text-emerald-700 font-medium">✓ Official Answer</span>
                            <button
                              type="button"
                              onClick={() => speakText(msg.text, languageId || language?.id || "hi")}
                              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium transition"
                              title="Listen without asterisks or special characters"
                            >
                              <Volume2 size={12} />
                              <span>Listen</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {isUser && (
                        <div className="w-6 h-6 rounded-full bg-slate-700 text-white flex items-center justify-center flex-shrink-0 text-[10px] mt-0.5 shadow-sm">
                          <User size={12} />
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Live Voice Status Indicator */}
                {isListening && (
                  <div className="flex gap-2 items-center text-xs text-red-600 bg-red-50/80 p-2.5 rounded-xl border border-red-100 w-fit animate-pulse">
                    <Mic size={14} />
                    <span>Listening to your question...</span>
                  </div>
                )}

                {isProcessing && (
                  <div className="flex gap-2 items-center text-xs text-blue-600 bg-blue-50/80 p-2.5 rounded-xl border border-blue-100 w-fit">
                    <Sparkles size={14} className="animate-spin" />
                    <span>Finding verified answer...</span>
                  </div>
                )}
              </div>

              {/* Chatbot Input Bar */}
              <div className="p-2 bg-white border-t border-slate-200 flex items-center gap-2">
                <input
                  type="text"
                  value={question}
                  onChange={handleQuestionChange}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      if (question.trim() && !isProcessing) {
                        handleSendMessage(question);
                      }
                    }
                  }}
                  placeholder={
                    t.placeholder || "Type query here (or tap blue mic to speak)..."
                  }
                  disabled={isListening || isProcessing}
                  className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800"
                />

                <button
                  type="button"
                  onClick={() => {
                    if (question.trim() && !isProcessing) {
                      handleSendMessage(question);
                    }
                  }}
                  disabled={!question.trim() || isListening || isProcessing}
                  className="p-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-lg flex items-center justify-center transition shadow-sm"
                  title="Send Query"
                  aria-label="Send Query"
                >
                  <Send size={13} />
                </button>
              </div>

            </div>

          </div>

          {voiceMessage && (
            <p className="voice-detection-note text-[11px] text-slate-400 italic mt-0">
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