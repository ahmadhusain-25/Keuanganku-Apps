import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { google } from "googleapis";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import OpenAI from "openai";
import { QdrantClient } from "@qdrant/js-client-rest";

const PORT = 3000;
const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
}) : null;

let openaiClient: OpenAI | null = null;
function getOpenAIClient() {
  if (!openaiClient && process.env.OPENROUTER_API_KEY) {
    openaiClient = new OpenAI({ 
      apiKey: process.env.OPENROUTER_API_KEY, 
      baseURL: "https://openrouter.ai/api/v1" 
    });
  }
  return openaiClient;
}

let nvidiaClient: OpenAI | null = null;
function getNvidiaClient() {
  if (!nvidiaClient && process.env.NVIDIA_API_KEY) {
    nvidiaClient = new OpenAI({ 
      apiKey: process.env.NVIDIA_API_KEY, 
      baseURL: "https://integrate.api.nvidia.com/v1" 
    });
  }
  return nvidiaClient;
}

let cachedCloudflareAccountId: string | null = null;

async function getCloudflareAccountId(apiKey: string): Promise<string | null> {
  if (cachedCloudflareAccountId) return cachedCloudflareAccountId;
  
  if (process.env.CLOUDFLARE_ACCOUNT_ID) {
    cachedCloudflareAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    return cachedCloudflareAccountId;
  }

  try {
    console.log("[Cloudflare AI] Finding account ID from API token...");
    const response = await fetch("https://api.cloudflare.com/client/v4/accounts", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      }
    });

    if (response.ok) {
      const data: any = await response.json();
      if (data.success && data.result && data.result.length > 0) {
        cachedCloudflareAccountId = data.result[0].id;
        console.log(`[Cloudflare AI] Detected account ID: ${cachedCloudflareAccountId}`);
        return cachedCloudflareAccountId;
      }
    }
  } catch (err: any) {
    console.error("[Cloudflare AI] Error fetching account ID:", err.message || err);
  }

  // Fallback: If 32 hex chars, assume it may also be the account ID itself
  if (apiKey && apiKey.length === 32) {
    console.log("[Cloudflare AI] API key is 32 chars, using it as fallback Cloudflare Account ID.");
    return apiKey;
  }

  return null;
}

async function generateCloudflareAIContent(
  apiKey: string,
  params: { messages?: Array<{role: string, content: string}>, prompt?: string }
): Promise<string | null> {
  const accountId = await getCloudflareAccountId(apiKey);
  if (!accountId) {
    console.warn("[Cloudflare AI] No account ID could be determined.");
    return null;
  }

  // Use recommended text generation model: @cf/meta/llama-3.1-8b-instruct
  const model = "@cf/meta/llama-3.1-8b-instruct";
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;

  try {
    let bodyMessages;
    if (params.messages) {
      bodyMessages = params.messages;
    } else {
      bodyMessages = [
        { role: "user", content: params.prompt || "" }
      ];
    }

    console.log(`[Cloudflare AI] Running model ${model} at ${url}...`);
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messages: bodyMessages
      })
    });

    if (res.ok) {
      const data: any = await res.json();
      if (data.success && data.result) {
        return data.result.response || "";
      } else {
        console.warn("[Cloudflare AI] Direct run response structure was unexpected:", data);
        if (data.errors && data.errors.length > 0) {
          throw new Error(data.errors[0].message || "Unknown Cloudflare AI error");
        }
      }
    } else {
      const errText = await res.text();
      console.error(`[Cloudflare AI] HTTP failure: ${res.status}`, errText);
    }
  } catch (e: any) {
    console.error("[Cloudflare AI] Execution failed:", e.message || e);
  }
  return null;
}

async function streamCloudflareAI(
  apiKey: string,
  params: { messages?: Array<{role: string, content: string}>, prompt?: string },
  onChunk: (text: string) => void
): Promise<boolean> {
  const accountId = await getCloudflareAccountId(apiKey);
  if (!accountId) return false;

  const model = "@cf/meta/llama-3.1-8b-instruct";
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;

  try {
    let bodyMessages;
    if (params.messages) {
      bodyMessages = params.messages;
    } else {
      bodyMessages = [
        { role: "user", content: params.prompt || "" }
      ];
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messages: bodyMessages,
        stream: true
      })
    });

    if (!response.ok) {
      console.error(`[Cloudflare AI Stream] HTTP Error: ${response.status}`);
      return false;
    }

    const readerStream = response.body;
    if (!readerStream) {
      console.warn("[Cloudflare AI Stream] No response body found.");
      return false;
    }

    // Use standard getReader for type compatibility
    const reader = readerStream.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";
    let done = false;

    while (!done) {
      const { value, done: isDone } = await reader.read();
      done = isDone;
      if (value) {
        buffer += decoder.decode(value, { stream: !done });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          if (trimmed === "data: [DONE]") continue;

          if (trimmed.startsWith("data: ")) {
            try {
              const jsonText = trimmed.slice(6);
              if (jsonText.startsWith("{")) {
                const parsed = JSON.parse(jsonText);
                if (parsed.response) {
                  onChunk(parsed.response);
                }
              }
            } catch (e) {
              // ignore
            }
          }
        }
      }
    }
    return true;
  } catch (err: any) {
    console.error("[Cloudflare AI Stream] Fatal Error:", err.message || err);
    return false;
  }
}


// Set up Google Drive, Sheets, Calendar wrappers
function getAuthClient(authHeader: string | undefined) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    const err: any = new Error("Missing or invalid Authorization header");
    err.status = 401;
    throw err;
  }
  const token = authHeader.split(" ")[1];
  if (!token || token === "null" || token === "undefined" || token.trim() === "") {
    const err: any = new Error("Invalid or empty Google OAuth access token");
    err.status = 401;
    throw err;
  }
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: token });
  return auth;
}

function handleGoogleError(res: express.Response, e: any, contextMsg: string) {
  const status = e.status || e.code || e.response?.status || 500;
  console.error(`${contextMsg}: [Status ${status}] ${e.message || e}`);
  
  const isAuthError = 
    status === 401 ||
    e.message?.toLowerCase().includes("invalid authentication credentials") ||
    e.message?.toLowerCase().includes("invalid credentials") ||
    e.message?.toLowerCase().includes("expected oauth 2 access token") ||
    e.message?.toLowerCase().includes("unauthorized") ||
    e.message?.toLowerCase().includes("auth");

  if (isAuthError) {
    return res.status(401).json({ 
      error: "Sesi Google Anda telah kedaluwarsa. Silakan lakukan hubungkan kembali (reconnect) akun Anda.", 
      code: "GOOGLE_AUTH_ERROR",
      details: e.message 
    });
  }
  return res.status(500).json({ error: e.message });
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "Keuanganku API Running" });
  });

  async function getResolvedSpreadsheetId(auth: any, spreadsheetId: string | undefined): Promise<string> {
    const drive = google.drive({ version: "v3", auth });
    const sheets = google.sheets({ version: "v4", auth });

    let fileId = spreadsheetId;

    if (!fileId || fileId === "undefined" || fileId === "null" || fileId === "monthly") {
      // Find or create the folder "Aplikasi_Keuanganku"
      let folderId = "";
      const folderSearchRes = await drive.files.list({
        q: "name='Aplikasi_Keuanganku' and mimeType='application/vnd.google-apps.folder' and trashed=false",
        spaces: "drive",
      });

      if (folderSearchRes.data.files && folderSearchRes.data.files.length > 0) {
        folderId = folderSearchRes.data.files[0].id!;
      } else {
        const createFolderRes = await drive.files.create({
          requestBody: {
            name: "Aplikasi_Keuanganku",
            mimeType: "application/vnd.google-apps.folder",
          },
        });
        folderId = createFolderRes.data.id!;
      }

      const date = new Date();
      const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
      const fileName = `Keuanganku_Data_${monthNames[date.getMonth()]}_${date.getFullYear()}`;

      // Find or create the spreadsheet for the current month
      const searchRes = await drive.files.list({
        q: `name='${fileName}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false and '${folderId}' in parents`,
        spaces: "drive",
      });

      if (searchRes.data.files && searchRes.data.files.length > 0) {
        fileId = searchRes.data.files[0].id!;
      } else {
        // Create it
        const createRes = await sheets.spreadsheets.create({
          requestBody: {
            properties: { title: fileName },
            sheets: [
              {
                properties: { title: "Transactions" },
                data: [
                  {
                    startRow: 0,
                    startColumn: 0,
                    rowData: [
                      {
                        values: [
                          { userEnteredValue: { stringValue: "ID" } },
                          { userEnteredValue: { stringValue: "Date" } },
                          { userEnteredValue: { stringValue: "Type" } },
                          { userEnteredValue: { stringValue: "Category" } },
                          { userEnteredValue: { stringValue: "Amount" } },
                          { userEnteredValue: { stringValue: "Description" } },
                        ]
                      } // headers
                    ]
                  } // Data
                ]
              }
            ]
          }
        });
        fileId = createRes.data.spreadsheetId!;
        
        // Move to folder
        const currentFile = await drive.files.get({
          fileId: fileId,
          fields: 'parents'
        });
        const previousParents = currentFile.data.parents?.join(',') || '';
        await drive.files.update({
          fileId: fileId,
          addParents: folderId,
          removeParents: previousParents,
        });
      }
    }
    return fileId!;
  }

  // Finance Integration - Setup or read
  app.get("/api/finances", async (req, res) => {
    try {
      const auth = getAuthClient(req.headers.authorization);
      const sheets = google.sheets({ version: "v4", auth });

      const requestedId = req.query.spreadsheetId as string;
      const fileId = await getResolvedSpreadsheetId(auth, requestedId);

      // Read Data
      const getRes = await sheets.spreadsheets.values.get({
        spreadsheetId: fileId,
        range: "Transactions!A:F",
      });
      
      const rows = getRes.data.values || [];
      const transactions = rows.slice(1).map(row => ({
        id: row[0] || "",
        date: row[1] || "",
        type: row[2] || "",
        category: row[3] || "",
        amount: Number(row[4] || 0),
        description: row[5] || "",
      }));

      res.json({ spreadsheetId: fileId, transactions });
    } catch (e: any) {
      handleGoogleError(res, e, "Error fetching finances database");
    }
  });

  // Adding transaction
  app.post("/api/finances", async (req, res) => {
    try {
      const auth = getAuthClient(req.headers.authorization);
      const sheets = google.sheets({ version: "v4", auth });
      const { spreadsheetId, date, type, category, amount, description } = req.body;
      const fileId = await getResolvedSpreadsheetId(auth, spreadsheetId);
      const id = Date.now().toString();

      await sheets.spreadsheets.values.append({
        spreadsheetId: fileId,
        range: "Transactions!A:F",
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [[id, date, type, category, amount, description]],
        },
      });

      res.json({ success: true, id });
    } catch (e: any) {
      handleGoogleError(res, e, "Error adding transaction");
    }
  });

  // clear all transactions
  app.delete("/api/finances", async (req, res) => {
    try {
      const auth = getAuthClient(req.headers.authorization);
      const sheets = google.sheets({ version: "v4", auth });
      const requestedId = req.query.spreadsheetId as string;
      const spreadsheetId = await getResolvedSpreadsheetId(auth, requestedId);
      
      // Get current rows to check existing data range
      const getRes = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "Transactions!A:A",
      });
      const rows = getRes.data.values || [];
      
      if (rows.length > 1) {
        await sheets.spreadsheets.values.clear({
          spreadsheetId,
          range: `Transactions!A2:F${rows.length}`,
        });
      }
      res.json({ success: true });
    } catch (e: any) {
      handleGoogleError(res, e, "Error clearing finance transactions");
    }
  });

  // delete single transaction
  app.delete("/api/finances/:id", async (req, res) => {
    try {
      const auth = getAuthClient(req.headers.authorization);
      const sheets = google.sheets({ version: "v4", auth });
      const requestedId = req.query.spreadsheetId as string;
      const spreadsheetId = await getResolvedSpreadsheetId(auth, requestedId);
      const txId = req.params.id;

      // finding the row
      const getRes = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "Transactions!A:A",
      });
      const rows = getRes.data.values || [];
      const rowIndex = rows.findIndex(row => row[0] === txId);

      if (rowIndex !== -1) {
        const sheet = await sheets.spreadsheets.get({ spreadsheetId });
        const sheetId = sheet.data.sheets?.[0]?.properties?.sheetId;

        if (sheetId !== undefined) {
          await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            requestBody: {
              requests: [
                {
                  deleteDimension: {
                    range: {
                      sheetId,
                      dimension: "ROWS",
                      startIndex: rowIndex,
                      endIndex: rowIndex + 1,
                    }
                  }
                }
              ]
            }
          });
        }
      }

      res.json({ success: true });
    } catch (e: any) {
      handleGoogleError(res, e, "Error deleting trade transaction");
    }
  });

  // Adding reminder
  app.post("/api/calendar/reminder", async (req, res) => {
    try {
      const auth = getAuthClient(req.headers.authorization);
      const calendar = google.calendar({ version: "v3", auth });
      const { summary, description, startDateTime, endDateTime } = req.body;

      const event = {
        summary,
        description,
        start: { dateTime: startDateTime, timeZone: "Asia/Jakarta" },
        end: { dateTime: endDateTime, timeZone: "Asia/Jakarta" },
      };

      const resCalendar = await calendar.events.insert({
         calendarId: "primary",
         requestBody: event,
      });

      res.json({ success: true, eventLink: resCalendar.data.htmlLink });
    } catch (e: any) {
      handleGoogleError(res, e, "Error creating calendar reminder");
    }
  });

  // Budget management
  app.get("/api/budget", async (req, res) => {
    try {
      const auth = getAuthClient(req.headers.authorization);
      const sheets = google.sheets({ version: "v4", auth });
      const requestedId = req.query.spreadsheetId as string;
      const spreadsheetId = await getResolvedSpreadsheetId(auth, requestedId);
      
      try {
        const getRes = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: "Settings!B1",
        });
        res.json({ budget: Number(getRes.data.values?.[0]?.[0] || 0) });
      } catch (e: any) {
        // If sheet doesn't exist, return 0 budget
        res.json({ budget: 0 });
      }
    } catch (e: any) {
      handleGoogleError(res, e, "Error fetching budget");
    }
  });

  app.post("/api/budget", async (req, res) => {
    try {
      const auth = getAuthClient(req.headers.authorization);
      const sheets = google.sheets({ version: "v4", auth });
      const { spreadsheetId: requestedId, budget } = req.body;
      const spreadsheetId = await getResolvedSpreadsheetId(auth, requestedId);
      
      // Try to update, if fail, try to add sheet
      try {
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: "Settings!B1",
          valueInputOption: "USER_ENTERED",
          requestBody: { values: [[budget]] }
        });
      } catch(e: any) {
        // Create sheet
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: {
            requests: [{ addSheet: { properties: { title: "Settings" } } }]
          }
        });
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: "Settings!B1",
          valueInputOption: "USER_ENTERED",
          requestBody: { values: [[budget]] }
        });
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: "Settings!A1",
          valueInputOption: "USER_ENTERED",
          requestBody: { values: [["Batas Budget Bulanan"]] }
        });
      }
      res.json({ success: true });
    } catch (e: any) {
      handleGoogleError(res, e, "Error updating budget");
    }
  });

  app.post("/api/wa/notify", async (req, res) => {
    try {
      const { phone, message } = req.body;
      if (!phone || !message) {
        return res.status(400).json({ error: "Phone number and message are required." });
      }

      // Fonnte API Key provided by user
      const fonnteToken = process.env.FONNTE_API_KEY || "o2ibg27orvbi75tc4fDi";

      console.log(`[Fonnte Bot] Sending WA message to ${phone}...`);
      
      const params = new URLSearchParams();
      params.append('target', phone);
      params.append('message', message);
      params.append('delay', '2'); // optional delay

      const response = await fetch("https://api.fonnte.com/send", {
        method: "POST",
        headers: {
          "Authorization": fonnteToken,
        },
        body: params
      });

      const responseData = await response.json();
      
      if (!responseData.status) {
        throw new Error(responseData.reason || "Failed to send WA message via Fonnte");
      }

      return res.status(200).json({ success: true, fonnteResponse: responseData });
    } catch (error: any) {
      console.warn("[Fonnte Bot] Warning:", error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Drive Spreadsheet Picker Endpoint
  app.get("/api/drive/spreadsheets", async (req, res) => {
    try {
      const auth = getAuthClient(req.headers.authorization);
      const drive = google.drive({ version: "v3", auth });
      const filesRes = await drive.files.list({
        q: "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false",
        spaces: "drive",
        pageSize: 50,
        fields: "files(id, name, createdTime, modifiedTime)",
      });
      res.json({ files: filesRes.data.files || [] });
    } catch (e: any) {
      handleGoogleError(res, e, "Error fetching spreadsheets from GDrive");
    }
  });

  // Gmail Invoice Scanner Endpoint
  app.get("/api/gmail/scan", async (req, res) => {
    try {
      const auth = getAuthClient(req.headers.authorization);
      const gmail = google.gmail({ version: "v1", auth });
      const msgsRes = await gmail.users.messages.list({
        userId: "me",
        q: "pembayaran OR receipt OR invoice OR kuitansi OR transaksi",
        maxResults: 6,
      });

      const messages = msgsRes.data.messages || [];
      const scannedTransactions = [];

      for (const msgInfo of messages) {
        try {
          const msgDetail = await gmail.users.messages.get({
            userId: "me",
            id: msgInfo.id!,
            format: "full",
          });

          const headers = msgDetail.data.payload?.headers || [];
          const subject = headers.find(h => h.name?.toLowerCase() === "subject")?.value || "Tanpa Judul";
          const from = headers.find(h => h.name?.toLowerCase() === "from")?.value || "Tidak Dikenal";
          const snippet = msgDetail.data.snippet || "";

          let bodyText = "";
          // Traverse parts to find plaintext
          const parts = msgDetail.data.payload?.parts;
          if (parts) {
            const textPart = parts.find(p => p.mimeType === "text/plain");
            if (textPart && textPart.body?.data) {
              bodyText = Buffer.from(textPart.body.data, "base64").toString("utf-8");
            }
          }
          if (!bodyText) {
            bodyText = snippet;
          }

          const prompt = `Analisis isi email dari: ${from}\nSubjek: ${subject}\nIsi: ${bodyText.slice(0, 1500)}\n\nTentukan apakah email ini berisi transaksi finansial asli (pembayaran, transfer, belanja, kuitansi, atau tagihan yang sudah terbayar). Jawab HANYA menggunakan format JSON berikut, jangan berikan markdown atau penjelasan lain:\n{\n  "isTransaction": true,\n  "type": "Expense",\n  "category": "Belanja",\n  "amount": 150000,\n  "description": "Beli sepatu baru",\n  "date": "2026-05-26"\n}\nJika bukan transaksi finansial, silakan return:\n{\n  "isTransaction": false\n}`;

          const openAIClient = getOpenAIClient();
          if (!openAIClient) {
            throw new Error("OpenRouter API key not configured");
          }

          const completion = await openAIClient.chat.completions.create({
            model: "meta-llama/llama-3-70b-instruct",
            messages: [{ role: "user", content: prompt }]
          });

          let textResponse = completion.choices[0].message.content || "{}";
          // strip any markdown encapsulation if present
          textResponse = textResponse.replace(/```json/gi, "").replace(/```/g, "").trim();

          const parsed = JSON.parse(textResponse);
          if (parsed.isTransaction && parsed.amount > 0) {
            scannedTransactions.push({
              gmailMessageId: msgInfo.id,
              subject,
              sender: from,
              amount: Number(parsed.amount),
              type: parsed.type || "Expense",
              category: parsed.category || "Lainnya",
              description: parsed.description || subject,
              date: parsed.date || new Date().toISOString().split("T")[0]
            });
          }
        } catch (ex) {
          console.error("Failed scanning individual email id " + msgInfo.id + ":", ex);
        }
      }

      res.json({ scanned: scannedTransactions });
    } catch (e: any) {
      handleGoogleError(res, e, "Gmail scanner fatal error");
    }
  });

  // Gmail Send Report Endpoint
  app.post("/api/gmail/send", async (req, res) => {
    try {
      const auth = getAuthClient(req.headers.authorization);
      const gmail = google.gmail({ version: "v1", auth });
      const { to, subject, htmlBody } = req.body;

      if (!to || !subject || !htmlBody) {
        return res.status(400).json({ error: "Missing to, subject, or htmlBody parameter" });
      }

      // Encode SMTP compliant format
      const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString("base64")}?=`;
      const messageParts = [
        `From: me`,
        `To: ${to}`,
        `Subject: ${utf8Subject}`,
        `MIME-Version: 1.0`,
        `Content-Type: text/html; charset=utf-8`,
        ``,
        htmlBody,
      ];
      const message = messageParts.join("\n");
      const encodedMessage = Buffer.from(message)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

      await gmail.users.messages.send({
        userId: "me",
        requestBody: {
          raw: encodedMessage,
        },
      });

      res.json({ success: true });
    } catch (e: any) {
      handleGoogleError(res, e, "Gmail send error");
    }
  });

  // Google Chat Fetch Spaces Endpoint
  app.get("/api/chat/spaces", async (req, res) => {
    try {
      const auth = getAuthClient(req.headers.authorization);
      const chat = google.chat({ version: "v1", auth });
      const spacesRes = await chat.spaces.list({
        pageSize: 50,
      });
      res.json({ spaces: spacesRes.data.spaces || [] });
    } catch (e: any) {
      handleGoogleError(res, e, "Chat spaces fetching error");
    }
  });

  // Google Chat Broadcast Endpoint
  app.post("/api/chat/message", async (req, res) => {
    try {
      const auth = getAuthClient(req.headers.authorization);
      const chat = google.chat({ version: "v1", auth });
      const { spaceId, text, card } = req.body;

      if (!spaceId || (!text && !card)) {
        return res.status(400).json({ error: "Missing spaceId, text, or card parameter" });
      }

      const requestBody: any = {};
      if (text) requestBody.text = text;
      if (card) requestBody.cardsV2 = [card];

      const postRes = await chat.spaces.messages.create({
        parent: spaceId,
        requestBody,
      });

      res.json({ success: true, messageId: postRes.data.name });
    } catch (e: any) {
      handleGoogleError(res, e, "Chat message creation error");
    }
  });

  // Keep track of rate-limited models with their last rate-limited timestamp
  const rateLimitedModels = new Map<string, number>();
  const COOLDOWN_DURATION_MS = 5 * 60 * 1000; // 5-minute dynamic cache per rate-limited model

  // Helper to check if all candidate models are currently in active rate-limit cooldown
  function areAllModelsExhausted(candidates: string[]): boolean {
    const now = Date.now();
    return candidates.every((m) => {
      const lastLimited = rateLimitedModels.get(m) || 0;
      return now - lastLimited < COOLDOWN_DURATION_MS;
    });
  }

  // Local fallback engine when all Gemini APIs are rate-limited or exhausted
  function getLocalOwiSummary(transactions: any[]): string {
    const list = Array.isArray(transactions) ? transactions : [];
    let totalIncome = 0;
    let totalExpense = 0;
    const categories: Record<string, number> = {};

    for (const t of list) {
      const amt = Number(t.amount) || 0;
      if (t.type === "Income") {
        totalIncome += amt;
      } else {
        totalExpense += amt;
        const cat = t.category || "Lainnya";
        categories[cat] = (categories[cat] || 0) + amt;
      }
    }

    const netSavings = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

    // Find biggest expense category
    let topCategory = "-";
    let maxExpense = 0;
    for (const [cat, val] of Object.entries(categories)) {
      if (val > maxExpense) {
        maxExpense = val;
        topCategory = cat;
      }
    }

    const formatIDR = (num: number) => {
      return "Rp " + Math.round(num).toLocaleString("id-ID");
    };

    let intro = `Halo Teman Catat! 🦉 Di sini Owi, asisten keuangan pribadimu. Sementara kapasitas berpikir server utama sedang diistirahatkan (cooldown), Owi telah menyusun laporan analisis keuangan otomatis yang super detail untukmu!\n\n`;

    let overview = `📊 **Ringkasan Finansial Kamu:**\n`;
    overview += `- Total Pendapatan: ${formatIDR(totalIncome)}\n`;
    overview += `- Total Pengeluaran: ${formatIDR(totalExpense)}\n`;
    overview += `- Sisa Saldo (Net): **${formatIDR(netSavings)}**\n`;
    if (totalIncome > 0) {
      overview += `- Persentase Tabungan: **${savingsRate.toFixed(1)}%** dari total pemasukan.\n`;
    }
    overview += `\n`;

    if (topCategory !== "-") {
      overview += `💡 **Analisis Pengeluaran Utama:**\n`;
      overview += `Pengeluaran terbesar kamu ada pada kategori **${topCategory}** senilai **${formatIDR(maxExpense)}**. Ini adalah area yang bisa kita perhatikan bersama untuk mulai menghemat. `;
      if (maxExpense > totalIncome * 0.4 && totalIncome > 0) {
        overview += `Wah, porsinya sudah melebihi 40% dari pemasukanmu. Coba mulai kurangi perlahan ya!`;
      } else {
        overview += `Porsinya masih cukup aman, keren banget!`;
      }
      overview += `\n\n`;
    }

    let advice = `🦉 **3 Saran Finansial Bijak dari Owi:**\n`;
    if (savingsRate < 20) {
      advice += `1. **Saran Tabungan Ideal:** Saat ini tabunganmu berada di bawah target ideal 20%. Cobalah sisihkan uang di awal bulan segera setelah menerima pemasukan, jangan tunggu sisa akhir bulan ya!\n`;
    } else {
      advice += `1. **Pertahankan Konsistensi:** Tabunganmu sudah sangat bagus (${savingsRate.toFixed(1)}%). Pertahankan gaya hidup hemat ini dan pertimbangkan untuk mulai mengalokasikan sebagian ke instrumen investasi aman seperti Reksa Dana atau Deposito.\n`;
    }

    advice += `2. **Aturan 50/30/20:** Alokasikan pemasukanmu dengan formula 50% untuk kebutuhan pokok (tagihan, bahan makanan), 30% untuk keinginan (hiburan, jajan), dan 20% langsung tabung.\n`;
    advice += `3. **Catat Setiap Koin:** Konsistensi mencatat adalah kunci kesuksesan finansial. Owi bangga sekali dengan kedisiplinanmu hari ini!`;

    return intro + overview + advice;
  }

  function getLocalOwiChat(message: string, transactions: any[]): string {
    const msg = String(message || "").toLowerCase();
    const list = Array.isArray(transactions) ? transactions : [];

    let totalIncome = 0;
    let totalExpense = 0;
    const categories: Record<string, number> = {};

    for (const t of list) {
      const amt = Number(t.amount) || 0;
      if (t.type === "Income") {
        totalIncome += amt;
      } else {
        totalExpense += amt;
        const cat = t.category || "Lainnya";
        categories[cat] = (categories[cat] || 0) + amt;
      }
    }

    const netSavings = totalIncome - totalExpense;
    const formatIDR = (num: number) => {
      return "Rp " + Math.round(num).toLocaleString("id-ID");
    };

    // 1. Greetings / About Owi
    if (msg.includes("halo") || msg.includes("hi") || msg.includes("hello") || msg.includes("pagi") || msg.includes("siang") || msg.includes("sore") || msg.includes("malam")) {
      return `Halo Teman Catat! 🦉 Di sini Owi! Ada yang bisa Owi bantu hari ini? Kamu bisa bertanya tentang cara menghemat pengeluaran, tips budget, atau minta Owi hitungkan saldo keuanganmu saat ini! 🪙💚`;
    }

    if (msg.includes("siapa") || msg.includes("nama") || msg.includes("owi") || msg.includes("owl")) {
      return `Aku adalah **Owi**, burung hantu pintar yang lucu dan bijaksana! 🦉 Aku bertindak sebagai asisten keuangan pribadimu di aplikasi Keuanganku ini. Aku siap membantumu mencatat transaksi, menyusun anggaran bulanan, dan memberikan tips hemat paling jitu! 📝📈`;
    }

    // 2. Checking total/balance/transactions
    if (msg.includes("saldo") || msg.includes("total") || msg.includes("keuangan") || msg.includes("uangku") || msg.includes("tabungan") || msg.includes("sisa")) {
      let reply = `Tentu Teman Catat! Berdasarkan catatan transaksi yang tersimpan saat ini, berikut adalah kondisi dompetmu: \n\n`;
      reply += `📈 Total Pemasukan: **${formatIDR(totalIncome)}**\n`;
      reply += `📉 Total Pengeluaran: **${formatIDR(totalExpense)}**\n`;
      reply += `🪙 Sisa Saldo: **${formatIDR(netSavings)}**\n\n`;
      if (netSavings < 0) {
        reply += `Ups, sisa saldomu minus nih! 😭 Tolong kurangi beli hal-hal yang tidak mendesak ya Sobat Hemat. Semangat, Owi yakin kamu bisa memperbaikinya!`;
      } else if (netSavings === 0 && totalIncome === 0) {
        reply += `Kamu belum mencatatkan transaksi hari ini. Yuk mulai catat pemasukan dan pengeluaran pertamamu dengan menekan tombol "+" di dashboard! 📝`;
      } else {
        reply += `Kondisi saldo kamu aman dan surplus! Bagus sekali, pertahankan terus kedisiplinan belanjamu ya! 🦉💚`;
      }
      return reply;
    }

    // 3. Saving tips / budget formulas
    if (msg.includes("tips") || msg.includes("hemat") || msg.includes("tabung") || msg.includes("investasi") || msg.includes("saran") || msg.includes("bagaimana")) {
      return `🦉 **Tips Hemat & Pintar Menabung dari Owi:**\n\n` +
             `1. **Gunakan Aturan 24 Jam:** Sebelum membeli barang mewah atau impulsif, tunggu dulu selama 24 jam. Biasanya nafsu belanja kita akan mereda dan tersadar bahwa barang itu tidak terlalu dibutuhkan! ⏰\n` +
             `2. **Lacak Setiap Rupiah:** Sering kali uang kita habis karena pengeluaran kecil yang sering diulang (boba, kopi, biaya admin transfer, dll). Catat semuanya tanpa absen di aplikasi ini!\n` +
             `3. **Metode Amplop:** Bagi uang tunaimu ke dalam amplop-amplop kategori (Belanja, Makanan, Transportasi). Jika isi salah satu amplop habis, kamu dilarang menambahnya sampai bulan depan! 📝\n\n` +
             `Semoga tips ini membantu perjalanan finansialmu ya Teman Catat!`;
    }

    if (msg.includes("makan") || msg.includes("coffee") || msg.includes("kopi") || msg.includes("boba") || msg.includes("gaji")) {
      return `Aha! Mengelola pengeluaran harian seperti makanan dan kopi susu memang gampang-gampang susah. ☕️\n\n` +
             `Saran Owi, tetapkan limit harian (budget) khusus untuk jajan sore. Misalnya, maksimal Rp 25.000 sehari. Jika hari ini sudah jajan, berarti besok harus puasa jajan kopi dulu ya Teman Catat! Pembatasan kecil ini akan berdampak besar di akhir bulan! 🪙🦉`;
    }

    // 4. Default Smart Fallback Responses representing Owi
    return `Wah, makasih pertanyaannya ya Teman Catat! 🦉 Saat ini Owi sedang mengaktifkan mode hemat kapasitas berpikir (Local State Cooldown), tapi Owi tetap bisa memberikan rekomendasi keuangan praktis:\n\n` +
           `Untuk mengelola keuangan dengan sehat, pastikan kamu selalu mengisi **Anggaran Bulanan** untuk tiap kategori penting. Usahakan total anggaran belanja tidak melebihi 30% dari total pendapatanmu.\n\n` +
           `Bolehkah Owi tahu apa tujuan finansial terdekatmu? Seperti membeli barang impian, dana darurat, atau lainnya? Owi siap mendengarkan! 🪙💚`;
  }

  // Helper to run chat completions with automatic fallback
  async function generateContentWithFallback(
    params: { messages?: Array<{role: string, content: string}>, prompt?: string }
  ) {
    const candidateRouterModels = [
      "meta-llama/llama-3-70b-instruct",
      "openai/gpt-4o"
    ];

    // 1. Try Gemini first
    if (ai) {
      try {
        console.log(`[Owi AI] Attempting Gemini chat completion`);
        const contents = params.messages ? params.messages.map((m: any) => ({
          role: m.role === 'system' ? 'user' : m.role,
          parts: [{ text: m.content }]
        })) : [{ parts: [{ text: params.prompt }] }];
        
        const response = await ai.models.generateContent({
          model: "gemini-3.1-flash-lite",
          contents: contents,
          config: { thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL } }
        });
        
        console.log(`[Owi AI] Successfully generated content using Gemini`);
        return response.text || "";
      } catch (e: any) {
        console.warn(`[Owi AI Warning] Gemini API error: ${e.message || e}. Falling back...`);
      }
    }

    // 2. Try Cloudflare Workers AI if configured
    const cloudflareApiKey = process.env.CLOUDFLARE_API_KEY || "38fec09996ed8c9f586eb43dca86e2fd";
    if (cloudflareApiKey) {
      try {
        console.log(`[Owi AI] Attempting Cloudflare Workers AI chat completion`);
        const cfText = await generateCloudflareAIContent(cloudflareApiKey, params);
        if (cfText) {
          console.log(`[Owi AI] Successfully generated content using Cloudflare AI`);
          return cfText;
        }
      } catch (err: any) {
        console.warn(`[Owi AI Warning] Cloudflare Workers AI failed: ${err.message || err}. Falling back...`);
      }
    }

    // 3. Fallback to NVIDIA
    console.log(`[Owi AI] Attempting NVIDIA chat completion`);
    const nvidiaClient = getNvidiaClient();
    if (nvidiaClient) {
      try {
        const messages = params.messages || [{ role: "user", content: params.prompt || "" }];
        const response = await nvidiaClient.chat.completions.create({
          model: "meta/llama-3.1-70b-instruct",
          messages: messages as any,
        });
        console.log(`[Owi AI] Successfully generated content using NVIDIA`);
        return response.choices[0].message.content || "";
      } catch (e: any) {
        console.warn(`[Owi AI Warning] NVIDIA API failed: ${e.message || e}. Falling back to OpenRouter.`);
      }
    }

    // 4. Fallback to OpenRouter
    console.log(`[Owi AI] Attempting OpenRouter chat completion`);
    const openAIClient = getOpenAIClient();
    if (openAIClient) {
      try {
        const messages = params.messages || [{ role: "user", content: params.prompt || "" }];
        
        const response = await openAIClient.chat.completions.create({
          model: candidateRouterModels[0],
          messages: messages as any,
        });
        console.log(`[Owi AI] Successfully generated content using OpenRouter`);
        return response.choices[0].message.content || "";
      } catch (e: any) {
        console.warn(`[Owi AI Warning] OpenRouter API failed: ${e.message || e}`);
      }
    }

    return "";
  }

  // AI Summary
  app.post("/api/ai/summary", async (req, res) => {
    const { transactions = [] } = req.body;
    try {
      const hasAI = !!(process.env.GEMINI_API_KEY || process.env.CLOUDFLARE_API_KEY || "38fec09996ed8c9f586eb43dca86e2fd" || process.env.OPENROUTER_API_KEY || process.env.NVIDIA_API_KEY);
      if (!hasAI) {
        return res.json({ text: getLocalOwiSummary(transactions) });
      }

      const prompt = `Analisis data transaksi keuangan berikut dan berikan ringkasan singkat serta saran keuangan yang baik dalam 2-3 paragraf bahasa Indonesia. Format response dalam plain text tanpa markdown berlebihan. Data: ${JSON.stringify(transactions)}`;
      
      const text = await generateContentWithFallback({ prompt: prompt });
      if (!text) {
         return res.json({ text: getLocalOwiSummary(transactions) });
      }
      res.json({ text });
    } catch (e: any) {
      console.warn("AI Summary Error: ", e.message || e);
      res.json({ text: getLocalOwiSummary(transactions) });
    }
  });

  // AI Chat Assistant
  app.post("/api/ai/chat", async (req, res) => {
    const { message, history = [], transactions = [] } = req.body;
    try {
      const hasAI = !!(process.env.GEMINI_API_KEY || process.env.CLOUDFLARE_API_KEY || "38fec09996ed8c9f586eb43dca86e2fd" || process.env.OPENROUTER_API_KEY || process.env.NVIDIA_API_KEY);
      if (!hasAI) {
        return res.json({ text: getLocalOwiChat(message, transactions) });
      }

      const systemInstruction = `Anda adalah "Owi", burung hantu pintar yang lucu, bijaksana, dan sangat ramah yang bertindak sebagai Asisten Keuangan Pribadi di aplikasi Keuanganku.
Karakter Anda:
- Sangat ahli dalam manajemen keuangan, rencana anggaran, strategi menabung, investasi, dan tips hemat yang cerdas.
- Berbicara dengan gaya ramah, penuh semangat, bijak, namun santai menggunakan bahasa Indonesia.
- Gunakan emoji burung hantu (🦉), koin (🪙), buku catatan (📝), grafik naik (📈), atau hati (💚) secara kreatif untuk menyemangati pengguna.
- Panggil pengguna dengan sebutan hangat seperti "Teman Catat" atau "Sobat Hemat".
- Berikan saran yang praktis, solutif, diletakkan sesingkat dan sepadat mungkin.

Konieks Transaksi Pengguna Saat Ini:
${transactions.length > 0 ? JSON.stringify(transactions, null, 2) : "Belum ada transaksi catat terinput."}
`;

      const messages = [
        { role: "system", content: systemInstruction },
        ...history.map((h: any) => ({ role: h.role === "user" ? "user" : "assistant", content: h.parts[0].text })),
        { role: "user", content: message }
      ];

      const text = await generateContentWithFallback({ messages: messages });
      if (!text) {
        return res.json({ text: getLocalOwiChat(message, transactions) });
      }

      res.json({ text });
    } catch (e: any) {
      res.json({ text: getLocalOwiChat(message, transactions) });
    }
  });

  // AI Chat Assistant (Streaming)
  app.post("/api/ai/chat/stream", async (req, res) => {
    const { message, history = [], transactions = [] } = req.body;
    
    // Set headers for SSE
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const sendChunk = (data: any) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    try {
      const hasAI = !!(process.env.GEMINI_API_KEY || process.env.CLOUDFLARE_API_KEY || "38fec09996ed8c9f586eb43dca86e2fd" || process.env.OPENROUTER_API_KEY || process.env.NVIDIA_API_KEY);
      if (!hasAI) {
        sendChunk({ text: getLocalOwiChat(message, transactions), done: true });
        return res.end();
      }

      const systemInstruction = `Anda adalah "Owi", burung hantu pintar yang lucu, bijaksana, dan sangat ramah yang bertindak sebagai Asisten Keuangan Pribadi di aplikasi Keuanganku.
Karakter Anda:
- Sangat ahli dalam manajemen keuangan, rencana anggaran, strategi menabung, investasi, dan tips hemat yang cerdas.
- Berbicara dengan gaya ramah, penuh semangat, bijak, namun santai menggunakan bahasa Indonesia.
- Gunakan emoji burung hantu (🦉), koin (🪙), buku catatan (📝), grafik naik (📈), atau hati (💚) secara kreatif untuk menyemangati pengguna.
- Panggil pengguna dengan sebutan hangat seperti "Teman Catat" atau "Sobat Hemat".
- Berikan saran yang praktis, solutif, diletakkan sesingkat dan sepadat mungkin.

Konteks Transaksi Pengguna Saat Ini:
${transactions.length > 0 ? JSON.stringify(transactions, null, 2) : "Belum ada transaksi catat terinput."}
`;

      const contents = [
        { role: "system", parts: [{ text: systemInstruction }] },
        ...history.map((h: any) => ({ 
          role: h.role === "user" ? "user" : "model", 
          parts: [{ text: h.parts[0].text }] 
        })),
        { role: "user", parts: [{ text: message }] }
      ];

      if (ai) {
        try {
          console.log(`[Owi AI] Attempting Gemini chat streaming`);
          const stream = await ai.models.generateContentStream({
            model: "gemini-3.1-flash-lite",
            contents: contents as any,
            config: { thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL } }
          });

          for await (const chunk of stream) {
            if (chunk.text) {
              sendChunk({ text: chunk.text });
            }
          }
          sendChunk({ done: true });
          return res.end();
        } catch (e: any) {
          console.warn(`[Owi AI Warning] Gemini Streaming failed: ${e.message || e}`);
          // If Gemini fails, we'll try fallbacks (first Cloudflare streaming, then others)
        }
      }

      // Try Cloudflare Workers AI streaming
      const cloudflareApiKey = process.env.CLOUDFLARE_API_KEY || "38fec09996ed8c9f586eb43dca86e2fd";
      if (cloudflareApiKey) {
        try {
          console.log(`[Owi AI] Attempting Cloudflare Workers AI streaming`);
          const streamResult = await streamCloudflareAI(
            cloudflareApiKey,
            {
              messages: [
                { role: "system", content: systemInstruction },
                ...history.map((h: any) => ({ role: h.role === "user" ? "user" : "assistant", content: h.parts[0].text })),
                { role: "user", content: message }
              ]
            },
            (text) => {
              sendChunk({ text });
            }
          );
          if (streamResult) {
            sendChunk({ done: true });
            return res.end();
          }
        } catch (cfErr: any) {
          console.warn(`[Owi AI Warning] Cloudflare Workers AI streaming failed: ${cfErr.message || cfErr}`);
        }
      }

      // Non-streaming fallback for now if Gemini & Cloudflare Stream fails

      const fallbackText = await generateContentWithFallback({ 
        messages: [
          { role: "system", content: systemInstruction },
          ...history.map((h: any) => ({ role: h.role === "user" ? "user" : "assistant", content: h.parts[0].text })),
          { role: "user", content: message }
        ] 
      });
      
      if (fallbackText) {
        sendChunk({ text: fallbackText, done: true });
      } else {
        sendChunk({ text: getLocalOwiChat(message, transactions), done: true });
      }
      res.end();

    } catch (e: any) {
      console.error("AI Streaming Fatal Error:", e);
      sendChunk({ text: getLocalOwiChat(message, transactions), done: true });
      res.end();
    }
  });

  // AI Suggestions for Category
  app.post("/api/ai/suggestions", async (req, res) => {
    const { category, type } = req.body;
    
    // Fallbacks
    let fallbacks: string[] = [];
    if (type === "Income") {
      if (category === "Investasi") fallbacks = ["Dividen Saham", "Kupon Obligasi", "Profit Crypto", "Bunga Deposito"];
      else if (category === "Bonus") fallbacks = ["Bonus Akhir Tahun", "Tunjangan Hari Raya (THR)", "Insentif Proyek"];
      else if (category === "Keuntungan") fallbacks = ["Hasil Dagang", "Komisi Penjualan", "Titip Jual", "Keuntungan Bisnis"];
      else fallbacks = ["Gaji Utama", "Gaji Pokok", "Lemburan", "Rapel Gaji"];
    } else {
      if (category === "Makanan") fallbacks = ["Beli Makan Siang", "Kopi Susu Sore", "Jajan Cemilan", "Makan Malam", "Belanja Sayur"];
      else if (category === "Transportasi") fallbacks = ["Isi Bensin", "Ojek Online", "Gojek Pulang", "Tarif Tol", "Tiket KRL", "Service Motor"];
      else if (category === "Belanja") fallbacks = ["Baju Baru", "Belanja Bulanan", "Keperluan Dapur", "Skincare", "Sepatu Baru"];
      else if (category === "Tagihan") fallbacks = ["Bayar Listrik PLN", "Tagihan internet WiFi", "Pulsa HP", "Biaya Kost", "Iuran Sampah"];
      else if (category === "Hiburan") fallbacks = ["Tiket Bioskop", "Langganan Netflix", "Main Games", "Nongkrong Cafe", "Konser Musik"];
      else if (category === "Kesehatan") fallbacks = ["Beli Obat", "Vitamin C", "Konsultasi Dokter", "Masker Medis", "Cek Darah"];
      else fallbacks = ["Makan Siang", "Beli Bensin", "Belanja Bulanan", "Gojek/Grab", "Bayar Listrik", "Jajan Sore"];
    }

    try {
      const hasAI = !!(process.env.GEMINI_API_KEY || process.env.CLOUDFLARE_API_KEY || "38fec09996ed8c9f586eb43dca86e2fd" || process.env.OPENROUTER_API_KEY || process.env.NVIDIA_API_KEY);
      if (!hasAI) {
        return res.json({ suggestions: fallbacks });
      }
      
      const prompt = `Berikan 5-8 contoh deskripsi/keterangan singkat transaksi spesifik (maksimal 3 kata per contoh) yang sangat relevan untuk kategori "${category}" (jenis transaksi: ${type === "Income" ? "Pemasukan/Pendapatan" : "Pengeluaran"}).
Format hasil dalam bentuk list array JSON sederhana, contoh: ["Makan Siang", "Beli Kopi Sore", "Jajan Cilok"]. Jangan berikan markdown atau teks penjelasan lain, balas HANYA dengan array JSON tersebut.`;

      const text = await generateContentWithFallback({ prompt: prompt });
      if (!text) {
        return res.json({ suggestions: fallbacks });
      }

      let parsed: string[] = [];
      try {
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            parsed = JSON.parse(jsonMatch[0]);
        } else {
            parsed = JSON.parse(text);
        }
        if (Array.isArray(parsed)) {
          return res.json({ suggestions: parsed });
        }
      } catch (err) {
        console.error("Failed parsing AI suggestions: ", text, err);
      }
      
      return res.json({ suggestions: fallbacks });
    } catch (e: any) {
      console.warn("AI suggestions failed: ", e.message || e);
      return res.json({ suggestions: fallbacks });
    }
  });

  // --- QDRANT INTEGRATION & VECTOR STORAGE ---
  let qdrantClient: QdrantClient | null = null;
  const defaultQdrantKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIiwic3ViamVjdCI6ImFwaS1rZXk6NmM0Nzk0YTEtYWQ0MC00NDVmLWJiNjgtYjNkZjVmYTljODdhIn0.WpxbQ4GrKYNLUCul7I_xeF5UZPkwoBReOqa_dZ1-42M";

  function getQdrant(): QdrantClient | null {
    if (!qdrantClient) {
      const apiKey = process.env.QDRANT_API_KEY || defaultQdrantKey;
      const url = process.env.QDRANT_URL;

      if (!url) {
        console.warn("[Qdrant] QDRANT_URL environment variable is occupied or not set.");
        return null;
      }

      qdrantClient = new QdrantClient({
        url,
        apiKey
      });
    }
    return qdrantClient;
  }

  function stringToUUID(str: string): string {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(str)) {
      return str;
    }
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    const hex = Math.abs(hash).toString(16).padStart(8, '0');
    return `${hex}-4000-8000-0000-000000000000`;
  }

  async function ensureQdrantCollectionWithVectorSize(vectorSize: number) {
    const client = getQdrant();
    if (!client) return false;

    try {
      const collections = await client.getCollections();
      const exists = collections.collections.some(c => c.name === "transactions");
      if (!exists) {
        console.log(`[Qdrant] Creating collection "transactions" with size ${vectorSize}...`);
        await client.createCollection("transactions", {
          vectors: {
            size: vectorSize,
            distance: "Cosine"
          }
        });
      }
      return true;
    } catch (err: any) {
      console.error("[Qdrant] Error checking/creating collection:", err.message || err);
      return false;
    }
  }

  async function generateEmbedding(text: string): Promise<number[] | null> {
    if (!ai) {
      console.warn("[Qdrant] Gemini AI is not initialized.");
      return null;
    }
    try {
      // Use text-embedding-004
      const response = await ai.models.embedContent({
        model: "text-embedding-004",
        contents: text,
      });
      const values = response.embeddings?.[0]?.values;
      if (values && values.length > 0) {
        return values;
      }
      // Fallback
      const responseFallback = await ai.models.embedContent({
        model: "gemini-embedding-2-preview",
        contents: text,
      });
      return responseFallback.embeddings?.[0]?.values || null;
    } catch (e: any) {
      console.error("[Qdrant] Failed to generate embedding:", e.message || e);
      return null;
    }
  }

  // Check if Qdrant is configured
  app.get("/api/qdrant/config", (req, res) => {
    const hasUrl = !!process.env.QDRANT_URL;
    res.json({
      configured: hasUrl,
      url: process.env.QDRANT_URL || "",
      defaultApiKeyUsed: !process.env.QDRANT_API_KEY
    });
  });

  // Sync entire transaction list to Qdrant
  app.post("/api/qdrant/sync", async (req, res) => {
    try {
      const { transactions = [] } = req.body;
      const client = getQdrant();
      if (!client) {
        return res.status(400).json({
          error: "Qdrant URL is not configured. Go to Settings > Secrets in AI Studio to set QDRANT_URL."
        });
      }

      if (transactions.length === 0) {
        return res.json({ success: true, count: 0, message: "No transactions to sync." });
      }

      console.log(`[Qdrant] Syncing ${transactions.length} transactions...`);
      const points = [];

      for (const t of transactions) {
        const dateStr = t.date ? `Tanggal: ${t.date}. ` : "";
        const typeStr = `Jenis: ${t.type === "Income" ? "Pemasukan" : "Pengeluaran"}. `;
        const catStr = t.category ? `Kategori: ${t.category}. ` : "";
        const amtStr = `Nominal: Rp ${Number(t.amount || 0).toLocaleString("id-ID")}. `;
        const descStr = t.description ? `Deskripsi: ${t.description}.` : "";
        const text = `${dateStr}${typeStr}${catStr}${amtStr}${descStr}`.trim();

        const vector = await generateEmbedding(text);
        if (vector) {
          points.push({
            id: stringToUUID(t.id || String(Date.now())),
            vector,
            payload: {
              id: t.id,
              date: t.date || "",
              type: t.type || "",
              category: t.category || "",
              amount: Number(t.amount || 0),
              description: t.description || "",
              text
            }
          });
        }
      }

      if (points.length === 0) {
        return res.status(400).json({ error: "Failed to create embeddings for any transaction." });
      }

      const vectorSize = points[0].vector.length;
      const colCreated = await ensureQdrantCollectionWithVectorSize(vectorSize);
      if (!colCreated) {
        return res.status(500).json({ error: "Failed to initialize or find Qdrant collection." });
      }

      // Upsert to Qdrant inside a try block
      await client.upsert("transactions", {
        wait: true,
        points: points
      });

      res.json({ success: true, count: points.length });
    } catch (e: any) {
      console.error("[Qdrant Exception] Sync error: ", e);
      res.status(500).json({ error: e.message || "Failed syncing to Qdrant" });
    }
  });

  // Search transactions semantically
  app.post("/api/qdrant/search", async (req, res) => {
    try {
      const { query, limit = 5 } = req.body;
      const client = getQdrant();
      if (!client) {
        return res.status(400).json({
          error: "Qdrant URL is not configured. Go to Settings > Secrets in AI Studio to set QDRANT_URL."
        });
      }

      if (!query || query.trim() === "") {
        return res.json({ results: [] });
      }

      console.log(`[Qdrant] Searching semantically: "${query}"`);
      const vector = await generateEmbedding(query);
      if (!vector) {
        return res.status(500).json({ error: "Failed to generate embedding for search query." });
      }

      // Ensure the collection is ready (just in case they search before sync, search should handle it)
      try {
        const collections = await client.getCollections();
        const exists = collections.collections.some(c => c.name === "transactions");
        if (!exists) {
          return res.json({ results: [], message: "Collection not initialized. Please sync first." });
        }

        const hits = await client.search("transactions", {
          vector,
          limit,
          with_payload: true
        });

        const results = hits.map(hit => ({
          transaction: hit.payload,
          score: hit.score
        }));

        res.json({ results });
      } catch (err: any) {
        console.error("[Qdrant Search inner error]", err);
        return res.status(500).json({ error: err.message || "Qdrant query execution failed." });
      }
    } catch (e: any) {
      console.error("[Qdrant Exception] Search error: ", e);
      res.status(500).json({ error: e.message || "Failed querying Qdrant" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
