import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export const LANGUAGES = [
  { id: "hi", label: "हिंदी", speech: "hi-IN", script: /[\u0900-\u097F]/ },
  { id: "mr", label: "मराठी", speech: "mr-IN", script: /[\u0900-\u097F]/ },
  { id: "gu", label: "ગુજરાતી", speech: "gu-IN", script: /[\u0A80-\u0AFF]/ },
  { id: "kn", label: "ಕನ್ನಡ", speech: "kn-IN", script: /[\u0C80-\u0CFF]/ },
  { id: "sa", label: "संस्कृतम्", speech: "sa-IN", script: /[\u0900-\u097F]/ },
  { id: "en", label: "English", speech: "en-IN", script: /^[\x00-\x7F]*$/ },
];

const AUTO_ROTATION_LANGUAGE_IDS = ["hi", "en", "mr"];

const copy = {
  en: {
    brandEyebrow: "MULTILINGUAL COOPERATIVE ASSISTANCE",
    tagline: "Right information, in every language.",
    dashboard: "Dashboard",
    ask: "Ask Sanyukt Vaani AI",
    sources: "Official Sources",
    profile: "Profile & Settings",
    citizen: "Citizen Portal",
    officer: "Officer Portal",
    mainMenu: "MAIN MENU",
    trusted: "Trusted Information",
    trustedText: "Answers grounded in verified official sources.",
    logout: "Switch / Logout",
    searchCitizen: "Search schemes, loans, services...",
    searchOfficer: "Search documents, policies, updates...",
    hello: "Hello! Speak naturally and I will detect your language.",
    welcome: "Government and cooperative information, made simple.",
    welcomeText: "Ask about loans, schemes, crop insurance, PACS services, rules and grievance procedures in your own language.",
    ready: "AI assistance is ready",
    auto: "Auto language detection",
    speak: "Speak to ask",
    speakSub: "Tap the microphone and say Hello",
    type: "Or type your question",
    placeholder: "Say Hello or ask in your language...",
    detecting: "Listening and detecting your language...",
    detected: "Detected language",
    verified: "Verified Information",
    verifiedSub: "Answers from official sources",
    explore: "Explore verified information",
    exploreSub: "Powered by approved official documents",
    viewAll: "View all",
    loans: "PACS Loans",
    loansText: "Eligibility, documents and application process",
    insurance: "Crop Insurance",
    insuranceText: "Coverage, deadlines and claim process",
    schemes: "Government Schemes",
    schemesText: "Benefits, eligibility and documents",
    grievance: "Rules & Grievances",
    grievanceText: "Procedures and complaint guidance",
    trust: "Why trust Sanyukt Vaani AI?",
    trustText: "Answers are grounded in approved official documents.",
    languages: "languages",
    voiceDetected: "Your voice changed the website language automatically.",
  },
  hi: {
    brandEyebrow: "बहुभाषी सहकारी सहायता",
    tagline: "हर भाषा में, सही जानकारी।",
    dashboard: "डैशबोर्ड",
    ask: "Sanyukt Vaani AI से पूछें",
    sources: "आधिकारिक स्रोत",
    history: "बातचीत का इतिहास",
    profile: "प्रोफ़ाइल और सेटिंग्स",
    citizen: "नागरिक पोर्टल",
    officer: "अधिकारी पोर्टल",
    mainMenu: "मुख्य मेनू",
    trusted: "विश्वसनीय जानकारी",
    trustedText: "सत्यापित आधिकारिक स्रोतों से उत्तर।",
    logout: "बदलें / लॉगआउट",
    searchCitizen: "योजनाएं, ऋण, सेवाएं खोजें...",
    searchOfficer: "दस्तावेज़, नीतियां, अपडेट खोजें...",
    hello: "नमस्ते! बोलिए, मैं आपकी भाषा पहचान लूंगा।",
    welcome: "सरकारी और सहकारी जानकारी अब आसान है।",
    welcomeText: "ऋण, योजनाओं, फसल बीमा, PACS सेवाओं, नियमों और शिकायत प्रक्रिया के बारे में अपनी भाषा में पूछें।",
    ready: "AI सहायता उपलब्ध है",
    auto: "भाषा अपने आप पहचानी जाएगी",
    speak: "बोलकर पूछें",
    speakSub: "माइक्रोफोन दबाकर नमस्ते बोलें",
    type: "या अपना सवाल लिखें",
    placeholder: "नमस्ते बोलें या अपनी भाषा में पूछें...",
    detecting: "सुन रहे हैं और भाषा पहचान रहे हैं...",
    detected: "पहचानी गई भाषा",
    verified: "सत्यापित जानकारी",
    verifiedSub: "आधिकारिक स्रोतों से जवाब",
    explore: "सत्यापित जानकारी देखें",
    exploreSub: "स्वीकृत आधिकारिक दस्तावेज़ों से",
    viewAll: "सभी देखें",
    loans: "PACS ऋण",
    loansText: "पात्रता, दस्तावेज़ और आवेदन प्रक्रिया",
    insurance: "फसल बीमा",
    insuranceText: "कवरेज, अंतिम तिथि और दावा प्रक्रिया",
    schemes: "सरकारी योजनाएं",
    schemesText: "लाभ, पात्रता और दस्तावेज़",
    grievance: "नियम और शिकायत",
    grievanceText: "प्रक्रिया और शिकायत मार्गदर्शन",
    trust: "Sanyukt Vaani AI पर भरोसा क्यों करें?",
    sourcesCount: "सत्यापित स्रोत",
    languages: "भाषाएं",
    voiceDetected: "आपकी आवाज़ से वेबसाइट की भाषा अपने आप बदल गई।",
  },
  mr: {
    brandEyebrow: "बहुभाषिक सहकारी सहाय्य",
    tagline: "प्रत्येक भाषेत, योग्य माहिती.",
    dashboard: "डॅशबोर्ड",
    ask: "Sanyukt Vaani AI ला विचारा",
    sources: "अधिकृत स्रोत",
    history: "संभाषण इतिहास",
    profile: "प्रोफाइल आणि सेटिंग्ज",
    citizen: "नागरिक पोर्टल",
    officer: "अधिकारी पोर्टल",
    mainMenu: "मुख्य मेनू",
    trusted: "विश्वसनीय माहिती",
    trustedText: "सत्यापित अधिकृत स्रोतांवर आधारित उत्तरे.",
    logout: "बदला / लॉगआउट",
    searchCitizen: "योजना, कर्ज, सेवा शोधा...",
    searchOfficer: "दस्तऐवज, धोरणे, अपडेट शोधा...",
    hello: "नमस्कार! बोला, मी तुमची भाषा ओळखेन.",
    welcome: "शासकीय आणि सहकारी माहिती आता सोपी.",
    welcomeText: "कर्ज, योजना, पीक विमा, PACS सेवा, नियम आणि तक्रार प्रक्रियेबद्दल आपल्या भाषेत विचारा.",
    ready: "AI सहाय्य उपलब्ध आहे",
    auto: "भाषा आपोआप ओळखली जाईल",
    speak: "बोलून विचारा",
    speakSub: "मायक्रोफोन दाबून नमस्कार बोला",
    type: "किंवा प्रश्न लिहा",
    placeholder: "नमस्कार बोला किंवा आपल्या भाषेत विचारा...",
    detecting: "ऐकत आहोत आणि भाषा ओळखत आहोत...",
    detected: "ओळखलेली भाषा",
    verified: "सत्यापित माहिती",
    verifiedSub: "अधिकृत स्रोतांमधून उत्तरे",
    explore: "सत्यापित माहिती पहा",
    exploreSub: "मान्यताप्राप्त अधिकृत दस्तऐवजांमधून",
    viewAll: "सर्व पहा",
    loans: "PACS कर्ज",
    loansText: "पात्रता, कागदपत्रे आणि अर्ज प्रक्रिया",
    insurance: "पीक विमा",
    insuranceText: "संरक्षण, अंतिम मुदत आणि दावा प्रक्रिया",
    schemes: "शासकीय योजना",
    schemesText: "लाभ, पात्रता आणि कागदपत्रे",
    grievance: "नियम आणि तक्रारी",
    grievanceText: "प्रक्रिया आणि तक्रार मार्गदर्शन",
    trust: "Sanyukt Vaani AI वर विश्वास का ठेवावा?",
    trustText: "उत्तरे मान्यताप्राप्त अधिकृत दस्तऐवजांवर आधारित आहेत.",
    sourcesCount: "सत्यापित स्रोत",
    languages: "भाषा",
    voiceDetected: "तुमच्या आवाजामुळे वेबसाइटची भाषा आपोआप बदलली.",
  },
};

copy.gu = { ...copy.en, brandEyebrow: "બહુભાષી સહકારી સહાય", tagline: "દરેક ભાષામાં, સાચી માહિતી.", dashboard: "ડેશબોર્ડ", ask: "સંયુક્ત વાણીને પૂછો", sources: "સત્તાવાર સ્ત્રોતો", history: "વાતચીતનો ઇતિહાસ", profile: "પ્રોફાઇલ અને સેટિંગ્સ", citizen: "નાગરિક પોર્ટલ", officer: "અધિકારી પોર્ટલ", mainMenu: "મુખ્ય મેનૂ", hello: "નમસ્તે! બોલો, હું તમારી ભાષા ઓળખીશ.", welcome: "સરકારી અને સહકારી માહિતી હવે સરળ છે.", welcomeText: "લોન, યોજનાઓ, પાક વીમો, PACS સેવાઓ, નિયમો અને ફરિયાદ પ્રક્રિયા વિશે તમારી ભાષામાં પૂછો.", ready: "AI સહાય ઉપલબ્ધ છે", auto: "ભાષા આપમેળે ઓળખાશે", speak: "બોલીને પૂછો", speakSub: "માઇક્રોફોન દબાવીને નમસ્તે બોલો", type: "અથવા તમારો પ્રશ્ન લખો", placeholder: "નમસ્તે બોલો અથવા તમારી ભાષામાં પૂછો...", detecting: "સાંભળી રહ્યા છીએ અને ભાષા ઓળખી રહ્યા છીએ...", detected: "ઓળખાયેલી ભાષા", verified: "ચકાસાયેલ માહિતી", verifiedSub: "સત્તાવાર સ્ત્રોતોમાંથી જવાબ", explore: "ચકાસાયેલ માહિતી જુઓ", exploreSub: "મંજૂર સત્તાવાર દસ્તાવેજો દ્વારા", viewAll: "બધું જુઓ", loans: "PACS લોન", loansText: "પાત્રता, દસ્તાવેજો અને અરજી પ્રક્રિયા", insurance: "પાક વીમો", insuranceText: "કવરેજ, સમયમર્યાદા અને દાવાની પ્રક્રિયા", schemes: "સરકારી યોજનાઓ", schemesText: "લાભ, પાત્રતા અને દસ્તાવેજો", grievance: "નિયમો અને ફરિયાદો", grievanceText: "પ્રક્રિયા અને ફરિયાદ માર્ગદર્શન", trust: "સંયુક્ત વાણી પર વિશ્વાસ શા માટે?", trustText: "જવાબો મંજૂર સત્તાવાર દસ્તાવેજો પર આધારિત છે.", sourcesCount: "ચકાસાયેલ સ્ત્રોતો", languages: "ભાષાઓ", voiceDetected: "તમારા અવાજથી વેબસાઇટની ભાષા આપમેળે બદલાઈ.", trusted: "વિશ્વસનીય માહિતી", trustedText: "ચકાસાયેલ સત્તાવાર સ્ત્રોતો પરથી જવાબો.", logout: "બદલો / લૉગઆ웃", searchCitizen: "યોજનાઓ, લોન, સેવાઓ શોધો...", searchOfficer: "દસ્તાવેજો, નીતિઓ, અપડેટ શોધો..." };
copy.kn = { ...copy.en, brandEyebrow: "ಬಹುಭಾಷಾ ಸಹಕಾರಿ ಸಹಾಯ", tagline: "ಪ್ರತಿ ಭಾಷೆಯಲ್ಲಿ, ಸರಿಯಾದ ಮಾಹಿತಿ.", dashboard: "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್", ask: "ಸಂಯುಕ್ತ ವಾಣಿಯನ್ನು ಕೇಳಿ", sources: "ಅಧಿಕೃತ ಮೂಲಗಳು", history: "ಸಂಭಾಷಣೆ ಇತಿಹಾಸ", profile: "ಪ್ರೊಫೈಲ್ ಮತ್ತು ಸೆಟ್ಟಿಂಗ್ಸ್", citizen: "ನಾಗರಿಕ ಪೋರ್ಟಲ್", officer: "ಅಧಿಕಾರಿ ಪೋರ್ಟಲ್", mainMenu: "ಮುಖ್ಯ ಮೆನು", hello: "ನಮಸ್ಕಾರ! ಮಾತನಾಡಿ, ನಿಮ್ಮ ಭಾಷೆಯನ್ನು ಗುರುತಿಸುತ್ತೇನೆ.", welcome: "ಸರ್ಕಾರಿ ಮತ್ತು ಸಹಕಾರಿ ಮಾಹಿತಿ ಈಗ ಸರಳ.", welcomeText: "ಸಾಲ, ಯೋಜನೆಗಳು, ಬೆಳೆ ವಿಮೆ, PACS ಸೇವೆಗಳು, ನಿಯಮಗಳು ಮತ್ತು ದೂರು ಪ್ರಕ್ರಿಯೆಗಳ ಬಗ್ಗೆ ನಿಮ್ಮ ಭಾಷೆಯಲ್ಲಿ ಕೇಳಿ.", ready: "AI ಸಹಾಯ ಲಭ್ಯವಿದೆ", auto: "ಭಾಷೆ ಸ್ವಯಂಚಾಲಿತವಾಗಿ ಗುರುತಿಸಲಾಗುತ್ತದೆ", speak: "ಮಾತನಾಡಿ ಕೇಳಿ", speakSub: "ಮೈಕ್ರೊಫೋನ್ ಒತ್ತಿ ನಮಸ್ಕಾರ ಎಂದು ಹೇಳಿ", type: "ಅಥವಾ ನಿಮ್ಮ ಪ್ರಶ್ನೆ ಬರೆಯಿರಿ", placeholder: "ನಮಸ್ಕಾರ ಎಂದು ಹೇಳಿ ಅಥವಾ ನಿಮ್ಮ ಭಾಷೆಯಲ್ಲಿ ಕೇಳಿ...", detecting: "ಕೇಳುತ್ತಿದ್ದೇವೆ ಮತ್ತು ಭಾಷೆ ಗುರುತಿಸುತ್ತಿದ್ದೇವೆ...", detected: "ಗುರುತಿಸಿದ ಭಾಷೆ", verified: "ಪರಿಶೀಲಿಸಿದ ಮಾಹಿತಿ", verifiedSub: "ಅಧಿಕೃತ ಮೂಲಗಳಿಂದ ಉತ್ತರ", explore: "ಪರಿಶೀಲಿಸಿದ ಮಾಹಿತಿ ನೋಡಿ", exploreSub: "ಅನುಮೋದಿತ ಅಧಿಕೃತ ದಾಖಲೆಗಳಿಂದ", viewAll: "ಎಲ್ಲವನ್ನೂ ನೋಡಿ", loans: "PACS ಸಾಲ", loansText: "ಅರ್ಹತೆ, ದಾಖಲೆಗಳು ಮತ್ತು ಅರ್ಜಿ ಪ್ರಕ್ರಿಯೆ", insurance: "ಬೆಳೆ ವಿಮೆ", insuranceText: "ಕವರೇಜ್, ಗಡುವು ಮತ್ತು ಕ್ಲೈಮ್ ಪ್ರಕ್ರಿಯೆ", schemes: "ಸರ್ಕಾರಿ ಯೋಜನೆಗಳು", schemesText: "ಪ್ರಯೋಜನಗಳು, ಅರ್ಹತೆ ಮತ್ತು ದಾಖಲೆಗಳು", grievance: "ನಿಯಮಗಳು ಮತ್ತು ದೂರುಗಳು", grievanceText: "ಪ್ರಕ್ರಿಯೆ ಮತ್ತು ದೂರು ಮಾರ್ಗದರ್ಶನ", trust: "ಸಂಯುಕ್ತ ವಾಣಿಯನ್ನು ಏಕೆ ನಂಬಬೇಕು?", trustText: "ಉತ್ತರಗಳು ಅನುಮೋದಿತ ಅಧಿಕೃತ ದಾಖಲೆಗಳನ್ನು ಆಧರಿಸಿವೆ.", sourcesCount: "ಪರಿಶೀಲಿಸಿದ ಮೂಲಗಳು", languages: "ಭಾಷೆಗಳು", voiceDetected: "ನಿಮ್ಮ ಧ್ವನಿಯಿಂದ ವೆಬ್‌ಸೈಟ್ ಭಾಷೆ ಸ್ವಯಂಚಾಲಿತವಾಗಿ ಬದಲಾಗಿದೆ.", trusted: "ವಿಶ್ವಾಸಾರ್ಹ ಮಾಹಿತಿ", trustedText: "ಪರಿಶೀಲಿಸಿದ ಅಧಿಕೃತ ಮೂಲಗಳಿಂದ ಉತ್ತರಗಳು.", logout: "ಬದಲಿಸಿ / ಲಾಗ್‌ಔಟ್", searchCitizen: "ಯೋಜನೆಗಳು, ಸಾಲಗಳು, ಸೇವೆಗಳನ್ನು ಹುಡುಕಿ...", searchOfficer: "ದಾಖಲೆಗಳು, ನೀತಿಗಳು, ಅಪ್‌ಡೇಟ್‌ಗಳನ್ನು ಹುಡುಕಿ..." };
copy.gu.ask = "Sanyukt Vaani AI ને પૂછો";
copy.gu.trust = "Sanyukt Vaani AI પર વિશ્વાસ શા માટે?";
copy.kn.ask = "Sanyukt Vaani AI ಅನ್ನು ಕೇಳಿ";
copy.kn.trust = "Sanyukt Vaani AI ಅನ್ನು ಏಕೆ ನಂಬಬೇಕು?";
copy.sa = { ...copy.hi };
copy.sa.ask = "Sanyukt Vaani AI पृच्छतु";
copy.sa.trust = "Sanyukt Vaani AI किमर्थं विश्वसेत्?";

const LanguageContext = createContext(null);

function detectLanguage(text) {
  if (!text) return "en";
  const trimmed = text.trim();
  // Check if Latin script (English)
  if (/^[A-Za-z0-9\s.,?!'-]+$/.test(trimmed)) {
    return "en";
  }
  if (/જ|છ|ટ|ડ|ણ|ળ/.test(text)) return "gu";
  if (/ಕ|ತ|ನ|ಮ|ಳ|ವ/.test(text)) return "kn";
  if (/ज्ञ|श्र|संस्कृत|पृच्छ/.test(text)) return "sa";
  if (/ळ|ी|ु|ं|आ|काय|मला|पाहिजे/.test(text) && /[\u0900-\u097F]/.test(text)) return "mr";
  if (/[\u0900-\u097F]/.test(text)) return "hi";
  return "en";
}

export function LanguageProvider({ children }) {
  const [languageId, setLanguageId] = useState(LANGUAGES[0].id);
  const [rotationIndex, setRotationIndex] = useState(0);
  const [isAutoRotating, setIsAutoRotating] = useState(true);
  const [transcript, setTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [voiceMessage, setVoiceMessage] = useState("");

  const language = LANGUAGES.find((item) => item.id === languageId) || LANGUAGES[1];
  const t = copy[languageId] || copy.hi;

  useEffect(() => {
    document.documentElement.lang = languageId;
    document.documentElement.dir = "ltr";
  }, [languageId]);

  useEffect(() => {
    if (!isAutoRotating) return undefined;

    const timer = window.setInterval(() => {
      setRotationIndex((currentIndex) => {
        const nextIndex = (currentIndex + 1) + AUTO_ROTATION_LANGUAGE_IDS.length;
        const normalizedIndex = nextIndex % AUTO_ROTATION_LANGUAGE_IDS.length;
        setLanguageId(AUTO_ROTATION_LANGUAGE_IDS[normalizedIndex]);
        return normalizedIndex;
      });
    }, 10000);

    return () => window.clearInterval(timer);
  }, [isAutoRotating]);

  const setLanguage = (id) => {
    const nextIndex = LANGUAGES.findIndex((item) => item.id === id);
    if (nextIndex !== -1) {
      setRotationIndex(nextIndex);
      setLanguageId(id);
      setIsAutoRotating(false);
    }
  };

  const detectFromSpeech = () => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      setVoiceMessage("Speech recognition is not supported in this browser. You can type to continue.");
      return false;
    }

    const recognition = new Recognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    // Omit or set multi/default so browser can accurately recognize English, Hindi, or Marathi based on user speech
    recognition.lang = ""; 
    setIsListening(true);
    setVoiceMessage(t.detecting);

    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript;
      const detected = detectLanguage(text);
      setTranscript(text);
      setRotationIndex(LANGUAGES.findIndex((item) => item.id === detected));
      setIsAutoRotating(false);
      setLanguageId(detected);
      setVoiceMessage(copy[detected] ? copy[detected].voiceDetected : copy.en.voiceDetected);
    };

    recognition.onerror = () => {
      setVoiceMessage("Microphone access was not available. Please try again or type your question.");
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    try {
      recognition.start();
      return true;
    } catch (e) {
      setIsListening(false);
      return false;
    }
  };

  const value = useMemo(() => ({ language, languageId, languages: LANGUAGES, t, transcript, setTranscript, isListening, isAutoRotating, voiceMessage, setLanguage, detectFromSpeech }), [language, languageId, t, transcript, isListening, isAutoRotating, voiceMessage]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used inside LanguageProvider");
  return context;
}