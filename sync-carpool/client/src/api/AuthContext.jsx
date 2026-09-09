import { createContext, useContext, useEffect, useState } from "react";
import { apiPost, API_BASE } from "./client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem("sync_token"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    fetch(`${API_BASE}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then(setUser)
      .catch(() => { setToken(null); localStorage.removeItem("sync_token"); })
      .finally(() => setLoading(false));
  }, [token]);

  async function signup(payload) {
    const data = await apiPost("/api/auth/signup", payload);
    localStorage.setItem("sync_token", data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }

  async function login(payload) {
    const data = await apiPost("/api/auth/login", payload);
    localStorage.setItem("sync_token", data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }

  function logout() {
    localStorage.removeItem("sync_token");
    setToken(null);
    setUser(null);
  }

  // Merge partial updates into the shared user object — used after profile
  // edits (name, photo, etc.) so the navbar and every other consumer of
  // `user` update immediately, without needing a full re-login.
  function updateUser(partial) {
    setUser((u) => (u ? { ...u, ...partial } : u));
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, signup, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
