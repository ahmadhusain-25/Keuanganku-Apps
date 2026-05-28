import React, { useState, useEffect, useRef } from "react";
import { X, Send, Sparkles, MessageCircle, RotateCcw, AlertTriangle } from "lucide-react";
import { sendAIChatMessage, Transaction } from "../api";
import { OwiLogo } from "./OwiLogo";

interface ChatMessage {
  role: "user" | "model";
  text: string;
  isError?: boolean;
}

interface FloatingAssistantProps {
  transactions: Transaction[];
  themeMode?: "light" | "dark" | "cosmic";
  spreadsheetName?: string;
  isGuest?: boolean;
}

export const FloatingAssistant: React.FC<FloatingAssistantProps> = ({
  transactions,
  themeMode = "light",
  spreadsheetName = "",
  isGuest = false,
}) => {
  const isDarkObj = themeMode === "dark" || themeMode === "cosmic";

  // Dragging and position state
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [isApiLimit, setIsApiLimit] = useState(false);

  const dragStart = useRef({ x: 0, y: 0 });
  const elementStart = useRef({ x: 0, y: 0 });
  const totalMove = useRef(0);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const assistantRef = useRef<HTMLDivElement>(null);

  // Load chat history from localStorage on mount
  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
    const saved = localStorage.getItem("owi_assistant_chat");
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse saved chat logs:", e);
      }
    } else {
      // Intro greeting
      setMessages([
        {
          role: "model",
          text: "Halo Teman Catat! 🦉 Aku adalah **Owi**, asisten keuangan pribadi pintarmu. \n\nKamu bisa bertanya tentang kondisi keuanganmu saat ini, tips menghemat pengeluaran, menyusun anggaran bulanan, atau sekadar berkonsultasi tentang cara mengelola uang dengan cerdas! \n\nApa yang ingin kamu tanyakan hari ini? 🪙✨",
        },
      ]);
    }

    // Set initial position on the bottom right of current window
    const initialX = window.innerWidth - (window.innerWidth < 768 ? 80 : 100);
    const initialY = window.innerHeight - (window.innerWidth < 768 ? 120 : 150);
    setPosition({ x: initialX, y: initialY });

    // Handle window resize
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      setPosition((prev) => {
        const nextX = Math.max(10, Math.min(window.innerWidth - 85, prev.x));
        const nextY = Math.max(10, Math.min(window.innerHeight - 85, prev.y));
        return { x: nextX, y: nextY };
      });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Save chat log to localStorage on update
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem("owi_assistant_chat", JSON.stringify(messages));
    }
  }, [messages]);

  // Scroll to bottom on new message
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading, isOpen]);

  // Alert new messages visually via bubbles
  useEffect(() => {
    if (!isOpen && messages.length > 1) {
      setHasNewMessage(true);
    }
  }, [messages, isOpen]);

  // Drag event handlers (using pointerEvents to support mouse & touch simultaneously)
  const handlePointerDown = (e: React.PointerEvent) => {
    // Avoid dragging initiating on interactive buttons/scroll inside dialog
    if (isOpen && (e.target as HTMLElement).closest(".chat-dialog")) {
      return;
    }
    setIsDragging(true);
    totalMove.current = 0;
    dragStart.current = { x: e.clientX, y: e.clientY };
    elementStart.current = { x: position.x, y: position.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    totalMove.current = Math.sqrt(dx * dx + dy * dy);

    // Bounding restricts
    const nextX = Math.max(10, Math.min(window.innerWidth - 85, elementStart.current.x + dx));
    const nextY = Math.max(10, Math.min(window.innerHeight - 85, elementStart.current.y + dy));
    setPosition({ x: nextX, y: nextY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch (_) {}

    // Tap/Click threshold (< 5 pixels of total drag is a click)
    if (totalMove.current < 5) {
      setIsOpen(!isOpen);
      setHasNewMessage(false);
    }
  };

  const handleSend = async (customMessage?: string) => {
    const textToSend = (customMessage || input).trim();
    if (!textToSend) return;

    // Clear input if user sent via keyboard
    if (!customMessage) {
      setInput("");
    }

    const newUserMessage: ChatMessage = { role: "user", text: textToSend };
    setMessages((prev) => [...prev, newUserMessage]);
    setIsLoading(true);

    try {
      // Map ChatMessage elements to Gemini API content payload structure
      const apiHistory = messages.map((m) => ({
        role: m.role,
        parts: [{ text: m.text }],
      }));

      const res = await sendAIChatMessage(textToSend, apiHistory, transactions);
      setIsApiLimit(false);
      
      setMessages((prev) => [
        ...prev,
        { role: "model", text: res.text || "🦉 Maaf Teman Catat, aku tidak menangkap maksudmu. Coba tanyakan hal lain ya!" },
      ]);
    } catch (e: any) {
      console.error("AI Error:", e);
      const isLimitError = e && (
        String(e.message || "").toLowerCase().includes("quota") ||
        String(e.message || "").toLowerCase().includes("429") ||
        String(e.message || "").toLowerCase().includes("limit") ||
        String(e.message || "").toLowerCase().includes("exhausted")
      );
      if (isLimitError) {
        setIsApiLimit(true);
        setMessages((prev) => [
          ...prev,
          {
            role: "model",
            text: "🦉 Zzz... Aku sedang tidur karena kuota limit habis, Teman Catat. Silakan coba hubungi aku lagi nanti ya! 💤💤",
            isError: true,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "model",
            text: "🦉 Aduh, sepertinya kepakkan sayapku terhambat masalah jaringan! Silakan dicoba lagi beberapa saat ya, Teman Catat.",
            isError: true,
          },
        ]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Preset fast questions to increase engagement and easy usage
  const presetQuestions = [
    { text: "🦉 Berikan tips pintar menabung bulan ini", label: "Tips Hemat" },
    { text: "🪙 Hitung total saldo bersih & simulasikan kelayakanku", label: "Analisis Saldo" },
    { text: "📈 Bagaimana rasio pengeluaran dibanding pendapatanku?", label: "Rasio Keuangan" },
    { text: "💡 Berikan rekomendasi cara mencegah boncos", label: "Saran Anggaran" },
  ];

  const handleResetChat = () => {
    if (confirm("Ingin menghapus riwayat obrolan dengan Owi?")) {
      const defaultGreeting: ChatMessage[] = [
        {
          role: "model",
          text: "Halo Teman Catat! 🦉 Aku adalah **Owi**, asisten keuangan pribadi pintarmu. \n\nKamu bisa bertanya tentang kondisi keuanganmu saat ini, tips menghemat pengeluaran, menyusun anggaran bulanan, atau sekadar berkonsultasi tentang cara mengelola uang dengan cerdas! \n\nApa yang ingin kamu tanyakan hari ini? 🪙✨",
        },
      ];
      setIsApiLimit(false);
      setMessages(defaultGreeting);
      localStorage.setItem("owi_assistant_chat", JSON.stringify(defaultGreeting));
    }
  };

  // Convert markdown-ish text to basic elements safely
  const formatMarkdown = (text: string) => {
    const lines = text.split("\n");
    return lines.map((line, idx) => {
      let content = line;
      
      // Inline Code highlight
      content = content.replace(/`([^`]+)`/g, '<code class="bg-[#e4ffe1] text-[#3d5e46] dark:bg-[#1f3024] dark:text-[#aefcae] px-1 py-0.5 rounded text-[11px] font-mono">$1</code>');
      
      // Bold syntax standard
      content = content.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold text-[#446d4e] dark:text-emerald-300">$1</strong>');
      content = content.replace(/\*([^*]+)\*/g, '<em class="italic">$1</em>');

      // Check Bullet lists
      if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
        const cleanText = content.replace(/^[-*]\s+/, "");
        return (
          <li key={idx} className="list-disc list-inside ml-2.5 my-1 text-[11.5px] leading-relaxed" dangerouslySetInnerHTML={{ __html: cleanText }} />
        );
      }
      
      return (
        <p key={idx} className="min-h-[6px] my-1 text-[11.5px] leading-relaxed" dangerouslySetInnerHTML={{ __html: content }} />
      );
    });
  };

  return (
    <div 
      ref={assistantRef}
      style={{ 
        position: "fixed", 
        left: `${position.x}px`, 
        top: `${position.y}px`,
        zIndex: 9999
      }}
      className="select-none"
    >
      {/* Floating Animated Owl Bubble Button */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`${isOpen ? "w-14 h-14" : "w-18 h-18"} rounded-full flex items-center justify-center cursor-move shadow-2xl relative transition-all group overflow-visible touch-none active:scale-95 duration-150 ${
          isDragging ? "scale-105 cursor-grabbing opacity-90" : "hover:scale-105 duration-300 pointer-events-auto"
        }`}
        style={{
          background: isDarkObj 
            ? "radial-gradient(circle at 30% 30%, #203527 0%, #111d16 100%)" 
            : "linear-gradient(135deg, #e4ffe1 0%, #aed8b7 100%)",
          border: isDarkObj ? "2.5px solid #2e4d38" : "2.5px solid #6a8d73",
        }}
      >
        {/* Glow Ring Effects */}
        <div className={`absolute inset-[-4px] rounded-full -z-10 animate-ping opacity-25 ${isDarkObj ? "bg-emerald-400" : "bg-[#6a8d73]"} ${isDragging || isOpen ? "hidden" : ""}`} />
        <div className="absolute inset-0 rounded-full bg-transparent border-2 border-dashed border-emerald-400/20 group-hover:rotate-180 transition-transform duration-[6000ms] " />

        {/* Mascot Photo/Image */}
        <OwiLogo
          size={isOpen ? 44 : 56}
          className="transform transition-transform group-hover:scale-110 group-hover:-rotate-3 duration-300 animate-bobbing"
        />

        {/* Floating Bubble Badge for New Response alerts */}
        {hasNewMessage && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full border-2 border-white flex items-center justify-center text-[9px] font-black text-white animate-bounce">
            !
          </div>
        )}

        {/* Tiny Tooltip label */}
        <div className={`absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-[9px] font-bold px-2 py-0.5 rounded-md shadow-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none ${
          isDarkObj ? "bg-[#18261e] border border-emerald-900/60 text-emerald-200" : "bg-white border border-slate-200 text-slate-700"
        }`}>
          Tarik Owi 🦉
        </div>
      </div>

      {/* Expanded Interactive Chat Dialog Window */}
      {isOpen && (
        <div
          data-testid="owi-chat-dialog"
          className={`chat-dialog ${isMobile ? "fixed" : "absolute"} rounded-3xl shadow-3xl flex flex-col overflow-hidden max-w-[calc(100vw-32px)] border transition-all animate-fadeIn ${
            isDarkObj 
              ? "bg-[#121c17] text-white border-emerald-950/60" 
              : "bg-white text-slate-800 border-slate-200"
          }`}
          style={isMobile ? {
            position: "fixed" as const,
            left: "16px",
            right: "16px",
            bottom: "80px",
            width: "auto",
            height: "calc(100vh - 120px)",
            maxHeight: "480px",
            top: "auto",
            zIndex: 10000
          } : {
            width: "360px",
            height: "460px",
            left: position.x > window.innerWidth / 2 ? "-372px" : "84px",
            top: position.y > window.innerHeight / 2 ? "-380px" : "0px",
          }}
        >
          {/* Header */}
          <div 
            className="flex items-center justify-between px-4 py-3 shrink-0"
            style={{
              background: isDarkObj 
                ? "linear-gradient(90deg, #18261e 0%, #111d16 100%)" 
                : "linear-gradient(90deg, #f4fdd9 0%, #e4ffe1 100%)",
              borderBottom: isDarkObj ? "1px solid #1a2c21" : "1px solid #e2ebd4",
            }}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center relative">
                <OwiLogo size={28} />
                <span className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border border-white ${isApiLimit ? "bg-purple-500" : "bg-green-500"}`} />
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <h3 className={`text-xs font-black tracking-wide ${isDarkObj ? "text-emerald-300" : "text-[#4a6d52]"}`}>Owi (Owl Catat)</h3>
                  <Sparkles className="w-3 h-3 text-[#fbbf24] animate-pulse" />
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`inline-block w-1.5 h-1.5 rounded-full ${isLoading ? "bg-amber-400 animate-ping" : isApiLimit ? "bg-purple-400 animate-pulse" : "bg-green-500 animate-pulse"}`} />
                  <span className={`text-[9px] font-bold ${isDarkObj ? "text-emerald-400/80" : "text-emerald-600"}`}>
                    {isLoading ? "Owi sedang berpikir..." : isApiLimit ? "owi sedang tidur karena limit habis" : "Owi siap melayani"}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              {/* Clear chat history button */}
              <button
                type="button"
                onClick={handleResetChat}
                title="Hapus riwayat obrolan"
                className={`p-1.5 rounded-xl transition-colors hover:bg-black/5 dark:hover:bg-white/5 ${
                  isDarkObj ? "text-slate-400 hover:text-emerald-300" : "text-slate-500 hover:text-red-500"
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              {/* Close window */}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className={`p-1.5 rounded-xl transition-colors hover:bg-black/5 dark:hover:bg-white/5 ${
                  isDarkObj ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Flow Area */}
          <div className={`p-4 flex-1 overflow-y-auto scrollbar-thin space-y-3.5 ${
            isDarkObj ? "bg-[#0b120f]/60" : "bg-slate-50/45"
          }`}>
            {messages.map((m, idx) => (
              <div 
                key={idx} 
                className={`flex gap-2.5 max-w-[88%] ${m.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"}`}
              >
                {/* Profile Avatars inside chat bubbles */}
                {m.role === "model" && (
                  <div className="w-6 h-6 rounded-full bg-[#e4ffe1] dark:bg-[#1a2c21] border border-emerald-400/20 shrink-0 flex items-center justify-center select-none">
                    <OwiLogo size={20} />
                  </div>
                )}

                <div className="space-y-0.5">
                  <div
                    className={`px-3 py-2.5 rounded-2xl shadow-sm ${
                      m.role === "user"
                        ? "bg-[#6a8d73] text-white rounded-tr-none text-[11.5px]"
                        : m.isError
                        ? "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 rounded-tl-none text-[11.5px]"
                        : isDarkObj 
                        ? "bg-[#18261e] border border-[#203628]/60 text-slate-100 rounded-tl-none" 
                        : "bg-white border border-slate-200/80 text-slate-800 rounded-tl-none"
                    }`}
                  >
                    {m.role === "model" ? formatMarkdown(m.text) : <p className="text-[11.5px] whitespace-pre-wrap leading-relaxed font-semibold">{m.text}</p>}
                  </div>
                  
                  {/* Timestamp Label */}
                  <span className={`block text-[8px] font-medium tracking-tight mt-1 ${
                    m.role === "user" ? "text-right opacity-70" : "opacity-60"
                  }`}>
                    {m.role === "user" ? "Anda" : "Owi"}
                  </span>
                </div>
              </div>
            ))}

            {/* AI Thinking typing indicator */}
            {isLoading && (
              <div className="flex gap-2.5 max-w-[85%] mr-auto items-start">
                <div className="w-6 h-6 rounded-full bg-[#e4ffe1] dark:bg-[#1a2c21] border border-emerald-400/20 shrink-0 flex items-center justify-center animate-pulse">
                  <OwiLogo size={20} />
                </div>
                <div className={`px-3 py-2.5 rounded-2xl shadow-sm rounded-tl-none flex items-center gap-1.5 ${
                  isDarkObj ? "bg-[#18261e] border border-[#203628]/60" : "bg-white border border-slate-200/80"
                }`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick Preset Buttons */}
          <div className={`px-3.5 py-2 overflow-x-auto shrink-0 border-t border-b flex gap-1.5 no-scrollbar ${
            isDarkObj ? "bg-[#0c1411] border-emerald-950/40" : "bg-slate-50/50 border-slate-100"
          }`}>
            {presetQuestions.map((pq, idx) => (
              <button
                key={idx}
                type="button"
                disabled={isLoading}
                onClick={() => handleSend(pq.text)}
                className={`text-[9.5px] font-bold px-3 py-1 rounded-full whitespace-nowrap transition-all flex items-center gap-1 select-none shrink-0 ${
                  isDarkObj
                    ? "bg-[#18261e] hover:bg-[#1f3427] border border-[#223a2a] text-emerald-100 hover:text-emerald-300 disabled:opacity-40"
                    : "bg-white hover:bg-[#f4fdd9]/50 border border-slate-200/80 text-slate-700 hover:text-emerald-700 disabled:opacity-50"
                }`}
              >
                <span>{pq.label}</span>
              </button>
            ))}
          </div>

          {/* Form input bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className={`p-3 shrink-0 flex items-center gap-2 ${isDarkObj ? "bg-[#121c17] border-t border-[#1a2c21]" : "bg-white border-t border-slate-100"}`}
          >
            <input
              type="text"
              value={input}
              disabled={isLoading}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Tanya Owi apa saja tentang keuangan..."
              className={`flex-1 text-[11px] px-3.5 py-2.5 rounded-2xl outline-none transition-all ${
                isDarkObj
                  ? "bg-[#18261e] border border-[#2a4534] text-white focus:ring-2 focus:ring-emerald-500/50 placeholder-slate-400"
                  : "bg-slate-100 hover:bg-slate-100/80 focus:bg-white border border-transparent focus:border-slate-300 text-slate-800 focus:ring-2 focus:ring-emerald-200 placeholder-slate-500"
              }`}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className={`p-2.5 rounded-2xl transition-all cursor-pointer flex items-center justify-center text-white font-bold disabled:opacity-40 shadow-md ${
                isLoading || !input.trim()
                  ? "bg-slate-400 cursor-not-allowed"
                  : "bg-[#6a8d73] hover:bg-[#5b7a62]"
              }`}
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
