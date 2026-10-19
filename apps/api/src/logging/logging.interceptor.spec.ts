import { runInSandbox } from "@/common/sandbox-context";
import { Logger } from "@nestjs/common";
import { SSE_METADATA } from "@nestjs/common/constants";
import { Reflector } from "@nestjs/core";
import { lastValueFrom, of, toArray } from "rxjs";
import { describe, expect, it, vi } from "vitest";
import { LoggingInterceptor } from "./logging.interceptor";

function makeInterceptor({ isDemo = false } = {}) {
  const prisma = { apiLog: { create: vi.fn().mockResolvedValue({}) } };
  const config = { get: vi.fn(() => isDemo) };
  const interceptor = new LoggingInterceptor(
    prisma as unknown as ConstructorParameters<typeof LoggingInterceptor>[0],
    new Reflector(),
    config as unknown as ConstructorParameters<typeof LoggingInterceptor>[2],
  );
  return { interceptor, prisma };
}

function contextFor(handler: () => void) {
  const req = { method: "GET", originalUrl: "/events", ip: null, get: () => null };
  const res = { statusCode: 200 };
  return {
    getHandler: () => handler,
    switchToHttp: () => ({ getRequest: () => req, getResponse: () => res }),
  } as unknown as Parameters<LoggingInterceptor["intercept"]>[0];
}

describe("LoggingInterceptor", () => {
  it("logs a server-sent event stream once, not once per event", async () => {
    const { interceptor, prisma } = makeInterceptor();
    const handler = () => undefined;
    Reflect.defineMetadata(SSE_METADATA, true, handler);
    await lastValueFrom(
      interceptor.intercept(contextFor(handler), { handle: () => of(1, 2, 3) }).pipe(toArray()),
    );
    expect(prisma.apiLog.create).toHaveBeenCalledTimes(1);
  });

  it("in demo mode, skips requests outside a sandbox and logs those inside one", async () => {
    const { interceptor, prisma } = makeInterceptor({ isDemo: true });
    const call = () =>
      lastValueFrom(
        interceptor.intercept(
          contextFor(() => undefined),
          { handle: () => of("ok") },
        ),
      );
    await call();
    expect(prisma.apiLog.create).not.toHaveBeenCalled();
    await runInSandbox("a".repeat(32), call);
    expect(prisma.apiLog.create).toHaveBeenCalledTimes(1);
  });

  it("in demo mode, still answers when the sandbox vanished before the log write", async () => {
    const error = vi.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
    const { interceptor, prisma } = makeInterceptor({ isDemo: true });
    Object.defineProperty(prisma, "apiLog", {
      get: () => {
        throw new Error("sandbox gone");
      },
    });
    await expect(
      runInSandbox("a".repeat(32), () =>
        lastValueFrom(
          interceptor.intercept(
            contextFor(() => undefined),
            { handle: () => of("ok") },
          ),
        ),
      ),
    ).resolves.toBe("ok");
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });

  it("logs a regular response", async () => {
    const { interceptor, prisma } = makeInterceptor();
    await lastValueFrom(
      interceptor.intercept(
        contextFor(() => undefined),
        { handle: () => of({ ok: true }) },
      ),
    );
    expect(prisma.apiLog.create).toHaveBeenCalledTimes(1);
  });
});
