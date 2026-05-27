import React, { useState, useEffect } from "react";
import { AppLogo } from "./AppLogo";
import { 
  fetchFinances, 
  addTransaction, 
  addCalendarReminder, 
  sendWANotification, 
  getAISummary, 
  deleteTransaction, 
  resetTransactions, 
  Transaction,
  fetchUserSpreadsheets
} from "../api";
import { format, parseISO } from "date-fns";
import { id } from "date-fns/locale";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import { 
  PlusCircle, 
  Calendar as CalendarIcon, 
  LogOut, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  RefreshCw, 
  Send, 
  Download, 
  Sparkles, 
  Palette, 
  Moon, 
  Sun, 
  Trash2, 
  AlertTriangle, 
  Target, 
  FolderOpen, 
  MessageSquare, 
  PieChart as PieChartIcon,
  Settings,
  X,
  Plus,
  HelpCircle,
  Database,
  Info,
  CheckCircle2,
  Lock,
  Smartphone,
  ChevronRight,
  ExternalLink
} from "lucide-react";
import { getAppsScriptTemplate } from "../utils/appsScriptTemplate";
import { SettingsPanel } from "./SettingsPanel";
import { FloatingAssistant } from "./FloatingAssistant";

export const Dashboard = ({ user, onLogout }: { user?: any; onLogout: () => void }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Storage / GDrive Spreadsheet listing
  const [spreadsheetsList, setSpreadsheetsList] = useState<any[]>([]);
  const [loadingSpreadsheets, setLoadingSpreadsheets] = useState(false);
  const [customSpreadsheetId, setCustomSpreadsheetId] = useState<string | null>("monthly");
  
  // Create / Record Transactions Form States
  const [isAdding, setIsAdding] = useState(false);
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"Income" | "Expense">("Expense");
  const [category, setCategory] = useState("Makanan");
  const [desc, setDesc] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Notifications, WA destination, DoB
  const [reminderSummary, setReminderSummary] = useState("");
  const [reminderDate, setReminderDate] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [waNotify, setWaNotify] = useState(true);

  // WhatsApp Chat bot state & rules
  const [waBotEnabled, setWaBotEnabled] = useState(true);
  const [waBotNotifyOnAdd, setWaBotNotifyOnAdd] = useState(true);
  const [waBotNotifyOnBudget, setWaBotNotifyOnBudget] = useState(true);
  const [chatInput, setChatInput] = useState("");
  const [botIsTyping, setBotIsTyping] = useState(false);
  const [chatMessages, setChatMessages] = useState<any[]>([
    {
      id: "welcome",
      sender: "bot",
      text: "Halo! Saya *Keuanganku* WA Bot 🤖\n\nSaya asisten robot otomatis yang siap memantau keuangan Anda. Saya akan mengirim laporan transaksi secara instan!\n\nKetik *!bantuan* untuk mendaftar perintah saya.",
      timestamp: "09:00"
    }
  ]);

  // AI Insights and copied scripts states
  const [aiSummary, setAiSummary] = useState("");
  const [loadingAi, setLoadingAi] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);

  // Profile preferences (Default to emerald (Sage Green) & light mode)
  const [themeMode, setThemeMode] = useState<"blue" | "purple" | "emerald" | "rose" | "pink">("emerald");
  const [colorMode, setColorMode] = useState<"dark" | "light">("light");
  const [designStyle, setDesignStyle] = useState<"modern" | "cute">("modern");
  const [customName, setCustomName] = useState(user?.displayName || "");
  const [customPhoto, setCustomPhoto] = useState(user?.photoURL || "");
  const [monthlyBudget, setMonthlyBudget] = useState(2500000); // 2.5jt default

  // Router pagination state
  const [activePage, setActivePage] = useState<"dashboard" | "profile">("dashboard");

  // Date Range Filter States
  const [filterPreset, setFilterPreset] = useState<"all" | "today" | "7days" | "30days" | "thisMonth" | "custom">("all");
  const [filterStartDate, setFilterStartDate] = useState<string>("");
  const [filterEndDate, setFilterEndDate] = useState<string>("");

  // Multi-Confirm and Toast Alerts state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
    cancelText?: string;
  } | null>(null);

  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type });
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void, confirmText = "Lanjutkan", cancelText = "Batal") => {
    setConfirmDialog({ isOpen: true, title, message, onConfirm, confirmText, cancelText });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    const saved = localStorage.getItem("userProfile");
    if (saved) {
      try {
        const p = JSON.parse(saved);
        if (p.phone) setPhone(p.phone);
        if (p.dob) setDob(p.dob);
        if (p.themeMode) setThemeMode(p.themeMode);
        if (p.colorMode) setColorMode(p.colorMode);
        if (p.designStyle) setDesignStyle(p.designStyle);
        if (p.customName) setCustomName(p.customName);
        if (p.customPhoto) setCustomPhoto(p.customPhoto);
        if (p.monthlyBudget) setMonthlyBudget(Number(p.monthlyBudget));
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("userProfile", JSON.stringify({ phone, dob, themeMode, colorMode, designStyle, customName, customPhoto, monthlyBudget }));
  }, [phone, dob, themeMode, colorMode, designStyle, customName, customPhoto, monthlyBudget]);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    showToast("Profil berhasil disimpan!", "success");
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCustomPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const isLight = colorMode === "light";
  const isCute = designStyle === "cute";

  const ui = {
    bg: isLight ? "bg-[#f4fdd9] text-slate-800" : "bg-[#0b120e] text-slate-100",
    panelBg: isLight ? `bg-white border-[#6a8d73]/30 shadow-xl shadow-emerald-950/5` : `bg-[#131f18] border-white/5 shadow-2xl`,
    panelRadius: isCute ? "rounded-[2rem]" : "rounded-3xl",
    inputRadius: isCute ? "rounded-2xl" : "rounded-xl",
    buttonRadius: isCute ? "rounded-full" : "rounded-xl",
    textMuted: isLight ? "text-slate-500" : "text-emerald-300/60",
    textMain: isLight ? "text-slate-900" : "text-emerald-50",
    inputBg: isLight ? "bg-white border-slate-200 text-slate-900 placeholder-slate-400" : "bg-[#1d2d24] border-white/5 text-emerald-100 placeholder-emerald-600",
    selectOption: isLight ? "bg-white text-slate-900" : "bg-[#131f18] text-emerald-100",
    chartTheme: isLight ? { bg: "#ffffff", border: "#e2e8f0", text: "#0f172a" } : { bg: "#131f18", border: "#2d3f35", text: "#f8fafc" },
  };

  const themes = {
    emerald: { 
      bg1: "bg-[#e4ffe1]/40", 
      bg2: "bg-[#ffe8c2]/30", 
      card: "from-[#6a8d73] to-[#4d6a55]", 
      icon: "text-[#6a8d73]", 
      focus: "focus:ring-[#6a8d73]", 
      shadow: "shadow-[0_4px_24px_-4px_rgba(106,141,117,0.3)]", 
      bgIcon: "bg-[#6a8d73]" 
    },
    blue: { 
      bg1: "bg-blue-600/10", 
      bg2: "bg-indigo-900/10", 
      card: "from-blue-600 to-indigo-700", 
      icon: "text-blue-500", 
      focus: "focus:ring-blue-500", 
      shadow: "shadow-[0_4px_24px_-4px_rgba(59,130,246,0.3)]", 
      bgIcon: "bg-blue-500" 
    },
    purple: { 
      bg1: "bg-purple-600/10", 
      bg2: "bg-fuchsia-900/10", 
      card: "from-purple-600 to-fuchsia-700", 
      icon: "text-purple-500", 
      focus: "focus:ring-purple-500", 
      shadow: "shadow-[0_4px_24px_-4px_rgba(168,85,247,0.3)]", 
      bgIcon: "bg-purple-500" 
    },
    rose: { 
      bg1: "bg-rose-600/10", 
      bg2: "bg-pink-900/10", 
      card: "from-rose-600 to-pink-700", 
      icon: "text-rose-500", 
      focus: "focus:ring-rose-500", 
      shadow: "shadow-[0_4px_24px_-4px_rgba(244,63,94,0.3)]", 
      bgIcon: "bg-rose-500" 
    },
    pink: { 
      bg1: "bg-pink-500/10", 
      bg2: "bg-rose-400/10", 
      card: "from-pink-400 to-rose-500", 
      icon: "text-pink-500", 
      focus: "focus:ring-pink-400", 
      shadow: "shadow-[0_4px_24px_-4px_rgba(236,72,153,0.4)]", 
      bgIcon: "bg-pink-500" 
    },
  };
  const theme = themes[themeMode];

  const getFilteredTransactions = () => {
    if (filterPreset === "all") {
      return transactions;
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return transactions.filter(t => {
      if (!t.date) return false;
      const parts = t.date.split('-');
      if (parts.length !== 3) return false;
      const tDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      tDate.setHours(0, 0, 0, 0);
      
      switch (filterPreset) {
        case "today": {
          const localTodayStr = today.getFullYear() + "-" + 
            String(today.getMonth() + 1).padStart(2, '0') + "-" + 
            String(today.getDate()).padStart(2, '0');
          return t.date === localTodayStr;
        }
        case "7days": {
          const sevenDaysAgo = new Date(today);
          sevenDaysAgo.setDate(today.getDate() - 7);
          return tDate >= sevenDaysAgo && tDate <= today;
        }
        case "30days": {
          const thirtyDaysAgo = new Date(today);
          thirtyDaysAgo.setDate(today.getDate() - 30);
          return tDate >= thirtyDaysAgo && tDate <= today;
        }
        case "thisMonth": {
          const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
          const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
          return tDate >= firstDayOfMonth && tDate <= lastDayOfMonth;
        }
        case "custom": {
          if (filterStartDate) {
            const startParts = filterStartDate.split('-');
            if (startParts.length === 3) {
              const start = new Date(Number(startParts[0]), Number(startParts[1]) - 1, Number(startParts[2]));
              start.setHours(0, 0, 0, 0);
              if (tDate < start) return false;
            }
          }
          if (filterEndDate) {
            const endParts = filterEndDate.split('-');
            if (endParts.length === 3) {
              const end = new Date(Number(endParts[0]), Number(endParts[1]) - 1, Number(endParts[2]));
              end.setHours(0, 0, 0, 0);
              if (tDate > end) return false;
            }
          }
          return true;
        }
        default:
          return true;
      }
    });
  };

  const filteredTransactions = getFilteredTransactions();

  const handleExportCSV = () => {
    if (filteredTransactions.length === 0) return showToast("Belum ada data transaksi untuk diexport.", "info");
    const csvRows = [];
    csvRows.push(['ID', 'Tanggal', 'Jenis', 'Kategori', 'Nominal', 'Keterangan'].join(','));
    filteredTransactions.forEach(t => {
      csvRows.push([t.id, t.date, t.type, t.category, t.amount, `"${t.description.replace(/"/g, '""')}"`].join(','));
    });
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Keuanganku_Export.csv';
    a.click();
    URL.revokeObjectURL(url);
    showToast("Data transaksi ekspor sesuai filter berhasil diunduh!", "success");
  };

  const handleGetAiSummary = async () => {
    if (filteredTransactions.length === 0) return showToast("Belum ada transaksi dalam rentang tanggal terpilih untuk dianalisis.", "info");
    setLoadingAi(true);
    try {
      const res = await getAISummary(filteredTransactions);
      setAiSummary(res.text);
      showToast("Analisis AI sesuai rentang tanggal berhasil diperbarui!", "success");
    } catch (e: any) {
      showToast("Gagal memuat analisis AI: " + e.message, "error");
    } finally {
      setLoadingAi(false);
    }
  };

  const loadSpreadsheetsList = async () => {
    if (user?.isGuest) return;
    try {
      setLoadingSpreadsheets(true);
      const res = await fetchUserSpreadsheets();
      setSpreadsheetsList(res.files || []);
    } catch (e: any) {
      console.error("Gagal mengambil daftar spreadsheet:", e);
    } finally {
      setLoadingSpreadsheets(false);
    }
  };

  const handleCustomSpreadsheetChange = async (sheetId: string) => {
    setCustomSpreadsheetId(sheetId);
    await loadData(sheetId);
    showToast(sheetId === "monthly" ? "Menggunakan database bulanan otomatis" : "Menggunakan spreadsheet GDrive terpilih", "success");
  };

  const loadData = async (targetId?: string | null) => {
    try {
      setLoading(true);
      setError("");
      if (user?.isGuest) {
        const stored = localStorage.getItem("guest_transactions");
        const txs = stored ? JSON.parse(stored) : [];
        setTransactions(txs);
        setSpreadsheetId("guest-spreadsheet");
      } else {
        const activeId = targetId !== undefined ? targetId : customSpreadsheetId;
        const data = await fetchFinances(activeId);
        setTransactions(data.transactions);
        setSpreadsheetId(data.spreadsheetId);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    if (!user?.isGuest) {
      loadSpreadsheetsList();
    }
  }, []);

  // WhatsApp bot script copying helper
  const handleCopyAppsScript = () => {
    const code = getAppsScriptTemplate(spreadsheetId);
    navigator.clipboard.writeText(code);
    setCopiedScript(true);
    showToast("Kode Google Apps Script berhasil disalin!", "success");
    setTimeout(() => setCopiedScript(false), 3000);
  };

  const handleSendChatMessage = async (msgText: string) => {
    if (!msgText.trim()) return;

    const userMsgText = msgText;
    const timeNow = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    
    const userMsgObj = {
      id: Date.now().toString(),
      sender: "user" as const,
      text: userMsgText,
      timestamp: timeNow
    };

    setChatMessages(prev => [...prev, userMsgObj]);
    setChatInput("");
    setBotIsTyping(true);

    setTimeout(async () => {
      let responseText = "";
      const lowerInput = userMsgText.trim().toLowerCase();

      if (lowerInput === "!bantuan" || lowerInput === "bantuan" || lowerInput === "help" || lowerInput === "/help") {
        responseText = `🤖 *Asisten WA Keuanganku* - Daftar Perintah:\n\n` +
          `• *!saldo* - Cek ringkasan saldo, pemasukan, & pengeluaran aktual.\n` +
          `• *!summary* - Rekomendasi/analisis finansial dari kembaran otak AI Anda.\n` +
          `• *!tambah [income/expense] [jumlah] [kategori] [deskripsi]* - Tambah transaksi instan via chat.\n` +
          `  _Contoh: !tambah expense 15000 Makan Es Jeruk_\n` +
          `• *!reset* - Reset seluruh transaksi.`;
      } else if (lowerInput === "!saldo" || lowerInput === "saldo") {
        responseText = `🔵 *Rangkuman Saldo Anda* 🤖\n\n` +
          `• *Total Saldo*: Rp ${(totalIncome - totalExpense).toLocaleString("id-ID")}\n` +
          `• *Pemasukan 🟢*: Rp ${totalIncome.toLocaleString("id-ID")}\n` +
          `• *Pengeluaran 🔴*: Rp ${totalExpense.toLocaleString("id-ID")}\n` +
          `• *Limit Anggaran*: Rp ${monthlyBudget.toLocaleString("id-ID")}\n` +
          `• *Sisa Batas Anggaran*: Rp ${(monthlyBudget - totalExpense).toLocaleString("id-ID")}\n\n` +
          `_Cerdas mengelola uang bersama Keuanganku!_`;
      } else if (lowerInput === "!summary" || lowerInput === "summary") {
        responseText = `🤖 *Rekomendasi Asisten AI Keuanganku*:\n\n` +
          `${aiSummary || "Analisis AI Anda belum di-generate atau kosong. Silakan masuk ke panel 'Asisten AI' lalu klik 'Analisis Sekarang' untuk men-sinkronisasi otak AI!"}`;
      } else if (lowerInput.startsWith("!tambah")) {
        const parts = userMsgText.split(/\s+/);
        if (parts.length < 5) {
          responseText = `❌ *Gagal menambah transaksi*.\n\n_Format salah! Harap gunakan format:_\n*!tambah [income/expense] [jumlah] [kategori] [deskripsi]*\n\n_Contoh:_ *!tambah expense 25000 Makanan Makan Siang Bakso*`;
        } else {
          const rawType = parts[1].toLowerCase();
          const txType: "Income" | "Expense" = rawType === "income" || rawType === "pemasukan" ? "Income" : "Expense";
          const txAmount = Number(parts[2]);
          const txCategory = parts[3];
          const txDesc = parts.slice(4).join(" ");

          if (isNaN(txAmount) || txAmount <= 0) {
            responseText = `❌ *Gagal mencatat*: Jumlah transaksi harus berupa angka positif yang valid!`;
          } else {
            try {
              if (user?.isGuest) {
                const newTx = {
                  id: Date.now().toString(),
                  amount: txAmount,
                  type: txType,
                  category: txCategory,
                  description: txDesc,
                  date: new Date().toISOString().split('T')[0]
                };
                const stored = localStorage.getItem("guest_transactions");
                const txs = stored ? JSON.parse(stored) : [];
                const updated = [newTx, ...txs];
                localStorage.setItem("guest_transactions", JSON.stringify(updated));
                setTransactions(updated);
              } else {
                await addTransaction({
                  spreadsheetId: spreadsheetId || "",
                  amount: txAmount,
                  type: txType,
                  category: txCategory,
                  description: txDesc,
                  date: new Date().toISOString().split('T')[0]
                });
                await loadData();
              }
              responseText = `✅ *Pencatatan Otomatis Sukses* 🤖\n\n` +
                `Berhasil mencatat *${txType === "Income" ? "Pemasukan 🟢" : "Pengeluaran 🔴"}* baru:\n` +
                `• *Jumlah*: Rp ${txAmount.toLocaleString("id-ID")}\n` +
                `• *Kategori*: ${txCategory}\n` +
                `• *Keterangan*: ${txDesc}\n\n` +
                `_Data Anda telah langsung tersinkronisasi dengan Database spreadsheet!_`;
            } catch (err: any) {
              responseText = `❌ *Pencatatan Gagal*: ${err.message}`;
            }
          }
        }
      } else if (lowerInput === "!reset" || lowerInput === "reset") {
        try {
          if (user?.isGuest) {
            localStorage.removeItem("guest_transactions");
            setTransactions([]);
          } else {
            await resetTransactions(spreadsheetId || "");
            await loadData();
          }
          responseText = `🗑️ *Reset Keuangan Sukses* 🤖\n\nSeluruh riwayat transaksi Anda telah berhasil dikosongkan secara berkala sesuai instruksi chat Anda.`;
        } catch (e: any) {
          responseText = `❌ *Gagal me-reset*: ${e.message}`;
        }
      } else {
        responseText = `Halo! Perintah *"${userMsgText}"* tidak dikenali.\n\nSilakan ketik *!bantuan* untuk mendaftar fungsi otomatis asisten Bot Keuanganku. 🤖`;
      }

      setChatMessages(prev => [...prev, {
        id: Date.now().toString() + "_reply",
        sender: "bot",
        text: responseText,
        timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
      }]);
      setBotIsTyping(false);

      if (waBotEnabled && phone) {
        try {
          await sendWANotification(phone, responseText);
        } catch (waErr) {
          console.error("Fonnte Real WA push error:", waErr);
        }
      }
    }, 1000);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!spreadsheetId) return;
    try {
      setIsAdding(true);
      const inputAmount = Number(amount);
      const isExpense = type === "Expense";
      
      let updatedList: Transaction[] = [];

      if (user?.isGuest) {
        const newTx: Transaction = {
          id: Date.now().toString(),
          amount: inputAmount,
          type,
          category,
          description: desc,
          date
        };
        const stored = localStorage.getItem("guest_transactions");
        const txs = stored ? JSON.parse(stored) : [];
        updatedList = [newTx, ...txs];
        localStorage.setItem("guest_transactions", JSON.stringify(updatedList));
        setTransactions(updatedList);
      } else {
        await addTransaction({
          spreadsheetId,
          amount: inputAmount,
          type,
          category,
          description: desc,
          date
        });
        const liveData = await fetchFinances(spreadsheetId);
        updatedList = liveData.transactions;
        setTransactions(updatedList);
      }

      if (waBotEnabled && waBotNotifyOnAdd) {
        const timeStr = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
        const dateFormatted = format(parseISO(date), "dd MMMM yyyy", { locale: id });
        const textMsg = `🔔 *NOTIFIKASI TRANSAKSI BARU* 🤖\n\n` +
          `• *Keterangan*: ${desc || "Tanpa Keterangan"}\n` +
          `• *Tanggal*: ${dateFormatted}\n` +
          `• *Jenis*: ${type === "Income" ? "Pemasukan 🟢" : "Pengeluaran 🔴"}\n` +
          `• *Kategori*: ${category}\n` +
          `• *Nominal*: Rp ${inputAmount.toLocaleString("id-ID")}`;
        
        setChatMessages(prev => [...prev, {
          id: Date.now().toString() + "_addNotify",
          sender: "bot",
          text: textMsg,
          timestamp: timeStr
        }]);

        if (waBotNotifyOnBudget && monthlyBudget > 0 && isExpense) {
          const currentExpenses = updatedList.filter(t => t.type === "Expense").reduce((sum, t) => sum + t.amount, 0);
          if (currentExpenses > monthlyBudget) {
            const textBudget = `⚠️ *PERINGATAN ANGGARAN BULANAN* 🤖\n\n` +
              `Total Pengeluaran Anda saat ini (*Rp ${currentExpenses.toLocaleString("id-ID")}*) telah MELEBIHI batas anggaran bulanan sebesar *Rp ${monthlyBudget.toLocaleString("id-ID")}*!\n\n_Harap hemat anggaran belanja Anda demi kestabilan tabungan._`;
            setChatMessages(prev => [...prev, {
              id: Date.now().toString() + "_budgetNotify",
              sender: "bot",
              text: textBudget,
              timestamp: timeStr
            }]);

            if (phone) {
              try {
                await sendWANotification(phone, textBudget);
              } catch (waBudgetErr) {
                console.error("Simulation notify budget limit error: ", waBudgetErr);
              }
            }
          }
        }
      }

      if (waNotify && phone) {
         try {
           const timeString = format(new Date(), "HH:mm");
           const dateFormatted = format(parseISO(date), "dd MMMM yyyy", { locale: id });
           const msg = `*Keuanganku - Info Transaksi*\n\nTanggal: ${dateFormatted}\nJam: ${timeString}\nJenis: ${type === "Income" ? "Pemasukan 🟢" : "Pengeluaran 🔴"}\nKategori: ${category}\nNominal: Rp ${inputAmount.toLocaleString("id-ID")}\nKeterangan: ${desc}`;
           await sendWANotification(phone, msg);
         } catch (waErr) {
           console.error("Simulation notify hook: ", waErr);
         }
      }

      showToast("Transaksi berhasil ditambahkan!", "success");
      await loadData();
      setAmount("");
      setDesc("");
    } catch (err: any) {
      showToast("Gagal menambah transaksi: " + err.message, "error");
    } finally {
      setIsAdding(false);
    }
  };

  const handleAddReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reminderSummary || !reminderDate) {
      showToast("Judul pengingat dan tanggal harus diisi", "error");
      return;
    }
    try {
      if (user?.isGuest) {
        const localReminders = JSON.parse(localStorage.getItem("guest_reminders") || "[]");
        const newReminder = { id: Date.now().toString(), summary: reminderSummary, date: reminderDate };
        localStorage.setItem("guest_reminders", JSON.stringify([...localReminders, newReminder]));
        showToast("Pengingat berhasil disimpan lokal (Mode Tamu)!", "success");
        setReminderSummary("");
        setReminderDate("");
      } else {
        const res = await addCalendarReminder(reminderSummary, "Pengingat dari Keuanganku", new Date(reminderDate).toISOString());
        showToast("Pengingat berhasil ditambahkan!", "success");
        setReminderSummary("");
        setReminderDate("");
        if (res.eventLink) {
          window.open(res.eventLink, "_blank");
        }
      }
    } catch (err: any) {
      showToast("Gagal menambahkan pengingat: " + err.message, "error");
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!spreadsheetId) return;
    showConfirm(
      "Hapus Transaksi",
      "Apakah Anda yakin ingin menghapus transaksi ini?",
      async () => {
        try {
          setDeletingId(id);
          if (user?.isGuest) {
            const stored = localStorage.getItem("guest_transactions");
            const txs: Transaction[] = stored ? JSON.parse(stored) : [];
            const updated = txs.filter(t => t.id !== id);
            localStorage.setItem("guest_transactions", JSON.stringify(updated));
            setTransactions(updated);
            showToast("Transaksi berhasil dihapus", "success");
          } else {
            await deleteTransaction(id, spreadsheetId);
            showToast("Transaksi berhasil dihapus", "success");
            await loadData();
          }
        } catch (err: any) {
          showToast("Gagal menghapus transaksi: " + err.message, "error");
        } finally {
          setDeletingId(null);
        }
      }
    );
  };

  const handleResetTransactions = async () => {
    if (!spreadsheetId) return;
    showConfirm(
      "Reset Semua Transaksi",
      "PERINGATAN: Semua data transaksi akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.",
      async () => {
        try {
          setIsResetting(true);
          if (user?.isGuest) {
            localStorage.removeItem("guest_transactions");
            setTransactions([]);
            showToast("Seluruh transaksi berhasil direset", "success");
          } else {
            await resetTransactions(spreadsheetId);
            showToast("Seluruh transaksi berhasil direset", "success");
            await loadData();
          }
        } catch (err: any) {
          showToast("Gagal mereset transaksi: " + err.message, "error");
        } finally {
          setIsResetting(false);
        }
      },
      "Hapus Semua"
    );
  };

  // Math aggregates
  const totalIncome = filteredTransactions.filter(t => t.type === "Income").reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = filteredTransactions.filter(t => t.type === "Expense").reduce((sum, t) => sum + t.amount, 0);
  const balance = totalIncome - totalExpense;
  const remainingBudget = monthlyBudget - totalExpense;
  const budgetPercent = monthlyBudget > 0 ? (totalExpense / monthlyBudget) * 100 : 0;

  const expensesByCategory = filteredTransactions
    .filter(t => t.type === "Expense")
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);

  const chartData = Object.keys(expensesByCategory).map(key => ({
    name: key,
    value: expensesByCategory[key]
  }));

  const COLORS = ['#6a8d73', '#f0a868', '#a78bfa', '#ec4899', '#3b82f6', '#f43f5e', '#a3e635', '#2dd4bf'];

  if (loading && transactions.length === 0) {
    return (
      <div className={`flex ${ui.bg} items-center justify-center min-h-screen relative overflow-hidden transition-colors duration-500`}>
        <div className={`absolute top-[-10%] right-[-10%] w-[500px] h-[500px] ${theme.bg1} rounded-full blur-[120px] pointer-events-none -z-10`}></div>
        <div className={`absolute bottom-[-5%] left-[-5%] w-[400px] h-[400px] ${theme.bg2} rounded-full blur-[100px] pointer-events-none -z-10`}></div>
        <div className={`flex flex-col items-center text-[#6a8d73]`}>
          <RefreshCw className="w-8 h-8 animate-spin mb-4" />
          <p className="font-mono text-sm">Menyiapkan Database Spreadsheet & Sinkronisasi...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${ui.bg} flex flex-col font-sans pb-20 relative overflow-hidden transition-colors duration-500`}>
      {/* Dynamic Backglow Orbs */}
      <div className={`absolute top-[-10%] right-[-10%] w-[500px] h-[500px] ${theme.bg1} rounded-full blur-[120px] pointer-events-none -z-10 transition-colors duration-700 ${isLight ? 'opacity-55' : 'opacity-100'}`}></div>
      <div className={`absolute bottom-[-5%] left-[-5%] w-[400px] h-[400px] ${theme.bg2} rounded-full blur-[100px] pointer-events-none -z-10 transition-colors duration-700 ${isLight ? 'opacity-55' : 'opacity-100'}`}></div>

      {/* Header */}
      <header className={`${isLight ? 'bg-white/40 border-slate-200/60' : 'bg-[#101b14]/70 border-white/5'} backdrop-blur-xl border-b sticky top-0 z-10 px-4 py-3.5 md:px-8 shadow-xs transition-colors duration-500`}>
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div 
            className="flex items-center gap-3 cursor-pointer group" 
            onClick={() => setActivePage("dashboard")}
            title="Ke Dashboard"
          >
            <AppLogo 
              size={38} 
              showText={true} 
              titleClassName={ui.textMain}
              subtitleClassName={ui.textMuted}
            />
            <div className="hidden sm:flex items-center gap-2 font-mono text-[11px] h-4 mt-0.5 border-l pl-3 border-slate-200 dark:border-slate-800">
              <span className="text-[10px] bg-[#6a8d73]/15 text-[#6a8d73] px-2 py-0.5 rounded-full font-bold">v2.1</span>
              <span className={`${ui.textMuted} font-bold ml-1`}>
                {customName || user?.displayName || "Tamu Keuanganku"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Quick dashboard config tabs */}
            <button
              onClick={() => setActivePage(activePage === "dashboard" ? "profile" : "dashboard")}
              className={`p-2 rounded-xl transition-all border flex items-center justify-center gap-1.5 font-bold text-xs ${
                activePage === "profile" 
                  ? 'bg-[#6a8d73] text-white border-transparent' 
                  : `${isLight ? 'bg-white text-slate-705 border-slate-200 hover:bg-slate-50' : 'bg-white/5 text-slate-200 border-white/10 hover:bg-white/10'}`
              }`}
              title="Buka Pengaturan"
            >
              <Settings className="w-3.5 h-3.5" />
              <span className="hidden sm:inline-block">Pengaturan</span>
            </button>

            <button
              onClick={() => setColorMode(isLight ? "dark" : "light")}
              className={`p-2 rounded-xl border ${isLight ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50' : 'bg-white/5 border-white/10 text-slate-300'}`}
              title="Alihkan Mode Gelap/Terang"
            >
              {isLight ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
            </button>

            {/* Quick theme drop selector */}
            <div className={`hidden sm:flex items-center gap-1 px-2.5 py-1 ${isLight ? 'bg-white border-slate-200' : 'bg-white/5 border-white/10'} rounded-xl border`}>
              <Palette className={`w-3 h-3 ${ui.textMuted}`} />
              <select 
                value={themeMode}
                onChange={e => setThemeMode(e.target.value as any)}
                className={`bg-transparent text-[11px] font-bold ${ui.textMuted} outline-none cursor-pointer`}
              >
                <option value="emerald" className={ui.selectOption}>Sage Green</option>
                <option value="blue" className={ui.selectOption}>Royal Blue</option>
                <option value="purple" className={ui.selectOption}>Lavender</option>
                <option value="rose" className={ui.selectOption}>Rose</option>
                <option value="pink" className={ui.selectOption}>Sweet Pink</option>
              </select>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full p-4 md:p-6 space-y-6">
        {/* Error bar alert box */}
        {error && (
          <div className="bg-red-500/10 text-red-500 p-4 rounded-3xl text-xs mb-4 border border-red-500/20 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        {/* Paginated Switch router views */}
        {activePage === "profile" ? (
          <SettingsPanel
            user={user}
            onLogout={onLogout}
            customName={customName}
            setCustomName={setCustomName}
            customPhoto={customPhoto}
            setCustomPhoto={setCustomPhoto}
            phone={phone}
            setPhone={setPhone}
            dob={dob}
            setDob={setDob}
            themeMode={themeMode}
            setThemeMode={setThemeMode}
            colorMode={colorMode}
            setColorMode={setColorMode}
            designStyle={designStyle}
            setDesignStyle={setDesignStyle}
            monthlyBudget={monthlyBudget}
            setMonthlyBudget={setMonthlyBudget}
            spreadsheetsList={spreadsheetsList}
            loadingSpreadsheets={loadingSpreadsheets}
            loadSpreadsheetsList={loadSpreadsheetsList}
            customSpreadsheetId={customSpreadsheetId}
            handleCustomSpreadsheetChange={handleCustomSpreadsheetChange}
            waBotEnabled={waBotEnabled}
            setWaBotEnabled={setWaBotEnabled}
            waBotNotifyOnAdd={waBotNotifyOnAdd}
            setWaBotNotifyOnAdd={setWaBotNotifyOnAdd}
            waBotNotifyOnBudget={waBotNotifyOnBudget}
            setWaBotNotifyOnBudget={setWaBotNotifyOnBudget}
            handleCopyAppsScript={handleCopyAppsScript}
            copiedScript={copiedScript}
            handleResetTransactions={handleResetTransactions}
            isResetting={isResetting}
            handleSaveProfile={handleSaveProfile}
            handlePhotoUpload={handlePhotoUpload}
            isLight={isLight}
            isCute={isCute}
            ui={ui}
            theme={theme}
            onBack={() => setActivePage("dashboard")}
          />
        ) : (
          <>
            {/* Primary Dashboard layout */}
            {/* Database Sheets Indicator (Not guest user) */}
            {!user?.isGuest && (
              <div className={`${ui.panelBg} border p-4 ${ui.panelRadius} flex flex-col sm:flex-row items-center justify-between gap-4 transition-all duration-500`}>
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-green-500/10 text-green-500">
                    <Database className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <h4 className={`text-xs font-bold ${ui.textMain}`}>Database Google Sheets Terhubung</h4>
                    <p className={`text-[10px] ${ui.textMuted}`}>Semua catatan tersimpan rapi dan aman di berkas spreadsheet Cloud Drive Anda</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <select
                    value={customSpreadsheetId || "monthly"}
                    onChange={(e) => handleCustomSpreadsheetChange(e.target.value)}
                    className={`w-full sm:w-60 ${ui.inputBg} border ${ui.inputRadius} px-3 py-1.5 text-xs focus:ring-2 ${theme.focus} outline-none cursor-pointer font-bold`}
                  >
                    <option value="monthly">📂 Koleksi Bulanan Otomatis</option>
                    {spreadsheetsList.map(item => (
                      <option key={item.id} value={item.id}>📄 {item.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={loadSpreadsheetsList}
                    disabled={loadingSpreadsheets}
                    className={`p-2.5 rounded-xl border ${isLight ? 'border-slate-200 text-slate-700' : 'border-white/10 text-slate-300'} hover:opacity-80 transition-opacity`}
                    title="Refresh Database GDrive"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingSpreadsheets ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>
            )}

            {/* Balances & Budgets Row */}
            <div className="space-y-4">
              <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className={`bg-gradient-to-br ${theme.card} text-white p-5 ${ui.panelRadius} shadow-xl relative overflow-hidden transition-all duration-500`}>
                  <div className={`absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl`}></div>
                  <p className="text-white/80 text-xs mb-1 relative font-semibold uppercase tracking-wide">Total Saldo</p>
                  <h2 className="text-2xl font-bold relative tracking-tight">Rp {balance.toLocaleString("id-ID")}</h2>
                </div>
                <div className={`${ui.panelBg} border p-5 ${ui.panelRadius} flex flex-col justify-center transition-all duration-500`}>
                  <div className="flex items-center gap-1.5 text-green-500 mb-1">
                    <ArrowUpCircle className="w-4 h-4" />
                    <p className="text-xs font-bold uppercase tracking-wide">Pemasukan</p>
                  </div>
                  <h2 className={`text-xl font-bold ${ui.textMain} tracking-tight`}>Rp {totalIncome.toLocaleString("id-ID")}</h2>
                </div>
                <div className={`${ui.panelBg} border p-5 ${ui.panelRadius} flex flex-col justify-center transition-all duration-500`}>
                  <div className="flex items-center gap-1.5 text-red-500 mb-1">
                    <ArrowDownCircle className="w-4 h-4" />
                    <p className="text-xs font-bold uppercase tracking-wide">Pengeluaran</p>
                  </div>
                  <h2 className={`text-xl font-bold ${ui.textMain} tracking-tight`}>Rp {totalExpense.toLocaleString("id-ID")}</h2>
                </div>
                <div className={`${ui.panelBg} border p-5 ${ui.panelRadius} flex flex-col justify-center transition-all duration-500`}>
                  <div className={`flex items-center gap-1.5 ${remainingBudget < 0 ? 'text-red-500' : theme.icon} mb-1`}>
                    <Target className="w-4 h-4" />
                    <p className="text-xs font-bold uppercase tracking-wide">Sisa Anggaran</p>
                  </div>
                  <h2 className={`text-xl font-bold ${ui.textMain} tracking-tight`}>Rp {remainingBudget.toLocaleString("id-ID")}</h2>
                </div>
              </section>

              {/* Budget Progress Bar */}
              <section className={`${ui.panelBg} border p-5 ${ui.panelRadius} flex flex-col md:flex-row gap-6 items-center transition-all duration-500`}>
                <div className="flex-1 w-full space-y-2.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className={`font-bold ${ui.textMain}`}>Batas Penggunaan Budget Belanja Bulanan</span>
                    <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold ${budgetPercent > 100 ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-600 dark:text-green-400'}`}>
                      {budgetPercent.toFixed(1)}% Terpakai
                    </span>
                  </div>
                  <div className={`h-3 w-full ${isLight ? 'bg-slate-100' : 'bg-slate-900'} rounded-full overflow-hidden border border-slate-500/5`}>
                    <div 
                      className={`h-full ${budgetPercent > 100 ? 'bg-red-500' : theme.bgIcon} transition-all duration-500`} 
                      style={{ width: `${Math.min(budgetPercent, 100)}%` }}
                    ></div>
                  </div>
                </div>
                <div className="w-full md:w-56 leading-none">
                  <label className={`block text-[10px] font-bold ${ui.textMuted} mb-1.5 uppercase tracking-wider`}>Set Budget Bulanan</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">Rp</span>
                    <input 
                      type="number" 
                      value={monthlyBudget || ""} 
                      onChange={e => setMonthlyBudget(Number(e.target.value))}
                      placeholder="0"
                      className={`w-full ${ui.inputBg} border ${ui.inputRadius} pl-9 pr-3.5 py-2 text-xs font-bold focus:ring-2 ${theme.focus} outline-none transition-shadow`}
                    />
                  </div>
                </div>
              </section>
            </div>

            {/* Split dashboard column layouts */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left major side: transaction list and adder form */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Form Adder Component */}
                <div className={`${ui.panelBg} border ${ui.panelRadius} p-5 sm:p-6 transition-all duration-500`}>
                  <h3 className={`text-base font-bold ${ui.textMain} mb-4 flex items-center gap-2`}>
                    <PlusCircle className={`w-5 h-5 ${theme.icon}`} /> Tambah Transaksi Keuangan
                  </h3>
                  <form onSubmit={handleAdd} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className={`block text-[10px] font-bold ${ui.textMuted} mb-1.5 uppercase`}>Jenis Transaksi</label>
                        <select 
                          value={type} 
                          onChange={e => setType(e.target.value as "Income" | "Expense")}
                          className={`w-full ${ui.inputBg} border ${ui.inputRadius} px-3.5 py-2.5 text-xs font-bold focus:ring-2 ${theme.focus} outline-none transition-shadow`}
                        >
                          <option value="Expense" className={ui.selectOption}>Pengeluaran</option>
                          <option value="Income" className={ui.selectOption}>Pemasukan</option>
                        </select>
                      </div>
                      <div>
                        <label className={`block text-[10px] font-bold ${ui.textMuted} mb-1.5 uppercase`}>Tanggal</label>
                        <input 
                          type="date" 
                          value={date}
                          onChange={e => setDate(e.target.value)}
                          className={`w-full ${ui.inputBg} border ${ui.inputRadius} px-3.5 py-2 text-xs font-bold focus:ring-2 ${theme.focus} outline-none`}
                          style={{ colorScheme: isLight ? 'light' : 'dark' }}
                          required
                        />
                      </div>
                      <div>
                        <label className={`block text-[10px] font-bold ${ui.textMuted} mb-1.5 uppercase`}>Kategori</label>
                        {type === "Expense" ? (
                          <select 
                            value={category} 
                            onChange={e => setCategory(e.target.value)}
                            className={`w-full ${ui.inputBg} border ${ui.inputRadius} px-3.5 py-2.5 text-xs font-bold focus:ring-2 ${theme.focus} outline-none transition-shadow`}
                          >
                            <option value="Makanan" className={ui.selectOption}>Makanan 🍔</option>
                            <option value="Transportasi" className={ui.selectOption}>Transportasi 🚗</option>
                            <option value="Belanja" className={ui.selectOption}>Belanja 🛍️</option>
                            <option value="Tagihan" className={ui.selectOption}>Tagihan ⚡</option>
                            <option value="Hiburan" className={ui.selectOption}>Hiburan 🎬</option>
                            <option value="Kesehatan" className={ui.selectOption}>Kesehatan 💊</option>
                            <option value="Lainnya" className={ui.selectOption}>Lainnya 📦</option>
                          </select>
                        ) : (
                          <input 
                            type="text" 
                            value={category}
                            onChange={e => setCategory(e.target.value)}
                            placeholder="Gaji, Investasi, Bonus, dll"
                            className={`w-full ${ui.inputBg} border ${ui.inputRadius} px-3.5 py-2.5 text-xs font-bold focus:ring-2 ${theme.focus} outline-none`}
                            required
                          />
                        )}
                      </div>
                      <div>
                        <label className={`block text-[10px] font-bold ${ui.textMuted} mb-1.5 uppercase`}>Nominal Rupiah (Rp)</label>
                        <input 
                          type="number" 
                          value={amount}
                          onChange={e => setAmount(e.target.value)}
                          placeholder="Masukkan angka nominal"
                          className={`w-full ${ui.inputBg} border ${ui.inputRadius} px-3.5 py-2 text-xs font-bold focus:ring-2 ${theme.focus} outline-none`}
                          required
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className={`block text-[10px] font-bold ${ui.textMuted} mb-1.5 uppercase`}>Keterangan Deskripsi</label>
                        <input 
                          type="text" 
                          value={desc}
                          onChange={e => setDesc(e.target.value)}
                          placeholder="Format: Beli kuota internet, cilok bakar sore, dll"
                          className={`w-full ${ui.inputBg} border ${ui.inputRadius} px-3.5 py-2 text-xs font-bold focus:ring-2 ${theme.focus} outline-none`}
                          required
                        />
                      </div>
                      
                      {/* WA trigger toggle info */}
                      <div className="sm:col-span-2 flex items-center gap-2 mt-1">
                        <input 
                          type="checkbox" 
                          id="wa-notify"
                          checked={waNotify}
                          onChange={e => setWaNotify(e.target.checked)}
                          className="w-4 h-4 rounded border-slate-350 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                        <label htmlFor="wa-notify" className={`text-xs font-bold ${ui.textMuted} cursor-pointer select-none`}>
                          Kirim notifikasi ringkasan langsung ke nomor WhatsApp
                        </label>
                      </div>

                      {waNotify && (
                        <div className="sm:col-span-2">
                          <label className={`block text-[10px] font-bold ${ui.textMuted} mb-1.5 uppercase`}>Nomor WhatsApp Pemantau</label>
                          <input 
                            type="tel" 
                            value={phone}
                            onChange={e => setPhone(e.target.value)}
                            placeholder="Masukan nomor WA tanpa sandi negara, misal: 08123456789"
                            className={`w-full ${ui.inputBg} border ${ui.inputRadius} px-3.5 py-2 text-xs font-bold focus:ring-2 ${theme.focus} outline-none`}
                            required={waNotify}
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex justify-end pt-3">
                      <button 
                        type="submit" 
                        disabled={isAdding}
                        className={`${theme.bgIcon} hover:opacity-90 active:scale-95 text-white font-bold py-2.5 px-6 ${ui.buttonRadius} text-xs transition-all disabled:opacity-50 flex items-center gap-2 ${theme.shadow}`}
                      >
                        {isAdding ? <RefreshCw className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
                        Simpan Catatan Finansial
                      </button>
                    </div>
                  </form>
                </div>

                {/* Latest Records lists */}
                <div className={`${ui.panelBg} border ${ui.panelRadius} p-5 sm:p-6 transition-all duration-500 flex flex-col`}>
                  <div className="flex justify-between items-center mb-4 border-b pb-2.5">
                    <h3 className={`text-xs font-bold ${ui.textMain} uppercase tracking-wider flex items-center gap-2`}>
                      Riwayat Transaksi Terakhir
                      {loading && !isAdding && !isResetting && !deletingId && <RefreshCw className={`w-3.5 h-3.5 ${theme.icon} animate-spin`} /> }
                    </h3>
                    <div className="flex items-center gap-1.5">
                      {transactions.length > 0 && (
                        <button 
                          onClick={handleResetTransactions}
                          disabled={isResetting}
                          className="text-[10px] font-bold px-2.5 py-1 flex items-center gap-1.5 bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 rounded-full transition-colors disabled:opacity-50"
                          title="Kosongkan Semua Transaksi"
                        >
                          {isResetting ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />} Reset
                        </button>
                      )}
                      <button 
                        onClick={handleExportCSV}
                        className={`text-[10px] font-bold px-2.5 py-1 flex items-center gap-1.5 ${isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-705' : 'bg-white/5 hover:bg-white/10 text-slate-200'} border border-slate-500/5 rounded-full transition-colors`}
                      >
                        <Download className="w-3 h-3" /> Export CSV
                      </button>
                    </div>
                  </div>

                  {/* Date Filter Bar */}
                  <div className="mb-4">
                    <div className="flex flex-wrap items-center gap-1.5 mb-3">
                      <span className={`text-[10px] font-bold ${ui.textMuted} uppercase mr-1`}>Rentang Waktu:</span>
                      <button
                        type="button"
                        onClick={() => setFilterPreset("all")}
                        className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold transition-all border ${
                          filterPreset === "all"
                            ? 'bg-[#6a8d73] text-white border-[#6a8d73]'
                            : `${isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200' : 'bg-[#18261e] hover:bg-[#1e3226] text-emerald-100 border-emerald-950'}`
                        }`}
                      >
                        Semua
                      </button>
                      <button
                        type="button"
                        onClick={() => setFilterPreset("today")}
                        className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold transition-all border ${
                          filterPreset === "today"
                            ? 'bg-[#6a8d73] text-white border-[#6a8d73]'
                            : `${isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200' : 'bg-[#18261e] hover:bg-[#1e3226] text-emerald-100 border-emerald-950'}`
                        }`}
                      >
                        Hari Ini
                      </button>
                      <button
                        type="button"
                        onClick={() => setFilterPreset("7days")}
                        className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold transition-all border ${
                          filterPreset === "7days"
                            ? 'bg-[#6a8d73] text-white border-[#6a8d73]'
                            : `${isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200' : 'bg-[#18261e] hover:bg-[#1e3226] text-emerald-100 border-emerald-950'}`
                        }`}
                      >
                        7 Hari
                      </button>
                      <button
                        type="button"
                        onClick={() => setFilterPreset("30days")}
                        className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold transition-all border ${
                          filterPreset === "30days"
                            ? 'bg-[#6a8d73] text-white border-[#6a8d73]'
                            : `${isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200' : 'bg-[#18261e] hover:bg-[#1e3226] text-emerald-100 border-emerald-950'}`
                        }`}
                      >
                        30 Hari
                      </button>
                      <button
                        type="button"
                        onClick={() => setFilterPreset("thisMonth")}
                        className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold transition-all border ${
                          filterPreset === "thisMonth"
                            ? 'bg-[#6a8d73] text-white border-[#6a8d73]'
                            : `${isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200' : 'bg-[#18261e] hover:bg-[#1e3226] text-emerald-100 border-emerald-950'}`
                        }`}
                      >
                        Bulan Ini
                      </button>
                      <button
                        type="button"
                        onClick={() => setFilterPreset("custom")}
                        className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold transition-all border ${
                          filterPreset === "custom"
                            ? 'bg-[#6a8d73] text-white border-[#6a8d73]'
                            : `${isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200' : 'bg-[#18261e] hover:bg-[#1e3226] text-emerald-100 border-emerald-950'}`
                        }`}
                      >
                        Kustom
                      </button>
                    </div>

                    {filterPreset === "custom" && (
                      <div className={`grid grid-cols-2 gap-3 p-3 rounded-2xl border ${isLight ? 'bg-slate-50/70 border-slate-200/55' : 'bg-[#18261e]/40 border-emerald-950/40'} animate-fadeIn mb-1`}>
                        <div>
                          <label className={`block text-[9px] font-bold ${ui.textMuted} mb-1 uppercase tracking-wide`}>Mulai Tanggal</label>
                          <input
                            type="date"
                            value={filterStartDate}
                            onChange={(e) => setFilterStartDate(e.target.value)}
                            className={`w-full ${ui.inputBg} border ${ui.inputRadius} px-2.5 py-1.5 text-[11px] font-semibold outline-none focus:ring-2 ${theme.focus}`}
                          />
                        </div>
                        <div>
                          <label className={`block text-[9px] font-bold ${ui.textMuted} mb-1 uppercase tracking-wide`}>Sampai Tanggal</label>
                          <input
                            type="date"
                            value={filterEndDate}
                            onChange={(e) => setFilterEndDate(e.target.value)}
                            className={`w-full ${ui.inputBg} border ${ui.inputRadius} px-2.5 py-1.5 text-[11px] font-semibold outline-none focus:ring-2 ${theme.focus}`}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3.5 flex-1 max-h-[460px] overflow-y-auto scrollbar-thin">
                    {filteredTransactions.slice().reverse().map((t, idx) => (
                      <div 
                        key={t.id || idx} 
                        className={`flex items-center gap-3.5 ${isLight ? 'hover:bg-slate-50/70 border-slate-100' : 'hover:bg-white/2 border-white/2'} p-2 rounded-2xl border transition-colors group relative`}
                      >
                        <div className={`w-9.5 h-9.5 rounded-full flex items-center justify-center shrink-0 ${
                          t.type === 'Income' 
                            ? 'bg-green-500/10 text-green-500' 
                            : 'bg-red-500/10 text-red-500'
                        }`}>
                          {t.type === 'Income' ? (
                            <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-bold ${ui.textMain} truncate`}>{t.description}</p>
                          <p className={`text-[10px] ${ui.textMuted} font-semibold mt-0.5`}>
                            {t.category} • {t.date ? format(new Date(t.date), 'dd MMM yyyy', { locale: id }) : ""}
                          </p>
                        </div>
                        <div className={`font-mono text-xs font-bold text-right shrink-0 ${t.type === 'Income' ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                          {t.type === 'Income' ? '+' : '-'} Rp {t.amount.toLocaleString("id-ID")}
                        </div>
                        <button 
                          onClick={() => handleDeleteTransaction(t.id)}
                          disabled={deletingId === t.id}
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-xl text-red-500 hover:bg-red-500/10 transition-all focus:opacity-100 outline-none shrink-0"
                          title="Hapus baris catatan"
                        >
                          {deletingId === t.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    ))}
                    
                    {transactions.length === 0 && !loading && (
                      <div className={`text-center py-10 ${ui.textMuted} text-xs font-semibold`}>Belum ada riwayat transaksi terinput.</div>
                    )}

                    {transactions.length > 0 && filteredTransactions.length === 0 && !loading && (
                      <div className={`text-center py-10 ${ui.textMuted} text-xs font-semibold`}>
                        Tidak ada catatan keuangan pada periode ini.
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Right minor side: charts, AI Summary, WA simulation */}
              <div className="space-y-6">
                
                {/* Visual Circle Recharts pie */}
                <div className={`${ui.panelBg} border ${ui.panelRadius} p-5 flex flex-col transition-all duration-500 shadow-sm`}>
                  <h3 className={`text-xs font-bold ${ui.textMain} mb-5 uppercase tracking-wider flex items-center gap-2`}>
                    <PieChartIcon className={`w-4 h-4 ${theme.icon}`} /> Distribusi Pengeluaran
                  </h3>
                  {chartData.length > 0 ? (
                    <div className="space-y-4">
                      <div className="h-44 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={chartData}
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={70}
                              paddingAngle={4}
                              dataKey="value"
                              stroke="none"
                            >
                              {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <RechartsTooltip 
                              formatter={(value: number) => `Rp ${value.toLocaleString("id-ID")}`}
                              contentStyle={{ 
                                backgroundColor: ui.chartTheme.bg, 
                                borderColor: ui.chartTheme.border, 
                                color: ui.chartTheme.text, 
                                borderRadius: '1rem',
                                fontSize: '11px',
                                fontWeight: 'bold'
                              }}
                              itemStyle={{ color: ui.chartTheme.text }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      
                      {/* Percent categories indexes */}
                      <div className="grid grid-cols-2 gap-2 text-[10px] font-bold">
                        {chartData.map((item, idx) => {
                          const percent = (item.value / totalExpense) * 100;
                          return (
                            <div key={idx} className="flex items-center gap-1.5 truncate">
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                              <span className={ui.textMain}>{item.name}:</span>
                              <span className="text-slate-400 font-mono">{percent.toFixed(0)}%</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="h-44 flex flex-col items-center justify-center text-[10px] text-slate-450 font-mono border border-dashed border-slate-500/10 rounded-2xl">
                      <span>No expense chart data</span>
                      <span className="text-[9px] mt-1 text-slate-500">Input pengeluaran untuk melihat</span>
                    </div>
                  )}
                </div>

                {/* Gemini intelligent summarizing assistance */}
                <div className={`${isLight ? 'bg-gradient-to-br from-slate-100 to-slate-200/50 border-slate-350' : 'bg-gradient-to-br from-[#0e1812] to-[#122319] border-white/5'} border ${ui.panelRadius} p-5 shadow-sm transition-colors relative overflow-hidden`}>
                  <div className="absolute top-0 right-0 p-2.5 text-yellow-500/20">
                    <Sparkles className="w-12 h-12" />
                  </div>
                  <h3 className={`text-[10px] font-bold mb-4 flex items-center gap-1.5 uppercase tracking-widest ${theme.icon}`}>
                    <Sparkles className="w-4 h-4 text-amber-500 animate-bounce" /> ASISTEN AI FINANSIAL
                  </h3>
                  {aiSummary ? (
                    <div className="space-y-4">
                      <p className={`text-xs ${ui.textMain} leading-relaxed break-words whitespace-pre-wrap font-semibold italic`}>
                        "{aiSummary}"
                      </p>
                      <button 
                        onClick={handleGetAiSummary} 
                        disabled={loadingAi}
                        className={`w-full py-2 ${ui.buttonRadius} text-[10px] font-bold ${theme.bgIcon}/10 ${theme.icon} hover:${theme.bgIcon}/20 disabled:opacity-50 transition-colors flex justify-center items-center gap-1.5`}
                      >
                        {loadingAi ? <RefreshCw className="w-3 h-3 animate-spin" /> : null}
                        Refresh Ringkasan & Saran AI
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className={`text-[11px] ${ui.textMuted} leading-normal`}>
                        Minta AI untuk menganalisis arus kas keuanganmu bulan ini dan memberikan insight berharga beserta trik jitu penghematan!
                      </p>
                      <button 
                        onClick={handleGetAiSummary}
                        disabled={loadingAi}
                        className={`w-full ${theme.bgIcon} text-white font-bold py-2 ${ui.buttonRadius} text-xs transition-colors shadow disabled:opacity-50 flex justify-center items-center gap-2`}
                      >
                        {loadingAi ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                        Analisis Keuangan (AI)
                      </button>
                    </div>
                  )}
                </div>

                {/* Integration Calendar Events */}
                <div className={`${ui.panelBg} border ${ui.panelRadius} p-5 shadow-sm transition-colors`}>
                  <h3 className={`text-xs font-bold mb-4 flex items-center gap-1.5 uppercase tracking-wide ${theme.icon}`}>
                    <CalendarIcon className="w-4 h-4" /> Pengingat Kalender
                  </h3>
                  <form onSubmit={handleAddReminder} className="space-y-3 text-xs font-bold">
                    <input 
                      type="text"
                      value={reminderSummary}
                      onChange={e => setReminderSummary(e.target.value)}
                      placeholder="Misal: Bayar Listrik / Angsuran"
                      className={`w-full ${ui.inputBg} border ${ui.inputRadius} px-3.5 py-2 text-xs focus:ring-2 ${theme.focus} outline-none`}
                      required
                    />
                    <input 
                      type="datetime-local"
                      value={reminderDate}
                      onChange={e => setReminderDate(e.target.value)}
                      className={`w-full ${ui.inputBg} border ${ui.inputRadius} px-3.5 py-2 text-xs focus:ring-2 ${theme.focus} outline-none`}
                      required
                    />
                    <button type="submit" className={`w-full ${theme.bgIcon}/15 hover:${theme.bgIcon}/25 ${theme.icon} font-bold py-2 ${ui.buttonRadius} text-xs transition-colors shadow-xs border border-${themeMode}-500/10`}>
                      Buat Google Calendar Event
                    </button>
                  </form>
                </div>

              </div>
            </section>
          </>
        )}
      </main>

      {/* Floating toast alerts component */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-55 max-w-sm w-full ${isLight ? 'bg-white text-slate-900 border-slate-100 shadow-xl' : 'bg-slate-900 text-white border-white/5 shadow-2xl'} border rounded-2xl p-4 animate-in fade-in slide-in-from-bottom-5 duration-300 flex items-center gap-3 shadow-2xl`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${toast.type === 'success' ? 'bg-green-500/15 text-green-500' : toast.type === 'error' ? 'bg-red-500/15 text-red-500' : 'bg-blue-500/15 text-blue-500'}`}>
            {toast.type === 'success' ? (
              <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            ) : toast.type === 'error' ? (
              <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            ) : (
              <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            )}
          </div>
          <div className="flex-1 text-xs font-bold leading-normal">{toast.message}</div>
          <button onClick={() => setToast(null)} className="text-sm font-black opacity-60 hover:opacity-100 transition-opacity p-1">&times;</button>
        </div>
      )}

      {/* Dynamic double-confirm popup overlay modal */}
      {confirmDialog?.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setConfirmDialog(null)}></div>
          <div className={`relative max-w-sm w-full ${isLight ? 'bg-white text-slate-900 border-slate-100' : 'bg-slate-900 text-white border-white/5'} p-5 border rounded-2xl shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200`}>
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-full bg-red-500/15 text-red-500 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5.5 h-5.5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold tracking-tight">{confirmDialog.title}</h3>
                <p className={`text-xs ${ui.textMuted} leading-relaxed font-semibold`}>{confirmDialog.message}</p>
              </div>
            </div>
            <div className="flex justify-end gap-2.5 pt-1.5 font-bold text-xs">
              <button 
                type="button" 
                onClick={() => setConfirmDialog(null)}
                className={`px-4 py-2 border ${isLight ? 'border-slate-200 text-slate-700 hover:bg-slate-50' : 'border-white/10 text-slate-200 hover:bg-white/5'} ${ui.inputRadius} transition-all`}
              >
                {confirmDialog.cancelText || "Batal"}
              </button>
              <button 
                type="button" 
                onClick={() => {
                  confirmDialog.onConfirm();
                  setConfirmDialog(null);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl transition-all shadow-lg shadow-red-500/20"
              >
                {confirmDialog.confirmText || "Hapus Permanen"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Repositionable Owi AI Assistant */}
      <FloatingAssistant 
        transactions={transactions} 
        themeMode={colorMode} 
        isGuest={!!user?.isGuest}
      />
    </div>
  );
};
