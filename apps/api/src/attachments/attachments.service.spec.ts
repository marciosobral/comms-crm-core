import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AuditContext } from "@/audit/audit-context.decorator";
import { AppException } from "@/logging/app-exception";
import { ErrorCode } from "@/logging/error-codes";
import { describe, expect, it, vi } from "vitest";
import {
  AttachmentsService,
  assertAttachmentAllowed,
  assertCanUpload,
} from "./attachments.service";

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

describe("AttachmentsService.upload in the demo", () => {
  const file = (size: number) =>
    ({
      path: join(tmpdir(), "missing-upload.tmp"),
      mimetype: "image/png",
      size,
      originalname: "a.png",
    }) as Express.Multer.File;
  const actor = {
    id: "seller-1",
    name: "Beltrana",
    isSuperAdmin: true,
    status: "ACTIVE",
    role: { permissions: [] },
  };

  function makeService({
    isDemo,
    count = 0,
    limitMb = 25,
  }: { isDemo: boolean; count?: number; limitMb?: number }) {
    const prisma = {
      attachment: {
        count: vi.fn().mockResolvedValue(count),
        create: vi.fn().mockResolvedValue({ id: "att1" }),
        update: vi.fn().mockResolvedValue({ id: "att1" }),
      },
    };
    const sales = { detail: vi.fn().mockResolvedValue({ sellerId: "seller-1" }) };
    const settings = { get: vi.fn().mockResolvedValue({ value: limitMb }) };
    const audit = { record: vi.fn() };
    const config = { get: vi.fn((key: string) => (key === "DEMO_MODE" ? isDemo : tmpdir())) };
    const svc = new AttachmentsService(
      ...([prisma, audit, sales, settings, config] as unknown as ConstructorParameters<
        typeof AttachmentsService
      >),
    );
    return { svc, prisma };
  }
  const ctx = {} as AuditContext;
  const MB = 1024 * 1024;

  it("caps files at 5 MB even when the setting allows more", async () => {
    const { svc, prisma } = makeService({ isDemo: true, limitMb: 25 });
    await expect(svc.upload("s1", file(6 * MB), "OTHER", actor, ctx)).rejects.toMatchObject({
      code: ErrorCode.ATTACHMENT_TOO_LARGE,
    });
    expect(prisma.attachment.create).not.toHaveBeenCalled();
  });

  it("refuses the 21st attachment of a sandbox", async () => {
    const { svc, prisma } = makeService({ isDemo: true, count: 20 });
    await expect(svc.upload("s1", file(MB), "OTHER", actor, ctx)).rejects.toMatchObject({
      code: ErrorCode.DEMO_ATTACHMENT_LIMIT,
    });
    expect(prisma.attachment.create).not.toHaveBeenCalled();
  });

  it("outside the demo keeps the configured limit and skips the count", async () => {
    const { svc, prisma } = makeService({ isDemo: false, count: 500, limitMb: 25 });
    await expect(svc.upload("s1", file(6 * MB), "OTHER", actor, ctx)).rejects.not.toBeInstanceOf(
      AppException,
    );
    expect(prisma.attachment.count).not.toHaveBeenCalled();
    expect(prisma.attachment.create).toHaveBeenCalled();
  });
});
