import { AsyncLocalStorage } from "node:async_hooks";
import { join } from "node:path";

const sandboxStorage = new AsyncLocalStorage<string>();

export function runInSandbox<T>(sandboxId: string, fn: () => T): T {
  return sandboxStorage.run(sandboxId, fn);
}

export function currentSandboxId(): string | undefined {
  return sandboxStorage.getStore();
}

export function sandboxPath(baseDir: string): string {
  return join(baseDir, currentSandboxId() ?? "");
}
