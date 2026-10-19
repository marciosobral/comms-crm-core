import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "./api";
import { fetchDemoProfiles } from "./demo";

function respond(status: number, body: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok: status < 400, status, json: () => Promise.resolve(body) }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchDemoProfiles", () => {
  it("returns the profiles of a demo instance", async () => {
    const profiles = [{ key: "seller", label: "Vendedor", description: "Cadastra vendas." }];
    respond(200, profiles);
    await expect(fetchDemoProfiles()).resolves.toEqual(profiles);
  });

  it("returns null when the API is not a demo", async () => {
    respond(404, { message: "Cannot GET /demo/profiles" });
    await expect(fetchDemoProfiles()).resolves.toBeNull();
  });

  it("lets other failures surface", async () => {
    respond(500, { message: "Erro inesperado" });
    await expect(fetchDemoProfiles()).rejects.toBeInstanceOf(ApiError);
  });
});
