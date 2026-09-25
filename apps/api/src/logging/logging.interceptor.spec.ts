import { SSE_METADATA } from "@nestjs/common/constants";
import { Reflector } from "@nestjs/core";
import { lastValueFrom, of, toArray } from "rxjs";
import { describe, expect, it, vi } from "vitest";
import { LoggingInterceptor } from "./logging.interceptor";

function makeInterceptor() {
  const prisma = { apiLog: { create: vi.fn().mockResolvedValue({}) } };
  const interceptor = new LoggingInterceptor(
    prisma as unknown as ConstructorParameters<typeof LoggingInterceptor>[0],
    new Reflector(),
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
