import { afterEach, describe, expect, it, vi } from "vitest";
import { AppException } from "../logging/app-exception";
import { ErrorCode } from "../logging/error-codes";
import { PostalCodesService } from "./postal-codes.service";

const logger = { error: vi.fn(), log: vi.fn(), warn: vi.fn(), debug: vi.fn() };

function makeService() {
  return new PostalCodesService(
    logger as unknown as ConstructorParameters<typeof PostalCodesService>[0],
  );
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

function stubProviders(brasilApi: () => Promise<Response>, viaCep: () => Promise<Response>) {
  const fetchMock = vi.fn((url: string) => (url.includes("brasilapi") ? brasilApi() : viaCep()));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const brasilApiFound = {
  cep: "01310100",
  state: "SP",
  city: "São Paulo",
  neighborhood: "Bela Vista",
  street: "Avenida Paulista",
};

const viaCepFound = {
  cep: "01310-100",
  logradouro: "Avenida Paulista",
  bairro: "Bela Vista",
  localidade: "São Paulo",
  uf: "SP",
};

const expectedAddress = {
  postalCode: "01310100",
  street: "Avenida Paulista",
  neighborhood: "Bela Vista",
  city: "São Paulo",
  state: "SP",
};

async function codeOf(promise: Promise<unknown>) {
  try {
    await promise;
    return null;
  } catch (error) {
    return error instanceof AppException ? error.code : "unexpected";
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("PostalCodesService.lookup", () => {
  it("rejects a malformed CEP without calling any provider", async () => {
    const fetchMock = stubProviders(
      () => Promise.resolve(jsonResponse(brasilApiFound)),
      () => Promise.resolve(jsonResponse(viaCepFound)),
    );
    expect(await codeOf(makeService().lookup("123"))).toBe(ErrorCode.INVALID_INPUT);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns the address from whichever provider finds it", async () => {
    stubProviders(
      () => Promise.reject(new Error("network down")),
      () => Promise.resolve(jsonResponse(viaCepFound)),
    );
    await expect(makeService().lookup("01310-100")).resolves.toEqual(expectedAddress);
  });

  it("keeps a city-wide CEP without street and neighborhood", async () => {
    stubProviders(
      () =>
        Promise.resolve(
          jsonResponse({
            ...brasilApiFound,
            city: "Poconé",
            state: "MT",
            street: null,
            neighborhood: null,
          }),
        ),
      () => Promise.resolve(jsonResponse({ erro: "true" })),
    );
    await expect(makeService().lookup("78175000")).resolves.toMatchObject({
      street: null,
      neighborhood: null,
      city: "Poconé",
    });
  });

  it("reports not found only when every provider says so", async () => {
    stubProviders(
      () => Promise.resolve(jsonResponse({ message: "not found" }, 404)),
      () => Promise.resolve(jsonResponse({ erro: true })),
    );
    expect(await codeOf(makeService().lookup("00000000"))).toBe(ErrorCode.POSTAL_CODE_NOT_FOUND);
  });

  it("reports the lookup as unavailable when providers fail", async () => {
    stubProviders(
      () => Promise.resolve(jsonResponse({}, 500)),
      () => Promise.resolve(jsonResponse({ erro: "true" })),
    );
    expect(await codeOf(makeService().lookup("01310100"))).toBe(
      ErrorCode.POSTAL_CODE_LOOKUP_FAILED,
    );
    expect(logger.warn).toHaveBeenCalled();
  });

  it("serves a repeated CEP from the cache", async () => {
    const fetchMock = stubProviders(
      () => Promise.resolve(jsonResponse(brasilApiFound)),
      () => Promise.resolve(jsonResponse(viaCepFound)),
    );
    const service = makeService();
    await service.lookup("01310100");
    await service.lookup("01310-100");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
