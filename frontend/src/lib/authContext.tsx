import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, tokenStore } from "./api.js";

export type UserRole = "super_admin" | "admin" | "trainer" | "franchise_owner" | "operator" | "employee";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  franchiseId: string | null;
  mustChangePassword: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("la_user");
    if (stored && tokenStore.getAccess()) {
      setUser(JSON.parse(stored));
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post("/auth/login", { email, password });
    tokenStore.set(data.accessToken, data.refreshToken);
    localStorage.setItem("la_user", JSON.stringify(data.user));
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // ignore — clearing local state regardless
    }
    tokenStore.clear();
    localStorage.removeItem("la_user");
    setUser(null);
  }, []);

  return <AuthContext.Provider value={{ user, isLoading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
