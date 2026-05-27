import React, { useState, useMemo } from "react";
import { motion } from "motion/react";
import { 
  ArrowLeft, 
  Wallet, 
  Target, 
  TrendingDown, 
  TrendingUp, 
  Search, 
  Filter, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  ChevronRight, 
  Tag, 
  Trash2,
  Info,
  Sliders,
  DollarSign,
  Briefcase
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { id } from "date-fns/locale";
import { Transaction } from "../api";

interface BudgetDetailsProps {
  transactions: Transaction[];
  monthlyBudget: number;
  setMonthlyBudget: (budget: number) => void;
  remainingBudget: number;
  onBack: () => void;
  ui: any;
  theme: any;
  isLight: boolean;
  themeMode: string;
}

export const BudgetDetails: React.FC<BudgetDetailsProps> = ({
  transactions,
  monthlyBudget,
  setMonthlyBudget,
  remainingBudget,
  onBack,
  ui,
  theme,
  isLight,
  themeMode
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [transactionTypeFilter, setTransactionTypeFilter] = useState<"all" | "Income" | "Expense">("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Sum total income & expense
  const totalIncome = useMemo(() => {
    return transactions
      .filter(t => t.type === "Income")
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  const totalExpense = useMemo(() => {
    return transactions
      .filter(t => t.type === "Expense")
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  // Calculate budget utilization percentage
  const budgetPercent = useMemo(() => {
    if (monthlyBudget <= 0) return 0;
    return (totalExpense / monthlyBudget) * 100;
  }, [totalExpense, monthlyBudget]);

  // Extract unique categories available in loaded transactions
  const uniqueCategories = useMemo(() => {
    const cats = transactions.map(t => t.category).filter(Boolean);
    return Array.from(new Set(cats));
  }, [transactions]);

  // Filtered transactions for search + type + category
  const filteredList = useMemo(() => {
    return transactions.filter(t => {
      const matchesSearch = 
        (t.description || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.category || "").toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesType = transactionTypeFilter === "all" || t.type === transactionTypeFilter;
      
      const matchesCategory = selectedCategory === "all" || t.category === selectedCategory;

      return matchesSearch && matchesType && matchesCategory;
    });
  }, [transactions, searchQuery, transactionTypeFilter, selectedCategory]);

  // Spending breakdown by category
  const expenseByCategory = useMemo(() => {
    const breakdown: Record<string, number> = {};
    transactions
      .filter(t => t.type === "Expense")
      .forEach(t => {
        breakdown[t.category] = (breakdown[t.category] || 0) + t.amount;
      });
    
    return Object.entries(breakdown)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: totalExpense > 0 ? (amount / totalExpense) * 100 : 0
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [transactions, totalExpense]);

  // Quick budget presets
  const budgetPresets = [1000000, 2000000, 5000000, 10000000];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="space-y-6 max-w-5xl mx-auto pb-10"
    >
      {/* Navigation Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4 border-slate-500/10">
        <div className="flex items-center gap-3.5">
          <button
            onClick={onBack}
            className={`p-2.5 rounded-full border ${isLight ? 'border-slate-200 hover:bg-slate-50 text-slate-705' : 'border-white/5 hover:bg-white/5 text-slate-205'} transition-all cursor-pointer active:scale-90`}
            title="Kembali ke Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="text-left">
            <h1 className={`text-xl font-extrabold tracking-tight ${ui.textMain}`}>
              Detail & Analisis Budget Bulanan
            </h1>
            <p className={`text-xs ${ui.textMuted} mt-0.5`}>
              Pantau alokasi sisa anggaran belanja Anda dan rincian riwayat pengeluaran secara komprehensif.
            </p>
          </div>
        </div>
        
        <button
          onClick={onBack}
          className={`px-4 py-2 text-xs font-bold ${theme.bgIcon} text-white rounded-xl shadow-lg hover:opacity-90 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" /> Selesai Review
        </button>
      </div>

      {/* Main Stats Bento-Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Batas Budget Bulanan */}
        <div className={`${ui.panelBg} border p-5 ${ui.panelRadius} flex flex-col justify-between transition-all duration-300 min-h-[120px] shadow-sm relative overflow-hidden group`}>
          <div className="absolute right-3 top-3 p-2 rounded-2xl bg-amber-500/10 text-amber-500">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <span className={`text-[10px] font-bold uppercase tracking-wider ${ui.textMuted}`}>Batas Budget Bulanan</span>
            <h2 className={`text-2xl font-black tracking-tight ${ui.textMain} mt-1.5`}>
              Rp {monthlyBudget.toLocaleString("id-ID")}
            </h2>
          </div>
          <p className="text-[10px] text-slate-400 mt-2 font-semibold">
            Batas pengeluaran bulanan yang direncanakan.
          </p>
        </div>

        {/* Card 2: Total Pengeluaran */}
        <div className={`${ui.panelBg} border p-5 ${ui.panelRadius} flex flex-col justify-between transition-all duration-300 min-h-[120px] shadow-sm relative overflow-hidden group`}>
          <div className="absolute right-3 top-3 p-2 rounded-2xl bg-rose-500/10 text-rose-500">
            <TrendingDown className="w-5 h-5" />
          </div>
          <div>
            <span className={`text-[10px] font-bold uppercase tracking-wider ${ui.textMuted}`}>Total Pengeluaran Bulan Ini</span>
            <h2 className={`text-2xl font-black tracking-tight ${ui.textMain} mt-1.5`}>
              Rp {totalExpense.toLocaleString("id-ID")}
            </h2>
          </div>
          <div className="text-[10px] font-bold mt-2">
            {monthlyBudget > 0 ? (
              <span className={budgetPercent > 100 ? 'text-rose-550 dark:text-rose-450' : 'text-emerald-600 dark:text-emerald-400'}>
                {budgetPercent.toFixed(1)}% Dari limit anggaran terpakai.
              </span>
            ) : (
              <span className="text-slate-400">Belum menyetel target budget bulanan.</span>
            )}
          </div>
        </div>

        {/* Card 3: Sisa Anggaran */}
        <div className={`border p-5 ${ui.panelRadius} flex flex-col justify-between transition-all duration-300 min-h-[120px] shadow-md relative overflow-hidden group ${
          remainingBudget < 0 
            ? 'bg-rose-500/10 border-rose-500/35 text-rose-900 dark:text-rose-100' 
            : remainingBudget === 0 && monthlyBudget === 0
            ? `${ui.panelBg} border-slate-500/10`
            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-150'
        }`}>
          <div className={`absolute right-3 top-3 p-2 rounded-2xl ${
            remainingBudget < 0 ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400' : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
          }`}>
            <Target className="w-5 h-5" />
          </div>
          <div>
            <span className={`text-[10px] font-bold uppercase tracking-wider text-slate-500/80`}>Sisa Anggaran Belanja</span>
            <h2 className="text-2xl font-black tracking-tight mt-1.5">
              Rp {remainingBudget.toLocaleString("id-ID")}
            </h2>
          </div>
          
          <div className="text-[10px] font-semibold mt-2">
            {remainingBudget < 0 ? (
              <span className="text-red-500 font-bold flex items-center gap-1 animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> Kubangan Defisit! Lewati batas Rp {Math.abs(remainingBudget).toLocaleString("id-ID")}
              </span>
            ) : monthlyBudget === 0 ? (
              <span className="text-slate-400">Atur budget bulanan di bawah untuk mengaktifkan.</span>
            ) : (
              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                🏆 Bagus! Tersisa Rp {remainingBudget.toLocaleString("id-ID")} aman terkendali.
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Progress & Setup Widget */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Set Budget Section */}
        <div className={`${ui.panelBg} border p-5 md:p-6 ${ui.panelRadius} flex flex-col justify-between space-y-4 shadow-sm`}>
          <div>
            <h3 className={`text-sm font-bold ${ui.textMain} flex items-center gap-2`}>
              <Sliders className={`w-4 h-4 ${theme.icon}`} />
              Konfigurasi Budget Bulanan
            </h3>
            <p className={`text-[11px] ${ui.textMuted} mt-1`}>
              Sesuaikan besaran batas belanja bulanan Anda. Grafik dan sisa anggaran akan diperbarui seketika.
            </p>
          </div>

          <div className="space-y-4">
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">Rp</span>
              <input 
                type="number" 
                value={monthlyBudget || ""} 
                onChange={e => setMonthlyBudget(Number(e.target.value))}
                placeholder="Ex: 5000000"
                className={`w-full ${ui.inputBg} border ${ui.inputRadius} pl-9 pr-3.5 py-2.5 text-xs font-bold focus:ring-2 ${theme.focus} outline-none transition-shadow`}
              />
            </div>

            {/* Quick Presets Selection */}
            <div className="space-y-1.5">
              <span className={`text-[9px] font-bold ${ui.textMuted} uppercase tracking-wider block`}>Pilih Preset Cepat:</span>
              <div className="grid grid-cols-2 gap-1.5">
                {budgetPresets.map((preset) => (
                  <button
                    type="button"
                    key={preset}
                    onClick={() => setMonthlyBudget(preset)}
                    className={`text-[10px] py-1.5 px-2 rounded-lg font-bold transition-all border cursor-pointer select-none text-center ${
                      monthlyBudget === preset
                        ? "bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold"
                        : `${ui.panelBg} hover:border-slate-300 dark:hover:border-slate-700 text-slate-500 dark:text-slate-400`
                    }`}
                  >
                    Rp {(preset / 1000000)} Juta
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Sisa Anggaran Note */}
          <div className={`p-3 rounded-2xl border text-[11px] leading-relaxed text-left ${isLight ? 'bg-amber-500/5 border-amber-500/15 text-amber-800' : 'bg-amber-500/5 border-amber-500/10 text-amber-400'}`}>
            <span className="font-bold flex items-center gap-1.5 mb-0.5">
              <Info className="w-3.5 h-3.5" /> Tips Owi AI Owl 🦉
            </span>
            Kunci penghematan cerdas adalah menetapkan budget bulanan sebesar 70% dari perkiraan pendapatan bersih, sisa 30% alokasikan langsung ke tabungan/investasi.
          </div>
        </div>

        {/* Alokasi Alur Budget & Progress bars */}
        <div className={`${ui.panelBg} border p-5 md:p-6 ${ui.panelRadius} flex flex-col justify-between space-y-4 shadow-sm col-span-1 lg:col-span-2`}>
          <div>
            <div className="flex justify-between items-center text-xs">
              <h3 className={`text-sm font-bold ${ui.textMain} flex items-center gap-2`}>
                <Target className={`w-4 h-4 ${theme.icon}`} />
                Alokasi Penggunaan Budget
              </h3>
              <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold ${budgetPercent > 100 ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-600 dark:text-green-400'}`}>
                {budgetPercent.toFixed(1)}% Terpakai
              </span>
            </div>
            <p className={`text-[11px] ${ui.textMuted} mt-1`}>
              Bagan alokasi limit belanja Anda berdasarkan nominal riil dari pengeluaran bulan ini.
            </p>
          </div>

          <div className="space-y-4">
            {/* Main Progress Bar display */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className={ui.textMuted}>Terpakai: Rp {totalExpense.toLocaleString("id-ID")}</span>
                <span className={ui.textMuted}>Batas: Rp {monthlyBudget.toLocaleString("id-ID")}</span>
              </div>
              
              <div className={`h-4.5 w-full ${isLight ? 'bg-slate-100' : 'bg-slate-900'} rounded-full overflow-hidden border border-slate-500/5 p-1`}>
                <div 
                  className={`h-full ${budgetPercent > 100 ? 'bg-red-500' : theme.bgIcon} rounded-full transition-all duration-500 relative`} 
                  style={{ width: `${Math.min(budgetPercent, 100)}%` }}
                >
                  {budgetPercent > 15 && (
                    <span className="absolute inset-0 flex items-center justify-end pr-2 text-[9px] font-extrabold text-white">
                      {budgetPercent.toFixed(0)}%
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Warning Cards depending on percentages */}
            {monthlyBudget > 0 && budgetPercent > 100 ? (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium rounded-2xl flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-extrabold block text-red-700 dark:text-red-400">ANGGARAN TERLAMPAUI!</span>
                  Wah! Pengeluaran Anda telah melebihi batas budget yang ditentukan sebesar Rp {Math.abs(remainingBudget).toLocaleString("id-ID")}. Redam belanja non-primer sekarang!
                </div>
              </div>
            ) : monthlyBudget > 0 && budgetPercent >= 80 ? (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-400 text-xs font-medium rounded-2xl flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 animate-pulse" />
                <div>
                  <span className="font-extrabold block text-amber-700 dark:text-amber-400">SIAGA SATU: DEKAT LIMIT!</span>
                  Penggunaan budget hampir mencapai batas (sudah {budgetPercent.toFixed(1)}%). Hati-hati dalam mengeksekusi pengeluaran belanja beberapa hari ke depan.
                </div>
              </div>
            ) : monthlyBudget > 0 ? (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-400 text-xs font-medium rounded-2xl flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-extrabold block text-emerald-700 dark:text-emerald-400">SIAGA AMAN & SEHAT</span>
                  Bagus sekali! Aliran anggaran pengeluaran Anda masih dalam rentang sehat. Pertahankan disiplin pencatatan keuangan harian Anda!
                </div>
              </div>
            ) : (
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 text-blue-800 dark:text-blue-450 text-xs font-medium rounded-2xl flex items-start gap-2.5">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-extrabold block">BUDGET BELUM DISET</span>
                  Silahkan set target limit anggaran bulanan Anda di panel samping untuk memulai analisis perbandingan yang komprehensif.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Categories Breakdown & Detailed Transaction History Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Expense Categories breakdown */}
        <div className={`${ui.panelBg} border p-5 md:p-6 ${ui.panelRadius} transition-all duration-300 space-y-4 shadow-sm`}>
          <div>
            <h3 className={`text-sm font-bold ${ui.textMain} flex items-center gap-2`}>
              <Tag className={`w-4 h-4 ${theme.icon}`} />
              Distribusi Pengeluaran
            </h3>
            <p className={`text-[11px] ${ui.textMuted} mt-0.5`}>
              Detail pengeluaran bulanan yang dipecah per kategori.
            </p>
          </div>

          <div className="space-y-3.5 pt-1.5">
            {expenseByCategory.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                Belum ada transaksi pengeluaran tercatat
              </div>
            ) : (
              expenseByCategory.map((item) => (
                <div key={item.category} className="space-y-1.5 text-xs">
                  <div className="flex justify-between items-center font-semibold">
                    <span className={ui.textMain}>{item.category}</span>
                    <span className={ui.textMuted}>
                      Rp {item.amount.toLocaleString("id-ID")} • <span className="font-bold text-slate-400">{item.percentage.toFixed(0)}%</span>
                    </span>
                  </div>
                  <div className={`h-2.5 w-full ${isLight ? 'bg-slate-100' : 'bg-[#1a2d21]'} rounded-full overflow-hidden border border-slate-500/5`}>
                    <div 
                      className={`h-full ${
                        item.category === 'Makanan' ? 'bg-[#f0a868]' :
                        item.category === 'Belanja' ? 'bg-[#a78bfa]' :
                        item.category === 'Tagihan' ? 'bg-[#ec4899]' :
                        item.category === 'Transportasi' ? 'bg-[#3b82f6]' :
                        'bg-[#6a8d73]'
                      } transition-all duration-500 rounded-full`}
                      style={{ width: `${item.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Columns (2x size): Detailed Transaction History List */}
        <div className={`${ui.panelBg} border p-5 md:p-6 ${ui.panelRadius} transition-all duration-300 space-y-4 shadow-sm col-span-1 lg:col-span-2`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3.5 border-slate-500/10">
            <div>
              <h3 className={`text-sm font-bold ${ui.textMain} flex items-center gap-2`}>
                <Calendar className={`w-4 h-4 ${theme.icon}`} />
                Riwayat Lengkap Pencatatan
              </h3>
              <p className={`text-[11px] ${ui.textMuted} mt-0.5`}>
                Menemukan {filteredList.length} dari {transactions.length} total catatan Anda.
              </p>
            </div>
          </div>

          {/* Interactive Filters Bar */}
          <div className="space-y-3">
            {/* Search inputs */}
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-400">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="Cari deskripsi transaksi atau kategori..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className={`w-full ${ui.inputBg} border ${ui.inputRadius} pl-9 pr-3.5 py-2 text-xs font-bold focus:ring-2 ${theme.focus} outline-none transition-shadow`}
              />
            </div>

            {/* Quick Type & Category selectors */}
            <div className="flex flex-wrap items-center gap-2">
              <span className={`text-[10px] font-bold ${ui.textMuted} uppercase`}>Tipe:</span>
              <div className="flex bg-slate-550/10 rounded-lg p-0.5 border border-slate-500/5 overflow-hidden">
                {(["all", "Expense", "Income"] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setTransactionTypeFilter(type)}
                    className={`text-[10px] px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                      transactionTypeFilter === type
                        ? isLight ? 'bg-white shadow text-slate-900 border border-slate-200' : 'bg-[#18261e] border border-white/5 text-emerald-300'
                        : `text-slate-400 hover:text-slate-300`
                    }`}
                  >
                    {type === "all" ? "Semua" : type === "Expense" ? "Pengeluaran" : "Pemasukan"}
                  </button>
                ))}
              </div>

              {uniqueCategories.length > 0 && (
                <>
                  <span className={`text-[10px] font-bold ${ui.textMuted} uppercase ml-1.5`}>Kategori:</span>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className={`text-[10px] leading-tight ${ui.inputBg} border ${ui.inputRadius} px-2.5 py-1 font-bold outline-none cursor-pointer focus:ring-1 ${theme.focus}`}
                  >
                    <option value="all">📁 Semua Kategori</option>
                    {uniqueCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </>
              )}
            </div>
          </div>

          {/* Transactions Cards list */}
          <div className="space-y-3.5 max-h-[380px] overflow-y-auto scrollbar-thin pr-1 pb-2">
            {filteredList.length === 0 ? (
              <div className="text-center py-12 text-xs text-slate-400">
                Tidak ada riwayat transaksi yang cocok dengan filter Anda.
              </div>
            ) : (
              filteredList.slice().reverse().map((t, index) => (
                <div 
                  key={t.id || index} 
                  className={`flex items-center gap-3.5 p-3 rounded-2xl border transition-colors hover:bg-slate-500/5 ${isLight ? 'border-slate-100 bg-white shadow-sm/30' : 'border-white/5 bg-slate-900/10'}`}
                >
                  {/* Indicator Icon */}
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                    t.type === 'Income' 
                      ? 'bg-green-500/10 text-green-500' 
                      : 'bg-red-500/10 text-red-500'
                  }`}>
                    {t.type === 'Income' ? (
                      <TrendingUp className="w-4 h-4 text-green-500" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-500" />
                    )}
                  </div>

                  {/* Description & metadata */}
                  <div className="flex-1 min-w-0 text-left">
                    <p className={`text-xs font-bold ${ui.textMain} truncate`}>{t.description}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-400 font-semibold">
                      <span className={`px-2 py-0.5 rounded bg-slate-500/10 text-[9px] font-extrabold uppercase`}>
                        {t.category}
                      </span>
                      <span>•</span>
                      <span>{t.date ? format(new Date(t.date), 'dd MMMM yyyy', { locale: id }) : ""}</span>
                    </div>
                  </div>

                  {/* Amount Rupiah */}
                  <div className={`font-mono text-xs font-black text-right shrink-0 ${t.type === 'Income' ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                    {t.type === 'Income' ? '+' : '-'} Rp {t.amount.toLocaleString("id-ID")}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
