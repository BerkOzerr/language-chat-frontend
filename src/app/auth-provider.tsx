import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, sessionStore, setUnauthorizedHandler } from "../lib/api/client";
import type { AuthResponse, User } from "../lib/api/types";

interface AuthContextValue {
  user: User | null;
  token: string | null;
  signIn: (response: AuthResponse) => void;
  refreshUser: () => Promise<User>;
  signOut: () => Promise<void>;
  /** Sunucuya istek atmadan yerel oturumu bitirir (oturum zaten sunucuda kapanmışsa). */
  endSession: () => void;
}
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => sessionStore.getUser());
  const [token, setToken] = useState<string | null>(() => sessionStore.getToken());
  const signIn = useCallback((response: AuthResponse) => {
    sessionStore.save(response.token, response.user);
    setToken(response.token);
    setUser(response.user);
  }, []);
  const refreshUser = useCallback(async () => {
    const result = await api.profile();
    sessionStore.updateUser(result.user);
    setUser(result.user);
    return result.user;
  }, []);
  const signOut = useCallback(async () => {
    try { if (sessionStore.getToken()) await api.logout(); }
    finally { sessionStore.clear(); setToken(null); setUser(null); }
  }, []);
  const endSession = useCallback(() => { sessionStore.clear(); setToken(null); setUser(null); }, []);
  // API 401 dönerse (oturum süresi doldu, başka yerden çıkış yapıldı) arayüz de çıkış yapar.
  useEffect(() => { setUnauthorizedHandler(endSession); return () => setUnauthorizedHandler(null); }, [endSession]);
  const value = useMemo(() => ({ user, token, signIn, refreshUser, signOut, endSession }), [user, token, signIn, refreshUser, signOut, endSession]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}