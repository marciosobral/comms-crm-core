import { describe, expect, it } from "vitest";
import { AppException } from "../logging/app-exception";
import { assertAttachmentAllowed } from "./attachments.service";

describe("assertAttachmentAllowed", () => {
  it("accepts allowed mimes under the limit", () => {
    for (const mime of ["image/png", "image/jpeg", "audio/mpeg", "application/pdf"]) {
      expect(() => assertAttachmentAllowed(mime, 1024, 25)).not.toThrow();
    }
  });

  it("rejects a disallowed mime", () => {
    expect(() => assertAttachmentAllowed("application/zip", 1024, 25)).toThrow(AppException);
  });

  it("rejects a file over the limit", () => {
    expect(() => assertAttachmentAllowed("image/png", 26 * 1024 * 1024, 25)).toThrow(AppException);
  });

  it("accepts a file exactly at the limit", () => {
    expect(() => assertAttachmentAllowed("image/png", 25 * 1024 * 1024, 25)).not.toThrow();
  });
});
