"use client";

import { useAuthContext } from "@/context/AuthContext";
import { ShieldX } from "lucide-react";
import Link from "next/link";

type Props = {
  permission: string;
  children: React.ReactNode;
};

export default function RequirePermission({ permission, children }: Props) {
  const { hasPermission, loading } = useAuthContext();

  if (loading) return null;

  if (!hasPermission(permission)) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-danger/10 flex items-center justify-center">
          <ShieldX className="w-7 h-7 text-danger" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-dark">Access Denied</h2>
          <p className="text-sm text-medium mt-1">You don&apos;t have permission to view this page.</p>
        </div>
        <Link
          href="/dashboard"
          className="px-4 py-2 rounded-xl text-sm font-medium bg-primary text-white hover:bg-primary-shade transition"
        >
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
