import { runInSandbox } from "@/common/sandbox-context";
import { ErrorCode } from "@/logging/error-codes";
import { describe, expect, it } from "vitest";
import { ImportLock } from "./import-lock";

function pending() {
  let release = () => {};
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
}

describe("ImportLock", () => {
  it("rejects a second import while one is running", async () => {
    const lock = new ImportLock();
    const first = pending();
    const running = lock.run(() => first.promise);
    await expect(lock.run(async () => undefined)).rejects.toMatchObject({
      code: ErrorCode.IMPORT_IN_PROGRESS,
    });
    first.release();
    await running;
    await expect(lock.run(async () => "ok")).resolves.toBe("ok");
  });

  it("lets different sandboxes import at the same time", async () => {
    const lock = new ImportLock();
    const first = pending();
    const running = runInSandbox("a".repeat(32), () => lock.run(() => first.promise));
    await expect(runInSandbox("b".repeat(32), () => lock.run(async () => "ok"))).resolves.toBe(
      "ok",
    );
    first.release();
    await running;
  });
});
