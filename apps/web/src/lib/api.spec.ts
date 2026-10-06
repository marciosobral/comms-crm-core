import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, api, apiErrorMessage, getErrorMessage } from "./api";

describe("apiErrorMessage", () => {
  it("uses the API message", () => {
    expect(apiErrorMessage({ code: "SALE_NOT_FOUND", message: "Venda não encontrada" })).toBe(
      "Venda não encontrada",
    );
  });

  it("joins a message list", () => {
    expect(apiErrorMessage({ message: ["Informe o nome", "Informe o e-mail"] })).toBe(
      "Informe o nome • Informe o e-mail",
    );
  });

  it("falls back when there is no message", () => {
    expect(apiErrorMessage(null)).toBe("Erro desconhecido");
    expect(apiErrorMessage({})).toBe("Erro desconhecido");
  });
});

describe("getErrorMessage", () => {
  it("returns the API error message", () => {
    expect(getErrorMessage(new ApiError(404, "Venda não encontrada"), "Erro ao salvar")).toBe(
      "Venda não encontrada",
    );
  });

  it("returns the fallback for anything else", () => {
    expect(getErrorMessage(new Error("boom"), "Erro ao salvar")).toBe("Erro ao salvar");
    expect(getErrorMessage(undefined, "Erro ao salvar")).toBe("Erro ao salvar");
  });
});

describe("api.get", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("rejects with a network ApiError when fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(api.get("/sales")).rejects.toMatchObject({
      status: 0,
      code: "NETWORK_ERROR",
      message: "Não foi possível conectar ao servidor",
    });
  });

  it("rejects with the code and message sent by the API", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ code: "SALE_NOT_FOUND", message: "Venda não encontrada" }),
      }),
    );
    const error = await api.get("/sales/1").catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 404,
      code: "SALE_NOT_FOUND",
      message: "Venda não encontrada",
    });
  });
});
