import { useState, useEffect } from "react";
import { initAuth, googleSignIn, logout } from "./auth";
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

    const unsubscribe = initAuth(
      (u) => {
        setUser(u);
        setNeedsAuth(false);
        setLoading(false);
      },
      () => {
        setUser(null);
        setNeedsAuth(true);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      localStorage.removeItem("isGuestSession");
      await googleSignIn();
      setNeedsAuth(false);
    } catch (e) {
      console.error(e);
      alert("Failed to sign in. Please try again.");
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
    return <Login onLogin={handleLogin} onGuestLogin={handleGuestLogin} />;
  }

  return <Dashboard user={user} onLogout={handleLogout} />;
}

