import { afterEach, describe, expect, it, vi } from "vitest";
import { authStore } from "./auth";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("demo sign-in", () => {
  it.each([
    ["loginAsDemo", "/demo/login"],
    ["switchDemoProfile", "/demo/switch"],
  ] as const)("%s keeps the tokens the API returns", async (method, path) => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ accessToken: `${method}-token`, refreshToken: "r" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await authStore[method]("seller");

    expect(authStore.getAccessToken()).toBe(`${method}-token`);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(path),
      expect.objectContaining({ method: "POST", body: JSON.stringify({ profile: "seller" }) }),
    );
  });
});
