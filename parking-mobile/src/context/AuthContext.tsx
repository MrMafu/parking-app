import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { apiFetch } from "../lib/api";

type PublicUser = {
  id: number;
  fullname: string;
  username: string;
  email: string;
  role: {
    id: number;
    name: string;
  };
};

type AuthContextValue = {
  user: PublicUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const res = await apiFetch("/auth/me");

      if (!res.ok) {
        setUser(null);
        return;
      }

      const data = await res.json();
      setUser(data.data.user as PublicUser);
    } catch {
      setUser(null);
    }
  }, []);

  const login = useCallback(
    async (username: string, password: string) => {
      const res = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password, source: "mobile" }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Login failed");
      }

      setUser(data.data.user as PublicUser);
    },
    []
  );

  const logout = useCallback(async () => {
    await apiFetch("/auth/logout", {
      method: "POST",
    });
    setUser(null);
  }, []);

  useEffect(() => {
    (async () => {
      await refreshUser();
      setLoading(false);
    })();
  }, [refreshUser]);

  const value = useMemo(
    () => ({ user, loading, login, logout, refreshUser }),
    [user, loading, login, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return ctx;
}