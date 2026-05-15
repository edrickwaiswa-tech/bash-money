import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

export interface AuthUser {
  id: number;
  username: string;
  role: "admin";
  fullName: string | null;
  employeeId: string | null;
  phone: string | null;
  email: string | null;
  profilePictureUrl: string | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setUser: (u: AuthUser | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    try {
      const r = await fetch(`${BASE}/api/auth/me`, { credentials: "same-origin" });
      const data = r.ok ? await r.json() : null;
      setUser(data);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    fetchMe().finally(() => setIsLoading(false));
  }, [fetchMe]);

  const login = async (email: string, password: string) => {
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error ?? "Login failed");
    }
    // Re-fetch full profile (login returns minimal data; /me returns everything)
    await fetchMe();
  };

  const logout = async () => {
    await fetch(`${BASE}/api/auth/logout`, { method: "POST", credentials: "same-origin" });
    setUser(null);
  };

  const refreshProfile = useCallback(async () => {
    await fetchMe();
  }, [fetchMe]);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, refreshProfile, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
