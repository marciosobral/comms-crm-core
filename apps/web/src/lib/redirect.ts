const BASE = "http://localhost";

export function safeRedirectPath(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.startsWith("/")) return undefined;
  let url: URL;
  try {
    url = new URL(value, BASE);
  } catch {
    return undefined;
  }
  if (url.origin !== BASE || url.pathname.startsWith("/login")) return undefined;
  return url.pathname + url.search;
}
