import type { ExecutionContext } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { AppException } from "../logging/app-exception";
import { PermissionsGuard } from "./permissions.guard";
import { PermissionsService } from "./permissions.service";

function makeContext(req: Record<string, unknown>): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
}

function makeGuard(required: string[] | undefined, userRow: unknown) {
  const reflector = { getAllAndOverride: vi.fn().mockReturnValue(required) };
  const prisma = { user: { findUnique: vi.fn().mockResolvedValue(userRow) } };
  const guard = new PermissionsGuard(
    reflector as unknown as ConstructorParameters<typeof PermissionsGuard>[0],
    prisma as unknown as ConstructorParameters<typeof PermissionsGuard>[1],
    new PermissionsService(),
  );
  return { guard, prisma };
}

describe("PermissionsGuard", () => {
  it("rejects when there is no authenticated user on the request", async () => {
    const { guard } = makeGuard(undefined, null);
    await expect(guard.canActivate(makeContext({}))).rejects.toThrow(AppException);
  });

  it("rejects when the user no longer exists", async () => {
    const { guard } = makeGuard(undefined, null);
    const req = { user: { id: "u1" } };
    await expect(guard.canActivate(makeContext(req))).rejects.toThrow(AppException);
  });

  it("rejects an inactive user", async () => {
    const { guard } = makeGuard(undefined, { id: "u1", status: "INACTIVE", role: null });
    const req = { user: { id: "u1" } };
    await expect(guard.canActivate(makeContext(req))).rejects.toThrow(AppException);
  });

  it("attaches the loaded actor to the request and allows through when no permission is required", async () => {
    const actor = { id: "u1", status: "ACTIVE", isSuperAdmin: false, role: null };
    const { guard } = makeGuard(undefined, actor);
    const req: Record<string, unknown> = { user: { id: "u1" } };
    await expect(guard.canActivate(makeContext(req))).resolves.toBe(true);
    expect(req.actor).toBe(actor);
  });

  it("rejects when the loaded actor lacks a required permission", async () => {
    const actor = {
      id: "u1",
      status: "ACTIVE",
      isSuperAdmin: false,
      role: { permissions: ["sales.create"] },
    };
    const { guard } = makeGuard(["sales.edit"], actor);
    const req = { user: { id: "u1" } };
    await expect(guard.canActivate(makeContext(req))).rejects.toThrow(AppException);
  });

  it("allows through when the loaded actor has the required permission", async () => {
    const actor = {
      id: "u1",
      status: "ACTIVE",
      isSuperAdmin: false,
      role: { permissions: ["sales.create"] },
    };
    const { guard } = makeGuard(["sales.create"], actor);
    const req = { user: { id: "u1" } };
    await expect(guard.canActivate(makeContext(req))).resolves.toBe(true);
  });
});
