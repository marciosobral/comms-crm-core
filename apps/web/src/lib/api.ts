import { authStore } from "./auth";

export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

const NETWORK_ERROR_MESSAGE = "Não foi possível conectar ao servidor";

export function apiErrorMessage(body: unknown): string {
  if (typeof body === "object" && body !== null && "message" in body) {
    const { message } = body;
    if (typeof message === "string" && message) return message;
    if (Array.isArray(message)) {
      const parts = message.filter((item): item is string => typeof item === "string");
      if (parts.length > 0) return parts.join(" • ");
    }
  }
  return "Erro desconhecido";
}

export function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

async function send(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch {
    throw new ApiError(0, NETWORK_ERROR_MESSAGE, "NETWORK_ERROR");
  }
}

async function baseRequest(path: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const token = authStore.getAccessToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let res = await send(`${API_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    const refreshed = await authStore.tryRefresh();
    if (refreshed) {
      headers.set("Authorization", `Bearer ${authStore.getAccessToken()}`);
      res = await send(`${API_URL}${path}`, { ...options, headers });
    }
  }

  if (!res.ok) {
    const body: unknown = await res.json().catch(() => null);
    const code =
      typeof body === "object" && body !== null && "code" in body && typeof body.code === "string"
        ? body.code
        : null;
    throw new ApiError(res.status, apiErrorMessage(body), code);
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
