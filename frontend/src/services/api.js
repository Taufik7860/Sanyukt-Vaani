// ============================================================
// SANYUKT VAANI - FRONTEND API SERVICE
// ============================================================
//
// Single communication layer between
// React frontend and FastAPI backend.
//
// Supports:
// - Text chat
// - Voice chat
// - Multilingual requests
// - Backend TTS audio
// - Officer authentication
// - Knowledge management
// - Sources
// - History
// - Documents
// - Analytics
//
// ============================================================


// ============================================================
// API BASE URL
// ============================================================

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000"
).replace(/\/+$/, "");


// ============================================================
// COMMON HELPERS
// ============================================================

function getOfficerToken() {
  return sessionStorage.getItem("sanyukt-officer-token") || "";
}


/**
 * Normalize language values coming from:
 * - LanguageContext
 * - browser
 * - backend
 * - UI
 *
 * Supported main languages:
 * en = English
 * hi = Hindi
 * mr = Marathi
 */
export function normalizeLanguage(language, fallback = "auto") {
  const value = String(language || "")
    .trim()
    .toLowerCase();

  const aliases = {
    auto: "auto",

    en: "en",
    english: "en",
    "en-in": "en",

    hi: "hi",
    hindi: "hi",
    "hi-in": "hi",

    mr: "mr",
    marathi: "mr",
    "mr-in": "mr",

    bn: "bn",
    bengali: "bn",

    gu: "gu",
    gujarati: "gu",

    kn: "kn",
    kannada: "kn",

    ml: "ml",
    malayalam: "ml",

    pa: "pa",
    punjabi: "pa",

    ta: "ta",
    tamil: "ta",

    te: "te",
    telugu: "te",

    ur: "ur",
    urdu: "ur",

    or: "or",
    odia: "or",

    as: "as",
    assamese: "as",

    sa: "sa",
    sanskrit: "sa",
  };

  return aliases[value] || fallback;
}


/**
 * Convert backend audio path into a complete URL.
 *
 * Backend may return:
 *   /static/tts_123.wav
 *
 * or:
 *   http://127.0.0.1:8000/static/tts_123.wav
 *
 * or:
 *   null
 */
export function getAudioUrl(audioPath) {
  if (!audioPath) {
    return null;
  }

  const value = String(audioPath).trim();

  if (!value) {
    return null;
  }

  // Already an absolute URL.
  if (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("blob:")
  ) {
    return value;
  }

  // Backend returned a relative URL.
  if (value.startsWith("/")) {
    return `${API_BASE_URL}${value}`;
  }

  return `${API_BASE_URL}/${value}`;
}


/**
 * Safely read an API response.
 *
 * FastAPI may return:
 *
 * {
 *   "detail": "message"
 * }
 *
 * or:
 *
 * {
 *   "message": "message"
 * }
 *
 * or validation errors:
 *
 * {
 *   "detail": [
 *      {
 *        "loc": [...],
 *        "msg": "...",
 *        "type": "..."
 *      }
 *   ]
 * }
 */
async function parseResponse(response, fallbackMessage) {
  let body = null;

  const contentType =
    response.headers.get("content-type") || "";

  try {
    if (contentType.includes("application/json")) {
      body = await response.json();
    } else {
      const text = await response.text();

      if (text) {
        body = {
          message: text,
        };
      }
    }
  } catch {
    body = null;
  }


  // ----------------------------------------------------------
  // Successful response
  // ----------------------------------------------------------

  if (response.ok) {
    return body;
  }


  // ----------------------------------------------------------
  // Error response
  // ----------------------------------------------------------

  let errorMessage = fallbackMessage;

  if (typeof body?.detail === "string") {
    errorMessage = body.detail;
  }

  else if (Array.isArray(body?.detail)) {
    errorMessage = body.detail
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }

        return (
          item?.msg ||
          item?.message ||
          JSON.stringify(item)
        );
      })
      .join(", ");
  }

  else if (typeof body?.message === "string") {
    errorMessage = body.message;
  }

  else if (typeof body?.error === "string") {
    errorMessage = body.error;
  }


  const error = new Error(errorMessage);

  error.status = response.status;
  error.response = body;

  throw error;
}


/**
 * Common GET/POST/etc request helper.
 */
async function apiRequest(
  endpoint,
  options = {},
  fallbackMessage = "Request failed"
) {
  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const isFormData =
      options.body instanceof FormData;

    const response = await fetch(url, {
      ...options,

      headers: {
        // IMPORTANT:
        // Never manually set Content-Type for FormData.
        // Browser must generate multipart/form-data boundary.
        ...(isFormData
          ? {}
          : {
              "Content-Type": "application/json",
            }),

        ...(options.headers || {}),
      },
    });

    return await parseResponse(
      response,
      fallbackMessage
    );
  }

  catch (error) {

    // Fetch itself failed.
    //
    // Usually means:
    // - backend not running
    // - wrong port
    // - CORS problem
    // - network problem
    // - connection refused

    if (error instanceof TypeError) {
      throw new Error(
        "Unable to connect to Sanyukt Vaani backend. " +
        "Please make sure the FastAPI server is running on " +
        `${API_BASE_URL}.`
      );
    }

    throw error;
  }
}


// ============================================================
// BACKEND HEALTH
// ============================================================

export async function healthCheck() {
  return apiRequest(
    "/api/health",
    {
      method: "GET",
    },
    "Backend is not available"
  );
}


// ============================================================
// SANYUKT VAANI - TEXT CHAT
// ============================================================

/**
 * Send a normal text question to the RAG backend.
 *
 * Backend:
 * POST /api/chat/text
 *
 * Form fields:
 * - query
 * - language
 * - user_id
 *
 * Example:
 *
 * askSanyuktVaani(
 *   "PACS के बारे में जानकारी दो",
 *   "hi"
 * )
 */
export async function askSanyuktVaani(
  message,
  language = "auto"
) {
  const query = String(message || "").trim();

  if (!query) {
    throw new Error(
      "Please enter a question before sending."
    );
  }

  const selectedLanguage =
    normalizeLanguage(language, "auto");

  const formData = new FormData();

  formData.append(
    "query",
    query
  );

  formData.append(
    "language",
    selectedLanguage
  );

  formData.append(
    "user_id",
    "guest_user"
  );

  return apiRequest(
    "/api/chat/text",
    {
      method: "POST",
      body: formData,
    },
    "Unable to generate an answer"
  );
}


// ============================================================
// SANYUKT VAANI - VOICE CHAT
// ============================================================

/**
 * Send recorded audio to the backend.
 *
 * Backend:
 * POST /api/chat/voice
 *
 * Form fields:
 * - file
 * - language
 *
 * Backend response expected:
 *
 * {
 *   transcribed_text: "...",
 *   detected_language: "hi",
 *   answer: "...",
 *   sources: [],
 *   audio_response: "/static/tts_xxx.wav"
 * }
 */
export async function transcribeVoice(
  audioBlob,
  language = "auto"
) {
  if (!audioBlob) {
    throw new Error(
      "No voice recording was provided."
    );
  }

  const selectedLanguage =
    normalizeLanguage(language, "auto");

  const formData = new FormData();

  // Preserve the actual browser recording type
  // whenever possible.
  const mimeType =
    audioBlob.type || "audio/webm";

  let extension = "webm";

  if (mimeType.includes("wav")) {
    extension = "wav";
  } else if (mimeType.includes("ogg")) {
    extension = "ogg";
  } else if (mimeType.includes("mp4")) {
    extension = "m4a";
  } else if (mimeType.includes("mpeg")) {
    extension = "mp3";
  }

  formData.append(
    "file",
    audioBlob,
    `voice.${extension}`
  );

  formData.append(
    "language",
    selectedLanguage
  );

  formData.append(
    "user_id",
    "guest_user"
  );

  const result = await apiRequest(
    "/api/chat/voice",
    {
      method: "POST",
      body: formData,
    },
    "Voice recognition failed"
  );

  // ----------------------------------------------------------
  // Normalize backend voice response
  // ----------------------------------------------------------

  if (!result || typeof result !== "object") {
    throw new Error(
      "Invalid response received from voice service."
    );
  }

  const audioResponse =
    result.audio_response ||
    result.audio_response_path ||
    result.audio_url ||
    null;

  return {
    ...result,

    transcribed_text:
      result.transcribed_text ||
      result.transcript ||
      "",

    detected_language:
      normalizeLanguage(
        result.detected_language ||
        result.language ||
        selectedLanguage,
        selectedLanguage
      ),

    answer:
      String(result.answer || "").trim(),

    sources:
      Array.isArray(result.sources)
        ? result.sources
        : [],

    audio_response:
      getAudioUrl(audioResponse),
  };
}


// ============================================================
// OFFICER AUTHENTICATION
// ============================================================

export async function officerLogin(
  email,
  password
) {
  if (!email || !password) {
    throw new Error(
      "Email and password are required."
    );
  }

  const result = await apiRequest(
    "/api/officer/login",
    {
      method: "POST",

      body: JSON.stringify({
        email,
        password,
      }),
    },
    "Officer login failed"
  );

  if (result?.access_token) {
    sessionStorage.setItem(
      "sanyukt-officer-token",
      result.access_token
    );
  }

  return result;
}


// ============================================================
// OFFICER KNOWLEDGE
// ============================================================

export async function getOfficerKnowledge() {
  const token = getOfficerToken();

  return apiRequest(
    "/api/officer/knowledge",
    {
      method: "GET",

      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    "Unable to load knowledge updates"
  );
}


export async function createOfficerKnowledge(
  update
) {
  const token = getOfficerToken();

  if (!update) {
    throw new Error(
      "Knowledge update data is required."
    );
  }

  return apiRequest(
    "/api/officer/knowledge",
    {
      method: "POST",

      headers: {
        Authorization: `Bearer ${token}`,
      },

      body: JSON.stringify(update),
    },
    "Unable to save knowledge update"
  );
}


export async function approveOfficerKnowledge(
  updateId
) {
  const token = getOfficerToken();

  if (!updateId) {
    throw new Error(
      "Knowledge update ID is required."
    );
  }

  return apiRequest(
    `/api/officer/knowledge/${encodeURIComponent(
      updateId
    )}/approve`,
    {
      method: "POST",

      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    "Unable to approve knowledge update"
  );
}


// ============================================================
// SOURCES
// ============================================================

export async function getSources() {
  return apiRequest(
    "/api/sources",
    {
      method: "GET",
    },
    "Unable to load sources"
  );
}


// ============================================================
// CHAT HISTORY
// ============================================================

export async function getHistory() {
  return apiRequest(
    "/api/history",
    {
      method: "GET",
    },
    "Unable to load history"
  );
}


// ============================================================
// DOCUMENT UPLOAD
// ============================================================

export async function uploadDocument(
  file
) {
  if (!file) {
    throw new Error(
      "Please select a document."
    );
  }

  const formData = new FormData();

  formData.append(
    "file",
    file
  );

  return apiRequest(
    "/api/documents",
    {
      method: "POST",
      body: formData,
    },
    "Document upload failed"
  );
}


// ============================================================
// DOCUMENT APPROVAL
// ============================================================

export async function approveDocument(
  documentId
) {
  if (!documentId) {
    throw new Error(
      "Document ID is required."
    );
  }

  return apiRequest(
    `/api/documents/${encodeURIComponent(
      documentId
    )}`,
    {
      method: "POST",
    },
    "Document approval failed"
  );
}


// ============================================================
// ANALYTICS
// ============================================================

export async function getAnalytics() {
  return apiRequest(
    "/api/admin/metrics",
    {
      method: "GET",
    },
    "Unable to load analytics"
  );
}


// ============================================================
// UTILITY
// ============================================================

/**
 * Return configured backend URL.
 */
export function getApiBaseUrl() {
  return API_BASE_URL;
}