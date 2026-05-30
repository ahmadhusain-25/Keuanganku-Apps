import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithPopup, 
  signInWithRedirect, 
  getRedirectResult, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile
} from "firebase/auth";
import firebaseConfig from "../firebase-applet-config.json";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Request Workspace scopes
provider.addScope("https://www.googleapis.com/auth/drive.file");
provider.addScope("https://www.googleapis.com/auth/spreadsheets");
provider.addScope("https://www.googleapis.com/auth/calendar.events");
provider.addScope("https://www.googleapis.com/auth/gmail.readonly");
provider.addScope("https://www.googleapis.com/auth/gmail.send");

let isSigningIn = false;
let cachedAccessToken: string | null = null;

const setCookie = (name: string, value: string, days = 14) => {
  const date = new Date();
  date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
  const expires = "; expires=" + date.toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}${expires}; path=/; SameSite=None; Secure`;
  try {
    localStorage.setItem(name, value);
  } catch (e) {
    console.warn("Storage writing failed:", e);
  }
};

const getCookie = (name: string): string | null => {
  // Try Cookie first
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  for(let i=0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) {
      const val = decodeURIComponent(c.substring(nameEQ.length, c.length));
      if (val && val !== "null" && val !== "undefined" && val.trim() !== "") {
        return val;
      }
    }
  }
  // Try localStorage fallback
  try {
    const val = localStorage.getItem(name);
    if (val && val !== "null" && val !== "undefined" && val.trim() !== "") {
      return val;
    }
  } catch (e) {
    console.warn("Storage reading failed:", e);
  }
  return null;
};

const eraseCookie = (name: string) => {
  document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=None; Secure`;
  try {
    localStorage.removeItem(name);
  } catch (e) {}
};

export const initAuth = (
  onAuthSuccess?: (user: User, token: string | null) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (!cachedAccessToken) {
        cachedAccessToken = getCookie("google_access_token");
      }
      // For email/password login, we might not have a Google access token immediately
      // But we can return the ID token if needed or just the user object
      if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
    } else {
      cachedAccessToken = null;
      eraseCookie("google_access_token");
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const handleRedirectResult = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    const result = await getRedirectResult(auth);
    if (result) {
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        cachedAccessToken = credential.accessToken;
        setCookie("google_access_token", cachedAccessToken);
        return { user: result.user, accessToken: cachedAccessToken };
      }
    }
  } catch (error) {
    console.error("Redirect resolution error:", error);
    throw error;
  }
  return null;
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error("Failed to get access token from Firebase Auth");
    }

    cachedAccessToken = credential.accessToken;
    setCookie("google_access_token", cachedAccessToken);
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error("Sign in error:", error);
    
    // Fallback to Redirect automatically if popup is blocked
    if (
      error?.code === "auth/popup-blocked" || 
      error?.message?.indexOf("popup") !== -1 ||
      error?.message?.indexOf("blocked") !== -1
    ) {
      console.log("Popup blocked by browser. Cannot use redirect in iframe reliably.");
      throw new Error("POPUP_BLOCKED");
    }
    throw error;
  } finally {
    isSigningIn = false;
  }
};

const handleLocalAuthFallback = async (email: string, pass: string, action: "signin" | "signup", name?: string): Promise<any> => {
  const normalizedEmail = email.toLowerCase().trim();
  const usersKey = "owi_fallback_users";
  let users: Record<string, { email: string; pass: string; displayName: string; uid: string }> = {};

  try {
    const saved = localStorage.getItem(usersKey);
    if (saved) {
      users = JSON.parse(saved);
    }
  } catch (e) {
    console.error("Local auth recovery failed:", e);
  }

  if (action === "signup") {
    if (users[normalizedEmail]) {
      const err = new Error("Seseorang sudah mendaftar menggunakan email ini.");
      (err as any).code = "auth/email-already-in-use";
      throw err;
    }

    if (pass.length < 6) {
      const err = new Error("Kata sandi harus minimal 6 karakter.");
      (err as any).code = "auth/weak-password";
      throw err;
    }

    const uid = `local-${normalizedEmail.replace(/[^a-zA-Z0-9]/g, "_")}`;
    users[normalizedEmail] = {
      email: normalizedEmail,
      pass: pass,
      displayName: name || normalizedEmail.split("@")[0],
      uid
    };

    localStorage.setItem(usersKey, JSON.stringify(users));
    localStorage.setItem("localFallbackUser", JSON.stringify(users[normalizedEmail]));
    return {
      uid,
      email: normalizedEmail,
      displayName: name || normalizedEmail.split("@")[0],
      photoURL: "",
      isLocalFallback: true
    };
  } else {
    // signin
    const found = users[normalizedEmail];
    if (!found) {
      const err = new Error("Akun tidak ditemukan. Silakan hubungi admin atau daftar akun baru.");
      (err as any).code = "auth/user-not-found";
      throw err;
    }
    
    if (found.pass !== pass) {
      const err = new Error("Alamat email atau kata sandi tidak cocok.");
      (err as any).code = "auth/wrong-password";
      throw err;
    }

    localStorage.setItem("localFallbackUser", JSON.stringify(found));
    return {
      uid: found.uid,
      email: found.email,
      displayName: found.displayName,
      photoURL: "",
      isLocalFallback: true
    };
  }
};

export const signInWithEmail = async (email: string, pass: string): Promise<any> => {
  const normalizedEmail = email.toLowerCase().trim();
  const usersKey = "owi_fallback_users";
  try {
    const saved = localStorage.getItem(usersKey);
    if (saved) {
      const users = JSON.parse(saved);
      if (users[normalizedEmail]) {
        return handleLocalAuthFallback(email, pass, "signin");
      }
    }
  } catch (e) {
    console.error("Local account pre-check error:", e);
  }

  try {
    const result = await signInWithEmailAndPassword(auth, email, pass);
    return result.user;
  } catch (error: any) {
    if (error?.code === "auth/operation-not-allowed" || error?.message?.indexOf("operation-not-allowed") !== -1) {
      return handleLocalAuthFallback(email, pass, "signin");
    }
    throw error;
  }
};

export const signUpWithEmail = async (email: string, pass: string, name: string): Promise<any> => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(result.user, { displayName: name });
    return result.user;
  } catch (error: any) {
    if (error?.code === "auth/operation-not-allowed" || error?.message?.indexOf("operation-not-allowed") !== -1) {
      return handleLocalAuthFallback(email, pass, "signup", name);
    }
    throw error;
  }
};

export const googleSignInRedirect = async (): Promise<void> => {
  isSigningIn = true;
  await signInWithRedirect(auth, provider);
};

export const getAccessToken = async (): Promise<string | null> => {
  if (!cachedAccessToken || cachedAccessToken === "null" || cachedAccessToken === "undefined") {
    cachedAccessToken = getCookie("google_access_token");
  }
  if (!cachedAccessToken || cachedAccessToken === "null" || cachedAccessToken === "undefined") {
    return null;
  }
  return cachedAccessToken;
};

export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
  eraseCookie("google_access_token");
};

export const clearAccessToken = () => {
  cachedAccessToken = null;
  eraseCookie("google_access_token");
};
