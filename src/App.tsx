import { useState, useEffect } from "react";
import { initAuth, googleSignIn, logout, getAccessToken } from "./auth";
import { Login } from "./components/Login";
import { Dashboard } from "./components/Dashboard";

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [needsAuth, setNeedsAuth] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
      await googleSignIn();
      setNeedsAuth(false);
    } catch (e) {
      console.error(e);
      alert("Failed to sign in. Please try again.");
    }
  };

  const handleLogout = async () => {
    await logout();
    setNeedsAuth(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-200 rounded-lg"></div>
          <div className="h-4 w-24 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (needsAuth) {
    return <Login onLogin={handleLogin} />;
  }

  return <Dashboard user={user} onLogout={handleLogout} />;
}

