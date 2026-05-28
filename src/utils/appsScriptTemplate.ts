export const getAppsScriptTemplate = (spreadsheetId: string | null) => {
  return `/**
 * ====================================================================
 *                 BOT WA "KEUANGANKU" GOOGLE APPS SCRIPT
 * ====================================================================
 * 
 * Skrip ini didesain untuk ditempelkan pada Google Apps Script Anda:
 * URL Project: https://script.google.com/u/0/home/projects/1JZpDGAb8YhULQ70TI1fC___FtNfeKbqHUTCSlHC6XHTobCmfl9kN7Co8/edit
 */

// Ganti ID Spreadsheet Anda jika ingin mengunci ke Spreadsheet tertentu.
const SPREADSHEET_ID = "${spreadsheetId || ''}"; 

// Masukkan Kunci API Gemini Anda untuk mengaktifkan kecerdasan buatan langsung di WhatsApp Bot Anda.
const GEMINI_API_KEY = "MASUKKAN_GEMINI_API_KEY_ANDA_DISINI";

function doPost(e) {
  try {
    const postData = JSON.parse(e.postData.contents);
    const incomingMessage = postData.message || postData.text || "";
    const senderNumber = postData.sender || postData.phone || "";
    
    if (!incomingMessage || !senderNumber) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: "Data kiriman tidak lengkap" }))
                           .setMimeType(ContentService.MimeType.JSON);
    }
    
    const replyText = handleCommand(incomingMessage, senderNumber);
    sendWhatsAppReply(senderNumber, replyText);
    
    return ContentService.createTextOutput(JSON.stringify({ success: true, reply: replyText }))
                         .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
                         .setMimeType(ContentService.MimeType.JSON);
  }
}

function handleCommand(messageText, senderNumber) {
  const cleanMsg = messageText.trim();
  const lowerMsg = cleanMsg.toLowerCase();
  
  if (lowerMsg === "!bantuan" || lowerMsg === "bantuan" || lowerMsg === "help") {
    return "🤖 *Asisten WA Keuanganku* - Daftar Perintah:\\n\\n" +
           "• *!saldo* - Cek ringkasan sisa saldo, pemasukan, & pengeluaran Anda saat ini.\\n" +
           "• *!summary* - Analisis keuangan instan dari otak AI Gemini.\\n" +
           "• *!tambah [income/expense] [nilai] [kategori] [deskripsi]* - Tambah transaksi lewat chat.\\n" +
           "  _Contoh: !tambah expense 15000 Makanan Makan Siang Bakso_\\n\\n" +
           "Silakan kirim pesan perintah di atas!";
  }
  
  if (lowerMsg === "!saldo" || lowerMsg === "saldo") {
    return getBalanceSummary();
  }
  
  if (lowerMsg === "!summary" || lowerMsg === "summary") {
    return getAISummaryFromGemini();
  }
  
  if (lowerMsg.startsWith("!tambah")) {
    const parts = cleanMsg.split(/\\s+/);
    if (parts.length < 5) {
      return "❌ *Pencatatan Gagal*\\n\\n_Format salah! Gunakan format ini:_\\n*!tambah [income/expense] [nominal] [kategori] [deskripsi]*\\n\\n_Contoh:_ *!tambah expense 12000 Jajan Es Coklat Sore*";
    }
    
    const rawType = parts[1].toLowerCase();
    const txType = (rawType === "income" || rawType === "pemasukan") ? "Income" : "Expense";
    const txAmount = Number(parts[2]);
    const txCategory = parts[3];
    const txDesc = parts.slice(4).join(" ");
    
    if (isNaN(txAmount) || txAmount <= 0) {
      return "❌ *Gagal*: Nominal transaksi harus berupa angka positif yang valid!";
    }
    
    return addTransactionToSheet(txType, txAmount, txCategory, txDesc);
  }
  
  return "Halo! Perintah '" + cleanMsg + "' tidak dikenali oleh Bot Keuanganku.\\n\\nKetik *!bantuan* untuk mendaftar fungsi otomatis asisten finansial saya. 🤖";
}

function getBalanceSummary() {
  try {
    const sheet = getTransactionsSheet();
    const rows = sheet.getDataRange().getValues();
    
    let totalIncome = 0;
    let totalExpense = 0;
    
    for (let i = 1; i < rows.length; i++) {
      const type = rows[i][2];
      const amount = Number(rows[i][4]);
      
      if (type === "Income") {
        totalIncome += amount;
      } else if (type === "Expense") {
        totalExpense += amount;
      }
    }
    
    const balance = totalIncome - totalExpense;
    
    return "🔵 *Rangkuman Saldo Anda* (Live GSheet) 🤖\\n\\n" +
           "• *Total Saldo*: Rp " + formatRupiah(balance) + "\\n" +
           "• *Pemasukan 🟢*: Rp " + formatRupiah(totalIncome) + "\\n" +
           "• *Pengeluaran 🔴*: Rp " + formatRupiah(totalExpense) + "\\n\\n" +
           "_Data diperbarui instan di Spreadsheet Anda._";
  } catch (err) {
    return "❌ Gagal memuat saldo: " + err.toString();
  }
}

function addTransactionToSheet(type, amount, category, description) {
  try {
    const sheet = getTransactionsSheet();
    const id = Date.now().toString();
    const dateStr = Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd");
    
    sheet.appendRow([id, dateStr, type, category, amount, description]);
    
    return "✅ *Catat Keuangan Sukses* 🤖\\n\\n" +
           "Berhasil mencatat *" + (type === "Income" ? "Pemasukan 🟢" : "Pengeluaran 🔴") + "* baru:\\n" +
           "• *Nilai*: Rp " + formatRupiah(amount) + "\\n" +
           "• *Kategori*: " + category + "\\n" +
           "• *Deskripsi*: " + description + "\\n\\n" +
           "_Data berhasil tersinkronisasi dengan Spreadsheet Keuanganku!_";
  } catch (err) {
    return "❌ Gagal mencatat transaksi: " + err.toString();
  }
}

function getAISummaryFromGemini() {
  if (GEMINI_API_KEY === "MASUKKAN_GEMINI_API_KEY_ANDA_DISINI" || !GEMINI_API_KEY) {
    return "🌐 *Teguran Fitur AI Bot* 🤖\\n\\nFitur ini memerlukan Google Gemini API Key. Mohon buka file skrip Apps Script Anda dan masukkan Kunci API berharga Anda di variabel 'GEMINI_API_KEY'.";
  }
  
  try {
    const sheet = getTransactionsSheet();
    const rows = sheet.getDataRange().getValues();
    const transactions = [];
    
    for (let i = 1; i < Math.min(rows.length, 30); i++) {
      transactions.push({
        date: rows[i][1],
        type: rows[i][2],
        category: rows[i][3],
        amount: rows[i][4],
        description: rows[i][5]
      });
    }
    
    const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=" + GEMINI_API_KEY;
    const prompt = "Analisis data transaksi keuangan berikut and berikan ringkasan pendek serta tips/insight finansial cerdas maksimal dalam 2 paragraf padat. Gunakan bahasa Indonesia. Data: " + JSON.stringify(transactions);
    
    const payload = {
      contents: [{
        parts: [{ text: prompt }]
      }]
    };
    
    const options = {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(url, options);
    const json = JSON.parse(response.getContentText());
    
    if (json.candidates && json.candidates[0].content.parts[0].text) {
      return "🤖 *Rekomendasi AI Gemini Keuanganku*:\\n\\n" + json.candidates[0].content.parts[0].text;
    } else {
      return "🤖 Gagal memproses analisis AI dari respon Gemini.";
    }
  } catch (er) {
    return "🤖 Bermasalah saat memanggil otak bionik Gemini AI: " + er.toString();
  }
}

function getTransactionsSheet() {
  let ss;
  if (SPREADSHEET_ID) {
    ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  } else {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  }
  
  let sheet = ss.getSheetByName("Transactions");
  if (!sheet) {
    sheet = ss.insertSheet("Transactions");
    sheet.appendRow(["ID", "Date", "Type", "Category", "Amount", "Description"]);
  }
  return sheet;
}

function formatRupiah(val) {
  return val.toString().replace(/\\B(?=(\\d{3})+(?!\\d))/g, ".");
}

function sendWhatsAppReply(to, message) {
  Logger.log("Mengirim balasan ke: " + to + " | Pesan: " + message);
}
`;
};
