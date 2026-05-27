import React, { useState } from "react";
import { 
  User as UserIcon, 
  Palette, 
  Moon, 
  Sun, 
  FolderOpen, 
  RefreshCw, 
  MessageSquare, 
  Terminal, 
  Copy, 
  Trash2, 
  AlertTriangle, 
  LogOut, 
  Mail, 
  Check,
  ChevronRight,
  Info,
  CheckCircle2,
  Calendar as CalendarIcon,
  HelpCircle
} from "lucide-react";

interface SettingsPanelProps {
  user: any;
  onLogout: () => void;
  customName: string;
  setCustomName: (name: string) => void;
  customPhoto: string;
  setCustomPhoto: (photo: string) => void;
  phone: string;
  setPhone: (phone: string) => void;
  dob: string;
  setDob: (dob: string) => void;
  themeMode: "blue" | "purple" | "emerald" | "rose" | "pink";
  setThemeMode: (mode: "blue" | "purple" | "emerald" | "rose" | "pink") => void;
  colorMode: "dark" | "light";
  setColorMode: (mode: "dark" | "light") => void;
  designStyle: "modern" | "cute";
  setDesignStyle: (style: "modern" | "cute") => void;
  monthlyBudget: number;
  setMonthlyBudget: (budget: number) => void;
  spreadsheetsList: any[];
  loadingSpreadsheets: boolean;
  loadSpreadsheetsList: () => Promise<void>;
  customSpreadsheetId: string | null;
  handleCustomSpreadsheetChange: (sheetId: string) => Promise<void>;
  waBotEnabled: boolean;
  setWaBotEnabled: (enabled: boolean) => void;
  waBotNotifyOnAdd: boolean;
  setWaBotNotifyOnAdd: (enabled: boolean) => void;
  waBotNotifyOnBudget: boolean;
  setWaBotNotifyOnBudget: (enabled: boolean) => void;
  handleCopyAppsScript: () => void;
  copiedScript: boolean;
  handleResetTransactions: () => Promise<void>;
  isResetting: boolean;
  handleSaveProfile: (e: React.FormEvent) => void;
  handlePhotoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isLight: boolean;
  isCute: boolean;
  ui: any;
  theme: any;
  onBack: () => void;
}

export const SettingsPanel = ({
  user,
  onLogout,
  customName,
  setCustomName,
  customPhoto,
  setCustomPhoto,
  phone,
  setPhone,
  dob,
  setDob,
  themeMode,
  setThemeMode,
  colorMode,
  setColorMode,
  designStyle,
  setDesignStyle,
  monthlyBudget,
  setMonthlyBudget,
  spreadsheetsList,
  loadingSpreadsheets,
  loadSpreadsheetsList,
  customSpreadsheetId,
  handleCustomSpreadsheetChange,
  waBotEnabled,
  setWaBotEnabled,
  waBotNotifyOnAdd,
  setWaBotNotifyOnAdd,
  waBotNotifyOnBudget,
  setWaBotNotifyOnBudget,
  handleCopyAppsScript,
  copiedScript,
  handleResetTransactions,
  isResetting,
  handleSaveProfile,
  handlePhotoUpload,
  isLight,
  isCute,
  ui,
  theme,
  onBack
}: SettingsPanelProps) => {
  const [activeTab, setActiveTab] = useState<"profile" | "appearance" | "gsheets" | "wabot" | "danger">("profile");

  const menuItems = [
    { id: "profile", label: "Profil & Akun", icon: <UserIcon className="w-4 h-4" /> },
    { id: "appearance", label: "Tema & Desain", icon: <Palette className="w-4 h-4" /> },
    { id: "gsheets", label: "Penyimpanan GSheet", icon: <FolderOpen className="w-4 h-4" /> },
    { id: "wabot", label: "Bot WA & Notifikasi", icon: <MessageSquare className="w-4 h-4" /> },
    { id: "danger", label: "Reset Data", icon: <AlertTriangle className="w-4 h-4" /> },
  ] as const;

  const colorPalettePreview = {
    emerald: { name: "Sage Green (Default)", color: "#6a8d73", secondary: "#e4ffe1" },
    blue: { name: "Elegant Royal Blue", color: "#3b82f6", secondary: "#ebf5ff" },
    purple: { name: "Cozy Lavender", color: "#8b5cf6", secondary: "#f5f3ff" },
    rose: { name: "Warm Blossom Rose", color: "#f43f5e", secondary: "#fff1f2" },
    pink: { name: "Playful Sweet Pink", color: "#ec4899", secondary: "#fdf2f8" },
  };

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
      {/* Header Pengaturan */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={onBack}
            className={`p-2.5 rounded-2xl border ${isLight ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50' : 'bg-white/5 border-white/10 text-white hover:bg-white/10'} transition-all flex items-center justify-center`}
            title="Kembali ke Dashboard"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h2 className={`text-2xl font-bold ${ui.textMain} tracking-tight`}>Pengaturan Kuanganku</h2>
            <p className={`text-xs ${ui.textMuted}`}>Kelola profil, tampilan aplikasi, otomatisasi Bot WhatsApp & Excel GSheets</p>
          </div>
        </div>
        <button 
          onClick={onLogout}
          className="px-4 py-2 bg-rose-500/15 hover:bg-rose-500/20 text-rose-500 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 border border-rose-500/20 transition-all self-start sm:self-auto"
        >
          <LogOut className="w-4 h-4" />
          Keluar Sesi
        </button>
      </div>

      {/* Main Settings Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Left Hand Sidebar Navigation */}
        <div className="lg:col-span-1 flex flex-row lg:flex-col overflow-x-auto lg:overflow-x-visible pb-3 lg:pb-0 gap-1 lg:space-y-1.5 scrollbar-none">
          {menuItems.map((item) => {
            const isSelected = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-3 px-4 py-3 text-sm font-semibold transition-all whitespace-nowrap grow-0 shrink-0 lg:w-full rounded-2xl ${
                  isSelected 
                    ? `${theme.bgIcon} text-white shadow-lg ${theme.shadow}` 
                    : `${isLight ? 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-100' : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5'}`
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
                <span className="ml-auto hidden lg:inline-block">
                  <ChevronRight className={`w-3.5 h-3.5 opacity-60 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                </span>
              </button>
            );
          })}
        </div>

        {/* Right Hand Settings Detail Panel content */}
        <div className="lg:col-span-3">
          {activeTab === "profile" && (
            <form onSubmit={handleSaveProfile} className={`${ui.panelBg} backdrop-blur-xl border ${ui.panelRadius} p-6 sm:p-8 space-y-6 transition-all duration-500`}>
              <div className="flex items-center gap-3 border-b pb-4 border-slate-200/50 dark:border-slate-800">
                <div className={`p-2.5 rounded-xl ${theme.bg1} ${theme.icon}`}>
                  <UserIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`text-base font-bold ${ui.textMain}`}>Identitas & Profil Pengguna</h3>
                  <p className={`text-xs ${ui.textMuted}`}>Kelola data pribadi Anda yang tersimpan secara lokal dan tersinkronisasi</p>
                </div>
              </div>

              {/* Profile Avatar Upload Section */}
              <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-3xl bg-slate-500/5 border border-slate-500/10">
                <div className="relative group">
                  <div className={`w-20 h-20 rounded-full ${theme.bg1} flex items-center justify-center border-4 ${isLight ? 'border-white' : 'border-[#0a120e]'} shadow-xl overflow-hidden shrink-0`}>
                    {customPhoto ? (
                      <img src={customPhoto} alt="Foto Profil" className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon className={`w-8 h-8 ${theme.icon}`} />
                    )}
                  </div>
                  <label className="absolute inset-0 bg-black/50 text-white flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity text-[10px] font-bold backdrop-blur-xs">
                    Ubah Foto
                    <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                  </label>
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <h4 className={`text-base font-bold ${ui.textMain}`}>{customName || user?.displayName || "Tamu Kuanganku"}</h4>
                  <p className={`text-xs ${ui.textMuted}`}>{user?.email || "tamu.keuanganku@gmail.com"}</p>
                  <label className={`mt-2.5 inline-flex text-xs px-3 py-1.5 font-semibold text-white ${theme.bgIcon} rounded-xl hover:opacity-90 active:scale-95 transition-all cursor-pointer`}>
                    Upload Foto Baru
                    <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                  </label>
                </div>
              </div>

              {/* Form Input Matrix */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-xs font-bold ${ui.textMuted} mb-1.5`}>Nama Lengkap</label>
                  <input 
                    type="text"
                    value={customName}
                    onChange={e => setCustomName(e.target.value)}
                    placeholder="Masukkan nama"
                    className={`w-full ${ui.inputBg} border ${ui.inputRadius} px-4 py-3 text-sm focus:ring-2 ${theme.focus} outline-none transition-shadow font-semibold`}
                    required
                  />
                </div>
                <div>
                  <label className={`block text-xs font-bold ${ui.textMuted} mb-1.5`}>Email Terhubung</label>
                  <input 
                    type="email"
                    value={user?.email || "tamu@keuanganku.local"}
                    disabled
                    className={`w-full ${ui.inputBg} opacity-60 border ${ui.inputRadius} px-4 py-3 text-sm cursor-not-allowed outline-none font-semibold`}
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Digunakan sebagai pengenal kunci sinkronisasi</p>
                </div>
                <div>
                  <label className={`block text-xs font-bold ${ui.textMuted} mb-1.5`}>No. Whatsapp Notifikasi</label>
                  <input 
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="Contoh: 08123456789"
                    className={`w-full ${ui.inputBg} border ${ui.inputRadius} px-4 py-3 text-sm focus:ring-2 ${theme.focus} outline-none transition-shadow font-semibold`}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-bold ${ui.textMuted} mb-1.5`}>Tanggal Lahir</label>
                  <input 
                    type="date"
                    value={dob}
                    onChange={e => setDob(e.target.value)}
                    className={`w-full ${ui.inputBg} border ${ui.inputRadius} px-4 py-3 text-sm focus:ring-2 ${theme.focus} outline-none transition-shadow font-semibold`}
                    style={{ colorScheme: isLight ? 'light' : 'dark' }}
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button type="submit" className={`px-6 py-2.5 font-bold text-sm text-white ${theme.bgIcon} hover:opacity-95 transition-opacity ${ui.buttonRadius} ${theme.shadow} flex items-center gap-2`}>
                  <Check className="w-4 h-4" />
                  Simpan Perubahan
                </button>
              </div>
            </form>
          )}

          {activeTab === "appearance" && (
            <div className={`${ui.panelBg} border ${ui.panelRadius} p-6 sm:p-8 space-y-6 transition-all duration-500`}>
              <div className="flex items-center gap-3 border-b pb-4 border-slate-200/50 dark:border-slate-800">
                <div className={`p-2.5 rounded-xl ${theme.bg1} ${theme.icon}`}>
                  <Palette className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`text-base font-bold ${ui.textMain}`}>Tema & Gaya Antarmuka</h3>
                  <p className={`text-xs ${ui.textMuted}`}>Atur palet warna utama, gaya bentuk tombol, and tema visual gelap/terang</p>
                </div>
              </div>

              {/* Dark/Light Mode Selector */}
              <div className="space-y-3">
                <h4 className={`text-sm font-bold ${ui.textMain}`}>Mode Visual Aplikasi</h4>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setColorMode("light")}
                    className={`p-4 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-2 ${
                      isLight 
                        ? 'border-[#6a8d73] bg-[#f4fdd9]/50 text-slate-800 ring-2 ring-[#6a8d73]/10 font-bold' 
                        : 'border-slate-850 bg-slate-900/50 text-slate-400 font-semibold'
                    }`}
                  >
                    <Sun className={`w-5 h-5 ${isLight ? 'text-[#6a8d73]' : 'text-slate-400'}`} />
                    <span className="text-xs font-semibold">Mode Terang</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setColorMode("dark")}
                    className={`p-4 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-2 ${
                      !isLight 
                        ? `${theme.icon} border-[#6a8d73] bg-[#1a2d21]/60 text-white ring-2 ring-[#6a8d73]/20 font-bold` 
                        : 'border-slate-200 bg-white text-slate-500 font-semibold'
                    }`}
                  >
                    <Moon className={`w-5 h-5 ${!isLight ? 'text-[#6a8d73]' : 'text-slate-400'}`} />
                    <span className="text-xs font-semibold">Mode Gelap</span>
                  </button>
                </div>
              </div>

              {/* Theme Color Palette Selector */}
              <div className="space-y-3">
                <h4 className={`text-sm font-bold ${ui.textMain}`}>Pilihan Palet Warna</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  {Object.entries(colorPalettePreview).map(([key, item]) => {
                    const isSelected = themeMode === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setThemeMode(key as any)}
                        className={`p-3 rounded-2xl border text-left transition-all ${
                          isSelected 
                            ? 'border-slate-900 dark:border-white ring-2 ring-slate-500/25 scale-[1.02] font-bold' 
                            : 'border-slate-200 hover:border-slate-400 bg-slate-500/5 font-semibold'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className="w-5 h-5 rounded-full block border shadow-xs" style={{ backgroundColor: item.color }} />
                          <span className="w-3.5 h-3.5 rounded-full block border -ml-3.5 opacity-80" style={{ backgroundColor: item.secondary }} />
                        </div>
                        <p className={`text-[11px] leading-tight ${isSelected ? ui.textMain : 'text-slate-500'}`} style={{ color: isSelected ? undefined : undefined }}>
                          {item.name}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quick Visual Preview Box */}
              <div className="p-4 rounded-3xl space-y-2 border border-dashed border-[#6a8d73]/30 bg-[#6a8d73]/5 dark:bg-[#6a8d73]/2">
                <p className="text-xs font-bold flex items-center gap-1.5 text-[#6a8d73]">
                  <CheckCircle2 className="w-4 h-4" /> Preview Harmonisasi Tampilan
                </p>
                <p className={`text-xs ${ui.textMuted} leading-relaxed`}>
                  Aplikasi telah dikonfigurasi dengan font <strong>Space Grotesk</strong> (visual modern) berpadu bersama <strong>JetBrains Mono</strong> untuk kejelasan membaca data transaksi. Skema warna otomatis menyesuaikan elemen charts, tombol input, & wallpaper simulator Whatsapp.
                </p>
              </div>
            </div>
          )}

          {activeTab === "gsheets" && (
            <div className="space-y-6">
              {/* Spreadsheet Main Connector View */}
              <div className={`${ui.panelBg} border ${ui.panelRadius} p-6 sm:p-8 space-y-6 transition-all duration-500`}>
                <div className="flex items-center justify-between border-b pb-4 border-slate-200/50 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-500">
                      <FolderOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className={`text-base font-bold ${ui.textMain}`}>Koneksi Google Spreadsheet</h3>
                      <p className={`text-xs ${ui.textMuted}`}>Semua data transaksi tersinkronisasi instan ke Google Drive spreadsheet Anda</p>
                    </div>
                  </div>
                </div>

                {user?.isGuest ? (
                  <div className="p-5 rounded-3xl bg-amber-500/10 border border-amber-500/20 space-y-3">
                    <p className="text-xs font-bold text-amber-500 flex items-center gap-1.5">
                      <Info className="w-4 h-4" /> Mode Tamu Aktif (Guest Session)
                    </p>
                    <p className={`text-xs ${ui.textMuted} leading-relaxed`}>
                      Dalam mode tamu, data disimpan langsung di memori browser (<em>localStorage</em>) Anda. Untuk menyingkronkannya dengan Google Sheets di Drive Anda serta memicu kecerdasan Google Gemini, silakan login kembali menggunakan akun Google Anda.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">STATUS SINKRONISASI AKTIF ⚡</p>
                        <p className={`text-sm font-bold ${ui.textMain} mt-1 truncate max-w-md`}>
                          Spreadsheet ID: <code className="font-mono text-xs text-slate-500">{customSpreadsheetId === "monthly" ? "📂 Koleksi Bulanan Otomatis" : (customSpreadsheetId || "Sedang memuat...")}</code>
                        </p>
                      </div>
                      <a 
                        href={`https://docs.google.com/spreadsheets/d/${customSpreadsheetId === "monthly" ? "" : customSpreadsheetId}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className={`text-xs font-bold bg-[#6a8d73]/20 hover:bg-[#6a8d73]/30 text-[#6a8d73] px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 ${customSpreadsheetId === "monthly" ? "opacity-50 pointer-events-none" : ""}`}
                      >
                        Buka Dokumen <ChevronRight className="w-3.5 h-3.5" />
                      </a>
                    </div>

                    <div className="space-y-2">
                      <label className={`block text-xs font-bold ${ui.textMuted}`}>Ganti Database Aktif (Pilih Dokumen dari GDrive)</label>
                      <div className="flex flex-col sm:flex-row items-center gap-3">
                        <select
                          value={customSpreadsheetId || "monthly"}
                          onChange={(e) => handleCustomSpreadsheetChange(e.target.value)}
                          className={`w-full ${ui.inputBg} border ${ui.inputRadius} p-3 text-sm focus:ring-2 ${theme.focus} outline-none cursor-pointer font-semibold`}
                        >
                          <option value="monthly">📂 Koleksi Bulanan Otomatis (Direkomendasikan)</option>
                          {spreadsheetsList.map(item => (
                            <option key={item.id} value={item.id}>📄 {item.name}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={loadSpreadsheetsList}
                          disabled={loadingSpreadsheets}
                          className={`w-full sm:w-auto px-4 py-3 flex items-center justify-center gap-2 border ${isLight ? 'border-slate-200 hover:bg-slate-50 text-slate-700' : 'border-white/10 hover:bg-white/5 text-slate-300'} text-xs font-bold ${ui.buttonRadius} transition-all whitespace-nowrap`}
                          title="Refresh Database Google Drive"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${loadingSpreadsheets ? 'animate-spin' : ''}`} />
                          Sync GDrive Info
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">Anda bisa memilih berkas spreadsheet lain yang berisi tabel Transactions jika ingin beralih tabungan.</p>
                    </div>
                  </div>
                )}
              </div>


            </div>
          )}

          {activeTab === "wabot" && (
            <div className={`${ui.panelBg} border ${ui.panelRadius} p-6 sm:p-8 space-y-6 transition-all duration-500`}>
              <div className="flex items-center justify-between border-b pb-4 border-slate-200/50 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-green-500/15 text-green-500">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className={`text-base font-bold ${ui.textMain}`}> WhatsApp Bot & Otomatisasi</h3>
                    <p className={`text-xs ${ui.textMuted}`}>Konfigurasi status bot, nomor whatsapp pemantau, and rule pemicu bot otomatis</p>
                  </div>
                </div>
              </div>

              {/* Bot Destination Number */}
              <div className="space-y-4">
                <div>
                  <label className={`block text-xs font-bold ${ui.textMuted} mb-1.5`}>Nomor Tujuan Bot WA</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="Contoh: 08123456789"
                    className={`w-full ${ui.inputBg} border ${ui.inputRadius} px-4 py-3 text-sm focus:ring-2 focus:ring-green-500 outline-none transition-shadow font-semibold`}
                  />
                  <p className="text-[10px] text-slate-450 mt-1">Robot pengawas akan mengirim chat ke nomor aktif ini saat rule terpicu.</p>
                </div>

                <div className="border-t pt-4 border-slate-200/50 dark:border-slate-800 space-y-3">
                  <h4 className={`text-sm font-bold ${ui.textMain} tracking-wide`}>Automation Rules & Triggers</h4>
                  <p className="text-[11px] text-slate-400">Nyalakan alarm otomatis untuk memantau budget finansial Anda secara real-time</p>

                  <div className="space-y-2.5">
                    <label className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-500/5 hover:bg-slate-500/10 transition-colors cursor-pointer border border-slate-500/10">
                      <div className="flex flex-col pr-2">
                        <span className={`text-sm font-bold ${ui.textMain}`}>Aktifkan Engine Bot</span>
                        <span className="text-[10px] text-slate-400 mt-0.5">Nyalakan respon otomatis chatbot & simulator WhatsApp</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={waBotEnabled}
                        onChange={e => setWaBotEnabled(e.target.checked)}
                        className="rounded text-green-500 focus:ring-green-500 cursor-pointer h-4.5 w-4.5 accent-green-650"
                      />
                    </label>

                    <label className={`flex items-center justify-between p-3.5 rounded-2xl bg-slate-500/5 hover:bg-slate-500/10 transition-colors cursor-pointer border border-slate-500/10 ${!waBotEnabled && 'opacity-50 pointer-events-none'}`}>
                      <div className="flex flex-col pr-2">
                        <span className={`text-sm font-bold ${ui.textMain}`}>Notifikasi Transaksi Baru</span>
                        <span className="text-[10px] text-slate-400 mt-0.5">Infokan otomatis lewat detail chat WA setiap kali ada pemasukan/pengeluaran baru</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={waBotNotifyOnAdd}
                        onChange={e => setWaBotNotifyOnAdd(e.target.checked)}
                        disabled={!waBotEnabled}
                        className="rounded text-green-500 focus:ring-green-500 cursor-pointer h-4.5 w-4.5 accent-green-650"
                      />
                    </label>

                    <label className={`flex items-center justify-between p-3.5 rounded-2xl bg-slate-500/5 hover:bg-slate-500/10 transition-colors cursor-pointer border border-slate-500/10 ${!waBotEnabled && 'opacity-50 pointer-events-none'}`}>
                      <div className="flex flex-col pr-2">
                        <span className={`text-sm font-bold ${ui.textMain}`}>Pengawas Limit Belanja Bulanan</span>
                        <span className="text-[10px] text-slate-400 mt-0.5">Berikan peringatan otomatis via chat jika total pengeluaran meluap melompati budget bulanan</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={waBotNotifyOnBudget}
                        onChange={e => setWaBotNotifyOnBudget(e.target.checked)}
                        disabled={!waBotEnabled}
                        className="rounded text-green-500 focus:ring-green-500 cursor-pointer h-4.5 w-4.5 accent-green-650"
                      />
                    </label>
                  </div>
                </div>


              </div>
            </div>
          )}

          {activeTab === "danger" && (
            <div className={`${ui.panelBg} border ${ui.panelRadius} p-6 sm:p-8 space-y-6 transition-all duration-500`}>
              <div className="flex items-center gap-3 border-b pb-4 border-slate-200/50 dark:border-slate-800">
                <div className="p-2 bg-red-500/10 text-red-500 rounded-lg">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-red-500">Reset Data</h3>
                  <p className={`text-xs ${ui.textMuted}`}>Tindakan di bagian ini bersifat fatal, permanen, dan tidak dapat dipulihkan</p>
                </div>
              </div>

              {/* Set Monthly Budget Limit */}
              <div className="p-4 rounded-2xl border border-rose-500/10 bg-rose-500/5 space-y-4">
                <div className="flex gap-3">
                  <HelpCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className={`text-sm font-bold ${ui.textMain}`}>Reset Seluruh Transaksi & Database</h4>
                    <p className={`text-xs ${ui.textMuted} leading-normal mt-0.5`}>
                      Tindakan ini akan mengosongkan seluruh tabel data transaksi keuangan Anda saat ini, baik yang tersimpan di Google Sheets ataupun memori penyimpanan lokal browser TAMU.
                    </p>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleResetTransactions}
                    disabled={isResetting}
                    className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold text-sm rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-red-600/20 disabled:opacity-50"
                  >
                    {isResetting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    {isResetting ? "Sedang Mengosongkan..." : "Reset Semua Riwayat Keuangan"}
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200/50 dark:border-slate-800">
                <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
                  *Dengan menekan tombol hapus, Anda menyetujui bahwa Kuanganku tidak bertanggung jawab atas hilangnya data catatan tabungan Anda yang tidak dicadangkan sebelumnya.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
