import { getAccessToken } from "./auth";

export interface Transaction {
  id: string;
  date: string;
  type: string;
  category: string;
  amount: number;
  description: string;
}

export const fetchFinances = async () => {
  const token = await getAccessToken();
  const res = await fetch("/api/finances", {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error("Failed to fetch finances");
  return res.json();
};

export const addTransaction = async (data: Omit<Transaction, "id"> & { spreadsheetId: string }) => {
  const token = await getAccessToken();
  const res = await fetch("/api/finances", {
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
  
  const res = await fetch("/api/calendar/reminder", {
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
  const res = await fetch("/api/whatsapp/notify", {
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
  const res = await fetch("/api/ai/summary", {
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
  const res = await fetch(`/api/finances/${id}?spreadsheetId=${spreadsheetId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error("Failed to delete transaction");
  return res.json();
};

export const resetTransactions = async (spreadsheetId: string) => {
  const token = await getAccessToken();
  const res = await fetch(`/api/finances?spreadsheetId=${spreadsheetId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error("Failed to reset transactions");
  return res.json();
};
