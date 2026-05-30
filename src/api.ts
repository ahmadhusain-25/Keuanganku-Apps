import { getAccessToken, clearAccessToken } from "./auth";

export interface Transaction {
  id: string;
  date: string;
  type: string;
  category: string;
  amount: number;
  description: string;
}

const getApiUrl = (path: string): string => {
  const envApiUrl = (import.meta as any).env?.VITE_API_URL || "";
  if (envApiUrl) {
    return `${envApiUrl.replace(/\/$/, '')}${path}`;
  }
  
  if (typeof window !== "undefined") {
    const isCapacitor = (window as any).Capacitor !== undefined || 
                        window.location.protocol === "capacitor:" || 
                        window.location.protocol === "file:" || 
                        (window.location.hostname === "localhost" && window.location.port !== "3000" && window.location.port !== "5173");
    if (isCapacitor) {
      // Automatic fallback to the hosted Cloud Run server for backend API queries
      const fallbackUrl = "https://ais-pre-ndcddgji24pefrldtuhrjy-603348755685.asia-southeast1.run.app";
      return `${fallbackUrl}${path}`;
    }
  }
  return path;
};

const handleResponse = async (res: Response, defaultMessage: string) => {
  if (!res.ok) {
    let errorMessage = defaultMessage;
    let isAuthError = false;
    let errorCode = "";
    try {
      const errorData = await res.json();
      if (errorData?.error) {
        errorMessage = errorData.error;
      }
      if (errorData?.code) {
        errorCode = errorData.code;
      }
    } catch (_) {}

    const lowerError = errorMessage.toLowerCase();
    if (
      res.status === 401 ||
      errorCode === "GOOGLE_AUTH_ERROR" ||
      lowerError.includes("access token") ||
      lowerError.includes("invalid authentication credentials") ||
      lowerError.includes("auth") ||
      lowerError.includes("credential") ||
      lowerError.includes("unauthorized") ||
      lowerError.includes("session_expired") ||
      lowerError.includes("gaxioserror")
    ) {
      isAuthError = true;
    }

    if (isAuthError) {
      clearAccessToken();
      throw new Error("UNAUTHORIZED_SESSION_EXPIRED");
    }
    throw new Error(errorMessage);
  }
  return res.json();
};

const getRequiredToken = async () => {
  const token = await getAccessToken();
  if (!token) {
    throw new Error("UNAUTHORIZED_SESSION_EXPIRED");
  }
  return token;
};

export const fetchFinances = async (spreadsheetId?: string | null) => {
  const token = await getRequiredToken();
  const url = spreadsheetId && spreadsheetId !== "guest-spreadsheet" 
    ? getApiUrl(`/api/finances?spreadsheetId=${spreadsheetId}`) 
    : getApiUrl("/api/finances");
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return handleResponse(res, "Failed to fetch finances");
};

export const fetchUserSpreadsheets = async () => {
  const token = await getRequiredToken();
  const res = await fetch(getApiUrl("/api/drive/spreadsheets"), {
    headers: { Authorization: `Bearer ${token}` }
  });
  return handleResponse(res, "Failed to fetch spreadsheets from Google Drive");
};

export const scanGmailInvoices = async () => {
  const token = await getRequiredToken();
  const res = await fetch(getApiUrl("/api/gmail/scan"), {
    headers: { Authorization: `Bearer ${token}` }
  });
  return handleResponse(res, "Failed to scan emails");
};

export const sendEmailReport = async (to: string, subject: string, htmlBody: string) => {
  const token = await getRequiredToken();
  const res = await fetch(getApiUrl("/api/gmail/send"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ to, subject, htmlBody })
  });
  return handleResponse(res, "Failed to send email");
};

export const fetchChatSpaces = async () => {
  const token = await getRequiredToken();
  const res = await fetch(getApiUrl("/api/chat/spaces"), {
    headers: { Authorization: `Bearer ${token}` }
  });
  return handleResponse(res, "Failed to fetch Chat spaces");
};

export const sendChatMessage = async (spaceId: string, text: string, card?: any) => {
  const token = await getRequiredToken();
  const res = await fetch(getApiUrl("/api/chat/message"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ spaceId, text, card })
  });
  return handleResponse(res, "Failed to send message to Google Chat");
};

export const addTransaction = async (data: Omit<Transaction, "id"> & { spreadsheetId: string }) => {
  const token = await getRequiredToken();
  const res = await fetch(getApiUrl("/api/finances"), {
    method: "POST",
    headers: { 
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data)
  });
  return handleResponse(res, "Failed to add transaction");
};

export const addCalendarReminder = async (summary: string, description: string, dateStr: string) => {
  const token = await getRequiredToken();
  const startDateTime = new Date(dateStr).toISOString();
  // 1 hour later
  const endDateTime = new Date(new Date(dateStr).getTime() + 60 * 60 * 1000).toISOString();
  
  const res = await fetch(getApiUrl("/api/calendar/reminder"), {
    method: "POST",
    headers: { 
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ summary, description, startDateTime, endDateTime })
  });
  return handleResponse(res, "Failed to add reminder");
};

export const fetchBudget = async (spreadsheetId: string) => {
  const token = await getRequiredToken();
  const res = await fetch(getApiUrl(`/api/budget?spreadsheetId=${spreadsheetId}`), {
    headers: { Authorization: `Bearer ${token}` }
  });
  return handleResponse(res, "Failed to fetch budget");
};

export const updateBudget = async (spreadsheetId: string, budget: number) => {
  const token = await getRequiredToken();
  const res = await fetch(getApiUrl("/api/budget"), {
    method: "POST",
    headers: { 
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ spreadsheetId, budget })
  });
  return handleResponse(res, "Failed to update budget");
};

export const getAISummary = async (transactions: Transaction[]) => {
  const token = await getAccessToken();
  const res = await fetch(getApiUrl("/api/ai/summary"), {
    method: "POST",
    headers: { 
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ transactions })
  });
  return handleResponse(res, "Failed to get AI summary");
};

export const deleteTransaction = async (id: string, spreadsheetId: string) => {
  const token = await getRequiredToken();
  const res = await fetch(getApiUrl(`/api/finances/${id}?spreadsheetId=${spreadsheetId}`), {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
  return handleResponse(res, "Failed to delete transaction");
};

export const resetTransactions = async (spreadsheetId: string) => {
  const token = await getRequiredToken();
  const res = await fetch(getApiUrl(`/api/finances?spreadsheetId=${spreadsheetId}`), {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
  return handleResponse(res, "Failed to reset transactions");
};

export const sendAIChatMessage = async (
  message: string,
  history: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }>,
  transactions: Transaction[]
) => {
  const token = await getAccessToken();
  const res = await fetch(getApiUrl("/api/ai/chat"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ message, history, transactions })
  });
  return handleResponse(res, "Failed to get response from Owi Chat");
};

export const sendAIChatMessageStream = async (
  message: string,
  history: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }>,
  transactions: Transaction[],
  onChunk: (text: string) => void
) => {
  const token = await getAccessToken();
  const res = await fetch(getApiUrl("/api/ai/chat/stream"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ message, history, transactions })
  });

  if (!res.ok) {
    throw new Error("Failed to connect to Owi Chat stream");
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("ReadableStream not supported");

  const decoder = new TextDecoder();
  let finished = false;

  while (!finished) {
    const { value, done } = await reader.read();
    if (done) {
      finished = true;
      break;
    }

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split("\n");

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        try {
          const data = JSON.parse(line.slice(6));
          if (data.text) {
            onChunk(data.text);
          }
          if (data.done) {
            finished = true;
          }
        } catch (e) {
          console.error("Error parsing stream chunk:", e);
        }
      }
    }
  }
};

export const fetchAISuggestions = async (category: string, type: string) => {
  const token = await getAccessToken();
  const res = await fetch(getApiUrl("/api/ai/suggestions"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ category, type })
  });
  return handleResponse(res, "Failed to fetch AI suggestions");
};

export const fetchQdrantConfig = async () => {
  const token = await getAccessToken();
  const res = await fetch(getApiUrl("/api/qdrant/config"), {
    headers: { Authorization: `Bearer ${token}` }
  });
  return handleResponse(res, "Failed to fetch Qdrant configurations");
};

export const syncTransactionsToQdrant = async (transactions: Transaction[]) => {
  const token = await getAccessToken();
  const res = await fetch(getApiUrl("/api/qdrant/sync"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ transactions })
  });
  return handleResponse(res, "Failed syncing transactions to Qdrant");
};

export const searchSemanticTransactions = async (query: string, limit?: number) => {
  const token = await getAccessToken();
  const res = await fetch(getApiUrl("/api/qdrant/search"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ query, limit })
  });
  return handleResponse(res, "Failed to search semantic transactions via Qdrant");
};

export const triggerNodemailerReport = async (
  email: string,
  transactions: Transaction[],
  customSmtp?: { host?: string; port?: number; user?: string; pass?: string },
  shouldEmail?: boolean,
  shouldDownload?: boolean
) => {
  const token = await getAccessToken();
  const res = await fetch(getApiUrl("/api/reports/send-nodemailer"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email, transactions, customSmtp, shouldEmail, shouldDownload })
  });
  return handleResponse(res, "Failed to compile the report");
};

