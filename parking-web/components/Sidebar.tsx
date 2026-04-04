"use client";

import { useAuth } from "@/hooks/useAuth";

type Props = {
  user: {
    fullname: string;
    username: string;
    role: { name: string };
  };
};

export default function Sidebar({ user }: Props) {
  const { logout } = useAuth();

  return (
    <aside className="w-64 shrink-0 min-h-screen bg-white border-r border-light-shade flex flex-col">
      {/* App logo + name */}
      <div className="px-5 py-6 border-b border-light-shade space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shrink-0">
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 10l-.553-1.106A2 2 0 016.237 6h11.526a2 2 0 011.79 2.894L19 10M5 10h14M5 10v8a2 2 0 002 2h10a2 2 0 002-2v-8M9 14h.01M15 14h.01"
              />
            </svg>
          </div>
          <span className="font-bold text-dark leading-tight">Parking Management</span>
        </div>

        {/* User info + logout */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary-tint flex items-center justify-center shrink-0">
            <span className="text-white text-sm font-semibold">
              {user.fullname.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-dark truncate">{user.fullname}</p>
            <p className="text-xs text-medium truncate">{user.role.name}</p>
          </div>
          <button
            onClick={logout}
            title="Logout"
            className="shrink-0 p-1.5 rounded-lg text-medium hover:bg-light hover:text-dark transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" />
            </svg>
          </button>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        <a
          href="/dashboard"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium bg-primary/10 text-primary"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7m-9 5v6h4v-6m-4 0H7m10 0h-4" />
          </svg>
          Dashboard
        </a>
      </nav>
    </aside>
  );
}
