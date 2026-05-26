import React, { useState, useEffect } from "react";
import { fetchFinances, addTransaction, addCalendarReminder, sendWANotification, getAISummary, deleteTransaction, resetTransactions, Transaction } from "../api";
import { format, parseISO } from "date-fns";
import { id } from "date-fns/locale";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from "recharts";
import { PlusCircle, Calendar as CalendarIcon, LogOut, ArrowUpCircle, ArrowDownCircle, RefreshCw, Send, Download, Sparkles, Palette, Moon, Sun, User as UserIcon, Trash2, AlertTriangle, Target } from "lucide-react";

const BrandLogo = ({ className = "w-12 h-12" }: { className?: string }) => {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="ringGrad" cx="50%" cy="50%" r="50%" fx="30%" fy="30%">
          <stop offset="0%" stopColor="#2dd4bf" />
          <stop offset="60%" stopColor="#0891b2" />
          <stop offset="100%" stopColor="#0369a1" />
        </radialGradient>
        <linearGradient id="arrowGrad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#4ade80" />
          <stop offset="100%" stopColor="#2dd4bf" />
        </linearGradient>
        <linearGradient id="coinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fde047" />
          <stop offset="100%" stopColor="#eab308" />
        </linearGradient>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Main Circle Ring */}
      <circle cx="45" cy="50" r="32" stroke="url(#ringGrad)" strokeWidth="6" strokeLinecap="round" />
      <circle cx="45" cy="50" r="24" stroke="url(#ringGrad)" strokeWidth="2" strokeDasharray="4 4" strokeOpacity="0.6" />

      {/* Stylized 'K' & Arrow Path */}
      <rect x="35" y="34" width="6" height="32" rx="3" fill="url(#ringGrad)" />
      
      <path 
        d="M 39 52 C 42 42, 50 36, 68 32" 
        stroke="url(#arrowGrad)" 
        strokeWidth="6" 
        strokeLinecap="round" 
        fill="none" 
      />
      <path 
        d="M 60 26 L 73 30 L 68 43" 
        stroke="url(#arrowGrad)" 
        strokeWidth="5" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        fill="none" 
      />

      <path 
        d="M 40 50 L 59 66" 
        stroke="url(#ringGrad)" 
        strokeWidth="6" 
        strokeLinecap="round" 
      />

      {/* Glowing Gold Coin at Top Right */}
      <g filter="url(#glow)">
        <circle cx="72" cy="34" r="12" fill="url(#coinGrad)" stroke="#ca8a04" strokeWidth="1.5" />
        <circle cx="72" cy="34" r="9" fill="none" stroke="#fef08a" strokeWidth="1" strokeDasharray="1 1" />
        <text x="72" y="38" fill="#854d0e" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">Rp</text>
      </g>
    </svg>
  );
};

export const Dashboard = ({ user, onLogout }: { user?: any; onLogout: () => void }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Forms
  const [isAdding, setIsAdding] = useState(false);
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"Income" | "Expense">("Expense");
  const [category, setCategory] = useState("Makanan");
  const [desc, setDesc] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Notifications
  const [reminderSummary, setReminderSummary] = useState("");
  const [reminderDate, setReminderDate] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [waNotify, setWaNotify] = useState(false);

  // AI & Theming
  const [aiSummary, setAiSummary] = useState("");
  const [loadingAi, setLoadingAi] = useState(false);
  const [themeMode, setThemeMode] = useState<"blue" | "purple" | "emerald" | "rose" | "pink">("blue");
  const [colorMode, setColorMode] = useState<"dark" | "light">("dark");
  const [designStyle, setDesignStyle] = useState<"modern" | "cute">("modern");
  
  // Custom Profile Data
  const [customName, setCustomName] = useState(user?.displayName || "");
  const [customPhoto, setCustomPhoto] = useState(user?.photoURL || "");
  const [monthlyBudget, setMonthlyBudget] = useState(0);

  // Navigation
  const [activePage, setActivePage] = useState<"dashboard" | "profile">("dashboard");
  const [logoError, setLogoError] = useState(false);

  // Deletion States
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  // Custom Notifications & Confirmations State
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
    bg: isLight ? (isCute ? "bg-pink-50 text-slate-800" : "bg-slate-50 text-slate-900") : "bg-[#020617] text-slate-100",
    panelBg: isLight ? `bg-white/80 border-slate-200 ${isCute ? 'shadow-xl shadow-pink-100/50 border-2 border-dashed' : ''}` : `bg-white/5 border-white/10 ${isCute ? 'border-2 border-dashed border-white/20' : ''}`,
    panelRadius: isCute ? "rounded-[2rem]" : "rounded-3xl",
    inputRadius: isCute ? "rounded-2xl" : "rounded-xl",
    buttonRadius: isCute ? "rounded-full" : "rounded-xl",
    textMuted: isLight ? "text-slate-500" : "text-slate-400",
    textMain: isLight ? "text-slate-900" : "text-white",
    inputBg: isLight ? "bg-white border-slate-300 text-slate-900 placeholder-slate-400" : "bg-white/5 border-white/10 text-slate-100 placeholder-slate-500",
    selectOption: isLight ? "bg-white text-slate-900" : "bg-slate-800 text-white",
    chartTheme: isLight ? { bg: "#ffffff", border: "#e2e8f0", text: "#0f172a" } : { bg: "#0f172a", border: "#334155", text: "#f8fafc" },
  };

  const themes = {
    blue: { bg1: "bg-blue-600/20", bg2: "bg-indigo-900/30", card: "from-blue-600 to-indigo-700", icon: "text-blue-500", focus: "focus:ring-blue-500", shadow: "shadow-[0_0_20px_rgba(59,130,246,0.3)]", bgIcon: "bg-blue-500" },
    purple: { bg1: "bg-purple-600/20", bg2: "bg-fuchsia-900/30", card: "from-purple-600 to-fuchsia-700", icon: "text-purple-500", focus: "focus:ring-purple-500", shadow: "shadow-[0_0_20px_rgba(168,85,247,0.3)]", bgIcon: "bg-purple-500" },
    emerald: { bg1: "bg-emerald-600/20", bg2: "bg-teal-900/30", card: "from-emerald-600 to-teal-700", icon: "text-emerald-500", focus: "focus:ring-emerald-500", shadow: "shadow-[0_0_20px_rgba(16,185,129,0.3)]", bgIcon: "bg-emerald-500" },
    rose: { bg1: "bg-rose-600/20", bg2: "bg-pink-900/30", card: "from-rose-600 to-pink-700", icon: "text-rose-500", focus: "focus:ring-rose-500", shadow: "shadow-[0_0_20px_rgba(244,63,94,0.3)]", bgIcon: "bg-rose-500" },
    pink: { bg1: "bg-pink-500/30", bg2: "bg-rose-400/30", card: "from-pink-400 to-rose-500", icon: "text-pink-500", focus: "focus:ring-pink-400", shadow: "shadow-[0_0_20px_rgba(236,72,153,0.4)]", bgIcon: "bg-pink-500" },
  };
  const theme = themes[themeMode];

  const handleExportCSV = () => {
    if (transactions.length === 0) return showToast("Belum ada data transaksi untuk diexport.", "info");
    const csvRows = [];
    csvRows.push(['ID', 'Tanggal', 'Jenis', 'Kategori', 'Nominal', 'Keterangan'].join(','));
    transactions.forEach(t => {
      csvRows.push([t.id, t.date, t.type, t.category, t.amount, `"${t.description.replace(/"/g, '""')}"`].join(','));
    });
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Keuanganku_Export.csv';
    a.click();
    URL.revokeObjectURL(url);
    showToast("Data transaksi berhasil diexport ke CSV!", "success");
  };

  const handleGetAiSummary = async () => {
    if (transactions.length === 0) return showToast("Belum ada transaksi untuk dianalisis.", "info");
    setLoadingAi(true);
    try {
      const res = await getAISummary(transactions);
      setAiSummary(res.text);
      showToast("Analisis AI berhasil diperbarui!", "success");
    } catch (e: any) {
      showToast("Gagal memuat analisis AI: " + e.message, "error");
    } finally {
      setLoadingAi(false);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await fetchFinances();
      setTransactions(data.transactions);
      setSpreadsheetId(data.spreadsheetId);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!spreadsheetId) return;
    try {
      setIsAdding(true);
      await addTransaction({
        spreadsheetId,
        amount: Number(amount),
        type,
        category,
        description: desc,
        date
      });
      // Auto WA Notification
      if (waNotify && phone) {
         const now = new Date();
         const timeString = format(now, "HH:mm");
         const dateFormatted = format(parseISO(date), "dd MMMM yyyy", { locale: id });
         const msg = `*Keuanganku - Info Transaksi*\n\nTanggal: ${dateFormatted}\nJam: ${timeString}\nJenis: ${type === "Income" ? "Pemasukan 🟢" : "Pengeluaran 🔴"}\nKategori: ${category}\nNominal: Rp ${Number(amount).toLocaleString("id-ID")}\nKeterangan: ${desc}`;
         const res = await sendWANotification(phone, msg);
         if (res.waLink) {
           window.open(res.waLink, "_blank");
         }
      }
      showToast("Transaksi berhasil ditambahkan!", "success");
      // reload
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
      const res = await addCalendarReminder(reminderSummary, "Pengingat dari Keuanganku", new Date(reminderDate).toISOString());
      showToast("Pengingat berhasil ditambahkan!", "success");
      setReminderSummary("");
      setReminderDate("");
      if (res.eventLink) {
        window.open(res.eventLink, "_blank");
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
          await deleteTransaction(id, spreadsheetId);
          showToast("Transaksi berhasil dihapus", "success");
          await loadData();
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
      "PERINGATAN: Semua data transaksi akan dihapus secara permanen dari spreadsheet Anda. Tindakan ini tidak dapat dibatalkan.",
      async () => {
        try {
          setIsResetting(true);
          await resetTransactions(spreadsheetId);
          showToast("Seluruh transaksi berhasil direset", "success");
          await loadData();
        } catch (err: any) {
          showToast("Gagal mereset transaksi: " + err.message, "error");
        } finally {
          setIsResetting(false);
        }
      },
      "Hapus Semua"
    );
  };

  const handleSendWA = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const msg = `Halo! Ini laporan keuangan bulan ini dari Keuanganku. Total pengeluaran: Rp ${totalExpense.toLocaleString("id-ID")}.`;
      const res = await sendWANotification(phone, msg);
      showToast("Tautan WhatsApp berhasil dibuat!", "success");
      if (res.waLink) {
        window.open(res.waLink, "_blank");
      }
    } catch (err: any) {
      showToast("Gagal membuat tautan WhatsApp: " + err.message, "error");
    }
  };

  // Stats
  const totalIncome = transactions.filter(t => t.type === "Income").reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === "Expense").reduce((sum, t) => sum + t.amount, 0);
  const balance = totalIncome - totalExpense;
  const remainingBudget = monthlyBudget - totalExpense;
  const budgetPercent = monthlyBudget > 0 ? (totalExpense / monthlyBudget) * 100 : 0;

  // Chart data
  const expensesByCategory = transactions
    .filter(t => t.type === "Expense")
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);

  const chartData = Object.keys(expensesByCategory).map(key => ({
    name: key,
    value: expensesByCategory[key]
  }));

  const COLORS = ['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a'];

  if (loading && transactions.length === 0) {
    return (
      <div className={`flex ${ui.bg} items-center justify-center min-h-screen relative overflow-hidden transition-colors duration-500`}>
        <div className={`absolute top-[-10%] right-[-10%] w-[500px] h-[500px] ${theme.bg1} rounded-full blur-[120px] pointer-events-none -z-10`}></div>
        <div className={`absolute bottom-[-5%] left-[-5%] w-[400px] h-[400px] ${theme.bg2} rounded-full blur-[100px] pointer-events-none -z-10`}></div>
        <div className={`flex flex-col items-center ${theme.icon}`}>
          <RefreshCw className="w-8 h-8 animate-spin mb-4" />
          <p className="font-mono text-sm">Menyiapkan Spreadsheet & Sinkronisasi...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${ui.bg} flex flex-col font-sans pb-20 relative overflow-hidden transition-colors duration-500`}>
      {/* Mesh Background Decorative Elements */}
      <div className={`absolute top-[-10%] right-[-10%] w-[500px] h-[500px] ${theme.bg1} rounded-full blur-[120px] pointer-events-none -z-10 transition-colors duration-700 ${isLight ? 'opacity-50' : 'opacity-100'}`}></div>
      <div className={`absolute bottom-[-5%] left-[-5%] w-[400px] h-[400px] ${theme.bg2} rounded-full blur-[100px] pointer-events-none -z-10 transition-colors duration-700 ${isLight ? 'opacity-50' : 'opacity-100'}`}></div>

      {/* Header */}
      <header className={`${isLight ? 'bg-white/40 border-slate-200' : 'bg-white/5 border-white/10'} backdrop-blur-xl border-b sticky top-0 z-10 px-4 py-4 md:px-8 shadow-sm transition-colors duration-500`}>
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div 
            className="flex items-center gap-4 cursor-pointer group" 
            onClick={() => setActivePage("profile")}
            title="Buka Profil Pengguna"
          >
            <div className="w-12 h-12 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
              <BrandLogo className="w-12 h-12" />
            </div>
            <div>
              <h1 className={`text-xl font-bold ${ui.textMain} tracking-tight group-hover:text-blue-500 transition-colors`}>Keuanganku</h1>
              <p className={`text-xs ${ui.textMuted} font-mono mt-0.5`}>{customName || user?.displayName || "Workspace"}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setColorMode(isLight ? "dark" : "light")}
              className={`p-2 rounded-full ${isLight ? 'bg-slate-200 text-slate-700' : 'bg-white/10 text-slate-300'} hover:opacity-80 transition-opacity`}
              title="Toggle Theme"
            >
              {isLight ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
            <div className={`flex items-center gap-2 px-3 py-1 ${isLight ? 'bg-white/60 border-slate-200' : 'bg-white/5 border-white/10'} rounded-full border`}>
              <select 
                value={designStyle}
                onChange={e => setDesignStyle(e.target.value as any)}
                className={`bg-transparent text-xs ${ui.textMuted} outline-none cursor-pointer`}
              >
                <option value="modern" className={ui.selectOption}>Desain: Modern</option>
                <option value="cute" className={ui.selectOption}>Desain: Lucu</option>
              </select>
            </div>
            <div className={`flex items-center gap-2 px-3 py-1 ${isLight ? 'bg-white/60 border-slate-200' : 'bg-white/5 border-white/10'} rounded-full border`}>
              <Palette className={`w-3 h-3 ${ui.textMuted}`} />
              <select 
                value={themeMode}
                onChange={e => setThemeMode(e.target.value as any)}
                className={`bg-transparent text-xs ${ui.textMuted} outline-none cursor-pointer`}
              >
                <option value="blue" className={ui.selectOption}>Biru</option>
                <option value="purple" className={ui.selectOption}>Ungu</option>
                <option value="emerald" className={ui.selectOption}>Zamrud</option>
                <option value="rose" className={ui.selectOption}>Mawar</option>
                <option value="pink" className={ui.selectOption}>Pink</option>
              </select>
            </div>
            <button onClick={onLogout} className={`${ui.textMuted} hover:${ui.textMain} transition-colors`} title="Keluar">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full p-4 md:p-8 space-y-6">
        
        {/* Error Bar */}
        {error && (
          <div className="bg-red-500/10 text-red-400 p-4 rounded-2xl text-sm mb-6 border border-red-500/20 flex items-center gap-2">
            ⚠️ {error}
          </div>
        )}

        {activePage === "profile" ? (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
            <div className="flex items-center gap-4 mb-6">
              <button 
                onClick={() => setActivePage("dashboard")}
                className={`p-2 rounded-full ${isLight ? 'bg-slate-200 text-slate-700 hover:bg-slate-300' : 'bg-white/10 text-white hover:bg-white/20'} transition-colors`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              </button>
              <h2 className={`text-2xl font-bold ${ui.textMain}`}>Profil Pengguna</h2>
            </div>
            
            <form onSubmit={handleSaveProfile} className={`${ui.panelBg} backdrop-blur-xl border ${ui.panelRadius} p-8 max-w-2xl transition-all duration-500`}>
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-8">
                <div className="relative group">
                  <div className={`w-24 h-24 rounded-full ${theme.bg1} flex items-center justify-center border-4 ${isLight ? 'border-white' : 'border-[#020617]'} shadow-xl overflow-hidden`}>
                    {customPhoto ? (
                      <img src={customPhoto} alt="Foto Profil" className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon className={`w-10 h-10 ${theme.icon}`} />
                    )}
                  </div>
                  <label className="absolute inset-0 bg-black/50 text-white flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity text-xs font-medium backdrop-blur-sm">
                    Edit Foto
                    <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                  </label>
                </div>
                <div className="flex-1 text-center sm:text-left mt-2 sm:mt-0">
                  <h3 className={`text-xl font-bold ${ui.textMain}`}>{customName || user?.displayName || "Pengguna"}</h3>
                  <p className={`text-sm ${ui.textMuted}`}>{user?.email || "Email tidak tersedia"}</p>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <label className={`block text-sm font-medium ${ui.textMuted} mb-1.5`}>Nama Lengkap</label>
                  <input 
                    type="text"
                    value={customName}
                    onChange={e => setCustomName(e.target.value)}
                    placeholder="Masukkan nama"
                    className={`w-full ${ui.inputBg} border ${ui.inputRadius} px-4 py-3 text-sm focus:ring-2 ${theme.focus} outline-none transition-shadow`}
                    required
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${ui.textMuted} mb-1.5`}>Email Terhubung</label>
                  <input 
                    type="email"
                    value={user?.email || ""}
                    disabled
                    className={`w-full ${ui.inputBg} opacity-60 border ${ui.inputRadius} px-4 py-3 text-sm focus:ring-2 ${theme.focus} outline-none transition-shadow cursor-not-allowed`}
                  />
                  <p className={`text-xs mt-1.5 ${ui.textMuted}`}>Email digunakan untuk login dan tidak dapat diubah.</p>
                </div>
                <div>
                  <label className={`block text-sm font-medium ${ui.textMuted} mb-1.5`}>Nomor WhatsApp</label>
                  <input 
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="Contoh: 08123456789"
                    className={`w-full ${ui.inputBg} border ${ui.inputRadius} px-4 py-3 text-sm focus:ring-2 ${theme.focus} outline-none transition-shadow`}
                  />
                  <p className={`text-xs mt-1.5 ${ui.textMuted}`}>Digunakan untuk pengiriman notifikasi saldo dan transaksi via WhatsApp.</p>
                </div>
                <div>
                  <label className={`block text-sm font-medium ${ui.textMuted} mb-1.5`}>Tanggal Lahir</label>
                  <input 
                    type="date"
                    value={dob}
                    onChange={e => setDob(e.target.value)}
                    className={`w-full ${ui.inputBg} border ${ui.inputRadius} px-4 py-3 text-sm focus:ring-2 ${theme.focus} outline-none transition-shadow`}
                    style={{ colorScheme: isLight ? 'light' : 'dark' }}
                  />
                </div>
                <div className="pt-4 flex justify-end">
                  <button type="submit" className={`px-6 py-2.5 font-medium text-sm text-white ${theme.bgIcon} hover:opacity-90 transition-opacity ${ui.buttonRadius} ${theme.shadow}`}>
                    Simpan Profil
                  </button>
                </div>
              </div>
            </form>
          </div>
        ) : (
          <>
        {/* Overview Stats & Budget */}
        <div className="space-y-4">
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className={`bg-gradient-to-br ${theme.card} text-white p-6 ${ui.panelRadius} shadow-xl relative overflow-hidden transition-all duration-500`}>
              <div className={`absolute -right-4 -top-4 w-24 h-24 ${isLight ? 'bg-white/30' : 'bg-white/10'} rounded-full blur-2xl`}></div>
              <p className="text-white/80 text-sm mb-1 relative">Total Saldo</p>
              <h2 className="text-2xl font-bold relative tracking-tight">Rp {balance.toLocaleString("id-ID")}</h2>
            </div>
            <div className={`${ui.panelBg} backdrop-blur-xl border p-6 ${ui.panelRadius} flex flex-col justify-center transition-all duration-500`}>
              <div className="flex items-center gap-2 text-green-500 mb-1">
                <ArrowUpCircle className="w-4 h-4" />
                <p className="text-sm font-medium">Pemasukan</p>
              </div>
              <h2 className={`text-xl font-bold ${ui.textMain} tracking-tight`}>Rp {totalIncome.toLocaleString("id-ID")}</h2>
            </div>
            <div className={`${ui.panelBg} backdrop-blur-xl border p-6 ${ui.panelRadius} flex flex-col justify-center transition-all duration-500`}>
              <div className="flex items-center gap-2 text-red-500 mb-1">
                <ArrowDownCircle className="w-4 h-4" />
                <p className="text-sm font-medium">Pengeluaran</p>
              </div>
              <h2 className={`text-xl font-bold ${ui.textMain} tracking-tight`}>Rp {totalExpense.toLocaleString("id-ID")}</h2>
            </div>
            <div className={`${ui.panelBg} backdrop-blur-xl border p-6 ${ui.panelRadius} flex flex-col justify-center transition-all duration-500`}>
              <div className={`flex items-center gap-2 ${remainingBudget < 0 ? 'text-red-500' : theme.icon} mb-1`}>
                <Target className="w-4 h-4" />
                <p className="text-sm font-medium">Sisa Anggaran</p>
              </div>
              <h2 className={`text-xl font-bold ${ui.textMain} tracking-tight`}>Rp {remainingBudget.toLocaleString("id-ID")}</h2>
            </div>
          </section>

          <section className={`${ui.panelBg} backdrop-blur-xl border p-6 ${ui.panelRadius} flex flex-col md:flex-row gap-6 items-center transition-all duration-500`}>
            <div className="flex-1 w-full space-y-3">
              <div className="flex justify-between text-sm">
                <span className={`font-medium ${ui.textMain}`}>Penggunaan Anggaran</span>
                <span className={`${budgetPercent > 100 ? 'text-red-500 font-bold' : ui.textMuted}`}>{budgetPercent.toFixed(1)}%</span>
              </div>
              <div className={`h-3 w-full ${isLight ? 'bg-slate-200' : 'bg-slate-800'} rounded-full overflow-hidden`}>
                <div className={`h-full ${budgetPercent > 100 ? 'bg-red-500' : theme.bgIcon} transition-all duration-500`} style={{ width: `${Math.min(budgetPercent, 100)}%` }}></div>
              </div>
            </div>
            <div className="w-full md:w-64">
              <label className={`block text-xs font-medium ${ui.textMuted} mb-1`}>Atur Anggaran Bulanan</label>
              <div className="relative">
                <span className={`absolute left-3 top-2 text-sm ${ui.textMuted}`}>Rp</span>
                <input 
                  type="number" 
                  value={monthlyBudget || ""} 
                  onChange={e => setMonthlyBudget(Number(e.target.value))}
                  placeholder="0"
                  className={`w-full ${ui.inputBg} border ${ui.inputRadius} pl-9 pr-3 py-2 text-sm focus:ring-2 ${theme.focus} outline-none transition-shadow`}
                />
              </div>
            </div>
          </section>
        </div>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Dashboard & Form */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Add Transaction */}
            <div className={`${ui.panelBg} backdrop-blur-xl border ${ui.panelRadius} p-6 transition-all duration-500`}>
              <h3 className={`text-lg font-bold ${ui.textMain} mb-4 flex items-center gap-2`}>
                <PlusCircle className={`w-5 h-5 ${theme.icon}`} /> Tambah Transaksi
              </h3>
              <form onSubmit={handleAdd} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-xs font-medium ${ui.textMuted} mb-1`}>Jenis</label>
                    <select 
                      value={type} 
                      onChange={e => setType(e.target.value as "Income" | "Expense")}
                      className={`w-full ${ui.inputBg} border ${ui.inputRadius} px-3 py-2 text-sm focus:ring-2 ${theme.focus} outline-none transition-shadow`}
                    >
                      <option value="Expense" className={ui.selectOption}>Pengeluaran</option>
                      <option value="Income" className={ui.selectOption}>Pemasukan</option>
                    </select>
                  </div>
                  <div>
                    <label className={`block text-xs font-medium ${ui.textMuted} mb-1`}>Tanggal</label>
                    <input 
                      type="date" 
                      value={date}
                      onChange={e => setDate(e.target.value)}
                      className={`w-full ${ui.inputBg} border ${ui.inputRadius} px-3 py-2 text-sm focus:ring-2 ${theme.focus} outline-none transition-shadow`}
                      style={{ colorScheme: isLight ? 'light' : 'dark' }}
                      required
                    />
                  </div>
                  <div>
                    <label className={`block text-xs font-medium ${ui.textMuted} mb-1`}>Kategori</label>
                    {type === "Expense" ? (
                      <select 
                        value={category} 
                        onChange={e => setCategory(e.target.value)}
                        className={`w-full ${ui.inputBg} border ${ui.inputRadius} px-3 py-2 text-sm focus:ring-2 ${theme.focus} outline-none transition-shadow`}
                      >
                        <option value="Makanan" className={ui.selectOption}>Makanan</option>
                        <option value="Transportasi" className={ui.selectOption}>Transportasi</option>
                        <option value="Belanja" className={ui.selectOption}>Belanja</option>
                        <option value="Tagihan" className={ui.selectOption}>Tagihan</option>
                        <option value="Hiburan" className={ui.selectOption}>Hiburan</option>
                        <option value="Lainnya" className={ui.selectOption}>Lainnya</option>
                      </select>
                    ) : (
                      <input 
                        type="text" 
                        value={category}
                        onChange={e => setCategory(e.target.value)}
                        placeholder="Gaji, Bonus, dll"
                        className={`w-full ${ui.inputBg} border ${ui.inputRadius} px-3 py-2 text-sm focus:ring-2 ${theme.focus} outline-none transition-shadow`}
                      />
                    )}
                  </div>
                  <div>
                    <label className={`block text-xs font-medium ${ui.textMuted} mb-1`}>Nominal (Rp)</label>
                    <input 
                      type="number" 
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      placeholder="0"
                      className={`w-full ${ui.inputBg} border ${ui.inputRadius} px-3 py-2 text-sm focus:ring-2 ${theme.focus} outline-none transition-shadow`}
                      required
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={`block text-xs font-medium ${ui.textMuted} mb-1`}>Keterangan</label>
                    <input 
                      type="text" 
                      value={desc}
                      onChange={e => setDesc(e.target.value)}
                      placeholder="Makan siang..."
                      className={`w-full ${ui.inputBg} border ${ui.inputRadius} px-3 py-2 text-sm focus:ring-2 ${theme.focus} outline-none transition-shadow`}
                      required
                    />
                  </div>
                  <div className="sm:col-span-2 flex items-center gap-2 mt-1">
                    <input 
                      type="checkbox" 
                      id="wa-notify"
                      checked={waNotify}
                      onChange={e => setWaNotify(e.target.checked)}
                      className={`w-4 h-4 rounded border-slate-300 text-blue-500 focus:ring-2 ${theme.focus} outline-none`}
                    />
                    <label htmlFor="wa-notify" className={`text-xs font-medium ${ui.textMuted} cursor-pointer select-none`}>
                      Kirim Notifikasi via WhatsApp
                    </label>
                  </div>
                  {waNotify && (
                    <div className="sm:col-span-2">
                      <label className={`block text-xs font-medium ${ui.textMuted} mb-1`}>Nomor WhatsApp Tujuan</label>
                      <input 
                        type="tel" 
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="Contoh: 08123456789"
                        className={`w-full ${ui.inputBg} border ${ui.inputRadius} px-3 py-2 text-sm focus:ring-2 ${theme.focus} outline-none transition-shadow`}
                        required={waNotify}
                      />
                    </div>
                  )}
                </div>
                <div className="flex justify-end pt-2">
                  <button 
                    type="submit" 
                    disabled={isAdding}
                    className={`${theme.bgIcon}/80 hover:${theme.bgIcon} text-white font-medium py-2 px-6 ${ui.buttonRadius} text-sm transition-all disabled:opacity-50 flex items-center gap-2 ${theme.shadow}`}
                  >
                    {isAdding ? <RefreshCw className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
                    Simpan ke Sheets
                  </button>
                </div>
              </form>
            </div>

            {/* History */}
            <div className={`${ui.panelBg} backdrop-blur-xl border ${ui.panelRadius} p-6 flex flex-col transition-all duration-500`}>
              <div className="flex justify-between items-center mb-4">
                <h3 className={`text-sm font-bold ${ui.textMain} uppercase tracking-wide flex items-center gap-2`}>
                  Transaksi Terakhir
                  {loading && !isAdding && !isResetting && !deletingId && <RefreshCw className={`w-4 h-4 ${theme.icon} animate-spin`} /> }
                </h3>
                <div className="flex items-center gap-2">
                  {transactions.length > 0 && (
                    <button 
                      onClick={handleResetTransactions}
                      disabled={isResetting}
                      className={`text-xs px-3 py-1 flex items-center gap-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 rounded-full transition-colors disabled:opacity-50`}
                      title="Hapus Semua Transaksi"
                    >
                      {isResetting ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />} Reset
                    </button>
                  )}
                  <button 
                    onClick={handleExportCSV}
                    className={`text-xs px-3 py-1 flex items-center gap-2 ${isLight ? 'bg-slate-100 hover:bg-slate-200' : 'bg-white/5 hover:bg-white/10'} border rounded-full transition-colors ${theme.icon}`}
                  >
                    <Download className="w-3 h-3" /> Export CSV
                  </button>
                </div>
              </div>
              <div className="space-y-4 flex-1">
                {transactions.slice().reverse().map(t => (
                  <div key={t.id} className={`flex items-center gap-3 ${isLight ? 'hover:bg-slate-100' : 'hover:bg-white/5'} p-2 -mx-2 ${ui.inputRadius} transition-colors group`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${t.type === 'Income' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                      {t.type === 'Income' ? <svg className={`w-5 h-5 ${isLight ? 'text-green-600' : 'text-green-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 10l7-7m0 0l7 7m-7-7v18"></path></svg> : <svg className={`w-5 h-5 ${isLight ? 'text-red-600' : 'text-red-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 14l-7 7m0 0l-7-7m7 7V3"></path></svg>}
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-semibold ${ui.textMain}`}>{t.description}</p>
                      <p className={`text-xs ${ui.textMuted}`}>{t.category} • {t.date ? format(new Date(t.date), 'dd MMM yyyy', { locale: id }) : ''}</p>
                    </div>
                    <div className={`font-bold text-sm ${t.type === 'Income' ? (isLight ? 'text-green-600' : 'text-green-400') : (isLight ? 'text-red-600' : 'text-red-400')}`}>
                      {t.type === 'Income' ? '+' : '-'} Rp {t.amount.toLocaleString("id-ID")}
                    </div>
                    <button 
                      onClick={() => handleDeleteTransaction(t.id)}
                      disabled={deletingId === t.id}
                      className="opacity-0 group-hover:opacity-100 p-2 rounded-full text-red-500 hover:bg-red-500/20 transition-all focus:opacity-100 outline-none"
                      title="Hapus Transaksi"
                    >
                      {deletingId === t.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                ))}
                {transactions.length === 0 && !loading && (
                  <div className={`text-center py-8 ${ui.textMuted} text-sm`}>Belum ada transaksi.</div>
                )}
              </div>
            </div>

          </div>

          <div className="space-y-6">

            {/* Chart */}
            <div className={`${ui.panelBg} backdrop-blur-xl border ${ui.panelRadius} p-6 flex flex-col transition-all duration-500`}>
              <h3 className={`text-sm font-bold ${ui.textMain} mb-6 uppercase tracking-wide flex items-center gap-2`}>
                <PieChart className={`w-4 h-4 ${theme.icon}`} /> Distribusi Pengeluaran
              </h3>
              {chartData.length > 0 ? (
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        formatter={(value: number) => `Rp ${value.toLocaleString("id-ID")}`}
                        contentStyle={{ backgroundColor: ui.chartTheme.bg, borderColor: ui.chartTheme.border, color: ui.chartTheme.text, borderRadius: '0.75rem' }}
                        itemStyle={{ color: ui.chartTheme.text }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center text-xs text-slate-500 font-mono">
                  Belum ada data
                </div>
              )}
            </div>

            {/* AI Assistant */}
            <div className={`${isLight ? 'bg-gradient-to-br from-slate-100 to-slate-200 border-slate-300' : 'bg-gradient-to-br from-[#0f172a] to-slate-900 border-white/10'} border ${ui.panelRadius} p-6 shadow-md transition-colors`}>
              <h3 className={`text-[10px] font-bold mb-4 flex items-center gap-2 uppercase tracking-widest ${theme.icon}`}>
                <Sparkles className="w-4 h-4" /> Asisten AI
              </h3>
              {aiSummary ? (
                <div className="space-y-4">
                  <p className={`text-sm ${ui.textMain} leading-relaxed break-words whitespace-pre-wrap`}>
                    {aiSummary}
                  </p>
                  <button 
                    onClick={handleGetAiSummary} 
                    disabled={loadingAi}
                    className={`w-full py-2 ${ui.buttonRadius} text-xs font-semibold ${theme.bgIcon}/20 ${theme.icon} hover:${theme.bgIcon}/30 disabled:opacity-50 transition-colors flex justify-center items-center gap-2`}
                  >
                    {loadingAi ? <RefreshCw className="w-3 h-3 animate-spin" /> : null}
                    {loadingAi ? "Memperbarui..." : "Refresh Ringkasan AI"}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className={`text-xs ${ui.textMuted} leading-relaxed`}>
                    Minta AI untuk menganalisis keuanganmu bulan ini dan memberikan insight beserta saran penghematan.
                  </p>
                  <button 
                    onClick={handleGetAiSummary}
                    disabled={loadingAi}
                    className={`w-full ${theme.bgIcon}/20 border ${isLight ? 'border-slate-300' : 'border-white/10'} hover:${theme.bgIcon}/40 ${theme.icon} font-medium py-2 ${ui.buttonRadius} text-sm transition-colors shadow disabled:opacity-50 flex justify-center items-center gap-2`}
                  >
                    {loadingAi ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Analisis Sekarang"}
                  </button>
                </div>
              )}
            </div>

            {/* Integrations */}
            <div className={`${isLight ? 'bg-white/60 border-slate-200 text-slate-700' : 'bg-black/40 border-white/5 text-slate-200'} backdrop-blur-xl border ${ui.panelRadius} p-6 shadow-md transition-colors`}>
              <h3 className={`text-[10px] font-bold mb-4 flex items-center gap-2 uppercase tracking-widest ${theme.icon}`}>
                <CalendarIcon className="w-4 h-4" /> Pengingat
              </h3>
              <form onSubmit={handleAddReminder} className="space-y-3">
                <input 
                  type="text"
                  value={reminderSummary}
                  onChange={e => setReminderSummary(e.target.value)}
                  placeholder="Misal: Bayar Listrik"
                  className={`w-full ${ui.inputBg} border ${ui.inputRadius} px-3 py-2 text-sm focus:ring-2 ${theme.focus} outline-none transition-shadow`}
                  required
                />
                <input 
                  type="datetime-local"
                  value={reminderDate}
                  onChange={e => setReminderDate(e.target.value)}
                  className={`w-full ${ui.inputBg} border ${ui.inputRadius} px-3 py-2 text-sm focus:ring-2 ${theme.focus} outline-none transition-shadow`}
                  required
                />
                <button type="submit" className={`w-full ${theme.bgIcon}/20 border ${isLight ? 'border-transparent' : 'border-white/10'} hover:${theme.bgIcon}/40 ${theme.icon} font-medium py-2 ${ui.buttonRadius} text-sm transition-colors shadow`}>
                  Buat Pengingat
                </button>
              </form>
            </div>

            <div className={`${ui.panelBg} backdrop-blur-xl border rounded-3xl p-6 transition-colors`}>
              <div className="flex items-center justify-between mb-2">
                <h3 className={`text-[10px] font-bold flex items-center gap-2 uppercase tracking-widest ${ui.textMuted}`}>
                  <Send className={`w-4 h-4 ${isLight ? 'text-green-600' : 'text-green-400'}`} /> WhatsApp
                </h3>
                <div className={`px-2 py-0.5 ${isLight ? 'bg-green-100 text-green-700 border-green-200' : 'bg-green-500/20 text-green-400 border-green-500/20'} text-[10px] rounded-full border`}>Aktif</div>
              </div>
              <p className={`text-xs ${ui.textMuted} mb-4 leading-relaxed`}>
                Kirim ringkasan saldo kamu bulan ini.
              </p>
              <form onSubmit={handleSendWA} className="space-y-3">
                <input 
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="081234..."
                  className={`w-full ${ui.inputBg} border ${ui.inputRadius} px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none`}
                  required
                />
                <button type="submit" className={`w-full ${isLight ? 'bg-green-100 border-green-200 hover:bg-green-200 text-green-700' : 'bg-green-500/20 border-green-500/20 hover:bg-green-500/40 text-green-400'} font-medium py-2 ${ui.buttonRadius} text-sm transition-colors shadow`}>
                  Kirim Ringkasan
                </button>
              </form>
            </div>

          </div>
        </section>
        </>
        )}
      </main>

      {/* Custom Toast Alert */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-55 max-w-sm w-full ${isLight ? 'bg-white text-slate-900 border-slate-200 shadow-xl' : 'bg-slate-900 text-white border-white/20 shadow-2xl'} border ${ui.panelRadius} p-4 animate-in fade-in slide-in-from-bottom-5 duration-300 flex items-center gap-3`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${toast.type === 'success' ? 'bg-green-500/20 text-green-500' : toast.type === 'error' ? 'bg-red-500/20 text-red-500' : 'bg-blue-500/20 text-blue-500'}`}>
            {toast.type === 'success' ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
            ) : toast.type === 'error' ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            )}
          </div>
          <div className="flex-1 text-sm font-medium">{toast.message}</div>
          <button onClick={() => setToast(null)} className="text-sm font-bold px-1 opacity-60 hover:opacity-100 transition-opacity">&times;</button>
        </div>
      )}

      {/* Custom Confirm Modal */}
      {confirmDialog?.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setConfirmDialog(null)}></div>
          <div className={`relative max-w-md w-full ${isLight ? 'bg-white text-slate-900 border-slate-200' : 'bg-slate-900 text-white border-white/10'} p-6 border ${ui.panelRadius} shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200`}>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold tracking-tight">{confirmDialog.title}</h3>
                <p className={`text-sm ${ui.textMuted} leading-relaxed`}>{confirmDialog.message}</p>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button 
                type="button" 
                onClick={() => setConfirmDialog(null)}
                className={`px-4 py-2 border ${isLight ? 'border-slate-200 text-slate-700 hover:bg-slate-50' : 'border-white/10 text-slate-300 hover:bg-white/5'} font-medium text-sm ${ui.inputRadius} transition-all`}
              >
                {confirmDialog.cancelText || "Batal"}
              </button>
              <button 
                type="button" 
                onClick={() => {
                  confirmDialog.onConfirm();
                  setConfirmDialog(null);
                }}
                className={`px-5 py-2 bg-red-600 hover:bg-red-500 text-white font-medium text-sm ${ui.inputRadius} transition-all shadow-lg shadow-red-600/30`}
              >
                {confirmDialog.confirmText || "Lanjutkan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
