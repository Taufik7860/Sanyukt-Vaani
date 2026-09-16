const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000";

async function parseResponse(response, fallbackMessage) {
  if (response.ok) {
    return response.json();
  }

  const body = await response.json().catch(() => null);

  let errorMessage = fallbackMessage;

  if (typeof body?.detail === "string") {
    errorMessage = body.detail;
  } else if (Array.isArray(body?.detail)) {
    errorMessage = body.detail
      .map((item) => item.msg || JSON.stringify(item))
      .join(", ");
  } else if (body?.message) {
    errorMessage = body.message;
  }

  throw new Error(errorMessage);
}


// =========================
// Officer Authentication
// =========================

export async function officerLogin(email, password) {
  const response = await fetch(
    `${API_BASE_URL}/api/officer/login`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
      }),
    }
  );

  const result = await parseResponse(
    response,
    "Officer login failed"
  );

  if (result.access_token) {
    sessionStorage.setItem(
      "sanyukt-officer-token",
      result.access_token
    );
  }

  return result;
}


// =========================
// Officer Knowledge
// =========================

export async function getOfficerKnowledge() {
  const response = await fetch(
    `${API_BASE_URL}/api/officer/knowledge`,
    {
      headers: {
        Authorization: `Bearer ${
          sessionStorage.getItem("sanyukt-officer-token") || ""
        }`,
      },
    }
  );

  return parseResponse(
    response,
    "Unable to load knowledge updates"
  );
}


export async function createOfficerKnowledge(update) {
  const response = await fetch(
    `${API_BASE_URL}/api/officer/knowledge`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${
          sessionStorage.getItem("sanyukt-officer-token") || ""
        }`,
      },
      body: JSON.stringify(update),
    }
  );

  return parseResponse(
    response,
    "Unable to save knowledge update"
  );
}


export async function approveOfficerKnowledge(updateId) {
  const response = await fetch(
    `${API_BASE_URL}/api/officer/knowledge/${updateId}/approve`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${
          sessionStorage.getItem("sanyukt-officer-token") || ""
        }`,
      },
    }
  );

  return parseResponse(
    response,
    "Unable to approve knowledge update"
  );
}


// =========================
// Backend Health
// =========================

export async function healthCheck() {
  const response = await fetch(
    `${API_BASE_URL}/api/health`
  );

  return parseResponse(
    response,
    "Backend is not available"
  );
  
}


// =========================
// Sanyukt Vaani Chat
// =========================

export async function askSanyuktVaani(message, language = "auto") {
  const response = await fetch(`${API_BASE_URL}/api/chat/text`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message,
      language,
    }),
  });

  const rawText = await response.text();

  console.log("Backend status:", response.status);
  console.log("Backend response:", rawText);

  if (!response.ok) {
    throw new Error(rawText || `Request failed: ${response.status}`);
  }

  const data = JSON.parse(rawText);
  return parseResponse(data);
}

// =========================
// Sources
// =========================

export async function getSources() {
  const response = await fetch(
    `${API_BASE_URL}/api/sources`
  );

  return parseResponse(
    response,
    "Unable to load sources"
  );
}


// =========================
// Chat History
// =========================

export async function getHistory() {
  const response = await fetch(
    `${API_BASE_URL}/api/history`
  );

  return parseResponse(
    response,
    "Unable to load history"
  );
}


// =========================
// Document Upload
// =========================

export async function uploadDocument(file) {
  const formData = new FormData();

  formData.append("file", file);

  const response = await fetch(
    `${API_BASE_URL}/api/documents`,
    {
      method: "POST",
      body: formData,
    }
  );

  return parseResponse(
    response,
    "Document upload failed"
  );
}


// =========================
// Document Approval
// =========================

export async function approveDocument(documentId) {
  const response = await fetch(
    `${API_BASE_URL}/api/documents/${documentId}/approve`,
    {
      method: "POST",
    }
  );

  return parseResponse(
    response,
    "Document approval failed"
  );
}


// =========================
// Analytics
// =========================

export async function getAnalytics() {
  const response = await fetch(
    `${API_BASE_URL}/api/admin/metrics`
  );

  return parseResponse(
    response,
    "Unable to load analytics"
  );
}