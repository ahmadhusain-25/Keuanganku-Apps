import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { google } from "googleapis";
import { GoogleGenAI } from "@google/genai";

const PORT = 3000;

// Set up Google Drive, Sheets, Calendar wrappers
function getAuthClient(authHeader: string | undefined) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Missing or invalid Authorization header");
  }
  const token = authHeader.split(" ")[1];
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: token });
  return auth;
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "Keuanganku API Running" });
  });

  // Finance Integration - Setup or read
  app.get("/api/finances", async (req, res) => {
    try {
      const auth = getAuthClient(req.headers.authorization);
      const drive = google.drive({ version: "v3", auth });
      const sheets = google.sheets({ version: "v4", auth });

      let fileId = req.query.spreadsheetId as string;

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
          const file = await drive.files.get({
             fileId: fileId,
             fields: 'parents'
          });
          const previousParents = file.data.parents?.join(',') || '';
          await drive.files.update({
             fileId: fileId,
             addParents: folderId,
             removeParents: previousParents,
          });
        }
      }

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
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  // Adding transaction
  app.post("/api/finances", async (req, res) => {
    try {
      const auth = getAuthClient(req.headers.authorization);
      const sheets = google.sheets({ version: "v4", auth });
      const { spreadsheetId, date, type, category, amount, description } = req.body;
      const id = Date.now().toString();

      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: "Transactions!A:F",
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [[id, date, type, category, amount, description]],
        },
      });

      res.json({ success: true, id });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  // clear all transactions
  app.delete("/api/finances", async (req, res) => {
    try {
      const auth = getAuthClient(req.headers.authorization);
      const sheets = google.sheets({ version: "v4", auth });
      const spreadsheetId = req.query.spreadsheetId as string;
      
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
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  // delete single transaction
  app.delete("/api/finances/:id", async (req, res) => {
    try {
      const auth = getAuthClient(req.headers.authorization);
      const sheets = google.sheets({ version: "v4", auth });
      const spreadsheetId = req.query.spreadsheetId as string;
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
      console.error(e);
      res.status(500).json({ error: e.message });
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
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/whatsapp/notify", (req, res) => {
    // Scaffold for real WA API hook.
    // For now we simulate success and return a wa.me link that opens the local client
    const { phone, message } = req.body;
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    const link = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    res.json({ success: true, waLink: link, simulated: true });
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
      console.error("Error fetching spreadsheets from GDrive:", e);
      res.status(500).json({ error: e.message });
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

      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

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

          const response = await ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents: prompt,
          });

          let textResponse = response.text || "{}";
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
      console.error("Gmail scanner fatal error:", e);
      res.status(500).json({ error: e.message });
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
      console.error("Gmail send error:", e);
      res.status(500).json({ error: e.message });
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
      console.error("Chat spaces fetching error:", e);
      res.status(500).json({ error: e.message });
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
      console.error("Chat message creation error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  // AI Summary
  app.post("/api/ai/summary", async (req, res) => {
    try {
      const { transactions } = req.body;
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });
      const prompt = `Analisis data transaksi keuangan berikut dan berikan ringkasan singkat serta saran keuangan yang baik dalam 2-3 paragraf bahasa Indonesia. Format response dalam plain text tanpa markdown berlebihan. Data: ${JSON.stringify(transactions)}`;
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt
      });
      res.json({ text: response.text });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
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
