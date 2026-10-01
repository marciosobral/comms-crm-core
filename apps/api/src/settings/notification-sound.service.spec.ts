import { describe, expect, it, vi } from "vitest";
import { AppException } from "../logging/app-exception";
import { NotificationSoundService } from "./notification-sound.service";

const ctx = { userId: "u1", ip: null, userAgent: null };
const metadata = { fileName: "ding.mp3", mime: "audio/mpeg", size: 2048, updatedAt: new Date() };

function sound(overrides: Partial<{ mimetype: string; size: number }> = {}) {
  return {
    originalname: "ding.mp3",
    mimetype: "audio/mpeg",
    size: 2048,
    buffer: Buffer.from("sound"),
    ...overrides,
  };
}

function makeService(existing: typeof metadata | null = null) {
  const prisma = {
    notificationSound: {
      findUnique: vi.fn().mockResolvedValue(existing),
      upsert: vi.fn().mockResolvedValue(metadata),
      delete: vi.fn().mockResolvedValue(metadata),
    },
  };
  const audit = { record: vi.fn().mockResolvedValue(undefined) };
  const svc = new NotificationSoundService(
    ...([prisma, audit] as unknown as ConstructorParameters<typeof NotificationSoundService>),
  );
  return { svc, prisma, audit };
}

describe("NotificationSoundService.save", () => {
  it("requires a file", async () => {
    const { svc } = makeService();
    await expect(svc.save(undefined, ctx)).rejects.toThrow("Envie o arquivo de som");
  });

  it("rejects a file that is not MP3, OGG or WAV", async () => {
    const { svc, prisma } = makeService();
    await expect(svc.save(sound({ mimetype: "audio/mp4" }), ctx)).rejects.toThrow(AppException);
    expect(prisma.notificationSound.upsert).not.toHaveBeenCalled();
  });

  it("rejects a file over 1 MB", async () => {
    const { svc, prisma } = makeService();
    await expect(svc.save(sound({ size: 1024 * 1024 + 1 }), ctx)).rejects.toThrow(
      "Arquivo excede o limite de 1 MB",
    );
    expect(prisma.notificationSound.upsert).not.toHaveBeenCalled();
  });

  it("stores the sound and audits only its metadata", async () => {
    const { svc, prisma, audit } = makeService();
    await svc.save(sound(), ctx);
    const args = prisma.notificationSound.upsert.mock.calls[0][0];
    expect(args.create).toMatchObject({ id: 1, fileName: "ding.mp3", mime: "audio/mpeg" });
    const entry = audit.record.mock.calls[0][0];
    expect(entry).toMatchObject({ entity: "SystemSetting", action: "CREATE" });
    expect(entry.after).not.toHaveProperty("data");
  });

  it("audits a replacement as an update", async () => {
    const { svc, audit } = makeService(metadata);
    await svc.save(sound(), ctx);
    expect(audit.record.mock.calls[0][0].action).toBe("UPDATE");
  });
});

describe("NotificationSoundService.remove", () => {
  it("deletes the sound and audits it", async () => {
    const { svc, prisma, audit } = makeService(metadata);
    await svc.remove(ctx);
    expect(prisma.notificationSound.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(audit.record.mock.calls[0][0].action).toBe("DELETE");
  });

  it("does nothing when no sound is set", async () => {
    const { svc, prisma, audit } = makeService(null);
    await svc.remove(ctx);
    expect(prisma.notificationSound.delete).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });
});

describe("NotificationSoundService.file", () => {
  it("answers 404 when no sound is set", async () => {
    const { svc } = makeService(null);
    await expect(svc.file()).rejects.toThrow("Nenhum som de notificação configurado");
  });
});
