import { HttpStatus } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { AppException } from "./app-exception";
import { ErrorCode } from "./error-codes";

describe("AppException", () => {
  it("carries code, message and default status 400", () => {
    const ex = new AppException(ErrorCode.INVALID_INPUT, "Valor inválido");
    expect(ex.code).toBe(ErrorCode.INVALID_INPUT);
    expect(ex.getStatus()).toBe(HttpStatus.BAD_REQUEST);
    expect(ex.getResponse()).toEqual({ code: "INVALID_INPUT", message: "Valor inválido" });
  });

  it("accepts explicit status", () => {
    const ex = new AppException(ErrorCode.FORBIDDEN, "Sem permissão", HttpStatus.FORBIDDEN);
    expect(ex.getStatus()).toBe(HttpStatus.FORBIDDEN);
  });
});
