/**
 * ====================================================================
 *                 BOT WA "KEUANGANKU" GOOGLE APPS SCRIPT
 * ====================================================================
 * 
 * Skrip ini didesain untuk ditempelkan pada Google Apps Script Anda:
 * URL Project: https://script.google.com/u/0/home/projects/1JZpDGAb8YhULQ70TI1fC___FtNfeKbqHUTCSlHC6XHTobCmfl9kN7Co8/edit
 * 
 * FITUR BOT OTOMATIS:
 * 1. doPost(e) : Menerima pesan webhook dari penyedia API WhatsApp (seperti Twilio, Fonepay, dsb).
 * 2. Perintah WhatsApp Otomatis:
 *    - !saldo : Cek ringkasan saldo, pemasukan, pengeluaran & sisa anggaran saat ini.
 *    - !summary : Ambil analisis asisten AI Gemini langsung dari data Spreadsheet Anda.
 *    - !tambah [income/expense] [nominal] [kategori] [deskripsi] : Catat otomatis transaksi baru via chat.
 *    - !bantuan : Tampilkan panduan penggunaan perintah bot.
 * 3. Kirim notifikasi webhook dan laporan otomatis.
 */

// Ganti ID Spreadsheet Anda jika ingin mengunci ke Spreadsheet tertentu.
// Jika dikosongkan, Apps Script akan menggunakan Spreadsheet penampung aktif di mana skrip ditempelkan.
const SPREADSHEET_ID = ""; 

// Masukkan Kunci API Gemini Anda untuk mengaktifkan kecerdasan buatan langsung di WhatsApp Bot Anda.
// Anda bisa mendapatkan API Key di Google AI Studio.
const GEMINI_API_KEY = "MASUKKAN_GEMINI_API_KEY_ANDA_DISINI";

/**
 * Handle HTTP POST Request (Endpoint Webhook Bot WA)
 * Jalankan sebagai Web App dan daftarkan URL Web App ini ke konfigurasi Webhook API WhatsApp Anda.
 */
function doPost(e) {
  try {
    const postData = JSON.parse(e.postData.contents);
    
    // Sesuaikan json payload di bawah ini dengan format penyedia gateway WhatsApp yang Anda gunakan
    const incomingMessage = postData.message || postData.text || "";
    const senderNumber = postData.sender || postData.phone || "";
    
    if (!incomingMessage || !senderNumber) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: "Data kiriman tidak lengkap" }))
                           .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Jalankan perintah bot
    const replyText = handleCommand(incomingMessage, senderNumber);
    
    // Kirim balasan kembali ke API WhatsApp gateway Anda
    sendWhatsAppReply(senderNumber, replyText);
    
    return ContentService.createTextOutput(JSON.stringify({ success: true, reply: replyText }))
                         .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
                         .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Memproses pesan masuk dan mengembalikan teks respon bot.
 */
function handleCommand(messageText, senderNumber) {
  const cleanMsg = messageText.trim();
  const lowerMsg = cleanMsg.toLowerCase();
  
  if (lowerMsg === "!bantuan" || lowerMsg === "bantuan" || lowerMsg === "help") {
    return "🤖 *Asisten WA Keuanganku* - Daftar Perintah:\n\n" +
           "• *!saldo* - Cek ringkasan sisa saldo, pemasukan, & pengeluaran Anda saat ini.\n" +
           "• *!summary* - Analisis keuangan instan dari otak AI Gemini.\n" +
           "• *!tambah [income/expense] [nilai] [kategori] [deskripsi]* - Tambah transaksi lewat chat.\n" +
           "  _Contoh: !tambah expense 15000 Makanan Makan Siang Bakso_\n\n" +
           "Silakan kirim pesan perintah di atas!";
  }
  
  if (lowerMsg === "!saldo" || lowerMsg === "saldo") {
    return getBalanceSummary();
  }
  
  if (lowerMsg === "!summary" || lowerMsg === "summary") {
    return getAISummaryFromGemini();
  }
  
  if (lowerMsg.startsWith("!tambah")) {
    const parts = cleanMsg.split(/\s+/);
    if (parts.length < 5) {
      return "❌ *Pencatatan Gagal*\n\n_Format salah! Gunakan format ini:_\n*!tambah [income/expense] [nominal] [kategori] [deskripsi]*\n\n_Contoh:_ *!tambah expense 12000 Jajan Es Coklat Sore*";
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
  
  return "Halo! Perintah '" + cleanMsg + "' tidak dikenali oleh Bot Keuanganku.\n\nKetik *!bantuan* untuk mendaftar fungsi otomatis asisten finansial saya. 🤖";
}

/**
 * Mengambil ringkasan saldo aktual dari Spreadsheet Anda
 */
function getBalanceSummary() {
  try {
    const sheet = getTransactionsSheet();
    const rows = sheet.getDataRange().getValues();
    
    let totalIncome = 0;
    let totalExpense = 0;
    
    // Lewati baris pertama (header)
    for (let i = 1; i < rows.length; i++) {
      const type = rows[i][2]; // Kolom C (Type)
      const amount = Number(rows[i][4]); // Kolom E (Amount)
      
      if (type === "Income") {
        totalIncome += amount;
      } else if (type === "Expense") {
        totalExpense += amount;
      }
    }
    
    const balance = totalIncome - totalExpense;
    
    return "🔵 *Rangkuman Saldo Anda* (Live GSheet) 🤖\n\n" +
           "• *Total Saldo*: Rp " + formatRupiah(balance) + "\n" +
           "• *Pemasukan 🟢*: Rp " + formatRupiah(totalIncome) + "\n" +
           "• *Pengeluaran 🔴*: Rp " + formatRupiah(totalExpense) + "\n\n" +
           "_Data diperbarui instan di Spreadsheet Anda._";
  } catch (err) {
    return "❌ Gagal memuat saldo: " + err.toString();
  }
}

/**
 * Menambahkan transaksi baru ke Spreadsheet
 */
function addTransactionToSheet(type, amount, category, description) {
  try {
    const sheet = getTransactionsSheet();
    const id = Date.now().toString();
    const dateStr = Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd");
    
    sheet.appendRow([id, dateStr, type, category, amount, description]);
    
    return "✅ *Catat Keuangan Sukses* 🤖\n\n" +
           "Berhasil mencatat *" + (type === "Income" ? "Pemasukan 🟢" : "Pengeluaran 🔴") + "* baru:\n" +
           "• *Nilai*: Rp " + formatRupiah(amount) + "\n" +
           "• *Kategori*: " + category + "\n" +
           "• *Deskripsi*: " + description + "\n\n" +
           "_Data berhasil tersinkronisasi dengan Spreadsheet Keuanganku!_";
  } catch (err) {
    return "❌ Gagal mencatat transaksi: " + err.toString();
  }
}

/**
 * Menghasilkan saran finansial dengan memanggil Gemini API
 */
function getAISummaryFromGemini() {
  if (GEMINI_API_KEY === "MASUKKAN_GEMINI_API_KEY_ANDA_DISINI" || !GEMINI_API_KEY) {
    return "🌐 *Teguran Fitur AI Bot* 🤖\n\nFitur ini memerlukan Google Gemini API Key. Mohon buka file skrip Apps Script Anda dan masukkan Kunci API berharga Anda di variabel `GEMINI_API_KEY`.";
  }
  
  try {
    const sheet = getTransactionsSheet();
    const rows = sheet.getDataRange().getValues();
    const transactions = [];
    
    for (let i = 1; i < Math.min(rows.length, 30); i++) { // Ambil maksimal 30 baris terakhir agar tidak kebesaran payload
      transactions.push({
        date: rows[i][1],
        type: rows[i][2],
        category: rows[i][3],
        amount: rows[i][4],
        description: rows[i][5]
      });
    }
    
    const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=" + GEMINI_API_KEY;
    const prompt = "Analisis data transaksi keuangan berikut dan berikan ringkasan pendek serta tips/insight finansial cerdas maksimal dalam 2 paragraf padat. Gunakan bahasa Indonesia yang bersahabat dan optimis. Data transaksi: " + JSON.stringify(transactions);
    
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
      return "🤖 *Rekomendasi AI Gemini Keuanganku*:\n\n" + json.candidates[0].content.parts[0].text;
    } else {
      return "🤖 Gagal memproses analisis AI dari respon Gemini. Pastikan Kunci API terpasang benar.";
    }
  } catch (er) {
    return "🤖 Bermasalah saat memanggil otak bionik Gemini AI: " + er.toString();
  }
}

/**
 * Mengambil referensi sheet spreadsheet aktif beralias 'Transactions'
 */
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

/**
 * Fungsi utilitas untuk memformat rupiah sederhana
 */
function formatRupiah(val) {
  return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/**
 * Placeholder mengirim pesan balik ke API WhatsApp Gateway.
 * Daftarkan integrasi webhook Anda di sini jika ingin bot membalas secara riil di WhatsApp (misal Twilio API).
 */
function sendWhatsAppReply(to, message) {
  // Contoh implementasi untuk Twilio WhatsApp API:
  /*
  const accountSid = "ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX";
  const authToken = "your_auth_token_here";
  const twilioNumber = "whatsapp:+14155238886"; // Nomor Twilio sandbox atau resmi
  
  const url = "https://api.twilio.com/2010-04-01/Accounts/" + accountSid + "/Messages.json";
  const options = {
    method: "post",
    headers: {
      "Authorization": "Basic " + Utilities.base64Encode(accountSid + ":" + authToken)
    },
    payload: {
      "From": twilioNumber,
      "To": "whatsapp:" + to,
      "Body": message
    }
  };
  UrlFetchApp.fetch(url, options);
  */
  
  Logger.log("Mengirim balasan ke: " + to + " | Pesan: " + message);
}
