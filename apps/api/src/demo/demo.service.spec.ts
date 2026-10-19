import { currentSandboxId } from "@/common/sandbox-context";
import { AppException } from "@/logging/app-exception";
import { ErrorCode } from "@/logging/error-codes";
import { describe, expect, it, vi } from "vitest";
import { DemoService } from "./demo.service";

const SANDBOX = "a".repeat(32);
const client = { ip: "10.0.0.1", userAgent: "Vitest" };
const tokens = { accessToken: "a", refreshToken: "r" };

function makeService(create: () => Promise<string> = async () => SANDBOX) {
  const seenSandboxes: Array<string | undefined> = [];
  const sandboxes = { create: vi.fn(create), release: vi.fn() };
  const auth = {
    startSessionFor: vi.fn(async () => {
      seenSandboxes.push(currentSandboxId());
      return tokens;
    }),
    logout: vi.fn().mockResolvedValue(undefined),
  };
  const prisma = {
    user: {
      findUnique: vi.fn(async ({ where }: { where: { email: string } }) => ({
        id: "u1",
        email: where.email,
        status: "ACTIVE",
      })),
    },
  };
  const logger = { error: vi.fn(), log: vi.fn() };
  const svc = new DemoService(
    ...([sandboxes, auth, prisma, logger] as unknown as ConstructorParameters<typeof DemoService>),
  );
  return { svc, sandboxes, auth, prisma, logger, seenSandboxes };
}

describe("DemoService", () => {
  it("signs in as the profile inside a brand new sandbox", async () => {
    const { svc, prisma, seenSandboxes } = makeService();
    await expect(svc.login("seller", client)).resolves.toEqual(tokens);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: "vendedor@example.com" },
    });
    expect(seenSandboxes).toEqual([SANDBOX]);
  });

  it("passes a full demo through and hides other failures behind a friendly error", async () => {
    const full = makeService(async () => {
      throw new AppException(ErrorCode.DEMO_FULL);
    });
    await expect(full.svc.login("seller", client)).rejects.toMatchObject({
      code: ErrorCode.DEMO_FULL,
    });

    const broken = makeService(async () => {
      throw new Error("template database does not exist");
    });
    await expect(broken.svc.login("seller", client)).rejects.toMatchObject({
      code: ErrorCode.DEMO_UNAVAILABLE,
    });
    expect(broken.logger.error).toHaveBeenCalled();
  });

  it("switches profile in the same sandbox, ending the current session", async () => {
    const { svc, sandboxes, auth, prisma } = makeService();
    await svc.switchProfile("supervisor", { id: "u1", sessionId: "s1" }, client);
    expect(auth.logout).toHaveBeenCalledWith("u1", "s1");
    expect(sandboxes.create).not.toHaveBeenCalled();
    expect(sandboxes.release).not.toHaveBeenCalled();
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: "supervisor@example.com" },
    });
  });
});
