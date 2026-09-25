import type { Role, User } from "../../prisma/generated/prisma/client/client";

export type RequestActor = User & { role: Role | null };

declare global {
  namespace Express {
    interface User {
      id: string;
      tokenExpiresAt?: number;
    }
    interface Request {
      actor?: RequestActor;
    }
  }
}
