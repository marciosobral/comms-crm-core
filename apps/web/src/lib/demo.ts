import { ApiError, api } from "./api";

export interface DemoProfile {
  key: string;
  label: string;
  description: string;
}

/** Profiles of a demo instance; null when the API is a regular one. */
export async function fetchDemoProfiles(): Promise<DemoProfile[] | null> {
  try {
    return await api.get<DemoProfile[]>("/demo/profiles");
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}
