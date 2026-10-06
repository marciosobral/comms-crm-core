import { HttpStatus } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { AppException } from "./app-exception";
import { ErrorCode } from "./error-codes";

describe("AppException", () => {
  it("takes status and message from the code definition", () => {
    const ex = new AppException(ErrorCode.SALE_NOT_FOUND);
    expect(ex.code).toBe(ErrorCode.SALE_NOT_FOUND);
    expect(ex.getStatus()).toBe(HttpStatus.NOT_FOUND);
    expect(ex.getResponse()).toEqual({ code: "SALE_NOT_FOUND", message: "Venda não encontrada" });
  });

  it("accepts a message and status override", () => {
    const ex = new AppException(ErrorCode.USER_INACTIVE, {
      message: "Conta bloqueada",
      status: HttpStatus.UNAUTHORIZED,
    });
    expect(ex.getStatus()).toBe(HttpStatus.UNAUTHORIZED);
    expect(ex.getResponse()).toEqual({ code: "USER_INACTIVE", message: "Conta bloqueada" });
  });
});
