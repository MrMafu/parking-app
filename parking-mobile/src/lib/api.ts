const BACKEND_URL = import.meta.env.VITE_BACKEND_URL as string;

if (!BACKEND_URL) {
  throw new Error("VITE_BACKEND_URL is not set");
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