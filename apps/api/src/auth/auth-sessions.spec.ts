import { runInSandbox } from "@/common/sandbox-context";
import { ErrorCode } from "@/logging/error-codes";
import type { User } from "@prisma-client";
import * as argon2 from "argon2";
import { describe, expect, it, vi } from "vitest";
import { AuthService } from "./auth.service";

const client = { ip: "10.0.0.1", userAgent: "Vitest" };

async function makeService({ isDemo = false } = {}) {
  const user = {
    id: "u1",
    status: "ACTIVE",
    credential: { passwordHash: await argon2.hash("senha-correta") },
  };
  const sessions = new Map<
    string,
    { id: string; userId: string; refreshTokenHash: string; expiresAt: Date }
  >();
  let issued = 0;
  const prisma = {
    user: {
      findFirst: vi.fn().mockResolvedValue(user),
      update: vi.fn().mockResolvedValue(user),
    },
    session: {
      create: vi.fn(({ data }) => {
        sessions.set(data.id, data);
        return Promise.resolve(data);
      }),
      findUnique: vi.fn(({ where }) => {
        const session = sessions.get(where.id);
        return Promise.resolve(session ? { ...session, user } : null);
      }),
      update: vi.fn(({ where, data }) => {
        const session = sessions.get(where.id);
        if (session) sessions.set(where.id, { ...session, ...data });
        return Promise.resolve(session);
      }),
      delete: vi.fn(({ where }) => Promise.resolve(sessions.delete(where.id))),
      deleteMany: vi.fn(({ where }) => {
        if (where.id) sessions.delete(where.id);
        return Promise.resolve({ count: 1 });
      }),
    },
  };
  const jwt = {
    signAsync: vi.fn((payload: { sub: string; sid: string }) =>
      Promise.resolve(JSON.stringify({ ...payload, n: ++issued })),
    ),
    verifyAsync: vi.fn((token: string) => Promise.resolve(JSON.parse(token))),
  };
  const config = {
    get: vi.fn((key: string) => {
      if (key === "DEMO_MODE") return isDemo;
      return key.endsWith("EXPIRES_IN") ? "7d" : "secret";
    }),
  };
  const logger = { error: vi.fn(), log: vi.fn(), warn: vi.fn(), debug: vi.fn() };
  const svc = new AuthService(
    ...([prisma, jwt, config, logger] as unknown as ConstructorParameters<typeof AuthService>),
  );
  return { svc, prisma, sessions, user };
}

describe("AuthService sessions", () => {
  it("opens a separate session per login, so a second device keeps the first signed in", async () => {
    const { svc, sessions } = await makeService();
    const desktop = await svc.login("fulano@example.com", "senha-correta", client);
    const phone = await svc.login("fulano@example.com", "senha-correta", client);

    expect(sessions.size).toBe(2);
    await expect(svc.refresh(desktop.refreshToken)).resolves.toHaveProperty("accessToken");
    await expect(svc.refresh(phone.refreshToken)).resolves.toHaveProperty("accessToken");
  });

  it("rotates the refresh token and rejects the replaced one", async () => {
    const { svc } = await makeService();
    const first = await svc.login("fulano@example.com", "senha-correta", client);
    const second = await svc.refresh(first.refreshToken);

    await expect(svc.refresh(first.refreshToken)).rejects.toThrow("Token inválido");
    await expect(svc.refresh(second.refreshToken)).resolves.toHaveProperty("refreshToken");
  });

  it("rejects a refresh token issued before sessions existed", async () => {
    const { svc, prisma } = await makeService();
    await expect(svc.refresh(JSON.stringify({ sub: "u1" }))).rejects.toThrow("Token inválido");
    expect(prisma.session.findUnique).not.toHaveBeenCalled();
  });

  it("ends only the current session on logout", async () => {
    const { svc, prisma } = await makeService();
    await svc.logout("u1", "session-1");
    expect(prisma.session.deleteMany).toHaveBeenCalledWith({
      where: { id: "session-1", userId: "u1" },
    });
  });
});

const SANDBOX = "a".repeat(32);

function payloadOf(token: string): { sbx?: string } {
  return JSON.parse(token);
}

describe("AuthService in demo mode", () => {
  it("refuses password login", async () => {
    const { svc } = await makeService({ isDemo: true });
    await expect(svc.login("fulano@example.com", "senha-correta", client)).rejects.toMatchObject({
      code: ErrorCode.DEMO_PASSWORD_LOGIN_DISABLED,
    });
  });

  it("names the sandbox in tokens issued inside it, refresh included", async () => {
    const { svc, user } = await makeService({ isDemo: true });
    const tokens = await runInSandbox(SANDBOX, () =>
      svc.startSessionFor(user as unknown as User, client),
    );
    expect(payloadOf(tokens.accessToken).sbx).toBe(SANDBOX);
    expect(payloadOf(tokens.refreshToken).sbx).toBe(SANDBOX);

    const refreshed = await runInSandbox(SANDBOX, () => svc.refresh(tokens.refreshToken));
    expect(payloadOf(refreshed.accessToken).sbx).toBe(SANDBOX);
  });

  it("issues tokens without a sandbox outside demo requests", async () => {
    const { svc } = await makeService();
    const tokens = await svc.login("fulano@example.com", "senha-correta", client);
    expect(payloadOf(tokens.accessToken).sbx).toBeUndefined();
  });

  it("does not open a session for an inactive user", async () => {
    const { svc, user } = await makeService({ isDemo: true });
    await expect(
      svc.startSessionFor({ ...user, status: "BLOCKED" } as unknown as User, client),
    ).rejects.toMatchObject({ code: ErrorCode.USER_INACTIVE });
  });
});
