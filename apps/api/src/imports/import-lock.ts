import { currentSandboxId } from "@/common/sandbox-context";
import { AppException } from "@/logging/app-exception";
import { ErrorCode } from "@/logging/error-codes";

/** One import at a time per database; in demo mode every sandbox is its own database. */
export class ImportLock {
  private readonly running = new Set<string>();

  async run<T>(fn: () => Promise<T>): Promise<T> {
    const key = currentSandboxId() ?? "";
    if (this.running.has(key)) {
      throw new AppException(ErrorCode.IMPORT_IN_PROGRESS);
    }
    this.running.add(key);
    try {
      return await fn();
    } finally {
      this.running.delete(key);
    }
  }
}
