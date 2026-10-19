import { runInSandbox } from "@/common/sandbox-context";
import { AppException } from "@/logging/app-exception";
import { ErrorCode } from "@/logging/error-codes";
import { describe, expect, it, vi } from "vitest";
import { PrismaService } from "./prisma.service";

const SANDBOX = "a".repeat(32);

function makeService(isDemo: boolean, sandboxClient?: object) {
  const config = {
    get: vi.fn((key: string) =>
      key === "DEMO_MODE" ? isDemo : "postgresql://crm:secret@localhost:5432/crm",
    ),
  };
  const sandboxes = { client: vi.fn(() => sandboxClient) };
  const service = new PrismaService(
    ...([config, sandboxes] as unknown as ConstructorParameters<typeof PrismaService>),
  );
  return { service, sandboxes };
}

describe("PrismaService", () => {
  it("ignores sandboxes outside demo mode", () => {
    const { service, sandboxes } = makeService(false, { user: {} });
    runInSandbox(SANDBOX, () => service.user);
    expect(sandboxes.client).not.toHaveBeenCalled();
  });

  it("in demo mode, reads models from the request's sandbox", () => {
    const user = { findMany: vi.fn() };
    const { service, sandboxes } = makeService(true, { user });
    expect(runInSandbox(SANDBOX, () => service.user)).toBe(user);
    expect(sandboxes.client).toHaveBeenCalledWith(SANDBOX);
  });

  it("in demo mode, binds methods to the sandbox client", () => {
    const client = {
      $transaction: vi.fn(function (this: unknown) {
        return this;
      }),
    };
    const { service } = makeService(true, client);
    expect(runInSandbox(SANDBOX, () => service.$transaction([]))).toBe(client);
  });

  it("in demo mode, rejects a request whose sandbox is gone", () => {
    const { service } = makeService(true, undefined);
    const error = (() => {
      try {
        runInSandbox(SANDBOX, () => service.user);
      } catch (caught) {
        return caught;
      }
    })();
    expect(error).toBeInstanceOf(AppException);
    expect(error).toMatchObject({ code: ErrorCode.DEMO_SESSION_EXPIRED });
  });

  it("in demo mode, uses the base client outside requests", () => {
    const { service, sandboxes } = makeService(true, undefined);
    expect(typeof service.$disconnect).toBe("function");
    expect(sandboxes.client).not.toHaveBeenCalled();
  });
});
