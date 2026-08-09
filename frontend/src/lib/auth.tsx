import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "./api";

interface AuthUser {
  id: number;
  role: "admin" | "commander" | "officer";
  name: string;
  badgeNo: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("sbs_token");
    if (!token) {
      setLoading(false);
      return;
    }
    api.me().then((r) => setUser(r.user)).catch(() => {
      localStorage.removeItem("sbs_token");
    }).finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const r = await api.login(email, password);
    localStorage.setItem("sbs_token", r.token);
    setUser(r.user);
  }

  function logout() {
    localStorage.removeItem("sbs_token");
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
