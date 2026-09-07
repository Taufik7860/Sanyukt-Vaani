const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:8000";


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