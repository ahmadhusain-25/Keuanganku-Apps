import React, { useState, useEffect } from "react";
import { fetchChatSpaces, sendChatMessage } from "../api";
import { MessageSquare, Send, RefreshCw, SendHorizontal, CheckCircle2, ChevronRight, Share2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface Space {
  name: string;
  displayName: string;
  type: string;
}

export const GoogleChatBroadcast = ({ aiSummary, balanceInfo, ui, theme }: { 
  aiSummary: string; 
  balanceInfo: string;
  ui: any; 
  theme: any;
}) => {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [selectedSpace, setSelectedSpace] = useState<string>("");
  const [customMessage, setCustomMessage] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const loadSpaces = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetchChatSpaces();
      setSpaces(res.spaces || []);
      if (res.spaces && res.spaces.length > 0) {
        setSelectedSpace(res.spaces[0].name);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && spaces.length === 0) {
      loadSpaces();
    }
  }, [isOpen]);

  const handleBroadcast = async () => {
    if (!selectedSpace) return;
    try {
      setSending(true);
      setError("");
      
      const text = `📊 *Laporan Keuangan Owi*\n\n${balanceInfo}\n\n${aiSummary}\n\n${customMessage ? `💬 *Catatan:* ${customMessage}` : ""}`;
      
      await sendChatMessage(selectedSpace, text);
      setSuccess(true);
      setCustomMessage("");
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={`${ui.panelBg} border ${ui.panelRadius} p-5 shadow-sm transition-all duration-500 overflow-hidden`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-[10px] font-bold flex items-center gap-1.5 uppercase tracking-widest ${theme.icon}`}>
          <MessageSquare className="w-4 h-4" /> BROADCAST GOOGLE CHAT
        </h3>
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className={`p-1.5 rounded-lg ${ui.inputBg} hover:bg-emerald-500/10 transition-colors`}
        >
          <ChevronRight className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
        </button>
      </div>

      {!isOpen ? (
        <p className={`text-[11px] ${ui.textMuted} leading-normal mb-1`}>
          Bagikan ringkasan analisis keuangan Anda langsung ke Google Chat group atau ruang kerja Anda.
        </p>
      ) : (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="space-y-4"
        >
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-bold flex items-center gap-2">
              <RefreshCw className="w-3 h-3 shrink-0" />
              <span>{error === "UNAUTHORIZED_SESSION_EXPIRED" ? "Sesi Chat Kedaluwarsa. Silakan hubungkan kembali akun." : error}</span>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-4">
              <RefreshCw className="w-5 h-5 animate-spin text-emerald-500" />
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className={`block text-[9px] font-bold ${ui.textMuted} mb-1.5 uppercase`}>Pilih Ruang Obrolan (Space)</label>
                <select 
                  value={selectedSpace}
                  onChange={(e) => setSelectedSpace(e.target.value)}
                  className={`w-full ${ui.inputBg} border ${ui.inputRadius} px-3 py-2 text-[11px] font-bold outline-none focus:ring-2 ${theme.focus}`}
                >
                  {spaces.length === 0 ? (
                    <option value="">Tidak ada Space ditemukan</option>
                  ) : (
                    spaces.map((s) => (
                      <option key={s.name} value={s.name}>{s.displayName || s.name}</option>
                    ))
                  )}
                </select>
                <button 
                  onClick={loadSpaces}
                  className={`mt-1.5 text-[9px] font-bold ${theme.icon} flex items-center gap-1 hover:underline`}
                >
                  <RefreshCw className="w-2.5 h-2.5" /> Refresh Daftar Space
                </button>
              </div>

              <div>
                <label className={`block text-[9px] font-bold ${ui.textMuted} mb-1.5 uppercase`}>Tambahan Pesan (Opsional)</label>
                <textarea 
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Ketik catatan tambahan di sini..."
                  className={`w-full ${ui.inputBg} border ${ui.inputRadius} px-3 py-2 text-[11px] font-semibold outline-none focus:ring-2 ${theme.focus} h-16 resize-none`}
                />
              </div>

              <button 
                onClick={handleBroadcast}
                disabled={sending || !selectedSpace || success}
                className={`w-full ${success ? 'bg-green-500' : theme.bgIcon} text-white font-bold py-2.5 ${ui.buttonRadius} text-xs transition-all shadow disabled:opacity-50 flex justify-center items-center gap-2`}
              >
                {sending ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : success ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <Share2 className="w-3.5 h-3.5" />
                )}
                {success ? "Berhasil Dikirim!" : sending ? "Mengirim ke Chat..." : "Broadcast Sekarang"}
              </button>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};
