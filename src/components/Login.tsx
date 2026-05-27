import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import { AlertCircle, Chrome, ShieldAlert, ArrowRightLeft, UserCheck } from "lucide-react";
import { AppLogo } from "./AppLogo";

export const Login = ({ 
  onLogin, 
  onRedirectLogin,
  onGuestLogin 
}: { 
  onLogin: () => void; 
  onRedirectLogin: () => void;
  onGuestLogin: () => void;
}) => {
  const [isIframe, setIsIframe] = useState(false);

  useEffect(() => {
    setIsIframe(window.self !== window.top);
  }, []);

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
          <AppLogo size={105} showText={true} vertical={true} className="py-2" />
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Custom Informative Warning for iFrame Sandbox restrictions if active */}
          {isIframe && (
            <div 
              className="p-4 rounded-2xl border flex gap-3 text-xs shadow-sm transition-all animate-pulse"
              style={{ 
                backgroundColor: colors.wheat, 
                borderColor: colors.sandyBrown,
                color: '#854d0e'
              }}
            >
              <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" style={{ color: colors.sandyBrown }} />
              <div className="space-y-1">
                <p className="font-bold text-[13px]">Informasi Login Google:</p>
                <p className="leading-relaxed opacity-95">
                  Jika proses masuk terhambat atau popup menutup sendiri karena pembatasan cookie browser pada panel pratinjau, silakan klik ikon <strong>"Open in New Tab" (↗)</strong> di kanan atas pratinjau, lalu coba masuk kembali di tab baru.
                </p>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3.5 pt-2">
            {/* Main Sign in Button (Popup Method) */}
            <Button
              onClick={onLogin}
              className="w-full h-13 rounded-2xl text-white font-bold text-base hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-3 border border-transparent"
              style={{ backgroundColor: colors.primary }}
            >
              {/* Google SVG Icon */}
              <svg className="w-5.5 h-5.5 shrink-0" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#ffffff"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#ffffff"
                  opacity="0.85"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#ffffff"
                  opacity="0.8"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#ffffff"
                  opacity="0.9"
                />
              </svg>
              <span>Masuk dengan Google</span>
            </Button>

            {/* Backup Sign in Button (Redirect Method) */}
            <Button
              onClick={onRedirectLogin}
              variant="outline"
              className="w-full h-11 rounded-2xl font-semibold text-sm transition-all cursor-pointer flex items-center justify-center gap-2"
              style={{ 
                borderColor: '#6a8d73', 
                color: '#4e6d55',
                backgroundColor: 'rgba(106, 141, 115, 0.05)'
              }}
            >
              <ArrowRightLeft className="w-4 h-4" />
              <span>Masuk via Google Redirect</span>
            </Button>
          </div>

          <div className="relative my-2 py-2">
            <div className="absolute inset-0 flex items-center">
              <Separator />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-3 font-semibold text-zinc-400">Atau</span>
            </div>
          </div>

          {/* Test/Trial Guest account button */}
          <Button
            onClick={onGuestLogin}
            variant="outline"
            className="w-full h-13 rounded-2xl font-bold text-base transition-all cursor-pointer flex items-center justify-center gap-3 border shadow-sm"
            style={{ 
              backgroundColor: colors.frostedMint, 
              borderColor: colors.primary,
              color: '#34523b'
            }}
          >
            <UserCheck className="w-5.5 h-5.5 text-[#4a6b52]" />
            <span>Masuk sebagai Tamu (Uji Coba)</span>
          </Button>

          <p className="text-[11px] font-medium text-center text-zinc-500 max-w-sm mx-auto leading-relaxed pt-2">
            Masuk dengan Google diperlukan untuk menyinkronkan data dengan Google Sheets, Google Calendar & Gmail Anda. Pilih opsi Tamu jika ingin mencoba secara lokal tanpa integrasi.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
