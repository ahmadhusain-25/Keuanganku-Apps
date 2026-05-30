import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AppLogo } from "./AppLogo";
import { 
  fetchFinances, 
  addTransaction, 
  addCalendarReminder, 
  getAISummary, 
  deleteTransaction, 
  resetTransactions, 
  Transaction,
  fetchUserSpreadsheets,
  fetchAISuggestions,
  fetchBudget,
  updateBudget
} from "../api";
import { format, parseISO } from "date-fns";
import { id } from "date-fns/locale";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
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
  ExternalLink,
  Eye,
  EyeOff,
  Pencil,
  FileText,
  Home,
  LayoutDashboard,
  ChevronLeft
} from "lucide-react";
import { generateFinancialReport } from "../utils/pdfGenerator";
import { SettingsPanel } from "./SettingsPanel";
import { FloatingAssistant } from "./FloatingAssistant";
import { googleSignIn } from "../auth";
import { BudgetDetails } from "./BudgetDetails";

export const Dashboard = ({ user, onLogout }: { user?: any; onLogout: () => void }) => {
  const isGuest = !!(user?.isGuest || user?.isLocalFallback || !localStorage.getItem("google_access_token"));
  const adderFormRef = useRef<HTMLDivElement>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isReauthing, setIsReauthing] = useState(false);

  // Storage / GDrive Spreadsheet listing
  const [spreadsheetsList, setSpreadsheetsList] = useState<any[]>([]);
  const [loadingSpreadsheets, setLoadingSpreadsheets] = useState(false);
  const [customSpreadsheetId, setCustomSpreadsheetId] = useState<string | null>("monthly");

  const guestTransactionsKey = `guest_transactions_${user?.uid || "guest"}`;
  const guestRemindersKey = `guest_reminders_${user?.uid || "guest"}`;

  const [loadedUid, setLoadedUid] = useState<string | null>(null);
  const isPrefsLoadingRef = useRef(false);
  const stateUserRef = useRef<string | null>(null);
  
  // Create / Record Transactions Form States
  const [isAdding, setIsAdding] = useState(false);
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"Income" | "Expense">("Expense");
  const [category, setCategory] = useState("Makanan");
  const [desc, setDesc] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  useEffect(() => {
    // Clear previous suggestions immediately to let default category suggestions load instantly
    setAiSuggestions([]);

    if (category === "Parkir" && type === "Expense") {
      return;
    }

    let active = true;
    const loadAiSuggestions = async () => {
      setLoadingSuggestions(true);
      try {
        const data = await fetchAISuggestions(category, type);
        if (active && data && Array.isArray(data.suggestions)) {
          setAiSuggestions(data.suggestions);
        }
      } catch (err) {
        console.error("Gagal memuat saran AI:", err);
      } finally {
        if (active) {
          setLoadingSuggestions(false);
        }
      }
    };

    const timer = setTimeout(() => {
      loadAiSuggestions();
    }, 400);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [category, type]);

  // Handle click on Income/Expense cards to switch type, adjust category and scroll to form field
  const handleTypeCardClick = (targetType: "Income" | "Expense") => {
    setType(targetType);
    if (targetType === "Income") {
      setCategory("Gaji");
    } else {
      setCategory("Makanan");
    }
    if (amount === "2000" || amount === "3000" || amount === "5000") {
      setAmount("");
    }
    if (desc === "Parkir Motor" || desc === "Parkir Mobil") {
      setDesc("");
    }
    
    // Automatically switch to features tab (Pencatatan Keuangan)
    setActiveMenuTab("features");

    setTimeout(() => {
      if (adderFormRef.current) {
        adderFormRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
        // After scrolling, focus the rupiah input
        const amountInput = adderFormRef.current.querySelector('input[type="number"]') as HTMLInputElement;
        if (amountInput) {
          amountInput.focus();
        }
      }
    }, 250);
  };

  // Notifications, WhatsApp destination, DoB
  const [reminderSummary, setReminderSummary] = useState("");
  const [reminderDate, setReminderDate] = useState("");

  const [dob, setDob] = useState("");

  const amountInputRef = useRef<HTMLInputElement>(null);
  const descInputRef = useRef<HTMLInputElement>(null);

  const handleCategoryChange = (val: string) => {
    setCategory(val);
    if (val === "Parkir") {
      setAmount("2000");
      setDesc("Parkir Motor");
    } else {
      if (amount === "2000" || amount === "3000" || amount === "5000") {
        setAmount("");
      }
      if (desc === "Parkir Motor" || desc === "Parkir Mobil") {
        setDesc("");
      }
    }
  };

  // AI Insights and copied scripts states
  const [aiSummary, setAiSummary] = useState("");
  const [loadingAi, setLoadingAi] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);

  // AI Assistant configuration
  const [isAssistantEnabled, setIsAssistantEnabled] = useState<boolean>(true);
  const [assistantSize, setAssistantSize] = useState<number>(1);

  useEffect(() => {
    const currentUid = user?.uid || "guest";
    if (isPrefsLoadingRef.current || loadedUid !== currentUid || stateUserRef.current !== currentUid) return;
    const key = `owi_assistant_enabled_${currentUid}`;
    localStorage.setItem(key, String(isAssistantEnabled));
  }, [isAssistantEnabled, user?.uid, loadedUid]);

  useEffect(() => {
    const currentUid = user?.uid || "guest";
    if (isPrefsLoadingRef.current || loadedUid !== currentUid || stateUserRef.current !== currentUid) return;
    const key = `owi_assistant_size_${currentUid}`;
    localStorage.setItem(key, String(assistantSize));
  }, [assistantSize, user?.uid, loadedUid]);

  // Profile preferences (Default to emerald (Sage Green) & light mode)
  const [themeMode, setThemeMode] = useState<"blue" | "purple" | "emerald" | "rose" | "pink">("emerald");
  const [colorMode, setColorMode] = useState<"dark" | "light">("light");
  const [designStyle, setDesignStyle] = useState<"modern" | "cute">("modern");
  const [customName, setCustomName] = useState(user?.displayName || "");
  const [customPhoto, setCustomPhoto] = useState(user?.photoURL || "");
  const [monthlyBudget, setMonthlyBudget] = useState(0); // 0 default
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [tempBudget, setTempBudget] = useState("0");
  const [activeDeleteId, setActiveDeleteId] = useState<string | null>(null);

  useEffect(() => {
    setTempBudget(String(monthlyBudget));
  }, [monthlyBudget]);
  const [showBalance, setShowBalance] = useState<boolean>(true);

  useEffect(() => {
    const currentUid = user?.uid || "guest";
    if (isPrefsLoadingRef.current || loadedUid !== currentUid || stateUserRef.current !== currentUid) return;
    const key = `owi_show_balance_${currentUid}`;
    localStorage.setItem(key, String(showBalance));
  }, [showBalance, user?.uid, loadedUid]);

  // Router pagination state
  const [activePage, setActivePage] = useState<"dashboard" | "profile" | "budget_detail">("dashboard");

  // Multi-menu state inside primary dashboard
  const [activeMenuTab, setActiveMenuTab] = useState<"homepage" | "features">("homepage");

  // Slide state for spending chart (trend line vs distribution pie)
  const [activeChartSlide, setActiveChartSlide] = useState<"trend" | "distribution">("trend");

  // Auto slide shifting every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveChartSlide((prev) => (prev === "trend" ? "distribution" : "trend"));
    }, 10000);
    return () => clearInterval(interval);
  }, []);

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
    const currentUid = user?.uid || "guest";
    isPrefsLoadingRef.current = true;
    
    // 1. Load Assistant configurations
    const assistantEnabledKey = `owi_assistant_enabled_${currentUid}`;
    const assistantEnabledSaved = localStorage.getItem(assistantEnabledKey);
    setIsAssistantEnabled(assistantEnabledSaved !== "false");

    const assistantSizeKey = `owi_assistant_size_${currentUid}`;
    const assistantSizeSaved = localStorage.getItem(assistantSizeKey);
    setAssistantSize(assistantSizeSaved ? Number(assistantSizeSaved) : 1);

    // 2. Load Show Balance
    const showBalanceKey = `owi_show_balance_${currentUid}`;
    const showBalanceSaved = localStorage.getItem(showBalanceKey);
    setShowBalance(showBalanceSaved !== "false");

    // 3. Load Profile preferences
    const profileKey = isGuest ? `guestProfile_${currentUid}` : `userProfile_${currentUid}`;
    const profileSaved = localStorage.getItem(profileKey);
    if (profileSaved) {
      try {
        const p = JSON.parse(profileSaved);
        if (p.dob) {
          setDob(p.dob);
        } else {
          setDob("");
        }
        if (p.themeMode) {
          setThemeMode(p.themeMode);
        } else {
          setThemeMode("emerald");
        }
        if (p.colorMode) {
          setColorMode(p.colorMode);
        } else {
          setColorMode("light");
        }
        if (p.designStyle) {
          setDesignStyle(p.designStyle);
        } else {
          setDesignStyle("modern");
        }
        if (p.customName) {
          setCustomName(p.customName);
        } else {
          setCustomName(user?.displayName || "");
        }
        if (p.customPhoto) {
          setCustomPhoto(p.customPhoto);
        } else {
          setCustomPhoto(user?.photoURL || "");
        }
        if (p.monthlyBudget !== undefined && p.monthlyBudget !== null) {
          setMonthlyBudget(Number(p.monthlyBudget));
        } else {
          setMonthlyBudget(0);
        }
      } catch (e) {}
    } else {
      // Clear profile inputs back to initial values for this user
      setDob("");
      setThemeMode("emerald");
      setColorMode("light");
      setDesignStyle("modern");
      setCustomName(user?.displayName || "");
      setCustomPhoto(user?.photoURL || "");
      setMonthlyBudget(0);
    }

    stateUserRef.current = currentUid;
    setLoadedUid(currentUid);
    isPrefsLoadingRef.current = false;
  }, [user?.uid, isGuest]);

  useEffect(() => {
    const currentUid = user?.uid || "guest";
    if (isPrefsLoadingRef.current || loadedUid !== currentUid || stateUserRef.current !== currentUid) return;
    const profileKey = isGuest ? `guestProfile_${currentUid}` : `userProfile_${currentUid}`;
    localStorage.setItem(profileKey, JSON.stringify({ dob, themeMode, colorMode, designStyle, customName, customPhoto, monthlyBudget }));
  }, [dob, themeMode, colorMode, designStyle, customName, customPhoto, monthlyBudget, isGuest, user?.uid, loadedUid]);

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

  const handleThemeHex = () => {
    switch(themeMode) {
      case "emerald": return "#6a8d73";
      case "blue": return "#3b82f6";
      case "purple": return "#8b5cf6";
      case "rose": return "#f43f5e";
      case "pink": return "#ec4899";
      default: return "#6a8d73";
    }
  };

  const handleExportPDF = () => {
    if (filteredTransactions.length === 0) return showToast("Belum ada data transaksi untuk diexport PDF.", "info");
    
    generateFinancialReport({
      transactions: filteredTransactions,
      startDate: filterStartDate,
      endDate: filterEndDate,
      preset: filterPreset,
      userName: customName || user?.displayName || "",
      themeColor: handleThemeHex()
    });
    
    showToast("Laporan PDF berhasil digenerate!", "success");
  };

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
    if (isGuest) return;
    try {
      setLoadingSpreadsheets(true);
      const res = await fetchUserSpreadsheets();
      setSpreadsheetsList(res.files || []);
    } catch (e: any) {
      if (e.message === "UNAUTHORIZED_SESSION_EXPIRED") {
        setError("UNAUTHORIZED_SESSION_EXPIRED");
        console.warn("Gagal mengambil daftar spreadsheet: Sesi Google Workspace Terputus (UNAUTHORIZED_SESSION_EXPIRED)");
      } else {
        console.error("Gagal mengambil daftar spreadsheet:", e);
      }
    } finally {
      setLoadingSpreadsheets(false);
    }
  };

  const handleReauthGoogle = async () => {
    setIsReauthing(true);
    try {
      const res = await googleSignIn();
      if (res?.accessToken) {
        showToast("Berhasil menyambungkan kembali akun Google Anda!", "success");
        setError("");
        await loadData();
        await loadSpreadsheetsList();
      }
    } catch (err: any) {
      showToast("Gagal menyambungkan kembali: " + err.message, "error");
    } finally {
      setIsReauthing(false);
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
      if (isGuest) {
        const stored = localStorage.getItem(guestTransactionsKey);
        const txs = stored ? JSON.parse(stored) : [];
        setTransactions(txs);
        setSpreadsheetId("guest-spreadsheet");
      } else {
        const activeId = targetId !== undefined ? targetId : customSpreadsheetId;
        const data = await fetchFinances(activeId);
        setTransactions(data.transactions);
        setSpreadsheetId(data.spreadsheetId);
        
        // Fetch budget
        if (data.spreadsheetId) {
          const budgetData = await fetchBudget(data.spreadsheetId);
          setMonthlyBudget(budgetData.budget);
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBudgetChange = async (budget: number) => {
    if (!spreadsheetId) return;
    try {
      setMonthlyBudget(budget);
      await updateBudget(spreadsheetId, budget);
      showToast("Budget bulanan berhasil disimpan ke Google Sheets! 🪙🦉", "success");
    } catch (e: any) {
      showToast("Gagal menyimpan budget: " + e.message, "error");
    }
  };

  useEffect(() => {
    loadData();
    if (!isGuest) {
      loadSpreadsheetsList();
    }
  }, []);



  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!spreadsheetId) return;
    try {
      setIsAdding(true);
      const inputAmount = Number(amount);
      const isExpense = type === "Expense";
      
      let updatedList: Transaction[] = [];

      if (isGuest) {
        const newTx: Transaction = {
          id: Date.now().toString(),
          amount: inputAmount,
          type,
          category,
          description: desc,
          date
        };
        const stored = localStorage.getItem(guestTransactionsKey);
        const txs = stored ? JSON.parse(stored) : [];
        updatedList = [newTx, ...txs];
        localStorage.setItem(guestTransactionsKey, JSON.stringify(updatedList));
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



      showToast("Transaksi berhasil ditambahkan!", "success");
      await loadData();
      if (category === "Parkir" && type === "Expense") {
        setAmount("2000");
        setDesc("Parkir Motor");
      } else {
        setAmount("");
        setDesc("");
      }
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
      if (isGuest) {
        const localReminders = JSON.parse(localStorage.getItem(guestRemindersKey) || "[]");
        const newReminder = { id: Date.now().toString(), summary: reminderSummary, date: reminderDate };
        localStorage.setItem(guestRemindersKey, JSON.stringify([...localReminders, newReminder]));
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
          if (isGuest) {
            const stored = localStorage.getItem(guestTransactionsKey);
            const txs: Transaction[] = stored ? JSON.parse(stored) : [];
            const updated = txs.filter(t => t.id !== id);
            localStorage.setItem(guestTransactionsKey, JSON.stringify(updated));
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
          if (isGuest) {
            localStorage.removeItem(guestTransactionsKey);
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
  const remainingBudget = monthlyBudget > 0 ? (monthlyBudget - totalExpense) : 0;
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

  // Daily spending trends calculation for current month
  const getDailySpendingCurrentMonth = () => {
    const today = new Date();
    const curYear = today.getFullYear();
    const curMonth = today.getMonth(); // 0-indexed
    
    // Days in current month
    const daysInMonth = new Date(curYear, curMonth + 1, 0).getDate();
    
    const data = [];
    const monthName = format(today, "MMMM", { locale: id });
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dateString = `${curYear}-${String(curMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      // Sum expenses on this day
      const dailyExpense = transactions
        .filter(t => t.type === "Expense" && t.date === dateString)
        .reduce((sum, t) => sum + t.amount, 0);
        
      data.push({
        day: day,
        displayDate: `${day} ${monthName.slice(0, 3)}`,
        "Pengeluaran": dailyExpense,
      });
    }
    
    return data;
  };

  const dailySpendingData = getDailySpendingCurrentMonth();

  const peakSpending = dailySpendingData.reduce(
    (max, item) => (item["Pengeluaran"] > max.amount ? { day: item.day, displayDate: item.displayDate, amount: item["Pengeluaran"] } : max),
    { day: 0, displayDate: "", amount: 0 }
  );

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
                {customName || user?.displayName || "Pengguna"}
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
          error === "UNAUTHORIZED_SESSION_EXPIRED" ? (
            <div className={`p-6 rounded-3xl border mb-6 ${
              isLight 
                ? "bg-amber-500/5 border-amber-500/20 text-slate-800" 
                : "bg-[#251d10] border-amber-500/15 text-slate-200"
            } flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm`}>
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-full bg-amber-500/15 flex items-center justify-center text-amber-500 shrink-0 mt-0.5">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="font-black text-sm tracking-wide text-amber-500 flex items-center gap-2">
                    Sesi Google Workspace Terputus
                  </h4>
                  <p className={`text-xs ${isLight ? "text-slate-600" : "text-slate-400"} leading-relaxed max-w-2xl`}>
                    Akses Google Sheets & Drive Anda telah berakhir setelah beberapa waktu (OAuth Token Expired). Silakan klik tombol di samping untuk menyambungkan kembali akun Google Anda dengan aman agar transaksi dapat tersinkronisasi kembali secara real-time!
                  </p>
                </div>
              </div>
              <button
                onClick={handleReauthGoogle}
                disabled={isReauthing}
                className={`py-2.5 px-5 rounded-2xl ${theme.bgIcon} text-white font-bold text-xs hover:opacity-95 active:scale-95 transition-all shadow-md flex items-center justify-center gap-2 shrink-0 disabled:opacity-50`}
              >
                {isReauthing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Menghubungkan...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Hubungkan Ulang</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="bg-red-500/10 text-red-500 p-4 rounded-3xl text-xs mb-4 border border-red-500/20 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              <span className="font-semibold">{error}</span>
            </div>
          )
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
            isAssistantEnabled={isAssistantEnabled}
            setIsAssistantEnabled={setIsAssistantEnabled}
            assistantSize={assistantSize}
            setAssistantSize={setAssistantSize}
            handleResetTransactions={handleResetTransactions}
            isResetting={isResetting}
            handleSaveProfile={handleSaveProfile}
            handlePhotoUpload={handlePhotoUpload}
            isLight={isLight}
            isCute={isCute}
            ui={ui}
            theme={theme}
            onBack={() => setActivePage("dashboard")}
            transactions={transactions}
          />
        ) : activePage === "budget_detail" ? (
          <BudgetDetails
            transactions={transactions}
            monthlyBudget={monthlyBudget}
            setMonthlyBudget={handleBudgetChange}
            remainingBudget={remainingBudget}
            onBack={() => setActivePage("dashboard")}
            ui={ui}
            theme={theme}
            isLight={isLight}
            themeMode={themeMode}
            showToast={showToast}
            onDeleteTransaction={handleDeleteTransaction}
            deletingId={deletingId}
          />
        ) : (
          <>
            {/* Primary Dashboard layout */}
            {/* Database Sheets Indicator (Not guest user) */}
            {!isGuest && (
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

            {/* Menu Tab Navigation Switcher */}
            <div className="flex justify-center w-full mb-6 relative z-20">
              <div className={`p-1 rounded-2xl flex items-center gap-1.5 ${isLight ? 'bg-slate-100' : 'bg-[#0f1713]/80 border border-white/5'} w-full max-w-sm shadow-sm`}>
                <button
                  type="button"
                  onClick={() => setActiveMenuTab("homepage")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer select-none ${
                    activeMenuTab === "homepage"
                      ? `${theme.bgIcon} text-white shadow-md scale-[1.01]`
                      : `${isLight ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50' : 'text-slate-450 hover:text-white hover:bg-white/5'}`
                  }`}
                >
                  <Home className="w-4 h-4" />
                  <span>Beranda</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMenuTab("features")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer select-none ${
                    activeMenuTab === "features"
                      ? `${theme.bgIcon} text-white shadow-md scale-[1.01]`
                      : `${isLight ? 'text-slate-605 hover:text-slate-900 hover:bg-slate-200/50' : 'text-slate-450 hover:text-white hover:bg-white/5'}`
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>Pencatatan & Fitur</span>
                </button>
              </div>
            </div>

            {/* Balances & Budgets Row */}
            {activeMenuTab === "homepage" && (
              <div className="space-y-4 animation-fadeIn">
              <section className={`grid grid-cols-2 ${monthlyBudget > 0 ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-3'} gap-4`}>
                <div className={`bg-gradient-to-br ${theme.card} text-white p-5 ${ui.panelRadius} shadow-xl relative overflow-hidden transition-all duration-500 col-span-2 md:col-span-1`}>
                  <div className={`absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl`}></div>
                  <div className="flex items-center justify-between relative mb-1">
                    <p className="text-white/80 text-xs font-semibold uppercase tracking-wide">Total Saldo</p>
                    <button 
                      onClick={() => setShowBalance(!showBalance)}
                      className="p-1.5 rounded-full hover:bg-white/15 active:scale-90 transition-all text-white/80 hover:text-white cursor-pointer"
                      title={showBalance ? "Sensor Saldo" : "Tampilkan Saldo"}
                    >
                      {showBalance ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                  </div>
                  <h2 className="text-2xl font-bold relative tracking-tight">
                    {showBalance ? `Rp ${balance.toLocaleString("id-ID")}` : "Rp ••••••••"}
                  </h2>
                </div>
                <div 
                  onClick={() => handleTypeCardClick("Income")}
                  className={`${ui.panelBg} border p-5 ${ui.panelRadius} flex flex-col justify-center transition-all duration-500 col-span-1 cursor-pointer select-none group hover:border-green-500/40 hover:bg-green-500/[0.02] dark:hover:bg-green-950/10 active:scale-95`}
                  title="Klik untuk tambah pemasukan"
                >
                  <div className="flex items-center gap-1.5 text-green-500 mb-1">
                    <ArrowUpCircle className="w-4 h-4 transition-transform group-hover:-translate-y-0.5" />
                    <p className="text-xs font-bold uppercase tracking-wide">Pemasukan</p>
                  </div>
                  <h2 className={`text-xl font-bold ${ui.textMain} tracking-tight`}>Rp {totalIncome.toLocaleString("id-ID")}</h2>
                </div>
                <div 
                  onClick={() => handleTypeCardClick("Expense")}
                  className={`${ui.panelBg} border p-5 ${ui.panelRadius} flex flex-col justify-center transition-all duration-500 col-span-1 cursor-pointer select-none group hover:border-red-500/40 hover:bg-red-500/[0.02] dark:hover:bg-red-950/10 active:scale-95`}
                  title="Klik untuk tambah pengeluaran"
                >
                  <div className="flex items-center gap-1.5 text-red-500 mb-1">
                    <ArrowDownCircle className="w-4 h-4 transition-transform group-hover:translate-y-0.5" />
                    <p className="text-xs font-bold uppercase tracking-wide">Pengeluaran</p>
                  </div>
                  <h2 className={`text-xl font-bold ${ui.textMain} tracking-tight`}>Rp {totalExpense.toLocaleString("id-ID")}</h2>
                </div>
                {monthlyBudget > 0 && (
                  <div 
                    onClick={() => setActivePage("budget_detail")}
                    className={`${ui.panelBg} border p-5 ${ui.panelRadius} flex flex-col justify-center transition-all duration-500 col-span-2 md:col-span-1 cursor-pointer select-none group hover:border-emerald-550/40 hover:bg-emerald-500/[0.02] dark:hover:bg-emerald-950/10 active:scale-95`}
                    title="Klik untuk detail budget & riwayat"
                  >
                    <div className={`flex items-center gap-1.5 ${remainingBudget < 0 ? 'text-red-500' : theme.icon} mb-1`}>
                      <Target className="w-4 h-4 transition-transform group-hover:scale-110" />
                      <p className="text-xs font-bold uppercase tracking-wide flex items-center gap-1">
                        Sisa Anggaran <span className="text-[9px] lowercase opacity-50 font-normal">• detail</span>
                      </p>
                    </div>
                    <h2 className={`text-xl font-bold ${ui.textMain} tracking-tight`}>Rp {remainingBudget.toLocaleString("id-ID")}</h2>
                  </div>
                )}
              </section>

              {/* Budget Progress Bar */}
              <section className={`${ui.panelBg} border p-5 ${ui.panelRadius} flex flex-col md:flex-row gap-6 items-center transition-all duration-500 ${monthlyBudget <= 0 ? 'max-w-2xl mx-auto' : ''}`}>
                {monthlyBudget > 0 && (
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
                )}
                <div className={`w-full ${monthlyBudget > 0 ? 'md:w-72' : 'md:w-full'} leading-none flex flex-col justify-end text-left`}>
                  <label className={`block text-[10px] font-bold ${ui.textMuted} mb-1.5 uppercase tracking-wider`}>Budget Bulanan</label>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3 bottom-2 text-xs font-bold text-slate-400">Rp</span>
                        <input 
                          type="number" 
                          value={isEditingBudget ? tempBudget : (monthlyBudget || "")} 
                          onChange={e => setTempBudget(e.target.value)}
                          disabled={!isEditingBudget}
                          placeholder="0"
                          className={`w-full ${ui.inputBg} border ${ui.inputRadius} pl-8 pr-2 py-1.5 text-xs font-bold focus:ring-2 ${theme.focus} outline-none transition-shadow disabled:opacity-75 disabled:cursor-not-allowed`}
                        />
                      </div>
                      {!isEditingBudget && (
                        <button
                          type="button"
                          onClick={() => {
                            setTempBudget(String(monthlyBudget || ""));
                            setIsEditingBudget(true);
                          }}
                          className={`p-2 rounded-xl ${isLight ? 'bg-slate-100 text-slate-500' : 'bg-white/5 text-slate-400'} hover:bg-slate-200 active:scale-95 transition-all cursor-pointer shrink-0`}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    {isEditingBudget && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            const val = Number(tempBudget) || 0;
                            handleBudgetChange(val);
                            setIsEditingBudget(false);
                          }}
                          className="flex-1 px-2.5 py-1.5 text-[10px] font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
                        >
                          Simpan
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setTempBudget(String(monthlyBudget));
                            setIsEditingBudget(false);
                          }}
                          className={`px-2 py-1.5 text-[10px] font-bold ${isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200' : 'bg-white/5 hover:bg-white/10 text-slate-300'} rounded-xl active:scale-95 transition-all cursor-pointer whitespace-nowrap`}
                        >
                          Batal
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    {[1000000, 2000000, 3000000, 5000000].map((preset) => {
                      const isActive = isEditingBudget ? Number(tempBudget) === preset : monthlyBudget === preset;
                      return (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => {
                            setIsEditingBudget(true);
                            setTempBudget(String(preset));
                          }}
                          className={`text-[9px] font-bold px-2 py-1 rounded-lg transition-all border shrink-0 cursor-pointer select-none active:scale-95 ${
                            isActive
                              ? "bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold"
                              : `${isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 border-slate-200' : 'bg-white/5 border-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200'}`
                          }`}
                        >
                          {preset / 1000000} Jt
                        </button>
                      );
                    })}
                  </div>
                </div>
              </section>
            </div>
            )}

            {/* Dynamic Unified Slide-Toggleable Charts Panel */}
            {activeMenuTab === "homepage" && (
              <section className={`${ui.panelBg} border p-5 md:p-6 ${ui.panelRadius} transition-all duration-500 space-y-4 shadow-xl shadow-emerald-950/5 relative overflow-hidden animate-fadeIn`}>
                <div className="flex items-center justify-between border-b pb-3 border-slate-500/5">
                  <div className="text-left">
                    <h3 className={`text-sm font-bold ${ui.textMain} flex items-center gap-2`}>
                      {activeChartSlide === "trend" ? (
                        <>
                          <svg className={`w-4 h-4 ${theme.icon}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.541" />
                          </svg>
                          <span>Tren Pengeluaran Harian</span>
                        </>
                      ) : (
                        <>
                          <PieChartIcon className={`w-4 h-4 ${theme.icon}`} />
                          <span>Distribusi Pengeluaran</span>
                        </>
                      )}
                    </h3>
                    <p className={`text-[11px] ${ui.textMuted} mt-0.5`}>
                      {activeChartSlide === "trend" 
                        ? `Visualisasi grafik pengeluaran anggaran harian Anda sepanjang bulan ${format(new Date(), "MMMM yyyy", { locale: id })}`
                        : "Persentase diagram kontribusi pengeluaran berdasarkan kategori pengeluaran Anda"
                      }
                    </p>
                  </div>

                  {/* Slider Controls */}
                  <div className="flex items-center gap-1.5 shrink-0 select-none">
                    <button 
                      type="button"
                      onClick={() => setActiveChartSlide("trend")}
                      className={`w-2.5 h-2.5 rounded-full transition-all cursor-pointer ${activeChartSlide === "trend" ? 'bg-[#6a8d73] w-5' : 'bg-slate-300 dark:bg-slate-800'}`} 
                      title="Slide Tren Harian"
                    />
                    <button 
                      type="button"
                      onClick={() => setActiveChartSlide("distribution")}
                      className={`w-2.5 h-2.5 rounded-full transition-all cursor-pointer ${activeChartSlide === "distribution" ? 'bg-[#6a8d73] w-5' : 'bg-slate-300 dark:bg-slate-800'}`} 
                      title="Slide Distribusi"
                    />
                  </div>
                </div>

                <div className="relative">
                  <AnimatePresence mode="wait">
                    {activeChartSlide === "trend" ? (
                      <motion.div
                        key="slide-trend"
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={0.2}
                        onDragEnd={(event, info) => {
                          const swipeThreshold = 50;
                          if (info.offset.x < -swipeThreshold) {
                            setActiveChartSlide("distribution");
                          }
                        }}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-4 cursor-grab active:cursor-grabbing touch-pan-y select-none"
                      >
                        {peakSpending.amount > 0 && (
                          <div className={`px-4.5 py-2 rounded-2xl flex items-center justify-between gap-2.5 ${isLight ? 'bg-amber-500/10 text-amber-700' : 'bg-amber-500/5 text-amber-500'} border border-amber-500/15 text-xs font-bold shrink-0 text-left`}>
                            <div className="flex items-center gap-2">
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                              </span>
                              <span>
                                Hari Terboros: <span className="font-extrabold text-amber-600 dark:text-amber-400">Rp {peakSpending.amount.toLocaleString("id-ID")}</span> (tgl {peakSpending.day})
                              </span>
                            </div>
                            <span className={`text-[9.5px] font-bold uppercase tracking-wider ${ui.textMuted}`}>Slide 1 dari 2</span>
                          </div>
                        )}

                        <div className="h-60 w-full pt-1">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                              data={dailySpendingData}
                              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                            >
                              <defs>
                                <linearGradient id="spendingGradient" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor={themeMode === "emerald" ? "#10b981" : themeMode === "blue" ? "#3b82f6" : themeMode === "purple" ? "#a78bfa" : themeMode === "rose" ? "#f43f5e" : "#ec4899"} stopOpacity={0.25}/>
                                  <stop offset="95%" stopColor={themeMode === "emerald" ? "#10b981" : themeMode === "blue" ? "#3b82f6" : themeMode === "purple" ? "#a78bfa" : themeMode === "rose" ? "#f43f5e" : "#ec4899"} stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={ui.chartTheme.border} opacity={0.5} />
                              <XAxis 
                                dataKey="day" 
                                tickLine={false}
                                axisLine={false}
                                stroke={isLight ? "#94a3b8" : "#475569"}
                                style={{ fontSize: '10px', fontWeight: 'bold' }}
                                dy={8}
                              />
                              <YAxis 
                                tickLine={false}
                                axisLine={false}
                                stroke={isLight ? "#94a3b8" : "#475569"}
                                style={{ fontSize: '10px', fontWeight: 'bold' }}
                                tickFormatter={(value) => value >= 1000000 ? `${(value/1000000).toFixed(1)}jt` : value >= 1000 ? `${(value/1000).toFixed(0)}rb` : value}
                                dx={-4}
                              />
                              <RechartsTooltip
                                formatter={(value: number) => [`Rp ${value.toLocaleString("id-ID")}`, "Total Pengeluaran"]}
                                labelFormatter={(label) => `Tanggal ${label} ${format(new Date(), "MMMM", { locale: id })}`}
                                contentStyle={{
                                  backgroundColor: ui.chartTheme.bg,
                                  borderColor: ui.chartTheme.border,
                                  color: ui.chartTheme.text,
                                  borderRadius: '1.25rem',
                                  fontSize: '11px',
                                  fontWeight: 'bold',
                                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
                                }}
                              />
                              <Line
                                type="monotone"
                                dataKey="Pengeluaran"
                                stroke={themeMode === "emerald" ? "#10b981" : themeMode === "blue" ? "#3b82f6" : themeMode === "purple" ? "#a78bfa" : themeMode === "rose" ? "#f43f5e" : "#ec4899"}
                                strokeWidth={2.5}
                                dot={{ r: 1.5, strokeWidth: 1, fill: themeMode === "emerald" ? "#10b981" : themeMode === "blue" ? "#3b82f6" : themeMode === "purple" ? "#a78bfa" : themeMode === "rose" ? "#f43f5e" : "#ec4899" }}
                                activeDot={{ r: 5, strokeWidth: 0, fill: themeMode === "emerald" ? "#10b981" : themeMode === "blue" ? "#3b82f6" : themeMode === "purple" ? "#a78bfa" : themeMode === "rose" ? "#f43f5e" : "#ec4899" }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="slide-distribution"
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={0.2}
                        onDragEnd={(event, info) => {
                          const swipeThreshold = 50;
                          if (info.offset.x > swipeThreshold) {
                            setActiveChartSlide("trend");
                          }
                        }}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-4 cursor-grab active:cursor-grabbing touch-pan-y select-none"
                      >
                        <div className="flex justify-between items-center bg-emerald-500/[0.02] border border-emerald-500/10 p-2.5 px-4 rounded-xl text-xs font-bold leading-none select-none text-left">
                          <span className={`${ui.textMain}`}>Kategori Pengeluaran Bulan Ini</span>
                          <span className={`text-[9.5px] font-bold uppercase tracking-wider ${ui.textMuted}`}>Slide 2 dari 2</span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                          {chartData.length > 0 ? (
                            <>
                              <div className="h-48 w-full flex items-center justify-center">
                                <ResponsiveContainer width="100%" height="100%">
                                  <PieChart>
                                    <Pie
                                      data={chartData}
                                      cx="50%"
                                      cy="50%"
                                      innerRadius={55}
                                      outerRadius={75}
                                      paddingAngle={5}
                                      dataKey="value"
                                      stroke="none"
                                    >
                                      {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                      ))}
                                    </Pie>
                                    <RechartsTooltip 
                                      content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                          return (
                                            <div className="p-3 rounded-xl border shadow-xl flex flex-col gap-1 z-50 text-[11px] text-left" style={{ backgroundColor: ui.chartTheme.bg, borderColor: ui.chartTheme.border, color: ui.chartTheme.text }}>
                                              <p className="text-[10px] uppercase tracking-wider font-extrabold opacity-70">{payload[0].name}</p>
                                              <p className="text-sm font-bold text-emerald-500">{`Rp ${Number(payload[0].value).toLocaleString("id-ID")}`}</p>
                                            </div>
                                          );
                                        }
                                        return null;
                                      }}
                                    />
                                  </PieChart>
                                </ResponsiveContainer>
                              </div>
                              
                              {/* Category Legend list with colors and percentages */}
                              <div className="grid grid-cols-2 gap-2 text-[10px] font-bold max-h-48 overflow-y-auto scrollbar-thin py-2 text-left">
                                {chartData.map((item, idx) => {
                                  const percent = (item.value / totalExpense) * 100;
                                  return (
                                    <div key={idx} className="flex items-center gap-1.5 truncate p-1.5 rounded-lg hover:bg-slate-500/5 transition-colors">
                                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                                      <div className="flex flex-col text-left truncate">
                                        <span className={`${ui.textMain} truncate`}>{item.name}</span>
                                        <span className="text-slate-400 font-mono text-[9px] font-normal">{percent.toFixed(1)}% ({`Rp ${item.value.toLocaleString("id-ID")}`})</span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </>
                          ) : (
                            <div className="col-span-2 h-44 flex flex-col items-center justify-center text-[10px] text-slate-450 font-mono border border-dashed border-slate-500/10 rounded-2xl w-full">
                              <span>Diagram kategori pengeluaran kosong</span>
                              <span className="text-[9px] mt-1 text-slate-500">Silakan input pengeluaran pada menu Pencatatan untuk melihat diagram</span>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </section>
            )}

            {/* Split dashboard column layouts */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left major side: transaction list and adder form */}
              <div className={`${activeMenuTab === "homepage" ? "lg:col-span-3" : "lg:col-span-2"} space-y-6`}>
                
                {/* Form Adder Component */}
                {activeMenuTab === "features" && (
                  <div ref={adderFormRef} className={`${ui.panelBg} border ${ui.panelRadius} p-5 sm:p-6 transition-all duration-500 scroll-mt-20 shadow-sm animate-fadeIn`}>
                  <h3 className={`text-base font-bold ${ui.textMain} mb-4 flex items-center gap-2`}>
                    <PlusCircle className={`w-5 h-5 ${theme.icon}`} /> Tambah Transaksi Keuangan
                  </h3>
                  <form onSubmit={handleAdd} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className={`block text-[10px] font-bold ${ui.textMuted} mb-1.5 uppercase`}>Jenis Transaksi</label>
                        <select 
                          value={type} 
                          onChange={e => {
                            const newType = e.target.value as "Income" | "Expense";
                            setType(newType);
                            handleCategoryChange(newType === "Income" ? "Gaji" : "Makanan");
                          }}
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
                            onChange={e => handleCategoryChange(e.target.value)}
                            className={`w-full ${ui.inputBg} border ${ui.inputRadius} px-3.5 py-2.5 text-xs font-bold focus:ring-2 ${theme.focus} outline-none transition-shadow`}
                          >
                            <option value="Makanan" className={ui.selectOption}>Makanan 🍔</option>
                            <option value="Transportasi" className={ui.selectOption}>Transportasi 🚗</option>
                            <option value="Belanja" className={ui.selectOption}>Belanja 🛍️</option>
                            <option value="Tagihan" className={ui.selectOption}>Tagihan ⚡</option>
                            <option value="Hiburan" className={ui.selectOption}>Hiburan 🎬</option>
                            <option value="Kesehatan" className={ui.selectOption}>Kesehatan 💊</option>
                            <option value="Parkir" className={ui.selectOption}>Parkir 🅿️</option>
                            <option value="Lainnya" className={ui.selectOption}>Lainnya 📦</option>
                          </select>
                        ) : (
                          <select 
                            value={category} 
                            onChange={e => handleCategoryChange(e.target.value)}
                            className={`w-full ${ui.inputBg} border ${ui.inputRadius} px-3.5 py-2.5 text-xs font-bold focus:ring-2 ${theme.focus} outline-none transition-shadow`}
                          >
                            <option value="Gaji" className={ui.selectOption}>Gaji 💰</option>
                            <option value="Investasi" className={ui.selectOption}>Investasi 📈</option>
                            <option value="Bonus" className={ui.selectOption}>Bonus 🎁</option>
                            <option value="Keuntungan" className={ui.selectOption}>Keuntungan 🤝</option>
                          </select>
                        )}
                      </div>
                      <div>
                        <label className={`block text-[10px] font-bold ${ui.textMuted} mb-1.5 uppercase`}>Nominal Rupiah (Rp)</label>
                        <input 
                          type="number" 
                          ref={amountInputRef}
                          value={amount}
                          onChange={e => setAmount(e.target.value)}
                          placeholder="Masukkan angka nominal"
                          className={`w-full ${ui.inputBg} border ${ui.inputRadius} px-3.5 py-2 text-xs font-bold focus:ring-2 ${theme.focus} outline-none`}
                          required
                        />
                        {category === "Parkir" && type === "Expense" && (
                          <div className="mt-1.5 text-left animate-fadeIn">
                            <span className={`text-[9px] font-bold ${ui.textMuted} uppercase block mb-1`}>Pilih Nominal Parkir:</span>
                            <div className="flex flex-wrap gap-1">
                              {[
                                { val: "2000", label: "2.000 (Default)" },
                                { val: "3000", label: "3.000" },
                                { val: "5000", label: "5.000" }
                              ].map((opt) => (
                                <button
                                  type="button"
                                  key={opt.val}
                                  onClick={() => setAmount(opt.val)}
                                  className={`text-[10px] px-2 py-0.5 rounded font-bold transition-all border cursor-pointer select-none ${
                                    amount === opt.val
                                      ? "bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold"
                                      : `${ui.panelBg} hover:border-slate-350 dark:hover:border-slate-750 text-slate-500 dark:text-slate-400`
                                  }`}
                                >
                                  {opt.label}
                                </button>
                              ))}
                              <button
                                type="button"
                                onClick={() => {
                                  setAmount("");
                                  setTimeout(() => amountInputRef.current?.focus(), 50);
                                }}
                                className={`text-[10px] px-2 py-0.5 rounded font-bold transition-all border cursor-pointer select-none ${
                                  amount !== "2000" && amount !== "3000" && amount !== "5000"
                                    ? "bg-orange-500/15 border-orange-500 text-orange-600 dark:text-orange-450 font-bold"
                                    : `${ui.panelBg} hover:border-slate-350 dark:hover:border-slate-750 text-slate-500 dark:text-slate-400`
                                }`}
                              >
                                Isi Sendiri
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="sm:col-span-2">
                        <label className={`block text-[10px] font-bold ${ui.textMuted} mb-1.5 uppercase`}>Keterangan Deskripsi</label>
                        <input 
                          type="text" 
                          ref={descInputRef}
                          value={desc}
                          onChange={e => setDesc(e.target.value)}
                          placeholder="Format: Beli kuota internet, cilok bakar sore, dll"
                          className={`w-full ${ui.inputBg} border ${ui.inputRadius} px-3.5 py-2 text-xs font-bold focus:ring-2 ${theme.focus} outline-none`}
                          required
                        />
                        {category === "Parkir" && type === "Expense" ? (
                          <div className="mt-1.5 text-left animate-fadeIn">
                            <span className={`text-[9px] font-bold ${ui.textMuted} uppercase block mb-1`}>Pilih Keterangan Parkir:</span>
                            <div className="flex flex-wrap gap-1">
                              {[
                                { val: "Parkir Motor", label: "Parkir Motor (Default)" },
                                { val: "Parkir Mobil", label: "Parkir Mobil" }
                              ].map((opt) => (
                                <button
                                  type="button"
                                  key={opt.val}
                                  onClick={() => setDesc(opt.val)}
                                  className={`text-[10px] px-2 py-0.5 rounded font-bold transition-all border cursor-pointer select-none ${
                                    desc === opt.val
                                      ? "bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold"
                                      : `${ui.panelBg} hover:border-slate-350 dark:hover:border-slate-750 text-slate-500 dark:text-slate-400`
                                  }`}
                                >
                                  {opt.label}
                                </button>
                              ))}
                              <button
                                type="button"
                                onClick={() => {
                                  setDesc("");
                                  setTimeout(() => descInputRef.current?.focus(), 50);
                                }}
                                className={`text-[10px] px-2 py-0.5 rounded font-bold transition-all border cursor-pointer select-none ${
                                  desc !== "Parkir Motor" && desc !== "Parkir Mobil"
                                    ? "bg-orange-500/15 border-orange-500 text-orange-600 dark:text-orange-450 font-bold"
                                    : `${ui.panelBg} hover:border-slate-350 dark:hover:border-slate-750 text-slate-500 dark:text-slate-400`
                                }`}
                              >
                                Isi Sendiri
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-2 text-left animate-fadeIn">
                            <span className={`text-[9px] font-bold ${ui.textMuted} uppercase block mb-1 flex items-center gap-1.5`}>
                              Saran Keterangan:
                              {loadingSuggestions && (
                                <span className="inline-block w-2.5 h-2.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></span>
                              )}
                            </span>
                            <div className="flex flex-wrap gap-1.5 min-h-[32px]">
                              {(() => {
                                const suggestionsToShow = aiSuggestions.length > 0
                                  ? aiSuggestions
                                  : (() => {
                                      let defaultSuggestions: string[] = [];
                                      if (type === "Income") {
                                        if (category === "Investasi") defaultSuggestions = ["Dividen Saham", "Kupon Obligasi", "Profit Crypto", "Bunga Deposito"];
                                        else if (category === "Bonus") defaultSuggestions = ["Bonus Akhir Tahun", "Tunjangan Hari Raya (THR)", "Insentif Proyek"];
                                        else if (category === "Keuntungan") defaultSuggestions = ["Hasil Dagang", "Komisi Penjualan", "Titip Jual", "Keuntungan Bisnis"];
                                        else defaultSuggestions = ["Gaji Utama", "Gaji Pokok", "Lemburan", "Rapel Gaji"];
                                      } else {
                                        if (category === "Makanan") defaultSuggestions = ["Beli Makan Siang", "Kopi Susu Sore", "Jajan Cemilan", "Makan Malam", "Belanja Sayur"];
                                        else if (category === "Transportasi") defaultSuggestions = ["Isi Bensin", "Ojek Online", "Gojek Pulang", "Tarif Tol", "Tiket KRL", "Service Motor"];
                                        else if (category === "Belanja") defaultSuggestions = ["Baju Baru", "Belanja Bulanan", "Keperluan Dapur", "Skincare", "Sepatu Baru"];
                                        else if (category === "Tagihan") defaultSuggestions = ["Bayar Listrik PLN", "Tagihan internet WiFi", "Pulsa HP", "Biaya Kost", "Iuran Sampah"];
                                        else if (category === "Hiburan") defaultSuggestions = ["Tiket Bioskop", "Langganan Netflix", "Main Games", "Nongkrong Cafe", "Konser Musik"];
                                        else if (category === "Kesehatan") defaultSuggestions = ["Beli Obat", "Vitamin C", "Konsultasi Dokter", "Masker Medis", "Cek Darah"];
                                        else defaultSuggestions = ["Makan Siang", "Beli Bensin", "Belanja Bulanan", "Gojek/Grab", "Bayar Listrik", "Jajan Sore"];
                                      }
                                      const historySuggestions: string[] = Array.from(new Set(
                                        transactions
                                          .filter(t => t.type === type && t.category === category && t.description && t.description.trim())
                                          .map(t => t.description.trim())
                                      ));
                                      return Array.from(new Set([...historySuggestions, ...defaultSuggestions])).slice(0, 8);
                                    })();

                                return suggestionsToShow.map((suggestion) => (
                                  <button
                                    type="button"
                                    key={suggestion}
                                    onClick={() => setDesc(suggestion)}
                                    className={`text-[10px] px-2.5 py-1 rounded-full font-bold transition-all border cursor-pointer select-none ${
                                      desc.trim().toLowerCase() === suggestion.trim().toLowerCase()
                                        ? "bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold"
                                        : `${ui.panelBg} hover:border-slate-350 dark:hover:border-slate-750 text-slate-500 dark:text-slate-400`
                                    }`}
                                  >
                                    {suggestion}
                                  </button>
                                ));
                              })()}
                            </div>
                          </div>
                        )}
                      </div>
                      

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
                )}

                {/* Latest Records lists */}
                {activeMenuTab === "homepage" && (
                  <div className={`${ui.panelBg} border ${ui.panelRadius} p-5 sm:p-6 transition-all duration-500 flex flex-col animate-fadeIn`}>
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
                        onClick={handleExportPDF}
                        className={`text-[10px] font-bold px-2.5 py-1 flex items-center gap-1.5 ${isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-705' : 'bg-white/5 hover:bg-white/10 text-slate-200'} border border-slate-500/5 rounded-full transition-colors`}
                      >
                        <FileText className="w-3 h-3" /> Export PDF
                      </button>
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
                    {filteredTransactions.slice().reverse().map((t, idx) => {
                      const itemKey = t.id || String(idx);
                      const isSlidOpen = activeDeleteId === itemKey;
                      return (
                        <div key={itemKey} className="relative overflow-hidden rounded-2xl">
                          {/* Background action - Delete button */}
                          <div className="absolute right-0 top-0 bottom-0 w-16 bg-red-650 bg-red-600 flex items-center justify-center">
                            <button 
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTransaction(t.id);
                              }}
                              disabled={deletingId === t.id}
                              className="w-full h-full flex flex-col items-center justify-center text-white hover:bg-red-700 transition-all select-none cursor-pointer"
                              title="Hapus"
                            >
                              {deletingId === t.id ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <Trash2 className="w-4 h-4" />
                                  <span className="text-[9px] font-bold mt-1 uppercase">Hapus</span>
                                </>
                              )}
                            </button>
                          </div>

                          {/* Swipeable Foreground item */}
                          <motion.div 
                            drag="x"
                            dragDirectionLock
                            dragConstraints={{ left: -64, right: 0 }}
                            dragElastic={0.15}
                            onDragEnd={(event, info) => {
                              if (info.offset.x < -20) {
                                setActiveDeleteId(itemKey);
                              } else if (info.offset.x > 20) {
                                setActiveDeleteId(null);
                              }
                            }}
                            animate={{ x: isSlidOpen ? -64 : 0 }}
                            transition={{ type: "spring", stiffness: 350, damping: 28 }}
                            onClick={() => {
                              setActiveDeleteId(isSlidOpen ? null : itemKey);
                            }}
                            className={`flex items-center gap-3.5 p-3 rounded-2xl border transition-colors relative z-10 cursor-pointer select-none ${
                              isLight 
                                ? 'bg-white border-slate-100 hover:bg-slate-50' 
                                : 'bg-[#0e1713] border-emerald-950/40 hover:bg-emerald-950/20'
                            }`}
                          >
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
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
                            <div className="flex-1 min-w-0 pointer-events-none text-left">
                              <p className={`text-xs font-bold ${ui.textMain} truncate`}>{t.description}</p>
                              <p className={`text-[10px] ${ui.textMuted} font-semibold mt-0.5`}>
                                {t.category} • {t.date ? format(new Date(t.date), 'dd MMM yyyy', { locale: id }) : ""}
                              </p>
                            </div>
                            <div className={`font-mono text-xs font-bold text-right shrink-0 pointer-events-none ${t.type === 'Income' ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                              {t.type === 'Income' ? '+' : '-'} Rp {t.amount.toLocaleString("id-ID")}
                            </div>

                            <div className="shrink-0 text-slate-400 opacity-60 pointer-events-none">
                              <motion.div
                                animate={{ rotate: isSlidOpen ? 180 : 0 }}
                                transition={{ duration: 0.2 }}
                              >
                                {isSlidOpen ? (
                                  <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                ) : (
                                  <ChevronRight className="w-4 h-4" />
                                )}
                              </motion.div>
                            </div>
                          </motion.div>
                        </div>
                      );
                    })}
                    
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
                )}

              </div>

              {/* Right minor side: charts, AI Summary, WhatsApp simulation */}
              {activeMenuTab === "features" && (
                <div className="space-y-6 animate-fadeIn">

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
              )}
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
        isGuest={isGuest}
        isEnabled={isAssistantEnabled}
        size={assistantSize}
        userUid={user?.uid}
      />
    </div>
  );
};
