"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getMe } from "@/lib/api";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const user = await getMe();
      router.replace(user ? "/dashboard" : "/login");
    };

    checkAuth();
  }, [router]);

  return (
    <div className="p-6">
      <p>Loading...</p>
    </div>
  );
}