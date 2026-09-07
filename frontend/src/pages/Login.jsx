import React, { useState } from "react";

import {
  ShieldCheck,
  Building2,
  Sparkles,
  Mic,
  Volume2,
  ChevronRight,
  Languages,
  X,
  Headphones,
  MessageCircle,
} from "lucide-react";

const LANGUAGES = [
  {
    id: "mr",
    name: "मराठी",
    short: "मराठी",
    speech: "mr-IN",
    content: {
      eyebrow: "बहुभाषिक सहकारी सहाय्य",
      title: "संयुक्त वाणी",
      tagline: "प्रत्येक भाषेत, योग्य माहिती.",
      badge: "AI सहाय्य उपलब्ध आहे",
      heading1: "शासकीय आणि सहकारी",
      heading2: "माहिती आता",
      headingHighlight: "सहज उपलब्ध",
      description:
        "कर्ज, शासकीय योजना, पीक विमा, PACS सेवा, नियम आणि तक्रार प्रक्रियेबद्दल आपल्या भाषेत विचारा.",
      verified: "सत्यापित माहिती",
      verifiedSub: "अधिकृत स्रोतांमधून उत्तर",
      language: "आपली भाषा निवडा",
      languageSub: "आपल्या सोयीची भाषा निवडा",
      ask: "बोलून विचारा",
      askSub: "मायक्रोफोन दाबून बोला",
      listening: "ऐकत आहोत...",
      listeningSub: "आपला प्रश्न बोला",
      easy: "सर्वांसाठी सोपे",
      easySub: "बोलून विचारा, ऐकून समजून घ्या",
      answer: "उत्तर ऐका",
      answerSub: "आवाजात माहिती मिळवा",
      help: "पहिल्यांदा वापरत आहात? वापरण्याची पद्धत ऐका",
      officer: "अधिकारी लॉगिन",
      officerSub: "Knowledge update & verification",
      security: "सुरक्षित · सत्यापित · स्रोत आधारित",
      ready: "तयार",
    },
  },

  {
    id: "hi",
    name: "हिंदी",
    short: "हिंदी",
    speech: "hi-IN",
    content: {
      eyebrow: "बहुभाषी सहकारी सहायता",
      title: "संयुक्त वाणी",
      tagline: "हर भाषा में, सही जानकारी।",
      badge: "AI सहायता उपलब्ध है",
      heading1: "सरकारी और सहकारी",
      heading2: "जानकारी अब",
      headingHighlight: "आसानी से उपलब्ध",
      description:
        "लोन, सरकारी योजनाएं, फसल बीमा, PACS सेवाएं, नियम और शिकायत प्रक्रिया के बारे में अपनी भाषा में पूछें।",
      verified: "सत्यापित जानकारी",
      verifiedSub: "आधिकारिक स्रोतों से जवाब",
      language: "अपनी भाषा चुनें",
      languageSub: "अपनी सुविधा की भाषा चुनें",
      ask: "बोलकर पूछें",
      askSub: "माइक्रोफोन दबाकर बोलें",
      listening: "सुन रहे हैं...",
      listeningSub: "अपना सवाल बोलिए",
      easy: "सभी के लिए आसान",
      easySub: "बोलकर पूछें, सुनकर समझें",
      answer: "जवाब सुनें",
      answerSub: "आवाज़ में जानकारी पाएं",
      help: "पहली बार हैं? उपयोग करने का तरीका सुनें",
      officer: "अधिकारी लॉगिन",
      officerSub: "Knowledge update & verification",
      security: "सुरक्षित · सत्यापित · स्रोत आधारित",
      ready: "तैयार",
    },
  },

  {
    id: "en",
    name: "English",
    short: "English",
    speech: "en-IN",
    content: {
      eyebrow: "MULTILINGUAL COOPERATIVE ASSISTANCE",
      title: "Sanyukt Vaani",
      tagline: "Right information, in every language.",
      badge: "AI assistance is available",
      heading1: "Government & cooperative",
      heading2: "information is now",
      headingHighlight: "easy to access",
      description:
        "Ask about loans, government schemes, crop insurance, PACS services, rules and grievance procedures in your language.",
      verified: "Verified Information",
      verifiedSub: "Answers from official sources",
      language: "Choose your language",
      languageSub: "Select your preferred language",
      ask: "Ask by Voice",
      askSub: "Press the microphone and speak",
      listening: "Listening...",
      listeningSub: "Please speak your question",
      easy: "Easy for Everyone",
      easySub: "Ask by voice, understand by listening",
      answer: "Listen to Answers",
      answerSub: "Get information through voice",
      help: "First time here? Listen to how it works",
      officer: "Officer Login",
      officerSub: "Knowledge update & verification",
      security: "Secure · Verified · Source-based",
      ready: "Ready",
    },
  },

  {
    id: "gu",
    name: "ગુજરાતી",
    short: "ગુજરાતી",
    speech: "gu-IN",
    content: {
      eyebrow: "બહુભાષી સહકારી સહાય",
      title: "સંયુક્ત વાણી",
      tagline: "દરેક ભાષામાં, સાચી માહિતી.",
      badge: "AI સહાય ઉપલબ્ધ છે",
      heading1: "સરકારી અને સહકારી",
      heading2: "માહિતી હવે",
      headingHighlight: "સરળતાથી ઉપલબ્ધ",
      description:
        "લોન, સરકારી યોજનાઓ, પાક વીમો, PACS સેવાઓ, નિયમો અને ફરિયાદ પ્રક્રિયા વિશે તમારી ભાષામાં પૂછો.",
      verified: "ચકાસાયેલ માહિતી",
      verifiedSub: "સત્તાવાર સ્ત્રોતોમાંથી જવાબ",
      language: "તમારી ભાષા પસંદ કરો",
      languageSub: "તમારી અનુકૂળ ભાષા પસંદ કરો",
      ask: "બોલીને પૂછો",
      askSub: "માઇક્રોફોન દબાવીને બોલો",
      listening: "સાંભળી રહ્યા છીએ...",
      listeningSub: "તમારો પ્રશ્ન બોલો",
      easy: "દરેક માટે સરળ",
      easySub: "બોલીને પૂછો, સાંભળીને સમજો",
      answer: "જવાબ સાંભળો",
      answerSub: "અવાજ દ્વારા માહિતી મેળવો",
      help: "પહેલી વાર છો? ઉપયોગ કરવાની રીત સાંભળો",
      officer: "અધિકારી લૉગિન",
      officerSub: "Knowledge update & verification",
      security: "સુરક્ષિત · ચકાસાયેલ · સ્ત્રોત આધારિત",
      ready: "તૈયાર",
    },
  },

  {
    id: "kn",
    name: "ಕನ್ನಡ",
    short: "ಕನ್ನಡ",
    speech: "kn-IN",
    content: {
      eyebrow: "ಬಹುಭಾಷಾ ಸಹಕಾರಿ ಸಹಾಯ",
      title: "ಸಂಯುಕ್ತ ವಾಣಿ",
      tagline: "ಪ್ರತಿ ಭಾಷೆಯಲ್ಲಿ, ಸರಿಯಾದ ಮಾಹಿತಿ.",
      badge: "AI ಸಹಾಯ ಲಭ್ಯವಿದೆ",
      heading1: "ಸರ್ಕಾರಿ ಮತ್ತು ಸಹಕಾರಿ",
      heading2: "ಮಾಹಿತಿ ಈಗ",
      headingHighlight: "ಸುಲಭವಾಗಿ ಲಭ್ಯ",
      description:
        "ಸಾಲ, ಸರ್ಕಾರಿ ಯೋಜನೆಗಳು, ಬೆಳೆ ವಿಮೆ, PACS ಸೇವೆಗಳು, ನಿಯಮಗಳು ಮತ್ತು ದೂರು ಪ್ರಕ್ರಿಯೆಗಳ ಬಗ್ಗೆ ನಿಮ್ಮ ಭಾಷೆಯಲ್ಲಿ ಕೇಳಿ.",
      verified: "ಪರಿಶೀಲಿಸಿದ ಮಾಹಿತಿ",
      verifiedSub: "ಅಧಿಕೃತ ಮೂಲಗಳಿಂದ ಉತ್ತರ",
      language: "ನಿಮ್ಮ ಭಾಷೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ",
      languageSub: "ನಿಮ್ಮ ಅನುಕೂಲದ ಭಾಷೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ",
      ask: "ಮಾತನಾಡಿ ಕೇಳಿ",
      askSub: "ಮೈಕ್ರೊಫೋನ್ ಒತ್ತಿ ಮಾತನಾಡಿ",
      listening: "ಕೇಳುತ್ತಿದ್ದೇವೆ...",
      listeningSub: "ನಿಮ್ಮ ಪ್ರಶ್ನೆಯನ್ನು ಹೇಳಿ",
      easy: "ಎಲ್ಲರಿಗೂ ಸುಲಭ",
      easySub: "ಮಾತನಾಡಿ ಕೇಳಿ, ಕೇಳಿ ಅರ್ಥಮಾಡಿಕೊಳ್ಳಿ",
      answer: "ಉತ್ತರವನ್ನು ಕೇಳಿ",
      answerSub: "ಧ್ವನಿಯ ಮೂಲಕ ಮಾಹಿತಿ ಪಡೆಯಿರಿ",
      help: "ಮೊದಲ ಬಾರಿಗೆ? ಬಳಸುವ ವಿಧಾನವನ್ನು ಕೇಳಿ",
      officer: "ಅಧಿಕಾರಿ ಲಾಗಿನ್",
      officerSub: "Knowledge update & verification",
      security: "ಸುರಕ್ಷಿತ · ಪರಿಶೀಲಿಸಿದ · ಮೂಲ ಆಧಾರಿತ",
      ready: "ಸಿದ್ಧ",
    },
  },

  {
    id: "sa",
    name: "संस्कृतम्",
    short: "संस्कृतम्",
    speech: "sa-IN",
    content: {
      eyebrow: "बहुभाषिक सहकारी सहायता",
      title: "संयुक्त वाणी",
      tagline: "सर्वासु भाषासु, सम्यक् सूचना।",
      badge: "AI सहायता उपलब्धा अस्ति",
      heading1: "शासकीय तथा सहकारी",
      heading2: "सूचना अधुना",
      headingHighlight: "सरलतया उपलब्धा",
      description:
        "ऋणं, शासकीय योजनाः, पीकविमा, PACS सेवाः, नियमाः तथा शिकायतप्रक्रिया विषये स्वभाषया पृच्छन्तु।",
      verified: "सत्यापिता सूचना",
      verifiedSub: "अधिकृतस्रोतेभ्यः उत्तरम्",
      language: "स्वभाषां चिनुत",
      languageSub: "स्वस्य सुविधानुसारं भाषां चिनुत",
      ask: "वाचा पृच्छतु",
      askSub: "सूक्ष्मध्वनियन्त्रं नुत्वा वदतु",
      listening: "शृण्वन्तः स्मः...",
      listeningSub: "स्वप्रश्नं वदतु",
      easy: "सर्वेभ्यः सरलम्",
      easySub: "वाचा पृच्छतु, श्रुत्वा अवगच्छतु",
      answer: "उत्तरं शृणुत",
      answerSub: "ध्वनिद्वारा सूचनां प्राप्नुत",
      help: "प्रथमवारम्? उपयोगविधिं शृणुत",
      officer: "अधिकारी प्रवेशः",
      officerSub: "Knowledge update & verification",
      security: "सुरक्षित · सत्यापित · स्रोत आधारित",
      ready: "सज्जम्",
    },
  },
];

function Login({ onLogin }) {
  const [selectedLanguage, setSelectedLanguage] = useState("hi");
  const [showLanguages, setShowLanguages] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const language =
    LANGUAGES.find((item) => item.id === selectedLanguage) ||
    LANGUAGES[1];

  const t = language.content;

  const handleLanguageChange = (id) => {
    setSelectedLanguage(id);
    setShowLanguages(false);
  };

  const handleVoiceStart = () => {
    setIsListening(true);

    // DEMO ONLY
    // Later connect this to actual microphone + STT + backend.
    setTimeout(() => {
      setIsListening(false);
      onLogin("citizen");
    }, 900);
  };

  const handleHelp = () => {
    setShowHelp(true);

    if ("speechSynthesis" in window) {
      const helpMessages = {
        mr: "संयुक्त वाणी मध्ये स्वागत आहे। बोलून विचारा बटण दाबा आणि आपला प्रश्न विचारा. आपली भाषा आपोआप ओळखली जाईल.",
        hi: "संयुक्त वाणी में आपका स्वागत है। बोलकर पूछें बटन दबाएं और अपना सवाल बोलें। आपकी भाषा अपने आप पहचानी जाएगी।",
        en: "Welcome to Sanyukt Vaani. Press Ask by Voice and speak your question. Your language will be detected automatically.",
        gu: "સંયુક્ત વાણીમાં આપનું સ્વાગત છે. બોલીને પૂછો બટન દબાવો અને તમારો પ્રશ્ન પૂછો. તમારી ભાષા આપમેળે ઓળખવામાં આવશે.",
        kn: "ಸಂಯುಕ್ತ ವಾಣಿಗೆ ಸ್ವಾಗತ. ಮಾತನಾಡಿ ಕೇಳಿ ಬಟನ್ ಒತ್ತಿ ನಿಮ್ಮ ಪ್ರಶ್ನೆಯನ್ನು ಕೇಳಿ. ನಿಮ್ಮ ಭಾಷೆಯನ್ನು ಸ್ವಯಂಚಾಲಿತವಾಗಿ ಗುರುತಿಸಲಾಗುತ್ತದೆ.",
        sa: "संयुक्तवाण्याम् स्वागतम्। वाचा पृच्छतु इति बटन् नुत्वा स्वप्रश्नं वदतु। भवतः भाषा स्वयमेव ज्ञास्यते।",
      };

      const speech = new SpeechSynthesisUtterance(
        helpMessages[selectedLanguage]
      );

      speech.lang = language.speech;
      speech.rate = 0.85;

      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(speech);
    }
  };

  const closeHelp = () => {
    setShowHelp(false);

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  };

  return (
    <div className="login-page">
      <div className="login-glow glow-one" />
      <div className="login-glow glow-two" />

      <div className="login-container">

        {/* LEFT SIDE */}
        <section className="login-left">

          <div className="login-brand">

            <div className="brand-mark large">
              <Sparkles size={28} />
            </div>

            <div>
              <div className="eyebrow">
                {t.eyebrow}
              </div>

              <h1>
                {t.title} <span>AI</span>
              </h1>

              <p>
                {t.tagline}
              </p>
            </div>

          </div>

          <div className="login-introduction">

            <div className="welcome-badge">
              <span className="status-dot" />
              {t.badge}
            </div>

            <h2>
              {t.heading1}
              <br />
              {t.heading2}{" "}
              <span>{t.headingHighlight}</span>
            </h2>

            <p>
              {t.description}
            </p>

          </div>

          <div className="login-highlights">

            <div className="highlight-item">

              <div className="highlight-icon">
                <ShieldCheck size={19} />
              </div>

              <div>
                <strong>{t.verified}</strong>
                <span>{t.verifiedSub}</span>
              </div>

            </div>

            <div className="highlight-item">

              <div className="highlight-icon">
                <Languages size={19} />
              </div>

              <div>
                <strong>{t.language}</strong>
                <span>{t.languageSub}</span>
              </div>

            </div>

          </div>

          <div className="login-trust">

            <ShieldCheck size={17} />

            <span>
              {t.security}
            </span>

          </div>

        </section>

        {/* RIGHT SIDE */}
        <section className="login-right">

          <div className="voice-card">

            {/* LANGUAGE TOGGLE */}
            <div className="language-selector">

              <div className="language-selector-label">
                <Languages size={17} />
                <span>{t.language}</span>
              </div>

              <button
                className="language-toggle-button"
                onClick={() =>
                  setShowLanguages(!showLanguages)
                }
              >
                <span>{language.short}</span>
                <ChevronRight
                  size={17}
                  className={
                    showLanguages ? "rotate-arrow" : ""
                  }
                />
              </button>

              {showLanguages && (
                <div className="language-dropdown">

                  {LANGUAGES.map((item) => (
                    <button
                      key={item.id}
                      className={`language-option ${
                        selectedLanguage === item.id
                          ? "selected"
                          : ""
                      }`}
                      onClick={() =>
                        handleLanguageChange(item.id)
                      }
                    >

                      <span className="language-name">
                        {item.name}
                      </span>

                      {selectedLanguage === item.id && (
                        <ShieldCheck size={16} />
                      )}

                    </button>
                  ))}

                </div>
              )}

            </div>

            <div className="voice-card-header">

              <div>
                <span className="small-label">
                  QUICK ACCESS
                </span>

                <h3>
                  {t.ask}
                </h3>
              </div>

              <div className="voice-status">
                <span />
                {t.ready}
              </div>

            </div>

            {/* BIG VOICE BUTTON */}
            <button
              className={`big-voice-button ${
                isListening ? "active" : ""
              }`}
              onClick={handleVoiceStart}
              aria-label={t.ask}
            >

              <div className="voice-ring">

                {isListening ? (
                  <div className="voice-animation">
                    <span />
                    <span />
                    <span />
                    <span />
                    <span />
                  </div>
                ) : (
                  <Mic
                    size={48}
                    strokeWidth={1.8}
                  />
                )}

              </div>

              <div className="voice-main-text">

                <strong>
                  {isListening
                    ? t.listening
                    : t.ask}
                </strong>

                <span>
                  {isListening
                    ? t.listeningSub
                    : t.askSub}
                </span>

              </div>

              <div className="voice-arrow">
                <ChevronRight size={21} />
              </div>

            </button>

            {/* AUTO LANGUAGE */}
            <div className="language-info">

              <div className="language-info-icon">
                <Languages size={18} />
              </div>

              <div>
                <strong>
                  {t.language}
                </strong>

                <span>
                  Auto Detect · {language.name}
                </span>
              </div>

              <ShieldCheck
                size={18}
                className="verified-icon"
              />

            </div>

            {/* ACCESSIBILITY */}
            <div className="accessibility-row">

              <div className="accessibility-card">

                <div className="access-icon">
                  <Volume2 size={20} />
                </div>

                <div>
                  <strong>
                    {t.easy}
                  </strong>

                  <span>
                    {t.easySub}
                  </span>
                </div>

              </div>

              <div className="accessibility-card">

                <div className="access-icon">
                  <Volume2 size={20} />
                </div>

                <div>
                  <strong>
                    {t.answer}
                  </strong>

                  <span>
                    {t.answerSub}
                  </span>
                </div>

              </div>

            </div>

            {/* HELP */}
            <button
              className="listen-help"
              onClick={handleHelp}
            >

              <Headphones size={17} />

              <span>
                {t.help}
              </span>

              <ChevronRight size={16} />

            </button>

            {/* OFFICER */}
            <div className="login-divider">
              <span />
              <p>{t.officer}</p>
              <span />
            </div>

            <button
              className="officer-button"
              onClick={() => onLogin("officer")}
            >

              <div className="officer-button-icon">
                <Building2 size={20} />
              </div>

              <div className="officer-button-content">

                <strong>
                  {t.officer}
                </strong>

                <span>
                  {t.officerSub}
                </span>

              </div>

              <ChevronRight size={19} />

            </button>

            <div className="security-footer">

              <ShieldCheck size={14} />

              <span>
                {t.security}
              </span>

            </div>

          </div>

        </section>

      </div>

      {/* HELP MODAL */}
      {showHelp && (
        <div className="help-overlay">

          <div className="help-modal">

            <button
              className="help-close"
              onClick={closeHelp}
              aria-label="Close"
            >
              <X size={20} />
            </button>

            <div className="help-modal-icon">
              <Volume2 size={28} />
            </div>

            <span className="small-label">
              {t.easy}
            </span>

            <h2>
              {t.title}
            </h2>

            <p className="help-description">
              {t.help}
            </p>

            <div className="help-steps">

              <div className="help-step">

                <div className="step-number">
                  1
                </div>

                <div>
                  <strong>
                    {t.ask}
                  </strong>

                  <p>
                    {t.askSub}
                  </p>
                </div>

              </div>

              <div className="help-step">

                <div className="step-number">
                  2
                </div>

                <div>
                  <strong>
                    {t.language}
                  </strong>

                  <p>
                    Auto Detect
                  </p>
                </div>

              </div>

              <div className="help-step">

                <div className="step-number">
                  3
                </div>

                <div>
                  <strong>
                    {t.answer}
                  </strong>

                  <p>
                    {t.answerSub}
                  </p>
                </div>

              </div>

            </div>

            <button
              className="primary-btn full"
              onClick={closeHelp}
            >
              <MessageCircle size={17} />
              {t.ask}
            </button>

          </div>

        </div>
      )}

    </div>
  );
}

export default Login;