import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { google } from "googleapis";
import { GoogleGenAI } from "@google/genai";

const PORT = 3000;

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
      handleGoogleError(res, e, "Error fetching finances database");
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
      handleGoogleError(res, e, "Error adding transaction");
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
      handleGoogleError(res, e, "Error clearing finance transactions");
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

  app.post("/api/whatsapp/notify", async (req, res) => {
    try {
      const { phone, message } = req.body;
      if (!phone || !message) {
        return res.status(400).json({ error: "Phone number and message are required." });
      }

      // Fonnte API Key provided by user (with support for environment override)
      const fonnteToken = process.env.FONNTE_API_KEY || "o2ibg27orvbi75tc4fDi";

      const params = new URLSearchParams();
      params.append("target", phone);
      params.append("message", message);
      params.append("countryCode", "62"); // default handling for Indonesian local format (starts with 0)

      console.log(`[Fonnte Bot] Sending WA message to ${phone}...`);
      
      const response = await fetch("https://api.fonnte.com/send", {
        method: "POST",
        headers: {
          "Authorization": fonnteToken
        },
        body: params
      });

      const responseText = await response.text();
      let responseData: any;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = { raw: responseText };
      }

      if (response.ok) {
        console.log(`[Fonnte Bot] Sent successfully:`, responseData);
        const cleanPhone = phone.replace(/[^0-9]/g, "");
        const link = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
        res.json({ 
          success: true, 
          waLink: link, 
          fonnteResponse: responseData 
        });
      } else {
        console.error(`[Fonnte Bot] API returned error status ${response.status}:`, responseData);
        res.status(response.status).json({ 
          success: false, 
          error: "Fonnte API error status", 
          details: responseData 
        });
      }
    } catch (e: any) {
      console.error("[Fonnte Bot] Internal Server Error:", e);
      res.status(500).json({ success: false, error: e.message });
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

  // Helper to run generateContent with automatic fallback across multi-generation models
  async function generateContentWithFallback(
    ai: any,
    defaultModel: string,
    params: { contents: any; config?: any }
  ) {
    const candidateModels = [
      "gemini-3.5-flash",
      "gemini-3.1-flash-lite",
      "gemini-flash-latest",
      "gemini-2.5-flash",
      "gemini-1.5-flash"
    ];

    const now = Date.now();
    const workingModels: string[] = [];
    const cooledDownModels: string[] = [];

    // Prioritize working models first
    const allUniqueCandidates = Array.from(new Set([defaultModel, ...candidateModels]));
    for (const m of allUniqueCandidates) {
      const lastLimited = rateLimitedModels.get(m) || 0;
      if (now - lastLimited > COOLDOWN_DURATION_MS) {
        workingModels.push(m);
      } else {
        cooledDownModels.push(m);
      }
    }

    // Try working ones first; fall back to cooldown ones only as last resort
    const orderedModels = [...workingModels, ...cooledDownModels];
    console.log(`[Owi AI] Model queue: ${JSON.stringify(orderedModels)} (Active working: ${JSON.stringify(workingModels)}, Cooling down: ${JSON.stringify(cooledDownModels)})`);

    let lastError: any = null;

    for (const modelName of orderedModels) {
      try {
        console.log(`[Owi AI] Attempting generateContent using: ${modelName}`);
        const response = await ai.models.generateContent({
          model: modelName,
          contents: params.contents,
          config: params.config
        });
        console.log(`[Owi AI] Successfully generated content using model: ${modelName}`);
        
        // Remove from rate-limited if successful
        rateLimitedModels.delete(modelName);
        return response;
      } catch (e: any) {
        lastError = e;
        const errText = String(e.message || e).toLowerCase();
        
        if (
          errText.includes("quota") ||
          errText.includes("limit") ||
          errText.includes("rate") ||
          errText.includes("exhausted") ||
          errText.includes("429")
        ) {
          console.warn(`[Owi AI Warning] Model ${modelName} rate limited / quota hit: ${e.message || e}. Cool down started.`);
          rateLimitedModels.set(modelName, Date.now());
          continue;
        }
        
        // Throw non-quota errors immediately
        throw e;
      }
    }

    throw lastError || new Error("All fallback models exhausted");
  }

  // AI Summary
  app.post("/api/ai/summary", async (req, res) => {
    const candidateModels = ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];
    const { transactions = [] } = req.body;
    try {
      if (areAllModelsExhausted(candidateModels) || !process.env.GEMINI_API_KEY) {
        console.log("All candidate models exhausted or no key. Using smart local analyzer fallback for summary.");
        return res.json({ text: getLocalOwiSummary(transactions) });
      }

      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });
      const prompt = `Analisis data transaksi keuangan berikut dan berikan ringkasan singkat serta saran keuangan yang baik dalam 2-3 paragraf bahasa Indonesia. Format response dalam plain text tanpa markdown berlebihan. Data: ${JSON.stringify(transactions)}`;
      
      const response = await generateContentWithFallback(ai, "gemini-3.5-flash", {
        contents: prompt
      });
      res.json({ text: response.text });
    } catch (e: any) {
      const errText = String(e.message || e).toLowerCase();
      if (errText.includes("quota") || errText.includes("limit") || errText.includes("rate") || errText.includes("exhausted") || errText.includes("429")) {
        console.log("Gemini API rate limit or quota hit during summary across models. Activating smart local analyzer fallback.");
        return res.json({ text: getLocalOwiSummary(transactions) });
      }
      console.warn("AI Summary Error: ", e.message || e);
      res.json({ text: "Maaf Teman Catat, koneksi Owi sedang sedikit terganggu. Tolong coba beberapa saat lagi ya! 🦉💚" });
    }
  });

  // AI Chat Assistant
  app.post("/api/ai/chat", async (req, res) => {
    const candidateModels = ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];
    const { message, history = [], transactions = [] } = req.body;
    try {
      if (areAllModelsExhausted(candidateModels) || !process.env.GEMINI_API_KEY) {
        console.log("All candidate models exhausted or no key. Using smart local analyzer fallback for chat.");
        return res.json({ text: getLocalOwiChat(message, transactions) });
      }

      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

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

      const formattedContents = [
        ...history,
        { role: "user", parts: [{ text: message }] }
      ];

      const response = await generateContentWithFallback(ai, "gemini-3.5-flash", {
        contents: formattedContents,
        config: {
          systemInstruction: systemInstruction,
        }
      });

      res.json({ text: response.text });
    } catch (e: any) {
      console.error("AI Chat Error: ", e);
      // Give a friendly in-character fallback response for quota exceeded or other errors
      const lowerErr = (e.message || "").toLowerCase();
      if (lowerErr.includes("quota") || lowerErr.includes("limit") || lowerErr.includes("rate") || lowerErr.includes("exhausted") || lowerErr.includes("api_key") || lowerErr.includes("api key") || lowerErr.includes("429")) {
        console.log("Gemini API rate limit or quota hit during chat across models. Activating smart local analyzer fallback.");
        return res.json({ text: getLocalOwiChat(message, transactions) });
      }
      res.json({ text: "Maaf Teman Catat, koneksi Owi sedang sedikit terganggu. Tolong coba kirim pesan lagi ya! 🦉💚" });
    }
  });

  // AI Suggestions for Category
  app.post("/api/ai/suggestions", async (req, res) => {
    const { category, type } = req.body;
    
    // Prepare fallback suggestions based on category
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

    const candidateModels = ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];
    try {
      if (areAllModelsExhausted(candidateModels) || !process.env.GEMINI_API_KEY) {
        return res.json({ suggestions: fallbacks });
      }

      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });
      
      const prompt = `Berikan 5-8 contoh deskripsi/keterangan singkat transaksi spesifik (maksimal 3 kata per contoh) yang sangat relevan untuk kategori "${category}" (jenis transaksi: ${type === "Income" ? "Pemasukan/Pendapatan" : "Pengeluaran"}).
Format hasil dalam bentuk list array JSON sederhana, contoh: ["Makan Siang", "Beli Kopi Sore", "Jajan Cilok"]. Jangan berikan markdown atau teks penjelasan lain, balas HANYA dengan array JSON tersebut.`;

      const response = await generateContentWithFallback(ai, "gemini-3.5-flash", {
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      let text = (response.text || "[]").trim();
      try {
        // Clean up markdown code blocks if the response starts with ```
        const match = text.match(/\[[\s\S]*\]/);
        if (match) {
          text = match[0];
        }
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
          return res.json({ suggestions: parsed });
        }
      } catch (err) {
        console.error("Failed parsing AI suggestions: ", text, err);
      }
      
      return res.json({ suggestions: fallbacks });
    } catch (e: any) {
      console.warn("Gemini suggestions failed or rate-limited: ", e.message || e);
      return res.json({ suggestions: fallbacks });
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
