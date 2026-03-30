const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

if (!BACKEND_URL) {
  throw new Error("NEXT_PUBLIC_BACKEND_URL is not set");
}

export async function apiFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  return res;
}

export async function getMe() {
  const res = await apiFetch("/auth/me");

  if (!res.ok) {
    return null;
  }

  const data = await res.json();
  return data.data?.user ?? null;
}