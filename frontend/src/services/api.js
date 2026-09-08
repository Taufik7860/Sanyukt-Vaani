const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000";

async function parseResponse(response, fallbackMessage) {
  if (response.ok) return response.json();
  const body = await response.json().catch(() => null);
  throw new Error(body?.detail || fallbackMessage);
}

export async function officerLogin(email, password) {
  const response = await fetch(`${API_BASE_URL}/api/officer/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const result = await parseResponse(response, "Officer login failed");
  sessionStorage.setItem("sanyukt-officer-token", result.access_token);
  return result;
}

export async function getOfficerKnowledge() {
  const response = await fetch(`${API_BASE_URL}/api/officer/knowledge`, {
    headers: { Authorization: `Bearer ${sessionStorage.getItem("sanyukt-officer-token") || ""}` },
  });
  return parseResponse(response, "Unable to load knowledge updates");
}

export async function createOfficerKnowledge(update) {
  const response = await fetch(`${API_BASE_URL}/api/officer/knowledge`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${sessionStorage.getItem("sanyukt-officer-token") || ""}`,
    },
    body: JSON.stringify(update),
  });
  return parseResponse(response, "Unable to save knowledge update");
}

export async function approveOfficerKnowledge(updateId) {
  const response = await fetch(`${API_BASE_URL}/api/officer/knowledge/${updateId}/approve`, {
    method: "POST",
    headers: { Authorization: `Bearer ${sessionStorage.getItem("sanyukt-officer-token") || ""}` },
  });
  return parseResponse(response, "Unable to approve knowledge update");
}


export async function healthCheck() {

  const response = await fetch(
    `${API_BASE_URL}/api/health`
  );

  if (!response.ok) {

    throw new Error(
      "Backend is not available"
    );
 
  }

  return response.json();
}


export async function askSanyuktVaani(
  message,
  language = "auto"
) {

  const response = await fetch(
    `${API_BASE_URL}/api/chat`,
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json"
      },

      body: JSON.stringify({
        message,
        language
      })
    }
  );


  if (!response.ok) {

    throw new Error(
      "Chat request failed"
    );

  }


  return response.json();
}


export async function getSources() {

  const response = await fetch(
    `${API_BASE_URL}/api/sources`
  );

  if (!response.ok) {

    throw new Error(
      "Unable to load sources"
    );

  }

  return response.json();
}


export async function getHistory() {

  const response = await fetch(
    `${API_BASE_URL}/api/history`
  );

  if (!response.ok) {

    throw new Error(
      "Unable to load history"
    );

  }

  return response.json();
}


export async function uploadDocument(
  file
) {

  const formData =
    new FormData();

  formData.append(
    "file",
    file
  );


  const response = await fetch(
    `${API_BASE_URL}/api/documents`,
    {
      method: "POST",
      body: formData
    }
  );


  if (!response.ok) {

    throw new Error(
      "Document upload failed"
    );

  }


  return response.json();
}


export async function approveDocument(
  documentId
) {

  const response = await fetch(
    `${API_BASE_URL}/api/documents/${documentId}/approve`,
    {
      method: "POST"
    }
  );


  if (!response.ok) {

    throw new Error(
      "Document approval failed"
    );

  }


  return response.json();
}


export async function getAnalytics() {

  const response = await fetch(
    `${API_BASE_URL}/api/admin/metrics`
  );

  if (!response.ok) {

    throw new Error(
      "Unable to load analytics"
    );

  }

  return response.json();
}