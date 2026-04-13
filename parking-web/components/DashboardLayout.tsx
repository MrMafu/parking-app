"use client";

import { AuthProvider, useAuthContext } from "@/context/AuthContext";
import Sidebar from "@/components/Sidebar";

function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthContext();

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-light">
        <p className="text-medium text-sm">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-light flex">
      <Sidebar user={user} />
      <div className="flex-1 min-w-0">
        <main className="px-6 py-8 space-y-8 max-w-5xl mx-auto">{children}</main>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <DashboardShell>{children}</DashboardShell>
    </AuthProvider>
  );
}
