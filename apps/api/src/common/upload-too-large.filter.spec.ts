import { ErrorCode } from "@/logging/error-codes";
import { type ArgumentsHost, PayloadTooLargeException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { UploadTooLargeFilter } from "./upload-too-large.filter";

describe("UploadTooLargeFilter", () => {
  it("answers 413 with the configured code and message", () => {
    const json = vi.fn();
    const status = vi.fn().mockReturnValue({ json });
    const host = {
      switchToHttp: () => ({ getResponse: () => ({ status }) }),
    } as unknown as ArgumentsHost;

    new UploadTooLargeFilter(
      ErrorCode.IMPORT_FILE_TOO_LARGE,
      "Planilha excede o limite de 20 MB",
    ).catch(new PayloadTooLargeException("File too large"), host);

    expect(status).toHaveBeenCalledWith(413);
    expect(json).toHaveBeenCalledWith({
      code: ErrorCode.IMPORT_FILE_TOO_LARGE,
      message: "Planilha excede o limite de 20 MB",
    });
  });
});
