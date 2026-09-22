import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  transcribeVoice,
  getAudioUrl,
} from "../services/api";

/* =========================================================
   SUPPORTED LANGUAGES
========================================================= */

export const LANGUAGES = [
  {
    id: "hi",
    label: "हिंदी",
    speech: "hi-IN",
    script: /[\u0900-\u097F]/,
  },
  {
    id: "mr",
    label: "मराठी",
    speech: "mr-IN",
    script: /[\u0900-\u097F]/,
  },
  {
    id: "gu",
    label: "ગુજરાતી",
    speech: "gu-IN",
    script: /[\u0A80-\u0AFF]/,
  },
  {
    id: "kn",
    label: "ಕನ್ನಡ",
    speech: "kn-IN",
    script: /[\u0C80-\u0CFF]/,
  },
  {
    id: "sa",
    label: "संस्कृतम्",
    speech: "sa-IN",
    script: /[\u0900-\u097F]/,
  },
  {
    id: "en",
    label: "English",
    speech: "en-IN",
    script: /^[\x00-\x7F]*$/,
  },
];


/* =========================================================
   LANGUAGE HELPERS
========================================================= */

const LANGUAGE_ALIASES = {
  auto: "auto",

  english: "en",
  "en-us": "en",
  "en-in": "en",

  hindi: "hi",
  "hi-in": "hi",
  "हिंदी": "hi",
  "हिन्दी": "hi",

  marathi: "mr",
  "mr-in": "mr",
  "मराठी": "mr",

  gujarati: "gu",
  "gu-in": "gu",

  kannada: "kn",
  "kn-in": "kn",

  sanskrit: "sa",
  "sa-in": "sa",

  bengali: "bn",
  "bn-in": "bn",

  tamil: "ta",
  "ta-in": "ta",

  telugu: "te",
  "te-in": "te",

  malayalam: "ml",
  "ml-in": "ml",

  punjabi: "pa",
  "pa-in": "pa",

  urdu: "ur",
  "ur-in": "ur",

  odia: "or",
  "or-in": "or",

  assamese: "as",
  "as-in": "as",
};


function normalizeLanguageId(
  value,
  fallback = "en"
) {
  if (!value) {
    return fallback;
  }

  const normalized = String(value)
    .trim()
    .toLowerCase();

  if (LANGUAGE_ALIASES[normalized]) {
    return LANGUAGE_ALIASES[normalized];
  }

  if (normalized.includes("-")) {
    const base = normalized.split("-")[0];

    if (
      LANGUAGES.some(
        (item) => item.id === base
      )
    ) {
      return base;
    }
  }

  if (
    LANGUAGES.some(
      (item) => item.id === normalized
    )
  ) {
    return normalized;
  }

  return fallback;
}


/* =========================================================
   AUTO LANGUAGE ROTATION
========================================================= */

// Automatic voice detection for the project is intentionally limited to
// the three answer languages supported by the RAG / answer-generation flow.
const AUTO_ROTATION_LANGUAGE_IDS = [
  "hi",
  "en",
  "mr",
];


/* =========================================================
   UI TRANSLATIONS
========================================================= */

const copy = {
  en: {
    brandEyebrow:
      "MULTILINGUAL COOPERATIVE ASSISTANCE",

    tagline:
      "Right information, in every language.",

    dashboard: "Dashboard",

    ask: "Ask Sanyukt Vaani AI",

    sources: "Official Sources",

    history: "Conversation History",

    profile: "Profile & Settings",

    citizen: "Citizen Portal",

    officer: "Officer Portal",

    mainMenu: "MAIN MENU",

    trusted: "Trusted Information",

    trustedText:
      "Answers grounded in verified official sources.",

    logout: "Switch / Logout",

    searchCitizen:
      "Search schemes, loans, services...",

    searchOfficer:
      "Search documents, policies, updates...",

    hello:
      "Hello! Speak naturally and I will detect your language.",

    welcome:
      "Government and cooperative information, made simple.",

    welcomeText:
      "Ask about loans, schemes, crop insurance, PACS services, rules and grievance procedures in your own language.",

    ready:
      "AI assistance is ready",

    auto:
      "Auto language detection",

    speak:
      "Speak to ask",

    speakSub:
      "Tap the microphone and ask your question",

    type:
      "Or type your question",

    placeholder:
      "Say Hello or ask in your language...",

    detecting:
      "Listening...",

    detected:
      "Detected language",

    verified:
      "Verified Information",

    verifiedSub:
      "Answers from official sources",

    explore:
      "Explore verified information",

    exploreSub:
      "Powered by approved official documents",

    viewAll:
      "View all",

    loans:
      "PACS Loans",

    loansText:
      "Eligibility, documents and application process",

    insurance:
      "Crop Insurance",

    insuranceText:
      "Coverage, deadlines and claim process",

    schemes:
      "Government Schemes",

    schemesText:
      "Benefits, eligibility and documents",

    grievance:
      "Rules & Grievances",

    grievanceText:
      "Procedures and complaint guidance",

    trust:
      "Why trust Sanyukt Vaani AI?",

    trustText:
      "Answers are grounded in approved official documents.",

    sourcesCount:
      "verified sources",

    languages:
      "languages",

    voiceDetected:
      "Your voice changed the website language automatically.",

    processing:
      "Processing your voice...",

    answerReady:
      "Answer ready.",

    noSpeech:
      "No speech was detected. Please speak clearly and try again.",

    recordingTooShort:
      "The recording was too short. Please speak clearly and try again.",

    microphoneDenied:
      "Microphone permission was denied. Allow microphone access and try again.",

    microphoneMissing:
      "No microphone was found. Connect a microphone and try again.",

    microphoneUnavailable:
      "Microphone access was not available. Check your browser and system microphone settings.",

    voiceFailed:
      "Voice recognition failed. Please try again.",

    recordingFailed:
      "Voice recording failed. Please try again.",

    startingFailed:
      "Could not start voice recording. Please try again.",

    stoppingFailed:
      "Could not stop voice recording. Please try again.",

    browserUnsupported:
      "Microphone access is not supported in this browser. You can type to continue.",
  },

  hi: {
    brandEyebrow:
      "बहुभाषी सहकारी सहायता",

    tagline:
      "हर भाषा में, सही जानकारी।",

    dashboard:
      "डैशबोर्ड",

    ask:
      "Sanyukt Vaani AI से पूछें",

    sources:
      "आधिकारिक स्रोत",

    history:
      "बातचीत का इतिहास",

    profile:
      "प्रोफ़ाइल और सेटिंग्स",

    citizen:
      "नागरिक पोर्टल",

    officer:
      "अधिकारी पोर्टल",

    mainMenu:
      "मुख्य मेनू",

    trusted:
      "विश्वसनीय जानकारी",

    trustedText:
      "सत्यापित आधिकारिक स्रोतों से उत्तर।",

    logout:
      "बदलें / लॉगआउट",

    searchCitizen:
      "योजनाएं, ऋण, सेवाएं खोजें...",

    searchOfficer:
      "दस्तावेज़, नीतियां, अपडेट खोजें...",

    hello:
      "नमस्ते! बोलिए, मैं आपकी भाषा पहचान लूंगा।",

    welcome:
      "सरकारी और सहकारी जानकारी अब आसान है।",

    welcomeText:
      "ऋण, योजनाओं, फसल बीमा, PACS सेवाओं, नियमों और शिकायत प्रक्रिया के बारे में अपनी भाषा में पूछें।",

    ready:
      "AI सहायता उपलब्ध है",

    auto:
      "भाषा अपने आप पहचानी जाएगी",

    speak:
      "बोलकर पूछें",

    speakSub:
      "माइक्रोफोन दबाकर अपना सवाल पूछें",

    type:
      "या अपना सवाल लिखें",

    placeholder:
      "नमस्ते बोलें या अपनी भाषा में पूछें...",

    detecting:
      "सुन रहे हैं...",

    detected:
      "पहचानी गई भाषा",

    verified:
      "सत्यापित जानकारी",

    verifiedSub:
      "आधिकारिक स्रोतों से जवाब",

    explore:
      "सत्यापित जानकारी देखें",

    exploreSub:
      "स्वीकृत आधिकारिक दस्तावेज़ों से",

    viewAll:
      "सभी देखें",

    loans:
      "PACS ऋण",

    loansText:
      "पात्रता, दस्तावेज़ और आवेदन प्रक्रिया",

    insurance:
      "फसल बीमा",

    insuranceText:
      "कवरेज, अंतिम तिथि और दावा प्रक्रिया",

    schemes:
      "सरकारी योजनाएं",

    schemesText:
      "लाभ, पात्रता और दस्तावेज़",

    grievance:
      "नियम और शिकायत",

    grievanceText:
      "प्रक्रिया और शिकायत मार्गदर्शन",

    trust:
      "Sanyukt Vaani AI पर भरोसा क्यों करें?",

    trustText:
      "उत्तर मान्यताप्राप्त आधिकारिक दस्तावेज़ों पर आधारित हैं।",

    sourcesCount:
      "सत्यापित स्रोत",

    languages:
      "भाषाएं",

    voiceDetected:
      "आपकी आवाज़ से वेबसाइट की भाषा अपने आप बदल गई।",

    processing:
      "आपकी आवाज़ संसाधित की जा रही है...",

    answerReady:
      "उत्तर तैयार है।",

    noSpeech:
      "कोई आवाज़ नहीं मिली। कृपया स्पष्ट बोलें और फिर प्रयास करें।",

    recordingTooShort:
      "रिकॉर्डिंग बहुत छोटी थी। कृपया स्पष्ट बोलें और फिर प्रयास करें।",

    microphoneDenied:
      "माइक्रोफोन की अनुमति नहीं मिली। अनुमति दें और फिर प्रयास करें।",

    microphoneMissing:
      "कोई माइक्रोफोन नहीं मिला। माइक्रोफोन कनेक्ट करें और फिर प्रयास करें।",

    microphoneUnavailable:
      "माइक्रोफोन उपलब्ध नहीं है। ब्राउज़र और सिस्टम की माइक्रोफोन सेटिंग जांचें।",

    voiceFailed:
      "आवाज़ पहचानने में समस्या हुई। कृपया फिर प्रयास करें।",

    recordingFailed:
      "वॉइस रिकॉर्डिंग विफल हुई। कृपया फिर प्रयास करें।",

    startingFailed:
      "वॉइस रिकॉर्डिंग शुरू नहीं हो सकी। कृपया फिर प्रयास करें।",

    stoppingFailed:
      "वॉइस रिकॉर्डिंग बंद नहीं हो सकी। कृपया फिर प्रयास करें।",

    browserUnsupported:
      "इस ब्राउज़र में माइक्रोफोन उपलब्ध नहीं है। आप टाइप करके जारी रख सकते हैं।",
  },

  mr: {
    brandEyebrow:
      "बहुभाषिक सहकारी सहाय्य",

    tagline:
      "प्रत्येक भाषेत, योग्य माहिती.",

    dashboard:
      "डॅशबोर्ड",

    ask:
      "Sanyukt Vaani AI ला विचारा",

    sources:
      "अधिकृत स्रोत",

    history:
      "संभाषण इतिहास",

    profile:
      "प्रोफाइल आणि सेटिंग्ज",

    citizen:
      "नागरिक पोर्टल",

    officer:
      "अधिकारी पोर्टल",

    mainMenu:
      "मुख्य मेनू",

    trusted:
      "विश्वसनीय माहिती",

    trustedText:
      "सत्यापित अधिकृत स्रोतांवर आधारित उत्तरे.",

    logout:
      "बदला / लॉगआउट",

    searchCitizen:
      "योजना, कर्ज, सेवा शोधा...",

    searchOfficer:
      "दस्तऐवज, धोरणे, अपडेट शोधा...",

    hello:
      "नमस्कार! बोला, मी तुमची भाषा ओळखेन.",

    welcome:
      "शासकीय आणि सहकारी माहिती आता सोपी.",

    welcomeText:
      "कर्ज, योजना, पीक विमा, PACS सेवा, नियम आणि तक्रार प्रक्रियेबद्दल आपल्या भाषेत विचारा.",

    ready:
      "AI सहाय्य उपलब्ध आहे",

    auto:
      "भाषा आपोआप ओळखली जाईल",

    speak:
      "बोलून विचारा",

    speakSub:
      "मायक्रोफोन दाबून आपला प्रश्न विचारा",

    type:
      "किंवा प्रश्न लिहा",

    placeholder:
      "नमस्कार बोला किंवा आपल्या भाषेत विचारा...",

    detecting:
      "ऐकत आहोत...",

    detected:
      "ओळखलेली भाषा",

    verified:
      "सत्यापित माहिती",

    verifiedSub:
      "अधिकृत स्रोतांमधून उत्तरे",

    explore:
      "सत्यापित माहिती पहा",

    exploreSub:
      "मान्यताप्राप्त अधिकृत दस्तऐवजांमधून",

    viewAll:
      "सर्व पहा",

    loans:
      "PACS कर्ज",

    loansText:
      "पात्रता, कागदपत्रे आणि अर्ज प्रक्रिया",

    insurance:
      "पीक विमा",

    insuranceText:
      "संरक्षण, अंतिम मुदत आणि दावा प्रक्रिया",

    schemes:
      "शासकीय योजना",

    schemesText:
      "लाभ, पात्रता आणि कागदपत्रे",

    grievance:
      "नियम आणि तक्रारी",

    grievanceText:
      "प्रक्रिया आणि तक्रार मार्गदर्शन",

    trust:
      "Sanyukt Vaani AI वर विश्वास का ठेवावा?",

    trustText:
      "उत्तरे मान्यताप्राप्त अधिकृत दस्तऐवजांवर आधारित आहेत.",

    sourcesCount:
      "सत्यापित स्रोत",

    languages:
      "भाषा",

    voiceDetected:
      "तुमच्या आवाजामुळे वेबसाइटची भाषा आपोआप बदलली.",

    processing:
      "तुमच्या आवाजावर प्रक्रिया सुरू आहे...",

    answerReady:
      "उत्तर तयार आहे.",

    noSpeech:
      "आवाज आढळला नाही. कृपया स्पष्ट बोला आणि पुन्हा प्रयत्न करा.",

    recordingTooShort:
      "रेकॉर्डिंग खूप लहान होते. कृपया स्पष्ट बोला आणि पुन्हा प्रयत्न करा.",

    microphoneDenied:
      "मायक्रोफोनची परवानगी नाकारली गेली. परवानगी द्या आणि पुन्हा प्रयत्न करा.",

    microphoneMissing:
      "मायक्रोफोन आढळला नाही. मायक्रोफोन जोडा आणि पुन्हा प्रयत्न करा.",

    microphoneUnavailable:
      "मायक्रोफोन उपलब्ध नाही. ब्राउझर आणि सिस्टम मायक्रोफोन सेटिंग तपासा.",

    voiceFailed:
      "आवाज ओळखण्यात समस्या आली. कृपया पुन्हा प्रयत्न करा.",

    recordingFailed:
      "व्हॉइस रेकॉर्डिंग अयशस्वी झाले. कृपया पुन्हा प्रयत्न करा.",

    startingFailed:
      "व्हॉइस रेकॉर्डिंग सुरू करता आले नाही. कृपया पुन्हा प्रयत्न करा.",

    stoppingFailed:
      "व्हॉइस रेकॉर्डिंग थांबवता आले नाही. कृपया पुन्हा प्रयत्न करा.",

    browserUnsupported:
      "या ब्राउझरमध्ये मायक्रोफोन उपलब्ध नाही. तुम्ही टाइप करून पुढे जाऊ शकता.",
  },
};


/* =========================================================
   ADDITIONAL LANGUAGE COPIES
========================================================= */

copy.gu = {
  ...copy.en,

  brandEyebrow:
    "બહુભાષી સહકારી સહાય",

  tagline:
    "દરેક ભાષામાં, સાચી માહિતી.",

  dashboard:
    "ડેશબોર્ડ",

  ask:
    "Sanyukt Vaani AI ને પૂછો",

  sources:
    "સત્તાવાર સ્ત્રોતો",

  history:
    "વાતચીતનો ઇતિહાસ",

  profile:
    "પ્રોફાઇલ અને સેટિંગ્સ",

  citizen:
    "નાગરિક પોર્ટલ",

  officer:
    "અધિકારી પોર્ટલ",

  mainMenu:
    "મુખ્ય મેનૂ",

  hello:
    "નમસ્તે! બોલો, હું તમારી ભાષા ઓળખીશ.",

  welcome:
    "સરકારી અને સહકારી માહિતી હવે સરળ છે.",

  welcomeText:
    "લોન, યોજનાઓ, પાક વીમો, PACS સેવાઓ, નિયમો અને ફરિયાદ પ્રક્રિયા વિશે તમારી ભાષામાં પૂછો.",

  ready:
    "AI સહાય ઉપલબ્ધ છે",

  auto:
    "ભાષા આપમેળે ઓળખાશે",

  speak:
    "બોલીને પૂછો",

  speakSub:
    "માઇક્રોફોન દબાવીને તમારો પ્રશ્ન પૂછો",

  type:
    "અથવા તમારો પ્રશ્ન લખો",

  placeholder:
    "નમસ્તે બોલો અથવા તમારી ભાષામાં પૂછો...",

  detecting:
    "સાંભળી રહ્યા છીએ...",

  detected:
    "ઓળખાયેલી ભાષા",

  verified:
    "ચકાસાયેલ માહિતી",

  verifiedSub:
    "સત્તાવાર સ્ત્રોતોમાંથી જવાબ",

  explore:
    "ચકાસાયેલ માહિતી જુઓ",

  exploreSub:
    "મંજૂર સત્તાવાર દસ્તાવેજો દ્વારા",

  viewAll:
    "બધું જુઓ",

  loans:
    "PACS લોન",

  loansText:
    "પાત્રતા, દસ્તાવેજો અને અરજી પ્રક્રિયા",

  insurance:
    "પાક વીમો",

  insuranceText:
    "કવરેજ, સમયમર્યાદા અને દાવાની પ્રક્રિયા",

  schemes:
    "સરકારી યોજનાઓ",

  schemesText:
    "લાભ, પાત્રતા અને દસ્તાવેજો",

  grievance:
    "નિયમો અને ફરિયાદો",

  grievanceText:
    "પ્રક્રિયા અને ફરિયાદ માર્ગદર્શન",

  trust:
    "Sanyukt Vaani AI પર વિશ્વાસ શા માટે?",

  trustText:
    "જવાબો મંજૂર સત્તાવાર દસ્તાવેજો પર આધારિત છે.",

  sourcesCount:
    "ચકાસાયેલ સ્ત્રોતો",

  languages:
    "ભાષાઓ",

  voiceDetected:
    "તમારા અવાજથી વેબસાઇટની ભાષા આપમેળે બદલાઈ.",

  processing:
    "તમારા અવાજ પર પ્રક્રિયા થઈ રહી છે...",

  answerReady:
    "જવાબ તૈયાર છે.",
};


copy.kn = {
  ...copy.en,

  brandEyebrow:
    "ಬಹುಭಾಷಾ ಸಹಕಾರಿ ಸಹಾಯ",

  tagline:
    "ಪ್ರತಿ ಭಾಷೆಯಲ್ಲಿ, ಸರಿಯಾದ ಮಾಹಿತಿ.",

  dashboard:
    "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್",

  ask:
    "Sanyukt Vaani AI ಅನ್ನು ಕೇಳಿ",

  sources:
    "ಅಧಿಕೃತ ಮೂಲಗಳು",

  history:
    "ಸಂಭಾಷಣೆ ಇತಿಹಾಸ",

  profile:
    "ಪ್ರೊಫೈಲ್ ಮತ್ತು ಸೆಟ್ಟಿಂಗ್ಸ್",

  citizen:
    "ನಾಗರಿಕ ಪೋರ್ಟಲ್",

  officer:
    "ಅಧಿಕಾರಿ ಪೋರ್ಟಲ್",

  mainMenu:
    "ಮುಖ್ಯ ಮೆನು",

  hello:
    "ನಮಸ್ಕಾರ! ಮಾತನಾಡಿ, ನಿಮ್ಮ ಭಾಷೆಯನ್ನು ಗುರುತಿಸುತ್ತೇನೆ.",

  welcome:
    "ಸರ್ಕಾರಿ ಮತ್ತು ಸಹಕಾರಿ ಮಾಹಿತಿ ಈಗ ಸರಳ.",

  welcomeText:
    "ಸಾಲ, ಯೋಜನೆಗಳು, ಬೆಳೆ ವಿಮೆ, PACS ಸೇವೆಗಳು, ನಿಯಮಗಳು ಮತ್ತು ದೂರು ಪ್ರಕ್ರಿಯೆಗಳ ಬಗ್ಗೆ ನಿಮ್ಮ ಭಾಷೆಯಲ್ಲಿ ಕೇಳಿ.",

  ready:
    "AI ಸಹಾಯ ಲಭ್ಯವಿದೆ",

  auto:
    "ಭಾಷೆ ಸ್ವಯಂಚಾಲಿತವಾಗಿ ಗುರುತಿಸಲಾಗುತ್ತದೆ",

  speak:
    "ಮಾತನಾಡಿ ಕೇಳಿ",

  speakSub:
    "ಮೈಕ್ರೊಫೋನ್ ಒತ್ತಿ ನಿಮ್ಮ ಪ್ರಶ್ನೆಯನ್ನು ಕೇಳಿ",

  type:
    "ಅಥವಾ ನಿಮ್ಮ ಪ್ರಶ್ನೆ ಬರೆಯಿರಿ",

  placeholder:
    "ನಮಸ್ಕಾರ ಎಂದು ಹೇಳಿ ಅಥವಾ ನಿಮ್ಮ ಭಾಷೆಯಲ್ಲಿ ಕೇಳಿ...",

  detecting:
    "ಕೇಳುತ್ತಿದ್ದೇವೆ...",

  detected:
    "ಗುರುತಿಸಿದ ಭಾಷೆ",

  verified:
    "ಪರಿಶೀಲಿಸಿದ ಮಾಹಿತಿ",

  verifiedSub:
    "ಅಧಿಕೃತ ಮೂಲಗಳಿಂದ ಉತ್ತರ",

  explore:
    "ಪರಿಶೀಲಿಸಿದ ಮಾಹಿತಿ ನೋಡಿ",

  exploreSub:
    "ಅನುಮೋದಿತ ಅಧಿಕೃತ ದಾಖಲೆಗಳಿಂದ",

  viewAll:
    "ಎಲ್ಲವನ್ನೂ ನೋಡಿ",

  loans:
    "PACS ಸಾಲ",

  loansText:
    "ಅರ್ಹತೆ, ದಾಖಲೆಗಳು ಮತ್ತು ಅರ್ಜಿ ಪ್ರಕ್ರಿಯೆ",

  insurance:
    "ಬೆಳೆ ವಿಮೆ",

  insuranceText:
    "ಕವರೇಜ್, ಗಡುವು ಮತ್ತು ಕ್ಲೈಮ್ ಪ್ರಕ್ರಿಯೆ",

  schemes:
    "ಸರ್ಕಾರಿ ಯೋಜನೆಗಳು",

  schemesText:
    "ಪ್ರಯೋಜನಗಳು, ಅರ್ಹತೆ ಮತ್ತು ದಾಖಲೆಗಳು",

  grievance:
    "ನಿಯಮಗಳು ಮತ್ತು ದೂರುಗಳು",

  grievanceText:
    "ಪ್ರಕ್ರಿಯೆ ಮತ್ತು ದೂರು ಮಾರ್ಗದರ್ಶನ",

  trust:
    "Sanyukt Vaani AI ಅನ್ನು ಏಕೆ ನಂಬಬೇಕು?",

  trustText:
    "ಉತ್ತರಗಳು ಅನುಮೋದಿತ ಅಧಿಕೃತ ದಾಖಲೆಗಳನ್ನು ಆಧರಿಸಿವೆ.",

  sourcesCount:
    "ಪರಿಶೀಲಿಸಿದ ಮೂಲಗಳು",

  languages:
    "ಭಾಷೆಗಳು",

  voiceDetected:
    "ನಿಮ್ಮ ಧ್ವನಿಯಿಂದ ವೆಬ್‌ಸೈಟ್ ಭಾಷೆ ಸ್ವಯಂಚಾಲಿತವಾಗಿ ಬದಲಾಗಿದೆ.",

  processing:
    "ನಿಮ್ಮ ಧ್ವನಿಯನ್ನು ಪ್ರಕ್ರಿಯೆಗೊಳಿಸಲಾಗುತ್ತಿದೆ...",

  answerReady:
    "ಉತ್ತರ ಸಿದ್ಧವಾಗಿದೆ.",
};


copy.sa = {
  ...copy.hi,

  ask:
    "Sanyukt Vaani AI पृच्छतु",

  trust:
    "Sanyukt Vaani AI किमर्थं विश्वसेत्?",
};


/* =========================================================
   LANGUAGE DETECTION
========================================================= */

const MARATHI_WORD_PATTERNS = [
  /\bकाय\b/u,
  /\bमला\b/u,
  /\bमाझे\b/u,
  /\bमाझ्या\b/u,
  /\bमाझा\b/u,
  /\bमाझी\b/u,
  /\bआहे\b/u,
  /\bआहेत\b/u,
  /\bपाहिजे\b/u,
  /\bकुठे\b/u,
  /\bकुठला\b/u,
  /\bकुठली\b/u,
  /\bकुठले\b/u,
  /\bकसे\b/u,
  /\bकशी\b/u,
  /\bकसा\b/u,
  /\bतुम्ही\b/u,
  /\bतुमचा\b/u,
  /\bतुमची\b/u,
  /\bतुमचे\b/u,
  /\bशेतकरी\b/u,
  /\bपीक\b/u,
  /\bकर्ज\b/u,
  /\bयोजना\b/u,
  /\bमाहिती\b/u,
  /\bसांगा\b/u,
  /\bद्या\b/u,
  /\bकरायचे\b/u,
  /\bकरावे\b/u,
  /\bमिळेल\b/u,
  /\bहोईल\b/u,
];


function detectLanguage(text) {
  if (!text) {
    return "en";
  }

  const trimmed = String(text).trim();

  if (!trimmed) {
    return "en";
  }

  /* -------------------------------------------------------
     Project scope:
     automatic detection is authoritative only for
     English / Hindi / Marathi.
  ------------------------------------------------------- */

  if (/^[-A-Za-z0-9\s.,?!'"()_\\\/:%&+₹$]+$/u.test(trimmed)) {
    return "en";
  }

  /* -------------------------------------------------------
     Devanagari
  ------------------------------------------------------- */

  if (/[\u0900-\u097F]/u.test(trimmed)) {
    const marathiMatches =
      MARATHI_WORD_PATTERNS.filter(
        (pattern) => pattern.test(trimmed)
      ).length;

    /*
     * Require multiple strong Marathi indicators.
     * This avoids incorrectly classifying ordinary Hindi
     * sentences as Marathi.
     */
    if (marathiMatches >= 2) {
      return "mr";
    }

    return "hi";
  }

  /*
   * Any non-English/non-Devanagari text is not part of the
   * automatic answer-language contract. Fall back to English.
   */
  return "en";
}


/* =========================================================
   SPEECH CLEANING
========================================================= */

/*
 * This function is ONLY used for speech.
 *
 * The visible answer remains unchanged.
 *
 * Example:
 *
 * Gemini answer:
 *
 *   **PACS**
 *
 *   [Source 1]
 *
 *   PACS provides...
 *
 * Browser speech receives:
 *
 *   PACS. PACS provides...
 */

function cleanTextForSpeech(text) {
  if (!text) {
    return "";
  }

  let cleaned = String(text).normalize("NFKC");

  /* -------------------------------------------------------
     1. Unescape escaped markdown (\* -> *, \# -> #, etc.)
  ------------------------------------------------------- */
  cleaned = cleaned
    .replace(/\\([*_#~`[\]()])/g, "$1");

  /* -------------------------------------------------------
     2. Remove URLs and markdown links
  ------------------------------------------------------- */
  cleaned = cleaned.replace(/https?:\/\/\S+/gi, " ");
  cleaned = cleaned.replace(/\bwww\.\S+/gi, " ");
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

  /* -------------------------------------------------------
     3. Remove code blocks and inline code
  ------------------------------------------------------- */
  cleaned = cleaned.replace(/```[\s\S]*?```/g, " ");
  cleaned = cleaned.replace(/`([^`]+)`/g, "$1");
  cleaned = cleaned.replace(/`+/g, " ");

  /* -------------------------------------------------------
     4. Remove source/document wrappers and citations
  ------------------------------------------------------- */
  cleaned = cleaned.replace(/\[\s*(?:Source|Document|Chunk|Evidence|Reference)\s*\d*\]/gi, " ");
  cleaned = cleaned.replace(/\[\s*\d+\s*\]/g, " ");
  cleaned = cleaned.replace(/^\s*(?:source|sources|reference|references|evidence)\s*:.*$/gim, " ");
  cleaned = cleaned.replace(/\b(?:source|retrieval|similarity score|confidence score)\s*[:=]\s*[^\n]+/gi, " ");

  /* -------------------------------------------------------
     5. Remove markdown headings (#, ##, ###)
  ------------------------------------------------------- */
  cleaned = cleaned.replace(/^\s{0,4}#{1,6}\s*(.+)$/gm, "$1. ");
  cleaned = cleaned.replace(/#{1,6}/g, "");

  /* -------------------------------------------------------
     6. Remove bold and italic markers (***, **, *, ___, __, _)
  ------------------------------------------------------- */
  cleaned = cleaned.replace(/\*\*\*([^*]+)\*\*\*/g, "$1");
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, "$1");
  cleaned = cleaned.replace(/\*([^*]+)\*/g, "$1");
  cleaned = cleaned.replace(/___([^_]+)___/g, "$1");
  cleaned = cleaned.replace(/__([^_]+)__/g, "$1");
  cleaned = cleaned.replace(/_([^_]+)_/g, "$1");

  /* -------------------------------------------------------
     7. Remove list and bullet markers
  ------------------------------------------------------- */
  cleaned = cleaned.replace(/^\s*[-*+•●▪◦‣]\s*/gm, "");
  cleaned = cleaned.replace(/^\s*\d+[.)]\s*/gm, "");

  /* -------------------------------------------------------
     8. Remove table separators and borders
  ------------------------------------------------------- */
  cleaned = cleaned.replace(/^\s*\|?(?:\s*:?-{2,}:?\s*\|)+\s*$/gm, " ");
  cleaned = cleaned.replace(/[|]+/g, ". ");
  cleaned = cleaned.replace(/[_\-+=~^]{2,}/g, " ");

  /* -------------------------------------------------------
     9. Remove decorative symbols and HTML
  ------------------------------------------------------- */
  cleaned = cleaned.replace(/[★☆◆◇■□●○►▶→←↑↓✓✔✕✖️🔹🔸🔺🔻]/gu, " ");
  cleaned = cleaned.replace(/<[^>]*>/g, " ");

  /* -------------------------------------------------------
     10. ABSOLUTE FILTER: Remove ANY remaining asterisk,
         hash, underscore, tilde, backtick, backslash.
         TTS will NEVER pronounce "asterisk" or "hash".
  ------------------------------------------------------- */
  cleaned = cleaned.replace(/[*#_~`\\]/g, " ");

  /* -------------------------------------------------------
     11. Preserve Unicode letters, numbers and punctuation
  ------------------------------------------------------- */
  cleaned = cleaned.replace(/[^\p{L}\p{N}\s.,?!:;'"()/%₹-]/gu, " ");

  /* -------------------------------------------------------
     12. Clean punctuation and spacing
  ------------------------------------------------------- */
  cleaned = cleaned.replace(/\s+([,.?!:;])/g, "$1");
  cleaned = cleaned.replace(/([.!?]){2,}/g, "$1");
  cleaned = cleaned.replace(/\n+/g, ". ");
  cleaned = cleaned.replace(/\s+/g, " ");
  cleaned = cleaned.replace(/(^|\s)[.,:;!?]+(?=\s|$)/g, " ");

  return cleaned.trim();
}


/* =========================================================
   CONTEXT
========================================================= */

const LanguageContext =
  createContext(null);


/* =========================================================
   LANGUAGE PROVIDER
========================================================= */

export function LanguageProvider({
  children,
}) {

  /*
   * UI language.
   *
   * English remains the initial UI language.
   */
  const [languageId, setLanguageId] =
    useState("en");


  /*
   * IMPORTANT:
   *
   * Voice language mode is separate from UI language.
   *
   * "auto" means:
   *   let BHASHINI/backend detect the language.
   *
   * If the user manually selects Hindi/Marathi/etc.,
   * this changes to that language.
   */
  const [voiceLanguageMode, setVoiceLanguageMode] =
    useState("auto");


  const [rotationIndex, setRotationIndex] =
    useState(0);

  const [isAutoRotating, setIsAutoRotating] =
    useState(false);

  const [transcript, setTranscript] =
    useState("");

  const [isListening, setIsListening] =
    useState(false);

  const [isTranscribing, setIsTranscribing] =
    useState(false);

  const [voiceMessage, setVoiceMessage] =
    useState("");

  const [voiceAnswer, setVoiceAnswer] =
    useState("");

  const [voiceSources, setVoiceSources] =
    useState([]);

  const [voiceAudioResponse, setVoiceAudioResponse] =
    useState(null);

  /*
   * Complete voice result for Chat.jsx.
   *
   * This is intentionally separate from `transcript`:
   * `transcript` is the LIVE/interim text shown while
   * the user is speaking, while `voiceResult` contains
   * the final BHASHINI transcript, detected language,
   * answer and sources after STOP.
   */
  const [voiceResult, setVoiceResult] =
    useState(null);


  /*
   * MediaRecorder.
   */
 const recorderRef = useRef(null);

const speechRecognitionRef = useRef(null);
const speechRecognitionActiveRef = useRef(false);

  /*
   * Microphone stream.
   */
  const microphoneStreamRef =
    useRef(null);


  /*
   * Recording session identifier.
   */
  const recordingSessionRef =
    useRef(0);


  /*
   * Component mounted state.
   */
  const mountedRef =
    useRef(false);


  /*
   * Prevent stale async responses from
   * overwriting newer responses.
   */
  const activeRequestRef =
    useRef(0);


  /* =======================================================
     CURRENT LANGUAGE
  ======================================================== */

  const language =
    LANGUAGES.find(
      (item) => item.id === languageId
    ) ||
    LANGUAGES.find(
      (item) => item.id === "en"
    );

  const t =
    copy[languageId] ||
    copy.en;


  /* =======================================================
     MOUNT / UNMOUNT
  ======================================================== */

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;

      activeRequestRef.current += 1;

      stopLiveSpeechRecognition();

      recordingSessionRef.current += 1;

      if (
        recorderRef.current &&
        recorderRef.current.state !==
          "inactive"
      ) {
        try {
          recorderRef.current.stop();
        } catch {
          // Ignore cleanup errors.
        }
      }

      if (
        microphoneStreamRef.current
      ) {
        microphoneStreamRef.current
          .getTracks()
          .forEach((track) => {
            try {
              track.stop();
            } catch {
              // Ignore cleanup errors.
            }
          });

        microphoneStreamRef.current =
          null;
      }

      if (
        "speechSynthesis" in window
      ) {
        try {
          window.speechSynthesis.cancel();
        } catch {
          // Ignore cleanup errors.
        }
      }
    };
  }, []);


  /* =======================================================
     HTML LANGUAGE
  ======================================================== */

  useEffect(() => {
    document.documentElement.lang =
      languageId;

    document.documentElement.dir =
      "ltr";
  }, [languageId]);


  /* =======================================================
     AUTO LANGUAGE ROTATION
  ======================================================== */

  useEffect(() => {
    if (!isAutoRotating) {
      return undefined;
    }

    const timer =
      window.setInterval(() => {
        setRotationIndex(
          (currentIndex) => {
            const nextIndex =
              currentIndex + 1;

            const normalizedIndex =
              nextIndex %
              AUTO_ROTATION_LANGUAGE_IDS.length;

            setLanguageId(
              AUTO_ROTATION_LANGUAGE_IDS[
                normalizedIndex
              ]
            );

            return normalizedIndex;
          }
        );
      }, 10000);

    return () => {
      window.clearInterval(timer);
    };
  }, [isAutoRotating]);


  /* =======================================================
     MANUAL LANGUAGE CHANGE
  ======================================================== */

  const setLanguage = (id) => {
    const normalized =
      normalizeLanguageId(
        id,
        ""
      );

    /*
     * "auto" is not itself a UI language.
     * It means voice should use automatic detection.
     */
    if (normalized === "auto") {
      setVoiceLanguageMode("auto");
      setIsAutoRotating(false);
      return;
    }

    const nextIndex =
      LANGUAGES.findIndex(
        (item) =>
          item.id === normalized
      );

    if (nextIndex === -1) {
      return;
    }


    /*
     * Stop current browser speech when
     * language changes.
     */
    if (
      "speechSynthesis" in window
    ) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore.
      }
    }


    setRotationIndex(
      nextIndex
    );

    setLanguageId(
      normalized
    );

    /*
     * Manual selection means voice should
     * use this language instead of auto.
     */
    setVoiceLanguageMode(
      normalized
    );

    setIsAutoRotating(
      false
    );
  };


  /* =======================================================
     ENABLE AUTO VOICE LANGUAGE
  ======================================================== */

  const enableAutoLanguage = () => {
    setVoiceLanguageMode("auto");
    setIsAutoRotating(false);
  };


  /* =======================================================
     STOP MICROPHONE STREAM
  ======================================================== */

  const stopMicrophoneStream = () => {
    if (
      !microphoneStreamRef.current
    ) {
      return;
    }

    microphoneStreamRef.current
      .getTracks()
      .forEach((track) => {
        try {
          track.stop();
        } catch {
          // Ignore.
        }
      });

    microphoneStreamRef.current =
      null;
  };


  /* =======================================================
     LIVE BROWSER SPEECH RECOGNITION

     Browser SpeechRecognition is used ONLY for live
     interim text. BHASHINI remains the final STT/language
     authority after the user presses STOP.
  ======================================================== */

  const getBrowserSpeechLanguage = () => {
    const normalized =
      normalizeLanguageId(
        voiceLanguageMode === "auto"
          ? languageId
          : voiceLanguageMode,
        "en"
      );

    const speechLanguage =
      LANGUAGES.find(
        (item) => item.id === normalized
      );

    return speechLanguage?.speech || "en-IN";
  };


  const startLiveSpeechRecognition = () => {
    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      return false;
    }

    try {
      const recognition =
        new SpeechRecognition();

      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang =
        getBrowserSpeechLanguage();

      recognition.onstart = () => {
        speechRecognitionActiveRef.current = true;
      };

      recognition.onresult = (event) => {
        let liveText = "";

        for (
          let index = 0;
          index < event.results.length;
          index += 1
        ) {
          const result = event.results[index];

          if (
            result &&
            result[0] &&
            result[0].transcript
          ) {
            liveText +=
              result[0].transcript + " ";
          }
        }

        const cleanedLiveText =
          liveText
            .replace(/\s+/g, " ")
            .trim();

        if (
          cleanedLiveText &&
          mountedRef.current &&
          recorderRef.current?.state ===
            "recording"
        ) {
          setTranscript(
            cleanedLiveText
          );
        }
      };

      recognition.onerror = (event) => {
        /*
         * Do not stop MediaRecorder because a browser
         * SpeechRecognition error must never destroy the
         * final BHASHINI recording.
         */
        console.warn(
          "Live speech recognition:",
          event?.error || "unknown error"
        );
      };

      recognition.onend = () => {
        speechRecognitionActiveRef.current =
          false;

        /*
         * Chrome may end SpeechRecognition temporarily
         * while MediaRecorder is still recording. Restart
         * it so the text keeps updating live.
         */
        if (
          mountedRef.current &&
          recorderRef.current?.state ===
            "recording"
        ) {
          try {
            recognition.start();
          } catch {
            // Ignore duplicate-start timing errors.
          }
        }
      };

      speechRecognitionRef.current =
        recognition;

      recognition.start();

      return true;
    } catch (error) {
      console.warn(
        "Unable to start live speech recognition:",
        error
      );

      speechRecognitionRef.current =
        null;

      speechRecognitionActiveRef.current =
        false;

      return false;
    }
  };


  const stopLiveSpeechRecognition = () => {
    speechRecognitionActiveRef.current =
      false;

    const recognition =
      speechRecognitionRef.current;

    speechRecognitionRef.current =
      null;

    if (!recognition) {
      return;
    }

    try {
      /*
       * Remove onend first so STOP does not trigger
       * the automatic restart logic.
       */
      recognition.onend = null;
      recognition.stop();
    } catch {
      // Recognition may already be stopped.
    }
  };


  /* =======================================================
     START VOICE RECORDING
  ======================================================== */

  const startVoiceRecording =
    async () => {

      /*
       * Browser support.
       */
      if (
        !navigator.mediaDevices?.getUserMedia
      ) {
        if (
          mountedRef.current
        ) {
          setVoiceMessage(
            t.browserUnsupported
          );
        }

        return false;
      }


      /*
       * Do not start another recorder.
       */
      if (
        recorderRef.current &&
        recorderRef.current.state !==
          "inactive"
      ) {
        return true;
      }


      /*
       * New recording session.
       */
      recordingSessionRef.current += 1;

      const sessionId =
        recordingSessionRef.current;


      /*
       * New request ID.
       */
      activeRequestRef.current += 1;


      /*
       * Clear previous voice result.
       */
      setTranscript("");
      setVoiceAnswer("");
      setVoiceSources([]);
      setVoiceAudioResponse(null);
      setVoiceResult(null);
      setVoiceMessage("");
      setIsTranscribing(false);


      /*
       * Stop previous browser speech.
       */
      if (
        "speechSynthesis" in window
      ) {
        try {
          window.speechSynthesis.cancel();
        } catch {
          // Ignore.
        }
      }


      let microphoneStream;


      /* ---------------------------------------------------
         REQUEST MICROPHONE
      --------------------------------------------------- */

      try {
        microphoneStream =
          await navigator.mediaDevices.getUserMedia(
            {
              audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
              },
            }
          );
      } catch (error) {
        const message =
          error?.name ===
          "NotAllowedError"
            ? t.microphoneDenied
            : error?.name ===
                "NotFoundError"
              ? t.microphoneMissing
              : t.microphoneUnavailable;

        if (
          mountedRef.current
        ) {
          setVoiceMessage(
            message
          );

          setIsListening(
            false
          );
        }

        return false;
      }


      /*
       * Ignore microphone result if a newer
       * recording session already started.
       */
      if (
        sessionId !==
        recordingSessionRef.current
      ) {
        microphoneStream
          .getTracks()
          .forEach((track) =>
            track.stop()
          );

        return false;
      }


      microphoneStreamRef.current =
        microphoneStream;


      /* ---------------------------------------------------
         AUDIO FORMAT
      --------------------------------------------------- */

      let mimeType = "";

      if (
        typeof MediaRecorder !==
        "undefined"
      ) {
        if (
          MediaRecorder.isTypeSupported(
            "audio/webm;codecs=opus"
          )
        ) {
          mimeType =
            "audio/webm;codecs=opus";
        } else if (
          MediaRecorder.isTypeSupported(
            "audio/webm"
          )
        ) {
          mimeType =
            "audio/webm";
        } else if (
          MediaRecorder.isTypeSupported(
            "audio/mp4"
          )
        ) {
          mimeType =
            "audio/mp4";
        } else if (
          MediaRecorder.isTypeSupported(
            "audio/ogg"
          )
        ) {
          mimeType =
            "audio/ogg";
        }
      }


      if (
        typeof MediaRecorder ===
        "undefined"
      ) {
        stopMicrophoneStream();

        if (
          mountedRef.current
        ) {
          setVoiceMessage(
            t.browserUnsupported
          );
        }

        return false;
      }


      let recorder;

      try {
        recorder = mimeType
          ? new MediaRecorder(
              microphoneStream,
              {
                mimeType,
              }
            )
          : new MediaRecorder(
              microphoneStream
            );
      } catch {
        stopMicrophoneStream();

        if (
          mountedRef.current
        ) {
          setVoiceMessage(
            t.startingFailed
          );

          setIsListening(
            false
          );
        }

        return false;
      }


      const chunks = [];


      setIsListening(true);

      setIsTranscribing(false);

      setVoiceMessage(
        t.detecting
      );


      /* ---------------------------------------------------
         AUDIO DATA
      --------------------------------------------------- */

      recorder.ondataavailable =
        (event) => {
          if (
            event.data &&
            event.data.size > 0
          ) {
            chunks.push(
              event.data
            );
          }
        };


      /* ---------------------------------------------------
         RECORDING STOP
      --------------------------------------------------- */

      recorder.onstop =
        async () => {

          /*
           * STOP means the live recognizer must stop and
           * must not restart itself.
           */
          stopLiveSpeechRecognition();

          if (
            recorderRef.current ===
            recorder
          ) {
            recorderRef.current =
              null;
          }

          stopMicrophoneStream();


          if (
            !mountedRef.current
          ) {
            return;
          }


          setIsListening(
            false
          );

          setIsTranscribing(
            true
          );

          setVoiceMessage(
            t.processing
          );


          /*
           * No audio.
           */
          if (
            chunks.length === 0
          ) {
            setIsTranscribing(
              false
            );

            setVoiceMessage(
              t.noSpeech
            );

            return;
          }


          const finalType =
            mimeType ||
            chunks[0]?.type ||
            "audio/webm";


          const audioBlob =
            new Blob(
              chunks,
              {
                type: finalType,
              }
            );


          /*
           * Reject extremely small recordings.
           */
          if (
            audioBlob.size < 1000
          ) {
            setIsTranscribing(
              false
            );

            setVoiceMessage(
              t.recordingTooShort
            );

            return;
          }


          /*
           * Generate request identifier.
           */
          const requestId =
            ++activeRequestRef.current;


          try {

            /*
             * IMPORTANT:
             *
             * AUTO:
             *     send "auto"
             *
             * MANUAL:
             *     send selected language
             *
             * This fixes the previous problem where
             * languageId = "en" caused every voice
             * request to be sent as English.
             */
            const requestLanguage =
              voiceLanguageMode === "auto"
                ? "auto"
                : normalizeLanguageId(
                    voiceLanguageMode,
                    languageId
                  );


            const result =
              await transcribeVoice(
                audioBlob,
                requestLanguage
              );


            /*
             * Ignore stale response.
             */
            if (
              requestId !==
              activeRequestRef.current
            ) {
              return;
            }


            if (
              !mountedRef.current
            ) {
              return;
            }


            /* ------------------------------------------------
               TRANSCRIPT
            ------------------------------------------------ */

            const text =
              String(
                result?.transcribed_text ||
                  result?.transcript ||
                  result?.text ||
                  ""
              ).trim();


            if (!text) {
              throw new Error(
                t.noSpeech
              );
            }


            /* ------------------------------------------------
               BACKEND LANGUAGE
            ------------------------------------------------ */

            const backendLanguage =
              result?.detected_language ||
              result?.language ||
              "";


            let detected =
              normalizeLanguageId(
                backendLanguage,
                ""
              );


            /*
             * If backend did not return a supported
             * language, detect locally.
             */
            if (
              !detected ||
              detected === "auto"
            ) {
              detected =
                detectLanguage(text);
            }


            /*
             * If user manually selected a supported
             * language, respect it if backend did not
             * provide a valid language.
             */
            if (
              voiceLanguageMode !== "auto" &&
              !backendLanguage
            ) {
              detected =
                normalizeLanguageId(
                  voiceLanguageMode,
                  detected
                );
            }


            const supported =
              LANGUAGES.some(
                (item) =>
                  item.id === detected
              )
                ? detected
                : detectLanguage(
                    text
                  );


            /* ------------------------------------------------
               ANSWER
            ------------------------------------------------ */

            const answer =
              String(
                result?.answer ||
                  ""
              ).trim();


            /* ------------------------------------------------
               SOURCES
            ------------------------------------------------ */

            const sources =
              Array.isArray(
                result?.sources
              )
                ? result.sources
                : [];


            /* ------------------------------------------------
               BACKEND AUDIO
            ------------------------------------------------ */

            const rawAudioResponse =
              result?.audio_response ||
              result?.audio_response_path ||
              result?.audio_url ||
              null;


            const audioResponse =
              getAudioUrl(
                rawAudioResponse
              );


            /* ------------------------------------------------
               UPDATE LANGUAGE
            ------------------------------------------------ */

            const detectedIndex =
              LANGUAGES.findIndex(
                (item) =>
                  item.id ===
                  supported
              );


            if (
              detectedIndex !==
              -1
            ) {
              setRotationIndex(
                detectedIndex
              );
            }


            /*
             * Voice detection is now complete.
             */
            setIsAutoRotating(
              false
            );


            setLanguageId(
              supported
            );


            /*
             * IMPORTANT:
             *
             * Once the backend has detected the language,
             * the detected language becomes the active
             * language for this voice answer.
             *
             * The next voice recording will return to
             * "auto" unless the user manually selected
             * a language.
             */
            if (
              voiceLanguageMode === "auto"
            ) {
              setVoiceLanguageMode(
                "auto"
              );
            }


            /* ------------------------------------------------
               UPDATE VOICE STATE
            ------------------------------------------------ */

            setTranscript(
              text
            );

            setVoiceAnswer(
              answer
            );

            setVoiceSources(
              sources
            );

            setVoiceAudioResponse(
              audioResponse
            );

            /*
             * Chat.jsx consumes this single immutable-ish
             * result object to append the user question,
             * append the assistant answer, and speak the
             * answer in the detected language.
             */
            setVoiceResult({
              transcribed_text: text,
              detected_language: supported,
              answer,
              sources,
              audio_response: rawAudioResponse,
              audio_response_path:
                result?.audio_response_path ||
                null,
              audio_url:
                result?.audio_url ||
                null,
            });

            setIsTranscribing(
              false
            );


            /* ------------------------------------------------
               USER STATUS
            ------------------------------------------------ */

            setVoiceMessage(
              copy[supported]
                ?.voiceDetected ||
                copy.en.voiceDetected
            );


            /* ------------------------------------------------
               AUDIO PLAYBACK
            ------------------------------------------------

             * Playback is intentionally handled by Chat.jsx.
             * This prevents the context from speaking the same
             * answer twice when Chat.jsx adds the assistant
             * message and calls speakText().
             */

            /* ------------------------------------------------
               ANSWER READY
            ------------------------------------------------ */

            if (
              answer &&
              mountedRef.current
            ) {
              setVoiceMessage(
                copy[supported]
                  ?.answerReady ||
                  copy.en.answerReady
              );
            }

          } catch (error) {

            if (
              !mountedRef.current
            ) {
              return;
            }


            setIsTranscribing(
              false
            );

            setVoiceAnswer(
              ""
            );

            setVoiceSources(
              []
            );

            setVoiceAudioResponse(
              null
            );


            setVoiceMessage(
              error?.message ||
                t.voiceFailed
            );
          }
        };


      /* ---------------------------------------------------
         RECORDER ERROR
      --------------------------------------------------- */

      recorder.onerror =
        () => {

          stopMicrophoneStream();


          if (
            recorderRef.current ===
            recorder
          ) {
            recorderRef.current =
              null;
          }


          if (
            mountedRef.current
          ) {
            setIsListening(
              false
            );

            setIsTranscribing(
              false
            );

            setVoiceMessage(
              t.recordingFailed
            );
          }
        };


      recorderRef.current =
        recorder;


      /* ---------------------------------------------------
         START RECORDING
      --------------------------------------------------- */

      try {
        recorder.start();

        /*
         * Start live browser transcription alongside
         * MediaRecorder. This updates `transcript` while
         * the user is still speaking.
         */
        startLiveSpeechRecognition();
      } catch {
        recorderRef.current =
          null;

        stopLiveSpeechRecognition();

        stopMicrophoneStream();

        if (
          mountedRef.current
        ) {
          setIsListening(
            false
          );

          setVoiceMessage(
            t.startingFailed
          );
        }

        return false;
      }


      return true;
    };


  /* =======================================================
     STOP VOICE RECORDING
  ======================================================== */

  const stopVoiceRecording =
    () => {

      const recorder =
        recorderRef.current;


      if (
        !recorder ||
        recorder.state ===
          "inactive"
      ) {
        return false;
      }


      try {
        setVoiceMessage(
          t.processing
        );

        recorder.stop();

        return true;

      } catch {
        stopMicrophoneStream();

        recorderRef.current =
          null;


        if (
          mountedRef.current
        ) {
          setIsListening(
            false
          );

          setIsTranscribing(
            false
          );

          setVoiceMessage(
            t.stoppingFailed
          );
        }

        return false;
      }
    };


  /* =======================================================
     VOICE TOGGLE
  ======================================================== */

  const toggleVoice =
    async () => {

      /*
       * RECORDING → STOP
       */
      if (
        recorderRef.current &&
        recorderRef.current.state ===
          "recording"
      ) {
        return stopVoiceRecording();
      }


      /*
       * Do not start another recording while
       * backend is processing.
       */
      if (
        isTranscribing
      ) {
        return false;
      }


      /*
       * Stop current browser speech.
       */
      if (
        "speechSynthesis" in window
      ) {
        try {
          window.speechSynthesis.cancel();
        } catch {
          // Ignore.
        }
      }


      return startVoiceRecording();
    };


  /* =======================================================
     BACKEND AUDIO PLAYER
  ======================================================== */

  const playBackendAudio =
    async (audioPath) => {

      if (!audioPath) {
        return false;
      }


      try {

        /*
         * api.js already converts backend relative
         * paths to absolute URLs.
         *
         * getAudioUrl is used again here as a safe
         * fallback.
         */
        const audioUrl =
          getAudioUrl(
            audioPath
          );


        if (!audioUrl) {
          return false;
        }


        const audio =
          new Audio(
            audioUrl
          );


        audio.preload =
          "auto";


        await audio.play();


        return true;

      } catch (error) {

        /*
         * Do not throw.
         *
         * Backend audio failure should never
         * break the text answer.
         */
        console.warn(
          "Backend audio playback failed:",
          error
        );

        return false;
      }
    };


  /* =======================================================
     SPEECH SYNTHESIS

     IMPORTANT: Web Speech API does NOT reliably choose a voice
     from utterance.lang alone. On many Windows/Chrome systems,
     hi-IN / mr-IN can silently fall back to an English voice.

     We therefore explicitly select an installed voice whose
     language matches the requested answer language.
  ======================================================== */

  const normalizeSpeechLocale = (locale) => {
    return String(locale || "")
      .trim()
      .toLowerCase()
      .replace(/_/g, "-");
  };

  const getSpeechVoices = () => {
    if (!("speechSynthesis" in window)) {
      return [];
    }

    try {
      return window.speechSynthesis.getVoices() || [];
    } catch {
      return [];
    }
  };

  const findSpeechVoice = (languageCode, voices) => {
    const voiceList = Array.isArray(voices)
      ? voices
      : [];

    if (!voiceList.length) {
      return null;
    }

    const languagePrefixes = {
      en: ["en-in", "en-us", "en-gb", "en-au", "en-ca", "en"],
      hi: ["hi-in", "hi"],
      mr: ["mr-in", "mr"],
      gu: ["gu-in", "gu"],
      kn: ["kn-in", "kn"],
      sa: ["sa-in", "sa"],
    };

    const prefixes =
      languagePrefixes[languageCode] ||
      [languageCode];

    const normalizedVoices = voiceList.map((voice) => ({
      voice,
      lang: normalizeSpeechLocale(voice?.lang),
      name: String(voice?.name || "").toLowerCase(),
    }));

    /* Exact locale match first. */
    for (const prefix of prefixes) {
      const exact = normalizedVoices.find(
        (item) => item.lang === prefix
      );

      if (exact) {
        return exact.voice;
      }
    }

    /* Then accept the same language with another regional locale. */
    const languageMatch = normalizedVoices.find((item) =>
      prefixes.some(
        (prefix) =>
          item.lang === prefix ||
          item.lang.startsWith(`${prefix}-`)
      )
    );

    if (languageMatch) {
      return languageMatch.voice;
    }

    /*
     * Some browser voice names contain the language name even when
     * their lang metadata is incomplete. This is only a secondary
     * fallback; we never use an English voice for Hindi/Marathi.
     */
    const nameHints = {
      en: ["english", "english india", "india"],
      hi: ["hindi", "हिंदी", "हिन्दी"],
      mr: ["marathi", "मराठी"],
      gu: ["gujarati", "ગુજરાતી"],
      kn: ["kannada", "ಕನ್ನಡ"],
      sa: ["sanskrit", "संस्कृत"],
    };

    const hints = nameHints[languageCode] || [];

    const nameMatch = normalizedVoices.find((item) =>
      hints.some((hint) => item.name.includes(hint))
    );

    return nameMatch?.voice || null;
  };

  const speakText = (
    text,
    requestedLanguage = languageId
  ) => {

    if (
      !("speechSynthesis" in window)
    ) {
      return false;
    }


    if (!text) {
      return false;
    }


    /*
     * Stop previous speech.
     */
    try {
      window.speechSynthesis.cancel();
    } catch {
      // Ignore.
    }


    /*
     * Clean answer ONLY for speech.
     */
    const spokenText =
      cleanTextForSpeech(
        text
      );


    if (!spokenText) {
      return false;
    }


    /*
     * Normalize language.
     */
    const normalizedLanguage =
      normalizeLanguageId(
        requestedLanguage,
        "en"
      );


    const speechLanguage =
      LANGUAGES.find(
        (item) =>
          item.id ===
          normalizedLanguage
      );

    const targetLocale =
      speechLanguage?.speech ||
      "en-IN";

    const speakWithAvailableVoice = () => {
      const voices = getSpeechVoices();
      const selectedVoice =
        findSpeechVoice(
          normalizedLanguage,
          voices
        );

      /*
       * Hindi/Marathi must never intentionally use an English voice.
       * If no matching voice is installed, wait for the browser's
       * voiceschanged event instead of immediately speaking in the
       * browser's default English voice.
       */
      if (
        (normalizedLanguage === "hi" ||
          normalizedLanguage === "mr") &&
        !selectedVoice
      ) {
        return false;
      }

      const utterance =
        new SpeechSynthesisUtterance(
          spokenText
        );

      utterance.lang = targetLocale;

      if (selectedVoice) {
        utterance.voice = selectedVoice;
        utterance.lang =
          selectedVoice.lang ||
          targetLocale;
      }

      utterance.rate =
        normalizedLanguage === "hi" ||
        normalizedLanguage === "mr"
          ? 0.92
          : 0.95;

      utterance.pitch = 1;
      utterance.volume = 1;

      utterance.onerror = (event) => {
        console.warn(
          `Speech synthesis failed for ${normalizedLanguage}:`,
          event?.error || "unknown error"
        );
      };

      try {
        window.speechSynthesis.speak(
          utterance
        );
        return true;
      } catch (error) {
        console.warn(
          "Speech synthesis start failed:",
          error
        );
        return false;
      }
    };

    try {
      /*
       * Chrome/Edge can populate getVoices() asynchronously.
       * Try immediately first.
       */
      if (speakWithAvailableVoice()) {
        return true;
      }

      /*
       * If Hindi/Marathi voices are not loaded yet, wait for
       * voiceschanged and retry once. This prevents the common
       * English-fallback problem on the first TTS request.
       */
      if (
        normalizedLanguage === "hi" ||
        normalizedLanguage === "mr"
      ) {
        let settled = false;

        const retry = () => {
          if (settled) {
            return;
          }

          settled = true;

          try {
            window.speechSynthesis.removeEventListener(
              "voiceschanged",
              retry
            );
          } catch {
            // Ignore cleanup errors.
          }

          speakWithAvailableVoice();
        };

        try {
          window.speechSynthesis.addEventListener(
            "voiceschanged",
            retry,
            { once: true }
          );
        } catch {
          // Ignore unsupported event listener errors.
        }

        window.setTimeout(() => {
          if (!settled) {
            retry();
          }
        }, 1500);

        return true;
      }

      /*
       * English can safely use the browser's normal fallback if an
       * explicit English voice is not available.
       */
      const utterance =
        new SpeechSynthesisUtterance(
          spokenText
        );
      utterance.lang = targetLocale;
      utterance.rate = 0.95;
      utterance.pitch = 1;
      utterance.volume = 1;

      window.speechSynthesis.speak(
        utterance
      );

      return true;
    } catch (error) {
      console.warn(
        "Speech synthesis failed:",
        error
      );
      return false;
    }
  };


  /* =======================================================
     CLEAR VOICE RESULT
  ======================================================== */

  const clearVoiceResult =
    () => {

      setTranscript("");

      setVoiceAnswer("");

      setVoiceSources([]);

      setVoiceAudioResponse(null);

      setVoiceResult(null);

      setVoiceMessage("");
    };


  /* =======================================================
     CONTEXT VALUE
  ======================================================== */

  const value =
    useMemo(
      () => ({
        /*
         * Current language.
         */
        language,

        languageId,


        /*
         * Voice language mode.
         *
         * "auto"
         * "hi"
         * "mr"
         * "en"
         */
        voiceLanguageMode,


        /*
         * Available languages.
         */
        languages:
          LANGUAGES,


        /*
         * UI translations.
         */
        t,


        /*
         * Voice transcript.
         */
        transcript,

        setTranscript,


        /*
         * Voice answer.
         */
        voiceAnswer,


        /*
         * Voice sources.
         */
        voiceSources,


        /*
         * Backend-generated audio.
         */
        voiceAudioResponse,


        /*
         * Complete final voice result consumed by Chat.jsx.
         */
        voiceResult,

        setVoiceResult,


        /*
         * Recording state.
         */
        isListening,

        isTranscribing,


        /*
         * Automatic language rotation.
         */
        isAutoRotating,


        /*
         * Voice status.
         */
        voiceMessage,


        /*
         * Manual language change.
         */
        setLanguage,


        /*
         * Enable automatic voice detection.
         */
        enableAutoLanguage,


        /*
         * Browser TTS.
         */
        speakText,


        /*
         * Backend audio player.
         */
        playBackendAudio,


        /*
         * Clear previous voice response.
         */
        clearVoiceResult,


        /*
         * Existing Home.jsx compatibility.
         *
         * Home.jsx calls:
         *
         * detectFromSpeech()
         */
        detectFromSpeech:
          toggleVoice,
      }),
      [
        language,
        languageId,
        voiceLanguageMode,
        t,
        transcript,
        voiceAnswer,
        voiceSources,
        voiceAudioResponse,
        voiceResult,
        isListening,
        isTranscribing,
        isAutoRotating,
        voiceMessage,
      ]
    );


  return (
    <LanguageContext.Provider
      value={value}
    >
      {children}
    </LanguageContext.Provider>
  );
}


/* =========================================================
   HOOK
========================================================= */

export function useLanguage() {
  const context =
    useContext(
      LanguageContext
    );

  if (!context) {
    throw new Error(
      "useLanguage must be used inside LanguageProvider"
    );
  }

  return context;
}
