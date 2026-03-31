"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

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

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      const res = await apiFetch("/auth/me");

      if (!res.ok) {
        router.replace("/login");
        return;
      }

      const data = await res.json();
      setUser(data.data.user);
      setLoading(false);
    };

    loadUser();
  }, [router]);

  const handleLogout = async () => {
    await apiFetch("/auth/logout", { method: "POST" });
    router.replace("/login");
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="min-h-screen p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-gray-600">
            Logged in as {user?.fullname} ({user?.role.name})
          </p>
        </div>

        <button
          onClick={handleLogout}
          className="rounded-lg border px-4 py-2"
        >
          Logout
        </button>
      </div>

      <div className="rounded-2xl border p-4">
        <p><strong>Full name:</strong> {user?.fullname}</p>
        <p><strong>Username:</strong> {user?.username}</p>
        <p><strong>Email:</strong> {user?.email}</p>
        <p><strong>Role:</strong> {user?.role.name}</p>
      </div>
    </div>
  );
}