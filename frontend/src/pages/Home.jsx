import {
  Mic,
  Send,
  Languages,
  ShieldCheck,
  Sparkles,
  ChevronRight
} from "lucide-react";
import { useState } from "react";
import { useLanguage } from "../context/LanguageContext";

function Home({
  onNavigate
}) {

  const { t, language, transcript, isListening, voiceMessage, detectFromSpeech } = useLanguage();
  const [question, setQuestion] = useState("");

  const openChat = () => {
    if (question.trim() || transcript) onNavigate("chat");
  };

  return (
    <>
      <section className="citizen-welcome">
        <div className="welcome-copy">
          <div className="eyebrow">{t.brandEyebrow}</div>
          <h2>{t.welcome}</h2>
          <p>{t.welcomeText}</p>
          <div className="welcome-hello"><Sparkles size={16} /> {t.hello}</div>
        </div>
        <div className="welcome-orb"><Sparkles size={28} /></div>
      </section>

      <section className="ask-card">
        <div className="ask-head">
          <span className="online-dot" />
          {t.ready}
          <span className="auto-language"><Languages size={14} /> {t.auto}</span>
        </div>

        <button className={`dashboard-voice ${isListening ? "listening" : ""}`} onClick={detectFromSpeech}>
          <span className="dashboard-mic"><Mic size={24} /></span>
          <span><strong>{isListening ? t.detecting : t.speak}</strong><small>{t.speakSub}</small></span>
          <span className="voice-language-chip">{language.label}</span>
        </button>

        <label className="ask-input-label">{t.type}</label>
        <div className="ask-input">
          <input value={question || transcript} onChange={(event) => setQuestion(event.target.value)} placeholder={t.placeholder} />
          <button className="send-btn" onClick={openChat} aria-label={t.ask}><Send size={18} /></button>
        </div>
        {voiceMessage && <p className="voice-detection-note">{voiceMessage}</p>}
      </section>

      <div className="section-title">
        <div><h3>{t.explore}</h3><p>{t.exploreSub}</p></div>
        <button className="text-btn" onClick={() => onNavigate("sources")}>{t.viewAll}<ChevronRight size={15} /></button>
      </div>

      <div className="info-grid">
        <InfoCard icon="🏦" title={t.loans} text={t.loansText} onClick={() => onNavigate("chat")} />
        <InfoCard icon="🌾" title={t.insurance} text={t.insuranceText} onClick={() => onNavigate("chat")} />
        <InfoCard icon="🏛️" title={t.schemes} text={t.schemesText} onClick={() => onNavigate("chat")} />
        <InfoCard icon="⚖️" title={t.grievance} text={t.grievanceText} onClick={() => onNavigate("chat")} />
      </div>

      <div className="trust-strip">
        <ShieldCheck size={22} />
        <div><strong>{t.trust}</strong><span>{t.trustText}</span></div>
        <div className="trust-stat"><strong>128</strong><span>{t.sourcesCount}</span></div>
        <div className="trust-stat"><strong>08</strong><span>{t.languages}</span></div>
      </div>
    </>
  );
}


function InfoCard({ icon, title, text, onClick }) {
  return <button className="info-card" onClick={onClick}><div className="info-icon">{icon}</div><div><strong>{title}</strong><span>{text}</span></div><ChevronRight size={17} /></button>;
}

export default Home;