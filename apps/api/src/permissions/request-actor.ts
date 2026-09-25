import type { Role, User } from "../../prisma/generated/prisma/client/client";

export type RequestActor = User & { role: Role | null };

declare global {
  namespace Express {
    interface User {
      id: string;
    }
    interface Request {
      actor?: RequestActor;
    }
  }
}
