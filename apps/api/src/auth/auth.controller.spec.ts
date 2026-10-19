import { runInSandbox } from "@/common/sandbox-context";
import { describe, expect, it, vi } from "vitest";
import { AuthController } from "./auth.controller";

const SANDBOX = "a".repeat(32);

function makeController({ isDemo }: { isDemo: boolean }) {
  const auth = { logout: vi.fn().mockResolvedValue(undefined) };
  const sandboxes = { release: vi.fn().mockResolvedValue(undefined) };
  const config = { get: vi.fn(() => isDemo) };
  const logger = { error: vi.fn() };
  const controller = new AuthController(
    ...([auth, sandboxes, config, logger] as unknown as ConstructorParameters<
      typeof AuthController
    >),
  );
  return { controller, auth, sandboxes, logger };
}

const req = { user: { id: "u1", sessionId: "s1" } };

describe("AuthController logout", () => {
  it("in demo mode, ends the session and then frees the sandbox", async () => {
    const { controller, auth, sandboxes } = makeController({ isDemo: true });
    await runInSandbox(SANDBOX, () => controller.logout(req));
    expect(auth.logout).toHaveBeenCalledWith("u1", "s1");
    expect(sandboxes.release).toHaveBeenCalledWith(SANDBOX);
  });

  it("in demo mode, does not fail the logout when freeing the sandbox fails", async () => {
    const { controller, sandboxes, logger } = makeController({ isDemo: true });
    sandboxes.release.mockRejectedValueOnce(new Error("boom"));
    await expect(runInSandbox(SANDBOX, () => controller.logout(req))).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalledWith(
      "demo sandbox release failed: Error: boom",
      undefined,
      "AuthController",
    );
  });

  it("outside demo mode, leaves the registry alone", async () => {
    const { controller, auth, sandboxes } = makeController({ isDemo: false });
    await runInSandbox(SANDBOX, () => controller.logout(req));
    await controller.logout(req);
    expect(auth.logout).toHaveBeenCalledTimes(2);
    expect(sandboxes.release).not.toHaveBeenCalled();
  });
});
