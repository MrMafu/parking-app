"use client";

import { useAuth } from "@/hooks/useAuth";
import { ParkingSquare, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const { username, setUsername, password, setPassword, loading, error, login } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-light">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 bg-primary">
            <ParkingSquare className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-dark">Parking Management</h1>
          <p className="text-sm mt-1 text-medium">Sign in to your account</p>
        </div>

        {/* Card */}
        <form
          onSubmit={login}
          className="rounded-2xl p-8 space-y-5 shadow-sm bg-white border border-light-shade"
        >
          <div className="space-y-1">
            <label className="block text-sm font-medium text-dark">Username</label>
            <input
              className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition border border-light-shade bg-light text-dark focus:border-primary"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              placeholder="Enter your username"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-dark">Password</label>
            <input
              type="password"
              className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition border border-light-shade bg-light text-dark focus:border-primary"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="Enter your password"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm bg-[#fff0f0] border border-danger-tint text-danger">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition active:scale-95 bg-primary hover:bg-primary-shade disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}