import { getAccessToken } from "./auth";

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

export const fetchFinances = async (spreadsheetId?: string | null) => {
  const token = await getAccessToken();
  const url = spreadsheetId && spreadsheetId !== "guest-spreadsheet" 
    ? getApiUrl(`/api/finances?spreadsheetId=${spreadsheetId}`) 
    : getApiUrl("/api/finances");
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error("Failed to fetch finances");
  return res.json();
};

export const fetchUserSpreadsheets = async () => {
  const token = await getAccessToken();
  const res = await fetch(getApiUrl("/api/drive/spreadsheets"), {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error("Failed to fetch spreadsheets from Google Drive");
  return res.json();
};

export const scanGmailInvoices = async () => {
  const token = await getAccessToken();
  const res = await fetch(getApiUrl("/api/gmail/scan"), {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error("Failed to scan emails");
  return res.json();
};

export const sendEmailReport = async (to: string, subject: string, htmlBody: string) => {
  const token = await getAccessToken();
  const res = await fetch(getApiUrl("/api/gmail/send"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ to, subject, htmlBody })
  });
  if (!res.ok) throw new Error("Failed to send email");
  return res.json();
};

export const fetchChatSpaces = async () => {
  const token = await getAccessToken();
  const res = await fetch(getApiUrl("/api/chat/spaces"), {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error("Failed to fetch Chat spaces");
  return res.json();
};

export const sendChatMessage = async (spaceId: string, text: string, card?: any) => {
  const token = await getAccessToken();
  const res = await fetch(getApiUrl("/api/chat/message"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ spaceId, text, card })
  });
  if (!res.ok) throw new Error("Failed to send message to Google Chat");
  return res.json();
};

export const addTransaction = async (data: Omit<Transaction, "id"> & { spreadsheetId: string }) => {
  const token = await getAccessToken();
  const res = await fetch(getApiUrl("/api/finances"), {
    method: "POST",
    headers: { 
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error("Failed to add transaction");
  return res.json();
};

export const addCalendarReminder = async (summary: string, description: string, dateStr: string) => {
  const token = await getAccessToken();
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
  if (!res.ok) throw new Error("Failed to add reminder");
  return res.json();
};

export const sendWANotification = async (phone: string, message: string) => {
  const token = await getAccessToken();
  const res = await fetch(getApiUrl("/api/whatsapp/notify"), {
    method: "POST",
    headers: { 
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ phone, message })
  });
  if (!res.ok) throw new Error("Failed to prepare WA notification");
  return res.json();
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
  if (!res.ok) throw new Error("Failed to get AI summary");
  return res.json();
};

export const deleteTransaction = async (id: string, spreadsheetId: string) => {
  const token = await getAccessToken();
  const res = await fetch(getApiUrl(`/api/finances/${id}?spreadsheetId=${spreadsheetId}`), {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error("Failed to delete transaction");
  return res.json();
};

export const resetTransactions = async (spreadsheetId: string) => {
  const token = await getAccessToken();
  const res = await fetch(getApiUrl(`/api/finances?spreadsheetId=${spreadsheetId}`), {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error("Failed to reset transactions");
  return res.json();
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
  if (!res.ok) throw new Error("Failed to get response from Owi AI Chat");
  return res.json();
};
