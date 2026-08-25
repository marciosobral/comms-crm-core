import { describe, expect, it, vi } from "vitest";
import { AppException } from "../logging/app-exception";
import { SystemSettingsService } from "./system-settings.service";

const ctx = { userId: "u1", ip: null, userAgent: null };

function makeService() {
  const prisma = {
    systemSetting: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue({ key: "UPLOAD_MAX_MB", value: 25 }),
      upsert: vi.fn().mockResolvedValue({ key: "UPLOAD_MAX_MB", value: 50 }),
    },
  };
  const audit = { record: vi.fn().mockResolvedValue(undefined) };
  const svc = new SystemSettingsService(
    prisma as unknown as ConstructorParameters<typeof SystemSettingsService>[0],
    audit as unknown as ConstructorParameters<typeof SystemSettingsService>[1],
  );
  return { svc, audit };
}

describe("SystemSettingsService.update", () => {
  it("rejects unknown key", async () => {
    const { svc } = makeService();
    await expect(svc.update("NOPE", 1, ctx)).rejects.toThrow(AppException);
  });

  it("rejects invalid value for known key", async () => {
    const { svc } = makeService();
    await expect(svc.update("UPLOAD_MAX_MB", "abc", ctx)).rejects.toThrow(AppException);
    await expect(svc.update("DUE_NOTIFICATION_DAYS", [1.5], ctx)).rejects.toThrow(AppException);
  });

  it("accepts valid value and audits", async () => {
    const { svc, audit } = makeService();
    await svc.update("UPLOAD_MAX_MB", 50, ctx);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ entity: "SystemSetting", action: "UPDATE" }),
    );
  });
});
