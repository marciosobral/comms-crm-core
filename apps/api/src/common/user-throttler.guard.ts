import { currentSandboxId } from "@/common/sandbox-context";
import { Injectable } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";

@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    const sandboxId = currentSandboxId();
    const key = this.requesterKey(req);
    return sandboxId ? `${sandboxId}:${key}` : key;
  }

  private requesterKey(req: Record<string, unknown>): string {
    const user = req.user;
    if (typeof user === "object" && user !== null && "id" in user && typeof user.id === "string") {
      return `user:${user.id}`;
    }
    return typeof req.ip === "string" ? req.ip : "unknown";
  }
}
