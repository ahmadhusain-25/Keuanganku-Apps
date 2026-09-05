import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import { AlertCircle, ArrowRightLeft, UserCheck, Mail, Lock, UserPlus, LogIn, ChevronRight, ShieldAlert, Eye, EyeOff } from "lucide-react";
import { AppLogo } from "./AppLogo";

export const Login = ({ 
  onLogin, 
  onEmailLogin,
  onEmailSignUp,
  onRedirectLogin,
  onGuestLogin,
  loginError,
  clearError
}: { 
  onLogin: () => void; 
  onEmailLogin: (email: string, pass: string) => void;
  onEmailSignUp: (email: string, pass: string, name: string) => void;
  onRedirectLogin: () => void;
  onGuestLogin: () => void;
  loginError?: { code: string; message: string } | null;
  clearError?: () => void;
}) => {
  const [isIframe, setIsIframe] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setIsIframe(window.self !== window.top);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || (authMode === "signup" && !name)) return;
    
    setIsSubmitting(true);
    try {
      if (authMode === "login") {
        await onEmailLogin(email, password);
      } else {
        await onEmailSignUp(email, password, name);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const colors = {
    primary: '#6a8d73',
    lightYellow: '#f4fdd9',
    frostedMint: '#e4ffe1',
    wheat: '#ffe8c2',
    sandyBrown: '#f0a868'
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 transition-colors duration-300 relative overflow-hidden" 
      style={{ backgroundColor: colors.lightYellow }}
    >
      {/* Dynamic abstract shapes for visual depth */}
      <div 
        className="absolute top-[-10%] right-[-10%] w-[350px] h-[350px] rounded-full blur-[80px] pointer-events-none -z-10 opacity-60"
        style={{ backgroundColor: colors.frostedMint }}
      />
      <div 
        className="absolute bottom-[-10%] left-[-10%] w-[350px] h-[350px] rounded-full blur-[80px] pointer-events-none -z-10 opacity-60"
        style={{ backgroundColor: colors.wheat }}
      />

      <Card 
        className="w-full max-w-md shadow-2xl border-2 bg-white/95 backdrop-blur-md rounded-3xl transition-transform duration-300 hover:scale-[1.01]" 
        style={{ borderColor: colors.primary }}
      >
        <CardHeader className="space-y-3 text-center pb-2 pt-6">
          <AppLogo 
            size={90} 
            showText={true} 
            vertical={true} 
            className="py-1" 
            titleClassName="text-[#6a8d73] dark:text-[#a3e635]" 
            subtitleClassName="text-[#6a8d73]/80 dark:text-[#a3e635]/80 font-bold"
          />
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Custom Error Warning if login fails */}
          {loginError && (
            <div 
              className={`p-4 rounded-2xl border flex flex-col gap-2.5 text-xs shadow-md duration-200 animate-fadeIn relative ${
                loginError.code === "auth/popup-closed-by-user"
                  ? "bg-amber-50 border-amber-200 text-amber-900"
                  : "bg-rose-50 border-rose-200 text-rose-900"
              }`}
            >
              <button 
                onClick={clearError}
                className="absolute top-2.5 right-2.5 text-slate-400 hover:text-slate-700 font-bold text-sm w-5 h-5 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors"
                title="Sembunyikan pesan"
              >
                ×
              </button>
              <div className="flex gap-2 items-start pr-4">
                <AlertCircle className={`w-5 h-5 shrink-0 mt-0.5 ${
                  loginError.code === "auth/popup-closed-by-user" ? "text-amber-500" : "text-rose-500"
                }`} />
                <div className="space-y-1">
                  <p className="font-bold text-[13px]">
                    {loginError.code === "auth/popup-closed-by-user"
                      ? "Login Dibatalkan"
                      : `Gagal ${authMode === "login" ? "Masuk" : "Daftar"}:`}
                  </p>
                  <p className="leading-relaxed opacity-95 text-[11px]">
                    {loginError.code === "auth/popup-closed-by-user"
                      ? "Jendela Google login ditutup sebelum otentikasi selesai. Silakan klik tombol 'Google Sign In' kembali di bawah untuk melanjutkan."
                      : loginError.message === "POPUP_BLOCKED" || loginError.code === "auth/popup-blocked"
                      ? "Browser Anda memblokir jendela popup login. Silakan aktifkan izin popup atau coba opsi di bawah."
                      : loginError.message}
                  </p>
                </div>
              </div>
              
              {(loginError.message === "POPUP_BLOCKED" || loginError.code === "auth/popup-blocked" || loginError.code === "auth/internal-error") && (
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-xl text-[11px] text-blue-900 leading-relaxed font-medium space-y-2">
                  <p className="font-bold flex items-center gap-1">
                    <LogIn className="w-3.5 h-3.5" /> Opsi Masuk Alternatif:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button 
                      type="button"
                      variant="outline" 
                      onClick={onRedirectLogin}
                      className="h-8 text-[11px] font-bold bg-white text-blue-700 border-blue-300 hover:bg-blue-100"
                    >
                      Masuk via Redirect
                    </Button>
                    <Button 
                      type="button"
                      variant="outline" 
                      onClick={() => window.open(window.location.href, '_blank')}
                      className="h-8 text-[11px] font-bold bg-white text-blue-700 border-blue-300 hover:bg-blue-100"
                    >
                      Buka di Tab Baru
                    </Button>
                  </div>
                </div>
              )}
              
              {loginError.code === "auth/operation-not-allowed" && (
                <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 leading-relaxed font-medium">
                  <p className="font-bold flex items-center gap-1 mb-1">
                    <ShieldAlert className="w-3.5 h-3.5" /> Konfigurasi Diperlukan:
                  </p>
                  Metode Email/Password belum diaktifkan di Firebase Console. 
                  Silakan buka <strong>Firebase Console &gt; Authentication &gt; Sign-in method</strong>, 
                  lalu aktifkan <strong>Email/Password</strong>.
                </div>
              )}
            </div>
          )}

          {/* Email/Password Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <h3 className="text-sm font-bold text-slate-700 pb-1">
              {authMode === "login" ? "Masuk ke Akun Anda" : "Buat Akun Baru"}
            </h3>
            
            {authMode === "signup" && (
              <div className="relative">
                <UserPlus className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Nama Lengkap" 
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-[#6a8d73] outline-none transition-all placeholder:text-slate-400"
                />
              </div>
            )}

            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
              <input 
                type="email" 
                placeholder="Alamat Email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-[#6a8d73] outline-none transition-all placeholder:text-slate-400"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="Kata Sandi" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-11 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-[#6a8d73] outline-none transition-all placeholder:text-slate-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 outline-none p-1 transition-all"
                title={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
              >
                {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
              </button>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 rounded-2xl text-white font-bold text-base hover:shadow-lg transition-all flex items-center justify-center gap-2"
              style={{ backgroundColor: colors.primary }}
            >
              {authMode === "login" ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
              <span>{isSubmitting ? "Memproses..." : (authMode === "login" ? "Masuk Sekarang" : "Daftar Akun")}</span>
            </Button>

            <button
              type="button"
              onClick={() => {
                setAuthMode(authMode === "login" ? "signup" : "login");
                if (clearError) clearError();
              }}
              className="w-full text-center text-xs font-semibold text-slate-500 hover:text-[#6a8d73] transition-colors flex items-center justify-center gap-1 group"
            >
              {authMode === "login" ? "Belum punya akun? Daftar gratis" : "Sudah punya akun? Masuk disini"}
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </form>

          <div className="relative py-1">
            <div className="absolute inset-0 flex items-center">
              <Separator />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase">
              <span className="bg-white px-3 font-bold text-zinc-400 tracking-wider">Atau Lanjutkan Dengan</span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {/* Main Sign in Button (Popup Method) */}
            <Button
              onClick={onLogin}
              variant="outline"
              className="w-full h-11 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-3 border shadow-sm"
              style={{ borderColor: '#e2e8f0', color: '#475569' }}
            >
              {/* Google SVG Icon */}
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              <span>Google Sign In</span>
            </Button>

            {/* Test/Trial Guest account button */}
            <Button
              onClick={onGuestLogin}
              variant="link"
              className="w-full text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors flex items-center justify-center gap-2"
            >
              <UserCheck className="w-4 h-4" />
              <span>Coba Demo (Tanpa Akun)</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
