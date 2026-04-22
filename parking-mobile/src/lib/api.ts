import { Capacitor, CapacitorHttp } from "@capacitor/core";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL as string;

if (!BACKEND_URL) {
  throw new Error("VITE_BACKEND_URL is not set");
}

const isNative = Capacitor.isNativePlatform();

export async function apiFetch(path: string, init?: RequestInit) {
  const url = `${BACKEND_URL}${path}`;
  const method = init?.method || 'GET';
  const headers = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string>),
  };

  let body = init?.body;
  let data: any = undefined;
  if (body && typeof body === 'string') {
    try {
      data = JSON.parse(body);
    } catch (e) {
      data = body;
    }
  }

  if (isNative) {
    try {
      const res = await CapacitorHttp.request({
        url,
        method: method as any,
        headers,
        data: data,
      });

      // Return a standard Response object
      return {
        ok: res.status >= 200 && res.status < 300,
        status: res.status,
        statusText: '',
        json: async () => res.data,
        text: async () => JSON.stringify(res.data),
        headers: new Headers(res.headers),
      } as Response;
    } catch (error) {
      console.error('Capacitor HTTP error:', error);
      throw error;
    }
  }

  // Fallback to standard fetch for web
  return fetch(url, {
    ...init,
    credentials: 'include',
    headers,
  });
}