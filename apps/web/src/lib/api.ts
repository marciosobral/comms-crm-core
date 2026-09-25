import { authStore } from "./auth";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

async function baseRequest(path: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const token = authStore.getAccessToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    const refreshed = await authStore.tryRefresh();
    if (refreshed) {
      headers.set("Authorization", `Bearer ${authStore.getAccessToken()}`);
      res = await fetch(`${API_URL}${path}`, { ...options, headers });
    }
  }

  if (!res.ok) {
    const body: { message?: string; code?: string } = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.message ?? "Erro desconhecido", body.code ?? null);
  }

  return res;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await baseRequest(path, options);
  if (res.status === 204) return undefined as T;
  return res.json();
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code: string | null = null,
  ) {
    super(message);
  }
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  upload: <T>(path: string, formData: FormData) =>
    request<T>(path, { method: "POST", body: formData }),
  download: async (path: string): Promise<Blob> => {
    const res = await baseRequest(path);
    return res.blob();
  },
  stream: (path: string, signal: AbortSignal) =>
    baseRequest(path, { signal, headers: { Accept: "text/event-stream" } }),
};
