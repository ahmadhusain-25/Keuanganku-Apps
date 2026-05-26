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
      let fileId = "";
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
