"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, getMe } from "@/lib/api";
import type { PublicUser } from "@/types";

type AuthContextType = {
  user: PublicUser | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasPermission: (perm: string) => boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const u = await getMe();
    setUser(u);
    setLoading(false);
    if (!u) router.replace("/login");
  }, [router]);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const logout = async () => {
    await apiFetch("/auth/logout", { method: "POST" });
    setUser(null);
    router.replace("/login");
  };

  const hasPermission = useCallback(
    (perm: string) => !!user?.permissions?.includes(perm),
    [user]
  );

  return (
    <AuthContext.Provider value={{ user, loading, logout, refreshUser, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used within AuthProvider");
  return ctx;
}
