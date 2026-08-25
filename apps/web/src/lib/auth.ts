import { api } from "./api";

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  cpf: string | null;
  phone: string | null;
  status: string;
  reference: string;
  identifier: string | null;
  isSuperAdmin: boolean;
  roleName: string | null;
  permissions: string[];
}

const isBrowser = typeof window !== "undefined";

let accessToken: string | null = null;
let refreshPromise: Promise<boolean> | null = null;

function getRefreshToken(): string | null {
  if (!isBrowser) return null;
  return localStorage.getItem("refreshToken");
}

function setTokens(tokens: AuthTokens) {
  accessToken = tokens.accessToken;
  if (isBrowser) localStorage.setItem("refreshToken", tokens.refreshToken);
}

function clearTokens() {
  accessToken = null;
  if (isBrowser) localStorage.removeItem("refreshToken");
}

export const authStore = {
  getAccessToken: () => accessToken,

  isAuthenticated: () => accessToken !== null || getRefreshToken() !== null,

  login: async (identifier: string, password: string) => {
    const tokens = await api.post<AuthTokens>("/auth/login", {
      identifier,
      password,
    });
    setTokens(tokens);
  },

  logout: async () => {
    try {
      await api.post("/auth/logout", {});
    } catch {
      // ignore — clearing tokens regardless
    }
    clearTokens();
  },

  getProfile: () => api.get<AuthUser>("/auth/me"),

  tryRefresh: async (): Promise<boolean> => {
    if (refreshPromise) return refreshPromise;

    refreshPromise = (async () => {
      const rt = getRefreshToken();
      if (!rt) return false;

      try {
        const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";
        const res = await fetch(`${API_URL}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken: rt }),
        });

        if (!res.ok) {
          clearTokens();
          return false;
        }

        const tokens: AuthTokens = await res.json();
        setTokens(tokens);
        return true;
      } catch {
        clearTokens();
        return false;
      } finally {
        refreshPromise = null;
      }
    })();

    return refreshPromise;
  },
};
