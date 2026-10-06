import {
  type ArgumentsHost,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  PayloadTooLargeException,
  UnauthorizedException,
} from "@nestjs/common";
import { ThrottlerException } from "@nestjs/throttler";
import { Prisma } from "@prisma-client";
import { describe, expect, it, vi } from "vitest";
import { AppException } from "./app-exception";
import { ErrorCode } from "./error-codes";
import { HttpExceptionFilter } from "./http-exception.filter";

function run(exception: unknown, headersSent = false) {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({ getResponse: () => ({ status, headersSent }) }),
  } as unknown as ArgumentsHost;
  const logger = { error: vi.fn() };
  const filter = new HttpExceptionFilter(
    ...([logger] as unknown as ConstructorParameters<typeof HttpExceptionFilter>),
  );
  filter.catch(exception, host);
  return { statusCode: status.mock.calls[0]?.[0], body: json.mock.calls[0]?.[0], logger, status };
}

function prismaError(code: string) {
  return new Prisma.PrismaClientKnownRequestError("raw prisma text", {
    code,
    clientVersion: "test",
  });
}

describe("HttpExceptionFilter", () => {
  it("passes an AppException through", () => {
    const { statusCode, body } = run(new AppException(ErrorCode.SALE_NOT_FOUND));
    expect(statusCode).toBe(404);
    expect(body).toEqual({ code: "SALE_NOT_FOUND", message: "Venda não encontrada" });
  });

  it("joins validation messages under INVALID_INPUT", () => {
    const { statusCode, body } = run(
      new BadRequestException(["Informe o nome", "Informe o e-mail"]),
    );
    expect(statusCode).toBe(400);
    expect(body).toEqual({ code: "INVALID_INPUT", message: "Informe o nome • Informe o e-mail" });
  });

  it("maps a plain bad request to INVALID_INPUT with the default message", () => {
    expect(run(new BadRequestException()).body).toEqual({
      code: "INVALID_INPUT",
      message: "Dados inválidos",
    });
  });

  it("maps built-in HTTP errors by status", () => {
    expect(run(new UnauthorizedException()).body.code).toBe("UNAUTHORIZED");
    expect(run(new ForbiddenException()).body.code).toBe("FORBIDDEN");
    expect(run(new NotFoundException()).body.code).toBe("RESOURCE_NOT_FOUND");
    expect(run(new PayloadTooLargeException()).body.code).toBe("PAYLOAD_TOO_LARGE");
    const throttled = run(new ThrottlerException());
    expect(throttled.statusCode).toBe(429);
    expect(throttled.body).toEqual({
      code: "TOO_MANY_REQUESTS",
      message: "Muitas tentativas. Aguarde um momento e tente de novo",
    });
  });

  it("translates Prisma errors without leaking their text", () => {
    expect(run(prismaError("P2002"))).toMatchObject({
      statusCode: 409,
      body: { code: "CONFLICT" },
    });
    expect(run(prismaError("P2025"))).toMatchObject({
      statusCode: 404,
      body: { code: "RESOURCE_NOT_FOUND" },
    });
    expect(run(prismaError("P2003"))).toMatchObject({
      statusCode: 409,
      body: { code: "INVALID_OPERATION" },
    });
    expect(JSON.stringify(run(prismaError("P2002")).body)).not.toContain("raw prisma text");
  });

  it("hides unexpected errors and logs them once", () => {
    const { statusCode, body, logger } = run(new Error("db exploded"));
    expect(statusCode).toBe(500);
    expect(body).toEqual({ code: "UNKNOWN_ERROR", message: "Erro inesperado. Tente novamente" });
    expect(logger.error).toHaveBeenCalledTimes(1);
  });

  it("does not log Prisma messages that may carry personal data", () => {
    const exception = new Prisma.PrismaClientKnownRequestError(
      "Invalid value fulano@example.com 123.456.789-09",
      { code: "P2010", clientVersion: "test" },
    );
    const { statusCode, body, logger } = run(exception);
    expect(statusCode).toBe(500);
    expect(body.code).toBe("UNKNOWN_ERROR");
    expect(logger.error).toHaveBeenCalledTimes(1);
    const logged = JSON.stringify(logger.error.mock.calls);
    expect(logged).not.toContain("fulano@example.com");
    expect(logged).not.toContain("123.456.789-09");
    expect(logged).toContain("P2010");
  });

  it("does not respond when the response already started", () => {
    const { status } = run(new AppException(ErrorCode.SALE_NOT_FOUND), true);
    expect(status).not.toHaveBeenCalled();
  });

  it("does not log client errors", () => {
    expect(run(new AppException(ErrorCode.SALE_NOT_FOUND)).logger.error).not.toHaveBeenCalled();
  });
});
