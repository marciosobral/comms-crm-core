import { Injectable } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";

@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    const user = req.user;
    if (typeof user === "object" && user !== null && "id" in user && typeof user.id === "string") {
      return `user:${user.id}`;
    }
    return typeof req.ip === "string" ? req.ip : "unknown";
  }
}
