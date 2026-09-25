import { describe, expect, it } from "vitest";
import { AppException } from "../logging/app-exception";
import { assertAttachmentAllowed, assertCanUpload } from "./attachments.service";

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

describe("assertAttachmentAllowed by kind", () => {
  it("accepts common audio formats for AUDIO", () => {
    for (const mime of [
      "audio/mpeg",
      "audio/ogg",
      "audio/opus",
      "audio/mp4",
      "audio/x-m4a",
      "audio/wav",
    ]) {
      expect(() => assertAttachmentAllowed(mime, 1024, 25, "AUDIO")).not.toThrow();
    }
  });

  it("rejects a PDF as AUDIO", () => {
    expect(() => assertAttachmentAllowed("application/pdf", 1024, 25, "AUDIO")).toThrow(
      AppException,
    );
  });

  it("accepts PDF and images as PROOF_OF_ADDRESS but not audio", () => {
    for (const mime of ["application/pdf", "image/png", "image/jpeg"]) {
      expect(() => assertAttachmentAllowed(mime, 1024, 25, "PROOF_OF_ADDRESS")).not.toThrow();
    }
    expect(() => assertAttachmentAllowed("audio/mpeg", 1024, 25, "PROOF_OF_ADDRESS")).toThrow(
      AppException,
    );
  });

  it("accepts the new audio formats as OTHER", () => {
    expect(() => assertAttachmentAllowed("audio/ogg", 1024, 25, "OTHER")).not.toThrow();
  });
});

describe("assertCanUpload", () => {
  const actor = (permissions: string[]) => ({
    id: "seller-1",
    name: "Beltrana",
    isSuperAdmin: false,
    status: "ACTIVE",
    role: { permissions },
  });

  it("allows sales.edit on any sale", () => {
    expect(() => assertCanUpload(actor(["sales.edit"]), "other-seller")).not.toThrow();
  });

  it("allows the sale's own seller with sales.create", () => {
    expect(() => assertCanUpload(actor(["sales.create"]), "seller-1")).not.toThrow();
  });

  it("rejects sales.create on someone else's sale", () => {
    expect(() => assertCanUpload(actor(["sales.create"]), "other-seller")).toThrow(AppException);
  });

  it("allows a super admin", () => {
    expect(() =>
      assertCanUpload({ ...actor([]), isSuperAdmin: true }, "other-seller"),
    ).not.toThrow();
  });
});
