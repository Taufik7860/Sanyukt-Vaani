import React, { useEffect, useState } from "react";
import { useLanguage } from "../context/LanguageContext";
import { officerLogin } from "../services/api";

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
  LockKeyhole,
  Mail,
  Eye,
  EyeOff,
  User,
  Bot,
  Send
} from "lucide-react";

const LANGUAGES = [
  {
    id: "mr",
    name: "मराठी",
    short: "मराठी",
    speech: "mr-IN",
    content: {
      eyebrow: "बहुभाषिक सहकारी सहाय्य",
      title: "Sanyukt Vaani AI",
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
      auto: "स्वचालित ओळख",
      detected: "ओळखलेली भाषा",
      hello: "आपला प्रश्न विचारण्यासाठी मायक्रोफोन दाबा",
    },
  },

  {
    id: "hi",
    name: "हिंदी",
    short: "हिंदी",
    speech: "hi-IN",
    content: {
      eyebrow: "बहुभाषी सहकारी सहायता",
      title: "Sanyukt Vaani AI",
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
      auto: "स्वचालित पहचान",
      detected: "पहचानी गई भाषा",
      hello: "अपना सवाल पूछने के लिए माइक्रोफोन दबाएं",
    },
  },

  {
    id: "en",
    name: "English",
    short: "English",
    speech: "en-IN",
    content: {
      eyebrow: "MULTILINGUAL COOPERATIVE ASSISTANCE",
      title: "Sanyukt Vaani AI",
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
      auto: "Auto Detect",
      detected: "Detected Language",
      hello: "Press the microphone button to ask your question",
    },
  },

  {
    id: "gu",
    name: "ગુજરાતી",
    short: "ગુજરાતી",
    speech: "gu-IN",
    content: {
      eyebrow: "બહુભાષી સહકારી સહાય",
      title: "Sanyukt Vaani AI",
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
      auto: "સ્વચાલિત ઓળખ",
      detected: "ઓળખાયેલ ભાષા",
      hello: "તમારો પ્રશ્ન પૂછવા માટે માઇક્રોફોન દબાવો",
    },
  },

  {
    id: "kn",
    name: "ಕನ್ನಡ",
    short: "ಕನ್ನಡ",
    speech: "kn-IN",
    content: {
      eyebrow: "ಬಹುಭಾಷಾ ಸಹಕಾರಿ ಸಹಾಯ",
      title: "Sanyukt Vaani AI",
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
      auto: "ಸ್ವಯಂಚಾಲಿತ ಪತ್ತೆ",
      detected: "ಗುರುತಿಸಲಾದ ಭಾಷೆ",
      hello: "ನಿಮ್ಮ ಪ್ರಶ್ನೆಯನ್ನು ಕೇಳಲು ಮೈಕ್ರೊಫೋನ್ ಒತ್ತಿ",
    },
  },

  {
    id: "sa",
    name: "संस्कृतम्",
    short: "संस्कृतम्",
    speech: "sa-IN",
    content: {
      eyebrow: "बहुभाषिक सहकारी सहायता",
      title: "Sanyukt Vaani AI",
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
      auto: "स्वयमेव अभिज्ञानम्",
      detected: "अभिज्ञाता भाषा",
      hello: "स्वप्रश्नं प्रष्टुं सूक्ष्मध्वनियन्त्रं नुदतु",
    },
  },
];

function Login({ onLogin }) {
  const {
    languageId: detectedLanguageId,
    detectFromSpeech,
    isListening: contextListening,
    isAutoRotating,
    transcript,
    setTranscript,
    voiceMessage,
  } = useLanguage();

  const [showHelp, setShowHelp] = useState(false);
  const [showOfficerLogin, setShowOfficerLogin] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [officerEmail, setOfficerEmail] = useState("");
  const [officerPassword, setOfficerPassword] = useState("");
  const [officerError, setOfficerError] = useState("");
  const [officerSubmitting, setOfficerSubmitting] = useState(false);
  
  const [isListening, setIsListening] = useState(false);
  const [voiceStarted, setVoiceStarted] = useState(false);

  const [aiAnswer, setAiAnswer] = useState("");
  const [isLoadingAnswer, setIsLoadingAnswer] = useState(false);
  const [editableTranscript, setEditableTranscript] = useState("");

  const language =
    LANGUAGES.find((item) => item.id === detectedLanguageId) || LANGUAGES[1];

  const t = language.content;

  useEffect(() => {
    if (transcript) {
      setEditableTranscript(transcript);
    }
  }, [transcript]);

  useEffect(() => {
    if (voiceStarted && !contextListening && editableTranscript) {
      handleFetchAnswer(editableTranscript);
      setVoiceStarted(false);
    }
  }, [contextListening, editableTranscript, voiceStarted]);

  const handleVoiceStart = () => {
    setAiAnswer("");
    const started = detectFromSpeech();
    setVoiceStarted(started);
    setIsListening(started || contextListening);
  };

  const handleFetchAnswer = async (queryText) => {
    if (!queryText.trim()) return;

    setIsLoadingAnswer(true);
    setAiAnswer("");

    try {
      const res = await fetch("http://127.0.0.1:8000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: queryText,
          language: detectedLanguageId,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to reach server");
      }

      const data = await res.json();
      setAiAnswer(data.answer || "No response text received.");

      if ("speechSynthesis" in window && data.answer) {
        window.speechSynthesis.cancel();
        const speech = new SpeechSynthesisUtterance(data.answer);
        speech.lang = language.speech;
        window.speechSynthesis.speak(speech);
      }
    } catch (err) {
      setAiAnswer("An error occurred connecting to the AI: " + err.message);
    } finally {
      setIsLoadingAnswer(false);
    }
  };

  const handleHelp = () => {
    setShowHelp(true);

    if ("speechSynthesis" in window) {
      const helpMessages = {
        mr: "Sanyukt Vaani AI मध्ये स्वागत आहे. बोलून विचारा बटण दाबा आणि आपला प्रश्न विचारा. तुमची भाषा आपोआप ओळखली जाईल.",
        hi: "Sanyukt Vaani AI में आपका स्वागत है। बोलकर पूछें बटन दबाएं और अपना सवाल बोलें। आपकी भाषा अपने आप पहचानी जाएगी।",
        en: "Welcome to Sanyukt Vaani AI. Press Ask by Voice and speak your question. The website will use your language.",
        gu: "Sanyukt Vaani AI માં આપનું સ્વાગત છે. બોલીને પૂછો બટન દબાવો અને તમારો પ્રશ્ન બોલો. વેબસાઇટ તમારી ભાષામાં ચાલશે.",
        kn: "Sanyukt Vaani AI ಗೆ ಸ್ವಾಗತ. ಮಾತನಾಡಿ ಕೇಳಿ ಬಟನ್ ಒತ್ತಿ ನಿಮ್ಮ ಪ್ರಶ್ನೆಯನ್ನು ಹೇಳಿ. ವೆಬ್‌ಸೈಟ್ ನಿಮ್ಮ ಭಾಷೆಯಲ್ಲಿ ನಡೆಯುತ್ತದೆ.",
        sa: "Sanyukt Vaani AI मध्ये स्वागतम्। वाचा पृच्छतु इति बटन् नुत्वा प्रश्नं वदतु। जालपुटं भवतः भाषायां भविष्यति.",
      };

      let hasSpoken = false;
      let fallbackTimer;
      const speakHelp = () => {
        if (hasSpoken) return;
        const voices = window.speechSynthesis.getVoices();
        if (!voices.length) return;

        const message = helpMessages[detectedLanguageId] || helpMessages.en;
        const speech = new SpeechSynthesisUtterance(message);
        const voiceLanguage = language.speech.toLowerCase().slice(0, 2);
        const matchingVoices = voices.filter((voice) =>
          voice.lang.toLowerCase().startsWith(voiceLanguage)
        );

        const preferredVoice = matchingVoices
          .map((voice) => ({
            voice,
            score:
              (voice.lang.toLowerCase() === language.speech.toLowerCase() ? 20 : 0) +
              (/india|indian|google|microsoft|madhur|swara|heera|ravi|veena|lekha|neerja|prabhat|aditi|raveena|sangeeta/i.test(voice.name) ? 10 : 0) +
              (voice.localService ? 2 : 0),
          }))
          .sort((first, second) => second.score - first.score)[0]?.voice;

        const isCorrectLanguageAvailable = Boolean(preferredVoice);
        if (!isCorrectLanguageAvailable && detectedLanguageId !== "en" && !fallbackTimer) {
          fallbackTimer = window.setTimeout(speakHelp, 1200);
          return;
        }

        hasSpoken = true;

        speech.lang = language.speech;
        speech.rate = 0.95;
        speech.pitch = 1;
        speech.volume = 1;
        speech.voice = preferredVoice || null;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(speech);
      };

      if (window.speechSynthesis.getVoices().length) {
        speakHelp();
      } else {
        window.speechSynthesis.addEventListener("voiceschanged", speakHelp, { once: true });
        fallbackTimer = window.setTimeout(speakHelp, 1200);
      }
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
              <div className="eyebrow">{t.eyebrow}</div>

              <h1>
                Sanyukt Vaani <span>AI</span>
              </h1>

              <p>{t.tagline}</p>
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
              {t.heading2} <span>{t.headingHighlight}</span>
            </h2>

            <p>{t.description}</p>
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
            <span>{t.security}</span>
          </div>
        </section>

        {/* RIGHT SIDE */}
        <section className="login-right">
          <div className="voice-card">
            <div className="detected-language-banner">
              <Languages size={17} />
              <span>{isAutoRotating ? t.auto : t.detected}</span>
              <strong>{language.name}</strong>
              <small>{isAutoRotating ? "10 sec" : "Locked"}</small>
            </div>

            <div className="voice-card-header">
              <div>
                <span className="small-label">QUICK ACCESS</span>
                <h3>{t.ask}</h3>
              </div>

              <div className="voice-status">
                <span />
                {t.ready}
              </div>
            </div>

            {/* BIG VOICE BUTTON */}
            <button
              type="button"
              className={`big-voice-button ${isListening ? "active" : ""}`}
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
                  <Mic size={48} strokeWidth={1.8} />
                )}
              </div>

              <div className="voice-main-text">
                <strong>{isListening ? t.listening : t.ask}</strong>
                <span>{isListening ? t.listeningSub : t.askSub}</span>
              </div>

              <div className="voice-arrow">
                <ChevronRight size={21} />
              </div>
            </button>
            
            <p className="voice-detection-note" style={{ marginTop: '10px' }}>
              {voiceMessage || t.hello}
            </p>

            {/* CHAT / TEXT INTERFACE */}
            {(editableTranscript || isListening || aiAnswer) && (
              <div style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                
                {/* User Input Textbox */}
                <div style={{ background: 'rgba(0,0,0,0.03)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.1)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600', color: '#64748b', marginBottom: '8px' }}>
                    <User size={14} /> Your Query
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      value={editableTranscript}
                      onChange={(e) => setEditableTranscript(e.target.value)}
                      placeholder="Your voice will appear here..."
                      style={{
                        flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px'
                      }}
                    />
                    <button
                      onClick={() => handleFetchAnswer(editableTranscript)}
                      disabled={isLoadingAnswer || !editableTranscript}
                      style={{
                        padding: '0 16px', borderRadius: '6px', background: '#2563eb', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                      }}
                    >
                      <Send size={14} />
                      {isLoadingAnswer ? "..." : "Send"}
                    </button>
                  </div>
                </div>

                {/* AI Answer Textbox */}
                {(isLoadingAnswer || aiAnswer) && (
                  <div style={{ background: '#f0fdf4', padding: '12px', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600', color: '#166534', marginBottom: '6px' }}>
                      <Bot size={14} /> AI Response
                    </div>
                    <p style={{ margin: 0, color: '#15803d', fontSize: '14.5px', lineHeight: '1.5' }}>
                      {isLoadingAnswer ? "Generating response..." : aiAnswer}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ACCESSIBILITY */}
            <div className="accessibility-row" style={{ marginTop: '20px' }}>
              <div className="accessibility-card">
                <div className="access-icon">
                  <Volume2 size={20} />
                </div>

                <div>
                  <strong>{t.easy}</strong>
                  <span>{t.easySub}</span>
                </div>
              </div>

              <div className="accessibility-card">
                <div className="access-icon">
                  <Volume2 size={20} />
                </div>

                <div>
                  <strong>{t.answer}</strong>
                  <span>{t.answerSub}</span>
                </div>
              </div>
            </div>

            {/* HELP */}
            <button
              type="button"
              className="listen-help"
              onClick={handleHelp}
            >
              <Headphones size={17} />
              <span>{t.help}</span>
              <ChevronRight size={16} />
            </button>

            {/* OFFICER */}
            <div className="login-divider">
              <span />
              <p>{t.officer}</p>
              <span />
            </div>

            <button
              type="button"
              className="officer-button"
              onClick={() => setShowOfficerLogin(true)}
            >
              <div className="officer-button-icon">
                <Building2 size={20} />
              </div>

              <div className="officer-button-content">
                <strong>{t.officer}</strong>
                <span>{t.officerSub}</span>
              </div>

              <ChevronRight size={19} />
            </button>

            <div className="security-footer">
              <ShieldCheck size={14} />
              <span>{t.security}</span>
            </div>
          </div>
        </section>
      </div>

      {/* HELP MODAL */}
      {showHelp && (
        <div className="help-overlay">
          <div className="help-modal">
            <button
              type="button"
              className="help-close"
              onClick={closeHelp}
              aria-label="Close"
            >
              <X size={20} />
            </button>

            <div className="help-modal-icon">
              <Volume2 size={28} />
            </div>

            <span className="small-label">{t.easy}</span>
            <h2>{t.title}</h2>
            <p className="help-description">{t.help}</p>

            <div className="help-steps">
              <div className="help-step">
                <div className="step-number">1</div>
                <div>
                  <strong>{t.ask}</strong>
                  <p>{t.askSub}</p>
                </div>
              </div>

              <div className="help-step">
                <div className="step-number">2</div>
                <div>
                  <strong>{t.language}</strong>
                  <p>{t.auto}</p>
                </div>
              </div>

              <div className="help-step">
                <div className="step-number">3</div>
                <div>
                  <strong>{t.answer}</strong>
                  <p>{t.answerSub}</p>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="primary-btn full"
              onClick={closeHelp}
            >
              <MessageCircle size={17} />
              {t.ask}
            </button>
          </div>
        </div>
      )}

      {/* OFFICER LOGIN MODAL */}
      {showOfficerLogin && (
        <div className="help-overlay" onMouseDown={() => setShowOfficerLogin(false)}>
          <div className="officer-login-modal" onMouseDown={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="help-close"
              onClick={() => setShowOfficerLogin(false)}
              aria-label="Close officer login"
            >
              <X size={20} />
            </button>

            <div className="officer-login-icon">
              <Building2 size={25} />
            </div>

            <span className="small-label">{t.officer}</span>
            <h2>{t.officer}</h2>
            <p className="help-description">{t.officerSub}</p>

            <form
              className="officer-login-form"
              onSubmit={(event) => {
                event.preventDefault();
                setOfficerError("");
                setOfficerSubmitting(true);
                officerLogin(officerEmail, officerPassword)
                  .then(() => onLogin("officer"))
                  .catch((error) => setOfficerError(error.message))
                  .finally(() => setOfficerSubmitting(false));
              }}
            >
              <label>
                <span><Mail size={14} /> Official email</span>
                <input
                  type="email"
                  value={officerEmail}
                  onChange={(event) => setOfficerEmail(event.target.value)}
                  placeholder="officer@department.gov.in"
                  autoComplete="username"
                  required
                />
              </label>

              <label>
                <span><LockKeyhole size={14} /> Password</span>
                <div className="password-field">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={officerPassword}
                    onChange={(event) => setOfficerPassword(event.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </label>

              <div className="officer-login-options">
                <label className="remember-option">
                  <input type="checkbox" />
                  <span>Remember me</span>
                </label>
                <button type="button" className="forgot-link">Forgot password?</button>
              </div>

              <button className="primary-btn full" type="submit" disabled={officerSubmitting}>
                <LockKeyhole size={16} />
                {officerSubmitting ? "Signing in..." : "Sign in securely"}
              </button>
              {officerError && <p className="officer-login-error">{officerError}</p>}
            </form>

            <div className="officer-login-trust">
              <ShieldCheck size={15} />
              Authorized access · Verified knowledge management
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Login;