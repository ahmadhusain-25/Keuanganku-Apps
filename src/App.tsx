import { useState, useEffect } from "react";
import { initAuth, googleSignIn, googleSignInRedirect, logout, handleRedirectResult } from "./auth";
import { Login } from "./components/Login";
import { Dashboard } from "./components/Dashboard";

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [needsAuth, setNeedsAuth] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loginError, setLoginError] = useState<{ code: string; message: string } | null>(null);

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
    setLoginError(null);
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
      
      setLoginError({ code: errorCode, message: errorMessage });
    }
  };

  const handleRedirectLogin = async () => {
    setLoginError(null);
    try {
      localStorage.removeItem("isGuestSession");
      await googleSignInRedirect();
    } catch (e: any) {
      console.error("Redirect sign in error:", e);
      setLoginError({ code: e?.code || "auth/redirect-error", message: e?.message || String(e) });
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
    return (
      <Login 
        onLogin={handleLogin} 
        onRedirectLogin={handleRedirectLogin} 
        onGuestLogin={handleGuestLogin} 
        loginError={loginError}
        clearError={() => setLoginError(null)}
      />
    );
  }

  return <Dashboard user={user} onLogout={handleLogout} />;
}

