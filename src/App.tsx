import { useState, useEffect } from "react";
import { initAuth, googleSignIn, googleSignInRedirect, logout, handleRedirectResult } from "./auth";
import { Login } from "./components/Login";
import { Dashboard } from "./components/Dashboard";

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [needsAuth, setNeedsAuth] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const isGuest = localStorage.getItem("isGuestSession") === "true";
    if (isGuest) {
      setUser({
        uid: "guest-user",
        displayName: "Tamu Keuanganku",
        email: "tamu@keuanganku.local",
        photoURL: "",
        isGuest: true
      });
      setNeedsAuth(false);
      setLoading(false);
      return;
    }

    let isSubscribed = true;
    let unsubscribe: (() => void) | null = null;

    const checkRedirectAndInit = async () => {
      try {
        const redirectResult = await handleRedirectResult();
        if (redirectResult && isSubscribed) {
          setUser(redirectResult.user);
          setNeedsAuth(false);
          setLoading(false);
          return;
        }
      } catch (err: any) {
        console.error("Error resolving redirect result on load:", err);
      }

      if (!isSubscribed) return;

      unsubscribe = initAuth(
        (u) => {
          if (!isSubscribed) return;
          setUser(u);
          setNeedsAuth(false);
          setLoading(false);
        },
        () => {
          if (!isSubscribed) return;
          setUser(null);
          setNeedsAuth(true);
          setLoading(false);
        }
      );
    };

    checkRedirectAndInit();

    return () => {
      isSubscribed = false;
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handleLogin = async () => {
    try {
      localStorage.removeItem("isGuestSession");
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setNeedsAuth(false);
      }
    } catch (e: any) {
      console.error("Sign in error:", e);
      const isIframe = window.self !== window.top;
      const errorCode = e?.code || "";
      const errorMessage = e?.message || "";
      
      let msg = `Gagal login dengan Google.\n\nDetail Error: [${errorCode}] ${errorMessage}\n\n`;
      
      if (errorCode === "auth/unauthorized-domain") {
        msg += "⚠️ DOMAIN BELUM DIAUTORISASI DI FIREBASE:\n" +
               "Silakan tambahkan domain aplikasi ini ke daftar 'Authorized Domains' di Firebase Console agar Google Sign-In dapat berfungsi:\n\n" +
               "1. Buka Firebase Console (https://console.firebase.google.com/)\n" +
               "2. Pilih proyek Anda -> Masuk ke menu 'Authentication' di bilah samping.\n" +
               "3. Klik tab 'Settings' -> pilih 'Authorized Domains'.\n" +
               "4. Klik 'Add Domain' lalu tambahkan domain berikut:\n" +
               `   👉 ${window.location.hostname}\n\n` +
               "Setelah ditambahkan, silakan coba login kembali.";
      } else if (isIframe) {
        msg += "⚠️ MASALAH BROWSER / IFRAME:\n" +
               "Browser membatasi cookie pihak ketiga di dalam iframe panel pratinjau AI Studio.\n\n" +
               "Solusi:\n" +
               "Silakan klik ikon 'Open in New Tab' (↗) di pojok kanan atas pratinjau untuk membuka aplikasi di tab baru, kemudian coba login dari sana.";
      } else {
        msg += "Pastikan izin popup browser Anda diaktifkan, koneksi internet stabil, atau gunakan tombol 'Masuk dengan metode Alt/Redirect' dibawah.";
      }
      
      alert(msg);
    }
  };

  const handleRedirectLogin = async () => {
    try {
      localStorage.removeItem("isGuestSession");
      await googleSignInRedirect();
    } catch (e: any) {
      console.error("Redirect sign in error:", e);
      alert(`Gagal login via Redirect: ${e?.message || e}`);
    }
  };

  const handleGuestLogin = () => {
    localStorage.setItem("isGuestSession", "true");
    setUser({
      uid: "guest-user",
      displayName: "Tamu Keuanganku",
      email: "tamu@keuanganku.local",
      photoURL: "",
      isGuest: true
    });
    setNeedsAuth(false);
  };

  const handleLogout = async () => {
    localStorage.removeItem("isGuestSession");
    try {
      await logout();
    } catch (err) {
      console.error("Logout error:", err);
    }
    setUser(null);
    setNeedsAuth(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="animate-pulse flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500/20 rounded-lg"></div>
          <div className="h-4 w-24 bg-blue-500/30 rounded"></div>
        </div>
      </div>
    );
  }

  if (needsAuth) {
    return <Login onLogin={handleLogin} onRedirectLogin={handleRedirectLogin} onGuestLogin={handleGuestLogin} />;
  }

  return <Dashboard user={user} onLogout={handleLogout} />;
}

