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
      "वॉइस रेकॉर्डिंग सुरू करता आले नाही. कृपया पुन्हा प्रयत्न करा.",

    stoppingFailed:
      "वॉइस रेकॉर्डिंग थांबवता आले नाही. कृपया पुन्हा प्रयत्न करा.",

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

  if (
    /^[-A-Za-z0-9\s.,?!'"()_\\\/:%&+₹$]+$/u.test(
      trimmed
    )
  ) {
    return "en";
  }

  if (/[\u0900-\u097F]/u.test(trimmed)) {
    const marathiMatches =
      MARATHI_WORD_PATTERNS.filter(
        (pattern) => pattern.test(trimmed)
      ).length;

    if (marathiMatches >= 2) {
      return "mr";
    }

    return "hi";
  }

  return "en";
}


/* =========================================================
   SPEECH CLEANING
========================================================= */

function cleanTextForSpeech(text) {
  if (!text) {
    return "";
  }

  let cleaned =
    String(text).normalize("NFKC");

  cleaned = cleaned
    .replace(
      /\\([*_#~`[\]()])/g,
      "$1"
    );

  cleaned =
    cleaned.replace(
      /https?:\/\/\S+/gi,
      " "
    );

  cleaned =
    cleaned.replace(
      /\bwww\.\S+/gi,
      " "
    );

  cleaned =
    cleaned.replace(
      /\[([^\]]+)\]\([^)]+\)/g,
      "$1"
    );

  cleaned =
    cleaned.replace(
      /```[\s\S]*?```/g,
      " "
    );

  cleaned =
    cleaned.replace(
      /`([^`]+)`/g,
      "$1"
    );

  cleaned =
    cleaned.replace(
      /`+/g,
      " "
    );

  cleaned =
    cleaned.replace(
      /\[\s*(?:Source|Document|Chunk|Evidence|Reference)\s*\d*\]/gi,
      " "
    );

  cleaned =
    cleaned.replace(
      /\[\s*\d+\s*\]/g,
      " "
    );

  cleaned =
    cleaned.replace(
      /^\s*(?:source|sources|reference|references|evidence)\s*:.*$/gim,
      " "
    );

  cleaned =
    cleaned.replace(
      /\b(?:source|retrieval|similarity score|confidence score)\s*[:=]\s*[^\n]+/gi,
      " "
    );

  cleaned =
    cleaned.replace(
      /^\s{0,4}#{1,6}\s*(.+)$/gm,
      "$1. "
    );

  cleaned =
    cleaned.replace(
      /#{1,6}/g,
      ""
    );

  cleaned =
    cleaned.replace(
      /\*\*\*([^*]+)\*\*\*/g,
      "$1"
    );

  cleaned =
    cleaned.replace(
      /\*\*([^*]+)\*\*/g,
      "$1"
    );

  cleaned =
    cleaned.replace(
      /\*([^*]+)\*/g,
      "$1"
    );

  cleaned =
    cleaned.replace(
      /___([^_]+)___/g,
      "$1"
    );

  cleaned =
    cleaned.replace(
      /__([^_]+)__/g,
      "$1"
    );

  cleaned =
    cleaned.replace(
      /_([^_]+)_/g,
      "$1"
    );

  cleaned =
    cleaned.replace(
      /^\s*[-*+•●▪◦‣]\s*/gm,
      ""
    );

  cleaned =
    cleaned.replace(
      /^\s*\d+[.)]\s*/gm,
      ""
    );

  cleaned =
    cleaned.replace(
      /^\s*\|?(?:\s*:?-{2,}:?\s*\|)+\s*$/gm,
      " "
    );

  cleaned =
    cleaned.replace(
      /[|]+/g,
      ". "
    );

  cleaned =
    cleaned.replace(
      /[_\-+=~^]{2,}/g,
      " "
    );

  cleaned =
    cleaned.replace(
      /[★☆◆◇■□●○►▶→←↑↓✓✔✕✖️🔹🔸🔺🔻]/gu,
      " "
    );

  cleaned =
    cleaned.replace(
      /<[^>]*>/g,
      " "
    );

  cleaned =
    cleaned.replace(
      /[*#_~`\\]/g,
      " "
    );

  cleaned =
    cleaned.replace(
      /[^\p{L}\p{N}\s.,?!:;'"()/%₹-]/gu,
      " "
    );

  cleaned =
    cleaned.replace(
      /\s+([,.?!:;])/g,
      "$1"
    );

  cleaned =
    cleaned.replace(
      /([.!?]){2,}/g,
      "$1"
    );

  cleaned =
    cleaned.replace(
      /\n+/g,
      ". "
    );

  cleaned =
    cleaned.replace(
      /\s+/g,
      " "
    );

  cleaned =
    cleaned.replace(
      /(^|\s)[.,:;!?]+(?=\s|$)/g,
      " "
    );

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
  const [languageId, setLanguageId] =
    useState("en");

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

  const [voiceResult, setVoiceResult] =
    useState(null);

  const recorderRef =
    useRef(null);

  const speechRecognitionRef =
    useRef(null);

  const speechRecognitionActiveRef =
    useRef(false);

  const microphoneStreamRef =
    useRef(null);

  const recordingSessionRef =
    useRef(0);

  const mountedRef =
    useRef(false);

  const activeRequestRef =
    useRef(0);


  /* =======================================================
     CURRENT LANGUAGE
  ======================================================== */

  const language =
    LANGUAGES.find(
      (item) =>
        item.id === languageId
    ) ||
    LANGUAGES.find(
      (item) =>
        item.id === "en"
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

    if (
      normalized === "auto"
    ) {
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
        (item) =>
          item.id === normalized
      );

    return (
      speechLanguage?.speech ||
      "en-IN"
    );
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
        speechRecognitionActiveRef.current =
          true;
      };

      recognition.onresult = (event) => {
        let liveText = "";

        for (
          let index = 0;
          index < event.results.length;
          index += 1
        ) {
          const result =
            event.results[index];

          if (
            result &&
            result[0] &&
            result[0].transcript
          ) {
            liveText +=
              result[0].transcript +
              " ";
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

      recognition.onerror =
        (event) => {
          console.warn(
            "Live speech recognition:",
            event?.error ||
              "unknown error"
          );
        };

      recognition.onend = () => {
        speechRecognitionActiveRef.current =
          false;

        if (
          mountedRef.current &&
          recorderRef.current?.state ===
            "recording"
        ) {
          try {
            recognition.start();
          } catch {
            // Ignore.
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
      recognition.onend = null;
      recognition.stop();
    } catch {
      // Ignore.
    }
  };


  /* =======================================================
     START VOICE RECORDING
  ======================================================== */

  const startVoiceRecording =
    async () => {

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

      if (
        recorderRef.current &&
        recorderRef.current.state !==
          "inactive"
      ) {
        return true;
      }

      recordingSessionRef.current += 1;

      const sessionId =
        recordingSessionRef.current;

      activeRequestRef.current += 1;

      setTranscript("");
      setVoiceAnswer("");
      setVoiceSources([]);
      setVoiceAudioResponse(null);
      setVoiceResult(null);
      setVoiceMessage("");
      setIsTranscribing(false);

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

      recorder.onstop =
        async () => {

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

          setIsListening(false);
          setIsTranscribing(true);

          setVoiceMessage(
            t.processing
          );

          if (
            chunks.length === 0
          ) {
            setIsTranscribing(false);

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

          if (
            audioBlob.size < 1000
          ) {
            setIsTranscribing(false);

            setVoiceMessage(
              t.recordingTooShort
            );

            return;
          }

          const requestId =
            ++activeRequestRef.current;

          try {
            const requestLanguage =
              voiceLanguageMode ===
              "auto"
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

            const backendLanguage =
              result?.detected_language ||
              result?.language ||
              "";

            let detected =
              normalizeLanguageId(
                backendLanguage,
                ""
              );

            if (
              !detected ||
              detected === "auto"
            ) {
              detected =
                detectLanguage(text);
            }

            if (
              voiceLanguageMode !==
                "auto" &&
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
                : detectLanguage(text);

            const answer =
              String(
                result?.answer ||
                  ""
              ).trim();

            const sources =
              Array.isArray(
                result?.sources
              )
                ? result.sources
                : [];

            const rawAudioResponse =
              result?.audio_response ||
              result?.audio_response_path ||
              result?.audio_url ||
              null;

            const audioResponse =
              getAudioUrl(
                rawAudioResponse
              );

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

            setIsAutoRotating(false);

            setLanguageId(
              supported
            );

            if (
              voiceLanguageMode ===
              "auto"
            ) {
              setVoiceLanguageMode(
                "auto"
              );
            }

            setTranscript(text);

            setVoiceAnswer(answer);

            setVoiceSources(
              sources
            );

            setVoiceAudioResponse(
              audioResponse
            );

            setVoiceResult({
              transcribed_text: text,
              detected_language:
                supported,
              answer,
              sources,
              audio_response:
                rawAudioResponse,
              audio_response_path:
                result?.audio_response_path ||
                null,
              audio_url:
                result?.audio_url ||
                null,
            });

            setIsTranscribing(false);

            setVoiceMessage(
              copy[supported]
                ?.voiceDetected ||
                copy.en.voiceDetected
            );

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

            setIsTranscribing(false);

            setVoiceAnswer("");

            setVoiceSources([]);

            setVoiceAudioResponse(
              null
            );

            setVoiceMessage(
              error?.message ||
                t.voiceFailed
            );
          }
        };

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
            setIsListening(false);

            setIsTranscribing(false);

            setVoiceMessage(
              t.recordingFailed
            );
          }
        };

      recorderRef.current =
        recorder;

      try {
        recorder.start();

        startLiveSpeechRecognition();

      } catch {
        recorderRef.current =
          null;

        stopLiveSpeechRecognition();

        stopMicrophoneStream();

        if (
          mountedRef.current
        ) {
          setIsListening(false);

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
          setIsListening(false);

          setIsTranscribing(false);

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

      if (
        recorderRef.current &&
        recorderRef.current.state ===
          "recording"
      ) {
        return stopVoiceRecording();
      }

      if (
        isTranscribing
      ) {
        return false;
      }

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
        console.warn(
          "Backend audio playback failed:",
          error
        );

        return false;
      }
    };


  /* =======================================================
     SPEECH SYNTHESIS
  ======================================================== */

  const normalizeSpeechLocale =
    (locale) => {
      return String(locale || "")
        .trim()
        .toLowerCase()
        .replace(/_/g, "-");
    };


  const getSpeechVoices = () => {
    if (
      !("speechSynthesis" in window)
    ) {
      return [];
    }

    try {
      return (
        window.speechSynthesis.getVoices() ||
        []
      );
    } catch {
      return [];
    }
  };


  /*
   * IMPORTANT:
   *
   * Select voice by LANGUAGE first.
   *
   * Hindi:
   *   hi-IN only
   *
   * Marathi:
   *   mr-IN only
   *
   * English:
   *   en-IN first
   *
   * This prevents Hindi/Marathi from ever
   * selecting an English voice.
   */

  const findSpeechVoice =
    (languageCode, voices) => {

      const voiceList =
        Array.isArray(voices)
          ? voices
          : [];

      if (
        !voiceList.length
      ) {
        return null;
      }

      const normalizedVoices =
        voiceList.map(
          (voice) => ({
            voice,
            lang:
              normalizeSpeechLocale(
                voice?.lang
              ),
            name:
              String(
                voice?.name || ""
              ).toLowerCase(),
          })
        );


      /* ---------------------------------------------------
         HINDI
      --------------------------------------------------- */

      if (
        languageCode === "hi"
      ) {
        const hindiVoice =
          normalizedVoices.find(
            (item) =>
              item.lang ===
              "hi-in"
          );

        if (hindiVoice) {
          return hindiVoice.voice;
        }

        const hindiNameVoice =
          normalizedVoices.find(
            (item) =>
              item.name.includes(
                "hindi"
              ) ||
              item.name.includes(
                "हिंदी"
              ) ||
              item.name.includes(
                "हिन्दी"
              )
          );

        return (
          hindiNameVoice?.voice ||
          null
        );
      }


      /* ---------------------------------------------------
         MARATHI
      --------------------------------------------------- */

      if (
        languageCode === "mr"
      ) {
        const marathiVoice =
          normalizedVoices.find(
            (item) =>
              item.lang ===
              "mr-in"
          );

        if (marathiVoice) {
          return marathiVoice.voice;
        }

        const marathiNameVoice =
          normalizedVoices.find(
            (item) =>
              item.name.includes(
                "marathi"
              ) ||
              item.name.includes(
                "मराठी"
              )
          );

        return (
          marathiNameVoice?.voice ||
          null
        );
      }


      /* ---------------------------------------------------
         GUJARATI
      --------------------------------------------------- */

      if (
        languageCode === "gu"
      ) {
        return (
          normalizedVoices.find(
            (item) =>
              item.lang ===
              "gu-in"
          )?.voice ||
          normalizedVoices.find(
            (item) =>
              item.name.includes(
                "gujarati"
              ) ||
              item.name.includes(
                "ગુજરાતી"
              )
          )?.voice ||
          null
        );
      }


      /* ---------------------------------------------------
         KANNADA
      --------------------------------------------------- */

      if (
        languageCode === "kn"
      ) {
        return (
          normalizedVoices.find(
            (item) =>
              item.lang ===
              "kn-in"
          )?.voice ||
          normalizedVoices.find(
            (item) =>
              item.name.includes(
                "kannada"
              ) ||
              item.name.includes(
                "ಕನ್ನಡ"
              )
          )?.voice ||
          null
        );
      }


      /* ---------------------------------------------------
         SANSKRIT
      --------------------------------------------------- */

      if (
        languageCode === "sa"
      ) {
        return (
          normalizedVoices.find(
            (item) =>
              item.lang ===
              "sa-in"
          )?.voice ||
          normalizedVoices.find(
            (item) =>
              item.name.includes(
                "sanskrit"
              ) ||
              item.name.includes(
                "संस्कृत"
              )
          )?.voice ||
          null
        );
      }


      /* ---------------------------------------------------
         ENGLISH
      --------------------------------------------------- */

      if (
        languageCode === "en"
      ) {
        return (
          normalizedVoices.find(
            (item) =>
              item.lang ===
              "en-in"
          )?.voice ||
          normalizedVoices.find(
            (item) =>
              item.lang ===
              "en-us"
          )?.voice ||
          normalizedVoices.find(
            (item) =>
              item.lang ===
              "en-gb"
          )?.voice ||
          null
        );
      }


      return null;
    };


  /* =======================================================
     SPEAK TEXT
  ======================================================== */

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
     * Clean answer for speech.
     */

    const spokenText =
      cleanTextForSpeech(
        text
      );

    if (!spokenText) {
      return false;
    }


    /*
     * Normalize requested language.
     */

    const normalizedLanguage =
      normalizeLanguageId(
        requestedLanguage,
        "en"
      );


    /*
     * Get target locale.
     */

    const speechLanguage =
      LANGUAGES.find(
        (item) =>
          item.id ===
          normalizedLanguage
      );

    const targetLocale =
      speechLanguage?.speech ||
      "en-IN";


    /*
     * Debug information.
     */

    console.log(
      "SANYUKT VAANI TTS:",
      {
        requestedLanguage,
        languageId,
        normalizedLanguage,
        targetLocale,
      }
    );


    const speakWithSelectedVoice =
      () => {

        const voices =
          getSpeechVoices();

        console.log(
          "Available voices:",
          voices.map(
            (voice) => ({
              name:
                voice.name,
              lang:
                voice.lang,
            })
          )
        );


        const selectedVoice =
          findSpeechVoice(
            normalizedLanguage,
            voices
          );


        console.log(
          "Selected TTS voice:",
          selectedVoice
            ? {
                name:
                  selectedVoice.name,
                lang:
                  selectedVoice.lang,
              }
            : null
        );


        /*
         * Hindi and Marathi MUST have
         * their own voice.
         *
         * Never use English fallback.
         */

        if (
          (
            normalizedLanguage === "hi" ||
            normalizedLanguage === "mr"
          ) &&
          !selectedVoice
        ) {
          console.warn(
            `No ${normalizedLanguage} voice available. Speech cancelled to prevent English fallback.`
          );

          return false;
        }


        const utterance =
          new SpeechSynthesisUtterance(
            spokenText
          );


        /*
         * Explicit language.
         */

        utterance.lang =
          targetLocale;


        /*
         * Explicit voice.
         */

        if (
          selectedVoice
        ) {
          utterance.voice =
            selectedVoice;

          utterance.lang =
            selectedVoice.lang ||
            targetLocale;
        }


        /*
         * Speech speed.
         */

        utterance.rate =
          normalizedLanguage === "hi" ||
          normalizedLanguage === "mr"
            ? 0.92
            : 0.95;

        utterance.pitch = 1;

        utterance.volume = 1;


        utterance.onstart =
          () => {
            console.log(
              "TTS started:",
              {
                language:
                  normalizedLanguage,
                voice:
                  selectedVoice?.name ||
                  "browser-default",
                locale:
                  utterance.lang,
              }
            );
          };


        utterance.onend =
          () => {
            console.log(
              "TTS finished."
            );
          };


        utterance.onerror =
          (event) => {
            console.warn(
              "Speech synthesis failed:",
              {
                language:
                  normalizedLanguage,
                error:
                  event?.error ||
                  "unknown error",
                voice:
                  selectedVoice?.name ||
                  "none",
                locale:
                  utterance.lang,
              }
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


    /*
     * Browser voices may be loaded asynchronously.
     *
     * First attempt immediately.
     */

    if (
      speakWithSelectedVoice()
    ) {
      return true;
    }


    /*
     * Hindi / Marathi:
     *
     * Wait for voiceschanged.
     */

    if (
      normalizedLanguage === "hi" ||
      normalizedLanguage === "mr"
    ) {

      let settled = false;


      const retry =
        () => {

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
            // Ignore.
          }


          speakWithSelectedVoice();
        };


      try {
        window.speechSynthesis.addEventListener(
          "voiceschanged",
          retry,
          {
            once: true,
          }
        );
      } catch {
        // Ignore.
      }


      window.setTimeout(
        () => {
          if (!settled) {
            retry();
          }
        },
        1500
      );


      return true;
    }


    /*
     * English / other languages:
     *
     * Explicit voice if available,
     * otherwise browser fallback.
     */

    const utterance =
      new SpeechSynthesisUtterance(
        spokenText
      );

    utterance.lang =
      targetLocale;

    utterance.rate =
      0.95;

    utterance.pitch = 1;

    utterance.volume = 1;


    try {
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

      setVoiceAudioResponse(
        null
      );

      setVoiceResult(null);

      setVoiceMessage("");
    };


  /* =======================================================
     CONTEXT VALUE
  ======================================================== */

  const value =
    useMemo(
      () => ({
        language,

        languageId,

        voiceLanguageMode,

        languages:
          LANGUAGES,

        t,

        transcript,

        setTranscript,

        voiceAnswer,

        voiceSources,

        voiceAudioResponse,

        voiceResult,

        setVoiceResult,

        isListening,

        isTranscribing,

        isAutoRotating,

        voiceMessage,

        setLanguage,

        enableAutoLanguage,

        speakText,

        playBackendAudio,

        clearVoiceResult,

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
